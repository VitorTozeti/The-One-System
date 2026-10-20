/* ============================================================ PROGRESSÃO — GANHOS POR NÍVEL ============================================================
   Substitui o "a cada N degraus" solto por uma LISTA DE REGRAS legíveis:
       "+2 pontos de atributo nos níveis 4, 8, 12, 16 e 19"
       "+1 perícia a cada 3 níveis a partir do 3"
       "+1 em Vigor a cada 5 níveis (automático)"
       "+1 melhoria de treino nos níveis 7 e 14"
   sys.ganhos = [{id, tipo, qtd, cada, aPartir, ate, niveis:'4,8,12', alvoId, nota}]
   Tipos: atributo (pontos livres) · atributoFixo (soma sozinho num atributo) · pericia (novas perícias) ·
          treino (subir o grau de uma perícia) · tecnica (+técnica de classe) · recurso (soma no máximo) · escolha (aviso de talento)
   Habilidades de classe/origem também podem dar pontos: efeitos pontosAtributo · pontosPericia · treino.
   O antigo sys.perLevel é convertido em regras na primeira leitura. */

const GANHO_TIPOS=[
  {k:'atributo',    ic:'💪', n:'pontos de atributo', d:'para o jogador distribuir', livre:true},
  {k:'atributoFixo',ic:'📈', n:'em um atributo',     d:'entra sozinho na ficha', alvo:'attr'},
  {k:'pericia',     ic:'🎯', n:'perícia(s) nova(s)', d:'o jogador escolhe quais', livre:true},
  {k:'treino',      ic:'🎓', n:'melhoria(s) de treino', d:'sobe o grau de uma perícia (treinado → veterano…)', livre:true},
  {k:'tecnica',     ic:'🌀', n:'técnica(s) de classe', d:'a mais para escolher'},
  {k:'recurso',     ic:'❤️', n:'no máximo de um recurso', d:'entra sozinho na ficha', alvo:'res'},
  {k:'escolha',     ic:'🌿', n:'escolha / talento',  d:'aviso no subir de nível (configure em 🌿 Escolhas)'},
];
const ganhoTipo=k=>GANHO_TIPOS.find(t=>t.k===k)||GANHO_TIPOS[0];

function sanitizeGanhos(sys){
  if(!Array.isArray(sys.ganhos)) sys.ganhos=[];
  const st=sys.startLevel||1;
  /* migração do modo antigo "+N a cada N degraus" */
  const p=sys.perLevel||{};
  if(p.attrPoints&&p.attrEveryN>0){ sys.ganhos.push({id:uid(),tipo:'atributo',qtd:p.attrPoints,cada:p.attrEveryN,aPartir:st+p.attrEveryN,ate:0,niveis:'',alvoId:'',nota:''}); p.attrPoints=0; }
  if(p.skillPoints&&p.skillEveryN>0){ sys.ganhos.push({id:uid(),tipo:'pericia',qtd:p.skillPoints,cada:p.skillEveryN,aPartir:st+p.skillEveryN,ate:0,niveis:'',alvoId:'',nota:''}); p.skillPoints=0; }
  sys.ganhos=sys.ganhos.filter(g=>g&&typeof g==='object').slice(0,60);
  sys.ganhos.forEach(g=>{ if(!g.id) g.id=uid(); if(!GANHO_TIPOS.some(t=>t.k===g.tipo)) g.tipo='atributo';
    g.qtd=Number(g.qtd)||0; g.cada=Math.max(1,parseInt(g.cada)||1); g.aPartir=parseInt(g.aPartir)||0; g.ate=parseInt(g.ate)||0;
    ['niveis','alvoId','nota'].forEach(k=>{ if(typeof g[k]!=='string') g[k]=g[k]==null?'':String(g[k]); }); });
  (sys.profTiers||[]).forEach(t=>{ t.nivelMin=Math.max(0,parseInt(t.nivelMin)||0); });
  return sys.ganhos;
}
function ganhoNiveisLista(g){ return String(g.niveis||'').split(/[,;\s]+/).map(x=>parseInt(x)).filter(x=>!Number.isNaN(x)); }
/* quantas vezes a regra já disparou até o nível `level` */
function ganhoVezes(sys,g,level){
  const lista=ganhoNiveisLista(g);
  if(lista.length) return lista.filter(n=>n<=level).length;
  const ini=g.aPartir||((sys.startLevel||1)+1);
  const fim=g.ate?Math.min(level,g.ate):level;
  if(fim<ini) return 0;
  return Math.floor((fim-ini)/Math.max(1,g.cada))+1;
}
function ganhosNoNivel(sys,L){ return (sys.ganhos||[]).filter(g=>ganhoVezes(sys,g,L)>ganhoVezes(sys,g,L-1)); }
function ganhoTotal(sys,tipo,level){ return (sys.ganhos||[]).filter(g=>g.tipo===tipo).reduce((s,g)=>s+g.qtd*ganhoVezes(sys,g,level),0); }
/* frase legível: "+2 pontos de atributo nos níveis 4, 8, 12" */
function pluralEixo(n){ n=String(n||'nível'); if(/el$/i.test(n)) return n.slice(0,-2)+'eis'; if(/[lrz]$/i.test(n)) return n+(/l$/i.test(n)?'':'es'); if(/(x|s|%)$/i.test(n)) return n; return n+'s'; }
function ganhoFrase(sys,g){
  const t=ganhoTipo(g.tipo), N0=sys.levelName||'Nível', N=(N0===N0.toUpperCase())?N0:N0.toLowerCase();
  let alvo='';
  if(t.alvo==='attr') alvo=' ('+(((sys.attributes||[]).find(a=>a.id===g.alvoId)||{}).name||'escolha o atributo')+')';
  if(t.alvo==='res') alvo=' ('+(((sys.resources||[]).find(r=>r.id===g.alvoId)||{}).name||'escolha o recurso')+')';
  const qtd=g.tipo==='escolha'?'':((g.qtd>=0?'+':'')+g.qtd+' ');
  const lista=ganhoNiveisLista(g);
  const quando=lista.length?(' nos '+pluralEixo(N)+' '+lista.join(', ')):(g.cada===1?(' em todo '+N):(' a cada '+g.cada+' '+pluralEixo(N)))+(lista.length?'':(' a partir do '+(g.aPartir||((sys.startLevel||1)+1))))+(g.ate&&!lista.length?(' até o '+g.ate):'');
  const nome=Math.abs(g.qtd)===1?t.n.replace(/^pontos/,'ponto').replace(/\(s\)/g,''):t.n.replace(/\(s\)/g,'s');
  return t.ic+' '+qtd+(g.tipo==='escolha'?(g.nota||'Escolha / talento'):nome)+alvo+quando;
}
/* efeitos automáticos (atributo fixo, recurso, técnica a mais) — chamado no fim do gatherEffects */
function aplicaGanhosAuto(sys,d,B){
  (sys.ganhos||[]).forEach(g=>{
    const v=ganhoVezes(sys,g,d.level||1)*g.qtd; if(!v) return;
    if(g.tipo==='atributoFixo'&&g.alvoId) B.attrBonus[g.alvoId]=(B.attrBonus[g.alvoId]||0)+v;
    else if(g.tipo==='recurso'&&g.alvoId) B.resBonus[g.alvoId]=(B.resBonus[g.alvoId]||0)+v;
    else if(g.tipo==='tecnica') B.techExtra+=v;
  });
}
/* pontos vindos de habilidades (efeitos pontosAtributo / pontosPericia / treino) */
function pontosDeHabilidades(eff){ const p=(eff&&eff.B&&eff.B.pts)||{}; return {atributo:p.atributo||0,pericia:p.pericia||0,treino:p.treino||0}; }
