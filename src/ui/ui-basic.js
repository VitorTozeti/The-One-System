/* ============================================================ UI BÁSICA ============================================================ */
function card(title, hint, right){
  const c=h('div',{class:'card'}, h('div',{class:'card-head'},
    h('div',{},h('h3',{},title), hint?h('div',{class:'hint'},hint):null), right||null));
  for(let i=3;i<arguments.length;i++) if(arguments[i]!=null) c.appendChild(node(arguments[i]));
  return c;
}
/* chave = verbete do glossário; quando informada, o rótulo ganha um "?" */
function field(label, control, chave){
  return h('label',{class:'f'}, h('span',{},label, chave?aj(chave):null), control);
}
/* Navegação por teclado numa lista de abas (role=tab): ←/→/Home/End.
   `seletor` identifica a lista para devolver o foco depois do render(). */
function tabKeys(seletor){
  return e=>{
    const k=e.key; if(!['ArrowLeft','ArrowRight','Home','End'].includes(k)) return;
    const lista=[...e.currentTarget.parentElement.querySelectorAll('[role="tab"]')]; if(!lista.length) return;
    let i=lista.indexOf(e.currentTarget);
    i = k==='Home'?0 : k==='End'?lista.length-1 : (i+(k==='ArrowRight'?1:-1)+lista.length)%lista.length;
    e.preventDefault(); S.ui.refocoAba=seletor; lista[i].click();
  };
}
function numField(label,obj,key){
  return field(label, h('input',{class:'in',type:'number',value:obj[key],onchange:e=>{obj[key]=parseInt(e.target.value)||0;render();}}));
}

