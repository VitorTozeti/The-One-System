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
  {k:'notas',     ic:'📓', nome:'Notas'},
  {k:'dados',     ic:'🎲', nome:'Dados'},
];
/* quais seções pertencem a cada lado */
const MLEFT =['painel','sistema','jogadores','bestiario','itens'];
const MRIGHT=['mapa','notas','dados'];
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
  if(k==='mapa'&&c.map.pins.length) return c.map.pins.length;
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
  return h('div',{class:'mdash2'}, mrail('L'), panes, mrail('R'));
}

/* ---------- Painel (visão geral) ---------- */
function painelView(){
  const c=S.campaign, sys=S.system;
  const idHead=card('Identidade da campanha','Nome e resumo da sua mesa.',null,
    field('Nome da campanha', h('input',{class:'in',value:c.name,placeholder:'ex.: A Queda de Valdrin',
      onchange:e=>{c.name=e.target.value;render();}})),
    field('Resumo', h('textarea',{class:'in',rows:'3',placeholder:'Do que se trata…',
      onchange:e=>{c.summary=e.target.value;render();}}, c.summary||'')));

  /* status do sistema: reaproveita problemasDaAba de todas as abas */
  let problemas=[];
  try{ (typeof TAB_META!=='undefined'?TAB_META:[]).forEach(t=>{ (problemasDaAba(sys,t.k)||[]).forEach(p=>problemas.push(p)); }); }catch(e){}
  const status=card('Status do sistema', problemas.length?'Pendências que podem travar o jogador.':'Tudo certo para jogar. ✔',
    h('button',{class:'btn sm', onclick:()=>irMtab('sistema')},'⚙️ Abrir editor'),
    problemas.length
      ? h('ul',{class:'pnl-probs'}, problemas.slice(0,8).map(p=>h('li',{},p)))
      : h('div',{class:'hint'},'Nenhum problema detectado nas regras.'));

  const jogadores=card('Jogadores', c.players.length?(c.players.length+' na mesa'):'Ninguém ainda.',
    h('button',{class:'btn sm primary', onclick:()=>irMtab('jogadores')},'Gerenciar'),
    c.players.length
      ? h('div',{class:'pnl-players'}, c.players.map(p=>h('span',{class:'chip'}, '🧍 '+p.name)))
      : h('div',{class:'hint'},'Importe a ficha de um jogador na seção Jogadores.'));

  const resumoNums=h('div',{class:'pnl-stats'},
    pnlStat('🐉', c.bestiary.enemies.length, 'inimigos', ()=>irMtab('bestiario')),
    pnlStat('🎭', c.bestiary.npcs.length, 'NPCs', ()=>irMtab('bestiario')),
    pnlStat('🎒', c.loot.length, 'itens', ()=>irMtab('itens')),
    pnlStat('📍', c.map.pins.length, 'locais', ()=>irMtab('mapa')));

  const acoes=card('Rolagem rápida',null,null, rolagemRapida());

  return h('div',{class:'pnl-grid'}, idHead, status, jogadores, resumoNums, acoes);
}
function pnlStat(ic,n,label,onclick){
  return h('button',{class:'pnl-stat', onclick}, h('div',{class:'pnl-stat-n'}, ic+' '+n), h('div',{class:'pnl-stat-l'},label));
}
