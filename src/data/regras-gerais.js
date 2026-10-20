/* ============================================================ REGRAS GERAIS — MORTE E MOVIMENTO ============================================================
   Regras que todo sistema precisa e que antes só existiam como "gatilho ao chegar a 0":
     • sys.morte      o que acontece quando a Vida zera (caído, testes contra a morte, contagem de
                      rodadas, vida negativa, morte instantânea) + jeitos de SALVAR (resgates,
                      estabilizar com perícia) + cicatrizes + o que a morte significa (morto / retorno).
     • sys.movimento  deslocamento por fórmula, unidade/grade, corrida, terreno difícil, carga,
                      condições que travam o movimento e AÇÕES por turno (Padrão, Movimento, Reação…).
   Na ficha:  d.morte = {estado:'ok'|'caido'|'estavel'|'morto', suc, fal, rodadas, neg, cicatrizes[]}
              d.turno = {usadas:{acaoId:n}}
   Depende de: uid, evalFormula, rollExpr (chamados só em tempo de execução). */

const MORTE_MODOS=[
  {k:'testes',    ic:'🎲', n:'Testes contra a morte', d:'Caído, rola um dado por rodada: N sucessos estabiliza, N falhas morre (estilo D&D).'},
  {k:'contagem',  ic:'⏳', n:'Contagem de rodadas',   d:'Caído e “morrendo”: tem X rodadas para alguém salvar (estilo Ordem Paranormal).'},
  {k:'negativo',  ic:'🩸', n:'Vida negativa',         d:'Continua de pé até um limite abaixo de 0; passou do limite, morre (estilo Tormenta/old school).'},
  {k:'instantanea',ic:'☠️',n:'Morte instantânea',     d:'Zerou, morreu. Para jogos mortais — combine com resgates (ponto de heroísmo).'},
];
const MORTE_EFEITOS_RESGATE=[['levanta','Levanta com Vida'],['estabiliza','Estabiliza (para de morrer)'],['sucesso','Conta um sucesso no teste'],['rodadas','Ganha rodadas extras']];
const MORTE_AO_MORRER=[['morto','Fica morto (ficha marcada ☠)'],['retorno','Retorna (volta no tempo / ponto de salvamento)'],['mestre','O Mestre decide (só avisa)']];

function morteBase(){
  return {on:false,resId:'',modo:'testes',
    testes:{dado:'1d20',cd:'10',sucessos:3,falhas:3,natMax:true,natMin:true,danoCaido:1},
    contagem:{rodadas:'3',nome:'Morrendo'},
    negativo:{limite:'10'},
    estabilizar:{skillId:'',cd:'10'},
    condId:'', resgates:[],
    cicatrizes:{on:false,dado:'1d6',tabela:[]},
    aoMorrer:'morto', texto:''};
}
function movimentoBase(){
  return {on:false,unidade:'m',base:'9',quadrado:1.5,corrida:2,terreno:2,
    carga:'metade',cargaMenos:3,
    condRegras:[], acoes:[], salto:'', notas:''};
}
const _num=(v,p)=>{ const n=Number(v); return Number.isFinite(n)?n:p; };
function sanitizeRegrasGerais(sys){
  const m=sys.morte=Object.assign(morteBase(),(sys.morte&&typeof sys.morte==='object')?sys.morte:{});
  m.on=!!m.on;
  if(!MORTE_MODOS.some(x=>x.k===m.modo)) m.modo='testes';
  m.testes=Object.assign(morteBase().testes,(m.testes&&typeof m.testes==='object')?m.testes:{});
  m.testes.sucessos=Math.max(1,Math.min(10,_num(m.testes.sucessos,3)|0));
  m.testes.falhas=Math.max(1,Math.min(10,_num(m.testes.falhas,3)|0));
  m.testes.danoCaido=Math.max(0,Math.min(5,_num(m.testes.danoCaido,1)|0));
  ['dado','cd'].forEach(k=>{ if(typeof m.testes[k]!=='string') m.testes[k]=String(m.testes[k]==null?'':m.testes[k]); });
  m.contagem=Object.assign(morteBase().contagem,(m.contagem&&typeof m.contagem==='object')?m.contagem:{});
  m.negativo=Object.assign(morteBase().negativo,(m.negativo&&typeof m.negativo==='object')?m.negativo:{});
  m.estabilizar=Object.assign(morteBase().estabilizar,(m.estabilizar&&typeof m.estabilizar==='object')?m.estabilizar:{});
  if(!Array.isArray(m.resgates)) m.resgates=[];
  m.resgates=m.resgates.filter(r=>r&&typeof r==='object').slice(0,20);
  m.resgates.forEach(r=>{ if(!r.id) r.id=uid(); if(typeof r.nome!=='string') r.nome='Resgate'; if(typeof r.icone!=='string') r.icone='✨';
    if(!MORTE_EFEITOS_RESGATE.some(x=>x[0]===r.efeito)) r.efeito='levanta'; if(typeof r.valor!=='string') r.valor=String(r.valor==null?'1':r.valor);
    if(typeof r.custo!=='string') r.custo=String(r.custo==null?'1':r.custo); if(typeof r.resId!=='string') r.resId=''; if(typeof r.desc!=='string') r.desc=''; });
  m.cicatrizes=Object.assign(morteBase().cicatrizes,(m.cicatrizes&&typeof m.cicatrizes==='object')?m.cicatrizes:{});
  if(!Array.isArray(m.cicatrizes.tabela)) m.cicatrizes.tabela=[];
  m.cicatrizes.tabela=m.cicatrizes.tabela.map(String).slice(0,100);
  if(!MORTE_AO_MORRER.some(x=>x[0]===m.aoMorrer)) m.aoMorrer='morto';
  if(typeof m.texto!=='string') m.texto='';

  const v=sys.movimento=Object.assign(movimentoBase(),(sys.movimento&&typeof sys.movimento==='object')?sys.movimento:{});
  v.on=!!v.on;
  if(!['m','q','ft','narrativo'].includes(v.unidade)) v.unidade='m';
  if(typeof v.base!=='string') v.base=String(v.base==null?'':v.base);
  v.quadrado=Math.max(0.1,_num(v.quadrado,1.5));
  v.corrida=Math.max(1,_num(v.corrida,2));
  v.terreno=Math.max(1,_num(v.terreno,2));
  if(!['nenhuma','metade','menos','zero'].includes(v.carga)) v.carga='metade';
  v.cargaMenos=Math.max(0,_num(v.cargaMenos,3));
  if(!Array.isArray(v.condRegras)) v.condRegras=[];
  v.condRegras=v.condRegras.filter(c=>c&&typeof c==='object').slice(0,30);
  v.condRegras.forEach(c=>{ if(!c.id) c.id=uid(); if(!['metade','zero','menos'].includes(c.efeito)) c.efeito='metade'; c.n=Math.max(0,_num(c.n,0)); });
  if(!Array.isArray(v.acoes)) v.acoes=[];
  v.acoes=v.acoes.filter(a=>a&&typeof a==='object').slice(0,12);
  v.acoes.forEach(a=>{ if(!a.id) a.id=uid(); if(typeof a.nome!=='string') a.nome='Ação'; if(typeof a.icone!=='string') a.icone='●';
    a.qtd=Math.max(0,Math.min(9,_num(a.qtd,1)|0)); if(typeof a.desc!=='string') a.desc=''; });
  if(typeof v.salto!=='string') v.salto='';
  if(typeof v.notas!=='string') v.notas='';
  return sys;
}

/* ---------- predefinições (o Mestre começa de um sistema conhecido e ajusta) ---------- */
const _acao=(icone,nome,qtd,desc)=>({id:uid(),icone,nome,qtd,desc});
const MORTE_PRESETS=[
  {n:'🐉 D&D 5e',d:'Caído a 0; 3 sucessos/3 falhas (CD 10); 20 levanta com 1, 1 conta duas falhas.',
   f:m=>Object.assign(m,{modo:'testes',testes:{dado:'1d20',cd:'10',sucessos:3,falhas:3,natMax:true,natMin:true,danoCaido:1},aoMorrer:'morto'})},
  {n:'👁 Ordem Paranormal',d:'Morrendo: 3 rodadas para ser socorrido (Medicina CD 20).',
   f:m=>Object.assign(m,{modo:'contagem',contagem:{rodadas:'3',nome:'Morrendo'},estabilizar:Object.assign(m.estabilizar,{cd:'20'}),aoMorrer:'morto'})},
  {n:'⚔ Tormenta20',d:'Pode ficar negativo até −10 (ou −Vigor); passou disso, morre.',
   f:m=>Object.assign(m,{modo:'negativo',negativo:{limite:'10'},aoMorrer:'morto'})},
  {n:'💀 Mortal (OSR)',d:'Zerou, morreu — com um Ponto de Heroísmo para escapar uma vez.',
   f:(m,sys)=>{ Object.assign(m,{modo:'instantanea',aoMorrer:'morto'}); if(!m.resgates.length) m.resgates.push({id:uid(),nome:'Escapar por um fio',icone:'🍀',efeito:'levanta',valor:'1',custo:'0',resId:'',desc:'Uma vez por sessão: em vez de morrer, fica com 1.'}); }},
  {n:'⏪ Retorno pela morte',d:'Morrer não é o fim: volta ao ponto de salvamento (Re:Zero, roguelike).',
   f:m=>Object.assign(m,{modo:'instantanea',aoMorrer:'retorno',texto:'☠️ Você morreu… e acorda no último ponto de salvamento.'})},
];
const MOV_PRESETS=[
  {n:'🐉 D&D 5e',d:'9 m (6 quadrados de 1,5 m); Ação, Ação bônus, Reação e Movimento.',
   f:v=>Object.assign(v,{unidade:'m',base:'9',quadrado:1.5,corrida:2,terreno:2,acoes:[_acao('⚔','Ação',1,'Atacar, conjurar, Disparada, Esquivar, Ajudar…'),_acao('⚡','Ação bônus',1,'Só se uma habilidade permitir.'),_acao('🔁','Reação',1,'Fora do seu turno (ataque de oportunidade).'),_acao('🦶','Movimento',1,'Andar até o deslocamento.')]})},
  {n:'⚔ Tormenta20 / Ordem',d:'9 m; ação Padrão, de Movimento, Completa (as duas), Livre e Reação.',
   f:v=>Object.assign(v,{unidade:'m',base:'9',quadrado:1.5,corrida:2,terreno:2,acoes:[_acao('⚔','Padrão',1,'Atacar, lançar magia, usar item.'),_acao('🦶','Movimento',1,'Andar, sacar, levantar-se. Pode trocar a Padrão por outra de Movimento.'),_acao('⭐','Livre',3,'Falar, soltar item.'),_acao('🔁','Reação',1,'Esquiva, contra-ataque.')]})},
  {n:'🎯 Pontos de ação',d:'3 pontos por turno para gastar como quiser (estilo Pathfinder 2e).',
   f:v=>Object.assign(v,{unidade:'m',base:'7.5',quadrado:1.5,corrida:1,terreno:2,acoes:[_acao('◆','Ação',3,'Cada passo, golpe ou magia gasta 1–3.'),_acao('🔁','Reação',1,'Fora do turno.')]})},
  {n:'📖 Narrativo',d:'Sem grade: zonas (perto / médio / longe) e uma ação por vez.',
   f:v=>Object.assign(v,{unidade:'narrativo',base:'1',corrida:1,terreno:1,acoes:[_acao('●','Ação',1,'Faça uma coisa importante.'),_acao('🦶','Mudar de zona',1,'Perto ↔ médio ↔ longe.')]})},
];

/* ---------- MOVIMENTO na ficha ---------- */
function deslocamentoDe(sys,d,ctx){
  const v=sys.movimento; if(!v||!v.on) return null;
  const vars=(ctx&&ctx.varsTotal)||{};
  const eff=(ctx&&ctx.eff)||{};
  let base=evalFormula(v.base||'0',vars); if(Number.isNaN(base)) base=0;
  const motivos=[];
  const bonus=((eff.charNum||{})['Deslocamento']||0)+((eff.caps||{})['Deslocamento']||0);
  let total=base+bonus; if(bonus) motivos.push((bonus>0?'+':'')+bonus+' de habilidades');
  const carga=ctx&&ctx.carga, pesado=carga&&carga.max!=null&&!Number.isNaN(carga.max)&&carga.peso>carga.max;
  if(pesado&&v.carga!=='nenhuma'){
    if(v.carga==='metade'){ total=total/2; motivos.push('½ sobrecarregado'); }
    else if(v.carga==='zero'){ total=0; motivos.push('parado: sobrecarregado'); }
    else { total-=v.cargaMenos; motivos.push('−'+v.cargaMenos+' sobrecarregado'); }
  }
  const conds=(d&&d.conditions)||[];
  let parado=false;
  v.condRegras.forEach(r=>{
    if(!conds.some(c=>c.condId===r.condId)) return;
    const c=(sys.conditions||[]).find(x=>x.id===r.condId); const nm=c?c.name:'condição';
    if(r.efeito==='zero'){ parado=true; motivos.push('parado: '+nm); }
    else if(r.efeito==='metade'){ total=total/2; motivos.push('½ '+nm); }
    else { total-=r.n; motivos.push('−'+r.n+' '+nm); }
  });
  if(d&&d.morte&&d.morte.estado&&d.morte.estado!=='ok'){ parado=true; motivos.push('caído'); }
  if(parado) total=0;
  total=Math.max(0,Math.round(total*10)/10);
  const q=v.unidade==='m'||v.unidade==='ft'?Math.floor(total/v.quadrado):null;
  let salto=null; if(String(v.salto||'').trim()){ const s=evalFormula(v.salto,vars); if(!Number.isNaN(s)) salto=Math.max(0,Math.round(s*10)/10); }
  return {total,corrida:Math.round(total*v.corrida*10)/10,dificil:Math.round(total/v.terreno*10)/10,quadrados:q,
    un:unidadeMov(v),salto,motivos,caps:eff.caps||{}};
}
function unidadeMov(v){ return {m:' m',q:' quadrados',ft:' ft',narrativo:' zona(s)'}[v.unidade]||' m'; }

/* ---------- MORTE na ficha ---------- */
function morteEstado(d){
  if(!d.morte||typeof d.morte!=='object') d.morte={estado:'ok',suc:0,fal:0,rodadas:0,neg:0,cicatrizes:[]};
  const m=d.morte; if(!['ok','caido','estavel','morto'].includes(m.estado)) m.estado='ok';
  ['suc','fal','rodadas','neg'].forEach(k=>{ if(typeof m[k]!=='number'||Number.isNaN(m[k])) m[k]=0; });
  if(!Array.isArray(m.cicatrizes)) m.cicatrizes=[];
  return m;
}
function _limpaMorte(m){ m.estado='ok'; m.suc=0; m.fal=0; m.rodadas=0; m.neg=0; }
function _condCaido(sys,d,on){
  const r=sys.morte; if(!r.condId) return;
  if(!Array.isArray(d.conditions)) d.conditions=[];
  const tem=d.conditions.some(c=>c.condId===r.condId);
  if(on&&!tem) d.conditions.push({cid:uid(),condId:r.condId,nivel:1,via:'morte'});
  if(!on) d.conditions=d.conditions.filter(c=>!(c.condId===r.condId&&c.via==='morte'));
}
function _varsDe(sys,d){ try{ return computeSheet(sys,d).varsTotal; }catch(e){ return {}; } }
function _avaliaN(f,vars,p){ const x=evalFormula(String(f==null?'':f),vars||{}); return Number.isNaN(x)?p:Math.round(x); }

/* Chamado quando a ficha mexe num recurso. pedido = valor pedido antes de travar em 0.
   Devolve frases para o aviso. */
function morteAoMudar(sys,d,resId,antes,depois,pedido){
  const r=sys.morte; if(!r||!r.on||!r.resId||r.resId!==resId) return [];
  const m=morteEstado(d), feitos=[];
  if(m.estado==='morto') return [];
  if(depois>0){
    if(m.estado!=='ok'){ _limpaMorte(m); _condCaido(sys,d,false); feitos.push('🙂 De pé de novo'); }
    return feitos;
  }
  /* chegou a 0 agora */
  if(antes>0&&depois<=0){
    const excesso=Math.max(0,-(pedido||0));
    if(r.modo==='instantanea'){ morrer(sys,d,feitos); return feitos; }
    m.estado='caido'; m.suc=0; m.fal=0; m.neg=0;
    if(r.modo==='contagem') m.rodadas=Math.max(1,_avaliaN(r.contagem.rodadas,_varsDe(sys,d),3));
    if(r.modo==='negativo'){ m.neg=excesso; if(m.neg>=_limiteNeg(sys,d)){ morrer(sys,d,feitos); return feitos; } }
    _condCaido(sys,d,true);
    feitos.push('💫 Caído'+(r.modo==='contagem'?(' — '+(r.contagem.nome||'Morrendo')+': '+m.rodadas+' rodada(s)'):''));
    if(r.cicatrizes.on&&r.cicatrizes.tabela.length) feitos.push(rolarCicatriz(sys,d));
    return feitos;
  }
  /* já estava em 0 e levou mais dano */
  if(antes<=0&&pedido<0&&(m.estado==='caido'||m.estado==='estavel')){
    if(r.modo==='testes'){ m.estado='caido'; m.fal+=r.testes.danoCaido||1; feitos.push('💥 Dano caído: +'+(r.testes.danoCaido||1)+' falha(s)'); if(m.fal>=r.testes.falhas) morrer(sys,d,feitos); }
    else if(r.modo==='negativo'){ m.neg+=-pedido; feitos.push('🩸 '+m.neg+' abaixo de 0'); if(m.neg>=_limiteNeg(sys,d)) morrer(sys,d,feitos); }
    else if(r.modo==='contagem'){ m.estado='caido'; m.rodadas=Math.max(0,m.rodadas-1); feitos.push('💥 Perdeu uma rodada'); if(m.rodadas<=0) morrer(sys,d,feitos); }
  }
  return feitos;
}
function _limiteNeg(sys,d){ return Math.max(1,_avaliaN(sys.morte.negativo.limite,_varsDe(sys,d),10)); }
function morrer(sys,d,feitos){
  const r=sys.morte, m=morteEstado(d);
  if(r.aoMorrer==='retorno'){
    /* volta no tempo: tudo cheio, estado limpo, uma marca no contador de mortes */
    d.resCurrent={}; _limpaMorte(m); _condCaido(sys,d,false);
    m.mortes=(m.mortes||0)+1;
    feitos.push(r.texto||'⏪ Morreu e retornou.'); return;
  }
  m.estado='morto'; _condCaido(sys,d,true);
  feitos.push(r.aoMorrer==='mestre'?(r.texto||'☠ Morreu — o Mestre decide o que acontece.'):(r.texto||'☠ Morreu.'));
}
function rolarCicatriz(sys,d){
  const c=sys.morte.cicatrizes, t=c.tabela.filter(x=>String(x).trim());
  if(!t.length) return '';
  const rr=rollExpr(c.dado||('1d'+t.length),{});
  const i=Math.max(0,Math.min(t.length-1,((rr&&!rr.erro)?rr.total:1)-1));
  const m=morteEstado(d); m.cicatrizes.push(t[i]);
  return '🩹 Cicatriz: '+t[i];
}
/* teste contra a morte (modo testes) */
function morteTestar(sys,d){
  const r=sys.morte, t=r.testes, m=morteEstado(d); if(m.estado!=='caido') return null;
  const vars=_varsDe(sys,d);
  const rr=rollExpr(t.dado||'1d20',vars); if(!rr||rr.erro) return {titulo:'Teste contra a morte',total:null,sub:rr&&rr.erro};
  const dado=(rr.detalhes||[])[0]||{}, nat=(dado.usados||[])[0], faces=dado.faces;
  const cd=_avaliaN(t.cd,vars,10); let sub;
  if(t.natMax&&nat===faces){ d.resCurrent[r.resId]=1; _limpaMorte(m); _condCaido(sys,d,false); sub='natural máximo — levanta com 1!'; }
  else if(t.natMin&&nat===1){ m.fal+=2; sub='natural 1 — duas falhas'; }
  else if(rr.total>=cd){ m.suc++; sub='sucesso (CD '+cd+')'; }
  else { m.fal++; sub='falha (CD '+cd+')'; }
  if(m.estado==='caido'&&m.suc>=t.sucessos){ m.estado='estavel'; sub+=' · ESTÁVEL'; }
  if(m.estado==='caido'&&m.fal>=t.falhas){ const f=[]; morrer(sys,d,f); sub+=' · '+f.join(' '); }
  return {titulo:'Teste contra a morte',total:rr.total,sub};
}
function morteRodada(sys,d){
  const m=morteEstado(d); if(m.estado!=='caido') return null;
  m.rodadas=Math.max(0,m.rodadas-1);
  if(m.rodadas<=0){ const f=[]; morrer(sys,d,f); return f.join(' '); }
  return '⏳ Restam '+m.rodadas+' rodada(s)';
}
/* aliado tenta estabilizar (perícia escolhida pelo Mestre ou só o dado) */
function morteEstabilizar(sys,d){
  const r=sys.morte, m=morteEstado(d); if(m.estado!=='caido') return null;
  const ctx=computeSheet(sys,d), vars=ctx.varsTotal;
  const sk=(sys.skills||[]).find(s=>s.id===r.estabilizar.skillId);
  const bonus=sk?ctx.skillVal(sk):0;
  const rr=rollExpr((sys.rollBase&&/d\d/.test(sys.rollBase)?sys.rollBase:'1d20')+' + '+bonus,vars);
  if(!rr||rr.erro) return {titulo:'Estabilizar',total:null,sub:rr&&rr.erro};
  const cd=_avaliaN(r.estabilizar.cd,vars,10);
  if(rr.total>=cd){ m.estado='estavel'; return {titulo:'Estabilizar'+(sk?' ('+sk.name+')':''),total:rr.total,sub:'CD '+cd+' — estável!'}; }
  return {titulo:'Estabilizar'+(sk?' ('+sk.name+')':''),total:rr.total,sub:'CD '+cd+' — não deu'};
}
function morteResgate(sys,d,rg){
  const r=sys.morte, m=morteEstado(d);
  const ctx=computeSheet(sys,d), vars=ctx.varsTotal;
  if(rg.resId){
    const res=ctx.allRes.find(x=>x.id===rg.resId); const custo=_avaliaN(rg.custo,vars,1);
    if(res){ if(res.cur<custo) return '⚠ Falta '+res.name+' ('+res.cur+'/'+custo+')'; d.resCurrent[res.id]=res.cur-custo; }
  }
  const val=_avaliaN(rg.valor,vars,1);
  if(rg.efeito==='levanta'){ d.resCurrent[r.resId]=Math.max(1,val); _limpaMorte(m); _condCaido(sys,d,false); return (rg.icone||'✨')+' '+rg.nome+': de pé com '+Math.max(1,val); }
  if(rg.efeito==='estabiliza'){ m.estado='estavel'; return (rg.icone||'✨')+' '+rg.nome+': estável'; }
  if(rg.efeito==='sucesso'){ m.suc+=Math.max(1,val); if(m.suc>=r.testes.sucessos) m.estado='estavel'; return (rg.icone||'✨')+' '+rg.nome+': +'+Math.max(1,val)+' sucesso'; }
  m.rodadas+=Math.max(1,val); return (rg.icone||'✨')+' '+rg.nome+': +'+Math.max(1,val)+' rodada(s)';
}
