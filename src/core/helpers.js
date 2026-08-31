/* ============================================================ HELPERS ============================================================ */
function h(tag, attrs){
  const e = document.createElement(tag);
  if(attrs) for(const k in attrs){
    const v = attrs[k];
    if(v==null || v===false) continue;
    if(k==='class') e.className = v;
    else if(k==='html') e.innerHTML = v;
    else if(k==='value') e.value = v;
    else if(k.slice(0,2)==='on') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if(k==='style' && typeof v==='object') Object.assign(e.style, v);
    else e.setAttribute(k, v===true?'':v);
  }
  for(let i=2;i<arguments.length;i++){
    let kid = arguments[i];
    if(kid==null) continue;
    if(Array.isArray(kid)){ kid.forEach(k2=>{ if(k2!=null) e.appendChild(node(k2)); }); }
    else e.appendChild(node(kid));
  }
  return e;
}
function node(x){ return (typeof x==='string'||typeof x==='number') ? document.createTextNode(x) : x; }
const uid = ()=>Math.random().toString(36).slice(2,9);
const load = k=>{ try{return JSON.parse(localStorage.getItem(k));}catch{return null;} };
const store = (k,v)=>localStorage.setItem(k,JSON.stringify(v));
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function sign(n){ return (n>=0?'+':'')+n; }

