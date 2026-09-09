/* ============================================================ CAMPANHA — DADOS ============================================================
   Rolador do Mestre: construtor VISUAL (ícones de dado d4..d100) + expressão
   livre + histórico (campaign.diceLog).
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

/* ---------- Ícones poliédricos (SVG) ---------- */
const DICE_TYPES=[4,6,8,10,12,20,100];
const DICE_SHAPES={
  4:  '50,8 92,86 8,86',                                  /* triângulo */
  6:  '20,20 80,20 80,80 20,80',                          /* quadrado  */
  8:  '50,6 90,50 50,94 10,50',                           /* losango   */
  10: '50,5 86,38 70,92 30,92 14,38',                     /* pipa/penta */
  12: '50,5 90,33 74,90 26,90 10,33',                     /* pentágono */
  20: '50,4 87,26 87,68 50,94 13,68 13,26',               /* hexágono  */
  100:'50,5 86,38 70,92 30,92 14,38',                     /* = d10 (d%)*/
};
const DICE_COLOR={4:'#10b981',6:'#6366f1',8:'#d97706',10:'#e11d48',12:'#8b5cf6',20:'#06b6d4',100:'#ec4899'};
function diceIcon(faces, size){
  size=size||36;
  const pts=DICE_SHAPES[faces]||DICE_SHAPES[6];
  const cor=DICE_COLOR[faces]||'#6366f1';
  const rotulo=faces===100?'%':faces;
  const cls=faces===100?'die-num pct':(faces>=100?'die-num sm':'die-num');
  const svg='<svg viewBox="0 0 100 100" width="'+size+'" height="'+size+'" aria-hidden="true">'
    +'<polygon points="'+pts+'" fill="rgba(255,255,255,.04)" stroke="'+cor+'" stroke-width="6" stroke-linejoin="round"/>'
    +'<text x="50" y="50" text-anchor="middle" dominant-baseline="central" class="'+cls+'" fill="'+cor+'">'+rotulo+'</text></svg>';
  return h('span',{class:'die-ic', html:svg});
}

/* ---------- Construtor visual de expressão ---------- */
function diceB(){ if(!S.diceB||typeof S.diceB!=='object'){ S.diceB={pool:{},mod:0}; } if(!S.diceB.pool) S.diceB.pool={}; if(typeof S.diceB.mod!=='number') S.diceB.mod=0; return S.diceB; }
function diceBExpr(){
  const b=diceB(); const partes=[];
  DICE_TYPES.forEach(f=>{ if(b.pool[f]>0) partes.push(b.pool[f]+'d'+f); });
  let e=partes.join(' + ');
  if(b.mod) e = e ? (e+(b.mod>0?' + '+b.mod:' − '+Math.abs(b.mod))) : (''+b.mod);
  return e;
}
function diceBExprExec(){   /* versão sem espaços/sinais unicode, pra rollExpr */
  const b=diceB(); const partes=[];
  DICE_TYPES.forEach(f=>{ if(b.pool[f]>0) partes.push(b.pool[f]+'d'+f); });
  let e=partes.join('+');
  if(b.mod) e = e ? (e+(b.mod>0?'+'+b.mod:''+b.mod)) : (''+b.mod);
  return e;
}
function diceAdd(f,n){ const b=diceB(); b.pool[f]=Math.max(0,(b.pool[f]||0)+n); if(!b.pool[f]) delete b.pool[f]; render(); }
function diceModAdd(n){ const b=diceB(); b.mod+=n; render(); }
function diceReset(){ S.diceB={pool:{},mod:0}; render(); }

/* Bloco compacto para o Painel (expressão livre rápida). */
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

/* Seção completa: construtor visual + resultado + expressão livre + histórico. */
function dadosCampanhaView(){
  const b=diceB();

  /* 1) Paleta de dados — toque para adicionar */
  const paleta=h('div',{class:'dice-palette'}, DICE_TYPES.map(f=>
    h('button',{class:'dice-type', title:'Adicionar d'+f, onclick:()=>diceAdd(f,1)},
      diceIcon(f,46), h('span',{class:'dice-type-l'}, 'd'+f))));

  /* 2) Pool montado — "1 [d4] 4"  com + / − por grupo */
  const grupos=DICE_TYPES.filter(f=>b.pool[f]>0).map(f=>
    h('div',{class:'dice-chip'},
      h('button',{class:'dice-step', title:'Menos', onclick:()=>diceAdd(f,-1)},'−'),
      h('span',{class:'dice-qty'}, b.pool[f]),
      diceIcon(f,34),
      h('span',{class:'dice-faces'}, f===100?'%':f),
      h('button',{class:'dice-step', title:'Mais', onclick:()=>diceAdd(f,1)},'+')));
  /* modificador como um "grupo" especial */
  const modChip=h('div',{class:'dice-chip mod'},
    h('span',{class:'dice-mod-l'},'mod'),
    h('button',{class:'dice-step', onclick:()=>diceModAdd(-1)},'−'),
    h('span',{class:'dice-qty'}, sign(b.mod)),
    h('button',{class:'dice-step', onclick:()=>diceModAdd(1)},'+'));
  const poolBox = (grupos.length||b.mod)
    ? h('div',{class:'dice-pool'}, ...grupos, modChip)
    : h('div',{class:'dice-pool'}, h('div',{class:'hint'},'Toque num dado acima para montar sua rolagem.'), modChip);

  /* 3) Expressão montada + ações */
  const expr=diceBExpr();
  const acoes=h('div',{class:'dice-actions'},
    h('div',{class:'dice-expr-big'}, expr||'—'),
    h('div',{class:'row wrapf'},
      h('button',{class:'btn primary lg', disabled: expr?null:true,
        onclick:()=>{ const e=diceBExprExec(); if(e) rolarExpr(e); }},'🎲 Rolar'),
      h('button',{class:'btn ghost sm', onclick:diceReset},'🧹 Limpar')));

  /* 4) Último resultado em destaque */
  const last=(S.campaign.diceLog||[])[0];
  const destaque = last ? h('div',{class:'dice-result'+(last.erro?' err':'')},
      h('div',{class:'dice-result-exp'}, last.expr||'—'),
      h('div',{class:'dice-result-total'}, last.erro?('⚠ '+last.erro):last.total),
      last.detail?h('div',{class:'dice-result-det'}, last.detail):null) : null;

  /* 5) Expressão livre (fórmulas com atributos) */
  const livre=card('Expressão livre','Aceita 2d6+3, 4d6kh3, 1d20+Força… (usa os atributos no máximo como referência).',
    null, rolagemRapida());

  /* 6) Histórico */
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

  return h('div',{},
    card('Montar rolagem','Toque nos dados para montar — você vê a quantidade, o ícone e as faces de cada um.',
      null, paleta, poolBox, acoes, destaque),
    livre,
    card('Histórico', null,
      log.length?h('button',{class:'btn sm ghost', onclick:()=>{S.campaign.diceLog=[];render();}},'🧹 Limpar'):null,
      hist));
}

function relTempo(ts){
  if(!ts) return '';
  const s=Math.floor((Date.now()-ts)/1000);
  if(s<60) return 'agora';
  if(s<3600) return Math.floor(s/60)+' min';
  if(s<86400) return Math.floor(s/3600)+' h';
  return new Date(ts).toLocaleDateString();
}
