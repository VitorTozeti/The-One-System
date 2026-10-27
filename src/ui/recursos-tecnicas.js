/* ============================================================ RECURSOS E TÉCNICAS — EDITORES MASTER-DETAIL ============================================================
   Recursos (Vida, Mana, Defesa…): lista + editor com abas
     📐 Fórmula — nome, tipo (barra/valor), ícone, cor, fórmula do máximo e a tabela de valores por nível
     ♻ Recarga  — quando e quanto volta (descanso curto/longo) e gasto por rodada
     🔗 Quem mexe — classes, origens, armaduras e itens que alteram este recurso
   Técnicas (construtor autoral por tier): configuração + lista de tiers + simulador de custo.
   Depende de: master-detail.js, formula-field.js (campoFormula, rechargeEditor, pontosPadrao). */

/* ---------- RECURSOS ---------- */
const RECURSOS_PRONTOS=[
  {n:'Vida',ic:'❤️',t:'barra',c:'#ef4444',rc:'longo',a:['Vigor','Constituição','Resistência','Corpo','Físico'],f:a=>a?(a+' * 5 + 10'):'10 + Nível * 5',d:'Quando chega a zero, o personagem cai.'},
  {n:'Mana',ic:'🔷',t:'barra',c:'#3b82f6',rc:'longo',a:['Mente','Inteligência','Intelecto','Magia','Sabedoria'],f:a=>a?(a+' * 4 + 5'):'5 + Nível * 3',d:'Combustível das magias.'},
  {n:'Estamina',ic:'⚡',t:'barra',c:'#22c55e',rc:'curto',a:['Vigor','Constituição','Resistência','Agilidade'],f:a=>a?(a+' * 3 + 5'):'5 + Nível * 2',d:'Fôlego para esforços; volta com descanso curto.'},
  {n:'Sanidade',ic:'🧠',t:'barra',c:'#a855f7',rc:'longo',a:['Mente','Vontade','Presença','Intelecto'],f:a=>a?(a+' * 4 + 10'):'20',d:'Perde-se com horrores; zero é colapso.'},
  {n:'Defesa',ic:'🛡️',t:'valor',c:'#06b6d4',rc:'nunca',a:['Agilidade','Destreza'],f:a=>a?('10 + '+a):'10',d:'Número a superar para acertar o personagem.'},
  {n:'Pontos de Ação',ic:'⏱️',t:'barra',c:'#f59e0b',rc:'curto',a:[],f:()=>'3',d:'Quantas ações extras cabem na cena.'},
  {n:'Sorte',ic:'🍀',t:'barra',c:'#84cc16',rc:'longo',a:[],f:()=>'3',d:'Pontos para rerrolar ou virar o jogo.'},
  {n:'Fé',ic:'✨',t:'barra',c:'#eab308',rc:'longo',a:['Sabedoria','Presença','Vontade'],f:a=>a?(a+' + 2'):'3',d:'Poder divino disponível.'},
];
function recursoDoCatalogo(sys,p){
  const a=(p.a||[]).map(n=>_acha(sys.attributes,n)).find(Boolean);
  return {id:uid(),name:p.n,icon:p.ic,desc:p.d||'',type:p.t,formula:p.f(a?a.name:''),color:p.c,recharge:{trig:p.rc,amt:'tudo',formula:''},perRound:''};
}
function tabRecursos(sys){
  const eff=effAttr(sys,sys.attrMax);
  const sampleVars={'Nível':sys.maxLevel,'Nivel':sys.maxLevel}; sys.attributes.forEach(a=>sampleVars[a.name]=eff);
  const bib=bibliotecaGenerica('📚 Recursos prontos (já com fórmula ligada ao seu atributo e recarga)',RECURSOS_PRONTOS.map(p=>({...p})),
    p=>_tem(sys.resources,p.n),p=>{ const r=recursoDoCatalogo(sys,p); sys.resources.push(r); S.ui.resSel=r.id; });
  return mdLayout({
    titulo:'Recursos',
    dica:'Barra = consumível (Vida, Mana). Valor = número fixo (Defesa). A fórmula usa atributos e “Nível”; classes, origens e itens podem alterá-la.',
    biblioteca:bib, lista:sys.resources, selKey:'resSel',
    texto:r=>r.name+' '+(r.desc||''),
    phCriar:'+ Novo recurso: digite o nome e Enter',
    aoCriar:v=>{ if(_tem(sys.resources,v)){ showToast('Já existe um recurso com esse nome.'); return null; }
      /* nasce NEUTRO (10): antes herdava "<1º atributo> * 5 + 10" sem avisar e o mestre nem notava */
      const r={id:uid(),name:v,icon:'',desc:'',type:'barra',formula:'10',color:'#22d3ee',recharge:{trig:'nunca',amt:'tudo',formula:''},perRound:'',start:'',gatilhos:[]};
      sys.resources.push(r); S.ui.resAba='formula'; showToast('Recurso criado com máximo 10 — ajuste a fórmula se quiser ligar a um atributo.'); return r; },
    vazioTitulo:'Nenhum recurso ainda', vazioDica:'Use a biblioteca acima para criar Vida, Mana, Defesa… já configurados.',
    cartao:(r,sel)=>mdCartao({sel,cor:r.color,icone:r.icon||((r.type||'barra')==='valor'?'🔢':'📊'),nome:r.name,onclick:()=>{S.ui.resSel=r.id;render();},
      sub:((r.type||'barra')==='valor'?'valor':'barra')+' · ƒ '+(r.formula||'—')}),
    editor:r=>recursoEditor(sys,r,sampleVars)});
}
const RES_ABAS=[['formula','📐 Fórmula'],['recarga','♻ Recarga'],['gatilhos','⚡ Gatilhos'],['quem','🔗 Quem mexe']];
function recursoEditor(sys,r,sampleVars){
  const aba=RES_ABAS.some(a=>a[0]===S.ui.resAba)?S.ui.resAba:'formula';
  const eValor=(r.type||'barra')==='valor';
  const cab=mdCab({cor:r.color,icone:r.icon||(eValor?'🔢':'📊'),onIcone:v=>{r.icon=v;},onCor:v=>{r.color=v;},nome:r.name,onNome:v=>{r.name=v;},phNome:'Nome do recurso',
    sub:h('div',{class:'row wrapf'},
      h('button',{class:'btn sm '+(!eValor?'emerald':'ghost'),type:'button',title:'Consumível: tem máximo e valor atual',onclick:()=>{r.type='barra';render();}},(!eValor?'✓ ':'')+'Barra'),
      h('button',{class:'btn sm '+(eValor?'emerald':'ghost'),type:'button',title:'Número calculado, sem gastar',onclick:()=>{r.type='valor';render();}},(eValor?'✓ ':'')+'Valor'),
      !eValor?h('button',{class:'btn sm '+(r.contador?'emerald':'ghost'),type:'button','aria-pressed':r.contador?'true':'false',
        title:'Contador: começa em 0 e sobe (Marca, Corrupção, Retornos). Equivale a uma barra com “Começa em” = 0.',
        onclick:()=>{ r.contador=!r.contador; if(r.contador){ r.start='0'; } else if(String(r.start||'').trim()==='0'){ r.start=''; } render(); }},(r.contador?'✓ ':'')+'🔢 Contador (começa em 0)'):null,
      !eValor?h('button',{class:'btn sm '+((r.teste||{}).on?'emerald':'ghost'),type:'button','aria-pressed':(r.teste||{}).on?'true':'false',
        title:'Na ficha: botões “🎲 Testar” (1d100 ≤ valor atual) e “😱 Perda X/Y” — Sanidade estilo Call of Cthulhu / Ordem',
        onclick:()=>{ r.teste=r.teste||{}; r.teste.on=!r.teste.on; render(); }},((r.teste||{}).on?'✓ ':'')+'😱 Teste e perda X/Y'):null,
      eValor?h('button',{class:'btn sm '+(r.ehDefesa?'emerald':'ghost'),type:'button','aria-pressed':r.ehDefesa?'true':'false',
        title:'Efeitos de “+N de defesa” (técnicas, itens, código) somam neste valor. Já vale sozinho para recursos chamados Defesa ou CA.',
        onclick:()=>{r.ehDefesa=!r.ehDefesa;render();}},(r.ehDefesa?'✓ ':'')+'🛡 É a Defesa'):null,
      typeof botoesVisualRecurso==='function'?botoesVisualRecurso(r):null),
    botoes:mdBotoes(sys.resources,r,'recurso',
      ()=>{ const c=clonarComIds(r); c.name=r.name+' (cópia)'; sys.resources.splice(sys.resources.indexOf(r)+1,0,c); S.ui.resSel=c.id; render(); },
      ()=>comDesfazer('Recurso “'+(r.name||'sem nome')+'” excluído',()=>{ sys.resources.splice(sys.resources.indexOf(r),1);
        (sys.classes||[]).concat(sys.origins||[]).forEach(c=>{ c.recursos=(c.recursos||[]).filter(x=>x.resId!==r.id); }); }))});
  const abas=eValor?RES_ABAS.filter(a=>a[0]!=='recarga'&&a[0]!=='gatilhos'):RES_ABAS;
  const tabs=mdAbas(abas,'resAba');
  let corpo;
  if(aba==='recarga'&&!eValor) corpo=rechargeEditor(sys,r,sampleVars);
  else if(aba==='gatilhos'&&!eValor) corpo=gatilhosEditor(sys,r);
  else if(aba==='quem') corpo=recursoQuemMexe(sys,r);
  else corpo=h('div',{},
    h('div',{style:{marginBottom:'10px'}},field('Para que serve',h('input',{class:'in',value:r.desc||'',maxlength:'140',placeholder:'Uma linha para o jogador entender',oninput:e=>{r.desc=e.target.value;persist();}}))),
    h('span',{class:'hint'},(eValor?'valor =':'máximo ='),aj(eValor?'recursovalor':'recursobarra')),
    campoFormula(sys,r,'formula',{tipo:eValor?'defesa':'recurso',placeholder:'Vigor * 10 + 15',aoMudar:()=>render()}),
    eValor?null:h('div',{style:{marginTop:'10px'}},field('Começa em (opcional)',
      h('input',{class:'in mono',style:{maxWidth:'200px'},value:r.start||'',placeholder:'vazio = começa cheio',
        title:'Fórmula ou número. 0 = começa vazio (contador). Aceita atributos, ex.: Vigor',oninput:e=>{r.start=e.target.value;persist();},onchange:()=>render()}))),
    sys.semNiveis?null:h('div',{class:'sub-h'},'Valor em cada '+(sys.levelName||'Nível').toLowerCase()),
    sys.semNiveis?null:recursoTabelaNiveis(sys,r));
  return h('section',{class:'arq-edit'},cab,tabs,h('div',{class:'arq-corpo'},corpo));
}
/* quanto vale o recurso em pontos de referência de nível (atributos no máximo) */
function recursoTabelaNiveis(sys,r){
  const lo=sys.startLevel||1, hi=Math.max(lo,sys.maxLevel||lo);
  const passo=Math.max(1,Math.ceil((hi-lo+1)/10));
  const pts=[]; for(let lv=lo;lv<=hi;lv+=passo) pts.push(lv); if(pts[pts.length-1]!==hi) pts.push(hi);
  return h('div',{class:'tec-tab'},...pts.map(lv=>{
    const v=evalFormula(r.formula,varsNoDegrau(sys,lv));
    return h('div',{class:'tec-c',style:{borderColor:r.color}},h('small',{},levelLabel(sys,lv)),h('b',{},Number.isNaN(v)?'?':String(v)));}));
}
function recursoQuemMexe(sys,r){
  const linhas=[];
  [['⚔','Classe',sys.classes||[]],['🧬','Origem',sys.origins||[]]].forEach(([ic,tipo,lista])=>lista.forEach(c=>{
    (c.recursos||[]).filter(x=>x.resId===r.id&&String(x.formula||'').trim()).forEach(x=>
      linhas.push([ic+' '+tipo+' '+c.name,(x.modo==='soma'?'soma: ':'substitui: ')+x.formula]));
    const fx=[]; const ve=l=>(l||[]).forEach(ef=>{ if(ef.kind==='recurso'&&ef.targetId===r.id) fx.push(effectLabel(sys,ef)); if(ef.mods) ve(ef.mods); });
    (c.abilities||[]).forEach(a=>ve(a.effects)); (c.traits||[]).forEach(t=>ve(t.effects)); (((c.tecnicas||{}).opcoes)||[]).forEach(o=>ve(o.effects));
    if(fx.length) linhas.push([ic+' '+tipo+' '+c.name+' (habilidades)',fx.join(', ')]);
  }));
  (sys.items||[]).forEach(it=>{
    if(it.armor&&it.armor.on&&it.armor.resId===r.id) linhas.push(['🛡 Item '+it.name,'define: '+(it.armor.formula||'—')]);
    const fx=(it.effects||[]).filter(ef=>ef.kind==='recurso'&&ef.targetId===r.id).map(ef=>effectLabel(sys,ef));
    if(fx.length) linhas.push(['🎒 Item '+it.name,fx.join(', ')]);
    if(it.uso&&it.uso.on&&it.uso.resId===r.id) linhas.push(['🧪 Uso de '+it.name,it.uso.formula||'—']);
  });
  (sys.conditions||[]).forEach(c=>{ const fx=(c.effects||[]).filter(ef=>ef.kind==='recurso'&&ef.targetId===r.id).map(ef=>effectLabel(sys,ef)); if(fx.length) linhas.push(['🩸 Condição '+c.name,fx.join(', ')]); });
  return h('div',{},
    h('div',{class:'hint',style:{marginBottom:'10px'}},'Tudo que altera “'+r.name+'” no sistema. Para mexer, abra a classe/origem/item citado.'),
    linhas.length?h('div',{},...linhas.map(([a,b])=>h('div',{class:'arq-l'},h('b',{},a),' — ',h('code',{},b))))
      :h('div',{class:'vazio'},h('div',{class:'vazio-t'},'Só a fórmula do sistema'),h('div',{class:'hint'},'Nenhuma classe, origem ou item altera este recurso ainda.')));
}

/* ---------- TÉCNICAS (construtor autoral por tier) ---------- */
function techPresets(sys){
  const lv=sys.maxLevel||1;
  const pt=f=>Math.max(sys.startLevel||0,Math.round(lv*f));
  return [
    {n:'Escada de 5 tiers',d:'Do truque ao poder lendário. Dano e custo crescem juntos.',tiers:[
      ['Truque','1d8','1',0],['Comum','3d8','2 + piso('+(sys.levelName||'Nível')+' / 5)',pt(.2)],['Avançada','6d8','4 + piso('+(sys.levelName||'Nível')+' / 4)',pt(.45)],
      ['Superior','10d10','8 + piso('+(sys.levelName||'Nível')+' / 3)',pt(.7)],['Suprema','20d12','14 + piso('+(sys.levelName||'Nível')+' / 2)',pt(1)]]},
    {n:'Círculos (rituais)',d:'Quatro círculos; cada um abre num degrau e custa mais.',tiers:[
      ['1º círculo','2d6','2',0],['2º círculo','4d6','4',pt(.3)],['3º círculo','8d6','8',pt(.6)],['4º círculo','12d6','12',pt(.9)]]},
    {n:'Simples (3 tiers)',d:'Leve e rápido: básica, intermediária e avançada.',tiers:[
      ['Básica','1d8','1',0],['Intermediária','4d8','3',pt(.5)],['Avançada','8d8','6',pt(1)]]},
  ];
}
function novaTier(sys,i,nome,dano,custo,req){ return {id:uid(),tier:i,name:nome,icon:'',desc:'',danoMax:dano,custoFormula:custo,reqLevel:req||0}; }
function aplicarPresetTecnica(sys,p){
  const novo=()=>{ sys.techTiers=p.tiers.map((t,i)=>novaTier(sys,i,t[0],t[1],t[2],t[3])); sys.techAtivo=true; S.ui.tierSel=sys.techTiers[0].id; };
  if(!(sys.techTiers||[]).length){ novo(); render(); return; }
  uiConfirm('Substituir os '+sys.techTiers.length+' tier(s) atuais por “'+p.n+'”?',{titulo:'Aplicar modelo de tiers',okText:'Substituir',perigo:true}).then(ok=>{
    if(!ok) return; const snap=JSON.stringify(sys.techTiers); novo(); render();
    uiToastUndo('Modelo aplicado',()=>{ sys.techTiers=JSON.parse(snap); render(); },9000); });
}
function tabTecnicas(sys){
  const resSel=h('select',{class:'in',style:{maxWidth:'220px'},onchange:e=>{sys.techRecursoId=e.target.value;render();}});
  resSel.appendChild(h('option',{value:''},'— nenhum (custo só informativo) —'));
  (sys.resources||[]).forEach(r=>{const o=h('option',{value:r.id},r.name);if(r.id===sys.techRecursoId)o.selected=true;resSel.appendChild(o);});
  const topo=card('Construtor de Técnicas Autorais',
    'Liga o módulo que deixa o JOGADOR criar habilidades próprias dentro de um orçamento que você define: cada tier tem um teto de dano e uma fórmula de custo.',
    h('button',{class:'btn sm '+(sys.techAtivo?'emerald':'ghost'),type:'button',onclick:()=>{sys.techAtivo=!sys.techAtivo;render();}},(sys.techAtivo?'✓ Ativo':'Desativado')),
    h('div',{class:'grid g2',style:{marginTop:'12px'}},
      field('Como se chama neste sistema',h('input',{class:'in',value:sys.techNome||'Técnicas',placeholder:'Técnicas, Rituais, Feitiços, Dons…',oninput:e=>{sys.techNome=e.target.value;persist();},onchange:()=>render()})),
      field('Recurso que paga o custo',resSel,'tier')),
    sys.techAtivo?h('div',{style:{marginTop:'12px'}},
      h('div',{class:'sub-h2'},'Custo por componente (somado à fórmula base do tier)'),
      h('div',{class:'grid g3'},numField('Ação complexa',sys,'techCustoAcaoComplexa'),numField('Ação simples',sys,'techCustoAcaoSimples'),numField('Cada característica extra',sys,'techCustoExtra'))):null);
  if(!sys.techAtivo) return topo;
  const modelos=h('div',{class:'row wrapf',style:{margin:'10px 0'}},h('span',{class:'hint'},'Modelos prontos de tiers:'),
    ...techPresets(sys).map(p=>h('button',{class:'chip',type:'button',title:p.d,onclick:()=>aplicarPresetTecnica(sys,p)},'✨ '+p.n)));
  sys.techTiers.forEach((t,i)=>{ if(typeof t.icon!=='string') t.icon=''; if(typeof t.desc!=='string') t.desc=''; });
  return h('div',{},topo,
    mdLayout({
      titulo:'Tiers', dica:'Cada degrau de poder: o que libera, o teto de dano e o custo base. O jogador só escolhe tiers já liberados.',
      biblioteca:modelos, lista:sys.techTiers, selKey:'tierSel',
      texto:t=>t.name+' '+(t.desc||''),
      phCriar:'+ Novo tier: digite o nome e Enter',
      aoCriar:v=>{ const t=novaTier(sys,sys.techTiers.length,v,'1d8','1',0); sys.techTiers.push(t); return t; },
      vazioTitulo:'Nenhum tier', vazioDica:'Aplique um modelo pronto acima ou digite um nome.',
      cartao:(t,sel)=>mdCartao({sel,cor:'#6366f1',icone:t.icon||String(sys.techTiers.indexOf(t)),nome:t.name,onclick:()=>{S.ui.tierSel=t.id;render();},
        sub:'teto '+(t.danoMax||'—')+' · custo '+(t.custoFormula||'—')+(t.reqLevel?(' · '+(sys.levelName||'Nível')+' '+t.reqLevel):'')}),
      editor:t=>tierEditor(sys,t)}));
}
function tierEditor(sys,t){
  const cab=mdCab({cor:'#6366f1',icone:t.icon||String(sys.techTiers.indexOf(t)),onIcone:v=>{t.icon=v;},nome:t.name,onNome:v=>{t.name=v;},phNome:'Nome do tier',
    sub:h('div',{class:'hint'},tetoInfo(sys,t)),
    botoes:mdBotoes(sys.techTiers,t,'tier',
      ()=>{ const c=clonarComIds(t); c.name=t.name+' (cópia)'; sys.techTiers.splice(sys.techTiers.indexOf(t)+1,0,c); S.ui.tierSel=c.id; render(); },
      ()=>comDesfazer('Tier “'+(t.name||'')+'” excluído',()=>{ sys.techTiers.splice(sys.techTiers.indexOf(t),1); }))});
  const lo=sys.startLevel||1, hi=Math.max(lo,sys.maxLevel||lo);
  const ini=Math.max(lo,t.reqLevel||lo);
  const passo=Math.max(1,Math.ceil((hi-ini+1)/8));
  const pts=[]; for(let lv=ini;lv<=hi;lv+=passo) pts.push(lv); if(pts[pts.length-1]!==hi) pts.push(hi);
  const tabela=h('div',{class:'tec-tab'},...pts.map(lv=>{ const v=evalFormula(t.custoFormula||'0',varsNoDegrau(sys,lv));
    return h('div',{class:'tec-c'},h('small',{},levelLabel(sys,lv)),h('b',{},Number.isNaN(v)?'?':String(v))); }));
  const sim=S.ui.tierSim||(S.ui.tierSim={c:0,s:1,x:0});
  const base=evalFormula(t.custoFormula||'0',varsNoDegrau(sys,hi));
  const total=Number.isNaN(base)?NaN:base+sim.c*(sys.techCustoAcaoComplexa||0)+sim.s*(sys.techCustoAcaoSimples||0)+sim.x*(sys.techCustoExtra||0);
  const simIn=(k,rot)=>field(rot,h('input',{class:'in',type:'number',min:'0',style:{width:'80px'},value:sim[k],onchange:e=>{sim[k]=Math.max(0,parseInt(e.target.value)||0);render();}}));
  const corpo=h('div',{},
    h('div',{style:{marginBottom:'10px'}},field('Descrição (o jogador vê)',h('input',{class:'in',value:t.desc||'',maxlength:'160',placeholder:'Ex.: Truques de combate que qualquer um aprende.',oninput:e=>{t.desc=e.target.value;persist();}}))),
    h('div',{class:'grid g3'},
      field('Libera no '+(sys.levelName||'Nível').toLowerCase(),h('input',{class:'in',type:'number',min:'0',value:t.reqLevel||0,onchange:e=>{t.reqLevel=Math.max(0,parseInt(e.target.value)||0);render();}})),
      field('Teto de dano (expressão)',h('input',{class:'in mono',value:t.danoMax||'',placeholder:'Ex.: 6d10',title:'O jogador não pode passar deste dano médio',oninput:e=>{t.danoMax=e.target.value;persist();},onchange:()=>render()})),
      field('Custo base (fórmula)',campoFormula(sys,t,'custoFormula',{tipo:'custo',placeholder:'Ex.: 2 + '+(sys.levelName||'Nível')+' / 5',aoMudar:()=>render()}))),
    h('div',{class:'sub-h'},'Custo base em cada degrau (a partir de onde o tier abre)'), tabela,
    h('div',{class:'sub-h'},'Simulador de custo final'),
    h('div',{class:'row wrapf',style:{alignItems:'flex-end'}},simIn('c','Ações complexas'),simIn('s','Ações simples'),simIn('x','Características extras'),
      h('div',{class:'pv-chip',style:{borderColor:'var(--indigo)'}},'Custo no '+levelLabel(sys,hi)+': ',h('b',{},Number.isNaN(total)?'?':String(total)))));
  return h('section',{class:'arq-edit'},cab,h('div',{class:'arq-corpo'},corpo));
}
