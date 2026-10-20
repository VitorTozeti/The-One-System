/* ============================================================ ABA "☠ MORTE & MOVIMENTO" + PAINÉIS DA FICHA ============================================================
   Editor do Mestre para sys.morte e sys.movimento (motor em src/data/regras-gerais.js) e os dois
   painéis que aparecem na ficha do jogador: morte (dentro do bloco Recursos, quando a Vida zera) e
   movimento/ações do turno (dentro do bloco Características). */

function _recBarra(sys){ return (sys.resources||[]).filter(r=>(r.type||'barra')!=='valor'); }
function _selOpts(lista,atual,vazio){
  return [h('option',{value:''},vazio||'—'),...lista.map(([v,t])=>h('option',{value:v,selected:v===atual},t))];
}
function _sel(obj,k,lista,vazio,aria,w){
  return h('select',{class:'in',style:{maxWidth:w||'240px'},'aria-label':aria||vazio||k,onchange:e=>{pushUndo&&pushUndo();obj[k]=e.target.value;render();}},..._selOpts(lista,obj[k],vazio));
}
function _txtIn(obj,k,ph,w,mono){
  return h('input',{class:'in'+(mono?' mono':''),style:{maxWidth:w||'none'},value:obj[k]==null?'':obj[k],placeholder:ph||'',
    oninput:e=>{obj[k]=e.target.value;persist();},onchange:()=>render()});
}
function _numIn(obj,k,w,step){
  return h('input',{class:'in',type:'number',step:step||'1',style:{width:w||'80px'},value:obj[k],
    onchange:e=>{ const n=parseFloat(e.target.value); obj[k]=Number.isFinite(n)?n:obj[k]; render(); }});
}
function _tog(on,txt,fn,tt){ return h('button',{type:'button',class:'btn sm '+(on?'emerald':'ghost'),'aria-pressed':on?'true':'false',title:tt||'',onclick:fn},ck(on),txt); }

function tabMorteMovimento(sys){
  sanitizeRegrasGerais(sys);
  return h('div',{class:'rg'}, cardMorte(sys), cardMovimento(sys), cardGuiaCriacao(sys));
}

/* ---------------- MORTE ---------------- */
function cardMorte(sys){
  const m=sys.morte;
  const bars=_recBarra(sys);
  if(!m.resId&&bars.length){ const v=bars.find(r=>/vida|pv|hp|sa[uú]de/i.test(r.name))||bars[0]; m.resId=v.id; }
  const liga=()=>{ pushUndo(); m.on=!m.on; if(m.on&&!m.condId) m.condId=_garanteCond(sys,['Caído','💫','#f43f5e','Inconsciente no chão: não age e não se move.']); render(); };
  const corpo=!m.on?h('div',{class:'hint'},'Desligado: quando a Vida zera nada acontece sozinho (você ainda pode usar ⚡ Gatilhos no recurso). Ligue para dar ao jogador o painel “Caído” na ficha, com testes, contagem e resgates.')
  : h('div',{},
    h('div',{class:'rg-linha'}, h('span',{class:'rg-r'},'Recurso que mata'), _sel(m,'resId',bars.map(r=>[r.id,r.name]),'Escolha (Vida)','Recurso que mata'),
      h('span',{class:'rg-r'},'Condição ao cair'), _sel(m,'condId',(sys.conditions||[]).map(c=>[c.id,(c.icon||'')+' '+c.name]),'nenhuma','Condição ao cair')),
    h('div',{class:'sub-h'},'Começar de um sistema conhecido'),
    h('div',{class:'row wrapf'}, ...MORTE_PRESETS.map(p=>h('button',{type:'button',class:'chip',title:p.d,onclick:()=>{pushUndo();p.f(m,sys);showToast('Regra de morte: '+p.n);render();}},p.n))),
    h('div',{class:'sub-h'},'Quando a Vida chega a 0…'),
    h('div',{class:'rg-modos'}, ...MORTE_MODOS.map(x=>h('button',{type:'button',class:'rg-modo'+(m.modo===x.k?' on':''),'aria-pressed':m.modo===x.k?'true':'false',
      onclick:()=>{pushUndo();m.modo=x.k;render();}}, h('span',{class:'rg-ic'},x.ic), h('b',{},x.n), h('small',{},x.d)))),
    morteCamposModo(sys,m),
    h('div',{class:'sub-h'},'🤝 Estabilizar (um aliado socorre)'),
    h('div',{class:'rg-linha'}, h('span',{class:'rg-r'},'Perícia'), _sel(m.estabilizar,'skillId',(sys.skills||[]).map(s=>[s.id,s.name]),'só o dado','Perícia para estabilizar'),
      h('span',{class:'rg-r'},'Dificuldade (CD)'), h('div',{style:{width:'160px'}},campoFormula(sys,m.estabilizar,'cd',{placeholder:'10',aoMudar:()=>render()}))),
    morteResgatesEditor(sys,m),
    h('div',{class:'sub-h'},'🩹 Cicatrizes (ferimento permanente ao cair)'),
    h('div',{class:'rg-linha'}, _tog(m.cicatrizes.on,'Rolar uma cicatriz toda vez que cair',()=>{m.cicatrizes.on=!m.cicatrizes.on;render();}),
      m.cicatrizes.on?h('span',{class:'rg-r'},'Dado'):null, m.cicatrizes.on?_txtIn(m.cicatrizes,'dado','1d6','90px',true):null),
    m.cicatrizes.on?h('textarea',{class:'in',rows:'5',placeholder:'Uma por linha, na ordem do dado:\nCicatriz no rosto (só visual)\nPerde um dedo: −1 em Pontaria\nManca: −1,5 m de deslocamento\n…',
      value:m.cicatrizes.tabela.join('\n'),onchange:e=>{m.cicatrizes.tabela=e.target.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);render();}}):null,
    h('div',{class:'sub-h'},'☠ E quando morre de verdade?'),
    h('div',{class:'rg-linha'}, _sel(m,'aoMorrer',MORTE_AO_MORRER,null,'O que a morte significa'),
      _txtIn(m,'texto','Mensagem ao morrer (opcional)','420px')),
    morteResumo(sys,m));
  return card(h('span',{},'☠ Morte e quedas'),'O que acontece quando o personagem chega a 0 — e como ele pode ser salvo.',
    _tog(m.on,m.on?'Ligado':'Desligado',liga), corpo);
}
function morteCamposModo(sys,m){
  if(m.modo==='testes'){ const t=m.testes; return h('div',{class:'rg-caixa'},
    h('div',{class:'rg-linha'}, h('span',{class:'rg-r'},'Dado'),_txtIn(t,'dado','1d20','90px',true), h('span',{class:'rg-r'},'Sucesso se ≥'),h('div',{style:{width:'140px'}},campoFormula(sys,t,'cd',{placeholder:'10',aoMudar:()=>render()})),
      h('span',{class:'rg-r'},'Sucessos p/ estabilizar'),_numIn(t,'sucessos','64px'), h('span',{class:'rg-r'},'Falhas p/ morrer'),_numIn(t,'falhas','64px')),
    h('div',{class:'rg-linha'}, _tog(t.natMax,'Resultado máximo do dado: levanta com 1',()=>{t.natMax=!t.natMax;render();}),
      _tog(t.natMin,'Resultado 1: conta duas falhas',()=>{t.natMin=!t.natMin;render();}),
      h('span',{class:'rg-r'},'Levar dano caído = falhas'),_numIn(t,'danoCaido','60px'))); }
  if(m.modo==='contagem') return h('div',{class:'rg-caixa'}, h('div',{class:'rg-linha'},
    h('span',{class:'rg-r'},'Nome do estado'),_txtIn(m.contagem,'nome','Morrendo','180px'),
    h('span',{class:'rg-r'},'Rodadas até morrer (fórmula)'),h('div',{style:{width:'200px'}},campoFormula(sys,m.contagem,'rodadas',{placeholder:'3',aoMudar:()=>render()}))),
    h('div',{class:'hint'},'Dica: “1 + Vigor” faz personagens resistentes durarem mais. Levar dano caído tira uma rodada.'));
  if(m.modo==='negativo') return h('div',{class:'rg-caixa'}, h('div',{class:'rg-linha'},
    h('span',{class:'rg-r'},'Morre quando passar de −'),h('div',{style:{width:'200px'}},campoFormula(sys,m.negativo,'limite',{placeholder:'10',aoMudar:()=>render()}))),
    h('div',{class:'hint'},'Entre 0 e o limite o personagem fica caído e sangrando; a ficha conta quanto passou de 0. Ex.: “10”, “Vigor”, “metade da Vida” = ',h('code',{},'piso(Vida / 2)'),'.'));
  return h('div',{class:'rg-caixa'},h('div',{class:'hint'},'Sem estado intermediário: zerou, morreu. Use os resgates abaixo para dar uma chance (ponto de sorte, intervenção divina).'));
}
function morteResgatesEditor(sys,m){
  const add=(o)=>{ pushUndo(); m.resgates.push(Object.assign({id:uid(),nome:'Resgate',icone:'✨',efeito:'levanta',valor:'1',custo:'1',resId:'',desc:''},o||{})); render(); };
  const mana=(sys.resources||[]).find(r=>/mana|pm|energia|f[eé]|sorte|hero/i.test(r.name));
  const prontos=[
    ['🍀 Ponto de sorte',{nome:'Ponto de sorte',icone:'🍀',efeito:'levanta',valor:'1',custo:'1',resId:'',desc:'Gaste para levantar com 1.'}],
    ['🙏 Intervenção divina',{nome:'Intervenção divina',icone:'🙏',efeito:'levanta',valor:'Nível',custo:'0',desc:'Uma vez por campanha.'}],
    ['💉 Poção / kit',{nome:'Poção de cura',icone:'🧪',efeito:'levanta',valor:'2d4 + 2',custo:'0',desc:'Um aliado dá a poção.'}],
    ['🔥 Vontade de viver',{nome:'Vontade de viver',icone:'🔥',efeito:'sucesso',valor:'1',custo:'2',resId:mana?mana.id:'',desc:'Gaste '+(mana?mana.name:'recurso')+' para somar um sucesso.'}],
    ['⏳ Aguentar firme',{nome:'Aguentar firme',icone:'⏳',efeito:'rodadas',valor:'1',custo:'1',resId:mana?mana.id:'',desc:'Ganha mais uma rodada.'}],
  ];
  return h('div',{},
    h('div',{class:'sub-h'},'✨ Jeitos de salvar (botões no painel “Caído”)'),
    h('div',{class:'row wrapf',style:{marginBottom:'8px'}}, ...prontos.map(([t,o])=>h('button',{type:'button',class:'chip',onclick:()=>add(o)},'+ '+t)),
      h('button',{type:'button',class:'btn sm ghost',onclick:()=>add()},'+ Em branco')),
    ...m.resgates.map(rg=>h('div',{class:'rg-res'},
      h('input',{class:'in rg-ic-in',value:rg.icone,'aria-label':'Ícone',maxlength:'4',onchange:e=>{rg.icone=e.target.value;render();}}),
      _txtIn(rg,'nome','Nome','180px'),
      _sel(rg,'efeito',MORTE_EFEITOS_RESGATE,null,'Efeito','200px'),
      h('div',{style:{width:'120px'}},campoFormula(sys,rg,'valor',{placeholder:'1',aoMudar:()=>render()})),
      h('span',{class:'rg-r'},'custa'), h('input',{class:'in',style:{width:'60px'},value:rg.custo,onchange:e=>{rg.custo=e.target.value;render();}}),
      _sel(rg,'resId',(sys.resources||[]).filter(r=>r.id!==m.resId).map(r=>[r.id,r.name]),'grátis','Recurso pago','150px'),
      _txtIn(rg,'desc','Quando pode usar (texto)','240px'),
      h('button',{class:'btn danger sm',title:'Remover','aria-label':'Remover resgate',onclick:()=>{pushUndo();m.resgates=m.resgates.filter(x=>x!==rg);render();}},'✕'))));
}
function morteResumo(sys,m){
  const rec=(sys.resources||[]).find(r=>r.id===m.resId);
  const md=MORTE_MODOS.find(x=>x.k===m.modo);
  let txt='Quando '+(rec?rec.name:'a Vida')+' chega a 0: ';
  if(m.modo==='testes') txt+='fica caído e rola '+m.testes.dado+' por rodada (≥ '+(m.testes.cd||'10')+'). '+m.testes.sucessos+' sucessos estabiliza; '+m.testes.falhas+' falhas morre.';
  else if(m.modo==='contagem') txt+='fica “'+(m.contagem.nome||'Morrendo')+'” por '+(m.contagem.rodadas||'3')+' rodada(s).';
  else if(m.modo==='negativo') txt+='continua caído até −'+(m.negativo.limite||'10')+'; passou disso, morre.';
  else txt+='morre na hora.';
  if(m.resgates.length) txt+=' Salvações: '+m.resgates.map(r=>r.nome).join(', ')+'.';
  if(m.aoMorrer==='retorno') txt+=' A morte faz o personagem voltar ao ponto de salvamento.';
  return h('div',{class:'rg-resumo'},h('b',{},(md?md.ic:'')+' Como fica no livro: '),txt);
}

/* ---------------- MOVIMENTO ---------------- */
function cardMovimento(sys){
  const v=sys.movimento;
  const corpo=!v.on?h('div',{class:'hint'},'Desligado: a ficha não mostra deslocamento nem ações do turno. Ligue para ter deslocamento calculado (com carga e condições), corrida, terreno difícil e as ações de cada turno marcáveis.')
  : h('div',{},
    h('div',{class:'sub-h'},'Começar de um sistema conhecido'),
    h('div',{class:'row wrapf'}, ...MOV_PRESETS.map(p=>h('button',{type:'button',class:'chip',title:p.d,onclick:()=>{pushUndo();p.f(v);showToast('Movimento: '+p.n);render();}},p.n))),
    h('div',{class:'sub-h'},'🦶 Deslocamento'),
    h('div',{class:'rg-linha'},
      h('span',{class:'rg-r'},'Unidade'), _sel(v,'unidade',[['m','Metros'],['q','Quadrados'],['ft','Pés'],['narrativo','Zonas (sem grade)']],null,'Unidade','170px'),
      h('span',{class:'rg-r'},'Deslocamento base (fórmula)'), h('div',{style:{width:'220px'}},campoFormula(sys,v,'base',{placeholder:'9',aoMudar:()=>render()})),
      (v.unidade==='m'||v.unidade==='ft')?h('span',{class:'rg-r'},'1 quadrado ='):null, (v.unidade==='m'||v.unidade==='ft')?_numIn(v,'quadrado','70px','0.5'):null),
    h('div',{class:'hint'},'Ex.: “9”, “6 + Agilidade”, “Agilidade * 1.5”. Traços com a característica numérica “Deslocamento” somam (ex.: Pernas de corredor +3).'),
    h('div',{class:'rg-linha'},
      h('span',{class:'rg-r'},'Correr ×'), _numIn(v,'corrida','64px','0.5'),
      h('span',{class:'rg-r'},'Terreno difícil custa ×'), _numIn(v,'terreno','64px','0.5'),
      h('span',{class:'rg-r'},'Salto (fórmula, opcional)'), h('div',{style:{width:'180px'}},campoFormula(sys,v,'salto',{placeholder:'Força',aoMudar:()=>render()}))),
    h('div',{class:'rg-linha'},
      h('span',{class:'rg-r'},'Sobrecarregado (carga acima do máximo)'),
      _sel(v,'carga',[['nenhuma','Não afeta'],['metade','Metade do deslocamento'],['menos','Perde um valor fixo'],['zero','Não se move']],null,'Carga','230px'),
      v.carga==='menos'?_numIn(v,'cargaMenos','64px','0.5'):null),
    h('div',{class:'sub-h'},'🧊 Condições que mexem no movimento'),
    ...v.condRegras.map(r=>h('div',{class:'rg-linha'},
      _sel(r,'condId',(sys.conditions||[]).map(c=>[c.id,(c.icon||'')+' '+c.name]),'Condição…','Condição','200px'),
      _sel(r,'efeito',[['metade','Metade'],['zero','Parado (0)'],['menos','Perde']],null,'Efeito','140px'),
      r.efeito==='menos'?_numIn(r,'n','64px','0.5'):null,
      h('button',{class:'btn danger sm','aria-label':'Remover',onclick:()=>{v.condRegras=v.condRegras.filter(x=>x!==r);render();}},'✕'))),
    h('div',{class:'row wrapf'},
      h('button',{type:'button',class:'btn sm ghost',onclick:()=>{v.condRegras.push({id:uid(),condId:'',efeito:'metade',n:0});render();}},'+ Regra de condição'),
      h('button',{type:'button',class:'chip',title:'Cria Lento (½), Agarrado e Imobilizado (0) se faltarem',onclick:()=>{ pushUndo();
        [[['Lento','🐢','#38bdf8','Movimento pela metade.'],'metade'],[['Agarrado','🤼','#f97316','Preso por alguém: não se move.'],'zero'],[['Imobilizado','⛓','#64748b','Não se move.'],'zero']].forEach(([c,ef])=>{
          const id=_garanteCond(sys,c); if(!v.condRegras.some(x=>x.condId===id)) v.condRegras.push({id:uid(),condId:id,efeito:ef,n:0}); });
        render(); }},'✨ Lento / Agarrado / Imobilizado')),
    h('div',{class:'sub-h'},'⏱ Ações por turno'),
    h('div',{class:'hint',style:{marginBottom:'6px'}},'Aparecem na ficha como bolinhas que o jogador marca ao agir; “↻ Novo turno” limpa.'),
    ...v.acoes.map(a=>h('div',{class:'rg-res'},
      h('input',{class:'in rg-ic-in',value:a.icone,'aria-label':'Ícone',maxlength:'4',onchange:e=>{a.icone=e.target.value;render();}}),
      _txtIn(a,'nome','Nome (Padrão, Bônus…)','180px'), h('span',{class:'rg-r'},'por turno'), _numIn(a,'qtd','60px'),
      _txtIn(a,'desc','O que dá para fazer com ela','360px'),
      h('button',{class:'btn danger sm','aria-label':'Remover ação',onclick:()=>{v.acoes=v.acoes.filter(x=>x!==a);render();}},'✕'))),
    h('button',{type:'button',class:'btn sm ghost',onclick:()=>{v.acoes.push(_acao('●','Ação',1,''));render();}},'+ Ação'),
    h('div',{class:'sub-h'},'📝 Outras regras de movimento (vai para o livro)'),
    h('textarea',{class:'in',rows:'3',placeholder:'Ex.: levantar-se gasta metade do deslocamento; escalar e nadar custam o dobro; ataque de oportunidade ao sair do alcance…',
      value:v.notas,oninput:e=>{v.notas=e.target.value;persist();}}),
    movPrevia(sys,v));
  return card(h('span',{},'🦶 Movimento e ações'),'Quanto o personagem anda, o que trava o movimento e o que ele pode fazer num turno.',
    _tog(v.on,v.on?'Ligado':'Desligado',()=>{pushUndo();v.on=!v.on;if(v.on&&!v.acoes.length) MOV_PRESETS[1].f(v);render();}), corpo);
}
function movPrevia(sys,v){
  const vars=sysVarsSample(sys); let b=evalFormula(v.base||'0',vars);
  if(Number.isNaN(b)) return h('div',{class:'rg-resumo',style:{borderColor:'var(--rose)'}},'⚠ A fórmula do deslocamento não fecha. Use números, atributos e Nível.');
  const un=unidadeMov(v), q=(v.unidade==='m'||v.unidade==='ft')?' ('+Math.floor(b/v.quadrado)+' quadrados)':'';
  return h('div',{class:'rg-resumo'},h('b',{},'Prévia (atributos no máximo): '),
    'anda '+b+un+q+' · correndo '+(Math.round(b*v.corrida*10)/10)+un+' · em terreno difícil '+(Math.round(b/v.terreno*10)/10)+un+
    (v.acoes.length?' · por turno: '+v.acoes.map(a=>(a.qtd>1?a.qtd+'× ':'')+a.nome).join(', '):''));
}

/* ---------------- GUIA ---------------- */
function cardGuiaCriacao(sys){
  return card('📐 Como criar técnicas, magias e poderes equilibrados','Regra de bolso usada pelos assistentes 🧙 (Classes, Origens e Técnicas).',null,
    h('div',{class:'rg-guia'},
      h('div',{},h('b',{},'1. Comece pelo efeito, não pelo número. '),'Diga o que a técnica FAZ (cura, fere, prende, invoca). O assistente escolhe dados e campos certos para o tipo.'),
      h('div',{},h('b',{},'2. Some pontos de poder. '),'Força (1–4) × 2 + alcance (distância +1, área +2) + condição +2 + liga/desliga +1 + escala com nível +2 + alvos extras +1 cada. Teste de resistência que reduz à metade: −1.'),
      h('div',{},h('b',{},'3. Custo ≈ pontos. '),'O custo sugerido em recurso é igual aos pontos; o nível mínimo sugerido é metade deles. Se quiser algo forte e barato, coloque uma restrição (1×/descanso, só à noite…).'),
      h('div',{},h('b',{},'4. Poder de classe x de origem. '),'Classe = o que o personagem APRENDEU (técnicas, bônus em rolagens, recurso que cresce). Origem = o que ele É (corpo, sentidos, resistências). Modificação física vai na origem como 🪽 Traço.'),
      h('div',{},h('b',{},'5. Modificação física = efeito + custo. '),'Toda mutação forte deve ter um lado ruim (Corpo grande: +Vida, mas −furtividade). O assistente sugere as duas partes; marque as que quiser.')));
}

/* ---------------- FICHA: PAINEL DE MORTE ---------------- */
function morteInner(sys,d,ctx,mode){
  const r=sys.morte; if(!r||!r.on||!r.resId) return null;
  const m=morteEstado(d);
  if(m.estado==='ok') return (m.mortes?h('div',{class:'hint rg-mortes'},'⏪ Mortes: '+m.mortes):null);
  const play=mode==='play';
  const faz=fn=>()=>{ if(!play) return; const x=fn(); if(x&&typeof x==='object') avisaResultado(x); else { if(x) showToast(x,4000); render(); } };
  const pips=(n,max,cls)=>h('span',{class:'rg-pips'},...Array.from({length:max},(_,i)=>h('span',{class:'rg-pip '+cls+(i<n?' on':'')})));
  const titulo={caido:'💫 Caído',estavel:'🛌 Estável (inconsciente)',morto:'☠ Morto'}[m.estado];
  const linhas=[];
  if(m.estado==='caido'&&r.modo==='testes') linhas.push(h('div',{class:'rg-lin'},h('span',{},'Sucessos'),pips(m.suc,r.testes.sucessos,'ok'),h('span',{},'Falhas'),pips(m.fal,r.testes.falhas,'ko')));
  if(m.estado==='caido'&&r.modo==='contagem') linhas.push(h('div',{class:'rg-lin'},h('b',{},(r.contagem.nome||'Morrendo')+': '+m.rodadas+' rodada(s)')));
  if(m.estado==='caido'&&r.modo==='negativo') linhas.push(h('div',{class:'rg-lin'},h('b',{},'Abaixo de 0: '+m.neg+' / '+_limiteNeg(sys,d))));
  if(m.cicatrizes.length) linhas.push(h('div',{class:'hint'},'🩹 '+m.cicatrizes.join(' · ')));
  const btns=[];
  if(m.estado==='caido'){
    if(r.modo==='testes') btns.push(h('button',{class:'btn sm primary',onclick:faz(()=>morteTestar(sys,d))},'🎲 Teste contra a morte'));
    if(r.modo==='contagem') btns.push(h('button',{class:'btn sm',onclick:faz(()=>morteRodada(sys,d))},'⏭ Passou uma rodada'));
    btns.push(h('button',{class:'btn sm',title:'Um aliado tenta socorrer',onclick:faz(()=>morteEstabilizar(sys,d))},'🤝 Estabilizar'));
  }
  if(m.estado!=='morto') r.resgates.forEach(rg=>btns.push(h('button',{class:'btn sm emerald',title:rg.desc||'',onclick:faz(()=>morteResgate(sys,d,rg))},(rg.icone||'✨')+' '+rg.nome)));
  if(m.estado==='morto') btns.push(h('button',{class:'btn sm ghost',title:'Ressurreição / decisão do Mestre',onclick:faz(()=>{ _limpaMorte(m); _condCaido(sys,d,false); d.resCurrent[r.resId]=1; return '✨ Trazido de volta com 1'; })},'✨ Trazer de volta'));
  return h('div',{class:'rg-morte rg-'+m.estado,role:'status'},
    h('div',{class:'rg-mt'},titulo), ...linhas, btns.length?h('div',{class:'row wrapf'},...btns):null);
}

/* ---------------- FICHA: MOVIMENTO E AÇÕES ---------------- */
function movimentoInner(sys,d,ctx,mode){
  const v=sys.movimento; if(!v||!v.on||!d) return null;
  const mv=deslocamentoDe(sys,d,ctx); if(!mv) return null;
  if(!d.turno||typeof d.turno!=='object') d.turno={usadas:{}};
  if(!d.turno.usadas||typeof d.turno.usadas!=='object') d.turno.usadas={};
  const play=mode==='play';
  const acoes=v.acoes.map(a=>{ const n=Math.min(a.qtd,d.turno.usadas[a.id]||0);
    return h('div',{class:'rg-acao',title:a.desc||''}, h('span',{class:'rg-an'},(a.icone||'●')+' '+a.nome),
      ...Array.from({length:a.qtd},(_,i)=>h('button',{type:'button',class:'rg-bola'+(i<n?' usada':''),'aria-label':a.nome+' '+(i+1)+(i<n?' usada':' livre'),
        onclick:()=>{ if(!play) return; d.turno.usadas[a.id]=i<n?i:i+1; render(); }}))); });
  return h('div',{class:'rg-mov'},
    h('div',{class:'rg-mvn'},
      h('div',{class:'rg-big'},h('small',{},'🦶 Anda'),h('b',{},mv.total+mv.un),mv.quadrados!=null?h('small',{},mv.quadrados+' quadrados'):null),
      v.corrida>1?h('div',{class:'rg-big'},h('small',{},'🏃 Correndo'),h('b',{},mv.corrida+mv.un)):null,
      v.terreno>1?h('div',{class:'rg-big'},h('small',{},'🪨 Terreno difícil'),h('b',{},mv.dificil+mv.un)):null,
      mv.salto!=null?h('div',{class:'rg-big'},h('small',{},'🦘 Salto'),h('b',{},mv.salto+mv.un)):null),
    mv.motivos.length?h('div',{class:'hint'},mv.motivos.join(' · ')):null,
    acoes.length?h('div',{class:'rg-acoes'},...acoes,
      h('button',{type:'button',class:'btn sm ghost',onclick:()=>{ if(!play) return; d.turno.usadas={}; render(); }},'↻ Novo turno')):null);
}
