/* ============================================================ CAMPANHA — DASHBOARD ============================================================
   Casca do modo Mestre: navegação entre as seções da campanha. A seção
   "Sistema" reaproveita o editor existente (mestreView). Depende de state (S),
   ui-basic (card), e das seções (jogadoresView, mapaView, …). */

const MTAB_META=[
  {k:'painel',    ic:'🧭', nome:'Painel'},
  {k:'jogadores', ic:'🧑‍🤝‍🧑', nome:'Jogadores'},
  {k:'mapa',      ic:'🗺️', nome:'Mapa'},
  {k:'bestiario', ic:'🐉', nome:'Bestiário'},
  {k:'itens',     ic:'🎒', nome:'Itens'},
  {k:'dados',     ic:'🎲', nome:'Dados'},
  {k:'notas',     ic:'📓', nome:'Notas'},
  {k:'sistema',   ic:'⚙️', nome:'Sistema'},
];
function mtabAtual(){ return S.mtab||'painel'; }
function irMtab(k){ S.mtab=k; render(); window.scrollTo(0,0); }

function mestreDashboard(){
  const c=S.campaign||defaultCampaign();
  const nav=h('div',{class:'mdash-nav'}, MTAB_META.map(t=>{
    let badge=null;
    if(t.k==='jogadores'&&c.players.length) badge=c.players.length;
    if(t.k==='bestiario'&&(c.bestiary.enemies.length+c.bestiary.npcs.length)) badge=c.bestiary.enemies.length+c.bestiary.npcs.length;
    if(t.k==='itens'&&c.loot.length) badge=c.loot.length;
    return h('button',{class:'mdash-tab'+(mtabAtual()===t.k?' on':''), onclick:()=>irMtab(t.k)},
      h('span',{class:'mdash-ic'},t.ic), h('span',{},t.nome),
      badge!=null?h('span',{class:'mdash-badge'},badge):null);
  }));

  let sec;
  switch(mtabAtual()){
    case 'jogadores': sec=jogadoresView(); break;
    case 'mapa':      sec=mapaView(); break;
    case 'bestiario': sec=bestiarioView(); break;
    case 'itens':     sec=itensCampanhaView(); break;
    case 'dados':     sec=dadosCampanhaView(); break;
    case 'notas':     sec=notasView(); break;
    case 'sistema':   sec=mestreView(); break;   /* editor de sistema existente */
    default:          sec=painelView();
  }
  return h('div',{class:'mdash'}, nav, h('div',{class:'mdash-body'}, sec));
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
