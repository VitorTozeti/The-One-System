/* ============================================================ REGRAS EXTRAS — GRAUS, TESTE DE RECURSO, SUBIR DE NÍVEL, LIVRO ============================================================
   • Graus de sucesso (sys.graus): "acima" = d20 contra CD com crítico ±margem (PF2e) ou "abaixo" = d100 ≤ valor
     com difícil (½) e extremo (⅕) (Call of Cthulhu / BRP).
   • Teste de recurso (r.teste.on): botão "🎲 Testar" (d100 ≤ atual) e "😱 Perda X/Y" (Sanidade estilo CoC/Ordem).
   • Subir de nível guiado: mostra tudo o que mudou (recursos, habilidades novas, técnicas a escolher, pontos).
   • Capítulo automático "Morte, movimento e ações" no 📕 Livro.
   • Modelos de sistema inspirados em Ordem Paranormal, Feiticeiros & Maldições e Tormenta20 (aproximados — conferir no livro).
   • Livro da campanha: diário + missões + NPCs + facções num PDF/HTML.
   Depende de dice-engine, regras-gerais, livro.js, sistema-modelos.js (tudo chamado em tempo de execução). */

/* ---------------- GRAUS DE SUCESSO ---------------- */
function grausBase(){ return {on:false,modo:'acima',margem:10,nat:true,critSob:4,desSob:17}; }
function sanitizarGraus(sys){
  sys.graus=Object.assign(grausBase(),(sys.graus&&typeof sys.graus==='object')?sys.graus:{});
  sys.graus.on=!!sys.graus.on; if(!['acima','abaixo','sob'].includes(sys.graus.modo)) sys.graus.modo='acima';
  /* "sob" (GURPS e afins): rola a expressão base e passa se der ≤ valor; crítico/desastre por limiar */
  const nI=(v,p)=>{ const n=parseInt(v); return Number.isNaN(n)?p:Math.max(-100,Math.min(1000,n)); };
  sys.graus.critSob=nI(sys.graus.critSob,4); sys.graus.desSob=nI(sys.graus.desSob,17);
  sys.graus.margem=Math.max(1,Math.min(50,parseInt(sys.graus.margem)||10)); sys.graus.nat=sys.graus.nat!==false;
  return sys.graus;
}
const GRAUS=[{k:3,ic:'🌟',t:'Sucesso crítico'},{k:2,ic:'✅',t:'Sucesso'},{k:1,ic:'❌',t:'Falha'},{k:0,ic:'💀',t:'Falha crítica'}];
/* acima: total contra CD.  abaixo: rolagem (d100) contra o valor-alvo. Devolve {ic,t,extra} ou null. */
/* Modo percentual (CoC/BRP): ligado quando os graus estão em "d100 ≤ perícia".
   A perícia passa a ter um valor 0–99 próprio: base do sistema (s.basePct) ou o que
   o jogador anotou na ficha (d.pct[id]). Não usa atributo + bônus. */
function ehPercentual(sys){ const g=sys&&sys.graus; return !!(g&&g.on&&g.modo==='abaixo'); }
function pctDe(sys,d,s){
  const v=d&&d.pct&&d.pct[s.id];
  const n=(typeof v==='number'&&!Number.isNaN(v))?v:(typeof s.basePct==='number'?s.basePct:20);
  return Math.max(0,Math.min(99,Math.round(n)));
}
/* ---------------- FAIXAS DE RESULTADO ----------------
   Dão nome ao total: PbtA (6- falha · 7–9 parcial · 10+ sucesso), Blades (maior d6), Fate (escada),
   pool de sucessos (0 = falha). Cada faixa vale "até X"; a última vale "dali pra cima". */
const FAIXAS_PRONTAS={
  pbta:{n:'Powered by the Apocalypse (2d6)',l:[{ate:6,ic:'❌',t:'Falha — o mestre faz um movimento'},{ate:9,ic:'⚠️',t:'Sucesso com custo'},{ate:null,ic:'✅',t:'Sucesso total'}]},
  blades:{n:'Blades in the Dark (maior d6)',l:[{ate:3,ic:'❌',t:'Falha (consequência)'},{ate:5,ic:'⚠️',t:'Sucesso parcial'},{ate:null,ic:'✅',t:'Sucesso total'}]},
  fate:{n:'Fate (escada de adjetivos)',l:[{ate:-2,ic:'💀',t:'Terrível'},{ate:-1,ic:'❌',t:'Ruim'},{ate:0,ic:'➖',t:'Medíocre'},{ate:1,ic:'✔',t:'Regular'},{ate:2,ic:'✔',t:'Razoável'},{ate:3,ic:'✅',t:'Bom'},{ate:4,ic:'✅',t:'Ótimo'},{ate:5,ic:'🌟',t:'Excelente'},{ate:6,ic:'🌟',t:'Fantástico'},{ate:7,ic:'🌟',t:'Épico'},{ate:null,ic:'🌟',t:'Lendário'}]},
  sucessos:{n:'Pool de sucessos (0 / 1–2 / 3+)',l:[{ate:0,ic:'❌',t:'Falha'},{ate:2,ic:'✅',t:'Sucesso'},{ate:null,ic:'🌟',t:'Sucesso excepcional'}]},
};
function sanitizarFaixas(sys){
  const f=(sys.faixas&&typeof sys.faixas==='object')?sys.faixas:{};
  f.on=!!f.on;
  f.lista=(Array.isArray(f.lista)?f.lista:[]).slice(0,30).map(x=>({
    ate:(x&&x.ate!==null&&x.ate!==''&&!Number.isNaN(parseInt(x.ate)))?parseInt(x.ate):null,
    ic:String((x&&x.ic)||'').slice(0,4), t:String((x&&x.t)||'').slice(0,60)}));
  sys.faixas=f; return f;
}
function faixaDe(sys,total){
  const f=sys.faixas; if(!f||!f.on||!f.lista.length||total==null) return null;
  const lista=f.lista.slice().sort((a,b)=>(a.ate==null?1e9:a.ate)-(b.ate==null?1e9:b.ate));
  return lista.find(x=>x.ate==null||total<=x.ate)||lista[lista.length-1];
}
/* rótulo único para o resultado: grau (se ligado) senão faixa */
function cardFaixas(sys){
  const f=sanitizarFaixas(sys);
  const usar=k=>{ f.lista=FAIXAS_PRONTAS[k].l.map(x=>({...x})); f.on=true; render(); };
  const linha=(x,i)=>h('div',{class:'row faixa-lin'},
    h('input',{class:'in',style:{width:'52px'},value:x.ic,maxlength:'4','aria-label':'Ícone da faixa',oninput:e=>{x.ic=e.target.value;persist();}}),
    h('span',{class:'hint'},'até'),
    h('input',{class:'in',type:'number',style:{width:'70px'},value:x.ate==null?'':x.ate,placeholder:'∞','aria-label':'Até qual total',
      title:'Vazio = “dali pra cima”',onchange:e=>{ const n=parseInt(e.target.value); x.ate=Number.isNaN(n)?null:n; render(); }}),
    h('input',{class:'in',style:{flex:'1',minWidth:'120px'},value:x.t,maxlength:'60','aria-label':'Nome da faixa',oninput:e=>{x.t=e.target.value;persist();}}),
    h('button',{class:'btn danger sm',type:'button','aria-label':'Remover faixa',onclick:()=>{f.lista.splice(i,1);render();}},'✕'));
  const ord=f.lista.map((x,i)=>[x,i]).sort((a,b)=>(a[0].ate==null?1e9:a[0].ate)-(b[0].ate==null?1e9:b[0].ate));
  return card('📶 Faixas de resultado','Dão nome ao total da rolagem: “7–9 = sucesso com custo”, “0 sucessos = falha”, “+3 = Bom”.',
    h('button',{class:'btn sm '+(f.on?'emerald':'ghost'),'aria-pressed':f.on?'true':'false',onclick:()=>{f.on=!f.on; if(f.on&&!f.lista.length) f.lista=FAIXAS_PRONTAS.pbta.l.map(x=>({...x})); render();}},(f.on?'✓ Ligado':'Desligado')),
    f.on?h('div',{},
      h('div',{class:'row wrapf',style:{marginBottom:'8px'}}, h('span',{class:'hint'},'Prontas:'),
        ...Object.keys(FAIXAS_PRONTAS).map(k=>h('button',{type:'button',class:'btn sm ghost',onclick:()=>usar(k)},FAIXAS_PRONTAS[k].n))),
      ...ord.map(([x,i])=>linha(x,i)),
      h('button',{type:'button',class:'btn sm ghost',style:{marginTop:'6px'},onclick:()=>{f.lista.push({ate:null,ic:'✔',t:'Nova faixa'});render();}},'+ Faixa'),
      h('div',{class:'hint',style:{marginTop:'6px'}},'Se os Graus de sucesso também estiverem ligados, eles têm prioridade.'))
    :h('div',{class:'hint'},'Desligado: a rolagem mostra só o número.'));
}
function rotuloResultado(sys,total,alvo,nat,faces){
  const gr=grauDeSucesso(sys,total,alvo,nat,faces); if(gr) return gr;
  return faixaDe(sys,total);
}
function grauDeSucesso(sys,total,alvo,nat,faces){
  const g=sanitizarGraus(sys); if(!g.on||alvo==null||alvo===''||Number.isNaN(Number(alvo))||total==null) return null;
  alvo=Number(alvo);
  if(g.modo==='abaixo'){
    if(nat===1||total===1) return {ic:'🌟',t:'Crítico'};
    if((alvo<50&&total>=96)||total>=100) return {ic:'💀',t:'Desastre'};
    if(total<=Math.floor(alvo/5)) return {ic:'💎',t:'Sucesso extremo'};
    if(total<=Math.floor(alvo/2)) return {ic:'✅',t:'Sucesso difícil'};
    if(total<=alvo) return {ic:'✔',t:'Sucesso'};
    return {ic:'❌',t:'Falha'};
  }
  if(g.modo==='sob'){
    if(total<=g.critSob) return {ic:'🌟',t:'Sucesso crítico'};
    if(total>=g.desSob) return {ic:'💀',t:'Falha crítica'};
    return total<=alvo?{ic:'✅',t:'Sucesso (margem '+(alvo-total)+')'}:{ic:'❌',t:'Falha (por '+(total-alvo)+')'};
  }
  let k=total>=alvo+g.margem?3:total>=alvo?2:total<=alvo-g.margem?0:1;
  if(g.nat&&faces&&nat===faces) k=Math.min(3,k+1);
  if(g.nat&&nat===1) k=Math.max(0,k-1);
  return GRAUS.find(x=>x.k===k);
}
function cardGraus(sys){
  const g=sanitizarGraus(sys);
  return card('🎯 Graus de sucesso','Em vez de só “passou / não passou”: crítico, sucesso, falha e falha crítica.',
    h('button',{class:'btn sm '+(g.on?'emerald':'ghost'),'aria-pressed':g.on?'true':'false',onclick:()=>{g.on=!g.on;render();}},(g.on?'✓ ':'')+(g.on?'Ligado':'Desligado')),
    g.on?h('div',{},
      h('div',{class:'row wrapf'},
        h('button',{class:'btn sm '+(g.modo==='acima'?'emerald':'ghost'),onclick:()=>{g.modo='acima';render();}},'d20 contra CD (Pathfinder 2e)'),
        h('button',{class:'btn sm '+(g.modo==='abaixo'?'emerald':'ghost'),onclick:()=>{g.modo='abaixo'; render();}},'d100 ≤ perícia % (Call of Cthulhu)'),
        h('button',{class:'btn sm '+(g.modo==='sob'?'emerald':'ghost'),onclick:()=>{g.modo='sob'; render();}},'Rolar ≤ valor (GURPS)')),
      g.modo==='sob'?h('div',{style:{marginTop:'8px'}},
        h('div',{class:'row wrapf'},
          h('span',{class:'hint'},'Sucesso crítico se der ≤'),
          h('input',{class:'in',type:'number',style:{width:'70px'},value:g.critSob,onchange:e=>{const n=parseInt(e.target.value); if(!Number.isNaN(n)) g.critSob=n; render();}}),
          h('span',{class:'hint'},'· falha crítica se der ≥'),
          h('input',{class:'in',type:'number',style:{width:'70px'},value:g.desSob,onchange:e=>{const n=parseInt(e.target.value); if(!Number.isNaN(n)) g.desSob=n; render();}})),
        h('div',{class:'hint',style:{marginTop:'6px'}},'Rola os “dados de cada teste” (ex.: 3d6) sem somar bônus; passa se der ≤ valor da perícia. O resultado mostra a margem.')):
      g.modo==='acima'?h('div',{class:'row wrapf',style:{marginTop:'8px'}},h('span',{class:'hint'},'Crítico ao passar/errar a CD por'),
        h('input',{class:'in',type:'number',min:'1',style:{width:'70px'},value:g.margem,onchange:e=>{g.margem=Math.max(1,parseInt(e.target.value)||10);render();}}),
        h('button',{class:'btn sm '+(g.nat?'emerald':'ghost'),onclick:()=>{g.nat=!g.nat;render();}},(g.nat?'✓ ':'')+'20 natural sobe um grau, 1 natural desce')):
        h('div',{class:'hint',style:{marginTop:'8px'}},'Rolagem ≤ valor = sucesso · ≤ metade = difícil · ≤ 1/5 = extremo · 1 = crítico · 96+ (ou 100) = desastre. Use “1d100” como expressão base acima.'),
      h('div',{class:'hint',style:{marginTop:'6px'}},'Na ficha, o bloco Dados ganha o campo “CD” (ou “valor-alvo”) e o resultado mostra o grau.'))
    :h('div',{class:'hint'},'Desligado: as rolagens mostram só o total.'));
}

/* ---------------- TESTE DE RECURSO (Sanidade X/Y) ---------------- */
function sanitizarTesteRec(r){ if(!r.teste||typeof r.teste!=='object') r.teste={on:false}; r.teste.on=!!r.teste.on; return r.teste; }
function botoesTesteRecurso(sys,d,r,setRes){
  if(!r.teste||!r.teste.on) return [];
  const testar=()=>{ const rr=rollExpr('1d100',{}); const ok=rr.total<=r.cur;
    avisaResultado({titulo:'Teste de '+r.name+(ok?' ✔ passou':' ✖ falhou'),total:rr.total,sub:'1d100 ≤ '+r.cur}); return ok; };
  const perda=async()=>{
    const t=await uiPrompt('Perda de '+r.name+' no formato X/Y (perde X se passar, Y se falhar). Ex.: 0/1d4, 1/1d6, 1d3/1d10.','1/1d6',{titulo:'😱 Perda de '+r.name,okText:'Rolar'});
    if(!t) return; const [a,b]=t.split('/').map(s=>s.trim());
    const rr=rollExpr('1d100',{}), ok=rr.total<=r.cur, f=ok?(a||'0'):(b||a||'0');
    const p=rollExpr(f,{}); const n=p.erro?0:Math.max(0,p.total);
    setRes(r.id,r.cur-n,r.max);
    showToast('😱 '+r.name+': rolou '+rr.total+' ('+(ok?'passou':'falhou')+') → perde '+n+(n>=5?' — perda grande: teste de loucura temporária?':''),6000);
  };
  return [h('button',{class:'btn sm ghost',title:'Rola 1d100: passa se for ≤ ao valor atual',onclick:testar},'🎲 Testar'),
          h('button',{class:'btn sm ghost',title:'Perda X/Y (estilo Call of Cthulhu)',onclick:perda},'😱 Perda X/Y')];
}

/* ---------------- SUBIR DE NÍVEL GUIADO ---------------- */
function subirNivel(sys,d){
  if(sys.semNiveis) return;
  if(d.level>=(sys.maxLevel||d.level)) return showToast('Já está no '+levelLabel(sys,d.level).toLowerCase()+' máximo.');
  const antes=computeSheet(sys,d), lpA=levelPoints(sys,d.level);
  const tecA=(typeof tecnicasPermitidas==='function')?tecnicasPermitidas(sys,d,antes.eff):null;
  const ativasA=new Set((antes.eff.active||[]).map(x=>x.ab.id));
  d.level++;
  const depois=computeSheet(sys,d), lpD=levelPoints(sys,d.level);
  const tecD=(typeof tecnicasPermitidas==='function')?tecnicasPermitidas(sys,d,depois.eff):null;
  const ganhos=[];
  depois.allRes.forEach(r=>{ const a=antes.allRes.find(x=>x.id===r.id); if(a&&!Number.isNaN(r.max)&&!Number.isNaN(a.max)&&r.max!==a.max) ganhos.push((r.icon||'❤')+' '+r.name+': '+a.max+' → '+r.max);
    if(a&&(r.type||'barra')!=='valor'&&!Number.isNaN(r.max)&&!Number.isNaN(a.max)&&r.max>a.max&&d.resCurrent[r.id]!=null) d.resCurrent[r.id]+=r.max-a.max; });
  (depois.eff.active||[]).filter(x=>!ativasA.has(x.ab.id)).forEach(x=>ganhos.push('✨ Nova: '+x.ab.name+(x.ab.description?(' — '+x.ab.description.slice(0,80)):'')));
  if(lpD.attrPoints>lpA.attrPoints) ganhos.push('💪 +'+(lpD.attrPoints-lpA.attrPoints)+' ponto(s) de atributo para distribuir');
  if(lpD.skillCount>lpA.skillCount) ganhos.push('🎯 +'+(lpD.skillCount-lpA.skillCount)+' perícia(s) para escolher');
  const nTA=Number(tecA)||0, nTD=Number(tecD)||0;
  if(nTD>nTA) ganhos.push('🌀 +'+(nTD-nTA)+' técnica(s) de classe para escolher');
  (sys.choices||[]).filter(c=>(c.level||1)===d.level).forEach(c=>ganhos.push('🌿 Nova escolha: '+c.name));
  const pa=progVars(sys,Object.assign({},d,{level:d.level-1})), pd=progVars(sys,d);
  Object.keys(pd).forEach(k=>{ if(pa[k]!==pd[k]&&pd[k]!=null) ganhos.push('📈 '+k+': '+(pa[k]==null?'—':pa[k])+' → '+pd[k]); });
  render();
  uiAlert((ganhos.length?ganhos.map(g=>'• '+g).join('\n'):'Nada novo neste degrau — só o número subiu.')+
    ((lpD.attrPoints>lpA.attrPoints||lpD.skillCount>lpA.skillCount||(nTD>nTA))?'\n\nUse os passos de criação (Atributos, Perícias, Técnicas) para distribuir.':''),
    {titulo:'⬆ '+(d.name||'Personagem')+' chegou ao '+levelLabel(sys,d.level)+'!'});
}

/* ---------------- LIVRO: capítulo automático ---------------- */
function livroMorteMovimento(sys,modo){
  const m=sys.morte, v=sys.movimento, out=[], E=s=>esc(String(s==null?'':s));
  if(m&&m.on){
    const md=(MORTE_MODOS.find(x=>x.k===m.modo)||{}).n||'';
    const rec=((sys.resources||[]).find(r=>r.id===m.resId)||{}).name||'Vida';
    let txt='Quando '+rec+' chega a 0: ';
    if(m.modo==='testes') txt+='o personagem cai e, a cada rodada, rola '+m.testes.dado+' (sucesso com '+m.testes.cd+' ou mais). Com '+m.testes.sucessos+' sucessos fica estável; com '+m.testes.falhas+' falhas, morre.'+(m.testes.natMax?' O resultado máximo do dado faz levantar com 1.':'')+(m.testes.natMin?' Um 1 conta como duas falhas.':'')+' Sofrer dano caído conta '+m.testes.danoCaido+' falha(s).';
    else if(m.modo==='contagem') txt+='fica “'+(m.contagem.nome||'Morrendo')+'” e tem '+m.contagem.rodadas+' rodada(s) para ser socorrido; dano caído tira uma rodada.';
    else if(m.modo==='negativo') txt+='continua caído e sangrando até passar de −'+m.negativo.limite+'; aí morre.';
    else txt+='morre na hora.';
    out.push('<h3>☠ Morte e quedas — '+E(md)+'</h3><p>'+E(txt)+'</p>');
    const sk=(sys.skills||[]).find(s=>s.id===m.estabilizar.skillId);
    out.push('<p><b>Estabilizar:</b> '+E((sk?sk.name:'teste')+' contra CD '+m.estabilizar.cd)+'.</p>');
    if(m.resgates.length) out.push('<p><b>Jeitos de escapar da morte:</b></p><ul>'+m.resgates.map(r=>'<li><b>'+E(r.icone+' '+r.nome)+'</b> — '+E(r.desc||'')+'</li>').join('')+'</ul>');
    if(m.cicatrizes.on&&m.cicatrizes.tabela.length) out.push('<p><b>Cicatrizes</b> (role '+E(m.cicatrizes.dado)+' ao cair):</p><ol>'+m.cicatrizes.tabela.map(t=>'<li>'+E(t)+'</li>').join('')+'</ol>');
    if(m.aoMorrer==='retorno') out.push('<p><b>A morte não é o fim:</b> '+E(m.texto||'o personagem volta ao último ponto de salvamento.')+'</p>');
  }
  if(v&&v.on){
    const un=unidadeMov(v);
    out.push('<h3>🦶 Movimento</h3><p>Deslocamento: <b>'+E(v.base)+un+'</b>'+((v.unidade==='m'||v.unidade==='ft')?(' (1 quadrado = '+v.quadrado+un+')'):'')+'. Correndo ×'+v.corrida+'; terreno difícil custa ×'+v.terreno+'.'+(v.salto?(' Salto: '+E(v.salto)+un+'.'):'')+'</p>');
    if(v.carga!=='nenhuma') out.push('<p>Sobrecarregado: '+E({metade:'metade do deslocamento',menos:'−'+v.cargaMenos+un,zero:'não se move'}[v.carga])+'.</p>');
    if(v.acoes.length) out.push('<p><b>Ações por turno:</b></p><ul>'+v.acoes.map(a=>'<li><b>'+E((a.qtd>1?a.qtd+'× ':'')+a.nome)+'</b> — '+E(a.desc)+'</li>').join('')+'</ul>');
    if(v.notas) out.push('<p>'+E(v.notas)+'</p>');
  }
  const g=sys.graus; if(g&&g.on) out.push('<h3>🎯 Graus de sucesso</h3><p>'+(g.modo==='abaixo'?'Role 1d100 contra o valor: ≤ valor sucesso, ≤ metade difícil, ≤ 1/5 extremo; 1 é crítico e 96+ desastre.':'Passar a CD por '+g.margem+' ou mais é crítico; errar por '+g.margem+' ou mais é falha crítica.'+(g.nat?' 20 natural sobe um grau e 1 natural desce.':''))+'</p>');
  return out.join('');
}

/* ---------------- MODELOS DE SISTEMA INSPIRADOS (aproximados) ---------------- */
if(typeof MODELOS_SISTEMA!=='undefined') MODELOS_SISTEMA.splice(MODELOS_SISTEMA.length-1,0,
  { k:'paranormal', ic:'👁', nome:'Inspirado em Ordem Paranormal', desc:'Agentes contra o Outro Lado: 5 atributos, pool “melhor de N d20”, PV/PE/Sanidade, NEX em %, Combatente/Especialista/Ocultista. Aproximado — confira no livro.',
    tempo:'aproximado', themes:['Investigação','Terror','Paranormal'], rollBase:'1d20', levelName:'NEX',
    camp:'Operação Sombra', sis:'Paranormal (inspirado em Ordem)',
    attrs:[['Agilidade','AGI'],['Força','FOR'],['Intelecto','INT'],['Presença','PRE'],['Vigor','VIG']],
    num:{startLevel:1,maxLevel:20,attributePoints:4,skillChoices:3,startAttrValue:1,attrMin:0,attrMax:5,allowDump:true,perLevel:{attrPoints:1,attrEveryN:4,skillPoints:0,skillEveryN:0}},
    carga:'5 + {1} * 5',
    res:[{n:'Vida',tipo:'barra',f:'16 + {4} + (NEX - 1) * (3 + {4})',cor:'#ef4444',rc:'longo'},{n:'Esforço',tipo:'barra',f:'2 + {3} + (NEX - 1) * (2 + {3})',cor:'#3b82f6',rc:'longo'},
         {n:'Sanidade',tipo:'barra',f:'12 + (NEX - 1) * 3',cor:'#a855f7',rc:'nunca'},{n:'Defesa',tipo:'valor',f:'10 + {0}',cor:'#06b6d4',rc:'nunca'}],
    per:[['Acrobacia',0,false,5,''],['Atletismo',1,false,5,''],['Investigação',2,false,5,''],['Ocultismo',2,false,5,''],['Percepção',3,false,5,''],['Luta',1,false,5,''],['Pontaria',0,false,5,''],['Reflexos',0,false,5,''],['Fortitude',4,false,5,''],['Vontade',3,false,5,''],['Medicina',2,false,5,''],['Diplomacia',3,false,5,'']],
    cls:[['Combatente','Linha de frente, armas e resistência.',[['Treino de combate','Corpo preparado.','r','Vida',4]]],['Especialista','Versátil, perícias e investigação.',[['Eclético','Sabe um pouco de tudo.','a',2,1]]],['Ocultista','Estuda e canaliza o Outro Lado.',[['Escolhido pelo Outro Lado','Rituais.','r','Esforço',3]]]],
    ori:[['Acadêmico','Pesquisador.',[['Saber é poder','Mente afiada.','a',2,1]]],['Policial','Treinado para o risco.',[['Patrulha','Reflexos.','a',0,1]]],['Investigador','Faro para pistas.',[['Faro','Percebe o que falta.','a',3,1]]]],
    pos:s=>{ s.rollMode='pool'; s.poolFaces=20; s.levelName='NEX'; s.morte=Object.assign(s.morte||{},{on:true,modo:'contagem',contagem:{rodadas:'3',nome:'Morrendo'}}); } },
  { k:'feiticeiros', ic:'🌀', nome:'Inspirado em Feiticeiros & Maldições', desc:'Jujutsu: 6 atributos com modificador, d20, Energia Amaldiçoada, graus de feiticeiro, técnicas inatas e domínio. Aproximado — confira no livro.',
    tempo:'aproximado', themes:['Ação','Sobrenatural','Escolar'], rollBase:'1d20', levelName:'Nível',
    camp:'Escola Técnica Jujutsu', sis:'Feitiçaria (inspirado em F&M)',
    attrs:[['Força','FOR'],['Destreza','DES'],['Constituição','CON'],['Inteligência','INT'],['Sabedoria','SAB'],['Carisma','CAR']],
    num:{startLevel:1,maxLevel:20,attributePoints:27,skillChoices:4,startAttrValue:8,attrMin:8,attrMax:20,allowDump:false,perLevel:{attrPoints:2,attrEveryN:4,skillPoints:0,skillEveryN:0}},
    carga:'{0} * 7',
    res:[{n:'Vida',tipo:'barra',f:'10 + {2} + (Nível - 1) * (6 + {2})',cor:'#ef4444',rc:'longo'},{n:'Energia Amaldiçoada',tipo:'barra',f:'4 + Nível * 2 + {4}',cor:'#8b5cf6',rc:'curto'},{n:'Defesa',tipo:'valor',f:'10 + {1}',cor:'#06b6d4',rc:'nunca'}],
    per:[['Atletismo',0,false,0,''],['Acrobacia',1,false,0,''],['Furtividade',1,false,0,''],['Feitiçaria',3,false,0,'Conhecimento jujutsu.'],['Percepção',4,false,0,''],['Intuição',4,false,0,''],['Intimidação',5,false,0,''],['Medicina',4,false,0,''],['Luta',0,false,0,''],['Pontaria',1,false,0,'']],
    cls:[['Lutador','Corpo a corpo, reforço de energia.',[['Reforço corporal','Energia no corpo.','r','Vida',6]]],['Controlador','Invocações e shikigamis.',[['Shikigami','Invoca aliados.','r','Energia Amaldiçoada',4]]],['Suporte','Cura reversa, barreiras.',[['Energia reversa','Cura com energia.','a',4,1]]]],
    ori:[['Clã tradicional','Herdeiro de técnica.',[['Técnica herdada','Energia extra.','r','Energia Amaldiçoada',2]]],['Sem clã','Talento bruto.',[['Determinação','Aguenta mais.','r','Vida',4]]]],
    pos:s=>{ s.attrMode='modificador'; s.modFormula='(V - 10) / 2'; s.profMode='mult'; s.profFormula='2 + piso((Nível - 1) / 4)';
      if(!(s.profTiers||[]).length) s.profTiers=[{id:uid(),name:'Treinado',mult:1,bonus:0},{id:uid(),name:'Especialista',mult:2,bonus:0}];
      s.progression={cols:[{id:'grau',name:'Grau',tipo:'texto'}],rows:{1:{grau:'4º grau'},5:{grau:'3º grau'},9:{grau:'2º grau'},13:{grau:'1º grau'},17:{grau:'Grau especial'}},labels:{}};
      s.morte=Object.assign(s.morte||{},{on:true,modo:'testes'}); } },
  { k:'tormentoso', ic:'⚔', nome:'Inspirado em Tormenta20', desc:'Fantasia brasileira d20: 6 atributos, d20 + ½ nível, PV/PM, ações padrão/movimento/completa. Aproximado — confira no livro.',
    tempo:'aproximado', themes:['Fantasia','Aventura'], rollBase:'1d20', levelName:'Nível',
    camp:'Arton em Chamas', sis:'Fantasia (inspirado em T20)',
    attrs:[['Força','FOR'],['Destreza','DES'],['Constituição','CON'],['Inteligência','INT'],['Sabedoria','SAB'],['Carisma','CAR']],
    num:{startLevel:1,maxLevel:20,attributePoints:10,skillChoices:4,startAttrValue:0,attrMin:-1,attrMax:5,allowDump:true,perLevel:{attrPoints:1,attrEveryN:4,skillPoints:0,skillEveryN:0}},
    carga:'10 + {0} * 2',
    res:[{n:'Vida',tipo:'barra',f:'12 + {2} + (Nível - 1) * (3 + {2})',cor:'#ef4444',rc:'longo'},{n:'Mana',tipo:'barra',f:'Nível * 4',cor:'#3b82f6',rc:'longo'},{n:'Defesa',tipo:'valor',f:'10 + {1}',cor:'#06b6d4',rc:'nunca'}],
    per:[['Acrobacia',1,false,2,''],['Atletismo',0,false,2,''],['Fortitude',2,true,0,''],['Reflexos',1,true,0,''],['Vontade',4,true,0,''],['Luta',0,false,2,''],['Pontaria',1,false,2,''],['Misticismo',3,false,2,''],['Percepção',4,false,2,''],['Diplomacia',5,false,2,'']],
    cls:[['Guerreiro','Mestre das armas.',[['Ataque especial','Golpe mais forte.','r','Vida',4]]],['Arcanista','Magia arcana.',[['Magias','Mais mana.','r','Mana',4]]],['Ladino','Esperto e furtivo.',[['Ataque furtivo','Golpes precisos.','a',1,1]]]],
    ori:[['Humano','Versátil.',[['Versátil','Mais perícias.','a',5,1]]],['Anão','Resistente.',[['Duro de matar','Vida extra.','r','Vida',3]]],['Elfo','Gracioso.',[['Graça élfica','Agilidade.','a',1,1]]]],
    pos:s=>{ s.attrMode='direto'; s.profMode='bonus'; s.profFormula='piso(Nível / 2)'; if(!(s.profTiers||[]).length) s.profTiers=[{id:uid(),name:'Treinado',mult:0,bonus:2}];
      s.morte=Object.assign(s.morte||{},{on:true,modo:'negativo',negativo:{limite:'piso(Vida / 2)'}});
      s.movimento=Object.assign(s.movimento||{},{on:true}); if(typeof MOV_PRESETS!=='undefined') MOV_PRESETS[1].f(s.movimento); } }
);

/* ---------------- LIVRO DA CAMPANHA ---------------- */
function livroDaCampanha(){
  const c=S.campaign, sys=S.system, E=s=>esc(String(s==null?'':s));
  const sec=[];
  sec.push('<h1>'+E(c.name||sys.campaignName||'Campanha')+'</h1>'+(c.summary?('<p>'+E(c.summary)+'</p>'):''));
  if((c.arcos||[]).length||(c.missoes||[]).length){
    sec.push('<h2>Arcos e missões</h2>');
    [...(c.arcos||[]),{id:'',nome:'Missões soltas'}].forEach(a=>{ const ms=(c.missoes||[]).filter(m=>(m.arcoId||'')===a.id); if(!ms.length&&!a.id) return;
      sec.push('<h3>'+E(a.nome)+'</h3>'+(a.desc?('<p>'+E(a.desc)+'</p>'):'')+'<ul>'+ms.map(m=>'<li><b>'+E(m.nome)+'</b> — '+E((MISSAO_ESTADOS.find(e=>e[0]===m.estado)||[])[1]||'')+(m.desc?('<br>'+E(m.desc)):'')+'</li>').join('')+'</ul>'); });
  }
  if((c.sessions||[]).length){
    sec.push('<h2>Diário</h2>');
    c.sessions.forEach(s=>sec.push('<h3>Sessão '+E(s.n||'')+(s.title?(' — '+E(s.title)):'')+'</h3>'+(s.summary?('<p>'+E(s.summary)+'</p>'):'')+
      ((s.events||[]).length?('<ul>'+s.events.map(e=>'<li>'+E(e.text)+'</li>').join('')+'</ul>'):'')));
  }
  if((c.bestiary.npcs||[]).length) sec.push('<h2>Personagens do mundo</h2><ul>'+c.bestiary.npcs.map(n=>'<li><b>'+E(n.name)+'</b>'+(n.papel?(' — '+E(n.papel)):'')+(n.local?(' ('+E(n.local)+')'):'')+(n.personalidade?('<br><i>'+E(n.personalidade)+'</i>'):'')+'</li>').join('')+'</ul>');
  if((c.faccoes||[]).length) sec.push('<h2>Facções</h2><ul>'+c.faccoes.map(f=>'<li><b>'+E(f.ic+' '+f.nome)+'</b> — '+E(REP_ROT[f.rep])+(f.objetivo?('<br>'+E(f.objetivo)):'')+'</li>').join('')+'</ul>');
  if(c.players.length) sec.push('<h2>O grupo</h2><ul>'+c.players.map(p=>'<li>'+E(p.name)+(p.sheet&&p.sheet.name?(' — '+E(p.sheet.name)):'')+'</li>').join('')+'</ul>');
  const doc='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+E(c.name||'Campanha')+'</title><style>body{font-family:Georgia,serif;max-width:190mm;margin:0 auto;padding:12mm;color:#1f2937;line-height:1.5}h1{color:#4f46e5;border-bottom:3px solid #4f46e5}h2{color:#4f46e5;margin-top:1.6em;page-break-after:avoid}h3{margin-bottom:.2em}li{margin:.2em 0}</style></head><body>'+sec.join('')+'</body></html>';
  const f=document.createElement('iframe'); f.setAttribute('aria-hidden','true'); f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  f.srcdoc=doc; f.onload=()=>setTimeout(()=>{ try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){} setTimeout(()=>f.remove(),90000); },350);
  document.body.appendChild(f); showToast('📕 Na janela de impressão, escolha “Salvar como PDF”.');
}

/* capítulo automático no Livro de regras */
if(typeof LIVRO_CAPS!=='undefined'&&!LIVRO_CAPS.some(c=>c[0]==='combate')){ LIVRO_CAPS.splice(1,0,['combate','Morte, movimento e ações']); LIVRO_AUTO.combate=livroMorteMovimento; }
