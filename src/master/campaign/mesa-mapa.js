/* ============================================================ CAMPANHA — MESA (MAPA + TOKENS) ============================================================
   Substitui o antigo editor de mapas (geradores, pincel, camadas, peças…).
   Agora é simples e focado em jogar:
     • MAPA = uma imagem que você carrega (ou um quadro em branco). Fica salva na campanha
       (c.maps[]), com zoom/arrastar, pinça no celular e grade opcional.
     • TOKENS = biblioteca por CATEGORIA (Jogadores, Inimigos, NPCs, Criaturas, Objetos,
       Marcadores + as suas). Cada token pode ter FOTO ou ícone, cor, tamanho, PV e marcas.
       Você cria os seus próprios tokens (c.tokenLib) e categorias (c.tokenCats).
     • CONDIÇÕES: qualquer token ganha uma BORDA colorida (anel) por condição — as do
       sistema, as padrão ou as que você criar (c.tokenConds). Vários anéis viram um degradê.
   Posições em % da imagem (compatível com mapas, iniciativa e Tela dos jogadores antigos).
   Atualizações pequenas (arrastar, selecionar) mexem só no DOM e não chamam render():
   o mapa não pisca, não perde o zoom e a página não pula. */

/* ---------- Persistência leve ---------- */
let _persistTm=null;
function persistSoon(){ clearTimeout(_persistTm); _persistTm=setTimeout(()=>{ if(typeof persist==='function') persist(); },350); }
function persistNow(){ clearTimeout(_persistTm); if(typeof persist==='function') persist(); }

/* ---------- Estado de interface da mesa ---------- */
const MT={ ws:null, vp:null, area:null, side:null, layer:null, ro:null };
function mesa(){
  const u=S.ui;
  if(!u.mesa) u.mesa={ aba:'tokens', cat:'jogadores', sel:null, busca:'', form:null, novo:null, view:null, catEd:false, condEd:false };
  return u.mesa;
}
const MAPA_W=1000;                       /* largura lógica da área do mapa (unidades) */
function mapaH(m){ return MAPA_W/(m.aspect>0?m.aspect:1.6); }

/* ---------- Imagens ---------- */
function lerImagemArquivo(file, opts, cb){
  if(!file) return;
  const bad=m=>uiAlert(m,{titulo:'Imagem'});
  if(!/^image\//.test(file.type)) return bad('Selecione um arquivo de imagem (JPG, PNG, WebP…).');
  const rd=new FileReader();
  rd.onerror=()=>bad('Não foi possível ler o arquivo.');
  rd.onload=()=>{
    const img=new Image();
    img.onerror=()=>bad('Imagem inválida ou corrompida.');
    img.onload=()=>{
      const c=document.createElement('canvas'), x=c.getContext('2d');
      if(opts.quadrado){            /* token: recorta o centro em quadrado */
        const lado=Math.min(img.width,img.height), L=Math.min(opts.max,lado);
        c.width=c.height=L; x.drawImage(img,(img.width-lado)/2,(img.height-lado)/2,lado,lado,0,0,L,L);
        let u=c.toDataURL('image/webp',0.9); if(u.indexOf('data:image/webp')!==0) u=c.toDataURL('image/png');
        return cb(u,img.width/img.height);
      }
      const sc=Math.min(1,opts.max/Math.max(img.width,img.height));
      c.width=Math.max(1,Math.round(img.width*sc)); c.height=Math.max(1,Math.round(img.height*sc));
      x.drawImage(img,0,0,c.width,c.height);
      cb(c.toDataURL('image/jpeg',0.85), img.width/img.height);
    };
    img.src=rd.result;
  };
  rd.readAsDataURL(file);
}
/* Abre o seletor de arquivo do sistema e entrega o File escolhido. */
function escolherImagem(cb){
  const inp=h('input',{type:'file',accept:'image/*',style:{display:'none'}});
  inp.addEventListener('change',()=>{ const f=inp.files[0]; inp.remove(); if(f) cb(f); });
  document.body.appendChild(inp); inp.click();
}

/* ---------- Condições (anel colorido ao redor do token) ---------- */
const COND_PADRAO=[
  {k:'envenenado',  n:'Envenenado',  c:'#22c55e', ic:'☠️'},
  {k:'sangrando',   n:'Sangrando',   c:'#dc2626', ic:'🩸'},
  {k:'atordoado',   n:'Atordoado',   c:'#eab308', ic:'💫'},
  {k:'paralisado',  n:'Paralisado',  c:'#a855f7', ic:'⛓️'},
  {k:'caido',       n:'Caído',       c:'#78716c', ic:'⬇️'},
  {k:'inconsciente',n:'Inconsciente',c:'#475569', ic:'💤'},
  {k:'amedrontado', n:'Amedrontado', c:'#f97316', ic:'😨'},
  {k:'enfeiticado', n:'Enfeitiçado', c:'#ec4899', ic:'💞'},
  {k:'queimando',   n:'Queimando',   c:'#ef4444', ic:'🔥'},
  {k:'congelado',   n:'Congelado',   c:'#38bdf8', ic:'❄️'},
  {k:'protegido',   n:'Protegido',   c:'#3b82f6', ic:'🛡️'},
  {k:'abencoado',   n:'Abençoado',   c:'#fde047', ic:'✨'},
];
function condicoesDisponiveis(){
  const out=[], c=S.campaign||{}, sys=S.system||{};
  (sys.conditions||[]).forEach(x=>out.push({key:'sys:'+x.id, n:x.name||'Condição', c:x.color||'#e11d48', ic:x.icon||'⚠', src:'Do sistema'}));
  (c.tokenConds||[]).forEach(x=>out.push({key:'cus:'+x.id, n:x.n, c:x.c, ic:x.ic||'●', src:'Suas'}));
  COND_PADRAO.forEach(x=>out.push({key:'std:'+x.k, n:x.n, c:x.c, ic:x.ic, src:'Padrão'}));
  return out;
}
function condInfo(key){ return condicoesDisponiveis().find(x=>x.key===key)||null; }
function coresDoToken(t){ return (t.conds||[]).map(condInfo).filter(Boolean).map(x=>x.c); }
/* Fundo do anel: 1 cor = cor sólida; várias = fatias iguais (cônico). */
function fundoAnel(cores){
  if(cores.length<=1) return cores[0]||'transparent';
  const n=cores.length, f=100/n;
  return 'conic-gradient('+cores.map((c,i)=>c+' '+(i*f)+'% '+((i+1)*f)+'%').join(',')+')';
}

/* ---------- Categorias e biblioteca de tokens ---------- */
const CATS_AUTO=[
  {id:'jogadores', nome:'Jogadores', ic:'🧍', kind:'player', auto:true},
  {id:'inimigos',  nome:'Inimigos',  ic:'🐉', kind:'enemy',  auto:true},
  {id:'npcs',      nome:'NPCs',      ic:'🎭', kind:'npc',    auto:true},
];
/* CATS_INICIAIS (categorias criadas por padrão) fica em campaign-model.js. */
/* Tokens prontos (só ícone) — aparecem na categoria indicada, sem ocupar espaço salvo. */
const TOKENS_PRONTOS={
  criaturas:[['🐺','Lobo'],['🐻','Urso'],['🕷️','Aranha'],['🐍','Serpente'],['🦇','Morcego'],['🐀','Rato gigante'],['🦅','Águia'],['🐗','Javali'],
    ['👻','Fantasma'],['💀','Esqueleto'],['🧟','Zumbi'],['👹','Ogro'],['🧌','Troll'],['🐉','Dragão'],['🦎','Lagarto'],['🐙','Kraken']],
  objetos:[['📦','Caixa'],['🧰','Baú'],['🚪','Porta'],['🕯️','Tocha'],['🔥','Fogueira'],['🪨','Pedra'],['🌳','Árvore'],['⚰️','Caixão'],
    ['🗝️','Chave'],['🛢️','Barril'],['⛩️','Altar'],['🪤','Armadilha']],
  marcadores:[['📍','Ponto'],['❌','Alvo'],['⭐','Interesse'],['🚩','Bandeira'],['⚠️','Perigo'],['❓','Mistério'],['💎','Tesouro'],['🎯','Objetivo']],
};
function categoriasToken(){
  const c=S.campaign;
  return CATS_AUTO.concat((c.tokenCats||[]).map(x=>({id:x.id,nome:x.nome,ic:x.ic||'📁',kind:'npc',auto:false})));
}
function catMeta(id){ return categoriasToken().find(x=>x.id===id)||categoriasToken()[0]; }
/* Entradas clicáveis da categoria: {key,name,img,icon,color,size,kind,refId,libId,pronto} */
function entradasDaCategoria(catId){
  const c=S.campaign, cat=catMeta(catId), out=[];
  if(catId==='jogadores') (c.players||[]).forEach(p=>out.push({key:'p:'+p.id,name:p.name,img:(p.sheet&&p.sheet.photo)||null,kind:'player',refId:p.id,color:TOKEN_CORES.player}));
  if(catId==='inimigos')  (c.bestiary.enemies||[]).forEach(e=>out.push({key:'e:'+e.id,name:e.name,img:e.image||null,kind:'enemy',refId:e.id,color:TOKEN_CORES.enemy}));
  if(catId==='npcs')      (c.bestiary.npcs||[]).forEach(n=>out.push({key:'n:'+n.id,name:n.name,img:n.image||null,kind:'npc',refId:n.id,color:TOKEN_CORES.npc}));
  (c.tokenLib||[]).filter(l=>l.cat===catId).forEach(l=>out.push({key:'l:'+l.id,name:l.name,img:l.img||null,icon:l.icon||'',color:l.color,size:l.size,kind:cat.kind,libId:l.id,custom:true}));
  (TOKENS_PRONTOS[catId]||[]).forEach(([ic,nm])=>out.push({key:'x:'+catId+':'+nm,name:nm,icon:ic,color:'#94a3b8',size:100,kind:'npc',pronto:true}));
  return out;
}
function libToken(id){ return ((S.campaign||{}).tokenLib||[]).find(l=>l.id===id)||null; }

/* Nome/foto que um token mostra (jogador/bestiário/biblioteca). Usado também por iniciativa e Tela dos jogadores. */
function tokenRefInfo(t){
  const c=S.campaign; if(!c) return null;
  if(t.libId){ const l=libToken(t.libId); if(l) return {name:l.name, img:l.img||null}; }
  if(!t.refId) return null;
  if(t.kind==='player'){ const p=(c.players||[]).find(x=>x.id===t.refId); return p?{name:p.name, img:(p.sheet&&p.sheet.photo)||null}:null; }
  if(t.kind==='enemy'){ const s=(c.bestiary.enemies||[]).find(x=>x.id===t.refId); return s?{name:s.name, img:s.image||null}:null; }
  if(t.kind==='npc'){ const n=(c.bestiary.npcs||[]).find(x=>x.id===t.refId); return n?{name:n.name, img:n.image||null}:null; }
  return null;
}
function tokenImagem(t){ const ref=tokenRefInfo(t); return t.img||(ref&&ref.img)||null; }
function tokenNome(t){ return (t.label&&t.label!=='?')?t.label:((tokenRefInfo(t)||{}).name||t.label||'Token'); }
function kindEmoji(k){ return {player:'🧍', enemy:'🐉', npc:'🎭'}[k]||'❔'; }
/* Diâmetro-base do token em unidades do mapa: 1 casa da grade (quando há) ou 60. */
function tokenDiametro(t,m){
  const base=(m.grid&&m.grid.on)?m.grid.size*0.92:60;
  return Math.max(14,Math.round(base*(t.size||100)/100));
}

function achaToken(id){ const m=curMap(); return m?m.tokens.find(t=>t.id===id)||null:null; }

/* ============================ AÇÕES SOBRE O MAPA ============================ */
function novoMapaDados(nome,img,aspect,bg){
  const m=newMap('local','limpo',nome||'Novo mapa');
  m.image=img||null; m.aspect=aspect>0?aspect:1.6; m.bg=bg||null; m.grid={on:false,size:50,snap:true};
  return m;
}
function adicionaMapa(m){
  const c=S.campaign; c.maps.push(m); c.currentMapId=m.id;
  const u=mesa(); u.view=null; u.sel=null; u.novo=null;
  render();
}
function trocaImagemDoMapa(m){
  escolherImagem(f=>lerImagemArquivo(f,{max:2200},(data,asp)=>{
    if(data.length>2.4*1024*1024) showToast('Imagem pesada ('+(data.length/1048576).toFixed(1)+' MB em base64): o armazenamento do navegador é limitado.');
    m.image=data; m.aspect=asp; m.terrain=m.terrain; mesa().view=null; persistNow(); render();
  }));
}
function excluirMapa(m){
  const c=S.campaign, idx=c.maps.indexOf(m), era=c.currentMapId;
  c.maps.splice(idx,1);
  c.currentMapId=c.maps[0]?c.maps[0].id:null;
  mesa().sel=null; mesa().view=null; render();
  uiToastUndo('Mapa “'+m.name+'” excluído',()=>{ c.maps.splice(Math.min(idx,c.maps.length),0,m); c.currentMapId=era; render(); },9000);
}

/* ============================ TOKENS: COLOCAR / EDITAR ============================ */
function posicaoLivre(m){
  const k=m.tokens.length; return {x:Math.min(92,12+(k%9)*9), y:Math.min(90,14+Math.floor(k/9)*11)};
}
function colocaToken(e){
  const m=curMap(); if(!m) return showToast('Crie ou carregue um mapa primeiro.');
  if(e.refId){
    const ja=m.tokens.find(t=>t.refId===e.refId&&t.kind===e.kind);
    if(ja && e.kind==='player'){ selecionaToken(ja.id); return showToast(e.name+' já está no mapa.'); }
  }
  const t=newToken(e.kind||'npc', e.name, e.refId||null);
  t.icon=e.icon||''; t.color=e.color||t.color; t.size=e.size||100;
  if(e.libId) t.libId=e.libId;
  const p=posicaoLivre(m); t.xPct=p.x; t.yPct=p.y;
  if(m.grid&&m.grid.on&&m.grid.snap){ const s=snapPct(m,t.xPct,t.yPct); t.xPct=s.x; t.yPct=s.y; }
  m.tokens.push(t);
  mesa().sel=t.id; mesa().aba='tokens';
  reconstroiTokens(); atualizaLateral(); persistSoon();
}
function removeToken(t){
  const m=curMap(), i=m.tokens.indexOf(t); if(i<0) return;
  m.tokens.splice(i,1);
  if(mesa().sel===t.id) mesa().sel=null;
  reconstroiTokens(); atualizaLateral(); persistSoon();
  uiToastUndo('Token “'+tokenNome(t)+'” removido',()=>{ m.tokens.splice(Math.min(i,m.tokens.length),0,t); reconstroiTokens(); atualizaLateral(); persistSoon(); },7000);
}
function duplicaToken(t){
  const m=curMap(); const c2=JSON.parse(JSON.stringify(t)); c2.id=uid();
  c2.xPct=Math.min(96,t.xPct+4); c2.yPct=Math.min(96,t.yPct+4);
  if(c2.kind==='player'){ c2.kind='npc'; c2.refId=null; }   /* um jogador só tem um token */
  m.tokens.push(c2); mesa().sel=c2.id; reconstroiTokens(); atualizaLateral(); persistSoon();
}
function selecionaToken(id){
  const u=mesa(); u.sel=id;
  if(MT.layer) MT.layer.querySelectorAll('.mt-tok').forEach(el=>el.classList.toggle('sel',el.dataset.tid===id));
  atualizaLateral();
}
function alternaCondicao(t,key){
  t.conds=Array.isArray(t.conds)?t.conds:[];
  const i=t.conds.indexOf(key); if(i>=0) t.conds.splice(i,1); else t.conds.push(key);
  refazToken(t); atualizaLateral(); persistSoon();
}

/* ============================ DESENHO DOS TOKENS ============================ */
function tokenEl(t,m){
  const d=tokenDiametro(t,m), img=tokenImagem(t), cores=coresDoToken(t), sel=mesa().sel===t.id;
  const el=h('div',{class:'mt-tok kind-'+t.kind+(sel?' sel':'')+(t.hidden?' hid':'')+(t.locked?' lck':'')+(t.turn?' turn':'')+(cores.length?' tem-anel':''),
    'data-tid':t.id, title:tokenNome(t)+(cores.length?(' — '+(t.conds||[]).map(condInfo).filter(Boolean).map(x=>x.n).join(', ')):''),
    style:{left:t.xPct+'%',top:t.yPct+'%',width:d+'px',height:d+'px'}});
  if(cores.length){
    const w=Math.max(4,Math.round(d*0.13));
    el.appendChild(h('div',{class:'mt-ring',style:{inset:(-w)+'px',background:fundoAnel(cores),boxShadow:'0 0 '+Math.round(d*0.3)+'px '+cores[0]}}));
  }
  const glifo=(t.icon&&t.icon.trim())?t.icon.trim():(t.refId?kindEmoji(t.kind):((t.label||'?').trim().charAt(0)||'?'));
  const face=h('div',{class:'mt-face'+(img?'':' glifo'),style:{borderColor:t.color||'#94a3b8'}});
  if(img) face.style.backgroundImage='url('+img+')'; else { face.textContent=glifo; face.style.fontSize=Math.round(d*0.52)+'px'; }
  el.appendChild(face);
  if(t.marks&&t.marks.length) el.appendChild(h('div',{class:'mt-marks'},t.marks.slice(0,4).map(mk=>h('span',{},mk))));
  el.appendChild(h('div',{class:'mt-lbl'},tokenNome(t)));
  if(t.hp!=null&&t.hpMax){ const pc=Math.max(0,Math.min(100,(t.hp/t.hpMax)*100)); el.appendChild(h('div',{class:'mt-hp'},h('span',{style:{width:pc+'%'}}))); }
  return el;
}
function reconstroiTokens(){
  const m=curMap(); if(!m||!MT.layer) return;
  MT.layer.innerHTML='';
  m.tokens.forEach(t=>MT.layer.appendChild(tokenEl(t,m)));
  const n=document.getElementById('mt-contagem'); if(n) n.textContent=m.tokens.length;
}
function refazToken(t){
  const m=curMap(); if(!m||!MT.layer) return;
  const velho=MT.layer.querySelector('[data-tid="'+t.id+'"]'), novo=tokenEl(t,m);
  if(velho) velho.replaceWith(novo); else MT.layer.appendChild(novo);
}

/* ============================ SNAP / GRADE ============================ */
function snapPct(m,x,y){
  if(!(m.grid&&m.grid.on&&m.grid.snap)) return {x,y};
  const s=m.grid.size, H=mapaH(m);
  const cx=(Math.floor(x/100*MAPA_W/s)+.5)*s, cy=(Math.floor(y/100*H/s)+.5)*s;
  return {x:Math.max(0,Math.min(100,cx/MAPA_W*100)), y:Math.max(0,Math.min(100,cy/H*100))};
}
function gradeEl(m){
  const s=m.grid.size;
  return h('div',{class:'mt-grade',style:{backgroundSize:s+'px '+s+'px'}});
}

/* ============================ VIEWPORT: ZOOM / ARRASTAR ============================ */
function viewDe(m){ const u=mesa(); return (u.view&&u.view.id===m.id)?u.view:(u.view={id:m.id,s:1,x:0,y:0,fit:true}); }
function aplicaView(){
  const m=curMap(), vp=MT.vp, area=MT.area; if(!m||!vp||!area) return;
  const v=viewDe(m), w=vp.clientWidth, hh=vp.clientHeight, H=mapaH(m);
  if(!w||!hh) return;
  if(v.fit){ v.s=Math.max(.05,Math.min(w/MAPA_W,hh/H)*0.97); v.x=(w-MAPA_W*v.s)/2; v.y=(hh-H*v.s)/2; }
  v.s=Math.max(.05,Math.min(8,v.s));
  const keep=80, aw=MAPA_W*v.s, ah=H*v.s;
  v.x=Math.min(w-keep,Math.max(keep-aw,v.x)); v.y=Math.min(hh-keep,Math.max(keep-ah,v.y));
  area.style.transform='translate('+v.x+'px,'+v.y+'px) scale('+v.s+')';
  const lb=vp.querySelector('.mt-zlbl'); if(lb) lb.textContent=Math.round(v.s*100)+'%';
}
function zoomPara(f,cx,cy){
  const m=curMap(), vp=MT.vp; if(!m||!vp) return;
  const v=viewDe(m), s2=Math.max(.05,Math.min(8,v.s*f));
  if(cx==null){ cx=vp.clientWidth/2; cy=vp.clientHeight/2; }
  v.x=cx-(cx-v.x)*(s2/v.s); v.y=cy-(cy-v.y)*(s2/v.s); v.s=s2; v.fit=false; aplicaView();
}
function ajustaVista(){ const m=curMap(); if(!m) return; viewDe(m).fit=true; aplicaView(); }
function paraPct(ev){
  const m=curMap(), vp=MT.vp, v=viewDe(m), r=vp.getBoundingClientRect(), H=mapaH(m);
  const ux=(ev.clientX-r.left-v.x)/v.s, uy=(ev.clientY-r.top-v.y)/v.s;
  return {x:Math.max(0,Math.min(100,ux/MAPA_W*100)), y:Math.max(0,Math.min(100,uy/H*100))};
}
function ligaViewport(vp){
  const ptrs=new Map(); let g=null;
  const dist=()=>{ const [a,b]=[...ptrs.values()]; return Math.hypot(a.x-b.x,a.y-b.y); };
  const meio=()=>{ const [a,b]=[...ptrs.values()], r=vp.getBoundingClientRect(); return {x:(a.x+b.x)/2-r.left, y:(a.y+b.y)/2-r.top}; };
  vp.addEventListener('wheel',ev=>{ ev.preventDefault(); const r=vp.getBoundingClientRect();
    zoomPara(ev.deltaY<0?1.15:1/1.15,ev.clientX-r.left,ev.clientY-r.top); },{passive:false});
  vp.addEventListener('pointerdown',ev=>{
    if(ev.target.closest('.mt-zoom')) return;
    if(ev.pointerType==='mouse'&&ev.button!==0&&ev.button!==1) return;
    const m=curMap(); if(!m) return;
    try{ vp.setPointerCapture(ev.pointerId); }catch(e){}
    ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    if(ptrs.size===2){ const v=viewDe(m); g={t:'pinch',d0:dist(),s0:v.s,c:meio(),vx:v.x,vy:v.y}; return; }
    const te=ev.target.closest('[data-tid]'), v=viewDe(m);
    /* 📏 régua: arrasta para medir (botão da barra ou segurando Shift) */
    if((mesa().regua||ev.shiftKey)&&ev.button!==1){ g={t:'regua',p0:paraPct(ev),moved:false,sx:ev.clientX,sy:ev.clientY}; return; }
    if(te&&ev.button!==1){
      const t=achaToken(te.dataset.tid); if(!t) return;
      if(mesa().sel!==t.id) selecionaToken(t.id);
      if(t.locked){ g={t:'pan',sx:ev.clientX,sy:ev.clientY,vx:v.x,vy:v.y,moved:false}; return; }
      g={t:'tok',id:t.id,el:te,sx:ev.clientX,sy:ev.clientY,x0:t.xPct,y0:t.yPct,moved:false};
    } else g={t:'pan',sx:ev.clientX,sy:ev.clientY,vx:v.x,vy:v.y,moved:false,fundo:true};
  });
  vp.addEventListener('pointermove',ev=>{
    if(!ptrs.has(ev.pointerId)) return;
    ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    const m=curMap(); if(!m||!g) return;
    const v=viewDe(m);
    if(g.t==='pinch'&&ptrs.size>=2){
      const f=dist()/(g.d0||1), s2=Math.max(.05,Math.min(8,g.s0*f)), c=meio();
      v.x=c.x-(g.c.x-g.vx)*(s2/g.s0); v.y=c.y-(g.c.y-g.vy)*(s2/g.s0); v.s=s2; v.fit=false; aplicaView(); return;
    }
    const dx=ev.clientX-g.sx, dy=ev.clientY-g.sy;
    if(!g.moved&&Math.hypot(dx,dy)<4) return;
    g.moved=true;
    if(g.t==='regua'){ reguaDesenha(m,g.p0,paraPct(ev)); return; }
    if(g.t==='pan'){ v.x=g.vx+dx; v.y=g.vy+dy; v.fit=false; aplicaView(); }
    else if(g.t==='tok'){
      const t=achaToken(g.id); if(!t) return;
      let p=paraPct(ev);
      if(m.grid&&m.grid.on&&m.grid.snap&&!ev.altKey) p=snapPct(m,p.x,p.y);
      t.xPct=p.x; t.yPct=p.y; g.el.style.left=p.x+'%'; g.el.style.top=p.y+'%';
      g.el.classList.add('arrastando');
    }
  });
  const fim=ev=>{
    ptrs.delete(ev.pointerId);
    if(ptrs.size<2&&g&&g.t==='pinch') g=null;
    if(ptrs.size>0||!g) return;
    if(g.t==='regua'){ const el=MT.area&&MT.area.querySelector('.mt-regua'); if(el) setTimeout(()=>el.remove(),2500); g=null; return; }
    if(g.t==='tok'){ g.el.classList.remove('arrastando'); if(g.moved){ persistSoon(); atualizaLateral(); } }
    else if(g.t==='pan'&&!g.moved&&g.fundo&&mesa().sel){ mesa().sel=null; MT.layer.querySelectorAll('.mt-tok.sel').forEach(e=>e.classList.remove('sel')); atualizaLateral(); }
    g=null;
  };
  vp.addEventListener('pointerup',fim); vp.addEventListener('pointercancel',fim);
  vp.addEventListener('dblclick',ev=>{
    const te=ev.target.closest('[data-tid]'); if(!te) return;
    const t=achaToken(te.dataset.tid); if(!t) return;
    if(t.kind==='player'&&t.refId) return abrirFichaJogador(t.refId);
    const i=document.getElementById('mt-nome'); if(i){ i.focus(); i.select(); }
  });
  vp.addEventListener('contextmenu',ev=>ev.preventDefault());
  /* arrastar uma imagem do computador para cima do mapa troca o fundo */
  vp.addEventListener('dragover',ev=>{ if(ev.dataTransfer&&[...ev.dataTransfer.types].includes('Files')){ ev.preventDefault(); vp.classList.add('soltar'); } });
  vp.addEventListener('dragleave',()=>vp.classList.remove('soltar'));
  vp.addEventListener('drop',ev=>{
    vp.classList.remove('soltar');
    const f=ev.dataTransfer&&ev.dataTransfer.files&&ev.dataTransfer.files[0]; if(!f) return;
    ev.preventDefault(); const m=curMap(); if(!m) return;
    lerImagemArquivo(f,{max:2200},(data,asp)=>{ m.image=data; m.aspect=asp; mesa().view=null; persistNow(); render(); });
  });
}
/* Atalhos (uma única vez): Delete remove, Esc solta, setas empurram o token selecionado. */
let _teclasLigadas=false;
function ligaTeclas(){
  if(_teclasLigadas) return; _teclasLigadas=true;
  document.addEventListener('keydown',ev=>{
    if(!MT.ws||!document.body.contains(MT.ws)) return;
    const a=document.activeElement; if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
    const u=mesa(), t=u.sel&&achaToken(u.sel); if(!t) return;
    if(ev.key==='Delete'||ev.key==='Backspace'){ ev.preventDefault(); removeToken(t); }
    else if(ev.key==='Escape'){ u.sel=null; reconstroiTokens(); atualizaLateral(); }
    else if(/^Arrow/.test(ev.key)&&!t.locked){
      ev.preventDefault(); const p=ev.shiftKey?2:0.5, m=curMap();
      if(ev.key==='ArrowLeft') t.xPct=Math.max(0,t.xPct-p); if(ev.key==='ArrowRight') t.xPct=Math.min(100,t.xPct+p);
      if(ev.key==='ArrowUp') t.yPct=Math.max(0,t.yPct-p); if(ev.key==='ArrowDown') t.yPct=Math.min(100,t.yPct+p);
      refazToken(t); persistSoon();
    }
  });
}

/* ============================ TELA PRINCIPAL ============================ */
function mapaView(){
  const c=S.campaign, u=mesa();
  if(!Array.isArray(c.maps)) c.maps=[];
  ligaTeclas();
  if(!c.maps.length || u.novo) return telaNovoMapa();
  const m=curMap(), H=mapaH(m);
  const ws=h('div',{class:'mt-ws'});
  MT.ws=ws;

  /* ---- barra superior ---- */
  const sel=h('select',{class:'in mt-mapsel','aria-label':'Mapa aberto',onchange:e=>{ c.currentMapId=e.target.value; u.sel=null; u.view=null; render(); }},
    c.maps.map(x=>h('option',{value:x.id,selected:x.id===m.id?'':null},x.name)));
  const barra=h('div',{class:'mt-top'},
    sel,
    h('input',{class:'in mt-nomemapa',value:m.name,maxlength:'60','aria-label':'Nome do mapa',title:'Renomear o mapa',
      onchange:e=>{ m.name=e.target.value.trim()||'Mapa'; persistNow(); render(); }}),
    h('button',{class:'btn sm',type:'button',onclick:()=>{ u.novo={nome:''}; render(); }},'＋ Novo mapa'),
    h('button',{class:'btn sm ghost',type:'button',title:'Trocar a imagem do mapa (ou arraste uma imagem para cima do mapa)',onclick:()=>trocaImagemDoMapa(m)},'🖼 Trocar imagem'),
    h('span',{class:'mt-grow'}),
    h('button',{class:'btn sm '+(m.grid.on?'emerald':'ghost'),type:'button','aria-pressed':m.grid.on?'true':'false',onclick:()=>{ m.grid.on=!m.grid.on; persistNow(); render(); }},(m.grid.on?'✓ ':'')+'Grade'),
    m.grid.on?h('label',{class:'mt-gsz',title:'Tamanho de cada casa'},'casa',
      h('input',{class:'in',type:'number',min:'12',max:'300',step:'2',value:m.grid.size,'aria-label':'Tamanho da casa da grade',
        onchange:e=>{ m.grid.size=Math.max(12,Math.min(300,parseInt(e.target.value)||50)); persistNow(); render(); }})):null,
    m.grid.on?h('button',{class:'btn sm '+(m.grid.snap?'emerald':'ghost'),type:'button',title:'Tokens encaixam no centro da casa (segure Alt para soltar livre)',
      onclick:()=>{ m.grid.snap=!m.grid.snap; persistNow(); render(); }},(m.grid.snap?'✓ ':'')+'Ímã'):null,
    h('button',{class:'btn sm '+(u.regua?'emerald':'ghost'),type:'button','aria-pressed':u.regua?'true':'false',title:'Arraste no mapa para medir a distância (ou segure Shift e arraste)',onclick:()=>{ u.regua=!u.regua; render(); }},(u.regua?'✓ ':'')+'📏 Régua'),
    h('button',{class:'btn sm danger',type:'button',title:'Excluir este mapa',onclick:async()=>{
      if(await uiConfirm('Excluir o mapa “'+m.name+'” e os '+m.tokens.length+' token(s) dele?',{titulo:'Excluir mapa',okText:'Excluir',perigo:true})) excluirMapa(m); }},'🗑'));

  /* ---- área do mapa ---- */
  const area=h('div',{class:'mt-area',style:{width:MAPA_W+'px',height:H+'px'}});
  if(m.bg) area.style.background=m.bg;
  if(m.image) area.style.background=(m.bg||'#0e1424')+' url('+m.image+') center/100% 100% no-repeat';
  const camadaTokens=h('div',{class:'mt-tokens'});
  if(m.terrain) area.appendChild(h('img',{class:'mt-terreno',src:m.terrain,alt:''}));
  if(m.grid.on) area.appendChild(gradeEl(m));
  (m.pins||[]).forEach(p=>area.appendChild(h('div',{class:'mt-pin',style:{left:p.xPct+'%',top:p.yPct+'%'},title:p.label||''},p.icon||'📍')));
  area.appendChild(camadaTokens);
  MT.area=area; MT.layer=camadaTokens;

  const vp=h('div',{class:'mt-vp'},area,
    h('div',{class:'mt-zoom'},
      h('button',{type:'button',title:'Aproximar','aria-label':'Aproximar',onclick:()=>zoomPara(1.3)},'+'),
      h('span',{class:'mt-zlbl'},'100%'),
      h('button',{type:'button',title:'Afastar','aria-label':'Afastar',onclick:()=>zoomPara(1/1.3)},'−'),
      h('button',{type:'button',title:'Enquadrar o mapa','aria-label':'Enquadrar o mapa',onclick:ajustaVista},'⟲')),
    (!m.image&&!m.tokens.length)?h('div',{class:'mt-dica'},'Mapa em branco — clique em “🖼 Trocar imagem” (ou arraste uma imagem para cá) e adicione tokens pela biblioteca ao lado.'):null);
  MT.vp=vp;
  ligaViewport(vp);

  const aviso=legadoAviso(m);
  MT.side=h('aside',{class:'mt-side','aria-label':'Tokens'});
  ws.appendChild(barra);
  if(aviso) ws.appendChild(aviso);
  ws.appendChild(h('div',{class:'mt-body'}, h('div',{class:'mt-stage'},vp), MT.side));
  reconstroiTokens(); preencheLateral();

  requestAnimationFrame(()=>montaVista(ws)); setTimeout(()=>montaVista(ws),60);
  return ws;
}
function montaVista(ws){
  if(!document.body.contains(ws)||MT.ws!==ws) return;
  aplicaView();
  if(MT.ro){ try{ MT.ro.disconnect(); }catch(e){} }
  if(typeof ResizeObserver!=='undefined'&&MT.vp){ MT.ro=new ResizeObserver(()=>{ if(document.body.contains(ws)) aplicaView(); }); MT.ro.observe(MT.vp); }
}
/* Mapas criados no editor antigo: avisa o que não aparece mais (os dados continuam salvos). */
function legadoAviso(m){
  const objs=(m.objs||[]).length+(m.props||[]).length;
  if(!objs&&!(m.world&&(m.world.kingdoms||[]).length)) return null;
  return h('div',{class:'mt-legado',role:'note'},'ℹ️ Este mapa veio do editor antigo. A imagem, a pintura e os locais aparecem aqui; os '+objs+' objeto(s)/peça(s) desenhados continuam guardados, mas não são mais exibidos. Se quiser, carregue uma imagem nova em “🖼 Trocar imagem”.');
}

/* ---------- Criar mapa ---------- */
function telaNovoMapa(){
  const c=S.campaign, u=mesa(), tem=c.maps.length>0, d=u.novo||(u.novo={nome:''});
  let imgData=null, asp=1.6;
  const prev=h('div',{class:'mt-np-prev'},'Nenhuma imagem escolhida');
  const nome=h('input',{class:'in',id:'mt-novo-nome',value:d.nome,maxlength:'60',placeholder:'Nome do mapa (ex.: Taverna do Corvo)',oninput:e=>{ d.nome=e.target.value; }});
  const salvar=bg=>{
    const n=(d.nome||'').trim()||'Mapa '+(c.maps.length+1);
    adicionaMapa(novoMapaDados(n,imgData,asp,bg));
  };
  const escolher=()=>escolherImagem(f=>lerImagemArquivo(f,{max:2200},(data,a)=>{
    imgData=data; asp=a;
    prev.textContent=''; prev.style.backgroundImage='url('+data+')'; prev.classList.add('tem');
    if(!d.nome){ const n=(f.name||'').replace(/\.[^.]+$/,'').slice(0,60); nome.value=n; d.nome=n; }
    btnOk.disabled=false;
    if(data.length>2.4*1024*1024) showToast('Imagem pesada ('+(data.length/1048576).toFixed(1)+' MB): considere reduzi-la.');
  }));
  const btnOk=h('button',{class:'btn primary',type:'button',disabled:true,onclick:()=>salvar(null)},'✔ Criar com esta imagem');
  return h('div',{class:'mt-novo'},
    h('h3',{},tem?'Novo mapa':'Crie seu primeiro mapa'),
    h('div',{class:'hint'},'Carregue a imagem do mapa (batalha, cidade, masmorra, mundo…). Ela fica salva na campanha. Depois é só colocar os tokens.'),
    h('label',{class:'f'},h('span',{},'Nome'),nome),
    h('div',{class:'mt-np'},
      prev,
      h('div',{class:'mt-np-bt'},
        h('button',{class:'btn emerald',type:'button',onclick:escolher},'📁 Escolher imagem…'),
        btnOk,
        h('button',{class:'btn ghost',type:'button',title:'Um quadro vazio de uma cor, sem imagem',onclick:()=>salvar('#1b2236')},'▢ Quadro em branco'))),
    tem?h('button',{class:'btn ghost sm',type:'button',onclick:()=>{ u.novo=null; render(); }},'← Voltar ao mapa'):null);
}

/* ============================ PAINEL LATERAL ============================ */
function atualizaLateral(){
  if(!MT.side||!document.body.contains(MT.side)) return;
  preencheLateral();
}
function preencheLateral(){
  const m=curMap(); if(!m||!MT.side) return;
  MT.side.innerHTML='';
  const u=mesa(), t=u.sel&&achaToken(u.sel);
  if(u.sel&&!t) u.sel=null;
  if(t) MT.side.appendChild(editorToken(t,m));
  MT.side.appendChild(h('div',{class:'mt-abas',role:'tablist'},
    abaBtn('tokens','🧍 Biblioteca'),
    abaBtn('campo','📌 No mapa',m.tokens.length)));
  MT.side.appendChild(u.aba==='campo'?listaNoMapa(m):biblioteca());
}
function abaBtn(k,txt,n){
  const u=mesa();
  return h('button',{type:'button',role:'tab','aria-selected':u.aba===k?'true':'false',class:'mt-aba'+(u.aba===k?' on':''),
    onclick:()=>{ u.aba=k; atualizaLateral(); }},txt,n!=null?h('span',{class:'n',id:k==='campo'?'mt-contagem':null},n):null);
}
function listaNoMapa(m){
  if(!m.tokens.length) return h('div',{class:'mt-vazio'},'Nenhum token no mapa ainda. Use a biblioteca para adicionar.');
  const u=mesa();
  return h('div',{class:'mt-lista'}, m.tokens.map(t=>{
    const img=tokenImagem(t), cores=coresDoToken(t);
    const av=h('span',{class:'mt-av'+(img?'':' glifo'),style:{borderColor:t.color||'#94a3b8'}});
    if(img) av.style.backgroundImage='url('+img+')'; else av.textContent=(t.icon&&t.icon.trim())||kindEmoji(t.kind);
    return h('div',{class:'mt-li'+(u.sel===t.id?' on':'')},
      h('button',{type:'button',class:'mt-li-b',onclick:()=>selecionaToken(t.id)},
        av, h('span',{class:'nm'},tokenNome(t)),
        cores.length?h('span',{class:'mt-pts'},cores.map(c=>h('i',{style:{background:c}}))):null),
      h('button',{type:'button',class:'btn ghost sm',title:t.hidden?'Oculto dos jogadores — clique para mostrar':'Visível — clique para ocultar dos jogadores','aria-pressed':t.hidden?'true':'false',
        onclick:()=>{ t.hidden=!t.hidden; refazToken(t); atualizaLateral(); persistSoon(); }},t.hidden?'🙈':'👁'));
  }));
}

/* ---------- Editor do token selecionado ---------- */
function editorToken(t,m){
  const ref=tokenRefInfo(t), img=tokenImagem(t);
  const mud=(fn)=>{ fn(); refazToken(t); persistSoon(); };
  const av=h('div',{class:'mt-ed-av'+(img?'':' glifo'),style:{borderColor:t.color||'#94a3b8'}});
  if(img) av.style.backgroundImage='url('+img+')'; else av.textContent=(t.icon&&t.icon.trim())||kindEmoji(t.kind);
  const cond=condicoesDisponiveis();
  const grupos=['Do sistema','Suas','Padrão'].map(src=>{
    const l=cond.filter(x=>x.src===src); if(!l.length) return null;
    return h('div',{class:'mt-cgrp'}, h('div',{class:'mt-csrc'},src),
      h('div',{class:'row wrapf'}, l.map(x=>{
        const on=(t.conds||[]).includes(x.key);
        return h('button',{type:'button',class:'mt-cond'+(on?' on':''),'aria-pressed':on?'true':'false',style:{'--cc':x.c},title:x.n,onclick:()=>alternaCondicao(t,x.key)},
          h('i',{style:{background:x.c}}),x.ic+' '+x.n); })));
  });
  const novaCond=mesa().condEd
    ? condForm()
    : h('button',{class:'btn ghost sm',type:'button',onclick:()=>{ mesa().condEd={n:'',c:'#f43f5e',ic:''}; atualizaLateral(); }},'＋ Criar condição');
  return h('div',{class:'mt-ed'},
    h('div',{class:'mt-ed-h'},
      av,
      h('div',{class:'mt-ed-t'},
        h('input',{class:'in',id:'mt-nome',value:t.label&&t.label!=='?'?t.label:((ref&&ref.name)||''),maxlength:'40',placeholder:'Nome do token','aria-label':'Nome do token',
          oninput:e=>{ t.label=e.target.value||'?'; const el=MT.layer.querySelector('[data-tid="'+t.id+'"] .mt-lbl'); if(el) el.textContent=tokenNome(t); persistSoon(); }}),
        h('div',{class:'hint'},ref?('Ligado a: '+kindEmoji(t.kind)+' '+ref.name):'Token avulso')),
      h('button',{class:'btn ghost sm',type:'button',title:'Fechar (Esc)','aria-label':'Fechar edição',onclick:()=>{ mesa().sel=null; reconstroiTokens(); atualizaLateral(); }},'✕')),
    h('div',{class:'row wrapf'},
      h('button',{class:'btn sm',type:'button',onclick:()=>escolherImagem(f=>lerImagemArquivo(f,{max:256,quadrado:true},data=>{ t.img=data; refazToken(t); persistNow(); atualizaLateral(); }))},'📷 '+(t.img?'Trocar foto':'Foto')),
      t.img?h('button',{class:'btn ghost sm',type:'button',onclick:()=>{ t.img=null; refazToken(t); persistSoon(); atualizaLateral(); }},'Remover foto'):null,
      h('label',{class:'mt-mini',title:'Ícone (emoji) quando não há foto'},'ícone',
        h('input',{class:'in',value:t.icon||'',maxlength:'4',style:{width:'54px',textAlign:'center'},'aria-label':'Ícone do token',oninput:e=>mud(()=>{ t.icon=e.target.value; })})),
      h('label',{class:'mt-mini',title:'Cor da borda base'},'cor',
        h('input',{type:'color',value:toHex(t.color||'#94a3b8'),'aria-label':'Cor do token',oninput:e=>mud(()=>{ t.color=e.target.value; })}))),
    h('div',{class:'mt-sec'},'Tamanho'),
    h('div',{class:'row wrapf'},
      TOKEN_SIZES.map(s=>h('button',{type:'button',class:'btn sm '+((t.size||100)===s.pct?'emerald':'ghost'),onclick:()=>{ mud(()=>{ t.size=s.pct; }); atualizaLateral(); }},s.nome)),
      h('input',{type:'range',min:'40',max:'320',step:'5',value:t.size||100,'aria-label':'Tamanho do token',style:{flex:'1',minWidth:'90px'},
        oninput:e=>mud(()=>{ t.size=+e.target.value; }),onchange:()=>atualizaLateral()})),
    h('div',{class:'mt-sec'},'Condições ',h('span',{class:'hint'},'— a borda do token muda de cor')),
    ...grupos, novaCond,
    h('div',{class:'mt-sec'},'Pontos de vida'),
    h('div',{class:'row'},
      h('input',{class:'in',type:'number',placeholder:'atual',value:t.hp==null?'':t.hp,style:{width:'80px'},'aria-label':'PV atual',onchange:e=>{ const v=e.target.value===''?null:parseInt(e.target.value); mud(()=>{ t.hp=Number.isNaN(v)?null:v; }); }}),
      h('span',{},'/'),
      h('input',{class:'in',type:'number',placeholder:'máx',value:t.hpMax==null?'':t.hpMax,style:{width:'80px'},'aria-label':'PV máximo',onchange:e=>{ const v=e.target.value===''?null:parseInt(e.target.value); mud(()=>{ t.hpMax=Number.isNaN(v)?null:v; }); }})),
    h('div',{class:'mt-sec'},'Marcas'),
    h('div',{class:'row wrapf'}, TOKEN_MARKS.map(mk=>{ const on=(t.marks||[]).includes(mk);
      return h('button',{type:'button',class:'chip'+(on?' on':''),'aria-pressed':on?'true':'false',onclick:()=>{ mud(()=>{ t.marks=on?t.marks.filter(x=>x!==mk):[...(t.marks||[]),mk]; }); atualizaLateral(); }},mk); })),
    h('div',{class:'row wrapf mt-acoes'},
      h('button',{class:'btn sm '+(t.hidden?'amber':'ghost'),type:'button',onclick:()=>{ mud(()=>{ t.hidden=!t.hidden; }); atualizaLateral(); }},t.hidden?'🙈 Oculto dos jogadores':'👁 Visível'),
      h('button',{class:'btn sm '+(t.locked?'amber':'ghost'),type:'button',title:'Travado: não dá para arrastar sem querer',onclick:()=>{ mud(()=>{ t.locked=!t.locked; }); atualizaLateral(); }},t.locked?'🔒 Travado':'🔓 Livre'),
      t.kind==='player'&&t.refId?h('button',{class:'btn sm ghost',type:'button',onclick:()=>abrirFichaJogador(t.refId)},'📄 Ficha'):null,
      h('button',{class:'btn sm ghost',type:'button',onclick:()=>duplicaToken(t)},'⎘ Duplicar'),
      h('button',{class:'btn sm danger',type:'button',onclick:()=>removeToken(t)},'🗑 Remover')));
}
function condForm(){
  const f=mesa().condEd;
  return h('div',{class:'mt-cform'},
    h('input',{class:'in',value:f.n,maxlength:'24',placeholder:'Nome (ex.: Concentrado)','aria-label':'Nome da condição',oninput:e=>{ f.n=e.target.value; }}),
    h('input',{class:'in',value:f.ic,maxlength:'4',placeholder:'🙂',style:{width:'54px',textAlign:'center'},'aria-label':'Ícone da condição',oninput:e=>{ f.ic=e.target.value; }}),
    h('input',{type:'color',value:f.c,'aria-label':'Cor da borda',oninput:e=>{ f.c=e.target.value; }}),
    h('button',{class:'btn sm primary',type:'button',onclick:()=>{
      const n=(f.n||'').trim(); if(!n) return showToast('Dê um nome à condição.');
      const c=S.campaign; c.tokenConds=c.tokenConds||[];
      const nova={id:uid(),n:n.slice(0,24),c:f.c,ic:(f.ic||'').trim()};
      c.tokenConds.push(nova);
      const t=mesa().sel&&achaToken(mesa().sel); if(t){ t.conds=t.conds||[]; t.conds.push('cus:'+nova.id); refazToken(t); }
      mesa().condEd=null; atualizaLateral(); persistSoon();
    }},'Criar'),
    h('button',{class:'btn sm ghost',type:'button',onclick:()=>{ mesa().condEd=null; atualizaLateral(); }},'Cancelar'));
}

/* ---------- Biblioteca (categorias + tokens) ---------- */
function biblioteca(){
  const c=S.campaign, u=mesa(), cats=categoriasToken();
  if(!cats.some(x=>x.id===u.cat)) u.cat=cats[0].id;
  if(u.form) return formToken();
  const cat=catMeta(u.cat), ents=entradasDaCategoria(u.cat);

  const pills=h('div',{class:'mt-cats',role:'tablist','aria-label':'Categorias de token'},
    cats.map(x=>h('button',{type:'button',role:'tab','aria-selected':x.id===u.cat?'true':'false',class:'mt-cat'+(x.id===u.cat?' on':''),
      onclick:()=>{ u.cat=x.id; u.catEd=false; atualizaLateral(); }},x.ic+' '+x.nome)),
    h('button',{type:'button',class:'mt-cat add',title:'Criar uma categoria nova',onclick:async()=>{
      const n=await uiPrompt('Nome da nova categoria de tokens:','',{titulo:'Nova categoria'}); if(!n||!n.trim()) return;
      c.tokenCats=c.tokenCats||[]; const nova={id:'c'+uid(),nome:n.trim().slice(0,24),ic:'📁'}; c.tokenCats.push(nova);
      u.cat=nova.id; persistNow(); atualizaLateral(); }},'＋'));

  const cab=h('div',{class:'mt-cab'},
    h('b',{},cat.ic+' '+cat.nome),
    h('span',{class:'hint'},ents.length+' token(s)'),
    h('span',{class:'mt-grow'}),
    !cat.auto?h('button',{type:'button',class:'btn ghost sm',title:'Renomear / trocar ícone da categoria',onclick:()=>{ u.catEd=!u.catEd; atualizaLateral(); }},'✏️'):null,
    !cat.auto?h('button',{type:'button',class:'btn ghost sm',title:'Excluir a categoria',onclick:()=>excluirCategoria(cat)},'🗑'):null);
  const edCat=(u.catEd&&!cat.auto)?h('div',{class:'mt-cform'},
    h('input',{class:'in',value:cat.nome,maxlength:'24','aria-label':'Nome da categoria',onchange:e=>{ const k=c.tokenCats.find(x=>x.id===cat.id); if(k){ k.nome=e.target.value.trim()||k.nome; persistNow(); atualizaLateral(); } }}),
    h('input',{class:'in',value:cat.ic,maxlength:'4',style:{width:'54px',textAlign:'center'},'aria-label':'Ícone da categoria',onchange:e=>{ const k=c.tokenCats.find(x=>x.id===cat.id); if(k){ k.ic=e.target.value.trim()||'📁'; persistNow(); atualizaLateral(); } }})):null;

  const busca=h('input',{class:'in',type:'search',placeholder:'Buscar nesta categoria…','aria-label':'Buscar token',value:u.busca||'',
    oninput:e=>{ u.busca=e.target.value; const q=semAcento(u.busca.trim());
      grade.querySelectorAll('[data-nm]').forEach(b=>{ b.style.display=(!q||b.dataset.nm.includes(q))?'':'none'; }); }});
  const grade=h('div',{class:'mt-grid'});
  ents.forEach(e=>{
    const av=h('span',{class:'mt-tile-av'+(e.img?'':' glifo'),style:{borderColor:e.color||'#94a3b8'}});
    if(e.img) av.style.backgroundImage='url('+e.img+')'; else av.textContent=(e.icon&&e.icon.trim())||kindEmoji(e.kind);
    const tile=h('div',{class:'mt-tile'+(e.pronto?' pronto':''),'data-nm':semAcento(e.name)},
      h('button',{type:'button',class:'mt-tile-b',title:'Colocar “'+e.name+'” no mapa',onclick:()=>colocaToken(e)},av,h('span',{class:'nm'},e.name)),
      e.custom?h('button',{type:'button',class:'mt-tile-ed',title:'Editar este token','aria-label':'Editar '+e.name,onclick:()=>{ const l=libToken(e.libId);
        u.form={id:l.id,name:l.name,cat:l.cat,img:l.img||null,icon:l.icon||'',color:l.color||'#6366f1',size:l.size||100}; atualizaLateral(); }},'✏️'):null);
    grade.appendChild(tile);
  });
  if(!ents.length) grade.appendChild(h('div',{class:'mt-vazio'},
    cat.id==='jogadores'?'Nenhum jogador cadastrado. Adicione na seção Jogadores — ou crie um token avulso abaixo.':
    cat.id==='inimigos'?'Nenhum inimigo no bestiário. Crie na seção Bestiário — ou crie um token avulso abaixo.':
    cat.id==='npcs'?'Nenhum NPC no bestiário ainda. Crie na seção Bestiário — ou crie um token avulso abaixo.':
    'Categoria vazia. Crie o seu primeiro token aqui.'));
  const q0=semAcento((u.busca||'').trim());
  if(q0) setTimeout(()=>grade.querySelectorAll('[data-nm]').forEach(b=>{ b.style.display=b.dataset.nm.includes(q0)?'':'none'; }),0);

  return h('div',{class:'mt-lib'}, pills, cab, edCat, busca, grade,
    h('button',{type:'button',class:'btn primary mt-criar',onclick:()=>{
      u.form={id:null,name:'',cat:u.cat,img:null,icon:'',color:'#6366f1',size:100}; atualizaLateral(); setTimeout(()=>{ const i=document.getElementById('mt-f-nome'); if(i) i.focus(); },0); }},'＋ Criar meu próprio token'));
}
async function excluirCategoria(cat){
  const c=S.campaign, u=mesa();
  const usados=(c.tokenLib||[]).filter(l=>l.cat===cat.id);
  const msg=usados.length?('A categoria “'+cat.nome+'” tem '+usados.length+' token(s) seu(s). Eles serão movidos para “Criaturas”/primeira categoria.'):'Excluir a categoria “'+cat.nome+'”?';
  if(!await uiConfirm(msg,{titulo:'Excluir categoria',okText:'Excluir',perigo:true})) return;
  c.tokenCats=(c.tokenCats||[]).filter(x=>x.id!==cat.id);
  const destino=(c.tokenCats[0]||{}).id||'npcs';
  usados.forEach(l=>{ l.cat=destino; });
  u.cat=destino; persistNow(); atualizaLateral();
}

/* ---------- Criar / editar token da biblioteca ---------- */
function formToken(){
  const c=S.campaign, u=mesa(), f=u.form;
  c.tokenLib=c.tokenLib||[];
  const av=h('div',{class:'mt-ed-av grande'+(f.img?'':' glifo'),style:{borderColor:f.color}});
  const pinta=()=>{ if(f.img){ av.style.backgroundImage='url('+f.img+')'; av.textContent=''; av.classList.remove('glifo'); }
    else { av.style.backgroundImage=''; av.textContent=(f.icon&&f.icon.trim())||(f.name||'?').trim().charAt(0).toUpperCase()||'?'; av.classList.add('glifo'); }
    av.style.borderColor=f.color; };
  pinta();
  const catSel=h('select',{class:'in','aria-label':'Categoria do token',onchange:e=>{ f.cat=e.target.value; }},
    categoriasToken().filter(x=>true).map(x=>h('option',{value:x.id,selected:x.id===f.cat?'':null},x.ic+' '+x.nome)));
  const salvar=(colocar)=>{
    const nome=(f.name||'').trim(); if(!nome){ showToast('Dê um nome ao token.'); const i=document.getElementById('mt-f-nome'); if(i) i.focus(); return; }
    let l=f.id&&libToken(f.id);
    if(l){ Object.assign(l,{name:nome,cat:f.cat,img:f.img,icon:f.icon.trim(),color:f.color,size:f.size}); }
    else { l={id:uid(),name:nome,cat:f.cat,img:f.img,icon:f.icon.trim(),color:f.color,size:f.size}; c.tokenLib.push(l); }
    u.form=null; u.cat=f.cat;
    /* tokens já colocados que usam esta entrada acompanham a edição */
    const m=curMap(); if(m&&f.id) reconstroiTokens();
    persistNow();
    if(colocar){ const cat=catMeta(l.cat); colocaToken({name:l.name,icon:l.icon,color:l.color,size:l.size,kind:cat.kind,libId:l.id}); }
    else atualizaLateral();
  };
  return h('div',{class:'mt-form'},
    h('div',{class:'mt-cab'},h('b',{},f.id?'✏️ Editar token':'＋ Novo token'),h('span',{class:'mt-grow'}),
      h('button',{type:'button',class:'btn ghost sm',onclick:()=>{ u.form=null; atualizaLateral(); }},'← Voltar')),
    h('div',{class:'mt-form-top'}, av,
      h('div',{class:'mt-form-bt'},
        h('button',{type:'button',class:'btn sm',onclick:()=>escolherImagem(fl=>lerImagemArquivo(fl,{max:256,quadrado:true},data=>{ f.img=data; pinta(); atualizaLateral(); }))},'📷 '+(f.img?'Trocar foto':'Escolher foto')),
        f.img?h('button',{type:'button',class:'btn ghost sm',onclick:()=>{ f.img=null; pinta(); atualizaLateral(); }},'Remover foto'):null,
        h('div',{class:'hint'},'A foto é recortada em quadrado. Sem foto, usa o ícone abaixo.'))),
    h('label',{class:'f'},h('span',{},'Nome *'),h('input',{class:'in',id:'mt-f-nome',value:f.name,maxlength:'40',placeholder:'ex.: Lobo das Neves',
      oninput:e=>{ f.name=e.target.value; if(!f.img&&!f.icon.trim()) pinta(); },
      onkeydown:e=>{ if(e.key==='Enter'){ e.preventDefault(); salvar(false); } }})),
    h('div',{class:'grid g2'},
      h('label',{class:'f'},h('span',{},'Categoria'),catSel),
      h('label',{class:'f'},h('span',{},'Ícone (emoji, sem foto)'),h('input',{class:'in',value:f.icon,maxlength:'4',placeholder:'🐺',
        oninput:e=>{ f.icon=e.target.value; pinta(); }}))),
    h('div',{class:'row wrapf'},
      h('label',{class:'mt-mini'},'cor da borda',h('input',{type:'color',value:toHex(f.color),oninput:e=>{ f.color=e.target.value; pinta(); }})),
      h('span',{class:'mt-grow'}),
      TOKEN_SIZES.map(s=>h('button',{type:'button',class:'btn sm '+(f.size===s.pct?'emerald':'ghost'),onclick:()=>{ f.size=s.pct; atualizaLateral(); }},s.nome))),
    h('div',{class:'row wrapf mt-acoes'},
      h('button',{type:'button',class:'btn primary',onclick:()=>salvar(false)},'✔ Salvar na biblioteca'),
      h('button',{type:'button',class:'btn emerald',onclick:()=>salvar(true)},'Salvar e colocar no mapa'),
      f.id?h('button',{type:'button',class:'btn danger sm',onclick:async()=>{
        if(!await uiConfirm('Excluir o token “'+f.name+'” da biblioteca? Os que já estão no mapa continuam lá.',{titulo:'Excluir token',okText:'Excluir',perigo:true})) return;
        const l=libToken(f.id);
        /* congela a imagem nos tokens já colocados, para não perderem a foto */
        (c.maps||[]).forEach(mm=>mm.tokens.forEach(t=>{ if(t.libId===f.id){ t.libId=null; if(!t.img) t.img=l&&l.img||null; if(!t.icon&&l) t.icon=l.icon||''; if(t.label==='?'&&l) t.label=l.name; } }));
        c.tokenLib=c.tokenLib.filter(x=>x.id!==f.id); u.form=null; persistNow(); reconstroiTokens(); atualizaLateral(); }},'🗑 Excluir'):null));
}
function toHex(c){
  const s=String(c||'#888888'); if(/^#[0-9a-f]{6}$/i.test(s)) return s;
  if(/^#[0-9a-f]{3}$/i.test(s)) return '#'+s.slice(1).split('').map(x=>x+x).join('');
  return '#888888';
}

/* Abre a ficha do jogador na seção Jogadores (duplo clique no token de jogador). */
function abrirFichaJogador(refId){
  if(!refId) return showToast('Token genérico: use a biblioteca para ligar a um jogador.');
  const c=S.campaign, p=(c.players||[]).find(x=>x.id===refId);
  if(!p) return showToast('Jogador não está mais na mesa.');
  if(!p.sheet) return showToast('Esse jogador ainda não tem ficha importada.');
  S.ui.verFicha=p.id;
  if(typeof irMtab==='function') irMtab('jogadores'); else render();
}

/* ---------- 📏 régua de distância ----------
   Converte o arrasto em casas da grade e em metros pela regra de movimento (1 casa = sys.movimento.quadrado, padrão 1,5 m). */
function reguaDesenha(m,a,b){
  if(!MT.area) return;
  let el=MT.area.querySelector('.mt-regua');
  const H=mapaH(m), ns='http://www.w3.org/2000/svg';
  if(!el){ el=document.createElementNS(ns,'svg'); el.setAttribute('class','mt-regua'); el.setAttribute('viewBox','0 0 '+MAPA_W+' '+H);
    el.innerHTML='<line stroke="#facc15" stroke-width="4" stroke-dasharray="10 6" stroke-linecap="round"/><circle r="7" fill="#facc15"/><circle r="7" fill="#facc15"/><g><rect rx="8" fill="rgba(15,23,42,.88)" stroke="#facc15"/><text fill="#fde68a" font-size="22" font-weight="700" text-anchor="middle"/></g>';
    MT.area.appendChild(el); }
  const x1=a.x/100*MAPA_W, y1=a.y/100*H, x2=b.x/100*MAPA_W, y2=b.y/100*H;
  const casa=(m.grid&&m.grid.size)||50, mv=(S.system&&S.system.movimento)||{};
  const casas=Math.hypot(x2-x1,y2-y1)/casa, q=mv.quadrado||1.5, un=mv.unidade==='ft'?' ft':' m';
  const txt=(mv.unidade==='q'?(Math.round(casas*10)/10+' quadrados'):(Math.round(casas*q*10)/10+un+' · '+Math.round(casas)+' casas'));
  const ln=el.querySelector('line'); ln.setAttribute('x1',x1); ln.setAttribute('y1',y1); ln.setAttribute('x2',x2); ln.setAttribute('y2',y2);
  const cs=el.querySelectorAll('circle'); cs[0].setAttribute('cx',x1); cs[0].setAttribute('cy',y1); cs[1].setAttribute('cx',x2); cs[1].setAttribute('cy',y2);
  const t=el.querySelector('text'), r=el.querySelector('rect'), mx=(x1+x2)/2, my=(y1+y2)/2-18;
  t.textContent=txt; t.setAttribute('x',mx); t.setAttribute('y',my+8);
  const w=txt.length*12+20; r.setAttribute('x',mx-w/2); r.setAttribute('y',my-18); r.setAttribute('width',w); r.setAttribute('height',34);
}
