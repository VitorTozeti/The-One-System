/* ============================================================ TÉCNICAS / MAGIAS — MODELOS, USO E ATIVAÇÃO ============================================================
   Técnica e magia são a mesma coisa aqui: uma habilidade com efeitos mecânicos.
   Este arquivo faz criar uma delas ser rápido e dá poder de "jogar" com ela na ficha:
     • MODELOS prontos (cura, buff de defesa, voo, recurso especial…) — um clique cria a técnica com ícone, texto, efeitos e custo
     • USO (aba 🪄 Usar no cartão): custo em um recurso (Mana…), efeito em um recurso (cura/dano com dados) ou LIGA/DESLIGA
         - Instantânea: botão "✨ Usar" na ficha — paga o custo e aplica a fórmula num recurso (ex.: cura 2d8 + Nível na Vida)
         - Ativa: botão liga/desliga — os efeitos (defesa +3, voo…) só valem enquanto ligada; ligar paga o custo
   Os efeitos do cartão continuam sendo os de sempre (effectRow): recursos, rolagem, resistência, capacidade, código…
   Depende de: classes-origens.js (helpers _rol/_res/_cap, _recPor, _V/_M), master-pieces.js (campoFormula), icon-picker.js. */

/* ---------- modelos ---------- */
const _DEF_NOMES=['Defesa','CA','Armadura','Classe de Armadura'], _EST_NOMES=['Estamina','Vigor','Energia','PA','Pontos de Ação'];
const _REFLEXO=['Agilidade','Destreza','Reflexos','Reflexo'], _VONTADE=['Vontade','Sabedoria','Mente','Espírito','Presença'], _FORTITUDE=['Vigor','Constituição','Resistência','Corpo','Físico'];
const _C_LENTO=['Lento','🐢','#38bdf8','Movimento pela metade.'];
const _fx=(o)=>Object.assign({id:uid(),targetId:'',value:0,text:'',charType:'tag',mods:[]},o);
/* c=categoria · ic=ícone · d=descrição · efs(sys)=efeitos · uso(sys)=configuração de uso (rec: nomes de recurso) */
const MODELOS_TECNICA=[
  {c:'Cura e vida',n:'Cura',ic:'💚',d:'Fecha ferimentos de si mesmo ou de um aliado.',
   uso:s=>({tipo:'cura',modo:'instantaneo',custo:['3',_M],alvo:_V,formula:'2d8 + Nível',alcance:'toque',texto:'Uma luz suave fecha os ferimentos.'})},
  {c:'Cura e vida',n:'Curar aliado à distância',ic:'💞',d:'Cura um aliado que você vê (rola e mostra quanto ele recupera).',
   uso:s=>({tipo:'cura',modo:'instantaneo',custo:['4',_M],aplicaEm:'alvo',formula:'2d8 + Nível',tipoDano:'Luz',alcance:'distancia',area:{forma:'',tam:'18'},alvos:'1'})},
  {c:'Cura e vida',n:'Círculo de cura',ic:'🌟',d:'Cura todos os aliados em volta de você.',
   uso:s=>({tipo:'cura',modo:'instantaneo',custo:['6',_M],aplicaEm:'alvo',formula:'3d8',tipoDano:'Luz',alcance:'area',area:{forma:'aura',tam:'6'}})},
  {c:'Cura e vida',n:'Pacto de sangue',ic:'🩸',d:'Troca Vida por Mana: perde 1d6 de Vida, ganha 2d4 de Mana.',
   uso:s=>({tipo:'utilidade',modo:'instantaneo',alvo:_M,formula:'2d4',alcance:'si',extras:[{rec:_V,formula:'-1d6',quem:'eu'}]})},
  {c:'Cura e vida',n:'Vigor ampliado',ic:'❤️',d:'Aumenta a Vida máxima, cada vez mais com o nível.',
   efs:s=>[_efRecF(s,_V,'Nível * 2')]},
  {c:'Cura e vida',n:'Regeneração',ic:'🌿',d:'Recupera um pouco de Vida ao usar, sem custo.',
   uso:s=>({tipo:'cura',modo:'instantaneo',custo:['0',_M],alvo:_V,formula:'1d6 + 1',alcance:'si',texto:'O corpo se recompõe devagar.'})},
  {c:'Defesa',n:'Escudo arcano',ic:'🛡️',d:'Uma barreira de energia: enquanto ligada, aumenta a Defesa.',
   efs:s=>[_rol('defesa',4)],uso:s=>({tipo:'buff',modo:'ativa',custo:['3',_M],alcance:'si'})},
  {c:'Defesa',n:'Pele de pedra',ic:'🪨',d:'Defesa maior e golpes físicos machucam menos.',
   efs:s=>[_rol('defesa',2),_res('Físico','reduz',2)]},
  {c:'Defesa',n:'Postura defensiva',ic:'🧱',d:'Enquanto ligada: +3 de defesa, mas ataca com −2.',
   efs:s=>[_rol('defesa',3),_rol('ataque',-2)],uso:s=>({tipo:'buff',modo:'ativa',custo:['0',_EST_NOMES],alcance:'si'})},
  {c:'Defesa',n:'Resistência ao fogo',ic:'🔥',d:'Chamas pouco machucam.',efs:s=>[_res('Fogo','reduz',5)]},
  {c:'Defesa',n:'Imunidade a veneno',ic:'☠️',d:'Nenhum veneno faz efeito.',efs:s=>[_res('Veneno','imune')]},
  {c:'Ataque',n:'Golpe poderoso',ic:'💥',d:'Troca precisão por força bruta: mais dano nos golpes.',efs:s=>[_rol('dano',2)]},
  {c:'Ataque',n:'Fúria',ic:'😡',d:'Enquanto ligada: mais dano e resistência física, gastando estamina ao ligar.',
   efs:s=>[_rol('dano',2),_res('Físico','reduz',3)],uso:s=>({tipo:'buff',modo:'ativa',custo:['2',_EST_NOMES],alcance:'si'})},
  {c:'Ataque',n:'Mira certeira',ic:'🎯',d:'Seus ataques acertam com mais facilidade.',efs:s=>[_rol('ataque',2)]},
  {c:'Ataque',n:'Bola de fogo',ic:'🔥',d:'Explosão em área: todos no círculo testam para sofrer metade.',
   uso:s=>({tipo:'dano',modo:'instantaneo',custo:['5',_M],formula:'6d6',tipoDano:'Fogo',alcance:'area',area:{forma:'circulo',tam:'6'},
     teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'},texto:'Uma esfera de chamas explode no ponto escolhido.'})},
  {c:'Ataque',n:'Raio de gelo',ic:'❄️',d:'Disparo único que fere e deixa o alvo lento.',
   uso:s=>({tipo:'dano',modo:'instantaneo',custo:['2',_M],formula:'2d8 + Nível',tipoDano:'Gelo',alcance:'distancia',area:{forma:'',tam:'18'},alvos:'1',
     cond:_C_LENTO,condEm:'alvo',duracao:'1 rodada',texto:'Um feixe gélido atinge o alvo.'})},
  {c:'Ataque',n:'Cone de chamas',ic:'🌋',d:'Leque de fogo à sua frente.',
   uso:s=>({tipo:'dano',modo:'instantaneo',custo:['3',_M],formula:'3d6',tipoDano:'Fogo',alcance:'area',area:{forma:'cone',tam:'5'},
     teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}})},
  {c:'Ataque',n:'Relâmpago em linha',ic:'⚡',d:'Uma linha de raios atravessa todos no caminho.',
   uso:s=>({tipo:'dano',modo:'instantaneo',custo:['4',_M],formula:'5d6',tipoDano:'Raio',alcance:'area',area:{forma:'linha',tam:'20'},
     teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}})},
  {c:'Ataque',n:'Drenar vida',ic:'🩸',d:'Rouba a vitalidade do alvo: ele perde, você ganha.',
   uso:s=>({tipo:'dano',modo:'instantaneo',custo:['3',_M],formula:'2d6',tipoDano:'Necrótico',alcance:'toque',extras:[{rec:_V,formula:'1d6',quem:'eu'}],texto:'Sombras sugam a força do alvo para você.'})},
  {c:'Ataque',n:'Ataque furtivo',ic:'🗡️',d:'Dano extra contra quem está desprevenido.',efs:s=>[_dad('dano',1)]},
  {c:'Poder e magia',n:'Mente afiada',ic:'🧠',d:'Mais Mana, crescendo com o nível.',efs:s=>[_efRecF(s,_M,'Nível * 2')]},
  {c:'Poder e magia',n:'Voo',ic:'🪽',d:'Enquanto ligada, o personagem voa.',efs:s=>[_cap('Voo',9)],uso:s=>({tipo:'buff',modo:'ativa',custo:['2',_M],alcance:'si'})},
  {c:'Poder e magia',n:'Visão no escuro',ic:'👁️',d:'Enxerga no escuro.',efs:s=>[_cap('Visão no escuro',18)]},
  {c:'Poder e magia',n:'Bênção',ic:'🙏',d:'Mais sorte e precisão em tudo.',efs:s=>[_rol('todos',1)],uso:s=>({tipo:'buff',modo:'ativa',custo:['2',_M],alcance:'area',area:{forma:'aura',tam:'9'},duracao:'1 minuto'})},
  {c:'Fortalecer e enfraquecer',n:'Aura de coragem',ic:'🦁',d:'Você (e aliados próximos) ficam Inspirados.',
   uso:s=>({tipo:'buff',modo:'instantaneo',custo:['2',_M],alcance:'area',area:{forma:'aura',tam:'6'},cond:['Inspirado','🦁','#3b82f6','+1 em ataques e testes.'],condEm:'eu',duracao:'1 minuto'})},
  {c:'Fortalecer e enfraquecer',n:'Velocidade',ic:'💨',d:'Enquanto ligada: mais movimento.',
   efs:s=>[_cap('Deslocamento extra',6)],uso:s=>({tipo:'buff',modo:'ativa',custo:['3',_M],alcance:'si',duracao:'1 minuto'})},
  {c:'Fortalecer e enfraquecer',n:'Lentidão',ic:'🐢',d:'Até 3 inimigos ficam Lentos se falharem no teste.',
   uso:s=>({tipo:'debuff',modo:'instantaneo',custo:['3',_M],alcance:'distancia',area:{forma:'',tam:'18'},alvos:'3',
     cond:_C_LENTO,condEm:'alvo',duracao:'1 minuto',teste:{attr:_atrNome(s,_VONTADE),cd:'10 + Nível',sucesso:'sem'}})},
  {c:'Fortalecer e enfraquecer',n:'Cegueira',ic:'🙈',d:'Rouba a visão do alvo.',
   uso:s=>({tipo:'debuff',modo:'instantaneo',custo:['2',_M],alcance:'distancia',area:{forma:'',tam:'9'},alvos:'1',
     cond:['Cego','🙈','#475569','Não enxerga; ataques contra ele ficam mais fáceis.'],condEm:'alvo',duracao:'1 rodada',
     teste:{attr:_atrNome(s,_FORTITUDE),cd:'10 + Nível',sucesso:'sem'}})},
  {c:'Fortalecer e enfraquecer',n:'Nuvem venenosa',ic:'☠️',d:'Área tóxica: dano e Envenenado para quem falhar.',
   uso:s=>({tipo:'debuff',modo:'instantaneo',custo:['4',_M],formula:'2d6',tipoDano:'Veneno',aplicaEm:'alvo',alcance:'area',area:{forma:'cubo',tam:'6'},
     cond:['Envenenado','🤢','#16a34a','Penalidade em testes enquanto durar.'],condEm:'alvo',duracao:'3 rodadas',
     teste:{attr:_atrNome(s,_FORTITUDE),cd:'10 + Nível',sucesso:'metade'}})},
  {c:'Invocações',n:'Lobo espiritual',ic:'🐺',d:'Um lobo de luz luta ao seu lado.',
   uso:s=>({tipo:'invocacao',modo:'instantaneo',custo:['3',_M],alcance:'distancia',area:{forma:'',tam:'9'},
     invoc:{nome:'Lobo espiritual',icone:'🐺',cor:'#38bdf8',estilo:'espirito',vida:'10 + Nível * 2',defesa:'13',ataque:'+4',dano:'1d6 + 2',mov:'12',qtd:'1',duracao:'1 minuto',desc:'Morde e derruba; obedece a você.'}})},
  {c:'Invocações',n:'Levantar mortos',ic:'💀',d:'Ergue esqueletos que obedecem enquanto a magia estiver ligada.',
   uso:s=>({tipo:'invocacao',modo:'ativa',custo:['5',_M],alcance:'toque',
     invoc:{nome:'Esqueleto',icone:'💀',cor:'#a3a3a3',estilo:'morto',vida:'8 + Nível',defesa:'12',ataque:'+3',dano:'1d6',mov:'9',qtd:'2',duracao:'enquanto ligada',desc:'Imune a veneno; frágil contra impacto.'}})},
  {c:'Invocações',n:'Elemental de fogo',ic:'🔥',d:'Uma criatura de chamas poderosa, mas cara.',
   uso:s=>({tipo:'invocacao',modo:'instantaneo',custo:['8',_M],alcance:'distancia',area:{forma:'',tam:'18'},
     invoc:{nome:'Elemental de fogo',icone:'🔥',cor:'#f97316',estilo:'elemental',vida:'25 + Nível * 3',defesa:'14',ataque:'+6',dano:'2d8 + 3',mov:'15',qtd:'1',duracao:'10 minutos',desc:'Quem o toca sofre 1d6 de fogo; imune a fogo.'}})},
  {c:'Invocações',n:'Familiar',ic:'🦉',d:'Um pequeno animal companheiro (espião e ajudante).',
   uso:s=>({tipo:'invocacao',modo:'ativa',custo:['1',_M],alcance:'si',
     invoc:{nome:'Coruja familiar',icone:'🦉',cor:'#a16207',estilo:'fera',vida:'4',defesa:'13',ataque:'',dano:'',mov:'18 (voo)',qtd:'1',duracao:'até dispensar',desc:'Você vê pelos olhos dela; ajuda em testes (+2).'}})},
  {c:'Invocações',n:'Golem de pedra',ic:'🗿',d:'Constructo resistente que protege você.',
   uso:s=>({tipo:'invocacao',modo:'instantaneo',custo:['6',_M],alcance:'toque',
     invoc:{nome:'Golem de pedra',icone:'🗿',cor:'#78716c',estilo:'constructo',vida:'30 + Nível * 2',defesa:'16',ataque:'+5',dano:'2d6 + 3',mov:'6',qtd:'1',duracao:'1 hora',desc:'Fica entre você e o perigo; lento, mas duro.'}})},
  {c:'Poder e magia',n:'Dom do atributo',ic:'💪',d:'+2 no primeiro atributo do sistema.',efs:s=>[_efAttr(s,[((s.attributes||[])[0]||{}).name||'Força'],2)]},
  {c:'Recursos especiais',n:'Reserva de poder',ic:'⚡',d:'Cria uma barra de 3 cargas que recarrega no descanso longo.',
   efs:s=>[_fx({kind:'recursoNovo',text:'Cargas',value:3,icon:'⚡',recarga:'longo',color:'#f59e0b'})]},
  {c:'Recursos especiais',n:'Fúria acumulada',ic:'🔥',d:'Uma barra de Fúria que cresce com o nível (código: tudo em uma linha).',
   efs:s=>[_fx({kind:'codigo',text:'Fúria acumulada',code:'// Barra de Fúria: 2 + 1 a cada 3 níveis\nfx.novoRecurso("Fúria", 2 + Math.floor(fx.nivel / 3), { icone: "🔥", cor: "#ef4444", recarga: "curto" });'})]},
  {c:'Recursos especiais',n:'Poder que escala (código)',ic:'⌨️',d:'Exemplo de efeito por código que cresce com o nível.',
   efs:s=>[_fx({kind:'codigo',text:'Poder que escala',code:CODIGO_EXEMPLO})]},
];
/* nome real do atributo do sistema (primeiro que existir) — '' se nenhum, e o teste fica opcional */
function _atrNome(sys,nomes){ const a=nomes.map(n=>_acha(sys.attributes||[],n)).find(Boolean); return a?a.name:''; }
/* acha a condição pelo nome ou cria uma simples (nome, ícone, cor, descrição) para o modelo poder aplicá-la */
function _garanteCond(sys,[n,ic,cor,desc]){
  if(!Array.isArray(sys.conditions)) sys.conditions=[];
  const ja=_acha(sys.conditions,n); if(ja) return ja.id;
  const c={id:uid(),name:n,icon:ic,color:cor,description:desc||'',noStack:true,niveis:0,componentes:[],effects:[]};
  sys.conditions.push(c); return c.id;
}
function modeloEmHab(sys,m,nivel){
  const ab={id:uid(),name:m.n,description:m.d||'',icon:m.ic||'',req:{level:nivel||0,attrs:[]},effects:(m.efs?m.efs(sys):[]).filter(Boolean).map(_ef)};
  sanitizarUsoHab(ab);
  if(m.uso){
    const u=m.uso(sys); const cr=u.custo?_recPor(sys,Array.isArray(u.custo[1])?u.custo[1]:[u.custo[1]]):null;
    const al=u.alvo?_recPor(sys,Array.isArray(u.alvo)?u.alvo:[u.alvo]):null;
    const emAlvo=u.aplicaEm==='alvo'||u.tipo==='dano';
    Object.assign(ab.uso,{on:true,modo:u.modo||'instantaneo',custoId:cr?cr.id:'',custo:cr?u.custo[0]:'',alvoId:al?al.id:'',
      formula:(al||emAlvo)?(u.formula||''):'',texto:u.texto||'',tipo:u.tipo||'',aplicaEm:u.aplicaEm||(emAlvo?'alvo':''),
      alcance:u.alcance||'',alvos:u.alvos||'',tipoDano:u.tipoDano||'',duracao:u.duracao||'',condEm:u.condEm||'alvo',
      area:Object.assign({forma:'',tam:''},u.area||{}),teste:Object.assign({attr:'',cd:'',sucesso:'metade'},u.teste||{}),
      invoc:u.invoc?Object.assign({},u.invoc):null,
      extras:(u.extras||[]).map(x=>{ const r=_recPor(sys,x.rec); return r?{id:uid(),resId:r.id,formula:x.formula,quem:x.quem||'eu'}:null; }).filter(Boolean)});
    if(u.cond) ab.uso.condId=_garanteCond(sys,u.cond);
    /* regras de magia (conjuracao.js) */
    ['execucao','concentracao','ritual','componentes','circulo','escola','repete'].forEach(k=>{ if(u[k]!=null) ab.uso[k]=u[k]; });
    if(u.ataque) ab.uso.ataque={on:true,bonus:String(u.ataque)};
    if(u.aumenta) ab.uso.aumenta=Object.assign({formula:'',custo:'',max:''},u.aumenta);
    sanitizarUsoHab(ab);
  }
  return ab;
}
/* select agrupado + chips das mais comuns; adiciona a técnica pronta na lista */
function modelosTecnica(sys,arr,nivel,aoAdicionar){
  const add=m=>{ const ab=modeloEmHab(sys,m,nivel); arr.push(ab); S.ui.open[ab.id]=true; if(aoAdicionar) aoAdicionar(ab); render(); };
  const sel=h('select',{class:'in rec-sel','aria-label':'Criar a partir de um modelo pronto',style:{maxWidth:'260px'},onchange:e=>{ const m=MODELOS_TECNICA[+e.target.value]; if(m) add(m); }},
    h('option',{value:''},'✨ Criar a partir de um modelo…'));
  [...new Set(MODELOS_TECNICA.map(m=>m.c))].forEach(c=>{ const g=h('optgroup',{label:c});
    MODELOS_TECNICA.forEach((m,i)=>{ if(m.c===c) g.appendChild(h('option',{value:String(i)},m.ic+' '+m.n)); }); sel.appendChild(g); });
  return {sel,add};
}
function modelosRapidos(sys,arr,nivel,titulo){
  const {sel,add}=modelosTecnica(sys,arr,nivel);
  const top=['Cura','Bola de fogo','Raio de gelo','Escudo arcano','Lentidão','Lobo espiritual','Drenar vida','Fúria','Voo','Reserva de poder'].map(n=>MODELOS_TECNICA.find(m=>m.n===n)).filter(Boolean);
  return h('div',{class:'modelos'},
    titulo?h('div',{class:'fx-grp'},titulo):null,
    h('div',{class:'row wrapf'},...top.map(m=>h('button',{type:'button',class:'chip',title:m.d,onclick:()=>add(m)},m.ic+' '+m.n)),sel));
}

/* ---------- tipos de técnica/magia ----------
   O TIPO decide a cor/ícone do cartão na ficha e quais campos aparecem no editor:
     cura (verde) · dano (vermelho, alvo/área + teste) · buff (azul, liga/desliga ou condição em mim/aliado)
     debuff (roxo, condição no inimigo + teste) · invocação (âmbar, cria um cartão de criatura) · utilidade (cinza) */
const TIPOS_USO=[
  {k:'cura',ic:'💚',n:'Cura',cor:'#22c55e',d:'Devolve Vida (ou outro recurso) a você ou a um aliado.'},
  {k:'dano',ic:'🔥',n:'Ataque / dano',cor:'#ef4444',d:'Dispara contra um alvo ou explode em área; pode pedir teste de resistência.'},
  {k:'buff',ic:'🛡️',n:'Fortalecer (buff)',cor:'#3b82f6',d:'Melhora você ou aliados: liga/desliga, condição boa ou recurso extra.'},
  {k:'debuff',ic:'🌀',n:'Enfraquecer (debuff)',cor:'#a855f7',d:'Aplica uma condição ruim no inimigo (lento, cego, envenenado…).'},
  {k:'invocacao',ic:'🐺',n:'Invocação',cor:'#f59e0b',d:'Chama uma criatura com ficha própria (vida, defesa, ataque) que aparece estilizada na ficha.'},
  {k:'utilidade',ic:'✨',n:'Utilidade',cor:'#64748b',d:'Luz, teleporte, ilusão, recurso… efeito livre com texto.'},
];
const ALCANCES=[['si','Em si mesmo'],['toque','Toque'],['distancia','À distância'],['area','Área']];
const FORMAS_AREA=[['circulo','⭕ Círculo / explosão'],['cone','🔺 Cone'],['linha','➖ Linha'],['cubo','⬛ Cubo'],['aura','🌐 Aura em volta']];
const ESTILOS_INVOC=[['fera','🐾 Fera'],['espirito','👻 Espírito'],['morto','💀 Morto-vivo'],['elemental','🔥 Elemental'],['constructo','⚙️ Constructo'],['divino','✨ Celestial'],['demonio','😈 Demoníaco']];
function usoTipo(us){
  if(!us) return 'utilidade';
  if(TIPOS_USO.some(t=>t.k===us.tipo)) return us.tipo;
  if(us.invoc) return 'invocacao';
  if(us.modo==='ativa') return 'buff';
  if(/^\s*-/.test(us.formula||'')) return 'dano';
  if(us.alvoId&&String(us.formula||'').trim()) return 'cura';
  return 'utilidade';
}
const tipoInfo=k=>TIPOS_USO.find(t=>t.k===k)||TIPOS_USO[TIPOS_USO.length-1];
/* onde a fórmula principal cai: dano vai no alvo; cura/utilidade em mim (fichas antigas = em mim) */
function usoAplicaEm(us){ if(us.aplicaEm==='eu'||us.aplicaEm==='alvo') return us.aplicaEm; return usoTipo(us)==='dano'?'alvo':'eu'; }
function _nomeRec(sys,id){ const r=(sys.resources||[]).find(x=>x.id===id); return r?r.name:''; }
function _cond(sys,id){ return id?((sys.conditions||[]).find(c=>c.id===id)||null):null; }
const _formaNome=f=>(((FORMAS_AREA.find(x=>x[0]===f)||[])[1])||'Área');

/* ---------- editor de USO (dentro do cartão) ---------- */
function usoHabResumo(sys,ab){
  const us=ab.uso||{}; if(!us.on) return '';
  const tp=tipoInfo(usoTipo(us));
  const rc=(sys.resources||[]).find(r=>r.id===us.custoId), ra=(sys.resources||[]).find(r=>r.id===us.alvoId);
  const p=[tp.n+(us.modo==='ativa'?' (liga/desliga)':'')];
  if(rc&&String(us.custo||'').trim()&&String(us.custo).trim()!=='0') p.push('custa '+String(us.custo).trim()+' '+rc.name);
  const ar=us.area||{};
  if(us.alcance==='area'&&ar.forma) p.push(_formaNome(ar.forma).replace(/^\S+\s/,'').toLowerCase()+(ar.tam?(' de '+ar.tam+'m'):''));
  else if(us.alcance) p.push(((ALCANCES.find(a=>a[0]===us.alcance)||[])[1]||'').toLowerCase()+(us.alcance==='distancia'&&ar.tam?(' '+ar.tam+'m'):''));
  if(String(us.formula||'').trim()&&us.modo!=='ativa'){
    const f=String(us.formula).trim(), tipo=usoTipo(us);
    if(usoAplicaEm(us)==='alvo') p.push((tipo==='cura'?'cura '+f:f.replace(/^-\s*/,'')+' de dano'+(us.tipoDano?(' ('+us.tipoDano+')'):''))+' no alvo');
    else if(ra) p.push(ra.name+' '+(/^\s*-/.test(f)?'':'+')+f);
  }
  (us.extras||[]).filter(x=>x.resId&&String(x.formula||'').trim()).forEach(x=>p.push((x.quem==='alvo'?'alvo: ':'')+_nomeRec(sys,x.resId)+' '+(/^\s*-/.test(x.formula)?'':'+')+String(x.formula).trim()));
  const c=_cond(sys,us.condId); if(c) p.push((us.condEm==='eu'?'você fica ':'alvo fica ')+c.name);
  const te=us.teste||{};
  if(te.attr) p.push('teste de '+te.attr+(te.cd?(' CD '+te.cd):'')+(te.sucesso==='nada'?' (anula)':te.sucesso==='sem'?'':' (metade)'));
  if(us.invoc) p.push('invoca '+(String(us.invoc.qtd||'1').trim()!=='1'?(us.invoc.qtd+'× '):'')+us.invoc.nome);
  if(us.duracao) p.push('dura '+us.duracao);
  if(us.usos&&String(us.usos.max||'').trim()) p.push(us.usos.max+'× por '+(((typeof USOS_RECARGA!=='undefined'?USOS_RECARGA:[]).find(x=>x[0]===us.usos.recarga)||[])[1]||'descanso'));
  return p.join(' · ');
}
function usoHabEditor(sys,ab){
  sanitizarUsoHab(ab); const us=ab.uso;
  const tipo=usoTipo(us), tp=tipoInfo(tipo);
  const resSel=(obj,chave,vazio,w)=>{ const s=h('select',{class:'in',style:{maxWidth:w||'200px'},'aria-label':vazio,onchange:e=>{obj[chave]=e.target.value;render();}});
    s.appendChild(h('option',{value:''},vazio));
    (sys.resources||[]).filter(r=>(r.type||'barra')!=='valor').forEach(r=>{const o=h('option',{value:r.id},r.name);if(r.id===obj[chave])o.selected=true;s.appendChild(o);}); return s; };
  const selLista=(obj,chave,lista,vazio)=>{ const s=h('select',{class:'in','aria-label':vazio||chave,onchange:e=>{obj[chave]=e.target.value;render();}});
    if(vazio!=null) s.appendChild(h('option',{value:''},vazio));
    lista.forEach(([v,t])=>{ const o=h('option',{value:v},t); if(v===obj[chave]) o.selected=true; s.appendChild(o); }); return s; };
  const txt=(obj,chave,ph,cls)=>h('input',{class:'in'+(cls?' '+cls:''),value:obj[chave]||'',placeholder:ph||'',spellcheck:'false',oninput:e=>{obj[chave]=e.target.value;persist();},onchange:()=>render()});
  const modoBtn=(v,rot,tit)=>h('button',{type:'button',class:'btn sm '+(us.modo===v?'emerald':'ghost'),title:tit,'aria-pressed':us.modo===v?'true':'false',onclick:()=>{us.modo=v;render();}},(us.modo===v?'✓ ':'')+rot);
  const media=f=>{ if(!String(f||'').trim()) return '';
    const v=mediaExpr(f,varsNoDegrau(sys,Math.max(1,sys.maxLevel||1))); return Number.isNaN(v)?'⚠ fórmula inválida (ex.: 2d8 + 4, 5, Nível * 2)':('Média ≈ '+(Math.round(Math.abs(v)*10)/10)+' no '+levelLabel(sys,Math.max(1,sys.maxLevel||1))+'.'); };
  const escolheTipo=k=>{ us.tipo=k;
    if(k==='dano'){ if(!us.alcance) us.alcance='distancia'; us.aplicaEm='alvo'; us.formula=String(us.formula||'').replace(/^\s*-\s*/,''); }
    if(k==='cura'){ if(!us.aplicaEm) us.aplicaEm='eu'; if(!us.alvoId){ const v=_recPor(sys,_V); if(v) us.alvoId=v.id; } }
    if(k==='debuff'&&!us.alcance) us.alcance='distancia';
    if(k==='buff'&&!us.alcance) us.alcance='si';
    if(k==='invocacao'&&!us.invoc) us.invoc={nome:'Lobo espiritual',icone:'🐺',cor:'#f59e0b',vida:'10 + Nível * 2',defesa:'12',ataque:'+4',dano:'1d6 + 2',mov:'12',qtd:'1',duracao:'1 minuto',desc:'Obedece às suas ordens.',estilo:'fera'};
    if(k!=='invocacao') us.invoc=null;
    render(); };
  const tipos=h('div',{class:'uso-tipos',role:'radiogroup','aria-label':'Tipo da técnica'},
    ...TIPOS_USO.map(t=>h('button',{type:'button',role:'radio','aria-checked':tipo===t.k?'true':'false',title:t.d,
      class:'uso-tipo'+(tipo===t.k?' on':''),style:{'--tc':t.cor},onclick:()=>escolheTipo(t.k)},h('span',{class:'uso-tipo-ic'},t.ic),h('span',{},t.n))));
  const sec=(tit,...f)=>h('div',{class:'uso-sec'},h('div',{class:'uso-sec-t'},tit),...f);

  /* ALCANCE / ÁREA */
  const secAlcance=sec('🎯 Alcance e alvo',
    h('div',{class:'grid g3'},
      field('Alcance',selLista(us,'alcance',ALCANCES,'—')),
      us.alcance==='area'?field('Forma da área',selLista(us.area,'forma',FORMAS_AREA,'—')):field('Distância (m, opcional)',txt(us.area,'tam','18')),
      us.alcance==='area'?field('Tamanho (m)',txt(us.area,'tam','6')):field('Quantos alvos',selLista(us,'alvos',[['1','1 alvo'],['2','2 alvos'],['3','3 alvos'],['todos','Todos que vê']],'—'))),
    us.alcance==='area'&&us.area.forma?areaDesenho(us.area,tp.cor):null);

  /* TESTE DE RESISTÊNCIA */
  const atrs=(sys.attributes||[]).map(a=>[a.name,a.name]);
  const secTeste=sec('🎲 Teste de resistência do alvo (opcional)',
    h('div',{class:'grid g3'},
      field('Atributo do teste',selLista(us.teste,'attr',atrs,'— sem teste —')),
      us.teste.attr?field('Dificuldade (fórmula)',txt(us.teste,'cd','10 + Nível','mono')):h('span'),
      us.teste.attr?field('Se o alvo passar',selLista(us.teste,'sucesso',[['metade','Sofre metade'],['nada','Nada acontece'],['sem','Só evita a condição']])):h('span')));

  /* EFEITO PRINCIPAL (fórmula) */
  const aplicaEm=usoAplicaEm(us);
  const secFormula=(rotulo,ph)=>sec(rotulo,
    h('div',{class:'row wrapf',style:{marginBottom:'8px'}},
      h('button',{type:'button',class:'btn sm '+(aplicaEm==='eu'?'emerald':'ghost'),onclick:()=>{us.aplicaEm='eu';render();}},(aplicaEm==='eu'?'✓ ':'')+'Em mim (mexe na minha ficha)'),
      h('button',{type:'button',class:'btn sm '+(aplicaEm==='alvo'?'emerald':'ghost'),onclick:()=>{us.aplicaEm='alvo';render();}},(aplicaEm==='alvo'?'✓ ':'')+'No alvo (rola e mostra o resultado)')),
    h('div',{class:'grid g2'},
      aplicaEm==='eu'?field('Qual recurso meu',resSel(us,'alvoId','— nenhum (só texto) —')):field('Tipo de dano / energia',(()=>{ const i=txt(us,'tipoDano',tipo==='cura'?'Luz, Natureza…':'Fogo, Gelo, Raio… (suas tags aparecem aqui)'); i.setAttribute('list','dl-tags'); return i; })()),
      field(aplicaEm==='alvo'?(tipo==='cura'?'Cura (dados)':'Dano (dados)'):'Quanto (aceita dados; negativo = perde)',txt(us,'formula',ph,'mono'))),
    h('div',{class:'hint',style:{marginTop:'4px'}},media(us.formula)||'Sem fórmula: só mostra o texto ao usar.'));

  /* OUTROS RECURSOS (drenar vida, gastar sanidade, dar mana a um aliado…) */
  const secExtras=sec('🔗 Mexe em outros recursos também',
    h('div',{class:'hint',style:{marginBottom:'6px'}},'Ex.: Drenar vida = alvo perde 2d6 e você ganha 1d6 de Vida; magia proibida = −1d4 de Sanidade em você.'),
    ...us.extras.map(x=>h('div',{class:'row wrapf uso-extra'},
      selLista(x,'quem',[['eu','Em mim'],['alvo','No alvo']]),
      resSel(x,'resId','— recurso —','170px'),
      h('input',{class:'in mono',style:{maxWidth:'160px'},'aria-label':'Quanto',value:x.formula||'',placeholder:'1d6  ou  -2',spellcheck:'false',oninput:e=>{x.formula=e.target.value;persist();},onchange:()=>render()}),
      h('button',{type:'button',class:'btn mini danger','aria-label':'Remover',onclick:()=>{us.extras=us.extras.filter(y=>y!==x);render();}},'✕'))),
    h('button',{type:'button',class:'btn sm ghost',onclick:()=>{us.extras.push({id:uid(),resId:'',formula:'',quem:'eu'});render();}},'+ Recurso'));

  /* CONDIÇÃO (buff/debuff) */
  const conds=(sys.conditions||[]).map(c=>[c.id,(c.icon||'⚠')+' '+c.name]);
  const secCond=sec(tipo==='debuff'?'🌀 Condição que aplica no inimigo':'✨ Condição e duração',
    conds.length?h('div',{class:'grid g3'},
      field('Condição',selLista(us,'condId',conds,'— nenhuma —')),
      us.condId?field('Em quem',selLista(us,'condEm',[['alvo','No alvo'],['eu','Em mim']])):h('span'),
      field('Duração',txt(us,'duracao','3 rodadas, 1 minuto, cena…')))
    :h('div',{},h('div',{class:'hint'},'Crie condições na aba 🩸 Condições (Lento, Atordoado, Abençoado…) para poder aplicá-las aqui.'),
      h('div',{style:{marginTop:'6px',maxWidth:'260px'}},field('Duração',txt(us,'duracao','3 rodadas, 1 minuto, cena…')))),
    (us.condId&&us.condEm==='eu')?h('div',{class:'hint',style:{marginTop:'4px'}},'Ao usar, a condição liga sozinha na ficha (sai ao desligar a técnica ou pelo bloco Condições).'):null);

  let corpoTipo;
  if(tipo==='cura') corpoTipo=[secAlcance,secFormula('💚 Quanto cura','2d8 + Nível'),secExtras,secCond];
  else if(tipo==='dano') corpoTipo=[secAlcance,secFormula('🔥 Dano','6d6'),secTeste,secCond,secExtras];
  else if(tipo==='buff') corpoTipo=[secAlcance,secCond,us.modo==='ativa'?null:secFormula('⬆ Ganho imediato (opcional)','1d6'),secExtras];
  else if(tipo==='debuff') corpoTipo=[secAlcance,secCond,secTeste,secFormula('Dano junto (opcional)','1d4'),secExtras];
  else if(tipo==='invocacao') corpoTipo=[us.invoc?invocEditor(sys,us):null,secAlcance,secExtras];
  else corpoTipo=[secAlcance,secFormula('Efeito em recurso (opcional)',''),secExtras,secCond];

  /* layout em passos numerados (esquerda) + prévia do cartão e frase (direita, fixa) */
  const passo=(n,tit,...f)=>h('div',{class:'uso-passo'},h('div',{class:'uso-passo-t'},h('span',{class:'uso-n'},String(n)),tit),...f);
  const custoTxt=(()=>{ const r=(sys.resources||[]).find(x=>x.id===us.custoId); return r&&String(us.custo||'').trim()?(us.custo+' '+r.name):'grátis'; })();
  return h('div',{class:'req-box uso-hab uso2',style:{'--tc':tp.cor}},
    h('div',{class:'row wrapf'},
      h('button',{type:'button',class:'btn sm '+(us.on?'emerald':'ghost'),'aria-pressed':us.on?'true':'false',onclick:()=>{us.on=!us.on;render();}},(us.on?'✓ ':'')+'Tem um botão na ficha'),
      h('span',{class:'hint'},us.on?'O jogador clica para usar: paga o custo, rola e aplica.':'Ligue para magias, ataques especiais, curas, buffs, debuffs ou invocações.'),
      (typeof usoBlocos==='function')?h('button',{type:'button',class:'btn sm ghost',onclick:()=>{S.ui.usoDetalhado=false;us.blocos=null;render();}},'🧱 Voltar ao editor em blocos'):null),
    us.on?h('div',{class:'uso2-grid'},
      h('div',{class:'uso2-passos'},
        passo(1,'Que tipo é?',tipos,h('div',{class:'hint',style:{marginTop:'4px'}},tp.d)),
        passo(2,'O que ela faz',...corpoTipo.filter(Boolean)),
        passo(3,'Custo e duração',
          h('div',{class:'row wrapf'},modoBtn('instantaneo','✨ Usa e pronto','Clica em Usar: paga o custo e aplica o efeito uma vez'),
            modoBtn('ativa','⏻ Liga / desliga','Os efeitos do cartão (e a invocação/condição em mim) só valem enquanto estiver ligada; ligar paga o custo')),
          h('div',{class:'grid g2',style:{marginTop:'10px'}},
            field('Paga com',resSel(us,'custoId','— grátis —')),
            field('Quanto (fórmula)',us.custoId?campoFormula(sys,us,'custo',{tipo:'custo',placeholder:'3',aoMudar:()=>render()}):h('div',{class:'hint'},'Escolha o recurso (ex.: Mana).'))),
          us.modo==='ativa'?h('div',{class:'hint',style:{marginTop:'6px'}},'Ligada: aplica os efeitos “⚙️ Sempre ativo” do cartão'+(tipo==='invocacao'?' e a criatura aparece':'')+'. O custo é pago ao ligar.'):null),
        (typeof conjuracaoEditor==='function')?passo(4,'Regras de magia (opcional)',conjuracaoEditor(sys,ab)):null,
        passo(5,'Texto ao usar (opcional)',h('input',{class:'in',value:us.texto||'',placeholder:'Ex.: Uma luz suave fecha os ferimentos.',oninput:e=>{us.texto=e.target.value;persist();}}))),
      h('div',{class:'uso2-prev'},
        h('div',{class:'uso-sec-t'},'👁 Como aparece na ficha'),cartaoTecnica(sys,null,null,ab,{prev:true}),
        h('div',{class:'uso2-frase'},h('b',{},'Em resumo: '),usoHabResumo(sys,ab)||'—'),
        h('div',{class:'hint'},'Custo: '+custoTxt+(us.modo==='ativa'?' · liga/desliga':''))),
      typeof datalistTags==='function'?datalistTags(sys,'dl-tags'):null)
    :null);
}
/* desenho pequeno da área (círculo, cone, linha…) para o mestre ver o formato */
function areaDesenho(area,cor){
  const f=area.forma, ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg'); svg.setAttribute('viewBox','0 0 120 70'); svg.setAttribute('class','area-svg'); svg.setAttribute('aria-hidden','true');
  const el=(t,a)=>{ const e=document.createElementNS(ns,t); Object.entries(a).forEach(([k,v])=>e.setAttribute(k,v)); svg.appendChild(e); return e; };
  const st={fill:cor,'fill-opacity':'.28',stroke:cor,'stroke-width':'2'};
  if(f==='circulo') el('circle',Object.assign({cx:80,cy:35,r:28},st));
  else if(f==='cone') el('path',Object.assign({d:'M14 35 L104 8 L104 62 Z'},st));
  else if(f==='linha') el('rect',Object.assign({x:14,y:29,width:96,height:12,rx:3},st));
  else if(f==='cubo') el('rect',Object.assign({x:52,y:8,width:54,height:54,rx:3},st));
  else if(f==='aura') el('circle',Object.assign({cx:60,cy:35,r:30},st));
  el('circle',{cx:f==='aura'?60:14,cy:35,r:5,fill:'currentColor'});
  return h('div',{class:'area-box'},svg,h('span',{class:'hint'},'● = quem lança'+(area.tam?(' · '+area.tam+'m'):'')));
}
/* editor da criatura invocada (com prévia do cartão) */
function invocEditor(sys,us){
  const iv=us.invoc;
  const t=(k,ph,cls)=>h('input',{class:'in'+(cls?' '+cls:''),value:iv[k]||'',placeholder:ph,spellcheck:'false',oninput:e=>{iv[k]=e.target.value;persist();},onchange:()=>render()});
  const estilo=h('div',{class:'row wrapf'},...ESTILOS_INVOC.map(([k,n])=>h('button',{type:'button',class:'chip'+(iv.estilo===k?' on':''),'aria-pressed':iv.estilo===k?'true':'false',onclick:()=>{iv.estilo=k;render();}},n)));
  const prev=invocInstancia(sys,null,us,{varsTotal:varsNoDegrau(sys,Math.max(1,sys.maxLevel||1))},0);
  return h('div',{class:'uso-sec'},h('div',{class:'uso-sec-t'},'🐺 Criatura invocada'),
    h('div',{class:'invoc-ed'},
      h('div',{},
        h('div',{class:'row wrapf',style:{alignItems:'flex-end'}},
          field('Ícone',iconePicker(iv.icone,v=>{iv.icone=v;render();})),
          field('Cor',h('input',{type:'color',class:'in',style:{width:'52px',padding:'2px'},'aria-label':'Cor da criatura',value:iv.cor||'#f59e0b',oninput:e=>{iv.cor=e.target.value;persist();},onchange:()=>render()})),
          h('div',{style:{flex:'1',minWidth:'150px'}},field('Nome',t('nome','Lobo espiritual')))),
        h('div',{class:'uso-sec-t',style:{marginTop:'8px'}},'Estilo do cartão'),estilo,
        h('div',{class:'grid g3',style:{marginTop:'8px'}},
          field('Vida (fórmula)',t('vida','10 + Nível * 2','mono')),field('Defesa',t('defesa','12','mono')),field('Quantas',t('qtd','1','mono')),
          field('Ataque (bônus)',t('ataque','+4','mono')),field('Dano',t('dano','1d6 + 2','mono')),field('Movimento (m)',t('mov','12','mono'))),
        h('div',{class:'grid g2',style:{marginTop:'6px'}},field('Duração',t('duracao','1 minuto, até dispensar…')),field('Descrição / poderes',t('desc','Morde e derruba; obedece a você.')))),
      h('div',{},h('div',{class:'uso-sec-t'},'Prévia ('+levelLabel(sys,Math.max(1,sys.maxLevel||1))+')'),cartaoInvocacao(sys,null,prev,{prev:true}))));
}
function _avalia(f,vars,padrao){ const s=String(f==null?'':f).trim(); if(!s) return padrao; const v=evalFormula(s,vars); return Number.isNaN(v)?padrao:Math.round(v); }
function invocInstancia(sys,ab,us,ctx,n){
  const iv=us.invoc, vida=Math.max(1,_avalia(iv.vida,ctx.varsTotal,10));
  return {iid:uid(),abId:ab?ab.id:'',nome:(iv.nome||'Criatura')+(n?(' '+n):''),icone:iv.icone||'🐺',cor:iv.cor||'#f59e0b',estilo:iv.estilo||'fera',
    vida, vidaMax:vida, defesa:_avalia(iv.defesa,ctx.varsTotal,10), ataque:String(iv.ataque||''), dano:String(iv.dano||''), mov:String(iv.mov||''),
    duracao:iv.duracao||'', desc:iv.desc||''};
}
/* cartão estilizado da criatura (ficha e prévia) */
function cartaoInvocacao(sys,d,v,o){
  o=o||{}; const pct=v.vidaMax>0?Math.max(0,Math.min(100,v.vida/v.vidaMax*100)):0;
  const mexe=dt=>{ v.vida=Math.max(0,Math.min(v.vidaMax,v.vida+dt)); render(); };
  const atk=()=>{ const a=String(v.ataque||'0').trim(); const ra=rollExpr('1d20 '+(/^[+-]/.test(a)?a:('+ '+a)),{}), rd=v.dano?rollExpr(v.dano,{}):null;
    showToast(v.icone+' '+v.nome+' ataca: '+(ra.erro?'?':ra.total)+' para acertar'+(rd&&!rd.erro?(' · '+rd.total+' de dano'):''),3500); };
  const est=((ESTILOS_INVOC.find(e=>e[0]===v.estilo)||[,''])[1]).replace(/^\S+\s/,'');
  const vivo=d&&!o.prev;
  return h('div',{class:'invoc-card est-'+(v.estilo||'fera')+(v.vida<=0?' caida':''),style:{'--ic':v.cor}},
    h('div',{class:'invoc-top'},
      h('div',{class:'invoc-ava','aria-hidden':'true'},v.icone),
      h('div',{class:'invoc-id'},h('b',{},v.nome),h('small',{},est+(v.duracao?(' · ⏳ '+v.duracao):''))),
      vivo?h('button',{type:'button',class:'btn mini ghost',title:'Dispensar a criatura','aria-label':'Dispensar '+v.nome,
        onclick:()=>{ d.invocacoes=d.invocacoes.filter(x=>x!==v); render(); showToast(v.nome+' foi dispensado.'); }},'✕'):null),
    h('div',{class:'invoc-hp',title:'Vida'},h('div',{class:'invoc-hp-f',style:{width:pct+'%'}}),h('span',{},'❤ '+v.vida+' / '+v.vidaMax)),
    h('div',{class:'invoc-stats'},
      h('span',{title:'Defesa'},'🛡 '+v.defesa),v.ataque?h('span',{title:'Ataque'},'⚔ '+v.ataque):null,v.dano?h('span',{title:'Dano'},'💥 '+v.dano):null,v.mov?h('span',{title:'Movimento'},'🦶 '+v.mov+'m'):null),
    v.desc?h('div',{class:'invoc-desc'},v.desc):null,
    vivo?h('div',{class:'row wrapf invoc-acoes'},
      h('button',{type:'button',class:'btn mini',onclick:atk},'🎲 Atacar'),
      h('button',{type:'button',class:'btn mini',onclick:()=>mexe(-5),'aria-label':'Perder 5 de vida'},'−5'),
      h('button',{type:'button',class:'btn mini',onclick:()=>mexe(-1),'aria-label':'Perder 1 de vida'},'−1'),
      h('button',{type:'button',class:'btn mini',onclick:()=>mexe(1),'aria-label':'Curar 1'},'+1'),
      h('button',{type:'button',class:'btn mini',onclick:()=>mexe(5),'aria-label':'Curar 5'},'+5')):null);
}
/* criaturas ativas (aparece em cima das habilidades na ficha) */
function invocacoesInner(sys,d){
  const l=(d&&d.invocacoes)||[]; if(!l.length) return null;
  return h('div',{class:'invoc-lista'},h('div',{class:'uso-sec-t'},'🐾 Invocações ativas ('+l.length+')'),h('div',{class:'invoc-grid'},...l.map(v=>cartaoInvocacao(sys,d,v))));
}

/* ---------- usar / ligar na ficha ---------- */
function _custoDe(ctx,us,extra){
  const r=us.custoId?ctx.allRes.find(x=>x.id===us.custoId):null;
  let custo=0;
  if(r&&String(us.custo||'').trim()){ const c=evalFormula(us.custo,ctx.varsTotal); custo=Number.isNaN(c)?0:Math.max(0,Math.round(c)); }
  if(r&&extra&&typeof custoAumento==='function') custo+=custoAumento(us,ctx.varsTotal,extra);
  return {r,custo};
}
function _aplicaRec(ctx,d,cur,resId,valor){
  const r=ctx.allRes.find(x=>x.id===resId); if(!r) return null;
  const teto=Number.isNaN(r.max)?Infinity:r.max, antes=cur[r.id];
  const novo=Math.max(0,Math.min(teto,antes+valor)); cur[r.id]=novo; d.resCurrent[r.id]=novo;
  return r.name+' '+sign(valor)+' ('+antes+' → '+novo+')';
}
/* condição em mim ligada pela técnica (via:'tecnica' para desligar só a que a técnica ligou) */
function _ligaCondEu(d,condId,on){
  if(!condId) return;
  if(!Array.isArray(d.conditions)) d.conditions=[];
  const tem=d.conditions.some(x=>x.condId===condId);
  if(on&&!tem) d.conditions.push({cid:uid(),condId,nivel:1,via:'tecnica'});
  if(!on) d.conditions=d.conditions.filter(x=>!(x.condId===condId&&x.via==='tecnica'));
}
function _invoca(sys,d,ctx,ab){
  const us=ab.uso, q=Math.max(1,Math.min(12,_avalia(us.invoc.qtd,ctx.varsTotal,1)));
  for(let i=0;i<q;i++) d.invocacoes.push(invocInstancia(sys,ab,us,ctx,q>1?(i+1):0));
  return q;
}
function usarHabilidade(sys,d,ctx,ab,opt){
  const us=ab.uso; if(!us||!us.on) return;
  opt=opt||{}; const extra=opt.extra||0;
  /* usos limitados: ferramentas, 1× por descanso… (poderes.js) */
  const lim=typeof usosRestantes==='function'&&!(us.modo==='ativa'&&(d.ativas||{})[ab.id])?usosRestantes(d,ab,ctx.varsTotal):Infinity;
  if(lim<=0) return showToast('“'+ab.name+'” sem usos: volta no '+(((USOS_RECARGA.find(x=>x[0]===us.usos.recarga)||[])[1])||'descanso')+'.');
  const gasta=()=>{ if(lim!==Infinity) gastarUso(d,ab); };
  const tipo=usoTipo(us), tp=tipoInfo(tipo);
  if(!Array.isArray(d.invocacoes)) d.invocacoes=[];
  const {r:rc,custo}=_custoDe(ctx,us,extra);
  const conj=[];   /* avisos de execução/concentração (conjuracao.js) */
  const preparaConj=()=>{
    if(typeof gastaExecucao==='function'){ const t=gastaExecucao(sys,d,us.execucao); if(t) conj.push(t); }
    if(us.concentracao&&typeof encerrarConcentracao==='function'){
      if(d.concentrando&&d.concentrando.abId!==ab.id){ const t=encerrarConcentracao(sys,d); if(t) conj.push(t); }
      d.concentrando={abId:ab.id,nome:ab.name}; conj.push('🧠 Concentrando em '+ab.name); }
  };
  if(us.modo==='ativa'){
    if(!d.ativas) d.ativas={};
    if(d.ativas[ab.id]){ delete d.ativas[ab.id];
      if(d.concentrando&&d.concentrando.abId===ab.id) d.concentrando=null;
      if(us.condEm==='eu') _ligaCondEu(d,us.condId,false);
      if(us.invoc) d.invocacoes=d.invocacoes.filter(v=>v.abId!==ab.id);
      if(S.ui.usoUlt&&S.ui.usoUlt.abId===ab.id) S.ui.usoUlt=null;
      render(); return showToast(ab.name+' desligada.'); }
    if(rc&&custo>0){ if(rc.cur<custo) return showToast('Sem '+rc.name+' para ligar “'+ab.name+'”: custa '+custo+', você tem '+rc.cur+'.'); d.resCurrent[rc.id]=rc.cur-custo; }
    preparaConj(); gasta();
    d.ativas[ab.id]=true;
    const c=_cond(sys,us.condId);
    if(c&&us.condEm==='eu') _ligaCondEu(d,c.id,true);
    const nInv=us.invoc?_invoca(sys,d,ctx,ab):0;
    const linhas=[...conj,(rc&&custo>0)?('−'+custo+' '+rc.name):null,nInv?('Invocou '+nInv+'× '+us.invoc.nome):null,
      c?((us.condEm==='eu'?'Você fica ':'Alvo fica ')+(c.icon||'')+' '+c.name):null,us.duracao?('Dura '+us.duracao):null].filter(Boolean);
    S.ui.usoUlt=linhas.length||us.texto?{abId:ab.id,tipo,linhas,texto:us.texto||''}:null;
    render(); return showToast(tp.ic+' '+ab.name+' ligada'+(rc&&custo>0?(' (−'+custo+' '+rc.name+')'):'')+'.');
  }
  if(rc&&custo>0&&rc.cur<custo) return showToast('Sem '+rc.name+' suficiente para “'+ab.name+'”: custa '+custo+', você tem '+rc.cur+'.');
  preparaConj(); gasta();
  if(lim!==Infinity) conj.push('🔁 Usos: '+(lim-1)+' restante(s)');
  const linhas=[...conj], cur={}; ctx.allRes.forEach(x=>cur[x.id]=x.cur);
  if(rc&&custo>0){ cur[rc.id]=rc.cur-custo; d.resCurrent[rc.id]=cur[rc.id]; linhas.push('−'+custo+(extra?(' (aumentada +'+extra+')'):'')+' '+rc.name); }
  let destaque=null, erro=false, atq=null;
  if(us.ataque&&us.ataque.on&&typeof rolarAtaqueMagia==='function'){ atq=rolarAtaqueMagia(sys,us,ctx.varsTotal); linhas.push('🎯 '+atq.txt+' contra a Defesa do alvo'); }
  const formula=(typeof formulaComAumento==='function')?formulaComAumento(us.formula,us,extra):us.formula;
  if(String(formula||'').trim()){
    const rl=rollExpr(formula,ctx.varsTotal,{crit:!!(atq&&atq.crit),critMult:2}); const v=rl.erro?NaN:rl.total;
    if(Number.isNaN(v)) erro=true;
    else if(usoAplicaEm(us)==='alvo'){
      const n=Math.abs(v); const metade=us.teste&&us.teste.attr&&us.teste.sucesso==='metade';
      destaque={n,rot:tipo==='cura'?'de cura no alvo':'de dano'+(us.tipoDano?(' de '+us.tipoDano):''),sub:[metade?('se passar no teste: '+Math.floor(n/2)):'',atq&&atq.total!=null?('acerto '+atq.total+(atq.crit?' ★':'')):''].filter(Boolean).join(' · ')};
    } else if(us.alvoId){ const t=_aplicaRec(ctx,d,cur,us.alvoId,v); if(t) linhas.push(t); destaque={n:Math.abs(v),rot:(v<0?'de ':'em ')+_nomeRec(sys,us.alvoId)+(v<0?' perdidos':'')}; }
  }
  (us.extras||[]).forEach(x=>{ if(!x.resId||!String(x.formula||'').trim()) return;
    const rl=rollExpr(x.formula,ctx.varsTotal); if(rl.erro){ erro=true; return; }
    if(x.quem==='alvo') linhas.push('Alvo: '+_nomeRec(sys,x.resId)+' '+sign(rl.total));
    else { const t=_aplicaRec(ctx,d,cur,x.resId,rl.total); if(t) linhas.push(t); } });
  const c=_cond(sys,us.condId);
  if(c){ if(us.condEm==='eu'){ _ligaCondEu(d,c.id,true); linhas.push('Você fica '+(c.icon||'')+' '+c.name+(us.duracao?(' ('+us.duracao+')'):'')); }
    else linhas.push('Alvo fica '+(c.icon||'')+' '+c.name+(us.duracao?(' ('+us.duracao+')'):'')); }
  else if(us.duracao) linhas.push('Dura '+us.duracao);
  if(us.teste&&us.teste.attr){ const cd=_avalia(us.teste.cd,ctx.varsTotal,null);
    linhas.push('Alvo testa '+us.teste.attr+(cd!=null?(' contra CD '+cd):'')+(us.teste.sucesso==='nada'?' — se passar: nada acontece':us.teste.sucesso==='sem'?' — se passar: evita a condição':' — se passar: metade')+(us.repete?' (repete no fim de cada turno)':'')); }
  if(us.invoc){ const n=_invoca(sys,d,ctx,ab); linhas.push('Invocou '+n+'× '+us.invoc.nome); }
  if(us.alcance==='area'&&us.area&&us.area.forma) linhas.push('Área: '+_formaNome(us.area.forma).replace(/^\S+\s/,'')+(us.area.tam?(' de '+us.area.tam+'m'):''));
  if(erro) linhas.push('⚠ Uma fórmula desta técnica está inválida — avise o Mestre.');
  S.ui.usoUlt={abId:ab.id,tipo,linhas,destaque,texto:us.texto||''};
  render(); showToast(tp.ic+' '+ab.name+(destaque?(': '+destaque.n+' '+destaque.rot):(linhas.length?(': '+linhas[0]):'')),3000);
}
/* resultado do último uso, mostrado no cartão da técnica */
function usoResultado(sys,ab){
  const u=S.ui.usoUlt; if(!u||u.abId!==ab.id) return null;
  return h('div',{class:'uso-res',role:'status'},
    h('button',{type:'button',class:'btn mini ghost uso-res-x','aria-label':'Fechar resultado',onclick:()=>{S.ui.usoUlt=null;render();}},'✕'),
    u.destaque?h('div',{class:'uso-res-big'},h('b',{},String(u.destaque.n)),h('span',{},' '+u.destaque.rot),u.destaque.sub?h('small',{},' · '+u.destaque.sub):null):null,
    ...u.linhas.map(l=>h('div',{class:'uso-res-l'},l)),
    u.texto?h('div',{class:'uso-res-t'},'“'+u.texto+'”'):null);
}
/* botão que a ficha mostra numa habilidade/técnica usável */
function botaoUsoHab(sys,d,ctx,ab,ligada){
  const us=ab.uso; if(!us||!us.on) return null;
  const {r:rc,custo}=_custoDe(ctx,us);
  const lim=typeof usosRestantes==='function'?usosRestantes(d,ab,ctx.varsTotal):Infinity;
  const semRec=(rc&&custo>0&&rc.cur<custo&&!(us.modo==='ativa'&&ligada))||(lim<=0&&!(us.modo==='ativa'&&ligada));
  const usosTxt=lim===Infinity?'':(' · '+lim+'/'+usosMax(us,ctx.varsTotal));
  const tit=usoHabResumo(sys,ab), tp=tipoInfo(usoTipo(us));
  const verbo={cura:'💚 Curar',dano:'🔥 Lançar',buff:'🛡️ Usar',debuff:'🌀 Lançar',invocacao:'🐺 Invocar',utilidade:'✨ Usar'}[tp.k]||'✨ Usar';
  if(us.modo==='ativa') return h('button',{type:'button',class:'btn sm '+(ligada?'emerald':'ghost'),title:tit,'aria-pressed':ligada?'true':'false',disabled:semRec||null,
    onclick:()=>usarHabilidade(sys,d,ctx,ab)},ligada?'⏻ Ligada':('⏻ Ligar'+(rc&&custo>0?(' · '+custo+' '+rc.name):'')+usosTxt));
  return h('button',{type:'button',class:'btn sm uso-btn',style:{'--tc':tp.cor},title:tit,disabled:semRec||null,
    onclick:()=>(typeof usarComOpcoes==='function'?usarComOpcoes(sys,d,ctx,ab):usarHabilidade(sys,d,ctx,ab))},verbo+(rc&&custo>0?(' · '+custo+' '+rc.name):'')+usosTxt);
}
/* chips do cartão: tipo, alcance/área, teste, condição, duração */
function usoChips(sys,us){
  if(!us||!us.on) return null;
  const tp=tipoInfo(usoTipo(us)), ch=[], ar=us.area||{}, te=us.teste||{};
  ch.push(h('span',{class:'uso-chip tipo'},tp.ic+' '+tp.n));
  if(us.modo==='ativa') ch.push(h('span',{class:'uso-chip'},'⏻ contínua'));
  if(us.alcance==='area'&&ar.forma) ch.push(h('span',{class:'uso-chip'},_formaNome(ar.forma)+(ar.tam?(' '+ar.tam+'m'):'')));
  else if(us.alcance) ch.push(h('span',{class:'uso-chip'},'🎯 '+((ALCANCES.find(a=>a[0]===us.alcance)||[])[1]||'')+(us.alcance==='distancia'&&ar.tam?(' '+ar.tam+'m'):'')));
  if(us.tipoDano) ch.push(h('span',{class:'uso-chip'},'⚡ '+us.tipoDano));
  if(te.attr) ch.push(h('span',{class:'uso-chip'},'🎲 '+te.attr+(te.cd?(' CD '+te.cd):'')));
  const c=_cond(sys,us.condId); if(c) ch.push(h('span',{class:'uso-chip cond',style:{'--cc':c.color||'#e11d48'}},(c.icon||'⚠')+' '+c.name));
  if(us.duracao) ch.push(h('span',{class:'uso-chip'},'⏳ '+us.duracao));
  if(us.usos&&String(us.usos.max||'').trim()) ch.push(h('span',{class:'uso-chip'},'🔁 '+us.usos.max+'× por '+(((USOS_RECARGA.find(x=>x[0]===us.usos.recarga)||[])[1])||'descanso')));
  if(typeof conjChips==='function') ch.push(...conjChips(us));
  return h('div',{class:'uso-chips'},...ch);
}
/* cartão completo de técnica (ficha do jogador e prévia no editor) */
function cartaoTecnica(sys,d,ctx,ab,o){
  o=o||{}; const us=ab.uso||{}, usa=!!us.on, tp=tipoInfo(usoTipo(us));
  const ligada=o.ligada!==false, ehAtiva=usa&&us.modo==='ativa';
  const apagada=ehAtiva&&!ligada&&!o.prev;
  const btn=(d&&ctx&&usa&&!o.prev)?botaoUsoHab(sys,d,ctx,ab,ligada)
    :(o.prev&&usa?h('span',{class:'btn sm uso-btn',style:{'--tc':tp.cor},'aria-hidden':'true'},ehAtiva?'⏻ Ligar':'Usar'):null);
  return h('div',{class:'abil tec-card'+(usa?' tipo-'+tp.k:'')+(apagada?' off':'')+(ehAtiva&&ligada&&!o.prev?' ligada':''),style:usa?{'--tc':tp.cor}:null},
    h('div',{class:'row between abil-cab'},
      h('div',{class:'t'},(ab.icon?h('span',{class:'tec-ic'},ab.icon):null),((ab.req||{}).level>1?h('span',{class:'nv'},'Nv '+ab.req.level):null),ab.name||'Sem nome','  ',
        o.fonte?h('span',{style:{fontSize:'10px',color:'var(--dim)'}},'('+o.fonte+')'):null),
      btn),
    usa?usoChips(sys,us):null,
    ab.description?h('div',{class:'d'},ab.description):null,
    (usa&&(o.prev||o.play))?h('div',{class:'hint'},usoHabResumo(sys,ab)):null,
    (ab.effects&&ab.effects.length)?h('div',{class:'fx'},(apagada?'(desligada) ':'')+ab.effects.map(ef=>effectLabel(sys,ef)).join('  •  ')):null,
    (!o.prev&&usa)?usoResultado(sys,ab):null);
}
