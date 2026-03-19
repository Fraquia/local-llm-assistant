const E=new Set(["script","style","noscript","svg","iframe","nav","header","footer","aside"]),k=/\b(ad|ads|advertisement|cookie|banner|modal|popup|social|share|sidebar|related|comments?)\b/i,C=new Set(["address","article","aside","blockquote","details","dialog","dd","div","dl","dt","fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","header","hgroup","hr","li","main","nav","ol","p","pre","section","table","ul"]),q={h1:"# ",h2:"## ",h3:"### ",h4:"#### ",h5:"##### ",h6:"###### "},$=new Set(["password","hidden","email","tel","number","search"]);function A(t){var o;if(E.has(t.tagName.toLowerCase())||t.getAttribute("aria-hidden")==="true")return!0;const e=t.getAttribute("role");if(e==="complementary"||e==="navigation"||k.test(((o=t.className)==null?void 0:o.toString())??""))return!0;const n=t.style;if(n.display==="none"||n.visibility==="hidden"||n.opacity==="0"||t.hidden)return!0;const r=t.tagName.toLowerCase();return!!(r==="input"&&$.has(t.type)||r==="textarea")}function v(t){return t?t.replace(/[ \t\n\r]+/g," "):""}function h(t,e,n){for(const r of t.childNodes)D(r,e,n)}function g(t,e){const n=[];return h(t,n,e),n.join("")}function N(t,e,n){const r=t.getAttribute("href"),o=g(t,n).trim();if(o){if(!r||r.startsWith("#")||r.startsWith("javascript:")){e.push(o);return}try{const c=new URL(r,document.baseURI).href;e.push(`[${o}](${c})`)}catch{e.push(o)}}}function P(t,e){var o;const n=(o=t.getAttribute("alt"))==null?void 0:o.trim();if(!n)return;const r=t.getAttribute("src");if(r)try{const c=new URL(r,document.baseURI).href;e.push(`![${n}](${c})`)}catch{e.push(`![${n}]`)}else e.push(`![${n}]`)}function _(t,e){const n=t.querySelectorAll("tr");n.length!==0&&(e.push(`

`),n.forEach((r,o)=>{const c=r.querySelectorAll("th, td"),s=Array.from(c).map(i=>{var l;return(((l=i.textContent)==null?void 0:l.trim())??"").replace(/\|/g,"\\|")});e.push("| "+s.join(" | ")+` |
`),o===0&&e.push("| "+s.map(()=>"---").join(" | ")+` |
`)}),e.push(`
`))}function G(t,e,n){const r=g(t,n).trim();if(!r)return;const o=r.split(`
`).map(c=>"> "+c).join(`
`);e.push(`

`+o+`

`)}function L(t,e){var s;const n=t.querySelector("code"),r=(n??t).textContent??"";if(!r.trim())return;const o=(s=(n??t).className)==null?void 0:s.toString().match(/language-(\w+)/),c=o?o[1]:"";e.push("\n\n```"+c+`
`+r.trimEnd()+"\n```\n\n")}function j(t,e,n){const o=t.tagName.toLowerCase()==="ol";e.push(`
`);let c=1;for(const s of t.children)if(s.tagName.toLowerCase()==="li"){const i="  ".repeat(n.listDepth),l=o?`${c}. `:"- ";e.push(i+l);const a={listDepth:n.listDepth+1,inPre:n.inPre},u=g(s,a).trim();e.push(u+`
`),c++}n.listDepth===0&&e.push(`
`)}function D(t,e,n){if(t.nodeType===Node.TEXT_NODE){const c=n.inPre?t.textContent??"":v(t.textContent);c&&e.push(c);return}if(t.nodeType!==Node.ELEMENT_NODE)return;const r=t;if(A(r))return;const o=r.tagName.toLowerCase();if(q[o]){const c=g(r,n).trim();c&&e.push(`

`+q[o]+c+`

`);return}switch(o){case"p":{const c=g(r,n).trim();c&&e.push(`

`+c+`

`);return}case"a":N(r,e,n);return;case"img":P(r,e);return;case"ul":case"ol":j(r,e,n);return;case"table":_(r,e);return;case"blockquote":G(r,e,n);return;case"pre":L(r,e);return;case"code":if(n.inPre)h(r,e,n);else{const c=r.textContent??"";c&&e.push("`"+c+"`")}return;case"strong":case"b":e.push("**"),h(r,e,n),e.push("**");return;case"em":case"i":e.push("*"),h(r,e,n),e.push("*");return;case"br":e.push(`
`);return;case"hr":e.push(`

---

`);return;case"li":h(r,e,n);return;default:{const c=C.has(o);c&&e.push(`

`),h(r,e,n),c&&e.push(`

`);return}}}function y(t){const e=[];return h(t,e,{listDepth:0,inPre:!1}),e.join("").replace(/\n{3,}/g,`

`).trim()}function I(){const t=location.hostname,e=location.pathname;return t==="docs.google.com"&&e.startsWith("/presentation/")?"google-slides":t==="docs.google.com"&&e.startsWith("/document/")?"google-docs":t==="mail.google.com"?"gmail":"generic"}function M(){const t=document.querySelectorAll("article");if(t.length>1){const n=t[0].parentElement;if(n&&n!==document.body)return n}const e=document.querySelector("article")??document.querySelector('[role="main"]')??document.querySelector("main");return e||document.body}function x(t){var r,o;const e=t.querySelectorAll("svg text"),n=[];for(const c of e){const s=c.querySelectorAll("tspan");if(s.length>0)for(const i of s){const l=(r=i.textContent)==null?void 0:r.trim();l&&n.push(l)}else{const i=(o=c.textContent)==null?void 0:o.trim();i&&n.push(i)}}return n.join(`
`)}function U(){const t=[],e=document.querySelector(".punch-viewer-content");if(e){const n=e.querySelectorAll(".punch-viewer-svgpage");if(n.length>0)return n.forEach((o,c)=>{const s=x(o);s&&t.push(`## Slide ${c+1}

${s}`)}),t;const r=x(e);return r&&t.push(r),t}return t}function F(){const t=[],e=document.querySelector(".punch-filmstrip-scroll");return e&&e.querySelectorAll(".punch-filmstrip-thumbnail").forEach((r,o)=>{const c=x(r);c&&t.push(`## Slide ${o+1}

${c}`)}),t}function O(){var n;const t=document.querySelector(".punch-viewer-speakernotes-text");if(!t)return"";const e=(n=t.textContent)==null?void 0:n.trim();return e?`

---

**Speaker Notes:**
${e}`:""}function W(){const t=[],e=document.querySelectorAll('.slide-content, [class*="svgpage"]');if(e.length>0)return e.forEach((r,o)=>{const c=x(r);c&&t.push(`## Slide ${o+1}

${c}`)}),t;const n=document.querySelector('[role="main"], .punch-present-iframe, .punch-viewer-container');if(n){const r=x(n);r&&t.push(r)}return t}function K(){var e;const t=[".punch-viewer-content",".punch-viewer-container",'[role="main"]'];for(const n of t){const r=document.querySelector(n);if(r){const o=(e=r.innerText)==null?void 0:e.trim();if(o&&o.length>20)return o}}return""}function X(){let t=U();if(t.length===0&&(t=F()),t.length===0&&(t=W()),t.length>0){const n=O();return`# ${document.title}

${t.join(`

`)}${n}`}const e=K();return e?`# ${document.title}

${e}`:(console.warn("[onnx-llm] Google Slides: could not extract slide content (may be canvas-only rendering)"),"")}function B(){var n,r;const t=document.querySelectorAll(".kix-page");if(t.length===0)return"";const e=[];for(const o of t){const c=o.querySelectorAll(".kix-lineview");for(const s of c){const i=s.querySelector(".kix-lineview-content");if(!i)continue;const l=(n=i.textContent)==null?void 0:n.trim();if(!l)continue;const a=s.closest(".kix-paragraphrenderer"),u=(r=a==null?void 0:a.className)==null?void 0:r.match(/kix-paragraphrenderer--heading(\d)/);if(u){const d=parseInt(u[1],10),f="#".repeat(Math.min(d,6))+" ";e.push(`

${f}${l}

`)}else e.push(l)}}return e.join(`
`).replace(/\n{3,}/g,`

`).trim()}function R(){const t=[".kix-appview-editor",".docs-editor-container",'[role="main"]'];for(const e of t){const n=document.querySelector(e);if(n){const r=y(n);if(r&&r.length>20)return r}}return""}function Y(){var e;const t=[".kix-appview-editor",".docs-editor-container",'[role="main"]'];for(const n of t){const r=document.querySelector(n);if(r){const o=(e=r.innerText)==null?void 0:e.trim();if(o&&o.length>20)return o}}return""}function H(){let t=B();return t||(t=R()),t||(t=Y()),t?`# ${document.title}

${t}`:(console.warn("[onnx-llm] Google Docs: could not extract document content"),"")}function V(){var o;const t=[],e=document.querySelector("h2[data-thread-perm-id], h2.hP"),n=(o=e==null?void 0:e.textContent)==null?void 0:o.trim();n&&t.push(`# ${n}
`);const r=document.querySelectorAll(".gs");return r.length>0&&(r.forEach((c,s)=>{var m,p,S;const i=c.querySelector(".gD, [email]"),l=(i==null?void 0:i.getAttribute("name"))||((m=i==null?void 0:i.textContent)==null?void 0:m.trim())||"Unknown",a=c.querySelector(".g3, .date"),u=(a==null?void 0:a.getAttribute("title"))||((p=a==null?void 0:a.textContent)==null?void 0:p.trim())||"",d=u?`### ${l} — ${u}`:`### ${l}`;t.push(`
${d}
`);const f=c.querySelector(".a3s.aiL")||c.querySelector(".ii.gt");if(f){const b=y(f);if(b)t.push(b);else{const T=(S=f.innerText)==null?void 0:S.trim();T&&t.push(T)}}}),t.length>(n?1:0))?t.join(`

`).replace(/\n{3,}/g,`

`).trim():""}function z(){var o;const t=[],e=document.querySelector("h2[data-thread-perm-id], h2.hP"),n=(o=e==null?void 0:e.textContent)==null?void 0:o.trim();n&&t.push(`# ${n}
`);const r=document.querySelectorAll(".a3s.aiL, .ii.gt");return r.forEach((c,s)=>{var l;r.length>1&&t.push(`
### Message ${s+1}
`);const i=y(c);if(i)t.push(i);else{const a=(l=c.innerText)==null?void 0:l.trim();a&&t.push(a)}}),t.length>(n?1:0)?t.join(`

`).replace(/\n{3,}/g,`

`).trim():""}function J(){const t=document.querySelectorAll("tr.zA");if(t.length===0)return"";const e=[`# Gmail Inbox
`];return t.forEach(n=>{var i,l,a,u,d,f,m,p;const r=((l=(i=n.querySelector(".yX.xY .yP, .yX.xY .zF"))==null?void 0:i.textContent)==null?void 0:l.trim())||"",o=((u=(a=n.querySelector(".y6 .bog"))==null?void 0:a.textContent)==null?void 0:u.trim())||"",c=((f=(d=n.querySelector(".y2"))==null?void 0:d.textContent)==null?void 0:f.trim())||"",s=((p=(m=n.querySelector(".xW.xY .xW"))==null?void 0:m.textContent)==null?void 0:p.trim())||"";if(o||c){const S=[r,o,c,s].filter(Boolean).join(" — ");e.push(`- ${S}`)}}),e.length>1?e.join(`
`):""}function Q(){var e;const t=['[role="main"]',".nH.bkK",".AO"];for(const n of t){const r=document.querySelector(n);if(r){const o=(e=r.innerText)==null?void 0:e.trim();if(o&&o.length>50)return o}}return""}function Z(){let t=V();return t||(t=z()),t||(t=J()),t||(t=Q()),t||(console.warn("[onnx-llm] Gmail: could not extract email content"),"")}const tt="GET_PAGE_CONTENT",et="GET_SELECTED_TEXT",w=48e3;function nt(){const t=I();let e;switch(t){case"google-slides":e=X();break;case"google-docs":e=H();break;case"gmail":e=Z();break;default:{const n=M();e=y(n);break}}return e?e.slice(0,w):(document.body.innerText??"").replace(/\n{3,}/g,`

`).trim().slice(0,w)}function rt(){var t,e;return((e=(t=window.getSelection())==null?void 0:t.toString())==null?void 0:e.trim())??""}chrome.runtime.onMessage.addListener((t,e,n)=>{if(e.id!==chrome.runtime.id)return!1;switch(t.type){case"PING":n({ok:!0});break;case tt:n({content:nt(),title:document.title});break;case et:n({text:rt()});break}return!1});
