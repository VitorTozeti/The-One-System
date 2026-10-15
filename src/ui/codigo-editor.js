/* ============================================================ EDITOR DE CÓDIGO (efeito por código) ============================================================
   Mesma ideia do campo de fórmula dos recursos (Vida, Mana…), só que para o "efeito por código":
     • realce de cores (comandos fx.* em roxo, textos em verde, números em laranja, comando inexistente sublinhado em vermelho)
     • autocomplete: ao digitar "fx." lista os comandos; dentro das aspas lista os nomes REAIS do sistema (recursos, atributos, perícias…)
     • ⊞ Montar: monte uma linha escolhendo da lista (sem digitar), condições prontas, receitas completas e variáveis
     • avisos em português: erro de sintaxe, comando que não existe, nome de recurso/atributo errado ("você quis dizer…?")
     • prévia automática em 3 degraus (início, meio e máximo) — o que o código aplica em cada nível
   O código recebe `fx` (ver FX_MEMBROS) e roda a cada cálculo da ficha. Valores aceitam número OU fórmula em texto
   ("Nível * 2 + Força"), igual aos campos de fórmula do resto do app. */

/* [nome, tipo, exemplo de argumentos, descrição, de onde vêm os nomes do 1º argumento] */
const FX_MEMBROS=[
  {n:'nivel',p:true,d:'nível atual do personagem'},
  {n:'classe',p:true,d:'nome da classe escolhida'},
  {n:'origem',p:true,d:'nome da origem escolhida'},
  {n:'attr',a:'"Força"',d:'valor do atributo (nome ou sigla)',arg:'attr'},
  {n:'tem',a:'"Voo"',d:'o personagem já tem essa etiqueta/capacidade?',arg:'cap'},
  {n:'formula',a:'"Nível * 2"',d:'calcula uma fórmula do sistema e devolve o número'},
  {n:'atributo',a:'"Força", 2',d:'soma ao valor de um atributo',arg:'attr'},
  {n:'recurso',a:'"Vida", 10',d:'soma ao máximo de um recurso (Vida, Mana…)',arg:'res'},
  {n:'novoRecurso',a:'"Cargas", 3, { icone: "⚡", recarga: "longo" }',d:'cria um recurso especial (vira uma barra na ficha)'},
  {n:'pericia',a:'"Atletismo"',d:'concede uma perícia',arg:'skill'},
  {n:'rolagem',a:'"dano", 2',d:'bônus fixo em: ataque, dano, defesa, pericia, tecnica, todos',arg:'escopo'},
  {n:'dados',a:'"ataque", 1',d:'mais/menos DADOS na rolagem',arg:'escopo'},
  {n:'ataque',a:'2',d:'atalho: bônus nos ataques'},
  {n:'dano',a:'2',d:'atalho: bônus no dano'},
  {n:'defesa',a:'2',d:'atalho: bônus na defesa'},
  {n:'resistencia',a:'"Fogo", 5',d:'reduz dano de um tipo',arg:'dano'},
  {n:'metade',a:'"Fogo"',d:'resistência: ½ do dano do tipo',arg:'dano'},
  {n:'imunidade',a:'"Veneno"',d:'imune a um tipo de dano',arg:'dano'},
  {n:'vulnerabilidade',a:'"Gelo"',d:'toma ×2 de um tipo de dano',arg:'dano'},
  {n:'capacidade',a:'"Voo", 9',d:'capacidade com alcance em metros (Voo, Natação…)',arg:'cap'},
  {n:'tag',a:'"Anfíbio"',d:'etiqueta na ficha'},
  {n:'numero',a:'"Deslocamento", 3',d:'característica numérica (vira variável nas fórmulas)'},
  {n:'tecnicas',a:'1',d:'técnicas de classe extras para escolher'},
  {n:'nota',a:'"texto"',d:'aviso que aparece na ficha'},
];
const FX_NOMES=FX_MEMBROS.map(m=>m.n);
const FX_ARGS={
  attr:sys=>[...(sys.attributes||[]).map(a=>a.name),...(sys.attributes||[]).filter(a=>a.abbr).map(a=>a.abbr)],
  res:sys=>(sys.resources||[]).map(r=>r.name),
  skill:sys=>(sys.skills||[]).map(s=>s.name),
  dano:sys=>[...new Set([...(sys.tags||[]).map(t=>t.name),'Fogo','Frio','Ácido','Elétrico','Veneno','Necrótico','Psíquico','Físico','Corte','Perfuração','Impacto','Sono','Medo','Doença'])],
  cap:()=>(typeof CAPACIDADES!=='undefined'?CAPACIDADES.map(c=>c.n):[]),
  escopo:()=>DICE_ESCOPOS.map(e=>e[0]),
};
const CODIGO_VAZIO='// Escreva aqui. Use o botão ⊞ Montar para inserir comandos sem digitar.\n';

/* ---------- realce ---------- */
function codRealce(src){
  const re=/(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|`(?:\\.|[^`\\])*`?)|(\b\d+(?:\.\d+)?\b)|(\bfx\.[A-Za-z_]\w*)|(\b(?:if|else|for|while|const|let|var|return|function|true|false|null|Math)\b)|([\s\S])/g;
  let out='', m;
  while((m=re.exec(src))){
    if(m[1]) out+='<span class="cd-c">'+esc(m[1])+'</span>';
    else if(m[2]) out+='<span class="cd-s">'+esc(m[2])+'</span>';
    else if(m[3]) out+='<span class="fx-n">'+esc(m[3])+'</span>';
    else if(m[4]){ const nome=m[4].slice(3); out+=FX_NOMES.includes(nome)?'<span class="fx-f">'+esc(m[4])+'</span>':'<span class="fx-x">'+esc(m[4])+'</span>'; }
    else if(m[5]) out+='<span class="cd-k">'+esc(m[5])+'</span>';
    else out+=esc(m[6]);
  }
  return out+'\n ';
}

/* ---------- erros em português ---------- */
function traduzErroJs(msg){
  const m=String(msg||'');
  let r;
  if((r=m.match(/^(\w[\w.]*) is not defined/))) return '“'+r[1]+'” não existe. Textos vão entre aspas ("Vida"); comandos começam com fx.';
  if((r=m.match(/^(?:fx\.)?(\w+) is not a function/))||(r=m.match(/fx\.(\w+) is not a function/))) return 'O comando fx.'+r[1]+' não existe. Veja a lista em ⊞ Montar → Comandos.';
  if(/missing \) after argument list/.test(m)) return 'Falta fechar um parêntese ")" — ou uma vírgula entre os valores.';
  if(/Unexpected end of input/.test(m)) return 'O código termina antes da hora: falta fechar uma chave "}" ou um parêntese ")".';
  if((r=m.match(/Unexpected identifier '?(\w+)'?/))) return 'Algo fora do lugar perto de “'+r[1]+'”: falta um ";" ou um operador antes?';
  if(/Unexpected token '?([^']*)'?/.test(m)) return 'Símbolo fora do lugar ('+(m.match(/Unexpected token '?([^']*)'?/)||[])[1]+'): confira parênteses, chaves e vírgulas.';
  if(/Invalid or unexpected token/.test(m)) return 'Há um caractere inválido ou aspas sem fechar.';
  if(/Unexpected string/.test(m)) return 'Um texto entre aspas apareceu onde não devia — falta uma vírgula antes?';
  if(/Assignment to constant/.test(m)) return 'Você tentou mudar uma constante (const). Use let.';
  return m;
}
/* acrescenta "(linha N)" quando o navegador informa a posição */
function msgErroCodigo(e){
  const msg=traduzErroJs(e&&e.message||e);
  const st=String(e&&e.stack||''); const m=st.match(/<anonymous>:(\d+):\d+/);
  const lin=m?(+m[1]-3):0;
  return lin>0?(msg+' (linha '+lin+')'):msg;
}

/* ---------- diagnóstico estático: o que o código tem de errado ANTES de rodar ---------- */
function codigoDiagnosticos(sys,src){
  const out=[]; if(!String(src||'').trim()) return out;
  const cc=compilarCodigo(src);
  if(cc.erro) out.push({msg:traduzErroJs(cc.erro)});
  const limpo=String(src).replace(/\/\/[^\n]*/g,m=>' '.repeat(m.length)).replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' '));
  let m; const re=/\bfx\.([A-Za-z_]\w*)/g; const vistos=new Set();
  while((m=re.exec(limpo))){
    const n=m[1]; if(FX_NOMES.includes(n)||vistos.has(n)) continue; vistos.add(n);
    const sug=palavraParecida(n,FX_NOMES);
    out.push({msg:'fx.'+n+' não existe.'+(sug?' Você quis dizer fx.'+sug+'?':' Veja a lista em ⊞ Montar → Comandos.'),fix:sug?{de:'fx.'+n,para:'fx.'+sug}:null});
  }
  /* nomes dentro das aspas: o motor ignoraria em silêncio — aqui avisamos */
  const lista={attr:['atributo',sys.attributes],atributo:['atributo',sys.attributes],recurso:['recurso',sys.resources],pericia:['perícia',sys.skills]};
  const re2=/\bfx\.(attr|atributo|recurso|pericia)\(\s*(["'])((?:(?!\2).)*)\2/g;
  while((m=re2.exec(limpo))){
    const [tipo,arr]=lista[m[1]]; const nome=m[3];
    if(_acha(arr,nome)) continue;
    const cands=(arr||[]).flatMap(x=>[x.name,x.abbr]).filter(Boolean);
    const sug=palavraParecida(nome,cands);
    out.push({msg:'Não achei '+(tipo==='perícia'?'a ':'o ')+tipo+' “'+nome+'” no sistema.'+(sug?' Você quis dizer “'+sug+'”?':''),
      fix:sug?{de:m[2]+nome+m[2],para:m[2]+sug+m[2]}:null});
  }
  return out;
}

/* ---------- prévia: o que o código faz num nível ---------- */
function codigoResumo(sys,ef,lv){
  const d=sampleDraft(sys,lv); const B=novoBalde();
  B.ctx={sys:{...sys,codigoBloqueado:false},d,tot1:{...d.attrs},level:d.level,fonte:ef.text||'teste'};
  rodarEfeitoCodigo(ef,B,1);
  const r=[];
  Object.keys(B.attrBonus).forEach(id=>{const a=sys.attributes.find(x=>x.id===id); r.push(sign(B.attrBonus[id])+' '+(a?a.name:'?'));});
  Object.keys(B.resBonus).forEach(id=>{const x=sys.resources.find(q=>q.id===id); r.push(sign(B.resBonus[id])+' '+(x?x.name:'?')+' (máx)');});
  B.novosRec.forEach(x=>r.push((x.icon||'✨')+' recurso '+x.name+' '+x.max));
  Object.keys(B.rollBonus).forEach(k=>r.push('⚔ '+sign(B.rollBonus[k])+' '+((DICE_ESCOPOS.find(e=>e[0]===k)||[,k])[1]).toLowerCase()));
  Object.keys(B.diceMod).forEach(k=>r.push('🎲 '+sign(B.diceMod[k])+'d '+k));
  Object.keys(B.resist).forEach(k=>r.push(resistResumo(k,B.resist[k]).t));
  Object.keys(B.caps).forEach(k=>r.push(capInfo(k).ic+' '+k+(B.caps[k]?' '+B.caps[k]:'')));
  B.charTags.forEach(t=>r.push('🏷 '+t)); Object.keys(B.charNum).forEach(k=>r.push('◆ '+k+' '+sign(B.charNum[k])));
  B.grantedSkills.forEach(id=>{const s=sys.skills.find(x=>x.id===id); r.push('🎯 '+(s?s.name:'perícia'));});
  if(B.techExtra) r.push('🌀 '+sign(B.techExtra)+' técnica(s)');
  B.notas.forEach(n=>r.push('📝 '+n.t));
  return {itens:r,erros:B.erros,nivel:d.level};
}

/* ---------- receitas completas, já com os nomes do sistema ---------- */
function codigoReceitas(sys){
  const nome=(lista,nomes,pad)=>((_acha2(lista,nomes)||{}).name)||pad;
  const V=nome(sys.resources,_V,'Vida'), M=nome(sys.resources,_M,'Mana');
  const A1=(sys.attributes[0]||{}).name||'Força', A2=(sys.attributes[1]||sys.attributes[0]||{}).name||'Mente';
  return [
    ['❤ Mais '+V+' por nível','// +2 de '+V+' por nível do personagem\nfx.recurso("'+V+'", fx.nivel * 2);'],
    ['🛡 Defesa que cresce','// +1 de defesa e mais 1 a cada 3 níveis\nfx.defesa(1 + Math.floor(fx.nivel / 3));'],
    ['🔷 '+M+' pelo atributo','// '+M+' extra = 2 × '+A2+'\nfx.recurso("'+M+'", fx.attr("'+A2+'") * 2);'],
    ['✨ Recurso especial (cargas)','// Cria uma barra "Cargas" na ficha, com recarga no descanso longo\nfx.novoRecurso("Cargas", 3, { icone: "⚡", cor: "#f59e0b", recarga: "longo" });'],
    ['🔥 Dano que escala','// +1 de dano a cada 4 níveis\nfx.dano(Math.floor(fx.nivel / 4));'],
    ['🪽 Voo a partir do nível 5','if (fx.nivel >= 5) {\n  fx.capacidade("Voo", 9);\n  fx.nota("Pode voar.");\n}'],
    ['⚔ Fúria (dano + resistência)',CODIGO_EXEMPLO],
    ['🧮 Fórmula dentro do código','// fx.formula usa a mesma linguagem das fórmulas de recurso\nfx.recurso("'+V+'", fx.formula("'+A1+' * 2 + Nível"));'],
    ['🎯 Só para uma classe','if (fx.classe === "Guerreiro") {\n  fx.ataque(2);\n}'],
    ['🏷 Etiqueta + aviso','fx.tag("Abençoado");\nfx.nota("Recebe a bênção do templo: +1 em tudo.");\nfx.rolagem("todos", 1);'],
  ];
}
function _acha2(lista,nomes){ for(const n of nomes){ const r=_acha(lista,n); if(r) return r; } return null; }

/* ---------- comando guiado: monta UMA linha escolhendo da lista ---------- */
const FX_GUIADOS=[
  ['recurso','❤ Mais máximo de um recurso (Vida, Mana…)','res'],
  ['novoRecurso','✨ Criar recurso especial (barra nova)',''],
  ['atributo','💪 Bônus de atributo','attr'],
  ['rolagem','⚔ Bônus em rolagem (ataque, dano, defesa…)','escopo'],
  ['dados','🎲 Mais/menos dados','escopo'],
  ['resistencia','🛡 Resistência (reduz dano)','dano'],
  ['metade','🛡 Resistência (metade do dano)','dano'],
  ['imunidade','🛡 Imunidade','dano'],
  ['vulnerabilidade','💥 Vulnerabilidade','dano'],
  ['capacidade','🪽 Capacidade (voo, natação…)','cap'],
  ['pericia','🎯 Conceder perícia','skill'],
  ['tag','🏷 Etiqueta',''],
  ['nota','📝 Aviso na ficha',''],
  ['tecnicas','🌀 Técnicas extras',''],
];
const _q=s=>JSON.stringify(String(s));
function linhaGuiada(cmd,a,b,extra){
  const num=v=>{ v=String(v==null?'':v).trim(); if(v==='') return '1'; return /^-?\d+(\.\d+)?$/.test(v)?v:(/^fx\.|Math\./.test(v)?v:_q(v)); };
  switch(cmd){
    case 'novoRecurso': return 'fx.novoRecurso('+_q(a||'Cargas')+', '+num(b||3)+', { icone: '+_q((extra&&extra.icone)||'⚡')+', recarga: '+_q((extra&&extra.recarga)||'longo')+' });';
    case 'metade': case 'imunidade': case 'vulnerabilidade': case 'pericia': case 'tag': case 'nota': return 'fx.'+cmd+'('+_q(a||'')+');';
    case 'tecnicas': return 'fx.tecnicas('+num(a||1)+');';
    default: return 'fx.'+cmd+'('+_q(a||'')+', '+num(b)+');';
  }
}

/* ---------- o editor ---------- */
function codigoEditor(sys,ef,kindSel,del){
  if(ef.code==null) ef.code=CODIGO_EXEMPLO;
  const caixa=h('div',{class:'cd-box'});
  const hl=h('pre',{class:'cd-hl','aria-hidden':'true'});
  const ta=h('textarea',{class:'cd-in',spellcheck:'false',wrap:'off','aria-label':'Código do efeito',value:ef.code,placeholder:CODIGO_VAZIO});
  const sug=h('div',{class:'cd-sug hide',role:'listbox'});
  const diag=h('div',{class:'cd-diag hide'});
  const prev=h('div',{class:'cd-prev'});
  const painel=h('div',{class:'fx-mont cd-mont hide'});
  let itens=[], iSug=0, tmr=null;

  const linhas=()=>ta.value.split('\n').length;
  const ajustaAltura=()=>{ ta.rows=Math.max(7,Math.min(24,linhas()+1)); };
  const pintar=()=>{ hl.innerHTML=codRealce(ta.value); hl.scrollTop=ta.scrollTop; hl.scrollLeft=ta.scrollLeft; };
  const salvar=()=>{ ef.code=ta.value; persist(); };

  /* --- diagnóstico + prévia (com um respiro, para não rodar a cada tecla) --- */
  const analisar=()=>{
    const ds=codigoDiagnosticos(sys,ta.value);
    diag.innerHTML=''; diag.className='cd-diag'+(ds.length?'':' hide');
    ds.forEach(x=>{
      const l=h('div',{class:'cd-di'},'⚠ '+x.msg);
      if(x.fix) l.appendChild(h('button',{type:'button',onclick:()=>{ ta.value=ta.value.replace(x.fix.de,x.fix.para); salvar(); pintar(); analisar(); ta.focus(); }},'usar “'+x.fix.para.replace(/^fx\./,'fx.').replace(/^["']|["']$/g,'')+'”'));
      diag.appendChild(l); });
    prev.innerHTML='';
    if(sys.codigoBloqueado){ prev.appendChild(h('div',{class:'hint'},'Prévia indisponível enquanto o código estiver bloqueado.')); return; }
    if(!ta.value.trim()){ prev.appendChild(h('div',{class:'hint'},'Vazio.')); return; }
    const lo=sys.startLevel||1, hi=Math.max(lo,sys.maxLevel||lo), mid=Math.round((lo+hi)/2);
    const pts=[...new Set([lo,mid,hi])];
    prev.appendChild(h('div',{class:'cd-prev-t'},'O que o código aplica em cada '+(sys.levelName||'nível').toLowerCase()+':'));
    const rs=pts.map(lv=>{ try{ return codigoResumo(sys,{...ef,code:ta.value},lv); }catch(e){ return {itens:[],erros:[msgErroCodigo(e)],nivel:lv}; } });
    const errTxt=r=>r.erros.join(' · ');
    if(rs.every(r=>r.erros.length&&errTxt(r)===errTxt(rs[0]))){            /* o mesmo erro em todos os degraus: uma linha só */
      prev.appendChild(h('div',{class:'cd-pl erro'},h('b',{},'Em todos'),h('span',{},'⚠ '+errTxt(rs[0]))));
      return; }
    rs.forEach((r,i)=>prev.appendChild(h('div',{class:'cd-pl'+(r.erros.length?' erro':'')},
      h('b',{},levelLabel(sys,pts[i])),
      h('span',{}, r.erros.length?('⚠ '+errTxt(r)):(r.itens.length?r.itens.join('  ·  '):'não aplica nada neste nível')))));
  };
  const agenda=()=>{ clearTimeout(tmr); tmr=setTimeout(analisar,260); };

  /* --- inserir texto no cursor --- */
  const inserir=(txt,opts)=>{
    opts=opts||{};
    const a=ta.selectionStart, b=ta.selectionEnd;
    let antes=ta.value.slice(0,a), depois=ta.value.slice(b);
    if(opts.linha){ if(antes&&!antes.endsWith('\n')) txt='\n'+txt; if(depois&&!depois.startsWith('\n')) txt=txt+'\n'; }
    ta.value=antes+txt+depois; const pos=(antes+txt).length;
    ta.focus(); ta.setSelectionRange(pos,pos); ajustaAltura(); salvar(); pintar(); analisar();
  };
  const colocarCodigo=txt=>{
    const v=ta.value.trim();
    if(!v||v===CODIGO_EXEMPLO.trim()||v.startsWith('// Escreva aqui')) ta.value=txt+'\n'; else ta.value=ta.value.replace(/\s*$/,'')+'\n\n'+txt+'\n';
    ajustaAltura(); salvar(); pintar(); analisar(); ta.focus(); ta.setSelectionRange(ta.value.length,ta.value.length);
  };

  /* --- autocomplete --- */
  const fecharSug=()=>{ sug.className='cd-sug hide'; sug.innerHTML=''; itens=[]; };
  const antesDoCursor=()=>ta.value.slice(0,ta.selectionStart);
  const abrirSug=()=>{
    const ant=antesDoCursor(); let lista=null, ini=0, ctxTxt='';
    let m=ant.match(/\bfx\.(\w*)$/);
    if(m){ const t=m[1].toLowerCase(); ini=ant.length-m[1].length;
      lista=FX_MEMBROS.filter(x=>x.n.toLowerCase().startsWith(t)).map(x=>({v:x.n+(x.p?'':'('),t:x.n,tp:x.p?'valor':('fx.'+x.n+'('+(x.a||'')+')'),dsc:x.d,membro:true})); }
    else{
      m=ant.match(/\bfx\.(\w+)\(\s*(["'])([^"'\n]*)$/);
      if(m){ const mem=FX_MEMBROS.find(x=>x.n===m[1]); const fonte=mem&&mem.arg&&FX_ARGS[mem.arg];
        if(fonte){ const t=semAcento(m[3]); ini=ant.length-m[3].length; ctxTxt=m[2];
          lista=[...new Set(fonte(sys))].filter(n=>n&&semAcento(n).startsWith(t)).map(n=>({v:n,t:n,tp:mem.arg==='res'?'recurso':mem.arg==='attr'?'atributo':mem.arg==='skill'?'perícia':mem.arg==='dano'?'tipo de dano':mem.arg==='cap'?'capacidade':'escopo',aspas:ctxTxt})); } } }
    if(!lista||!lista.length){ fecharSug(); return; }
    itens=lista.slice(0,9).map(x=>({...x,ini})); iSug=0; sug.className='cd-sug'; sug.innerHTML='';
    itens.forEach((it,i)=>sug.appendChild(h('button',{type:'button',role:'option',class:i===0?'foco':'',onmousedown:e=>{ e.preventDefault(); aceitar(i); }},
      h('span',{class:'cd-sn'},it.t), h('span',{class:'tp'},it.dsc?(it.tp+' — '+it.dsc):it.tp))));
  };
  const aceitar=i=>{
    const it=itens[i]; if(!it) return;
    const fim=ta.selectionStart; let ins=it.v;
    if(it.aspas&&ta.value[fim]!==it.aspas) ins+=it.aspas;
    ta.value=ta.value.slice(0,it.ini)+ins+ta.value.slice(fim);
    const pos=it.ini+ins.length; ta.focus(); ta.setSelectionRange(pos,pos);
    fecharSug(); ajustaAltura(); salvar(); pintar(); analisar();
    if(it.membro&&it.v.endsWith('(')) abrirSug();
  };

  ta.addEventListener('input',()=>{ ajustaAltura(); salvar(); pintar(); agenda(); abrirSug(); });
  ta.addEventListener('scroll',()=>{ hl.scrollTop=ta.scrollTop; hl.scrollLeft=ta.scrollLeft; });
  ta.addEventListener('blur',()=>{ fecharSug(); clearTimeout(tmr); analisar(); });
  ta.addEventListener('keydown',e=>{
    if(itens.length){
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); iSug=(iSug+(e.key==='ArrowDown'?1:itens.length-1))%itens.length;
        [...sug.children].forEach((b,i)=>b.className=(i===iSug?'foco':'')); return; }
      if(e.key==='Enter'||e.key==='Tab'){ e.preventDefault(); aceitar(iSug); return; }
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); fecharSug(); return; }
    }
    if(e.key==='Tab'){ e.preventDefault(); inserir('  '); return; }
    if(e.key==='Enter'){            /* mantém a indentação (e abre um nível depois de "{") */
      e.preventDefault();
      const ant=antesDoCursor(), linha=ant.slice(ant.lastIndexOf('\n')+1), ind=(linha.match(/^\s*/)||[''])[0];
      inserir('\n'+ind+(/\{\s*$/.test(linha)?'  ':'')); }
  });

  /* --- ⊞ Montar --- */
  const chip=(rot,txt,cls,sub,aoClicar)=>h('button',{type:'button',class:'fx-chip '+(cls||''),title:sub||'',onclick:aoClicar||(()=>inserir(txt))},sub?h('span',{},rot,h('small',{},sub)):rot);
  const guiado=()=>{
    const est=S.ui.cdGuia||(S.ui.cdGuia={cmd:'recurso',a:'',b:'',ic:'⚡',rec:'longo'});
    const def=FX_GUIADOS.find(x=>x[0]===est.cmd)||FX_GUIADOS[0];
    const comando=h('select',{class:'in','aria-label':'O que fazer',onchange:e=>{ est.cmd=e.target.value; est.a=''; est.b=''; monta(); }});
    FX_GUIADOS.forEach(([v,l])=>{ const o=h('option',{value:v},l); if(v===est.cmd) o.selected=true; comando.appendChild(o); });
    const alvo=h('div',{class:'row wrapf'});
    const nomes=def[2]?[...new Set(FX_ARGS[def[2]](sys))]:null;
    const campoNome=(ph)=>{
      if(!nomes) return h('input',{class:'in',style:{maxWidth:'200px'},placeholder:ph,value:est.a,'aria-label':ph,oninput:e=>{est.a=e.target.value;}});
      const lid='cdl-'+uid(); const i=h('input',{class:'in',style:{maxWidth:'200px'},list:lid,placeholder:ph,value:est.a,'aria-label':ph,oninput:e=>{est.a=e.target.value;}});
      return h('span',{},i,h('datalist',{id:lid},...nomes.map(n=>h('option',{value:n}))));
    };
    const valor=ph=>h('input',{class:'in mono',style:{maxWidth:'190px'},placeholder:ph,value:est.b,'aria-label':'Valor',title:'Número ou fórmula: 5 · Nível * 2 · Força / 2 · fx.nivel * 2',oninput:e=>{est.b=e.target.value;}});
    if(['metade','imunidade','vulnerabilidade','pericia'].includes(est.cmd)) alvo.appendChild(campoNome({metade:'Tipo (ex.: Fogo)',imunidade:'Tipo (ex.: Veneno)',vulnerabilidade:'Tipo (ex.: Gelo)',pericia:'Perícia'}[est.cmd]));
    else if(est.cmd==='tag') alvo.appendChild(campoNome('Etiqueta (ex.: Abençoado)'));
    else if(est.cmd==='nota') alvo.appendChild(h('input',{class:'in',style:{flex:'1',minWidth:'220px'},placeholder:'Texto que aparece na ficha',value:est.a,'aria-label':'Texto',oninput:e=>{est.a=e.target.value;}}));
    else if(est.cmd==='tecnicas') alvo.appendChild(valor('1'));
    else if(est.cmd==='novoRecurso'){
      alvo.appendChild(campoNome('Nome (ex.: Cargas)')); alvo.appendChild(valor('Máximo: 3 ou Nível'));
      alvo.appendChild(iconePicker(est.ic,v=>{est.ic=v||'⚡';monta();},{cls:'ip-mini',semRemover:true}));
      const rs=h('select',{class:'in',style:{maxWidth:'170px'},'aria-label':'Recarga',onchange:e=>{est.rec=e.target.value;}});
      [['longo','🌙 Descanso longo'],['curto','☕ Descanso curto'],['nunca','Não recarrega']].forEach(([v,l])=>{const o=h('option',{value:v},l);if(v===est.rec)o.selected=true;rs.appendChild(o);});
      alvo.appendChild(rs);
    } else { alvo.appendChild(campoNome(def[2]==='res'?'Recurso':def[2]==='attr'?'Atributo':def[2]==='escopo'?'Onde (ataque, dano…)':def[2]==='dano'?'Tipo (ex.: Fogo)':'Nome (ex.: Voo)')); alvo.appendChild(valor('Valor: 5 ou Nível * 2')); }
    return h('div',{},
      h('div',{class:'fx-grp'},'Montar uma linha (escolha, não digite)'),
      h('div',{class:'row wrapf'},comando,alvo,
        h('button',{type:'button',class:'btn sm primary',onclick:()=>inserir(linhaGuiada(est.cmd,est.a,est.b,{icone:est.ic,recarga:est.rec}),{linha:true})},'↳ Inserir linha')),
      h('div',{class:'hint',style:{marginTop:'4px'}},'O valor aceita número ou fórmula em texto ("Nível * 2"). Os nomes são conferidos com os do seu sistema.'));
  };
  const monta=()=>{
    painel.innerHTML='';
    painel.appendChild(guiado());
    painel.appendChild(h('div',{class:'fx-grp'},'Condições — clique para inserir'));
    painel.appendChild(h('div',{class:'fx-chips'},
      chip('se nível ≥ N','if (fx.nivel >= 5) {\n  \n}','fn','a partir do nível N'),
      chip('se atributo ≥ N','if (fx.attr("'+((sys.attributes[0]||{}).name||'Força')+'") >= 14) {\n  \n}','fn','se um atributo for alto'),
      chip('se for da classe','if (fx.classe === "Guerreiro") {\n  \n}','fn','só para uma classe'),
      chip('se for da origem','if (fx.origem === "Elfo") {\n  \n}','fn','só para uma origem'),
      chip('se já tem','if (fx.tem("Voo")) {\n  \n}','fn','se já tiver a capacidade/etiqueta'),
      chip('a cada N níveis','Math.floor(fx.nivel / 3)','',' ex.: +1 a cada 3 níveis')));
    painel.appendChild(h('div',{class:'fx-grp'},'Receitas prontas (já com os nomes do seu sistema)'));
    painel.appendChild(h('div',{class:'fx-chips'},...codigoReceitas(sys).map(([rot,txt])=>
      h('button',{type:'button',class:'fx-chip pr',title:txt,onclick:()=>colocarCodigo(txt)},h('span',{},rot,h('small',{},txt.split('\n').find(l=>!l.startsWith('//'))||txt.split('\n')[0]))))));
    painel.appendChild(h('div',{class:'fx-grp'},'Variáveis'));
    painel.appendChild(h('div',{class:'fx-chips'},
      chip('fx.nivel','fx.nivel','','nível'), chip('fx.classe','fx.classe','','classe'), chip('fx.origem','fx.origem','','origem'),
      ...(sys.attributes||[]).slice(0,10).map(a=>chip('fx.attr("'+a.name+'")','fx.attr("'+a.name+'")','','= '+(Number.isFinite(varsNoDegrau(sys,sys.maxLevel||1)[a.name])?varsNoDegrau(sys,sys.maxLevel||1)[a.name]:'?')))));
    painel.appendChild(h('details',{class:'cd-todos'},
      h('summary',{},'Todos os comandos (clique para inserir com um exemplo)'),
      h('div',{class:'cd-api'},...FX_MEMBROS.filter(x=>!x.p).map(x=>
        h('button',{type:'button',class:'cd-api-i',onclick:()=>inserir('fx.'+x.n+'('+(x.a||'')+');',{linha:true})},
          h('code',{},'fx.'+x.n+'('+(x.a||'')+')'),h('span',{},x.d))))));
  };
  const montarBtn=h('button',{class:'btn sm ghost',type:'button','aria-expanded':'false',onclick:()=>{
    const abrir=painel.classList.contains('hide'); if(abrir) monta();
    painel.className='fx-mont cd-mont'+(abrir?'':' hide'); montarBtn.textContent=abrir?'⊟ Fechar':'⊞ Montar'; montarBtn.setAttribute('aria-expanded',abrir?'true':'false'); }},'⊞ Montar');

  caixa.appendChild(hl); caixa.appendChild(ta); caixa.appendChild(sug);
  ajustaAltura(); pintar(); setTimeout(analisar,0);
  return h('div',{class:'cod'},
    h('div',{class:'ef-row'}, kindSel,
      h('input',{class:'in',style:{flex:'1',minWidth:'180px'},value:ef.text||'',placeholder:'Nome do efeito (aparece na ficha)',oninput:e=>{ef.text=e.target.value;persist();},onchange:()=>render()}), del),
    sys.codigoBloqueado?h('div',{class:'aviso-aba'},'⚠ Este sistema veio de um arquivo importado: efeitos por código estão BLOQUEADOS até você ler o código e liberar na aba Classes.'):null,
    caixa,
    h('div',{class:'row wrapf cd-bar'}, montarBtn,
      h('span',{class:'hint'},'Digite fx. para ver os comandos · valores aceitam número ou fórmula ("Nível * 2")')),
    diag, painel, prev);
}
