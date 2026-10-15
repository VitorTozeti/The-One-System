/* itens prontos (com mecânica) ficam em itens-editor.js; classes e origens em classes-origens.js */
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
        title:p.d+(tem?'\n(já adicionado)':'\n(clique para adicionar)'),onclick:()=>{ adicionar(p); render(); }},(tem?'✓ ':'+ '),p.ic?h('span',{'data-noicon':'',class:'chip-ic'},p.ic+' '):null,p.n);
    })));
}
const _tem=(l,n)=>(l||[]).some(x=>semAcento(x.name||'')===semAcento(n));
