/* ============================================================ CAMPANHA — MISSÕES & MUNDO ============================================================
   O que faltava para conduzir uma campanha inteira (investigação, intriga, viagem):
     • Arcos e missões com objetivos marcáveis, recompensa e XP (concluir dá XP ao grupo e anota no diário)
     • Pistas ligadas a missões e a NPCs/locais, com "Revelar aos jogadores" (vira handout na Tela dos jogadores)
     • Facções com reputação (−3 hostil … +3 aliada), objetivo e membros (NPCs)
     • Calendário do mundo (dia/mês/ano, avançar dias, eventos marcados)
     • Segurança à mesa: linhas (nunca), véus (fora de cena) e Carta X (pausa na Tela dos jogadores)
   Estado: c.arcos, c.missoes, c.pistas, c.faccoes, c.calendario, c.seguranca (sanitizeMundo).
   Depende de campaign-model (uid), sessions (sessEvento, xpAdd), handouts (c.handouts / c.present). */

const MISSAO_ESTADOS=[['aberta','📌 Aberta','#64748b'],['ativa','🔥 Ativa','#f59e0b'],['concluida','✅ Concluída','#22c55e'],['falhou','❌ Falhou','#ef4444']];
const ARCO_ESTADOS=[['futuro','⏳ Futuro'],['ativo','🔥 Em andamento'],['fechado','📕 Encerrado']];
const REP_ROT={'-3':'Hostil','-2':'Inimiga','-1':'Desconfiada','0':'Neutra','1':'Amigável','2':'Aliada','3':'Devota'};
const MESES_PADRAO=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function sanitizeMundo(c){
  const arr=k=>{ if(!Array.isArray(c[k])) c[k]=[]; c[k]=c[k].filter(x=>x&&typeof x==='object'); c[k].forEach(x=>{ if(!x.id) x.id=uid(); }); return c[k]; };
  arr('arcos').forEach(a=>{ a.nome=String(a.nome||'Arco'); a.desc=String(a.desc||''); if(!ARCO_ESTADOS.some(e=>e[0]===a.estado)) a.estado='futuro'; });
  arr('missoes').forEach(m=>{ m.nome=String(m.nome||'Missão'); m.desc=String(m.desc||''); if(!MISSAO_ESTADOS.some(e=>e[0]===m.estado)) m.estado='aberta';
    if(!Array.isArray(m.objetivos)) m.objetivos=[]; m.objetivos.forEach(o=>{ if(!o.id) o.id=uid(); o.t=String(o.t||''); o.ok=!!o.ok; });
    m.recompensa=String(m.recompensa||''); m.xp=Math.max(0,Number(m.xp)||0); m.arcoId=m.arcoId||''; m.faccaoId=m.faccaoId||''; m.npcId=m.npcId||''; m.local=String(m.local||''); });
  arr('pistas').forEach(p=>{ p.texto=String(p.texto||''); p.missaoId=p.missaoId||''; p.onde=String(p.onde||''); p.achada=!!p.achada; p.leva=String(p.leva||''); });
  arr('faccoes').forEach(f=>{ f.nome=String(f.nome||'Facção'); f.ic=String(f.ic||'🏴').slice(0,4); f.cor=typeof f.cor==='string'?f.cor:'#6366f1';
    f.rep=Math.max(-3,Math.min(3,parseInt(f.rep)||0)); f.objetivo=String(f.objetivo||''); f.desc=String(f.desc||''); });
  const cal=c.calendario=Object.assign({dia:1,mes:1,ano:1,meses:MESES_PADRAO.slice(),diasMes:30,era:'',eventos:[]},(c.calendario&&typeof c.calendario==='object')?c.calendario:{});
  if(!Array.isArray(cal.meses)||!cal.meses.length) cal.meses=MESES_PADRAO.slice();
  cal.diasMes=Math.max(1,Math.min(100,parseInt(cal.diasMes)||30)); ['dia','mes','ano'].forEach(k=>{ cal[k]=parseInt(cal[k])||1; });
  if(!Array.isArray(cal.eventos)) cal.eventos=[]; cal.eventos.forEach(e=>{ if(!e.id) e.id=uid(); });
  const sg=c.seguranca=Object.assign({linhas:[],veus:[],notas:''},(c.seguranca&&typeof c.seguranca==='object')?c.seguranca:{});
  ['linhas','veus'].forEach(k=>{ if(!Array.isArray(sg[k])) sg[k]=[]; });
  if(!c.present||typeof c.present!=='object') c.present={};
  c.present.pausa=!!c.present.pausa;
  return c;
}

function mundoView(){
  const c=sanitizeMundo(S.campaign), ui=cmp(); const aba=ui.mundoAba||'missoes';
  const abas=[['missoes','📌 Missões ('+c.missoes.filter(m=>m.estado==='ativa'||m.estado==='aberta').length+')'],['pistas','🔎 Pistas ('+c.pistas.filter(p=>!p.achada).length+')'],['faccoes','🏴 Facções ('+c.faccoes.length+')'],['calendario','📅 Calendário'],['seguranca','🛡 Segurança']];
  const nav=h('div',{class:'toggle',style:{marginBottom:'12px',flexWrap:'wrap'}},...abas.map(([k,t])=>h('button',{class:aba===k?'on-m':'',onclick:()=>{ui.mundoAba=k;render();}},t)));
  const corpo={missoes:missoesView,pistas:pistasView,faccoes:faccoesView,calendario:calendarioView,seguranca:segurancaView}[aba](c,ui);
  return h('div',{},h('div',{class:'row',style:{justifyContent:'flex-end',marginBottom:'6px'}},h('button',{class:'btn sm ghost',title:'Diário, missões, NPCs e facções num PDF',onclick:livroDaCampanha},'📕 Livro da campanha (PDF)')),nav,corpo);
}
const _in=(obj,k,ph,o)=>h('input',Object.assign({class:'in',value:obj[k]==null?'':obj[k],placeholder:ph||'',oninput:e=>{obj[k]=e.target.value;persist();},onchange:()=>render()},o||{}));
const _ta=(obj,k,ph,rows)=>h('textarea',{class:'in',rows:String(rows||2),placeholder:ph||'',oninput:e=>{obj[k]=e.target.value;persist();}},obj[k]||'');
function _selId(obj,k,lista,vazio,w){
  return h('select',{class:'in',style:{maxWidth:w||'200px'},'aria-label':vazio,onchange:e=>{obj[k]=e.target.value;render();}},
    h('option',{value:''},vazio),...lista.map(([v,t])=>h('option',{value:v,selected:obj[k]===v},t)));
}
function _evento(t,k){ if(typeof sessEvento==='function'){ try{ sessEvento(t,k||'nota'); }catch(e){} } }

/* ---------- Missões e arcos ---------- */
function missoesView(c,ui){
  const filtro=ui.missF||'abertas';
  const vis=c.missoes.filter(m=>filtro==='todas'||(filtro==='abertas'?(m.estado==='aberta'||m.estado==='ativa'):m.estado===filtro));
  const porArco=[...c.arcos.map(a=>[a,vis.filter(m=>m.arcoId===a.id)]),[null,vis.filter(m=>!m.arcoId||!c.arcos.some(a=>a.id===m.arcoId))]];
  const novaM=arcoId=>{ const m={id:uid(),nome:'Nova missão',desc:'',estado:'aberta',objetivos:[{id:uid(),t:'',ok:false}],recompensa:'',xp:0,arcoId:arcoId||'',faccaoId:'',npcId:'',local:''}; c.missoes.push(m); ui.missAberta=m.id; render(); };
  return h('div',{},
    card('Arcos e missões','Arcos agrupam missões. Concluir uma missão dá o XP ao grupo e anota no diário da sessão ativa.',
      h('div',{class:'row'},h('button',{class:'btn sm',onclick:()=>{ c.arcos.push({id:uid(),nome:'Novo arco',desc:'',estado:c.arcos.length?'futuro':'ativo'}); render(); }},'+ Arco'),h('button',{class:'btn sm primary',onclick:()=>novaM('')},'+ Missão')),
      h('div',{class:'row wrapf'},...[['abertas','Abertas e ativas'],['concluida','Concluídas'],['falhou','Falhas'],['todas','Todas']].map(([k,t])=>h('button',{type:'button',class:'chip'+(filtro===k?' on':''),onclick:()=>{ui.missF=k;render();}},t)))),
    ...porArco.filter(([a,l])=>a||l.length).map(([a,l])=>h('div',{class:'card mundo-arco'},
      a?h('div',{class:'row wrapf'},h('b',{},'🧭'),_in(a,'nome','Nome do arco',{style:{flex:'1',minWidth:'160px',fontWeight:'700'}}),_selId(a,'estado',ARCO_ESTADOS,'estado','160px'),
        h('button',{class:'btn sm ghost',onclick:()=>novaM(a.id)},'+ Missão aqui'),
        h('button',{class:'btn mini ghost','aria-label':'Excluir arco',onclick:async()=>{ if(await cConfirm('Excluir o arco “'+a.nome+'”? As missões ficam sem arco.')){ c.arcos=c.arcos.filter(x=>x!==a); render(); } }},'✕'))
       :h('b',{},'Missões soltas'),
      a?h('div',{style:{margin:'6px 0'}},_ta(a,'desc','Do que se trata este arco, o que está em jogo, como termina…',2)):null,
      l.length?null:h('div',{class:'hint'},'Nenhuma missão '+(filtro==='abertas'?'aberta ':'')+'neste arco.'),
      ...l.map(m=>missaoCard(c,ui,m)))));
}
function missaoCard(c,ui,m){
  const est=MISSAO_ESTADOS.find(e=>e[0]===m.estado), aberta=ui.missAberta===m.id;
  const feitos=m.objetivos.filter(o=>o.ok).length;
  const conclui=async()=>{ m.estado='concluida';
    if(m.xp>0&&typeof xpAdd==='function') xpAdd(m.xp,'Missão: '+m.nome);
    _evento('✅ Missão concluída: '+m.nome+(m.recompensa?(' — '+m.recompensa):''),'decisao'); showToast('✅ '+m.nome+(m.xp?(' · +'+m.xp+' XP'):'')); render(); };
  const pistas=c.pistas.filter(p=>p.missaoId===m.id);
  const cab=h('div',{class:'row wrapf mundo-m-cab',onclick:e=>{ if(e.target.closest('input,button,select')) return; ui.missAberta=aberta?null:m.id; render(); }},
    h('span',{class:'acc-caret'},aberto(aberta)),
    h('span',{class:'mundo-est',style:{'--c':est[2]}},est[1]),
    h('b',{style:{flex:'1',minWidth:'120px'}},m.nome),
    m.objetivos.length?h('span',{class:'hint'},feitos+'/'+m.objetivos.length+' objetivos'):null,
    pistas.length?h('span',{class:'hint'},'🔎 '+pistas.filter(p=>p.achada).length+'/'+pistas.length):null,
    m.xp?h('span',{class:'hint'},'⭐ '+m.xp+' XP'):null,
    m.estado!=='concluida'?h('button',{class:'btn mini emerald',title:'Concluir (dá o XP)',onclick:conclui},'✓'):null);
  if(!aberta) return h('div',{class:'mundo-m'},cab);
  const npcs=(c.bestiary.npcs||[]).map(n=>[n.id,n.name]);
  return h('div',{class:'mundo-m on'},cab,
    h('div',{class:'grid g2'},
      field('Nome',_in(m,'nome','')), field('Estado',_selId(m,'estado',MISSAO_ESTADOS.map(e=>[e[0],e[1]]),'—')),
      field('Quem dá / contato',_selId(m,'npcId',npcs,'— NPC —')), field('Facção',_selId(m,'faccaoId',c.faccoes.map(f=>[f.id,f.ic+' '+f.nome]),'— nenhuma —')),
      field('Local',_in(m,'local','Onde acontece')), field('Arco',_selId(m,'arcoId',c.arcos.map(a=>[a.id,a.nome]),'— solta —'))),
    field('Descrição / gancho',_ta(m,'desc','O que os jogadores sabem, o que está escondido…',3)),
    h('div',{class:'uso-sec-t',style:{marginTop:'8px'}},'Objetivos'),
    ...m.objetivos.map(o=>h('div',{class:'row'},h('input',{type:'checkbox',checked:o.ok,'aria-label':'Feito',onchange:e=>{o.ok=e.target.checked; if(o.ok) _evento('🎯 '+m.nome+': '+(o.t||'objetivo')+' cumprido','decisao'); render();}}),
      h('input',{class:'in',style:{flex:'1'},value:o.t,placeholder:'Encontrar o diário do professor',oninput:e=>{o.t=e.target.value;persist();}}),
      h('button',{class:'btn mini ghost','aria-label':'Remover objetivo',onclick:()=>{m.objetivos=m.objetivos.filter(x=>x!==o);render();}},'✕'))),
    h('button',{class:'btn sm ghost',onclick:()=>{m.objetivos.push({id:uid(),t:'',ok:false});render();}},'+ Objetivo'),
    h('div',{class:'grid g2',style:{marginTop:'8px'}},field('Recompensa',_in(m,'recompensa','300 moedas, favor da guilda…')),
      field('XP ao concluir',h('input',{class:'in',type:'number',min:'0',value:m.xp,onchange:e=>{m.xp=Math.max(0,parseInt(e.target.value)||0);render();}}))),
    h('div',{class:'uso-sec-t',style:{marginTop:'8px'}},'Pistas desta missão'),
    ...pistas.map(p=>pistaLinha(c,p,true)),
    h('div',{class:'row wrapf',style:{marginTop:'8px'}},
      h('button',{class:'btn sm ghost',onclick:()=>{c.pistas.push({id:uid(),texto:'',missaoId:m.id,onde:'',achada:false,leva:''});render();}},'+ Pista'),
      m.estado!=='falhou'?h('button',{class:'btn sm ghost',onclick:()=>{m.estado='falhou';_evento('❌ Missão falhou: '+m.nome,'decisao');render();}},'❌ Falhou'):null,
      h('button',{class:'btn sm danger',onclick:async()=>{ if(await cConfirm('Excluir a missão “'+m.nome+'”?')){ c.missoes=c.missoes.filter(x=>x!==m); c.pistas.forEach(p=>{ if(p.missaoId===m.id) p.missaoId=''; }); render(); } }},'🗑 Excluir')));
}
const aberto=b=>b?'▼':'▶';

/* ---------- Pistas ---------- */
function pistaLinha(c,p,compacta){
  const revelar=()=>{ p.achada=true; if(!Array.isArray(c.handouts)) c.handouts=[];
    let ho=c.handouts.find(x=>x.pistaId===p.id);
    if(!ho){ ho={id:uid(),title:'🔎 Pista',text:p.texto,image:null,ts:Date.now(),pistaId:p.id}; c.handouts.push(ho); }
    c.present.handoutId=ho.id; _evento('🔎 Pista revelada: '+p.texto.slice(0,80),'nota'); showToast('🔎 Pista na Tela dos jogadores'); render(); };
  return h('div',{class:'mundo-pista'+(p.achada?' achada':'')},
    h('input',{type:'checkbox',checked:p.achada,title:'Já encontrada',onchange:e=>{p.achada=e.target.checked; if(p.achada) _evento('🔎 Pista encontrada: '+p.texto.slice(0,80),'nota'); render();}}),
    h('input',{class:'in',style:{flex:'2',minWidth:'180px'},value:p.texto,placeholder:'Pegadas de lama vermelha no porão',oninput:e=>{p.texto=e.target.value;persist();}}),
    h('input',{class:'in',style:{flex:'1',minWidth:'110px'},value:p.onde,placeholder:'Onde / com quem',oninput:e=>{p.onde=e.target.value;persist();}}),
    compacta?null:_selId(p,'missaoId',c.missoes.map(m=>[m.id,m.nome]),'— missão —','170px'),
    h('input',{class:'in',style:{flex:'1',minWidth:'110px'},value:p.leva,placeholder:'Leva a… (próxima cena)',oninput:e=>{p.leva=e.target.value;persist();}}),
    h('button',{class:'btn mini',title:'Mostrar na Tela dos jogadores',onclick:revelar},'👁'),
    h('button',{class:'btn mini ghost','aria-label':'Remover pista',onclick:()=>{c.pistas=c.pistas.filter(x=>x!==p);render();}},'✕'));
}
function pistasView(c,ui){
  const so=ui.pistaF||'faltam';
  const vis=c.pistas.filter(p=>so==='todas'||(so==='faltam'?!p.achada:p.achada));
  return card('Pistas','Regra de ouro da investigação: para cada conclusão importante, deixe 3 pistas em lugares diferentes.',
    h('button',{class:'btn sm primary',onclick:()=>{c.pistas.push({id:uid(),texto:'',missaoId:'',onde:'',achada:false,leva:''});render();}},'+ Pista'),
    h('div',{class:'row wrapf'},...[['faltam','A encontrar'],['achadas','Encontradas'],['todas','Todas']].map(([k,t])=>h('button',{type:'button',class:'chip'+(so===k?' on':''),onclick:()=>{ui.pistaF=k;render();}},t))),
    vis.length?h('div',{},...vis.map(p=>pistaLinha(c,p,false))):h('div',{class:'hint'},'Nenhuma pista aqui.'));
}

/* ---------- Facções ---------- */
function faccoesView(c){
  const npcs=c.bestiary.npcs||[];
  return h('div',{},
    card('Facções','Grupos com objetivos próprios. A reputação muda com as ações do grupo; os NPCs podem pertencer a uma facção.',
      h('button',{class:'btn sm primary',onclick:()=>{c.faccoes.push({id:uid(),nome:'Nova facção',ic:'🏴',cor:'#6366f1',rep:0,objetivo:'',desc:''});render();}},'+ Facção')),
    ...c.faccoes.map(f=>{ const membros=npcs.filter(n=>n.faccaoId===f.id), miss=c.missoes.filter(m=>m.faccaoId===f.id);
      return h('div',{class:'card mundo-fac',style:{'--c':f.cor}},
        h('div',{class:'row wrapf'},
          h('input',{class:'in rg-ic-in',value:f.ic,maxlength:'4','aria-label':'Ícone',onchange:e=>{f.ic=e.target.value;render();}}),
          _in(f,'nome','Nome',{style:{flex:'1',minWidth:'160px',fontWeight:'700'}}),
          h('input',{type:'color',value:f.cor,'aria-label':'Cor',onchange:e=>{f.cor=e.target.value;render();}}),
          h('button',{class:'btn mini ghost','aria-label':'Excluir facção',onclick:async()=>{ if(await cConfirm('Excluir a facção “'+f.nome+'”?')){ c.faccoes=c.faccoes.filter(x=>x!==f); render(); } }},'✕')),
        h('div',{class:'row wrapf mundo-rep'},h('span',{class:'hint'},'Reputação com o grupo:'),
          ...[-3,-2,-1,0,1,2,3].map(n=>h('button',{type:'button',class:'rep-b'+(f.rep===n?' on':''),title:REP_ROT[n],onclick:()=>{ if(f.rep!==n) _evento('🏴 '+f.nome+': '+REP_ROT[f.rep]+' → '+REP_ROT[n],'decisao'); f.rep=n; render(); }},n>0?('+'+n):String(n))),
          h('b',{},REP_ROT[f.rep])),
        field('Objetivo',_in(f,'objetivo','O que querem de verdade')),
        field('Notas',_ta(f,'desc','Recursos, líder, segredos, sede…',2)),
        h('div',{class:'hint'},'👥 '+(membros.length?membros.map(n=>n.name).join(', '):'nenhum NPC ligado (escolha a facção no cartão do NPC)')+(miss.length?(' · 📌 '+miss.map(m=>m.nome).join(', ')):'')));
    }));
}

/* ---------- Calendário ---------- */
function calTexto(cal,d,m,a){ return d+' de '+(cal.meses[(m-1)%cal.meses.length]||('Mês '+m))+(a!=null?(', ano '+a+(cal.era?(' '+cal.era):'')):''); }
function calAvancar(cal,dias){
  let d=cal.dia+dias, m=cal.mes, a=cal.ano; const n=cal.meses.length, dm=cal.diasMes;
  while(d>dm){ d-=dm; m++; if(m>n){ m=1; a++; } }
  while(d<1){ d+=dm; m--; if(m<1){ m=n; a--; } }
  const antes={d:cal.dia,m:cal.mes,a:cal.ano}; cal.dia=d; cal.mes=m; cal.ano=a;
  const idx=x=>(x.a*n+x.m)*dm+x.d, de=idx(antes), ate=idx({d,m,a});
  const vencidos=cal.eventos.filter(e=>{ const i=idx({d:e.dia,m:e.mes,a:e.ano}); return dias>0?(i>de&&i<=ate):false; });
  vencidos.forEach(e=>{ showToast('📅 '+calTexto(cal,e.dia,e.mes)+': '+e.texto,7000); _evento('📅 '+e.texto,'nota'); });
}
function calendarioView(c){
  const cal=c.calendario, n=cal.meses.length, dm=cal.diasMes;
  const idx=e=>(e.ano*n+e.mes)*dm+e.dia, hoje=idx(cal);
  const prox=cal.eventos.slice().sort((a,b)=>idx(a)-idx(b));
  const novo={dia:cal.dia,mes:cal.mes,ano:cal.ano,texto:''};
  return h('div',{},
    card('📅 Hoje no mundo',calTexto(cal,cal.dia,cal.mes,cal.ano),null,
      h('div',{class:'row wrapf'},...[[-1,'−1 dia'],[1,'+1 dia'],[7,'+1 semana'],[dm,'+1 mês']].map(([d,t])=>h('button',{class:'btn sm'+(d>0?'':' ghost'),onclick:()=>{calAvancar(cal,d);render();}},t)),
        h('button',{class:'btn sm ghost',onclick:async()=>{ const r=await cPrompt('Avançar quantos dias?','3'); const k=parseInt(r); if(k){ calAvancar(cal,k); render(); } }},'+ N dias')),
      h('div',{class:'grid g3',style:{marginTop:'10px'}},
        field('Dia',h('input',{class:'in',type:'number',min:'1',value:cal.dia,onchange:e=>{cal.dia=Math.max(1,Math.min(dm,parseInt(e.target.value)||1));render();}})),
        field('Mês',h('select',{class:'in',onchange:e=>{cal.mes=parseInt(e.target.value);render();}},...cal.meses.map((m,i)=>h('option',{value:String(i+1),selected:cal.mes===i+1},m)))),
        field('Ano',h('input',{class:'in',type:'number',value:cal.ano,onchange:e=>{cal.ano=parseInt(e.target.value)||1;render();}}))),
      h('details',{style:{marginTop:'8px'}},h('summary',{class:'hint'},'⚙ Calendário próprio (nomes dos meses, dias por mês, era)'),
        h('div',{class:'grid g2'},field('Meses (separe por vírgula)',h('input',{class:'in',value:cal.meses.join(', '),onchange:e=>{ const l=e.target.value.split(',').map(s=>s.trim()).filter(Boolean); if(l.length) cal.meses=l; render(); }})),
          h('div',{class:'grid g2'},field('Dias por mês',h('input',{class:'in',type:'number',min:'1',max:'100',value:dm,onchange:e=>{cal.diasMes=Math.max(1,Math.min(100,parseInt(e.target.value)||30));render();}})),field('Era',_in(cal,'era','D.R., Era do Sol…')))))),
    card('Eventos marcados','Festivais, prazos do vilão, luas cheias… avisam quando o dia chega.',null,
      h('div',{class:'row wrapf'},
        h('input',{class:'in',type:'number',min:'1',style:{width:'64px'},value:novo.dia,'aria-label':'Dia',oninput:e=>{novo.dia=parseInt(e.target.value)||1;}}),
        h('select',{class:'in',style:{maxWidth:'140px'},'aria-label':'Mês',onchange:e=>{novo.mes=parseInt(e.target.value);}},...cal.meses.map((m,i)=>h('option',{value:String(i+1),selected:novo.mes===i+1},m))),
        h('input',{class:'in',type:'number',style:{width:'80px'},value:novo.ano,'aria-label':'Ano',oninput:e=>{novo.ano=parseInt(e.target.value)||cal.ano;}}),
        h('input',{class:'in',style:{flex:'1',minWidth:'180px'},placeholder:'O ritual acontece na lua cheia',oninput:e=>{novo.texto=e.target.value;}}),
        h('button',{class:'btn sm primary',onclick:()=>{ if(!novo.texto.trim()) return showToast('Escreva o evento'); cal.eventos.push({id:uid(),dia:novo.dia,mes:novo.mes,ano:novo.ano,texto:novo.texto.trim()}); render(); }},'+ Evento')),
      ...prox.map(e=>h('div',{class:'row mundo-ev'+(idx(e)<hoje?' passou':idx(e)===hoje?' hoje':'')},
        h('span',{class:'hint',style:{minWidth:'170px'}},calTexto(cal,e.dia,e.mes,e.ano)),h('span',{style:{flex:'1'}},e.texto),
        h('span',{class:'hint'},idx(e)===hoje?'hoje':idx(e)<hoje?'passou':('em '+(idx(e)-hoje)+' dia(s)')),
        h('button',{class:'btn mini ghost','aria-label':'Remover evento',onclick:()=>{cal.eventos=cal.eventos.filter(x=>x!==e);render();}},'✕')))));
}

/* ---------- Segurança à mesa ---------- */
function segurancaView(c){
  const sg=c.seguranca;
  const lista=(k,tit,ph,hint)=>h('div',{class:'card'},h('h3',{},tit),h('div',{class:'hint'},hint),
    ...sg[k].map((t,i)=>h('div',{class:'row'},h('span',{style:{flex:'1'}},'• '+t),h('button',{class:'btn mini ghost','aria-label':'Remover',onclick:()=>{sg[k].splice(i,1);render();}},'✕'))),
    h('input',{class:'in',placeholder:ph,onkeydown:e=>{ if(e.key==='Enter'&&e.target.value.trim()){ sg[k].push(e.target.value.trim()); e.target.value=''; render(); } }}));
  return h('div',{},
    card('✋ Carta X','Qualquer pessoa pode tocar a carta: a cena para, sem explicações, e segue por outro caminho.',null,
      h('button',{class:'btn lg '+(c.present.pausa?'danger':'amber'),onclick:()=>{ c.present.pausa=!c.present.pausa; if(c.present.pausa) _evento('✋ Carta X usada','nota'); render(); }},c.present.pausa?'▶ Retomar o jogo':'✋ Tocar a Carta X (pausa na Tela dos jogadores)')),
    h('div',{class:'grid g2'},
      lista('linhas','⛔ Linhas (nunca aparece)','Ex.: violência contra crianças — Enter','Combinado na sessão zero: isso não existe neste jogo.'),
      lista('veus','🌫 Véus (acontece fora de cena)','Ex.: tortura — Enter','Pode existir na história, mas a cena corta antes.')),
    card('Notas da sessão zero',null,null,_ta(sg,'notas','Tom da campanha, expectativas, horários, regras da casa…',4)));
}
