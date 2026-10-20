/* ============================================================ SISTEMAS DE PODER — MOTOR ============================================================
   Um "sistema de poder" é um conjunto de técnicas que funciona como uma coisa só, com regras próprias:
     • Dez Sombras (Megumi): shikigamis que se DESBLOQUEIAM por ritual, podem ser DESTRUÍDOS e herdam poder
     • Cópia + Rika (Yuta): o personagem COPIA técnicas de outros, gasta uma reserva enorme
     • Seda e Brasões (Hornet): golpes que GANHAM recurso, ferramentas com USOS LIMITADOS, brasão EQUIPADO (um por vez)
     • Elementos: magias base que se COMBINAM (Fogo + Água = Vapor)
   sys.poderes = [{id, nome, icone, cor, desc, recursoId, todos, modo, escolherQtd, copia, copiaMax, formas:[hab], combos:[{id,a,b,ab}]}]
     modo: 'todas' (tem todas que desbloquear) · 'escolher' (aprende N, fórmula) · 'exclusiva' (equipa uma por vez)
     forma = habilidade normal (efeitos + uso) + grupo, perdivel, desbloq:{tipo:'livre'|'ritual'|'forma'|'perdida', formaId, texto}
   Quem tem: efeito "🔮 Concede sistema de poder" (classe, origem, escolha, item) ou o sistema marcado "todos".
   Estado do personagem: d.poder[poderId] = {des:{formaId:true}, perd:{formaId:true}, esc:[ids], equip:id, copias:[abId]}
   Usos limitados (qualquer técnica): ab.uso.usos = {max:'3', recarga:'longo'|'curto'|'cena'|'nunca'} · gasto em d.usos[abId]. */

const DESBLOQ_TIPOS=[
  ['livre','🔓 Já vem liberada','Basta ter o nível.'],
  ['ritual','🕯 Ritual / conquista','Fica trancada até alguém marcar "conquistado" na ficha (vencer o shikigami, achar o grimório, treinar com o mestre…).'],
  ['forma','🔗 Depois de outra','Só libera quando outra forma deste sistema estiver liberada.'],
  ['perdida','💀 Quando outra for destruída','Herança: aparece quando uma forma marcada como perdível for destruída.'],
];
const PODER_MODOS=[
  ['todas','📖 Tem todas','O personagem tem todas as formas que conseguir desbloquear.'],
  ['escolher','🎓 Aprende algumas','Escolhe quantas formas conhece (ex.: magias conhecidas). A quantidade pode crescer com o nível.'],
  ['exclusiva','🎽 Equipa uma por vez','Só a forma equipada vale (posturas, brasões, armaduras, modos).'],
];

function _formaPadrao(f){
  if(!f.desbloq||typeof f.desbloq!=='object') f.desbloq={tipo:'livre',formaId:'',texto:''};
  if(!DESBLOQ_TIPOS.some(t=>t[0]===f.desbloq.tipo)) f.desbloq.tipo='livre';
  ['formaId','texto'].forEach(k=>{ if(typeof f.desbloq[k]!=='string') f.desbloq[k]=''; });
  if(typeof f.grupo!=='string') f.grupo='';
  f.perdivel=!!f.perdivel;
  if(!Array.isArray(f.effects)) f.effects=[];
  if(!f.req||typeof f.req!=='object') f.req={level:0,attrs:[]};
  if(typeof sanitizarUsoHab==='function') sanitizarUsoHab(f);
  return f;
}
function sanitizePoderes(sys){
  if(!Array.isArray(sys.poderes)) sys.poderes=[];
  sys.poderes=sys.poderes.filter(p=>p&&typeof p==='object').slice(0,40);
  sys.poderes.forEach(p=>{
    if(!p.id) p.id=uid();
    ['nome','icone','cor','desc','recursoId','escolherQtd','copiaMax'].forEach(k=>{ if(typeof p[k]!=='string') p[k]=p[k]==null?'':String(p[k]); });
    if(!p.nome) p.nome='Sistema de poder';
    if(!PODER_MODOS.some(m=>m[0]===p.modo)) p.modo='todas';
    p.todos=!!p.todos; p.copia=!!p.copia;
    if(!Array.isArray(p.formas)) p.formas=[];
    p.formas=p.formas.filter(f=>f&&typeof f==='object').slice(0,80);
    p.formas.forEach(f=>{ if(!f.id) f.id=uid(); _formaPadrao(f); });
    if(!Array.isArray(p.combos)) p.combos=[];
    p.combos=p.combos.filter(c=>c&&typeof c==='object'&&c.ab&&typeof c.ab==='object').slice(0,60);
    p.combos.forEach(c=>{ if(!c.id) c.id=uid(); if(!c.ab.id) c.ab.id=uid(); if(typeof c.a!=='string') c.a=''; if(typeof c.b!=='string') c.b='';
      if(!Array.isArray(c.ab.effects)) c.ab.effects=[]; if(!c.ab.req) c.ab.req={level:0,attrs:[]}; if(typeof sanitizarUsoHab==='function') sanitizarUsoHab(c.ab); });
  });
  return sys.poderes;
}
function sanitizePoderDraft(d){
  if(!d.poder||typeof d.poder!=='object'||Array.isArray(d.poder)) d.poder={};
  Object.keys(d.poder).forEach(k=>{ const e=d.poder[k]; if(!e||typeof e!=='object'){ delete d.poder[k]; return; }
    if(!e.des||typeof e.des!=='object') e.des={}; if(!e.perd||typeof e.perd!=='object') e.perd={};
    if(!Array.isArray(e.esc)) e.esc=[]; if(!Array.isArray(e.copias)) e.copias=[]; if(typeof e.equip!=='string') e.equip=''; });
  if(!d.usos||typeof d.usos!=='object'||Array.isArray(d.usos)) d.usos={};
}
function poderEstadoDe(d,pid){ sanitizePoderDraft(d); if(!d.poder[pid]) d.poder[pid]={des:{},perd:{},esc:[],equip:'',copias:[]}; return d.poder[pid]; }
function _varsNivel(sys,level){ const v={'Nível':level,'Nivel':level}; v[sys.levelName||'Nível']=level; return v; }
function poderQtd(sys,f,level,padrao){ const s=String(f||'').trim(); if(!s) return padrao; const v=evalFormula(s,_varsNivel(sys,level)); return Number.isNaN(v)?padrao:Math.max(0,Math.floor(v)); }

/* quais sistemas o personagem tem: marcados "todos" + efeitos kind 'poder' nas fontes (nível já alcançado) */
function _efsPoder(efs,out){ (efs||[]).forEach(ef=>{ if(!ef) return; if(ef.kind==='poder'&&ef.targetId) out.add(ef.targetId); if(ef.kind==='livre') _efsPoder(ef.mods,out); }); }
function poderesDoPersonagem(sys,d,sources,equipados){
  const out=new Set((sys.poderes||[]).filter(p=>p.todos).map(p=>p.id));
  (sources||[]).forEach(({ab})=>{ const r=ab.req||{}; if(r.level&&(d.level||1)<r.level) return; _efsPoder(ab.effects,out); });
  (equipados||[]).forEach(({it})=>_efsPoder(it.effects,out));
  return (sys.poderes||[]).filter(p=>out.has(p.id));
}
/* estado de uma forma: 'ativa' · 'nivel' · 'ritual' · 'requer' · 'perdida' · 'escolher' · 'guardada' */
function formaEstado(sys,d,P,f,_prof){
  const e=poderEstadoDe(d,P.id), lv=d.level||1;
  if(e.perd[f.id]) return 'perdida';
  if((f.req||{}).level&&lv<f.req.level) return 'nivel';
  const db=f.desbloq||{};
  if(db.tipo==='ritual'&&!e.des[f.id]) return 'ritual';
  if(db.tipo==='forma'){ const o=P.formas.find(x=>x.id===db.formaId); if(o&&(_prof||0)<6){ const eo=formaEstado(sys,d,P,o,(_prof||0)+1); if(eo!=='ativa'&&eo!=='escolher'&&eo!=='guardada') return 'requer'; } }
  if(db.tipo==='perdida'&&!e.perd[db.formaId]) return 'requer';
  if(P.modo==='escolher'&&!e.esc.includes(f.id)) return 'escolher';
  if(P.modo==='exclusiva'&&e.equip!==f.id) return 'guardada';
  return 'ativa';
}
const formaLiberada=st=>st==='ativa'||st==='escolher'||st==='guardada';
/* todas as habilidades do sistema (para copiar) */
function todasHabsDoSistema(sys){
  const out=[];
  (sys.classes||[]).forEach(c=>{ (c.abilities||[]).forEach(a=>out.push({ab:a,de:c.name})); (((c.tecnicas||{}).opcoes)||[]).forEach(a=>out.push({ab:a,de:c.name})); });
  (sys.origins||[]).forEach(o=>(o.abilities||[]).forEach(a=>out.push({ab:a,de:o.name})));
  (sys.poderes||[]).forEach(p=>{ p.formas.forEach(a=>out.push({ab:a,de:p.nome})); p.combos.forEach(c=>out.push({ab:c.ab,de:p.nome})); });
  return out;
}
/* fontes que entram no gatherEffects (tipo 'poder') */
function fontesDePoder(sys,d,sources,equipados){
  const out=[];
  poderesDoPersonagem(sys,d,sources,equipados).forEach(P=>{
    const st={}; P.formas.forEach(f=>{ st[f.id]=formaEstado(sys,d,P,f); if(st[f.id]==='ativa') out.push({ab:f,src:P.nome,tipo:'poder',poderId:P.id}); });
    P.combos.forEach(c=>{ if(st[c.a]==='ativa'&&st[c.b]==='ativa') out.push({ab:c.ab,src:P.nome,tipo:'poder',poderId:P.id,combo:true}); });
    if(P.copia){ const todas=todasHabsDoSistema(sys); poderEstadoDe(d,P.id).copias.forEach(id=>{ const x=todas.find(t=>t.ab.id===id); if(x) out.push({ab:x.ab,src:P.nome+' (cópia)',tipo:'poder',poderId:P.id,copia:true}); }); }
  });
  return out;
}

/* ---------- usos limitados (qualquer técnica) ---------- */
const USOS_RECARGA=[['longo','descanso longo'],['curto','descanso curto'],['cena','fim da cena'],['nunca','nunca (consumível)']];
function usosMax(us,vars){ const s=String((us&&us.usos&&us.usos.max)||'').trim(); if(!s) return Infinity; const v=evalFormula(s,vars||{}); return Number.isNaN(v)?Infinity:Math.max(0,Math.floor(v)); }
function usosRestantes(d,ab,vars){ const mx=usosMax(ab.uso,vars); if(mx===Infinity) return Infinity; return Math.max(0,mx-(((d&&d.usos)||{})[ab.id]||0)); }
function gastarUso(d,ab){ if(!d.usos) d.usos={}; d.usos[ab.id]=(d.usos[ab.id]||0)+1; }
/* volta os usos de quem recarrega neste descanso (curto também recarrega o que é "cena"; longo recarrega curto e cena) */
function recarregarUsos(sys,d,tipo){
  if(!d||!d.usos) return 0; let n=0;
  const vale={curto:['curto','cena'],longo:['longo','curto','cena'],cena:['cena']}[tipo]||[];
  const todas=todasHabsDoSistema(sys);
  Object.keys(d.usos).forEach(id=>{ const x=todas.find(t=>t.ab.id===id); const rc=x&&x.ab.uso&&x.ab.uso.usos?(x.ab.uso.usos.recarga||'longo'):'longo';
    if(vale.includes(rc)&&d.usos[id]){ delete d.usos[id]; n++; } });
  return n;
}
