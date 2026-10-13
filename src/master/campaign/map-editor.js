/* ============================================================ MAPA — MOTOR DE EDIÇÃO ============================================================
   Tudo o que torna o mapa 100% EDITÁVEL:
     • OBJETOS VETORIAIS (m.objs): salas/pisos, paredes, portas, casas, árvores, estradas,
       rios, fronteiras, regiões, textos e áreas de magia. Desenhados num SVG por cima do
       terreno; coordenadas em "unidades de mapa" (1000 × 625). Os geradores produzem
       objetos — nada fica achatado numa imagem.
     • SELEÇÃO unificada (objetos + peças + locais + tokens + reinos): clique, Shift,
       caixa de seleção, ALÇAS (redimensionar, girar, vértices), mover, duplicar,
       copiar/colar, excluir, ordem, travar, ocultar, alinhar, distribuir, agrupar.
     • HISTÓRICO GLOBAL por mapa (desfazer/refazer de TUDO, inclusive o pincel).
     • FERRAMENTAS de desenho (sala/forma, linha, polígono, texto, régua, área de magia,
       balde) e o motor de gestos (mouse, caneta e toque; pinça para zoom).
     • PAINEL de propriedades contextual + lista de objetos.
   Depende de campaign-model.js (constantes/fábricas) e de map-gen.js (paletaMapa).
   As funções de montagem de tela (layout, viewport, terreno) ficam em campaign-map.js. */

/* ---------- Referências à tela montada (preenchidas por campaign-map.js) ---------- */
const MP={ ws:null, vp:null, area:null, svg:null, ov:null, pbody:null };
const U_W=TERRAIN_W, U_H=TERRAIN_H;
const MPclamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mpRad=d=>d*Math.PI/180;
const f1=n=>Math.round(n*10)/10;
function rotPt(x,y,deg){ const a=mpRad(deg), c=Math.cos(a), s=Math.sin(a); return [x*c-y*s, x*s+y*c]; }
function cs(c){ return String(c==null?'':c).replace(/[^#\w(),.\s%-]/g,''); }
let _hexCv=null;
function toHex(c){
  c=String(c||'#888888').trim();
  if(/^#[0-9a-f]{6}$/i.test(c)) return c;
  if(/^#[0-9a-f]{3}$/i.test(c)) return '#'+c.slice(1).split('').map(x=>x+x).join('');
  try{ if(!_hexCv){ _hexCv=document.createElement('canvas'); _hexCv.width=_hexCv.height=1; }
    const x=_hexCv.getContext('2d'); x.clearRect(0,0,1,1); x.fillStyle='#888888'; x.fillStyle=c; x.fillRect(0,0,1,1);
    const d=x.getImageData(0,0,1,1).data; return '#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join(''); }catch(e){ return '#888888'; }
}
/* aviso leve dentro do editor (não chama render()) */
function mpToast(msg){
  const host=MP.ws&&MP.ws.querySelector('.mp-stage'); if(!host) return;
  let t=host.querySelector('.mp-toast'); if(!t){ t=h('div',{class:'mp-toast',role:'status'}); host.appendChild(t); }
  t.textContent=msg; t.classList.add('on'); clearTimeout(t._tm); t._tm=setTimeout(()=>t.classList.remove('on'),1800);
}
let _persistTm=null;
function persistSoon(){ clearTimeout(_persistTm); _persistTm=setTimeout(()=>{ if(typeof persist==='function') persist(); },350); }
function persistNow(){ clearTimeout(_persistTm); if(typeof persist==='function') persist(); }

/* ============================ OBJETOS VETORIAIS ============================ */
const MP_ROLES={
  floor:{nome:'Sala / piso',ic:'▦'}, wall:{nome:'Parede',ic:'🧱'}, water:{nome:'Água',ic:'🌊'}, grass:{nome:'Vegetação',ic:'🌿'},
  ice:{nome:'Gelo',ic:'❄️'}, house:{nome:'Casa',ic:'🏠'}, tree:{nome:'Árvore',ic:'🌳'}, plaza:{nome:'Praça',ic:'⛲'},
  road:{nome:'Estrada',ic:'🛣️'}, river:{nome:'Rio',ic:'〰️'}, border:{nome:'Fronteira',ic:'🚩'}, fence:{nome:'Muro / cerca',ic:'🧱'},
  region:{nome:'Região',ic:'⬠'}, line:{nome:'Linha',ic:'📏'}, aoe:{nome:'Área de efeito',ic:'🔮'}, plain:{nome:'Forma',ic:'◻️'},
};
/* estilo padrão por função (cores vêm da era/tema do mapa) */
function roleStyle(role,m){
  const pal=paletaMapa(m&&m.theme);
  switch(role){
    case 'floor': return {fill:pal.floor,stroke:pal.ink,sw:3,op:1};
    case 'wall':  return {fill:pal.wall,stroke:pal.ink,sw:2.5,op:1};
    case 'water': return {fill:'#3f86c4',stroke:'#1f5c92',sw:2,op:.85};
    case 'grass': return {fill:'#4e8f45',stroke:'#2f5f2b',sw:1.5,op:.75};
    case 'ice':   return {fill:'#cfe8f5',stroke:'#8fbad3',sw:2,op:.85};
    case 'house': return {fill:'#a8553a',stroke:'#2a1c12',sw:2,op:1};
    case 'tree':  return {fill:'#2f6b3a',stroke:'#14301c',sw:1.2,op:1};
    case 'plaza': return {fill:'#c7ad7e',stroke:'#5c4630',sw:2,op:1};
    case 'road':  return {stroke:'#b79a6e',sw:12,edge:'#5c4630',edgew:3,dash:'solid',smooth:true};
    case 'river': return {stroke:'#4b8fcf',sw:14,edge:'#2c5f94',edgew:3,dash:'solid',smooth:true};
    case 'border':return {stroke:'#7a2f2f',sw:2.5,dash:'dash',smooth:false};
    case 'fence': return {stroke:pal.ink,sw:7,dash:'solid',smooth:false};
    case 'region':return {fill:'#e11d48',op:.28,stroke:'#e11d48',sw:2.5,dash:'dash',smooth:true};
    case 'aoe':   return {fill:'#f97316',op:.32,stroke:'#f97316',sw:2.5,dash:'dash'};
    case 'line':  return {stroke:'#e2e8f0',sw:3,dash:'solid',smooth:false};
    default:      return {fill:'#64748b',stroke:'#e2e8f0',sw:2,op:.8};
  }
}
/* fábrica: t = rect | ellipse | path | text | door */
function mkObj(m,t,role,props){
  const o=Object.assign({id:uid(), t, role:role||'plain', label:'', note:'', hidden:false, locked:false, gid:null}, roleStyle(role,m));
  if(t==='rect'||t==='ellipse'){ o.cx=500; o.cy=312; o.w=100; o.h=80; o.rot=0; }
  if(t==='path'){ o.pts=[]; o.closed=false; }
  if(t==='text'){ o.x=500; o.y=312; o.text='Texto'; o.size=22; o.color='#ffffff'; o.bold=true; o.halo=true; o.rot=0; o.badge=false; delete o.fill; delete o.stroke; delete o.sw; delete o.op; }
  if(t==='door'){ o.cx=500; o.cy=312; o.w=16; o.rot=0; o.fill='#8b5a2b'; o.stroke='#2a2118'; o.sw=1.6; }
  return Object.assign(o, props||{});
}
function dashArr(o){
  const sw=o.sw||2;
  if(o.dash==='dash') return Math.round(sw*3.2)+' '+Math.round(sw*2.2);
  if(o.dash==='dot') return '0.1 '+Math.round(sw*2.1);
  return '';
}
function pathD(o){
  const pts=o.pts||[]; if(!pts.length) return '';
  let d='M'+f1(pts[0][0])+' '+f1(pts[0][1]);
  const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  if(o.smooth && pts.length>2){
    if(o.closed){ const n=pts.length, m0=mid(pts[n-1],pts[0]); d='M'+f1(m0[0])+' '+f1(m0[1]);
      for(let i=0;i<n;i++){ const c=pts[i], mm=mid(c,pts[(i+1)%n]); d+='Q'+f1(c[0])+' '+f1(c[1])+' '+f1(mm[0])+' '+f1(mm[1]); }
      return d+'Z'; }
    for(let i=1;i<pts.length-1;i++){ const mm=mid(pts[i],pts[i+1]); d+='Q'+f1(pts[i][0])+' '+f1(pts[i][1])+' '+f1(mm[0])+' '+f1(mm[1]); }
    const l=pts[pts.length-1]; return d+'L'+f1(l[0])+' '+f1(l[1]);
  }
  for(let i=1;i<pts.length;i++) d+='L'+f1(pts[i][0])+' '+f1(pts[i][1]);
  return d+(o.closed?'Z':'');
}
function geomTag(o,extra){
  const tr=' transform="translate('+f1(o.cx)+' '+f1(o.cy)+') rotate('+f1(o.rot||0)+')"';
  if(o.t==='rect') return '<rect x="'+f1(-o.w/2)+'" y="'+f1(-o.h/2)+'" width="'+f1(o.w)+'" height="'+f1(o.h)+'"'+tr+extra+'/>';
  if(o.t==='ellipse') return '<ellipse rx="'+f1(o.w/2)+'" ry="'+f1(o.h/2)+'"'+tr+extra+'/>';
  return '<path d="'+pathD(o)+'"'+extra+'/>';
}
function paintAttrs(o){
  let s=' fill="'+(o.fill?cs(o.fill):'none')+'"';
  if(o.fill && o.op!=null && o.op<1) s+=' fill-opacity="'+o.op+'"';
  if(o.stroke && o.sw>0){ s+=' stroke="'+cs(o.stroke)+'" stroke-width="'+o.sw+'" stroke-linecap="round" stroke-linejoin="round"';
    const da=dashArr(o); if(da) s+=' stroke-dasharray="'+da+'"'; }
  return s;
}
function objsDefs(m){
  const fx=m.fx||{};
  let d='<defs><filter id="mpsh" x="0" y="0" width="1000" height="625" filterUnits="userSpaceOnUse"><feDropShadow dx="3" dy="4" stdDeviation="0" flood-color="#000" flood-opacity=".26"/></filter>';
  d+='<filter id="mpgoo" x="0" y="0" width="1000" height="625" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="3.6"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"/></filter>';
  if(fx.hatch) d+='<pattern id="mphatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line x1="0" y1="0" x2="0" y2="6" stroke="'+cs(fx.hatch)+'" stroke-width="1.2"/></pattern>';
  return d+'</defs>';
}
function floorBatch(floors,m,hit){
  const fx=m.fx||{}; let hatch='', ink='', fill='';
  floors.forEach(o=>{
    const op=o.hidden?' opacity=".4"':'';
    if(fx.hatch) hatch+=geomTag(o,' fill="none" stroke="url(#mphatch)" stroke-width="'+f1((o.sw||3)*2+(fx.hatchW||34))+'" stroke-linejoin="round"');
    ink+=geomTag(o,' fill="none" stroke="'+cs(o.stroke)+'" stroke-width="'+f1((o.sw||3)*2)+'" stroke-linejoin="round"'+op);
    fill+=geomTag(o,' fill="'+cs(o.fill)+'"'+(o.op!=null&&o.op<1?' fill-opacity="'+o.op+'"':'')+op+(hit?' data-et="obj" data-eid="'+o.id+'" pointer-events="all"':''));
  });
  const wrap=g=>fx.goo?'<g filter="url(#mpgoo)">'+g+'</g>':g;
  return (fx.hatch?'<g>'+hatch+'</g>':'')+'<g filter="url(#mpsh)">'+wrap(ink)+wrap(fill)+'</g>';
}
function objMarkup(o,hit,m){
  const hd=hit?' data-et="obj" data-eid="'+o.id+'"':'';
  const op=o.hidden?' opacity=".4"':'';
  if(o.t==='text'){
    const sz=o.size||18, col=cs(o.color||'#fff'), tr=' transform="translate('+f1(o.x)+' '+f1(o.y)+') rotate('+f1(o.rot||0)+')"';
    let g='<g'+tr+hd+op+(hit?' pointer-events="all"':'')+'>';
    if(o.badge){ const r=sz*0.85; g+='<circle r="'+f1(r)+'" fill="'+cs(o.bgc||'#f8f1dc')+'" stroke="#2a2118" stroke-width="1.6"/>'; }
    g+='<text text-anchor="middle" dominant-baseline="central" font-family="Segoe UI,Roboto,sans-serif" font-size="'+sz+'" font-weight="'+(o.bold?800:500)+'" fill="'+col+'"'
      +(o.halo&&!o.badge?' stroke="rgba(0,0,0,.75)" stroke-width="'+f1(sz*0.18)+'" paint-order="stroke" stroke-linejoin="round"':'')+'>'+esc(o.text||'')+'</text></g>';
    return g;
  }
  if(o.t==='door'){
    const w=o.w, th=Math.max(5,w*0.4), tr=' transform="translate('+f1(o.cx)+' '+f1(o.cy)+') rotate('+f1(o.rot||0)+')"';
    return '<g'+tr+hd+op+(hit?' pointer-events="all"':'')+'><rect x="'+f1(-w/2)+'" y="'+f1(-th/2)+'" width="'+f1(w)+'" height="'+f1(th)+'" rx="1.5" fill="'+cs(o.fill)+'" stroke="'+cs(o.stroke)+'" stroke-width="'+(o.sw||1.6)+'"/><line x1="'+f1(-w*0.3)+'" y1="0" x2="'+f1(w*0.3)+'" y2="0" stroke="'+cs(o.stroke)+'" stroke-width="1" opacity=".6"/></g>';
  }
  if(o.t==='path'){
    if(!o.pts||o.pts.length<2) return '';
    const d=pathD(o), da=dashArr(o);
    let s='<g'+op+'>';
    if(o.edge && o.edgew>0 && !o.closed) s+='<path d="'+d+'" fill="none" stroke="'+cs(o.edge)+'" stroke-width="'+f1((o.sw||2)+(o.edgew||2)*2)+'" stroke-linecap="round" stroke-linejoin="round"/>';
    s+='<path d="'+d+'"'+paintAttrs(o)+(hit&&o.closed&&o.fill?hd+' pointer-events="all"':'')+'/>';
    if(hit && !(o.closed&&o.fill)) s+='<path d="'+d+'" fill="none" stroke="transparent" stroke-width="'+Math.max(16,(o.sw||2)+10)+'"'+hd+' pointer-events="stroke"/>';
    return s+'</g>';
  }
  /* rect / ellipse */
  const role=o.role;
  if(role==='house' && o.t==='rect'){
    const w=o.w, hh=o.h, tr=' transform="translate('+f1(o.cx)+' '+f1(o.cy)+') rotate('+f1(o.rot||0)+')"';
    return '<g'+tr+hd+op+(hit?' pointer-events="all"':'')+'><rect x="'+f1(-w/2+3)+'" y="'+f1(-hh/2+4)+'" width="'+f1(w)+'" height="'+f1(hh)+'" fill="rgba(0,0,0,.28)"/>'
      +'<rect x="'+f1(-w/2)+'" y="'+f1(-hh/2)+'" width="'+f1(w)+'" height="'+f1(hh)+'"'+paintAttrs(o)+'/>'
      +'<rect x="'+f1(-w/2)+'" y="0" width="'+f1(w)+'" height="'+f1(hh/2)+'" fill="rgba(0,0,0,.2)"/>'
      +'<line x1="'+f1(-w/2)+'" y1="0" x2="'+f1(w/2)+'" y2="0" stroke="'+cs(o.stroke)+'" stroke-width="'+(o.sw||2)+'"/></g>';
  }
  if(role==='tree'){
    const r=o.w/2, tr=' transform="translate('+f1(o.cx)+' '+f1(o.cy)+')"';
    return '<g'+tr+hd+op+(hit?' pointer-events="all"':'')+'><circle cx="2" cy="3" r="'+f1(r)+'" fill="rgba(0,0,0,.25)"/><circle r="'+f1(r)+'"'+paintAttrs(o)+'/></g>';
  }
  return '<g'+op+'>'+geomTag(o,paintAttrs(o)+(hit?hd+' pointer-events="all"':''))+'</g>';
}
/* SVG completo da camada de objetos. hit=false para exportar */
function objsMarkup(m,hit,forExport){
  const objs=(m.objs||[]).filter(o=>!(forExport&&o.hidden));
  let out=objsDefs(m), done=false;
  const floors=objs.filter(o=>o.role==='floor'&&o.t!=='text'&&o.t!=='door');
  objs.forEach(o=>{
    if(o.role==='floor'&&o.t!=='text'&&o.t!=='door'){ if(!done){ out+=floorBatch(floors,m,hit); done=true; } return; }
    out+=objMarkup(o,hit,m);
  });
  return out;
}
function repaintSvg(){ const m=curMap(); if(MP.svg&&m) MP.svg.innerHTML=objsMarkup(m,true,false); }

/* ============================ ENTIDADES (todas as editáveis) ============================ */
function entArr(m,t){ return t==='obj'?m.objs:t==='prop'?m.props:t==='pin'?m.pins:t==='token'?m.tokens:t==='king'?m.world.kingdoms:[]; }
function entGet(m,r){ return r?(entArr(m,r.t).find(x=>x.id===r.id)||null):null; }
const sameRef=(a,b)=>a&&b&&a.t===b.t&&a.id===b.id;
function allEnts(m){
  const o=[]; (m.objs||[]).forEach(e=>o.push({t:'obj',e}));
  (m.world.kingdoms||[]).forEach(e=>o.push({t:'king',e}));
  m.props.forEach(e=>o.push({t:'prop',e})); m.pins.forEach(e=>o.push({t:'pin',e})); m.tokens.forEach(e=>o.push({t:'token',e}));
  return o;
}
function selRefs(){ return Array.isArray(S.ui.msel)?S.ui.msel:(S.ui.msel=[]); }
function selEnts(m){ return selRefs().map(r=>({r,e:entGet(m,r)})).filter(x=>x.e); }
function syncLegacySel(){
  const s=selRefs(), one=s.length===1?s[0]:null;
  S.ui.tokenSel=one&&one.t==='token'?one.id:null; S.ui.pinSel=one&&one.t==='pin'?one.id:null;
  S.ui.propSel=one&&one.t==='prop'?one.id:null; S.ui.kingSel=one&&one.t==='king'?one.id:null;
}
function limpaSel(){ S.ui.msel=[]; syncLegacySel(); }
function expandGroups(m,refs){
  const out=[]; const add=r=>{ if(!out.some(x=>sameRef(x,r))) out.push(r); };
  const gids=new Set();
  refs.forEach(r=>{ add(r); const e=entGet(m,r); if(e&&e.gid) gids.add(e.gid); });
  if(gids.size) allEnts(m).forEach(x=>{ if(x.e.gid&&gids.has(x.e.gid)) add({t:x.t,id:x.e.id}); });
  return out;
}
function setSel(refs,opts){
  const m=curMap(); S.ui.msel=m?expandGroups(m,refs):[]; syncLegacySel();
  paintOverlay(); if(!opts||!opts.noPanel) panelRefresh();
}
function entInfo(t,e){
  if(t==='obj'){
    if(e.t==='text') return {nome:e.label||('Texto: '+(e.text||'').slice(0,18)), ic:'🔤', cat:'Textos'};
    if(e.t==='door') return {nome:e.label||'Porta', ic:'🚪', cat:'Portas'};
    const r=MP_ROLES[e.role]||MP_ROLES.plain;
    const cat={floor:'Salas e pisos',wall:'Paredes',house:'Casas',tree:'Árvores',road:'Estradas e rios',river:'Estradas e rios',border:'Linhas e fronteiras',fence:'Linhas e fronteiras',line:'Linhas e fronteiras',aoe:'Áreas de magia'}[e.role]||'Regiões e áreas';
    return {nome:e.label||r.nome, ic:r.ic, cat};
  }
  if(t==='prop'){ const mt=propMeta(e.k); return {nome:e.label||(mt&&mt.nome)||'Peça', ic:e.icon||'🧩', cat:'Peças'}; }
  if(t==='pin') return {nome:e.label||'Local', ic:e.icon||'📍', cat:'Locais'};
  if(t==='token') return {nome:e.label||'Token', ic:kindEmoji(e.kind), cat:'Tokens'};
  if(t==='king') return {nome:e.name||'Reino', ic:'🏴', cat:'Reinos'};
  return {nome:'?',ic:'?',cat:'Outros'};
}
function cl(o){ if(!o||typeof o!=='object') return o; const c={}; for(const k in o){ const v=o[k]; c[k]=(v&&typeof v==='object')?JSON.parse(JSON.stringify(v)):v; } return c; }
function markEdited(e){ if(e&&e.gen) delete e.gen; }

/* ---- Caixa (centro, tamanho, rotação) de qualquer entidade, em unidades de mapa ---- */
function pathBBox(pts){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  (pts||[]).forEach(p=>{ x0=Math.min(x0,p[0]); y0=Math.min(y0,p[1]); x1=Math.max(x1,p[0]); y1=Math.max(y1,p[1]); });
  if(x0>x1){ x0=y0=0; x1=y1=0; }
  return {x0,y0,x1,y1};
}
/* rs: modo de redimensionar ('free' | 'aspect' | 'w' | null); ro: pode girar; vtx: tem vértices */
function entBox(t,e){
  if(t==='obj'){
    if(e.t==='rect'||e.t==='ellipse') return {cx:e.cx,cy:e.cy,w:e.w,h:e.h,rot:e.rot||0,rs:e.role==='tree'?'aspect':'free',ro:e.role!=='tree'};
    if(e.t==='door') return {cx:e.cx,cy:e.cy,w:e.w,h:Math.max(5,e.w*0.4),rot:e.rot||0,rs:'w',ro:true};
    if(e.t==='text'){ const sz=e.size||18; return {cx:e.x,cy:e.y,w:Math.max(14,(e.text||'').length*sz*0.58+(e.badge?sz*0.8:0)),h:sz*1.35,rot:e.rot||0,rs:'aspect',ro:true}; }
    const b=pathBBox(e.pts); return {cx:(b.x0+b.x1)/2,cy:(b.y0+b.y1)/2,w:Math.max(6,b.x1-b.x0),h:Math.max(6,b.y1-b.y0),rot:0,rs:'free',ro:true,vtx:true};
  }
  if(t==='prop'){
    if(e.shape==='block') return {cx:e.xPct*10,cy:e.yPct*6.25,w:e.w*10,h:e.h*6.25,rot:e.rot||0,rs:'free',ro:true};
    const base=30*(e.size||100)/100*1.2; return {cx:e.xPct*10,cy:e.yPct*6.25,w:base,h:base,rot:e.rot||0,rs:'aspect',ro:true};
  }
  if(t==='token'){ const b=34*(e.size||100)/100; return {cx:e.xPct*10,cy:e.yPct*6.25,w:b,h:b,rot:0,rs:'aspect',ro:false}; }
  if(t==='king'){ const d=e.radius*20; return {cx:e.xPct*10,cy:e.yPct*6.25,w:d,h:d,rot:0,rs:'aspect',ro:false}; }
  return {cx:e.xPct*10,cy:e.yPct*6.25,w:26,h:26,rot:0,rs:null,ro:false};   /* pin */
}
function boxAABB(b){
  const a=mpRad(b.rot||0), c=Math.abs(Math.cos(a)), s=Math.abs(Math.sin(a));
  const w=b.w*c+b.h*s, hh=b.w*s+b.h*c;
  return {x0:b.cx-w/2,y0:b.cy-hh/2,x1:b.cx+w/2,y1:b.cy+hh/2};
}
function unionBB(list){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  list.forEach(b=>{ x0=Math.min(x0,b.x0); y0=Math.min(y0,b.y0); x1=Math.max(x1,b.x1); y1=Math.max(y1,b.y1); });
  return {x0,y0,x1,y1};
}
function entAABB(t,e){ return boxAABB(entBox(t,e)); }

/* ---- Mover (a partir do clone inicial s) ---- */
function moveEnt(t,e,s,dx,dy){
  if(t==='obj'){
    if(e.t==='path') e.pts=s.pts.map(p=>[p[0]+dx,p[1]+dy]);
    else if(e.t==='text'){ e.x=s.x+dx; e.y=s.y+dy; }
    else { e.cx=s.cx+dx; e.cy=s.cy+dy; }
    return;
  }
  e.xPct=MPclamp(s.xPct+dx/10,0,100); e.yPct=MPclamp(s.yPct+dy/6.25,0,100);
}
/* ---- Aplicar uma nova caixa b (b0 = caixa inicial, s = clone inicial) ---- */
function setBoxEnt(t,e,s,b0,b){
  const MIN=6;
  b={cx:b.cx,cy:b.cy,w:Math.max(MIN,b.w),h:Math.max(MIN,b.h),rot:b.rot};
  if(t==='obj'){
    if(e.t==='rect'||e.t==='ellipse'){ e.cx=b.cx; e.cy=b.cy; e.w=b.w; e.h=e.role==='tree'?b.w:b.h; e.rot=b.rot; }
    else if(e.t==='door'){ e.cx=b.cx; e.cy=b.cy; e.w=Math.max(8,b.w); e.rot=b.rot; }
    else if(e.t==='text'){ e.x=b.cx; e.y=b.cy; e.size=MPclamp(Math.round(s.size*(b.w/b0.w)*10)/10,6,300); e.rot=b.rot; }
    else {
      const sx=b.w/b0.w, sy=b.h/b0.h, dr=b.rot-b0.rot;
      e.pts=s.pts.map(p=>{ const lx=(p[0]-b0.cx)*sx, ly=(p[1]-b0.cy)*sy, r=rotPt(lx,ly,dr); return [b.cx+r[0],b.cy+r[1]]; });
    }
    return;
  }
  e.xPct=MPclamp(b.cx/10,0,100); e.yPct=MPclamp(b.cy/6.25,0,100);
  if(t==='prop'){
    if(e.shape==='block'){ e.w=MPclamp(b.w/10,1,100); e.h=MPclamp(b.h/6.25,1,100); }
    else e.size=MPclamp(Math.round(s.size*(b.w/b0.w)),20,800);
    e.rot=Math.round(b.rot*10)/10;
  } else if(t==='token') e.size=MPclamp(Math.round(s.size*(b.w/b0.w)),30,500);
  else if(t==='king') e.radius=MPclamp(Math.round(b.w/20*10)/10,2,60);
}

/* ============================ HISTÓRICO GLOBAL (por mapa) ============================ */
const _H={};
function hist(m){ return _H[m.id]||(_H[m.id]={u:[],r:[],key:null,t:0}); }
function snapMap(m){
  return { objs:(m.objs||[]).map(cl), props:m.props.map(cl), pins:m.pins.map(cl), tokens:m.tokens.map(cl),
    kings:m.world.kingdoms.map(cl), cont:cl(m.world.continent), terrain:m.terrain, image:m.image, bg:m.bg||null,
    fx:cl(m.fx||null), grid:cl(m.grid), note:m.note, genMeta:cl(m.genMeta||null), scale:cl(m.scale||null) };
}
function restoreMap(m,s){
  m.objs=s.objs.map(cl); m.props=s.props.map(cl); m.pins=s.pins.map(cl); m.tokens=s.tokens.map(cl);
  m.world.kingdoms=s.kings.map(cl); m.world.continent=cl(s.cont); m.bg=s.bg; m.fx=cl(s.fx); m.grid=cl(s.grid);
  m.note=s.note; m.genMeta=cl(s.genMeta); m.scale=cl(s.scale);
  const tChanged=m.terrain!==s.terrain; m.terrain=s.terrain; m.image=s.image;
  if(tChanged && typeof terrainReload==='function') terrainReload(m);
}
function histPush(key){
  const m=curMap(); if(!m) return;
  const H=hist(m), now=Date.now();
  if(key && H.key===key && now-H.t<900){ H.t=now; return; }
  H.u.push(snapMap(m)); if(H.u.length>60) H.u.shift();
  H.r=[]; H.key=key||null; H.t=now; histBtns();
}
function mapUndo(){
  const m=curMap(); if(!m) return; const H=hist(m);
  if(!H.u.length) return mpToast('Nada para desfazer');
  H.r.push(snapMap(m)); restoreMap(m,H.u.pop()); H.key=null;
  afterRestore(m); mpToast('↶ Desfeito');
}
function mapRedo(){
  const m=curMap(); if(!m) return; const H=hist(m);
  if(!H.r.length) return mpToast('Nada para refazer');
  H.u.push(snapMap(m)); restoreMap(m,H.r.pop()); H.key=null;
  afterRestore(m); mpToast('↷ Refeito');
}
function afterRestore(m){
  S.ui.msel=selRefs().filter(r=>entGet(m,r)); syncLegacySel();
  mapRefresh(); panelRefresh(); histBtns(); persistNow();
}
function histBtns(){
  const m=curMap(); if(!m||!MP.ws) return; const H=hist(m);
  const u=MP.ws.querySelector('[data-act="undo"]'), r=MP.ws.querySelector('[data-act="redo"]');
  if(u) u.disabled=!H.u.length; if(r) r.disabled=!H.r.length;
}

/* ============================ AÇÕES SOBRE A SELEÇÃO ============================ */
let _clip=null, _pasteN=0;
function snapU(m,x,y){
  if(!(m.grid&&m.grid.on&&m.grid.snap)) return {x,y};
  const q=snapPct(m,x/10,y/6.25); return {x:q.x*10,y:q.y*6.25};
}
function changed(){ mapRefresh(); persistSoon(); }
/* executa fn(m, ents) com histórico; ents = entidades selecionadas */
function actSel(key,fn,opts){
  const m=curMap(); if(!m) return; const ents=selEnts(m); if(!ents.length) return;
  histPush(key); fn(m,ents); if(!opts||!opts.keepGen) ents.forEach(x=>markEdited(x.e));
  mapRefresh(); panelRefresh(); persistSoon();
}
function actDelete(){
  const m=curMap(); if(!m) return; const ents=selEnts(m).filter(x=>!x.e.locked);
  if(!ents.length){ if(selRefs().length) mpToast('Peça travada: destrave para excluir'); return; }
  histPush();
  ents.forEach(x=>{ const arr=entArr(m,x.r.t), i=arr.indexOf(x.e); if(i>=0) arr.splice(i,1); });
  S.ui.msel=[]; syncLegacySel(); mapRefresh(); panelRefresh(); persistSoon();
  mpToast(ents.length+(ents.length>1?' itens excluídos':' item excluído')+' · Ctrl+Z desfaz');
}
function cloneForPaste(m,list,dx,dy){
  const gmap={}, out=[];
  list.forEach(({t,e})=>{
    const c=JSON.parse(JSON.stringify(e)); c.id=uid(); delete c.gen; c.locked=false;
    if(c.gid){ gmap[c.gid]=gmap[c.gid]||uid(); c.gid=gmap[c.gid]; }
    moveEnt(t,c,e,dx,dy);
    if(t==='token' && typeof autoNumber==='function') autoNumber(m,c);
    entArr(m,t).push(c); out.push({t,id:c.id});
  });
  return out;
}
function actDuplicate(){
  const m=curMap(); if(!m) return; const ents=selEnts(m); if(!ents.length) return;
  histPush(); const refs=cloneForPaste(m,ents.map(x=>({t:x.r.t,e:x.e})),16,16);
  S.ui.msel=refs; syncLegacySel(); mapRefresh(); panelRefresh(); persistSoon();
}
function actCopy(){
  const m=curMap(); if(!m) return; const ents=selEnts(m); if(!ents.length) return;
  _clip=ents.map(x=>({t:x.r.t,e:JSON.parse(JSON.stringify(x.e))})); _pasteN=0; mpToast(ents.length+' copiado(s)');
}
function actPaste(){
  const m=curMap(); if(!m||!_clip||!_clip.length) return mpToast('Nada copiado');
  histPush(); _pasteN++;
  const refs=cloneForPaste(m,_clip,16*_pasteN,16*_pasteN);
  S.ui.msel=refs; syncLegacySel(); mapRefresh(); panelRefresh(); persistSoon();
}
function actZ(dir){   /* 'front'|'back'|'fwd'|'bwd' dentro do próprio grupo de camada */
  const m=curMap(); if(!m) return; const ents=selEnts(m); if(!ents.length) return;
  histPush();
  const order=dir==='front'||dir==='fwd'?ents.slice():ents.slice().reverse();
  order.forEach(x=>{ const arr=entArr(m,x.r.t), i=arr.indexOf(x.e); if(i<0) return;
    arr.splice(i,1);
    if(dir==='front') arr.push(x.e); else if(dir==='back') arr.unshift(x.e);
    else if(dir==='fwd') arr.splice(Math.min(arr.length,i+1),0,x.e); else arr.splice(Math.max(0,i-1),0,x.e); });
  mapRefresh(); panelRefresh(); persistSoon();
}
function actToggle(prop){
  const m=curMap(); if(!m) return; const ents=selEnts(m); if(!ents.length) return;
  const val=!ents.every(x=>x.e[prop]); histPush();
  ents.forEach(x=>{ x.e[prop]=val; });
  mapRefresh(); panelRefresh(); persistSoon();
}
function actGroup(on){
  const m=curMap(); if(!m) return; const ents=selEnts(m); if(ents.length<2&&on) return mpToast('Selecione 2 ou mais itens para agrupar');
  histPush(); const g=on?uid():null;
  ents.forEach(x=>{ x.e.gid=g; });
  mapRefresh(); panelRefresh(); persistSoon(); mpToast(on?'Agrupado':'Desagrupado');
}
function actAlign(mode){
  const m=curMap(); if(!m) return; const ents=selEnts(m).filter(x=>!x.e.locked); if(ents.length<2) return;
  const bbs=ents.map(x=>entAABB(x.r.t,x.e)), U=unionBB(bbs);
  histPush();
  ents.forEach((x,i)=>{ const b=bbs[i]; let dx=0,dy=0;
    if(mode==='l') dx=U.x0-b.x0; else if(mode==='r') dx=U.x1-b.x1; else if(mode==='ch') dx=(U.x0+U.x1)/2-(b.x0+b.x1)/2;
    else if(mode==='t') dy=U.y0-b.y0; else if(mode==='b') dy=U.y1-b.y1; else if(mode==='cv') dy=(U.y0+U.y1)/2-(b.y0+b.y1)/2;
    moveEnt(x.r.t,x.e,cl(x.e),dx,dy); markEdited(x.e); });
  mapRefresh(); panelRefresh(); persistSoon();
}
function actDistribute(axis){
  const m=curMap(); if(!m) return; const ents=selEnts(m).filter(x=>!x.e.locked); if(ents.length<3) return mpToast('Distribuir precisa de 3 ou mais itens');
  const items=ents.map(x=>({x,b:entAABB(x.r.t,x.e)}));
  const k0=axis==='h'?'x0':'y0', k1=axis==='h'?'x1':'y1';
  items.sort((a,b)=>(a.b[k0]+a.b[k1])-(b.b[k0]+b.b[k1]));
  const first=(items[0].b[k0]+items[0].b[k1])/2, last=(items[items.length-1].b[k0]+items[items.length-1].b[k1])/2;
  histPush();
  items.forEach((it,i)=>{ const target=first+(last-first)*i/(items.length-1), cur=(it.b[k0]+it.b[k1])/2, d=target-cur;
    moveEnt(it.x.r.t,it.x.e,cl(it.x.e),axis==='h'?d:0,axis==='h'?0:d); markEdited(it.x.e); });
  mapRefresh(); panelRefresh(); persistSoon();
}
function actNudge(dx,dy){
  const m=curMap(); if(!m) return; const ents=selEnts(m).filter(x=>!x.e.locked); if(!ents.length) return;
  histPush('nudge');
  ents.forEach(x=>{ moveEnt(x.r.t,x.e,cl(x.e),dx,dy); markEdited(x.e); });
  mapRefresh(); persistSoon();
}
function actSelectAll(){
  const m=curMap(); if(!m) return; setSel(allEnts(m).map(x=>({t:x.t,id:x.e.id})));
}
function actSelectCat(cat,add){
  const m=curMap(); if(!m) return;
  const refs=allEnts(m).filter(x=>entInfo(x.t,x.e).cat===cat).map(x=>({t:x.t,id:x.e.id}));
  setSel(add?selRefs().concat(refs):refs);
}

/* ============================ DESENHO: PRESETS E OPÇÕES ============================ */
const RECT_PRESETS=[
  {k:'floor',nome:'Sala / piso',ic:'▦'},{k:'wall',nome:'Parede',ic:'🧱'},{k:'house',nome:'Casa',ic:'🏠'},
  {k:'water',nome:'Água',ic:'🌊'},{k:'grass',nome:'Vegetação',ic:'🌿'},{k:'ice',nome:'Gelo',ic:'❄️'},{k:'plaza',nome:'Praça',ic:'⛲'},{k:'plain',nome:'Forma livre',ic:'◻️'}];
const LINE_PRESETS=[
  {k:'road',nome:'Estrada',ic:'🛣️'},{k:'river',nome:'Rio',ic:'〰️'},{k:'fence',nome:'Muro',ic:'🧱'},{k:'border',nome:'Fronteira',ic:'🚩'},{k:'line',nome:'Linha',ic:'📏'}];
const POLY_PRESETS=[
  {k:'region',nome:'Reino / região',ic:'⬠'},{k:'grass',nome:'Floresta',ic:'🌲'},{k:'water',nome:'Lago',ic:'💧'},{k:'floor',nome:'Piso irregular',ic:'▦'},{k:'plain',nome:'Livre',ic:'◻️'}];
const AOE_PRESETS=[{k:'circle',nome:'Círculo',ic:'⭕'},{k:'cone',nome:'Cone',ic:'📐'},{k:'line',nome:'Linha',ic:'➖'}];
function mpOpt(){ return S.ui.mpOpt||(S.ui.mpOpt={}); }
function mpPreset(tool){
  const d={rect:'floor',line:'road',poly:'region',aoe:'circle'}; const p=S.ui.mpPreset||(S.ui.mpPreset={});
  return p[tool]||d[tool];
}
function setPreset(tool,k){ (S.ui.mpPreset||(S.ui.mpPreset={}))[tool]=k; const o=mpOpt(); o.color=null; o.sw=null; o.dash=null; panelRefresh(); paintHint(); }
/* aplica as opções do usuário (cor/espessura/estilo) sobre o estilo do preset */
function styled(o,isLine){
  const op=mpOpt();
  if(op.color){ if(isLine) o.stroke=op.color; else { o.fill=op.color; if(o.role==='region'||o.role==='aoe') o.stroke=op.color; } }
  if(op.sw) o.sw=op.sw; if(op.dash) o.dash=op.dash;
  if(op.shape==='ellipse' && o.t==='rect') o.t='ellipse';
  return o;
}
function mapTool(){ return S.ui.mapTool||'select'; }
function setTool(t){
  S.ui.mapTool=t; if(t!=='stamp') S.ui.stamp=null; S.ui.draft=null;
  if(t!=='ruler') S.ui.ruler=null;
  if(t!=='select' && t!=='stamp') limpaSel();
  S.ui.mpPop=null; render();
}
function toolAfterDraw(){ if(!mpOpt().keep) S.ui.mapTool='select'; }

/* ============================ GESTOS ============================ */
let G=null;
const _ptrs=new Map();
function areaPoint(ev){
  const r=MP.area.getBoundingClientRect(), s=r.width/U_W||1;
  return { x:(ev.clientX-r.left)/s, y:(ev.clientY-r.top)/s };
}
function clampPt(p){ return {x:MPclamp(p.x,0,U_W), y:MPclamp(p.y,0,U_H)}; }
function onVpDown(ev){
  const m=curMap(); if(!m||!MP.area) return;
  if(ev.target.closest&&ev.target.closest('.map-zoom,.mp-hint,.mp-empty-card')) return;
  _ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(_ptrs.size===2){ cancelGesture(true); startPinch(); ev.preventDefault(); return; }
  if(_ptrs.size>2||G) return;
  const tool=mapTool(), btn=ev.button;
  if(btn===1||(btn===0&&(S.ui.spaceDown||tool==='hand'))){ ev.preventDefault(); return startPan(ev); }
  if(btn===2){ if(S.ui.draft){ ev.preventDefault(); finishDraft(); } return; }
  if(btn!==0) return;
  const p=areaPoint(ev);
  if(MP.vp.setPointerCapture){ try{ MP.vp.setPointerCapture(ev.pointerId); }catch(e){} }
  if(tool==='select') return downSelect(ev,m,p);
  ev.preventDefault();
  if(tool==='brush'||tool==='erase') return startBrush(ev,m,tool);
  if(tool==='bucket') return doBucket(m,p,ev);
  if(tool==='stamp') return colocarStamp(m,p.x/10,p.y/6.25);
  if(tool==='rect') return startRect(ev,m,p);
  if(tool==='line'||tool==='poly') return addDraftPoint(m,p,tool);
  if(tool==='text') return doText(m,p);
  if(tool==='ruler') return startRuler(ev,p);
  if(tool==='aoe') return startAoe(ev,m,p);
}
function startPan(ev){
  const v=mapView(curMap()); G={type:'pan',sx:ev.clientX,sy:ev.clientY,ox:v.x,oy:v.y,pid:ev.pointerId}; MP.vp.classList.add('panning');
}
function startPinch(){
  const pts=[..._ptrs.values()], v=mapView(curMap());
  G={type:'pinch',d0:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)||1,s0:v.s,mx:(pts[0].x+pts[1].x)/2,my:(pts[0].y+pts[1].y)/2,ox:v.x,oy:v.y};
}
function downSelect(ev,m,p){
  const hEl=ev.target.closest&&ev.target.closest('[data-h]');
  if(hEl){ ev.preventDefault(); return startHandle(ev,m,hEl.dataset.h,hEl.dataset.i==null?null:+hEl.dataset.i); }
  const eEl=ev.target.closest&&ev.target.closest('[data-eid]');
  const additive=ev.shiftKey||ev.ctrlKey||ev.metaKey;
  if(eEl){
    ev.preventDefault();
    const ref={t:eEl.dataset.et,id:eEl.dataset.eid};
    if(!entGet(m,ref)) return;
    const inSel=selRefs().some(r=>sameRef(r,ref));
    if(additive){
      if(inSel) setSel(selRefs().filter(r=>!sameRef(r,ref)));
      else setSel(selRefs().concat([ref]));
      return;
    }
    if(!inSel) setSel([ref]);
    startMove(ev,m,ref);
    return;
  }
  /* vazio: caixa de seleção (mouse) ou arrastar o mapa (toque) */
  ev.preventDefault();
  if(ev.pointerType==='touch'){ return startPan(ev); }
  G={type:'marquee',x0:p.x,y0:p.y,x1:p.x,y1:p.y,add:additive,base:additive?selRefs().slice():[],sx:ev.clientX,sy:ev.clientY,pid:ev.pointerId,moved:false};
}
function startMove(ev,m,clicked){
  const ents=selEnts(m).filter(x=>!x.e.locked);
  G={type:'move',clicked,ents:ents.map(x=>({t:x.r.t,e:x.e,s:cl(x.e)})),p0:areaPoint(ev),sx:ev.clientX,sy:ev.clientY,moved:false,pid:ev.pointerId};
  if(ents.length){ const bbs=ents.map(x=>entAABB(x.r.t,x.e)); G.b0=unionBB(bbs); }
}
function startHandle(ev,m,hd,idx){
  const sel=selEnts(m); if(sel.length!==1||sel[0].e.locked) return;
  const {r,e}=sel[0];
  G={type:'handle',t:r.t,e,s:cl(e),b0:entBox(r.t,e),h:hd,i:idx,pid:ev.pointerId,pushed:false,moved:false,sx:ev.clientX,sy:ev.clientY};
  if(hd==='mid'){ /* insere um vértice no meio do segmento e passa a arrastá-lo */
    histPush(); G.pushed=true; const a=e.pts[idx], b=e.pts[(idx+1)%e.pts.length];
    e.pts.splice(idx+1,0,[(a[0]+b[0])/2,(a[1]+b[1])/2]); G.s=cl(e); G.h='v'; G.i=idx+1; G.moved=true; markEdited(e); mapRefresh(); }
}
function onDocMove(ev){
  if(_ptrs.has(ev.pointerId)) _ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(!G){ hoverMove(ev); return; }
  const m=curMap(); if(!m) return;
  if(G.type==='pinch'){
    const pts=[..._ptrs.values()]; if(pts.length<2) return;
    const d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)||1, mx=(pts[0].x+pts[1].x)/2, my=(pts[0].y+pts[1].y)/2;
    const v=mapView(m), r=MP.vp.getBoundingClientRect(), s2=MPclamp(G.s0*d/G.d0,.1,8);
    const cx0=G.mx-r.left, cy0=G.my-r.top;
    v.x=(mx-r.left)-(cx0-G.ox)*(s2/G.s0); v.y=(my-r.top)-(cy0-G.oy)*(s2/G.s0); v.s=s2; v.fit=false; aplicaView(); return;
  }
  if(ev.pointerId!==G.pid) return;
  if(G.type==='pan'){ const v=mapView(m); v.x=G.ox+ev.clientX-G.sx; v.y=G.oy+ev.clientY-G.sy; v.fit=false; aplicaView(); return; }
  if(G.type==='brush') return brushMove(ev);
  const p=areaPoint(ev);
  if(G.type==='marquee'){
    if(!G.moved && Math.hypot(ev.clientX-G.sx,ev.clientY-G.sy)<4) return; G.moved=true; G.x1=p.x; G.y1=p.y; paintOverlay(); return;
  }
  if(G.type==='move') return moveStep(ev,m,p);
  if(G.type==='handle') return handleStep(ev,m,p);
  if(G.type==='rect') return rectStep(ev,m,p);
  if(G.type==='ruler'){ S.ui.ruler.b=[p.x,p.y]; paintOverlay(); return; }
  if(G.type==='aoe') return aoeStep(ev,m,p);
}
function onDocUp(ev){
  _ptrs.delete(ev.pointerId);
  if(!G) return;
  if(G.type==='pinch'){ if(_ptrs.size<2) G=null; return; }
  if(ev.pointerId!==G.pid) return;
  const g=G; G=null; const m=curMap();
  if(MP.vp&&MP.vp.classList) MP.vp.classList.remove('panning');
  if(!m) return;
  if(g.type==='brush') return endBrush(g,m);
  if(g.type==='marquee') return endMarquee(g,m,ev);
  if(g.type==='move'){
    if(g.moved){ g.ents.forEach(x=>markEdited(x.e)); mapRefresh(); panelRefresh(); persistSoon(); }
    else if(g.clicked){ /* clique simples dentro de uma multisseleção reduz a esse item */
      const sel=selRefs(); if(sel.length>1 && !ev.shiftKey) setSel([g.clicked]); }
    return;
  }
  if(g.type==='handle'){ if(g.moved){ markEdited(g.e); mapRefresh(); panelRefresh(); persistSoon(); } return; }
  if(g.type==='rect') return endRect(g,m);
  if(g.type==='aoe') return endAoe(g,m);
  if(g.type==='ruler'){ paintOverlay(); return; }
}
function cancelGesture(){ if(G&&G.type==='brush'&&G.cv){ /* mantém o que foi pintado */ } G=null; if(MP.vp) MP.vp.classList.remove('panning'); }

function moveStep(ev,m,p){
  if(!G.ents.length) return;
  if(!G.moved){ if(Math.hypot(ev.clientX-G.sx,ev.clientY-G.sy)<4) return; G.moved=true; histPush(); }
  let dx=p.x-G.p0.x, dy=p.y-G.p0.y;
  if(ev.shiftKey){ if(Math.abs(dx)>Math.abs(dy)) dy=0; else dx=0; }
  /* encaixa o centro do grupo na grade */
  const b=G.b0, cx=(b.x0+b.x1)/2, cy=(b.y0+b.y1)/2, q=snapU(m,cx+dx,cy+dy); dx=q.x-cx; dy=q.y-cy;
  G.ents.forEach(x=>moveEnt(x.t,x.e,x.s,dx,dy));
  fastUpdate(G.ents);
}
function fastUpdate(list){
  let svg=false;
  list.forEach(x=>{ if(x.t==='obj') svg=true; else if(typeof refreshEntEl==='function') refreshEntEl(x.t,x.e); });
  if(svg) repaintSvg();
  paintOverlay();
}
function handleStep(ev,m,p){
  const g=G, e=g.e, t=g.t;
  if(!g.moved){ if(Math.hypot(ev.clientX-g.sx,ev.clientY-g.sy)<3) return; g.moved=true; if(!g.pushed){ histPush(); g.pushed=true; } }
  if(g.h==='v'){ const q=snapU(m,p.x,p.y); e.pts[g.i]=[q.x,q.y]; fastUpdate([{t,e}]); return; }
  const b0=g.b0;
  if(g.h==='rot'){
    let ang=Math.atan2(p.y-b0.cy,p.x-b0.cx)*180/Math.PI+90;
    if(ev.shiftKey) ang=Math.round(ang/15)*15;
    ang=Math.round(ang*10)/10;
    setBoxEnt(t,e,g.s,b0,{cx:b0.cx,cy:b0.cy,w:b0.w,h:b0.h,rot:ang}); fastUpdate([{t,e}]); return;
  }
  const hd=g.h, sx=hd.includes('e')?1:hd.includes('w')?-1:0, sy=hd.includes('s')?1:hd.includes('n')?-1:0;
  const loc=rotPt(p.x-b0.cx,p.y-b0.cy,-b0.rot);
  const rs=b0.rs;
  let w=b0.w,h=b0.h,ox=0,oy=0;
  const aspect=(rs==='aspect')||(ev.shiftKey&&sx&&sy);
  if(aspect && sx&&sy){
    const F=[-sx*b0.w/2,-sy*b0.h/2], D=[sx*b0.w,sy*b0.h], L2=D[0]*D[0]+D[1]*D[1];
    const k=MPclamp(((loc[0]-F[0])*D[0]+(loc[1]-F[1])*D[1])/L2,.05,60);
    w=b0.w*k; h=b0.h*k; ox=F[0]+sx*w/2; oy=F[1]+sy*h/2;
  } else {
    if(sx){ const f=-sx*b0.w/2; w=Math.max(6,sx*(loc[0]-f)); ox=f+sx*w/2; }
    if(sy){ const f=-sy*b0.h/2; h=Math.max(6,sy*(loc[1]-f)); oy=f+sy*h/2; }
    if(rs==='w'){ h=b0.h; oy=0; }
  }
  const o=rotPt(ox,oy,b0.rot);
  setBoxEnt(t,e,g.s,b0,{cx:b0.cx+o[0],cy:b0.cy+o[1],w,h,rot:b0.rot});
  fastUpdate([{t,e}]);
}
function endMarquee(g,m,ev){
  if(!g.moved){ if(!g.add) setSel([]); return; }
  const x0=Math.min(g.x0,g.x1), x1=Math.max(g.x0,g.x1), y0=Math.min(g.y0,g.y1), y1=Math.max(g.y0,g.y1);
  const hit=allEnts(m).filter(x=>{ const b=entAABB(x.t,x.e); return b.x1>=x0&&b.x0<=x1&&b.y1>=y0&&b.y0<=y1; }).map(x=>({t:x.t,id:x.e.id}));
  setSel(g.add?g.base.concat(hit.filter(r=>!g.base.some(b=>sameRef(b,r)))):hit);
}

/* ---- Retângulo / elipse (sala, parede, casa, água…) ---- */
const RECT_DEFAULT={floor:[130,100],wall:[150,16],house:[56,40],water:[160,110],grass:[150,110],ice:[110,90],plaza:[90,90],plain:[110,80]};
function startRect(ev,m,p){
  p=clampPt(p); const q=snapU(m,p.x,p.y), role=mpPreset('rect');
  histPush();
  const ell=mpOpt().shape==='ellipse'||role==='plaza';
  const o=styled(mkObj(m,ell?'ellipse':'rect',role,{cx:q.x,cy:q.y,w:0,h:0}),false);
  if(role==='house'&&o.t!=='rect') o.t='rect';
  m.objs.push(o);
  G={type:'rect',o,x0:q.x,y0:q.y,pid:ev.pointerId,moved:false,sx:ev.clientX,sy:ev.clientY};
}
function rectStep(ev,m,p){
  const g=G; if(!g.moved && Math.hypot(ev.clientX-g.sx,ev.clientY-g.sy)<4) return; g.moved=true;
  p=clampPt(p); const q=snapU(m,p.x,p.y); let x1=q.x,y1=q.y;
  if(ev.shiftKey){ const d=Math.max(Math.abs(x1-g.x0),Math.abs(y1-g.y0)); x1=g.x0+Math.sign(x1-g.x0||1)*d; y1=g.y0+Math.sign(y1-g.y0||1)*d; }
  const o=g.o; o.cx=(g.x0+x1)/2; o.cy=(g.y0+y1)/2; o.w=Math.abs(x1-g.x0); o.h=Math.abs(y1-g.y0);
  repaintSvg(); showDims(o.w,o.h);
}
function endRect(g,m){
  const o=g.o; showDims(null);
  if(!g.moved||o.w<6||o.h<6){ const d=RECT_DEFAULT[o.role]||[110,80]; o.w=d[0]; o.h=d[1]; o.cx=g.x0; o.cy=g.y0;
    if(o.role==='plaza'){ o.h=o.w; } }
  toolAfterDraw(); setSel([{t:'obj',id:o.id}],{noPanel:true}); render();
  persistSoon();
}
function showDims(w,h){
  let d=MP.ws&&MP.ws.querySelector('.mp-dims'); if(w==null){ if(d) d.remove(); return; }
  if(!d){ d=h2('div',{class:'mp-dims'}); MP.ws.querySelector('.mp-stage').appendChild(d); }
  d.textContent=Math.round(w)+' × '+Math.round(h)+(measureText(Math.max(w,h))?'  ·  ≈ '+measureText(Math.max(w,h)):'');
}
const h2=h;   /* alias (dentro de funções com variável local "h") */

/* ---- Polilinha / polígono por cliques ---- */
function addDraftPoint(m,p,tool){
  p=clampPt(p); const q=snapU(m,p.x,p.y);
  let d=S.ui.draft;
  if(!d||d.tool!==tool){ d=S.ui.draft={tool,preset:mpPreset(tool),pts:[],cur:[q.x,q.y]}; }
  /* clicar perto do primeiro ponto fecha o polígono */
  if(tool==='poly' && d.pts.length>=3 && Math.hypot(q.x-d.pts[0][0],q.y-d.pts[0][1])<12/(mapView(m).s||1)+6) return finishDraft();
  const last=d.pts[d.pts.length-1];
  if(!last||Math.hypot(last[0]-q.x,last[1]-q.y)>2) d.pts.push([q.x,q.y]);
  paintOverlay(); paintHint();
}
function finishDraft(){
  const m=curMap(), d=S.ui.draft; if(!m||!d) return;
  const need=d.tool==='poly'?3:2;
  if(d.pts.length<need){ S.ui.draft=null; paintOverlay(); paintHint(); return mpToast('Poucos pontos — cancelado'); }
  histPush();
  const isLine=d.tool==='line';
  const o=styled(mkObj(m,'path',d.preset,{pts:d.pts.map(p=>[p[0],p[1]]),closed:!isLine}),isLine);
  m.objs.push(o); S.ui.draft=null;
  toolAfterDraw(); setSel([{t:'obj',id:o.id}],{noPanel:true}); render(); persistSoon();
}
function cancelDraft(){ S.ui.draft=null; paintOverlay(); paintHint(); }
function undoDraftPoint(){ const d=S.ui.draft; if(!d) return; d.pts.pop(); if(!d.pts.length) S.ui.draft=null; paintOverlay(); paintHint(); }
function hoverMove(ev){
  const d=S.ui.draft;
  if(d && MP.area && MP.vp && MP.vp.contains(ev.target)){ const p=clampPt(areaPoint(ev)), q=snapU(curMap(),p.x,p.y); d.cur=[q.x,q.y]; paintOverlay(); }
  const ring=MP.vp&&MP.vp.querySelector('.map-ring');
  if(ring && (mapTool()==='brush'||mapTool()==='erase')){
    const r=MP.vp.getBoundingClientRect(), rad=brushSize()*0.8;
    ring.style.display='block'; ring.style.width=ring.style.height=(rad*2)+'px';
    ring.style.left=(ev.clientX-r.left-rad)+'px'; ring.style.top=(ev.clientY-r.top-rad)+'px';
  }
}

/* ---- Texto ---- */
function doText(m,p){
  p=clampPt(p); const q=snapU(m,p.x,p.y), op=mpOpt();
  histPush();
  const o=mkObj(m,'text','plain',{x:q.x,y:q.y,text:'Texto',size:op.tsize||22,color:op.tcolor||(paletaMapa(m.theme).txt&&m.bg?paletaMapa(m.theme).txt:'#ffffff')});
  if(m.bg||m.fx) o.halo=false;
  m.objs.push(o); toolAfterDraw(); setSel([{t:'obj',id:o.id}],{noPanel:true}); render(); persistSoon();
  setTimeout(()=>{ const i=MP.ws&&MP.ws.querySelector('[data-focus="text"]'); if(i){ i.focus(); i.select(); } },40);
}

/* ---- Régua ---- */
function measureText(units){
  const m=curMap(); if(!m) return '';
  const sc=scaleCfg(m), real=units/U_W*sc.total;
  let s=(real>=100?Math.round(real):Math.round(real*10)/10).toLocaleString('pt-BR')+' '+sc.unit;
  if(m.grid&&m.grid.on&&m.grid.size>0) s+=' · '+(Math.round(units/m.grid.size*10)/10).toLocaleString('pt-BR')+' casas';
  return s;
}
function startRuler(ev,p){
  S.ui.ruler={a:[p.x,p.y],b:[p.x,p.y]}; G={type:'ruler',pid:ev.pointerId}; paintOverlay();
}

/* ---- Área de magia ---- */
function startAoe(ev,m,p){
  p=clampPt(p); const k=mpPreset('aoe'); histPush();
  let o;
  if(k==='circle') o=mkObj(m,'ellipse','aoe',{cx:p.x,cy:p.y,w:2,h:2,label:'Círculo'});
  else if(k==='cone') o=mkObj(m,'path','aoe',{pts:[[p.x,p.y],[p.x,p.y],[p.x,p.y]],closed:true,smooth:false,label:'Cone'});
  else o=mkObj(m,'rect','aoe',{cx:p.x,cy:p.y,w:2,h:20,rot:0,label:'Linha'});
  styled(o,false); if(mpOpt().color){ o.stroke=mpOpt().color; }
  m.objs.push(o); G={type:'aoe',o,k,x0:p.x,y0:p.y,pid:ev.pointerId,moved:false,sx:ev.clientX,sy:ev.clientY};
}
function aoeStep(ev,m,p){
  const g=G, o=g.o; if(!g.moved&&Math.hypot(ev.clientX-g.sx,ev.clientY-g.sy)<4) return; g.moved=true;
  p=clampPt(p); const dx=p.x-g.x0, dy=p.y-g.y0, L=Math.max(4,Math.hypot(dx,dy)), a=Math.atan2(dy,dx);
  if(g.k==='circle'){ o.w=o.h=L*2; }
  else if(g.k==='cone'){ const sp=mpRad(26.5); o.pts=[[g.x0,g.y0],[g.x0+Math.cos(a-sp)*L/Math.cos(sp),g.y0+Math.sin(a-sp)*L/Math.cos(sp)],[g.x0+Math.cos(a+sp)*L/Math.cos(sp),g.y0+Math.sin(a+sp)*L/Math.cos(sp)]]; }
  else { o.w=L; o.cx=g.x0+dx/2; o.cy=g.y0+dy/2; o.rot=a*180/Math.PI; }
  repaintSvg(); showDims(L,0); const d=MP.ws.querySelector('.mp-dims'); if(d) d.textContent=(g.k==='circle'?'raio ':'alcance ')+measureText(L);
}
function endAoe(g,m){
  showDims(null);
  if(!g.moved){ m.objs.splice(m.objs.indexOf(g.o),1); mpToast('Arraste a partir do ponto de origem'); repaintSvg(); return; }
  toolAfterDraw(); setSel([{t:'obj',id:g.o.id}],{noPanel:true}); render(); persistSoon();
}

/* ---- Balde ---- */
function doBucket(m,p,ev){
  const eEl=ev.target.closest&&ev.target.closest('[data-eid]');
  const mat=terrainMatMeta(brushMat());
  if(eEl){
    const e=entGet(m,{t:eEl.dataset.et,id:eEl.dataset.eid});
    if(e && eEl.dataset.et==='obj' && e.t!=='text' && e.t!=='door'){
      histPush();
      if(e.t==='path'&&!e.closed){ e.stroke=mat.color; } else { e.fill=mat.color; if(e.op==null||e.op<.6) e.op=.9; }
      markEdited(e); mapRefresh(); panelRefresh(); persistSoon(); mpToast('Objeto pintado'); return;
    }
  }
  if(typeof floodTerrain==='function'){ histPush(); floodTerrain(m,p.x,p.y,mat); }
}

/* ---- Pincel (usa o canvas de terreno de campaign-map.js) ---- */
function startBrush(ev,m,tool){
  const cv=terrainCanvasFor(m); const ctx=cv.getContext('2d');
  histPush();
  G={type:'brush',tool,cv,ctx,mat:terrainMatMeta(brushMat()),last:null,pid:ev.pointerId};
  brushMove(ev);
}
function brushMove(ev){
  const g=G, m=curMap(), v=mapView(m), p=areaPoint(ev);
  const r=brushSize()*0.8/(v.s||1);
  const sx=p.x/U_W*g.cv.width, sy=p.y/U_H*g.cv.height, k=g.cv.width/U_W;
  const R=r*k;
  if(!g.last){ stampTerrain(g.ctx,sx,sy,R*(0.9+Math.random()*0.2),g.mat,g.tool==='erase'); g.last=[sx,sy]; return; }
  const dx=sx-g.last[0], dy=sy-g.last[1], dist=Math.hypot(dx,dy), step=Math.max(3,R*0.45);
  for(let d=step; d<=dist; d+=step){ const t=d/dist;
    stampTerrain(g.ctx,g.last[0]+dx*t,g.last[1]+dy*t,R*(0.85+Math.random()*0.3),g.mat,g.tool==='erase'); }
  g.last=[sx,sy];
}
function endBrush(g,m){ salvaTerreno(g.cv,m); histBtns(); }

/* ---- Carimbos (peças / locais / tokens / reinos / portas / árvores) ---- */
function armarStamp(stamp){ S.ui.stamp=stamp; S.ui.mapTool='stamp'; S.ui.mpPop=null; S.ui.draft=null; render(); }
function stampLabel(){
  const s=S.ui.stamp; if(!s) return '';
  if(s.t==='prop'){ const it=propMeta(s.k); return it?(it.ic+' '+it.nome):'peça'; }
  if(s.t==='pin') return (s.ic||'📍')+' local';
  if(s.t==='kingdom') return '🏴 reino';
  if(s.t==='door') return '🚪 porta';
  if(s.t==='tree') return '🌳 árvore';
  if(s.t==='token') return kindEmoji(s.kind)+' '+(s.label||'token');
  return 'peça';
}
function colocarStamp(m,xp,yp){
  const s=S.ui.stamp; if(!s) return;
  { const q=snapPct(m,MPclamp(xp,0,100),MPclamp(yp,0,100)); xp=q.x; yp=q.y; }
  histPush(); let ref=null;
  if(s.t==='prop'){ const p=newProp(s.k,xp,yp); m.props.push(p); ref={t:'prop',id:p.id}; }
  else if(s.t==='pin'){ const p=newPin(xp,yp,s.ic); m.pins.push(p); ref={t:'pin',id:p.id}; }
  else if(s.t==='kingdom'){ const k=newKingdom(xp,yp); m.world.kingdoms.push(k); ref={t:'king',id:k.id}; }
  else if(s.t==='token'){ const tk=newToken(s.kind,s.label,s.refId); tk.xPct=xp; tk.yPct=yp; autoNumber(m,tk); m.tokens.push(tk); ref={t:'token',id:tk.id}; }
  else if(s.t==='door'){ const o=mkObj(m,'door','plain',{cx:xp*10,cy:yp*6.25,w:m.grid&&m.grid.on?m.grid.size*0.9:16}); m.objs.push(o); ref={t:'obj',id:o.id}; }
  else if(s.t==='tree'){ const o=mkObj(m,'ellipse','tree',{cx:xp*10,cy:yp*6.25,w:18+Math.round(Math.random()*8),h:20}); o.h=o.w; m.objs.push(o); ref={t:'obj',id:o.id}; }
  if(ref){ S.ui.msel=[ref]; syncLegacySel(); }
  mapRefresh(); panelRefresh(); persistSoon();
}
function autoNumber(m,tk){
  const base=tk.label.replace(/\s+\d+$/,'');
  const n=m.tokens.filter(x=>x.kind===tk.kind && x.refId===tk.refId).length;
  if(n>=1) tk.label=base+' '+(n+1);
}

/* ============================ CAMADA DE SELEÇÃO (alças) ============================ */
const HANDLES=[['nw',0,0],['n',50,0],['ne',100,0],['e',100,50],['se',100,100],['s',50,100],['sw',0,100],['w',0,50]];
function paintOverlay(){
  const ov=MP.ov, m=curMap(); if(!ov||!m) return;
  ov.innerHTML='';
  const sel=selEnts(m), v=mapView(m);
  const pct=(x,y)=>({left:(x/U_W*100)+'%', top:(y/U_H*100)+'%'});
  /* contornos de cada item selecionado */
  sel.forEach(({r,e})=>{
    const b=entBox(r.t,e);
    const box=h('div',{class:'mp-selbox'+(sel.length>1?' multi':'')+(e.locked?' locked':'')});
    Object.assign(box.style,pct(b.cx,b.cy),{width:(b.w/U_W*100)+'%',height:(b.h/U_H*100)+'%',transform:'translate(-50%,-50%) rotate('+(b.rot||0)+'deg)'});
    ov.appendChild(box);
  });
  /* alças do item único */
  if(sel.length===1 && !sel[0].e.locked && mapTool()==='select'){
    const {r,e}=sel[0], b=entBox(r.t,e);
    if(b.rs||b.ro||b.vtx){
      const hb=h('div',{class:'mp-hbox'});
      Object.assign(hb.style,pct(b.cx,b.cy),{width:(b.w/U_W*100)+'%',height:(b.h/U_H*100)+'%',transform:'translate(-50%,-50%) rotate('+(b.rot||0)+'deg)'});
      if(b.rs){
        HANDLES.forEach(([k,x,y])=>{
          if(b.rs==='aspect' && k.length===1) return;
          if(b.rs==='w' && k!=='e' && k!=='w') return;
          const he=h('div',{class:'mp-h h-'+k,'data-h':k,style:{left:x+'%',top:y+'%'}}); hb.appendChild(he);
        });
      }
      if(b.ro){ hb.appendChild(h('div',{class:'mp-rotline'})); hb.appendChild(h('div',{class:'mp-h h-rot','data-h':'rot',title:'Girar (Shift = 15°)'})); }
      ov.appendChild(hb);
    }
    if(b.vtx && e.t==='path'){
      e.pts.forEach((p,i)=>{
        const he=h('div',{class:'mp-vtx','data-h':'v','data-i':i,title:'Arraste · duplo clique remove'}); Object.assign(he.style,pct(p[0],p[1])); ov.appendChild(he);
        const n=e.pts.length, last=(i===n-1);
        if(!last||e.closed){ const q=e.pts[(i+1)%n], mid=h('div',{class:'mp-mid','data-h':'mid','data-i':i,title:'Arraste para criar um ponto'});
          Object.assign(mid.style,pct((p[0]+q[0])/2,(p[1]+q[1])/2)); ov.appendChild(mid); }
      });
    }
  } else if(sel.length>1){
    const U=unionBB(sel.map(x=>entAABB(x.r.t,x.e)));
    const gb=h('div',{class:'mp-groupbox'});
    Object.assign(gb.style,{left:(U.x0/U_W*100)+'%',top:(U.y0/U_H*100)+'%',width:((U.x1-U.x0)/U_W*100)+'%',height:((U.y1-U.y0)/U_H*100)+'%'});
    ov.appendChild(gb);
  }
  /* marquee */
  if(G&&G.type==='marquee'&&G.moved){
    const x0=Math.min(G.x0,G.x1), y0=Math.min(G.y0,G.y1);
    const mq=h('div',{class:'mp-marquee'}); Object.assign(mq.style,{left:(x0/U_W*100)+'%',top:(y0/U_H*100)+'%',width:(Math.abs(G.x1-G.x0)/U_W*100)+'%',height:(Math.abs(G.y1-G.y0)/U_H*100)+'%'});
    ov.appendChild(mq);
  }
  /* rascunho (polilinha/polígono) e régua */
  const d=S.ui.draft, rl=S.ui.ruler;
  if(d||rl){
    let svg='<svg class="mp-draft" viewBox="0 0 '+U_W+' '+U_H+'" preserveAspectRatio="none">';
    const k=1/(v.s||1);
    if(d){
      const pts=d.pts.concat(d.cur?[d.cur]:[]);
      const dd=pts.map((p,i)=>(i?'L':'M')+f1(p[0])+' '+f1(p[1])).join('');
      if(d.tool==='poly'&&d.pts.length>=2) svg+='<path d="'+dd+'Z" fill="rgba(99,102,241,.18)" stroke="none"/>';
      svg+='<path d="'+dd+'" fill="none" stroke="#a5b4fc" stroke-width="'+f1(2.2*k)+'" stroke-dasharray="'+f1(6*k)+' '+f1(4*k)+'"/>';
      d.pts.forEach((p,i)=>{ svg+='<circle cx="'+f1(p[0])+'" cy="'+f1(p[1])+'" r="'+f1((i===0&&d.tool==='poly'?6:4)*k)+'" fill="'+(i===0?'#fbbf24':'#fff')+'" stroke="#4338ca" stroke-width="'+f1(1.5*k)+'"/>'; });
    }
    if(rl){
      svg+='<line x1="'+f1(rl.a[0])+'" y1="'+f1(rl.a[1])+'" x2="'+f1(rl.b[0])+'" y2="'+f1(rl.b[1])+'" stroke="#fbbf24" stroke-width="'+f1(2.5*k)+'" stroke-dasharray="'+f1(8*k)+' '+f1(5*k)+'"/>'
        +'<circle cx="'+f1(rl.a[0])+'" cy="'+f1(rl.a[1])+'" r="'+f1(4.5*k)+'" fill="#fbbf24"/><circle cx="'+f1(rl.b[0])+'" cy="'+f1(rl.b[1])+'" r="'+f1(4.5*k)+'" fill="#fbbf24"/>';
    }
    ov.insertAdjacentHTML('beforeend',svg+'</svg>');
    if(rl){
      const dist=Math.hypot(rl.b[0]-rl.a[0],rl.b[1]-rl.a[1]);
      const lb=h('div',{class:'mp-rulerlbl'}, measureText(dist)); Object.assign(lb.style,pct((rl.a[0]+rl.b[0])/2,(rl.a[1]+rl.b[1])/2)); ov.appendChild(lb);
    }
  }
}
function paintHint(){
  const el=MP.ws&&MP.ws.querySelector('.mp-hint'); if(!el) return;
  el.replaceWith(hintBar());
}
function hintBar(){
  const t=mapTool(), d=S.ui.draft;
  const txt={
    select:'Clique para selecionar · arraste no vazio para caixa de seleção · Shift soma · alças mudam tamanho/giro',
    hand:'Arraste para mover o mapa · roda do mouse = zoom',
    brush:'Pinte o terreno · [ ] muda o tamanho',
    erase:'Apague o terreno pintado · [ ] muda o tamanho',
    bucket:'Clique num objeto para pintá-lo, ou numa área do terreno para preenchê-la',
    rect:'Arraste para desenhar (Shift = quadrado) · clique cria no tamanho padrão',
    line:d?'Clique para adicionar pontos · duplo clique ou Enter conclui · Esc cancela':'Clique para começar a linha (estrada, rio, muro…)',
    poly:d?'Clique os pontos · clique no 1º ponto, duplo clique ou Enter fecha':'Clique para marcar os cantos da região',
    text:'Clique no mapa para colocar um texto',
    ruler:'Arraste para medir a distância',
    aoe:'Arraste a partir da origem da magia',
    stamp:'Clique no mapa para posicionar: '+stampLabel()+' · Esc termina',
  }[t]||'';
  const kids=[h('span',{class:'mp-hint-t'},txt)];
  if(d && d.pts.length){
    kids.push(h('button',{class:'btn sm primary',onclick:finishDraft},'✓ Concluir'));
    kids.push(h('button',{class:'btn sm ghost',onclick:undoDraftPoint,title:'Remove o último ponto (Backspace)'},'↶ Ponto'));
    kids.push(h('button',{class:'btn sm ghost',onclick:cancelDraft},'✕ Cancelar'));
  }
  return h('div',{class:'mp-hint'+(d&&d.pts.length?' act':'')},...kids);
}

/* ============================ PAINEL DE PROPRIEDADES ============================ */
function panelRefresh(){
  if(!MP.pbody) return;
  const m=curMap(); if(!m) return;
  const keepScroll=MP.pbody.scrollTop;
  MP.pbody.innerHTML=''; MP.pbody.appendChild(panelBody(m)); MP.pbody.scrollTop=keepScroll;
  const tabs=MP.ws.querySelectorAll('.mp-ptab'); tabs.forEach(t=>t.classList.toggle('on',t.dataset.tab===(S.ui.mpTab||'props')));
  const cnt=MP.ws.querySelector('.mp-ptab[data-tab="objs"] .n'); if(cnt) cnt.textContent=allEnts(m).length;
  if(typeof a11yPass==='function') a11yPass(MP.pbody);
}
function panelBody(m){
  const tab=S.ui.mpTab||'props';
  if(tab==='objs') return objectsList(m);
  const sel=selEnts(m);
  if(!sel.length) return toolOptions(m);
  if(sel.length>1) return multiPanel(m,sel);
  return singlePanel(m,sel[0]);
}
/* --- construtores de controles --- */
const prow=(label,...ctl)=>h('div',{class:'mp-row'},h('span',{class:'mp-lb'},label),h('div',{class:'mp-ct'},...ctl));
function live(key,fn){
  const m=curMap(); if(!m) return; histPush(key); fn(); selEnts(m).forEach(x=>markEdited(x.e)); mapRefresh(); persistSoon();
}
function pColor(get,set,key,title){
  return h('input',{type:'color',class:'mp-color',value:toHex(get()),title:title||'Cor','aria-label':title||'Cor',
    oninput:e=>live(key,()=>set(e.target.value)), onchange:()=>panelRefresh()});
}
function pRange(min,max,step,get,set,key,fmt,label){
  const val=h('span',{class:'mp-val'},fmt?fmt(get()):String(get()));
  const inp=h('input',{type:'range',min,max,step:step||1,value:get(),'aria-label':label||'Valor',
    oninput:e=>{ const v=parseFloat(e.target.value); live(key,()=>set(v)); val.textContent=fmt?fmt(v):String(v); }});
  return h('div',{class:'mp-rng'},inp,val);
}
function pNum(get,set,key,min,max,label){
  return h('input',{type:'number',class:'in mp-num',value:Math.round(get()*10)/10,min,max,'aria-label':label,
    onchange:e=>{ const v=parseFloat(e.target.value); if(isNaN(v)) return; live(key,()=>set(MPclamp(v,min==null?-1e9:min,max==null?1e9:max))); panelRefresh(); }});
}
function pChk(label,get,set){
  return h('label',{class:'chk mp-chk'},h('input',{type:'checkbox',checked:!!get(),onchange:e=>{ live(null,()=>set(e.target.checked)); panelRefresh(); }}),' '+label);
}
function pSel(opts,get,set,label){
  return h('select',{class:'in mp-sel','aria-label':label,onchange:e=>{ live(null,()=>set(e.target.value)); panelRefresh(); }},
    opts.map(([v,t])=>h('option',{value:v,selected:get()===v},t)));
}
function pSwatches(list,get,set,key){
  return h('div',{class:'mp-sw'},list.map(c=>h('button',{class:'map-swatch'+(get()===c?' on':''),style:{background:c},title:c,'aria-label':'Cor '+c,
    onclick:()=>{ live(key,()=>set(c)); panelRefresh(); }})));
}
function ibtn(ic,title,fn,cls,dis){ return h('button',{class:'mp-ib'+(cls?' '+cls:''),title,'aria-label':title,disabled:dis?true:null,onclick:fn},ic); }
function actionBar(sel){
  const one=sel.length===1;
  const locked=sel.every(x=>x.e.locked), hidden=sel.every(x=>x.e.hidden);
  const grouped=sel.some(x=>x.e.gid);
  return h('div',{class:'mp-acts'},
    ibtn('⧉','Duplicar (Ctrl+D)',actDuplicate),
    ibtn('⬔','Trazer para frente (Ctrl+])',()=>actZ('front')),
    ibtn('⬓','Enviar para trás (Ctrl+[)',()=>actZ('back')),
    ibtn(locked?'🔒':'🔓',locked?'Destravar':'Travar (não move nem exclui)',()=>actToggle('locked'),locked?'on':''),
    ibtn(hidden?'🙈':'👁',hidden?'Mostrar':'Ocultar (some na exportação)',()=>actToggle('hidden'),hidden?'on':''),
    !one||grouped?ibtn(grouped?'⛓️‍💥':'⛓','Agrupar (Ctrl+G) / desagrupar (Ctrl+Shift+G)',()=>actGroup(!grouped||sel.length>1&&!sel.every(x=>x.e.gid&&x.e.gid===sel[0].e.gid)),grouped?'on':''):null,
    ibtn('🗑','Excluir (Delete)',actDelete,'danger'));
}
function singlePanel(m,{r,e}){
  const info=entInfo(r.t,e), t=r.t;
  const nameKey=t==='king'?'name':'label';
  const head=h('div',{class:'mp-phead'},
    h('span',{class:'mp-pic'},info.ic),
    h('input',{class:'in mp-name','aria-label':'Nome',placeholder:info.cat==='Textos'?'rótulo':info.nome,value:e[nameKey]||(t==='obj'&&e.t==='text'?'':''),
      onchange:ev=>{ live(null,()=>{ e[nameKey]=ev.target.value; }); panelRefresh(); }}));
  const body=h('div',{class:'mp-pbody-in'},head,actionBar([{r,e}]));
  if(e.locked) body.appendChild(h('div',{class:'hint mp-warn'},'🔒 Travado — destrave para mover, editar ou excluir.'));
  const b=entBox(t,e);
  /* geometria comum */
  const geom=()=>{
    const out=[];
    if(t==='obj'&&(e.t==='rect'||e.t==='ellipse')){
      out.push(prow('Tamanho',pNum(()=>e.w,v=>{ e.w=v; if(e.role==='tree') e.h=v; },'w',6,1000,'Largura'),h('span',{class:'mp-x'},'×'),pNum(()=>e.h,v=>{ e.h=v; if(e.role==='tree') e.w=v; },'h',6,625,'Altura')));
      out.push(prow('Posição',pNum(()=>e.cx,v=>{ e.cx=v; },'cx',-200,1200,'X'),h('span',{class:'mp-x'},','),pNum(()=>e.cy,v=>{ e.cy=v; },'cy',-200,800,'Y')));
    }
    if(b.ro) out.push(prow('Girar',pRange(-180,180,1,()=>Math.round(((entBox(t,e).rot+540)%360)-180),v=>{ const bb=entBox(t,e); setBoxEnt(t,e,cl(e),bb,Object.assign({},bb,{rot:v})); },'rot',v=>v+'°','Rotação')));
    return out;
  };
  if(t==='obj'){
    if(e.t==='text'){
      body.appendChild(prow('Texto',h('input',{class:'in','data-focus':'text',value:e.text||'','aria-label':'Texto',oninput:ev=>live('txt',()=>{ e.text=ev.target.value; }),onchange:()=>panelRefresh()})));
      body.appendChild(prow('Tamanho',pRange(8,120,1,()=>e.size||18,v=>{ e.size=v; },'tsz',v=>v+'px','Tamanho do texto')));
      body.appendChild(prow('Cor',pColor(()=>e.color,v=>{ e.color=v; },'tcol')));
      body.appendChild(h('div',{class:'mp-chks'},pChk('Negrito',()=>e.bold,v=>{ e.bold=v; }),pChk('Contorno',()=>e.halo,v=>{ e.halo=v; }),pChk('Em círculo (número)',()=>e.badge,v=>{ e.badge=v; })));
      geom().forEach(x=>body.appendChild(x));
    } else if(e.t==='door'){
      body.appendChild(prow('Largura',pRange(8,80,1,()=>e.w,v=>{ e.w=v; },'dw',v=>v,'Largura da porta')));
      body.appendChild(prow('Cor',pColor(()=>e.fill,v=>{ e.fill=v; },'dc')));
      geom().forEach(x=>body.appendChild(x));
    } else if(e.t==='path'){
      const isLine=!e.closed;
      body.appendChild(prow(isLine?'Cor do traço':'Contorno',pColor(()=>e.stroke||'#ffffff',v=>{ e.stroke=v; },'st'),
        pSwatches(['#b79a6e','#4b8fcf','#e2e8f0','#7a2f2f','#2a2118','#e11d48','#059669'],()=>e.stroke,v=>{ e.stroke=v; },'st')));
      body.appendChild(prow('Espessura',pRange(0,60,.5,()=>e.sw||0,v=>{ e.sw=v; },'sw',v=>v,'Espessura')));
      body.appendChild(prow('Estilo',pSel([['solid','Sólida'],['dash','Tracejada'],['dot','Pontilhada']],()=>e.dash||'solid',v=>{ e.dash=v; },'Estilo do traço')));
      if(isLine && e.edge!=null) body.appendChild(prow('Margem',pColor(()=>e.edge,v=>{ e.edge=v; },'ed'),pRange(0,12,.5,()=>e.edgew||0,v=>{ e.edgew=v; },'edw',v=>v,'Espessura da margem')));
      if(!isLine){
        body.appendChild(prow('Preencher',pColor(()=>e.fill||'#888888',v=>{ e.fill=v; if(e.op==null) e.op=.5; },'fl'),
          h('button',{class:'btn sm ghost',onclick:()=>{ live(null,()=>{ e.fill=null; }); panelRefresh(); }},'nenhum')));
        body.appendChild(prow('Opacidade',pRange(0,1,.05,()=>e.op==null?1:e.op,v=>{ e.op=v; },'op',v=>Math.round(v*100)+'%','Opacidade')));
      }
      body.appendChild(h('div',{class:'mp-chks'},pChk('Suavizar curvas',()=>e.smooth,v=>{ e.smooth=v; }),pChk('Fechar (região)',()=>e.closed,v=>{ e.closed=v; if(v&&!e.fill){ e.fill=e.stroke||'#888888'; e.op=.3; } })));
      body.appendChild(h('div',{class:'hint'},'Arraste os pontos · arraste o ● do meio para criar um ponto · duplo clique num ponto o remove. ('+e.pts.length+' pontos)'));
      geom().forEach(x=>body.appendChild(x));
    } else {
      if(e.role!=='tree'||true){
        body.appendChild(prow('Preencher',pColor(()=>e.fill||'#888888',v=>{ e.fill=v; },'fl'),
          pSwatches(['#f8f1dc','#b9a883','#3f86c4','#4e8f45','#a8553a','#cfe8f5','#64748b'],()=>e.fill,v=>{ e.fill=v; },'fl')));
        body.appendChild(prow('Opacidade',pRange(0,1,.05,()=>e.op==null?1:e.op,v=>{ e.op=v; },'op',v=>Math.round(v*100)+'%','Opacidade')));
        body.appendChild(prow('Contorno',pColor(()=>e.stroke||'#222222',v=>{ e.stroke=v; },'st'),pRange(0,20,.5,()=>e.sw||0,v=>{ e.sw=v; },'sw',v=>v,'Espessura do contorno')));
        if(e.role!=='floor'&&e.role!=='tree'&&e.role!=='house') body.appendChild(prow('Estilo',pSel([['solid','Sólido'],['dash','Tracejado'],['dot','Pontilhado']],()=>e.dash||'solid',v=>{ e.dash=v; },'Estilo do contorno')));
      }
      geom().forEach(x=>body.appendChild(x));
      if(e.role==='floor') body.appendChild(h('div',{class:'hint'},'Salas encostadas se fundem em uma só planta (as paredes só aparecem no contorno).'));
    }
  } else if(t==='prop'){
    if(e.shape==='block'){
      body.appendChild(prow('Largura',pRange(2,100,.5,()=>e.w,v=>{ e.w=v; },'pw',v=>Math.round(v)+'%','Largura')));
      body.appendChild(prow('Altura',pRange(2,100,.5,()=>e.h,v=>{ e.h=v; },'ph',v=>Math.round(v)+'%','Altura')));
    } else body.appendChild(prow('Tamanho',pRange(30,500,5,()=>e.size||100,v=>{ e.size=v; },'ps',v=>v+'%','Tamanho')));
    body.appendChild(prow('Girar',pRange(-180,180,1,()=>Math.round(((e.rot||0)+540)%360-180),v=>{ e.rot=v; },'pr',v=>v+'°','Rotação')));
  } else if(t==='pin'){
    body.appendChild(h('div',{class:'pin-picker'},PIN_ICONS.map(ic=>h('button',{class:'pin-pick'+(e.icon===ic?' on':''),'aria-label':'Ícone '+ic,onclick:()=>{ live(null,()=>{ e.icon=ic; }); panelRefresh(); }},ic))));
  } else if(t==='king'){
    body.appendChild(prow('Cor',pColor(()=>e.color,v=>{ e.color=v; },'kc')));
    body.appendChild(pSwatches(KINGDOM_COLORS,()=>e.color,v=>{ e.color=v; },'kc'));
    body.appendChild(prow('Extensão',pRange(2,60,1,()=>e.radius,v=>{ e.radius=v; },'kr',v=>v,'Extensão do reino')));
  } else if(t==='token'){
    tokenPanelBits(m,e).forEach(x=>body.appendChild(x));
  }
  if(t!=='token'||true){
    const nkey='note';
    body.appendChild(h('div',{class:'mp-note'},h('span',{class:'mp-lb'},'Notas'),
      h('textarea',{class:'in',rows:'3',placeholder:'Segredos, detalhes, ganchos…','aria-label':'Notas',onchange:ev=>{ live(null,()=>{ e[nkey]=ev.target.value; }); persistNow(); }},e[nkey]||'')));
  }
  if(e.gen) body.appendChild(h('div',{class:'hint'},'⚙ Gerado automaticamente — ao editar, vira seu (regerar não apaga).'));
  return body;
}
function tokenPanelBits(m,t){
  const cores=['#10b981','#e11d48','#6366f1','#d97706','#e2e8f0','#0ea5e9','#a855f7','#f59e0b'];
  const emojis=['','⚔️','🛡️','🏹','🗡️','🔮','🐺','🐉','🕷️','👹','👑','🎭','🧙','🤖','👽','💀','🔥','❄️'];
  const imgInp=h('input',{type:'file',accept:'image/*',class:'hide',onchange:e=>{ readPhoto(e.target.files[0],data=>{ live(null,()=>{ t.img=data; }); panelRefresh(); }); e.target.value=''; }});
  const hpStep=n=>{ live(null,()=>{ if(t.hp==null) t.hp=t.hpMax||0; t.hp=Math.max(0,(t.hp||0)+n); }); panelRefresh(); };
  const out=[];
  if(t.kind==='player') out.push(h('button',{class:'btn primary sm',onclick:()=>abrirFichaJogador(t.refId)},'👁 Abrir ficha do jogador'));
  out.push(prow('Tamanho',h('div',{class:'seg'},TOKEN_SIZES.map(sz=>h('button',{class:'seg-b'+((t.size||100)===sz.pct?' on':''),onclick:()=>{ live(null,()=>{ t.size=sz.pct; }); panelRefresh(); }},sz.nome)))));
  out.push(prow('Ícone',h('button',{class:'btn sm',onclick:()=>imgInp.click()},'🖼️ Imagem'),imgInp,t.img?h('button',{class:'btn ghost sm',onclick:()=>{ live(null,()=>{ t.img=null; }); panelRefresh(); }},'Remover'):null));
  out.push(h('div',{class:'emoji-pal'},emojis.map(em=>h('button',{class:'emoji-pick'+((t.icon||'')===em?' on':''),title:em||'padrão','aria-label':'Ícone '+(em||'padrão'),onclick:()=>{ live(null,()=>{ t.icon=em; }); panelRefresh(); }},em||'∅'))));
  out.push(prow('Anel',h('div',{class:'mp-sw'},cores.map(cor=>h('button',{class:'map-swatch'+(t.color===cor?' on':''),style:{background:cor},'aria-label':'Cor '+cor,onclick:()=>{ live(null,()=>{ t.color=cor; }); panelRefresh(); }})))));
  out.push(prow('HP',h('button',{class:'btn ghost sm',onclick:()=>hpStep(-1),'aria-label':'Menos 1 de vida'},'−'),
    h('input',{class:'in mp-num',type:'number',value:t.hp==null?'':t.hp,placeholder:'—','aria-label':'Vida atual',onchange:e=>{ const v=e.target.value; live(null,()=>{ t.hp=v===''?null:(parseInt(v)||0); }); panelRefresh(); }}),
    h('button',{class:'btn ghost sm',onclick:()=>hpStep(1),'aria-label':'Mais 1 de vida'},'+'),h('span',{class:'mp-x'},'/'),
    h('input',{class:'in mp-num',type:'number',value:t.hpMax==null?'':t.hpMax,placeholder:'máx','aria-label':'Vida máxima',onchange:e=>{ const v=e.target.value; live(null,()=>{ t.hpMax=v===''?null:(parseInt(v)||0); }); panelRefresh(); }})));
  out.push(prow('Marcas',h('div',{class:'emoji-pal'},TOKEN_MARKS.map(mk=>{ const on=(t.marks||[]).includes(mk);
    return h('button',{class:'emoji-pick'+(on?' on':''),'aria-label':'Marca '+mk,onclick:()=>{ live(null,()=>{ t.marks=t.marks||[]; if(on) t.marks=t.marks.filter(x=>x!==mk); else t.marks.push(mk); }); panelRefresh(); }},mk); }))));
  const ref=tokenRefInfo(t); if(ref) out.push(h('div',{class:'hint'},'Ligado a: '+ref.name+' · duplo clique no mapa abre a ficha'));
  return out;
}
function multiPanel(m,sel){
  const body=h('div',{class:'mp-pbody-in'},
    h('div',{class:'mp-phead'},h('span',{class:'mp-pic'},'▣'),h('strong',{},sel.length+' itens selecionados')),
    actionBar(sel));
  body.appendChild(h('div',{class:'mp-lb'},'Alinhar'));
  body.appendChild(h('div',{class:'mp-acts'},
    ibtn('⇤','Alinhar à esquerda',()=>actAlign('l')),ibtn('↔','Centralizar na horizontal',()=>actAlign('ch')),ibtn('⇥','Alinhar à direita',()=>actAlign('r')),
    ibtn('⤒','Alinhar ao topo',()=>actAlign('t')),ibtn('↕','Centralizar na vertical',()=>actAlign('cv')),ibtn('⤓','Alinhar embaixo',()=>actAlign('b')),
    ibtn('⇹','Distribuir na horizontal',()=>actDistribute('h')),ibtn('⥮','Distribuir na vertical',()=>actDistribute('v'))));
  const objs=sel.filter(x=>x.r.t==='obj'&&x.e.t!=='text'&&x.e.t!=='door');
  if(objs.length){
    body.appendChild(h('div',{class:'mp-lb'},'Aplicar aos '+objs.length+' objetos'));
    body.appendChild(prow('Preencher',h('input',{type:'color',class:'mp-color',value:toHex(objs[0].e.fill||objs[0].e.stroke),'aria-label':'Cor de preenchimento',
      oninput:ev=>live('mfill',()=>objs.forEach(x=>{ if(x.e.t==='path'&&!x.e.closed) x.e.stroke=ev.target.value; else x.e.fill=ev.target.value; })),onchange:()=>panelRefresh()})));
    body.appendChild(prow('Contorno',h('input',{type:'color',class:'mp-color',value:toHex(objs[0].e.stroke||'#222222'),'aria-label':'Cor do contorno',
      oninput:ev=>live('mstroke',()=>objs.forEach(x=>{ x.e.stroke=ev.target.value; })),onchange:()=>panelRefresh()})));
  }
  body.appendChild(h('div',{class:'hint'},'Arraste qualquer item selecionado para mover o conjunto. Setas movem 1 (Shift = grade). Clique no vazio desmarca.'));
  return body;
}
/* --- opções da ferramenta atual (quando nada está selecionado) --- */
function presetBtns(list,tool){
  return h('div',{class:'mp-presets'},list.map(p=>h('button',{class:'mp-preset'+(mpPreset(tool)===p.k?' on':''),title:p.nome,
    onclick:()=>{ setPreset(tool,p.k); }},h('span',{class:'ic'},p.ic),h('span',{class:'lb'},p.nome))));
}
function toolOptions(m){
  const t=mapTool(), o=mpOpt();
  const body=h('div',{class:'mp-pbody-in'});
  const title=(ic,txt)=>h('div',{class:'mp-phead'},h('span',{class:'mp-pic'},ic),h('strong',{},txt));
  const keep=()=>pChk2('Manter a ferramenta ativa',()=>!!o.keep,v=>{ o.keep=v; });
  if(t==='rect'){
    body.appendChild(title('▭','Desenhar sala / forma'));
    body.appendChild(presetBtns(RECT_PRESETS,'rect'));
    body.appendChild(prow('Formato',pSel2([['rect','Retângulo'],['ellipse','Elipse']],()=>o.shape||'rect',v=>{ o.shape=v; })));
    body.appendChild(optStyle(o,false)); body.appendChild(keep());
  } else if(t==='line'){
    body.appendChild(title('〰️','Linha / polilinha')); body.appendChild(presetBtns(LINE_PRESETS,'line'));
    body.appendChild(optStyle(o,true)); body.appendChild(keep());
  } else if(t==='poly'){
    body.appendChild(title('⬠','Região / polígono')); body.appendChild(presetBtns(POLY_PRESETS,'poly'));
    body.appendChild(optStyle(o,false)); body.appendChild(keep());
  } else if(t==='aoe'){
    body.appendChild(title('🔮','Área de magia')); body.appendChild(presetBtns(AOE_PRESETS,'aoe'));
    body.appendChild(prow('Cor',h('input',{type:'color',class:'mp-color',value:toHex(o.color||'#f97316'),'aria-label':'Cor da área',oninput:ev=>{ o.color=ev.target.value; }})));
    body.appendChild(h('div',{class:'hint'},'O círculo usa o raio, o cone abre 53° e a linha tem 1 casa de largura. Vira um objeto editável.'));
  } else if(t==='text'){
    body.appendChild(title('T','Texto'));
    body.appendChild(prow('Tamanho',h('input',{type:'range',min:10,max:80,value:o.tsize||22,'aria-label':'Tamanho do texto',oninput:ev=>{ o.tsize=+ev.target.value; }})));
    body.appendChild(prow('Cor',h('input',{type:'color',class:'mp-color',value:toHex(o.tcolor||'#ffffff'),'aria-label':'Cor do texto',oninput:ev=>{ o.tcolor=ev.target.value; }})));
    body.appendChild(keep());
  } else if(t==='brush'||t==='erase'||t==='bucket'){
    body.appendChild(title(t==='brush'?'🖌️':t==='erase'?'🧽':'🪣',t==='brush'?'Pincel de terreno':t==='erase'?'Borracha':'Balde'));
    if(t!=='erase') body.appendChild(h('div',{class:'mat-pal'},TERRAIN_MATERIALS.map(mm=>
      h('button',{class:'mat-pick'+(brushMat()===mm.k?' on':''),title:mm.nome,style:{'--mc':mm.color},onclick:()=>{ S.ui.brushMat=mm.k; panelRefresh(); }},
        h('span',{class:'mat-sw',style:{background:mm.color}}),h('span',{class:'mat-nm'},mm.ic+' '+mm.nome)))));
    if(t!=='bucket') body.appendChild(prow('Tamanho',pRangeUI(12,160,()=>brushSize(),v=>{ S.ui.brushSize=v; },'Tamanho do pincel')));
    if(t==='bucket') body.appendChild(h('div',{class:'hint'},'Clique num objeto (sala, casa, região…) para pintá-lo com a cor escolhida, ou numa área do terreno para preenchê-la.'));
    body.appendChild(h('div',{class:'mp-acts'},
      m.terrain?h('button',{class:'btn ghost sm',onclick:()=>uiConfirmFn('Apagar TODO o terreno pintado?',()=>{ histPush(); m.terrain=null; terrainReload(m); mapRefresh(); persistNow(); })},'🗑 Limpar terreno'):null,
      m.image?h('button',{class:'btn ghost sm',title:'Transforma o fundo (gerado ou importado) em terreno: aí o pincel e a borracha podem editá-lo',onclick:()=>converterFundo(m)},'🎨 Tornar o fundo pintável'):null));
  } else if(t==='ruler'){
    body.appendChild(title('📏','Régua')); body.appendChild(h('div',{class:'hint'},'Arraste no mapa para medir. A escala vem de Mapa ▸ Escala'+(scaleCfg(m).on?'':' (ligue-a para unidades reais)')+'.'));
  } else if(t==='hand'){
    body.appendChild(title('✋','Mover o mapa')); body.appendChild(h('div',{class:'hint'},'Arraste para mover a vista. Dica: segurar Espaço ou o botão do meio faz o mesmo em qualquer ferramenta.'));
  } else if(t==='stamp'){
    body.appendChild(title('📌','Carimbo: '+stampLabel()));
    body.appendChild(h('div',{class:'hint'},'Clique no mapa para posicionar. Clique em outra peça na paleta, ou Esc, para terminar.'));
  } else {
    body.appendChild(title('🖱️','Selecionar e editar'));
    body.appendChild(h('div',{class:'mp-tips'},
      h('div',{},'• ',h('b',{},'Clique'),' num item para editá-lo aqui.'),
      h('div',{},'• ',h('b',{},'Arraste'),' para mover; use as ',h('b',{},'alças'),' para tamanho e giro.'),
      h('div',{},'• ',h('b',{},'Caixa de seleção'),' no vazio; Shift soma itens.'),
      h('div',{},'• ',h('b',{},'Ctrl+C / V / D'),' copiam e duplicam; ',h('b',{},'Delete'),' exclui.'),
      h('div',{},'• ',h('b',{},'Ctrl+Z'),' desfaz qualquer ação.'),
      h('div',{},'• Aba ',h('b',{},'Objetos'),': lista tudo do mapa (inclusive o gerado).')));
  }
  return body;
}
function pChk2(label,get,set){ return h('label',{class:'chk mp-chk'},h('input',{type:'checkbox',checked:!!get(),onchange:e=>set(e.target.checked)}),' '+label); }
function pSel2(opts,get,set){ return h('select',{class:'in mp-sel',onchange:e=>{ set(e.target.value); }},opts.map(([v,t])=>h('option',{value:v,selected:get()===v},t))); }
function pRangeUI(min,max,get,set,label){
  const val=h('span',{class:'mp-val'},String(get()));
  return h('div',{class:'mp-rng'},h('input',{type:'range',min,max,value:get(),'aria-label':label,oninput:e=>{ set(+e.target.value); val.textContent=e.target.value; }}),val);
}
function optStyle(o,isLine){
  const m=curMap(), role=mpPreset(isLine?'line':(mapTool()==='poly'?'poly':'rect')), st=roleStyle(role,m);
  const def=isLine?st.stroke:st.fill;
  return h('div',{},
    prow(isLine?'Cor':'Preenchimento',h('input',{type:'color',class:'mp-color',value:toHex(o.color||def||'#888888'),'aria-label':'Cor',oninput:ev=>{ o.color=ev.target.value; }}),
      h('button',{class:'btn sm ghost',onclick:()=>{ o.color=null; panelRefresh(); }},'padrão')),
    prow('Espessura',pRangeUI(1,50,()=>o.sw||st.sw||3,v=>{ o.sw=v; },'Espessura')),
    isLine?prow('Estilo',pSel2([['solid','Sólida'],['dash','Tracejada'],['dot','Pontilhada']],()=>o.dash||st.dash||'solid',v=>{ o.dash=v; })):null);
}
function uiConfirmFn(msg,ok){
  if(typeof uiConfirm==='function'){
    try{ const r=uiConfirm(msg,{titulo:'Confirmar',perigo:true}); if(r&&typeof r.then==='function'){ r.then(v=>{ if(v) ok(); }); return; } if(r===true) ok(); return; }catch(e){}
  }
  if(confirm(msg)) ok();
}
/* --- Lista de objetos (tudo editável do mapa) --- */
function objectsList(m){
  const ents=allEnts(m);
  const body=h('div',{class:'mp-pbody-in'});
  if(!ents.length){ body.appendChild(h('div',{class:'hint'},'O mapa ainda não tem objetos. Gere um mapa ou desenhe com as ferramentas à esquerda.')); return body; }
  const cats={}; ents.forEach(x=>{ const c=entInfo(x.t,x.e).cat; (cats[c]=cats[c]||[]).push(x); });
  const open=S.ui.mpCats||(S.ui.mpCats={});
  const selSet=new Set(selRefs().map(r=>r.t+':'+r.id));
  Object.keys(cats).forEach(c=>{
    const list=cats[c].slice().reverse();
    const isOpen=open[c]!==undefined?open[c]:list.length<=14;
    body.appendChild(h('div',{class:'mp-cat'},
      h('button',{class:'mp-cat-t','aria-expanded':String(isOpen),onclick:()=>{ open[c]=!isOpen; panelRefresh(); }},(isOpen?'▾ ':'▸ ')+c,h('span',{class:'n'},list.length)),
      h('button',{class:'mp-ib sm',title:'Selecionar todos de "'+c+'"','aria-label':'Selecionar todos de '+c,onclick:()=>actSelectCat(c,false)},'⛶')));
    if(isOpen) list.forEach(x=>{
      const inf=entInfo(x.t,x.e);
      body.appendChild(h('div',{class:'mp-li'+(selSet.has(x.t+':'+x.e.id)?' on':'')+(x.e.hidden?' dim':''),
        onclick:ev=>{ const ref={t:x.t,id:x.e.id}; setSel((ev.shiftKey||ev.ctrlKey)?selRefs().concat([ref]):[ref]); }},
        h('span',{class:'ic'},inf.ic),h('span',{class:'nm'},inf.nome+(x.e.gen?' ·⚙':'')),
        h('button',{class:'mp-ib sm',title:x.e.hidden?'Mostrar':'Ocultar','aria-label':x.e.hidden?'Mostrar':'Ocultar',onclick:ev=>{ ev.stopPropagation(); histPush(); x.e.hidden=!x.e.hidden; mapRefresh(); panelRefresh(); persistSoon(); }},x.e.hidden?'🙈':'👁'),
        h('button',{class:'mp-ib sm',title:x.e.locked?'Destravar':'Travar','aria-label':x.e.locked?'Destravar':'Travar',onclick:ev=>{ ev.stopPropagation(); histPush(); x.e.locked=!x.e.locked; mapRefresh(); panelRefresh(); persistSoon(); }},x.e.locked?'🔒':'🔓')));
    });
  });
  return body;
}

/* ============================ TECLADO ============================ */
document.addEventListener('keydown',e=>{
  if(!MP.ws||!document.body.contains(MP.ws)) return;
  if(document.querySelector('[aria-modal="true"]')) return;   /* diálogo aberto: não rouba as teclas */
  const t=e.target; if(t&&((t.matches&&t.matches('input,textarea,select'))||t.isContentEditable)) return;
  const m=curMap(); if(!m) return;
  const k=e.key, kl=k.toLowerCase(), mod=e.ctrlKey||e.metaKey;
  if(k===' '){ if(t&&t.closest&&t.closest('button,a,summary,[role="button"]')) return; e.preventDefault(); S.ui.spaceDown=true; MP.vp.classList.add('pan-ready'); return; }
  if(mod&&kl==='z'){ e.preventDefault(); e.shiftKey?mapRedo():mapUndo(); return; }
  if(mod&&kl==='y'){ e.preventDefault(); mapRedo(); return; }
  if(mod&&kl==='c'){ e.preventDefault(); actCopy(); return; }
  if(mod&&kl==='x'){ e.preventDefault(); actCopy(); actDelete(); return; }
  if(mod&&kl==='v'){ e.preventDefault(); actPaste(); return; }
  if(mod&&kl==='d'){ e.preventDefault(); actDuplicate(); return; }
  if(mod&&kl==='a'){ e.preventDefault(); actSelectAll(); return; }
  if(mod&&kl==='g'){ e.preventDefault(); actGroup(!e.shiftKey); return; }
  if(mod&&k===']'){ e.preventDefault(); actZ('front'); return; }
  if(mod&&k==='['){ e.preventDefault(); actZ('back'); return; }
  if(mod||e.altKey) return;
  if(k==='Escape'){
    if(S.ui.draft){ cancelDraft(); return; }
    if(S.ui.ruler){ S.ui.ruler=null; paintOverlay(); return; }
    if(S.ui.mpPop){ S.ui.mpPop=null; render(); return; }
    if(mapTool()!=='select'){ setTool('select'); return; }
    if(selRefs().length) setSel([]); return;
  }
  if(k==='Enter'){ if(S.ui.draft){ e.preventDefault(); finishDraft(); } return; }
  if(k==='Backspace'&&S.ui.draft){ e.preventDefault(); undoDraftPoint(); return; }
  if(k==='Delete'||k==='Backspace'){ if(selRefs().length){ e.preventDefault(); actDelete(); } return; }
  const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[k];
  if(arrows && selRefs().length){ e.preventDefault(); const st=e.shiftKey?(m.grid&&m.grid.on?m.grid.size:10):1; actNudge(arrows[0]*st,arrows[1]*st); return; }
  const tool={v:'select',h:'hand',b:'brush',e:'erase',g:'bucket',r:'rect',l:'line',p:'poly',t:'text',m:'ruler',a:'aoe'}[kl];
  if(tool){ setTool(tool); return; }
  if(k==='['){ S.ui.brushSize=Math.max(12,brushSize()-8); panelRefresh(); return; }
  if(k===']'){ S.ui.brushSize=Math.min(160,brushSize()+8); panelRefresh(); return; }
  if(k==='+'||k==='='){ zoomPara(1.25); return; }
  if(k==='-'){ zoomPara(1/1.25); return; }
  if(k==='0'||kl==='f'){ ajustaVista(); return; }
});
document.addEventListener('keyup',e=>{ if(e.key===' '){ S.ui.spaceDown=false; if(MP.vp) MP.vp.classList.remove('pan-ready'); } });
document.addEventListener('pointermove',onDocMove);
document.addEventListener('pointerup',onDocUp);
document.addEventListener('pointercancel',onDocUp);
