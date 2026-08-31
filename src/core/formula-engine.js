/* ============================================================ MOTOR DE FÓRMULAS ============================================================
   Aceita: números, variáveis (inclusive com espaço e acento), + - * / %,
   parênteses, comparações, "e"/"ou", e funções.
   As variáveis são resolvidas no tokenizador, casando o nome MAIS LONGO e
   exigindo fronteira de palavra — trocar texto por regex quebraria max()
   se algum atributo se chamasse "Ma". */
const FORM_FN={
  min:(...a)=>Math.min(...a), max:(...a)=>Math.max(...a),
  menor:(...a)=>Math.min(...a), maior:(...a)=>Math.max(...a),
  arredondar:(x)=>Math.round(x), round:(x)=>Math.round(x),
  piso:(x)=>Math.floor(x), floor:(x)=>Math.floor(x),
  teto:(x)=>Math.ceil(x), ceil:(x)=>Math.ceil(x),
  abs:(x)=>Math.abs(x), modulo:(a,b)=>b===0?0:a%b,
  se:(c,a,b)=>c?a:(b===undefined?0:b), if:(c,a,b)=>c?a:(b===undefined?0:b),
};
const FORM_FN_NOMES=Object.keys(FORM_FN);
const ehLetra=c=>/[a-zA-Z0-9_@.À-ÿ]/.test(c);
function tokenize(str, nomesVars){
  const t=[]; let i=0;
  const s=String(str==null?'':str);
  while(i<s.length){
    const c=s[i];
    if(c===' '||c==='\t'||c==='\n'){ i++; continue; }
    if(/[0-9]/.test(c) || (c==='.'&&/[0-9]/.test(s[i+1]||''))){
      let n=''; while(i<s.length&&/[0-9.]/.test(s[i])) n+=s[i++];
      t.push({t:'n',v:parseFloat(n)}); continue;
    }
    const dois=s.slice(i,i+2);
    if(['>=','<=','==','!=','&&','||'].includes(dois)){ t.push({t:'o',v:dois}); i+=2; continue; }
    if('+-*/%(),<>!'.includes(c)){ t.push({t:'o',v:c}); i++; continue; }
    if(ehLetra(c)){
      /* Função vence variável quando vier seguida de "(" — senão um atributo
         chamado "Se" ou "Max" impediria de usar se() / max(). */
      let fn=null;
      for(const nome of FORM_FN_NOMES){
        if(s.substr(i,nome.length).toLowerCase()===nome && !ehLetra(s[i+nome.length]||'')){
          let j=i+nome.length; while(j<s.length&&s[j]===' ') j++;
          if(s[j]==='('){ fn=nome; break; }
        }
      }
      if(fn){ t.push({t:'w',v:fn}); i+=fn.length; continue; }
      /* tenta casar um nome de variável (a lista já vem do mais longo p/ o mais curto) */
      let casou=null;
      for(const n of nomesVars){
        if(!n) continue;
        if(s.substr(i,n.length).toLowerCase()===n.toLowerCase()){
          const depois=s[i+n.length];
          const antes=s[i-1];
          if((!depois||!ehLetra(depois)) && (!antes||!ehLetra(antes))){ casou=n; break; }
        }
      }
      if(casou){ t.push({t:'v',v:casou}); i+=casou.length; continue; }
      let w=''; while(i<s.length&&ehLetra(s[i])) w+=s[i++];
      t.push({t:'w',v:w.toLowerCase()}); continue;
    }
    throw 0;
  }
  return t;
}
function parseTokens(t, vars){
  let p=0;
  const fim=()=>p>=t.length;
  const ehOp=v=>{ const k=t[p]; return !!k&&k.t==='o'&&k.v===v; };
  const ehPal=v=>{ const k=t[p]; return !!k&&k.t==='w'&&k.v===v; };
  function expr(){ return ouE(); }
  function ouE(){ let a=eE(); while(ehOp('||')||ehPal('ou')){ p++; const b=eE(); a=(a||b)?1:0; } return a; }
  function eE(){ let a=cmp(); while(ehOp('&&')||ehPal('e')){ p++; const b=cmp(); a=(a&&b)?1:0; } return a; }
  function cmp(){
    let a=add(); const k=t[p];
    if(k&&k.t==='o'&&['>','<','>=','<=','==','!='].includes(k.v)){
      p++; const b=add();
      return k.v==='>'?(a>b?1:0):k.v==='<'?(a<b?1:0):k.v==='>='?(a>=b?1:0):
             k.v==='<='?(a<=b?1:0):k.v==='=='?(a===b?1:0):(a!==b?1:0);
    }
    return a;
  }
  function add(){ let a=mul(); while(ehOp('+')||ehOp('-')){ const o=t[p++].v; const b=mul(); a=(o==='+')?a+b:a-b; } return a; }
  function mul(){ let a=un(); while(ehOp('*')||ehOp('/')||ehOp('%')){ const o=t[p++].v; const b=un();
    a = o==='*' ? a*b : (b===0?0:(o==='/'?a/b:a%b)); } return a; }
  function un(){ if(ehOp('-')){ p++; return -un(); } if(ehOp('+')){ p++; return un(); } if(ehOp('!')){ p++; return un()?0:1; } return prim(); }
  function prim(){
    if(fim()) throw 0;
    const k=t[p++];
    if(k.t==='n') return k.v;
    if(k.t==='v') return Number(vars[k.v])||0;
    if(k.t==='w'){
      const f=FORM_FN[k.v];
      if(!f || !ehOp('(')) throw 0;          /* palavra desconhecida = fórmula inválida */
      p++;
      const args=[];
      if(!ehOp(')')){ args.push(expr()); while(ehOp(',')){ p++; args.push(expr()); } }
      if(!ehOp(')')) throw 0; p++;
      return f(...args);
    }
    if(k.t==='o'&&k.v==='('){ const v=expr(); if(!ehOp(')')) throw 0; p++; return v; }
    throw 0;
  }
  const v=expr();
  if(!fim()) throw 0;
  return v;
}
function evalFormula(f, vars){
  const v=vars||{};
  try{
    const nomes=Object.keys(v).sort((a,b)=>b.length-a.length);
    const r=parseTokens(tokenize(f, nomes), v);
    return Number.isFinite(r)?Math.floor(r):NaN;
  }catch(e){ return NaN; }
}
/* mantido para compatibilidade com fórmulas sem variáveis */
function evalArith(str){ return parseTokens(tokenize(str,[]), {}); }
function effAttr(sys, raw){
  if(sys.attrMode==='modificador'){ const m=evalFormula(sys.modFormula||'(V - 10) / 2',{V:raw}); return Number.isFinite(m)?m:raw; }
  return raw;
}

