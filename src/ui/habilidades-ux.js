/* ============================================================ CRIAR HABILIDADES E TÉCNICAS — UX ============================================================
   Junta num lugar só os três jeitos de criar (antes eram botões espalhados):
     🧙 Assistente (passo a passo, recomendado) · 📚 Biblioteca de modelos (busca + categorias, com prévia) · ✏️ Em branco
   e oferece a "frase" de uma habilidade (o que ela faz, em português) usada no cartão.
   Depende de tecnicas-editor.js (MODELOS_TECNICA, modeloEmHab), assistentes.js (abrirAssistente), classes-origens.js. */

/* barra de criação — alvo como no assistente: {arr, habArr, nivel, origem, tracos} */
function barraCriarHab(sys,alvo,o){
  o=o||{}; const ui=S.ui, chave='bib_'+(o.chave||'x');
  const nivel=alvo.nivel!=null?alvo.nivel:0;
  const branco=()=>{ const a={id:uid(),name:o.nomePadrao||'Nova habilidade',icon:'',description:'',req:{level:nivel||0,attrs:[]},effects:[]};
    if(!alvo.tracos) sanitizarUsoHab(a); alvo.arr.push(a); S.ui.open[a.id]=true; S.ui['habTab_'+a.id]='basico'; render(); };
  const aberta=!!ui[chave];
  return h('div',{class:'criar-hab'},
    h('div',{class:'criar-hab-t'},o.titulo||'Criar'),
    h('div',{class:'criar-hab-ops'},
      h('button',{type:'button',class:'criar-op rec',onclick:()=>abrirAssistente(alvo.tracos?'poder':'tecnica',alvo,alvo.tracos?{cat:'fisico'}:null)},
        h('span',{class:'criar-ic'},'🧙'),h('b',{},'Assistente'),h('small',{},alvo.tracos?'Asas, garras, sentidos… em 3 passos':'Responda o que ela faz e ele monta e sugere o custo')),
      alvo.tracos?null:h('button',{type:'button',class:'criar-op',onclick:()=>abrirAssistente('poder',alvo)},
        h('span',{class:'criar-ic'},'✨'),h('b',{},'Poder passivo'),h('small',{},'Bônus, resistência, sentido ou mutação')),
      alvo.tracos?null:h('button',{type:'button',class:'criar-op'+(aberta?' on':''),onclick:()=>{ui[chave]=!aberta;render();}},
        h('span',{class:'criar-ic'},'📚'),h('b',{},'Modelos prontos'),h('small',{},MODELOS_TECNICA.length+' técnicas e magias, inclusive D&D')),
      h('button',{type:'button',class:'criar-op',onclick:branco},
        h('span',{class:'criar-ic'},'✏️'),h('b',{},'Em branco'),h('small',{},'Você preenche tudo'))),
    aberta?bibliotecaModelos(sys,alvo.arr,nivel,()=>{ui[chave]=false;}):null);
}
/* biblioteca: busca + categorias + cartões com um clique para adicionar */
function bibliotecaModelos(sys,arr,nivel,aoAdicionar){
  const ui=S.ui; const q=semAcento(ui.bibQ||''), cat=ui.bibCat||'';
  const cats=[...new Set(MODELOS_TECNICA.map(m=>m.c))];
  const vis=MODELOS_TECNICA.filter(m=>(!cat||m.c===cat)&&(!q||semAcento(m.n+' '+(m.d||'')+' '+m.c).includes(q)));
  const add=m=>{ const ab=modeloEmHab(sys,m,nivel); arr.push(ab); S.ui.open[ab.id]=true; S.ui['habTab_'+ab.id]=(ab.uso&&ab.uso.on)?'uso':'fx'; if(aoAdicionar) aoAdicionar(ab); render(); showToast((m.ic||'✨')+' “'+m.n+'” adicionada — ajuste no cartão'); };
  return h('div',{class:'bib'},
    h('div',{class:'row wrapf'},
      h('input',{class:'in',type:'search',style:{flex:'1',minWidth:'180px'},placeholder:'🔎 Buscar: fogo, cura, invocar, lento…',value:ui.bibQ||'','aria-label':'Buscar modelo',oninput:e=>{ui.bibQ=e.target.value;render();}}),
      h('button',{type:'button',class:'chip'+(!cat?' on':''),onclick:()=>{ui.bibCat='';render();}},'Todas'),
      ...cats.map(c=>h('button',{type:'button',class:'chip'+(cat===c?' on':''),onclick:()=>{ui.bibCat=c;render();}},c))),
    vis.length?h('div',{class:'bib-grid'},...vis.slice(0,60).map(m=>h('button',{type:'button',class:'bib-card',title:'Adicionar “'+m.n+'”',onclick:()=>add(m)},
      h('span',{class:'bib-ic'},m.ic||'✨'),h('b',{},m.n),h('small',{},m.d||''),h('span',{class:'bib-cat'},m.c)))):h('div',{class:'hint'},'Nada com “'+(ui.bibQ||'')+'”.'));
}
/* frase em português do que a habilidade faz (cartão recolhido e topo do editor) */
function habFrase(sys,ab){
  const p=[];
  const us=ab.uso;
  if(us&&us.on) p.push(usoHabResumo(sys,ab));
  const fx=(ab.effects||[]).map(ef=>effectLabel(sys,ef)).filter(Boolean);
  if(fx.length) p.push((us&&us.on&&us.modo==='ativa'?'enquanto ligada: ':'sempre: ')+fx.join(', '));
  return p.join(' — ')||'Ainda não faz nada: escolha uma ação na ficha ou um efeito sempre ativo.';
}
