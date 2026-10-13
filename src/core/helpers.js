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
/* Acessibilidade: botões só-ícone e campos sem rótulo ganham aria-label (do title/placeholder). */
function a11yPass(root){
  root.querySelectorAll('button[title]:not([aria-label])').forEach(b=>{ if(b.textContent.trim().length<3) b.setAttribute('aria-label',b.title); });
  root.querySelectorAll('input[placeholder]:not([aria-label])').forEach(i=>{ if(!i.closest('label')) i.setAttribute('aria-label',i.placeholder); });
}
function sign(n){ return (n>=0?'+':'')+n; }


/* JSON.parse que descarta chaves perigosas (__proto__/constructor/prototype) em qualquer nível. */
function lerJSONSeguro(texto){
  return JSON.parse(texto,(k,v)=>(k==='__proto__'||k==='constructor'||k==='prototype')?undefined:v);
}
const LIMITE_ARQUIVO=8*1024*1024;   /* 8 MB: acima disso não lemos importações/backups */
/* Lê um File de texto com limite de tamanho; devolve Promise<string>. */
function lerArquivoTexto(file){
  return new Promise((ok,err)=>{
    if(!file) return err(new Error('Nenhum arquivo escolhido.'));
    if(file.size>LIMITE_ARQUIVO) return err(new Error('O arquivo é grande demais ('+(file.size/1048576).toFixed(1)+' MB). O limite é '+(LIMITE_ARQUIVO/1048576)+' MB.'));
    const rd=new FileReader();
    rd.onload=()=>ok(String(rd.result));
    rd.onerror=()=>err(new Error('Não foi possível ler o arquivo.'));
    rd.readAsText(file);
  });
}
