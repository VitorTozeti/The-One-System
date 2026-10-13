/* ============================================================ CAMPANHA — SESSÕES E DIÁRIO ============================================================
   Diário de sessão do Mestre: iniciar/encerrar, cronômetro, linha do tempo de
   eventos (notas, decisões, loot, XP, combates), resumo e "da última vez".
   Também guarda helpers pequenos usados por TODA a "Mesa ao vivo":
   cConfirm/cPrompt (usam os diálogos próprios se existirem), estado de UI
   (cmp()), formatação de tempo e o contador de alterações p/ lembrete de backup.
   Modelo: c.sessions[] / c.activeSessionId (ver campaign-model.js). */

/* ---------- Helpers comuns ---------- */
/* Estado de UI transitório da Mesa (não vai para o disco). */
function cmp(){ if(!S.ui) S.ui={}; if(!S.ui.camp) S.ui.camp={}; return S.ui.camp; }
/* Confirmar/perguntar: usa dialogs.js quando carregado; senão cai no nativo. */
function cConfirm(msg,opts){ return (typeof uiConfirm==='function')?uiConfirm(msg,opts):Promise.resolve(confirm(msg)); }
function cPrompt(msg,def,opts){
  if(typeof uiPrompt==='function') return uiPrompt(msg,def,opts).then(v=>typeof v==='string'?v:null);
  return Promise.resolve(prompt(msg,def));
}
function cAlert(msg){ return (typeof uiAlert==='function')?uiAlert(msg):Promise.resolve(alert(msg)); }
function pad2(n){ return String(n).padStart(2,'0'); }
function hojeISO(){ const d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function fmtDur(ms){ const m=Math.max(0,Math.floor(ms/60000)); return Math.floor(m/60)+'h'+pad2(m%60); }
function fmtHora(ts){ const d=new Date(ts); return pad2(d.getHours())+':'+pad2(d.getMinutes()); }
function fmtDataBR(iso){ if(!iso) return '—'; const p=String(iso).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):iso; }
/* Pede foco num campo depois do próximo render() (render recria todo o DOM). */
function pedeFoco(id){ cmp().refocus=id; }

/* ---------- Tipos de evento da linha do tempo ---------- */
const EV_KINDS=[
  {k:'nota',    ic:'📝', nome:'Nota'},
  {k:'decisao', ic:'🧭', nome:'Decisão'},
  {k:'combate', ic:'⚔️', nome:'Combate'},
  {k:'loot',    ic:'🎁', nome:'Loot'},
  {k:'xp',      ic:'⭐', nome:'XP'},
  {k:'sys',     ic:'⏱️', nome:'Sessão'},
];
function evKind(k){ return EV_KINDS.find(x=>x.k===k)||EV_KINDS[0]; }

/* ---------- Ciclo da sessão ---------- */
function sessAtiva(){ const c=S.campaign; return (c&&c.sessions.find(s=>s.id===c.activeSessionId))||null; }
/* Última sessão ENCERRADA (a que o Mestre quer recordar). */
function sessUltima(){
  const c=S.campaign; if(!c) return null;
  const fim=c.sessions.filter(s=>s.endedAt).sort((a,b)=>b.endedAt-a.endedAt);
  return fim[0]||null;
}
/* Registra um evento na sessão em andamento. Não chama render(). Retorna true se havia sessão. */
function sessEvento(text,kind){
  const s=sessAtiva(); if(!s||!String(text||'').trim()) return false;
  s.events.push({id:uid(), ts:Date.now(), text:String(text).trim(), kind:kind||'nota'});
  return true;
}
function sessIniciar(){
  const c=S.campaign;
  if(sessAtiva()) return showToast('Já existe uma sessão em andamento.');
  const n=c.sessions.reduce((m,s)=>Math.max(m,s.n||0),0)+1;
  const s={id:uid(), n, title:'Sessão '+n, date:hojeISO(), startedAt:Date.now(), endedAt:null,
           summary:'', decisions:'', xp:0, events:[]};
  c.sessions.push(s); c.activeSessionId=s.id; cmp().diarioSel=s.id;
  sessEvento('Sessão iniciada','sys');
  showToast('▶ Sessão '+n+' iniciada');
  render();
}
async function sessEncerrar(){
  const c=S.campaign, s=sessAtiva(); if(!s) return;
  if(c.combat&&c.combat.on){
    if(!(await cConfirm('Há um combate em andamento. Encerrar a sessão mesmo assim?',{okText:'Encerrar sessão'}))) return;
    if(typeof cbEncerrar==='function') cbEncerrar(true);
  }
  s.endedAt=Date.now(); c.activeSessionId=null;
  sessEvento('Sessão encerrada ('+fmtDur(s.endedAt-s.startedAt)+')','sys');
  cmp().diarioSel=s.id;
  if(typeof irMtab==='function') irMtab('diario');
  if(typeof backupLembrar==='function') backupLembrar(true);   /* fim de sessão = hora de salvar */
  showToast('⏹ Sessão encerrada — escreva o resumo');
  render();
}
/* Nota rápida (barra da Mesa ao vivo): vai ao diário, ou ao caderno se não houver sessão. */
function notaRapida(texto){
  const c=S.campaign, t=String(texto||'').trim(); if(!t) return;
  if(sessEvento(t,'nota')) showToast('📝 Anotado no diário');
  else { c.notebook.unshift({id:uid(), title:'Nota rápida', text:t, link:null, ts:Date.now()}); showToast('📝 Salvo no caderno (sem sessão ativa)'); }
  render();
}

/* ---------- XP do grupo ---------- */
function xpAdd(n,motivo){
  const c=S.campaign; n=Math.round(Number(n)||0); if(!n) return;
  c.xp.total=(c.xp.total||0)+n;
  c.xp.history.unshift({id:uid(), ts:Date.now(), n, motivo:motivo||''});
  if(c.xp.history.length>80) c.xp.history.length=80;
  sessEvento('+'+n+' XP ao grupo'+(motivo?' — '+motivo:''),'xp');
  showToast('⭐ +'+n+' XP');
}

/* ---------- Bloco "da última vez" (reaproveitado no painel) ---------- */
function ultimaVezBloco(){
  const s=sessUltima();
  if(!s) return h('div',{class:'hint'},'Nenhuma sessão encerrada ainda. Inicie a primeira para registrar o diário.');
  const evs=s.events.filter(e=>e.kind!=='sys').slice(-4);
  return h('div',{class:'mv-last'},
    h('div',{class:'mv-last-h'}, h('b',{},s.title), h('span',{class:'hint'},' · '+fmtDataBR(s.date)+(s.endedAt&&s.startedAt?' · '+fmtDur(s.endedAt-s.startedAt):''))),
    s.summary?h('div',{class:'mv-last-t'}, s.summary):h('div',{class:'hint'},'(sem resumo escrito)'),
    s.decisions?h('div',{class:'mv-last-d'}, h('b',{},'🧭 Decisões: '), s.decisions):null,
    evs.length?h('ul',{class:'mv-last-ev'}, evs.map(e=>h('li',{}, evKind(e.kind).ic+' '+e.text))):null,
    h('button',{class:'btn sm ghost', onclick:()=>{ cmp().diarioSel=s.id; irMtab('diario'); }},'📖 Abrir no diário'));
}

/* ---------- Seção "Diário" ---------- */
function diarioView(){
  const c=S.campaign, ui=cmp(), ativa=sessAtiva();
  const lista=c.sessions.slice().sort((a,b)=>(b.n||0)-(a.n||0));
  let sel=lista.find(s=>s.id===ui.diarioSel)||ativa||lista[0]||null;

  const topo=ativa
    ? card('Sessão em andamento','', h('button',{class:'btn danger', onclick:sessEncerrar},'⏹ Encerrar sessão'),
        h('div',{class:'mv-big'}, h('span',{class:'mv-timer','data-since':ativa.startedAt}, fmtDur(Date.now()-ativa.startedAt)),
          h('span',{class:'hint'},'  desde '+fmtHora(ativa.startedAt)+' · '+ativa.title)))
    : card('Diário de sessões','Registre o que aconteceu: serve de "o que houve da última vez" na próxima mesa.',
        h('button',{class:'btn emerald', onclick:sessIniciar},'▶ Iniciar sessão '+(c.sessions.reduce((m,s)=>Math.max(m,s.n||0),0)+1)));

  const linha=lista.length
    ? h('div',{class:'mv-tl'}, lista.map(s=>h('button',{class:'mv-tl-i'+(sel&&s.id===sel.id?' on':'')+(s.id===c.activeSessionId?' live':''),
        onclick:()=>{ ui.diarioSel=s.id; render(); }},
        h('b',{}, s.title), h('span',{class:'hint'}, fmtDataBR(s.date)+' · '+(s.events.filter(e=>e.kind!=='sys').length)+' ev.'+(s.id===c.activeSessionId?' · ao vivo':'')))))
    : h('div',{class:'pj-empty'},'Sem sessões ainda.');

  return h('div',{}, topo,
    card('Da última vez','O resumo da sessão anterior, para abrir a mesa lembrando de tudo.',null, ultimaVezBloco()),
    card('Linha do tempo',null,null, linha),
    sel?sessEditor(sel):null);
}

function sessEditor(s){
  const c=S.campaign, ui=cmp(), ao=s.id===c.activeSessionId;
  const kindSel=ui.evKind||'nota';
  const addEv=()=>{
    const inp=document.getElementById('ev-input'); const t=inp&&inp.value.trim(); if(!t) return;
    s.events.push({id:uid(), ts:Date.now(), text:t, kind:ui.evKind||'nota'}); pedeFoco('ev-input'); render();
  };
  const evs=s.events.slice().sort((a,b)=>b.ts-a.ts);
  const lootSel=h('select',{class:'in sm', id:'ev-loot', style:{width:'auto',maxWidth:'180px'}},
    h('option',{value:''},'🎁 do loot da campanha…'), c.loot.map(l=>h('option',{value:l.id}, (l.nome||'Item')+' ×'+l.qty)));
  return card('📖 '+s.title+(ao?' (ao vivo)':''), fmtDataBR(s.date)+(s.startedAt?(' · começou '+fmtHora(s.startedAt)):'')+(s.endedAt?' · '+fmtDur(s.endedAt-s.startedAt):''),
    h('button',{class:'btn ghost sm', title:'Excluir esta sessão', onclick:async()=>{
      if(!(await cConfirm('Excluir "'+s.title+'" e todos os seus eventos?',{perigo:true,okText:'Excluir'}))) return;
      c.sessions=c.sessions.filter(x=>x.id!==s.id); if(c.activeSessionId===s.id) c.activeSessionId=null; ui.diarioSel=null; render(); }},'🗑'),
    h('div',{class:'row wrapf'},
      field('Título', h('input',{class:'in', value:s.title, onchange:e=>{s.title=e.target.value||('Sessão '+s.n);render();}})),
      field('Data', h('input',{class:'in', type:'date', value:s.date||'', onchange:e=>{s.date=e.target.value;render();}}))),
    field('Resumo (o que aconteceu)', h('textarea',{class:'in', rows:'4', placeholder:'Em poucas linhas: onde o grupo parou, o que descobriu…',
      onchange:e=>{s.summary=e.target.value;render();}}, s.summary||'')),
    field('Decisões e consequências', h('textarea',{class:'in', rows:'2', placeholder:'O que o grupo escolheu e o que isso muda…',
      onchange:e=>{s.decisions=e.target.value;render();}}, s.decisions||'')),
    /* XP da sessão: concede ao grupo e registra no evento */
    h('div',{class:'row wrapf mv-xp'},
      field('XP da sessão', h('input',{class:'in', type:'number', style:{width:'90px'}, value:s.xp||0, onchange:e=>{s.xp=parseInt(e.target.value)||0;render();}})),
      h('button',{class:'btn sm', onclick:()=>{ const n=s.xp||0; if(!n) return showToast('Informe o XP.');
        const o=sessAtiva(); const alvo=s; xpAdd(n,alvo.title); if(!o||o.id!==alvo.id) alvo.events.push({id:uid(),ts:Date.now(),text:'+'+n+' XP ao grupo','kind':'xp'}); s.xp=0; render(); }},'⭐ Conceder ao grupo'),
      h('span',{class:'hint'},'Total do grupo: '+(c.xp.total||0)+' XP')),
    h('div',{class:'mv-evbar'},
      h('select',{class:'in sm', style:{width:'auto'}, onchange:e=>{ui.evKind=e.target.value;}},
        EV_KINDS.filter(k=>k.k!=='sys').map(k=>{const o=h('option',{value:k.k},k.ic+' '+k.nome); if(k.k===kindSel)o.selected=true; return o;})),
      h('input',{id:'ev-input', class:'in', placeholder:'Adicionar evento à linha do tempo… (Enter)', onkeydown:e=>{ if(e.key==='Enter'){ e.preventDefault(); addEv(); } }}),
      h('button',{class:'btn primary sm', onclick:addEv},'+'),
      lootSel,
      h('button',{class:'btn sm ghost', onclick:()=>{ const id=document.getElementById('ev-loot').value; const l=c.loot.find(x=>x.id===id); if(!l) return showToast('Escolha um item.');
        const own=c.players.find(p=>p.id===l.ownerPlayerId);
        s.events.push({id:uid(),ts:Date.now(),kind:'loot',text:(l.nome||'Item')+' ×'+l.qty+(own?' → '+own.name:'')}); render(); }},'Registrar')),
    evs.length
      ? h('div',{class:'mv-evlist'}, evs.map(e=>h('div',{class:'mv-ev k-'+e.kind},
          h('span',{class:'mv-ev-h'}, fmtHora(e.ts)), h('span',{class:'mv-ev-ic'}, evKind(e.kind).ic),
          h('span',{class:'mv-ev-t'}, e.text),
          h('button',{class:'btn mini ghost', title:'Remover', onclick:()=>{ s.events=s.events.filter(x=>x.id!==e.id); render(); }},'✕'))))
      : h('div',{class:'hint'},'Sem eventos. Use a barra acima (ou a nota rápida da Mesa ao vivo) durante o jogo.'));
}
