/* ============================================================ MOTOR DE DADOS ============================================================
   Expressões: 2d6+3 · 4d6kh3 (mantém os 3 maiores) · 2d20kl1 (o menor) ·
   1d8+Força (mistura com o motor de fórmulas) ·
   4dF (dado Fate: −1/0/+1) · 1d6! (explode: tirou o máximo, rola de novo e soma) ·
   5d10>=6 (conta SUCESSOS: quantos dados deram 6 ou mais; aceita >= > <= <).
   A ordem dos sufixos é: dado, !, kh/kl/dh/dl, comparação — ex.: 6d6!>=5.
   Os dados são resolvidos PRIMEIRO e substituídos pela soma; o que sobra vai
   para evalFormula. Assim "1d8 + Força * 2" funciona sem parser novo.

   Dois canais que NÃO se convertem (peça 4 do roadmap):
   - canal NÚMERO: soma/subtrai do total  (+2)
   - canal DADOS:  soma/subtrai dados     (−1d20 do Ordem)
   Todo efeito diz em qual canal mexe. */
function rolarDado(faces){ return 1+Math.floor(Math.random()*faces); }
const DICE_RE=/(?<![A-Za-zÀ-ÿ_])(\d*)d(\d+|F(?![A-Za-zÀ-ÿ_]))(!?)(?:(kh|kl|dh|dl)(\d+))?(?:(>=|<=|>|<)(\d+))?/gi;
const MAX_EXPLOSOES=100;
/* Quantidade de dados por fórmula: "(1 + piso(Nível / 4))d6" ou "(Nível)d8" — a parte entre
   parênteses colada no "d" vira um número antes de rolar (truques que crescem, magia aumentada). */
function expandeDadosDinamicos(expr, vars){
  let s=String(expr==null?'':expr), out='', i=0;
  /* procura ")d<faces>" e volta até o "(" que casa (aceita parênteses aninhados) */
  const re=/\)\s*d(\d+|F(?![A-Za-zÀ-ÿ_]))/g; let m;
  while((m=re.exec(s))){
    const fim=m.index; let nivel=0, ini=-1;
    for(let k=fim;k>=0;k--){ if(s[k]===')') nivel++; else if(s[k]==='('){ nivel--; if(nivel===0){ ini=k; break; } } }
    if(ini<0) continue;
    if(ini>0&&/[A-Za-zÀ-ÿ_]/.test(s[ini-1])) continue;   /* era chamada de função: piso(...)d6 não se expande */
    const n=evalFormula(s.slice(ini+1,fim),vars||{});
    if(Number.isNaN(n)) continue;
    const q=Math.max(0,Math.min(300,Math.floor(n)));
    const troca=q===0?'0':(q+'d'+m[1]);
    s=s.slice(0,ini)+troca+s.slice(m.index+m[0].length);
    re.lastIndex=ini+troca.length;
  }
  return s;
}
/* Resolve os termos de dado de uma expressão e devolve total + detalhamento. */
function rollExpr(expr, vars, opts){
  opts=opts||{};
  const detalhes=[]; let erro=null;
  const resolvida=expandeDadosDinamicos(expr,vars).replace(DICE_RE,(m,q,f,expl,keep,k,cmp,alvo)=>{
    let qtd=Math.max(1,parseInt(q||'1')||1);
    const fate=/^f$/i.test(f);
    const faces=fate?3:Math.max(2,parseInt(f)||2);
    /* CRÍTICO: multiplica só a QUANTIDADE DE DADOS, nunca o modificador fixo. */
    if(opts.crit) qtd=qtd*Math.max(1,opts.critMult||2);
    if(qtd>300||faces>1000){ erro='Dados demais ('+m+')'; return '0'; }
    const um=()=>fate?rolarDado(3)-2:rolarDado(faces);
    /* explosão: cada máximo vira mais um dado somado ao mesmo dado (Savage Worlds) */
    let explodiu=0;
    const rolls=Array.from({length:qtd},()=>{
      let v=um(), t=v;
      if(expl&&!fate) while(v===faces&&explodiu<MAX_EXPLOSOES){ explodiu++; v=um(); t+=v; }
      return t;
    });
    let usados=rolls;
    if(keep){
      const kn=Math.max(1,Math.min(qtd,parseInt(k)||1));
      const ord=rolls.slice().sort((a,b)=>a-b);
      usados = keep==='kh'?ord.slice(-kn) : keep==='kl'?ord.slice(0,kn)
             : keep==='dh'?ord.slice(0,Math.max(0,qtd-kn)) : ord.slice(kn);
    }
    let soma=usados.reduce((s,n)=>s+n,0), sucessos=null;
    if(cmp){
      const a=parseInt(alvo);
      const passa=cmp==='>='?(v=>v>=a):cmp==='>'?(v=>v>a):cmp==='<='?(v=>v<=a):(v=>v<a);
      sucessos=usados.filter(passa).length; soma=sucessos;
    }
    detalhes.push({termo:m,faces,fate,rolls,usados:usados.slice(),soma,sucessos,explodiu,alvo:cmp?(cmp+alvo):null});
    return '('+soma+')';
  });
  if(erro) return {erro};
  /* sobrou um "d" seguido de letra que não é F (ex.: 4dX, 2dd6): avisa em vez de calcular errado */
  const sobra=resolvida.match(/(^|[^A-Za-zÀ-ÿ_])\d+d[A-Za-z]/);
  if(sobra) return {erro:'Dado desconhecido em “'+String(expr).trim()+'”. Use 2d6, 4dF, 1d6! ou 5d10>=6.'};
  const total=evalFormula(resolvida, vars||{});
  if(Number.isNaN(total)) return {erro:'Expressão inválida'};
  return {total, detalhes, expr:String(expr==null?'':expr), resolvida, crit:!!opts.crit};
}
/* Vantagem/desvantagem: 2 dados com álgebra própria — NÃO somam e SE CANCELAM.
   vd > 0 vantagem, vd < 0 desvantagem, 0 normal. */
function aplicarVD(expr, vd){
  if(!vd) return String(expr==null?'':expr);
  let feito=false;
  return String(expr==null?'':expr).replace(DICE_RE,(m,q,f,expl,keep,k,cmp)=>{
    if(feito||keep||cmp) return m;      /* só o primeiro termo; não mexe em kh/kl já escrito nem em pool de sucessos */
    feito=true;
    const qtd=Math.max(1,parseInt(q||'1')||1);
    return (qtd+1)+'d'+f+expl+(vd>0?'kh':'kl')+qtd;
  });
}
/* Expressão de um teste (perícia, atributo, ataque) conforme o modo do sistema.
   Devolve {expr, soma}: expr leva os dados; soma é o " + bônus" que vai junto (vazio nos pools). */
function exprDoModo(sys, bonus){
  const f=sys.poolFaces||20;
  if(sys.rollMode==='pool') return {expr:poolExpr(bonus,f), soma:''};
  if(sys.rollMode==='sucessos') return {expr:Math.max(1,Math.floor(bonus||0))+'d'+f+(sys.sucExplode?'!':'')+'>='+(sys.sucAlvo||6), soma:''};
  return {expr:sys.rollBase||'1d20', soma:bonus?(' + '+bonus):''};
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
  return String(expr==null?'':expr).replace(DICE_RE,(m,q,f,expl,keep,k,cmp,alvo)=>{
    if(feito) return m; feito=true;
    const qtd=Math.max(1,parseInt(q||'1')||1);
    const novo=qtd+nd;
    const resto=expl+(keep?(keep+k):'')+(cmp?(cmp+alvo):'');
    if(novo<=0) return cmp?('1d'+f+resto):('2d'+f+expl+'kl1');   /* pool de sucessos nunca fica com menos de 1 dado */
    return novo+'d'+f+resto;
  });
}
function textoRolagem(res){
  if(!res||res.erro) return res&&res.erro?('⚠ '+res.erro):'—';
  return (res.detalhes||[]).map(d=>{
    const descartados=d.rolls.length!==d.usados.length;
    const fmt=v=>d.fate?(v>0?'+':v<0?'−':'0'):(d.explodiu&&v>d.faces?(v+'💥'):String(v));
    return d.termo+' ['+d.rolls.map(fmt).join(', ')+']'+(descartados?(' → '+d.usados.map(fmt).join(' ')):'')
      +(d.sucessos!=null?(' → '+d.sucessos+' sucesso'+(d.sucessos===1?'':'s')):'');
  }).join('  ');
}

