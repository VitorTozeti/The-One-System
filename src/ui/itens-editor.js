/* ============================================================ ITENS — EDITOR MASTER-DETAIL ============================================================
   Mesmo jeito de Classes/Perícias: lista à esquerda (busca + categoria), editor à direita em abas:
     📋 Básico   — nome, ícone, categoria, raridade, peso, slot, sintonização
     ⚔ Combate   — ataque estruturado (arma) e armadura que define a fórmula de um recurso
     ✨ Efeitos   — o que o item faz equipado: efeitos prontos, "quando vale" (nível/atributo) e código
     🧪 Uso      — consumível / habilidade ativa: botão "Usar" na ficha, gasta quantidade e mexe num recurso
   Casos especiais viram efeitos comuns: tudo que classe/origem fazem (resistência, voo, rolagem,
   código…) o item também faz — e cada efeito pode ter "⏱ Vale: por nível / se atributo ≥ N".
   Depende de: master-detail.js, classes-origens.js (receitas, _cap/_res/_rol…), master-pieces.js (effectRow). */

/* ---------- biblioteca COM mecânica ----------
   c=categoria  w=peso  e=equipável  ic=ícone  r=raridade  sint=exige sintonia
   atq={dano, alc, atr:[nomes de atributo], crit}   arm={f:'fórmula', rec:[nomes do recurso]}
   efs(sys)=lista de efeitos   uso={rec:[nomes], f:'fórmula', t:'texto', consome} */
const _efRecV=(sys,nomes,v)=>{ const r=_recPor(sys,nomes); return r?{kind:'recurso',targetId:r.id,value:v}:null; };
const CATALOGO_ITENS2=[
  {n:'Espada longa',c:'arma',w:1.5,e:true,ic:'🗡️',d:'Lâmina versátil de uma mão.',atq:{dano:'1d8 + Força',alc:'corpo a corpo',atr:['Força','Físico','Corpo','FOR']}},
  {n:'Adaga',c:'arma',w:0.5,e:true,ic:'🔪',d:'Pequena, rápida e fácil de esconder.',atq:{dano:'1d4 + Destreza',alc:'corpo a corpo',atr:['Destreza','Agilidade','DES','AGI'],crit:19}},
  {n:'Arco curto',c:'arma',w:1,e:true,ic:'🏹',d:'Leve, para disparos rápidos.',atq:{dano:'1d6 + Destreza',alc:'24 m',atr:['Destreza','Agilidade','DES','AGI']}},
  {n:'Cajado',c:'arma',w:2,e:true,ic:'🪄',d:'Foco de magia e apoio de viagem.',atq:{dano:'1d6',alc:'corpo a corpo',atr:['Força','Mente','Intelecto']}},
  {n:'Armadura de couro',c:'armadura',w:5,e:true,ic:'🦺',d:'Proteção leve.',arm:{f:'11 + Destreza',rec:['Defesa','CA','Armadura','Classe de Armadura']}},
  {n:'Cota de malha',c:'armadura',w:10,e:true,ic:'⛓️',d:'Proteção média, barulhenta.',arm:{f:'16',rec:['Defesa','CA','Armadura','Classe de Armadura']}},
  {n:'Escudo',c:'armadura',w:3,e:true,ic:'🛡️',d:'Desvia golpes.',efs:s=>[{kind:'rolagem',escopo:'defesa',value:2}]},
  {n:'Espada flamejante',c:'arma',w:1.5,e:true,ic:'🔥',r:'epico',d:'Cresce com o portador: mais dano a cada marco de nível e resistência a fogo.',
   atq:{dano:'1d8 + Força',alc:'corpo a corpo',atr:['Força','Físico','Corpo','FOR']},
   efs:s=>[{kind:'rolagem',escopo:'dano',value:1,quando:{tipo:'nivel',n:5,m:0}},{kind:'rolagem',escopo:'dano',value:1,quando:{tipo:'nivel',n:10,m:0}},{kind:'resistencia',text:'Fogo',modo:'reduz',value:3}]},
  {n:'Botas aladas',c:'acessorio',w:0.5,e:true,ic:'🪽',r:'raro',sint:true,d:'Quem as calça voa.',efs:s=>[{kind:'capacidade',text:'Voo',value:9}]},
  {n:'Anel contra o fogo',c:'acessorio',w:0.1,e:true,ic:'💍',r:'raro',d:'Chamas pouco machucam.',efs:s=>[{kind:'resistencia',text:'Fogo',modo:'metade',value:0}]},
  {n:'Amuleto da vida',c:'acessorio',w:0.1,e:true,ic:'📿',r:'incomum',d:'Mais fôlego para aguentar a luta.',efs:s=>[_efRecV(s,['Vida','PV','HP','Pontos de Vida'],10)]},
  {n:'Manto do ladino',c:'acessorio',w:0.5,e:true,ic:'🧥',r:'incomum',d:'Ajuda em tudo que exige jeito.',efs:s=>[{kind:'dados',escopo:'pericia',value:1}]},
  {n:'Capacete de visão noturna',c:'acessorio',w:1,e:true,ic:'🪖',r:'incomum',d:'Lentes que enxergam no escuro.',efs:s=>[{kind:'capacidade',text:'Visão no escuro',value:18}]},
  {n:'Medalhão do berserker',c:'acessorio',w:0.2,e:true,ic:'🪙',r:'raro',sint:true,d:'+1 de dano a cada 3 níveis, escrito em código.',
   efs:s=>[{kind:'codigo',text:'Medalhão do berserker',code:"// +1 de dano a cada 3 níveis do portador\nfx.rolagem('dano', Math.floor(fx.nivel / 3));\nfx.nota('Medalhão: +' + Math.floor(fx.nivel / 3) + ' de dano.');"}]},
  {n:'Poção de cura',c:'consumivel',w:0.2,e:false,ic:'🧪',d:'Restaura ferimentos ao beber.',emp:true,uso:{rec:['Vida','PV','HP','Pontos de Vida'],f:'2d4 + 2',t:'Bebe e sente os ferimentos fecharem.',consome:true}},
  {n:'Poção de mana',c:'consumivel',w:0.2,e:false,ic:'🔷',d:'Devolve energia mágica.',emp:true,uso:{rec:['Mana','PM','Energia','PE','Pontos de Mana'],f:'2d4 + 2',t:'Um frio azul percorre o corpo.',consome:true}},
  {n:'Antídoto',c:'consumivel',w:0.1,e:false,ic:'💧',d:'Anula o veneno que estiver no corpo.',emp:true,uso:{rec:[],f:'',t:'Remove a condição Envenenado (aplique na aba de condições da ficha).',consome:true}},
  {n:'Mochila',c:'ferramenta',w:1,e:false,ic:'🎒',d:'Carrega o equipamento da aventura.'},
  {n:'Corda (15 m)',c:'ferramenta',w:2.5,e:false,ic:'🪢',d:'Útil para escalar e amarrar.'},
  {n:'Tocha',c:'ferramenta',w:0.5,e:false,ic:'🔦',d:'Ilumina por algumas horas.',emp:true},
  {n:'Ração de viagem',c:'consumivel',w:0.5,e:false,ic:'🍖',d:'Comida para um dia.',emp:true,uso:{rec:['Estamina','Vigor','Energia'],f:'3',t:'Uma boa refeição.',consome:true}},
];
function novoItemDe(sys,p){
  const it={id:uid(),name:p.n,description:p.d||'',categoria:p.c||'outro',weight:p.w||0,equipavel:!!p.e,effects:[],icon:p.ic||'',raridade:p.r||'comum',
    empilhavel:!!p.emp,sintonia:!!p.sint};
  if(p.atq){ it.attack={on:true,attrId:'',skillId:'',dano:p.atq.dano||'1d6',alcance:p.atq.alc||'',critRange:p.atq.crit||20,critMult:2,tags:[]};
    for(const n of (p.atq.atr||[])){ const a=_acha(sys.attributes,n); if(a){ it.attack.attrId=a.id; break; } } }
  if(p.arm){ const r=_recPor(sys,p.arm.rec||[]); if(r) it.armor={on:true,resId:r.id,formula:p.arm.f,maxAttrId:'',maxAttrVal:0}; }
  if(p.efs) it.effects=p.efs(sys).filter(Boolean).map(_ef);
  if(p.uso){ const r=_recPor(sys,p.uso.rec||[]); it.uso={on:true,resId:r?r.id:'',formula:r?p.uso.f:'',consome:p.uso.consome!==false,texto:p.uso.t||''}; }
  return sanitizarItem(it);
}
/* garante a forma completa do item (a migração faz o mesmo ao carregar) */
function sanitizarItem(it){
  const base={attack:{on:false,attrId:'',skillId:'',dano:'1d6',alcance:'',critRange:20,critMult:2,tags:[]},
    armor:{on:false,resId:'',formula:'',maxAttrId:'',maxAttrVal:0},uso:{on:false,resId:'',formula:'',consome:true,texto:''}};
  Object.keys(base).forEach(k=>{ it[k]=Object.assign({},base[k],it[k]||{}); });
  if(!it.raridade) it.raridade='comum'; if(typeof it.icon!=='string') it.icon='';
  if(typeof it.slotId!=='string') it.slotId=''; if(typeof it.empilhavel!=='boolean') it.empilhavel=false; if(typeof it.sintonia!=='boolean') it.sintonia=false;
  return it;
}
const ICONE_CAT={arma:'⚔️',armadura:'🛡️',acessorio:'💍',ferramenta:'🔧',consumivel:'🧪',outro:'📦'};
function iconeDoItem(it){ return it.icon||ICONE_CAT[it.categoria]||'📦'; }

/* ---------- usar um item (consumível / habilidade ativa) ---------- */
function usoResumo(sys,it){
  const us=it.uso||{}; const r=(sys.resources||[]).find(x=>x.id===us.resId);
  const p=[]; if(r&&(us.formula||'').trim()) p.push(r.name+' '+(/^\s*-/.test(us.formula)?'':'+')+us.formula.trim());
  if(us.consome) p.push('gasta 1'); if(us.texto) p.push(us.texto);
  return p.join(' · ')||'Usar o item';
}
function usarItem(sys,d,ctx,entry,it){
  const us=it.uso||{}; let msg=us.texto||('Usou '+it.name);
  if(us.resId&&(us.formula||'').trim()){
    const r=ctx.allRes.find(x=>x.id===us.resId);
    if(r){
      const rl=rollExpr(us.formula,ctx.varsTotal); const v=rl.erro?NaN:rl.total;
      if(Number.isNaN(v)) msg='A fórmula de uso de “'+it.name+'” está inválida — avise o Mestre.';
      else{
        const teto=Number.isNaN(r.max)?Infinity:r.max;
        const novo=Math.max(0,Math.min(teto,r.cur+v));
        d.resCurrent[r.id]=novo; msg=it.name+': '+r.name+' '+sign(v)+' ('+r.cur+' → '+novo+')';
      }
    }
  }
  if(us.consome){
    const q=entry.qtd||1;
    if(q>1) entry.qtd=q-1; else { const i=d.inventory.indexOf(entry); if(i>=0) d.inventory.splice(i,1); }
  }
  render(); showToast(msg);
}

/* ---------- a aba ---------- */
const ITEM_ABAS=[['basico','📋 Básico'],['combate','⚔ Combate'],['efeitos','✨ Efeitos'],['uso','🧪 Uso']];
function tabItens(sys){
  if(!Array.isArray(sys.items)) sys.items=[];
  sys.items.forEach(sanitizarItem);
  const bib=bibliotecaGenerica('📚 Itens prontos (armas com ataque, armaduras, itens mágicos e poções já montados)',
    CATALOGO_ITENS2.map(p=>({...p,d:p.d})), p=>_tem(sys.items,p.n), p=>{ const it=novoItemDe(sys,p); sys.items.push(it); S.ui.itemSel=it.id; });
  const cat=S.ui.itemCat||'';
  const filtros=h('div',{class:'row wrapf',style:{gap:'4px'}},
    h('button',{type:'button',class:'chip'+(!cat?' on':''),onclick:()=>{S.ui.itemCat='';render();}},'Todos'),
    ...ITEM_CATS.map(([v,l])=>h('button',{type:'button',class:'chip'+(cat===v?' on':''),onclick:()=>{S.ui.itemCat=cat===v?'':v;render();}},l)));
  return h('div',{},
    mdLayout({
      titulo:'Itens & Equipamento',
      dica:'Armas, armaduras, acessórios e consumíveis. Equipados, aplicam seus efeitos; consumíveis ganham o botão 🧪 Usar. Todo efeito de classe e origem também funciona aqui.',
      biblioteca:h('div',{},
        field('Fórmula da Carga Máxima (opcional)',campoFormula(sys,sys,'cargaFormula',{tipo:'carga',placeholder:'Ex.: Força * 5 — vazio = sem limite de carga',aoMudar:()=>render()}),'carga'),
        bib),
      lista:sys.items, selKey:'itemSel', filtros,
      filtrar:it=>!cat||it.categoria===cat,
      texto:it=>it.name+' '+itemCatLabel(it.categoria)+' '+raridadeInfo(it.raridade)[1]+' '+(it.description||''),
      phCriar:'+ Novo item: digite o nome e Enter',
      aoCriar:v=>{ if(_tem(sys.items,v)){ showToast('Já existe um item com esse nome.'); return null; }
        const it=sanitizarItem({id:uid(),name:v,description:'',categoria:cat||'outro',weight:0,equipavel:true,effects:[]}); sys.items.push(it); S.ui.itemAba='basico'; return it; },
      vazioTitulo:'Nenhum item ainda', vazioDica:'Use a biblioteca acima (já vem com mecânica) ou digite um nome.',
      cartao:(it,sel)=>mdCartao({sel,cor:raridadeInfo(it.raridade)[2],icone:iconeDoItem(it),nome:it.name,onclick:()=>{S.ui.itemSel=it.id;render();},
        sub:[itemCatLabel(it.categoria).replace(/^\S+\s/,''),(it.weight||0)+' peso',it.effects.length?(it.effects.length+' efeito(s)'):null,(it.uso&&it.uso.on)?'usável':null].filter(Boolean).join(' · ')}),
      editor:it=>itemEditor(sys,it)}),
    slotsCard(sys));
}
function itemEditor(sys,it){
  const cor=raridadeInfo(it.raridade)[2];
  const aba=(ITEM_ABAS.some(a=>a[0]===S.ui.itemAba)?S.ui.itemAba:'basico');
  const efs=it.effects.map(ef=>effectLabel(sys,ef)).filter(Boolean);
  const cab=mdCab({cor,icone:iconeDoItem(it),onIcone:v=>{it.icon=v;},nome:it.name,onNome:v=>{it.name=v;},phNome:'Nome do item',
    sub:h('div',{class:'hab-res',style:{padding:'0'}},
      h('span',{class:'tg-fx',style:{borderColor:cor,color:cor}},raridadeInfo(it.raridade)[1]),
      it.attack.on?h('span',{class:'tg-fx'},'⚔ '+(it.attack.dano||'?')):null,
      it.armor.on?h('span',{class:'tg-fx'},'🛡 '+(it.armor.formula||'?')):null,
      ...efs.slice(0,6).map(t=>h('span',{class:'tg-fx'},t)),
      efs.length>6?h('span',{class:'hint'},'+'+(efs.length-6)+'…'):null),
    botoes:mdBotoes(sys.items,it,'item',
      ()=>{ const c=clonarComIds(it); c.name=it.name+' (cópia)'; sys.items.splice(sys.items.indexOf(it)+1,0,c); S.ui.itemSel=c.id; render(); },
      ()=>comDesfazer('Item “'+(it.name||'sem nome')+'” excluído',()=>{ sys.items.splice(sys.items.indexOf(it),1); }))});
  const tabs=mdAbas(ITEM_ABAS,'itemAba',k=>{ const n={efeitos:it.effects.length,combate:(it.attack.on?1:0)+(it.armor.on?1:0),uso:it.uso.on?1:0}[k]; return n?h('span',{class:'tab-n'},n):null; });
  let corpo;
  if(aba==='basico') corpo=itemBasico(sys,it);
  else if(aba==='combate') corpo=h('div',{},
    h('div',{class:'hint',style:{marginBottom:'8px'}},'Arma → gera um ataque na ficha (rolagem + dano + crítico). Armadura → define a fórmula de um recurso (Defesa) enquanto estiver equipada.'),
    itemAtaqueBox(sys,it), itemArmaduraBox(sys,it));
  else if(aba==='efeitos') corpo=itemEfeitos(sys,it);
  else corpo=itemUso(sys,it);
  const vazio=!it.attack.on&&!it.armor.on&&!it.uso.on&&!it.effects.length;
  return h('section',{class:'arq-edit'},cab,vazio?itemInicioRapido(sys,it):null,tabs,h('div',{class:'arq-corpo'},corpo));
}
/* item novinho, sem nada: um clique transforma em arma, armadura, poção, acessório mágico… (depois é só ajustar) */
function itemInicioRapido(sys,it){
  const atr=(sys.attributes||[])[0]||null;
  const aplica=(cfg,aba)=>()=>{ cfg(); S.ui.itemAba=aba; render(); };
  const opts=[
    ['⚔️','Arma','Ataque com rolagem, dano e crítico na ficha',aplica(()=>{ it.categoria='arma'; it.equipavel=true; if(!it.icon) it.icon='🗡️';
      Object.assign(it.attack,{on:true,attrId:atr?atr.id:'',dano:'1d6'+(atr?(' + '+atr.name):''),alcance:'corpo a corpo'}); },'combate')],
    ['🛡️','Armadura','Define a Defesa enquanto equipada',aplica(()=>{ it.categoria='armadura'; it.equipavel=true; if(!it.icon) it.icon='🦺';
      const r=_recPor(sys,_DEF_NOMES); if(r) Object.assign(it.armor,{on:true,resId:r.id,formula:'11'+(atr?(' + '+atr.name):'')}); },'combate')],
    ['🧪','Poção / consumível','Botão Usar: cura ou restaura um recurso',aplica(()=>{ it.categoria='consumivel'; it.equipavel=false; it.empilhavel=true; if(!it.icon) it.icon='🧪';
      const r=_recPor(sys,_V); Object.assign(it.uso,{on:true,resId:r?r.id:'',formula:r?'2d4 + 2':'',consome:true,texto:'Bebe e sente os ferimentos fecharem.'}); },'uso')],
    ['💍','Acessório mágico','Dá bônus enquanto equipado (você escolhe quais)',aplica(()=>{ it.categoria='acessorio'; it.equipavel=true; it.raridade='raro'; if(!it.icon) it.icon='💍';
      it.effects.push(newEffect(sys)); },'efeitos')],
    ['⚡','Com recurso especial','Cria uma barra nova (cargas…) enquanto equipado',aplica(()=>{ it.categoria='acessorio'; it.equipavel=true; if(!it.icon) it.icon='🪄';
      it.effects.push(_ef({kind:'recursoNovo',text:'Cargas',value:3,icon:'⚡',recarga:'longo',color:'#f59e0b'})); },'efeitos')],
    ['⌨️','Efeito por código','Regras fora do comum, com ajuda para montar',aplica(()=>{ it.equipavel=true; it.effects.push(_ef({kind:'codigo',text:it.name||'Efeito',code:CODIGO_EXEMPLO})); },'efeitos')],
  ];
  return h('div',{class:'item-inicio'},
    h('div',{class:'ii-t'},'Começar rápido — que tipo de item é?'),
    h('div',{class:'ii-g'},...opts.map(([ic,t,d,fn])=>h('button',{type:'button',class:'ii-b',onclick:fn},
      h('span',{class:'ii-ic','data-noicon':''},ic),h('span',{class:'ii-tx'},h('b',{},t),h('small',{},d))))));
}
function itemBasico(sys,it){
  const catSel=h('select',{class:'in',onchange:e=>{it.categoria=e.target.value;render();}});
  ITEM_CATS.forEach(([v,l])=>{const o=h('option',{value:v},l);if(v===it.categoria)o.selected=true;catSel.appendChild(o);});
  const rarSel=h('select',{class:'in',onchange:e=>{it.raridade=e.target.value;render();}});
  RARIDADES.forEach(([v,l])=>{const o=h('option',{value:v},l);if(v===it.raridade)o.selected=true;rarSel.appendChild(o);});
  return h('div',{},
    h('div',{class:'grid g3'},
      field('Categoria',catSel), field('Raridade (cor do cartão)',rarSel),
      field('Peso',h('input',{class:'in',type:'number',step:'0.1',min:'0',value:it.weight||0,onchange:e=>{it.weight=Math.max(0,parseFloat(e.target.value)||0);render();}}))),
    h('div',{style:{marginTop:'10px'}},field('Descrição (aparece na ficha do jogador)',h('textarea',{class:'in',rows:'3',value:it.description||'',oninput:e=>{it.description=e.target.value;persist();}}))),
    h('div',{class:'row wrapf',style:{marginTop:'10px'}},
      h('button',{class:'btn sm '+(it.equipavel?'emerald':'ghost'),type:'button',onclick:()=>{it.equipavel=!it.equipavel;render();}},(it.equipavel?'✓ ':'')+'Equipável'),
      h('span',{class:'hint'},it.equipavel?'Os efeitos entram na ficha só enquanto o item estiver equipado.':'Não equipável (carregado/consumível): os efeitos NÃO entram sozinhos — use a aba 🧪 Uso para o que acontece ao usar.')),
    itemSlotBox(sys,it));
}
function itemEfeitos(sys,it){
  return h('div',{},
    h('div',{class:'hint',style:{marginBottom:'8px'}},'Casos especiais: escolha um ✨ efeito pronto ou monte o seu. Em cada efeito, “⏱ Vale” deixa ele depender do nível do portador (a espada que cresce) ou de um atributo. ⌨ Código cobre qualquer regra fora do comum.'),
    it.effects.length?null:h('div',{class:'vazio'},h('div',{class:'vazio-t'},'Sem efeitos'),h('div',{class:'hint'},'O item vale só como texto/ataque/armadura. Adicione um efeito para ele mexer na ficha.')),
    ...it.effects.map(ef=>effectRow(sys,it.effects,ef,0)),
    h('div',{class:'row wrapf',style:{marginTop:'6px'}},
      h('button',{class:'btn sm',type:'button',onclick:()=>{it.effects.push(newEffect(sys));render();}},'+ Efeito'),
      receitaSelect(sys,it.effects)),
    it.equipavel?null:h('div',{class:'aviso-aba',style:{marginTop:'10px'}},'Este item não é equipável: os efeitos acima não entram na ficha. Marque “Equipável” na aba Básico.'));
}
/* média da fórmula de uso (dados + atributos no máximo, no degrau final) — também valida */
function usoMedia(sys,us){
  if(!String(us.formula||'').trim()) return 'Sem fórmula: o item só mostra o texto ao ser usado.';
  const v=mediaExpr(us.formula,varsNoDegrau(sys,Math.max(1,sys.maxLevel||1)));
  return Number.isNaN(v)?'⚠ fórmula inválida (ex.: 2d4 + 2, 5, Nível * 2).':('Média ≈ '+(Math.round(v*10)/10)+' no '+levelLabel(sys,Math.max(1,sys.maxLevel||1))+'.');
}
function itemUso(sys,it){
  const us=it.uso;
  const resSel=h('select',{class:'in',style:{maxWidth:'220px'},onchange:e=>{us.resId=e.target.value;render();}});
  resSel.appendChild(h('option',{value:''},'— nenhum (só texto) —'));
  (sys.resources||[]).filter(r=>(r.type||'barra')!=='valor').forEach(r=>{const o=h('option',{value:r.id},r.name);if(r.id===us.resId)o.selected=true;resSel.appendChild(o);});
  return h('div',{},
    h('div',{class:'row wrapf'},
      h('button',{class:'btn sm '+(us.on?'emerald':'ghost'),type:'button',onclick:()=>{us.on=!us.on;render();}},(us.on?'✓ ':'')+'🧪 Pode ser usado'),
      h('span',{class:'hint'},'O jogador ganha o botão “Usar” no inventário.')),
    us.on?h('div',{style:{marginTop:'12px'}},
      h('div',{class:'grid g2'},
        field('Mexe em qual recurso',resSel),
        field('Quanto (aceita dados; negativo = tira)',h('input',{class:'in mono',value:us.formula||'',placeholder:'2d4 + 2   ou   Nível * 2',spellcheck:'false',
          oninput:e=>{us.formula=e.target.value;persist();},onchange:()=>render()}))),
      h('div',{class:'hint',style:{marginTop:'4px'}},usoMedia(sys,us)),
      h('div',{class:'row wrapf',style:{marginTop:'10px'}},
        h('button',{class:'btn sm '+(us.consome?'emerald':'ghost'),type:'button',onclick:()=>{us.consome=!us.consome;render();}},(us.consome?'✓ ':'')+'Gasta 1 unidade ao usar'),
        !it.empilhavel&&us.consome?h('span',{class:'hint'},'Dica: marque “Empilhável” (aba Básico) para o jogador guardar várias.'):null),
      h('div',{style:{marginTop:'10px'}},field('Texto ao usar (opcional)',h('input',{class:'in',value:us.texto||'',placeholder:'Ex.: Bebe e sente os ferimentos fecharem.',oninput:e=>{us.texto=e.target.value;persist();}}))),
      h('div',{class:'hint',style:{marginTop:'10px'}},'Resumo: '+usoResumo(sys,it)))
    :h('div',{class:'hint',style:{marginTop:'10px'}},'Ligue para poções, pergaminhos, rações, kits de cura… Quem usa vê o recurso mudar na hora.'));
}
