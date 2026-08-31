/* ============================================================ PEÇA 1 — PONTOS DE ESCOLHA ============================================================
   "Escolha 1 de N", com pré-requisito por opção. É o que destrava subclasse,
   trilha, talento e "aumento de atributo OU talento". O motor não sabe o nome
   de nada disso: é só um ponto de escolha com opções. */
function tabEscolhas(sys){
  return card(tit('Pontos de Escolha','escolha'),
    'Um ponto de escolha aparece no assistente do jogador quando ele atinge o degrau indicado. Serve para subclasse, trilha, talento, dom — qualquer "escolha 1 de N".',
    h('button',{class:'btn primary',onclick:()=>{
      const c={id:uid(),name:'Nova Escolha',hint:'',level:sys.startLevel||1,count:1,repetivel:false,options:[]};
      sys.choices.push(c); S.ui.open[c.id]=true; render();}},'+ Ponto de Escolha'),
    sys.choices.length?null:h('div',{class:'hint'},
      'Nenhum ponto de escolha ainda. Exemplos: "Subclasse" no degrau 3 (escolha 1), "Talento" a cada 4 degraus (escolha 1, repetível), "Trilha" no degrau 2.'),
    ...sys.choices.map(c=>escolhaEditor(sys,c)));
}
function escolhaEditor(sys,ch){
  const open=!!S.ui.open[ch.id];
  const header=h('div',{class:'acc-head',onclick:()=>{S.ui.open[ch.id]=!open;render();}},
    h('div',{class:'row'}, h('span',{class:'acc-caret'},open?'▼':'▶'), h('span',{class:'acc-title'},ch.name||'(sem nome)')),
    h('div',{class:'row'}, h('span',{class:'acc-meta'},
      (sys.levelName||'Nível')+' '+ch.level+' · escolhe '+ch.count+' de '+(ch.options||[]).length+(ch.repetivel?' · repetível':'')),
      h('button',{class:'btn danger sm',onclick:e=>{e.stopPropagation();sys.choices=sys.choices.filter(x=>x.id!==ch.id);delete S.ui.open[ch.id];render();}},'✕')));
  if(!open) return h('div',{class:'acc'}, header);

  /* todas as opções do sistema, para o pré-requisito "exige outra opção" */
  const todasOpcoes=[];
  (sys.choices||[]).forEach(c=>(c.options||[]).forEach(o=>{ if(o.id!==undefined) todasOpcoes.push({c,o}); }));

  const body=h('div',{class:'acc-body'},
    h('div',{class:'grid g3',style:{marginTop:'12px'}},
      field('Nome', h('input',{class:'in',value:ch.name,placeholder:'Ex.: Subclasse',oninput:e=>{ch.name=e.target.value;persist();},onchange:()=>render()})),
      field('Libera no degrau', h('input',{class:'in',type:'number',value:ch.level,onchange:e=>{ch.level=parseInt(e.target.value)||1;render();}})),
      field('Quantas escolhe', h('input',{class:'in',type:'number',min:'1',value:ch.count,onchange:e=>{ch.count=Math.max(1,parseInt(e.target.value)||1);render();}}))),
    h('div',{style:{marginTop:'8px'}}, field('Explicação para o jogador',
      h('input',{class:'in',value:ch.hint||'',placeholder:'Ex.: Sua especialização define seu estilo de combate.',oninput:e=>{ch.hint=e.target.value;persist();}}))),
    h('div',{style:{marginTop:'8px'}},
      h('button',{class:'btn sm '+(ch.repetivel?'emerald':'ghost'),onclick:()=>{ch.repetivel=!ch.repetivel;render();}},
        (ch.repetivel?'✓ ':'')+'Repetível (a mesma opção pode ser pega mais de uma vez)')),
    h('div',{class:'sub-h'},'Opções'),
    ...(ch.options||[]).map(op=>{
      const preSel=h('select',{class:'in',style:{maxWidth:'220px'},onchange:e=>{
        const v=e.target.value; op.req.choices = v?[v]:[]; render();}});
      preSel.appendChild(h('option',{value:''},'— sem pré-requisito de opção —'));
      todasOpcoes.forEach(({c,o})=>{ if(o.id===op.id) return;
        const el=h('option',{value:o.id}, c.name+' → '+o.name);
        if((op.req.choices||[])[0]===o.id) el.selected=true; preSel.appendChild(el); });
      return h('div',{class:'ability-card'},
        h('div',{class:'row'},
          h('input',{class:'in',value:op.name,placeholder:'Nome da opção',oninput:e=>{op.name=e.target.value;persist();},onchange:()=>render()}),
          h('button',{class:'btn danger sm',onclick:()=>{ch.options=ch.options.filter(x=>x.id!==op.id);render();}},'✕')),
        h('input',{class:'in',style:{marginTop:'6px'},value:op.description||'',placeholder:'O que ela representa',oninput:e=>{op.description=e.target.value;persist();}}),
        reqEditor(sys,op),
        h('div',{style:{marginTop:'6px'}}, field('Exige outra opção já escolhida', preSel)),
        h('div',{class:'sub-h2'},'Efeitos mecânicos'),
        ...(op.effects||[]).map(ef=>effectRow(sys,op.effects,ef,0)),
        h('button',{class:'btn ghost sm',onclick:()=>{op.effects.push(newEffect(sys));render();}},'+ Efeito'),
        h('div',{class:'tags'}, ...reqTags(sys,op).map(t=>h('span',{class:'tg-req'},'🔒 '+t)),
          ...(op.effects||[]).map(ef=>h('span',{class:'tg-fx'},effectLabel(sys,ef)))));
    }),
    h('button',{class:'btn sm',onclick:()=>{ch.options.push({id:uid(),name:'Nova opção',description:'',req:{level:0,attrs:[],choices:[]},effects:[]});render();}},'+ Opção'));
  return h('div',{class:'acc'}, header, body);
}

/* ============================================================ PEÇA 5 — CONDIÇÕES / ESTADOS ============================================================
   Composição (Fatigado = Fraco + Vulnerável), trilha de níveis cumulativos
   (exaustão) e regra de não-empilhamento. */
function tabCondicoes(sys){
  return card(tit('Condições & Estados','condicaocomposta'),
    'O que o mestre liga e desliga na mesa. Uma condição pode ser composta por outras, ter níveis cumulativos e aplicar qualquer efeito — inclusive modificador de dados.',
    h('button',{class:'btn primary',onclick:()=>{
      const c={id:uid(),name:'Nova Condição',icon:'⚠',color:'#e11d48',description:'',noStack:true,niveis:0,componentes:[],effects:[]};
      sys.conditions.push(c); S.ui.open[c.id]=true; render();}},'+ Condição'),
    sys.conditions.length?null:h('div',{class:'hint'},
      'Nenhuma condição ainda. Exemplos: Envenenado (−1d em todas as rolagens), Fraco (−2 Força), Fatigado (= Fraco + Vulnerável), Exaustão (6 níveis cumulativos).'),
    ...sys.conditions.map(c=>condicaoEditor(sys,c)));
}
function condicaoEditor(sys,c){
  const open=!!S.ui.open[c.id];
  const header=h('div',{class:'acc-head',onclick:()=>{S.ui.open[c.id]=!open;render();}},
    h('div',{class:'row'}, h('span',{class:'acc-caret'},open?'▼':'▶'),
      h('span',{class:'cond-chip',style:{background:c.color,marginRight:'6px'}},(c.icon||'⚠')),
      h('span',{class:'acc-title'},c.name||'(sem nome)')),
    h('div',{class:'row'}, h('span',{class:'acc-meta'},
      (c.effects||[]).length+' efeito(s)'+((c.componentes||[]).length?(' · compõe '+c.componentes.length):'')+(c.niveis>0?(' · '+c.niveis+' níveis'):'')),
      h('button',{class:'btn danger sm',onclick:e=>{e.stopPropagation();sys.conditions=sys.conditions.filter(x=>x.id!==c.id);delete S.ui.open[c.id];render();}},'✕')));
  if(!open) return h('div',{class:'acc'}, header);
  const body=h('div',{class:'acc-body'},
    h('div',{class:'grid g3',style:{marginTop:'12px'}},
      field('Nome', h('input',{class:'in',value:c.name,oninput:e=>{c.name=e.target.value;persist();},onchange:()=>render()})),
      field('Ícone', h('input',{class:'in',style:{textAlign:'center'},value:c.icon||'',placeholder:'⚠',oninput:e=>{c.icon=e.target.value;persist();},onchange:()=>render()})),
      field('Cor', h('input',{type:'color',value:c.color||'#e11d48',style:{width:'100%',height:'40px',background:'transparent',border:'1px solid var(--line)',borderRadius:'10px',cursor:'pointer',marginTop:'4px'},oninput:e=>{c.color=e.target.value;persist();},onchange:()=>render()}))),
    h('div',{style:{marginTop:'8px'}}, field('Descrição', h('textarea',{class:'in',rows:'2',value:c.description||'',oninput:e=>{c.description=e.target.value;persist();}}))),
    h('div',{class:'grid g2',style:{marginTop:'8px',alignItems:'end'}},
      field('Níveis cumulativos (0 = sem trilha)',
        h('input',{class:'in',type:'number',min:'0',max:'20',value:c.niveis||0,
          title:'Ex.: exaustão com 6 níveis. Os efeitos são multiplicados pelo nível.',
          onchange:e=>{c.niveis=Math.max(0,Math.min(20,parseInt(e.target.value)||0));render();}})),
      h('div',{}, h('button',{class:'btn sm '+(c.noStack!==false?'emerald':'ghost'),style:{marginTop:'18px'},
        onclick:()=>{c.noStack=!(c.noStack!==false);render();}},(c.noStack!==false?'✓ ':'')+'Não empilha (a mesma condição não conta 2×)'))),
    c.niveis>0?h('div',{class:'hint',style:{marginTop:'4px'}},'Com trilha de níveis, cada efeito é multiplicado pelo nível atual (nível 3 de "−1 Força" = −3).'):null,
    h('div',{class:'sub-h'},'Composta por (esta condição aplica também estas)'),
    h('div',{class:'row wrapf'}, ...(sys.conditions||[]).filter(x=>x.id!==c.id).map(o=>{
      const on=(c.componentes||[]).includes(o.id);
      return h('button',{class:'btn sm '+(on?'emerald':'ghost'),onclick:()=>{
        c.componentes = on ? c.componentes.filter(x=>x!==o.id) : [...(c.componentes||[]),o.id]; render();}},
        (on?'✓ ':'')+(o.icon||'')+' '+o.name);})),
    (sys.conditions||[]).length<2?h('div',{class:'hint'},'Crie outra condição para poder compor.'):null,
    h('div',{class:'sub-h'},'Efeitos'),
    ...(c.effects||[]).map(ef=>effectRow(sys,c.effects,ef,0)),
    h('button',{class:'btn ghost sm',onclick:()=>{c.effects.push(newEffect(sys));render();}},'+ Efeito'),
    h('div',{class:'tags',style:{marginTop:'8px'}}, ...(c.effects||[]).map(ef=>h('span',{class:'tg-fx'},effectLabel(sys,ef)))));
  return h('div',{class:'acc'}, header, body);
}

/* ============================================================ PEÇA 7 — TAGS E MATRIZ DE INTERAÇÃO ============================================================
   Resistência/vulnerabilidade e ciclo de opressão são a MESMA peça:
   relação direcional entre tags, com multiplicador de dano e modificador de dados. */
function tabTags(sys){
  const nomeTag=id=>((sys.tags||[]).find(t=>t.id===id)||{}).name||'—';
  const selTag=(val,cb)=>{ const s=h('select',{class:'in',style:{maxWidth:'170px'},onchange:e=>{cb(e.target.value);render();}});
    s.appendChild(h('option',{value:''},'— escolha —'));
    (sys.tags||[]).forEach(t=>{const o=h('option',{value:t.id},t.name);if(t.id===val)o.selected=true;s.appendChild(o);});
    return s; };
  return h('div',{},
    card(tit('Tags','tag'),'Etiquetas que classificam dano, elementos, criaturas ou materiais. Use nas armas e nas condições.',
      h('button',{class:'btn primary',onclick:()=>{sys.tags.push({id:uid(),name:'Nova Tag',color:'#6366f1'});render();}},'+ Tag'),
      sys.tags.length?null:h('div',{class:'hint'},'Ex.: Fogo, Gelo, Corte, Impacto, Paranormal, Sangue, Morte, Energia, Conhecimento.'),
      ...sys.tags.map(t=>h('div',{class:'row',style:{marginBottom:'6px'}},
        h('input',{type:'color',value:t.color,style:{width:'38px',height:'38px',background:'transparent',border:'none',padding:'0',cursor:'pointer'},oninput:e=>{t.color=e.target.value;persist();}}),
        h('input',{class:'in',value:t.name,oninput:e=>{t.name=e.target.value;persist();},onchange:()=>render()}),
        h('button',{class:'btn danger',onclick:()=>{
          sys.tags=sys.tags.filter(x=>x.id!==t.id);
          sys.tagMatrix=sys.tagMatrix.filter(m=>m.from!==t.id&&m.to!==t.id);
          (sys.items||[]).forEach(it=>{ if(it.attack) it.attack.tags=(it.attack.tags||[]).filter(x=>x!==t.id); });
          render();}},'✕')))),
    card(tit('Matriz de Interação','matriz'),'Quando uma tag ATINGE outra: multiplica o dano e/ou mexe na quantidade de dados. A relação é direcional.',
      h('button',{class:'btn primary',disabled:(sys.tags||[]).length<1,
        onclick:()=>{sys.tagMatrix.push({id:uid(),from:(sys.tags[0]||{}).id||'',to:(sys.tags[0]||{}).id||'',mult:2,dice:0,nota:''});render();}},'+ Relação'),
      (sys.tags||[]).length<1?h('div',{class:'hint'},'Crie ao menos uma tag primeiro.'):null,
      sys.tagMatrix.length?null:h('div',{class:'hint'},
        'Ex.: Fogo ▸ Gelo = ×2 (vulnerabilidade) · Fogo ▸ Fogo = ×0.5 (resistência) · Sangue ▸ Conhecimento = ×1 e +1 dado (ciclo de opressão).'),
      ...sys.tagMatrix.map(m=>h('div',{class:'item',style:{marginBottom:'8px'}},
        h('div',{class:'row wrapf',style:{alignItems:'flex-end'}},
          field('Quando', selTag(m.from,v=>{m.from=v;})),
          h('span',{style:{fontSize:'20px',padding:'0 4px'}},'▸'),
          field('Atinge', selTag(m.to,v=>{m.to=v;})),
          field('Dano ×', h('input',{class:'in',type:'number',step:'0.25',style:{width:'90px'},value:m.mult,
            onchange:e=>{m.mult=parseFloat(e.target.value);if(Number.isNaN(m.mult))m.mult=1;render();}})),
          field('Dados', h('input',{class:'in',type:'number',style:{width:'80px'},value:m.dice||0,
            title:'Modificador no canal de dados',onchange:e=>{m.dice=parseInt(e.target.value)||0;render();}})),
          h('button',{class:'btn danger sm',onclick:()=>{sys.tagMatrix=sys.tagMatrix.filter(x=>x.id!==m.id);render();}},'✕')),
        h('input',{class:'in',style:{marginTop:'6px'},value:m.nota||'',placeholder:'Anotação (aparece na simulação)',oninput:e=>{m.nota=e.target.value;persist();}}),
        h('div',{class:'hint',style:{marginTop:'4px'}},
          nomeTag(m.from)+' atingindo '+nomeTag(m.to)+': dano ×'+m.mult+(m.dice?(', '+sign(m.dice)+' dado(s)'):''))))));
}

/* ============================================================ PEÇA 3 — ROLADOR ESTRUTURADO (config) ============================================================ */
function tabDados(sys){
  const modeBtn=(v,l,hint)=>h('button',{class:'btn sm '+(sys.rollMode===v?'emerald':'ghost'),
    title:hint,onclick:()=>{sys.rollMode=v;render();}},(sys.rollMode===v?'✓ ':'')+l);
  const exemplo=sys.rollMode==='pool'
    ? poolExpr(3,sys.poolFaces||20)+'  (atributo 3)  •  '+poolExpr(0,sys.poolFaces||20)+'  (atributo 0)'
    : (sys.rollBase||'1d20')+' + bônus';
  return h('div',{},
    card(tit('Como o sistema rola','rollmode'),'Duas famílias cobrem D&D, Ordem e F&M. O motor não sabe o nome de nenhum sistema — isto é só configuração.',null,
      h('div',{class:'row wrapf'},
        modeBtn('soma','Dado + bônus','Ex.: 1d20 + modificadores (D&D, F&M)'),
        modeBtn('pool','Pool: melhor de N dados','Ex.: role (atributo) d20 e pegue o melhor (Ordem)')),
      sys.rollMode==='soma'
        ? h('div',{style:{marginTop:'12px'}}, field('Expressão base',
            h('input',{class:'in mono',value:sys.rollBase||'1d20',placeholder:'1d20',
              oninput:e=>{sys.rollBase=e.target.value;persist();},onchange:()=>render()})))
        : h('div',{class:'grid g2',style:{marginTop:'12px'}},
            field('Faces do dado do pool', h('input',{class:'in',type:'number',value:sys.poolFaces||20,
              onchange:e=>{sys.poolFaces=Math.max(2,parseInt(e.target.value)||20);render();}})),
            h('div',{class:'hint',style:{alignSelf:'end',paddingBottom:'8px'}},'Atributo 0 → rola 2 e pega o PIOR.')),
      h('div',{class:'hint',style:{marginTop:'10px'}},'Prévia: ', h('span',{class:'tg-fx'},exemplo))),
    card('Crítico','O que acontece quando a rolagem estoura.',null,
      h('div',{class:'grid g2',style:{alignItems:'end'}},
        field('Crítico no dado natural ≥', h('input',{class:'in',type:'number',value:sys.critNat||20,
          onchange:e=>{sys.critNat=parseInt(e.target.value)||20;render();}}), 'critnat'),
        h('div',{}, h('button',{class:'btn sm '+(sys.critSoDados?'emerald':'ghost'),style:{marginTop:'18px'},
          onclick:()=>{sys.critSoDados=!sys.critSoDados;render();}},
          (sys.critSoDados?'✓ ':'')+'Crítico multiplica SÓ os dados'))),
      h('div',{class:'hint',style:{marginTop:'8px'}},
        sys.critSoDados
          ? 'Com 1d8+4 e crítico ×2: rola 2d8 e soma +4 uma vez só. (Regra de D&D e da maioria dos sistemas.)'
          : 'Com 1d8+4 e crítico ×2: o total inteiro dobra, modificador incluído.')),
    card('Vantagem e Desvantagem','Rolam 2 dados com álgebra própria: não somam entre si e se cancelam.',null,
      h('div',{class:'hint'},
        'Estão sempre disponíveis no rolador da ficha. Vantagem vira "2d20 pega o maior"; desvantagem, "2d20 pega o menor". '+
        'Duas vantagens continuam sendo uma; vantagem + desvantagem = rolagem normal.')),
    card('Referência rápida da notação',null,null,
      h('div',{class:'hint'},
        ...[['2d6+3','dois d6 somados, mais 3'],['4d6kh3','rola 4d6 e mantém os 3 MAIORES'],
            ['2d20kl1','rola 2d20 e mantém o MENOR'],['1d8+Força','mistura dado com fórmula'],
            ['1d20+Proficiência','usa a variável de proficiência']]
          .map(([a,b])=>h('div',{style:{marginBottom:'3px'}}, h('span',{class:'tg-fx',style:{marginRight:'6px'}},a), b)))));
}

/* ============================================================ PEÇA 8 — ORÇAMENTO DE TÉCNICA POR TIER ============================================================
   O diferencial do projeto: o jogador cria a habilidade autoral preenchendo
   campos fixos, e o sistema impõe um TETO por tier — o dano não passa do
   permitido e o custo sai de uma fórmula. */
function tabTecnicas(sys){
  const resSel=h('select',{class:'in',style:{maxWidth:'200px'},onchange:e=>{sys.techRecursoId=e.target.value;render();}});
  resSel.appendChild(h('option',{value:''},'— nenhum (custo só informativo) —'));
  (sys.resources||[]).forEach(r=>{const o=h('option',{value:r.id},r.name);if(r.id===sys.techRecursoId)o.selected=true;resSel.appendChild(o);});
  return h('div',{},
    card('Construtor de Técnicas Autorais',
      'Liga o módulo que deixa o JOGADOR criar habilidades próprias dentro de um orçamento que você define. Cada tier tem um teto de dano e uma fórmula de custo.',
      h('button',{class:'btn sm '+(sys.techAtivo?'emerald':'ghost'),onclick:()=>{sys.techAtivo=!sys.techAtivo;render();}},
        (sys.techAtivo?'✓ Ativo':'Desativado')),
      h('div',{class:'grid g2',style:{marginTop:'12px'}},
        field('Como se chama neste sistema', h('input',{class:'in',value:sys.techNome||'Técnicas',
          placeholder:'Técnicas, Rituais, Feitiços, Dons…',oninput:e=>{sys.techNome=e.target.value;persist();},onchange:()=>render()})),
        field('Recurso que paga o custo', resSel, 'tier'))),
    sys.techAtivo?card('Custo por Componente','Somados à fórmula base do tier.',null,
      h('div',{class:'grid g3'},
        numField('Ação complexa',sys,'techCustoAcaoComplexa'),
        numField('Ação simples',sys,'techCustoAcaoSimples'),
        numField('Cada característica extra',sys,'techCustoExtra')),
      h('div',{class:'hint',style:{marginTop:'8px'}},
        'Custo final = fórmula do tier + (ação complexa × '+sys.techCustoAcaoComplexa+') + (ação simples × '+sys.techCustoAcaoSimples+') + (extras × '+sys.techCustoExtra+').')):null,
    sys.techAtivo?card('Tiers','Cada degrau de poder: o que libera, o teto de dano e o custo base.',
      h('button',{class:'btn primary',onclick:()=>{
        sys.techTiers.push({id:uid(),tier:sys.techTiers.length,name:'Tier '+sys.techTiers.length,
          danoMax:'1d8',custoFormula:'1',reqLevel:0}); render();}},'+ Tier'),
      sys.techTiers.length?null:h('div',{class:'hint'},
        'Ex.: Tier 0 — dano até 1d8, custo 1 · Tier 5 — dano até 40d12 + 2*('+(sys.levelName||'Nível')+' + Maestria), custo 20.'),
      ...sys.techTiers.map(t=>h('div',{class:'item',style:{marginBottom:'10px'}},
        h('div',{class:'row'},
          h('input',{class:'in',style:{maxWidth:'150px'},value:t.name,placeholder:'Nome',oninput:e=>{t.name=e.target.value;persist();},onchange:()=>render()}),
          field('Libera no degrau', h('input',{class:'in',type:'number',style:{width:'90px'},value:t.reqLevel||0,
            onchange:e=>{t.reqLevel=parseInt(e.target.value)||0;render();}})),
          h('button',{class:'btn danger sm',onclick:()=>{sys.techTiers=sys.techTiers.filter(x=>x.id!==t.id);render();}},'✕')),
        h('div',{class:'grid g2',style:{marginTop:'8px'}},
          field('Teto de dano (expressão)', h('input',{class:'in mono',value:t.danoMax||'',placeholder:'Ex.: 6d10',
            title:'O jogador não pode passar deste dano médio',oninput:e=>{t.danoMax=e.target.value;persist();},onchange:()=>render()})),
          field('Custo base (fórmula)', campoFormula(sys,t,'custoFormula',{tipo:'custo',
            placeholder:'Ex.: 2 + '+(sys.levelName||'Nível')+' / 5',aoMudar:()=>render()}))),
        h('div',{class:'hint',style:{marginTop:'6px'}}, tetoInfo(sys,t))))):null);
}
/* Média de uma expressão de dados, para comparar teto sem precisar rolar.
   NÃO passa por evalFormula: ele arredonda para baixo no fim, e a média de
   1d8 (4,5) viraria 4 — o que afrouxa o teto do tier em meio ponto. */
function mediaExpr(expr, vars){
  const media=String(expr==null?'':expr).replace(DICE_RE,(m,q,f)=>{
    const qtd=Math.max(1,parseInt(q||'1')||1), faces=Math.max(2,parseInt(f)||2);
    return '('+(qtd*(faces+1)/2)+')';
  });
  const v=vars||{};
  try{
    const r=parseTokens(tokenize(media, Object.keys(v).sort((a,b)=>b.length-a.length)), v);
    return Number.isFinite(r)?r:NaN;
  }catch(e){ return NaN; }
}
function tetoInfo(sys,t){
  const v=mediaExpr(t.danoMax,{});
  if(!(t.danoMax||'').trim()) return 'Sem teto de dano definido.';
  return Number.isNaN(v) ? '⚠ expressão de teto inválida' : ('Teto ≈ '+v+' de dano médio.');
}

/* PEÇA 6 — slot ocupado, empilhável e sintonização */
function itemSlotBox(sys,it){
  const temSlots=(sys.slots||[]).length>0, temSint=(sys.sintoniaMax||0)>0;
  if(!temSlots && !temSint && !it.empilhavel) {
    return h('div',{style:{marginTop:'8px'}},
      h('button',{class:'btn sm '+(it.empilhavel?'emerald':'ghost'),onclick:()=>{it.empilhavel=!it.empilhavel;render();}},
        (it.empilhavel?'✓ ':'')+'Empilhável (o jogador guarda quantidade)'));
  }
  const slotSel=h('select',{class:'in',style:{maxWidth:'180px'},onchange:e=>{it.slotId=e.target.value;render();}});
  slotSel.appendChild(h('option',{value:''},'— nenhum slot —'));
  (sys.slots||[]).forEach(s=>{const o=h('option',{value:s.id},s.name+' ('+s.max+')');if(s.id===it.slotId)o.selected=true;slotSel.appendChild(o);});
  return h('div',{class:'req-box',style:{marginTop:'8px'}},
    h('div',{class:'lbl'},'ESPAÇO E SINTONIA'),
    h('div',{class:'row wrapf',style:{alignItems:'flex-end'}},
      temSlots?field('Ocupa o slot', slotSel):null,
      h('button',{class:'btn sm '+(it.empilhavel?'emerald':'ghost'),style:{marginTop:'8px'},
        onclick:()=>{it.empilhavel=!it.empilhavel;render();}},(it.empilhavel?'✓ ':'')+'Empilhável'),
      temSint?h('button',{class:'btn sm '+(it.sintonia?'emerald':'ghost'),style:{marginTop:'8px'},
        title:'Só funciona se o personagem sintonizar — e o teto global é '+sys.sintoniaMax,
        onclick:()=>{it.sintonia=!it.sintonia;render();}},(it.sintonia?'✓ ':'')+'Exige sintonização'):null));
}
/* PEÇA 6 + 3 — arma gera ataque estruturado (rolagem + dano tipado + crítico) */
function itemAtaqueBox(sys,it){
  const at=it.attack;
  const cab=h('div',{style:{marginTop:'8px'}},
    h('button',{class:'btn sm '+(at.on?'emerald':'ghost'),onclick:()=>{at.on=!at.on;render();}},
      (at.on?'✓ ':'')+'⚔ Gera um ataque na ficha'));
  if(!at.on) return cab;
  const attrSel=h('select',{class:'in',style:{maxWidth:'160px'},onchange:e=>{at.attrId=e.target.value;render();}});
  attrSel.appendChild(h('option',{value:''},'— nenhum —'));
  (sys.attributes||[]).forEach(a=>{const o=h('option',{value:a.id},a.name);if(a.id===at.attrId)o.selected=true;attrSel.appendChild(o);});
  const skSel=h('select',{class:'in',style:{maxWidth:'160px'},onchange:e=>{at.skillId=e.target.value;render();}});
  skSel.appendChild(h('option',{value:''},'— nenhuma —'));
  (sys.skills||[]).forEach(s=>{const o=h('option',{value:s.id},s.name);if(s.id===at.skillId)o.selected=true;skSel.appendChild(o);});
  return h('div',{}, cab, h('div',{class:'req-box',style:{marginTop:'6px'}},
    h('div',{class:'lbl'},'ATAQUE'),
    h('div',{class:'grid g3'},
      field('Soma o atributo', attrSel), field('Soma a perícia', skSel),
      field('Alcance', h('input',{class:'in',value:at.alcance||'',placeholder:'Ex.: corpo a corpo, 18m',
        oninput:e=>{at.alcance=e.target.value;persist();}}))),
    h('div',{class:'grid g3',style:{marginTop:'8px'}},
      field('Dano', h('input',{class:'in mono',value:at.dano||'',placeholder:'1d8 + Força',
        oninput:e=>{at.dano=e.target.value;persist();},onchange:()=>render()})),
      field('Crítico em ≥', h('input',{class:'in',type:'number',value:at.critRange||20,
        onchange:e=>{at.critRange=parseInt(e.target.value)||20;render();}})),
      field('Multiplicador do crítico', h('input',{class:'in',type:'number',min:'1',value:at.critMult||2,
        onchange:e=>{at.critMult=Math.max(1,parseInt(e.target.value)||2);render();}}))),
    (sys.tags||[]).length?h('div',{style:{marginTop:'10px'}},
      h('div',{class:'hint',style:{marginBottom:'4px'}},'Tags deste dano (peça 7 — entram na matriz de interação):'),
      h('div',{class:'row wrapf'}, ...(sys.tags||[]).map(t=>{
        const on=(at.tags||[]).includes(t.id);
        return h('button',{class:'btn sm '+(on?'emerald':'ghost'),style:{borderColor:on?t.color:null},
          onclick:()=>{at.tags = on ? at.tags.filter(x=>x!==t.id) : [...(at.tags||[]),t.id]; render();}},
          (on?'✓ ':'')+t.name);}))):null,
    h('div',{class:'hint',style:{marginTop:'8px'}},
      'O crítico multiplica '+(sys.critSoDados?'SÓ os dados':'o total inteiro')+' — configurável na aba 🎲 Dados.')));
}
/* PEÇA 6 — armadura que DEFINE a fórmula do recurso (não só soma) */
function itemArmaduraBox(sys,it){
  const ar=it.armor;
  const cab=h('div',{style:{marginTop:'8px'}},
    h('button',{class:'btn sm '+(ar.on?'emerald':'ghost'),onclick:()=>{ar.on=!ar.on;
      if(ar.on&&!ar.resId){const dv=(sys.resources||[]).find(r=>(r.type||'barra')==='valor'); if(dv)ar.resId=dv.id;}
      render();}},(ar.on?'✓ ':'')+'🛡 Define a fórmula de um recurso'));
  if(!ar.on) return cab;
  const resSel=h('select',{class:'in',style:{maxWidth:'170px'},onchange:e=>{ar.resId=e.target.value;render();}});
  resSel.appendChild(h('option',{value:''},'— escolha —'));
  (sys.resources||[]).forEach(r=>{const o=h('option',{value:r.id},r.name);if(r.id===ar.resId)o.selected=true;resSel.appendChild(o);});
  const maxSel=h('select',{class:'in',style:{maxWidth:'150px'},onchange:e=>{ar.maxAttrId=e.target.value;render();}});
  maxSel.appendChild(h('option',{value:''},'— sem teto —'));
  (sys.attributes||[]).forEach(a=>{const o=h('option',{value:a.id},a.name);if(a.id===ar.maxAttrId)o.selected=true;maxSel.appendChild(o);});
  return h('div',{}, cab, h('div',{class:'req-box',style:{marginTop:'6px'}},
    h('div',{class:'lbl'},'ARMADURA'),
    h('div',{class:'grid g2'},
      field('Qual recurso', resSel),
      field('Fórmula que SUBSTITUI a base', campoFormula(sys,ar,'formula',{tipo:'defesa',
        placeholder:'Ex.: 14 + Agilidade',aoMudar:()=>render()}))),
    h('div',{class:'grid g2',style:{marginTop:'8px'}},
      field('Limitar um atributo a', maxSel),
      ar.maxAttrId?field('no máximo', h('input',{class:'in',type:'number',value:ar.maxAttrVal||0,
        onchange:e=>{ar.maxAttrVal=parseInt(e.target.value)||0;render();}})):null),
    h('div',{class:'hint',style:{marginTop:'8px'}},
      'Enquanto equipada, esta fórmula VENCE a do recurso. Os bônus (+2 de um anel, por exemplo) continuam somando por cima. '+
      'Entre duas armaduras equipadas, vale a de maior valor.')));
}

/* ---------- Aba: Editor visual da Ficha (canvas de posição livre) ---------- */
function tabFicha(sys){
  if(!sys.sheet||!Array.isArray(sys.sheet.blocks)) migrateSheet(sys);
  const sh=sys.sheet;
  const sel=sh.blocks.find(b=>b.id===S.ui.sel)||null;

  /* paleta: adiciona bloco no primeiro espaço livre do canvas */
  const paleta=h('div',{class:'palette'}, ...Object.keys(BLOCK_TYPES).map(k=>{
    const t=BLOCK_TYPES[k];
    const usado=!t.multi && sh.blocks.some(b=>b.key===k);
    const btn=h('button',{class:'pal-b',disabled:usado,
      title:usado?'Já está na ficha':'Arraste para o lugar que quiser — ou clique para encaixar sozinho'},
      t.icon+' '+t.label);
    if(!usado) btn.addEventListener('pointerdown',ev=>palletDrag(ev,k,btn));
    return btn;
  }));

  /* fundo do papel: cor e imagem (base64, mantém o app offline) */
  const bgInput=h('input',{type:'file',accept:'image/*',class:'hide',onchange:e=>{
    readPhoto(e.target.files[0], data=>{ pushUndo(); sh.bgImage=data; render(); }); e.target.value='';}});

  const controls=card('O Papel','Título, cores, tamanho e fundo da ficha.',null,
    h('div',{class:'grid g3',style:{alignItems:'end'}},
      field('Título da ficha', h('input',{class:'in',value:sh.title,oninput:e=>{sh.title=e.target.value;persist();},onchange:()=>render()})),
      field('Cor de destaque', h('input',{type:'color',value:sh.accent,style:{width:'100%',height:'40px',background:'transparent',border:'1px solid var(--line)',borderRadius:'10px',cursor:'pointer',marginTop:'4px'},oninput:e=>{sh.accent=e.target.value;refreshCanvas();}})),
      field('Altura da ficha (px)', h('input',{class:'in',type:'number',min:'200',step:'10',value:sh.canvasH,onchange:e=>{sh.canvasH=Math.max(200,parseInt(e.target.value)||990);render();}}))),
    h('div',{class:'row wrapf',style:{marginTop:'10px',alignItems:'flex-end'}},
      field('Cor de fundo do papel', h('input',{type:'color',value:sh.bg||'#0b1020',
        style:{width:'70px',height:'38px',background:'transparent',border:'1px solid var(--line)',borderRadius:'8px',cursor:'pointer',marginTop:'4px'},
        oninput:e=>{sh.bg=e.target.value;refreshCanvas();}})),
      sh.bg?h('button',{class:'btn sm ghost',onclick:()=>{pushUndo();sh.bg='';render();}},'✕ cor'):null,
      h('button',{class:'btn sm',onclick:()=>bgInput.click()}, sh.bgImage?'Trocar fundo':'🖼 Imagem de fundo'),
      sh.bgImage?h('button',{class:'btn sm danger',onclick:()=>{pushUndo();sh.bgImage='';render();}},'✕ imagem'):null, bgInput),
    h('div',{style:{marginTop:'14px'}},
      h('div',{class:'hint',style:{marginBottom:'6px'}},'Modelos prontos (substituem o layout, não as regras):'),
      h('div',{class:'row wrapf'}, ...Object.keys(LAYOUT_PRESETS).map(nome=>
        h('button',{class:'btn sm ghost',onclick:()=>{
          if(!confirm('Aplicar o modelo "'+nome+'"? O layout atual é substituído. As regras não são afetadas.')) return;
          pushUndo(); const novo=LAYOUT_PRESETS[nome]();
          sh.blocks=novo.blocks; sh.canvasH=novo.canvasH; S.ui.sel=null; S.ui.multi=[]; render();
          showToast('Modelo aplicado: '+nome);}},nome)))),
    h('div',{style:{marginTop:'14px'}}, h('div',{class:'hint',style:{marginBottom:'6px'}},'Arraste um bloco para o papel — ou clique para encaixar sozinho:'), paleta));

  const atalhos=h('div',{class:'keys',style:{marginTop:'10px'}},
    ...[['Arrastar','mover'],['Shift+clique','somar à seleção'],['Arrastar no vazio','selecionar área'],
        ['Alt+arrastar','duplicar'],['Setas','1 px'],['Shift+Setas',(sh.grid||GRID)+' px'],
        ['Delete','remover'],['Ctrl+D','duplicar'],['Ctrl+A','selecionar tudo'],
        ['Ctrl+Z','desfazer'],['Ctrl+Shift+Z','refazer'],['Tab','próximo bloco'],['Esc','desselecionar']]
      .map(([k,d])=>h('span',{class:'keycap'}, h('b',{},k), d)));

  const zoomAtual=S.ui.zoom;
  const setZoom=z=>{ S.ui.zoom=z; render(); };
  const barraZoom=h('div',{class:'row wrapf',style:{marginTop:'8px'}},
    h('span',{class:'hint'},'Zoom:'),
    h('button',{class:'btn sm ghost',title:'Diminuir',onclick:()=>setZoom(Math.max(.25,(zoomAtual||1)-.15))},'−'),
    h('span',{class:'tg-fx',style:{minWidth:'62px',textAlign:'center'}}, zoomAtual?(Math.round(zoomAtual*100)+'%'):'auto'),
    h('button',{class:'btn sm ghost',title:'Aumentar',onclick:()=>setZoom(Math.min(2.5,(zoomAtual||1)+.15))},'+'),
    h('button',{class:'btn sm '+(zoomAtual?'ghost':'emerald'),title:'Ajustar à largura da tela',onclick:()=>setZoom(null)},'⤢ Ajustar'),
    h('button',{class:'btn sm ghost',onclick:()=>setZoom(1)},'1:1'));

  const barraGrade=h('div',{class:'row wrapf',style:{marginTop:'8px'}},
    h('span',{class:'hint'},'Grade:'),
    h('button',{class:'btn sm '+(sh.showGrid!==false?'emerald':'ghost'),onclick:()=>{sh.showGrid=!(sh.showGrid!==false);render();}},
      (sh.showGrid!==false?'✓ ':'')+'Mostrar'),
    h('button',{class:'btn sm '+(sh.snap!==false?'emerald':'ghost'),title:'Grudar nas bordas e centros dos outros blocos',
      onclick:()=>{sh.snap=!(sh.snap!==false);render();}}, (sh.snap!==false?'✓ ':'')+'Ímã'),
    h('div',{class:'seg'}, ...[5,10,20,40].map(g=>h('button',{class:(sh.grid||GRID)===g?'on':'',
      onclick:()=>{pushUndo();sh.grid=g;render();}},g+'px'))));

  const barraGuias=h('div',{class:'row wrapf',style:{marginTop:'8px'}},
    h('span',{class:'hint'},'Guias fixas:'),
    h('button',{class:'btn sm ghost',title:'Guia vertical no meio do papel',onclick:()=>{
      pushUndo(); sh.guides.push({id:uid(),eixo:'gx',pos:Math.round(CANVAS_W/2)}); render();}},'┃ + Vertical'),
    h('button',{class:'btn sm ghost',title:'Guia horizontal no meio do papel',onclick:()=>{
      pushUndo(); sh.guides.push({id:uid(),eixo:'gy',pos:Math.round((sh.canvasH||990)/2)}); render();}},'━ + Horizontal'),
    (sh.guides||[]).length?h('button',{class:'btn sm ghost',onclick:()=>{pushUndo();sh.guides=[];render();}},
      '✕ Limpar ('+sh.guides.length+')'):null,
    (sh.guides||[]).length?h('span',{class:'hint'},'clique numa guia para removê-la'):null);

  const editor=card('Layout da Ficha',
    'Arraste para mover · puxe o canto ↘ para redimensionar · Shift+clique soma à seleção · arraste no vazio para selecionar uma área.',
    h('div',{class:'row wrapf'},
      h('button',{class:'btn sm ghost',disabled:!undoStack.length,title:'Ctrl+Z',onclick:()=>undo()},'↩'),
      h('button',{class:'btn sm ghost',disabled:!redoStack.length,title:'Ctrl+Shift+Z',onclick:()=>redo()},'↪'),
      h('button',{class:'btn sm ghost',title:'Selecionar todos os blocos (Ctrl+A)',onclick:()=>{
        if(!sh.blocks.length) return; S.ui.sel=sh.blocks[sh.blocks.length-1].id;
        S.ui.multi=sh.blocks.slice(0,-1).map(b=>b.id); render();}},'▣ Tudo'),
      h('button',{class:'btn sm '+(S.ui.camadas?'emerald':'ghost'),title:'Lista de blocos, ordem e visibilidade',
        onclick:()=>{S.ui.camadas=!S.ui.camadas;render();}},'☰ Camadas'),
      h('button',{class:'btn sm ghost',title:'Encolhe o papel até o último bloco',onclick:()=>{
        pushUndo(); const low=sh.blocks.reduce((m,b)=>Math.max(m,b.y+b.h),0); sh.canvasH=Math.max(200,low+20); render();}},'⇕ Ajustar altura'),
      h('button',{class:'btn sm ghost',title:'Volta ao layout padrão (não mexe nas regras)',onclick:()=>{
        if(confirm('Restaurar o layout padrão da ficha? As regras do sistema não são afetadas.')){
          pushUndo(); const d=defaultSheet(); sh.blocks=d.blocks; sh.canvasH=d.canvasH; S.ui.sel=null; S.ui.multi=[]; render();}}},'↺ Layout padrão')),
    barraZoom, barraGrade, barraGuias,
    S.ui.camadas?camadasBox(sh):null,
    canvasNode(sys, sampleDraft(sys), 'edit'),
    h('div',{class:'hint',style:{marginTop:'8px'}},'Mostrando um personagem de exemplo — é exatamente assim que o jogador verá.'),
    atalhos);

  /* Em telas largas o painel vira flutuante à direita: dá para arrastar o bloco e
     mexer nas opções sem rolar a página. Em telas menores, continua embaixo. */
  const painel = sel ? propsCard(sys,sh,sel)
    : card('Opções do Bloco',null,null,h('div',{class:'hint'},'Clique num bloco do layout acima — ou arraste um bloco da paleta direto para o papel.'));
  if(sel) painel.classList.add('props-float');
  return h('div',{}, controls, editor, painel);
}
/* Painel de camadas: a lista de tudo que existe no papel, na ordem de pilha.
   Resolve o problema de achar um bloco pequeno, escondido ou atrás de outro. */
function camadasBox(sh){
  const lista=sh.blocks.slice().reverse();   /* topo da pilha primeiro */
  return h('div',{class:'camadas'},
    h('div',{class:'hint',style:{marginBottom:'6px'}},'Do topo para o fundo. Clique para selecionar; arraste as setas para reordenar.'),
    ...lista.map(b=>{
      const t=BLOCK_TYPES[b.key]||{icon:'▫',label:b.key};
      const i=sh.blocks.indexOf(b);
      const on=estaSelecionado(b.id);
      return h('div',{class:'camada'+(on?' on':''),onclick:e=>{
          if(e.target.closest('button')) return;
          if(e.shiftKey){ S.ui.multi=[...(S.ui.multi||[]),b.id]; }
          else { S.ui.sel=b.id; S.ui.multi=[]; }
          render();}},
        h('span',{class:'cm-ic'},t.icon),
        h('span',{class:'cm-nm'}, b.opts.alias||t.label),
        h('span',{class:'cm-xy'}, b.x+','+b.y),
        h('button',{class:'btn mini',title:b.opts.hidden?'Mostrar':'Ocultar na ficha',
          onclick:()=>{pushUndo();b.opts.hidden=!b.opts.hidden;render();}}, b.opts.hidden?'🙈':'👁'),
        h('button',{class:'btn mini',title:b.opts.locked?'Destravar':'Travar',
          onclick:()=>{pushUndo();b.opts.locked=!b.opts.locked;render();}}, b.opts.locked?'🔒':'🔓'),
        h('button',{class:'btn mini',title:'Subir na pilha',disabled:i>=sh.blocks.length-1,
          onclick:()=>{pushUndo();sh.blocks.splice(i,1);sh.blocks.splice(i+1,0,b);render();}},'⬆'),
        h('button',{class:'btn mini',title:'Descer na pilha',disabled:i<=0,
          onclick:()=>{pushUndo();sh.blocks.splice(i,1);sh.blocks.splice(i-1,0,b);render();}},'⬇'),
        h('button',{class:'btn mini danger',title:'Remover',onclick:()=>removerBloco(b)},'✕'));
    }),
    sh.blocks.length?null:h('div',{class:'hint'},'Nenhum bloco no papel.'));
}
/* Adiciona um bloco numa posição exata (usado ao soltar da paleta). */
function addBlockAt(key,x,y){
  const sh=S.system.sheet, t=BLOCK_TYPES[key];
  pushUndo();
  const bx=Math.max(0,Math.min(Math.round(x/GRID)*GRID, CANVAS_W-t.w));
  const by=Math.max(0,Math.round(y/GRID)*GRID);
  const b=blk(key, bx, by, t.w, t.h);
  sh.blocks.push(b); S.ui.sel=b.id;
  if(b.y+b.h+20>sh.canvasH) sh.canvasH=b.y+b.h+20;
  render();
  return b;
}
/* Arrastar da paleta para o canvas: um fantasma segue o cursor e o bloco nasce
   onde for solto. Se o gesto não sair do botão, vale como clique e encaixa sozinho. */
function palletDrag(ev,key,btn){
  if(ev.button!=null&&ev.button!==0) return;
  ev.preventDefault();
  const t=BLOCK_TYPES[key];
  const ghost=h('div',{class:'pal-ghost'}, t.icon+' '+t.label);
  document.body.appendChild(ghost);
  let moveu=false;
  const cv=()=>document.querySelector('.cv.edit');
  const dentro=(e,r)=> e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
  const move=e=>{
    if(Math.abs(e.clientX-ev.clientX)>3||Math.abs(e.clientY-ev.clientY)>3) moveu=true;
    ghost.style.left=(e.clientX+12)+'px'; ghost.style.top=(e.clientY+12)+'px';
    const c=cv(); if(!c) return;
    const ok=dentro(e,c.getBoundingClientRect());
    ghost.classList.toggle('on-drop',ok);
    c.classList.toggle('drop',ok&&moveu);
  };
  const up=e=>{
    document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up);
    ghost.remove();
    const c=cv(); if(c) c.classList.remove('drop');
    const sh=S.system.sheet;
    if(!moveu){                                   /* clique simples: encaixa no 1º vão livre */
      const spot=freeSpot(sh,t.w,t.h); addBlockAt(key,spot.x,spot.y); return;
    }
    if(!c) return;
    const r=c.getBoundingClientRect(), sc=parseFloat(c.dataset.scale)||1;
    if(!dentro(e,r)) return;                      /* soltou fora: cancela */
    addBlockAt(key, (e.clientX-r.left)/sc - t.w/2, (e.clientY-r.top)/sc - t.h/2);
  };
  document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
  move(ev);
}
/* acha um lugar livre no canvas para um bloco novo */
function freeSpot(sh,w,h2){
  const bs=sh.blocks;
  for(let y=10;y<4000;y+=GRID){
    for(let x=10;x+w<=CANVAS_W-10;x+=GRID*2){
      const hit=bs.some(b=>x<b.x+b.w && x+w>b.x && y<b.y+b.h && y+h2>b.y);
      if(!hit) return {x,y};
    }
  }
  return {x:10,y:sh.canvasH+10};
}
/* painel de propriedades do bloco selecionado */
function propsCard(sys,sh,b){
  const o=b.opts, t=BLOCK_TYPES[b.key]||{label:b.key,icon:'▫'};
  const idx=sh.blocks.indexOf(b);
  const num=(lbl,key,min)=>field(lbl,h('input',{class:'in',type:'number',step:GRID,value:b[key],onchange:e=>{
    pushUndo(); b[key]=Math.max(min,parseInt(e.target.value)||min); render();}}));
  const seg=(lbl,key,opts)=>h('div',{style:{marginTop:'10px'}}, h('div',{class:'hint',style:{marginBottom:'4px'}},lbl),
    h('div',{class:'seg'}, ...opts.map(([v,l])=>h('button',{class:o[key]===v?'on':'',onclick:()=>{pushUndo();o[key]=v;render();}},l))));
  const chk=(lbl,key,dflt)=>h('button',{class:'btn sm '+((o[key]!==undefined?o[key]:dflt)?'emerald':'ghost'),style:{marginRight:'6px',marginTop:'8px'},
    onclick:()=>{pushUndo();o[key]=!(o[key]!==undefined?o[key]:dflt);render();}}, ((o[key]!==undefined?o[key]:dflt)?'✓ ':'')+lbl);

  /* cor e slider: oninput dispara a cada pixel do gesto. Por isso (a) a tag agrupa
     tudo num único passo de desfazer e (b) só o canvas é redesenhado — um render()
     completo destruiria o próprio controle que está sendo arrastado. */
  const cor=(lbl,key,dflt)=>field(lbl, h('input',{type:'color',value:o[key]||dflt,
    style:{width:'100%',height:'36px',background:'transparent',border:'1px solid var(--line)',borderRadius:'8px',cursor:'pointer',marginTop:'4px'},
    oninput:e=>{pushUndo('op:'+b.id+':'+key); o[key]=e.target.value; refreshCanvas();}}));
  const rng=(lbl,key,min,max,dflt)=>{
    const atual=()=>(o[key]==null?dflt:o[key]);
    const lab=h('span',{},lbl+' ('+atual()+')');
    const inp=h('input',{type:'range',min:min,max:max,value:atual(),style:{width:'100%',marginTop:'8px'},
      oninput:e=>{ pushUndo('op:'+b.id+':'+key); o[key]=parseInt(e.target.value);
        lab.textContent=lbl+' ('+o[key]+')'; refreshCanvas(); }});
    return h('label',{class:'f'}, lab, inp);
  };

  const extras=[];
  if(b.key==='atributos'||b.key==='valores'){
    extras.push(seg('Formato', 'view', [['grade','▦ Grade'],['lista','☰ Lista'],['linha','⋯ Linha'],['formas','⬢ Estilizado']]));
    if(o.view==='grade') extras.push(h('div',{style:{marginTop:'8px',maxWidth:'160px'}},
      field('Colunas', h('input',{class:'in',type:'number',min:'1',max:'8',value:o.cols||5,onchange:e=>{o.cols=Math.max(1,Math.min(8,parseInt(e.target.value)||5));render();}}))));
    if(o.view==='formas'){
      extras.push(h('div',{style:{marginTop:'10px'}}, h('div',{class:'hint',style:{marginBottom:'6px'}},'Comece por uma predefinição:'),
        h('div',{class:'row wrapf'}, ...Object.keys(SHAPE_PRESETS).map(nome=>
          h('button',{class:'btn sm ghost',onclick:()=>{pushUndo();Object.assign(o,SHAPE_PRESETS[nome]);render();}},nome)))));
      extras.push(seg('Arranjo','arranjo',[['grade','▦ Grade'],['colmeia','⬣ Colmeia'],['flor','✿ Flor (roseta)']]));
      if(o.arranjo==='flor'){
        extras.push(h('div',{class:'grid g2',style:{marginTop:'4px'}},
          rng('Raio da roseta','radius',40,220, 96), rng('Giro inicial','startAngle',-180,180,-90)));
        extras.push(h('div',{},chk('Núcleo no centro','hub',true)));
        if(o.hub!==false){
          extras.push(h('div',{style:{marginTop:'8px'}}, field('Texto do núcleo',
            h('input',{class:'in',value:o.hubText||'',placeholder:'ATRIBUTOS',oninput:e=>{o.hubText=e.target.value;refreshCanvas();},onchange:()=>render()}))));
          extras.push(h('div',{class:'grid g3',style:{marginTop:'6px',alignItems:'end'}},
            cor('Cor do núcleo','hubFill','#0b1020'), cor('Texto do núcleo','hubTxt','#ffffff'),
            rng('Tamanho do núcleo','hubSize',30,240,110)));
        }
      } else {
        extras.push(h('div',{style:{marginTop:'8px',maxWidth:'160px'}},
          field('Por linha', h('input',{class:'in',type:'number',min:'1',max:'8',value:o.cols||5,onchange:e=>{pushUndo();o.cols=Math.max(1,Math.min(8,parseInt(e.target.value)||5));render();}}))));
      }
      extras.push(seg('Forma','shape',[['hexagono','⬢ Hexágono'],['circulo','⬤ Círculo'],['losango','◆ Losango'],['escudo','🛡 Escudo'],['octogono','⯃ Octógono'],['caixa','▢ Caixa']]));
      extras.push(seg('Fonte','font',[['display','Impacto'],['serif','Serifada'],['padrao','Padrão'],['mono','Mono']]));
      extras.push(h('div',{class:'grid g3',style:{marginTop:'10px',alignItems:'end'}},
        cor('Preenchimento','fill','#0f1729'), cor('Borda','stroke','#c7d2fe'), cor('Texto','txtColor','#ffffff')));
      extras.push(h('div',{class:'grid g2',style:{marginTop:'4px'}},
        rng('Tamanho da peça','shSize',40,190,96), rng('Espessura da borda','strokeW',0,12,3)));
      extras.push(h('div',{class:'grid g2'},
        rng('Tamanho do número','numSize',10,64,30), rng('Espaço entre peças','shGap',0,30,8)));
      extras.push(h('div',{},
        chk('Nome','showName',true), chk('Sigla','showAbbr',true), chk('Nome em cima','nameOnTop',false),
        chk('Bônus/mod.','showBonus',true)));
      extras.push(h('div',{class:'hint',style:{marginTop:'8px'}},'As siglas (FOR, AGI…) saem da aba 💪 Atributos.'));
      extras.push(h('div',{style:{marginTop:'10px'}},
        h('button',{class:'btn sm ghost',title:'Deixa o bloco do tamanho exato do desenho',
          onclick:()=>{ pushUndo(); ajustarAoConteudo(b); render(); }},'⤢ Ajustar bloco ao desenho')));
    }
  }
  if(b.key==='pericias') extras.push(seg('Formato','view',[['tabela','▤ Tabela'],['lista','☰ Lista'],['chips','⬭ Etiquetas']]));
  if(b.key==='foto'){
    extras.push(seg('Formato','shape',[['quadrado','▢ Quadrado'],['circulo','◯ Círculo']]));
    extras.push(seg('Preenchimento','fit',[['cover','Preencher'],['contain','Caber inteira']]));
    extras.push(h('div',{style:{marginTop:'10px'}}, field('Emoji quando não há foto', h('input',{class:'in',value:o.emoji||'',placeholder:'ex.: 🐉',oninput:e=>{o.emoji=e.target.value;persist();},onchange:()=>render()}))));
  }
  if(b.key==='nome'){
    extras.push(seg('Alinhamento','align',[['left','⬅ Esquerda'],['center','⬌ Centro'],['right','➡ Direita']]));
    extras.push(seg('Tamanho','size',[['p','Pequeno'],['m','Médio'],['g','Grande']]));
    extras.push(h('div',{},chk('Mostrar classe • raça • nível','showSub',true)));
  }
  if(b.key==='recursos') extras.push(h('div',{},chk('Botões de dano/cura na ficha','controls',true)));
  if(b.key==='texto'){
    extras.push(h('div',{style:{marginTop:'10px'}}, field('Texto', h('textarea',{class:'in',rows:'2',value:o.text||'',oninput:e=>{o.text=e.target.value;persist();},onchange:()=>render()}))));
    extras.push(seg('Alinhamento','align',[['left','⬅'],['center','⬌'],['right','➡']]));
    extras.push(seg('Tamanho','size',[['p','Pequeno'],['m','Médio'],['g','Grande']]));
  }

  /* --- decorativos: opções próprias --- */
  if(b.key==='divisor'){
    extras.push(seg('Estilo','estilo',[['solida','──'],['tracejada','┄┄'],['pontilhada','┈┈'],['dupla','═══']]));
    extras.push(h('div',{class:'grid g2',style:{marginTop:'4px'}},
      rng('Espessura','espessura',1,12,2), cor('Cor','cor','#4f46e5')));
    extras.push(h('div',{style:{marginTop:'8px'}}, field('Enfeite no meio (opcional)',
      h('input',{class:'in',value:o.enfeite||'',placeholder:'❖  ·  ⚔  ·  ✦',oninput:e=>{o.enfeite=e.target.value;refreshCanvas();},onchange:()=>render()}))));
  }
  if(b.key==='forma'){
    extras.push(seg('Forma','shape',[['hexagono','⬢'],['circulo','⬤'],['losango','◆'],['escudo','🛡'],['octogono','⯃'],['caixa','▢']]));
    extras.push(h('div',{class:'grid g2',style:{marginTop:'8px'}}, cor('Preenchimento','fill','#141a2e'), cor('Borda','stroke','#6366f1')));
    extras.push(rng('Espessura da borda','strokeW',0,20,3));
    extras.push(h('div',{style:{marginTop:'8px'}}, field('Texto dentro',
      h('input',{class:'in',value:o.texto||'',oninput:e=>{o.texto=e.target.value;refreshCanvas();},onchange:()=>render()}))));
    extras.push(h('div',{class:'grid g2',style:{marginTop:'4px'}}, cor('Cor do texto','txtColor','#e2e8f0'), rng('Tamanho do texto','numSize',8,48,18)));
  }
  if(b.key==='imagem'){
    const inp=h('input',{type:'file',accept:'image/*',class:'hide',onchange:e=>{
      readPhoto(e.target.files[0], data=>{ pushUndo(); o.src=data; render(); }); e.target.value='';}});
    extras.push(h('div',{style:{marginTop:'10px'}},
      h('button',{class:'btn sm',onclick:()=>inp.click()}, o.src?'Trocar imagem':'📷 Enviar imagem'),
      o.src?h('button',{class:'btn sm danger',style:{marginLeft:'6px'},onclick:()=>{pushUndo();o.src='';render();}},'✕'):null, inp));
    extras.push(seg('Preenchimento','fit',[['contain','Caber inteira'],['cover','Preencher']]));
    extras.push(seg('Formato','shape',[['quadrado','▢ Quadrado'],['circulo','◯ Círculo']]));
  }
  if(b.key==='recursos'){
    extras.push(h('div',{},chk('Botões de descanso ☕🌙','showRest',true)));
  }

  const sels=selecionados(sh);
  return card((o.locked?'🔒 ':'')+t.icon+' '+(o.alias||t.label),
    sels.length>1?(sels.length+' blocos selecionados — mover, alinhar e distribuir valem para todos.'):'Posição, estilo e opções do bloco selecionado.',
    h('div',{class:'row wrapf'},
      h('button',{class:'btn sm ghost',disabled:idx>=sh.blocks.length-1,title:'Trazer para frente',onclick:()=>{
        pushUndo(); sh.blocks.splice(idx,1); sh.blocks.push(b); render();}},'⬆ Frente'),
      h('button',{class:'btn sm ghost',disabled:idx<=0,title:'Enviar para trás',onclick:()=>{
        pushUndo(); sh.blocks.splice(idx,1); sh.blocks.unshift(b); render();}},'⬇ Atrás'),
      h('button',{class:'btn sm ghost',title:'Ctrl+D',onclick:()=>{duplicarBloco(b);render();}},'⧉ Duplicar'),
      h('button',{class:'btn danger sm',title:'Delete',onclick:()=>removerBloco(b)},'✕ Remover')),
    h('div',{class:'row wrapf',style:{marginTop:'6px'}},
      h('button',{class:'btn sm '+(o.locked?'amber':'ghost'),title:'Bloco travado não se move nem se redimensiona',
        onclick:()=>{pushUndo();o.locked=!o.locked;render();}}, (o.locked?'🔒 Travado':'🔓 Travar')),
      h('button',{class:'btn sm '+(o.hidden?'amber':'ghost'),title:'Some na ficha do jogador, continua no editor',
        onclick:()=>{pushUndo();o.hidden=!o.hidden;render();}}, (o.hidden?'👁 Oculto':'👁 Ocultar')),
      h('button',{class:'btn sm ghost',title:'Copiar o estilo deste bloco',
        onclick:()=>{S.ui.estiloCopiado=estiloDe(o); showToast('Estilo copiado');}},'🎨 Copiar estilo'),
      h('button',{class:'btn sm ghost',disabled:!S.ui.estiloCopiado,title:'Aplicar o estilo copiado nos selecionados',
        onclick:()=>{pushUndo(); sels.forEach(x=>Object.assign(x.opts,S.ui.estiloCopiado)); render(); showToast('Estilo aplicado em '+sels.length);}},'🖌 Colar estilo')),
    h('div',{style:{marginTop:'8px'}}, field('Apelido deste bloco (só no editor)',
      h('input',{class:'in',value:o.alias||'',placeholder:t.label,oninput:e=>{o.alias=e.target.value;persist();},onchange:()=>render()}))),
    h('div',{class:'propgrid'}, num('X','x',0), num('Y','y',0), num('Largura','w',60), num('Altura','h',40)),
    h('div',{style:{marginTop:'8px'}}, h('div',{class:'hint',style:{marginBottom:'4px'}},'Alinhar no papel:'),
      h('div',{class:'seg'},
        h('button',{title:'Encostar à esquerda',onclick:()=>alinharNoPapel(b,'esq')},'⇤'),
        h('button',{title:'Centralizar na horizontal',onclick:()=>alinharNoPapel(b,'centroH')},'⇔'),
        h('button',{title:'Encostar à direita',onclick:()=>alinharNoPapel(b,'dir')},'⇥'),
        h('button',{title:'Encostar no topo',onclick:()=>alinharNoPapel(b,'topo')},'⤒'),
        h('button',{title:'Centralizar na vertical',onclick:()=>alinharNoPapel(b,'centroV')},'⇕'),
        h('button',{title:'Encostar embaixo',onclick:()=>alinharNoPapel(b,'base')},'⤓'))),
    sels.length>1?grupoBox(sh,sels):null,
    h('div',{}, chk('Moldura de fundo','framed',true), !SEM_TITULO.includes(b.key)?chk('Mostrar título','showTitle',true):null),
    (o.showTitle&&!SEM_TITULO.includes(b.key))?h('div',{},
      h('div',{style:{marginTop:'8px'}}, field('Título personalizado (vazio = padrão)',
        h('input',{class:'in',value:o.title||'',placeholder:t.label,oninput:e=>{o.title=e.target.value;persist();},onchange:()=>render()}))),
      h('div',{class:'grid g2',style:{marginTop:'6px',alignItems:'end'}},
        cor('Cor do título','titleColor','#c7d2fe'), rng('Tamanho do título','titleSize',8,28,11)),
      seg('Alinhamento do título','titleAlign',[['left','⬅'],['center','⬌'],['right','➡']]),
      h('div',{}, chk('MAIÚSCULAS no título','titleCaps',true))):null,
    estiloBox(b,cor,rng,seg,chk),
    ...extras);
}
/* só as chaves de estilo — o que "copiar estilo" leva de um bloco para outro */
const ESTILO_KEYS=['bg','bgOpacity','borderColor','borderW','radius','shadow','pad','opacity','framed',
                   'titleColor','titleSize','titleAlign','titleCaps'];
function estiloDe(o){ const r={}; ESTILO_KEYS.forEach(k=>{ if(o[k]!==undefined) r[k]=o[k]; }); return r; }
/* Painel de estilo livre — vale para QUALQUER bloco */
function estiloBox(b,cor,rng,seg,chk){
  const o=b.opts;
  const aberto=!!S.ui.open['est:'+b.id];
  const head=h('div',{class:'acc-head',style:{marginTop:'12px'},onclick:()=>{S.ui.open['est:'+b.id]=!aberto;render();}},
    h('div',{class:'row'}, h('span',{class:'acc-caret'},aberto?'▼':'▶'), h('span',{class:'acc-title'},'🎨 Estilo do bloco')),
    h('span',{class:'acc-meta'}, aberto?'':'cor, borda, sombra, giro…'));
  if(!aberto) return head;
  return h('div',{}, head, h('div',{class:'acc-body',style:{paddingBottom:'10px'}},
    h('div',{class:'grid g2',style:{marginTop:'10px',alignItems:'end'}},
      cor('Cor de fundo','bg','#141a2e'), rng('Opacidade do fundo','bgOpacity',0,100,100)),
    h('div',{class:'grid g2',style:{marginTop:'4px',alignItems:'end'}},
      cor('Cor da borda','borderColor','#2a3350'), rng('Espessura da borda','borderW',0,10,1)),
    h('div',{class:'grid g2',style:{marginTop:'4px'}},
      rng('Cantos arredondados','radius',0,40,14), rng('Espaço interno','pad',0,40,12)),
    h('div',{class:'grid g2',style:{marginTop:'4px'}},
      rng('Opacidade do bloco','opacity',10,100,100), rng('Giro (graus)','rotate',-180,180,0)),
    seg('Sombra','shadow',[['nenhuma','Nenhuma'],['suave','Suave'],['forte','Forte'],['brilho','Brilho'],['interna','Interna']]),
    h('div',{class:'row wrapf',style:{marginTop:'10px'}},
      h('button',{class:'btn sm ghost',title:'Devolve o bloco ao visual padrão',onclick:()=>{
        pushUndo(); Object.assign(o, boxOpts(), {alias:o.alias,locked:o.locked,hidden:o.hidden}); render();}},'↺ Limpar estilo'))));
}
/* Ferramentas que só fazem sentido com vários blocos selecionados */
function grupoBox(sh,sels){
  const alinhar=como=>{
    pushUndo();
    const xs=sels.map(b=>b.x), ys=sels.map(b=>b.y);
    const dirs=sels.map(b=>b.x+b.w), bots=sels.map(b=>b.y+b.h);
    if(como==='esq'){ const v=Math.min(...xs); sels.forEach(b=>b.x=v); }
    if(como==='dir'){ const v=Math.max(...dirs); sels.forEach(b=>b.x=Math.max(0,v-b.w)); }
    if(como==='topo'){ const v=Math.min(...ys); sels.forEach(b=>b.y=v); }
    if(como==='base'){ const v=Math.max(...bots); sels.forEach(b=>b.y=Math.max(0,v-b.h)); }
    if(como==='centroH'){ const v=(Math.min(...xs)+Math.max(...dirs))/2; sels.forEach(b=>b.x=Math.max(0,Math.round(v-b.w/2))); }
    if(como==='centroV'){ const v=(Math.min(...ys)+Math.max(...bots))/2; sels.forEach(b=>b.y=Math.max(0,Math.round(v-b.h/2))); }
    render();
  };
  const distribuir=eixo=>{
    if(sels.length<3) return showToast('Precisa de 3 blocos ou mais');
    pushUndo();
    const ord=sels.slice().sort((a,b)=>eixo==='x'?(a.x-b.x):(a.y-b.y));
    const ini=eixo==='x'?ord[0].x:ord[0].y;
    const fim=eixo==='x'?(ord[ord.length-1].x+ord[ord.length-1].w):(ord[ord.length-1].y+ord[ord.length-1].h);
    const somaTam=ord.reduce((s,b)=>s+(eixo==='x'?b.w:b.h),0);
    const vao=(fim-ini-somaTam)/(ord.length-1);
    let pos=ini;
    ord.forEach(b=>{ if(eixo==='x'){ b.x=Math.round(pos); pos+=b.w+vao; } else { b.y=Math.round(pos); pos+=b.h+vao; } });
    render();
  };
  const igualar=dim=>{
    pushUndo();
    const alvo=sels[0];
    sels.forEach(b=>{ if(dim==='w') b.w=alvo.w; else if(dim==='h') b.h=alvo.h; else { b.w=alvo.w; b.h=alvo.h; } });
    render();
  };
  return h('div',{class:'req-box',style:{marginTop:'10px'}},
    h('div',{class:'lbl'},'GRUPO — '+sels.length+' BLOCOS'),
    h('div',{class:'hint',style:{marginBottom:'6px'}},'Alinhar entre si:'),
    h('div',{class:'seg'},
      h('button',{title:'Alinhar pela esquerda',onclick:()=>alinhar('esq')},'⇤'),
      h('button',{title:'Centralizar na horizontal',onclick:()=>alinhar('centroH')},'⇔'),
      h('button',{title:'Alinhar pela direita',onclick:()=>alinhar('dir')},'⇥'),
      h('button',{title:'Alinhar pelo topo',onclick:()=>alinhar('topo')},'⤒'),
      h('button',{title:'Centralizar na vertical',onclick:()=>alinhar('centroV')},'⇕'),
      h('button',{title:'Alinhar pela base',onclick:()=>alinhar('base')},'⤓')),
    h('div',{class:'row wrapf',style:{marginTop:'8px'}},
      h('button',{class:'btn sm ghost',title:'Espaçamento igual na horizontal',onclick:()=>distribuir('x')},'⇹ Distribuir H'),
      h('button',{class:'btn sm ghost',title:'Espaçamento igual na vertical',onclick:()=>distribuir('y')},'⇳ Distribuir V')),
    h('div',{class:'row wrapf',style:{marginTop:'6px'}},
      h('button',{class:'btn sm ghost',title:'Mesma largura do primeiro selecionado',onclick:()=>igualar('w')},'↔ Mesma largura'),
      h('button',{class:'btn sm ghost',onclick:()=>igualar('h')},'↕ Mesma altura'),
      h('button',{class:'btn sm ghost',onclick:()=>igualar('wh')},'⧉ Mesmo tamanho')),
    h('div',{class:'hint',style:{marginTop:'6px'}},'O "mesmo tamanho" usa o bloco principal (borda cheia) como referência.'));
}

/* ---------- Editor de Classes / Raças (acordeão) ---------- */
function featureCard(sys, list, title, hint, kind){
  const isRace = kind==='raca';
  const addLabel = isRace?'Raça':'Classe';
  return card(title, hint,
    h('button',{class:'btn primary',onclick:()=>{const it={id:uid(),name:'Nova '+addLabel,description:'',abilities:[]}; if(isRace)it.traits=[]; list.push(it); S.ui.open[it.id]=true; render();}},'+ '+addLabel),
    ...list.map(c=>featureItem(sys,list,c,kind)));
}
function featureItem(sys,list,c,kind){
  const isRace=kind==='raca';
  const open=!!S.ui.open[c.id];
  const nAb=(c.abilities||[]).length, nTr=isRace?((c.traits||[]).length):0;
  const header=h('div',{class:'acc-head',onclick:()=>{S.ui.open[c.id]=!open;render();}},
    h('div',{class:'row'}, h('span',{class:'acc-caret'},open?'▼':'▶'), h('span',{class:'acc-title'},c.name||'(sem nome)')),
    h('div',{class:'row'}, h('span',{class:'acc-meta'}, nAb+' hab.'+(isRace?(' · '+nTr+' traços'):'')),
      h('button',{class:'btn danger sm',onclick:e=>{e.stopPropagation();const i=list.indexOf(c);list.splice(i,1);delete S.ui.open[c.id];render();}},'✕')));
  if(!open) return h('div',{class:'acc'}, header);
  const body=h('div',{class:'acc-body'},
    h('div',{style:{marginTop:'12px'}}, field('Nome', h('input',{class:'in',value:c.name,oninput:e=>{c.name=e.target.value;persist();},onchange:()=>render()}))),
    h('div',{style:{marginTop:'8px'}}, field('Descrição', h('textarea',{class:'in',rows:'2',value:c.description||'',oninput:e=>{c.description=e.target.value;persist();}}))),
    isRace?traitEditor(c):null,
    h('div',{class:'sub-h'}, isRace?'Efeitos / Habilidades da raça':'Habilidades da classe'),
    abilityEditor(sys,c),
    /* tabela própria: as colunas daqui valem só para quem tem esta classe e
       sobrescrevem as do sistema quando o nome coincide */
    isRace?null:h('div',{},
      h('div',{class:'sub-h'},'Tabela de progressão desta classe'),
      h('div',{class:'hint',style:{marginTop:'-4px',marginBottom:'8px'}},
        'Só vale para quem escolher esta classe. Serve para recursos que mudam de fórmula por classe (PV/PE por nível, espaços de magia, dado de ataque).'),
      progEditor(sys, (c.progression=sanitizeProg(c.progression)), {})));
  return h('div',{class:'acc'}, header, body);
}
function traitEditor(c){
  if(!c.traits) c.traits=[];
  return h('div',{},
    h('div',{class:'sub-h'},'Características físicas'),
    h('div',{class:'hint',style:{marginTop:'-4px',marginBottom:'8px'}},'Traços do corpo — ex.: Asas, Cauda, Chifres. Nem toda raça tem.'),
    ...c.traits.map(t=>h('div',{class:'trait-row'},
      h('input',{class:'in',style:{maxWidth:'150px'},value:t.name,placeholder:'Ex.: Asas',oninput:e=>{t.name=e.target.value;persist();}}),
      h('input',{class:'in',value:t.description||'',placeholder:'Descrição/efeito',oninput:e=>{t.description=e.target.value;persist();}}),
      h('button',{class:'btn danger sm',onclick:()=>{c.traits=c.traits.filter(x=>x.id!==t.id);render();}},'✕'))),
    h('button',{class:'btn ghost sm',onclick:()=>{c.traits.push({id:uid(),name:'Nova característica',description:''});render();}},'+ Característica'));
}
function abilityEditor(sys, owner){
  if(!owner.abilities) owner.abilities=[];
  const wrap=h('div',{});
  owner.abilities.forEach(ab=>{
    if(!ab.effects) ab.effects=[];
    if(!ab.req) ab.req={level:0,attrs:[]};
    wrap.appendChild(h('div',{class:'ability-card'},
      h('div',{class:'row'},
        h('input',{class:'in',value:ab.name,placeholder:'Nome da habilidade',oninput:e=>{ab.name=e.target.value;persist();},onchange:()=>render()}),
        h('button',{class:'btn danger sm',onclick:()=>{owner.abilities=owner.abilities.filter(x=>x.id!==ab.id);render();}},'✕')),
      h('input',{class:'in',style:{marginTop:'6px'},value:ab.description,placeholder:'O que ela faz (descrição)',oninput:e=>{ab.description=e.target.value;persist();}}),
      reqEditor(sys,ab),
      h('div',{class:'sub-h2'},'Efeitos mecânicos'),
      ...ab.effects.map(ef=>effectRow(sys,ab.effects,ef,0)),
      h('button',{class:'btn ghost sm',onclick:()=>{ab.effects.push(newEffect(sys));render();}},'+ Efeito'),
      h('div',{class:'tags'}, ...reqTags(sys,ab).map(t=>h('span',{class:'tg-req'},'🔒 '+t)), ...ab.effects.map(ef=>h('span',{class:'tg-fx'},effectLabel(sys,ef))))));
  });
  wrap.appendChild(h('button',{class:'btn sm',onclick:()=>{owner.abilities.push({id:uid(),name:'Nova Habilidade',description:'',req:{level:0,attrs:[]},effects:[]});render();}},'+ Habilidade'));
  return wrap;
}
function reqEditor(sys,ab){
  if(!ab.req) ab.req={level:0,attrs:[]};
  return h('div',{class:'req-box'},
    h('div',{class:'lbl'},'REQUISITOS PARA LIBERAR'),
    h('div',{class:'row wrapf',style:{alignItems:'flex-end'}},
      field('Requer nível', h('input',{class:'in',type:'number',style:{width:'90px'},value:ab.req.level||0,onchange:e=>{ab.req.level=parseInt(e.target.value)||0;render();}})),
      h('button',{class:'btn ghost sm',onclick:()=>{ab.req.attrs.push({id:uid(),attrId:(sys.attributes[0]||{}).id,min:1});render();}},'+ Requisito de atributo')),
    ...ab.req.attrs.map(r=>{
      const sel=h('select',{class:'in',style:{maxWidth:'150px'},onchange:e=>{r.attrId=e.target.value;persist();}});
      sys.attributes.forEach(a=>{const o=h('option',{value:a.id},a.name);if(a.id===r.attrId)o.selected=true;sel.appendChild(o);});
      return h('div',{class:'row',style:{marginTop:'6px'}}, sel, h('span',{class:'hint'},'≥'),
        h('input',{class:'in',type:'number',style:{width:'70px'},value:r.min,onchange:e=>{r.min=parseInt(e.target.value)||0;persist();}}),
        h('button',{class:'btn danger sm',onclick:()=>{ab.req.attrs=ab.req.attrs.filter(x=>x.id!==r.id);render();}},'✕'));
    }));
}
function newEffect(sys){ return {id:uid(),kind:'atributo',targetId:(sys.attributes[0]||{}).id||'',value:1,text:'',charType:'tag',mods:[]}; }
/* arr = a lista de efeitos que contém ef (para remover no lugar).
   depth 0 = efeito de topo (oferece "efeito único"); depth 1 = modificação dentro
   de um efeito único (não aninha outro efeito único). */
function effectRow(sys,arr,ef,depth){
  depth=depth||0;
  const kinds=[['atributo','Bônus de Atributo'],['recurso','Bônus de Recurso'],['pericia','Concede Perícia'],
    ['caracteristica','Característica'],['dados','🎲 Modificador de DADOS']];
  if(depth===0) kinds.push(['livre','Efeito único (texto + mods)']);
  const kindSel=h('select',{class:'in',style:{maxWidth:'190px'},onchange:e=>{
    ef.kind=e.target.value;
    if(ef.kind==='atributo')ef.targetId=(sys.attributes[0]||{}).id;
    else if(ef.kind==='recurso')ef.targetId=(sys.resources[0]||{}).id;
    else if(ef.kind==='pericia')ef.targetId=(sys.skills[0]||{}).id;
    else if(ef.kind==='caracteristica'){ if(!ef.charType)ef.charType='tag'; }
    else if(ef.kind==='livre'){ if(!Array.isArray(ef.mods))ef.mods=[]; }
    render();
  }});
  kinds.forEach(([v,l])=>{const o=h('option',{value:v},l);if(v===ef.kind)o.selected=true;kindSel.appendChild(o);});
  const del=h('button',{class:'btn danger sm',onclick:()=>{const i=arr.indexOf(ef);if(i>=0)arr.splice(i,1);render();}},'✕');

  /* CANAL DE DADOS — mexe na QUANTIDADE de dados, não no total (peça 4).
     É o "−1d20" do Ordem: não se converte em número e não some com bônus fixo. */
  if(ef.kind==='dados'){
    const escSel=h('select',{class:'in',style:{maxWidth:'190px'},onchange:e=>{ef.escopo=e.target.value;render();}});
    DICE_ESCOPOS.forEach(([v,l])=>{const o=h('option',{value:v},l);if(v===(ef.escopo||'todos'))o.selected=true;escSel.appendChild(o);});
    return h('div',{},
      h('div',{class:'row wrapf',style:{marginBottom:'4px'}}, kindSel,
        h('input',{class:'in',type:'number',style:{width:'80px'},value:ef.value==null?-1:ef.value,
          title:'Quantidade de dados: −1 tira um dado, +1 acrescenta',
          onchange:e=>{ef.value=parseInt(e.target.value)||0;render();}}),
        h('span',{class:'hint'},'dado(s) em'), escSel, del),
      h('div',{class:'hint',style:{marginBottom:'6px'}},
        'Mexe na quantidade de dados, não no total. Se sobrar 0 dados, a rolagem vira "2 dados, pega o pior".'));
  }

  /* CARACTERÍSTICA — etiqueta (marca) ou numérica (vira variável nas fórmulas) */
  if(ef.kind==='caracteristica'){
    if(!ef.charType) ef.charType='tag';
    const typeSel=h('select',{class:'in',style:{maxWidth:'135px'},onchange:e=>{ef.charType=e.target.value;render();}});
    [['tag','🏷 Etiqueta'],['num','◆ Numérica']].forEach(([v,l])=>{const o=h('option',{value:v},l);if(v===ef.charType)o.selected=true;typeSel.appendChild(o);});
    const nameIn=h('input',{class:'in',style:{maxWidth:'190px'},value:ef.text||'',
      placeholder:ef.charType==='num'?'Ex.: Deslocamento':'Ex.: Visão no escuro',
      oninput:e=>{ef.text=e.target.value;persist();},onchange:()=>render()});
    const valIn=ef.charType==='num'?h('input',{class:'in',type:'number',style:{width:'72px'},value:ef.value||0,onchange:e=>{ef.value=parseInt(e.target.value)||0;render();}}):null;
    return h('div',{}, h('div',{class:'row wrapf',style:{marginBottom:'4px'}}, kindSel, typeSel, nameIn, valIn, del),
      ef.charType==='num'?h('div',{class:'hint',style:{marginBottom:'6px'}},'O nome vira variável: "'+((ef.text||'Nome').trim()||'Nome')+'" pode ser usado nas fórmulas do sistema.'):null);
  }

  /* EFEITO ÚNICO — descrição livre + modificações mecânicas anexadas */
  if(ef.kind==='livre'){
    if(!Array.isArray(ef.mods)) ef.mods=[];
    const desc=h('input',{class:'in',style:{flex:'1',minWidth:'200px'},value:ef.text||'',
      placeholder:'Descreva o efeito único (ex.: Fúria do Berserker)',oninput:e=>{ef.text=e.target.value;persist();},onchange:()=>render()});
    const modsBox=h('div',{class:'req-box',style:{marginTop:'6px'}},
      h('div',{class:'lbl'},'MODIFICAÇÕES DESTE EFEITO'),
      ...ef.mods.map(m=>effectRow(sys,ef.mods,m,1)),
      h('button',{class:'btn ghost sm',onclick:()=>{ef.mods.push(newEffect(sys));render();}},'+ Modificação'),
      h('div',{class:'hint',style:{marginTop:'4px'}},'A descrição é livre; as modificações abaixo batem de verdade na ficha (ex.: +Defesa e +Vida ao mesmo tempo).'));
    return h('div',{style:{marginBottom:'8px'}}, h('div',{class:'row wrapf'}, kindSel, desc, del), modsBox);
  }

  /* atributo / recurso / perícia */
  const listp=ef.kind==='atributo'?sys.attributes:ef.kind==='recurso'?sys.resources:sys.skills;
  const targetCtrl=h('select',{class:'in',onchange:e=>{ef.targetId=e.target.value;render();}});
  listp.forEach(it=>{const o=h('option',{value:it.id},it.name);if(it.id===ef.targetId)o.selected=true;targetCtrl.appendChild(o);});
  const valInput=(ef.kind==='atributo'||ef.kind==='recurso')
    ? h('input',{class:'in',type:'number',style:{width:'72px'},value:ef.value,onchange:e=>{ef.value=parseInt(e.target.value)||0;render();}}) : null;
  return h('div',{class:'row wrapf',style:{marginBottom:'6px'}}, kindSel, targetCtrl, valInput, del);
}

function portCard(){
  const importInput=h('input',{type:'file',accept:'.nexus,.json',class:'hide',
    onchange:e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();
      rd.onload=()=>{try{S.system=JSON.parse(rd.result);S.draft=initDraft(S.system);render();}catch{alert('Arquivo .nexus inválido');}};
      rd.readAsText(f);}});
  return card(tit('Portabilidade do Sistema','nexus'),'É aqui que mora a liberdade: leve seu sistema pra qualquer lugar.',null,
    h('div',{class:'row wrapf'},
      h('button',{class:'btn amber',onclick:exportSystem},'⬇ Exportar .nexus'),
      h('button',{class:'btn',onclick:()=>importInput.click()},'⬆ Importar .nexus'), importInput,
      h('button',{class:'btn ghost',onclick:()=>{if(confirm('Restaurar o sistema de exemplo? Isso substitui o atual.')){S.system=defaultSystem();S.draft=initDraft(S.system);render();}}},'↺ Restaurar exemplo')),
    h('div',{class:'hint',style:{marginTop:'12px'}}, `Sistema atual: ${S.system.attributes.length} atributos • ${S.system.resources.length} recursos • ${S.system.skills.length} perícias • ${S.system.classes.length} classes • ${S.system.origins.length} raças.`));
}
function exportSystem(){
  const blob=new Blob([JSON.stringify(S.system,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=(S.system.campaignName||S.system.name||'sistema').replace(/\s+/g,'_')+'.nexus'; a.click();
  URL.revokeObjectURL(url);
}

