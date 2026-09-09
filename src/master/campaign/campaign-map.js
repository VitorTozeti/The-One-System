/* ============================================================ CAMPANHA — MAPA ============================================================
   Editor de mapas com FERRAMENTAS (como um mini-Paint de RPG):
     🖱️ Selecionar  — mover/editar peças, tokens, reinos e pins (arrasta).
     🖌️ Pincel      — PINTA terreno orgânico (grama, água, pedra, lava…): bolhas
                       com ruído/textura que se conectam sozinhas (não fica reto).
     🧽 Borracha    — apaga terreno.
     📌 Carimbo     — arma uma peça/token/pin e você CLICA no mapa para posicionar
                       exatamente onde quer (coloca vários seguidos).
   Dois construtores conforme o tipo: TÁTICO (paredes/vegetação/armadilhas/objetos)
   e MUNDO (contorno do continente, reinos, pontos de interesse). Molduras de era
   por clima visual. Posições em % para escalar junto com a imagem/terreno. */

/* ---------- Utilidades de imagem ---------- */
function readMapImage(file, cb){
  if(!file) return;
  if(!/^image\//.test(file.type)) return alert('Selecione um arquivo de imagem.');
  const rd=new FileReader();
  rd.onerror=()=>alert('Não foi possível ler o arquivo.');
  rd.onload=()=>{ const img=new Image();
    img.onerror=()=>alert('Imagem inválida.');
    img.onload=()=>{ const MAX=1400, sc=Math.min(1,MAX/Math.max(img.width,img.height));
      const c=document.createElement('canvas'); c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height); cb(c.toDataURL('image/jpeg',0.8)); };
    img.src=rd.result; };
  rd.readAsDataURL(file);
}

function mapKindMeta(k){ return MAP_KINDS.find(x=>x.k===k)||MAP_KINDS[1]; }
function mapThemeMeta(k){ return MAP_THEMES.find(x=>x.k===k)||MAP_THEMES[0]; }
function limpaSel(){ S.ui.tokenSel=null; S.ui.pinSel=null; S.ui.propSel=null; S.ui.kingSel=null; }
/* ferramenta atual e opções de pincel/carimbo (default seguro) */
function mapTool(){ return S.ui.mapTool||'select'; }
function setTool(t){ S.ui.mapTool=t; if(t!=='stamp') S.ui.stamp=null; if(t!=='select') limpaSel(); render(); }
function brushMat(){ return S.ui.brushMat||'grama'; }
function brushSize(){ return S.ui.brushSize||42; }

/* ---------- Criação de mapa ---------- */
function criarMapa(){
  const d=S.ui.mapDraft||{name:'',kind:'regiao',theme:'rustico'};
  const c=S.campaign;
  const m=newMap(d.kind,d.theme,d.name.trim()||('Novo '+mapKindMeta(d.kind).nome.toLowerCase()));
  c.maps.push(m); c.currentMapId=m.id;
  S.ui.novoMapa=false; S.ui.mapDraft=null; limpaSel(); S.ui.mapTool='select';
  render();
}
function formNovoMapa(){
  if(!S.ui.mapDraft) S.ui.mapDraft={name:'',kind:'regiao',theme:'rustico'};
  const d=S.ui.mapDraft;
  const kinds=h('div',{class:'map-opts'}, MAP_KINDS.map(t=>
    h('button',{class:'map-opt'+(d.kind===t.k?' on':''), onclick:()=>{d.kind=t.k;render();}},
      h('span',{class:'map-opt-ic'},t.ic), t.nome)));
  const themes=h('div',{class:'map-opts'}, MAP_THEMES.map(t=>
    h('button',{class:'map-opt theme '+t.k+(d.theme===t.k?' on':''), onclick:()=>{d.theme=t.k;render();}},
      h('span',{class:'map-opt-ic'},t.ic), t.nome)));
  const dica=isWorldKind(d.kind)
    ? 'Mapa de mundo: contorno do continente, reinos e pontos de interesse.'
    : 'Mapa tático: pinte o terreno com o pincel e carimbe paredes, vegetação e armadilhas.';
  return card('Novo mapa','Escolha o tipo e a era visual. Depois pinte o terreno ou envie uma imagem de fundo.',
    h('button',{class:'btn ghost sm', onclick:()=>{S.ui.novoMapa=false;render();}},'Cancelar'),
    field('Nome', h('input',{class:'in', value:d.name, placeholder:'ex.: Reino de Valdrin, Taverna do Corvo…',
      onchange:e=>{d.name=e.target.value;}, onkeydown:e=>{ if(e.key==='Enter') criarMapa(); }})),
    field('Tipo de mapa', kinds),
    field('Era / clima visual', themes),
    h('div',{class:'hint'}, dica),
    h('button',{class:'btn primary', onclick:criarMapa}, '➕ Criar mapa'));
}

/* ---------- Seletor de mapas ---------- */
function mapSelector(){
  const c=S.campaign;
  const chips=c.maps.map(m=>{
    const km=mapKindMeta(m.kind);
    return h('button',{class:'map-chip'+(c.currentMapId===m.id?' on':''),
      onclick:()=>{c.currentMapId=m.id;limpaSel();S.ui.mapTool='select';render();}},
      h('span',{class:'map-chip-ic'},km.ic), h('span',{class:'map-chip-nm'},m.name),
      h('span',{class:'map-chip-k'},km.nome));
  });
  return h('div',{class:'map-selector'}, ...chips,
    h('button',{class:'map-chip add', onclick:()=>{S.ui.novoMapa=true;render();}},'➕ Novo mapa'));
}

function mapaView(){
  const c=S.campaign;
  if(!Array.isArray(c.maps)) c.maps=[];

  if(!c.maps.length){
    return h('div',{},
      card('Mapas da campanha','Crie mapas do mundo, de regiões, cidades, interiores e masmorras.',null,
        h('div',{class:'hint'},'Você ainda não tem mapas.')),
      formNovoMapa());
  }
  if(S.ui.novoMapa) return h('div',{}, mapSelector(), formNovoMapa());

  const m=curMap();
  const km=mapKindMeta(m.kind), tm=mapThemeMeta(m.theme);
  const world=isWorldKind(m.kind);

  /* Cabeçalho: nome + tipo + era + excluir */
  const kindsSel=h('div',{class:'map-opts sm'}, MAP_KINDS.map(t=>
    h('button',{class:'map-opt sm'+(m.kind===t.k?' on':''), title:t.nome, onclick:()=>{m.kind=t.k;limpaSel();render();}}, t.ic)));
  const themeSel=h('div',{class:'map-opts sm'}, MAP_THEMES.map(t=>
    h('button',{class:'map-opt theme sm '+t.k+(m.theme===t.k?' on':''), title:t.nome, onclick:()=>{m.theme=t.k;render();}}, t.ic)));
  const cab=card('⚙️ Configurar mapa',null,
    h('button',{class:'btn danger sm', onclick:()=>{ if(confirm('Excluir o mapa "'+m.name+'"?')){ c.maps=c.maps.filter(x=>x.id!==m.id); c.currentMapId=c.maps[0]?c.maps[0].id:null; limpaSel(); render(); } }},'🗑 Excluir mapa'),
    field('Nome do mapa', h('input',{class:'in', value:m.name, onchange:e=>{m.name=e.target.value;render();}})),
    h('div',{class:'row wrapf', style:{gap:'18px'}},
      field('Tipo', kindsSel), field('Era / clima', themeSel)));

  /* Barra de ferramentas: fundo + grade + rótulos */
  const imgInp=h('input',{type:'file', accept:'image/*', class:'hide',
    onchange:e=>{ readMapImage(e.target.files[0], data=>{ m.image=data; render(); }); e.target.value=''; }});
  const toolbar=h('div',{class:'row wrapf', style:{marginBottom:'10px'}},
    h('button',{class:'btn', onclick:()=>imgInp.click()}, m.image?'🖼️ Trocar fundo':'🖼️ Imagem de fundo'), imgInp,
    m.image?h('button',{class:'btn ghost', onclick:()=>{if(confirm('Remover a imagem de fundo?')){m.image=null;render();}}},'Remover fundo'):null,
    h('label',{class:'chk'}, h('input',{type:'checkbox', checked:m.grid.on, onchange:e=>{m.grid.on=e.target.checked;render();}}),' Grade'),
    m.grid.on?field('Célula', h('input',{class:'in', type:'number', style:{width:'64px'}, value:m.grid.size,
      onchange:e=>{m.grid.size=Math.max(12,parseInt(e.target.value)||48);render();}})):null,
    m.grid.on?h('label',{class:'chk'}, h('input',{type:'checkbox', checked:!!m.grid.snap, onchange:e=>{m.grid.snap=e.target.checked;render();}}),' Encaixar'):null,
    h('label',{class:'chk'}, h('input',{type:'checkbox', checked:m.showLabels!==false, onchange:e=>{m.showLabels=e.target.checked;render();}}),' Nomes'));

  /* Barra de FERRAMENTAS (selecionar / pincel / borracha) + opções contextuais */
  const ferramentas=mapToolbar(m, world);

  /* Paletas de construção (dependem do tipo) */
  const paletas = world ? construtorMundo(m) : construtorTatico(m);

  /* Tokens de criatura (carimbo) */
  const criaturas=h('div',{class:'row wrapf', style:{marginBottom:'12px'}},
    h('span',{class:'hint'},'Colocar token:'),
    ...c.players.map(p=>tokenPickBtn('player',p.name,p.id,'#10b981','🧍')),
    ...c.bestiary.enemies.map(sb=>tokenPickBtn('enemy',sb.name,sb.id,'#e11d48','🐉')),
    ...c.bestiary.npcs.map(np=>tokenPickBtn('npc',np.name,np.id,'#6366f1','🎭')),
    h('button',{class:'btn sm ghost', onclick:()=>armarStamp({t:'token',kind:'npc',label:'?',refId:null})},'+ genérico'));

  /* ---- Área do mapa ---- */
  const painting = mapTool()!=='select';
  const area=h('div',{class:'map-area map-theme-'+m.theme+(painting?' painting':'')+(m.showLabels===false?' no-labels':'')});
  if(m.image){ area.style.background='#0e1424 url('+m.image+') center/cover no-repeat'; }
  /* 1) Terreno pintado (canvas persistente) */
  area.appendChild(terrainCanvasFor(m));
  /* 2) Continente (mundo) */
  if(world){ const cont=continentLayer(m); if(cont) area.appendChild(cont); }
  /* 3) Grade */
  if(m.grid.on) area.appendChild(h('div',{class:'map-grid-ov', style:{backgroundSize:m.grid.size+'px '+m.grid.size+'px'}}));
  /* 4) Reinos → peças → pins → tokens */
  if(world) (m.world.kingdoms||[]).forEach(k=>area.appendChild(kingdomEl(area,k)));
  (m.props||[]).forEach(p=>area.appendChild(propEl(area,p)));
  m.pins.forEach(p=>area.appendChild(pinEl(area, p)));
  m.tokens.forEach(t=>area.appendChild(tokenEl(area, t)));
  /* 5) Moldura decorativa da era */
  area.appendChild(h('div',{class:'map-frame frame-'+m.theme}));
  /* Cliques no vazio da área: carimbar ou desmarcar (o terreno-canvas captura) */
  area.addEventListener('pointerdown', ev=>{ if(ev.target!==area) return; onAreaEmpty(area,ev,m); });

  if(!m.image && !m.terrain && !(m.props||[]).length && !m.tokens.length && !world)
    area.appendChild(h('div',{class:'map-empty'},
      (km.ic+' '+m.name)+' — pinte o terreno com o 🖌️ pincel ou carimbe peças. Ou envie uma imagem de fundo.'));

  const sel = S.ui.propSel ? propToolbar()
            : S.ui.kingSel ? kingdomToolbar()
            : S.ui.pinSel ? pinToolbar()
            : S.ui.tokenSel ? tokenToolbar() : null;

  return h('div',{},
    mapSelector(),
    cab,
    card('Editar mapa', (km.ic+' '+km.nome+' · '+tm.ic+' '+tm.nome), null,
      toolbar, ferramentas, paletas, criaturas, sel, area),
    field('Anotações do mapa', h('textarea',{class:'in', rows:'2', placeholder:'Segredos, rotas, encontros…',
      onchange:e=>{m.note=e.target.value;render();}}, m.note||'')));
}

/* ============================ FERRAMENTAS ============================ */
function mapToolbar(m, world){
  const btn=(t,ic,lbl,tip)=>h('button',{class:'tool-btn'+(mapTool()===t?' on':''), title:tip, onclick:()=>setTool(t)},
    h('span',{class:'tool-ic'},ic), h('span',{class:'tool-lbl'},lbl));
  const tools=h('div',{class:'tool-bar'},
    btn('select','🖱️','Selecionar','Mover e editar peças/tokens'),
    btn('brush','🖌️','Pincel','Pintar terreno orgânico'),
    btn('erase','🧽','Borracha','Apagar terreno'),
    S.ui.stamp?h('span',{class:'tool-armed'},'📌 Carimbo armado: '+stampLabel()+' — clique no mapa'):null);

  /* Opções contextuais do pincel/borracha */
  let opts=null;
  if(mapTool()==='brush' || mapTool()==='erase'){
    const mats = mapTool()==='brush' ? h('div',{class:'mat-pal'}, TERRAIN_MATERIALS.map(mm=>
      h('button',{class:'mat-pick'+(brushMat()===mm.k?' on':''), title:mm.nome, style:{'--mc':mm.color},
        onclick:()=>{S.ui.brushMat=mm.k;render();}},
        h('span',{class:'mat-sw', style:{background:mm.color}}), h('span',{class:'mat-nm'}, mm.ic+' '+mm.nome)))) : null;
    opts=h('div',{class:'tool-opts'},
      field('Tamanho do pincel', h('input',{type:'range', min:'12', max:'160', value:brushSize(),
        oninput:e=>{S.ui.brushSize=parseInt(e.target.value)||42; const d=document.getElementById('brush-nm'); if(d)d.textContent=(S.ui.brushSize)+'px';}})),
      h('span',{id:'brush-nm', class:'hint'}, brushSize()+'px'),
      mats,
      m.terrain?h('button',{class:'btn ghost sm', onclick:()=>{ if(confirm('Apagar TODO o terreno pintado?')){ m.terrain=null; terrainReset(); render(); } }},'🗑 Limpar terreno'):null);
  }
  return h('div',{class:'tool-wrap'}, tools, opts);
}
function stampLabel(){
  const s=S.ui.stamp; if(!s) return '';
  if(s.t==='prop'){ const it=propMeta(s.k); return it?(it.ic+' '+it.nome):'peça'; }
  if(s.t==='pin') return (s.ic||'📍')+' local';
  if(s.t==='kingdom') return '🏴 reino';
  if(s.t==='token') return (s.kind==='player'?'🧍':s.kind==='enemy'?'🐉':'🎭')+' '+(s.label||'token');
  return 'peça';
}
function armarStamp(stamp){ S.ui.stamp=stamp; S.ui.mapTool='stamp'; render(); }
function tokenPickBtn(kind,label,refId,cor,ic){
  const armed=S.ui.stamp&&S.ui.stamp.t==='token'&&S.ui.stamp.refId===refId&&S.ui.stamp.kind===kind;
  return h('button',{class:'btn sm'+(armed?' armed':''), style:{borderLeft:'3px solid '+cor},
    onclick:()=>armarStamp({t:'token',kind,label,refId})}, ic+' '+label);
}

/* Clique no VAZIO da área (fora de qualquer peça). */
function onAreaEmpty(area, ev, m){
  const t=mapTool();
  if(t==='stamp'){ const p=pctFromEvent(area,ev); colocarStamp(m,p.x,p.y); }
  else if(t==='select'){ if(S.ui.tokenSel||S.ui.pinSel||S.ui.propSel||S.ui.kingSel){ limpaSel(); render(); } }
  /* brush/erase são tratados pelo canvas de terreno */
}
/* Posiciona o item armado no ponto clicado (e mantém o carimbo armado). */
function colocarStamp(m, x, y){
  const s=S.ui.stamp; if(!s) return;
  x=snapPctX(m,x); y=snapPctY(m,y);
  if(s.t==='prop'){ const p=newProp(s.k,x,y); m.props.push(p); limpaSel(); S.ui.propSel=p.id; }
  else if(s.t==='pin'){ const p=newPin(x,y,s.ic); m.pins.push(p); limpaSel(); S.ui.pinSel=p.id; }
  else if(s.t==='kingdom'){ const k=newKingdom(x,y); m.world.kingdoms.push(k); limpaSel(); S.ui.kingSel=k.id; }
  else if(s.t==='token'){ const tk=newToken(s.kind,s.label,s.refId); tk.xPct=x; tk.yPct=y;
    autoNumber(m,tk); m.tokens.push(tk); limpaSel(); S.ui.tokenSel=tk.id; }
  render();
}
/* Numera duplicatas: 2º Goblin vira "Goblin 2". */
function autoNumber(m, tk){
  const base=tk.label.replace(/\s+\d+$/,'');
  const n=m.tokens.filter(x=>x.kind===tk.kind && x.refId===tk.refId).length;
  if(n>=1) tk.label=base+' '+(n+1);
}

/* ---------- Construtor TÁTICO ---------- */
function construtorTatico(m){
  const grupos=PROP_CATALOG.map(g=>h('div',{class:'prop-group'},
    h('div',{class:'prop-group-t', style:{color:g.cor}}, g.cat),
    h('div',{class:'prop-pal'}, g.itens.map(it=>{
      const armed=S.ui.stamp&&S.ui.stamp.t==='prop'&&S.ui.stamp.k===it.k;
      return h('button',{class:'prop-pick'+(it.shape==='block'?' block':'')+(armed?' armed':''), title:'Carimbar '+it.nome,
        onclick:()=>armarStamp({t:'prop',k:it.k})},
        h('span',{class:'prop-pick-ic'},it.ic), h('span',{class:'prop-pick-l'},it.nome));
    }))));
  const pins=h('div',{class:'row wrapf', style:{marginTop:'6px'}},
    h('span',{class:'hint'},'Marcador de local:'),
    ...PIN_ICONS.slice(0,12).map(ic=>{
      const armed=S.ui.stamp&&S.ui.stamp.t==='pin'&&S.ui.stamp.ic===ic;
      return h('button',{class:'pin-pick'+(armed?' on':''), title:'Carimbar '+ic, onclick:()=>armarStamp({t:'pin',ic})}, ic);
    }));
  return h('div',{class:'construtor'},
    h('div',{class:'hint', style:{marginBottom:'6px'}},'🧱 Escolha uma peça e clique no mapa para posicionar (📌 carimbo). Segure e arraste para reposicionar depois.'),
    h('div',{class:'prop-groups'}, ...grupos), pins);
}

/* ---------- Construtor de MUNDO ---------- */
function construtorMundo(m){
  const w=m.world.continent;
  const shapes=h('div',{class:'map-opts sm'}, WORLD_SHAPES.map(s=>
    h('button',{class:'map-opt sm'+(w.shape===s.k?' on':''), title:s.nome,
      onclick:()=>{w.shape=s.k;render();}}, s.nome)));
  const contRow=h('div',{class:'row wrapf', style:{gap:'14px', alignItems:'flex-end'}},
    field('Contorno do continente', shapes),
    field('Cor da terra', h('input',{type:'color', class:'in color', value:w.color, onchange:e=>{w.color=e.target.value;render();}})),
    w.shape!=='none'?field('Girar', h('input',{type:'range', min:'0', max:'360', value:w.rot,
      oninput:e=>{w.rot=parseInt(e.target.value)||0;render();}})):null,
    w.shape!=='none'?field('Tamanho', h('input',{type:'range', min:'50', max:'100', value:w.scale,
      oninput:e=>{w.scale=parseInt(e.target.value)||100;render();}})):null);
  const kingArmed=S.ui.stamp&&S.ui.stamp.t==='kingdom';
  const acoes=h('div',{class:'row wrapf', style:{marginTop:'8px'}},
    h('button',{class:'btn sm'+(kingArmed?' armed':''), style:{borderLeft:'3px solid #e11d48'},
      onclick:()=>armarStamp({t:'kingdom'})},'🏴 Carimbar reino'),
    h('span',{class:'hint'},'Ponto de interesse:'),
    ...PIN_ICONS.map(ic=>{
      const armed=S.ui.stamp&&S.ui.stamp.t==='pin'&&S.ui.stamp.ic===ic;
      return h('button',{class:'pin-pick'+(armed?' on':''), title:'Carimbar '+ic, onclick:()=>armarStamp({t:'pin',ic})}, ic);
    }));
  return h('div',{class:'construtor'},
    h('div',{class:'hint', style:{marginBottom:'6px'}},'🌍 Formato do continente + reinos e locais (clique no mapa para posicionar).'),
    contRow, acoes);
}
function continentLayer(m){
  const w=m.world.continent; const meta=worldShapeMeta(w.shape);
  if(!meta.poly) return null;
  const el=h('div',{class:'map-continent'});
  el.style.background=w.color;
  el.style.clipPath='polygon('+meta.poly+')';
  el.style.webkitClipPath='polygon('+meta.poly+')';
  const s=(w.scale||100)/100;
  el.style.transform='rotate('+(w.rot||0)+'deg) scale('+s+')';
  return el;
}

/* ============================ TERRENO (PINCEL) ============================
   Canvas raster persistente por mapa (fonte da verdade em memória: _terr.cv).
   Pintamos bolhas "lumpy" com textura de ruído — elas se unem e ficam orgânicas. */
let _terr={id:null, cv:null};
let _noiseTile=null;
function noiseTile(){
  if(_noiseTile) return _noiseTile;
  const n=document.createElement('canvas'); n.width=n.height=150;
  const ctx=n.getContext('2d'); const im=ctx.createImageData(150,150);
  for(let i=0;i<im.data.length;i+=4){ const v=170+((Math.random()*85)|0);
    im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; }
  ctx.putImageData(im,0,0); _noiseTile=n; return n;
}
function terrainReset(){ _terr={id:null, cv:null}; }
/* Caminho de círculo "lumpy" (borda ondulada, suavizada por curvas). */
function lumpPath(x,y,r){
  const N=16, pts=[];
  for(let i=0;i<N;i++){ const a=i/N*Math.PI*2, rr=r*(0.80+Math.random()*0.34);
    pts.push([x+Math.cos(a)*rr, y+Math.sin(a)*rr]); }
  const p=new Path2D();
  const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  let m0=mid(pts[N-1],pts[0]); p.moveTo(m0[0],m0[1]);
  for(let i=0;i<N;i++){ const cur=pts[i], nx=pts[(i+1)%N], mm=mid(cur,nx); p.quadraticCurveTo(cur[0],cur[1],mm[0],mm[1]); }
  p.closePath(); return p;
}
/* Carimba UMA bolha de terreno (ou apaga). */
function stampTerrain(ctx, x, y, r, mat, erase){
  const p=lumpPath(x,y,r);
  ctx.save();
  if(erase){ ctx.globalCompositeOperation='destination-out'; ctx.fill(p); ctx.restore(); return; }
  ctx.fillStyle=mat.color; ctx.fill(p);
  ctx.clip(p);
  /* manchas mais escuras para dar volume */
  ctx.globalAlpha=0.45; ctx.fillStyle=mat.color2;
  for(let i=0;i<3;i++){ ctx.fill(lumpPath(x+(Math.random()-0.5)*r, y+(Math.random()-0.5)*r, r*(0.3+Math.random()*0.4))); }
  /* granulado (ruído) por cima */
  ctx.globalAlpha=0.16; ctx.globalCompositeOperation='overlay';
  const t=noiseTile(), ox=x-r-(Math.random()*40), oy=y-r-(Math.random()*40);
  for(let gx=ox; gx<x+r; gx+=t.width) for(let gy=oy; gy<y+r; gy+=t.height) ctx.drawImage(t,gx,gy);
  ctx.restore();
}
/* Devolve (criando/migrando) o canvas de terreno do mapa m, já com listeners. */
function terrainCanvasFor(m){
  if(_terr.id===m.id && _terr.cv){ estilizaTerreno(_terr.cv); return _terr.cv; }
  const cv=document.createElement('canvas'); cv.width=TERRAIN_W; cv.height=TERRAIN_H;
  _terr={id:m.id, cv};
  if(m.terrain){ const img=new Image(); img.onload=()=>{ try{ cv.getContext('2d').drawImage(img,0,0,TERRAIN_W,TERRAIN_H); }catch(e){} }; img.src=m.terrain; }
  ligaPincel(cv);
  estilizaTerreno(cv);
  return cv;
}
function estilizaTerreno(cv){
  cv.className='map-terrain';
  cv.style.cursor=(mapTool()==='brush'||mapTool()==='erase')?'crosshair':'default';
}
function ligaPincel(cv){
  const toCanvas=e=>{ const r=cv.getBoundingClientRect();
    return { x:(e.clientX-r.left)/r.width*TERRAIN_W, y:(e.clientY-r.top)/r.height*TERRAIN_H }; };
  cv.addEventListener('pointerdown', ev=>{
    const tool=mapTool();
    if(tool!=='brush' && tool!=='erase'){
      /* select/stamp: o canvas é o "vazio" do mapa — carimba ou desmarca */
      const area=cv.parentElement, m2=curMap();
      if(area&&m2) onAreaEmpty(area, ev, m2);
      return;
    }
    ev.preventDefault(); ev.stopPropagation();
    const m=curMap(); if(!m) return;
    const ctx=cv.getContext('2d');
    const rBase=()=> brushSize()*(TERRAIN_W/1000) ;   /* pincel em px de canvas */
    const mat=terrainMatMeta(brushMat());
    let last=null;
    const paint=e=>{
      const pt=toCanvas(e); const r=rBase();
      if(!last){ stampTerrain(ctx,pt.x,pt.y,r*(0.9+Math.random()*0.2),mat,tool==='erase'); last=pt; return; }
      const dx=pt.x-last.x, dy=pt.y-last.y, dist=Math.hypot(dx,dy), step=Math.max(4,r*0.45);
      for(let d=step; d<=dist; d+=step){ const t=d/dist;
        stampTerrain(ctx, last.x+dx*t, last.y+dy*t, r*(0.85+Math.random()*0.3), mat, tool==='erase'); }
      last=pt;
    };
    paint(ev);
    const up=()=>{ document.removeEventListener('pointermove',paint); document.removeEventListener('pointerup',up);
      try{ m.terrain=cv.toDataURL('image/png'); }catch(e){} if(typeof persist==='function') persist(); };
    document.addEventListener('pointermove',paint); document.addEventListener('pointerup',up);
  });
}

/* ---------- Snap à grade (em %) ---------- */
function snapPctX(m,x){ if(!(m.grid&&m.grid.on&&m.grid.snap)) return x; const cell=m.grid.size/TERRAIN_W*100; return cell>0?Math.round(x/cell)*cell:x; }
function snapPctY(m,y){ if(!(m.grid&&m.grid.on&&m.grid.snap)) return y; const cell=m.grid.size/TERRAIN_H*100; return cell>0?Math.round(y/cell)*cell:y; }

function pctFromEvent(area, ev){
  const r=area.getBoundingClientRect();
  return { x:Math.max(0,Math.min(100,((ev.clientX-r.left)/r.width)*100)),
           y:Math.max(0,Math.min(100,((ev.clientY-r.top)/r.height)*100)) };
}
/* Arrasto de peças (respeita snap; desativado quando um pincel está ativo). */
function dragMovable(area, el, obj, onClick){
  el.addEventListener('pointerdown',ev=>{
    if(mapTool()==='brush'||mapTool()==='erase') return;   /* pintando: ignora peças */
    ev.preventDefault(); ev.stopPropagation();
    const m=curMap();
    let moveu=false;
    const move=e=>{ const p=pctFromEvent(area,e); obj.xPct=snapPctX(m,p.x); obj.yPct=snapPctY(m,p.y); moveu=true;
      el.style.left=obj.xPct+'%'; el.style.top=obj.yPct+'%'; };
    const up=e=>{ document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up);
      if(moveu) render(); else if(onClick) onClick(); };
    document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
  });
}

/* ============================ TOKENS ============================ */
function tokenRefInfo(t){
  const c=S.campaign; if(!c||!t.refId) return null;
  if(t.kind==='player'){ const p=(c.players||[]).find(x=>x.id===t.refId); return p?{name:p.name, img:(p.sheet&&p.sheet.photo)||null}:null; }
  if(t.kind==='enemy'){ const s=(c.bestiary.enemies||[]).find(x=>x.id===t.refId); return s?{name:s.name, img:s.image||null}:null; }
  if(t.kind==='npc'){ const n=(c.bestiary.npcs||[]).find(x=>x.id===t.refId); return n?{name:n.name, img:n.image||null}:null; }
  return null;
}
function kindEmoji(k){ return {player:'🧍', enemy:'🐉', npc:'🎭'}[k]||'❔'; }
function tokenEl(area, t){
  const ref=tokenRefInfo(t);
  const px=Math.round(34*(t.size||100)/100);
  const el=h('div',{class:'map-token kind-'+t.kind+(S.ui.tokenSel===t.id?' sel':'')+(t.hidden?' hidden':''),
    style:{left:t.xPct+'%', top:t.yPct+'%', width:px+'px', height:px+'px'},
    title:(ref&&ref.name)||t.label});
  const img = t.img || (ref&&ref.img) || null;
  const inner = img
    ? h('div',{class:'map-token-face', style:{backgroundImage:'url('+img+')'}})
    : h('div',{class:'map-token-face glyph', style:{fontSize:Math.round(px*0.5)+'px'}},
        (t.icon&&t.icon.trim()) ? t.icon.trim() : (t.refId? kindEmoji(t.kind) : ((t.label||'?').trim().charAt(0)||'?')));
  inner.style.borderColor=t.color||'#94a3b8';
  el.appendChild(inner);
  /* marcas de status (anel de ícones) */
  if(t.marks&&t.marks.length) el.appendChild(h('div',{class:'map-token-marks'}, t.marks.slice(0,4).map(mk=>h('span',{},mk))));
  el.appendChild(h('div',{class:'map-token-lbl'}, (ref&&ref.name)||t.label||''));
  if(t.hp!=null && t.hpMax){ const pc=Math.max(0,Math.min(100,(t.hp/t.hpMax)*100));
    el.appendChild(h('div',{class:'map-token-hp'}, h('span',{style:{width:pc+'%'}}))); }
  const onClick = t.kind==='player'
    ? ()=>abrirFichaJogador(t.refId)
    : ()=>{ limpaSel(); S.ui.tokenSel=t.id; render(); };
  dragMovable(area, el, t, onClick);
  return el;
}
function abrirFichaJogador(refId){
  if(!refId) return (typeof showToast==='function'? showToast('Token genérico: ligue-o a um jogador na paleta.') : alert('Token genérico.'));
  const c=S.campaign; const p=(c.players||[]).find(x=>x.id===refId);
  if(!p) return showToast('Jogador não está mais na mesa.');
  if(!p.sheet) return showToast('Esse jogador ainda não tem ficha importada.');
  limpaSel(); S.ui.verFicha=p.id;
  if(typeof irMtab==='function') irMtab('jogadores'); else render();
}
function tokenToolbar(){
  const m=curMap(); if(!m) return null;
  const t=m.tokens.find(x=>x.id===S.ui.tokenSel);
  if(!t) return null;
  const cores=['#10b981','#e11d48','#6366f1','#d97706','#e2e8f0','#0ea5e9','#a855f7','#f59e0b'];
  const emojis=['','⚔️','🛡️','🏹','🗡️','🔮','🐺','🐉','🕷️','👹','👑','🎭','🧙','🤖','👽','💀','🔥','❄️'];
  const imgInp=h('input',{type:'file', accept:'image/*', class:'hide',
    onchange:e=>{ readPhoto(e.target.files[0], data=>{ t.img=data; render(); }); e.target.value=''; }});
  const ref=tokenRefInfo(t);
  const hpStep=n=>{ if(t.hp==null) t.hp=t.hpMax||0; t.hp=Math.max(0,(t.hp||0)+n); render(); };
  return h('div',{class:'map-tt col'},
    h('div',{class:'row wrapf'},
      h('strong',{}, kindEmoji(t.kind)+' Token'),
      h('input',{class:'in', style:{width:'150px'}, value:t.label, placeholder:'rótulo', onchange:e=>{t.label=e.target.value;render();}}),
      t.kind==='player'?h('button',{class:'btn primary sm', onclick:()=>abrirFichaJogador(t.refId)},'👁 Abrir ficha'):null,
      h('button',{class:'btn ghost sm', onclick:()=>{limpaSel();render();}},'Fechar'),
      h('button',{class:'btn danger sm', onclick:()=>{m.tokens=m.tokens.filter(x=>x.id!==t.id);limpaSel();render();}},'Excluir')),
    /* Tamanho por categoria */
    h('div',{class:'row wrapf', style:{alignItems:'center'}},
      h('span',{class:'hint'},'Tamanho:'),
      h('div',{class:'seg'}, TOKEN_SIZES.map(sz=>h('button',{class:'seg-b'+((t.size||100)===sz.pct?' on':''), onclick:()=>{t.size=sz.pct;render();}}, sz.nome)))),
    /* Ícone: imagem + emojis + anel */
    h('div',{class:'row wrapf', style:{alignItems:'center'}},
      h('span',{class:'hint'},'Ícone:'),
      h('button',{class:'btn sm', onclick:()=>imgInp.click()},'🖼️ Imagem'), imgInp,
      t.img?h('button',{class:'btn ghost sm', onclick:()=>{t.img=null;render();}},'Remover'):null,
      h('div',{class:'emoji-pal'}, emojis.map(em=>h('button',{class:'emoji-pick'+((t.icon||'')===em?' on':''),
        title:em||'padrão', onclick:()=>{t.icon=em;render();}}, em||'∅')))),
    h('div',{class:'row wrapf', style:{alignItems:'center'}},
      h('span',{class:'hint'},'Anel:'),
      cores.map(cor=>h('button',{class:'map-swatch'+(t.color===cor?' on':''), style:{background:cor}, onclick:()=>{t.color=cor;render();}}))),
    /* Vida + oculto */
    h('div',{class:'row wrapf', style:{alignItems:'center', gap:'10px'}},
      h('span',{class:'hint'},'HP:'),
      h('button',{class:'btn ghost sm', onclick:()=>hpStep(-1)},'−'),
      h('input',{class:'in', type:'number', style:{width:'58px'}, value:t.hp==null?'':t.hp, placeholder:'—',
        onchange:e=>{const v=e.target.value; t.hp=v===''?null:(parseInt(v)||0); render();}}),
      h('button',{class:'btn ghost sm', onclick:()=>hpStep(1)},'+'),
      h('span',{class:'hint'},'/'),
      h('input',{class:'in', type:'number', style:{width:'58px'}, value:t.hpMax==null?'':t.hpMax, placeholder:'máx',
        onchange:e=>{const v=e.target.value; t.hpMax=v===''?null:(parseInt(v)||0); render();}}),
      h('label',{class:'chk'}, h('input',{type:'checkbox', checked:!!t.hidden, onchange:e=>{t.hidden=e.target.checked;render();}}),' Oculto')),
    /* Marcas de status */
    h('div',{class:'row wrapf', style:{alignItems:'center'}},
      h('span',{class:'hint'},'Marcas:'),
      h('div',{class:'emoji-pal'}, TOKEN_MARKS.map(mk=>{
        const on=(t.marks||[]).includes(mk);
        return h('button',{class:'emoji-pick'+(on?' on':''), onclick:()=>{
          t.marks=t.marks||[]; if(on) t.marks=t.marks.filter(x=>x!==mk); else t.marks.push(mk); render();
        }}, mk); }))),
    ref?h('div',{class:'hint'},'Ligado a: '+ref.name):null);
}

/* ============================ PEÇAS TÁTICAS ============================ */
function propEl(area, p){
  const sel=S.ui.propSel===p.id;
  if(p.shape==='block'){
    const el=h('div',{class:'map-prop block fill-'+(p.fill||'wall')+(sel?' sel':'')+(p.hidden?' hidden':''),
      style:{left:p.xPct+'%', top:p.yPct+'%', width:p.w+'%', height:p.h+'%',
             transform:'translate(-50%,-50%) rotate('+(p.rot||0)+'deg)'},
      title:p.label||''},
      p.label?h('span',{class:'map-prop-lbl'},p.label):null);
    dragMovable(area, el, p, ()=>{ limpaSel(); S.ui.propSel=p.id; render(); });
    return el;
  }
  const px=Math.round(30*(p.size||100)/100);
  const el=h('div',{class:'map-prop stamp'+(sel?' sel':'')+(p.hidden?' hidden':''),
    style:{left:p.xPct+'%', top:p.yPct+'%', fontSize:px+'px',
           transform:'translate(-50%,-50%) rotate('+(p.rot||0)+'deg)'},
    title:p.label||''}, p.icon);
  dragMovable(area, el, p, ()=>{ limpaSel(); S.ui.propSel=p.id; render(); });
  return el;
}
function propToolbar(){
  const m=curMap(); if(!m) return null;
  const p=(m.props||[]).find(x=>x.id===S.ui.propSel);
  if(!p) return null;
  const meta=propMeta(p.k)||{nome:'Peça'};
  const idx=m.props.indexOf(p);
  const controles = p.shape==='block'
    ? h('div',{class:'row wrapf', style:{gap:'12px'}},
        field('Largura', h('input',{type:'range', min:'4', max:'80', value:p.w, oninput:e=>{p.w=parseInt(e.target.value)||10;render();}})),
        field('Altura',  h('input',{type:'range', min:'2', max:'80', value:p.h, oninput:e=>{p.h=parseInt(e.target.value)||10;render();}})),
        field('Girar',   h('input',{type:'range', min:'0', max:'180', value:p.rot||0, oninput:e=>{p.rot=parseInt(e.target.value)||0;render();}})))
    : h('div',{class:'row wrapf', style:{gap:'12px'}},
        field('Tamanho', h('input',{type:'range', min:'50', max:'260', value:p.size||100, oninput:e=>{p.size=parseInt(e.target.value)||100;render();}})),
        field('Girar',   h('input',{type:'range', min:'0', max:'360', value:p.rot||0, oninput:e=>{p.rot=parseInt(e.target.value)||0;render();}})));
  return h('div',{class:'map-tt col'},
    h('div',{class:'row wrapf'},
      h('strong',{}, (p.icon||'🧩')+' '+(meta.nome||'Peça')),
      h('input',{class:'in', style:{width:'150px'}, placeholder:'rótulo (opcional)', value:p.label||'', onchange:e=>{p.label=e.target.value;render();}}),
      h('label',{class:'chk'}, h('input',{type:'checkbox', checked:!!p.hidden, onchange:e=>{p.hidden=e.target.checked;render();}}),' Oculto'),
      h('button',{class:'btn ghost sm', title:'Enviar para trás', onclick:()=>{ if(idx>0){ m.props.splice(idx,1); m.props.unshift(p); render(); } }},'⬓ Trás'),
      h('button',{class:'btn ghost sm', title:'Trazer para frente', onclick:()=>{ if(idx<m.props.length-1){ m.props.splice(idx,1); m.props.push(p); render(); } }},'⬔ Frente'),
      h('button',{class:'btn ghost sm', onclick:()=>{ const cp=JSON.parse(JSON.stringify(p)); cp.id=uid(); cp.xPct=Math.min(96,p.xPct+4); cp.yPct=Math.min(96,p.yPct+4); m.props.push(cp); S.ui.propSel=cp.id; render(); }},'⧉ Duplicar'),
      h('button',{class:'btn ghost sm', onclick:()=>{limpaSel();render();}},'Fechar'),
      h('button',{class:'btn danger sm', onclick:()=>{m.props=m.props.filter(x=>x.id!==p.id);limpaSel();render();}},'Excluir')),
    controles);
}

/* ============================ REINOS ============================ */
function kingdomEl(area, k){
  const sel=S.ui.kingSel===k.id;
  const el=h('div',{class:'map-kingdom'+(sel?' sel':''),
    style:{left:k.xPct+'%', top:k.yPct+'%', width:(k.radius*2)+'%',
           background:'radial-gradient(circle, '+hexA(k.color,.42)+' 0%, '+hexA(k.color,.14)+' 65%, transparent 72%)',
           borderColor:hexA(k.color,.8)},
    title:k.name},
    h('span',{class:'map-kingdom-lbl', style:{background:k.color}}, k.name));
  dragMovable(area, el, k, ()=>{ limpaSel(); S.ui.kingSel=k.id; render(); });
  return el;
}
function kingdomToolbar(){
  const m=curMap(); if(!m) return null;
  const k=(m.world.kingdoms||[]).find(x=>x.id===S.ui.kingSel);
  if(!k) return null;
  return h('div',{class:'map-tt col'},
    h('div',{class:'row wrapf'},
      h('strong',{},'🏴 Reino'),
      h('input',{class:'in', style:{width:'180px'}, value:k.name, onchange:e=>{k.name=e.target.value;render();}}),
      h('input',{type:'color', class:'in color', value:k.color, onchange:e=>{k.color=e.target.value;render();}}),
      h('button',{class:'btn ghost sm', onclick:()=>{limpaSel();render();}},'Fechar'),
      h('button',{class:'btn danger sm', onclick:()=>{m.world.kingdoms=m.world.kingdoms.filter(x=>x.id!==k.id);limpaSel();render();}},'Excluir')),
    h('div',{class:'row wrapf', style:{alignItems:'center'}},
      h('div',{class:'row'}, KINGDOM_COLORS.map(cor=>h('button',{class:'map-swatch'+(k.color===cor?' on':''), style:{background:cor}, onclick:()=>{k.color=cor;render();}}))),
      field('Extensão', h('input',{type:'range', min:'6', max:'40', value:k.radius, oninput:e=>{k.radius=parseInt(e.target.value)||16;render();}}))),
    h('textarea',{class:'in', rows:'2', placeholder:'Capital, povo, política, tensões…', onchange:e=>{k.note=e.target.value;render();}}, k.note||''));
}
function hexA(hex, a){
  const s=String(hex||'#888').replace('#',''); const n=s.length===3?s.split('').map(c=>c+c).join(''):s;
  const r=parseInt(n.slice(0,2),16)||136, g=parseInt(n.slice(2,4),16)||136, b=parseInt(n.slice(4,6),16)||136;
  return 'rgba('+r+','+g+','+b+','+a+')';
}

/* ============================ PINS ============================ */
function pinEl(area, p){
  const el=h('div',{class:'map-pin'+(S.ui.pinSel===p.id?' sel':''), style:{left:p.xPct+'%', top:p.yPct+'%'},
    title:(p.label||'')+(p.note?(' — '+p.note):'')},
    h('span',{class:'map-pin-dot'}, p.icon||'📍'),
    p.label?h('span',{class:'map-pin-lbl'}, p.label):null);
  dragMovable(area, el, p, ()=>{ limpaSel(); S.ui.pinSel=p.id; render(); });
  return el;
}
function pinToolbar(){
  const m=curMap(); if(!m) return null;
  const p=m.pins.find(x=>x.id===S.ui.pinSel);
  if(!p) return null;
  const icones=h('div',{class:'pin-picker'}, PIN_ICONS.map(ic=>
    h('button',{class:'pin-pick'+(p.icon===ic?' on':''), onclick:()=>{p.icon=ic;render();}}, ic)));
  return h('div',{class:'map-tt col'},
    h('div',{class:'row wrapf'},
      h('strong',{}, '📍 Local'),
      h('input',{class:'in', style:{width:'170px'}, placeholder:'Nome do local', value:p.label||'', onchange:e=>{p.label=e.target.value;render();}}),
      h('button',{class:'btn ghost sm', onclick:()=>{limpaSel();render();}},'Fechar'),
      h('button',{class:'btn danger sm', onclick:()=>{m.pins=m.pins.filter(x=>x.id!==p.id);limpaSel();render();}},'Excluir')),
    icones,
    h('textarea',{class:'in', rows:'2', placeholder:'Nota do local (o que há aqui, segredos…)', onchange:e=>{p.note=e.target.value;render();}}, p.note||''));
}
