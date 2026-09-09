/* ============================================================ CAMPANHA — MAPA ============================================================
   Coleção de mapas do Mestre (mundo, região, local/cidade, interior/casa,
   masmorra). Cada mapa tem: tema visual (rústico/natural/futurista/sombrio/limpo),
   imagem de fundo OPCIONAL, grade tática, tokens arrastáveis (jogadores/inimigos/
   NPCs) e pins de local por categoria (as "peças" para montar o mapa).
   Posições em % para escalar junto com a imagem. Drag por pointer events. */

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

/* ---------- Criação de mapa ---------- */
function criarMapa(){
  const d=S.ui.mapDraft||{name:'',kind:'regiao',theme:'rustico'};
  const c=S.campaign;
  const m=newMap(d.kind,d.theme,d.name.trim()||('Novo '+mapKindMeta(d.kind).nome.toLowerCase()));
  c.maps.push(m); c.currentMapId=m.id;
  S.ui.novoMapa=false; S.ui.mapDraft=null; S.ui.tokenSel=null; S.ui.pinSel=null;
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
  return card('Novo mapa','Escolha o tipo e o clima visual. Depois você pode enviar uma imagem de fundo ou desenhar por cima da grade.',
    h('button',{class:'btn ghost sm', onclick:()=>{S.ui.novoMapa=false;render();}},'Cancelar'),
    field('Nome', h('input',{class:'in', value:d.name, placeholder:'ex.: Reino de Valdrin, Taverna do Corvo…',
      onchange:e=>{d.name=e.target.value;}, onkeydown:e=>{ if(e.key==='Enter') criarMapa(); }})),
    field('Tipo de mapa', kinds),
    field('Clima visual', themes),
    h('button',{class:'btn primary', onclick:criarMapa}, '➕ Criar mapa'));
}

/* ---------- Seletor de mapas ---------- */
function mapSelector(){
  const c=S.campaign;
  const chips=c.maps.map(m=>{
    const km=mapKindMeta(m.kind);
    return h('button',{class:'map-chip'+(c.currentMapId===m.id?' on':''),
      onclick:()=>{c.currentMapId=m.id;S.ui.tokenSel=null;S.ui.pinSel=null;render();}},
      h('span',{class:'map-chip-ic'},km.ic), h('span',{class:'map-chip-nm'},m.name),
      h('span',{class:'map-chip-k'},km.nome));
  });
  return h('div',{class:'map-selector'}, ...chips,
    h('button',{class:'map-chip add', onclick:()=>{S.ui.novoMapa=true;render();}},'➕ Novo mapa'));
}

function mapaView(){
  const c=S.campaign;
  if(!Array.isArray(c.maps)) c.maps=[];

  /* Sem nenhum mapa ainda → convite + formulário */
  if(!c.maps.length){
    return h('div',{},
      card('Mapas da campanha','Crie mapas do mundo, de regiões, cidades, interiores e masmorras. Cada um com seu clima visual.',null,
        h('div',{class:'hint'},'Você ainda não tem mapas.')),
      formNovoMapa());
  }
  if(S.ui.novoMapa) return h('div',{}, mapSelector(), formNovoMapa());

  const m=curMap();
  const km=mapKindMeta(m.kind), tm=mapThemeMeta(m.theme);

  /* Cabeçalho do mapa: nome + tipo + tema + excluir */
  const kindsSel=h('div',{class:'map-opts sm'}, MAP_KINDS.map(t=>
    h('button',{class:'map-opt sm'+(m.kind===t.k?' on':''), title:t.nome, onclick:()=>{m.kind=t.k;render();}}, t.ic)));
  const themeSel=h('div',{class:'map-opts sm'}, MAP_THEMES.map(t=>
    h('button',{class:'map-opt theme sm '+t.k+(m.theme===t.k?' on':''), title:t.nome, onclick:()=>{m.theme=t.k;render();}}, t.ic)));
  const cab=card('⚙️ Configurar mapa',null,
    h('button',{class:'btn danger sm', onclick:()=>{ if(confirm('Excluir o mapa "'+m.name+'"?')){ c.maps=c.maps.filter(x=>x.id!==m.id); c.currentMapId=c.maps[0]?c.maps[0].id:null; S.ui.tokenSel=null;S.ui.pinSel=null; render(); } }},'🗑 Excluir mapa'),
    field('Nome do mapa', h('input',{class:'in', value:m.name, onchange:e=>{m.name=e.target.value;render();}})),
    h('div',{class:'row wrapf', style:{gap:'18px'}},
      field('Tipo', kindsSel), field('Clima visual', themeSel)));

  /* Barra de ferramentas: imagem + grade */
  const imgInp=h('input',{type:'file', accept:'image/*', class:'hide',
    onchange:e=>{ readMapImage(e.target.files[0], data=>{ m.image=data; render(); }); e.target.value=''; }});
  const toolbar=h('div',{class:'row wrapf', style:{marginBottom:'12px'}},
    h('button',{class:'btn', onclick:()=>imgInp.click()}, m.image?'🖼️ Trocar fundo':'🖼️ Imagem de fundo'), imgInp,
    m.image?h('button',{class:'btn ghost', onclick:()=>{if(confirm('Remover a imagem de fundo?')){m.image=null;render();}}},'Remover fundo'):null,
    h('label',{class:'chk'}, h('input',{type:'checkbox', checked:m.grid.on, onchange:e=>{m.grid.on=e.target.checked;render();}}),' Grade tática'),
    m.grid.on?field('Célula (px)', h('input',{class:'in', type:'number', style:{width:'72px'}, value:m.grid.size,
      onchange:e=>{m.grid.size=Math.max(12,parseInt(e.target.value)||48);render();}})):null);

  /* Adicionar peças: locais (pins por categoria) + tokens de criatura */
  const locais=h('div',{class:'row wrapf', style:{marginBottom:'8px'}},
    h('span',{class:'hint'},'Adicionar local:'),
    ...PIN_ICONS.map(ic=>h('button',{class:'pin-pick', title:'Adicionar '+ic, onclick:()=>{ const p=newPin(50,50,ic); m.pins.push(p); S.ui.pinSel=p.id; S.ui.tokenSel=null; render(); }}, ic)));
  const criaturas=h('div',{class:'row wrapf', style:{marginBottom:'12px'}},
    h('span',{class:'hint'},'Adicionar token:'),
    ...c.players.map(p=>h('button',{class:'btn sm', style:{borderLeft:'3px solid #10b981'}, onclick:()=>addToken('player',p.name,p.id)}, '🧍 '+p.name)),
    ...c.bestiary.enemies.map(sb=>h('button',{class:'btn sm', style:{borderLeft:'3px solid #e11d48'}, onclick:()=>addToken('enemy',sb.name,sb.id)}, '🐉 '+sb.name)),
    ...c.bestiary.npcs.map(np=>h('button',{class:'btn sm', style:{borderLeft:'3px solid #6366f1'}, onclick:()=>addToken('npc',np.name,np.id)}, '🎭 '+np.name)),
    h('button',{class:'btn sm ghost', onclick:()=>addToken('npc','?',null)},'+ genérico'));

  /* Área do mapa com tema */
  const area=h('div',{class:'map-area map-theme-'+m.theme});
  if(m.image){ area.style.background='#0e1424 url('+m.image+') center/cover no-repeat'; }
  else area.appendChild(h('div',{class:'map-empty'},
    (km.ic+' '+m.name)+' — '+tm.nome+'. Envie uma imagem de fundo ou construa por cima da grade adicionando locais e tokens.'));
  if(m.grid.on) area.appendChild(h('div',{class:'map-grid-ov', style:{backgroundSize:m.grid.size+'px '+m.grid.size+'px'}}));
  m.tokens.forEach(t=>area.appendChild(tokenEl(area, t)));
  m.pins.forEach(p=>area.appendChild(pinEl(area, p)));

  const sel = S.ui.pinSel ? pinToolbar() : (S.ui.tokenSel ? tokenToolbar() : null);

  return h('div',{},
    mapSelector(),
    cab,
    card('Editar mapa', (km.ic+' '+km.nome+' · '+tm.ic+' '+tm.nome)+' — arraste peças para mover; clique para selecionar.', null,
      toolbar, locais, criaturas, sel, area),
    field('Anotações do mapa', h('textarea',{class:'in', rows:'2', placeholder:'Segredos, rotas, encontros…',
      onchange:e=>{m.note=e.target.value;render();}}, m.note||'')));
}

function addToken(kind, label, refId){ const m=curMap(); if(!m) return; m.tokens.push(newToken(kind,label,refId)); render(); }

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
function tokenEl(area, t){
  const el=h('div',{class:'map-token'+(S.ui.tokenSel===t.id?' sel':''), style:{left:t.xPct+'%', top:t.yPct+'%', background:t.color}},
    h('span',{}, t.label));
  dragMovable(area, el, t, ()=>{ S.ui.tokenSel=t.id; S.ui.pinSel=null; render(); });
  return el;
}
function pinEl(area, p){
  const el=h('div',{class:'map-pin'+(S.ui.pinSel===p.id?' sel':''), style:{left:p.xPct+'%', top:p.yPct+'%'},
    title:(p.label||'')+(p.note?(' — '+p.note):'')},
    h('span',{class:'map-pin-dot'}, p.icon||'📍'),
    p.label?h('span',{class:'map-pin-lbl'}, p.label):null);
  dragMovable(area, el, p, ()=>{ S.ui.pinSel=p.id; S.ui.tokenSel=null; render(); });
  return el;
}
function tokenToolbar(){
  const m=curMap(); if(!m) return null;
  const t=m.tokens.find(x=>x.id===S.ui.tokenSel);
  if(!t) return null;
  const cores=['#10b981','#e11d48','#6366f1','#d97706','#e2e8f0','#0ea5e9'];
  return h('div',{class:'map-tt'},
    h('strong',{}, '🧭 Token'),
    h('input',{class:'in', style:{width:'150px'}, value:t.label, onchange:e=>{t.label=e.target.value;render();}}),
    h('div',{class:'row'}, cores.map(cor=>h('button',{class:'map-swatch', style:{background:cor}, onclick:()=>{t.color=cor;render();}}))),
    h('button',{class:'btn ghost sm', onclick:()=>{S.ui.tokenSel=null;render();}},'Fechar'),
    h('button',{class:'btn danger sm', onclick:()=>{m.tokens=m.tokens.filter(x=>x.id!==t.id);S.ui.tokenSel=null;render();}},'Excluir'));
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
      h('button',{class:'btn ghost sm', onclick:()=>{S.ui.pinSel=null;render();}},'Fechar'),
      h('button',{class:'btn danger sm', onclick:()=>{m.pins=m.pins.filter(x=>x.id!==p.id);S.ui.pinSel=null;render();}},'Excluir')),
    icones,
    h('textarea',{class:'in', rows:'2', placeholder:'Nota do local (o que há aqui, segredos…)', onchange:e=>{p.note=e.target.value;render();}}, p.note||''));
}
