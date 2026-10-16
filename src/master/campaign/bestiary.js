/* ============================================================ CAMPANHA — BESTIÁRIO ============================================================
   Inimigos (statblocks) e NPCs. Reaproveita readPhoto (imagem) e rollExpr
   (rolar ataques). Subseção controlada por S.ui.bestSub ('inimigos'|'npcs'). */

function bestiarioView(){
  const sub=S.ui.bestSub||'inimigos';
  const nav=h('div',{class:'toggle', style:{marginBottom:'14px'}},
    h('button',{class:sub==='inimigos'?'on-m':'', onclick:()=>{S.ui.bestSub='inimigos';render();}},'🐉 Inimigos'),
    h('button',{class:sub==='npcs'?'on-j':'', onclick:()=>{S.ui.bestSub='npcs';render();}},'🎭 NPCs'));
  return h('div',{}, nav, sub==='npcs'?npcsInner():inimigosInner());
}

/* ---------- Inimigos (statblocks) ---------- */
/* Modelos de força: o inimigo já nasce com atributos, PV e ataque coerentes com o sistema do Mestre. */
const MODELOS_INIMIGO=[
  {k:'lacaio',  n:'Lacaio',  ic:'🐀', f:.15, dano:'1d4',  d:'Fraco, vem em bando.'},
  {k:'soldado', n:'Soldado', ic:'🗡️', f:.4,  dano:'1d6',  d:'Combatente comum.'},
  {k:'elite',   n:'Elite',   ic:'🛡️', f:.65, dano:'2d6',  d:'Ameaça séria para o grupo todo.'},
  {k:'chefe',   n:'Chefe',   ic:'👹', f:.9,  dano:'3d8',  d:'Desafio da cena.'},
];
function novoInimigoModelo(sys,m){
  const sb=newStatblock(sys);
  if(m){
    const base=sys.startAttrValue||0, topo=Math.max(base,sys.attrMax||base);
    (sys.attributes||[]).forEach(a=>{ sb.attrs[a.id]=Math.round(base+(topo-base)*m.f); });
    sb.name=m.n; sb.ataques=[Object.assign(newAttack(),{nome:'Ataque',dano:m.dano})];
    sb.tags=[m.k];
    const rV=(sys.resources||[]).find(r=>/vida|hp|^pv|sa[uú]de/i.test(r.name));
    if(rV){ const v={'Nível':sys.startLevel||1,'Nivel':sys.startLevel||1}; (sys.attributes||[]).forEach(a=>{ v[a.name]=effAttr(sys,sb.attrs[a.id]); });
      const n=evalFormula(rV.formula,v); if(!Number.isNaN(n)&&n>0) sb.hp=sb.hpMax=Math.round(n); }
  }
  return sb;
}
function inimigosInner(){
  const c=S.campaign, sys=S.system, lista=c.bestiary.enemies, ui=cmp();
  const q=semAcento(String(ui.bestQ||'').trim()), tagF=ui.bestTag||'';
  const todasTags=[...new Set(lista.flatMap(s=>s.tags||[]))].sort();
  const vis=lista.filter(sb=>(!q||semAcento(sb.name+' '+(sb.tags||[]).join(' ')+' '+(sb.notes||'')).includes(q))&&(!tagF||(sb.tags||[]).includes(tagF)));
  const cards=vis.map(sb=>statblockCard(sys, sb));
  const novo=m=>{ const sb=novoInimigoModelo(sys,m); lista.push(sb); ui.bestAberto=ui.bestAberto||{}; ui.bestAberto[sb.id]=true; render(); focarElemento('bx-'+sb.id); };
  const barra=h('div',{class:'row wrapf best-bar'},
    h('input',{class:'in',type:'search',style:{flex:'1',minWidth:'160px'},placeholder:'🔎 Buscar por nome, tag ou nota…','aria-label':'Buscar inimigos',value:ui.bestQ||'',
      oninput:e=>{ ui.bestQ=e.target.value; render(); }}),
    lista.length>1?h('button',{class:'btn sm ghost',type:'button',title:'Recolhe todos os cartões',onclick:()=>{ ui.bestAberto={}; render(); }},'▾ Recolher tudo'):null,
    lista.length>1?h('button',{class:'btn sm ghost',type:'button',title:'Abre todos os cartões',onclick:()=>{ ui.bestAberto={}; lista.forEach(s=>{ ui.bestAberto[s.id]=true; }); render(); }},'▴ Abrir tudo'):null);
  const tagsBar=todasTags.length?h('div',{class:'row wrapf',style:{margin:'8px 0'}},
    h('span',{class:'hint'},'Tags:'),
    ...todasTags.map(t=>h('button',{type:'button',class:'chip'+(tagF===t?' on':''),'aria-pressed':tagF===t?'true':'false',onclick:()=>{ ui.bestTag=(tagF===t?'':t); render(); }},ck(tagF===t),t)),
    tagF?h('button',{type:'button',class:'btn mini ghost',onclick:()=>{ ui.bestTag=''; render(); }},'limpar filtro'):null):null;
  const modelos=h('div',{class:'row wrapf',style:{marginTop:'8px'}},
    h('span',{class:'hint'},'Criar já na medida do seu sistema:'),
    ...MODELOS_INIMIGO.map(m=>h('button',{class:'chip',type:'button',title:m.d+' Atributos escalam entre o valor inicial e o máximo do sistema; PV pela fórmula.',onclick:()=>novo(m)},m.ic+' '+m.n)));
  return h('div',{},
    card('Inimigos',lista.length+' criatura(s). Atributos, PV, recursos do sistema e ataques roláveis.',
      h('button',{class:'btn primary', onclick:()=>novo(null)},'+ Novo inimigo'), modelos),
    lista.length?h('div',{},barra,tagsBar):null,
    lista.length?(vis.length?h('div',{class:'best-grid'}, cards):h('div',{class:'pj-empty'},'Nenhum inimigo bate com a busca/filtro.')):h('div',{class:'pj-empty'},'Nenhum inimigo ainda. Use um modelo acima para começar já com números coerentes.'));
}
/* leva a tela até um elemento recém-criado e dá um destaque */
function focarElemento(id){
  requestAnimationFrame(()=>{ const el=document.getElementById(id); if(!el) return;
    el.scrollIntoView({behavior:'smooth',block:'center'}); el.classList.add('mpane-flash'); setTimeout(()=>el.classList.remove('mpane-flash'),1400); });
}
function statblockCard(sys, sb){
  const ui=cmp(); ui.bestAberto=ui.bestAberto||{};
  const aberto=!!ui.bestAberto[sb.id];
  const excluir=()=>{ const lista=S.campaign.bestiary.enemies, pos=lista.indexOf(sb);
    S.campaign.bestiary.enemies=lista.filter(x=>x.id!==sb.id); render();
    uiToastUndo('“'+sb.name+'” excluído',()=>{ if(!S.campaign.bestiary.enemies.some(x=>x.id===sb.id)){ S.campaign.bestiary.enemies.splice(Math.min(pos,S.campaign.bestiary.enemies.length),0,sb); render(); } },8000); };
  const aoCombate=()=>{ cbAddGrupo(sb.id,1,false); irMtab('combate'); };
  const botoes=[
    h('button',{class:'btn ghost sm', title:'Entra no combate (mais um '+sb.name+')', onclick:aoCombate},'⚔️'),
    h('button',{class:'btn ghost sm', title:'Duplicar', onclick:()=>{const cp=JSON.parse(JSON.stringify(sb));cp.id=uid();cp.name=sb.name+' (cópia)';S.campaign.bestiary.enemies.push(cp);ui.bestAberto[cp.id]=true;render();focarElemento('bx-'+cp.id);}},'⧉'),
    h('button',{class:'btn ghost sm', title:'Excluir (dá para desfazer)', onclick:excluir},'✕')];
  /* recolhido: só o resumo (cabe muito mais criaturas na tela) */
  if(!aberto){
    const rv=(S.system.resources||[]).find(r=>/vida|hp|^pv|sa[uú]de/i.test(r.name));
    return h('div',{class:'best-card best-min', id:'bx-'+sb.id},
      h('div',{class:'row wrapf', style:{alignItems:'center'}}, imgBtn(sb),
        h('div',{style:{flex:'1',minWidth:'120px'}},
          h('div',{style:{fontWeight:'700'}},sb.name),
          h('div',{class:'hint'},(rv?rv.name:'PV')+' '+sb.hpMax+(sb.defesa?(' · Defesa '+sb.defesa):'')+' · '+(sb.ataques.length)+' ataque(s)'+((sb.tags||[]).length?(' · '+sb.tags.join(', ')):''))),
        ...(sb.ataques[0]?[h('button',{class:'btn sm primary',title:'Rola '+sb.ataques[0].nome+' (acerto e dano)',onclick:()=>rolarAtaque(sb,sb.ataques[0])},'🎲 '+sb.ataques[0].nome)]:[]),
        ...botoes,
        h('button',{class:'btn ghost sm', title:'Abrir para editar', onclick:()=>{ ui.bestAberto[sb.id]=true; render(); }},'▾')));
  }
  const head=h('div',{class:'row wrapf', style:{alignItems:'center'}},
    imgBtn(sb),
    h('input',{class:'in', style:{flex:'1',minWidth:'140px',fontWeight:'700'}, value:sb.name, onchange:e=>{sb.name=e.target.value;render();}}),
    ...botoes,
    h('button',{class:'btn ghost sm', title:'Recolher', onclick:()=>{ ui.bestAberto[sb.id]=false; render(); }},'▴'));

  const vida=h('div',{class:'row wrapf'},
    field('HP', h('input',{class:'in', type:'number', style:{width:'80px'}, value:sb.hp, onchange:e=>{sb.hp=parseInt(e.target.value)||0;render();}})),
    field('HP máx', h('input',{class:'in', type:'number', style:{width:'80px'}, value:sb.hpMax, onchange:e=>{sb.hpMax=parseInt(e.target.value)||0;render();}})),
    field('Defesa', h('input',{class:'in', style:{width:'110px'}, value:sb.defesa, onchange:e=>{sb.defesa=e.target.value;render();}})));

  const attrs=(sys.attributes||[]).length?h('div',{class:'best-attrs'}, (sys.attributes||[]).map(a=>
    field(a.name, h('input',{class:'in', type:'number', style:{width:'62px'}, value:sb.attrs[a.id]!=null?sb.attrs[a.id]:0,
      onchange:e=>{sb.attrs[a.id]=parseInt(e.target.value)||0;render();}})))):null;

  /* Recursos do SISTEMA (Mana, Sanidade, Marca…) além da Vida: máximo pela fórmula, com os atributos deste inimigo,
     ou o valor que o Mestre digitar aqui. O combate usa estes números. */
  const vVars=()=>{ const v={'Nível':sys.startLevel||1,'Nivel':sys.startLevel||1}; v[sys.levelName||'Nível']=sys.startLevel||1;
    (sys.attributes||[]).forEach(a=>{ const raw=sb.attrs[a.id]; v[a.name]=effAttr(sys,raw!=null?raw:sys.startAttrValue); });
    (sys.resources||[]).forEach(r=>{ const n=evalFormula(r.formula,v); if(!Number.isNaN(n)) v[r.name]=n; }); return v; };
  const rVida=(sys.resources||[]).find(r=>/vida|hp|^pv|sa[uú]de/i.test(r.name));
  const outros=(sys.resources||[]).filter(r=>(r.type||'barra')!=='valor'&&r!==rVida);
  sb.recs=sb.recs||{};
  const calcVida=rVida?h('button',{class:'btn sm ghost',type:'button',title:'Calcula os PV pela fórmula de “'+rVida.name+'” do sistema usando os atributos deste inimigo',
    onclick:()=>{ const n=evalFormula(rVida.formula,vVars()); if(Number.isNaN(n)||n<=0) return showToast('Não deu para calcular a fórmula de '+rVida.name+'.');
      sb.hp=sb.hpMax=Math.round(n); render(); showToast('PV = '+Math.round(n)+' (fórmula de '+rVida.name+')'); }},'ƒ PV pelo sistema'):null;
  const recursos=outros.length?h('div',{},
    h('div',{class:'hint',style:{margin:'8px 0 2px'}},'Outros recursos do sistema (vazio = calculado pela fórmula):'),
    h('div',{class:'best-res'},...outros.map(r=>{ const calc=evalFormula(r.formula,vVars());
      return field((r.icon?r.icon+' ':'')+r.name,h('input',{class:'in',type:'number',min:'0',value:sb.recs[r.id]!=null?sb.recs[r.id]:'',placeholder:Number.isNaN(calc)?'—':String(Math.round(calc)),
        onchange:e=>{ const t=e.target.value; if(t==='') delete sb.recs[r.id]; else sb.recs[r.id]=Math.max(0,parseInt(t)||0); render(); }})); }))):null;

  const ataques=h('div',{},
    h('div',{class:'row', style:{justifyContent:'space-between',margin:'6px 0'}},
      h('strong',{},'Ataques'),
      h('button',{class:'btn sm', onclick:()=>{sb.ataques.push(newAttack());render();}},'+ Ataque')),
    sb.ataques.map(at=>h('div',{class:'atk-row'},
      h('input',{class:'in', style:{flex:'1',minWidth:'90px'}, value:at.nome, onchange:e=>{at.nome=e.target.value;render();}}),
      h('input',{class:'in', style:{width:'92px'}, title:'acerto', value:at.acerto, onchange:e=>{at.acerto=e.target.value;render();}}),
      h('input',{class:'in', style:{width:'92px'}, title:'dano', value:at.dano, onchange:e=>{at.dano=e.target.value;render();}}),
      h('button',{class:'btn sm primary', title:'Rolar acerto e dano', onclick:()=>rolarAtaque(sb, at)},'🎲'),
      h('button',{class:'btn mini ghost', onclick:()=>{sb.ataques=sb.ataques.filter(x=>x.id!==at.id);render();}},'✕'))));

  const meta=h('div',{class:'row wrapf'},
    field('Tags', h('input',{class:'in', style:{flex:'1'}, value:(sb.tags||[]).join(', '), placeholder:'voador, morto-vivo…',
      onchange:e=>{sb.tags=e.target.value.split(',').map(s=>s.trim()).filter(Boolean);render();}})),
    field('Condições', h('input',{class:'in', style:{flex:'1'}, value:(sb.conds||[]).join(', '),
      onchange:e=>{sb.conds=e.target.value.split(',').map(s=>s.trim()).filter(Boolean);render();}})));
  const notas=field('Notas', h('textarea',{class:'in', rows:'2', onchange:e=>{sb.notes=e.target.value;render();}}, sb.notes||''));

  return h('div',{class:'best-card', id:'bx-'+sb.id}, head, vida, calcVida?h('div',{style:{margin:'4px 0'}},calcVida):null, attrs, recursos, ataques, meta, notas, notasLigadas('enemy',sb.id));
}
function rolarAtaque(sb, at){
  const vars={}; (S.system.attributes||[]).forEach(a=>{ vars[a.name]=sb.attrs[a.id]||0; });
  const acerto=rollExpr(at.acerto, vars), dano=rollExpr(at.dano, vars);
  logDice({expr:sb.name+' — '+at.nome+' (acerto '+at.acerto+')', total:acerto.total, erro:acerto.erro, detalhes:acerto.detalhes}, sb.name);
  logDice({expr:sb.name+' — '+at.nome+' (dano '+at.dano+')', total:dano.total, erro:dano.erro, detalhes:dano.detalhes}, sb.name);
  showToast('🎲 '+at.nome+' — acerto '+(acerto.erro?'?':acerto.total)+' • dano '+(dano.erro?'?':dano.total));
}

/* ---------- NPCs ---------- */
function npcsInner(){
  const c=S.campaign, lista=c.bestiary.npcs;
  const cards=lista.map(np=>npcCard(np));
  return h('div',{},
    card('NPCs','Personagens do mundo: aliados, vilões, comerciantes, informantes…',
      h('button',{class:'btn primary', onclick:()=>{lista.push(newNpc());render();}},'+ Novo NPC')),
    lista.length?h('div',{class:'best-grid'}, cards):h('div',{class:'pj-empty'},'Nenhum NPC ainda.'));
}
function npcCard(np){
  const relacoes=['aliado','neutro','hostil','misterioso'];
  const relSel=h('select',{class:'in', onchange:e=>{np.relacao=e.target.value;render();}},
    relacoes.map(r=>{const o=h('option',{value:r},r);if(np.relacao===r)o.selected=true;return o;}));
  return h('div',{class:'best-card npc', id:'bx-'+np.id},
    h('div',{class:'row wrapf', style:{alignItems:'center'}},
      imgBtn(np),
      h('input',{class:'in', style:{flex:'1',minWidth:'140px',fontWeight:'700'}, value:np.name, onchange:e=>{np.name=e.target.value;render();}}),
      h('button',{class:'btn ghost sm', title:'Duplicar', onclick:()=>{const cp=JSON.parse(JSON.stringify(np));cp.id=uid();cp.name=np.name+' (cópia)';S.campaign.bestiary.npcs.push(cp);render();}},'⧉'),
      h('button',{class:'btn ghost sm', title:'Excluir', onclick:()=>{if(confirm('Excluir '+np.name+'?')){S.campaign.bestiary.npcs=S.campaign.bestiary.npcs.filter(x=>x.id!==np.id);render();}}},'✕')),
    h('div',{class:'row wrapf'},
      field('Papel', h('input',{class:'in', style:{flex:'1'}, placeholder:'ferreiro, chefe…', value:np.papel, onchange:e=>{np.papel=e.target.value;render();}})),
      field('Local', h('input',{class:'in', style:{flex:'1'}, value:np.local, onchange:e=>{np.local=e.target.value;render();}})),
      field('Relação', relSel)),
    field('Personalidade', h('input',{class:'in', value:np.personalidade, placeholder:'traços, jeito de falar…', onchange:e=>{np.personalidade=e.target.value;render();}})),
    field('Notas', h('textarea',{class:'in', rows:'2', onchange:e=>{np.notes=e.target.value;render();}}, np.notes||'')),
    notasLigadas('npc',np.id));
}

/* Botão de imagem reaproveitando readPhoto (mesma redução/base64 das fotos de ficha). */
function imgBtn(obj){
  const inp=h('input',{type:'file', accept:'image/*', class:'hide',
    onchange:e=>{ readPhoto(e.target.files[0], data=>{ obj.image=data; render(); }); e.target.value=''; }});
  const av=obj.image
    ? h('img',{src:obj.image, class:'best-av', alt:''})
    : h('div',{class:'best-av ph'}, (obj.name||'?').trim().charAt(0).toUpperCase()||'?');
  return h('div',{class:'best-av-wrap', title:'Trocar imagem', onclick:()=>inp.click()}, av, inp);
}
