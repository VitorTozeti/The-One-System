/* ============================================================ CAMPANHA — MAPA ============================================================
   Coleção de mapas do Mestre. Dois modos de construção conforme o TIPO:
     • TÁTICO (local / interior / masmorra): monte a cena com PEÇAS — paredes,
       salas, água, árvores, mato, armadilhas, móveis… cada uma arrastável, com
       tamanho e rotação. Grade tática para alinhar.
     • MUNDO (mundo / região): defina o CONTORNO do continente (formato), pinte
       REINOS/territórios e crave PONTOS DE INTERESSE (pins).
   Em qualquer mapa há TOKENS de criatura (jogador/inimigo/NPC) com ícone/imagem
   personalizada. O CLIMA VISUAL (rústico → papel gasto, futurista → HUD, etc.)
   desenha a moldura da era. Posições em % para escalar junto com a imagem. */

/* Leitor de imagem maior que readPhoto (mapa precisa de mais resolução). */
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

/* ---------- Criação de mapa ---------- */
function criarMapa(){
  const d=S.ui.mapDraft||{name:'',kind:'regiao',theme:'rustico'};
  const c=S.campaign;
  const m=newMap(d.kind,d.theme,d.name.trim()||('Novo '+mapKindMeta(d.kind).nome.toLowerCase()));
  c.maps.push(m); c.currentMapId=m.id;
  S.ui.novoMapa=false; S.ui.mapDraft=null; limpaSel();
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
    ? 'Mapa de mundo: você vai definir o contorno do continente, pintar reinos e marcar pontos de interesse.'
    : 'Mapa tático: você vai montar a cena com paredes, vegetação, armadilhas e móveis sobre a grade.';
  return card('Novo mapa','Escolha o tipo e a era visual. Depois envie uma imagem de fundo ou construa por cima.',
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
      onclick:()=>{c.currentMapId=m.id;limpaSel();render();}},
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
      card('Mapas da campanha','Crie mapas do mundo, de regiões, cidades, interiores e masmorras. Cada um com sua era visual.',null,
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

  /* Barra de ferramentas: imagem + grade */
  const imgInp=h('input',{type:'file', accept:'image/*', class:'hide',
    onchange:e=>{ readMapImage(e.target.files[0], data=>{ m.image=data; render(); }); e.target.value=''; }});
  const toolbar=h('div',{class:'row wrapf', style:{marginBottom:'12px'}},
    h('button',{class:'btn', onclick:()=>imgInp.click()}, m.image?'🖼️ Trocar fundo':'🖼️ Imagem de fundo'), imgInp,
    m.image?h('button',{class:'btn ghost', onclick:()=>{if(confirm('Remover a imagem de fundo?')){m.image=null;render();}}},'Remover fundo'):null,
    h('label',{class:'chk'}, h('input',{type:'checkbox', checked:m.grid.on, onchange:e=>{m.grid.on=e.target.checked;render();}}),' Grade tática'),
    m.grid.on?field('Célula (px)', h('input',{class:'in', type:'number', style:{width:'72px'}, value:m.grid.size,
      onchange:e=>{m.grid.size=Math.max(12,parseInt(e.target.value)||48);render();}})):null);

  /* Paletas de construção (dependem do tipo) */
  const paletas = world ? construtorMundo(m) : construtorTatico(m);

  /* Tokens de criatura (em qualquer mapa) */
  const criaturas=h('div',{class:'row wrapf', style:{marginBottom:'12px'}},
    h('span',{class:'hint'},'Adicionar token:'),
    ...c.players.map(p=>h('button',{class:'btn sm', style:{borderLeft:'3px solid #10b981'}, onclick:()=>addToken('player',p.name,p.id)}, '🧍 '+p.name)),
    ...c.bestiary.enemies.map(sb=>h('button',{class:'btn sm', style:{borderLeft:'3px solid #e11d48'}, onclick:()=>addToken('enemy',sb.name,sb.id)}, '🐉 '+sb.name)),
    ...c.bestiary.npcs.map(np=>h('button',{class:'btn sm', style:{borderLeft:'3px solid #6366f1'}, onclick:()=>addToken('npc',np.name,np.id)}, '🎭 '+np.name)),
    h('button',{class:'btn sm ghost', onclick:()=>addToken('npc','?',null)},'+ genérico'));

  /* Área do mapa com tema + moldura da era */
  const area=h('div',{class:'map-area map-theme-'+m.theme});
  if(m.image){ area.style.background='#0e1424 url('+m.image+') center/cover no-repeat'; }
  /* Camada de continente (mundo) */
  if(world) { const cont=continentLayer(m); if(cont) area.appendChild(cont); }
  if(m.grid.on) area.appendChild(h('div',{class:'map-grid-ov', style:{backgroundSize:m.grid.size+'px '+m.grid.size+'px'}}));
  /* Reinos primeiro (ficam por baixo das peças/tokens) */
  if(world) (m.world.kingdoms||[]).forEach(k=>area.appendChild(kingdomEl(area,k)));
  /* Peças táticas */
  (m.props||[]).forEach(p=>area.appendChild(propEl(area,p)));
  /* Pins e tokens no topo */
  m.pins.forEach(p=>area.appendChild(pinEl(area, p)));
  m.tokens.forEach(t=>area.appendChild(tokenEl(area, t)));
  /* Moldura decorativa da era (não captura clique) */
  area.appendChild(h('div',{class:'map-frame frame-'+m.theme}));
  if(!m.image && !(m.props||[]).length && !m.tokens.length && !world)
    area.appendChild(h('div',{class:'map-empty'},
      (km.ic+' '+m.name)+' — '+tm.nome+'. Arraste peças da paleta para montar a cena, ou envie uma imagem de fundo.'));

  const sel = S.ui.propSel ? propToolbar()
            : S.ui.kingSel ? kingdomToolbar()
            : S.ui.pinSel ? pinToolbar()
            : S.ui.tokenSel ? tokenToolbar() : null;

  return h('div',{},
    mapSelector(),
    cab,
    card('Editar mapa', (km.ic+' '+km.nome+' · '+tm.ic+' '+tm.nome)+' — arraste peças para mover; clique para selecionar.', null,
      toolbar, paletas, criaturas, sel, area),
    field('Anotações do mapa', h('textarea',{class:'in', rows:'2', placeholder:'Segredos, rotas, encontros…',
      onchange:e=>{m.note=e.target.value;render();}}, m.note||'')));
}

/* ---------- Construtor TÁTICO (paredes, mato, armadilhas…) ---------- */
function construtorTatico(m){
  const grupos=PROP_CATALOG.map(g=>h('div',{class:'prop-group'},
    h('div',{class:'prop-group-t', style:{color:g.cor}}, g.cat),
    h('div',{class:'prop-pal'}, g.itens.map(it=>
      h('button',{class:'prop-pick'+(it.shape==='block'?' block':''), title:'Adicionar '+it.nome,
        onclick:()=>{ const p=newProp(it.k,50,50); m.props.push(p); limpaSel(); S.ui.propSel=p.id; render(); }},
        h('span',{class:'prop-pick-ic'},it.ic), h('span',{class:'prop-pick-l'},it.nome))))));
  const pins=h('div',{class:'row wrapf', style:{marginTop:'6px'}},
    h('span',{class:'hint'},'Marcador de local:'),
    ...PIN_ICONS.slice(0,10).map(ic=>h('button',{class:'pin-pick', title:'Adicionar '+ic,
      onclick:()=>{ const p=newPin(50,50,ic); m.pins.push(p); limpaSel(); S.ui.pinSel=p.id; render(); }}, ic)));
  return h('div',{class:'construtor'},
    h('div',{class:'hint', style:{marginBottom:'6px'}},'🧱 Peças da cena — clique para adicionar; depois arraste no mapa.'),
    h('div',{class:'prop-groups'}, ...grupos), pins);
}

/* ---------- Construtor de MUNDO (continente, reinos, POIs) ---------- */
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
  const acoes=h('div',{class:'row wrapf', style:{marginTop:'8px'}},
    h('button',{class:'btn sm', style:{borderLeft:'3px solid #e11d48'},
      onclick:()=>{ const k=newKingdom(50,50); m.world.kingdoms.push(k); limpaSel(); S.ui.kingSel=k.id; render(); }},'🏴 Adicionar reino'),
    h('span',{class:'hint'},'Ponto de interesse:'),
    ...PIN_ICONS.map(ic=>h('button',{class:'pin-pick', title:'Adicionar '+ic,
      onclick:()=>{ const p=newPin(50,50,ic); m.pins.push(p); limpaSel(); S.ui.pinSel=p.id; render(); }}, ic)));
  return h('div',{class:'construtor'},
    h('div',{class:'hint', style:{marginBottom:'6px'}},'🌍 Construa o mundo — escolha o formato do continente, pinte reinos e marque locais.'),
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

function addToken(kind, label, refId){ const m=curMap(); if(!m) return; const t=newToken(kind,label,refId); m.tokens.push(t); limpaSel(); S.ui.tokenSel=t.id; render(); }

/* Converte um evento de ponteiro em % dentro da área do mapa. */
function pctFromEvent(area, ev){
  const r=area.getBoundingClientRect();
  return { x:Math.max(0,Math.min(100,((ev.clientX-r.left)/r.width)*100)),
           y:Math.max(0,Math.min(100,((ev.clientY-r.top)/r.height)*100)) };
}
function dragMovable(area, el, obj, onClick){
  el.addEventListener('pointerdown',ev=>{
    ev.preventDefault(); ev.stopPropagation();
    let moveu=false;
    const move=e=>{ const p=pctFromEvent(area,e); obj.xPct=p.x; obj.yPct=p.y; moveu=true;
      el.style.left=obj.xPct+'%'; el.style.top=obj.yPct+'%'; };
    const up=e=>{ document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up);
      if(moveu) render(); else if(onClick) onClick(); };
    document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
  });
}

/* ---------- Tokens de criatura ---------- */
/* Resolve nome/imagem/vida da peça referenciada pelo token. */
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
  el.appendChild(h('div',{class:'map-token-lbl'}, (ref&&ref.name)||t.label||''));
  if(t.hp!=null && t.hpMax){ const pc=Math.max(0,Math.min(100,(t.hp/t.hpMax)*100));
    el.appendChild(h('div',{class:'map-token-hp'}, h('span',{style:{width:pc+'%'}}))); }
  /* Clique num token de JOGADOR abre a ficha no painel principal.
     Nos demais, clique só seleciona para editar. */
  const onClick = t.kind==='player'
    ? ()=>abrirFichaJogador(t.refId)
    : ()=>{ limpaSel(); S.ui.tokenSel=t.id; render(); };
  dragMovable(area, el, t, onClick);
  return el;
}
/* Abre a ficha (read-only) do jogador ligado ao token, na seção Jogadores. */
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
  /* upload de ícone personalizado */
  const imgInp=h('input',{type:'file', accept:'image/*', class:'hide',
    onchange:e=>{ readPhoto(e.target.files[0], data=>{ t.img=data; render(); }); e.target.value=''; }});
  const ref=tokenRefInfo(t);
  return h('div',{class:'map-tt col'},
    h('div',{class:'row wrapf'},
      h('strong',{}, kindEmoji(t.kind)+' Token'),
      h('input',{class:'in', style:{width:'150px'}, value:t.label, placeholder:'rótulo', onchange:e=>{t.label=e.target.value;render();}}),
      t.kind==='player'?h('button',{class:'btn primary sm', onclick:()=>abrirFichaJogador(t.refId)},'👁 Abrir ficha'):null,
      h('button',{class:'btn ghost sm', onclick:()=>{limpaSel();render();}},'Fechar'),
      h('button',{class:'btn danger sm', onclick:()=>{m.tokens=m.tokens.filter(x=>x.id!==t.id);limpaSel();render();}},'Excluir')),
    /* Ícone: imagem personalizada + emojis + cor do anel */
    h('div',{class:'row wrapf', style:{alignItems:'center'}},
      h('span',{class:'hint'},'Ícone:'),
      h('button',{class:'btn sm', onclick:()=>imgInp.click()},'🖼️ Imagem'), imgInp,
      t.img?h('button',{class:'btn ghost sm', onclick:()=>{t.img=null;render();}},'Remover imagem'):null,
      h('div',{class:'emoji-pal'}, emojis.map(em=>h('button',{class:'emoji-pick'+((t.icon||'')===em?' on':''),
        title:em||'padrão', onclick:()=>{t.icon=em;render();}}, em||'∅')))),
    h('div',{class:'row wrapf', style:{alignItems:'center'}},
      h('span',{class:'hint'},'Anel:'),
      cores.map(cor=>h('button',{class:'map-swatch'+(t.color===cor?' on':''), style:{background:cor}, onclick:()=>{t.color=cor;render();}}))),
    /* Tamanho + vida + oculto */
    h('div',{class:'row wrapf', style:{alignItems:'center', gap:'12px'}},
      field('Tamanho', h('input',{type:'range', min:'70', max:'220', value:t.size||100, oninput:e=>{t.size=parseInt(e.target.value)||100;render();}})),
      field('HP', h('input',{class:'in', type:'number', style:{width:'62px'}, value:t.hp==null?'':t.hp, placeholder:'—',
        onchange:e=>{const v=e.target.value; t.hp=v===''?null:(parseInt(v)||0); render();}})),
      field('HP máx', h('input',{class:'in', type:'number', style:{width:'62px'}, value:t.hpMax==null?'':t.hpMax, placeholder:'—',
        onchange:e=>{const v=e.target.value; t.hpMax=v===''?null:(parseInt(v)||0); render();}})),
      h('label',{class:'chk'}, h('input',{type:'checkbox', checked:!!t.hidden, onchange:e=>{t.hidden=e.target.checked;render();}}),' Oculto (só o Mestre)')),
    ref?h('div',{class:'hint'},'Ligado a: '+ref.name):null);
}

/* ---------- Peças táticas (props) ---------- */
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
      h('input',{class:'in', style:{width:'160px'}, placeholder:'rótulo (opcional)', value:p.label||'', onchange:e=>{p.label=e.target.value;render();}}),
      h('label',{class:'chk'}, h('input',{type:'checkbox', checked:!!p.hidden, onchange:e=>{p.hidden=e.target.checked;render();}}),' Oculto'),
      h('button',{class:'btn ghost sm', onclick:()=>{limpaSel();render();}},'Fechar'),
      h('button',{class:'btn ghost sm', onclick:()=>{ const cp=JSON.parse(JSON.stringify(p)); cp.id=uid(); cp.xPct=Math.min(96,p.xPct+4); cp.yPct=Math.min(96,p.yPct+4); m.props.push(cp); S.ui.propSel=cp.id; render(); }},'⧉ Duplicar'),
      h('button',{class:'btn danger sm', onclick:()=>{m.props=m.props.filter(x=>x.id!==p.id);limpaSel();render();}},'Excluir')),
    controles);
}

/* ---------- Reinos / territórios (mapas de mundo) ---------- */
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
/* Converte #rrggbb + alfa em rgba(). */
function hexA(hex, a){
  const s=String(hex||'#888').replace('#',''); const n=s.length===3?s.split('').map(c=>c+c).join(''):s;
  const r=parseInt(n.slice(0,2),16)||136, g=parseInt(n.slice(2,4),16)||136, b=parseInt(n.slice(4,6),16)||136;
  return 'rgba('+r+','+g+','+b+','+a+')';
}

/* ---------- Pins de local ---------- */
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
