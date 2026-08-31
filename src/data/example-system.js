/* ============================================================ SISTEMA DE EXEMPLO ============================================================ */
const SCHEMA = 10;
const THEME_PRESETS = ['Combate','Investigação','Terror','Mistério','Fantasia','Ficção Científica','Sobrevivência','Aventura','Drama','Ação'];

/* Largura fixa do "papel" da ficha. Os blocos guardam x/y/w/h nessa escala;
   na hora de exibir, o canvas inteiro é escalado para caber na tela. */
const CANVAS_W = 860;
const GRID = 10;

/* label = nome na paleta do mestre; title = título impresso na ficha */
const BLOCK_TYPES = {
  nome:           {label:'Nome & Identidade',      title:'Identidade',   icon:'🪪', multi:false, w:660, h:90},
  foto:           {label:'Foto do Personagem',     title:'Foto',         icon:'🖼️', multi:false, w:170, h:190},
  atributos:      {label:'Atributos',              title:'Atributos',    icon:'💪', multi:false, w:660, h:90},
  valores:        {label:'Valores (Defesa etc.)',  title:'Valores',      icon:'🛡️', multi:false, w:410, h:110},
  recursos:       {label:'Recursos (barras)',      title:'Recursos',     icon:'❤️', multi:false, w:420, h:250},
  pericias:       {label:'Perícias',               title:'Perícias',     icon:'🎯', multi:false, w:420, h:320},
  habilidades:    {label:'Habilidades',            title:'Habilidades',  icon:'✨', multi:false, w:410, h:320},
  caracteristicas:{label:'Características físicas',title:'Características físicas', icon:'✦', multi:false, w:420, h:180},
  anotacoes:      {label:'Anotações',              title:'Anotações',    icon:'📝', multi:false, w:410, h:180},
  dados:          {label:'Rolador de Dados',       title:'Rolador de Dados', icon:'🎲', multi:false, w:410, h:130},
  progressao:     {label:'Progressão (degrau atual)', title:'Progressão',   icon:'📈', multi:false, w:410, h:150},
  inventario:     {label:'Inventário',              title:'Inventário',   icon:'🎒', multi:false, w:840, h:220},
  /* --- blocos novos --- */
  condicoes:      {label:'Condições / Estados',     title:'Condições',    icon:'🩸', multi:false, w:410, h:150},
  ataques:        {label:'Ataques & Armas',         title:'Ataques',      icon:'⚔', multi:false, w:420, h:200},
  tecnicas:       {label:'Técnicas Autorais',       title:'Técnicas',     icon:'🌀', multi:false, w:420, h:220},
  escolhas:       {label:'Escolhas (trilhas/talentos)', title:'Escolhas', icon:'🌿', multi:false, w:410, h:180},
  /* --- decorativos: livres, repetíveis, sem dados --- */
  texto:          {label:'Texto livre',            title:'Texto',        icon:'🔤', multi:true,  w:300, h:60},
  divisor:        {label:'Divisor / Linha',        title:'',             icon:'➖', multi:true,  w:400, h:20},
  forma:          {label:'Forma decorativa',       title:'',             icon:'⬟', multi:true,  w:160, h:160},
  imagem:         {label:'Imagem / Selo',          title:'',             icon:'🏵', multi:true,  w:140, h:140},
  espaco:         {label:'Painel / Moldura vazia', title:'',             icon:'▭', multi:true,  w:300, h:200},
};
/* categorias de item — descritivas (não limitam quantos cabem nesta rodada) */
const ITEM_CATS=[['arma','⚔ Arma'],['armadura','🛡 Armadura'],['acessorio','💍 Acessório'],['ferramenta','🔧 Ferramenta'],['consumivel','🧪 Consumível'],['outro','📦 Outro']];
function itemCatLabel(c){const f=ITEM_CATS.find(x=>x[0]===c);return f?f[1]:'📦 Outro';}
/* Estilo do modo "formas": tudo livre — forma, arranjo, cores, moldura e fonte. */
function styleOpts(){
  return {
    shape:'hexagono', shSize:96, shGap:8, arranjo:'grade',
    /* arranjo 'flor': peças em roseta ao redor de um núcleo central */
    radius:null, startAngle:-90, hub:true, hubText:'ATRIBUTOS', hubFill:'#0b1020', hubTxt:'#ffffff', hubSize:null,
    fill:'#0f1729', stroke:'#c7d2fe', strokeW:3, txtColor:'#ffffff',
    /* bônus desligado por padrão: dentro de uma forma o espaço é curto e
       "base 3 +1" polui — quem quiser, liga na opção "Bônus/mod." */
    font:'display', numSize:30, showName:true, showAbbr:true, nameOnTop:false, showBonus:false,
  };
}
const SHAPE_CLIP={
  hexagono:'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
  losango:'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  escudo:'polygon(0% 0%, 100% 0%, 100% 62%, 50% 100%, 0% 62%)',
  octogono:'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
};
/* Pontos de partida prontos — o mestre clica e depois ajusta o que quiser. */
const SHAPE_PRESETS={
  /* raio explícito: deixa um vão central de sobra para o núcleo respirar */
  '✿ Ritual (roseta)':{arranjo:'flor',shape:'hexagono',fill:'#ffffff',stroke:'#0b1020',strokeW:5,txtColor:'#0b1020',
                     font:'display',shSize:104,numSize:34,showAbbr:true,showName:true,nameOnTop:true,showBonus:false,
                     shGap:2,radius:112,startAngle:-90,hub:true,hubText:'ATRIBUTOS',hubFill:'#0b1020',hubTxt:'#ffffff',hubSize:null},
  '⬣ Colmeia':     {arranjo:'colmeia',shape:'hexagono',fill:'#0b1020',stroke:'#f8fafc',strokeW:4,txtColor:'#ffffff',font:'display',shSize:104,numSize:34,showAbbr:true,showName:true,nameOnTop:true,shGap:6,cols:3},
  '📜 Pergaminho': {arranjo:'grade',shape:'circulo',fill:'#f5ecd7',stroke:'#8a6a2f',strokeW:3,txtColor:'#3b2b12',font:'serif',shSize:92,numSize:30,showAbbr:true,showName:false,nameOnTop:false,shGap:10,cols:5},
  '🛡 Marcial':    {arranjo:'grade',shape:'escudo',fill:'#141a2e',stroke:'#d97706',strokeW:3,txtColor:'#fbbf24',font:'serif',shSize:100,numSize:30,showAbbr:true,showName:true,nameOnTop:false,shGap:8,cols:5},
  '◆ Arcano':      {arranjo:'grade',shape:'losango',fill:'#1e1b4b',stroke:'#a5b4fc',strokeW:2,txtColor:'#e0e7ff',font:'serif',shSize:104,numSize:28,showAbbr:true,showName:false,nameOnTop:false,shGap:6,cols:5},
  '▢ Limpo':       {arranjo:'grade',shape:'caixa',fill:'#0f1729',stroke:'#334155',strokeW:1,txtColor:'#e2e8f0',font:'padrao',shSize:88,numSize:28,showAbbr:false,showName:true,nameOnTop:true,shGap:8,cols:5},
};
/* Estilo livre disponível em QUALQUER bloco — o que dá "cara" à ficha sem
   precisar de bloco especializado. Tudo opcional: null/'' = herda o padrão. */
function boxOpts(){
  return {
    bg:'', bgOpacity:100, borderColor:'', borderW:null, radius:null,
    shadow:'nenhuma', pad:null, rotate:0, opacity:100,
    locked:false, hidden:false, alias:'',
    titleColor:'', titleSize:null, titleAlign:'left', titleCaps:true,
  };
}
function defaultOpts(key){
  const base={showTitle:true, title:'', framed:true, ...boxOpts()};
  if(key==='nome')       return {...base, showTitle:false, framed:false, align:'left', size:'g', showSub:true};
  if(key==='foto')       return {...base, showTitle:false, shape:'quadrado', emoji:'', fit:'cover'};
  if(key==='atributos')  return {...base, view:'grade', cols:5, ...styleOpts()};
  if(key==='valores')    return {...base, view:'grade', cols:2, ...styleOpts()};
  if(key==='recursos')   return {...base, controls:true, barStyle:'barra', barH:null, showRest:true};
  if(key==='inventario') return {...base, controls:true};
  if(key==='pericias')   return {...base, view:'tabela'};
  if(key==='condicoes')  return {...base, view:'chips'};
  if(key==='texto')      return {...base, showTitle:false, framed:false, text:'Texto', size:'m', align:'left', color:'', font:'padrao'};
  if(key==='divisor')    return {...base, showTitle:false, framed:false, estilo:'solida', espessura:2, cor:'', enfeite:''};
  if(key==='forma')      return {...base, showTitle:false, framed:false, shape:'hexagono', fill:'#141a2e', stroke:'#6366f1', strokeW:3, texto:'', txtColor:'#e2e8f0', numSize:18};
  if(key==='imagem')     return {...base, showTitle:false, framed:false, src:'', fit:'contain', shape:'quadrado'};
  if(key==='espaco')     return {...base, showTitle:false, framed:true};
  return base;
}
function blk(key,x,y,w,h,opts){
  const t=BLOCK_TYPES[key]||{};
  return {id:uid(), key, x, y, w:w||t.w||200, h:h||t.h||100, opts:{...defaultOpts(key), ...(opts||{})}};
}
function defaultSheet(){
  return {
    title:'Ficha do Personagem', accent:'#4f46e5', canvasH:1420,
    blocks:[
      blk('foto',            10, 10, 170, 190),
      blk('nome',           190, 10, 660,  90),
      blk('atributos',      190,110, 660,  90),
      blk('recursos',        10,210, 420, 270),
      blk('valores',        440,210, 410, 110),
      blk('dados',          440,330, 410, 260),   /* alto o bastante p/ mostrar o resultado da rolagem */
      blk('pericias',        10,600, 420, 320),
      blk('habilidades',    440,600, 410, 320),
      blk('caracteristicas', 10,930, 420, 180),
      blk('anotacoes',      440,930, 410, 180),
      blk('inventario',      10,1120, 840, 280),
    ],
  };
}

/* Modelos de ficha prontos — pontos de partida, não camisas de força.
   Cada um só devolve blocos e altura; nenhuma regra do sistema é tocada. */
const LAYOUT_PRESETS={
  '📋 Clássico': ()=>defaultSheet(),
  '🗂 Duas colunas': ()=>({title:'Ficha do Personagem',accent:'#4f46e5',canvasH:1240,blocks:[
    blk('nome',      10,  10, 620,  80, {align:'left',size:'g'}),
    blk('foto',     650,  10, 200, 200),
    blk('atributos', 10, 100, 620, 110, {view:'grade',cols:5}),
    blk('divisor',   10, 220, 840,  20, {enfeite:'❖'}),
    blk('recursos',  10, 250, 410, 250),
    blk('valores',  440, 250, 200, 250, {view:'lista'}),
    blk('dados',    650, 220, 200, 280),
    blk('pericias',  10, 510, 410, 330),
    blk('habilidades',440,510, 410, 330),
    blk('inventario',10, 850, 840, 240),
    blk('anotacoes', 10,1100, 840, 120),
  ]}),
  '🦸 Herói (foto grande)': ()=>({title:'Ficha do Personagem',accent:'#d97706',canvasH:1320,blocks:[
    blk('foto',      10,  10, 300, 340, {shape:'quadrado',fit:'cover'}),
    blk('nome',     330,  10, 520, 100, {align:'left',size:'g'}),
    blk('atributos',330, 120, 520, 230, {view:'formas',...SHAPE_PRESETS['✿ Ritual (roseta)']}),
    blk('recursos',  10, 370, 420, 260),
    blk('valores',  440, 370, 410, 130, {view:'linha'}),
    blk('condicoes',440, 510, 410, 120, {view:'chips'}),
    blk('ataques',   10, 650, 420, 220),
    blk('habilidades',440,650, 410, 220),
    blk('pericias',  10, 890, 420, 300, {view:'tabela'}),
    blk('inventario',440,890, 410, 300),
    blk('anotacoes', 10,1200, 840, 100),
  ]}),
  '⚔ Combate': ()=>({title:'Ficha de Combate',accent:'#e11d48',canvasH:1000,blocks:[
    blk('nome',      10,  10, 500,  70, {align:'left',size:'m'}),
    blk('valores',  520,  10, 330, 130, {view:'grade',cols:2}),
    blk('atributos', 10,  90, 500, 100, {view:'linha'}),
    blk('recursos',  10, 200, 500, 230),
    blk('dados',    520, 150, 330, 280),
    blk('ataques',   10, 440, 500, 260),
    blk('condicoes',520, 440, 330, 260),
    blk('habilidades',10, 710, 500, 270),
    blk('inventario',520,710, 330, 270),
  ]}),
  '🌀 Arcano (com técnicas)': ()=>({title:'Grimório',accent:'#6366f1',canvasH:1180,blocks:[
    blk('nome',      10,  10, 640,  80, {align:'center',size:'g'}),
    blk('foto',     670,  10, 180, 180, {shape:'circulo'}),
    blk('atributos', 10, 100, 640, 210, {view:'formas',...SHAPE_PRESETS['◆ Arcano']}),
    blk('recursos',  10, 330, 420, 230),
    blk('valores',  440, 200, 410, 120, {view:'lista'}),
    blk('progressao',440,330, 410, 110),
    blk('tecnicas', 440, 450, 410, 320),
    blk('pericias',  10, 570, 420, 200, {view:'chips'}),
    blk('escolhas',  10, 780, 420, 190),
    blk('habilidades',440,780, 410, 190),
    blk('anotacoes', 10, 980, 840, 180),
  ]}),
  '🧪 Minimalista': ()=>({title:'Ficha',accent:'#10b981',canvasH:700,blocks:[
    blk('nome',      10,  10, 840,  70, {align:'center',size:'g'}),
    blk('atributos', 10,  90, 840, 110, {view:'linha'}),
    blk('recursos',  10, 210, 420, 200, {controls:true}),
    blk('valores',  440, 210, 410, 200, {view:'grade',cols:2}),
    blk('pericias',  10, 420, 420, 260, {view:'chips'}),
    blk('anotacoes',440, 420, 410, 260),
  ]}),
};

/* ---- Migração / saneamento ----
   Nunca descartar o sistema do usuário por mudança de versão: converter.
   Também garante que listas essenciais existam, para que render() não morra. */
/* ---- Progressão: tabela de degraus com colunas livres ----
   Cada coluna vira uma variável usável nas fórmulas do sistema. O eixo continua
   sendo um número (1..maxLevel), mas o mestre pode dar rótulo a cada degrau —
   é assim que "NEX 5% … 99%" cabe sem o motor saber o que é NEX. */
function emptyProg(){ return {cols:[], rows:{}, labels:{}}; }
function sanitizeProg(p){
  if(!p || typeof p!=='object') return emptyProg();
  if(!Array.isArray(p.cols)) p.cols=[];
  if(!p.rows || typeof p.rows!=='object') p.rows={};
  if(!p.labels || typeof p.labels!=='object') p.labels={};
  p.cols.forEach(c=>{ if(!c.id) c.id=uid(); if(!c.tipo) c.tipo='num'; if(typeof c.name!=='string') c.name='Coluna'; });
  return p;
}
function sanitizeSystem(sys){
  if(!sys || typeof sys!=='object' || Array.isArray(sys)) return null;
  ['attributes','resources','skills','classes','origins','themes','items',
   'choices','profTiers','conditions','tags','tagMatrix','techTiers','slots'].forEach(k=>{ if(!Array.isArray(sys[k])) sys[k]=[]; });
  if(typeof sys.cargaFormula!=='string') sys.cargaFormula='';
  /* --- peça 2: multiplicador de proficiência --- */
  if(!['nenhum','bonus','mult'].includes(sys.profMode)) sys.profMode='nenhum';
  if(typeof sys.profFormula!=='string') sys.profFormula='';
  sys.profTiers.forEach(t=>{
    if(!t.id) t.id=uid();
    if(typeof t.name!=='string') t.name='Grau';
    if(typeof t.mult!=='number'||Number.isNaN(t.mult)) t.mult=0;
    if(typeof t.bonus!=='number'||Number.isNaN(t.bonus)) t.bonus=0;
  });
  /* --- peça 1: pontos de escolha --- */
  sys.choices.forEach(c=>{
    if(!c.id) c.id=uid();
    if(typeof c.name!=='string') c.name='Escolha';
    if(typeof c.hint!=='string') c.hint='';
    if(typeof c.level!=='number'||Number.isNaN(c.level)) c.level=1;
    if(typeof c.count!=='number'||Number.isNaN(c.count)) c.count=1;
    if(typeof c.repetivel!=='boolean') c.repetivel=false;
    if(!Array.isArray(c.options)) c.options=[];
    c.options.forEach(o=>{
      if(!o.id) o.id=uid();
      if(typeof o.name!=='string') o.name='Opção';
      if(typeof o.description!=='string') o.description='';
      if(!o.req||typeof o.req!=='object') o.req={level:0,attrs:[]};
      if(typeof o.req.level!=='number') o.req.level=0;
      if(!Array.isArray(o.req.attrs)) o.req.attrs=[];
      if(!Array.isArray(o.req.choices)) o.req.choices=[];   /* exige outra opção escolhida */
      if(!Array.isArray(o.effects)) o.effects=[];
    });
  });
  /* --- peça 5: condições / estados --- */
  sys.conditions.forEach(c=>{
    if(!c.id) c.id=uid();
    if(typeof c.name!=='string') c.name='Condição';
    if(typeof c.icon!=='string') c.icon='⚠';
    if(typeof c.color!=='string') c.color='#e11d48';
    if(typeof c.description!=='string') c.description='';
    if(typeof c.noStack!=='boolean') c.noStack=true;
    if(typeof c.niveis!=='number'||Number.isNaN(c.niveis)) c.niveis=0;  /* 0 = sem trilha de níveis */
    if(!Array.isArray(c.componentes)) c.componentes=[];   /* composição: Fatigado = fraco + vulnerável */
    if(!Array.isArray(c.effects)) c.effects=[];
  });
  /* --- peça 7: tags e matriz de interação --- */
  sys.tags.forEach(t=>{
    if(!t.id) t.id=uid();
    if(typeof t.name!=='string') t.name='Tag';
    if(typeof t.color!=='string') t.color='#6366f1';
  });
  sys.tagMatrix.forEach(m=>{
    if(!m.id) m.id=uid();
    if(typeof m.mult!=='number'||Number.isNaN(m.mult)) m.mult=1;
    if(typeof m.dice!=='number'||Number.isNaN(m.dice)) m.dice=0;
    if(typeof m.nota!=='string') m.nota='';
  });
  /* --- peça 8: orçamento de técnica por tier --- */
  sys.techTiers.forEach(t=>{
    if(!t.id) t.id=uid();
    if(typeof t.name!=='string') t.name='Tier';
    if(typeof t.tier!=='number'||Number.isNaN(t.tier)) t.tier=0;
    if(typeof t.danoMax!=='string') t.danoMax='';
    if(typeof t.custoFormula!=='string') t.custoFormula='';
    if(typeof t.reqLevel!=='number'||Number.isNaN(t.reqLevel)) t.reqLevel=0;
  });
  if(typeof sys.techAtivo!=='boolean') sys.techAtivo=false;
  if(typeof sys.techNome!=='string') sys.techNome='Técnicas';
  if(typeof sys.techRecursoId!=='string') sys.techRecursoId='';
  if(typeof sys.techCustoAcaoComplexa!=='number') sys.techCustoAcaoComplexa=2;
  if(typeof sys.techCustoAcaoSimples!=='number') sys.techCustoAcaoSimples=1;
  if(typeof sys.techCustoExtra!=='number') sys.techCustoExtra=1;
  /* --- peça 6: slots e sintonização --- */
  sys.slots.forEach(s=>{
    if(!s.id) s.id=uid();
    if(typeof s.name!=='string') s.name='Slot';
    if(typeof s.max!=='number'||Number.isNaN(s.max)) s.max=1;
  });
  if(typeof sys.sintoniaMax!=='number'||Number.isNaN(sys.sintoniaMax)) sys.sintoniaMax=0;  /* 0 = sem sintonização */
  /* --- peça 3: como o sistema rola. O motor NÃO sabe o nome de nenhum sistema
     (Regra #25): "1d20 + bônus" e "pool de d20" são só configurações. --- */
  if(!['soma','pool'].includes(sys.rollMode)) sys.rollMode='soma';
  if(typeof sys.rollBase!=='string'||!sys.rollBase.trim()) sys.rollBase='1d20';
  if(typeof sys.poolFaces!=='number'||Number.isNaN(sys.poolFaces)) sys.poolFaces=20;
  if(typeof sys.critNat!=='number'||Number.isNaN(sys.critNat)) sys.critNat=20;
  if(typeof sys.critSoDados!=='boolean') sys.critSoDados=true;
  sys.items.forEach(it=>{
    if(!it.id) it.id=uid();
    if(typeof it.name!=='string') it.name='Item';
    if(typeof it.description!=='string') it.description='';
    if(!ITEM_CATS.some(c=>c[0]===it.categoria)) it.categoria='outro';
    if(typeof it.weight!=='number'||Number.isNaN(it.weight)) it.weight=0;
    if(typeof it.equipavel!=='boolean') it.equipavel=true;
    if(!Array.isArray(it.effects)) it.effects=[];
    if(typeof it.slotId!=='string') it.slotId='';
    if(typeof it.empilhavel!=='boolean') it.empilhavel=false;
    if(typeof it.sintonia!=='boolean') it.sintonia=false;
    /* ataque estruturado (arma) */
    if(!it.attack||typeof it.attack!=='object') it.attack={on:false};
    const at=it.attack;
    if(typeof at.on!=='boolean') at.on=false;
    if(typeof at.attrId!=='string') at.attrId='';
    if(typeof at.skillId!=='string') at.skillId='';
    if(typeof at.dano!=='string') at.dano='1d6';
    if(typeof at.alcance!=='string') at.alcance='';
    if(typeof at.critRange!=='number'||Number.isNaN(at.critRange)) at.critRange=20;
    if(typeof at.critMult!=='number'||Number.isNaN(at.critMult)) at.critMult=2;
    if(!Array.isArray(at.tags)) at.tags=[];
    /* armadura que DEFINE a fórmula (não só soma) */
    if(!it.armor||typeof it.armor!=='object') it.armor={on:false};
    const ar=it.armor;
    if(typeof ar.on!=='boolean') ar.on=false;
    if(typeof ar.resId!=='string') ar.resId='';
    if(typeof ar.formula!=='string') ar.formula='';
    if(typeof ar.maxAttrId!=='string') ar.maxAttrId='';
    if(typeof ar.maxAttrVal!=='number'||Number.isNaN(ar.maxAttrVal)) ar.maxAttrVal=0;
  });
  if(!sys.perLevel || typeof sys.perLevel!=='object') sys.perLevel={attrPoints:0,attrEveryN:0,skillPoints:0,skillEveryN:0};
  if(typeof sys.name!=='string') sys.name='Sistema sem nome';
  if(typeof sys.campaignName!=='string') sys.campaignName='Campanha';
  if(typeof sys.levelName!=='string'||!sys.levelName.trim()) sys.levelName='Nível';
  sys.progression=sanitizeProg(sys.progression);
  sys.classes.forEach(c=>{ c.progression=sanitizeProg(c.progression); });
  sys.resources.forEach(r=>{
    if(!r.recharge||typeof r.recharge!=='object') r.recharge={trig:'nunca',amt:'tudo',formula:''};
    if(typeof r.perRound!=='string') r.perRound='';
  });
  /* aparência do papel (editor reformado) */
  if(sys.sheet&&typeof sys.sheet==='object'){
    const sh=sys.sheet;
    if(typeof sh.bg!=='string') sh.bg='';                 /* vazio = fundo padrão do tema */
    if(typeof sh.bgImage!=='string') sh.bgImage='';
    if(typeof sh.grid!=='number'||Number.isNaN(sh.grid)) sh.grid=GRID;
    if(typeof sh.showGrid!=='boolean') sh.showGrid=true;
    if(typeof sh.snap!=='boolean') sh.snap=true;
    if(!Array.isArray(sh.guides)) sh.guides=[];           /* réguas fixas do mestre */
    sh.guides.forEach(g=>{ if(!g.id) g.id=uid(); if(g.eixo!=='gy') g.eixo='gx'; if(typeof g.pos!=='number') g.pos=0; });
  }
  return sys;
}
/* rótulo de um degrau: o que o mestre escreveu, ou "Nível 3" */
function levelLabel(sys,lv){
  const l=((sys.progression||{}).labels||{})[lv];
  return (l&&String(l).trim()) ? String(l).trim() : ((sys.levelName||'Nível')+' '+lv);
}
/* colunas numéricas do degrau atual viram variáveis; a tabela da classe vence a global */
function progVars(sys,d){
  const out={};
  const juntar=prog=>{
    if(!prog||!Array.isArray(prog.cols)) return;
    const row=(prog.rows||{})[d.level]||{};
    prog.cols.forEach(c=>{
      if(c.tipo!=='num') return;
      const v=row[c.id];
      if(v===undefined||v===''||v===null) return;
      const n=Number(v);
      if(Number.isFinite(n)) out[c.name]=n;
    });
  };
  juntar(sys.progression);
  const cls=(sys.classes||[]).find(c=>c.id===d.classId);
  if(cls) juntar(cls.progression);
  return out;
}
/* tudo do degrau atual (inclusive texto), para exibir na ficha */
function progLinha(sys,d){
  const out=[];
  const juntar=(prog,origem)=>{
    if(!prog||!Array.isArray(prog.cols)) return;
    const row=(prog.rows||{})[d.level]||{};
    prog.cols.forEach(c=>{
      const v=row[c.id];
      if(v===undefined||v===''||v===null) return;
      const i=out.findIndex(x=>x.name===c.name);
      const item={name:c.name, valor:String(v), tipo:c.tipo, origem};
      if(i>=0) out[i]=item; else out.push(item);
    });
  };
  juntar(sys.progression,'sistema');
  const cls=(sys.classes||[]).find(c=>c.id===d.classId);
  if(cls) juntar(cls.progression, cls.name);
  return out;
}
/* v6 usava sheet.sections (lista ordenada com on/off). v7 usa sheet.blocks (x/y/w/h). */
function migrateSheet(sys){
  const old=sys.sheet;
  if(old && Array.isArray(old.blocks)){
    old.blocks.forEach(b=>{
      const antigo=b.opts||{};
      b.opts={...defaultOpts(b.key), ...antigo};
      /* Entrada 004: honeycomb (booleano) virou arranjo (grade|colmeia|flor).
         A checagem usa o objeto ANTES do merge — depois dele o default já
         preencheu "arranjo" e a conversão nunca dispararia. */
      if(antigo.arranjo===undefined && antigo.honeycomb!==undefined){
        b.opts.arranjo=antigo.honeycomb?'colmeia':'grade';
      }
      delete b.opts.honeycomb;
    });
    if(!old.canvasH) old.canvasH=990;
    return;
  }
  const sh=defaultSheet();
  if(old){
    if(old.title) sh.title=old.title;
    if(old.accent) sh.accent=old.accent;
    const byKey=k=>sh.blocks.find(b=>b.key===k);
    if(old.attrCols) byKey('atributos').opts.cols=Math.max(2,Math.min(6,old.attrCols));
    if(old.avatarEmoji) byKey('foto').opts.emoji=old.avatarEmoji;
    if(old.showAvatar===false) sh.blocks=sh.blocks.filter(b=>b.key!=='foto');
    if(Array.isArray(old.sections)){
      const map={stats:['atributos','valores'],recursos:['recursos'],pericias:['pericias'],habilidades:['habilidades'],
                 caracteristicas:['caracteristicas'],anotacoes:['anotacoes'],dados:['dados']};
      const drop=new Set();
      old.sections.filter(s=>!s.on).forEach(s=>(map[s.key]||[]).forEach(k=>drop.add(k)));
      sh.blocks=sh.blocks.filter(b=>!drop.has(b.key));
    }
  }
  sys.sheet=sh;
}
const SCHEMA_MIN=6;   /* versões que sabemos migrar */
function migrateSystem(sys){
  if(!sys || typeof sys!=='object' || Array.isArray(sys)) return null;
  const v=sys.__v;
  /* aceita qualquer versão conhecida (6..atual); versão de fora disso não se arrisca */
  if(typeof v!=='number' || v<SCHEMA_MIN || v>SCHEMA) return null;
  if(!sanitizeSystem(sys)) return null;
  migrateSheet(sys);
  sys.__v=SCHEMA;
  return sys;
}

function defaultSystem(){
  const A=[['Força','FOR'],['Agilidade','AGI'],['Vigor','VIG'],['Mente','MEN'],['Presença','PRE']]
    .map(([name,abbr])=>({id:uid(),name,abbr}));
  /* o exemplo já demonstra a recarga: Vida/Mana no descanso longo, Estamina no curto */
  const R=[
    {id:uid(),name:'Vida',type:'barra',formula:'Vigor * 5 + 10',color:'#ef4444',
      recharge:{trig:'longo',amt:'tudo',formula:''},perRound:''},
    {id:uid(),name:'Mana',type:'barra',formula:'Mente * 4',color:'#3b82f6',
      recharge:{trig:'longo',amt:'tudo',formula:''},perRound:''},
    {id:uid(),name:'Estamina',type:'barra',formula:'(Força + Vigor) * 2',color:'#22c55e',
      recharge:{trig:'curto',amt:'tudo',formula:''},perRound:''},
    {id:uid(),name:'Defesa',type:'valor',formula:'Agilidade + 10',color:'#06b6d4',
      recharge:{trig:'nunca',amt:'tudo',formula:''},perRound:''},
  ];
  const aId=n=>A.find(a=>a.name===n).id;
  const K=[
    {id:uid(),name:'Reflexo',description:'Reação a perigos súbitos.',linkedAttrId:aId('Agilidade'),trainedBonus:0,auto:true},
    {id:uid(),name:'Percepção',description:'Notar detalhes e ameaças.',linkedAttrId:aId('Mente'),trainedBonus:0,auto:true},
    {id:uid(),name:'Luta',description:'Combate corpo a corpo.',linkedAttrId:aId('Força'),trainedBonus:2,auto:false},
    {id:uid(),name:'Pontaria',description:'Ataques à distância.',linkedAttrId:aId('Agilidade'),trainedBonus:2,auto:false},
    {id:uid(),name:'Furtividade',description:'Mover-se sem ser notado.',linkedAttrId:aId('Agilidade'),trainedBonus:2,auto:false},
    {id:uid(),name:'Arcanismo',description:'As artes mágicas.',linkedAttrId:aId('Mente'),trainedBonus:2,auto:false},
    {id:uid(),name:'Persuasão',description:'Convencer e negociar.',linkedAttrId:aId('Presença'),trainedBonus:2,auto:false},
    {id:uid(),name:'Atletismo',description:'Correr, escalar, saltar.',linkedAttrId:aId('Força'),trainedBonus:2,auto:false},
  ];
  const kId=n=>K.find(k=>k.name===n).id, rId=n=>R.find(r=>r.name===n).id;
  const ab=(name,description,effects,req)=>({id:uid(),name,description,req:req||{level:0,attrs:[]},effects:effects||[]});
  const efA=(n,v)=>({id:uid(),kind:'atributo',targetId:aId(n),value:v});
  const efR=(n,v)=>({id:uid(),kind:'recurso',targetId:rId(n),value:v});
  const efK=n=>({id:uid(),kind:'pericia',targetId:kId(n),value:0});
  const efL=t=>({id:uid(),kind:'livre',text:t,mods:[]});
  /* característica: 'tag' (etiqueta, existe/não existe) ou 'num' (vira variável nas fórmulas) */
  const efC=(nome,tipo,v)=>({id:uid(),kind:'caracteristica',text:nome,charType:tipo,value:v||0});
  /* efeito único: descrição livre + modificações mecânicas anexadas (o "aumenta Defesa e Vida ao mesmo tempo") */
  const efU=(t,mods)=>({id:uid(),kind:'livre',text:t,mods:mods||[]});
  /* sanitizeSystem no fim garante que todo campo novo (progressão, recarga…)
     exista também num sistema recém-criado, sem duplicar os defaults aqui */
  return sanitizeSystem({
    __v:SCHEMA, sheet:defaultSheet(),
    campaignName:'A Marca do Dragão',
    name:'Sistema Genérico de Fantasia',
    themes:['Fantasia','Aventura'],
    levelName:'Nível',
    startLevel:1, maxLevel:10,
    cargaFormula:'Força * 5',
    attributePoints:6, skillChoices:3,
    startAttrValue:1, attrMin:0, attrMax:5, allowDump:true,
    attrMode:'direto', modFormula:'(V - 10) / 2',
    perLevel:{ attrPoints:1, attrEveryN:2, skillPoints:1, skillEveryN:2 },
    attributes:A, resources:R, skills:K,
    classes:[
      {id:uid(),name:'Guerreiro',description:'Domina o combate e a resistência física.',abilities:[
        ab('Treinamento de Batalha','Anos empunhando armas.',[efA('Força',1)]),
        ab('Couro Duro','Aguenta mais castigo.',[efR('Vida',10)]),
        ab('Investida Brutal','Avança e esmaga o inimigo — libera no nível 3.',[efL('Ataque com +2 de dano ao investir'),efR('Estamina',5)],{level:3,attrs:[]}),
      ]},
      {id:uid(),name:'Arcanista',description:'Canaliza a magia bruta do mundo.',abilities:[
        ab('Fonte Arcana','Mente afinada com o etéreo.',[efA('Mente',1)]),
        ab('Estudo Arcano','Anos de estudo.',[efK('Arcanismo')]),
        ab('Explosão Arcana','Magia de área devastadora — requer Nível 4 e Mente 3.',[efL('Dano em área baseado em Mente')],{level:4,attrs:[{id:uid(),attrId:aId('Mente'),min:3}]}),
      ]},
      {id:uid(),name:'Batedor',description:'Ágil, furtivo e observador.',abilities:[
        ab('Instinto Selvagem','Sentidos aguçados.',[efA('Agilidade',1)]),
        ab('Passo Leve','Anda sem ruído.',[efK('Furtividade')]),
      ]},
    ],
    origins:[
      {id:uid(),name:'Humano',description:'Versátil e adaptável.',traits:[],abilities:[
        ab('Determinação','A vontade humana de vencer.',[efA('Presença',1)]),
      ]},
      {id:uid(),name:'Silvano',description:'Povo élfico da floresta, ágil e atento.',
        traits:[{id:uid(),name:'Orelhas pontudas',description:'Audição aguçada.'},{id:uid(),name:'Olhos élficos',description:'Enxerga bem no escuro.'}],
        abilities:[ ab('Graça Silvana','Movimentos precisos.',[efA('Agilidade',1)]), ab('Vista Aguçada','',[efK('Percepção')]) ]},
      {id:uid(),name:'Alado',description:'Descendentes de seres celestiais.',
        traits:[{id:uid(),name:'Asas',description:'Pode planar por curtas distâncias.'}],
        abilities:[ ab('Sangue Celestial','',[efA('Mente',1)]), ab('Voo Pleno','Alça voo verdadeiro — requer Nível 5.',[efL('Voa livremente durante a cena')],{level:5,attrs:[]}) ]},
      {id:uid(),name:'Robusto',description:'Povo baixo e resistente das montanhas.',
        traits:[{id:uid(),name:'Corpo denso',description:'Baixo, mas incrivelmente resistente.'}],
        abilities:[ ab('Casca Grossa','',[efA('Vigor',1)]), ab('Fôlego de Ferro','',[efR('Estamina',8)]) ]},
    ],
    items:[
      {id:uid(),name:'Armadura de Couro',categoria:'armadura',weight:8,equipavel:true,
        description:'Proteção leve de couro batido.',effects:[efR('Defesa',2)]},
      {id:uid(),name:'Amuleto de Força',categoria:'acessorio',weight:0.5,equipavel:true,
        description:'Um talismã que reforça os músculos de quem o veste.',effects:[efA('Força',1)]},
      {id:uid(),name:'Botas de Escalada',categoria:'ferramenta',weight:1,equipavel:true,
        description:'Cravos e garras que ampliam a mobilidade em terreno difícil.',
        effects:[efC('Deslocamento','num',3), efC('Escala superfícies','tag',0)]},
      {id:uid(),name:'Talismã do Guardião',categoria:'acessorio',weight:2,equipavel:true,
        description:'Uma aura protetora envolve o portador.',
        effects:[efU('Aura protetora: reforça corpo e vitalidade ao mesmo tempo.',[efR('Defesa',2),efR('Vida',10)])]},
      {id:uid(),name:'Poção de Cura',categoria:'consumivel',weight:0.2,equipavel:false,
        description:'Bebida que restaura ferimentos. Consumível — não fica equipada.',
        effects:[efL('Recupera 15 de Vida ao beber (uso único).')]},
    ],
  });
}
function initDraft(sys){
  return {
    name:'', classId:(sys.classes[0]||{}).id||null, originId:(sys.origins[0]||{}).id||null,
    level:sys.startLevel, notes:'',
    attrs:Object.fromEntries(sys.attributes.map(a=>[a.id,sys.startAttrValue])),
    skills:[], resCurrent:{}, inventory:[],
    choices:{},        /* peça 1: {choiceId:[optionId,…]} */
    skillTier:{},      /* peça 2: {skillId:tierId} */
    conditions:[],     /* peça 5: [{cid,condId,nivel}] */
    techniques:[],     /* peça 8: técnicas autorais do jogador */
  };
}
/* Garante que um rascunho antigo (salvo antes destas peças) tenha os campos novos. */
function sanitizeDraft(d,sys){
  if(!d||typeof d!=='object') return initDraft(sys);
  if(!d.choices||typeof d.choices!=='object') d.choices={};
  if(!d.skillTier||typeof d.skillTier!=='object') d.skillTier={};
  if(!Array.isArray(d.conditions)) d.conditions=[];
  if(!Array.isArray(d.techniques)) d.techniques=[];
  if(!Array.isArray(d.inventory)) d.inventory=[];
  d.inventory.forEach(e=>{
    if(!e.iid) e.iid=uid();
    if(typeof e.qtd!=='number'||Number.isNaN(e.qtd)||e.qtd<1) e.qtd=1;
    if(typeof e.attuned!=='boolean') e.attuned=false;
  });
  d.conditions.forEach(c=>{ if(!c.cid) c.cid=uid(); if(typeof c.nivel!=='number') c.nivel=1; });
  d.techniques.forEach(t=>{ if(!t.id) t.id=uid(); if(!t.campos||typeof t.campos!=='object') t.campos={}; });
  return d;
}

/* progressão por nível */
function levelPoints(sys, level){
  const steps=Math.max(0,(level||sys.startLevel)-sys.startLevel);
  const p=sys.perLevel||{};
  const ax=(p.attrEveryN>0)?Math.floor(steps/p.attrEveryN)*(p.attrPoints||0):0;
  const sx=(p.skillEveryN>0)?Math.floor(steps/p.skillEveryN)*(p.skillPoints||0):0;
  return { attrPoints:(sys.attributePoints||0)+ax, skillCount:(sys.skillChoices||0)+sx };
}
/* ---- Aplicação de efeitos ----
   Um efeito pode ser: bônus de atributo, bônus de recurso, concede perícia,
   característica (etiqueta ou numérica) ou "efeito único" (texto livre que
   carrega uma lista de modificações — o "aumenta Defesa e Vida ao mesmo tempo").
   applyEffectTo despeja o efeito nos baldes; attrOnlyTo extrai só o atributo
   (usado na 1ª passagem que libera requisitos), recursando nos mods. */
const DICE_ESCOPOS=[['todos','Todas as rolagens'],['ataque','Ataques'],['pericia','Testes de perícia'],['defesa','Defesa'],['dano','Dano'],['tecnica','Técnicas']];
function applyEffectTo(ef, B, mult){
  if(!ef) return;
  const k=mult==null?1:mult;               /* trilha de níveis (exaustão) multiplica o valor */
  const v=(+ef.value||0)*k;
  if(ef.kind==='atributo'){ if(ef.targetId) B.attrBonus[ef.targetId]=(B.attrBonus[ef.targetId]||0)+v; }
  else if(ef.kind==='recurso'){ if(ef.targetId) B.resBonus[ef.targetId]=(B.resBonus[ef.targetId]||0)+v; }
  else if(ef.kind==='pericia'){ if(ef.targetId && !B.grantedSkills.includes(ef.targetId)) B.grantedSkills.push(ef.targetId); }
  else if(ef.kind==='caracteristica'){ const nm=(ef.text||'').trim(); if(nm){
    if(ef.charType==='num') B.charNum[nm]=(B.charNum[nm]||0)+v;
    else if(!B.charTags.includes(nm)) B.charTags.push(nm); } }
  /* PEÇA 4 — canal de DADOS. Não se converte em número: some/tire dados. */
  else if(ef.kind==='dados'){ const es=ef.escopo||'todos'; B.diceMod[es]=(B.diceMod[es]||0)+v; }
  else if(ef.kind==='livre'){ (ef.mods||[]).forEach(m=>applyEffectTo(m,B,k)); }
}
/* Quantos dados somar/tirar num escopo (o "todos" sempre entra junto). */
function diceModDe(B, escopo){ return (B.diceMod&&((B.diceMod.todos||0)+(B.diceMod[escopo]||0)))||0; }
function attrOnlyTo(ef, tot1){
  if(!ef) return;
  if(ef.kind==='atributo'){ if(ef.targetId) tot1[ef.targetId]=(tot1[ef.targetId]||0)+(+ef.value||0); }
  else if(ef.kind==='livre'){ (ef.mods||[]).forEach(m=>attrOnlyTo(m,tot1)); }
}
/* efeitos com requisitos (2 passagens p/ liberar habilidades) */
/* Expande as condições ativas: resolve composição (Fatigado = Fraco + Vulnerável),
   com guarda contra ciclo, e aplica a regra de não-empilhamento. */
function expandirCondicoes(sys,d){
  const cat=sys.conditions||[];
  const out=[]; const vistos=new Set();
  const visita=(condId,nivel,raiz,profundidade)=>{
    if(profundidade>8) return;                      /* guarda contra ciclo A→B→A */
    const c=cat.find(x=>x.id===condId); if(!c) return;
    const chave=c.id;
    if(c.noStack!==false && vistos.has(chave)){
      /* já existe: fica com o nível mais alto, não soma duas vezes */
      const ja=out.find(o=>o.cond.id===chave);
      if(ja && nivel>ja.nivel) ja.nivel=nivel;
      return;
    }
    vistos.add(chave);
    out.push({cond:c, nivel:Math.max(1,nivel||1), via:raiz});
    (c.componentes||[]).forEach(id=>visita(id,nivel,c.name,profundidade+1));
  };
  (d.conditions||[]).forEach(e=>visita(e.condId, e.nivel||1, null, 0));
  return out;
}
/* Opções de ponto de escolha efetivamente escolhidas pelo jogador. */
function escolhasAtivas(sys,d){
  const out=[];
  (sys.choices||[]).forEach(ch=>{
    const sel=(d.choices||{})[ch.id]||[];
    sel.forEach(oid=>{ const op=(ch.options||[]).find(o=>o.id===oid); if(op) out.push({ch,op}); });
  });
  return out;
}
function gatherEffects(sys,d){
  const cls=sys.classes.find(c=>c.id===d.classId);
  const org=sys.origins.find(o=>o.id===d.originId);
  const sources=[];
  if(cls)(cls.abilities||[]).forEach(a=>sources.push({ab:a,src:'classe'}));
  if(org)(org.abilities||[]).forEach(a=>sources.push({ab:a,src:'raça'}));
  /* PEÇA 1 — cada opção escolhida entra como uma fonte igual às outras */
  const escolhidas=escolhasAtivas(sys,d);
  escolhidas.forEach(({ch,op})=>sources.push({ab:op,src:ch.name}));
  const level=d.level;
  const isUncond=ab=>{const r=ab.req||{};return (!r.level||r.level<=0)&&(!(r.attrs&&r.attrs.length));};
  /* itens equipados: no inventário E marcados como equipados. Se o sistema usa
     sintonização, item que exige sintonia só vale se estiver sintonizado. */
  const cat=sys.items||[];
  const equipped=[];
  (d.inventory||[]).forEach(entry=>{ const it=cat.find(x=>x.id===entry.itemId); if(!it||!entry.equipped) return;
    if(it.sintonia && (sys.sintoniaMax||0)>0 && !entry.attuned) return;
    equipped.push({it,entry}); });
  /* PEÇA 5 — condições entram como fonte, com o nível multiplicando os valores */
  const condAtivas=expandirCondicoes(sys,d);
  /* 1ª passagem: base + fontes incondicionais + itens equipados alimentam os requisitos */
  const tot1={}; sys.attributes.forEach(a=>tot1[a.id]=(d.attrs[a.id]??0));
  sources.forEach(({ab})=>{ if(isUncond(ab))(ab.effects||[]).forEach(ef=>attrOnlyTo(ef,tot1)); });
  equipped.forEach(({it})=>(it.effects||[]).forEach(ef=>attrOnlyTo(ef,tot1)));
  const reasonsFor=ab=>{ const r=ab.req||{}; const out=[];
    if(r.level&&level<r.level) out.push((sys.levelName||'Nível')+' '+r.level);
    (r.attrs||[]).forEach(rq=>{ if((tot1[rq.attrId]||0)<rq.min){const a=sys.attributes.find(x=>x.id===rq.attrId);out.push((a?a.name:'?')+' '+rq.min+'+');} });
    /* pré-requisito por opção: exige outra opção já escolhida */
    (r.choices||[]).forEach(oid=>{ if(!escolhidas.some(e=>e.op.id===oid)){
      let nome='outra escolha';
      (sys.choices||[]).forEach(c=>(c.options||[]).forEach(o=>{ if(o.id===oid) nome=o.name; }));
      out.push('Requer: '+nome); } });
    return out; };
  const B={attrBonus:{},resBonus:{},grantedSkills:[],charNum:{},charTags:[],diceMod:{}};
  const active=[],locked=[];
  sources.forEach(({ab,src})=>{ const rs=reasonsFor(ab);
    if(rs.length){ locked.push({ab,src,reasons:rs}); return; }
    active.push({ab,src});
    (ab.effects||[]).forEach(ef=>applyEffectTo(ef,B));
  });
  /* itens equipados aplicam efeitos como qualquer outra fonte */
  equipped.forEach(({it})=>(it.effects||[]).forEach(ef=>applyEffectTo(ef,B)));
  /* condições aplicam por último (é o que o mestre liga e desliga na mesa) */
  condAtivas.forEach(({cond,nivel})=>{
    const k=(cond.niveis>0)?Math.max(1,nivel):1;
    (cond.effects||[]).forEach(ef=>applyEffectTo(ef,B,k));
  });
  return {cls,org,active,locked,equipped,escolhidas,condAtivas,
    attrBonus:B.attrBonus,resBonus:B.resBonus,grantedSkills:B.grantedSkills,
    charNum:B.charNum,charTags:B.charTags,diceMod:B.diceMod,B,
    abilities:active.map(x=>x.ab)};
}
/* PEÇA 7 — relação direcional entre tags: multiplicador de dano + modificador de dados.
   Serve tanto para resistência/vulnerabilidade de D&D quanto para o ciclo de
   opressão do Ordem (Sangue▸Conhecimento▸Energia▸Morte▸Sangue). */
function interacaoTags(sys, tagsOrigem, tagsAlvo){
  let mult=1, dice=0; const notas=[];
  (sys.tagMatrix||[]).forEach(m=>{
    if(!(tagsOrigem||[]).includes(m.from)) return;
    if(!(tagsAlvo||[]).includes(m.to)) return;
    mult*=(typeof m.mult==='number'?m.mult:1);
    dice+=(m.dice||0);
    const nm=id=>((sys.tags||[]).find(t=>t.id===id)||{}).name||'?';
    notas.push(nm(m.from)+' ▸ '+nm(m.to)+' ×'+m.mult+(m.dice?(' '+sign(m.dice)+'d'):'')+(m.nota?(' — '+m.nota):''));
  });
  return {mult, dice, notas};
}
function effectLabel(sys,ef){
  if(ef.kind==='livre'){ const n=(ef.mods||[]).length; return (ef.text||'efeito único')+(n?(' ('+n+' mod.)'):''); }
  if(ef.kind==='atributo'){const a=sys.attributes.find(x=>x.id===ef.targetId);return sign(ef.value)+' '+(a?a.name:'?');}
  if(ef.kind==='recurso'){const r=sys.resources.find(x=>x.id===ef.targetId);return sign(ef.value)+' '+(r?r.name:'?')+' (máx)';}
  if(ef.kind==='pericia'){const k=sys.skills.find(x=>x.id===ef.targetId);return 'Concede '+(k?k.name:'?');}
  if(ef.kind==='caracteristica'){const nm=(ef.text||'').trim()||'?'; return ef.charType==='num'?('◆ '+nm+' '+sign(+ef.value||0)):('🏷 '+nm);}
  if(ef.kind==='dados'){const e=(DICE_ESCOPOS.find(x=>x[0]===(ef.escopo||'todos'))||[,'?'])[1];
    return '🎲 '+sign(+ef.value||0)+'d em '+e;}
  return '';
}
function reqTags(sys,ab){ const r=ab.req||{}; const out=[];
  if(r.level>0) out.push('Nível '+r.level);
  (r.attrs||[]).forEach(rq=>{const a=sys.attributes.find(x=>x.id===rq.attrId);out.push((a?a.name:'?')+' '+rq.min+'+');});
  return out; }

