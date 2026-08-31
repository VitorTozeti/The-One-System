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
function inimigosInner(){
  const c=S.campaign, sys=S.system, lista=c.bestiary.enemies;
  const cards=lista.map(sb=>statblockCard(sys, sb));
  return h('div',{},
    card('Inimigos','Crie criaturas com atributos, HP e ataques roláveis.',
      h('button',{class:'btn primary', onclick:()=>{lista.push(newStatblock(sys));render();}},'+ Novo inimigo')),
    lista.length?h('div',{class:'best-grid'}, cards):h('div',{class:'pj-empty'},'Nenhum inimigo ainda.'));
}
function statblockCard(sys, sb){
  const head=h('div',{class:'row wrapf', style:{alignItems:'center'}},
    imgBtn(sb),
    h('input',{class:'in', style:{flex:'1',minWidth:'140px',fontWeight:'700'}, value:sb.name, onchange:e=>{sb.name=e.target.value;render();}}),
    h('button',{class:'btn ghost sm', title:'Duplicar', onclick:()=>{const cp=JSON.parse(JSON.stringify(sb));cp.id=uid();cp.name=sb.name+' (cópia)';S.campaign.bestiary.enemies.push(cp);render();}},'⧉'),
    h('button',{class:'btn ghost sm', title:'Excluir', onclick:()=>{if(confirm('Excluir '+sb.name+'?')){S.campaign.bestiary.enemies=S.campaign.bestiary.enemies.filter(x=>x.id!==sb.id);render();}}},'✕'));

  const vida=h('div',{class:'row wrapf'},
    field('HP', h('input',{class:'in', type:'number', style:{width:'80px'}, value:sb.hp, onchange:e=>{sb.hp=parseInt(e.target.value)||0;render();}})),
    field('HP máx', h('input',{class:'in', type:'number', style:{width:'80px'}, value:sb.hpMax, onchange:e=>{sb.hpMax=parseInt(e.target.value)||0;render();}})),
    field('Defesa', h('input',{class:'in', style:{width:'110px'}, value:sb.defesa, onchange:e=>{sb.defesa=e.target.value;render();}})));

  const attrs=(sys.attributes||[]).length?h('div',{class:'best-attrs'}, (sys.attributes||[]).map(a=>
    field(a.name, h('input',{class:'in', type:'number', style:{width:'62px'}, value:sb.attrs[a.id]!=null?sb.attrs[a.id]:0,
      onchange:e=>{sb.attrs[a.id]=parseInt(e.target.value)||0;render();}})))):null;

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

  return h('div',{class:'best-card'}, head, vida, attrs, ataques, meta, notas);
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
  return h('div',{class:'best-card npc'},
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
    field('Notas', h('textarea',{class:'in', rows:'2', onchange:e=>{np.notes=e.target.value;render();}}, np.notes||'')));
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
