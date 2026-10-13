/* ============================================================ CAMPANHA — NOTAS, HANDOUTS E BUSCA ============================================================
   • Caderno: notas do Mestre ligáveis a NPC / inimigo / mapa / jogador (c.notebook).
   • Handouts: textos/imagens para entregar aos jogadores (c.handouts); o botão
     "Mostrar aos jogadores" define c.present.handoutId (a Tela dos jogadores exibe).
   • Busca da campanha (Ctrl+J ou botão 🔎 da Mesa ao vivo): NPCs, inimigos, itens,
     notas, handouts, mapas/locais, jogadores e sessões.
   campBuscaDestinos(q) devolve {t,ond,go} — pode ser reaproveitado pela busca global. */

/* ---------- Vínculos ---------- */
const LINK_TYPES=[
  {k:'npc',    ic:'🎭', nome:'NPC'},
  {k:'enemy',  ic:'🐉', nome:'Inimigo'},
  {k:'map',    ic:'🗺️', nome:'Mapa'},
  {k:'player', ic:'🧍', nome:'Jogador'},
];
function linkOpcoes(type){
  const c=S.campaign;
  if(type==='npc')   return c.bestiary.npcs.map(x=>({id:x.id,name:x.name}));
  if(type==='enemy') return c.bestiary.enemies.map(x=>({id:x.id,name:x.name}));
  if(type==='map')   return c.maps.map(x=>({id:x.id,name:x.name}));
  if(type==='player')return c.players.map(x=>({id:x.id,name:x.name}));
  return [];
}
function linkNome(l){
  if(!l) return '';
  const o=linkOpcoes(l.type).find(x=>x.id===l.id), t=LINK_TYPES.find(x=>x.k===l.type);
  return o?((t?t.ic:'')+' '+o.name):'(vínculo removido)';
}
/* Abre o item ligado: troca de painel e pede para rolar/destacar o cartão. */
function linkIr(l){
  if(!l) return;
  const c=S.campaign, ui=cmp();
  if(l.type==='npc'){ S.ui.bestSub='npcs'; ui.focus='bx-'+l.id; irMtab('bestiario'); }
  else if(l.type==='enemy'){ S.ui.bestSub='inimigos'; ui.focus='bx-'+l.id; irMtab('bestiario'); }
  else if(l.type==='map'){ c.currentMapId=l.id; irMtab('mapa'); }
  else if(l.type==='player'){ ui.focus='px-'+l.id; irMtab('jogadores'); }
}
/* Notas ligadas a um item + botão de criar nova (usado nos cartões de NPC/inimigo). */
function notasLigadas(type,id){
  const c=S.campaign, ls=c.notebook.filter(n=>n.link&&n.link.type===type&&n.link.id===id);
  return h('div',{class:'mv-linked'},
    h('span',{class:'hint'},'📓 Notas:'),
    ls.map(n=>h('button',{class:'mv-chip txt btn-chip', title:n.text.slice(0,200), onclick:()=>{ cmp().notaSub='caderno'; cmp().notaFoco=n.id; irMtab('notas'); }}, n.title||'(sem título)')),
    h('button',{class:'btn mini ghost', title:'Nova nota ligada', onclick:()=>{
      const n={id:uid(), title:'', text:'', link:{type,id}, ts:Date.now()}; c.notebook.unshift(n);
      cmp().notaSub='caderno'; cmp().notaFoco=n.id; irMtab('notas'); }},'+'));
}

/* ---------- Mostrar handout aos jogadores ---------- */
function handoutMostrar(hd){
  const p=S.campaign.present;
  p.handoutId=hd?hd.id:null; if(hd) p.blank=false;
  if(hd) sessEvento('Handout mostrado: '+hd.title,'nota');
  if(hd&&!p.live) showToast('📺 Handout pronto — abra a Tela dos jogadores (Ferramentas) para exibir');
  else showToast(hd?('📺 Mostrando “'+hd.title+'”'):'Handout ocultado');
  render();
}

/* ---------- Seção "Notas" (substitui o antigo bloco único) ---------- */
function notasView(){
  const ui=cmp(), sub=ui.notaSub||'caderno';
  const abas=[['caderno','📓 Caderno'],['handouts','📜 Handouts'],['rascunho','✍️ Rascunho'],['templates','🧩 Templates']];
  const nav=h('div',{class:'toggle', style:{marginBottom:'12px'}}, abas.map(([k,l])=>
    h('button',{class:sub===k?'on-j':'', onclick:()=>{ui.notaSub=k;render();}}, l)));
  const corpo = sub==='handouts'?handoutsInner() : sub==='rascunho'?rascunhoInner() : sub==='templates'?templatesInner() : cadernoInner();
  return h('div',{}, nav, corpo);
}
function rascunhoInner(){
  const c=S.campaign;
  return card('Rascunho do Mestre','Texto livre: segredos, ganchos, lembretes.',null,
    h('textarea',{class:'in', rows:'12', style:{width:'100%'}, placeholder:'Escreva aqui…', onchange:e=>{c.notes=e.target.value;render();}}, c.notes||''));
}
function templatesInner(){
  const templates=listTemplates();
  return card('Sistema & Templates','Salve este sistema como template para reusar em outra campanha.',
    h('button',{class:'btn primary sm', onclick:async()=>{ const nome=await cPrompt('Nome do template:', S.system.name||'Meu sistema');
      if(nome){ saveSystemAsTemplate(S.system, nome); showToast('Template salvo ✔'); render(); } }},'💾 Salvar como template'),
    templates.length
      ? h('div',{}, templates.map(t=>h('div',{class:'loot-row'},
          h('div',{class:'loot-name'}, '🧩 '+t.nome),
          h('span',{class:'hint'}, new Date(t.createdAt).toLocaleDateString()),
          h('button',{class:'btn mini ghost', title:'Excluir template', onclick:async()=>{ if(await cConfirm('Excluir o template '+t.nome+'?',{perigo:true,okText:'Excluir'})){deleteTemplate(t.id);render();}}},'✕'))))
      : h('div',{class:'hint'},'Nenhum template salvo. Ao criar um novo personagem Mestre você poderá partir de um template.'));
}

/* ---------- Caderno ---------- */
function cadernoInner(){
  const c=S.campaign, ui=cmp(), q=semAcentoC(ui.notaQ||'');
  const lista=c.notebook.filter(n=>!q||semAcentoC((n.title||'')+' '+(n.text||'')+' '+linkNome(n.link)).includes(q));
  const novo=()=>{ const n={id:uid(), title:'', text:'', link:null, ts:Date.now()}; c.notebook.unshift(n); ui.notaFoco=n.id; render(); };
  const cards=lista.map(n=>notaCard(n));
  return h('div',{},
    card('Caderno do Mestre','Notas soltas ou presas a um NPC, inimigo, mapa ou jogador (aparecem também no cartão dele).',
      h('button',{class:'btn primary', onclick:novo},'+ Nova nota'),
      h('input',{class:'in', placeholder:'Filtrar notas…', value:ui.notaQ||'', 'aria-label':'Filtrar notas', onchange:e=>{ui.notaQ=e.target.value;render();}})),
    cards.length?h('div',{class:'mv-notes'}, cards):h('div',{class:'pj-empty'}, c.notebook.length?'Nenhuma nota combina com o filtro.':'Sem notas ainda. Dica: a nota rápida da Mesa ao vivo também cai aqui quando não há sessão.'));
}
function notaCard(n){
  const c=S.campaign, ui=cmp(), foco=ui.notaFoco===n.id;
  const tipoSel=h('select',{class:'in sm', 'aria-label':'Tipo de vínculo', style:{width:'auto'}, onchange:e=>{ const t=e.target.value; n.link=t?{type:t,id:(linkOpcoes(t)[0]||{}).id||null}:null; if(n.link&&!n.link.id) n.link=null; render(); }},
    h('option',{value:''},'sem vínculo'),
    LINK_TYPES.map(t=>{const o=h('option',{value:t.k},t.ic+' '+t.nome); if(n.link&&n.link.type===t.k)o.selected=true; return o;}));
  const alvoSel=n.link?h('select',{class:'in sm', 'aria-label':'Item ligado', style:{width:'auto',maxWidth:'180px'}, onchange:e=>{n.link.id=e.target.value;render();}},
    linkOpcoes(n.link.type).map(o=>{const op=h('option',{value:o.id},o.name); if(n.link.id===o.id)op.selected=true; return op;})):null;
  const el=h('div',{class:'mv-note'+(foco?' foco':''), id:'nt-'+n.id},
    h('div',{class:'row'},
      h('input',{class:'in', style:{fontWeight:'700',flex:'1'}, value:n.title, placeholder:'Título da nota', onchange:e=>{n.title=e.target.value;render();}}),
      h('button',{class:'btn mini ghost', title:'Excluir', onclick:async()=>{ if(await cConfirm('Excluir esta nota?',{perigo:true,okText:'Excluir'})){ c.notebook=c.notebook.filter(x=>x.id!==n.id); render(); } }},'✕')),
    h('textarea',{class:'in', rows:foco?'6':'3', placeholder:'Escreva…', onchange:e=>{n.text=e.target.value;render();}}, n.text||''),
    h('div',{class:'row wrapf'}, h('span',{class:'hint'},'Ligar a:'), tipoSel, alvoSel,
      n.link?h('button',{class:'btn sm ghost', onclick:()=>linkIr(n.link)},'Abrir '+linkNome(n.link)):null,
      h('span',{class:'hint', style:{marginLeft:'auto'}}, new Date(n.ts).toLocaleDateString())));
  return el;
}

/* ---------- Handouts ---------- */
function handoutsInner(){
  const c=S.campaign, p=c.present;
  const novo=()=>{ c.handouts.unshift({id:uid(), title:'Novo handout', text:'', image:null, ts:Date.now()}); render(); };
  const cards=c.handouts.map(hd=>{
    const on=p.handoutId===hd.id;
    const inp=h('input',{type:'file', accept:'image/*', class:'hide', onchange:e=>{ readPhoto(e.target.files[0], d=>{ hd.image=d; render(); }); e.target.value=''; }});
    return h('div',{class:'mv-hand'+(on?' on':'')},
      h('div',{class:'row'},
        h('input',{class:'in', style:{fontWeight:'700',flex:'1'}, value:hd.title, onchange:e=>{hd.title=e.target.value;render();}}),
        on?h('span',{class:'badge ok'},'📺 no ar'):null,
        h('button',{class:'btn mini ghost', title:'Excluir', onclick:async()=>{ if(await cConfirm('Excluir o handout “'+hd.title+'”?',{perigo:true,okText:'Excluir'})){ if(p.handoutId===hd.id)p.handoutId=null; c.handouts=c.handouts.filter(x=>x.id!==hd.id); render(); } }},'✕')),
      h('div',{class:'mv-hand-body'},
        hd.image?h('img',{src:hd.image, class:'mv-hand-img', alt:''}):null,
        h('textarea',{class:'in', rows:'4', placeholder:'Texto que os jogadores vão ler (carta, aviso, enigma…)', onchange:e=>{hd.text=e.target.value;render();}}, hd.text||'')),
      h('div',{class:'row wrapf'},
        on?h('button',{class:'btn danger sm', onclick:()=>handoutMostrar(null)},'🙈 Ocultar dos jogadores')
          :h('button',{class:'btn emerald sm', onclick:()=>handoutMostrar(hd)},'📺 Mostrar aos jogadores'),
        h('button',{class:'btn ghost sm', onclick:()=>inp.click()}, hd.image?'🖼 Trocar imagem':'🖼 Adicionar imagem'),
        hd.image?h('button',{class:'btn ghost sm', onclick:()=>{hd.image=null;render();}},'Remover imagem'):null, inp));
  });
  return h('div',{},
    card('Handouts','Cartas, mapas do tesouro, avisos… O Mestre decide quando revelar; a Tela dos jogadores mostra só o handout “no ar”.',
      h('button',{class:'btn primary', onclick:novo},'+ Novo handout'),
      p.handoutId?h('button',{class:'btn danger sm', onclick:()=>handoutMostrar(null)},'🙈 Ocultar o atual'):null),
    cards.length?h('div',{class:'mv-notes'}, cards):h('div',{class:'pj-empty'},'Nenhum handout. Crie um e use “Mostrar aos jogadores”.'));
}

/* ============================ BUSCA DA CAMPANHA ============================ */
/* semAcento vem do master-nav; aqui um espelho seguro para não depender da ordem. */
const RE_ACENTO_C=new RegExp('[\\u0300-\\u036f]','g');
function semAcentoC(s){ return String(s==null?'':s).normalize('NFD').replace(RE_ACENTO_C,'').toLowerCase(); }

function campBuscaDestinos(q){
  const c=S.campaign, sys=S.system, t=semAcentoC(q).trim(), out=[];
  const ok=(...campos)=>!t||campos.some(x=>semAcentoC(x).includes(t));
  const fecha=()=>{ cmp().busca=null; if(S.ui&&S.ui.busca) S.ui.busca=null; };
  c.bestiary.npcs.forEach(n=>{ if(ok(n.name,n.papel,n.local,n.personalidade,n.notes)) out.push({t:'🎭 '+n.name, ond:'NPC'+(n.papel?' · '+n.papel:''), go:()=>{fecha();linkIr({type:'npc',id:n.id});}}); });
  c.bestiary.enemies.forEach(n=>{ if(ok(n.name,(n.tags||[]).join(' '),n.notes)) out.push({t:'🐉 '+n.name, ond:'Inimigo · '+n.hp+' PV', go:()=>{fecha();linkIr({type:'enemy',id:n.id});}}); });
  (sys.items||[]).forEach(n=>{ if(ok(n.name)) out.push({t:'🎒 '+n.name, ond:'Item do sistema', go:()=>{fecha(); if(typeof irParaAba==='function') irParaAba('itens'); irMtab('sistema');}}); });
  c.loot.forEach(n=>{ if(ok(n.nome||'',n.note||'')) out.push({t:'✳️ '+(n.nome||'Item do loot'), ond:'Loot da campanha', go:()=>{fecha();irMtab('itens');}}); });
  c.notebook.forEach(n=>{ if(ok(n.title,n.text,linkNome(n.link))) out.push({t:'📓 '+(n.title||'(nota)'), ond:'Nota'+(n.link?' · '+linkNome(n.link):''), go:()=>{fecha();cmp().notaSub='caderno';cmp().notaFoco=n.id;irMtab('notas');}}); });
  c.handouts.forEach(n=>{ if(ok(n.title,n.text)) out.push({t:'📜 '+n.title, ond:'Handout', go:()=>{fecha();cmp().notaSub='handouts';irMtab('notas');}}); });
  c.maps.forEach(m=>{
    if(ok(m.name,m.note)) out.push({t:'🗺️ '+m.name, ond:'Mapa', go:()=>{fecha();linkIr({type:'map',id:m.id});}});
    (m.pins||[]).forEach(p=>{ if(p.label&&ok(p.label,p.note)) out.push({t:(p.icon||'📍')+' '+p.label, ond:'Local · '+m.name, go:()=>{fecha();linkIr({type:'map',id:m.id});}}); });
  });
  c.players.forEach(n=>{ if(ok(n.name,n.note)) out.push({t:'🧍 '+n.name, ond:'Jogador', go:()=>{fecha();linkIr({type:'player',id:n.id});}}); });
  c.sessions.forEach(n=>{ if(ok(n.title,n.summary,n.decisions,n.events.map(e=>e.text).join(' '))) out.push({t:'📖 '+n.title, ond:'Sessão · '+fmtDataBR(n.date), go:()=>{fecha();cmp().diarioSel=n.id;irMtab('diario');}}); });
  return out;
}
function campBuscaAbrir(){ cmp().busca={q:''}; render(); }
function campBuscaOverlay(){
  const ui=cmp(); if(!ui.busca) return null;
  const lista=h('div',{class:'busca-l'});
  const preencher=termo=>{
    lista.innerHTML='';
    const res=campBuscaDestinos(termo).slice(0,40);
    if(!res.length){ lista.appendChild(h('div',{class:'busca-vazio'},'Nada encontrado para “'+termo+'”.')); return; }
    res.forEach((d,i)=>lista.appendChild(h('button',{class:'busca-i'+(i===0?' foco':''), onclick:d.go}, h('span',{},d.t), h('span',{class:'ond'},d.ond))));
  };
  const inp=h('input',{class:'in', id:'camp-busca', value:ui.busca.q||'', placeholder:'Buscar na campanha: NPC, inimigo, item, nota, mapa, sessão…',
    oninput:e=>{ ui.busca.q=e.target.value; preencher(e.target.value); },
    onkeydown:e=>{
      if(e.key==='Escape'){ ui.busca=null; render(); }
      if(e.key==='Enter'){ const b=lista.querySelector('.busca-i'); if(b) b.click(); }
    }});
  preencher(ui.busca.q||'');
  setTimeout(()=>{ try{ inp.focus(); inp.select(); }catch(e){} },0);
  return h('div',{class:'busca-bg', onclick:e=>{ if(e.target.classList.contains('busca-bg')){ ui.busca=null; render(); } }},
    h('div',{class:'busca-cx'}, inp, lista));
}
/* Ctrl+J abre a busca da campanha (Ctrl+K continua sendo a busca de ajustes do sistema). */
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='j' && S.account && S.view==='mestre' && S.campaign && document.querySelector('.mv-live')){
    e.preventDefault(); const ui=cmp(); ui.busca=ui.busca?null:{q:''}; render();
  }
});
