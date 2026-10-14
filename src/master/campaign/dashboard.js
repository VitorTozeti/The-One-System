/* ============================================================ CAMPANHA — DASHBOARD ============================================================
   Casca do modo Mestre. Layout de DOIS menus laterais + MÚLTIPLOS painéis:
     • Menu da ESQUERDA (índigo): Painel, Sistema, Jogadores, Bestiário, Itens.
     • Menu da DIREITA  (âmbar):  Mapa, Notas, Dados.
   Clicar num item abre/fecha aquela seção. VÁRIAS seções podem ficar abertas ao
   mesmo tempo (S.mopen = lista de chaves); os painéis abertos se distribuem e
   quebram em linha. Fechar painéis faz os restantes ocuparem o espaço.
   A seção "Sistema" reaproveita o editor existente (mestreView). Depende de
   state (S), ui-basic (card) e das seções (jogadoresView, mapaView, …). */

const MTAB_META=[
  {k:'painel',    ic:'🧭', nome:'Painel'},
  {k:'sistema',   ic:'⚙️', nome:'Sistema'},
  {k:'jogadores', ic:'🧑‍🤝‍🧑', nome:'Jogadores'},
  {k:'bestiario', ic:'🐉', nome:'Bestiário'},
  {k:'itens',     ic:'🎒', nome:'Itens'},
  {k:'mapa',      ic:'🗺️', nome:'Mapa'},
  {k:'combate',   ic:'⚔️', nome:'Combate'},
  {k:'diario',    ic:'📖', nome:'Diário'},
  {k:'notas',     ic:'📓', nome:'Notas'},
  {k:'dados',     ic:'🎲', nome:'Dados'},
  {k:'ferramentas',ic:'🧰', nome:'Ferramentas'},
];
/* quais seções pertencem a cada lado */
const MLEFT =['painel','sistema','jogadores','bestiario','itens'];
const MRIGHT=['mapa','combate','diario','notas','dados','ferramentas'];
function metaOf(k){ return MTAB_META.find(t=>t.k===k); }
function sideOf(k){ return MRIGHT.includes(k)?'R':'L'; }

/* Vários painéis podem ficar abertos ao mesmo tempo (S.mopen = lista de chaves). */
function mopen(){ if(!Array.isArray(S.mopen)) S.mopen=['painel']; return S.mopen; }
function isOpen(k){ return mopen().includes(k); }
function toggleMtab(k){
  const a=mopen(), i=a.indexOf(k);
  if(i>=0) a.splice(i,1); else a.push(k);
  render();
}
/* Garante que a seção esteja aberta (usado pelos atalhos do Painel). */
function irMtab(k){ if(!isOpen(k)) mopen().push(k); render(); }
function fecharPainel(k){ const a=mopen(), i=a.indexOf(k); if(i>=0){ a.splice(i,1); render(); } }
/* Ordem estável: seções da esquerda primeiro, depois as da direita. */
function ordemAbertos(){
  const ordem=[...MLEFT,...MRIGHT];
  return mopen().slice().sort((a,b)=>ordem.indexOf(a)-ordem.indexOf(b));
}

/* renderiza o conteúdo de uma seção pela chave */
function secView(k){
  switch(k){
    case 'jogadores': return jogadoresView();
    case 'mapa':      return mapaView();
    case 'bestiario': return bestiarioView();
    case 'itens':     return itensCampanhaView();
    case 'dados':     return dadosCampanhaView();
    case 'notas':     return notasView();
    case 'combate':   return combateView();            /* initiative.js */
    case 'diario':    return diarioView();             /* sessions.js */
    case 'ferramentas': return ferramentasView();      /* table-tools.js */
    case 'sistema':   return mestreView();            /* editor de sistema existente */
    case 'painel':    return painelView();
    default:          return painelView();
  }
}

/* contador de badge por seção */
function tabBadge(k){
  const c=S.campaign||defaultCampaign();
  if(k==='jogadores'&&c.players.length) return c.players.length;
  if(k==='bestiario'&&(c.bestiary.enemies.length+c.bestiary.npcs.length)) return c.bestiary.enemies.length+c.bestiary.npcs.length;
  if(k==='itens'&&c.loot.length) return c.loot.length;
  if(k==='mapa'&&Array.isArray(c.maps)&&c.maps.length) return c.maps.length;
  if(k==='combate'&&c.combat&&c.combat.on) return 'R'+c.combat.round;
  if(k==='diario'&&c.sessions.length) return c.sessions.length;
  if(k==='notas'&&(c.notebook.length+c.handouts.length)) return c.notebook.length+c.handouts.length;
  return null;
}

/* um menu lateral (rail) — clicar abre/fecha a seção (várias podem ficar abertas) */
function mrail(side){
  const chaves = side==='R'?MRIGHT:MLEFT;
  const titulo = side==='R'?'🗂️ Mesa':'🛠️ Sistema';
  const botoes = chaves.map(k=>{
    const t=metaOf(k), badge=tabBadge(k);
    return h('button',{class:'mrail-btn'+(isOpen(k)?' on':''), onclick:()=>toggleMtab(k),
      title:(isOpen(k)?'Fechar ':'Abrir ')+t.nome},
      h('span',{class:'mrail-ic'},t.ic), h('span',{class:'mrail-lbl'},t.nome),
      badge!=null?h('span',{class:'mrail-badge'},badge):null,
      isOpen(k)?h('span',{class:'mrail-dot'}):null);
  });
  return h('nav',{class:'mrail '+(side==='R'?'right':'left')},
    h('div',{class:'mrail-title'},titulo), botoes);
}

/* um painel de conteúdo (uma seção aberta) */
function mpane(k){
  const t=metaOf(k), lado=sideOf(k)==='R'?'right':'left';
  const head=h('div',{class:'mpane-head'},
    h('div',{class:'mpane-title'}, h('span',{class:'mpane-ic'},t.ic), t.nome),
    h('button',{class:'mpane-x', title:'Fechar painel', onclick:()=>fecharPainel(k)},'✕'));
  return h('section',{class:'mpane '+lado},
    head, h('div',{class:'mpane-body'}, secView(k)));
}

function mestreDashboard(){
  const abertos=ordemAbertos();
  const panes = abertos.length
    ? h('div',{class:'mpanes'}, abertos.map(k=>mpane(k)))
    : h('div',{class:'mpanes'}, h('section',{class:'mpane empty'},
        h('div',{class:'mpane-empty'}, h('div',{class:'mpane-empty-ic'},'🎲'),
          h('div',{},'Use os menus laterais para abrir o Sistema, os Jogadores, o Mapa… Pode abrir quantos quiser ao mesmo tempo.'))));
  /* Mesa ao vivo: barra compacta sempre à vista (sessão, combate, nota rápida, rolagem secreta, busca). */
  const centro=h('div',{class:'mdash-centro'}, mesaViva(), panes);
  return h('div',{class:'mdash2'}, mrail('L'), centro, mrail('R'),
    campBuscaOverlay(), importOverlay());
}

/* ---------- Mesa ao vivo: barra compacta sempre visível ----------
   Sessão (cronômetro, iniciar/encerrar) · combate (turno atual, próximo/anterior) ·
   nota rápida (Enter → diário) · rolagem secreta (Enter) · busca (Ctrl+J) · tela dos jogadores. */
function mesaViva(){
  const c=S.campaign, ui=cmp(), ativa=sessAtiva(), cb=c.combat;
  const sessao = ativa
    ? h('div',{class:'mv-sess live'},
        h('span',{class:'mv-dot'}), h('b',{class:'mv-timer','data-since':ativa.startedAt}, fmtDur(Date.now()-ativa.startedAt)),
        h('span',{class:'hint'}, ativa.title),
        h('button',{class:'btn sm danger', title:'Encerrar a sessão', onclick:sessEncerrar},'⏹'))
    : h('div',{class:'mv-sess'}, h('button',{class:'btn sm emerald', onclick:sessIniciar},'▶ Iniciar sessão'));
  const combate = (cb.on && cb.order.length) ? combateMini()
    : h('button',{class:'btn sm ghost', onclick:()=>irMtab('combate')}, '⚔️ '+(cb.order.length?'Combate (parado)':'Combate'));
  const nota=h('input',{class:'in mv-quick', id:'mv-quick', placeholder:ativa?'📝 Nota rápida → diário (Enter)':'📝 Nota rápida → caderno (Enter)', 'aria-label':'Nota rápida',
    onkeydown:e=>{ if(e.key==='Enter'&&e.target.value.trim()){ const t=e.target.value; e.target.value=''; pedeFoco('mv-quick'); notaRapida(t); } }});
  const secreta=h('input',{class:'in mv-quick sec', placeholder:'🤫 Rolagem secreta (ex.: 1d20+3)', 'aria-label':'Rolagem secreta',
    onkeydown:e=>{ if(e.key==='Enter'&&e.target.value.trim()){ const t=e.target.value; e.target.value=''; rolarSecreta(t); } }});
  const pres=c.present.live
    ? h('button',{class:'btn sm emerald', title:'Transmitindo para a Tela dos jogadores', onclick:()=>{ui.ferrSub='tela';irMtab('ferramentas');}}, '📺 ao vivo')
    : h('button',{class:'btn sm ghost', title:'Tela dos jogadores', onclick:()=>{ui.ferrSub='tela';irMtab('ferramentas');}}, '📺');
  return h('div',{class:'mv-live'},
    h('div',{class:'mv-row'}, sessao, combate, h('span',{class:'mv-flex'}), nota, secreta,
      h('button',{class:'btn sm ghost', title:'Buscar na campanha (Ctrl+J)', onclick:campBuscaAbrir}, '🔎'), pres),
    backupFaixa());
}

/* ---------- Painel (visão geral): "Mesa ao vivo" ---------- */
function painelView(){
  const c=S.campaign, sys=S.system, ui=cmp(), ativa=sessAtiva(), cb=c.combat;

  /* Atalhos grandes — o que o Mestre mais faz, a um clique */
  const tile=(ic,t,sub,fn,cls)=>h('button',{class:'mv-tile '+(cls||''), onclick:fn}, h('span',{class:'mv-tile-ic'},ic), h('b',{},t), sub?h('small',{},sub):null);
  const atalhos=h('div',{class:'mv-tiles'},
    ativa?tile('⏹','Encerrar sessão',ativa.title+' · '+fmtDur(Date.now()-ativa.startedAt),sessEncerrar,'danger')
         :tile('▶','Iniciar sessão','Liga cronômetro e diário',sessIniciar,'go'),
    tile('⚔️',cb.on?'Combate · R'+cb.round:'Combate',cb.on?('vez de '+((cb.order[cb.turn]||{}).name||'—')):(cb.order.length?cb.order.length+' na lista':'Iniciativa e HP'),()=>irMtab('combate'),cb.on?'hot':''),
    tile('🗺️','Mapa',curMap()?curMap().name:'Nenhum mapa',()=>irMtab('mapa')),
    tile('📺','Tela dos jogadores',c.present.live?'transmitindo':'projetor / chamada',()=>{ui.ferrSub='tela';irMtab('ferramentas');},c.present.live?'go':''),
    tile('🎲','Dados','Montar e rolar',()=>irMtab('dados')),
    tile('🔎','Buscar','NPC, nota, mapa… (Ctrl+J)',campBuscaAbrir));

  const ultima=card('Da última vez','Para abrir a mesa lembrando de tudo.',
    h('button',{class:'btn sm', onclick:()=>irMtab('diario')},'📖 Diário'), ultimaVezBloco());

  const prep=card('Próximos passos','Anotações de preparação para esta/próxima sessão.',null,
    h('textarea',{class:'in', rows:'4', placeholder:'• Cena de abertura\n• Segredo que o grupo pode descobrir\n• Encontro planejado', 'aria-label':'Próximos passos',
      onchange:e=>{c.prep=e.target.value;render();}}, c.prep||''),
    pendencias());

  const jogadores=card('Jogadores', c.players.length?(c.players.length+' na mesa'):'Ninguém ainda.',
    h('button',{class:'btn sm primary', onclick:()=>irMtab('jogadores')},'Gerenciar'),
    c.players.length
      ? h('div',{class:'pnl-players'}, c.players.map(p=>h('span',{class:'chip'}, '🧍 '+p.name)))
      : h('div',{class:'hint'},'Importe a ficha de um jogador na seção Jogadores.'));

  const resumoNums=h('div',{class:'pnl-stats'},
    pnlStat('🐉', c.bestiary.enemies.length, 'inimigos', ()=>irMtab('bestiario')),
    pnlStat('🎭', c.bestiary.npcs.length, 'NPCs', ()=>irMtab('bestiario')),
    pnlStat('🎒', c.loot.length, 'itens', ()=>irMtab('itens')),
    pnlStat('🧍', totalTokens(), 'tokens no mapa', ()=>irMtab('mapa')),
    pnlStat('⭐', c.xp.total||0, 'XP do grupo', ()=>{ui.ferrSub='xp';irMtab('ferramentas');}));

  const acoes=card('Rolagem rápida',null,null, rolagemRapida());

  /* Identidade e status do sistema ficam recolhidos: raramente mudam durante a mesa */
  let problemas=[];
  try{ (typeof TAB_META!=='undefined'?TAB_META:[]).forEach(t=>{ (problemasDaAba(sys,t.k)||[]).forEach(p=>problemas.push(p)); }); }catch(e){}
  const config=h('details',{class:'mv-det'},
    h('summary',{}, '⚙️ Campanha e sistema'+(problemas.length?' · '+problemas.length+' pendência(s)':' · tudo certo')),
    card('Identidade da campanha','Nome e resumo da sua mesa.',null,
      field('Nome da campanha', h('input',{class:'in',value:c.name,placeholder:'ex.: A Queda de Valdrin', onchange:e=>{c.name=e.target.value;render();}})),
      field('Resumo', h('textarea',{class:'in',rows:'3',placeholder:'Do que se trata…', onchange:e=>{c.summary=e.target.value;render();}}, c.summary||''))),
    card('Status do sistema', problemas.length?'Pendências que podem travar o jogador.':'Tudo certo para jogar. ✔',
      h('button',{class:'btn sm', onclick:()=>irMtab('sistema')},'⚙️ Abrir editor'),
      problemas.length?h('ul',{class:'pnl-probs'}, problemas.slice(0,8).map(p=>h('li',{},p))):h('div',{class:'hint'},'Nenhum problema detectado nas regras.')));

  return h('div',{class:'mv-painel'}, atalhos,
    h('div',{class:'pnl-grid'}, ultima, prep, jogadores, resumoNums, acoes),
    config);
}
/* Lembretes automáticos: coisas que costumam travar a mesa se esquecidas. */
function pendencias(){
  const c=S.campaign, l=[];
  const semFicha=c.players.filter(p=>!p.sheet).length;
  if(!c.players.length) l.push(['🧍','Cadastre os jogadores','jogadores']);
  else if(semFicha) l.push(['📝',semFicha+' jogador(es) sem ficha importada','jogadores']);
  if(!c.maps.length) l.push(['🗺️','Nenhum mapa criado','mapa']);
  if(!c.bestiary.enemies.length) l.push(['🐉','Bestiário sem inimigos','bestiario']);
  const quase=c.clocks.filter(k=>k.segs-k.filled<=1&&k.filled<k.segs).length;
  if(quase) l.push(['⏳',quase+' relógio(s) a um passo de completar','ferramentas']);
  if(c.handouts.length&&!c.present.handoutId) l.push(['📜',c.handouts.length+' handout(s) prontos para revelar','notas']);
  if(!l.length) return h('div',{class:'hint', style:{marginTop:'8px'}},'✔ Nada pendente na preparação.');
  return h('div',{class:'mv-pend'}, l.map(([ic,t,k])=>h('button',{class:'mv-pend-i', onclick:()=>irMtab(k)}, h('span',{},ic), t, h('span',{class:'hint'},'abrir →'))));
}
function pnlStat(ic,n,label,onclick){
  return h('button',{class:'pnl-stat', onclick}, h('div',{class:'pnl-stat-n'}, ic+' '+n), h('div',{class:'pnl-stat-l'},label));
}

/* ============================ GANCHOS DE RENDER ============================
   Envolvem render() sem tocar em state.js:
     • antes: marca no token do mapa quem tem a vez no combate (t.turn);
     • depois: foco/rolagem pedidos, destaque do token, cronômetro, contador de
       alterações (lembrete de backup) e envio do retrato à Tela dos jogadores. */
let _sigMesa='';
function posRenderMesa(){
  if(typeof telaModo==='function'&&telaModo()) return;
  const c=S.campaign; if(!c||!S.account) return;
  const ui=cmp();
  /* contador de alterações reais (ignora strings longas = imagens) */
  try{
    const sig=JSON.stringify(c,(k,v)=>(typeof v==='string'&&v.length>200)?('~'+v.length):v);
    if(sig!==_sigMesa){ if(_sigMesa) c.meta.changes=(c.meta.changes||0)+1; _sigMesa=sig; }
  }catch(e){}
  try{ cbMarcarTokenDOM(); }catch(e){}
  if(ui.refocus){ const el=document.getElementById(ui.refocus); ui.refocus=null; if(el){ try{ el.focus({preventScroll:true}); }catch(e){} } }
  const alvo=ui.focus||(ui.notaFoco&&('nt-'+ui.notaFoco));
  if(alvo){ ui.focus=null; ui.notaFoco=null; const el=document.getElementById(alvo);
    if(el){ el.scrollIntoView({block:'center',behavior:'smooth'}); el.classList.add('mv-pulse'); setTimeout(()=>el.classList.remove('mv-pulse'),1800); } }
  try{ presAgendar(); }catch(e){}
}
(function(){
  const base=render;
  render=function(){
    try{ if(typeof cbSyncTokenFlags==='function') cbSyncTokenFlags(); }catch(e){}
    base.apply(this,arguments);
    try{ posRenderMesa(); }catch(e){ console.error(e); }
  };
  /* cronômetro da sessão: atualiza só o texto, sem render() */
  setInterval(()=>{
    document.querySelectorAll('.mv-timer[data-since]').forEach(el=>{ el.textContent=fmtDur(Date.now()-Number(el.dataset.since)); });
  },20000);
})();
