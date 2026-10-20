/* ============================================================ ABA 📈 PROGRESSÃO (nova) ============================================================
   Antes: uma tabela de colunas soltas + "a cada N degraus" escondido. Confuso.
   Agora, de cima para baixo, na ordem em que o Mestre pensa:
     1. Eixo (nome, de onde até onde)
     2. ⚡ Começar de um modelo (D&D, Ordem, Tormenta, linear, marcos) — preenche tudo de uma vez
     3. 📋 O que se ganha ao subir — regras em frase ("+2 pontos de atributo nos níveis 4, 8, 12…")
     4. 🗓 Linha do tempo — tabela gerada sozinha: o que cada nível dá, totais acumulados e (opcional) as habilidades de uma classe
     5. 🔢 Colunas extras — valores por nível que viram variáveis (proficiência, dado de dano, NEX…), com atalhos prontos
   Depende de progressao.js (motor), formula-field.js (progEditor), example-system (levelPoints). */

function _faixaNiveis(sys){ const de=sys.startLevel||1, ate=Math.max(de,sys.maxLevel||de), out=[]; for(let l=de;l<=Math.min(ate,de+59);l++) out.push(l); return out; }
function _colProg(sys,nome,tipo){ sanitizeProg(sys.progression); let c=sys.progression.cols.find(x=>x.name===nome); if(!c){ c={id:uid(),name:nome,tipo:tipo||'num'}; sys.progression.cols.push(c); } return c; }
function _encheCol(sys,col,fn){ _faixaNiveis(sys).forEach(l=>{ const v=fn(l); if(v==null) return; if(!sys.progression.rows[l]) sys.progression.rows[l]={}; sys.progression.rows[l][col.id]=v; }); }
const _g=(tipo,qtd,o)=>Object.assign({id:uid(),tipo,qtd,cada:1,aPartir:0,ate:0,niveis:'',alvoId:'',nota:''},o||{});

const PROG_PRESETS=[
  {k:'dnd',ic:'🐉',n:'D&D 5e',d:'Níveis 1–20 · proficiência +2→+6 · +2 atributos nos níveis 4, 8, 12, 16, 19 · subclasse no 3.',
   f:s=>{ s.levelName='Nível'; s.startLevel=1; s.maxLevel=20; s.semNiveis=false;
     s.ganhos=[_g('atributo',2,{niveis:'4,8,12,16,19',nota:'ou um talento'}),_g('escolha',0,{niveis:'3',nota:'Subclasse'})];
     _encheCol(s,_colProg(s,'Prof'),l=>2+Math.floor((l-1)/4)); s.profFormula=s.profFormula||'Prof'; }},
  {k:'ordem',ic:'👁',n:'Ordem Paranormal (aprox.)',d:'NEX 5%→99% (20 degraus) · +1 atributo em NEX 20/50/80/95% · perícias e treino em NEX 35/70% · trilha em 10%.',
   f:s=>{ s.levelName='NEX'; s.startLevel=1; s.maxLevel=20; s.semNiveis=false;
     sanitizeProg(s.progression); _faixaNiveis(s).forEach(l=>{ s.progression.labels[l]=(l===20?99:l*5)+'%'; });
     s.ganhos=[_g('atributo',1,{niveis:'4,10,16,19'}),_g('pericia',2,{niveis:'7,14',nota:'+ Intelecto'}),_g('treino',2,{niveis:'7,14'}),_g('escolha',0,{niveis:'2',nota:'Trilha'}),_g('escolha',0,{niveis:'3,6,9,12,15,18',nota:'Poder de classe'})];
     (s.profTiers||[]).forEach((t,i)=>{ if(/vetera|compet/i.test(t.name)) t.nivelMin=7; if(/expert/i.test(t.name)) t.nivelMin=14; }); }},
  {k:'t20',ic:'⚔',n:'Tormenta20 (aprox.)',d:'Níveis 1–20 · poder de classe todo nível · +1 atributo a cada 4 níveis · bônus de treino cresce com o nível.',
   f:s=>{ s.levelName='Nível'; s.startLevel=1; s.maxLevel=20; s.semNiveis=false;
     s.ganhos=[_g('escolha',0,{cada:1,aPartir:2,nota:'Poder de classe'}),_g('atributo',1,{cada:4,aPartir:4})];
     _encheCol(s,_colProg(s,'Treino'),l=>l<7?2:l<15?4:6); }},
  {k:'linear',ic:'📶',n:'Linear simples',d:'+1 ponto de atributo a cada 2 níveis e +1 perícia a cada 3. Bom para sistema caseiro.',
   f:s=>{ const st=s.startLevel||1; s.ganhos=[_g('atributo',1,{cada:2,aPartir:st+2}),_g('pericia',1,{cada:3,aPartir:st+3}),_g('recurso',2,{cada:1,aPartir:st+1,alvoId:((s.resources||[]).find(r=>/vida|pv|hp/i.test(r.name))||{}).id||''})]; }},
  {k:'marcos',ic:'🏁',n:'Marcos (sem números)',d:'Cada degrau é um marco da história: só avisa uma escolha nova. Ótimo para narrativo.',
   f:s=>{ s.ganhos=[_g('escolha',0,{cada:1,aPartir:(s.startLevel||1)+1,nota:'Nova habilidade ou talento'})]; }},
];

function tabProgressaoNova(sys){
  sanitizeProg(sys.progression); sanitizeGanhos(sys);
  return h('div',{class:'prog2'}, progCardEixo(sys), progCardModelos(sys), progCardGanhos(sys), progCardLinha(sys), progCardColunas(sys));
}
function progCardEixo(sys){
  const N=sys.levelName||'Nível';
  return card(tit('1. O eixo de progressão','degrau'),'Como a campanha chama o avanço e de onde até onde ele vai.',null,
    h('div',{class:'grid g3',style:{alignItems:'end'}},
      field('Nome do eixo',h('input',{class:'in',value:N,placeholder:'Nível, NEX, Grau, Patente…',oninput:e=>{sys.levelName=e.target.value;persist();},onchange:()=>render()}),'degrau'),
      numField('Começa no',sys,'startLevel'), numField('Vai até',sys,'maxLevel')),
    h('div',{class:'hint',style:{marginTop:'8px'}},(Math.max(0,(sys.maxLevel||1)-(sys.startLevel||1)+1))+' degraus · o nome vira variável nas fórmulas: “'+N+'”.'));
}
function progCardModelos(sys){
  return card('2. ⚡ Progressão automática','Comece de um modelo: ele preenche as regras de ganho (e colunas como proficiência) de uma vez. Depois ajuste à vontade.',null,
    h('div',{class:'prog-modelos'},...PROG_PRESETS.map(p=>h('button',{type:'button',class:'prog-modelo',title:p.d,onclick:async()=>{
      if((sys.ganhos||[]).length&&!(await uiConfirm('Trocar as regras de ganho atuais pelas do modelo “'+p.n+'”?',{titulo:'Aplicar modelo',okText:'Aplicar'}))) return;
      pushUndo(); p.f(sys); sanitizeGanhos(sys); render(); showToast('📈 Progressão: '+p.n); }},
      h('span',{class:'prog-ic'},p.ic),h('b',{},p.n),h('small',{},p.d)))));
}
function progCardGanhos(sys){
  const N=(sys.levelName||'Nível').toLowerCase(), st=sys.startLevel||1;
  const add=(tipo,o)=>{ pushUndo(); sys.ganhos.push(_g(tipo,tipo==='escolha'?0:1,Object.assign({cada:1,aPartir:st+1},o||{}))); render(); };
  const linha=g=>{ const t=ganhoTipo(g.tipo), lista=ganhoNiveisLista(g).length>0||S.ui['gl_'+g.id];
    const alvoSel=t.alvo?h('select',{class:'in',style:{maxWidth:'160px'},'aria-label':'Alvo',onchange:e=>{g.alvoId=e.target.value;render();}},
      h('option',{value:''},t.alvo==='attr'?'— atributo —':'— recurso —'),...(t.alvo==='attr'?(sys.attributes||[]).map(a=>[a.id,a.name]):(sys.resources||[]).map(r=>[r.id,r.name])).map(([v,n])=>h('option',{value:v,selected:g.alvoId===v},n))):null;
    return h('div',{class:'ganho'},
      h('div',{class:'ganho-l1'},
        g.tipo==='escolha'?null:h('input',{class:'in ganho-qtd',type:'number',value:g.qtd,'aria-label':'Quantidade',onchange:e=>{g.qtd=parseFloat(e.target.value)||0;render();}}),
        h('select',{class:'in',style:{maxWidth:'220px'},'aria-label':'O que ganha',onchange:e=>{g.tipo=e.target.value;render();}},...GANHO_TIPOS.map(x=>h('option',{value:x.k,selected:g.tipo===x.k},x.ic+' '+x.n))),
        alvoSel,
        g.tipo==='escolha'?h('input',{class:'in',style:{maxWidth:'200px'},value:g.nota,placeholder:'Talento, Trilha, Poder…',oninput:e=>{g.nota=e.target.value;persist();},onchange:()=>render()}):null,
        h('div',{class:'toggle ganho-modo'},
          h('button',{class:!lista?'on-m':'',type:'button',onclick:()=>{g.niveis='';S.ui['gl_'+g.id]=false;render();}},'a cada N'),
          h('button',{class:lista?'on-m':'',type:'button',onclick:()=>{S.ui['gl_'+g.id]=true;if(!g.niveis) g.niveis=String(g.aPartir||st+1);render();}},'em níveis certos')),
        lista?h('input',{class:'in',style:{maxWidth:'190px'},value:g.niveis,placeholder:'4, 8, 12, 16, 19','aria-label':'Níveis',onchange:e=>{g.niveis=e.target.value;render();}})
          :h('span',{class:'row ganho-cada'},h('span',{class:'hint'},'a cada'),h('input',{class:'in',type:'number',min:'1',value:g.cada,'aria-label':'A cada',onchange:e=>{g.cada=Math.max(1,parseInt(e.target.value)||1);render();}}),
            h('span',{class:'hint'},pluralEixo(N)+', do'),h('input',{class:'in',type:'number',value:g.aPartir||st+1,'aria-label':'A partir',onchange:e=>{g.aPartir=parseInt(e.target.value)||st+1;render();}}),
            h('span',{class:'hint'},'até'),h('input',{class:'in',type:'number',value:g.ate||'',placeholder:'fim','aria-label':'Até',onchange:e=>{g.ate=parseInt(e.target.value)||0;render();}})),
        h('button',{class:'btn mini ghost','aria-label':'Remover regra',onclick:()=>{pushUndo();sys.ganhos=sys.ganhos.filter(x=>x!==g);render();}},'✕')),
      h('div',{class:'ganho-frase'},ganhoFrase(sys,g),h('span',{class:'hint'},' · '+t.d)));
  };
  const lpMax=levelPoints(sys,sys.maxLevel);
  return card('3. 📋 O que se ganha ao subir','Cada linha é uma regra. Leia a frase embaixo dela para conferir.',null,
    sys.ganhos.length?null:h('div',{class:'vazio'},h('div',{class:'vazio-t'},'Nenhuma regra ainda'),h('div',{class:'hint'},'Use um modelo acima ou adicione abaixo. Ex.: +2 pontos de atributo nos níveis 4, 8, 12.')),
    ...sys.ganhos.map(linha),
    h('div',{class:'row wrapf',style:{marginTop:'10px'}},h('span',{class:'hint'},'+ Adicionar:'),
      ...GANHO_TIPOS.map(t=>h('button',{type:'button',class:'chip',title:t.d,onclick:()=>add(t.k)},t.ic+' '+t.n))),
    h('div',{class:'prog-res'},'No '+levelLabel(sys,sys.maxLevel).toLowerCase()+': ',
      h('b',{},lpMax.attrPoints+' pts de atributo'),' · ',h('b',{},lpMax.skillCount+' perícias'),
      lpMax.treino?[' · ',h('b',{},lpMax.treino+' melhorias de treino')]:null,
      lpMax.tecnicas?[' · ',h('b',{},'+'+lpMax.tecnicas+' técnicas')]:null,
      h('span',{class:'hint'},' (inclui os da criação: '+(sys.attributePoints||0)+' atributo, '+(sys.skillChoices||0)+' perícias — aba ⚙️ Regras)')),
    h('div',{class:'hint',style:{marginTop:'6px'}},'💡 Habilidades de classe/origem também podem dar pontos: efeito “💪 +Pontos de atributo”, “🎯 +Perícias” ou “🎓 +Melhorias de treino”.'));
}
function progCardLinha(sys){
  const ui=S.ui, clsId=ui.progCls||'', cls=(sys.classes||[]).find(c=>c.id===clsId);
  const nums=sys.progression.cols.filter(c=>c.tipo==='num'), txts=sys.progression.cols.filter(c=>c.tipo!=='num');
  const cab=['Degrau','Ganha neste degrau','💪 Atrib.','🎯 Perícias',...((sys.ganhos||[]).some(g=>g.tipo==='treino')?['🎓 Treino']:[]),...nums.map(c=>c.name),...txts.map(c=>c.name)];
  const temTreino=(sys.ganhos||[]).some(g=>g.tipo==='treino');
  let antes=null;
  const linhas=_faixaNiveis(sys).map(l=>{
    const lp=levelPoints(sys,l), noNivel=ganhosNoNivel(sys,l);
    const dif=antes?{a:lp.attrPoints-antes.attrPoints,p:lp.skillCount-antes.skillCount,t:lp.treino-antes.treino}:{a:lp.attrPoints,p:lp.skillCount,t:lp.treino};
    antes=lp;
    const chips=[...noNivel.map(g=>h('span',{class:'tl-chip',title:ganhoFrase(sys,g)},ganhoTipo(g.tipo).ic+' '+(g.tipo==='escolha'?(g.nota||'Escolha'):((g.qtd>0?'+':'')+g.qtd+' '+ganhoTipo(g.tipo).n.split(' ')[0])))),
      ...(cls?(cls.abilities||[]).filter(a=>((a.req||{}).level||0)===l).map(a=>h('span',{class:'tl-chip cls',title:a.description||''},(a.icon||cls.icon||'✨')+' '+a.name)):[]),
      ...(l===(sys.startLevel||1)?[h('span',{class:'tl-chip ini'},'⭐ criação')]:[])];
    const row=(sys.progression.rows||{})[l]||{};
    return h('tr',{class:chips.length?'':'tl-vazio'},
      h('td',{class:'lv'},h('b',{},(sys.progression.labels||{})[l]||levelLabel(sys,l))),
      h('td',{},...chips),
      h('td',{class:'n'},String(lp.attrPoints),dif.a&&l!==(sys.startLevel||1)?h('small',{},' +'+dif.a):null),
      h('td',{class:'n'},String(lp.skillCount),dif.p&&l!==(sys.startLevel||1)?h('small',{},' +'+dif.p):null),
      ...(temTreino?[h('td',{class:'n'},String(lp.treino))]:[]),
      ...nums.map(c=>h('td',{class:'n'},row[c.id]==null?'—':String(row[c.id]))),
      ...txts.map(c=>h('td',{},row[c.id]==null?'—':String(row[c.id]))));
  });
  return card('4. 🗓 Linha do tempo','Gerada sozinha a partir das regras e das colunas — é assim que o personagem evolui.',
    (sys.classes||[]).length?h('select',{class:'in',style:{maxWidth:'220px'},'aria-label':'Mostrar habilidades de uma classe',onchange:e=>{ui.progCls=e.target.value;render();}},
      h('option',{value:''},'+ habilidades de uma classe…'),...sys.classes.map(c=>h('option',{value:c.id,selected:c.id===clsId},(c.icon||'')+' '+c.name))):null,
    h('div',{class:'prog-tl-wrap'},h('table',{class:'prog-tl'},h('thead',{},h('tr',{},...cab.map(c=>h('th',{},c)))),h('tbody',{},...linhas))),
    h('div',{class:'hint',style:{marginTop:'6px'}},'Totais são acumulados (criação + regras). Para pontos/perícias por nível na ficha, o jogador usa ⬆ Subir de nível.'));
}
function progCardColunas(sys){
  const N=sys.levelName||'Nível';
  const atalhos=[
    ['🎯 Bônus de proficiência (D&D)',()=>_encheCol(sys,_colProg(sys,'Prof'),l=>2+Math.floor((l-1)/4))],
    ['🎲 Dado de dano que cresce',()=>_encheCol(sys,_colProg(sys,'Dado','texto'),l=>['1d4','1d6','1d8','1d10','1d12','2d8'][Math.min(5,Math.floor((l-1)/4))])],
    ['⚔ Ataques por turno',()=>_encheCol(sys,_colProg(sys,'Ataques'),l=>1+(l>=5?1:0)+(l>=11?1:0)+(l>=20?1:0))],
    ['👁 NEX em % (rótulos)',()=>{ _faixaNiveis(sys).forEach(l=>{ sys.progression.labels[l]=(l>=20?99:l*5)+'%'; }); }],
    ['🏅 Grau / patente (texto)',()=>_encheCol(sys,_colProg(sys,'Grau','texto'),l=>['Recruta','Operador','Agente especial','Oficial','Elite'][Math.min(4,Math.floor((l-1)/4))])],
  ];
  const aberto=!!S.ui.progColsAberto||sys.progression.cols.length>0;
  return card('5. 🔢 Colunas extras (opcional)','Valores que mudam por degrau e viram variáveis nas fórmulas (ex.: “Prof” na fórmula de proficiência, “Dado” no dano).',
    h('button',{type:'button',class:'btn sm ghost',onclick:()=>{S.ui.progColsAberto=!aberto;render();}},aberto?'▴ Recolher':'▾ Abrir tabela'),
    h('div',{class:'row wrapf'},h('span',{class:'hint'},'Atalhos:'),...atalhos.map(([t,fn])=>h('button',{type:'button',class:'chip',onclick:()=>{pushUndo();fn();S.ui.progColsAberto=true;render();showToast('Coluna preenchida em todos os degraus');}},t))),
    aberto?h('div',{style:{marginTop:'10px'}},progEditor(sys,sys.progression,{labels:true}),
      h('div',{class:'hint',style:{marginTop:'8px'}},'Botão ƒ numa coluna preenche todos os degraus com uma fórmula (ex.: 2 + piso(('+N+' - 1) / 4)). 📋 cola direto de uma planilha. Cada classe pode ter a tabela dela em 🎭 Classes → Tabela.')):null);
}
