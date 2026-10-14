/* ---------- Itens prontos (só identidade; efeitos o Mestre liga depois) ---------- */
/* classes e origens prontas (com mecânica) ficam em classes-origens.js */
const CATALOGO_ITENS=[
  {n:'Espada longa',c:'arma',w:1.5,e:true,d:'Lâmina versátil de uma mão.'},{n:'Arco curto',c:'arma',w:1,e:true,d:'Leve, para disparos rápidos.'},
  {n:'Adaga',c:'arma',w:0.5,e:true,d:'Pequena e fácil de esconder.'},{n:'Cajado',c:'arma',w:2,e:true,d:'Foco de magia e apoio de viagem.'},
  {n:'Armadura de couro',c:'armadura',w:5,e:true,d:'Proteção leve.'},{n:'Cota de malha',c:'armadura',w:10,e:true,d:'Proteção média, barulhenta.'},
  {n:'Escudo',c:'armadura',w:3,e:true,d:'Desvia golpes.'},{n:'Anel simples',c:'acessorio',w:0.1,e:true,d:'Um anel sem poder aparente.'},
  {n:'Mochila',c:'ferramenta',w:1,e:false,d:'Carrega o equipamento da aventura.'},{n:'Corda (15 m)',c:'ferramenta',w:2.5,e:false,d:'Útil para escalar e amarrar.'},
  {n:'Tocha',c:'ferramenta',w:0.5,e:false,d:'Ilumina por algumas horas.'},{n:'Poção de cura',c:'consumivel',w:0.2,e:false,d:'Restaura ferimentos ao beber.'},
  {n:'Ração de viagem',c:'consumivel',w:0.5,e:false,d:'Comida para um dia.'}];
/* Excluir com rede de proteção: guarda o sistema antes e oferece "Desfazer" por toast. */
function comDesfazer(msg,acao){
  const snap=JSON.stringify(S.system);
  acao(); S.ui.sel=null; render();
  uiToastUndo(msg,()=>{ S.system=JSON.parse(snap); S.ui.sel=null; render(); },9000);
}
function bibliotecaGenerica(titulo,lista,jaTem,adicionar){
  const faltam=lista.filter(p=>!jaTem(p));
  return h('div',{class:'per-lib',style:{margin:'10px 0'}},
    h('div',{class:'per-g-cab'},h('b',{},titulo),
      h('button',{class:'btn ghost sm',type:'button',disabled:!faltam.length,
        onclick:()=>{ faltam.forEach(adicionar); render(); showToast(faltam.length+' adicionado(s)'); }},
        faltam.length?('+ todos ('+faltam.length+')'):'✓ todos')),
    h('div',{class:'row wrapf'},...lista.map(p=>{
      const tem=jaTem(p);
      return h('button',{type:'button',class:'chip'+(tem?' on':''),'aria-pressed':tem?'true':'false',disabled:tem,
        title:p.d+(tem?'\n(já adicionado)':'\n(clique para adicionar)'),onclick:()=>{ adicionar(p); render(); }},(tem?'✓ ':'+ ')+p.n);
    })));
}
const _tem=(l,n)=>(l||[]).some(x=>semAcento(x.name||'')===semAcento(n));
function bibliotecaItens(sys){
  return bibliotecaGenerica('📚 Itens prontos',CATALOGO_ITENS,p=>_tem(sys.items,p.n),
    p=>sys.items.push({id:uid(),name:p.n,description:p.d,categoria:p.c,weight:p.w,equipavel:p.e,effects:[]}));
}
