/* ============================================================ CAMPANHA — FERRAMENTAS DE MESA ============================================================
   Seção "Ferramentas" (🧰): recursos do grupo e relógios de ameaça, tabelas
   aleatórias (encontros, loot, rumores, clima, nomes), calculadora de encontro,
   XP do grupo, Tela dos jogadores e Backup. Também a rolagem secreta do Mestre.
   Gera nomes com nomeProc (definido logo abaixo).
   Estado: c.clocks, c.resources, c.tables, c.xp (ver campaign-model.js). */
/* Nomes procedurais (cidades e reinos) — usados pelos geradores de nomes abaixo. */
function sorteiaDe(rnd,a){ return a[Math.floor(rnd()*a.length)]; }
const NOME_A=['Val','Dor','Kar','Ael','Thal','Mor','Eld','Vor','Nor','Syl','Bra','Cal','Gal','Ith','Ren','Ast','Dun','Fen','Hal','Ker'];
const NOME_B=['an','or','en','ar','ul','is','ev','ad','on'];
const NOME_REINO=['dia','mark','heim','ria','land','vale','gard','thos','mir','nia','dor'];
const NOME_CIDADE=['burgo','porto','ford','haven','ton','stad','polis','cairn','dale','mere','wick','ir'];
function nomeProc(rnd, tipo){
  const base=sorteiaDe(rnd,NOME_A)+(rnd()<.55?sorteiaDe(rnd,NOME_B):'');
  return base+sorteiaDe(rnd,tipo==='reino'?NOME_REINO:NOME_CIDADE);
}


/* ---------- Rolagem secreta ---------- */
/* Rola sem registrar como pública: só o Mestre vê (toast + histórico com 🤫). */
function rolarSecreta(expr){
  expr=String(expr||'').trim(); if(!expr) return;
  const res=rollExpr(expr, campVars());
  logDice(res,'Mestre 🤫');
  if(S.campaign.diceLog[0]) S.campaign.diceLog[0].secret=true;
  if(res&&!res.erro) showToast('🤫 Secreta: '+expr+' = '+res.total); else showToast('⚠ '+(res.erro||'Expressão inválida'));
  render();
}

/* ---------- Tabelas padrão ---------- */
const TABELAS_PADRAO=[
  {id:'enc-estrada', nome:'🛣️ Encontros — Estrada', entries:['Mercador viajante com a carroça quebrada','Patrulha de guardas pedindo pedágio','Bando de salteadores em emboscada','Peregrinos famintos','Arauto real com notícias urgentes','Lobos seguindo o grupo à distância','Caravana atacada (restos ainda quentes)','Viajante misterioso que sabe demais']},
  {id:'enc-floresta', nome:'🌲 Encontros — Floresta', entries:['Rastros de uma criatura grande','Clareira com um círculo de pedras antigas','Caçador ferido por uma armadilha','Enxame de insetos agressivos','Fada que propõe um trato','Acampamento abandonado, fogueira ainda morna','Javali enfurecido','Névoa densa: teste de orientação']},
  {id:'enc-masmorra', nome:'🕳️ Encontros — Masmorra', entries:['Sala vazia com pegadas frescas','Armadilha de dardos no corredor','Esqueletos que se levantam ao tocar o baú','Prisioneiro acorrentado pedindo ajuda','Lodo ácido pingando do teto','Patrulha de monstros em ronda','Porta selada com enigma','Cheiro de fumaça: algo vivo mora aqui']},
  {id:'enc-cidade', nome:'🏘️ Encontros — Cidade', entries:['Batedor de carteiras no mercado','Festival de rua barulhento','Briga de taverna que respinga no grupo','Mendigo com um aviso criptografado','Inspeção da guarda nas portas','Contratante oferecendo um serviço discreto','Incêndio num armazém','Rival do passado reconhece um personagem']},
  {id:'loot-comum', nome:'🎁 Loot — Comum', entries:['2d6 moedas de prata','Poção de cura menor','Corda de seda (15 m)','Adaga simples bem conservada','Gema bruta (valor baixo)','Mapa rasgado de um local próximo','Ração para 3 dias','Chave sem fechadura conhecida']},
  {id:'loot-raro', nome:'💎 Loot — Raro', entries:['Arma com marca de encantamento fraco','Anel com inscrição em língua morta','Bolsa com 3d6 moedas de ouro','Poção rara sem rótulo','Diário de um aventureiro que chegou mais longe','Gema lapidada valiosa','Armadura leve de mestre artesão','Pergaminho com uma técnica']},
  {id:'rumores', nome:'🗣️ Rumores', entries:['Dizem que o poço da vila ficou negro na última lua.','O ferreiro anda comprando muito mais minério do que vende.','Luzes estranhas nas ruínas ao norte.','O novo coletor de impostos nunca é visto à luz do dia.','Um tesouro foi enterrado sob o velho carvalho.','A filha do prefeito fugiu — ou foi levada.','Uma companhia de mercenários chega na semana que vem.','O rio tem trazido peixes mortos há dias.']},
  {id:'clima', nome:'⛅ Clima', entries:['Céu limpo e calor seco','Chuva fina constante','Tempestade com raios (visibilidade ruim)','Neblina densa','Vento cortante do norte','Noite sem lua','Calor sufocante, água acaba mais rápido','Frio intenso: teste contra exaustão']},
];
const TABELAS_NOMES=[
  {id:'nome-pessoa', nome:'🧑 Nomes — Pessoa', gen:()=>{ const a=['Val','Dor','Kar','Ael','Thal','Mor','Eld','Vor','Nor','Syl','Bra','Cal'], b=['an','or','en','ar','ul','is','ev','ad','on','ia','eth']; const p=x=>x[Math.floor(Math.random()*x.length)]; return p(a)+p(b)+(Math.random()<.5?p(['do','ra','na','ric','mir','el']):''); }},
  {id:'nome-cidade', nome:'🏘️ Nomes — Cidade', gen:()=>{ try{ const n=nomeProc(Math.random,'cidade'); return n.charAt(0).toUpperCase()+n.slice(1); }catch(e){ return 'Vilaverde'; } }},
  {id:'nome-reino', nome:'🏰 Nomes — Reino', gen:()=>{ try{ const n=nomeProc(Math.random,'reino'); return n.charAt(0).toUpperCase()+n.slice(1); }catch(e){ return 'Valdrin'; } }},
];
function todasTabelas(){ return [...TABELAS_PADRAO, ...TABELAS_NOMES, ...S.campaign.tables.map(t=>Object.assign({custom:true},t))]; }
function tabelaRolar(t){
  const ui=cmp(); let txt, n=null;
  if(t.gen){ txt=t.gen(); }
  else { const e=(t.entries||[]).filter(x=>String(x).trim()); if(!e.length) return showToast('Tabela vazia.'); n=Math.floor(Math.random()*e.length); txt=e[n]; }
  ui.tabRes={tabela:t.nome, texto:txt, n:n==null?null:n+1, total:t.entries?t.entries.length:null};
  render();
}

/* ---------- Calculadora de encontro ---------- */
/* poder = soma dos atributos (efetivos) + PV/5. Heurística transparente, não regra do sistema. */
function poderDe(attrs, hp){
  const sys=S.system; let soma=0;
  (sys.attributes||[]).forEach(a=>{ const raw=attrs&&attrs[a.id]; soma+=effAttr(sys, raw!=null?raw:sys.startAttrValue); });
  return Math.round((soma+(hp||10)/5)*10)/10;
}
function poderJogador(p){
  const x={kind:'player', refId:p.id};
  return poderDe(p.sheet&&p.sheet.attrs, cbHpPadraoJogador(x)||10);
}
function poderInimigo(sb){ return poderDe(sb.attrs, sb.hpMax||sb.hp); }
function encontroView(){
  const c=S.campaign, ui=cmp(); ui.enc=ui.enc||{};
  const party=c.players.map(p=>({n:p.name, v:poderJogador(p)}));
  const pTot=party.reduce((s,x)=>s+x.v,0);
  const inim=c.bestiary.enemies.filter(sb=>ui.enc[sb.id]>0).map(sb=>({sb, q:ui.enc[sb.id], v:poderInimigo(sb)}));
  const eTot=inim.reduce((s,x)=>s+x.v*x.q,0);
  const r=pTot?eTot/pTot:0;
  const nivel=!eTot?['—','']:r<.35?['Trivial','ok']:r<.7?['Fácil','ok']:r<1.1?['Equilibrado','ok']:r<1.6?['Difícil','warn']:['Mortal','bad'];
  const linhas=c.bestiary.enemies.map(sb=>h('div',{class:'mv-enc-row'},
    h('span',{class:'mv-enc-n'}, sb.name), h('span',{class:'hint'},'poder '+poderInimigo(sb)),
    h('div',{class:'mv-step'},
      h('button',{class:'btn mini', onclick:()=>{ui.enc[sb.id]=Math.max(0,(ui.enc[sb.id]||0)-1);render();}},'−'),
      h('b',{}, ui.enc[sb.id]||0),
      h('button',{class:'btn mini', onclick:()=>{ui.enc[sb.id]=(ui.enc[sb.id]||0)+1;render();}},'+'))));
  return h('div',{},
    card('Calculadora de encontro','Compara o poder do grupo com o dos inimigos escolhidos. Poder = soma dos atributos + PV÷5 (uma estimativa; ajuste pelo seu olho de Mestre).',
      h('button',{class:'btn sm ghost', onclick:()=>{ ui.enc={}; c.combat.order.filter(x=>x.kind==='enemy'&&x.refId).forEach(x=>{ui.enc[x.refId]=(ui.enc[x.refId]||0)+1;}); render(); }},'↧ Usar o combate atual'),
      h('div',{class:'mv-enc-res '+nivel[1]},
        h('div',{class:'mv-enc-lv'}, nivel[0]),
        h('div',{class:'hint'},'Grupo '+Math.round(pTot*10)/10+' ('+party.length+' jog.) · Inimigos '+Math.round(eTot*10)/10+(pTot?(' · razão '+r.toFixed(2)):''))),
      c.bestiary.enemies.length?h('div',{class:'mv-enc-list'}, linhas):h('div',{class:'hint'},'Cadastre inimigos no Bestiário.'),
      !party.length?h('div',{class:'hint'},'Sem jogadores cadastrados: o poder do grupo será 0.'):null,
      eTot?h('button',{class:'btn primary sm', style:{marginTop:'8px'}, onclick:()=>{ irMtab('combate'); inim.forEach(i=>cbAddGrupo(i.sb.id,i.q,ui.cbTok!==false)); }},'⚔️ Levar esse grupo para o Combate'):null));
}

/* ---------- Recursos e relógios ---------- */
const RES_PRESETS=[['🔦','Tochas'],['🍖','Rações'],['💰','Ouro'],['💧','Água'],['🏹','Munição']];
function recursosView(){
  const c=S.campaign, ui=cmp();
  const res=c.resources.map(r=>h('div',{class:'mv-res'},
    h('span',{class:'mv-res-ic'}, r.icon||'📦'),
    h('input',{class:'in', value:r.name, 'aria-label':'Nome do recurso', onchange:e=>{r.name=e.target.value;render();}}),
    h('div',{class:'mv-step'},
      h('button',{class:'btn mini', onclick:()=>{r.qty=Math.max(0,r.qty-1);render();}},'−'),
      h('input',{class:'in mv-qty', type:'number', value:r.qty, 'aria-label':'Quantidade de '+r.name, onchange:e=>{r.qty=Math.max(0,parseInt(e.target.value)||0);render();}}),
      h('button',{class:'btn mini', onclick:()=>{r.qty++;render();}},'+')),
    h('button',{class:'btn mini '+(r.shown?'emerald':'ghost'), title:r.shown?'Visível na Tela dos jogadores':'Oculto dos jogadores', onclick:()=>{r.shown=!r.shown;render();}}, r.shown?'👁':'🙈'),
    h('button',{class:'btn mini ghost', title:'Remover', onclick:()=>{c.resources=c.resources.filter(x=>x.id!==r.id);render();}},'✕')));
  const clocks=c.clocks.map(k=>h('div',{class:'mv-clock'+(k.filled>=k.segs?' full':'')},
    h('div',{class:'row'},
      h('input',{class:'in', value:k.name, 'aria-label':'Nome do relógio', onchange:e=>{k.name=e.target.value;render();}}),
      h('button',{class:'btn mini '+(k.shown?'emerald':'ghost'), title:k.shown?'Visível aos jogadores':'Oculto dos jogadores', onclick:()=>{k.shown=!k.shown;render();}}, k.shown?'👁':'🙈'),
      h('button',{class:'btn mini ghost', title:'Remover', onclick:()=>{c.clocks=c.clocks.filter(x=>x.id!==k.id);render();}},'✕')),
    h('div',{class:'mv-segs'}, Array.from({length:k.segs},(_,i)=>h('button',{class:'mv-seg'+(i<k.filled?' on':''), 'aria-label':'Segmento '+(i+1),
      onclick:()=>{ k.filled=(k.filled===i+1)?i:i+1; if(k.filled>=k.segs){ showToast('⏳ Relógio “'+k.name+'” completo!'); sessEvento('Relógio completo: '+k.name,'nota'); } render(); }}))),
    h('div',{class:'row wrapf'},
      h('span',{class:'hint'}, k.filled+'/'+k.segs),
      h('button',{class:'btn sm', onclick:()=>{ k.filled=Math.min(k.segs,k.filled+1); if(k.filled>=k.segs){ showToast('⏳ Relógio “'+k.name+'” completo!'); sessEvento('Relógio completo: '+k.name,'nota'); } render(); }},'+1 avançar'),
      h('button',{class:'btn sm ghost', onclick:()=>{k.filled=Math.max(0,k.filled-1);render();}},'−1'))));
  return h('div',{},
    card('Recursos do grupo','Tochas, comida, ouro… 👁 mostra o contador na Tela dos jogadores.',null,
      c.resources.length?h('div',{class:'mv-res-list'}, res):h('div',{class:'hint'},'Nenhum recurso. Adicione pelos atalhos:'),
      h('div',{class:'row wrapf', style:{marginTop:'8px'}},
        RES_PRESETS.map(([ic,nm])=>h('button',{class:'btn sm ghost', onclick:()=>{c.resources.push({id:uid(),name:nm,icon:ic,qty:nm==='Ouro'?0:5,shown:false});render();}}, ic+' '+nm)),
        h('button',{class:'btn sm', onclick:async()=>{ const nm=await cPrompt('Nome do recurso:','Corda'); if(nm){ c.resources.push({id:uid(),name:nm,icon:'📦',qty:0,shown:false}); render(); } }},'+ outro'))),
    card('Relógios de ameaça','Contadores de progresso (um perigo que se aproxima, um ritual, uma fuga). Clique nos segmentos.',null,
      c.clocks.length?h('div',{class:'mv-clocks'}, clocks):h('div',{class:'hint'},'Nenhum relógio.'),
      h('div',{class:'row wrapf', style:{marginTop:'8px'}},
        [4,6,8,12].map(n=>h('button',{class:'btn sm ghost', onclick:async()=>{ const nm=await cPrompt('Nome do relógio de '+n+' segmentos:','Ameaça'); if(nm){ c.clocks.push({id:uid(),name:nm,segs:n,filled:0,shown:false}); render(); } }}, '+ '+n+' seg.')))));
}

/* ---------- Tabelas aleatórias ---------- */
function tabelasView(){
  const c=S.campaign, ui=cmp(), r=ui.tabRes;
  const sel=ui.tabSel||todasTabelas()[0].id;
  const lista=todasTabelas();
  const atual=lista.find(t=>t.id===sel)||lista[0];
  const chips=h('div',{class:'row wrapf'}, lista.map(t=>h('button',{class:'btn sm '+(t.id===atual.id?'primary':'ghost'), onclick:()=>{ui.tabSel=t.id;ui.tabRes=null;render();}}, t.nome)));
  const resultado=r?h('div',{class:'mv-tabres'},
      h('small',{}, r.tabela+(r.n?(' · d'+r.total+' → '+r.n):'')), h('div',{class:'mv-tabres-t'}, r.texto),
      h('div',{class:'row wrapf'},
        h('button',{class:'btn sm primary', onclick:()=>tabelaRolar(atual)},'🎲 Rolar de novo'),
        h('button',{class:'btn sm', onclick:()=>{ if(sessEvento('['+r.tabela+'] '+r.texto,'nota')) showToast('Salvo no diário'); else showToast('Inicie uma sessão para salvar no diário.'); render(); }},'📖 No diário'),
        h('button',{class:'btn sm', onclick:()=>{ c.notebook.unshift({id:uid(),title:r.tabela,text:r.texto,link:null,ts:Date.now()}); showToast('Salvo no caderno'); render(); }},'📓 No caderno'))):null;
  const editor=atual.custom?h('div',{},
      field('Entradas (uma por linha)', h('textarea',{class:'in', rows:'7', onchange:e=>{ const t=c.tables.find(x=>x.id===atual.id); t.entries=e.target.value.split('\n').map(s=>s.trim()).filter(Boolean); render(); }}, (atual.entries||[]).join('\n'))),
      h('div',{class:'row wrapf'},
        h('input',{class:'in', style:{maxWidth:'260px'}, value:atual.nome, 'aria-label':'Nome da tabela', onchange:e=>{ c.tables.find(x=>x.id===atual.id).nome=e.target.value; render(); }}),
        h('button',{class:'btn sm danger', onclick:async()=>{ if(await cConfirm('Excluir a tabela “'+atual.nome+'”?',{perigo:true,okText:'Excluir'})){ c.tables=c.tables.filter(x=>x.id!==atual.id); ui.tabSel=null; render(); } }},'Excluir')))
    : (atual.entries?h('ol',{class:'mv-tab-ent'}, atual.entries.map(e=>h('li',{}, e))):h('div',{class:'hint'},'Tabela gerada por sorteio de sílabas.'));
  return h('div',{},
    card('Tabelas aleatórias','Escolha a tabela e role. Crie as suas (uma entrada por linha).',
      h('button',{class:'btn sm', onclick:()=>{ const t={id:uid(),name:'Minha tabela',entries:['Resultado 1','Resultado 2','Resultado 3']}; c.tables.push(t); ui.tabSel=t.id; render(); }},'+ Tabela própria'),
      chips,
      h('div',{class:'row', style:{margin:'10px 0'}}, h('button',{class:'btn lg primary', onclick:()=>tabelaRolar(atual)},'🎲 Rolar '+atual.nome)),
      resultado, editor));
}

/* ---------- XP do grupo ---------- */
function xpView(){
  const c=S.campaign, np=c.players.length||1;
  const inp=h('input',{id:'xp-n', class:'in', type:'number', style:{width:'110px'}, placeholder:'XP'});
  const mot=h('input',{id:'xp-m', class:'in', placeholder:'motivo (opcional)', style:{flex:'1',minWidth:'140px'}});
  const dar=()=>{ const n=parseInt(inp.value); if(!n) return showToast('Informe o XP.'); xpAdd(n,mot.value); render(); };
  return h('div',{},
    card('XP do grupo','Pontos de experiência compartilhados. Concedidos ficam registrados no diário.',null,
      h('div',{class:'mv-xp-tot'}, h('b',{}, c.xp.total||0), h('span',{class:'hint'},' XP no total'),
        c.players.length?h('span',{class:'hint'},' · '+Math.floor((c.xp.total||0)/np)+' por jogador ('+np+')'):null),
      h('div',{class:'row wrapf'}, inp, mot, h('button',{class:'btn emerald', onclick:dar},'⭐ Conceder'),
        [50,100,250].map(n=>h('button',{class:'btn sm ghost', onclick:()=>{xpAdd(n,mot.value);render();}}, '+'+n))),
      c.xp.history.length?h('div',{class:'mv-log', style:{marginTop:'10px'}}, c.xp.history.slice(0,12).map(x=>h('div',{class:'mv-log-i'},
        h('span',{class:'mv-log-r'},(x.n>0?'+':'')+x.n), h('span',{}, x.motivo||'—'), h('span',{class:'hint'},fmtHora(x.ts)+' '+new Date(x.ts).toLocaleDateString())))):null,
      c.xp.total?h('button',{class:'btn sm ghost', style:{marginTop:'8px'}, onclick:async()=>{ if(await cConfirm('Zerar o XP do grupo?',{perigo:true,okText:'Zerar'})){ c.xp={total:0,history:[]}; render(); } }},'Zerar'):null));
}

/* ---------- Seção "Ferramentas" ---------- */
const FERR_SUBS=[['recursos','⏳ Recursos & Relógios'],['tabelas','🎲 Tabelas'],['encontro','⚖️ Encontro'],['xp','⭐ XP'],['tela','📺 Tela dos jogadores'],['backup','💾 Backup']];
function ferramentasView(){
  const ui=cmp(), sub=ui.ferrSub||'recursos';
  const nav=h('div',{class:'toggle mv-subnav', style:{marginBottom:'12px'}}, FERR_SUBS.map(([k,l])=>h('button',{class:sub===k?'on-j':'', onclick:()=>{ui.ferrSub=k;render();}}, l)));
  const corpo=sub==='tabelas'?tabelasView():sub==='encontro'?encontroView():sub==='xp'?xpView():sub==='tela'?presentacaoPanel():sub==='backup'?backupPanel():recursosView();
  return h('div',{}, nav, corpo);
}
