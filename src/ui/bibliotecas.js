/* ============================================================ BIBLIOTECAS PRONTAS ============================================================
   Atalhos de "remixar em vez de começar do zero": um clique adiciona uma peça pronta que o
   Mestre depois edita à vontade. Cada item entra sem efeitos mecânicos, só identidade
   (nome, ícone, cor, descrição); os efeitos o Mestre liga se quiser. */
const CATALOGO_CONDICOES=[
  {n:'Envenenado',   ic:'☠️', c:'#16a34a', d:'Sofre dano ao longo do tempo e age pior até se curar.'},
  {n:'Em chamas',    ic:'🔥', c:'#ea580c', d:'Queima a cada rodada até apagar o fogo.'},
  {n:'Sangrando',    ic:'🩸', c:'#dc2626', d:'Perde vida a cada rodada até ser estancado.'},
  {n:'Atordoado',    ic:'💫', c:'#ca8a04', d:'Perde o turno ou age com grande desvantagem.'},
  {n:'Caído',        ic:'⬇️', c:'#78716c', d:'No chão: levantar custa movimento e atacar é mais difícil.'},
  {n:'Cego',         ic:'🙈', c:'#475569', d:'Não enxerga; ataques e percepção visual falham.'},
  {n:'Surdo',        ic:'🔇', c:'#64748b', d:'Não ouve; não percebe sons nem comandos falados.'},
  {n:'Amedrontado',  ic:'😨', c:'#7c3aed', d:'Com medo: não consegue se aproximar da fonte do medo.'},
  {n:'Agarrado',     ic:'🤝', c:'#b45309', d:'Preso por alguém ou algo; não pode se mover.'},
  {n:'Invisível',    ic:'👻', c:'#0891b2', d:'Não pode ser visto; ataques contra ele são difíceis.'},
  {n:'Enfeitiçado',  ic:'💘', c:'#db2777', d:'Trata quem o enfeitiçou como aliado.'},
  {n:'Lento',        ic:'🐌', c:'#0d9488', d:'Movimento reduzido pela metade.'},
  {n:'Fatigado',     ic:'😮‍💨', c:'#a16207', d:'Cansaço: rolagens pioram até descansar.'},
  {n:'Inconsciente', ic:'💤', c:'#334155', d:'Desacordado; não age e não percebe nada.'},
];
function condicaoExiste(sys,n){ return (sys.conditions||[]).findIndex(c=>semAcento(c.name||'')===semAcento(n)); }
function bibliotecaCondicoes(sys){
  const faltam=CATALOGO_CONDICOES.filter(p=>condicaoExiste(sys,p.n)<0);
  const add=p=>sys.conditions.push({id:uid(),name:p.n,icon:p.ic,color:p.c,description:p.d,noStack:true,niveis:0,componentes:[],effects:[]});
  return h('div',{class:'per-lib',style:{margin:'10px 0'}},
    h('div',{class:'per-g-cab'},h('b',{},'📚 Condições prontas'),
      h('button',{class:'btn ghost sm',type:'button',disabled:!faltam.length,
        onclick:()=>{ faltam.forEach(add); render(); showToast(faltam.length+' condição(ões) adicionada(s)'); }},
        faltam.length?('+ todas ('+faltam.length+')'):'✓ todas')),
    h('div',{class:'row wrapf'},...CATALOGO_CONDICOES.map(p=>{
      const tem=condicaoExiste(sys,p.n)>=0;
      return h('button',{type:'button',class:'chip'+(tem?' on':''),'aria-pressed':tem?'true':'false',title:p.d+(tem?'\n(já adicionada)':'\n(clique para adicionar)'),
        disabled:tem,onclick:()=>{ add(p); render(); }},(tem?'✓ ':'+ ')+p.ic+' '+p.n);
    })));
}
