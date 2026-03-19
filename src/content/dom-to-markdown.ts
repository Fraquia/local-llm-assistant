// DOM-to-Markdown walker for content extraction
// Produces structured Markdown from page DOM without cloning or layout reflow

interface WalkContext {
  listDepth: number;
  listCounter: number;
  inPre: boolean;
}

const SKIP_TAGS = new Set([
  'script', 'style', 'noscript', 'svg', 'iframe',
  'nav', 'header', 'footer', 'aside',
]);

const SKIP_CLASSES = /\b(ad|ads|advertisement|cookie|banner|modal|popup|social|share|sidebar|related|comments?)\b/i;

const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'dialog',
  'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hgroup', 'hr', 'li', 'main', 'nav', 'ol', 'p',
  'pre', 'section', 'table', 'ul',
]);

const HEADING_LEVEL: Record<string, string> = {
  h1: '# ', h2: '## ', h3: '### ',
  h4: '#### ', h5: '##### ', h6: '###### ',
};

const SKIP_INPUT_TYPES = new Set(['password', 'hidden', 'email', 'tel', 'number', 'search']);

function shouldSkip(el: HTMLElement): boolean {
  if (SKIP_TAGS.has(el.tagName.toLowerCase())) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  const role = el.getAttribute('role');
  if (role === 'complementary' || role === 'navigation') return true;
  if (SKIP_CLASSES.test(el.className?.toString() ?? '')) return true;
  // Skip hidden elements that could contain prompt injection payloads
  const style = el.style;
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
  if (el.hidden) return true;
  // Skip form inputs that may contain sensitive data
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' && SKIP_INPUT_TYPES.has((el as HTMLInputElement).type)) return true;
  if (tag === 'textarea') return true;
  return false;
}

function collapseWhitespace(text: string | null): string {
  if (!text) return '';
  return text.replace(/[ \t\n\r]+/g, ' ');
}

function walkChildren(el: Element, out: string[], ctx: WalkContext): void {
  for (const child of el.childNodes) {
    walkNode(child, out, ctx);
  }
}

function childrenText(el: Element, ctx: WalkContext): string {
  const parts: string[] = [];
  walkChildren(el, parts, ctx);
  return parts.join('');
}

function handleLink(el: HTMLElement, out: string[], ctx: WalkContext): void {
  const href = el.getAttribute('href');
  const linkText = childrenText(el, ctx).trim();
  if (!linkText) return;

  if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
    out.push(linkText);
    return;
  }

  try {
    const absoluteUrl = new URL(href, document.baseURI).href;
    out.push(`[${linkText}](${absoluteUrl})`);
  } catch {
    out.push(linkText);
  }
}

function handleImage(el: HTMLElement, out: string[]): void {
  const alt = el.getAttribute('alt')?.trim();
  if (!alt) return;
  const src = el.getAttribute('src');
  if (src) {
    try {
      const absoluteUrl = new URL(src, document.baseURI).href;
      out.push(`![${alt}](${absoluteUrl})`);
    } catch {
      out.push(`![${alt}]`);
    }
  } else {
    out.push(`![${alt}]`);
  }
}

function handleTable(table: HTMLElement, out: string[]): void {
  const rows = table.querySelectorAll('tr');
  if (rows.length === 0) return;

  out.push('\n\n');
  rows.forEach((row, rowIndex) => {
    const cells = row.querySelectorAll('th, td');
    const cellTexts = Array.from(cells).map(
      c => (c.textContent?.trim() ?? '').replace(/\|/g, '\\|'),
    );
    out.push('| ' + cellTexts.join(' | ') + ' |\n');

    if (rowIndex === 0) {
      out.push('| ' + cellTexts.map(() => '---').join(' | ') + ' |\n');
    }
  });
  out.push('\n');
}

function handleBlockquote(el: HTMLElement, out: string[], ctx: WalkContext): void {
  const inner = childrenText(el, ctx).trim();
  if (!inner) return;
  const quoted = inner.split('\n').map(line => '> ' + line).join('\n');
  out.push('\n\n' + quoted + '\n\n');
}

function handlePre(el: HTMLElement, out: string[]): void {
  const code = el.querySelector('code');
  const text = (code ?? el).textContent ?? '';
  if (!text.trim()) return;

  // Try to detect language from class (e.g. "language-js")
  const langClass = (code ?? el).className?.toString().match(/language-(\w+)/);
  const lang = langClass ? langClass[1] : '';

  out.push('\n\n```' + lang + '\n' + text.trimEnd() + '\n```\n\n');
}

function handleList(el: HTMLElement, out: string[], ctx: WalkContext): void {
  const tag = el.tagName.toLowerCase();
  const isOrdered = tag === 'ol';

  out.push('\n');
  let counter = 1;
  for (const child of el.children) {
    if (child.tagName.toLowerCase() === 'li') {
      const indent = '  '.repeat(ctx.listDepth);
      const bullet = isOrdered ? `${counter}. ` : '- ';
      out.push(indent + bullet);

      const itemCtx: WalkContext = {
        listDepth: ctx.listDepth + 1,
        listCounter: 0,
        inPre: ctx.inPre,
      };
      const itemText = childrenText(child, itemCtx).trim();
      out.push(itemText + '\n');
      counter++;
    }
  }
  if (ctx.listDepth === 0) out.push('\n');
}

function walkNode(node: Node, out: string[], ctx: WalkContext): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = ctx.inPre ? (node.textContent ?? '') : collapseWhitespace(node.textContent);
    if (text) out.push(text);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;

  if (shouldSkip(el)) return;

  const tag = el.tagName.toLowerCase();

  // Headings
  if (HEADING_LEVEL[tag]) {
    const text = childrenText(el, ctx).trim();
    if (text) out.push('\n\n' + HEADING_LEVEL[tag] + text + '\n\n');
    return;
  }

  switch (tag) {
    case 'p': {
      const text = childrenText(el, ctx).trim();
      if (text) out.push('\n\n' + text + '\n\n');
      return;
    }

    case 'a':
      handleLink(el, out, ctx);
      return;

    case 'img':
      handleImage(el, out);
      return;

    case 'ul':
    case 'ol':
      handleList(el, out, ctx);
      return;

    case 'table':
      handleTable(el, out);
      return;

    case 'blockquote':
      handleBlockquote(el, out, ctx);
      return;

    case 'pre':
      handlePre(el, out);
      return;

    case 'code':
      if (!ctx.inPre) {
        const text = el.textContent ?? '';
        if (text) out.push('`' + text + '`');
      } else {
        walkChildren(el, out, ctx);
      }
      return;

    case 'strong':
    case 'b':
      out.push('**');
      walkChildren(el, out, ctx);
      out.push('**');
      return;

    case 'em':
    case 'i':
      out.push('*');
      walkChildren(el, out, ctx);
      out.push('*');
      return;

    case 'br':
      out.push('\n');
      return;

    case 'hr':
      out.push('\n\n---\n\n');
      return;

    // Skip list items here — handled by handleList
    case 'li':
      walkChildren(el, out, ctx);
      return;

    default: {
      const isBlock = BLOCK_TAGS.has(tag);
      if (isBlock) out.push('\n\n');
      walkChildren(el, out, ctx);
      if (isBlock) out.push('\n\n');
      return;
    }
  }
}

export function domToMarkdown(root: HTMLElement): string {
  const chunks: string[] = [];
  const ctx: WalkContext = { listDepth: 0, listCounter: 0, inPre: false };
  walkChildren(root, chunks, ctx);
  return chunks.join('').replace(/\n{3,}/g, '\n\n').trim();
}

export type SiteType = 'google-slides' | 'google-docs' | 'gmail' | 'generic';

export function detectSiteType(): SiteType {
  const host = location.hostname;
  const path = location.pathname;
  if (host === 'docs.google.com' && path.startsWith('/presentation/')) return 'google-slides';
  if (host === 'docs.google.com' && path.startsWith('/document/')) return 'google-docs';
  if (host === 'mail.google.com') return 'gmail';
  return 'generic';
}

export function findContentRoot(): HTMLElement {
  // If multiple articles, use their common parent
  const articles = document.querySelectorAll('article');
  if (articles.length > 1) {
    const parent = articles[0].parentElement;
    if (parent && parent !== document.body) return parent;
  }

  // Try semantic elements
  const semantic = document.querySelector('article')
    ?? document.querySelector('[role="main"]')
    ?? document.querySelector('main');

  if (semantic) return semantic as HTMLElement;

  return document.body;
}
