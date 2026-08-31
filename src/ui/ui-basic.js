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
function numField(label,obj,key){
  return field(label, h('input',{class:'in',type:'number',value:obj[key],onchange:e=>{obj[key]=parseInt(e.target.value)||0;render();}}));
}

