// Google Slides content extractor
// Extracts text from SVG elements within slide containers

/**
 * Extract text from SVG <text>/<tspan> elements within a container.
 * Uses tspan children when present to avoid double-counting.
 */
function extractSvgText(container: Element): string {
  const textElements = container.querySelectorAll('svg text');
  const lines: string[] = [];

  for (const textEl of textElements) {
    const tspans = textEl.querySelectorAll('tspan');
    if (tspans.length > 0) {
      for (const tspan of tspans) {
        const content = tspan.textContent?.trim();
        if (content) lines.push(content);
      }
    } else {
      const content = textEl.textContent?.trim();
      if (content) lines.push(content);
    }
  }

  return lines.join('\n');
}

/**
 * Try to extract text from the main editing slide area.
 * In edit mode, the current slide is rendered in .punch-viewer-content
 * with SVG text elements for each text box.
 */
function extractFromMainSlide(): string[] {
  const slides: string[] = [];

  // Edit mode: main slide area
  const viewerContent = document.querySelector('.punch-viewer-content');
  if (viewerContent) {
    // Each slide page in the viewer
    const slidePages = viewerContent.querySelectorAll('.punch-viewer-svgpage');
    if (slidePages.length > 0) {
      slidePages.forEach((page, i) => {
        const text = extractSvgText(page);
        if (text) slides.push(`## Slide ${i + 1}\n\n${text}`);
      });
      return slides;
    }
    // Fallback: extract from whole viewer content
    const text = extractSvgText(viewerContent);
    if (text) slides.push(text);
    return slides;
  }

  return slides;
}

/**
 * Extract text from the filmstrip (left sidebar thumbnails).
 * Each thumbnail contains a smaller SVG rendering of the slide.
 */
function extractFromFilmstrip(): string[] {
  const slides: string[] = [];

  const filmstrip = document.querySelector('.punch-filmstrip-scroll');
  if (!filmstrip) return slides;

  const thumbnails = filmstrip.querySelectorAll('.punch-filmstrip-thumbnail');
  thumbnails.forEach((thumb, i) => {
    const text = extractSvgText(thumb);
    if (text) slides.push(`## Slide ${i + 1}\n\n${text}`);
  });

  return slides;
}

/**
 * Extract speaker notes if visible.
 */
function extractSpeakerNotes(): string {
  const notesEl = document.querySelector('.punch-viewer-speakernotes-text');
  if (!notesEl) return '';
  const text = notesEl.textContent?.trim();
  return text ? `\n\n---\n\n**Speaker Notes:**\n${text}` : '';
}

/**
 * Extract text from presentation mode (published/embedded view).
 */
function extractFromPresentationMode(): string[] {
  const slides: string[] = [];

  // Published view: slides rendered as SVGs in the presentation container
  const svgPages = document.querySelectorAll('.slide-content, [class*="svgpage"]');
  if (svgPages.length > 0) {
    svgPages.forEach((page, i) => {
      const text = extractSvgText(page);
      if (text) slides.push(`## Slide ${i + 1}\n\n${text}`);
    });
    return slides;
  }

  // Try broader SVG search within the main content area
  // Avoid toolbar/menu SVGs by targeting only the slide viewport
  const viewport = document.querySelector('[role="main"], .punch-present-iframe, .punch-viewer-container');
  if (viewport) {
    const text = extractSvgText(viewport);
    if (text) slides.push(text);
  }

  return slides;
}

/**
 * Fallback: extract visible text from the slide area, excluding UI elements.
 */
function fallbackExtract(): string {
  // Try to get text from the main content area, skipping toolbars
  const selectors = [
    '.punch-viewer-content',
    '.punch-viewer-container',
    '[role="main"]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const text = (el as HTMLElement).innerText?.trim();
      if (text && text.length > 20) return text;
    }
  }

  return '';
}

export function extractGoogleSlides(): string {
  // Strategy: try main slide area first, then filmstrip, then presentation mode
  let slides = extractFromMainSlide();

  if (slides.length === 0) {
    slides = extractFromFilmstrip();
  }

  if (slides.length === 0) {
    slides = extractFromPresentationMode();
  }

  if (slides.length > 0) {
    const notes = extractSpeakerNotes();
    return `# ${document.title}\n\n${slides.join('\n\n')}${notes}`;
  }

  // Last resort fallback
  const fallback = fallbackExtract();
  if (fallback) {
    return `# ${document.title}\n\n${fallback}`;
  }

  console.warn('[onnx-llm] Google Slides: could not extract slide content (may be canvas-only rendering)');
  return '';
}
