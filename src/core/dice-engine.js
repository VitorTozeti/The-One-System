/* ============================================================ MOTOR DE DADOS ============================================================
   Expressões: 2d6+3 · 4d6kh3 (mantém os 3 maiores) · 2d20kl1 (o menor) ·
   1d8+Força (mistura com o motor de fórmulas).
   Os dados são resolvidos PRIMEIRO e substituídos pela soma; o que sobra vai
   para evalFormula. Assim "1d8 + Força * 2" funciona sem parser novo.

   Dois canais que NÃO se convertem (peça 4 do roadmap):
   - canal NÚMERO: soma/subtrai do total  (+2)
   - canal DADOS:  soma/subtrai dados     (−1d20 do Ordem)
   Todo efeito diz em qual canal mexe. */
function rolarDado(faces){ return 1+Math.floor(Math.random()*faces); }
const DICE_RE=/(\d*)d(\d+)(?:(kh|kl|dh|dl)(\d+))?/gi;
/* Resolve os termos de dado de uma expressão e devolve total + detalhamento. */
function rollExpr(expr, vars, opts){
  opts=opts||{};
  const detalhes=[]; let erro=null;
  const resolvida=String(expr==null?'':expr).replace(DICE_RE,(m,q,f,keep,k)=>{
    let qtd=Math.max(1,parseInt(q||'1')||1);
    const faces=Math.max(2,parseInt(f)||2);
    /* CRÍTICO: multiplica só a QUANTIDADE DE DADOS, nunca o modificador fixo. */
    if(opts.crit) qtd=qtd*Math.max(1,opts.critMult||2);
    if(qtd>300||faces>1000){ erro='Dados demais ('+m+')'; return '0'; }
    const rolls=Array.from({length:qtd},()=>rolarDado(faces));
    let usados=rolls;
    if(keep){
      const kn=Math.max(1,Math.min(qtd,parseInt(k)||1));
      const ord=rolls.slice().sort((a,b)=>a-b);
      usados = keep==='kh'?ord.slice(-kn) : keep==='kl'?ord.slice(0,kn)
             : keep==='dh'?ord.slice(0,Math.max(0,qtd-kn)) : ord.slice(kn);
    }
    const soma=usados.reduce((s,n)=>s+n,0);
    detalhes.push({termo:m,faces,rolls,usados:usados.slice(),soma});
    return '('+soma+')';
  });
  if(erro) return {erro};
  const total=evalFormula(resolvida, vars||{});
  if(Number.isNaN(total)) return {erro:'Expressão inválida'};
  return {total, detalhes, expr:String(expr==null?'':expr), resolvida, crit:!!opts.crit};
}
/* Vantagem/desvantagem: 2 dados com álgebra própria — NÃO somam e SE CANCELAM.
   vd > 0 vantagem, vd < 0 desvantagem, 0 normal. */
function aplicarVD(expr, vd){
  if(!vd) return String(expr==null?'':expr);
  let feito=false;
  return String(expr==null?'':expr).replace(DICE_RE,(m,q,f,keep)=>{
    if(feito||keep) return m;           /* só o primeiro termo, e não mexe em kh/kl já escrito */
    feito=true;
    const qtd=Math.max(1,parseInt(q||'1')||1);
    return (qtd+1)+'d'+f+(vd>0?'kh':'kl')+qtd;
  });
}
/* Dice pool do Ordem: "melhor de (atributo)d20"; atributo 0 → 2d20 pega o PIOR. */
function poolExpr(qtd, faces){
  const n=Math.floor(qtd||0);
  faces=faces||20;
  return n<=0 ? ('2d'+faces+'kl1') : (n+'d'+faces+'kh1');
}
/* Aplica o canal de DADOS a uma expressão: soma/subtrai a quantidade do 1º termo.
   Se sobrar 0 ou menos dados, vira pool "pega o pior" (regra do Ordem). */
function aplicarModDados(expr, nd){
  if(!nd) return String(expr==null?'':expr);
  let feito=false;
  return String(expr==null?'':expr).replace(DICE_RE,(m,q,f,keep,k)=>{
    if(feito) return m; feito=true;
    const qtd=Math.max(1,parseInt(q||'1')||1);
    const novo=qtd+nd;
    if(novo<=0) return '2d'+f+'kl1';
    return novo+'d'+f+(keep?(keep+k):'');
  });
}
function textoRolagem(res){
  if(!res||res.erro) return res&&res.erro?('⚠ '+res.erro):'—';
  return (res.detalhes||[]).map(d=>{
    const descartados=d.rolls.length!==d.usados.length;
    return d.termo+' ['+d.rolls.join(', ')+']'+(descartados?(' → '+d.usados.join('+')):'');
  }).join('  ');
}

