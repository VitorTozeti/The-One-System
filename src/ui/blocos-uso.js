/* ============================================================ EDITOR DE TÉCNICA EM BLOCOS ============================================================
   Em vez de "escolha o tipo → preencha 5 passos", a técnica é uma lista de BLOCOS em frases:
       Custa [3] de [Mana]            (sempre no topo)
       💥 Causa [6d6] de dano de [Fogo]
       📏 Em [área ▾] [círculo ▾] de [6] m
       🎲 O alvo testa [Agilidade] contra [10 + Nível]; se passar: [metade]
       🔋 [Em mim ▾] [Seda] [+1]
   Você adiciona só o que a técnica faz; o TIPO (cor, ícone, verbo do botão) é deduzido sozinho.
   Os dados são os mesmos de sempre (ab.uso), então o "modo detalhado" antigo continua abrindo a mesma técnica.
   us.blocos guarda a ordem dos blocos; sem ela, é deduzida do que já está preenchido (técnicas antigas).
   Depende de tecnicas-editor.js (usoTipo, invocEditor, areaDesenho, cartaoTecnica…), assistentes.js (CONDS_RAPIDAS), poderes.js (USOS_RECARGA). */

const BLOCOS_USO=[
  {k:'dano',    ic:'💥',n:'Dano',                 d:'Causa dano num alvo ou numa área'},
  {k:'cura',    ic:'💚',n:'Cura / recupera',      d:'Devolve Vida (ou outro recurso) a você ou a um aliado'},
  {k:'recurso', ic:'🔋',n:'Mexe em recurso',      d:'Ganha Seda ao acertar, perde Sanidade, rouba Vida…'},
  {k:'condicao',ic:'🌀',n:'Condição',             d:'Lento, Cego, Em chamas, Inspirado…'},
  {k:'teste',   ic:'🎲',n:'Teste do alvo',        d:'O alvo resiste: sofre metade ou anula'},
  {k:'ataque',  ic:'🎯',n:'Rolagem de ataque',    d:'d20 + bônus contra a Defesa do alvo'},
  {k:'alcance', ic:'📏',n:'Alcance e área',       d:'Toque, à distância, cone, explosão, aura'},
  {k:'invoc',   ic:'🐺',n:'Invocação',            d:'Chama uma criatura com ficha própria'},
  {k:'bonus',   ic:'🛡',n:'Bônus enquanto ligada',d:'+Defesa, voo, resistência… (vira liga/desliga)'},
  {k:'duracao', ic:'⏳',n:'Duração',              d:'Rodadas, minutos, concentração'},
  {k:'usos',    ic:'🔁',n:'Usos limitados',       d:'3× por descanso, ferramenta, consumível'},
  {k:'magia',   ic:'📘',n:'Regras de magia',      d:'Execução, círculo, componentes, ritual, aumentar'},
  {k:'texto',   ic:'📜',n:'Texto ao usar',        d:'A frase que aparece quando usa'},
];
const blocoInfo=k=>BLOCOS_USO.find(b=>b.k===k);
/* receitas para começar do zero com um clique */
const RECEITAS_BLOCOS=[
  {n:'Ataque',ic:'💥',b:['alcance','dano'],ini:(s,us)=>{ us.alcance='distancia'; us.area.tam='18'; us.alvos='1'; us.formula='2d6'; }},
  {n:'Explosão',ic:'🔥',b:['alcance','dano','teste'],ini:(s,us)=>{ us.alcance='area'; us.area={forma:'circulo',tam:'6'}; us.formula='4d6'; us.teste={attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}; }},
  {n:'Cura',ic:'💚',b:['cura'],ini:(s,us)=>{ us.formula='2d8 + Nível'; us.aplicaEm='eu'; const v=_recPor(s,_V); if(v) us.alvoId=v.id; }},
  {n:'Buff (liga/desliga)',ic:'🛡',b:['bonus'],ini:(s,us,ab)=>{ us.modo='ativa'; if(!ab.effects.length) ab.effects.push(_ef(_rol('defesa',2))); }},
  {n:'Debuff',ic:'🌀',b:['alcance','condicao','teste'],ini:(s,us)=>{ us.alcance='distancia'; us.area.tam='18'; us.alvos='1'; us.condEm='alvo'; us.duracao='1 minuto'; us.condId=_garanteCond(s,CONDS_RAPIDAS[0]); us.teste={attr:_atrNome(s,_VONTADE),cd:'10 + Nível',sucesso:'sem'}; }},
  {n:'Invocação',ic:'🐺',b:['invoc'],ini:(s,us)=>{ _blocoLiga(s,null,us,'invoc'); }},
  {n:'Golpe que carrega',ic:'🕸',b:['alcance','dano','recurso'],ini:(s,us)=>{ us.alcance='toque'; us.formula='1d8'; const r=(s.resources||[]).find(x=>(x.type||'barra')!=='valor'&&!_V.includes(x.name)); us.extras=[{id:uid(),resId:r?r.id:'',formula:'1',quem:'eu'}]; }},
  {n:'Ferramenta',ic:'🧰',b:['alcance','dano','usos'],ini:(s,us)=>{ us.alcance='distancia'; us.area.tam='12'; us.formula='1d6'; us.usos={max:'3',recarga:'longo'}; }},
];

function _blocosDeduzidos(us,ab){
  const b=[], tem=x=>String(x||'').trim();
  if(us.invoc) b.push('invoc');
  if(us.alcance) b.push('alcance');
  if(tem(us.formula)){ if(usoTipo(us)==='cura'||usoAplicaEm(us)==='eu') b.push('cura'); else b.push('dano'); }
  if(us.ataque&&us.ataque.on) b.push('ataque');
  if(us.teste&&us.teste.attr) b.push('teste');
  if(us.condId) b.push('condicao');
  if((us.extras||[]).length) b.push('recurso');
  if(us.modo==='ativa'&&(ab.effects||[]).length) b.push('bonus');
  if(tem(us.duracao)||us.concentracao) b.push('duracao');
  if(us.usos&&tem(us.usos.max)) b.push('usos');
  if(us.execucao||us.circulo||tem(us.componentes)||us.ritual||tem((us.aumenta||{}).formula)) b.push('magia');
  if(tem(us.texto)) b.push('texto');
  return b;
}
/* o tipo sai dos blocos: invocação > dano > cura > debuff > buff > utilidade */
function _tipoDosBlocos(us,bl){
  if(bl.includes('invoc')) return 'invocacao';
  if(bl.includes('dano')) return 'dano';
  if(bl.includes('cura')) return 'cura';
  if(bl.includes('condicao')&&us.condEm!=='eu') return 'debuff';
  if(us.modo==='ativa'||bl.includes('bonus')||(bl.includes('condicao')&&us.condEm==='eu')) return 'buff';
  return 'utilidade';
}
/* ao adicionar um bloco, já vem com um valor que funciona */
function _blocoLiga(sys,ab,us,k){
  if(k==='dano'){ us.aplicaEm='alvo'; if(!String(us.formula||'').trim()) us.formula='2d6'; us.formula=String(us.formula).replace(/^\s*-\s*/,''); if(!us.alcance){ us.alcance='distancia'; us.area.tam=us.area.tam||'18'; us.alvos=us.alvos||'1'; } }
  if(k==='cura'){ if(!String(us.formula||'').trim()) us.formula='2d8'; if(!us.aplicaEm) us.aplicaEm='eu'; if(us.aplicaEm==='eu'&&!us.alvoId){ const v=_recPor(sys,_V); if(v) us.alvoId=v.id; } }
  if(k==='recurso'&&!us.extras.length) us.extras.push({id:uid(),resId:'',formula:'1',quem:'eu'});
  if(k==='condicao'&&!us.condId){ us.condId=((sys.conditions||[])[0]||{}).id||_garanteCond(sys,CONDS_RAPIDAS[0]); if(!us.condEm) us.condEm='alvo'; }
  if(k==='teste'&&!us.teste.attr) us.teste={attr:_atrNome(sys,_REFLEXO)||(((sys.attributes||[])[0]||{}).name||''),cd:'10 + Nível',sucesso:'metade'};
  if(k==='ataque') us.ataque={on:true,bonus:us.ataque.bonus||(typeof bonusMagiaPadrao==='function'?bonusMagiaPadrao(sys):'')};
  if(k==='alcance'&&!us.alcance) us.alcance='toque';
  if(k==='invoc'&&!us.invoc) us.invoc={nome:'Criatura',icone:'🐺',cor:'#f59e0b',estilo:'fera',vida:'10 + Nível * 2',defesa:'12',ataque:'+4',dano:'1d6 + 2',mov:'9',qtd:'1',duracao:'1 minuto',desc:''};
  if(k==='bonus'){ us.modo='ativa'; if(ab&&!ab.effects.length) ab.effects.push(_ef(_rol('defesa',2))); }
  if(k==='duracao'&&!us.duracao) us.duracao='1 minuto';
  if(k==='usos'&&!String(us.usos.max||'').trim()) us.usos={max:'3',recarga:'longo'};
}
/* ao tirar um bloco, limpa o que ele preenchia */
function _blocoDesliga(sys,ab,us,k){
  if(k==='dano'||k==='cura'){ us.formula=''; us.alvoId=''; us.tipoDano=''; us.aplicaEm=''; }
  if(k==='recurso') us.extras=[];
  if(k==='condicao') us.condId='';
  if(k==='teste') us.teste={attr:'',cd:'',sucesso:'metade'};
  if(k==='ataque') us.ataque={on:false,bonus:''};
  if(k==='alcance'){ us.alcance=''; us.area={forma:'',tam:''}; us.alvos=''; }
  if(k==='invoc') us.invoc=null;
  if(k==='bonus'){ us.modo='instantaneo'; }
  if(k==='duracao'){ us.duracao=''; us.concentracao=false; }
  if(k==='usos') us.usos={max:'',recarga:'longo'};
  if(k==='magia'){ us.execucao=''; us.circulo=0; us.componentes=''; us.ritual=false; us.escola=''; us.aumenta={formula:'',custo:'',max:''}; }
  if(k==='texto') us.texto='';
}

function usoBlocos(sys,ab){
  sanitizarUsoHab(ab); const us=ab.uso;
  if(!Array.isArray(us.blocos)) us.blocos=_blocosDeduzidos(us,ab);
  us.blocos=[...new Set(us.blocos.filter(k=>blocoInfo(k)))];
  const bl=us.blocos;
  us.tipo=_tipoDosBlocos(us,bl);
  const tp=tipoInfo(us.tipo);
  /* campos pequenos que ficam dentro da frase */
  const t=(obj,k,ph,w,mono)=>h('input',{class:'in blk-in'+(mono?' mono':''),style:{width:w||'120px'},value:obj[k]==null?'':obj[k],placeholder:ph||'',spellcheck:'false','aria-label':ph||k,
    oninput:e=>{obj[k]=e.target.value;persist();},onchange:()=>render()});
  const sel=(obj,k,lista,vazio,w)=>{ const s=h('select',{class:'in blk-in',style:{width:w||'auto'},'aria-label':vazio||k,onchange:e=>{obj[k]=e.target.value;render();}});
    if(vazio!=null) s.appendChild(h('option',{value:''},vazio));
    lista.forEach(([v,n])=>s.appendChild(h('option',{value:v,selected:String(obj[k])===String(v)},n))); return s; };
  const recs=(sys.resources||[]).filter(r=>(r.type||'barra')!=='valor').map(r=>[r.id,(r.icon?r.icon+' ':'')+r.name]);
  const atrs=(sys.attributes||[]).map(a=>[a.name,a.name]);
  const fr=(...p)=>h('div',{class:'blk-frase'},...p.map(x=>typeof x==='string'?h('span',{},x):x));
  const media=f=>{ if(!String(f||'').trim()) return null; const v=mediaExpr(f,varsNoDegrau(sys,Math.max(1,sys.maxLevel||1)));
    return h('span',{class:'blk-media'+(Number.isNaN(v)?' ruim':'')},Number.isNaN(v)?'⚠ fórmula inválida':('≈ '+Math.round(Math.abs(v)*10)/10+' no '+levelLabel(sys,Math.max(1,sys.maxLevel||1)).toLowerCase())); };
  const tira=k=>()=>{ pushUndo(); _blocoDesliga(sys,ab,us,k); us.blocos=bl.filter(x=>x!==k); render(); };
  const sobe=k=>()=>{ const i=bl.indexOf(k); if(i>0){ bl.splice(i,1); bl.splice(i-1,0,k); render(); } };

  const corpoDe=k=>{
    if(k==='dano') return [fr('Causa',t(us,'formula','6d6','110px',true),'de dano de',(()=>{ const i=t(us,'tipoDano','Fogo, Corte…','140px'); i.setAttribute('list','dl-tags'); return i; })(),'no alvo',media(us.formula)),
      h('div',{class:'row wrapf blk-chips'},...['Fogo','Frio','Elétrico','Ácido','Corte','Impacto','Perfuração','Psíquico','Necrótico','Luz','Trevas','Amaldiçoado'].map(n=>h('button',{type:'button',class:'chip'+(us.tipoDano===n?' on':''),onclick:()=>{us.tipoDano=n;render();}},n)))];
    if(k==='cura'){ const emMim=usoAplicaEm(us)==='eu';
      const onde=h('select',{class:'in blk-in','aria-label':'Onde a cura cai',onchange:e=>{ us.aplicaEm=e.target.value; if(us.aplicaEm==='eu'&&!us.alvoId){ const v=_recPor(sys,_V); if(v) us.alvoId=v.id; } render(); }},
        h('option',{value:'eu',selected:emMim},'em mim'),h('option',{value:'alvo',selected:!emMim},'num aliado (rola e mostra)'));
      return [fr('Recupera',t(us,'formula','2d8 + Nível','120px',true),emMim?'de':'',emMim?sel(us,'alvoId',recs,'— recurso —'):'',onde,media(us.formula))]; }
    if(k==='recurso') return [h('div',{class:'hint'},'Negativo = perde. Ex.: golpe que ganha +1 de Seda, magia proibida que tira −1d4 de Sanidade, drenar vida (+1d6 de Vida em mim).'),
      ...us.extras.map(x=>fr(sel(x,'quem',[['eu','Em mim'],['alvo','No alvo']],null),sel(x,'resId',recs,'— recurso —'),t(x,'formula','+1 ou -1d4','110px',true),
        h('button',{type:'button',class:'btn mini ghost','aria-label':'Tirar esta linha',onclick:()=>{us.extras=us.extras.filter(y=>y!==x); if(!us.extras.length) us.blocos=bl.filter(z=>z!=='recurso'); render();}},'✕'))),
      h('button',{type:'button',class:'btn mini ghost',onclick:()=>{us.extras.push({id:uid(),resId:'',formula:'1',quem:'eu'});render();}},'+ outro recurso')];
    if(k==='condicao'){ const conds=(sys.conditions||[]).map(c=>[c.id,(c.icon||'⚠')+' '+c.name]);
      return [fr('Deixa',sel(us,'condEm',[['alvo','o alvo'],['eu','você mesmo']],null),sel(us,'condId',conds,'— condição —'),us.duracao?('por '+us.duracao):''),
        h('div',{class:'row wrapf blk-chips'},...CONDS_RAPIDAS.filter(c=>!(sys.conditions||[]).some(x=>semAcentoSeguro(x.name)===semAcentoSeguro(c[0]))).map(c=>
          h('button',{type:'button',class:'chip',title:'Cria “'+c[0]+'” no sistema e usa aqui',onclick:()=>{us.condId=_garanteCond(sys,c);render();}},'+ '+c[1]+' '+c[0])))]; }
    if(k==='teste') return [fr('O alvo testa',sel(us.teste,'attr',atrs,'— atributo —'),'contra',t(us.teste,'cd','10 + Nível','120px',true),'; se passar:',
      sel(us.teste,'sucesso',[['metade','sofre metade'],['nada','nada acontece'],['sem','só evita a condição']],null)),
      fr(h('label',{class:'blk-chk'},h('input',{type:'checkbox',checked:!!us.repete,onchange:e=>{us.repete=e.target.checked;render();}}),' repete o teste no fim de cada turno'))];
    if(k==='ataque') return [fr('Rola d20 +',t(us.ataque,'bonus',typeof bonusMagiaPadrao==='function'?bonusMagiaPadrao(sys):'+5','200px',true),'contra a Defesa do alvo (20 natural = crítico, dobra os dados)')];
    if(k==='alcance'){ const ar=us.area;
      return [fr(sel(us,'alcance',ALCANCES,null),
        us.alcance==='distancia'?t(ar,'tam','18','60px'):'', us.alcance==='distancia'?'m,':'',
        us.alcance==='distancia'||us.alcance==='toque'?sel(us,'alvos',[['1','1 alvo'],['2','2 alvos'],['3','3 alvos'],['todos','todos que vê']],'— alvos —'):'',
        us.alcance==='area'?sel(ar,'forma',FORMAS_AREA,'— forma —'):'', us.alcance==='area'?'de':'', us.alcance==='area'?t(ar,'tam','6','60px'):'', us.alcance==='area'?'m':''),
        us.alcance==='area'&&ar.forma?areaDesenho(ar,tp.cor):null]; }
    if(k==='invoc') return [invocEditor(sys,us)];
    if(k==='bonus') return [h('div',{class:'hint'},'Valem enquanto a técnica estiver ligada (o botão vira ⏻ Ligar). São os mesmos da aba ⚙️.'),
      ...ab.effects.map(ef=>effectRow(sys,ab.effects,ef,0)),
      h('div',{class:'row wrapf'},receitaSelect(sys,ab.effects),h('button',{class:'btn sm ghost',type:'button',onclick:()=>{ab.effects.push(newEffect(sys));render();}},'+ Efeito em branco'))];
    if(k==='duracao') return [fr('Dura',t(us,'duracao','3 rodadas, 1 minuto, cena…','200px'),
      h('label',{class:'blk-chk'},h('input',{type:'checkbox',checked:!!us.concentracao,onchange:e=>{us.concentracao=e.target.checked;render();}}),' 🧠 exige concentração (só uma por vez)')),
      h('div',{class:'row wrapf blk-chips'},...['1 rodada','3 rodadas','1 minuto','10 minutos','1 hora','cena','até dispensar'].map(n=>h('button',{type:'button',class:'chip'+(us.duracao===n?' on':''),onclick:()=>{us.duracao=n;render();}},n)))];
    if(k==='usos') return [fr('Pode usar',t(us.usos,'max','3','70px',true),'vez(es); volta no',sel(us.usos,'recarga',USOS_RECARGA,null)),
      h('div',{class:'hint'},'Aceita fórmula (ex.: 1 + piso(Nível / 4)). Os usos voltam nos botões de descanso da ficha.')];
    if(k==='magia') return [typeof conjuracaoEditor==='function'?conjuracaoEditor(sys,ab):h('div',{class:'hint'},'—')];
    if(k==='texto') return [h('input',{class:'in',value:us.texto||'',placeholder:'Ex.: Fios de seda cortam o ar.',oninput:e=>{us.texto=e.target.value;persist();},onchange:()=>render()})];
    return [];
  };
  const blocoCard=(k,i)=>{ const b=blocoInfo(k);
    return h('div',{class:'tbk',style:{'--tc':tp.cor}},
      h('div',{class:'blk-cab'},h('span',{class:'blk-ic'},b.ic),h('b',{},b.n),h('span',{style:{flex:'1'}}),
        i>0?h('button',{type:'button',class:'btn mini ghost',title:'Subir','aria-label':'Subir '+b.n,onclick:sobe(k)},'↑'):null,
        h('button',{type:'button',class:'btn mini ghost',title:'Tirar este bloco','aria-label':'Tirar '+b.n,onclick:tira(k)},'✕')),
      h('div',{class:'blk-corpo'},...corpoDe(k)));
  };
  /* paleta: dano e cura usam a mesma fórmula principal, então um exclui o outro */
  const livres=BLOCOS_USO.filter(b=>!bl.includes(b.k)&&!((b.k==='dano'&&bl.includes('cura'))||(b.k==='cura'&&bl.includes('dano'))));
  const add=k=>{ pushUndo(); _blocoLiga(sys,ab,us,k); bl.push(k); render(); };
  const paleta=h('div',{class:'blk-paleta'},h('div',{class:'uso-sec-t'},'＋ Adicionar à técnica'),
    h('div',{class:'blk-pal-grid'},...livres.map(b=>h('button',{type:'button',class:'blk-op',title:b.d,onclick:()=>add(b.k)},h('span',{},b.ic),h('b',{},b.n),h('small',{},b.d)))));
  const receitas=!bl.length?h('div',{class:'blk-receitas'},h('div',{class:'uso-sec-t'},'⚡ Começar de uma receita (depois ajuste os blocos)'),
    h('div',{class:'row wrapf'},...RECEITAS_BLOCOS.map(r=>h('button',{type:'button',class:'btn sm',onclick:()=>{ pushUndo(); r.ini(sys,us,ab); r.b.forEach(k=>{ if(!bl.includes(k)) bl.push(k); }); render(); }},r.ic+' '+r.n)))):null;
  /* topo: como usa e quanto custa */
  const modoBtn=(v,rot)=>h('button',{type:'button',class:'btn sm '+(us.modo===v?'emerald':'ghost'),'aria-pressed':us.modo===v?'true':'false',onclick:()=>{us.modo=v; if(v==='instantaneo'&&bl.includes('bonus')) us.blocos=bl.filter(x=>x!=='bonus'); render();}},(us.modo===v?'✓ ':'')+rot);
  const topo=h('div',{class:'tbk tbk-topo',style:{'--tc':tp.cor}},
    fr(modoBtn('instantaneo','✨ Usa e pronto'),modoBtn('ativa','⏻ Liga / desliga'),' · custa',
      us.custoId?t(us,'custo','3','70px',true):'',sel(us,'custoId',recs,'nada (grátis)')),
    us.modo==='ativa'?h('div',{class:'hint'},'Ligada: os bônus valem e a invocação/condição em você fica ativa. O custo é pago ao ligar.'):null);
  const custoTxt=(()=>{ const r=(sys.resources||[]).find(x=>x.id===us.custoId); return r&&String(us.custo||'').trim()?(us.custo+' '+r.name):'grátis'; })();
  return h('div',{class:'req-box uso-hab uso2 blk-ed',style:{'--tc':tp.cor}},
    h('div',{class:'row wrapf'},
      h('button',{type:'button',class:'btn sm '+(us.on?'emerald':'ghost'),'aria-pressed':us.on?'true':'false',onclick:()=>{us.on=!us.on;render();}},(us.on?'✓ ':'')+'Tem um botão na ficha'),
      h('span',{class:'hint',style:{flex:'1'}},us.on?'Monte a técnica com blocos: cada um é uma frase. O tipo e a cor saem sozinhos ('+tp.ic+' '+tp.n+').':'Ligue para magias, ataques, curas, invocações ou ferramentas.'),
      us.on?h('button',{type:'button',class:'btn sm ghost',title:'Ver todos os campos de uma vez (editor antigo)',onclick:()=>{S.ui.usoDetalhado=true;render();}},'🔧 Modo detalhado'):null),
    us.on?h('div',{class:'uso2-grid'},
      h('div',{class:'blk-lista'},topo,receitas,...bl.map(blocoCard),paleta),
      h('div',{class:'uso2-prev'},
        h('div',{class:'uso-sec-t'},'👁 Como aparece na ficha'),cartaoTecnica(sys,null,null,ab,{prev:true}),
        h('div',{class:'uso2-frase'},h('b',{},'Em resumo: '),usoHabResumo(sys,ab)||'—'),
        h('div',{class:'hint'},'Custo: '+custoTxt+(us.modo==='ativa'?' · liga/desliga':''))),
      typeof datalistTags==='function'?datalistTags(sys,'dl-tags'):null):null);
}
