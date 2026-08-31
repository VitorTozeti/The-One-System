/* ============================================================ CAMPANHA — DADOS ============================================================
   Rolador do Mestre (expressão livre) + histórico (campaign.diceLog).
   Reaproveita rollExpr/textoRolagem (dice-engine) e sysVarsSample (master-nav). */

/* Variáveis disponíveis para as fórmulas (atributos no máximo, como no editor). */
function campVars(){
  try{ return sysVarsSample(S.system); }catch(e){ return {}; }
}
function rolarExpr(expr, by){
  const res=rollExpr(expr, campVars());
  logDice(res, by);
  if(res&&!res.erro) showToast('🎲 '+(res.expr||'')+' = '+res.total);
  else render();
  return res;
}

/* Bloco compacto para o Painel. */
function rolagemRapida(){
  const box=h('div',{});
  const inp=h('input',{class:'in', placeholder:'ex.: 2d6+3  ·  1d20+Força', value:S.dice.expr||'',
    onkeydown:e=>{ if(e.key==='Enter'){ S.dice.expr=e.target.value; rolarExpr(e.target.value); } }});
  const linha=h('div',{class:'row wrapf'}, inp,
    h('button',{class:'btn primary', onclick:()=>{ S.dice.expr=inp.value; rolarExpr(inp.value); }},'🎲 Rolar'));
  const atalhos=h('div',{class:'row wrapf', style:{marginTop:'8px'}},
    ...['1d20','1d100','2d6','1d8','3d6','1d4'].map(x=>
      h('button',{class:'btn sm ghost', onclick:()=>{ S.dice.expr=x; rolarExpr(x); }}, x)));
  box.appendChild(linha); box.appendChild(atalhos);
  return box;
}

/* Seção completa com histórico. */
function dadosCampanhaView(){
  const log=S.campaign.diceLog||[];
  const hist=log.length
    ? h('div',{class:'dice-log'}, log.map(e=>h('div',{class:'dice-row'+(e.erro?' err':'')},
        h('div',{class:'dice-main'},
          h('span',{class:'dice-expr'}, e.expr||'—'),
          h('span',{class:'dice-eq'}, e.erro?('⚠ '+e.erro):(' = '+e.total))),
        e.detail?h('div',{class:'dice-detail'}, e.detail):null,
        h('div',{class:'dice-meta'}, (e.by||'Mestre')+' • '+relTempo(e.ts),
          h('button',{class:'btn mini ghost', title:'Repetir', onclick:()=>rolarExpr(e.expr, e.by)},'↻')))))
    : h('div',{class:'hint'},'Nenhuma rolagem ainda.');

  return card('Rolar dados','Aceita 2d6+3, 4d6kh3, 1d20+Força… (usa os atributos no máximo como referência).',
    log.length?h('button',{class:'btn sm ghost', onclick:()=>{S.campaign.diceLog=[];render();}},'🧹 Limpar histórico'):null,
    rolagemRapida(),
    h('h4',{style:{margin:'16px 0 8px'}},'Histórico'), hist);
}

function relTempo(ts){
  if(!ts) return '';
  const s=Math.floor((Date.now()-ts)/1000);
  if(s<60) return 'agora';
  if(s<3600) return Math.floor(s/60)+' min';
  if(s<86400) return Math.floor(s/3600)+' h';
  return new Date(ts).toLocaleDateString();
}
