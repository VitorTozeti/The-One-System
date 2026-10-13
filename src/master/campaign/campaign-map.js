/* ============================================================ CAMPANHA — MAPA (tela do editor) ============================================================
   Editor de mapas em formato de WORKSPACE (sem rolagem de página):
     barra superior (mapas, desfazer/refazer, gerador, mapa, notas, exportar, tela cheia)
     · trilho de ferramentas à esquerda · tela do mapa no centro (zoom/pan, pinça)
     · painel de propriedades à direita (contextual) · popovers para paletas/gerador.
   O motor de edição (objetos, seleção, alças, histórico, gestos, painel) está em
   map-editor.js; os geradores procedurais em map-gen.js. Aqui ficam: criação de mapas,
   layout, camadas (terreno/objetos/peças/pins/tokens/reinos), viewport e exportação.
   Posições de peças/pins/tokens/reinos em % (compatível com mapas antigos); objetos
   vetoriais em unidades de mapa 1000×625 (1 unidade = 1 px na área do mapa). */

/* ---------- Utilidades de imagem ---------- */
function readMapImage(file, cb){
  if(!file) return;
  const bad=m=>{ if(typeof uiAlert==='function') uiAlert(m,{titulo:'Imagem'}); else alert(m); };
  if(!/^image\//.test(file.type)) return bad('Selecione um arquivo de imagem.');
  const rd=new FileReader();
  rd.onerror=()=>bad('Não foi possível ler o arquivo.');
  rd.onload=()=>{ const img=new Image();
    img.onerror=()=>bad('Imagem inválida.');
    img.onload=()=>{ const MAX=1400, sc=Math.min(1,MAX/Math.max(img.width,img.height));
      const c=document.createElement('canvas'); c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height); cb(c.toDataURL('image/jpeg',0.8)); };
    img.src=rd.result; };
  rd.readAsDataURL(file);
}
function mapKindMeta(k){ return MAP_KINDS.find(x=>x.k===k)||MAP_KINDS[1]; }
function mapThemeMeta(k){ return MAP_THEMES.find(x=>x.k===k)||MAP_THEMES[0]; }
function brushMat(){ return S.ui.brushMat||'grama'; }
function brushSize(){ return S.ui.brushSize||42; }
function isEmptyMap(m){
  return !m.image && !m.terrain && !(m.objs||[]).length && !(m.props||[]).length && !m.pins.length && !m.tokens.length
    && !(m.world.kingdoms||[]).length && !(m.world.continent&&m.world.continent.shape!=='none');
}

/* ============================ CRIAÇÃO DE MAPA (1–2 cliques) ============================ */
const START_TYPES=[
  {id:'mundo',   kind:'mundo',    gen:'mundo',    ic:'🌍', nome:'Mundo',          desc:'Continentes, reinos, rios e estradas'},
  {id:'regiao',  kind:'regiao',   gen:'mundo',    ic:'🗺️', nome:'Região',         desc:'Um reino ou província em detalhe'},
  {id:'cidade',  kind:'local',    gen:'vila',     ic:'🏘️', nome:'Cidade / vila',  desc:'Ruas, casas, rio e árvores'},
  {id:'interior',kind:'interior', gen:'interior', ic:'🏠', nome:'Interior',       desc:'Planta de casa, taverna ou loja'},
  {id:'masmorra',kind:'masmorra', gen:'masmorra', ic:'🕳️', nome:'Masmorra',       desc:'Salas, corredores e portas'},
  {id:'caverna', kind:'masmorra', gen:'caverna',  ic:'🦇', nome:'Caverna',        desc:'Galerias orgânicas e túneis'},
];
function startPreview(id){
  const P={
    mundo:'<rect width="160" height="100" fill="#2f6ea3"/><path d="M28 58C20 36 44 18 70 22C92 12 122 24 130 46C138 66 116 84 92 80C70 92 38 82 28 58Z" fill="#6aa05a" stroke="#3b6b3a" stroke-width="2"/><path d="M60 34C70 44 66 56 78 66" fill="none" stroke="#4b8fcf" stroke-width="2.4"/><path d="M96 30C100 44 112 50 116 62" fill="none" stroke="#7a2f2f" stroke-width="1.6" stroke-dasharray="4 3"/><circle cx="72" cy="44" r="3.4" fill="#fde68a" stroke="#333"/><circle cx="108" cy="56" r="3" fill="#fde68a" stroke="#333"/>',
    regiao:'<rect width="160" height="100" fill="#e9dcc0"/><path d="M10 70C30 50 40 60 60 40C80 22 110 30 150 20" fill="none" stroke="#7a2f2f" stroke-width="2" stroke-dasharray="5 4"/><path d="M20 20C40 40 70 50 90 80" fill="none" stroke="#4b8fcf" stroke-width="3"/><path d="M40 85C70 70 100 80 140 60" fill="none" stroke="#a37c4c" stroke-width="2" stroke-dasharray="3 3"/><circle cx="104" cy="44" r="5" fill="#d14a4a" stroke="#333"/><circle cx="52" cy="62" r="4" fill="#d14a4a" stroke="#333"/>',
    cidade:'<rect width="160" height="100" fill="#769c5c"/><path d="M-5 48C40 38 90 60 170 46" fill="none" stroke="#5c4630" stroke-width="9"/><path d="M-5 48C40 38 90 60 170 46" fill="none" stroke="#b79a6e" stroke-width="6"/><path d="M80 -5C70 30 96 70 84 105" fill="none" stroke="#4b8fcf" stroke-width="9"/><g fill="#a8553a" stroke="#2a1c12" stroke-width="1.4"><rect x="20" y="24" width="18" height="12"/><rect x="48" y="26" width="14" height="10"/><rect x="100" y="24" width="18" height="12"/><rect x="26" y="62" width="16" height="12"/><rect x="110" y="62" width="18" height="12"/><rect x="48" y="68" width="14" height="10"/></g><g fill="#2f6b3a"><circle cx="140" cy="20" r="5"/><circle cx="12" cy="86" r="5"/><circle cx="64" cy="12" r="4"/></g>',
    interior:'<rect width="160" height="100" fill="#e9dcc0"/><rect x="18" y="10" width="124" height="80" fill="#b9a883" stroke="#2a2118" stroke-width="3"/><g fill="#f8f1dc" stroke="#2a2118" stroke-width="2"><rect x="22" y="14" width="52" height="38"/><rect x="80" y="14" width="58" height="22"/><rect x="80" y="42" width="58" height="44"/><rect x="22" y="58" width="52" height="28"/></g><g fill="#8b5a2b"><rect x="70" y="30" width="8" height="5"/><rect x="48" y="53" width="5" height="8"/><rect x="104" y="37" width="6" height="5"/></g>',
    masmorra:'<rect width="160" height="100" fill="#1a1722"/><g fill="#3b364a" stroke="#07060b" stroke-width="3"><rect x="14" y="14" width="40" height="30"/><rect x="92" y="10" width="52" height="26"/><rect x="60" y="58" width="44" height="28"/><rect x="54" y="26" width="38" height="8"/><rect x="74" y="34" width="8" height="26"/></g><g fill="#7a5a3a"><rect x="52" y="26" width="5" height="8"/><rect x="90" y="26" width="5" height="8"/></g>',
    caverna:'<rect width="160" height="100" fill="#1a1722"/><path d="M26 54C18 34 46 20 66 28C86 14 118 20 126 42C142 56 120 82 96 78C76 90 40 82 26 54Z" fill="#3b364a" stroke="#07060b" stroke-width="3"/><circle cx="60" cy="48" r="4" fill="#58526f"/><circle cx="96" cy="52" r="3" fill="#58526f"/>',
  };
  return '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+P[id]+'</svg>';
}
function criarMapa(tp, modo, imgData){
  const c=S.campaign, d=S.ui.mapDraft||(S.ui.mapDraft={name:'',theme:'rustico'});
  const m=newMap(tp.kind,d.theme||'rustico',(d.name||'').trim()||('Novo '+tp.nome.toLowerCase()));
  if(!isWorldKind(tp.kind) && tp.kind!=='local') m.grid={on:true,size:50,snap:true};
  if(imgData) m.image=imgData;
  c.maps.push(m); c.currentMapId=m.id;
  if(modo==='gen'){
    try{ const o=Object.assign(genOpts(),{seed:novaSemente(),g:tp.gen}); gerarMapa(m,tp.gen,Object.assign({},o)); }
    catch(e){ console.error(e); }
  }
  S.ui.novoMapa=false; S.ui.mapDraft=null; S.ui.mapView=null; S.ui.mapTool='select'; S.ui.mpTab='props'; S.ui.mpPop=null; S.ui.stamp=null; S.ui.draft=null; limpaSel();
  render();
}
function startScreen(){
  const c=S.campaign, d=S.ui.mapDraft||(S.ui.mapDraft={name:'',theme:'rustico'});
  const tem=c.maps.length>0;
  const head=h('div',{class:'mp-start-head'},
    h('div',{},h('h3',{},tem?'Novo mapa':'Crie seu primeiro mapa'),
      h('div',{class:'hint'},'Escolha o tipo e como começar: ',h('b',{},'gerar automático'),' (tudo fica editável), ',h('b',{},'em branco'),' ou ',h('b',{},'importar uma imagem'),'.')),
    tem?h('button',{class:'btn ghost sm',onclick:()=>{ S.ui.novoMapa=false; render(); }},'← Voltar ao mapa'):null);
  const opts=h('div',{class:'mp-start-opts'},
    h('label',{class:'f'},h('span',{},'Nome (opcional)'),h('input',{class:'in',value:d.name,placeholder:'ex.: Reino de Valdrin, Taverna do Corvo…',onchange:e=>{ d.name=e.target.value; }})),
    h('div',{class:'f'},h('span',{},'Era / clima visual'),
      h('div',{class:'map-opts sm'},MAP_THEMES.map(t=>h('button',{class:'map-opt theme sm '+t.k+(d.theme===t.k?' on':''),title:t.nome,'aria-label':t.nome,onclick:()=>{ d.theme=t.k; render(); }},t.ic+' '+t.nome)))));
  const cards=START_TYPES.map(tp=>{
    const inp=h('input',{type:'file',accept:'image/*',class:'hide','aria-label':'Importar imagem para '+tp.nome,
      onchange:e=>{ readMapImage(e.target.files[0],data=>criarMapa(tp,'img',data)); e.target.value=''; }});
    return h('div',{class:'mp-tcard'},
      h('div',{class:'mp-prev',html:startPreview(tp.id)}),
      h('div',{class:'mp-tcard-b'},h('div',{class:'nm'},tp.ic+' '+tp.nome),h('div',{class:'ds'},tp.desc),
        h('div',{class:'bt'},
          h('button',{class:'btn primary sm',onclick:()=>criarMapa(tp,'gen'),title:'Gera um mapa completo e editável'},'🎲 Gerar'),
          h('button',{class:'btn sm',onclick:()=>criarMapa(tp,'blank'),title:'Começa com a tela vazia'},'▢ Em branco'),
          h('button',{class:'btn sm ghost',onclick:()=>inp.click(),title:'Usa uma imagem sua como fundo'},'🖼️ Imagem'),inp)));
  });
  return h('div',{class:'mp-start'},head,opts,h('div',{class:'mp-cards'},...cards));
}

/* ============================ TELA DO EDITOR ============================ */
function mapaView(){
  const c=S.campaign;
  if(!Array.isArray(c.maps)) c.maps=[];
  if(!c.maps.length || S.ui.novoMapa){ MP.ws=null; return startScreen(); }
  const m=curMap(), km=mapKindMeta(m.kind), tool=mapTool();
  S.ui.msel=selRefs().filter(r=>entGet(m,r)); syncLegacySel();

  const ws=h('div',{class:'mp-ed'+(S.ui.mpFull?' full':'')+(S.ui.mpPanelOff?' no-panel':'')+(isEmptyMap(m)?' is-empty':'')});
  MP.ws=ws; ws.dataset.tool=tool; if(S.ui.mpPop) ws.dataset.pop=S.ui.mpPop;
  const H0=hist(m);

  /* ---- barra superior ---- */
  const tb=(act,ic,lbl,tip,fn,on,dis)=>h('button',{class:'mp-tb'+(on?' on':''),'data-act':act,title:tip,'aria-label':tip,disabled:dis?true:null,onclick:fn},h('span',{class:'ic'},ic),lbl?h('span',{class:'lb'},lbl):null);
  const pop=k=>()=>{ S.ui.mpPop=S.ui.mpPop===k?null:k; render(); };
  const top=h('div',{class:'mp-top'},
    h('button',{class:'mp-tb mp-mapbtn'+(S.ui.mpPop==='maps'?' on':''),title:'Trocar de mapa ou criar outro','aria-label':'Mapas',onclick:pop('maps')},
      h('span',{class:'ic'},km.ic),h('span',{class:'lb nm'},m.name),h('span',{class:'ic'},'▾')),
    h('span',{class:'mp-sep'}),
    tb('undo','↶','','Desfazer (Ctrl+Z)',mapUndo,false,!H0.u.length),
    tb('redo','↷','','Refazer (Ctrl+Shift+Z)',mapRedo,false,!H0.r.length),
    h('span',{class:'mp-sep'}),
    tb('cfg','⚙','Mapa','Configurar o mapa: nome, tipo, grade, escala, fundo',pop('cfg'),S.ui.mpPop==='cfg'),
    tb('gen','🎲','Gerar','Gerar este mapa automaticamente (tudo fica editável)',pop('gen'),S.ui.mpPop==='gen'),
    tb('notes','📝','Notas','Anotações do mapa',pop('notes'),S.ui.mpPop==='notes'),
    h('span',{class:'mp-grow'}),
    tb('png','⬇','PNG','Exportar como imagem PNG (sem itens ocultos)',()=>exportarMapaPNG(m)),
    tb('keys','⌨','','Atalhos do teclado',pop('keys'),S.ui.mpPop==='keys'),
    tb('panel','▤','','Mostrar/ocultar painel de propriedades',()=>{ S.ui.mpPanelOff=!S.ui.mpPanelOff; render(); },!S.ui.mpPanelOff),
    tb('full','⛶','','Tela cheia',toggleFull));

  /* ---- trilho de ferramentas ---- */
  const rt=(t,ic,lbl,tip)=>h('button',{class:'mp-tool'+(tool===t?' on':''),title:tip,'aria-label':tip,'aria-pressed':String(tool===t),onclick:()=>setTool(t)},h('span',{class:'ic'},ic),h('span',{class:'lb'},lbl));
  const rp=(k,ic,lbl,tip,tab)=>h('button',{class:'mp-tool'+(S.ui.mpPop===k?' on':''),title:tip,'aria-label':tip,onclick:()=>{ if(tab) S.ui.pieceTab=tab; S.ui.mpPop=(S.ui.mpPop===k&&(!tab||S.ui.pieceTab===tab))?null:k; render(); }},h('span',{class:'ic'},ic),h('span',{class:'lb'},lbl));
  const rail=h('div',{class:'mp-rail',role:'toolbar','aria-label':'Ferramentas do mapa'},
    rt('select','🖱️','Editar','Selecionar e editar (V)'), rt('hand','✋','Mover','Mover a vista (H) — ou segure Espaço'),
    h('span',{class:'mp-rsep'}),
    rt('brush','🖌️','Pincel','Pincel de terreno (B)'), rt('erase','🧽','Borracha','Borracha de terreno (E)'), rt('bucket','🪣','Balde','Balde de tinta (G)'),
    h('span',{class:'mp-rsep'}),
    rt('rect','▭','Sala','Sala, parede, casa ou forma — arraste (R)'), rt('line','〰️','Linha','Estrada, rio, muro — clique os pontos (L)'),
    rt('poly','⬠','Região','Região, floresta, lago — clique os cantos (P)'), rt('text','T','Texto','Texto livre (T)'),
    h('span',{class:'mp-rsep'}),
    rt('ruler','📏','Régua','Medir distância (M)'), rt('aoe','🔮','Magia','Área de efeito: círculo, cone, linha (A)'),
    h('span',{class:'mp-rsep'}),
    rp('pieces','🧩','Peças','Paleta de peças, locais e reinos','pecas'), rp('pieces','🧍','Tokens','Colocar tokens de jogadores e criaturas','tokens'));

  /* ---- tela do mapa ---- */
  const area=h('div',{class:'map-area map-theme-'+m.theme+(m.showLabels===false?' no-labels':'')});
  const vp=h('div',{class:'map-vp mp-vp tool-'+tool+(S.ui.spaceDown?' pan-ready':'')},area);
  MP.vp=vp; MP.area=area;
  buildLayers(area,m); applyAreaStyle(area,m); paintOverlay();
  if(compassOn(m)) vp.appendChild(compassEl());
  if(scaleCfg(m).on) vp.appendChild(h('div',{class:'map-scale'},h('div',{class:'map-scale-bar'}),h('span',{class:'map-scale-lbl'})));
  vp.appendChild(zoomCtl());
  vp.appendChild(h('div',{class:'map-ring'}));
  ligaViewport(vp);

  const empty=h('div',{class:'mp-empty-card'},
    h('div',{class:'ttl'},'✨ Mapa em branco — por onde começar?'),
    h('div',{class:'mp-empty-btns'},
      h('button',{class:'btn primary',onclick:()=>{ S.ui.mpPop='gen'; render(); }},'🎲 Gerar automaticamente'),
      h('button',{class:'btn',onclick:()=>{ S.ui.mpPreset=Object.assign(S.ui.mpPreset||{},{rect:'floor'}); setTool('rect'); }},'▭ Desenhar uma sala'),
      h('button',{class:'btn',onclick:()=>setTool('brush')},'🖌️ Pintar terreno'),
      h('button',{class:'btn',onclick:()=>{ S.ui.pieceTab='pecas'; S.ui.mpPop='pieces'; render(); }},'🧩 Colocar peças')),
    h('div',{class:'hint'},'Dica: Ctrl+Z desfaz qualquer ação · roda do mouse dá zoom · Espaço arrasta o mapa.'));

  const stage=h('div',{class:'mp-stage'},vp,hintBar(),empty);
  if(S.ui.mpPop) stage.appendChild(popover(m));

  /* ---- painel direito ---- */
  const nObj=allEnts(m).length;
  const ptab=(k,t,n)=>h('button',{class:'mp-ptab'+((S.ui.mpTab||'props')===k?' on':''),'data-tab':k,onclick:()=>{ S.ui.mpTab=k; panelRefresh(); }},t,n!=null?h('span',{class:'n'},n):null);
  const pbody=h('div',{class:'mp-pbody'});
  MP.pbody=pbody;
  const panel=h('aside',{class:'mp-panel','aria-label':'Propriedades'},
    h('div',{class:'mp-ptabs'},ptab('props','Propriedades'),ptab('objs','Objetos',nObj)),pbody);

  ws.appendChild(top);
  ws.appendChild(h('div',{class:'mp-body'},rail,stage,panel));
  pbody.appendChild(panelBody(m));
  requestAnimationFrame(()=>mountEditor(ws)); setTimeout(()=>mountEditor(ws),40);
  return ws;
}
let _ro=null;
function mountEditor(ws){
  if(!document.body.contains(ws)||MP.ws!==ws) return;
  fitWorkspace(ws);
  if(ws.classList.contains('narrow') && S.ui.mpPanelOff===undefined){ S.ui.mpPanelOff=true; ws.classList.add('no-panel'); }
  aplicaView();
  if(_ro){ try{ _ro.disconnect(); }catch(e){} }
  if(typeof ResizeObserver!=='undefined' && MP.vp){ _ro=new ResizeObserver(()=>{ if(document.body.contains(ws)){ ws.classList.toggle('narrow',ws.clientWidth<780); aplicaView(); } }); _ro.observe(MP.vp); }
}
function fitWorkspace(ws){
  ws.classList.toggle('narrow',ws.clientWidth<780);
  if(document.fullscreenElement===ws||ws.classList.contains('full')){ ws.style.height=''; return; }
  /* quanto do topo da janela está tomado por barras fixas/sticky (cabeçalho, barra de sessão…) */
  let hdr=(document.querySelector('header.top')||{offsetHeight:56}).offsetHeight||56;
  const wr=ws.getBoundingClientRect();
  document.querySelectorAll('#root *').forEach(e=>{
    if(e===ws||ws.contains(e)||e.contains(ws)) return;
    const cs=getComputedStyle(e); if(cs.position!=='sticky'&&cs.position!=='fixed') return;
    const r=e.getBoundingClientRect(); if(r.height<=0||r.top>200||r.bottom>260) return;
    if(Math.min(r.right,wr.right)-Math.max(r.left,wr.left)<wr.width*0.5) return;
    hdr=Math.max(hdr,r.bottom);
  });
  /* ocupa a altura útil da janela (abaixo das barras) e alinha a página para o editor caber sem rolar */
  ws.style.height=Math.max(440,window.innerHeight-hdr-18)+'px';
  const r=ws.getBoundingClientRect();
  if(r.top<hdr-2||r.bottom>window.innerHeight+2) window.scrollBy(0,r.top-(hdr+8));
}
window.addEventListener('resize',()=>{ if(MP.ws&&document.body.contains(MP.ws)){ fitWorkspace(MP.ws); aplicaView(); } });
document.addEventListener('fullscreenchange',()=>{ if(MP.ws&&document.body.contains(MP.ws)){ fitWorkspace(MP.ws); aplicaView(); } });
function toggleFull(){
  const ws=MP.ws; if(!ws) return;
  if(document.fullscreenElement){ document.exitFullscreen(); return; }
  if(S.ui.mpFull){ S.ui.mpFull=false; render(); return; }
  if(ws.requestFullscreen){ ws.requestFullscreen().catch(()=>{ S.ui.mpFull=true; render(); }); }
  else { S.ui.mpFull=true; render(); }
}
function applyAreaStyle(area,m){
  area.className='map-area map-theme-'+m.theme+(m.showLabels===false?' no-labels':'');
  area.style.background='';
  if(m.bg) area.style.background=m.bg;
  if(m.image) area.style.background=(m.bg||'#0e1424')+' url('+m.image+') center/cover no-repeat';
}

/* ============================ CAMADAS ============================ */
function entEl(t,e){ return t==='prop'?propEl(e):t==='pin'?pinEl(e):t==='token'?tokenEl(e):t==='king'?kingdomEl(e):null; }
function refreshEntEl(t,e){
  if(!MP.area) return;
  const old=MP.area.querySelector('[data-et="'+t+'"][data-eid="'+e.id+'"]'), nw=entEl(t,e);
  if(old&&nw) old.replaceWith(nw);
}
function buildLayers(area,m){
  [...area.children].forEach(ch=>{ if(!_terr.cv||ch!==_terr.cv) ch.remove(); });
  const tcv=terrainCanvasFor(m);
  if(tcv.parentNode!==area) area.insertBefore(tcv,area.firstChild);
  const world=isWorldKind(m.kind);
  if(world){ const cont=continentLayer(m); if(cont) area.appendChild(cont); }
  const NS='http://www.w3.org/2000/svg', svg=document.createElementNS(NS,'svg');
  svg.setAttribute('class','mp-svg'); svg.setAttribute('viewBox','0 0 '+U_W+' '+U_H); svg.setAttribute('preserveAspectRatio','none');
  svg.innerHTML=objsMarkup(m,true,false);
  area.appendChild(svg); MP.svg=svg;
  if(m.grid.on) area.appendChild(gridOverlay(m));
  (m.world.kingdoms||[]).forEach(k=>area.appendChild(kingdomEl(k)));
  (m.props||[]).forEach(p=>area.appendChild(propEl(p)));
  m.pins.forEach(p=>area.appendChild(pinEl(p)));
  m.tokens.forEach(t=>area.appendChild(tokenEl(t)));
  const ov=h('div',{class:'mp-ov'}); area.appendChild(ov); MP.ov=ov;
}
function mapRefresh(){
  const m=curMap(); if(!m||!MP.area||!document.body.contains(MP.area)) return;
  buildLayers(MP.area,m); applyAreaStyle(MP.area,m); paintOverlay(); histBtns();
  if(MP.ws) MP.ws.classList.toggle('is-empty',isEmptyMap(m));
  const cnt=MP.ws&&MP.ws.querySelector('.mp-ptab[data-tab="objs"] .n'); if(cnt) cnt.textContent=allEnts(m).length;
}
function continentLayer(m){
  const w=m.world.continent; const meta=worldShapeMeta(w.shape);
  if(!meta.poly) return null;
  const el=h('div',{class:'map-continent'});
  el.style.background=w.color;
  el.style.clipPath='polygon('+meta.poly+')'; el.style.webkitClipPath='polygon('+meta.poly+')';
  el.style.transform='rotate('+(w.rot||0)+'deg) scale('+((w.scale||100)/100)+')';
  return el;
}
function gridOverlay(m){
  const s=m.grid.size;
  if(m.grid.type==='hex'){
    const r=s/Math.sqrt(3), w=3*r, hh=s, hf=hh/2, f=n=>n.toFixed(2);
    const d='M0,'+f(hf)+' L'+f(r/2)+',0 L'+f(1.5*r)+',0 L'+f(2*r)+','+f(hf)+' L'+f(1.5*r)+','+f(hh)+' L'+f(r/2)+','+f(hh)+' Z M'+f(2*r)+','+f(hf)+' L'+f(w)+','+f(hf);
    return h('div',{class:'map-hex-ov',html:'<svg width="100%" height="100%" viewBox="0 0 '+TERRAIN_W+' '+TERRAIN_H+'" preserveAspectRatio="none"><defs><pattern id="hexp" width="'+f(w)+'" height="'+f(hh)+'" patternUnits="userSpaceOnUse"><path d="'+d+'" fill="none" vector-effect="non-scaling-stroke"/></pattern></defs><rect width="100%" height="100%" fill="url(#hexp)"/></svg>'});
  }
  return h('div',{class:'map-grid-ov',style:{backgroundSize:(s/TERRAIN_W*100)+'% '+(s/TERRAIN_H*100)+'%'}});
}

/* ---------- elementos HTML das entidades (sem listeners: o gesto é delegado ao viewport) ---------- */
function tokenRefInfo(t){
  const c=S.campaign; if(!c||!t.refId) return null;
  if(t.kind==='player'){ const p=(c.players||[]).find(x=>x.id===t.refId); return p?{name:p.name, img:(p.sheet&&p.sheet.photo)||null}:null; }
  if(t.kind==='enemy'){ const s=(c.bestiary.enemies||[]).find(x=>x.id===t.refId); return s?{name:s.name, img:s.image||null}:null; }
  if(t.kind==='npc'){ const n=(c.bestiary.npcs||[]).find(x=>x.id===t.refId); return n?{name:n.name, img:n.image||null}:null; }
  return null;
}
function kindEmoji(k){ return {player:'🧍', enemy:'🐉', npc:'🎭'}[k]||'❔'; }
function tokenEl(t){
  const ref=tokenRefInfo(t), px=Math.round(34*(t.size||100)/100);
  const el=h('div',{class:'map-token kind-'+t.kind+(t.hidden?' hidden':'')+(t.locked?' lockd':''),'data-et':'token','data-eid':t.id,
    style:{left:t.xPct+'%',top:t.yPct+'%',width:px+'px',height:px+'px'},title:(ref&&ref.name)||t.label});
  const img=t.img||(ref&&ref.img)||null;
  const inner=img?h('div',{class:'map-token-face',style:{backgroundImage:'url('+img+')'}})
    :h('div',{class:'map-token-face glyph',style:{fontSize:Math.round(px*0.5)+'px'}},(t.icon&&t.icon.trim())?t.icon.trim():(t.refId?kindEmoji(t.kind):((t.label||'?').trim().charAt(0)||'?')));
  inner.style.borderColor=t.color||'#94a3b8';
  el.appendChild(inner);
  if(t.marks&&t.marks.length) el.appendChild(h('div',{class:'map-token-marks'},t.marks.slice(0,4).map(mk=>h('span',{},mk))));
  el.appendChild(h('div',{class:'map-token-lbl'},(ref&&ref.name)||t.label||''));
  if(t.hp!=null&&t.hpMax){ const pc=Math.max(0,Math.min(100,(t.hp/t.hpMax)*100)); el.appendChild(h('div',{class:'map-token-hp'},h('span',{style:{width:pc+'%'}}))); }
  return el;
}
function abrirFichaJogador(refId){
  if(!refId) return (typeof showToast==='function'?showToast('Token genérico: ligue-o a um jogador na paleta.'):alert('Token genérico.'));
  const c=S.campaign, p=(c.players||[]).find(x=>x.id===refId);
  if(!p) return showToast('Jogador não está mais na mesa.');
  if(!p.sheet) return showToast('Esse jogador ainda não tem ficha importada.');
  limpaSel(); S.ui.verFicha=p.id;
  if(typeof irMtab==='function') irMtab('jogadores'); else render();
}
function propEl(p){
  const cls=(p.hidden?' hidden':'')+(p.locked?' lockd':'');
  if(p.shape==='block')
    return h('div',{class:'map-prop block fill-'+(p.fill||'wall')+cls,'data-et':'prop','data-eid':p.id,
      style:{left:p.xPct+'%',top:p.yPct+'%',width:p.w+'%',height:p.h+'%',transform:'translate(-50%,-50%) rotate('+(p.rot||0)+'deg)'},title:p.label||''},
      p.label?h('span',{class:'map-prop-lbl'},p.label):null);
  const px=Math.round(30*(p.size||100)/100);
  return h('div',{class:'map-prop stamp'+cls,'data-et':'prop','data-eid':p.id,
    style:{left:p.xPct+'%',top:p.yPct+'%',fontSize:px+'px',transform:'translate(-50%,-50%) rotate('+(p.rot||0)+'deg)'},title:p.label||''},p.icon);
}
function kingdomEl(k){
  return h('div',{class:'map-kingdom'+(k.hidden?' hidden':''),'data-et':'king','data-eid':k.id,
    style:Object.assign({left:k.xPct+'%',top:k.yPct+'%',width:(k.radius*2)+'%'},k.gen?{border:'none',background:'none'}:{
      background:'radial-gradient(circle, '+hexA(k.color,.42)+' 0%, '+hexA(k.color,.14)+' 65%, transparent 72%)',borderColor:hexA(k.color,.8)}),title:k.name},
    h('span',{class:'map-kingdom-lbl',style:{background:k.color}},k.name));
}
function pinEl(p){
  return h('div',{class:'map-pin'+(p.hidden?' hidden':''),'data-et':'pin','data-eid':p.id,style:{left:p.xPct+'%',top:p.yPct+'%'},title:(p.label||'')+(p.note?(' — '+p.note):'')},
    h('span',{class:'map-pin-dot'},p.icon||'📍'),p.label?h('span',{class:'map-pin-lbl'},p.label):null);
}
function hexA(hex,a){
  const s=String(hex||'#888').replace('#',''); const n=s.length===3?s.split('').map(c=>c+c).join(''):s;
  const r=parseInt(n.slice(0,2),16)||136, g=parseInt(n.slice(2,4),16)||136, b=parseInt(n.slice(4,6),16)||136;
  return 'rgba('+r+','+g+','+b+','+a+')';
}

/* ============================ TERRENO (PINCEL) ============================
   Canvas raster persistente por mapa (fonte da verdade em memória: _terr.cv). */
let _terr={id:null,cv:null};
let _noiseTile=null;
function noiseTile(){
  if(_noiseTile) return _noiseTile;
  const n=document.createElement('canvas'); n.width=n.height=150;
  const ctx=n.getContext('2d'), im=ctx.createImageData(150,150);
  for(let i=0;i<im.data.length;i+=4){ const v=170+((Math.random()*85)|0); im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; }
  ctx.putImageData(im,0,0); _noiseTile=n; return n;
}
function terrainReset(){ _terr={id:null,cv:null}; }
function lumpPath(x,y,r){
  const N=16, pts=[];
  for(let i=0;i<N;i++){ const a=i/N*Math.PI*2, rr=r*(0.80+Math.random()*0.34); pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]); }
  const p=new Path2D(), mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const m0=mid(pts[N-1],pts[0]); p.moveTo(m0[0],m0[1]);
  for(let i=0;i<N;i++){ const cur=pts[i], nx=pts[(i+1)%N], mm=mid(cur,nx); p.quadraticCurveTo(cur[0],cur[1],mm[0],mm[1]); }
  p.closePath(); return p;
}
function stampTerrain(ctx,x,y,r,mat,erase){
  const p=lumpPath(x,y,r);
  ctx.save();
  if(erase){ ctx.globalCompositeOperation='destination-out'; ctx.fill(p); ctx.restore(); return; }
  ctx.fillStyle=mat.color; ctx.fill(p);
  ctx.clip(p);
  ctx.globalAlpha=0.45; ctx.fillStyle=mat.color2;
  for(let i=0;i<3;i++){ ctx.fill(lumpPath(x+(Math.random()-0.5)*r,y+(Math.random()-0.5)*r,r*(0.3+Math.random()*0.4))); }
  ctx.globalAlpha=0.16; ctx.globalCompositeOperation='overlay';
  const t=noiseTile(), ox=x-r-(Math.random()*40), oy=y-r-(Math.random()*40);
  for(let gx=ox; gx<x+r; gx+=t.width) for(let gy=oy; gy<y+r; gy+=t.height) ctx.drawImage(t,gx,gy);
  ctx.restore();
}
function terrainCanvasFor(m){
  if(_terr.id===m.id && _terr.cv){ _terr.cv.className='map-terrain'; return _terr.cv; }
  const cv=document.createElement('canvas'); cv.width=TERRAIN_W; cv.height=TERRAIN_H; cv.className='map-terrain';
  _terr={id:m.id,cv};
  if(m.terrain){ const img=new Image(); img.onload=()=>{ try{ cv.getContext('2d').drawImage(img,0,0,TERRAIN_W,TERRAIN_H); }catch(e){} }; img.src=m.terrain; }
  return cv;
}
/* redesenha o canvas a partir de m.terrain (usado pelo desfazer/refazer) */
function terrainReload(m){
  const cv=terrainCanvasFor(m), ctx=cv.getContext('2d');
  if(!m.terrain){ ctx.clearRect(0,0,cv.width,cv.height); return; }
  const img=new Image(); img.onload=()=>{ ctx.clearRect(0,0,cv.width,cv.height); try{ ctx.drawImage(img,0,0,cv.width,cv.height); }catch(e){} }; img.src=m.terrain;
}
function salvaTerreno(cv,m){
  try{ let u=cv.toDataURL('image/webp',0.92); if(u.indexOf('data:image/webp')!==0) u=cv.toDataURL('image/png'); m.terrain=u; }catch(e){}
  persistSoon();
}
/* Balde: preenche a região contígua do terreno clicada com o material. */
function floodTerrain(m,ux,uy,mat){
  const cv=terrainCanvasFor(m), ctx=cv.getContext('2d'), W=cv.width, H=cv.height;
  const sx=Math.round(ux/U_W*W), sy=Math.round(uy/U_H*H);
  if(sx<0||sy<0||sx>=W||sy>=H) return;
  const id=ctx.getImageData(0,0,W,H), d=id.data, st=(sy*W+sx)*4;
  const tr=d[st], tg=d[st+1], tb=d[st+2], ta=d[st+3], tol=54;
  const ok=i=>{ const a=d[i+3]; if(ta<12) return a<12; if(a<12) return false; return Math.abs(d[i]-tr)+Math.abs(d[i+1]-tg)+Math.abs(d[i+2]-tb)<=tol; };
  const vis=new Uint8Array(W*H), stack=[sx,sy]; let n=0;
  while(stack.length){
    const y=stack.pop(), x0=stack.pop(); let x=x0;
    while(x>=0 && !vis[y*W+x] && ok((y*W+x)*4)) x--;
    x++;
    let up=false, dn=false;
    while(x<W && !vis[y*W+x] && ok((y*W+x)*4)){
      vis[y*W+x]=1; n++;
      if(y>0){ const o=!vis[(y-1)*W+x]&&ok(((y-1)*W+x)*4); if(o&&!up){ stack.push(x,y-1); up=true; } else if(!o) up=false; }
      if(y<H-1){ const o=!vis[(y+1)*W+x]&&ok(((y+1)*W+x)*4); if(o&&!dn){ stack.push(x,y+1); dn=true; } else if(!o) dn=false; }
      x++;
    }
  }
  if(!n) return;
  const tmp=document.createElement('canvas'); tmp.width=W; tmp.height=H;
  const tx=tmp.getContext('2d'), out=tx.createImageData(W,H), c=toHex(mat.color), R=parseInt(c.slice(1,3),16), Gc=parseInt(c.slice(3,5),16), B=parseInt(c.slice(5,7),16);
  for(let i=0;i<W*H;i++) if(vis[i]){ const o=i*4; out.data[o]=R; out.data[o+1]=Gc; out.data[o+2]=B; out.data[o+3]=255; }
  tx.putImageData(out,0,0);
  tx.globalCompositeOperation='source-atop'; tx.globalAlpha=.14;
  const t=noiseTile(); for(let gx=0;gx<W;gx+=t.width) for(let gy=0;gy<H;gy+=t.height) tx.drawImage(t,gx,gy);
  ctx.drawImage(tmp,0,0);
  salvaTerreno(cv,m); mpToast('Área preenchida');
}
/* Funde o fundo (imagem gerada/importada) no terreno: depois o pincel/borracha editam tudo. */
function converterFundo(m){
  if(!m.image) return;
  const img=new Image();
  img.onload=()=>{
    histPush();
    const cv=terrainCanvasFor(m), W=cv.width, H=cv.height, tmp=document.createElement('canvas'); tmp.width=W; tmp.height=H;
    const tx=tmp.getContext('2d'), sc=Math.max(W/img.width,H/img.height), w=img.width*sc, hh=img.height*sc;
    tx.drawImage(img,(W-w)/2,(H-hh)/2,w,hh); tx.drawImage(cv,0,0);
    const ctx=cv.getContext('2d'); ctx.clearRect(0,0,W,H); ctx.drawImage(tmp,0,0);
    m.image=null; salvaTerreno(cv,m); persistNow(); render(); setTimeout(()=>mpToast('Fundo convertido: agora é pintável e apagável'),60);
  };
  img.src=m.image;
}

/* ---------- Snap à grade (em %) ---------- */
function snapPct(m,x,y){
  if(!(m.grid&&m.grid.on&&m.grid.snap)) return {x,y};
  if(m.grid.type!=='hex') return {x:snapPctX(m,x),y:snapPctY(m,y)};
  const hh=m.grid.size, r=hh/Math.sqrt(3), px=x/100*TERRAIN_W, py=y/100*TERRAIN_H;
  let best=null,bd=Infinity;
  [[r,hh/2],[2.5*r,0]].forEach(([ox,oy])=>{
    const cxn=ox+3*r*Math.round((px-ox)/(3*r)), cyn=oy+hh*Math.round((py-oy)/hh), d=Math.hypot(px-cxn,py-cyn);
    if(d<bd){ bd=d; best=[cxn,cyn]; } });
  return {x:Math.max(0,Math.min(100,best[0]/TERRAIN_W*100)), y:Math.max(0,Math.min(100,best[1]/TERRAIN_H*100))};
}
function snapPctX(m,x){ if(!(m.grid&&m.grid.on&&m.grid.snap)) return x; const cell=m.grid.size/TERRAIN_W*100; return cell>0?Math.round(x/cell)*cell:x; }
function snapPctY(m,y){ if(!(m.grid&&m.grid.on&&m.grid.snap)) return y; const cell=m.grid.size/TERRAIN_H*100; return cell>0?Math.round(y/cell)*cell:y; }

/* ============================ VIEWPORT: ZOOM / PAN ============================
   A área do mapa tem 1000×625 px lógicos e recebe translate+scale (S.ui.mapView).
   v.fit = true → enquadra sozinho e reajusta ao redimensionar a janela. */
function mapView(m){ const v=S.ui.mapView; return (v&&v.id===m.id)?v:(S.ui.mapView={id:m.id,s:1,x:0,y:0,fit:true}); }
function aplicaView(){
  const m=curMap(), vp=MP.vp, area=MP.area; if(!m||!vp||!area) return;
  const v=mapView(m), w=vp.clientWidth, hh=vp.clientHeight;
  if(!w||!hh) return;
  if(v.fit){ v.s=Math.max(.1,Math.min(w/U_W,hh/U_H)*0.96); v.x=(w-U_W*v.s)/2; v.y=(hh-U_H*v.s)/2; }
  v.s=Math.max(.1,Math.min(8,v.s));
  const keep=80, aw=U_W*v.s, ah=U_H*v.s;
  v.x=Math.min(w-keep,Math.max(keep-aw,v.x)); v.y=Math.min(hh-keep,Math.max(keep-ah,v.y));
  area.style.transform='translate('+v.x+'px,'+v.y+'px) scale('+v.s+')';
  area.style.setProperty('--z',v.s);
  const lb=vp.querySelector('.map-zoom-lbl'); if(lb) lb.textContent=Math.round(v.s*100)+'%';
  atualizaEscala(vp,m);
}
function zoomPara(f,cx,cy){
  const m=curMap(), vp=MP.vp; if(!m||!vp) return;
  const v=mapView(m), s2=Math.max(.1,Math.min(8,v.s*f));
  if(cx==null){ cx=vp.clientWidth/2; cy=vp.clientHeight/2; }
  v.x=cx-(cx-v.x)*(s2/v.s); v.y=cy-(cy-v.y)*(s2/v.s); v.s=s2; v.fit=false; aplicaView();
}
function ajustaVista(){ const m=curMap(); if(!m) return; mapView(m).fit=true; aplicaView(); }
function zoomCtl(){
  const b=(t,tt,fn)=>h('button',{class:'map-zbtn',title:tt,'aria-label':tt,onclick:fn},t);
  return h('div',{class:'map-zoom'},
    b('+','Aproximar (+)',()=>zoomPara(1.3)), h('span',{class:'map-zoom-lbl'},'100%'), b('−','Afastar (−)',()=>zoomPara(1/1.3)),
    b('⟲','Enquadrar o mapa (0)',ajustaVista));
}
function ligaViewport(vp){
  vp.addEventListener('wheel',ev=>{ ev.preventDefault(); const r=vp.getBoundingClientRect();
    zoomPara(ev.deltaY<0?1.15:1/1.15,ev.clientX-r.left,ev.clientY-r.top); },{passive:false});
  vp.addEventListener('pointerdown',onVpDown);
  vp.addEventListener('dblclick',onVpDbl);
  vp.addEventListener('contextmenu',ev=>{ ev.preventDefault(); });
}
function onVpDbl(ev){
  const m=curMap(); if(!m) return;
  if(S.ui.draft){ finishDraft(); return; }
  const vt=ev.target.closest&&ev.target.closest('[data-h="v"]');
  if(vt){ const sel=selEnts(m); if(sel.length===1&&sel[0].e.t==='path'){ const e=sel[0].e, min=e.closed?3:2;
      if(e.pts.length>min){ histPush(); e.pts.splice(+vt.dataset.i,1); markEdited(e); mapRefresh(); panelRefresh(); persistSoon(); } } return; }
  const el=ev.target.closest&&ev.target.closest('[data-eid]'); if(!el) return;
  const ref={t:el.dataset.et,id:el.dataset.eid}, e=entGet(m,ref); if(!e) return;
  if(ref.t==='token'&&e.kind==='player') return abrirFichaJogador(e.refId);
  if(ref.t==='obj'&&e.t==='text'){ S.ui.mpTab='props'; panelRefresh(); setTimeout(()=>{ const i=MP.ws&&MP.ws.querySelector('[data-focus="text"]'); if(i){ i.focus(); i.select(); } },30); return; }
  if(ref.t!=='obj'){ const i=MP.ws&&MP.ws.querySelector('.mp-name'); if(i){ i.focus(); i.select(); } }
}

/* ============================ ESCALA, BÚSSOLA ============================ */
function scaleCfg(m){
  if(!m.scale){ const w=isWorldKind(m.kind); m.scale={on:w,total:w?2000:(m.kind==='local'?400:40),unit:w?'km':'m'}; }
  return m.scale;
}
function compassOn(m){ return m.compass==null?isWorldKind(m.kind):!!m.compass; }
function niceNum(v){ if(!(v>0)) return 1; const p=Math.pow(10,Math.floor(Math.log10(v))), f=v/p; return (f>=5?5:f>=2?2:1)*p; }
function atualizaEscala(vp,m){
  const box=vp.querySelector('.map-scale'); if(!box) return;
  const c=scaleCfg(m), v=mapView(m), target=110;
  const unitsPerPx=c.total/U_W/v.s, real=target*unitsPerPx, n=niceNum(real);
  box.querySelector('.map-scale-bar').style.width=(n/unitsPerPx)+'px';
  box.querySelector('.map-scale-lbl').textContent=n.toLocaleString('pt-BR')+' '+c.unit;
}
function compassEl(){
  return h('div',{class:'map-compass','aria-hidden':'true',html:'<svg viewBox="-50 -58 100 108" width="62" height="66"><circle r="38" fill="rgba(11,16,32,.55)" stroke="currentColor" stroke-width="2"/><path d="M0,-32 L9,0 L0,8 L-9,0Z" fill="#e11d48"/><path d="M0,32 L9,0 L0,-8 L-9,0Z" fill="currentColor" opacity=".75"/><text y="-43" text-anchor="middle" font-size="15" font-weight="800" fill="currentColor">N</text></svg>'});
}

/* ============================ POPOVERS ============================ */
function popover(m){
  const k=S.ui.mpPop;
  const def={maps:['Mapas',mapsPop],pieces:['Peças e tokens',piecesPop],gen:['Gerador procedural',genPop],cfg:['Configurar o mapa',cfgPop],notes:['Anotações do mapa',notesPop],keys:['Atalhos do teclado',keysPop]}[k];
  if(!def) return h('span');
  return h('div',{class:'mp-pop pop-'+k,role:'dialog','aria-label':def[0]},
    h('div',{class:'mp-pop-h'},h('strong',{},def[0]),h('button',{class:'mp-ib',title:'Fechar (Esc)','aria-label':'Fechar',onclick:()=>{ S.ui.mpPop=null; render(); }},'✕')),
    h('div',{class:'mp-pop-b'},def[1](m)));
}
function mapsPop(m){
  const c=S.campaign;
  const rows=c.maps.map(x=>{ const km=mapKindMeta(x.kind);
    return h('div',{class:'mp-maprow'+(x.id===m.id?' on':'')},
      h('button',{class:'mp-maprow-b',onclick:()=>{ c.currentMapId=x.id; limpaSel(); S.ui.mapTool='select'; S.ui.mpPop=null; S.ui.draft=null; render(); }},
        h('span',{class:'ic'},km.ic),h('span',{class:'nm'},x.name),h('span',{class:'k'},km.nome)),
      h('button',{class:'mp-ib',title:'Duplicar este mapa','aria-label':'Duplicar '+x.name,onclick:()=>{ const cp=JSON.parse(JSON.stringify(x)); cp.id=uid(); cp.name=x.name+' (cópia)'; c.maps.push(cp); c.currentMapId=cp.id; limpaSel(); S.ui.mpPop=null; render(); }},'⧉'),
      h('button',{class:'mp-ib danger',title:'Excluir este mapa','aria-label':'Excluir '+x.name,onclick:()=>uiConfirmFn('Excluir o mapa "'+x.name+'"? Esta ação não pode ser desfeita.',()=>{
        c.maps=c.maps.filter(y=>y.id!==x.id); delete _H[x.id]; c.currentMapId=c.maps[0]?c.maps[0].id:null; limpaSel(); S.ui.mpPop=null; render(); })},'🗑'));
  });
  return h('div',{},...rows,h('button',{class:'btn primary mp-wide',onclick:()=>{ S.ui.novoMapa=true; S.ui.mpPop=null; render(); }},'➕ Novo mapa'));
}
const BLOCK_PRESET={parede:'wall',sala:'floor',agua:'water',grama:'grass',gelo:'ice'};
function piecesPop(m){
  const world=isWorldKind(m.kind), tab=S.ui.pieceTab||'pecas';
  const tabs=[['pecas','Peças'],['locais','Locais'],['tokens','Tokens']].concat(world?[['reinos','Reinos']]:[]);
  const head=h('div',{class:'mp-ptabs sm'},tabs.map(([k,t])=>h('button',{class:'mp-ptab'+(tab===k?' on':''),onclick:()=>{ S.ui.pieceTab=k; render(); }},t)));
  let body;
  if(tab==='pecas'){
    const useRect=p=>{ (S.ui.mpPreset||(S.ui.mpPreset={})).rect=p; const o=mpOpt(); o.color=null; o.sw=null; o.dash=null; setTool('rect'); };
    const useLine=p=>{ (S.ui.mpPreset||(S.ui.mpPreset={})).line=p; const o=mpOpt(); o.color=null; o.sw=null; o.dash=null; setTool('line'); };
    const pick=(ic,nome,tip,fn,armed,block)=>h('button',{class:'prop-pick'+(block?' block':'')+(armed?' armed':''),title:tip,onclick:fn},h('span',{class:'prop-pick-ic'},ic),h('span',{class:'prop-pick-l'},nome));
    const groups=PROP_CATALOG.map(g=>h('div',{class:'prop-group'},
      h('div',{class:'prop-group-t',style:{color:g.cor}},g.cat),
      h('div',{class:'prop-pal'},g.itens.filter(it=>it.k!=='porta').map(it=>{
        if(it.shape==='block'&&BLOCK_PRESET[it.k]) return pick(it.ic,it.nome,'Desenhar '+it.nome.toLowerCase()+' arrastando no mapa',()=>useRect(BLOCK_PRESET[it.k]),false,true);
        const armed=S.ui.stamp&&S.ui.stamp.t==='prop'&&S.ui.stamp.k===it.k;
        return pick(it.ic,it.nome,'Carimbar '+it.nome,()=>armarStamp({t:'prop',k:it.k}),armed,it.shape==='block');
      }))));
    groups.unshift(h('div',{class:'prop-group'},h('div',{class:'prop-group-t',style:{color:'#38bdf8'}},'Construção e cidade'),
      h('div',{class:'prop-pal'},
        pick('🚪','Porta','Colocar porta (objeto editável)',()=>armarStamp({t:'door'}),S.ui.stamp&&S.ui.stamp.t==='door'),
        pick('🏠','Casa','Desenhar casa arrastando',()=>useRect('house'),false,true),
        pick('🌳','Árvore (forma)','Árvore vetorial redimensionável',()=>armarStamp({t:'tree'}),S.ui.stamp&&S.ui.stamp.t==='tree'),
        pick('⛲','Praça','Desenhar praça',()=>useRect('plaza'),false,true),
        pick('🧱','Muro','Traçar muro/cerca por pontos',()=>useLine('fence'),false,true),
        pick('🛣️','Estrada','Traçar estrada por pontos',()=>useLine('road'),false,true),
        pick('〰️','Rio','Traçar rio por pontos',()=>useLine('river'),false,true))));
    body=h('div',{class:'prop-groups'},...groups);
  } else if(tab==='locais'){
    body=h('div',{},h('div',{class:'hint'},'Marcadores de local — clique e depois no mapa.'),
      h('div',{class:'pin-picker'},PIN_ICONS.map(ic=>{ const armed=S.ui.stamp&&S.ui.stamp.t==='pin'&&S.ui.stamp.ic===ic;
        return h('button',{class:'pin-pick'+(armed?' on':''),title:'Carimbar '+ic,'aria-label':'Local '+ic,onclick:()=>armarStamp({t:'pin',ic})},ic); })));
  } else if(tab==='tokens'){
    const tpb=(kind,label,refId,cor,ic)=>{ const armed=S.ui.stamp&&S.ui.stamp.t==='token'&&S.ui.stamp.refId===refId&&S.ui.stamp.kind===kind;
      return h('button',{class:'btn sm'+(armed?' armed':''),style:{borderLeft:'3px solid '+cor},onclick:()=>armarStamp({t:'token',kind,label,refId})},ic+' '+label); };
    const c=S.campaign;
    const sec=(t,list)=>list.length?h('div',{class:'mp-tsec'},h('div',{class:'prop-group-t'},t),h('div',{class:'row wrapf'},...list)):null;
    body=h('div',{},
      sec('Jogadores',c.players.map(p=>tpb('player',p.name,p.id,'#10b981','🧍'))),
      sec('Inimigos',c.bestiary.enemies.map(s=>tpb('enemy',s.name,s.id,'#e11d48','🐉'))),
      sec('NPCs',c.bestiary.npcs.map(n=>tpb('npc',n.name,n.id,'#6366f1','🎭'))),
      h('div',{class:'mp-tsec'},h('button',{class:'btn sm ghost',onclick:()=>armarStamp({t:'token',kind:'npc',label:'?',refId:null})},'+ token genérico')),
      (!c.players.length&&!c.bestiary.enemies.length&&!c.bestiary.npcs.length)?h('div',{class:'hint'},'Cadastre jogadores/inimigos/NPCs nas outras seções para colocá-los aqui — ou use o token genérico.'):null);
  } else {
    const w=m.world.continent;
    const shapes=h('div',{class:'map-opts sm'},WORLD_SHAPES.map(s=>h('button',{class:'map-opt sm'+(w.shape===s.k?' on':''),title:s.nome,onclick:()=>{ histPush(); w.shape=s.k; mapRefresh(); render(); }},s.nome)));
    body=h('div',{},h('div',{class:'hint'},'Contorno decorativo do continente e reinos (editáveis com alças).'),shapes,
      h('div',{class:'row wrapf',style:{gap:'12px',margin:'8px 0'}},
        field('Cor da terra',h('input',{type:'color',class:'in color',value:toHex(w.color),onchange:e=>{ histPush(); w.color=e.target.value; mapRefresh(); persistSoon(); }})),
        w.shape!=='none'?field('Girar',h('input',{type:'range',min:'0',max:'360',value:w.rot,oninput:e=>{ histPush('cont'); w.rot=parseInt(e.target.value)||0; mapRefresh(); persistSoon(); }})):null,
        w.shape!=='none'?field('Tamanho',h('input',{type:'range',min:'50',max:'100',value:w.scale,oninput:e=>{ histPush('cont'); w.scale=parseInt(e.target.value)||100; mapRefresh(); persistSoon(); }})):null),
      h('button',{class:'btn sm'+(S.ui.stamp&&S.ui.stamp.t==='kingdom'?' armed':''),style:{borderLeft:'3px solid #e11d48'},onclick:()=>armarStamp({t:'kingdom'})},'🏴 Carimbar reino'));
  }
  return h('div',{},head,body);
}
function genOpts(){
  const g=S.ui.gen||(S.ui.gen={}), d={seed:novaSemente(),tipo:'continente',agua:55,reinos:6,salas:12,tamanho:3,rio:true};
  Object.keys(d).forEach(k=>{ if(g[k]==null) g[k]=d[k]; });
  return g;
}
function genPop(m){
  const gens=geradoresDoMapa(m.kind), o=genOpts();
  if(!gens.some(x=>x.k===o.g)) o.g=gens[0].k;
  const rng=(label,key,min,max,fmt)=>{ const val=h('span',{class:'mp-val'},fmt?fmt(o[key]):o[key]);
    return prow(label,h('div',{class:'mp-rng'},h('input',{type:'range',min,max,value:o[key],'aria-label':label,oninput:e=>{ o[key]=parseInt(e.target.value); val.textContent=fmt?fmt(o[key]):o[key]; }}),val)); };
  const ctl=[];
  if(gens.length>1) ctl.push(h('div',{class:'map-opts sm'},gens.map(x=>h('button',{class:'map-opt sm'+(o.g===x.k?' on':''),onclick:()=>{ o.g=x.k; render(); }},x.ic+' '+x.nome))));
  if(o.g==='mundo'){
    ctl.push(prow('Forma',h('select',{class:'in mp-sel',onchange:e=>{ o.tipo=e.target.value; }},[['continente','Continente'],['arquipelago','Arquipélago'],['pangeia','Pangeia']].map(([v,t])=>h('option',{value:v,selected:o.tipo===v},t)))));
    ctl.push(rng('Água','agua',20,80,v=>v+'%')); ctl.push(rng('Reinos','reinos',2,12));
  }
  if(o.g==='masmorra') ctl.push(rng('Salas','salas',4,24));
  if(o.g==='vila'){ ctl.push(rng('Tamanho','tamanho',2,5)); ctl.push(h('label',{class:'chk mp-chk'},h('input',{type:'checkbox',checked:o.rio!==false,onchange:e=>{ o.rio=e.target.checked; }}),' Rio atravessando')); }
  const rodar=(btn,nova)=>{
    const go=()=>{
      if(nova) o.seed=novaSemente();
      btn.textContent='⏳ Gerando…'; btn.disabled=true;
      setTimeout(()=>{ try{ histPush(); gerarMapa(m,o.g,Object.assign({},o)); mapView(m).fit=true; limpaSel(); S.ui.mpPop=null; S.ui.mpTab='objs'; render(); setTimeout(()=>mpToast('Mapa gerado · semente '+o.seed+' · tudo é editável (aba Objetos)'),80); }
        catch(e){ console.error(e); btn.disabled=false; btn.textContent='🎲 Gerar'; mpToast('Não foi possível gerar: '+e.message); } },30);
    };
    if(m.image && !m.genMeta) uiConfirmFn('Isto substitui a imagem de fundo atual. Continuar?',go); else go();
  };
  return h('div',{},
    h('div',{class:'hint'},'Gera o mapa como OBJETOS editáveis (salas, paredes, casas, rios…). Mesma semente = mesmo mapa.'),
    ...ctl,
    prow('Semente',h('input',{class:'in',value:o.seed,'aria-label':'Semente',onchange:e=>{ o.seed=e.target.value.trim()||novaSemente(); }})),
    h('div',{class:'row wrapf',style:{marginTop:'10px'}},
      h('button',{class:'btn primary',onclick:e=>rodar(e.currentTarget,false)},m.genMeta?'🔁 Regenerar':'🎲 Gerar'),
      h('button',{class:'btn',title:'Nova semente aleatória e gerar',onclick:e=>rodar(e.currentTarget,true)},'🔀 Aleatório')),
    h('div',{class:'hint'},'Regenerar troca só o que foi gerado e não foi editado — o que você criou ou mexeu fica. Desfaz com Ctrl+Z.'));
}
function cfgPop(m){
  const sc=scaleCfg(m);
  const imgInp=h('input',{type:'file',accept:'image/*',class:'hide',onchange:e=>{ readMapImage(e.target.files[0],data=>{ histPush(); m.image=data; m.genMeta=null; render(); }); e.target.value=''; }});
  const kindsSel=h('div',{class:'map-opts sm'},MAP_KINDS.map(t=>h('button',{class:'map-opt sm'+(m.kind===t.k?' on':''),title:t.nome,'aria-label':t.nome,onclick:()=>{ m.kind=t.k; limpaSel(); render(); }},t.ic)));
  const themeSel=h('div',{class:'map-opts sm'},MAP_THEMES.map(t=>h('button',{class:'map-opt theme sm '+t.k+(m.theme===t.k?' on':''),title:t.nome,'aria-label':t.nome,onclick:()=>{ m.theme=t.k; render(); }},t.ic)));
  const chk=(l,get,set)=>h('label',{class:'chk mp-chk'},h('input',{type:'checkbox',checked:!!get(),onchange:e=>{ set(e.target.checked); render(); }}),' '+l);
  const sel=(v,t,cur)=>h('option',{value:v,selected:cur===v},t);
  return h('div',{},
    prow('Nome',h('input',{class:'in',value:m.name,'aria-label':'Nome do mapa',onchange:e=>{ m.name=e.target.value; render(); }})),
    prow('Tipo',kindsSel), prow('Era',themeSel),
    h('div',{class:'mp-sub'},'Grade'),
    chk('Mostrar grade',()=>m.grid.on,v=>{ m.grid.on=v; }),
    m.grid.on?prow('Formato',h('select',{class:'in mp-sel','aria-label':'Tipo de grade',onchange:e=>{ m.grid.type=e.target.value; render(); }},sel('square','Quadrada',m.grid.type||'square'),sel('hex','Hexagonal',m.grid.type||'square'))):null,
    m.grid.on?prow('Célula',h('input',{class:'in mp-num',type:'number',value:Math.round(m.grid.size*10)/10,'aria-label':'Tamanho da célula',onchange:e=>{ m.grid.size=Math.max(10,parseFloat(e.target.value)||50); render(); }})):null,
    m.grid.on?chk('Encaixar na grade',()=>m.grid.snap,v=>{ m.grid.snap=v; }):null,
    h('div',{class:'mp-sub'},'Escala e enfeites'),
    chk('Escala de distância',()=>sc.on,v=>{ sc.on=v; }),
    sc.on?prow('Largura do mapa',h('input',{class:'in mp-num',type:'number',value:sc.total,'aria-label':'Largura total do mapa',onchange:e=>{ sc.total=Math.max(1,parseFloat(e.target.value)||1); render(); }}),
      h('input',{class:'in mp-num',value:sc.unit,'aria-label':'Unidade',onchange:e=>{ sc.unit=e.target.value||'u'; render(); }})):null,
    chk('🧭 Bússola',()=>compassOn(m),v=>{ m.compass=v; }), chk('Nomes visíveis',()=>m.showLabels!==false,v=>{ m.showLabels=v; }),
    h('div',{class:'mp-sub'},'Fundo'),
    h('div',{class:'row wrapf'},
      h('button',{class:'btn sm',onclick:()=>imgInp.click()},m.image?'🖼️ Trocar imagem':'🖼️ Imagem de fundo'),imgInp,
      m.image?h('button',{class:'btn sm ghost',onclick:()=>uiConfirmFn('Remover a imagem de fundo?',()=>{ histPush(); m.image=null; m.genMeta=null; render(); })},'Remover'):null,
      m.image?h('button',{class:'btn sm ghost',title:'Funde a imagem no terreno: pincel e borracha passam a editá-la',onclick:()=>converterFundo(m)},'🎨 Tornar pintável'):null),
    prow('Cor de fundo',h('input',{type:'color',class:'mp-color',value:toHex(m.bg||'#0e1424'),'aria-label':'Cor de fundo',onchange:e=>{ histPush(); m.bg=e.target.value; mapRefresh(); persistSoon(); }}),
      m.bg?h('button',{class:'btn sm ghost',onclick:()=>{ histPush(); m.bg=null; render(); }},'padrão'):null),
    m.fx&&(m.fx.hatch||m.fx.goo)?chk('Hachuras de masmorra',()=>m.fx.hatch,v=>{ m.fx.hatch=v?(m.fx.hatchColor||paletaMapa(m.theme).hatch):null; if(v&&!m.fx.hatchColor) m.fx.hatchColor=m.fx.hatch; mapRefresh(); }):null);
}
function notesPop(m){
  return h('div',{},h('textarea',{class:'in',rows:'10',placeholder:'Segredos, rotas, encontros…','aria-label':'Anotações do mapa',onchange:e=>{ m.note=e.target.value; persistNow(); }},m.note||''));
}
function keysPop(){
  const rows=[['V','Editar / selecionar'],['H','Mover a vista (ou Espaço)'],['B / E / G','Pincel / borracha / balde'],['R','Sala, parede, casa, forma'],['L / P','Linha / região'],['T','Texto'],['M','Régua'],['A','Área de magia'],
    ['Ctrl+Z / Shift+Z','Desfazer / refazer tudo'],['Ctrl+C / V / D','Copiar / colar / duplicar'],['Delete','Excluir'],['Ctrl+A','Selecionar tudo'],['Ctrl+G','Agrupar (Shift desagrupa)'],['Ctrl+] / [','Frente / trás'],
    ['Setas','Mover 1 (Shift = grade)'],['Shift+clique','Somar à seleção'],['+ − 0','Zoom / enquadrar'],['[ ]','Tamanho do pincel'],['Enter / Esc','Concluir / cancelar'],['Duplo clique','Abrir ficha / remover ponto']];
  return h('div',{class:'mp-keys'},rows.map(([k,d])=>h('div',{class:'r'},h('kbd',{},k),h('span',{},d))));
}

/* ============================ EXPORTAR PNG ============================ */
function exportarMapaPNG(m){
  const F=2, W=U_W*F, H=U_H*F, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const cx=cv.getContext('2d'), px=p=>p/100*W, py=p=>p/100*H;
  const fim=()=>{
    if(_terr.id===m.id&&_terr.cv) cx.drawImage(_terr.cv,0,0,W,H);
    const finish2=()=>{
      if(m.grid.on){ cx.strokeStyle='rgba(148,163,184,.55)'; cx.lineWidth=1; cx.beginPath(); const s=m.grid.size*F;
        if(m.grid.type==='hex'){ const hh=s, r=hh/Math.sqrt(3);
          const hex=(a,b)=>{ cx.moveTo(a+r,b); for(let k=1;k<=6;k++) cx.lineTo(a+r*Math.cos(k*Math.PI/3),b+r*Math.sin(k*Math.PI/3)); };
          for(let i=-1;i<W/(3*r)+1;i++) for(let j=-1;j<H/hh+1;j++){ hex(r+3*r*i,hh/2+hh*j); hex(2.5*r+3*r*i,hh*j); } }
        else { for(let x=0;x<=W;x+=s){ cx.moveTo(x,0); cx.lineTo(x,H); } for(let y=0;y<=H;y+=s){ cx.moveTo(0,y); cx.lineTo(W,y); } }
        cx.stroke(); }
      const emoji=(t,x,y,size)=>{ cx.font=size+'px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(t,x,y); };
      const rotulo=(t,x,y,cor)=>{ cx.font='bold '+(11*F)+'px sans-serif'; cx.textAlign='center'; cx.textBaseline='middle';
        const w=cx.measureText(t).width+8*F; cx.fillStyle=cor||'rgba(11,16,32,.8)'; cx.fillRect(x-w/2,y-8*F,w,16*F); cx.fillStyle='#fff'; cx.fillText(t,x,y); };
      (m.world.kingdoms||[]).filter(k=>!k.hidden).forEach(k=>{ if(!k.gen){ const r=px(k.radius), g=cx.createRadialGradient(px(k.xPct),py(k.yPct),0,px(k.xPct),py(k.yPct),r);
          g.addColorStop(0,hexA(k.color,.42)); g.addColorStop(.65,hexA(k.color,.14)); g.addColorStop(1,'rgba(0,0,0,0)'); cx.fillStyle=g; cx.beginPath(); cx.arc(px(k.xPct),py(k.yPct),r,0,6.3); cx.fill(); }
        if(m.showLabels!==false) rotulo(k.name,px(k.xPct),py(k.yPct),k.color); });
      const FILL={wall:'#475569',floor:'rgba(203,213,225,.55)',water:'rgba(42,108,176,.75)',grass:'rgba(63,125,58,.7)',ice:'rgba(191,227,244,.7)'};
      (m.props||[]).filter(p=>!p.hidden).forEach(p=>{ cx.save(); cx.translate(px(p.xPct),py(p.yPct)); cx.rotate((p.rot||0)*Math.PI/180);
        if(p.shape==='block'){ const w=px(p.w), hh=py(p.h); cx.fillStyle=FILL[p.fill]||'#64748b'; cx.fillRect(-w/2,-hh/2,w,hh); cx.strokeStyle='rgba(255,255,255,.3)'; cx.strokeRect(-w/2,-hh/2,w,hh); }
        else { cx.fillStyle='#fff'; emoji(p.icon,0,0,30*F*(p.size||100)/100); } cx.restore(); });
      m.pins.filter(p=>!p.hidden).forEach(p=>{ emoji(p.icon||'📍',px(p.xPct),py(p.yPct)-10*F,22*F); if(p.label&&m.showLabels!==false) rotulo(p.label,px(p.xPct),py(p.yPct)+8*F); });
      m.tokens.filter(t=>!t.hidden).forEach(t=>{ const r=17*F*(t.size||100)/100, x=px(t.xPct), y=py(t.yPct);
        cx.fillStyle='#0e1424'; cx.beginPath(); cx.arc(x,y,r,0,6.3); cx.fill(); cx.lineWidth=2*F; cx.strokeStyle=t.color||'#94a3b8'; cx.stroke();
        cx.fillStyle='#fff'; emoji((t.icon&&t.icon.trim())||((t.label||'?').trim().charAt(0)||'?'),x,y,r*1.0);
        if(m.showLabels!==false) rotulo(t.label||'',x,y+r+9*F); });
      cv.toBlob(b=>{ if(!b) return mpToast('Não foi possível exportar.'); const a=document.createElement('a'); a.href=URL.createObjectURL(b);
        a.download=(m.name||'mapa').replace(/[^\w\-]+/g,'_')+'.png'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); mpToast('Mapa exportado'); },'image/png');
    };
    /* objetos vetoriais: serializa o SVG e desenha como imagem */
    if((m.objs||[]).length){
      const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+U_W+' '+U_H+'">'+objsMarkup(m,false,true)+'</svg>';
      const im=new Image(); im.onload=()=>{ cx.drawImage(im,0,0,W,H); finish2(); }; im.onerror=finish2;
      im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
    } else finish2();
  };
  cx.fillStyle=m.bg||'#0e1424'; cx.fillRect(0,0,W,H);
  if(isWorldKind(m.kind)&&m.world.continent&&m.world.continent.shape!=='none'){
    const meta=worldShapeMeta(m.world.continent.shape);
    if(meta.poly){ const w=m.world.continent; cx.save(); cx.translate(W/2,H/2); cx.rotate((w.rot||0)*Math.PI/180); cx.scale((w.scale||100)/100,(w.scale||100)/100); cx.translate(-W/2,-H/2);
      cx.fillStyle=w.color; cx.globalAlpha=.9; cx.beginPath();
      meta.poly.split(',').forEach((pt,i)=>{ const [a,b]=pt.trim().split(/\s+/).map(v=>parseFloat(v)/100); i?cx.lineTo(a*W,b*H):cx.moveTo(a*W,b*H); }); cx.closePath(); cx.fill(); cx.restore(); }
  }
  if(m.image){ const im=new Image(); im.onload=()=>{ const sc=Math.max(W/im.width,H/im.height), w=im.width*sc, hh=im.height*sc; cx.drawImage(im,(W-w)/2,(H-hh)/2,w,hh); fim(); }; im.onerror=fim; im.src=m.image; }
  else fim();
}
