/* ============================================================ MESTRE ============================================================ */
/* ============================================================ NAVEGAÇÃO DO MESTRE ============================================================
   As 16 abas soltas viraram 4 grupos com sub-abas. Cada aba declara aqui o
   grupo a que pertence, se é avançada (escondida no Modo Simples), quantos
   itens já tem (badge) e o que está errado nela (ponto vermelho). */
const TAB_GRUPOS=[
  {k:'fundacao',  ic:'🏗', nome:'Fundação',       sub:'campanha e regras'},
  {k:'personagem',ic:'🧍', nome:'Personagem',     sub:'do que ele é feito'},
  {k:'mundo',     ic:'🌍', nome:'Mundo & Regras', sub:'itens, tags, dados'},
  {k:'saida',     ic:'📤', nome:'Saída',          sub:'ficha e arquivo'},
];
/* ordem = ordem sugerida do "Próximo passo →" */
const TAB_META=[
  {k:'inicio',    ic:'🧭',  nome:'Início',        g:'fundacao'},
  {k:'campanha',  ic:'📛',  nome:'Campanha',      g:'fundacao'},
  {k:'regras',    ic:'⚙️',  nome:'Regras',        g:'fundacao'},
  {k:'combate',   ic:'☠️',  nome:'Morte & Movimento', g:'fundacao'},
  {k:'atributos', ic:'💪',  nome:'Atributos',     g:'personagem'},
  {k:'recursos',  ic:'❤️',  nome:'Recursos',      g:'personagem'},
  {k:'pericias',  ic:'🎯',  nome:'Perícias',      g:'personagem'},
  {k:'classes',   ic:'🎭',  nome:'Classes',       g:'personagem'},
  {k:'racas',     ic:'🌱',  nome:'Origem / Raça', g:'personagem'},
  {k:'poderes',   ic:'🔮',  nome:'Poderes',       g:'personagem'},
  {k:'progressao',ic:'📈',  nome:'Progressão',    g:'fundacao',   adv:true},
  {k:'escolhas',  ic:'🌿',  nome:'Escolhas',      g:'personagem', adv:true},
  {k:'itens',     ic:'🎒',  nome:'Itens',         g:'mundo'},
  {k:'dados',     ic:'🎲',  nome:'Dados',         g:'mundo'},
  {k:'condicoes', ic:'🩸',  nome:'Condições',     g:'mundo',      adv:true},
  {k:'tags',      ic:'🏷',  nome:'Tags',          g:'mundo',      adv:true},
  {k:'tecnicas',  ic:'🌀',  nome:'Técnicas',      g:'mundo',      adv:true},
  {k:'ficha',     ic:'🖼️',  nome:'Ficha',         g:'saida'},
  {k:'livro',     ic:'📕',  nome:'Livro de regras', g:'saida'},
  {k:'sistema',   ic:'💾',  nome:'Sistema',       g:'saida'},
];
function tabMeta(k){ return TAB_META.find(t=>t.k===k)||TAB_META[0]; }
function tabLabel(k){ const t=tabMeta(k); return t.ic+' '+t.nome; }
function modoSimples(){ return S.ui.modo==='simples'; }
function abasVisiveis(){ return TAB_META.filter(t=>!(t.adv&&modoSimples())); }

/* variáveis de exemplo (atributos no máximo) para validar fórmulas do sistema */
function sysVarsSample(sys){
  const eff=effAttr(sys,sys.attrMax);
  const v={'Nível':sys.maxLevel,'Nivel':sys.maxLevel};
  v[sys.levelName||'Nível']=sys.maxLevel;
  (sys.attributes||[]).forEach(a=>{ v[a.name]=eff; });
  (sys.resources||[]).forEach(r=>{ const n=evalFormula(r.formula,v); if(!Number.isNaN(n)) v[r.name]=n; });
  return v;
}
function formulaRuim(f,vars){ return !!(f&&String(f).trim()) && Number.isNaN(evalFormula(f,vars)); }

/* Problemas por aba — alimenta o ponto vermelho, a aba Início e o verificador. */
function problemasDaAba(sys,k){
  const p=[], v=sysVarsSample(sys), lp=levelPoints(sys,sys.maxLevel);
  const escolhiveis=(sys.skills||[]).filter(s=>!s.auto).length;
  if(k==='campanha'){
    if(!String(sys.campaignName||'').trim()) p.push('A campanha está sem nome.');
    if(!String(sys.name||'').trim()) p.push('O sistema está sem nome.');
  }
  if(k==='regras'){
    if(sys.attrMax<=sys.startAttrValue) p.push('O máximo do atributo ('+sys.attrMax+') não é maior que o valor inicial ('+sys.startAttrValue+').');
    const teto=(sys.attributes||[]).length*(sys.attrMax-sys.startAttrValue);
    if((sys.attributes||[]).length && lp.attrPoints>teto)
      p.push('São '+lp.attrPoints+' pontos de atributo, mas só cabem '+teto+'. O jogador não consegue avançar.');
    if(lp.skillCount>escolhiveis)
      p.push('São '+lp.skillCount+' perícias iniciais, mas só existem '+escolhiveis+' escolhíveis.');
    if(sys.maxLevel<sys.startLevel) p.push('O nível máximo é menor que o inicial.');
    if(sys.attrMode==='modificador'&&formulaRuim(sys.modFormula,{V:10})) p.push('A fórmula do modificador é inválida.');
  }
  if(k==='combate'){
    const m=sys.morte||{}, mv=sys.movimento||{};
    if(m.on&&!(sys.resources||[]).some(r=>r.id===m.resId)) p.push('A regra de morte está ligada sem recurso de Vida escolhido.');
    if(mv.on&&formulaRuim(mv.base,v)) p.push('A fórmula do deslocamento é inválida.');
    if(!m.on&&!mv.on) p.push('Morte e movimento estão desligados: a ficha não mostra o que acontece a 0 de Vida nem quanto o personagem anda.');
  }
  if(k==='atributos' && !(sys.attributes||[]).length) p.push('Nenhum atributo cadastrado.');
  if(k==='recursos'){
    (sys.resources||[]).forEach(r=>{
      if(formulaRuim(r.formula,v)) p.push('Recurso “'+r.name+'”: fórmula inválida.');
      const rc=r.recharge||{};
      if(rc.amt==='formula'&&formulaRuim(rc.formula,v)) p.push('Recurso “'+r.name+'”: fórmula de recarga inválida.');
      if(formulaRuim(r.perRound,v)) p.push('Recurso “'+r.name+'”: gasto por rodada inválido.');
    });
    if(!(sys.resources||[]).length) p.push('Nenhum recurso cadastrado.');
  }
  if(k==='pericias'){
    if(!(sys.skills||[]).length) p.push('Nenhuma perícia cadastrada.');
    if(lp.skillCount>escolhiveis) p.push('O sistema pede '+lp.skillCount+' perícias e só há '+escolhiveis+' escolhíveis.');
    if(sys.profMode!=='nenhum'&&!(sys.profTiers||[]).length) p.push('O modo de proficiência está ligado sem nenhum grau definido.');
    if(sys.profMode==='mult'&&formulaRuim(sys.profFormula,v)) p.push('A fórmula de proficiência é inválida.');
  }
  if(k==='classes'){
    if(!(sys.classes||[]).length) p.push('Nenhuma classe cadastrada — o jogador não consegue criar personagem.');
    (sys.classes||[]).forEach(c=>arqProblemas(sys,'classe',c).forEach(m=>p.push('Classe “'+(c.name||'?')+'”: '+m)));
  }
  if(k==='racas'){
    if(!(sys.origins||[]).length) p.push('Nenhuma origem/raça cadastrada — o jogador não consegue criar personagem.');
    (sys.origins||[]).forEach(o=>arqProblemas(sys,'origem',o).forEach(m=>p.push('Origem “'+(o.name||'?')+'”: '+m)));
  }
  if(k==='escolhas'){
    (sys.choices||[]).forEach(c=>{
      if(!(c.options||[]).length) p.push('“'+c.name+'” não tem nenhuma opção.');
      else if(c.count>(c.options||[]).length) p.push('“'+c.name+'” pede '+c.count+' escolha(s) e só tem '+(c.options||[]).length+' opção(ões).');
      if(c.level>sys.maxLevel) p.push('“'+c.name+'” só abre no degrau '+c.level+', acima do máximo do sistema.');
    });
  }
  if(k==='itens'){
    if(formulaRuim(sys.cargaFormula,v)) p.push('A fórmula da carga máxima é inválida.');
    (sys.items||[]).forEach(it=>{
      if(it.armor&&it.armor.on&&formulaRuim(it.armor.formula,v)) p.push('Armadura “'+it.name+'”: fórmula inválida.');
      if(it.armor&&it.armor.on&&!it.armor.resId) p.push('Armadura “'+it.name+'” não aponta para nenhum recurso.');
      if(it.uso&&it.uso.on&&it.uso.resId&&String(it.uso.formula||'').trim()&&Number.isNaN(mediaExpr(it.uso.formula,v))) p.push('Uso de “'+it.name+'”: fórmula inválida.');
      if(it.uso&&it.uso.on&&it.uso.resId&&!String(it.uso.formula||'').trim()) p.push('Uso de “'+it.name+'” escolhe um recurso mas não tem fórmula de quanto.');
      if(!it.equipavel&&(it.effects||[]).length&&!(it.uso&&it.uso.on)) p.push('“'+it.name+'” tem efeitos mas não é equipável nem usável — eles nunca entram na ficha.');
    });
  }
  if(k==='condicoes'){
    (sys.conditions||[]).forEach(c=>{
      (c.componentes||[]).forEach(id=>{ if(!(sys.conditions||[]).some(x=>x.id===id)) p.push('“'+c.name+'” aponta para uma condição que não existe mais.'); });
    });
  }
  if(k==='tags'){
    (sys.tagMatrix||[]).forEach(m=>{ if(!m.from||!m.to) p.push('Há uma relação da matriz sem tag de origem ou destino.'); });
  }
  if(k==='dados'){
    if(sys.rollMode==='soma'){
      const r=rollExpr(sys.rollBase||'',{});
      if(r.erro) p.push('Os dados de cada teste (“'+sys.rollBase+'”) têm um erro: '+r.erro);
      else if(!(r.detalhes||[]).length) p.push('Os dados de cada teste (“'+sys.rollBase+'”) não têm nenhum dado (ex.: 1d20, 2d6, 4dF).');
    }
  }
  if(k==='tecnicas'&&sys.techAtivo){
    if(!(sys.techTiers||[]).length) p.push('O construtor está ligado sem nenhum tier.');
    (sys.techTiers||[]).forEach(t=>{ if(formulaRuim(t.custoFormula,v)) p.push('Tier “'+t.name+'”: fórmula de custo inválida.'); });
  }
  if(k==='ficha'&&!((sys.sheet||{}).blocks||[]).length) p.push('A ficha está vazia — nenhum bloco no papel.');
  /* ---- referências quebradas: coisas que apontam para algo que não existe (antes passavam em silêncio) ---- */
  const resIds=new Set((sys.resources||[]).map(r=>r.id));
  const varre=(lista,onde)=>(lista||[]).forEach(ef=>{
    if(ef&&ef.kind==='recurso'&&ef.targetId&&!resIds.has(ef.targetId)) p.push(onde+': um efeito aponta para um recurso que não existe mais.');
    if(ef&&ef.mods) varre(ef.mods,onde); });
  const varreArq=(lista,rot)=>(lista||[]).forEach(c=>{
    (c.abilities||[]).forEach(a=>varre(a.effects,rot+' “'+(c.name||'?')+'”'));
    (c.traits||[]).forEach(t=>varre(t.effects,rot+' “'+(c.name||'?')+'”'));
    (c.recursos||[]).forEach(x=>{ if(x.resId&&!resIds.has(x.resId)) p.push(rot+' “'+(c.name||'?')+'”: muda a fórmula de um recurso que não existe mais.'); }); });
  if(k==='classes') varreArq(sys.classes,'Classe');
  if(k==='racas') varreArq(sys.origins,'Origem');
  if(k==='itens') (sys.items||[]).forEach(it=>varre(it.effects,'Item “'+(it.name||'?')+'”'));
  if(k==='pericias') (sys.skills||[]).filter(s=>!s.linkedAttrId&&(sys.attributes||[]).length)
    .forEach(s=>p.push('Perícia “'+s.name+'” está sem atributo — o valor dela não soma nada (abra a perícia e escolha um).'));
  if(k==='recursos') (sys.resources||[]).forEach(r=>{
    if(formulaRuim(r.start,v)) p.push('Recurso “'+r.name+'”: o “Começa em” é inválido.');
    (r.gatilhos||[]).forEach(g=>(g.acoes||[]).forEach(a=>{
      if((a.k==='restaurar'||a.k==='somar')&&a.alvo&&a.alvo!=='*'&&!resIds.has(a.alvo)) p.push('Recurso “'+r.name+'”: um gatilho aponta para um recurso que não existe mais.'); })); });
  /* origem/traço que dá "+N técnica de classe" mas nenhuma classe tem técnicas para escolher */
  if(k==='racas'||k==='classes'){
    const daTec=(sys.origins||[]).concat(sys.classes||[]).some(c=>[].concat(c.abilities||[],c.traits||[]).some(a=>(a.effects||[]).some(ef=>ef&&ef.kind==='tecnicas')));
    const temOp=(sys.classes||[]).some(c=>((c.tecnicas||{}).opcoes||[]).length);
    if(daTec&&!temOp) p.push('Algo concede “+técnica de classe”, mas nenhuma classe tem técnicas para escolher (aba Classes → Técnicas).');
  }
  return p;
}
/* contador do badge de cada aba (null = aba sem contagem) */
function contagemDaAba(sys,k){
  const n={campanha:(sys.themes||[]).length, atributos:(sys.attributes||[]).length,
    recursos:(sys.resources||[]).length, pericias:(sys.skills||[]).length,
    classes:(sys.classes||[]).length, racas:(sys.origins||[]).length,
    escolhas:(sys.choices||[]).length, itens:(sys.items||[]).length,
    condicoes:(sys.conditions||[]).length, tags:(sys.tags||[]).length,
    progressao:((sys.progression||{}).cols||[]).length,
    tecnicas:sys.techAtivo?(sys.techTiers||[]).length:0,
    ficha:((sys.sheet||{}).blocks||[]).length}[k];
  return n||null;
}
/* Os 12 passos essenciais — barra de progresso e checklist da aba Início. */
function passosEssenciais(sys){
  const lp=levelPoints(sys,sys.maxLevel), v=sysVarsSample(sys);
  const escolhiveis=(sys.skills||[]).filter(s=>!s.auto).length;
  const teto=(sys.attributes||[]).length*(sys.attrMax-sys.startAttrValue);
  return [
    {ok:!!String(sys.campaignName||'').trim(), tab:'campanha', t:'Dar um nome à campanha', s:'Como sua mesa se chama.'},
    {ok:!!String(sys.name||'').trim(),         tab:'campanha', t:'Dar um nome ao sistema', s:'O conjunto de regras que você está criando.'},
    {ok:(sys.themes||[]).length>0,             tab:'campanha', t:'Escolher ao menos um tema', s:'Combate, terror, investigação…'},
    {ok:(sys.attributes||[]).length>0,         tab:'atributos',t:'Criar os atributos', s:'Força, Agilidade, Vigor — o que você quiser.'},
    {ok:sys.attrMax>sys.startAttrValue,        tab:'regras',   t:'Definir uma faixa de atributo válida', s:'O máximo precisa ser maior que o valor inicial.'},
    {ok:!(sys.attributes||[]).length||lp.attrPoints<=teto, tab:'regras', t:'Dar pontos de atributo que cabem na faixa', s:'Hoje: '+lp.attrPoints+' ponto(s), cabem '+teto+'.'},
    {ok:(sys.resources||[]).length>0,          tab:'recursos', t:'Criar ao menos um recurso', s:'Vida, Mana, Sanidade, Defesa…'},
    {ok:!(sys.resources||[]).some(r=>formulaRuim(r.formula,v)), tab:'recursos', t:'Deixar todas as fórmulas de recurso válidas', s:'Sem nenhum “⚠ fórmula inválida”.'},
    {ok:(sys.skills||[]).length>0,             tab:'pericias', t:'Criar as perícias', s:'O que o personagem sabe fazer.'},
    {ok:lp.skillCount<=escolhiveis,            tab:'pericias', t:'Pedir menos perícias do que existem', s:'Pede '+lp.skillCount+', existem '+escolhiveis+' escolhíveis.'},
    {ok:(sys.classes||[]).length>0&&(sys.origins||[]).length>0, tab:'classes', t:'Cadastrar ao menos 1 classe e 1 origem', s:'Sem isso o jogador trava no primeiro passo.'},
    {ok:(((sys.sheet||{}).blocks)||[]).length>0, tab:'ficha',  t:'Ficha com ao menos um bloco', s:'Já vem uma ficha padrão — abra 🖼️ Ficha para personalizar ou deixar do seu jeito.'},
  ];
}
/* ---------- Aba Início: onde o mestre entende o que falta ---------- */
function tabInicio(sys){
  const passos=passosEssenciais(sys);
  const feitos=passos.filter(p=>p.ok).length;
  const problemas=[];
  /* "Sugestões" não repete o que o checklist acima já cobre (mesma aba + frase de "falta criar") */
  const pendTabs=new Set(passos.filter(p=>!p.ok).map(p=>p.tab));
  const repete=(tab,msg)=>pendTabs.has(tab)&&/^(Nenhum|São \d|O sistema pede|O máximo do atributo|A campanha está|O sistema está sem)/.test(msg);
  abasVisiveis().forEach(t=>problemasDaAba(sys,t.k).forEach(msg=>{ if(!repete(t.k,msg)) problemas.push({tab:t.k,msg}); }));
  const linha=p=>h('button',{class:'chk-l '+(p.ok?'ok':''),onclick:()=>{irParaAba(p.tab);}},
    h('span',{class:'mk'}, p.ok?'✔':'○'),
    h('span',{}, h('b',{},p.t), h('span',{class:'sub'}, p.s+'  ·  abrir '+tabLabel(p.tab)+' →')));
  /* "Próximo passo" em destaque: um clique leva ao que falta (o checklist completo fica logo abaixo) */
  const proximo=passos.find(p=>!p.ok);
  const vazio=!(sys.attributes||[]).length && !(sys.resources||[]).length && !(sys.skills||[]).length;
  const hero = proximo
    ? h('div',{class:'hero-passo'},
        h('div',{class:'hero-txt'},
          h('span',{class:'hero-k'},'Próximo passo · faltam '+(passos.length-feitos)+' de '+passos.length),
          h('b',{},proximo.t), h('span',{class:'hint'},proximo.s)),
        h('div',{class:'row wrapf'},
          h('button',{class:'btn primary',onclick:()=>irParaAba(proximo.tab)},'Ir para '+tabLabel(proximo.tab)+' →'),
          h('button',{class:'btn ghost',title:'Não precisa terminar para testar: o que falta usa valores padrão',onclick:()=>{ if(!S.draft) S.draft=initDraft(sys); S.view='jogador'; render(); window.scrollTo(0,0); }},'▶ Testar assim mesmo')))
    : h('div',{class:'hero-passo pronto'},
        h('div',{class:'hero-txt'}, h('span',{class:'hero-k'},'Tudo essencial feito'), h('b',{},'Seu sistema está jogável 🎉'),
          h('span',{class:'hint'},'Teste como um jogador veria, ou continue refinando as abas.')),
        h('button',{class:'btn emerald',onclick:()=>{ if(!S.draft) S.draft=initDraft(sys); S.view='jogador'; render(); window.scrollTo(0,0); }},'🎲 Testar como jogador'));
  const modeloCard = (vazio && !S.ui.semBoasVindas) ? card('Por onde você quer começar?','Seu sistema está vazio. Escolha um caminho — dá para mudar de ideia a qualquer momento (🕘 Versões e ↶ guardam tudo).',null,
      h('div',{class:'bv-grid'},
        h('button',{class:'bv-c',onclick:aplicarModeloAoSistema},h('b',{},'✨ Começar de um modelo'),h('span',{},'Fantasia, investigação, narrativo… já vem jogável.')),
        h('button',{class:'bv-c',onclick:()=>{ S.ui.semBoasVindas=true; render(); irParaAba('atributos'); }},h('b',{},'📄 Começar do zero'),h('span',{},'Crie seus atributos e deixe a ficha ao vivo guiar.')),
        h('button',{class:'bv-c',onclick:()=>irParaAba('sistema')},h('b',{},'⬆ Importar um .nexus'),h('span',{},'Traga um sistema que você ou alguém já montou.')))) : null;
  return h('div',{},
    hero, modeloCard,
    card('Por onde começar','Os 12 passos essenciais para o sistema ficar jogável. Clique em qualquer linha para ir direto ao lugar.',
      h('span',{class:'badge '+(feitos===passos.length?'ok':'warn')}, feitos+'/'+passos.length),
      ...passos.map(linha)),
    card('Sugestões do app','Ajustes que deixariam o sistema mais redondo. Nenhum impede você de testar.',
      h('span',{class:'badge '+(problemas.length?'warn':'ok')}, problemas.length?(problemas.length+' sugestão(ões)'):'tudo certo'),
      problemas.length
        ? h('div',{}, ...problemas.map(pr=>h('button',{class:'chk-l',onclick:()=>irParaAba(pr.tab)},
            h('span',{class:'mk',style:{color:'var(--amber)'}},'💡'),
            h('span',{}, pr.msg, h('span',{class:'sub'},'em '+tabLabel(pr.tab)+' →')))))
        : h('div',{class:'hint'},'Nenhuma sugestão por enquanto.'),
      /* o Modo Simples esconde abas — mas os problemas delas continuam sendo contados e avisados aqui */
      (()=>{ if(!modoSimples()) return null;
        const ocultos=TAB_META.filter(t=>t.adv).reduce((n,t)=>n+problemasDaAba(sys,t.k).length,0);
        return h('div',{class:'hint',style:{marginTop:'8px'}},
          ocultos?('⚠ '+ocultos+' sugestão(ões) nas abas avançadas (ocultas no Modo Simples). '):'As abas avançadas (ocultas no Modo Simples) também foram verificadas: tudo certo. ',
          ocultos?h('button',{class:'btn sm ghost',type:'button',onclick:()=>{ S.ui.modo='avancado'; store('nexus_modo','avancado'); render(); }},'Mostrar abas avançadas'):null); })(),
      h('div',{class:'hint',style:{marginTop:'10px'}},'Dica: aperte Ctrl+K em qualquer lugar para procurar uma opção pelo nome.')),
    card('Não entendeu um termo?','Slot, tier, degrau, escopo, sintonização — o glossário explica cada um com exemplo. O mesmo texto aparece no “?” ao lado dos campos.',
      h('button',{class:'btn sm primary',onclick:()=>{S.ui.gloss={q:''};render();}},'📖 Abrir glossário'),
      h('div',{class:'row wrapf',style:{marginTop:'4px'}},
        ...['dump','proficiencia','sintonia','tier','escopo','matriz','degrau','snap'].map(k=>
          h('button',{class:'btn sm ghost',onclick:()=>{S.ui.gloss={termo:k};render();}}, GLOSS_MAP[k].t)))),
    card('Atalhos','',null,
      h('div',{class:'keys'},
        h('span',{class:'keycap'},h('b',{},'Ctrl+K'),'buscar qualquer ajuste'),
        h('span',{class:'keycap'},h('b',{},'Ctrl+Z / Ctrl+Y'),'desfazer/refazer em qualquer aba (ou use ↶ ↷)'),
        h('span',{class:'keycap'},h('b',{},'🕘 Versões'),'volte a um ponto anterior do sistema'),
        h('span',{class:'keycap'},h('b',{},'Tab'),'percorrer blocos da ficha'),
        h('span',{class:'keycap'},h('b',{},'Delete'),'remover bloco selecionado'))));
}
/* Assistente aplicado a um sistema já aberto (substitui; desfazível). */
function aplicarModeloAoSistema(){
  abrirAssistenteSistema({titulo:'Aplicar um modelo ao sistema', nomeInicial:S.system.campaignName||'', okRotulo:'✔ Aplicar modelo',
    aoCriar:async novo=>{
      const velho=S.system, tinha=(velho.attributes||[]).length||(velho.resources||[]).length||(velho.skills||[]).length||(velho.classes||[]).length;
      if(tinha && !await uiConfirm('Aplicar o modelo substitui TODO o sistema atual (atributos, recursos, perícias, classes…). Continuar?',{titulo:'Substituir sistema',okText:'Substituir',perigo:true})) return;
      const snap=JSON.stringify(velho);
      S.system=novo; S.draft=initDraft(novo); S.ui.sel=null; undoStack.length=0; redoStack.length=0; render();
      uiToastUndo('Modelo aplicado',()=>{ S.system=JSON.parse(snap); S.draft=initDraft(S.system); S.ui.sel=null; render(); },10000);
    }});
}
/* pular para uma aba já abrindo o grupo dela (e ligando o Modo Avançado se preciso) */
function irParaAba(k){
  const m=tabMeta(k);
  if(m.adv&&modoSimples()) S.ui.modo='avancado';
  S.tab=k; S.ui.grupo=m.g; S.ui.busca=null; render();
}
/* ---------- Busca global (Ctrl+K) ---------- */
/* Além das abas, aponta para ajustes específicos que ninguém acha vasculhando. */
const BUSCA_EXTRA=[
  ['Pontos de atributo iniciais','regras'],['Nível inicial','regras'],['Nível máximo','regras'],
  ['Valor inicial do atributo','regras'],['Mínimo e máximo do atributo','regras'],
  ['Baixar atributo para ganhar pontos (dump)','regras'],['Modificador estilo D&D','regras'],
  ['Fórmula do modificador','regras'],['Perícias iniciais','regras'],
  ['Morte: testes contra a morte, caído, morrendo','combate'],['Salvar personagem (resgate, ponto de heroísmo)','combate'],['Cicatrizes / ferimento permanente','combate'],
  ['Deslocamento / movimento','combate'],['Ações por turno (padrão, movimento, reação)','combate'],['Terreno difícil e corrida','combate'],['Assistente de técnica / magia / poder','classes'],['Modificação física (asas, garras)','racas'],
  ['Nome do eixo (Nível, NEX, Grau)','progressao'],['Tabela de progressão','progressao'],
  ['Sigla do atributo (FOR, AGI)','atributos'],
  ['Barra de Vida / Mana','recursos'],['Fórmula do recurso','recursos'],['Descanso curto e longo','recursos'],
  ['Recarga de recurso','recursos'],['Gasto por rodada','recursos'],
  ['Gatilho: ao chegar a 0 (morte, colapso)','recursos'],['Contador / “Começa em”','recursos'],['Meu sistema não usa níveis','regras'],['Defesa (recurso do tipo valor)','recursos'],
  ['Proficiência / graus de treino','pericias'],['Expertise','pericias'],['Perícia automática','pericias'],
  ['Bônus ao treinar','pericias'],['Perícia ligada a atributo','pericias'],
  ['Habilidades de classe','classes'],['Requisitos de habilidade','classes'],['Tabela da classe','classes'],
  ['Características físicas','racas'],['Traços de raça','racas'],
  ['Subclasse / trilha / talento','escolhas'],['Pré-requisito de opção','escolhas'],
  ['Espaços de equipamento (slots)','itens'],['Sintonização','itens'],['Carga máxima','itens'],
  ['Peso do item','itens'],['Arma e dano','itens'],['Armadura','itens'],['Crítico da arma','itens'],
  ['Exaustão / níveis de condição','condicoes'],['Condição composta','condicoes'],
  ['Resistência e vulnerabilidade','tags'],['Matriz de interação','tags'],['Multiplicador de dano','tags'],
  ['Pool de dados','dados'],['Rolagem base 1d20','dados'],['Crítico natural','dados'],['Vantagem e desvantagem','dados'],
  ['Construtor de técnicas','tecnicas'],['Teto de dano por tier','tecnicas'],['Custo da técnica','tecnicas'],
  ['Blocos da ficha','ficha'],['Modelos de ficha','ficha'],['Atributos em formas (hexágono)','ficha'],
  ['Grade e guias','ficha'],['Foto do personagem','ficha'],['Cor de acento da ficha','ficha'],
  ['Exportar .nexus','sistema'],['Importar .nexus','sistema'],['Restaurar sistema de exemplo','sistema'],
];
function buscaDestinos(){
  const out=abasVisiveis().map(t=>({t:t.ic+' '+t.nome, ond:'aba', tab:t.k}));
  BUSCA_EXTRA.forEach(([nome,tab])=>{ if(abasVisiveis().some(x=>x.k===tab)||tabMeta(tab).adv) out.push({t:nome, ond:tabLabel(tab), tab}); });
  /* os verbetes também são procuráveis: quem digita "sintonização" quer entender, não só chegar lá */
  Object.keys(GLOSS_MAP).forEach(k=>out.push({t:GLOSS_MAP[k].t, ond:'📖 glossário', gloss:k}));
  return out;
}
/* Faixa dos acentos combinantes montada por escape: escrever os caracteres
   direto no fonte deixaria bytes invisíveis no arquivo. */
const RE_ACENTO=new RegExp('[\\u0300-\\u036f]','g');
function semAcento(s){ return String(s).normalize('NFD').replace(RE_ACENTO,'').toLowerCase(); }
function buscaOverlay(){
  const q=S.ui.busca&&S.ui.busca.q||'';
  const lista=h('div',{class:'busca-l'});
  const preencher=termo=>{
    lista.innerHTML='';
    const t=semAcento(termo.trim());
    const res=buscaDestinos().filter(d=>!t||semAcento(d.t).includes(t)).slice(0,40);
    if(!res.length){ lista.appendChild(h('div',{class:'busca-vazio'},'Nada encontrado para “'+termo+'”.')); return; }
    res.forEach((d,i)=>lista.appendChild(h('button',{class:'busca-i'+(i===0?' foco':''),
      onclick:()=>{ if(d.gloss){ S.ui.busca=null; S.ui.gloss={termo:d.gloss}; render(); } else irParaAba(d.tab); }},
      h('span',{},d.t), h('span',{class:'ond'},d.ond))));
  };
  const inp=h('input',{class:'in',value:q,placeholder:'Procurar um ajuste… (ex.: carga, sintonização, crítico)',
    oninput:e=>{ S.ui.busca.q=e.target.value; preencher(e.target.value); },
    onkeydown:e=>{
      if(e.key==='Escape'){ S.ui.busca=null; render(); }
      if(e.key==='Enter'){ const b=lista.querySelector('.busca-i'); if(b) b.click(); }
    }});
  preencher(q);
  setTimeout(()=>{ try{ inp.focus(); inp.select(); }catch(e){} },0);
  return h('div',{class:'busca-bg',onclick:e=>{ if(e.target.classList.contains('busca-bg')){ S.ui.busca=null; render(); } }},
    h('div',{class:'busca-cx'}, inp, lista));
}

