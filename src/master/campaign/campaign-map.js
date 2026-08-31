/* ============================================================ CAMPANHA — MAPA ============================================================
   Mapa da campanha: imagem de fundo + grade tática opcional + tokens
   arrastáveis (jogadores/inimigos/NPCs) + pins de local com nota.
   Posições em % para escalar junto com a imagem. Drag por pointer events
   (mesmo padrão do editor de ficha). */

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

function mapaView(){
  const c=S.campaign, m=c.map;
  const imgInp=h('input',{type:'file', accept:'image/*', class:'hide',
    onchange:e=>{ readMapImage(e.target.files[0], data=>{ m.image=data; render(); }); e.target.value=''; }});

  const toolbar=h('div',{class:'row wrapf', style:{marginBottom:'12px'}},
    h('button',{class:'btn', onclick:()=>imgInp.click()}, m.image?'🖼️ Trocar mapa':'🖼️ Enviar imagem'), imgInp,
    m.image?h('button',{class:'btn ghost', onclick:()=>{if(confirm('Remover a imagem do mapa?')){m.image=null;render();}}},'Remover imagem'):null,
    h('label',{class:'chk'}, h('input',{type:'checkbox', checked:m.grid.on, onchange:e=>{m.grid.on=e.target.checked;render();}}),' Grade tática'),
    m.grid.on?field('Célula (px)', h('input',{class:'in', type:'number', style:{width:'72px'}, value:m.grid.size,
      onchange:e=>{m.grid.size=Math.max(12,parseInt(e.target.value)||48);render();}})):null);

  const addTokens=h('div',{class:'row wrapf', style:{marginBottom:'12px'}},
    h('span',{class:'hint'},'Adicionar token:'),
    ...c.players.map(p=>h('button',{class:'btn sm', style:{borderLeft:'3px solid #10b981'}, onclick:()=>addToken('player',p.name,p.id)}, '🧍 '+p.name)),
    ...c.bestiary.enemies.map(sb=>h('button',{class:'btn sm', style:{borderLeft:'3px solid #e11d48'}, onclick:()=>addToken('enemy',sb.name,sb.id)}, '🐉 '+sb.name)),
    ...c.bestiary.npcs.map(np=>h('button',{class:'btn sm', style:{borderLeft:'3px solid #6366f1'}, onclick:()=>addToken('npc',np.name,np.id)}, '🎭 '+np.name)),
    h('button',{class:'btn sm ghost', onclick:()=>addToken('npc','?',null)},'+ genérico'),
    h('button',{class:'btn sm ghost', onclick:()=>{m.pins.push(newPin());render();}},'📍 Local'));

  /* Área do mapa */
  const area=h('div',{class:'map-area'});
  if(m.image) area.style.backgroundImage='url('+m.image+')';
  else area.appendChild(h('div',{class:'map-empty'},'Envie uma imagem de mapa ou use a grade em branco. Depois adicione tokens e locais.'));
  /* grade como camada por cima da imagem (senão o background inline a esconderia) */
  if(m.grid.on) area.appendChild(h('div',{class:'map-grid-ov', style:{backgroundSize:m.grid.size+'px '+m.grid.size+'px'}}));

  m.tokens.forEach(t=>area.appendChild(tokenEl(area, t)));
  m.pins.forEach(p=>area.appendChild(pinEl(area, p)));

  const toolbarSel=S.ui.tokenSel?tokenToolbar():null;

  return h('div',{},
    card('Mapa da campanha','Imagem + grade + tokens arrastáveis + locais. Arraste para mover; clique para selecionar.',null),
    toolbar, addTokens, toolbarSel, area);
}

function addToken(kind, label, refId){ S.campaign.map.tokens.push(newToken(kind,label,refId)); render(); }

/* Converte um evento de ponteiro em % dentro da área do mapa. */
function pctFromEvent(area, ev){
  const r=area.getBoundingClientRect();
  return { x:Math.max(0,Math.min(100,((ev.clientX-r.left)/r.width)*100)),
           y:Math.max(0,Math.min(100,((ev.clientY-r.top)/r.height)*100)) };
}
function dragMovable(area, el, obj){
  el.addEventListener('pointerdown',ev=>{
    ev.preventDefault(); ev.stopPropagation();
    let moveu=false;
    const move=e=>{ const p=pctFromEvent(area,e); obj.xPct=p.x; obj.yPct=p.y; moveu=true;
      el.style.left=obj.xPct+'%'; el.style.top=obj.yPct+'%'; };
    const up=e=>{ document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up);
      if(moveu) render(); else if(el.dataset.tid){ S.ui.tokenSel=el.dataset.tid; render(); } };
    document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
  });
}
function tokenEl(area, t){
  const el=h('div',{class:'map-token'+(S.ui.tokenSel===t.id?' sel':''), style:{left:t.xPct+'%', top:t.yPct+'%', background:t.color}},
    h('span',{}, t.label));
  el.dataset.tid=t.id;
  dragMovable(area, el, t);
  return el;
}
function pinEl(area, p){
  const el=h('div',{class:'map-pin', style:{left:p.xPct+'%', top:p.yPct+'%'},
    title:(p.label||'')+(p.note?(' — '+p.note):''),
    ondblclick:()=>{ const l=prompt('Nome do local:', p.label||''); if(l!=null){p.label=l; const n=prompt('Nota:', p.note||''); if(n!=null)p.note=n; render();} }},
    h('span',{class:'map-pin-dot'},'📍'), h('span',{class:'map-pin-lbl'}, p.label||''));
  dragMovable(area, el, p);
  return el;
}
function tokenToolbar(){
  const t=S.campaign.map.tokens.find(x=>x.id===S.ui.tokenSel);
  if(!t) return null;
  const cores=['#10b981','#e11d48','#6366f1','#d97706','#e2e8f0','#0ea5e9'];
  return h('div',{class:'map-tt'},
    h('strong',{}, 'Token: '+t.label),
    h('input',{class:'in', style:{width:'140px'}, value:t.label, onchange:e=>{t.label=e.target.value;render();}}),
    h('div',{class:'row'}, cores.map(cor=>h('button',{class:'map-swatch', style:{background:cor}, onclick:()=>{t.color=cor;render();}}))),
    h('button',{class:'btn ghost sm', onclick:()=>{S.ui.tokenSel=null;render();}},'Fechar'),
    h('button',{class:'btn danger sm', onclick:()=>{S.campaign.map.tokens=S.campaign.map.tokens.filter(x=>x.id!==t.id);S.ui.tokenSel=null;render();}},'Excluir'));
}
