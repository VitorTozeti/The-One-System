/* ============================================================ CAMPO DE FÓRMULA ============================================================
   Uma peça só resolve os sete problemas do item 19 ao 25: realce, autocomplete,
   construtor por chips, lista de variáveis, prévia em 3 pontos, erro específico
   e fórmulas prontas. Todo campo de fórmula do app passa a usar isto.

   O realce é um espelho: um <div> colorido embaixo e o <input> por cima com o
   texto transparente. Precisam ter EXATAMENTE a mesma fonte, padding e borda —
   qualquer diferença desalinha as cores do texto real. */

/* Valor representativo de um atributo no degrau lv — serve só para a prévia. */
function attrNoDegrau(sys,lv){
  const a=sys.startLevel||1, b=sys.maxLevel||1;
  const t=(b>a)?((lv-a)/(b-a)):1;
  return Math.round((sys.startAttrValue||0)+((sys.attrMax||0)-(sys.startAttrValue||0))*t);
}
/* Variáveis visíveis num degrau: atributos, o eixo, recursos e colunas da tabela. */
function varsNoDegrau(sys,lv){
  const v={}, av=effAttr(sys,attrNoDegrau(sys,lv));
  v['Nível']=lv; v['Nivel']=lv; v[sys.levelName||'Nível']=lv;
  (sys.attributes||[]).forEach(a=>{ if(a.name) v[a.name]=av; });
  const prog=sys.progression||{}; const row=(prog.rows||{})[lv]||{};
  (prog.cols||[]).forEach(c=>{ if(c.tipo!=='num'||!c.name) return;
    const n=Number(row[c.id]); if(Number.isFinite(n)) v[c.name]=n; });
  (sys.resources||[]).forEach(r=>{ if(!r.name) return;
    const n=evalFormula(r.formula,v); if(!Number.isNaN(n)) v[r.name]=n; });
  return v;
}
/* Os 3 pontos da prévia (item 22): degrau inicial, meio e máximo. */
function pontosPadrao(sys){
  const a=sys.startLevel||1, b=sys.maxLevel||1, m=Math.round((a+b)/2);
  const uns=[...new Set([a,m,b])];
  return uns.map(lv=>({rot:levelLabel(sys,lv), vars:varsNoDegrau(sys,lv)}));
}
/* nomes de variável ordenados do mais longo para o mais curto (exigência do tokenize) */
function nomesDeVars(vars){ return Object.keys(vars).sort((a,b)=>b.length-a.length); }

/* distância de edição curta — só para sugerir "você quis dizer" */
function distancia(a,b){
  a=semAcento(a); b=semAcento(b);
  const m=[];
  for(let i=0;i<=b.length;i++){ m[i]=[i]; }
  for(let j=0;j<=a.length;j++){ m[0][j]=j; }
  for(let i=1;i<=b.length;i++) for(let j=1;j<=a.length;j++)
    m[i][j]=b[i-1]===a[j-1] ? m[i-1][j-1]
      : Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1);
  return m[b.length][a.length];
}
function palavraParecida(alvo,lista){
  let melhor=null, d=99;
  lista.forEach(n=>{ const x=distancia(alvo,n); if(x<d){ d=x; melhor=n; } });
  return (melhor && d<=Math.max(2,Math.floor(melhor.length/3))) ? melhor : null;
}
/* Diagnóstico do texto (item 23): devolve {ok, msg, sugestao:{de,para}} */
function analisarFormula(expr,vars){
  const s=String(expr||'');
  if(!s.trim()) return {ok:true, vazio:true};
  const nomes=nomesDeVars(vars);
  let toks;
  try{ toks=tokenize(s,nomes); }
  catch(e){
    const ruim=(s.match(/[^\wÀ-ÿ\s+\-*/%().,<>=!&|]/)||[])[0];
    return {ok:false, msg:ruim?('O símbolo “'+ruim+'” não vale numa fórmula.')
                            :'Não consegui ler essa fórmula.'};
  }
  /* palavra que não é função nem variável = variável inexistente */
  const desconhecida=toks.find(t=>t.t==='w'&&!FORM_FN_NOMES.includes(t.v)&&!['e','ou'].includes(t.v));
  if(desconhecida){
    /* o tokenize devolve a palavra em minúsculas; mostramos como o mestre digitou */
    const escapada=desconhecida.v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const orig=(s.match(new RegExp(escapada,'i'))||[])[0]||desconhecida.v;
    const sug=palavraParecida(desconhecida.v,nomes);
    return {ok:false, msg:'Não conheço “'+orig+'”.'+(sug?'':' Veja a lista de variáveis abaixo.'),
            sugestao:sug?{de:orig,para:sug}:null};
  }
  let abre=0; for(const c of s){ if(c==='(')abre++; if(c===')')abre--; if(abre<0) break; }
  if(abre>0) return {ok:false, msg:abre===1?'Falta fechar 1 parêntese.':('Faltam fechar '+abre+' parênteses.')};
  if(abre<0) return {ok:false, msg:'Há parêntese fechando a mais.'};
  if(/[+\-*/%]\s*$/.test(s)) return {ok:false, msg:'A fórmula termina num operador — falta o que vem depois.'};
  if(Number.isNaN(evalFormula(s,vars))) return {ok:false, msg:'A conta não fecha. Confira a ordem dos operadores.'};
  return {ok:true};
}
/* HTML colorido do espelho (item 25) — mesma varredura do tokenize, tolerante */
function realceHTML(s,nomes){
  let out='', i=0;
  const txt=String(s||'');
  while(i<txt.length){
    const c=txt[i];
    if(c===' '||c==='\t'){ out+=' '; i++; continue; }
    if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(txt[i+1]||''))){
      let n=''; while(i<txt.length&&/[0-9.]/.test(txt[i])) n+=txt[i++];
      out+='<span class="fx-n">'+esc(n)+'</span>'; continue;
    }
    if('+-*/%(),<>!=&|'.includes(c)){ out+='<span class="fx-o">'+esc(c)+'</span>'; i++; continue; }
    if(ehLetra(c)){
      let fn=null;
      for(const nome of FORM_FN_NOMES){
        if(txt.substr(i,nome.length).toLowerCase()===nome && !ehLetra(txt[i+nome.length]||'')){ fn=nome; break; }
      }
      if(fn){ out+='<span class="fx-f">'+esc(txt.substr(i,fn.length))+'</span>'; i+=fn.length; continue; }
      let casou=null;
      for(const n of nomes){
        if(n && txt.substr(i,n.length).toLowerCase()===n.toLowerCase()){
          const dep=txt[i+n.length]; if(!dep||!ehLetra(dep)){ casou=n; break; }
        }
      }
      if(casou){ out+='<span class="fx-v">'+esc(txt.substr(i,casou.length))+'</span>'; i+=casou.length; continue; }
      let w=''; while(i<txt.length&&ehLetra(txt[i])) w+=txt[i++];
      out+='<span class="fx-x">'+esc(w)+'</span>'; continue;
    }
    out+='<span class="fx-x">'+esc(c)+'</span>'; i++;
  }
  return out||'&nbsp;';
}
/* Fórmulas prontas por contexto (item 24) — usam nomes reais do sistema. */
function formulasProntas(sys,tipo){
  const at=(sys.attributes||[]).map(a=>a.name).filter(Boolean);
  const A=at[0]||'Força', B=at[1]||A, N=sys.levelName||'Nível';
  const L={
    recurso:[['Base + atributo','10 + '+A],['Cresce por degrau','8 + '+A+' * 2 + '+N+' * 5'],
             ['Só do atributo',A+' * 10'],['Fixo','20'],['Menor entre dois','menor('+A+' * 5, 50)']],
    defesa: [['Base + atributo','10 + '+B],['Base fixa','12'],['Dois atributos','8 + '+A+' + '+B],
             ['Com teto','menor(10 + '+B+', 18)']],
    carga:  [['Pelo atributo',A+' * 5'],['Base + atributo','10 + '+A+' * 2'],['Fixa','30']],
    mod:    [['Estilo D&D','(V - 10) / 2'],['Metade do valor','V / 2'],['Valor cheio','V']],
    prof:   [['Cresce a cada 4 degraus','2 + piso(('+N+' - 1) / 4)'],['Metade do degrau','piso('+N+' / 2)'],
             ['Fixo','3']],
    recarga:[['Metade do degrau','piso('+N+' / 2)'],['Pelo atributo',A],['Fixo','5']],
    perround:[['Fração do degrau','piso('+N+' / 5)'],['Fixo','2']],
    custo:  [['Base + degrau','2 + '+N+' / 5'],['Só base','3'],['Cresce rápido','2 + '+N]],
  }[tipo]||[['Base + atributo','10 + '+A],['Pelo degrau',N+' * 2']];
  return L;
}
/* ---------- o campo em si ---------- */
/* obj[key] é a fórmula. opts: {tipo, pontos, placeholder, aoMudar} */
function campoFormula(sys,obj,key,opts){
  opts=opts||{};
  const pontos=opts.pontos||pontosPadrao(sys);
  const vars=pontos[pontos.length-1].vars;
  const nomes=nomesDeVars(vars);
  const raiz=h('div',{class:'fx'});
  const hl=h('div',{class:'fx-hl'});
  const inp=h('input',{class:'in fx-in',value:obj[key]||'',placeholder:opts.placeholder||'',spellcheck:'false'});
  const sug=h('div',{class:'hide'});
  const caixa=h('div',{class:'fx-box'}, hl, inp, sug);
  const prev=h('div',{class:'fx-prev'});
  const err=h('div',{class:'fx-err hide'});
  const montarBtn=h('button',{class:'btn sm ghost',type:'button'},'⊞ Montar');
  const painel=h('div',{class:'fx-mont hide'});
  let iSug=0, itensSug=[];

  const inserir=txt=>{
    const a=inp.selectionStart??inp.value.length, b=inp.selectionEnd??a;
    const antes=inp.value.slice(0,a), depois=inp.value.slice(b);
    /* espaço automático entre um token e outro, menos antes de "(" e ")" */
    const pre=(antes && !/[\s(]$/.test(antes) && !/^[)(,]/.test(txt))?' ':'';
    inp.value=antes+pre+txt+depois;
    const pos=(antes+pre+txt).length;
    inp.focus(); inp.setSelectionRange(pos,pos);
    atualizar();
  };
  /* palavra sendo digitada no cursor, para o autocomplete (item 21) */
  const palavraNoCursor=()=>{
    const p=inp.selectionStart??inp.value.length;
    let i=p; while(i>0&&ehLetra(inp.value[i-1])) i--;
    return {ini:i, txt:inp.value.slice(i,p)};
  };
  const fecharSug=()=>{ sug.className='hide'; sug.innerHTML=''; itensSug=[]; };
  const abrirSug=()=>{
    const w=palavraNoCursor();
    if(w.txt.length<1){ fecharSug(); return; }
    const t=semAcento(w.txt);
    itensSug=[...nomes.filter(n=>semAcento(n).startsWith(t)).map(n=>({t:n,tp:'variável'})),
              ...FORM_FN_NOMES.filter(n=>n.startsWith(t)).map(n=>({t:n+'(',tp:'função'}))].slice(0,8);
    if(!itensSug.length){ fecharSug(); return; }
    iSug=0; sug.className='fx-sug'; sug.innerHTML='';
    itensSug.forEach((it,i)=>sug.appendChild(h('button',{class:i===0?'foco':'',type:'button',
      onmousedown:e=>{ e.preventDefault(); aceitarSug(i); }},
      h('span',{},it.t), h('span',{class:'tp'},it.tp))));
  };
  const aceitarSug=i=>{
    const it=itensSug[i]; if(!it) return;
    const w=palavraNoCursor(), p=inp.selectionStart??0;
    inp.value=inp.value.slice(0,w.ini)+it.t+inp.value.slice(p);
    const pos=w.ini+it.t.length;
    inp.focus(); inp.setSelectionRange(pos,pos);
    fecharSug(); atualizar();
  };
  const atualizar=()=>{
    obj[key]=inp.value; persist();
    hl.innerHTML=realceHTML(inp.value,nomes);
    hl.scrollLeft=inp.scrollLeft;
    const an=analisarFormula(inp.value,vars);
    inp.classList.toggle('ruim',!an.ok);
    /* prévia nos 3 pontos (item 22) */
    prev.innerHTML='';
    if(an.ok&&!an.vazio){
      pontos.forEach(p=>{
        const n=evalFormula(inp.value,p.vars);
        prev.appendChild(h('span',{class:'fx-pt'}, p.rot+': ', h('b',{},Number.isNaN(n)?'—':String(n))));
      });
    } else if(an.vazio){ prev.appendChild(h('span',{class:'hint'},'Vazio.')); }
    /* erro específico (item 23) */
    err.innerHTML='';
    if(an.ok){ err.className='fx-err hide'; }
    else{
      err.className='fx-err';
      err.appendChild(node('⚠ '+an.msg));
      if(an.sugestao) err.appendChild(h('button',{type:'button',
        onclick:()=>{ inp.value=inp.value.replace(new RegExp(an.sugestao.de,'i'),an.sugestao.para);
                      atualizar(); inp.focus(); }},'usar “'+an.sugestao.para+'”'));
    }
  };
  inp.addEventListener('input',()=>{ atualizar(); abrirSug(); });
  inp.addEventListener('scroll',()=>{ hl.scrollLeft=inp.scrollLeft; });
  inp.addEventListener('blur',()=>{ fecharSug(); if(opts.aoMudar) opts.aoMudar(); });
  inp.addEventListener('keydown',e=>{
    if(!itensSug.length){ if(e.key==='Enter'&&opts.aoMudar){ opts.aoMudar(); } return; }
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      iSug=(iSug+(e.key==='ArrowDown'?1:itensSug.length-1))%itensSug.length;
      [...sug.children].forEach((b,i)=>b.className=(i===iSug?'foco':''));
      return;
    }
    if(e.key==='Enter'||e.key==='Tab'){ e.preventDefault(); aceitarSug(iSug); return; }
    if(e.key==='Escape'){ e.stopPropagation(); fecharSug(); }
  });

  /* --- construtor: variáveis (20), operadores/funções (19), prontas (24) --- */
  const chips=(lista,cls)=>h('div',{class:'fx-chips'}, ...lista.map(([rot,txt,sub])=>
    h('button',{class:'fx-chip '+(cls||''),type:'button',title:sub||'',onclick:()=>inserir(txt)},
      sub?h('span',{},rot,h('small',{},sub)):rot)));
  const montaPainel=()=>{
    painel.innerHTML='';
    const vs=nomes.slice().sort((a,b)=>a.localeCompare(b))
      .map(n=>[n,n,'= '+(Number.isFinite(vars[n])?vars[n]:'?')]);
    painel.appendChild(h('div',{class:'fx-grp'},'Fórmulas prontas — clique para usar'));
    painel.appendChild(h('div',{class:'fx-chips'}, ...formulasProntas(sys,opts.tipo).map(([rot,txt])=>
      h('button',{class:'fx-chip pr',type:'button',onclick:()=>{ inp.value=txt; atualizar(); inp.focus(); }},
        h('span',{},rot,h('small',{},txt))))));
    painel.appendChild(h('div',{class:'fx-grp'},'Variáveis disponíveis'+(opts.tipo==='mod'?'':' (valor no último degrau)')));
    painel.appendChild(chips(vs));
    painel.appendChild(h('div',{class:'fx-grp'},'Operadores'));
    painel.appendChild(chips([['+','+'],['−','-'],['×','*'],['÷','/'],['(','('],[')',')'],[',',',']],'op'));
    painel.appendChild(h('div',{class:'fx-grp'},'Funções'));
    painel.appendChild(chips([['piso()','piso(','arredonda para baixo'],['teto()','teto(','arredonda para cima'],
      ['arredondar()','arredondar(','arredonda normal'],['menor()','menor(','o menor entre os valores'],
      ['maior()','maior(','o maior entre os valores'],['se()','se(','se(condição, então, senão)'],
      ['abs()','abs(','valor sem sinal']],'fn'));
  };
  montarBtn.addEventListener('click',()=>{
    const abrir=painel.classList.contains('hide');
    if(abrir) montaPainel();
    painel.className=abrir?'fx-mont':'fx-mont hide';
    montarBtn.textContent=abrir?'⊟ Fechar':'⊞ Montar';
  });

  raiz.appendChild(caixa);
  raiz.appendChild(h('div',{class:'fx-bar'}, montarBtn, prev));
  raiz.appendChild(err);
  raiz.appendChild(painel);
  atualizar();
  return raiz;
}

function mestreView(){
  const sys=S.system;
  /* aba escondida pelo Modo Simples: cai para o Início em vez de sumir a tela */
  if(!abasVisiveis().some(t=>t.k===S.tab)) S.tab='inicio';
  const metaAtual=tabMeta(S.tab);
  const grupoAtivo=S.ui.grupo=metaAtual.g;

  /* --- barra de grupos (item 1) --- */
  const grupos=h('div',{class:'grupos'}, ...TAB_GRUPOS.map(g=>{
    const abas=abasVisiveis().filter(t=>t.g===g.k);
    if(!abas.length) return null;
    const temAlerta=abas.some(t=>problemasDaAba(sys,t.k).length);
    return h('button',{class:'grupo-b '+(grupoAtivo===g.k?'on':''),
      onclick:()=>{ S.tab=abas[0].k; render(); }},
      h('span',{}, g.ic+' '+g.nome, temAlerta?h('span',{class:'tab-alerta'}):null),
      h('small',{}, g.sub));
  }).filter(Boolean));

  /* --- sub-abas do grupo, com badge (item 3) e alerta (item 4) --- */
  const subtabs=h('div',{class:'subtabs'}, ...abasVisiveis().filter(t=>t.g===grupoAtivo).map(t=>{
    const n=contagemDaAba(sys,t.k), probs=problemasDaAba(sys,t.k);
    return h('button',{class:'tab '+(S.tab===t.k?'on':'')+(t.adv?' tab-adv':''),
      title:(t.adv?'Módulo avançado (opcional). ':'')+(probs.length?probs.join('\n'):''),
      onclick:()=>{S.tab=t.k;render();}},
      t.ic+' '+t.nome,
      n?h('span',{class:'tab-n'},n):null,
      probs.length?h('span',{class:'tab-alerta'}):null);
  }));

  /* --- breadcrumb (item 10) + Modo Simples/Avançado (item 9) --- */
  const gAtual=TAB_GRUPOS.find(g=>g.k===grupoAtivo)||TAB_GRUPOS[0];
  const crumb=h('div',{class:'crumb'},
    h('span',{},'🛠️'), h('b',{},sys.campaignName||'Campanha'),
    h('span',{class:'sep'},'›'),
    h('button',{onclick:()=>{const a=abasVisiveis().find(t=>t.g===gAtual.k);if(a){S.tab=a.k;render();}}}, gAtual.ic+' '+gAtual.nome),
    h('span',{class:'sep'},'›'), h('b',{},tabLabel(S.tab)),
    h('span',{style:{flex:'1'}}),
    h('button',{class:'btn sm ghost',title:'Ctrl+K',onclick:()=>{S.ui.busca={q:''};render();}},'🔎 Buscar'),
    h('button',{class:'btn sm ghost',title:'Glossário: o que cada termo do app significa',
      onclick:()=>{S.ui.gloss={q:''};render();}},'📖 Glossário'),
    h('button',{class:'btn sm '+(modoSimples()?'emerald':'ghost'),
      title:'O Modo Simples esconde Progressão, Escolhas, Condições, Tags e Técnicas.',
      onclick:()=>{ S.ui.modo=modoSimples()?'avancado':'simples'; store('nexus_modo',S.ui.modo); render(); }},
      modoSimples()?'✓ Modo Simples':'◇ Modo Avançado'));

  /* --- barra de progresso do sistema (item 6) --- */
  const passos=passosEssenciais(sys), feitos=passos.filter(p=>p.ok).length;
  const barra=h('div',{class:'prog-sis'},
    h('div',{class:'t-b'}, h('div',{class:'t-f',style:{width:Math.round(feitos/passos.length*100)+'%'}})),
    h('span',{class:'t-x'}, feitos+' de '+passos.length+' passos essenciais'),
    feitos<passos.length?h('button',{class:'btn sm ghost',onclick:()=>irParaAba('inicio')},'ver o que falta →'):null);

  let content;
  if(S.tab==='inicio') content=tabInicio(sys);
  else if(S.tab==='campanha') content=tabCampanha(sys);
  else if(S.tab==='regras') content=tabRegras(sys);
  else if(S.tab==='progressao') content=tabProgressao(sys);
  else if(S.tab==='atributos') content=tabAtributos(sys);
  else if(S.tab==='recursos') content=tabRecursos(sys);
  else if(S.tab==='pericias') content=tabPericias(sys);
  else if(S.tab==='classes') content=featureCard(sys, sys.classes, 'Classes', 'Clique numa classe para editar descrição, habilidades e requisitos.', 'classe');
  else if(S.tab==='racas') content=featureCard(sys, sys.origins, 'Origem / Raça', 'Efeitos, habilidades (com requisitos) e características físicas.', 'raca');
  else if(S.tab==='escolhas') content=tabEscolhas(sys);
  else if(S.tab==='itens') content=tabItens(sys);
  else if(S.tab==='condicoes') content=tabCondicoes(sys);
  else if(S.tab==='tags') content=tabTags(sys);
  else if(S.tab==='dados') content=tabDados(sys);
  else if(S.tab==='tecnicas') content=tabTecnicas(sys);
  else if(S.tab==='ficha') content=tabFicha(sys);
  else content=portCard();

  /* --- rodapé "Próximo passo →" (item 5): segue a ordem de TAB_META --- */
  const vis=abasVisiveis();
  const iAtual=vis.findIndex(t=>t.k===S.tab);
  const ant=iAtual>0?vis[iAtual-1]:null, prox=iAtual>=0&&iAtual<vis.length-1?vis[iAtual+1]:null;
  const rodape=h('div',{class:'prox'},
    ant?h('button',{class:'btn ghost sm',onclick:()=>{S.tab=ant.k;render();window.scrollTo(0,0);}},'← '+ant.ic+' '+ant.nome):h('span'),
    h('span',{class:'hint'},'passo '+(iAtual+1)+' de '+vis.length),
    prox?h('button',{class:'btn primary sm',onclick:()=>{S.tab=prox.k;render();window.scrollTo(0,0);}},'Próximo passo: '+prox.ic+' '+prox.nome+' →')
        :h('button',{class:'btn emerald sm',onclick:()=>{if(!S.draft)S.draft=initDraft(sys);S.view='jogador';render();window.scrollTo(0,0);}},'Testar como jogador 🎲'));

  return h('div',{class:'wrap'},
    crumb, barra, grupos, subtabs, content, rodape,
    S.ui.busca?buscaOverlay():null,
    S.ui.gloss?glossOverlay():null);
}

function tabCampanha(sys){
  const toggleTheme=t=>{ sys.themes.includes(t)?(sys.themes=sys.themes.filter(x=>x!==t)):sys.themes.push(t); render(); };
  const custom=sys.themes.filter(t=>!THEME_PRESETS.includes(t));
  return h('div',{},
    card('Campanha','Identidade da sua mesa.',null,
      field('Nome da campanha', h('input',{class:'in',value:sys.campaignName,oninput:e=>{sys.campaignName=e.target.value;persist();}})),
      h('div',{style:{marginTop:'10px'}}, field('Nome do sistema (regras)', h('input',{class:'in',value:sys.name,oninput:e=>{sys.name=e.target.value;persist();}})))),
    card('Tema(s) da Campanha','Marque os estilos de jogo. Pode combinar e criar os seus.',null,
      h('div',{class:'row wrapf',style:{marginBottom:'10px'}},
        ...THEME_PRESETS.map(t=>h('button',{class:'btn sm '+(sys.themes.includes(t)?'emerald':'ghost'),onclick:()=>toggleTheme(t)},(sys.themes.includes(t)?'✓ ':'')+t)),
        ...custom.map(t=>h('button',{class:'btn sm emerald',onclick:()=>toggleTheme(t)},'✓ '+t+'  ✕'))),
      h('input',{class:'in',placeholder:'Tema personalizado — digite e aperte Enter',
        onkeydown:e=>{if(e.key==='Enter'){const v=e.target.value.trim();if(v&&!sys.themes.includes(v))sys.themes.push(v);e.target.value='';render();}}})));
}
function tabRegras(sys){
  const p=levelPoints(sys,sys.maxLevel);
  return h('div',{},
    card('Criação Inicial','Com o que o personagem começa.',null,
      h('div',{class:'grid g3'},
        numField('Nível inicial',sys,'startLevel'), numField('Nível máximo',sys,'maxLevel'),
        numField('Pontos de atributo iniciais',sys,'attributePoints'), numField('Perícias iniciais',sys,'skillChoices'),
        numField('Valor inicial do atributo',sys,'startAttrValue'), numField('Mín. atributo',sys,'attrMin'), numField('Máx. atributo',sys,'attrMax')),
      h('div',{style:{marginTop:'12px'}},
        h('button',{class:'btn sm '+(sys.allowDump?'emerald':'ghost'),onclick:()=>{sys.allowDump=!sys.allowDump;render();}},
          (sys.allowDump?'✓ ':'')+'Permitir baixar atributo abaixo do inicial para ganhar pontos extras'), aj('dump'))),
    card('Progressão','Degraus, tabela e o que se ganha ao avançar.',
      h('button',{class:'btn sm ghost',onclick:()=>{S.tab='progressao';render();}},'Abrir 📈 Progressão →'),
      h('div',{class:'hint'}, 'Eixo: '+(sys.levelName||'Nível')+' — '+(sys.startLevel||1)+' a '+(sys.maxLevel||1)+
        '. No degrau '+sys.maxLevel+': '+p.attrPoints+' pontos de atributo e '+p.skillCount+' perícias.'+
        ((sys.progression&&sys.progression.cols.length)?(' Tabela com '+sys.progression.cols.length+' coluna(s).'):' Sem tabela de progressão ainda.'))),
    card(tit('Como os Atributos Funcionam','modificador'),'Escolha a "matemática" do seu sistema.',null,
      h('div',{class:'row wrapf'},
        h('button',{class:'btn sm '+(sys.attrMode==='direto'?'emerald':'ghost'),onclick:()=>{sys.attrMode='direto';render();}},'Valor direto (7 = 7)'),
        h('button',{class:'btn sm '+(sys.attrMode==='modificador'?'emerald':'ghost'),onclick:()=>{sys.attrMode='modificador';render();}},'Modificador (estilo F&M/D&D)')),
      sys.attrMode==='modificador'
        ? h('div',{style:{marginTop:'12px'}},
            field('Fórmula do modificador', campoFormula(sys,sys,'modFormula',{tipo:'mod',placeholder:'(V - 10) / 2',
              pontos:[8,10,14,18].map(v=>({rot:'V='+v, vars:{V:v}})), aoMudar:()=>render()}), 'modificador'),
            h('div',{class:'hint',style:{marginTop:'6px'}}, 'Use "V" para o valor do atributo. Arredonda para baixo. Ex.: '+[8,10,14].map(v=>v+' → '+sign(effAttr(sys,v))).join('  |  ')))
        : h('div',{class:'hint',style:{marginTop:'10px'}},'O valor é usado direto nas contas e rolagens. Ex.: 7 de Força = 7.')));
}
/* sigla usada na ficha estilizada (FOR, AGI…) — cai no automático se o mestre não definir */
function attrAbbr(a){ return (a.abbr&&a.abbr.trim()) ? a.abbr.trim() : (a.name||'?').slice(0,3).toUpperCase(); }
/* ---------- Editor de tabela de progressão (usado no sistema e em cada classe) ---------- */
function progEditor(sys, prog, opts){
  opts=opts||{};
  sanitizeProg(prog);
  const de=sys.startLevel||1, ate=Math.max(de, sys.maxLevel||de);
  const niveis=[]; for(let l=de;l<=ate;l++) niveis.push(l);
  if(niveis.length>60) niveis.length=60;   /* trava de segurança p/ maxLevel absurdo */

  const addCol=()=>{ pushUndo(); prog.cols.push({id:uid(), name:'Coluna '+(prog.cols.length+1), tipo:'num'}); render(); };

  /* preencher uma coluna inteira com uma fórmula (ex.: 2 + piso((Nível-1)/4) ) */
  const preencher=col=>{
    const exemplo = col.tipo==='num' ? '2 + piso((' + (sys.levelName||'Nível') + ' - 1) / 4)' : '';
    const f=prompt('Preencher "'+col.name+'" com uma fórmula, aplicada em cada degrau.\n\n'+
      'Use "'+(sys.levelName||'Nível')+'" como o número do degrau.\nEx.: '+exemplo, exemplo);
    if(f==null) return;
    pushUndo();
    let erros=0;
    niveis.forEach(l=>{
      const vars={'Nível':l,'Nivel':l}; vars[sys.levelName||'Nível']=l;
      const v=evalFormula(f, vars);
      if(Number.isNaN(v)) erros++;
      else { if(!prog.rows[l]) prog.rows[l]={}; prog.rows[l][col.id]=v; }
    });
    render();
    showToast(erros?('Fórmula inválida em '+erros+' degrau(s)'):'Coluna preenchida');
  };

  /* colar direto de planilha: uma linha por degrau, colunas separadas por TAB ou ; */
  const colar=()=>{
    const txt=prompt('Cole os valores (uma linha por degrau, colunas separadas por TAB, ; ou ,).\n'+
      'A ordem das colunas é a mesma da tabela. Começa no degrau '+de+'.');
    if(!txt) return;
    if(!prog.cols.length) return showToast('Crie ao menos uma coluna antes');
    pushUndo();
    const linhas=txt.split(/\r?\n/).filter(l=>l.trim()!=='');
    linhas.forEach((linha,i)=>{
      const lv=de+i; if(lv>ate) return;
      const partes=linha.split(/\t|;|,/).map(s=>s.trim());
      if(!prog.rows[lv]) prog.rows[lv]={};
      prog.cols.forEach((c,j)=>{ if(partes[j]!==undefined && partes[j]!=='') prog.rows[lv][c.id]=partes[j]; });
    });
    render(); showToast(linhas.length+' degrau(s) preenchido(s)');
  };

  const tabela=h('table',{class:'progtab'});
  const thead=h('thead',{});
  const trh=h('tr',{}, h('th',{class:'lv'}, sys.levelName||'Nível'));
  if(opts.labels) trh.appendChild(h('th',{},'Rótulo do degrau'));
  prog.cols.forEach(c=>{
    trh.appendChild(h('th',{},
      h('div',{class:'row',style:{gap:'4px'}},
        h('input',{class:'in',style:{fontSize:'12px',padding:'4px 6px',fontWeight:'700'},value:c.name,
          title:'Este nome vira uma variável nas fórmulas',
          oninput:e=>{c.name=e.target.value;persist();},onchange:()=>render()}),
        h('button',{class:'btn danger sm',title:'Remover coluna',onclick:()=>{
          pushUndo(); prog.cols=prog.cols.filter(x=>x.id!==c.id);
          Object.keys(prog.rows).forEach(k=>{ delete prog.rows[k][c.id]; }); render();}},'✕')),
      h('div',{class:'row',style:{gap:'4px',marginTop:'4px'}},
        h('button',{class:'btn sm '+(c.tipo==='num'?'emerald':'ghost'),title:'Número: vira variável nas fórmulas',
          onclick:()=>{pushUndo();c.tipo='num';render();}},'123'),
        h('button',{class:'btn sm '+(c.tipo==='texto'?'emerald':'ghost'),title:'Texto: só aparece na ficha (ex.: 1d8)',
          onclick:()=>{pushUndo();c.tipo='texto';render();}},'Abc'),
        c.tipo==='num'?h('button',{class:'btn sm ghost',title:'Preencher com fórmula',onclick:()=>preencher(c)},'ƒ'):null)));
  });
  thead.appendChild(trh); tabela.appendChild(thead);

  const tb=h('tbody',{});
  niveis.forEach(l=>{
    const tr=h('tr',{}, h('td',{class:'lv'}, l));
    if(opts.labels) tr.appendChild(h('td',{},
      h('input',{class:'in',style:{fontSize:'12px',padding:'4px 6px'},value:(prog.labels[l]||''),
        placeholder:(sys.levelName||'Nível')+' '+l,
        oninput:e=>{prog.labels[l]=e.target.value;persist();},onchange:()=>render()})));
    prog.cols.forEach(c=>{
      const val=(prog.rows[l]||{})[c.id];
      tr.appendChild(h('td',{},
        h('input',{class:'in'+(c.tipo==='num'?' mono':''),style:{fontSize:'12px',padding:'4px 6px',textAlign:'center'},
          value:val==null?'':val, placeholder:'—',
          oninput:e=>{ const v=e.target.value;
            if(!prog.rows[l]) prog.rows[l]={};
            if(v==='') delete prog.rows[l][c.id]; else prog.rows[l][c.id]=v;
            persist(); },
          onchange:()=>render()})));
    });
    tb.appendChild(tr);
  });
  tabela.appendChild(tb);

  const vars=prog.cols.filter(c=>c.tipo==='num').map(c=>c.name).filter(Boolean);
  return h('div',{},
    h('div',{class:'row wrapf',style:{marginBottom:'10px'}},
      h('button',{class:'btn primary sm',onclick:addCol},'+ Coluna'),
      h('button',{class:'btn ghost sm',title:'Colar de uma planilha',onclick:colar},'📋 Colar tabela'),
      prog.cols.length?h('button',{class:'btn ghost sm',onclick:()=>{
        if(confirm('Limpar todos os valores desta tabela? As colunas continuam.')){ pushUndo(); prog.rows={}; render(); }}},'🧹 Limpar valores'):null),
    prog.cols.length
      ? h('div',{style:{overflowX:'auto'}}, tabela)
      : h('div',{class:'hint'},'Nenhuma coluna ainda. Crie uma coluna — o nome dela vira uma variável que você pode usar nas fórmulas de recursos.'),
    vars.length?h('div',{class:'hint',style:{marginTop:'10px'}},
      h('span',{},'Disponível nas fórmulas: '), ...vars.map(v=>h('span',{class:'tg-fx',style:{marginRight:'4px'}},v))):null);
}
function tabProgressao(sys){
  sanitizeProg(sys.progression);
  const p=levelPoints(sys,sys.maxLevel);
  return h('div',{},
    card(tit('O Eixo de Progressão','degrau'),'Como a sua campanha chama o avanço do personagem.',null,
      h('div',{class:'grid g3',style:{alignItems:'end'}},
        field('Nome do eixo', h('input',{class:'in',value:sys.levelName||'Nível',placeholder:'Nível, NEX, Grau…',
          oninput:e=>{sys.levelName=e.target.value;persist();},onchange:()=>render()}), 'degrau'),
        numField('Degrau inicial',sys,'startLevel'),
        numField('Degrau máximo',sys,'maxLevel')),
      h('div',{class:'hint',style:{marginTop:'10px'}},
        'São '+(Math.max(0,(sys.maxLevel||1)-(sys.startLevel||1)+1))+' degraus. '+
        'O nome do eixo vira variável: uma fórmula pode usar "'+(sys.levelName||'Nível')+'".')),
    card('Tabela de Progressão do Sistema','Vale para todos os personagens. Cada coluna numérica vira uma variável usável nas fórmulas.',null,
      progEditor(sys, sys.progression, {labels:true}),
      h('div',{class:'hint',style:{marginTop:'12px'}},
        'Exemplos: uma coluna "Prof" preenchida com ƒ = 2 + piso(('+(sys.levelName||'Nível')+' - 1) / 4) reproduz o bônus de proficiência de D&D. '+
        'Rótulos livres nos degraus reproduzem o NEX (5%, 10%, … 99%). Cada classe pode ter a tabela dela na aba 🎭 Classes.')),
    card('Progressão Automática (modo simples)','Se preferir não montar tabela, o motor pode dar pontos a cada N degraus.',null,
      h('div',{class:'grid g2'},
        numField('+ Pontos de atributo',sys.perLevel,'attrPoints'), numField('… a cada N degraus',sys.perLevel,'attrEveryN'),
        numField('+ Perícias',sys.perLevel,'skillPoints'), numField('… a cada N degraus',sys.perLevel,'skillEveryN')),
      h('div',{class:'hint',style:{marginTop:'10px'}}, `Prévia: no degrau ${sys.maxLevel} o personagem terá ${p.attrPoints} pontos de atributo e ${p.skillCount} perícias no total.`)));
}
function tabAtributos(sys){
  return card('Atributos', 'Modo atual: '+(sys.attrMode==='modificador'?'Modificador':'Valor direto')+'. A sigla aparece na ficha estilizada.',
    h('button',{class:'btn primary',onclick:()=>{sys.attributes.push({id:uid(),name:'Novo',abbr:''});render();}},'+ Atributo'),
    ...sys.attributes.map(a=>h('div',{class:'row',style:{marginBottom:'8px'}},
      h('input',{class:'in',value:a.name,placeholder:'Nome',oninput:e=>{a.name=e.target.value;persist();},onchange:()=>render()}),
      h('input',{class:'in',style:{maxWidth:'110px',textAlign:'center',fontWeight:'800'},value:a.abbr||'',
        placeholder:attrAbbr(a),title:'Sigla (ex.: FOR). Vazio = 3 primeiras letras.',
        oninput:e=>{a.abbr=e.target.value;persist();},onchange:()=>render()}),
      h('button',{class:'btn danger',onclick:()=>{sys.attributes=sys.attributes.filter(x=>x.id!==a.id);render();}},'✕'))));
}
function tabRecursos(sys){
  const eff=effAttr(sys,sys.attrMax);
  const sampleVars={'Nível':sys.maxLevel,'Nivel':sys.maxLevel}; sys.attributes.forEach(a=>sampleVars[a.name]=eff);
  return card(tit('Recursos','recursobarra'),'Barra = consumível (Vida, Mana). Valor = número fixo (Defesa). Use atributos e "Nível".',
    h('button',{class:'btn primary',onclick:()=>{sys.resources.push({id:uid(),name:'Novo Recurso',type:'barra',formula:'10',color:'#22d3ee'});render();}},'+ Recurso'),
    ...sys.resources.map(r=>{
      const typeSel=h('select',{class:'in',style:{maxWidth:'110px'},onchange:e=>{r.type=e.target.value;render();}});
      [['barra','Barra'],['valor','Valor']].forEach(([v,l])=>{const o=h('option',{value:v},l);if((r.type||'barra')===v)o.selected=true;typeSel.appendChild(o);});
      return h('div',{class:'item',style:{marginBottom:'12px'}},
        h('div',{class:'row'},
          h('input',{type:'color',value:r.color,style:{width:'38px',height:'38px',background:'transparent',border:'none',padding:'0',cursor:'pointer'},oninput:e=>{r.color=e.target.value;persist();}}),
          h('input',{class:'in',value:r.name,placeholder:'Nome',oninput:e=>{r.name=e.target.value;persist();}}),
          typeSel,
          h('button',{class:'btn danger',onclick:()=>{sys.resources=sys.resources.filter(x=>x.id!==r.id);render();}},'✕')),
        h('div',{style:{marginTop:'8px'}},
          h('span',{class:'hint'},(r.type==='valor'?'valor =':'máx ='), aj(r.type==='valor'?'recursovalor':'recursobarra')),
          campoFormula(sys,r,'formula',{tipo:(r.type==='valor'?'defesa':'recurso'),
            placeholder:'Vigor * 10 + 15', aoMudar:()=>render()})),
        (r.type||'barra')!=='valor' ? rechargeEditor(sys,r,sampleVars) : null);
    }));
}
/* ---------- Recarga: o recurso declara quando e quanto volta ---------- */
const REST_TRIGS=[['nunca','Nunca (só na mão)'],['curto','Descanso curto'],['longo','Descanso longo']];
function rechargeEditor(sys,r,sampleVars){
  if(!r.recharge) r.recharge={trig:'nunca',amt:'tudo',formula:''};
  const rc=r.recharge;
  const trigSel=h('select',{class:'in',onchange:e=>{rc.trig=e.target.value;render();}});
  REST_TRIGS.forEach(([v,l])=>{const o=h('option',{value:v},l); if(rc.trig===v)o.selected=true; trigSel.appendChild(o);});
  const amtSel=h('select',{class:'in',onchange:e=>{rc.amt=e.target.value;render();}});
  [['tudo','Tudo'],['metade','Metade do máximo'],['formula','Fórmula…']].forEach(([v,l])=>{
    const o=h('option',{value:v},l); if((rc.amt||'tudo')===v)o.selected=true; amtSel.appendChild(o);});
  return h('div',{style:{marginTop:'8px',borderTop:'1px dashed var(--line)',paddingTop:'8px'}},
    h('div',{class:'row wrapf',style:{alignItems:'flex-end'}},
      field('Recupera em', trigSel, 'recarga'),
      rc.trig!=='nunca'?field('Quanto', amtSel):null,
      (rc.trig!=='nunca'&&rc.amt==='formula')
        ? h('div',{style:{minWidth:'240px',flex:'1'}},
            field('Fórmula do quanto', campoFormula(sys,rc,'formula',{tipo:'recarga',
              placeholder:'ex.: piso('+(sys.levelName||'Nível')+' / 2)', aoMudar:()=>render()})))
        : null),
    h('div',{style:{marginTop:'8px'}},
      field('Gasto máximo por rodada (opcional)',
        campoFormula(sys,r,'perRound',{tipo:'perround',
          placeholder:'ex.: piso('+(sys.levelName||'Nível')+' / 5)', aoMudar:()=>render()}), 'perround')));
}
/* Aplica um descanso: cada recurso decide sozinho se recupera e quanto. */
function aplicarDescanso(tipo){
  const sys=S.system, d=S.draft;
  const ctx=computeSheet(sys,d);
  let n=0;
  ctx.allRes.forEach(r=>{
    if((r.type||'barra')==='valor') return;
    const rc=r.recharge||{};
    if(rc.trig!==tipo) return;
    const max=r.max; if(Number.isNaN(max)) return;
    const cur=d.resCurrent[r.id]==null?max:d.resCurrent[r.id];
    let novo=cur;
    if((rc.amt||'tudo')==='tudo') novo=max;
    else if(rc.amt==='metade') novo=Math.min(max, cur+Math.max(1,Math.floor(max/2)));
    else if(rc.amt==='formula'){
      const add=evalFormula(rc.formula, ctx.varsTotal);
      if(!Number.isNaN(add)) novo=Math.min(max, cur+add);
    }
    novo=Math.max(0,Math.min(max,novo));
    if(novo!==cur){ d.resCurrent[r.id]=novo; n++; }
  });
  render();
  showToast(n? (tipo==='curto'?'Descanso curto: ':'Descanso longo: ')+n+' recurso(s) recuperado(s)' : 'Nada a recuperar neste descanso');
}
/* PEÇA 2 — multiplicador de proficiência. Uma peça só cobre proficiência,
   Expertise e "metade da proficiência" de D&D E os graus fixos do Ordem. */
const PROF_PRESETS={
  '⚔ Multiplicador (D&D)':{modo:'mult',formula:'2 + piso((Nível - 1) / 4)',
    tiers:[['Destreinado',0],['Metade',0.5],['Proficiente',1],['Especialista',2]]},
  '🔎 Graus fixos (Ordem)':{modo:'bonus',formula:'',
    tiers:[['Destreinado',0],['Treinado',5],['Competente',10],['Expert',15]]},
};
function profCard(sys){
  const modo=(v,l,hint)=>h('button',{class:'btn sm '+(sys.profMode===v?'emerald':'ghost'),title:hint,
    onclick:()=>{sys.profMode=v;render();}},(sys.profMode===v?'✓ ':'')+l);
  const linhas=(sys.profTiers||[]).map(t=>h('div',{class:'row',style:{marginBottom:'6px'}},
    h('input',{class:'in',style:{maxWidth:'190px'},value:t.name,oninput:e=>{t.name=e.target.value;persist();},onchange:()=>render()}),
    sys.profMode==='mult'
      ? field('×', h('input',{class:'in',type:'number',step:'0.5',style:{width:'90px'},value:t.mult,
          onchange:e=>{t.mult=parseFloat(e.target.value);if(Number.isNaN(t.mult))t.mult=0;render();}}))
      : field('+', h('input',{class:'in',type:'number',style:{width:'90px'},value:t.bonus,
          onchange:e=>{t.bonus=parseInt(e.target.value)||0;render();}})),
    h('span',{class:'hint'}, sys.profMode==='mult'
      ? ('= '+Math.floor(4*(t.mult||0))+' com proficiência 4')
      : ('= '+sign(t.bonus||0)+' fixo')),
    h('button',{class:'btn danger sm',onclick:()=>{sys.profTiers=sys.profTiers.filter(x=>x.id!==t.id);render();}},'✕')));
  return card(tit('Graus de Treino','proficiencia'),
    'Substitui o "bônus fixo ao treinar" por graus reais. Uma peça só cobre proficiência/Expertise de D&D e os graus fixos do Ordem.',
    h('div',{class:'row wrapf'},
      modo('nenhum','Bônus fixo','Cada perícia tem o seu próprio bônus ao treinar (modo antigo)'),
      modo('mult','Multiplicador','×0 / ×½ / ×1 / ×2 sobre um valor de proficiência'),
      modo('bonus','Graus fixos','+0 / +5 / +10 / +15, sem valor de proficiência')),
    sys.profMode==='nenhum'
      ? h('div',{class:'hint',style:{marginTop:'12px'}},'Modo antigo: o valor da perícia é o atributo + o bônus de treino de cada uma.')
      : h('div',{},
          h('div',{class:'row wrapf',style:{marginTop:'12px',marginBottom:'8px'}},
            ...Object.keys(PROF_PRESETS).map(nome=>h('button',{class:'btn sm ghost',onclick:()=>{
              const p=PROF_PRESETS[nome];
              sys.profMode=p.modo; sys.profFormula=p.formula;
              sys.profTiers=p.tiers.map(([n,v])=>({id:uid(),name:n,mult:p.modo==='mult'?v:0,bonus:p.modo==='bonus'?v:0}));
              render();}},nome))),
          sys.profMode==='mult'
            ? h('div',{},
                field('Valor da proficiência (fórmula)',
                  campoFormula(sys,sys,'profFormula',{tipo:'prof',
                    placeholder:'Ex.: 2 + piso(('+(sys.levelName||'Nível')+' - 1) / 4)',aoMudar:()=>render()})),
                h('div',{class:'hint',style:{marginTop:'4px'}},
                  'Pode ser uma fórmula ou o nome de uma coluna da tabela de Progressão. Vira a variável "Proficiência".'))
            : null,
          h('div',{class:'sub-h'},'Graus'),
          ...linhas,
          h('button',{class:'btn ghost sm',onclick:()=>{
            sys.profTiers.push({id:uid(),name:'Novo grau',mult:1,bonus:0});render();}},'+ Grau')));
}
function tabPericias(sys){
  return h('div',{}, profCard(sys),
   card('Perícias','Cada perícia pode ter descrição, ser ligada a um atributo e dar bônus ao treinar.',
    h('button',{class:'btn primary',onclick:()=>{sys.skills.push({id:uid(),name:'Nova Perícia',description:'',linkedAttrId:null,trainedBonus:0,auto:false});render();}},'+ Perícia'),
    ...sys.skills.map(s=>{
      const linkSel=h('select',{class:'in',onchange:e=>{s.linkedAttrId=e.target.value||null;render();}});
      linkSel.appendChild(h('option',{value:''},'— nenhum —'));
      sys.attributes.forEach(a=>{const o=h('option',{value:a.id},a.name);if(a.id===s.linkedAttrId)o.selected=true;linkSel.appendChild(o);});
      return h('div',{class:'item',style:{marginBottom:'10px'}},
        h('div',{class:'row'},
          h('input',{class:'in',value:s.name,placeholder:'Nome',oninput:e=>{s.name=e.target.value;persist();}}),
          h('button',{class:'btn danger',onclick:()=>{sys.skills=sys.skills.filter(x=>x.id!==s.id);render();}},'✕')),
        h('input',{class:'in',style:{marginTop:'6px'},value:s.description||'',placeholder:'Descrição (o que a perícia faz)',oninput:e=>{s.description=e.target.value;persist();}}),
        h('div',{class:'grid g3',style:{marginTop:'8px'}},
          field('Ligada ao atributo', linkSel),
          field('Bônus ao treinar', h('input',{class:'in',type:'number',value:s.trainedBonus||0,onchange:e=>{s.trainedBonus=parseInt(e.target.value)||0;render();}}), 'bonustreino'),
          field('Disponibilidade', h('button',{class:'in',style:{cursor:'pointer',textAlign:'left'},onclick:()=>{s.auto=!s.auto;render();}}, s.auto?'⚡ Automática':'✋ Jogador escolhe'), 'periciaauto')),
        h('div',{class:'hint',style:{marginTop:'6px'}}, skillExplain(sys,s)));
    })));
}
function skillExplain(sys,s){
  const l=sys.attributes.find(a=>a.id===s.linkedAttrId); const base=l?l.name:null;
  if(sys.profMode!=='nenhum'){
    const g=(sys.profTiers||[]).map(t=>t.name+' '+(sys.profMode==='mult'?('×'+t.mult):sign(t.bonus))).join(' · ');
    return 'Valor = '+(base||'0')+' + grau de treino ('+(g||'nenhum grau definido')+'). O "bônus ao treinar" abaixo é ignorado neste modo.';
  }
  if(s.auto) return 'Automática — todo personagem tem. Valor = '+(base||'0')+(s.trainedBonus?(' + '+s.trainedBonus):'')+(base?(' (ex.: 3 de '+base+' → +3).'):'.');
  return 'O jogador escolhe (gasta 1 slot). Treinada: valor = '+(base?(base+' + '):'')+(s.trainedBonus||0)+'.';
}

/* ---------- Aba: Itens & Equipamento ---------- */
/* PEÇA 6 — espaços de equipamento e teto de sintonização */
function slotsCard(sys){
  return card(tit('Espaços de Equipamento & Sintonização','slot'),
    'Opcional. Slots limitam quantos itens de cada tipo ficam equipados; a sintonização é um teto global, independente de slot.',
    h('button',{class:'btn primary',onclick:()=>{sys.slots.push({id:uid(),name:'Novo espaço',max:1});render();}},'+ Espaço'),
    ...(sys.slots||[]).map(s=>h('div',{class:'row',style:{marginBottom:'6px'}},
      h('input',{class:'in',value:s.name,placeholder:'Ex.: Mão, Corpo, Anel',oninput:e=>{s.name=e.target.value;persist();},onchange:()=>render()}),
      field('Cabem', h('input',{class:'in',type:'number',min:'1',style:{width:'90px'},value:s.max,
        onchange:e=>{s.max=Math.max(1,parseInt(e.target.value)||1);render();}})),
      h('button',{class:'btn danger',onclick:()=>{
        sys.slots=sys.slots.filter(x=>x.id!==s.id);
        (sys.items||[]).forEach(it=>{ if(it.slotId===s.id) it.slotId=''; });
        render();}},'✕'))),
    (sys.slots||[]).length?null:h('div',{class:'hint'},'Nenhum espaço. Sem slots, o jogador equipa quantos itens quiser.'),
    h('div',{style:{marginTop:'12px',maxWidth:'260px'}},
      field('Máximo de itens sintonizados (0 = sem sintonização)',
        h('input',{class:'in',type:'number',min:'0',value:sys.sintoniaMax||0,
          onchange:e=>{sys.sintoniaMax=Math.max(0,parseInt(e.target.value)||0);render();}}), 'sintonia')));
}
function tabItens(sys){
  if(!Array.isArray(sys.items)) sys.items=[];
  return h('div',{}, slotsCard(sys),
   card('Itens & Equipamento',
    'Itens equipáveis (armas, armaduras, acessórios, ferramentas) aplicam seus efeitos quando equipados. Cada item tem peso, que alimenta a carga.',
    h('button',{class:'btn primary',onclick:()=>{const it={id:uid(),name:'Novo Item',description:'',categoria:'outro',weight:0,equipavel:true,effects:[]};sys.items.push(it);S.ui.open[it.id]=true;render();}},'+ Item'),
    field('Fórmula da Carga Máxima (opcional)',
      campoFormula(sys,sys,'cargaFormula',{tipo:'carga',
        placeholder:'Ex.: Força * 5 — vazio = sem limite de carga', aoMudar:()=>render()}), 'carga'),
    h('div',{class:'hint',style:{margin:'6px 0 14px'}},'Se preenchida, a ficha mostra a barra de carga (peso total / limite). Pode usar atributos e características numéricas nas fórmulas.'),
    sys.items.length?null:h('div',{class:'hint'},'Nenhum item ainda. Crie o primeiro em "+ Item".'),
    ...sys.items.map(it=>itemEditor(sys,it))));
}
function itemEditor(sys,it){
  if(!it.effects) it.effects=[];
  const open=!!S.ui.open[it.id];
  const meta=itemCatLabel(it.categoria)+' · '+(it.weight||0)+' peso · '+it.effects.length+' efeito(s)'+(it.equipavel?'':' · não equipável');
  const header=h('div',{class:'acc-head',onclick:()=>{S.ui.open[it.id]=!open;render();}},
    h('div',{class:'row'}, h('span',{class:'acc-caret'},open?'▼':'▶'), h('span',{class:'acc-title'},it.name||'(sem nome)')),
    h('div',{class:'row'}, h('span',{class:'acc-meta'},meta),
      h('button',{class:'btn danger sm',onclick:e=>{e.stopPropagation();sys.items=sys.items.filter(x=>x.id!==it.id);delete S.ui.open[it.id];render();}},'✕')));
  if(!open) return h('div',{class:'acc'}, header);
  const catSel=h('select',{class:'in',onchange:e=>{it.categoria=e.target.value;render();}});
  ITEM_CATS.forEach(([v,l])=>{const o=h('option',{value:v},l);if(v===it.categoria)o.selected=true;catSel.appendChild(o);});
  const body=h('div',{class:'acc-body'},
    h('div',{class:'grid g3',style:{marginTop:'12px'}},
      field('Nome', h('input',{class:'in',value:it.name,oninput:e=>{it.name=e.target.value;persist();},onchange:()=>render()})),
      field('Categoria', catSel),
      field('Peso', h('input',{class:'in',type:'number',step:'0.1',value:it.weight||0,onchange:e=>{it.weight=parseFloat(e.target.value)||0;render();}}))),
    h('div',{style:{marginTop:'8px'}}, field('Descrição', h('textarea',{class:'in',rows:'2',value:it.description||'',oninput:e=>{it.description=e.target.value;persist();}}))),
    h('div',{style:{marginTop:'8px'}}, h('button',{class:'btn sm '+(it.equipavel?'emerald':'ghost'),onclick:()=>{it.equipavel=!it.equipavel;render();}}, (it.equipavel?'✓ ':'')+'Equipável (efeitos só valem quando equipado)')),
    h('div',{class:'hint',style:{marginTop:'4px'}}, it.equipavel
      ? 'Equipável: os efeitos abaixo entram na ficha ao equipar o item.'
      : 'Não-equipável (consumível/carregado): os efeitos ficam como referência e NÃO entram automaticamente na ficha.'),
    itemSlotBox(sys,it),
    itemAtaqueBox(sys,it),
    itemArmaduraBox(sys,it),
    h('div',{class:'sub-h'},'Efeitos do item'),
    ...it.effects.map(ef=>effectRow(sys,it.effects,ef,0)),
    h('button',{class:'btn ghost sm',onclick:()=>{it.effects.push(newEffect(sys));render();}},'+ Efeito'),
    it.effects.length?h('div',{class:'tags',style:{marginTop:'8px'}}, ...it.effects.map(ef=>h('span',{class:'tg-fx'},effectLabel(sys,ef)))):null);
  return h('div',{class:'acc'}, header, body);
}
