/* ============================================================ ARQUÉTIPOS — CLASSES E ORIGENS ============================================================
   Motor das peças que deixam classe e origem "mexerem" na ficha:
     • fórmula própria de recurso   (a classe calcula a Vida do jeito dela; a origem soma)
     • habilidades por nível        (todo Guerreiro nível 5 ganha "Ataque Extra" — via req.level)
     • técnicas de classe           (lista de opções; quantas o jogador escolhe = fórmula da classe
                                     + efeitos "técnica extra" de qualquer fonte)
     • traços físicos com efeito    (Asas → capacidade Voo 9 m)
     • novos efeitos                (resistência/imunidade, capacidade, bônus em rolagem, código)
   Depende de helpers (uid, semAcento*) e do formula-engine. Carregado logo após example-system.

   * semAcento vive em master-nav.js (carregado depois), mas só é chamado em tempo de execução. */

/* ---------- forma dos dados ---------- */
function sanitizeArquetipo(c,kind){
  if(!c||typeof c!=='object') return c;
  if(typeof c.icon!=='string') c.icon= kind==='origem' ? '🧬' : '⚔️';
  if(typeof c.color!=='string') c.color= kind==='origem' ? '#0d9488' : '#7c3aed';
  if(!Array.isArray(c.abilities)) c.abilities=[];
  c.abilities.forEach(a=>{ if(!a.id)a.id=uid(); if(!Array.isArray(a.effects))a.effects=[]; if(!a.req)a.req={level:0,attrs:[]}; if(!Array.isArray(a.req.attrs))a.req.attrs=[]; sanitizarUsoHab(a); });
  /* recursos: [{id,resId,modo:'substitui'|'soma',formula}] */
  if(!Array.isArray(c.recursos)) c.recursos=[];
  c.recursos.forEach(r=>{ if(!r.id)r.id=uid(); if(r.modo!=='soma') r.modo='substitui'; if(typeof r.formula!=='string') r.formula=''; });
  if(kind==='classe'){
    if(!c.tecnicas||typeof c.tecnicas!=='object') c.tecnicas={};
    const t=c.tecnicas;
    if(typeof t.nome!=='string'||!t.nome.trim()) t.nome='Técnicas';
    if(typeof t.formula!=='string') t.formula='Nível';
    if(!Array.isArray(t.opcoes)) t.opcoes=[];
    t.opcoes.forEach(o=>{ if(!o.id)o.id=uid(); if(!Array.isArray(o.effects))o.effects=[]; if(!o.req)o.req={level:0,attrs:[]}; if(!Array.isArray(o.req.attrs))o.req.attrs=[]; sanitizarUsoHab(o); });
  } else {
    if(!Array.isArray(c.traits)) c.traits=[];
    c.traits.forEach(t=>{ if(!t.id)t.id=uid(); if(!Array.isArray(t.effects))t.effects=[]; if(typeof t.icon!=='string')t.icon='✦'; });
    if(!c.visual||typeof c.visual!=='object') c.visual={};
    const v=c.visual;
    if(typeof v.aparencia!=='string') v.aparencia='';
    if(!['minusculo','pequeno','medio','grande','enorme'].includes(v.tamanho)) v.tamanho='medio';
    if(typeof v.imagem!=='string') v.imagem='';
  }
  return c;
}
/* Técnica/magia/habilidade USÁVEL: custa um recurso (Mana…), pode curar/ferir um recurso (fórmula com dados)
   e, no modo "ativa", liga/desliga (os efeitos só valem enquanto ligada). */
function sanitizarUsoHab(ab){
  /* tipo: cura · dano · buff · debuff · invocacao · utilidade ('' = deduzido, fichas antigas)
     aplicaEm: onde a fórmula principal cai — 'eu' (meu recurso) ou 'alvo' (rola e informa: dano no inimigo, cura no aliado)
     extras: mais recursos mexidos ao mesmo tempo [{id,resId,formula,quem}] · condId: condição aplicada (em mim ou no alvo)
     area/teste/alcance: alcance, forma da área e teste de resistência · invoc: criatura invocada (cartão estilizado na ficha) */
  const base={on:false,modo:'instantaneo',custoId:'',custo:'',alvoId:'',formula:'',texto:'',
    tipo:'',aplicaEm:'',alcance:'',alvos:'',tipoDano:'',duracao:'',extras:[],condId:'',condEm:'alvo',
    area:{forma:'',tam:''},teste:{attr:'',cd:'',sucesso:'metade'},invoc:null,
    /* conjuração (2026-10-20): tempo de execução, concentração, ritual, componentes, círculo/nível da magia,
       rolagem de ataque contra a Defesa do alvo e "aumentar" (mais potência pagando mais custo) */
    execucao:'',concentracao:false,ritual:false,componentes:'',circulo:0,escola:'',repete:false,
    ataque:{on:false,bonus:''},aumenta:{formula:'',custo:'',max:''}};
  ab.uso=Object.assign({},base,(ab.uso&&typeof ab.uso==='object')?ab.uso:{});
  if(ab.uso.modo!=='ativa') ab.uso.modo='instantaneo';
  const u=ab.uso;
  if(!Array.isArray(u.extras)) u.extras=[];
  u.extras.forEach(x=>{ if(!x.id) x.id=uid(); if(x.quem!=='alvo') x.quem='eu'; });
  if(!u.area||typeof u.area!=='object') u.area={forma:'',tam:''};
  if(!u.teste||typeof u.teste!=='object') u.teste={attr:'',cd:'',sucesso:'metade'};
  if(u.invoc&&typeof u.invoc!=='object') u.invoc=null;
  if(!u.ataque||typeof u.ataque!=='object') u.ataque={on:false,bonus:''};
  u.ataque.on=!!u.ataque.on; if(typeof u.ataque.bonus!=='string') u.ataque.bonus=String(u.ataque.bonus==null?'':u.ataque.bonus);
  if(!u.aumenta||typeof u.aumenta!=='object') u.aumenta={formula:'',custo:'',max:''};
  ['formula','custo','max'].forEach(k=>{ if(typeof u.aumenta[k]!=='string') u.aumenta[k]=String(u.aumenta[k]==null?'':u.aumenta[k]); });
  u.concentracao=!!u.concentracao; u.ritual=!!u.ritual; u.repete=!!u.repete;
  u.circulo=Math.max(0,Math.min(20,Number(u.circulo)||0));
  if(!['','acao','bonus','reacao','livre','movimento','completa','minuto','hora'].includes(u.execucao)) u.execucao='';
  ['componentes','escola'].forEach(k=>{ if(typeof u[k]!=='string') u[k]=''; });
  if(u.invoc) u.invoc=Object.assign({nome:'Criatura',icone:'🐺',cor:'#8b5cf6',vida:'10',defesa:'12',ataque:'+4',dano:'1d6',mov:'9',qtd:'1',duracao:'',desc:'',estilo:'fera'},u.invoc);
  if(typeof ab.icon!=='string') ab.icon='';
  return ab;
}
const TAMANHOS=[['minusculo','Minúsculo'],['pequeno','Pequeno'],['medio','Médio'],['grande','Grande'],['enorme','Enorme']];

/* ---------- baldes de efeito ---------- */
function novoBalde(){
  return {attrBonus:{},resBonus:{},grantedSkills:[],charNum:{},charTags:[],diceMod:{},
    rollBonus:{},resist:{},caps:{},resFormulas:[],techExtra:0,notas:[],erros:[],novosRec:[]};
}
/* Resistências: "reduz" soma, as outras são marcas. Imunidade vence tudo. */
const RESIST_MODOS=[['reduz','Reduz dano em'],['metade','Resistência (½ dano)'],['imune','Imunidade'],['vulneravel','Vulnerabilidade (×2)']];
function registrarResist(B,nm,modo,v){
  const r=B.resist[nm]||(B.resist[nm]={reduz:0,metade:false,imune:false,vulneravel:false});
  if(modo==='reduz') r.reduz+=v; else r[modo]=true;
}
function resistLabel(nm,modo,v){
  nm=String(nm||'').trim()||'?';
  if(modo==='imune') return '🛡 Imune a '+nm;
  if(modo==='metade') return '🛡 Resiste a '+nm+' (½)';
  if(modo==='vulneravel') return '💥 Vulnerável a '+nm+' (×2)';
  return '🛡 '+nm+' −'+v;
}
/* resumo de uma entrada do balde de resistências, para a ficha */
function resistResumo(nm,r){
  if(r.imune) return {ic:'🛡',t:'Imune a '+nm,cls:'imune'};
  const p=[];
  if(r.metade) p.push('½');
  if(r.reduz) p.push((r.reduz>0?'−':'+')+Math.abs(r.reduz));
  if(r.vulneravel) p.push('×2');
  const ruim=r.vulneravel&&!r.metade&&!(r.reduz>0);
  return {ic:ruim?'💥':'🛡',t:nm+(p.length?(' '+p.join(' ')):''),cls:ruim?'vuln':'res'};
}
/* Capacidades: movimento e sentidos. "un" é a unidade exibida ao lado do valor. */
const CAPACIDADES=[
  {n:'Voo',ic:'🪽',un:' m'},{n:'Natação',ic:'🌊',un:' m'},{n:'Escalada',ic:'🧗',un:' m'},
  {n:'Escavação',ic:'⛏️',un:' m'},{n:'Visão no escuro',ic:'👁',un:' m'},{n:'Sentido sísmico',ic:'〰️',un:' m'},
  {n:'Respirar na água',ic:'🫧'},{n:'Telepatia',ic:'🧠',un:' m'},{n:'Planar',ic:'🍃'},{n:'Andar em paredes',ic:'🕷'},
];
function capInfo(nm){ const t=semAcentoSeguro(nm); return CAPACIDADES.find(c=>semAcentoSeguro(c.n)===t)||{ic:'✦'}; }
function semAcentoSeguro(s){ return (typeof semAcento==='function')?semAcento(s||''):String(s||'').toLowerCase(); }

/* Recurso especial concedido por uma fonte (item, técnica, classe…): aparece na ficha como uma barra
   enquanto a fonte estiver valendo. Se o sistema já tem um recurso com esse nome, vira bônus nele. */
function registrarRecursoNovo(B,o){
  const nome=String(o.nome||'').trim(); if(!nome) return;
  const sys=(B.ctx||{}).sys;
  const ex=sys&&_acha(sys.resources,nome);
  if(ex){ B.resBonus[ex.id]=(B.resBonus[ex.id]||0)+(+o.max||0); return; }
  const id='fx:'+semAcentoSeguro(nome).replace(/\s+/g,'-');
  let r=B.novosRec.find(x=>x.id===id);
  if(!r){
    r={id,name:nome,max:0,icon:o.icone||'✨',color:o.cor||'#a855f7',granted:true,fontes:[],
       recharge:{trig:['curto','longo','nunca'].includes(o.recarga)?o.recarga:'longo',amt:'tudo',formula:''},
       type:o.tipo==='valor'?'valor':'barra',formula:'',desc:''};
    B.novosRec.push(r);
  }
  r.max+=(+o.max||0);
  if(o.fonte&&!r.fontes.includes(o.fonte)) r.fontes.push(o.fonte);
}

/* ---------- efeito por CÓDIGO ----------
   O Mestre escreve JavaScript que recebe `fx` e chama funções que despejam nos baldes.
   Roda a cada cálculo da ficha: deve ser rápido e não ter efeitos colaterais.
   Sistema importado de fora chega com sys.codigoBloqueado=true e não roda até o Mestre liberar. */
const _codigoCache=new Map();
function compilarCodigo(src){
  if(_codigoCache.has(src)) return _codigoCache.get(src);
  let fn, erro=null;
  try{ fn=new Function('fx','"use strict";\n'+src); }catch(e){ erro=e.message; }
  const r={fn,erro}; _codigoCache.set(src,r); return r;
}
function rodarEfeitoCodigo(ef,B,k){
  const src=String(ef.code||'').trim(); if(!src) return;
  const ctx=B.ctx||{}; const sys=ctx.sys;
  if(!sys) return;
  if(sys.codigoBloqueado){ B.erros.push((ef.text||'Efeito por código')+': bloqueado (sistema importado — libere na aba Classes).'); return; }
  const c=compilarCodigo(src);
  if(c.erro){ B.erros.push((ef.text||'Efeito por código')+': '+traduzErroJs(c.erro)); return; }
  try{ c.fn(fxApi(sys,ctx,B,k==null?1:k)); }
  catch(e){ B.erros.push((ef.text||'Efeito por código')+': '+msgErroCodigo(e)); }
}
/* acha um item da lista pelo nome (ou sigla, no caso de atributo), sem ligar para acento/caixa */
function _acha(lista,nome){
  const t=semAcentoSeguro(String(nome||'').trim());
  return (lista||[]).find(x=>semAcentoSeguro(x.name)===t || (x.abbr&&semAcentoSeguro(x.abbr)===t)) || null;
}
function fxApi(sys,ctx,B,k){
  const vars=()=>ctx._vars||(ctx._vars=varsDoEfeito(sys,ctx.level,ctx.tot1));
  const formula=expr=>{ const r=evalFormula(String(expr),vars()); return Number.isNaN(r)?0:r; };
  /* qualquer valor numérico aceita número OU texto de fórmula ("Nível * 2 + Vigor") */
  const num=v=>(typeof v==='string'?formula(v):(+v||0))*k;
  const avisa=(tipo,nome)=>{ const m='“'+(ctx.fonte||'código')+'”: não achei '+tipo+' “'+nome+'”.'; if(!B.erros.includes(m)) B.erros.push(m); };
  const d=ctx.d||{};
  const cls=(sys.classes||[]).find(c=>c.id===d.classId), org=(sys.origins||[]).find(o=>o.id===d.originId);
  const fx={
    nivel:ctx.level, classe:cls?cls.name:'', origem:org?org.name:'', fonte:ctx.fonte||'',
    /* leitura */
    attr:nome=>{ const a=_acha(sys.attributes,nome); if(!a){ avisa('o atributo',nome); return 0; } return ((ctx.tot1||{})[a.id]||0); },
    tem:nome=>B.charTags.includes(nome)||!!B.caps[nome],
    formula,
    /* escrita */
    atributo:(nome,v)=>{ const a=_acha(sys.attributes,nome); if(!a) return avisa('o atributo',nome); B.attrBonus[a.id]=(B.attrBonus[a.id]||0)+num(v); },
    recurso:(nome,v)=>{ const r=_acha(sys.resources,nome); if(!r) return avisa('o recurso',nome); B.resBonus[r.id]=(B.resBonus[r.id]||0)+num(v); },
    novoRecurso:(nome,max,op)=>{ op=op||{}; registrarRecursoNovo(B,{nome,max:num(max),icone:op.icone,cor:op.cor,recarga:op.recarga,tipo:op.tipo,fonte:ctx.fonte}); },
    pericia:nome=>{ const s=_acha(sys.skills,nome); if(!s) return avisa('a perícia',nome); if(!B.grantedSkills.includes(s.id)) B.grantedSkills.push(s.id); },
    rolagem:(escopo,v)=>{ const e=escopo||'todos'; B.rollBonus[e]=(B.rollBonus[e]||0)+num(v); },
    dados:(escopo,v)=>{ const e=escopo||'todos'; B.diceMod[e]=(B.diceMod[e]||0)+num(v); },
    resistencia:(tipo,v)=>registrarResist(B,String(tipo),'reduz',num(v)),
    metade:tipo=>registrarResist(B,String(tipo),'metade',0),
    imunidade:tipo=>registrarResist(B,String(tipo),'imune',0),
    vulnerabilidade:tipo=>registrarResist(B,String(tipo),'vulneravel',0),
    capacidade:(nome,v)=>{ B.caps[nome]=Math.max(B.caps[nome]||0,num(v)); },
    tag:nome=>{ if(nome&&!B.charTags.includes(nome)) B.charTags.push(String(nome)); },
    numero:(nome,v)=>{ B.charNum[nome]=(B.charNum[nome]||0)+num(v); },
    tecnicas:v=>{ B.techExtra+=num(v); },
    nota:txt=>{ if(txt) B.notas.push({fonte:ctx.fonte||'',t:String(txt)}); },
  };
  /* atalhos legíveis: fx.ataque(2), fx.dano(1), fx.defesa(3) */
  fx.ataque=v=>fx.rolagem('ataque',v); fx.dano=v=>fx.rolagem('dano',v); fx.defesa=v=>fx.rolagem('defesa',v);
  return Object.freeze(fx);
}
function sistemaTemCodigo(sys){
  let tem=false;
  const ve=l=>(l||[]).forEach(ef=>{ if(ef.kind==='codigo'&&String(ef.code||'').trim()) tem=true; if(ef.mods) ve(ef.mods); });
  const fontes=[...(sys.classes||[]),...(sys.origins||[])];
  fontes.forEach(c=>{ (c.abilities||[]).forEach(a=>ve(a.effects)); (c.traits||[]).forEach(t=>ve(t.effects));
    (((c.tecnicas||{}).opcoes)||[]).forEach(o=>ve(o.effects)); });
  (sys.items||[]).forEach(i=>ve(i.effects)); (sys.conditions||[]).forEach(c=>ve(c.effects));
  (sys.choices||[]).forEach(c=>(c.options||[]).forEach(o=>ve(o.effects)));
  return tem;
}

/* ---------- técnicas de classe: quantas o personagem pode ter ---------- */
function tecnicasPermitidas(sys,d,eff){
  const cls=(sys.classes||[]).find(c=>c.id===d.classId);
  if(!cls||!((cls.tecnicas||{}).opcoes||[]).length) return 0;
  const vars={'Nível':d.level,'Nivel':d.level}; vars[sys.levelName||'Nível']=d.level;
  (sys.attributes||[]).forEach(a=>{ vars[a.name]=effAttr(sys,(d.attrs[a.id]??0)+((eff&&eff.attrBonus[a.id])||0)); });
  let n=evalFormula(cls.tecnicas.formula||'0',vars);
  if(Number.isNaN(n)) n=0;
  /* nunca pede mais do que existe liberado no nível (senão o jogador trava) */
  const liberadas=cls.tecnicas.opcoes.filter(o=>!(((o.req||{}).level||0)>d.level)).length;
  return Math.max(0, Math.min(liberadas, n + ((eff&&eff.techExtra)||0)));
}

/* ---------- recursos: fórmula do sistema → classe substitui → classe/origem somam ----------
   Na fórmula da classe a variável "Base" é o valor da fórmula do sistema. */
function formulaRecursoArquetipo(sys,r,eff,vars){
  let base=evalFormula(r.formula,vars);
  const fontes=[eff.cls,eff.org].filter(Boolean);
  const vB={...vars, Base:Number.isNaN(base)?0:base};
  const origemDaFormula=[];
  fontes.forEach(f=>(f.recursos||[]).forEach(x=>{
    if(x.resId!==r.id||x.modo!=='substitui'||!String(x.formula||'').trim()) return;
    const v=evalFormula(x.formula,vB); if(!Number.isNaN(v)){ base=v; vB.Base=v; origemDaFormula.push(f.name); }
  }));
  if(Number.isNaN(base)) return {v:NaN,origem:origemDaFormula};
  fontes.forEach(f=>(f.recursos||[]).forEach(x=>{
    if(x.resId!==r.id||x.modo!=='soma'||!String(x.formula||'').trim()) return;
    const v=evalFormula(x.formula,vB); if(!Number.isNaN(v)){ base+=v; origemDaFormula.push(f.name+' +'); }
  }));
  ((eff.B&&eff.B.resFormulas)||[]).forEach(x=>{
    if(x.resId!==r.id) return;
    const v=evalFormula(x.formula,vB); if(!Number.isNaN(v)) base+=v*(x.k||1);
  });
  return {v:base,origem:origemDaFormula};
}
/* bônus fixo de rolagem num escopo ("todos" sempre entra junto) */
function rollBonusDe(eff,escopo){ const r=(eff&&eff.rollBonus)||{}; return (r.todos||0)+(escopo&&escopo!=='todos'?(r[escopo]||0):0); }

/* ---------- validação: o que está errado/estranho numa classe ou origem ----------
   Devolve frases curtas (vazio = tudo certo). Alimenta o cartão da lista, a aba Visão
   e o aviso da aba (problemasDaAba). */
function efeitosDoArquetipo(c){
  const out=[]; const ve=l=>(l||[]).forEach(ef=>{ out.push(ef); if(ef.mods) ve(ef.mods); });
  (c.abilities||[]).forEach(a=>ve(a.effects)); (c.traits||[]).forEach(t=>ve(t.effects));
  (((c.tecnicas||{}).opcoes)||[]).forEach(o=>ve(o.effects));
  return out;
}
function arqProblemas(sys,kind,c){
  const p=[]; if(!c) return p;
  const lo=sys.startLevel||1, hi=Math.max(lo,sys.maxLevel||lo);
  const v=(typeof sysVarsSample==='function')?sysVarsSample(sys):{'Nível':hi};
  if(!String(c.name||'').trim()) p.push('Sem nome.');
  (c.recursos||[]).forEach(x=>{
    const r=(sys.resources||[]).find(q=>q.id===x.resId);
    if(!r){ p.push('Um ajuste de recurso aponta para um recurso que não existe mais.'); return; }
    if(String(x.formula||'').trim() && Number.isNaN(evalFormula(x.formula,{...v,Base:1}))) p.push('Recurso “'+r.name+'”: fórmula inválida.');
  });
  (c.abilities||[]).forEach(a=>{
    const lv=(a.req&&a.req.level)||0;
    if(!String(a.name||'').trim()) p.push('Há uma habilidade sem nome.');
    if(lv>hi) p.push('“'+(a.name||'habilidade')+'” só chega no '+(sys.levelName||'nível').toLowerCase()+' '+lv+', acima do máximo ('+hi+').');
  });
  if(kind==='classe'){
    const t=c.tecnicas||{};
    if((t.opcoes||[]).length){
      if(String(t.formula||'').trim() && Number.isNaN(evalFormula(t.formula,{...v}))) p.push('Fórmula de quantas técnicas escolher é inválida.');
      const mais=t.opcoes.filter(o=>((o.req||{}).level||0)>hi);
      if(mais.length) p.push(mais.length+' técnica(s) abrem acima do '+(sys.levelName||'nível').toLowerCase()+' máximo.');
      if(!String(t.formula||'').trim()) p.push('Há técnicas, mas a fórmula de quantas escolher está vazia.');
    }
  }
  efeitosDoArquetipo(c).forEach(ef=>{
    if(ef.kind==='codigo'&&String(ef.code||'').trim()){ const cc=compilarCodigo(ef.code); if(cc.erro) p.push('Código “'+(ef.text||'efeito')+'”: '+cc.erro); }
    if(ef.kind==='resistencia'&&!String(ef.text||'').trim()) p.push('Há uma resistência sem tipo de dano.');
    if(ef.kind==='capacidade'&&!String(ef.text||'').trim()) p.push('Há uma capacidade sem nome.');
  });
  return p;
}
