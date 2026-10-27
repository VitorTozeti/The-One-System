/* ============================================================ CONJURAÇÃO — MAGIAS ESTILO D&D (E QUALQUER OUTRA) ============================================================
   Completa o "Usar na ficha" das técnicas com o que magias de verdade pedem:
     • tempo de execução (ação, bônus, reação…) — marca a bolinha certa das "Ações por turno"
     • concentração (só uma por vez; começar outra encerra a anterior)
     • rolagem de ataque contra a Defesa do alvo (com crítico dobrando só os dados)
     • aumentar (mais potência pagando mais custo: "+1d6 por círculo acima")
     • círculo/nível da magia, escola, componentes, ritual, "repete o teste a cada turno"
   + pacote de magias do SRD 5.1 de D&D (CC-BY-4.0) e o atalho "Pontos de Magia" (variante oficial do DMG).
   Depende de tecnicas-editor.js (MODELOS_TECNICA, _garanteCond, _atrNome…) e classes-origens.js. */

const EXECUCOES=[['','—'],['acao','Ação'],['bonus','Ação bônus'],['reacao','Reação'],['movimento','Ação de movimento'],['livre','Livre'],['completa','Ação completa'],['minuto','1 minuto'],['hora','1 hora']];
const EXEC_ACOES={acao:/^(a[cç][aã]o|padr[aã]o|principal)$/i,bonus:/b[oô]nus|r[aá]pida/i,reacao:/rea[cç][aã]o/i,movimento:/movimento/i,livre:/livre/i,completa:/padr[aã]o|a[cç][aã]o/i};
const execNome=k=>((EXECUCOES.find(e=>e[0]===k)||[])[1])||'';

/* ---------- editor ---------- */
function conjuracaoEditor(sys,ab){
  const us=ab.uso, at=us.ataque, au=us.aumenta;
  const tog=(on,txt,fn,tt)=>h('button',{type:'button',class:'btn sm '+(on?'emerald':'ghost'),'aria-pressed':on?'true':'false',title:tt||'',onclick:fn},(on?'✓ ':'')+txt);
  const sel=h('select',{class:'in','aria-label':'Tempo de execução',onchange:e=>{us.execucao=e.target.value;render();}},
    ...EXECUCOES.map(([v,t])=>h('option',{value:v,selected:us.execucao===v},t)));
  const aberto=!!(us.execucao||us.concentracao||us.ritual||us.componentes||us.circulo||at.on||au.formula||us.escola||S.ui['conj_'+ab.id]);
  if(!aberto) return h('div',{class:'uso-sec'},h('button',{type:'button',class:'btn sm ghost',onclick:()=>{S.ui['conj_'+ab.id]=true;render();}},'📜 Regras de magia (ação, concentração, ataque, aumentar…)'));
  const semPM=!(sys.resources||[]).some(r=>/pontos de magia/i.test(r.name));
  return h('div',{class:'uso-sec conj'},
    h('div',{class:'uso-sec-t'},'📜 Regras de magia (opcional)'),
    h('div',{class:'grid g3'},
      field('Tempo de execução',sel),
      field('Círculo / nível da magia',h('input',{class:'in',type:'number',min:'0',max:'20',value:us.circulo,title:'0 = truque',onchange:e=>{us.circulo=Math.max(0,parseInt(e.target.value)||0);render();}})),
      field('Escola / tradição',h('input',{class:'in',value:us.escola,placeholder:'Evocação, Sangue, Divina…',oninput:e=>{us.escola=e.target.value;persist();}}))),
    h('div',{class:'row wrapf',style:{margin:'6px 0'}},
      tog(us.concentracao,'🧠 Concentração',()=>{us.concentracao=!us.concentracao;render();},'Só uma por vez: começar outra encerra esta'),
      tog(us.ritual,'🕯 Ritual',()=>{us.ritual=!us.ritual;render();},'Pode ser feita sem custo, levando mais tempo'),
      tog(us.repete,'🔁 Alvo repete o teste a cada turno',()=>{us.repete=!us.repete;render();}),
      h('input',{class:'in',style:{maxWidth:'200px'},value:us.componentes,placeholder:'Componentes (V, S, M: pena)','aria-label':'Componentes',oninput:e=>{us.componentes=e.target.value;persist();}})),
    h('div',{class:'grid g2'},
      h('div',{},tog(at.on,'🎯 Rola ataque contra a Defesa',()=>{at.on=!at.on; if(at.on&&!at.bonus) at.bonus=bonusMagiaPadrao(sys); render();},'Em vez de (ou além de) teste de resistência'),
        at.on?h('div',{style:{marginTop:'6px'}},field('Bônus de ataque (fórmula)',campoFormula(sys,at,'bonus',{placeholder:'Proficiência + Inteligência',aoMudar:()=>render()}))):null),
      h('div',{},h('div',{class:'hint'},'⬆ Aumentar: cada nível extra soma ao efeito e ao custo'),
        h('div',{class:'grid g3'},
          field('Soma ao efeito',h('input',{class:'in mono',value:au.formula,placeholder:'1d6',oninput:e=>{au.formula=e.target.value;persist();},onchange:()=>render()})),
          field('Custo extra',h('input',{class:'in mono',value:au.custo,placeholder:'1',oninput:e=>{au.custo=e.target.value;persist();}})),
          field('Máx. de vezes',h('input',{class:'in mono',value:au.max,placeholder:'9 - círculo',oninput:e=>{au.max=e.target.value;persist();}}))))),
    h('div',{class:'hint',style:{marginTop:'6px'}},'Dica: dados que crescem com o nível = ',h('code',{},'(1 + piso((Nível + 1) / 6))d10'),' (truque de D&D: 1d10 → 4d10).'),
    semPM?h('button',{type:'button',class:'btn sm ghost',style:{marginTop:'6px'},title:'Cria o recurso “Pontos de Magia” com a tabela da variante oficial do D&D (DMG)',onclick:()=>{ criarPontosMagia(sys); render(); }},'📘 Criar “Pontos de Magia” (tabela D&D)'):null,
    (typeof criarEspacosDeMagia==='function'&&!(sys.resources||[]).some(r=>/^Espaços /.test(r.name)))
      ?h('button',{type:'button',class:'btn sm ghost',style:{marginTop:'6px',marginLeft:'6px'},title:'Cria “Espaços 1º…5º círculo” como caixas que crescem com o nível e voltam no descanso longo',onclick:()=>{ criarEspacosDeMagia(sys); render(); }},'✨ Criar espaços de magia por círculo'):null);
}
function _atrMagia(sys){ return _atrNome(sys,['Inteligência','Inteligencia','Sabedoria','Carisma','Intelecto','Mente','Presença','Espírito']); }
function bonusMagiaPadrao(sys){ const a=_atrMagia(sys); return 'Proficiência'+(a?(' + '+a):''); }
function cdMagiaPadrao(sys){ const a=_atrMagia(sys); return '8 + Proficiência'+(a?(' + '+a):''); }

/* variante "Pontos de Magia" (DMG): recurso + coluna de progressão com a tabela por nível */
const TABELA_PM=[4,6,14,17,27,32,38,44,57,64,73,73,83,83,94,94,107,114,123,133];
const CUSTO_PM_CIRCULO=[0,2,3,5,6,7,9,10,11,13];
function criarPontosMagia(sys){
  pushUndo();
  if(!sys.progression||typeof sys.progression!=='object') sys.progression={cols:[],rows:{},labels:{}};
  const pg=sys.progression; pg.cols=pg.cols||[]; pg.rows=pg.rows||{};
  let col=pg.cols.find(c=>c.name==='Tabela PM');
  if(!col){ col={id:uid(),name:'Tabela PM',tipo:'num'}; pg.cols.push(col); }
  for(let l=1;l<=20;l++){ if(!pg.rows[l]) pg.rows[l]={}; pg.rows[l][col.id]=TABELA_PM[l-1]; }
  if(!(sys.resources||[]).some(r=>/pontos de magia/i.test(r.name)))
    sys.resources.push({id:uid(),name:'Pontos de Magia',type:'barra',formula:'Tabela PM',color:'#8b5cf6',recharge:{trig:'longo',amt:'tudo',formula:''},perRound:''});
  showToast('📘 “Pontos de Magia” criado (1º círc. 2 · 2º 3 · 3º 5 · 4º 6 · 5º 7 …)');
}

/* ---------- chips extras no cartão ---------- */
function conjChips(us){
  const ch=[];
  if(us.circulo) ch.push(h('span',{class:'uso-chip'},us.circulo+'º círculo')); else if(us.circulo===0&&us.escola) ch.push(h('span',{class:'uso-chip'},'truque'));
  if(us.execucao) ch.push(h('span',{class:'uso-chip'},'⏱ '+execNome(us.execucao)));
  if(us.ataque&&us.ataque.on) ch.push(h('span',{class:'uso-chip'},'🎯 ataque'));
  if(us.concentracao) ch.push(h('span',{class:'uso-chip'},'🧠 concentração'));
  if(us.ritual) ch.push(h('span',{class:'uso-chip'},'🕯 ritual'));
  if(us.aumenta&&us.aumenta.formula) ch.push(h('span',{class:'uso-chip'},'⬆ +'+us.aumenta.formula));
  if(us.componentes) ch.push(h('span',{class:'uso-chip'},'✋ '+us.componentes));
  return ch;
}

/* ---------- regras de uso ---------- */
function formulaComAumento(f,us,n){
  f=String(f||'').trim(); const a=String((us.aumenta||{}).formula||'').trim();
  if(!n||!a) return f;
  const m=a.match(/^(\d*)d(\d+)(.*)$/i);
  const extra=m?((parseInt(m[1]||'1')*n)+'d'+m[2]+(m[3].trim()?(' + ('+m[3].replace(/^\s*\+\s*/,'')+') * '+n):'')):('('+a+') * '+n);
  return f?(f+' + '+extra):extra;
}
function maxAumento(us,vars){ const s=String((us.aumenta||{}).max||'').trim(); if(!s) return Math.max(0,9-(us.circulo||0)); const v=evalFormula(s,vars||{}); return Number.isNaN(v)?3:Math.max(0,Math.floor(v)); }
function custoAumento(us,vars,n){ if(!n) return 0; const s=String((us.aumenta||{}).custo||'').trim(); if(!s) return 0; const v=evalFormula(s,vars||{}); return Number.isNaN(v)?0:Math.max(0,Math.round(v))*n; }
/* rolagem de ataque: devolve {total,nat,crit,txt} */
function rolarAtaqueMagia(sys,us,vars){
  const b=String((us.ataque||{}).bonus||'').trim()||'0';
  const rr=rollExpr((sys.rollBase&&/d\d/i.test(sys.rollBase)?sys.rollBase:'1d20')+' + ('+b+')',vars);
  if(!rr||rr.erro) return {total:null,txt:'⚠ bônus de ataque inválido'};
  const nat=((rr.detalhes||[])[0]||{}).usados?Math.max(...rr.detalhes[0].usados):0;
  return {total:rr.total,nat,crit:nat>=(sys.critNat||20),falha:nat===1,txt:'Acerto '+rr.total+(nat>=(sys.critNat||20)?' ★ CRÍTICO':nat===1?' (1 natural: erra)':'')};
}
/* tempo de execução: marca a bolinha das "Ações por turno" (aba Morte & Movimento) */
function gastaExecucao(sys,d,exec){
  const mv=sys.movimento; if(!exec||!mv||!mv.on||!(mv.acoes||[]).length) return '';
  const re=EXEC_ACOES[exec]; if(!re) return '';
  const a=mv.acoes.find(x=>re.test(x.nome||'')); if(!a) return '';
  if(!d.turno||typeof d.turno!=='object') d.turno={usadas:{}};
  d.turno.usadas=d.turno.usadas||{};
  const usadas=d.turno.usadas[a.id]||0;
  if(exec==='completa'){ mv.acoes.filter(x=>EXEC_ACOES.acao.test(x.nome)||EXEC_ACOES.movimento.test(x.nome)).forEach(x=>{ d.turno.usadas[x.id]=x.qtd; }); return '⏱ ação completa'; }
  if(usadas>=a.qtd) return '⚠ Sem '+a.nome+' sobrando neste turno';
  d.turno.usadas[a.id]=usadas+1; return '⏱ '+a.nome+' usada';
}
/* concentração: só uma por vez */
function encerrarConcentracao(sys,d,silencioso){
  const c=d.concentrando; if(!c) return '';
  const ab=buscaHabPorId(sys,d,c.abId);
  if(ab&&ab.uso){ if(d.ativas&&d.ativas[ab.id]) delete d.ativas[ab.id];
    if(ab.uso.condEm==='eu') _ligaCondEu(d,ab.uso.condId,false);
    if(ab.uso.invoc) d.invocacoes=(d.invocacoes||[]).filter(v=>v.abId!==ab.id); }
  d.concentrando=null;
  return silencioso?'':('🧠 Concentração em “'+c.nome+'” encerrada');
}
function buscaHabPorId(sys,d,id){
  try{ const eff=gatherEffects(sys,d); const x=(eff.active||[]).find(a=>a.ab&&a.ab.id===id); if(x) return x.ab; }catch(e){}
  const todas=[].concat(...(sys.classes||[]).map(c=>[].concat(c.abilities||[],((c.tecnicas||{}).opcoes)||[])),...(sys.origins||[]).map(o=>o.abilities||[]));
  return todas.find(a=>a.id===id)||null;
}
/* abre o pedido de "quantos níveis a mais" e depois usa */
async function usarComOpcoes(sys,d,ctx,ab){
  const us=ab.uso; let extra=0;
  if(us.modo!=='ativa'&&String((us.aumenta||{}).formula||'').trim()){
    const mx=maxAumento(us,ctx.varsTotal);
    if(mx>0){
      const r=await uiPrompt('Aumentar “'+ab.name+'”? Cada nível a mais: +'+us.aumenta.formula+(us.aumenta.custo?(' (custa +'+us.aumenta.custo+')'):'')+'.\nQuantos níveis a mais (0 a '+mx+')?','0',{titulo:'⬆ Aumentar',okText:'Usar'});
      if(r==null) return;
      extra=Math.max(0,Math.min(mx,parseInt(r)||0));
    }
  }
  usarHabilidade(sys,d,ctx,ab,{extra});
}

/* ---------- pacote de magias do SRD 5.1 (D&D 5e, CC-BY-4.0) ----------
   Mecânica resumida com texto próprio. Custo em "Pontos de Magia" (ou Mana) pela tabela do DMG. */
const _PMR=['Pontos de Magia','Mana','PM','Energia','PE','Pontos de Mana'];
const _DEX=['Destreza','Agilidade','Reflexos','Reflexo'], _CON=['Constituição','Constituicao','Vigor','Resistência','Físico','Corpo'], _SAB=['Sabedoria','Vontade','Mente','Espírito','Presença'];
const _m=s=>{ const a=_atrMagia(s); return a?(' + '+a):''; };
const _tr='(1 + piso((Nível + 1) / 6))';
const _dnd=(n,ic,d,circ,o)=>({c:'📘 D&D 5e (SRD)',n,ic,d,uso:s=>Object.assign({custo:circ?[String(CUSTO_PM_CIRCULO[circ]),_PMR]:null,circulo:circ,componentes:'V, S'},o(s))});
const _tst=(s,lista,suc)=>({attr:_atrNome(s,lista),cd:cdMagiaPadrao(s),sucesso:suc||'metade'});
MODELOS_TECNICA.push(
  _dnd('Rajada de Fogo','🔥','Truque: um cisco de fogo no alvo. Cresce nos níveis 5, 11 e 17.',0,s=>({tipo:'dano',execucao:'acao',ataque:bonusMagiaPadrao(s),formula:_tr+'d10',tipoDano:'Fogo',alcance:'distancia',area:{forma:'',tam:'36'},alvos:'1',escola:'Evocação'})),
  _dnd('Raio de Gelo','❄️','Truque: raio frio que acerta e deixa o alvo lento até o seu próximo turno.',0,s=>({tipo:'dano',execucao:'acao',ataque:bonusMagiaPadrao(s),formula:_tr+'d8',tipoDano:'Frio',alcance:'distancia',area:{forma:'',tam:'18'},alvos:'1',cond:_C_LENTO,duracao:'até o seu próximo turno',escola:'Evocação'})),
  _dnd('Rajada Mística','💜','Truque do bruxo: feixes de energia (um feixe a mais nos níveis 5, 11 e 17).',0,s=>({tipo:'dano',execucao:'acao',ataque:bonusMagiaPadrao(s),formula:_tr+'d10',tipoDano:'Energia',alcance:'distancia',area:{forma:'',tam:'36'},alvos:'1',escola:'Evocação'})),
  _dnd('Mísseis Mágicos','✨','3 dardos que nunca erram (1d4+1 cada). +1 dardo por círculo acima.',1,s=>({tipo:'dano',execucao:'acao',formula:'3d4 + 3',tipoDano:'Energia',alcance:'distancia',area:{forma:'',tam:'36'},alvos:'3',aumenta:{formula:'1d4 + 1',custo:'2',max:''},escola:'Evocação'})),
  _dnd('Curar Ferimentos','💚','Toque que fecha ferimentos. +1d8 por círculo acima.',1,s=>({tipo:'cura',execucao:'acao',aplicaEm:'alvo',formula:'1d8'+_m(s),tipoDano:'Cura',alcance:'toque',alvos:'1',aumenta:{formula:'1d8',custo:'2',max:''},escola:'Evocação'})),
  _dnd('Palavra Curativa','🗣️','Cura à distância como ação bônus. +1d4 por círculo acima.',1,s=>({tipo:'cura',execucao:'bonus',aplicaEm:'alvo',formula:'1d4'+_m(s),tipoDano:'Cura',alcance:'distancia',area:{forma:'',tam:'18'},alvos:'1',componentes:'V',aumenta:{formula:'1d4',custo:'2',max:''},escola:'Evocação'})),
  Object.assign(_dnd('Escudo Arcano','🛡️','Reação: +5 de Defesa até o início do seu próximo turno.',1,s=>({tipo:'buff',modo:'ativa',execucao:'reacao',alcance:'si',duracao:'até o seu próximo turno',escola:'Abjuração'})),{efs:()=>[_rol('defesa',5)]}),
  _dnd('Onda Trovejante','🌊','Cubo de 4,5 m de trovão a partir de você; Constituição corta à metade.',1,s=>({tipo:'dano',execucao:'acao',formula:'2d8',tipoDano:'Trovão',alcance:'area',area:{forma:'cubo',tam:'4.5'},teste:_tst(s,_CON),aumenta:{formula:'1d8',custo:'2',max:''},escola:'Evocação'})),
  _dnd('Bênção','🙏','Até 3 aliados somam 1d4 em ataques e salvaguardas. Concentração, 1 minuto.',1,s=>({tipo:'buff',execucao:'acao',alcance:'distancia',area:{forma:'',tam:'9'},alvos:'3',cond:['Abençoado','✨','#facc15','+1d4 em ataques e salvaguardas.'],condEm:'alvo',duracao:'1 minuto',concentracao:true,componentes:'V, S, M (água benta)',escola:'Encantamento'})),
  _dnd('Imobilizar Pessoa','🧊','Humanoide paralisado; repete o teste de Sabedoria a cada turno. Concentração.',2,s=>({tipo:'debuff',execucao:'acao',alcance:'distancia',area:{forma:'',tam:'18'},alvos:'1',teste:_tst(s,_SAB,'nada'),cond:['Paralisado','⚡','#eab308','Não se move nem age; ataques de perto contra ele são críticos.'],duracao:'1 minuto',concentracao:true,repete:true,escola:'Encantamento'})),
  _dnd('Arma Espiritual','🗡️','Ação bônus: uma arma flutuante ataca (1d8 + atributo) por 1 minuto.',2,s=>({tipo:'invocacao',execucao:'bonus',alcance:'distancia',area:{forma:'',tam:'18'},escola:'Evocação',
    invoc:{nome:'Arma espiritual',icone:'🗡️',cor:'#facc15',estilo:'divino',vida:'1',defesa:'—',ataque:bonusMagiaPadrao(s),dano:'1d8'+_m(s),mov:'6',qtd:'1',duracao:'1 minuto',desc:'Ataca como ação bônus.'}})),
  _dnd('Passo Nebuloso','🌫️','Ação bônus: teleporta até 9 m para um lugar que você vê.',2,s=>({tipo:'utilidade',execucao:'bonus',alcance:'si',componentes:'V',texto:'Você some numa névoa prateada e reaparece até 9 m adiante.',escola:'Conjuração'})),
  _dnd('Bola de Fogo','☄️','Explosão de 6 m de raio a até 45 m; Destreza corta à metade. +1d6 por círculo acima.',3,s=>({tipo:'dano',execucao:'acao',formula:'8d6',tipoDano:'Fogo',alcance:'area',area:{forma:'circulo',tam:'6'},teste:_tst(s,_DEX),aumenta:{formula:'1d6',custo:'1',max:''},componentes:'V, S, M (guano e enxofre)',escola:'Evocação'})),
  _dnd('Relâmpago','⚡','Linha de 30 m; Destreza corta à metade. +1d6 por círculo acima.',3,s=>({tipo:'dano',execucao:'acao',formula:'8d6',tipoDano:'Elétrico',alcance:'area',area:{forma:'linha',tam:'30'},teste:_tst(s,_DEX),aumenta:{formula:'1d6',custo:'1',max:''},escola:'Evocação'})),
  _dnd('Contramágica','🚫','Reação: interrompe uma magia (3º círculo ou menor; maior exige teste).',3,s=>({tipo:'utilidade',execucao:'reacao',alcance:'distancia',area:{forma:'',tam:'18'},componentes:'S',texto:'Magia de círculo maior que o usado: teste do atributo de conjuração CD 10 + círculo.',escola:'Abjuração'})),
  _dnd('Velocidade','💨','Aliado: +2 Defesa, deslocamento dobrado e uma ação extra. Concentração, 1 minuto.',3,s=>({tipo:'buff',execucao:'acao',alcance:'distancia',area:{forma:'',tam:'9'},alvos:'1',cond:['Acelerado','💨','#22d3ee','+2 Defesa, deslocamento ×2, uma ação extra limitada.'],condEm:'alvo',duracao:'1 minuto',concentracao:true,escola:'Transmutação'})),
  _dnd('Revivificar','💖','Toque: traz de volta quem morreu há até 1 minuto, com 1 de Vida.',3,s=>({tipo:'utilidade',execucao:'acao',alcance:'toque',componentes:'V, S, M (diamante)',texto:'A criatura volta à vida com 1 de Vida.',escola:'Necromancia'})),
  _dnd('Conjurar Animais','🐺','Chama 2 lobos espirituais que lutam por você. Concentração, 1 hora.',3,s=>({tipo:'invocacao',execucao:'acao',alcance:'distancia',area:{forma:'',tam:'18'},concentracao:true,escola:'Conjuração',
    invoc:{nome:'Lobo espiritual',icone:'🐺',cor:'#22c55e',estilo:'fera',vida:'11',defesa:'13',ataque:'+4',dano:'2d4 + 2',mov:'12',qtd:'2',duracao:'1 hora',desc:'Derruba o alvo se acertar (Força CD 11).'}})),
  _dnd('Cone de Frio','🥶','Cone de 18 m; Constituição corta à metade. +1d8 por círculo acima.',5,s=>({tipo:'dano',execucao:'acao',formula:'8d8',tipoDano:'Frio',alcance:'area',area:{forma:'cone',tam:'18'},teste:_tst(s,_CON),aumenta:{formula:'1d8',custo:'1',max:''},escola:'Evocação'})),
  _dnd('Desintegrar','💥','Raio verde: 10d6 + 40; Destreza evita tudo. Quem chega a 0 vira pó.',6,s=>({tipo:'dano',execucao:'acao',formula:'10d6 + 40',tipoDano:'Energia',alcance:'distancia',area:{forma:'',tam:'18'},alvos:'1',teste:_tst(s,_DEX,'nada'),aumenta:{formula:'3d6',custo:'1',max:''},escola:'Transmutação'}))
);
