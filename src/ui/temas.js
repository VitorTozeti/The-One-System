/* ============================================================ TEMAS (paletas de cores) ============================================================
   Cada tema só redefine as variáveis CSS do :root (ver styles.css). Fica FORA do #root,
   então trocar de tema nunca chama render() — a rolagem e o que você digitou ficam intactos.
   A escolha é salva no navegador (vale para todas as contas). */
const TEMAS = {
  noite:     {nome:'Noite',            ic:'🌙', v:{}},
  meianoite: {nome:'Meia-noite',       ic:'🌑', v:{'--bg':'#000000','--panel':'#0b0b0f','--panel2':'#060608','--line':'#26262e','--txt':'#f4f4f5','--muted':'#b4b4bd','--dim':'#8b8b96','--surf':'#17171c','--surf2':'#08080b','--line2':'#3a3a44','--indigo':'#818cf8','--indigo2':'#6366f1'}},
  oceano:    {nome:'Oceano',           ic:'🌊', v:{'--bg':'#06151f','--panel':'#0b2433','--panel2':'#081b28','--line':'#17435a','--txt':'#e0f2fe','--muted':'#9fc8dc','--dim':'#7aa8bf','--surf':'#0f3144','--surf2':'#071a26','--line2':'#1f5671','--indigo':'#0ea5e9','--indigo2':'#0284c7','--acc-txt':'#bae6fd','--acc-txt2':'#7dd3fc'}},
  floresta:  {nome:'Floresta',         ic:'🌲', v:{'--bg':'#0a1510','--panel':'#12241a','--panel2':'#0e1c14','--line':'#24402f','--txt':'#e7f5ea','--muted':'#a6c7b0','--dim':'#82a38d','--surf':'#193323','--surf2':'#0c1a12','--line2':'#2f5640','--indigo':'#22c55e','--indigo2':'#16a34a','--emerald':'#14b8a6','--acc-txt':'#bbf7d0','--acc-txt2':'#86efac'}},
  vinho:     {nome:'Vinho',            ic:'🍷', v:{'--bg':'#170a12','--panel':'#26111d','--panel2':'#1d0d16','--line':'#4a2237','--txt':'#fce7f1','--muted':'#d0a8bd','--dim':'#b08699','--surf':'#341829','--surf2':'#1a0b13','--line2':'#5f2e48','--indigo':'#ec4899','--indigo2':'#be185d','--acc-txt':'#fbcfe8','--acc-txt2':'#f9a8d4'}},
  grafite:   {nome:'Grafite',          ic:'🪨', v:{'--bg':'#121212','--panel':'#1c1c1e','--panel2':'#171718','--line':'#333338','--txt':'#ececec','--muted':'#b0b0b6','--dim':'#8a8a92','--surf':'#2a2a2d','--surf2':'#161617','--line2':'#46464c','--indigo':'#f59e0b','--indigo2':'#d97706','--acc-txt':'#fde68a','--acc-txt2':'#fcd34d'}},
  claro:     {nome:'Claro',            ic:'☀️', claro:1, v:{'--bg':'#f4f6fb','--panel':'#ffffff','--panel2':'#f0f3fa','--line':'#d5dbe8','--txt':'#1b2236','--muted':'#4a5670','--dim':'#667290','--surf':'#e6eaf4','--surf2':'#edf0f8','--line2':'#c2cade','--indigo':'#4f46e5','--indigo2':'#4338ca','--emerald':'#059669','--amber':'#b45309','--rose':'#be123c','--acc-txt':'#3730a3','--acc-txt2':'#4338ca','--warn-txt':'#92400e','--rose-txt':'#9f1239','--ok-txt':'#047857'}},
  pergaminho:{nome:'Pergaminho',       ic:'📜', claro:1, v:{'--bg':'#f1e7d0','--panel':'#faf3e2','--panel2':'#f4ead2','--line':'#d6c49b','--txt':'#2b2013','--muted':'#5c4a2e','--dim':'#7a6644','--surf':'#e8dab8','--surf2':'#efe3c6','--line2':'#c9b484','--indigo':'#9a3412','--indigo2':'#7c2d12','--emerald':'#4d7c0f','--amber':'#b45309','--rose':'#9f1239','--acc-txt':'#7c2d12','--acc-txt2':'#9a3412','--warn-txt':'#854d0e','--rose-txt':'#9f1239','--ok-txt':'#3f6212'}},
  contraste: {nome:'Alto contraste',   ic:'◐', v:{'--bg':'#000000','--panel':'#000000','--panel2':'#0a0a0a','--line':'#ffffff','--txt':'#ffffff','--muted':'#ffffff','--dim':'#e5e5e5','--surf':'#1a1a1a','--surf2':'#000000','--line2':'#ffffff','--indigo':'#ffd60a','--indigo2':'#e6b800','--emerald':'#00e676','--acc-txt':'#ffe666','--acc-txt2':'#ffd60a','--warn-txt':'#ffd60a','--rose-txt':'#ff8a9b','--ok-txt':'#69f0ae'}}
};
const TEMA_CHAVE='nexus-tema', TEMA_CUSTOM_CHAVE='nexus-tema-custom';
const TEMA_CUSTOM_PADRAO={bg:'#0b1020', panel:'#141a2e', txt:'#e2e8f0', acento:'#6366f1', claro:false};
const TEMA_BASE={'--bg':'#0b1020','--panel':'#141a2e','--indigo':'#6366f1'};
function _tmGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function _tmSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
function temaCustom(){ try{ return Object.assign({},TEMA_CUSTOM_PADRAO,JSON.parse(_tmGet(TEMA_CUSTOM_CHAVE)||'{}')); }catch(e){ return Object.assign({},TEMA_CUSTOM_PADRAO); } }
/* Deriva a paleta inteira de 4 cores escolhidas (fundo, painel, texto, destaque). */
function varsDoCustom(c){
  const m=(a,b,p)=>'color-mix(in srgb,'+a+' '+p+'%,'+b+')';
  return {'--bg':c.bg,'--panel':c.panel,'--panel2':m(c.panel,c.bg,60),'--line':m(c.txt,c.panel,18),'--txt':c.txt,'--muted':m(c.txt,c.panel,72),'--dim':m(c.txt,c.panel,55),
    '--surf':m(c.txt,c.panel,12),'--surf2':m(c.bg,c.panel,70),'--line2':m(c.txt,c.panel,28),'--indigo':c.acento,'--indigo2':m(c.acento,'#000',80),
    '--acc-txt':m(c.acento,c.txt,35),'--acc-txt2':m(c.acento,c.txt,50)};
}
function aplicaTema(id){
  if(!TEMAS[id]&&id!=='custom') id='noite';
  const raiz=document.documentElement, anteriores=raiz.dataset.temaVars?raiz.dataset.temaVars.split(','):[];
  anteriores.forEach(k=>{ if(k) raiz.style.removeProperty(k); });
  const c=temaCustom(), vars=id==='custom'?varsDoCustom(c):TEMAS[id].v, claro=id==='custom'?c.claro:!!TEMAS[id].claro;
  Object.keys(vars).forEach(k=>raiz.style.setProperty(k,vars[k]));
  raiz.dataset.temaVars=Object.keys(vars).join(','); raiz.dataset.tema=id;
  raiz.style.colorScheme=claro?'light':'dark';
  _tmSet(TEMA_CHAVE,id);
}
aplicaTema(_tmGet(TEMA_CHAVE)||'noite');

/* ---- seletor flutuante (fora do #root) ---- */
(function(){
  const css=document.createElement('style');
  css.textContent=
  '#tema-btn{position:fixed;left:14px;bottom:14px;z-index:60;width:42px;height:42px;border-radius:50%;border:1px solid var(--line);background:var(--panel);color:var(--txt);font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,.35)}'+
  '#tema-btn:hover{border-color:var(--indigo)}'+
  '#tema-pop{position:fixed;left:14px;bottom:64px;z-index:61;width:min(320px,calc(100vw - 28px));max-height:min(80vh,560px);overflow:auto;background:var(--panel);color:var(--txt);border:1px solid var(--line);border-radius:14px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,.5)}'+
  '#tema-pop[hidden]{display:none}'+
  '#tema-pop h4{margin:0 0 10px;font-size:14px}'+
  '.tema-grade{display:grid;grid-template-columns:1fr 1fr;gap:8px}'+
  '.tema-op{display:flex;align-items:center;gap:8px;padding:8px;border-radius:10px;border:2px solid var(--line);background:var(--surf2);color:var(--txt);font-size:13px;font-weight:700;text-align:left}'+
  '.tema-op[aria-pressed=true]{border-color:var(--indigo)}'+
  '.tema-amostra{display:flex;flex:0 0 auto;width:34px;height:22px;border-radius:6px;overflow:hidden;border:1px solid rgba(128,128,128,.4)}'+
  '.tema-amostra i{flex:1}'+
  '.tema-cust{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);display:none;gap:8px;flex-direction:column}'+
  '.tema-cust.on{display:flex}'+
  '.tema-cust label{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px}'+
  '.tema-cust input[type=color]{width:46px;height:30px;padding:0;border:1px solid var(--line);border-radius:6px;background:none}';
  document.head.appendChild(css);
  const btn=document.createElement('button'); btn.id='tema-btn'; btn.type='button'; btn.title='Mudar paleta de cores'; btn.setAttribute('aria-label','Mudar paleta de cores'); btn.textContent='🎨';
  const pop=document.createElement('div'); pop.id='tema-pop'; pop.hidden=true; pop.setAttribute('role','dialog'); pop.setAttribute('aria-label','Paleta de cores');
  function salvaCustom(k,val){ const n=temaCustom(); n[k]=val; _tmSet(TEMA_CUSTOM_CHAVE,JSON.stringify(n)); aplicaTema('custom'); }
  function monta(){
    const atual=document.documentElement.dataset.tema; pop.innerHTML='';
    const t=document.createElement('h4'); t.textContent='🎨 Paleta de cores'; pop.appendChild(t);
    const g=document.createElement('div'); g.className='tema-grade';
    const c=temaCustom();
    const ops=Object.keys(TEMAS).map(id=>({id:id,nome:TEMAS[id].nome,ic:TEMAS[id].ic,cores:[TEMAS[id].v['--bg']||TEMA_BASE['--bg'],TEMAS[id].v['--panel']||TEMA_BASE['--panel'],TEMAS[id].v['--indigo']||TEMA_BASE['--indigo']]}));
    ops.push({id:'custom',nome:'Personalizada',ic:'🎛️',cores:[c.bg,c.panel,c.acento]});
    ops.forEach(o=>{
      const b=document.createElement('button'); b.type='button'; b.className='tema-op'; b.setAttribute('aria-pressed',o.id===atual?'true':'false');
      const s=document.createElement('span'); s.className='tema-amostra';
      o.cores.forEach(cor=>{ const i=document.createElement('i'); i.style.background=cor; s.appendChild(i); });
      b.appendChild(s); b.appendChild(document.createTextNode(o.ic+' '+o.nome));
      b.onclick=()=>{ aplicaTema(o.id); monta(); }; g.appendChild(b);
    });
    pop.appendChild(g);
    const box=document.createElement('div'); box.className='tema-cust'+(atual==='custom'?' on':'');
    [['bg','Fundo'],['panel','Painéis'],['txt','Texto'],['acento','Destaque']].forEach(function(par){
      const k=par[0], l=document.createElement('label'); l.appendChild(document.createTextNode(par[1]));
      const i=document.createElement('input'); i.type='color'; i.value=c[k];
      /* 'input' dispara a cada movimento do seletor: aplica ao vivo sem refazer o popup (senão o seletor de cor fecharia) */
      i.addEventListener('input',()=>salvaCustom(k,i.value));
      l.appendChild(i); box.appendChild(l);
    });
    const l2=document.createElement('label'); l2.appendChild(document.createTextNode('Fundo claro (campos/controles claros)'));
    const ck=document.createElement('input'); ck.type='checkbox'; ck.checked=!!c.claro;
    ck.onchange=()=>salvaCustom('claro',ck.checked);
    l2.appendChild(ck); box.appendChild(l2);
    const rs=document.createElement('button'); rs.type='button'; rs.className='tema-op'; rs.textContent='↺ Restaurar cores padrão';
    rs.onclick=()=>{ _tmSet(TEMA_CUSTOM_CHAVE,JSON.stringify(TEMA_CUSTOM_PADRAO)); aplicaTema('custom'); monta(); }; box.appendChild(rs);
    pop.appendChild(box);
  }
  btn.onclick=()=>{ pop.hidden=!pop.hidden; if(!pop.hidden) monta(); };
  document.addEventListener('mousedown',e=>{ if(!pop.hidden&&!pop.contains(e.target)&&e.target!==btn) pop.hidden=true; });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!pop.hidden){ pop.hidden=true; btn.focus(); } });
  document.addEventListener('DOMContentLoaded',()=>{ document.body.appendChild(btn); document.body.appendChild(pop); });
})();
