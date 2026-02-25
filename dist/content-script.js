const m=new Set(["script","style","noscript","svg","iframe","nav","header","footer","aside"]),g=/\b(ad|ads|advertisement|cookie|banner|modal|popup|social|share|sidebar|related|comments?)\b/i,T=new Set(["address","article","aside","blockquote","details","dialog","dd","div","dl","dt","fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","header","hgroup","hr","li","main","nav","ol","p","pre","section","table","ul"]),h={h1:"# ",h2:"## ",h3:"### ",h4:"#### ",h5:"##### ",h6:"###### "},E=new Set(["password","hidden","email","tel","number","search"]);function S(n){var i;if(m.has(n.tagName.toLowerCase())||n.getAttribute("aria-hidden")==="true")return!0;const e=n.getAttribute("role");if(e==="complementary"||e==="navigation"||g.test(((i=n.className)==null?void 0:i.toString())??""))return!0;const t=n.style;if(t.display==="none"||t.visibility==="hidden"||t.opacity==="0"||n.hidden)return!0;const r=n.tagName.toLowerCase();return!!(r==="input"&&E.has(n.type)||r==="textarea")}function b(n){return n?n.replace(/[ \t\n\r]+/g," "):""}function a(n,e,t){for(const r of n.childNodes)A(r,e,t)}function o(n,e){const t=[];return a(n,t,e),t.join("")}function y(n,e,t){const r=n.getAttribute("href"),i=o(n,t).trim();if(i){if(!r||r.startsWith("#")||r.startsWith("javascript:")){e.push(i);return}try{const s=new URL(r,document.baseURI).href;e.push(`[${i}](${s})`)}catch{e.push(i)}}}function w(n,e){var i;const t=(i=n.getAttribute("alt"))==null?void 0:i.trim();if(!t)return;const r=n.getAttribute("src");if(r)try{const s=new URL(r,document.baseURI).href;e.push(`![${t}](${s})`)}catch{e.push(`![${t}]`)}else e.push(`![${t}]`)}function C(n,e){const t=n.querySelectorAll("tr");t.length!==0&&(e.push(`

`),t.forEach((r,i)=>{const s=r.querySelectorAll("th, td"),c=Array.from(s).map(l=>{var u;return(((u=l.textContent)==null?void 0:u.trim())??"").replace(/\|/g,"\\|")});e.push("| "+c.join(" | ")+` |
`),i===0&&e.push("| "+c.map(()=>"---").join(" | ")+` |
`)}),e.push(`
`))}function N(n,e,t){const r=o(n,t).trim();if(!r)return;const i=r.split(`
`).map(s=>"> "+s).join(`
`);e.push(`

`+i+`

`)}function _(n,e){var c;const t=n.querySelector("code"),r=(t??n).textContent??"";if(!r.trim())return;const i=(c=(t??n).className)==null?void 0:c.toString().match(/language-(\w+)/),s=i?i[1]:"";e.push("\n\n```"+s+`
`+r.trimEnd()+"\n```\n\n")}function k(n,e,t){const i=n.tagName.toLowerCase()==="ol";e.push(`
`);let s=1;for(const c of n.children)if(c.tagName.toLowerCase()==="li"){const l="  ".repeat(t.listDepth),u=i?`${s}. `:"- ";e.push(l+u);const f={listDepth:t.listDepth+1,inPre:t.inPre},p=o(c,f).trim();e.push(p+`
`),s++}t.listDepth===0&&e.push(`
`)}function A(n,e,t){if(n.nodeType===Node.TEXT_NODE){const s=t.inPre?n.textContent??"":b(n.textContent);s&&e.push(s);return}if(n.nodeType!==Node.ELEMENT_NODE)return;const r=n;if(S(r))return;const i=r.tagName.toLowerCase();if(h[i]){const s=o(r,t).trim();s&&e.push(`

`+h[i]+s+`

`);return}switch(i){case"p":{const s=o(r,t).trim();s&&e.push(`

`+s+`

`);return}case"a":y(r,e,t);return;case"img":w(r,e);return;case"ul":case"ol":k(r,e,t);return;case"table":C(r,e);return;case"blockquote":N(r,e,t);return;case"pre":_(r,e);return;case"code":if(t.inPre)a(r,e,t);else{const s=r.textContent??"";s&&e.push("`"+s+"`")}return;case"strong":case"b":e.push("**"),a(r,e,t),e.push("**");return;case"em":case"i":e.push("*"),a(r,e,t),e.push("*");return;case"br":e.push(`
`);return;case"hr":e.push(`

---

`);return;case"li":a(r,e,t);return;default:{const s=T.has(i);s&&e.push(`

`),a(r,e,t),s&&e.push(`

`);return}}}function L(n){const e=[];return a(n,e,{listDepth:0,inPre:!1}),e.join("").replace(/\n{3,}/g,`

`).trim()}function P(){const n=document.querySelectorAll("article");if(n.length>1){const t=n[0].parentElement;if(t&&t!==document.body)return t}const e=document.querySelector("article")??document.querySelector('[role="main"]')??document.querySelector("main");return e||document.body}const G="GET_PAGE_CONTENT",q="GET_SELECTED_TEXT",d=48e3;function x(){const n=P(),e=L(n);return e?e.slice(0,d):(document.body.innerText??"").replace(/\n{3,}/g,`

`).trim().slice(0,d)}function D(){var n,e;return((e=(n=window.getSelection())==null?void 0:n.toString())==null?void 0:e.trim())??""}chrome.runtime.onMessage.addListener((n,e,t)=>{if(e.id!==chrome.runtime.id)return!1;switch(n.type){case"PING":t({ok:!0});break;case G:t({content:x(),title:document.title});break;case q:t({text:D()});break}return!1});
