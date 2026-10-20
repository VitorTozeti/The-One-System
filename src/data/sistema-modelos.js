/* ============================================================ MODELOS DE SISTEMA (assistente de criação) ============================================================
   Pontos de partida coerentes: atributos + recursos + perícias + classes + origens
   que já passam em todas as verificações da aba Início. O assistente deixa o
   Mestre renomear atributos e ligar/desligar recursos antes de criar.
   Convenções: fórmulas usam {0},{1}… = o NOME do atributo de mesmo índice
   (assim renomear "Força" para "Músculo" não quebra as fórmulas).
   Depende de: example-system.js (sanitizeSystem, defaultSheet, SCHEMA), helpers (uid). */

const MODELOS_SISTEMA=[
  { k:'fantasia', ic:'🐉', nome:'Fantasia clássica', desc:'Espada, magia e masmorras. Vida, Mana, Estamina e Defesa; Guerreiro, Arcanista e Batedor.',
    tempo:'pronto para jogar', themes:['Fantasia','Aventura'], rollBase:'1d20', levelName:'Nível',
    camp:'A Marca do Dragão', sis:'Fantasia Clássica',
    attrs:[['Força','FOR'],['Agilidade','AGI'],['Vigor','VIG'],['Mente','MEN'],['Presença','PRE']],
    num:{startLevel:1,maxLevel:10,attributePoints:6,skillChoices:3,startAttrValue:1,attrMin:0,attrMax:5,allowDump:true,
         perLevel:{attrPoints:1,attrEveryN:3,skillPoints:1,skillEveryN:3}},
    carga:'{0} * 5',
    res:[
      {n:'Vida',   tipo:'barra',f:'{2} * 5 + 10',cor:'#ef4444',rc:'longo'},
      {n:'Mana',   tipo:'barra',f:'{3} * 4',     cor:'#3b82f6',rc:'longo'},
      {n:'Estamina',tipo:'barra',f:'({0} + {2}) * 2',cor:'#22c55e',rc:'curto'},
      {n:'Defesa', tipo:'valor',f:'{1} + 10',    cor:'#06b6d4',rc:'nunca'}],
    per:[ ['Reflexo',1,true,0,'Reação a perigos súbitos.'],['Percepção',3,true,0,'Notar detalhes e ameaças.'],
          ['Luta',0,false,2,'Combate corpo a corpo.'],['Pontaria',1,false,2,'Ataques à distância.'],
          ['Furtividade',1,false,2,'Mover-se sem ser notado.'],['Arcanismo',3,false,2,'As artes mágicas.'],
          ['Persuasão',4,false,2,'Convencer e negociar.'],['Atletismo',0,false,2,'Correr, escalar, saltar.'],
          ['Sobrevivência',2,false,2,'Rastrear, caçar, acampar.'],['Medicina',3,false,2,'Tratar ferimentos e doenças.']],
    cls:[ ['Guerreiro','Domina o combate e a resistência física.',[['Treinamento de Batalha','Anos empunhando armas.','a',0,1],['Couro Duro','Aguenta mais castigo.','r','Vida',10]]],
          ['Arcanista','Canaliza a magia bruta do mundo.',[['Fonte Arcana','Mente afinada com o etéreo.','a',3,1],['Reserva Arcana','Mais energia mágica.','r','Mana',8]]],
          ['Batedor','Ágil, furtivo e observador.',[['Instinto Selvagem','Sentidos aguçados.','a',1,1],['Fôlego Extra','Resiste a longas jornadas.','r','Estamina',6]]]],
    ori:[ ['Humano','Versátil e adaptável.',[['Determinação','A vontade humana de vencer.','a',4,1]]],
          ['Silvano','Povo élfico da floresta, ágil e atento.',[['Graça Silvana','Movimentos precisos.','a',1,1]]],
          ['Robusto','Povo baixo e resistente das montanhas.',[['Casca Grossa','Aguenta muito.','a',2,1]]]] },

  { k:'investigacao', ic:'🕯️', nome:'Investigação / terror', desc:'Pistas, medo e sanidade. Poucos pontos de vida, muita tensão; Detetive, Acadêmico e Combatente.',
    tempo:'pronto para jogar', themes:['Investigação','Terror','Mistério'], rollBase:'1d20', levelName:'Nível',
    camp:'Sombras em Arkham', sis:'Investigação e Terror',
    attrs:[['Físico','FIS'],['Intelecto','INT'],['Presença','PRE'],['Sensibilidade','SEN']],
    num:{startLevel:1,maxLevel:5,attributePoints:5,skillChoices:4,startAttrValue:1,attrMin:0,attrMax:5,allowDump:false,
         perLevel:{attrPoints:1,attrEveryN:2,skillPoints:1,skillEveryN:2}},
    carga:'{0} * 3',
    res:[
      {n:'Vida',    tipo:'barra',f:'{0} * 3 + 8', cor:'#ef4444',rc:'longo'},
      {n:'Sanidade',tipo:'barra',f:'{1} * 3 + {3} * 2 + 10',cor:'#a855f7',rc:'nunca'},
      {n:'Defesa',  tipo:'valor',f:'10 + {0}',    cor:'#06b6d4',rc:'nunca'}],
    per:[ ['Atenção',3,true,0,'Notar o que está fora do lugar.'],['Reflexo',0,true,0,'Reagir ao perigo.'],
          ['Investigação',1,false,2,'Examinar cenas e juntar pistas.'],['Ocultismo',3,false,2,'Conhecimento sobre o sobrenatural.'],
          ['Medicina',1,false,2,'Primeiros socorros e diagnóstico.'],['Furtividade',0,false,2,'Não ser visto nem ouvido.'],
          ['Briga',0,false,2,'Combate corpo a corpo.'],['Tiro',0,false,2,'Armas de fogo.'],
          ['Persuasão',2,false,2,'Conversar, mentir, convencer.'],['Biblioteca',1,false,2,'Pesquisar em arquivos e livros.']],
    cls:[ ['Detetive','Segue rastros e conecta pistas.',[['Olho Clínico','Nada passa despercebido.','a',1,1],['Sangue-frio','Mantém a calma sob pressão.','r','Sanidade',5]]],
          ['Acadêmico','Estudioso do que não deveria ser estudado.',[['Mente Afiada','Anos de pesquisa.','a',1,1],['Fé na Razão','Resiste ao horror.','r','Sanidade',8]]],
          ['Combatente','Quem leva a luta para o escuro.',[['Treino de Campo','Corpo preparado.','a',0,1],['Pele Grossa','Aguenta pancada.','r','Vida',6]]]],
    ori:[ ['Civil','Gente comum arrastada para o problema.',[['Instinto de Sobrevivência','Foge e se esconde bem.','r','Vida',2]]],
          ['Policial','Treinado para situações de risco.',[['Treinamento Policial','Disciplina física.','a',0,1]]],
          ['Estudioso','Rato de biblioteca.',[['Memória Aguçada','Lembra de tudo que leu.','a',1,1]]]] },

  { k:'simples', ic:'📖', nome:'Simples / narrativo', desc:'Regras leves para contar histórias: 3 atributos, 1 barra de Vida e rolagem de 2d6. Ótimo para quem nunca montou um sistema.',
    tempo:'o mais rápido', themes:['Aventura','Drama'], rollBase:'2d6', levelName:'Nível',
    camp:'Nossa Primeira Aventura', sis:'Sistema Simples',
    attrs:[['Corpo','COR'],['Mente','MEN'],['Coração','CRA']],
    num:{startLevel:1,maxLevel:5,attributePoints:3,skillChoices:3,startAttrValue:1,attrMin:0,attrMax:4,allowDump:false,
         perLevel:{attrPoints:1,attrEveryN:2,skillPoints:1,skillEveryN:2}},
    carga:'{0} * 4',
    res:[
      {n:'Vida',tipo:'barra',f:'{0} * 2 + 6',cor:'#ef4444',rc:'longo'},
      {n:'Determinação',tipo:'barra',f:'{2} + 2',cor:'#f59e0b',rc:'longo'}],
    per:[ ['Lutar',0,false,1,'Brigar com o que tiver à mão.'],['Mover-se',0,false,1,'Correr, escalar, esquivar.'],
          ['Observar',1,false,1,'Perceber e deduzir.'],['Saber',1,false,1,'Conhecimento e estudo.'],
          ['Convencer',2,false,1,'Persuadir, enganar, inspirar.'],['Resistir',2,false,1,'Aguentar pressão e medo.']],
    cls:[ ['Aventureiro','Alguém pronto para o que vier.',[['Jeito de Se Virar','Sempre dá um jeito.','r','Determinação',1]]]],
    ori:[ ['Comum','Uma pessoa como outra qualquer.',[['Teimosia','Não desiste fácil.','r','Vida',2]]]] },

  { k:'branco', ic:'📄', nome:'Em branco', desc:'Nada pré-montado. Você cria tudo, e a aba Início te guia passo a passo.',
    tempo:'controle total', themes:[], rollBase:'1d20', levelName:'Nível',
    camp:'Minha Campanha', sis:'Meu Sistema',
    attrs:[], num:{startLevel:1,maxLevel:10,attributePoints:6,skillChoices:3,startAttrValue:1,attrMin:0,attrMax:5,allowDump:true,
         perLevel:{attrPoints:1,attrEveryN:2,skillPoints:1,skillEveryN:2}},
    carga:'', res:[], per:[], cls:[], ori:[] },
];
function modeloSistema(k){ return MODELOS_SISTEMA.find(m=>m.k===k)||MODELOS_SISTEMA[0]; }

/* Monta um sistema completo e validado a partir de um modelo.
   cfg = {campaignName, name, themes, attrNames:[…], resOn:{nomeDoRecurso:bool}} (tudo opcional) */
function construirSistema(k, cfg){
  const m=modeloSistema(k); cfg=cfg||{};
  const nomes=m.attrs.map((a,i)=>{ const n=String((cfg.attrNames&&cfg.attrNames[i])||'').trim(); return n||a[0]; });
  const A=m.attrs.map((a,i)=>({id:uid(), name:nomes[i], abbr:(cfg.attrNames&&cfg.attrNames[i]&&cfg.attrNames[i].trim()&&cfg.attrNames[i].trim()!==a[0])?'':a[1]}));
  const sub=f=>String(f||'').replace(/\{(\d+)\}/g,(_,i)=>nomes[+i]||'0');
  const R=m.res.filter(r=>!cfg.resOn||cfg.resOn[r.n]!==false).map(r=>({id:uid(),name:r.n,type:r.tipo,formula:sub(r.f),color:r.cor,
    recharge:{trig:r.rc,amt:'tudo',formula:''},perRound:''}));
  const rId=n=>(R.find(r=>r.name===n)||{}).id;
  const K=m.per.map(p=>({id:uid(),name:p[0],description:p[4]||'',linkedAttrId:(A[p[1]]||{}).id||'',trainedBonus:p[3],auto:!!p[2]}));
  const efs=ab=>{ const [,, t, alvo, v]=ab;
    if(t==='a'){ const a=A[alvo]; return a?[{id:uid(),kind:'atributo',targetId:a.id,value:v}]:[]; }
    const id=rId(alvo); return id?[{id:uid(),kind:'recurso',targetId:id,value:v}]:[]; };
  const grupo=lista=>lista.map(c=>({id:uid(),name:c[0],description:c[1],traits:[],
    abilities:c[2].map(ab=>({id:uid(),name:ab[0],description:ab[1],req:{level:0,attrs:[]},effects:efs(ab)}))}));
  const sys={ __v:SCHEMA, sheet:defaultSheet(),
    campaignName:String(cfg.campaignName||m.camp).trim()||m.camp,
    name:String(cfg.name||m.sis).trim()||m.sis,
    themes:(cfg.themes||m.themes).slice(),
    levelName:m.levelName, cargaFormula:sub(m.carga),
    ...JSON.parse(JSON.stringify(m.num)),
    attrMode:'direto', modFormula:'(V - 10) / 2',
    rollBase:m.rollBase,
    attributes:A, resources:R, skills:K, classes:grupo(m.cls), origins:grupo(m.ori) };
  if(typeof m.pos==='function'){ sanitizeSystem(sys); m.pos(sys); }   /* ajustes dos modelos inspirados (regras-extra.js) */
  return sanitizeSystem(sys);
}
