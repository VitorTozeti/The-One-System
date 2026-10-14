/* ============================================================ MASTER-DETAIL (lista à esquerda, editor à direita) ============================================================
   Peça reaproveitada por Classes, Origens, Recursos, Itens e Técnicas — o mesmo jeito de
   criar/editar em todo lugar: digitar o nome + Enter cria; biblioteca de peças prontas;
   busca; cartões com cor; editor com abas, ▲▼ para reordenar, duplicar e excluir com Desfazer.
   Depende de helpers (h), ui-basic (card), master-nav (semAcento) e bibliotecas-extra (comDesfazer). */

/* move `item` uma casa para cima (-1) ou para baixo (+1) dentro de `lista` (no lugar) */
function moverNaLista(lista,item,d){
  const i=lista.indexOf(item), j=i+d;
  if(i<0||j<0||j>=lista.length) return false;
  lista[i]=lista[j]; lista[j]=item; render(); return true;
}
/* clona um objeto de sistema com ids novos (o item e tudo que tem `id`/efeitos dentro) */
function clonarComIds(o){
  const c=JSON.parse(JSON.stringify(o));
  const refaz=x=>{ if(Array.isArray(x)) x.forEach(refaz); else if(x&&typeof x==='object'){ if(typeof x.id==='string') x.id=uid(); Object.keys(x).forEach(k=>refaz(x[k])); } };
  refaz(c); return c;
}
/* cabeçalho do editor: ícone + cor + nome grande + botões */
function mdCab(o){
  return h('div',{class:'arq-cab',style:{'--arq':o.cor||'var(--indigo)'}},
    h('div',{class:'arq-ic-g'},
      o.onIcone?h('input',{class:'in arq-ic-in',value:o.icone||'',maxlength:'4','aria-label':'Ícone',oninput:e=>{o.onIcone(e.target.value);persist();},onchange:()=>render()}):h('span',{class:'arq-ic-in arq-ic-fixo'},o.icone||'✦'),
      o.onCor?h('input',{type:'color',class:'arq-cor',value:o.cor||'#7c3aed','aria-label':'Cor',oninput:e=>{o.onCor(e.target.value);persist();},onchange:()=>render()}):null),
    h('div',{class:'arq-cab-t'},
      h('input',{class:'in arq-nome',value:o.nome||'',placeholder:o.phNome||'Nome','aria-label':'Nome',maxlength:'60',oninput:e=>{o.onNome(e.target.value);persist();},onchange:()=>render()}),
      o.sub||null),
    h('div',{class:'row wrapf'}, ...(o.botoes||[])));
}
function mdBotoes(lista,item,rotulo,aoDuplicar,aoExcluir){
  const i=lista.indexOf(item);
  return [
    h('button',{class:'btn sm ghost',type:'button',disabled:i<=0,title:'Subir na lista','aria-label':'Subir',onclick:()=>moverNaLista(lista,item,-1)},'▲'),
    h('button',{class:'btn sm ghost',type:'button',disabled:i>=lista.length-1,title:'Descer na lista','aria-label':'Descer',onclick:()=>moverNaLista(lista,item,1)},'▼'),
    h('button',{class:'btn sm ghost',type:'button',title:'Duplicar',onclick:aoDuplicar},'⧉ Duplicar'),
    h('button',{class:'btn sm danger',type:'button',onclick:aoExcluir},'✕ Excluir')];
}
function mdAbas(abas,chave,contagem){
  const atual=abas.some(a=>a[0]===S.ui[chave])?S.ui[chave]:abas[0][0];
  S.ui[chave]=atual;
  return h('div',{class:'arq-tabs',role:'tablist'}, ...abas.map(([k,l])=>
    h('button',{class:'arq-tab'+(atual===k?' on':''),type:'button',role:'tab','aria-selected':atual===k?'true':'false',
      onkeydown:tabKeys('.arq-tabs'),onclick:()=>{ S.ui[chave]=k; render(); }}, l, contagem?contagem(k):null)));
}
/* o layout inteiro. Opções:
   titulo, dica, lista, selKey, texto(item)->string de busca, cartao(item,selecionado)->nó,
   editor(item)->nó, aoCriar(nome)->item|null, phCriar, biblioteca (nó), extraTopo (nó),
   vazioTitulo, vazioDica, filtros (nó, opcional, entre busca e cartões), filtrar(item)->bool */
function mdLayout(o){
  const lista=o.lista;
  let sel=lista.find(x=>x.id===S.ui[o.selKey]);
  if(!sel&&lista.length){ sel=lista[0]; S.ui[o.selKey]=sel.id; }
  const qKey=o.selKey+'Q';
  const cont=h('div',{class:'arq-cards'});
  const pintar=()=>{
    cont.innerHTML='';
    const q=semAcento(String(S.ui[qKey]||'').trim());
    const vis=lista.filter(x=>(!q||semAcento(o.texto(x)||'').includes(q)) && (!o.filtrar||o.filtrar(x)));
    if(!vis.length){ cont.appendChild(h('div',{class:'hint',style:{padding:'6px 2px'}},lista.length?'Nada encontrado com esse filtro.':'')); return; }
    vis.forEach(x=>cont.appendChild(o.cartao(x,x===sel)));
  };
  pintar();
  const criar=h('input',{class:'in',maxlength:'60','aria-label':o.phCriar,placeholder:o.phCriar,
    onkeydown:e=>{ if(e.key!=='Enter') return; e.preventDefault(); const v=e.target.value.trim(); if(!v) return;
      const x=o.aoCriar(v); if(x){ S.ui[o.selKey]=x.id; S.ui[qKey]=''; render(); } }});
  const busca=lista.length>5?h('input',{class:'in',type:'search',placeholder:'🔎 Filtrar a lista…','aria-label':'Filtrar a lista',value:S.ui[qKey]||'',
    oninput:e=>{ S.ui[qKey]=e.target.value; pintar(); }}):null;
  return h('div',{class:'arq'},
    o.extraTopo||null,
    o.titulo?card(o.titulo,o.dica||'',null,o.biblioteca||null):(o.biblioteca||null),
    h('div',{class:'arq-wrap'},
      h('aside',{class:'arq-lista'}, criar, busca, o.filtros||null,
        lista.length?cont:h('div',{class:'vazio'},h('div',{class:'vazio-t'},o.vazioTitulo||'Nada ainda'),h('div',{class:'hint'},o.vazioDica||'Digite um nome acima e aperte Enter.'))),
      sel?o.editor(sel):h('div',{class:'arq-edit vazio'},'Selecione ou crie para editar.')));
}
/* cartão padrão da lista */
function mdCartao(o){
  return h('button',{type:'button',class:'arq-card'+(o.sel?' sel':''),style:{'--arq':o.cor||'var(--indigo)'},'aria-pressed':o.sel?'true':'false',onclick:o.onclick},
    h('span',{class:'arq-ic'},o.icone||'✦'),
    h('span',{class:'arq-txt'}, h('b',{},o.nome||'(sem nome)'), h('small',{},o.sub||'')));
}
/* "Recolher tudo / Expandir tudo" para listas de cartões recolhíveis (S.ui.open[id]) */
function mdAbrirTudo(itens){
  return h('div',{class:'row wrapf',style:{margin:'4px 0 8px'}},
    h('button',{class:'btn sm ghost',type:'button',onclick:()=>{ itens.forEach(a=>{S.ui.open[a.id]=true;}); render(); }},'▼ Expandir tudo'),
    h('button',{class:'btn sm ghost',type:'button',onclick:()=>{ itens.forEach(a=>{delete S.ui.open[a.id];}); render(); }},'▶ Recolher tudo'));
}
