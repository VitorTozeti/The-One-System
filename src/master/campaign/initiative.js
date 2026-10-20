/* ============================================================ CAMPANHA — COMBATE / INICIATIVA ============================================================
   Rastreador de iniciativa do Mestre. Estado em c.combat = {on,round,turn,order[],log[]}.
   Cada combatente liga (opcionalmente) a um TOKEN do mapa (tokenId/mapId): HP e
   marcas ficam sincronizados nos dois sentidos (token.hp / token.marks). Inimigos
   nascem do bestiário (grupo numerado, com ou sem tokens no mapa).
   Rolagem de iniciativa: usa o motor de dados (sys.rollBase, padrão 1d20) + bônus,
   que por padrão vem do recurso do sistema chamado "Iniciativa" (se existir).
   Atalhos (com a Mesa visível, fora de campos de texto): N = próximo turno, P = anterior. */

/* ---------- Acesso ao estado ---------- */
function cbSt(){ return S.campaign.combat; }
function cbAtual(){ const cb=cbSt(); return cb.on?(cb.order[cb.turn]||null):null; }
function cbLog(texto){
  const cb=cbSt(); cb.log.unshift({ts:Date.now(), round:cb.round, text:texto});
  if(cb.log.length>200) cb.log.length=200;
}
/* Token do mapa ligado ao combatente (procura primeiro no mapa guardado, depois em todos). */
function cbToken(x){
  if(!x||!x.tokenId) return null;
  const maps=S.campaign.maps||[];
  const m=maps.find(mm=>mm.id===x.mapId);
  let t=m&&m.tokens.find(tt=>tt.id===x.tokenId);
  if(t) return t;
  for(const mm of maps){ t=mm.tokens.find(tt=>tt.id===x.tokenId); if(t){ x.mapId=mm.id; return t; } }
  x.tokenId=null; return null;
}
function cbHp(x){ const t=cbToken(x); return (t&&t.hp!=null)?t.hp:x.hp; }
function cbHpMax(x){ const t=cbToken(x); return (t&&t.hpMax!=null)?t.hpMax:x.hpMax; }
function cbSetHp(x,v,max){
  const t=cbToken(x);
  if(max!=null){ x.hpMax=max; if(t) t.hpMax=max; }
  const mx=cbHpMax(x);
  v=Math.round(v); if(mx!=null) v=Math.min(v,mx); v=Math.max(0,v);
  x.hp=v; if(t){ t.hp=v; if(t.hpMax==null&&mx!=null) t.hpMax=mx; }
}
function cbCaido(x){ const hp=cbHp(x); return hp!=null&&hp<=0; }
function cbMarks(x){ const t=cbToken(x); return t?(t.marks=t.marks||[]):(x.marks=x.marks||[]); }

/* ---------- Variáveis para fórmulas (jogador pela ficha, inimigo pelo statblock) ---------- */
function cbVars(x){
  const sys=S.system, v={}; let attrs=null, lvl=sys.startLevel;
  if(x.kind==='player'){ const p=S.campaign.players.find(pp=>pp.id===x.refId); if(p&&p.sheet){ attrs=p.sheet.attrs||{}; if(p.sheet.level!=null) lvl=p.sheet.level; } else return null; }
  else if(x.kind==='enemy'){ const sb=S.campaign.bestiary.enemies.find(s=>s.id===x.refId); if(sb) attrs=sb.attrs||{}; else return null; }
  else return null;
  (sys.attributes||[]).forEach(a=>{ const raw=attrs[a.id]; v[a.name]=effAttr(sys, raw!=null?raw:sys.startAttrValue); });
  v['Nível']=lvl; v['Nivel']=lvl; v[sys.levelName||'Nível']=lvl;
  (sys.resources||[]).forEach(r=>{ const n=evalFormula(r.formula,v); if(!Number.isNaN(n)) v[r.name]=n; });
  return v;
}
/* Bônus padrão de iniciativa = recurso do sistema chamado "Iniciativa" (se calculável). */
function cbBonusPadrao(x){
  const r=(S.system.resources||[]).find(rr=>/inici/i.test(rr.name)); const v=cbVars(x);
  if(!r||!v) return 0;
  const n=evalFormula(r.formula,v); return Number.isNaN(n)?0:n;
}
/* HP máximo padrão de um jogador: recurso "Vida/HP/PV" do sistema, se a ficha permitir calcular. */
function cbHpPadraoJogador(x){
  const r=(S.system.resources||[]).find(rr=>/vida|hp|^pv|sa[uú]de/i.test(rr.name)); const v=cbVars(x);
  if(!r||!v) return null;
  const n=evalFormula(r.formula,v); return (Number.isNaN(n)||n<=0)?null:n;
}

/* ---------- Outros recursos do sistema (Mana, Sanidade, Marca…) além da Vida ---------- */
function cbResVida(){ return (S.system.resources||[]).find(rr=>/vida|hp|^pv|sa[uú]de/i.test(rr.name)); }
function cbOutrosRecursos(){ const v=cbResVida(); return (S.system.resources||[]).filter(r=>(r.type||'barra')!=='valor'&&r!==v); }
/* Jogador: valores reais da ficha (classe, itens e início já aplicados). Inimigo: fórmula do sistema com os atributos do statblock
   (ou o valor que o Mestre digitou no bestiário). Guarda {cur,max} em x.res[resId]. */
function cbIniciaRecursos(x){
  x.res=x.res||{};
  const outros=cbOutrosRecursos(); if(!outros.length) return;
  try{
    if(x.kind==='player'){
      const p=S.campaign.players.find(pp=>pp.id===x.refId); if(!p||!p.sheet) return;
      const ctx=computeSheet(S.system,sanitizeDraft(JSON.parse(JSON.stringify(p.sheet)),S.system));
      outros.forEach(r=>{ const a=ctx.allRes.find(q=>q.id===r.id); if(a&&!x.res[r.id]&&!Number.isNaN(a.max)) x.res[r.id]={cur:a.cur,max:a.max}; });
    } else if(x.kind==='enemy'){
      const sb=S.campaign.bestiary.enemies.find(s=>s.id===x.refId), v=cbVars(x); if(!sb||!v) return;
      outros.forEach(r=>{
        if(x.res[r.id]) return;
        const ov=sb.recs&&sb.recs[r.id];
        let max=(ov!=null&&ov!=='')?Number(ov):evalFormula(r.formula,v);
        if(Number.isNaN(max)) return;
        x.res[r.id]={cur:recursoInicio(r,v,max),max};
      });
    }
  }catch(e){ console.warn('recursos do combatente:',e); }
}
function cbResDelta(x,r,delta){
  const a=(x.res||{})[r.id]; if(!a) return;
  const antes=a.cur; a.cur=Math.max(0,Math.min(a.max,Math.round(a.cur+delta)));
  if(a.cur===antes) return;
  cbLog(x.name+' — '+r.name+' '+antes+' → '+a.cur);
  if(antes>0&&a.cur<=0) showToast('⚠ '+x.name+': '+r.name+' chegou a 0');
  render();
}

/* ---------- Criar combatentes ---------- */
function cbNovo(o){
  return Object.assign({id:uid(), name:'?', kind:'enemy', refId:null, tokenId:null, mapId:null,
    init:null, roll:null, bonus:0, hp:null, hpMax:null, conds:[], marks:[], hidden:false}, o);
}
function cbAddJogadores(){
  const c=S.campaign, cb=cbSt(), m=curMap(); let n=0;
  c.players.forEach(p=>{
    if(cb.order.some(x=>x.kind==='player'&&x.refId===p.id)) return;
    const tk=m&&m.tokens.find(t=>t.kind==='player'&&t.refId===p.id);
    const x=cbNovo({name:p.name, kind:'player', refId:p.id, tokenId:tk?tk.id:null, mapId:tk?m.id:null});
    x.bonus=cbBonusPadrao(x);
    const hp=(tk&&tk.hp!=null)?tk.hp:null, mx=(tk&&tk.hpMax)||cbHpPadraoJogador(x);
    if(mx!=null){ x.hpMax=mx; x.hp=hp!=null?hp:mx; if(tk){ tk.hp=x.hp; tk.hpMax=mx; } }
    cbIniciaRecursos(x);
    cb.order.push(x); n++;
  });
  if(!c.players.length) showToast('Cadastre jogadores na seção Jogadores.');
  else showToast(n?(n+' jogador(es) adicionados'):'Todos os jogadores já estão no combate');
  render();
}
/* Grupo de inimigos do bestiário, numerado automaticamente (Goblin 1, Goblin 2…). */
function cbAddGrupo(sbId, qtd, comTokens){
  const c=S.campaign, cb=cbSt(), sb=c.bestiary.enemies.find(s=>s.id===sbId);
  if(!sb) return showToast('Escolha um inimigo do bestiário.');
  qtd=Math.max(1,Math.min(30,parseInt(qtd)||1));
  const m=comTokens?curMap():null;
  if(comTokens&&!m) showToast('Sem mapa aberto: o grupo entra só na lista.');
  const ja=cb.order.filter(x=>x.refId===sb.id).length;
  for(let i=0;i<qtd;i++){
    const num=ja+i+1, nome=(qtd>1||ja>0)?(sb.name+' '+num):sb.name;
    const x=cbNovo({name:nome, kind:'enemy', refId:sb.id, hp:sb.hp, hpMax:sb.hpMax||sb.hp});
    x.bonus=cbBonusPadrao(x); cbIniciaRecursos(x);
    if(m){
      const tk=newToken('enemy',nome,sb.id); tk.hp=x.hp; tk.hpMax=x.hpMax;
      const k=m.tokens.length; tk.xPct=Math.min(94,14+(k%8)*10); tk.yPct=Math.min(90,14+Math.floor(k/8)*9);
      m.tokens.push(tk); x.tokenId=tk.id; x.mapId=m.id;
    }
    cb.order.push(x);
  }
  cbLog('+ '+qtd+'× '+sb.name+' entram no combate');
  showToast('+ '+qtd+'× '+sb.name);
  render();
}
/* Traz para o combate os tokens do mapa atual que ainda não estão na lista. */
function cbAddTokensMapa(){
  const cb=cbSt(), m=curMap(); if(!m) return showToast('Nenhum mapa aberto.');
  let n=0;
  m.tokens.forEach(t=>{
    if(cb.order.some(x=>x.tokenId===t.id)) return;
    const info=(typeof tokenRefInfo==='function')?tokenRefInfo(t):null;
    const x=cbNovo({name:(info&&info.name)||t.label||'Token', kind:t.kind||'npc', refId:t.refId||null, tokenId:t.id, mapId:m.id,
      hp:t.hp!=null?t.hp:null, hpMax:t.hpMax!=null?t.hpMax:null, hidden:!!t.hidden});
    x.bonus=cbBonusPadrao(x); cbIniciaRecursos(x); cb.order.push(x); n++;
  });
  showToast(n?(n+' token(s) trazidos do mapa'):'Todos os tokens do mapa já estão na lista');
  render();
}

/* ---------- Iniciativa: rolar e ordenar ---------- */
function cbOrdenar(){
  const cb=cbSt(), cur=cbAtual();
  cb.order.sort((a,b)=>((b.init==null?-1e9:b.init)-(a.init==null?-1e9:a.init)) || ((b.bonus||0)-(a.bonus||0)));
  if(cur) cb.turn=Math.max(0,cb.order.indexOf(cur));
}
function cbRolar(x,silencioso){
  const base=String(S.system.rollBase||'1d20');
  const res=rollExpr(/\d*d\d+/i.test(base)?base:'1d20',{});
  if(res.erro){ showToast('Não foi possível rolar: '+res.erro); return; }
  x.roll=res.total; x.init=res.total+(x.bonus||0);
  logDice({expr:'Iniciativa — '+x.name+(x.bonus?(' ('+base+sign(x.bonus)+')'):''), total:x.init, detalhes:res.detalhes}, x.name);
  cbLog(x.name+' rolou iniciativa: '+x.init);
  if(!silencioso){ cbOrdenar(); render(); }
}
function cbRolarTodos(soVazios){
  const cb=cbSt(); if(!cb.order.length) return showToast('Adicione combatentes primeiro.');
  cb.order.forEach(x=>{ if(!soVazios||x.init==null) cbRolar(x,true); });
  cbOrdenar(); showToast('🎲 Iniciativa rolada'); render();
}

/* ---------- Fluxo de turnos ---------- */
function cbIniciar(){
  const cb=cbSt(); if(!cb.order.length) return showToast('Adicione combatentes primeiro.');
  cb.order.forEach(x=>{ if(x.init==null) cbRolar(x,true); });
  cbOrdenar(); cb.on=true; cb.round=1; cb.startedAt=Date.now();
  cb.turn=Math.max(0,cb.order.findIndex(x=>!cbCaido(x)));
  cbLog('⚔️ Combate iniciado — '+cb.order.length+' combatentes');
  sessEvento('Combate iniciado ('+cb.order.length+' combatentes)','combate');
  showToast('⚔️ Combate iniciado — vez de '+cb.order[cb.turn].name);
  render();
}
function cbAvancar(dir){
  const cb=cbSt(), n=cb.order.length; if(!cb.on||!n) return;
  let i=cb.turn, g=0;
  do{
    i+=dir;
    if(i>=n){ i=0; cb.round++; cbLog('— Rodada '+cb.round+' —'); }
    else if(i<0){ i=n-1; if(cb.round>1) cb.round--; }
    g++;
  } while(cbCaido(cb.order[i]) && g<=n);
  cb.turn=i; const x=cb.order[i];
  if(dir>0) cbLog('Vez de '+x.name);
  render();
}
/* Adiar: o combatente da vez passa para logo depois do próximo e a vez vai para quem estava atrás. */
function cbAdiar(){
  const cb=cbSt(), n=cb.order.length; if(!cb.on||n<2) return;
  const i=cb.turn, x=cb.order[i];
  cb.order.splice(i,1);
  const pos=Math.min(i+1,cb.order.length);
  cb.order.splice(pos,0,x);
  if(i>=cb.order.length) cb.turn=0;
  for(let g=0;g<cb.order.length&&cbCaido(cb.order[cb.turn]);g++) cb.turn=(cb.turn+1)%cb.order.length;   /* não cai em caído */
  cbLog(x.name+' adiou a ação — vez de '+cb.order[cb.turn].name);
  render();
}
function cbMover(x,d){
  const cb=cbSt(), cur=cbAtual(), i=cb.order.indexOf(x), j=i+d;
  if(i<0||j<0||j>=cb.order.length) return;
  cb.order.splice(i,1); cb.order.splice(j,0,x);
  if(cur) cb.turn=cb.order.indexOf(cur);
  render();
}
function cbRemover(x){
  const cb=cbSt(), cur=cbAtual(), i=cb.order.indexOf(x);
  if(i<0) return;
  cb.order.splice(i,1);
  if(cur&&cur!==x) cb.turn=cb.order.indexOf(cur);
  else if(cb.turn>=cb.order.length) cb.turn=0;
  render();
}
function cbEncerrar(silencioso){
  const cb=cbSt(); if(!cb.on) return;
  const rodadas=cb.round;
  cb.on=false;
  cbLog('🏁 Combate encerrado em '+rodadas+' rodada(s)');
  sessEvento('Combate encerrado em '+rodadas+' rodada(s)','combate');
  if(!silencioso){ showToast('🏁 Combate encerrado'); render(); }
}
async function cbLimpar(){
  const cb=cbSt();
  if(cb.order.length && !(await cConfirm('Remover TODOS os combatentes da lista? (os tokens do mapa continuam lá)',{perigo:true,okText:'Limpar'}))) return;
  cb.order=[]; cb.on=false; cb.turn=0; cb.round=1; render();
}
/* Texto digitado no campo do HP: "7" ou "-7" = dano · "+5" = cura · "=12" = definir. */
function cbAplicarTexto(x,txt){
  txt=String(txt||'').trim(); if(!txt) return;
  const num=parseInt(txt.replace(/^[=+\-]/,''));
  if(Number.isNaN(num)) return showToast('Digite um número (ex.: 7, +5, =12).');
  if(txt[0]==='=') cbSetHp(x,num); else cbHpDelta(x, txt[0]==='+'?num:-Math.abs(num), true);
  if(txt[0]==='=') { cbLog(x.name+' PV definido para '+num); render(); }
}
function cbHpDelta(x,delta,aviso,semRender){
  const antes=cbHp(x); if(antes==null) return;
  const mx=cbHpMax(x);
  cbSetHp(x, antes+delta);
  const depois=cbHp(x);
  cbLog(x.name+(delta<0?' sofreu '+(-delta)+' de dano':' recuperou '+delta)+' ('+antes+' → '+depois+')');
  if(antes>0&&depois<=0){ cbLog('☠️ '+x.name+' caiu'); if(!semRender) showToast('☠️ '+x.name+' caiu'); }
  /* regra de morte do sistema, fases do chefe e concentração (combate-acoes.js) */
  if(typeof cbAposDano==='function') cbAposDano(x,antes,depois,delta);
  if(!semRender) render();
}

/* ---------- Destaque do token da vez no mapa ---------- */
function cbSyncTokenFlags(){
  const c=S.campaign; if(!c||!Array.isArray(c.maps)) return;
  const cur=cbAtual(), tid=cur&&cur.tokenId;
  c.maps.forEach(m=>m.tokens.forEach(t=>{ const on=!!(tid&&t.id===tid); if(on){ t.turn=true; } else if(t.turn) delete t.turn; }));
}
/* Depois do render: marca visualmente o token da vez (casa por posição, sem depender do mapa). */
function cbMarcarTokenDOM(){
  const cur=cbAtual(), t=cur&&cbToken(cur); if(!t) return;
  document.querySelectorAll('.mt-tok[data-tid="'+t.id+'"]').forEach(el=>el.classList.add('turn'));
}

/* ============================ INTERFACE ============================ */
const COND_COMUNS=['Caído','Atordoado','Envenenado','Sangrando','Amedrontado','Concentrado'];
function condsDoSistema(){ const l=(S.system.conditions||[]).map(c=>c.name).filter(Boolean); return l.length?l:COND_COMUNS; }
function cbIcone(x){ return {player:'🧍',enemy:'🐉',npc:'🎭'}[x.kind]||'❔'; }

/* Barra de HP (verde → âmbar → vermelho). */
function cbBarraHp(x){
  const hp=cbHp(x), mx=cbHpMax(x);
  if(hp==null) return null;
  const pc=mx?Math.max(0,Math.min(100,hp/mx*100)):100;
  const cor=pc>60?'#10b981':pc>30?'#d97706':'#e11d48';
  return h('div',{class:'mv-hpbar'}, h('span',{style:{width:pc+'%',background:cor}}));
}

function cbLinha(x,i){
  const cb=cbSt(), cur=cb.on&&cb.order[cb.turn]===x, ui=cmp();
  const hp=cbHp(x), mx=cbHpMax(x), aberto=ui.cbOpen===x.id, down=cbCaido(x);
  const marks=cbMarks(x);
  const chips=[...marks.map(mk=>h('span',{class:'mv-chip'},mk)), ...x.conds.map(cn=>h('span',{class:'mv-chip txt'},cn)), ...(typeof cbChipsExtras==='function'?cbChipsExtras(x):[])];
  if(!x.res) cbIniciaRecursos(x);
  const recsX=cbOutrosRecursos().filter(r=>x.res&&x.res[r.id]);
  const recChips=recsX.length?h('div',{class:'mv-res'},recsX.map(r=>{ const a=x.res[r.id];
    return h('span',{class:'mv-chip txt',title:r.name+' — abra ▾ para mudar',style:{borderColor:r.color||null}},(r.icon?r.icon+' ':'')+r.name+' '+a.cur+'/'+a.max); })):null;
  const hpBloco = hp!=null
    ? h('div',{class:'mv-hp'},
        h('div',{class:'mv-hp-n'}, h('b',{}, hp), mx!=null?h('span',{class:'hint'},'/'+mx):null), cbBarraHp(x),
        h('div',{class:'mv-hp-b'},
          h('button',{class:'btn mini', title:'−1 PV', onclick:()=>cbHpDelta(x,-1)},'−'),
          h('input',{class:'in mv-hpin', placeholder:'±', title:'7 = dano · +5 = cura · =12 = definir. Enter aplica.', 'aria-label':'Dano ou cura de '+x.name,
            onkeydown:e=>{ if(e.key==='Enter'){ e.preventDefault(); cbAplicarTexto(x,e.target.value); } }}),
          h('button',{class:'btn mini', title:'+1 PV', onclick:()=>cbHpDelta(x,1)},'+')))
    : h('button',{class:'btn sm ghost', title:'Definir os pontos de vida', onclick:async()=>{
        const v=await cPrompt('PV máximo de '+x.name+':','10'); const n=parseInt(v); if(!n) return;
        cbSetHp(x,n,n); render(); }},'＋ PV');
  const linha=h('div',{class:'mv-cb'+(cur?' cur':'')+(down?' down':'')+(x.hidden?' hid':'')+' k-'+x.kind},
    h('div',{class:'mv-cb-mk'}, cur?'▶':''),
    h('input',{class:'in mv-init', type:'number', value:x.init!=null?x.init:'', placeholder:'—', title:'Iniciativa (editável)', 'aria-label':'Iniciativa de '+x.name,
      onchange:e=>{ x.init=e.target.value===''?null:(parseFloat(e.target.value)||0); cbOrdenar(); render(); }}),
    h('button',{class:'btn mini ghost', title:'Rolar iniciativa', onclick:()=>cbRolar(x)},'🎲'),
    h('div',{class:'mv-cb-nm'},
      h('div',{class:'mv-cb-name'}, cbIcone(x)+' '+x.name, x.hidden?h('span',{class:'mv-chip txt'},'oculto'):null, down?h('span',{class:'mv-chip txt'},'caído'):null),
      chips.length?h('div',{class:'mv-chips'}, chips):null, recChips),
    hpBloco,
    h('button',{class:'btn mini ghost', title:'Detalhes: condições, ataques, ocultar, mover, remover', onclick:()=>{ ui.cbOpen=aberto?null:x.id; render(); }}, aberto?'▴':'▾'));
  if(!aberto) return linha;

  /* detalhes expandidos */
  const sb=x.kind==='enemy'?S.campaign.bestiary.enemies.find(s=>s.id===x.refId):null;
  const marcasBtns=TOKEN_MARKS.map(mk=>h('button',{class:'emoji-pick'+(marks.includes(mk)?' on':''), title:'Marca', onclick:()=>{
      const a=cbMarks(x), p=a.indexOf(mk); if(p>=0)a.splice(p,1); else a.push(mk); render(); }}, mk));
  const condBtns=condsDoSistema().map(cn=>h('button',{class:'btn sm '+(x.conds.includes(cn)?'amber':'ghost'), onclick:()=>{
      const p=x.conds.indexOf(cn); if(p>=0)x.conds.splice(p,1); else x.conds.push(cn); cbLog(x.name+(p>=0?' perdeu ':' ganhou ')+cn); render(); }}, cn));
  const ataques=sb&&sb.ataques.length?h('div',{class:'row wrapf'}, h('span',{class:'hint'},'Ataques:'),
    sb.ataques.map(at=>h('button',{class:'btn sm primary', onclick:()=>{ rolarAtaque(sb,at); cbLog(x.name+' usou '+at.nome); }}, '🎲 '+at.nome+' ('+at.acerto+'/'+at.dano+')'))):null;
  const recLinhas=recsX.map(r=>{ const a=x.res[r.id];
    return h('div',{class:'mv-resrow'}, h('b',{},(r.icon?r.icon+' ':'')+r.name), h('span',{class:'hint'},a.cur+' / '+a.max),
      h('button',{class:'btn mini',type:'button',title:'−1',onclick:()=>cbResDelta(x,r,-1)},'−'),
      h('button',{class:'btn mini',type:'button',title:'+1',onclick:()=>cbResDelta(x,r,1)},'+'),
      h('input',{class:'in mv-hpin',placeholder:'±',title:'7 = tira · +5 = soma · =12 = define. Enter aplica.','aria-label':r.name+' de '+x.name,
        onkeydown:e=>{ if(e.key!=='Enter') return; e.preventDefault(); const t=String(e.target.value).trim(), n=parseInt(t.replace(/^[=+\-]/,''));
          if(Number.isNaN(n)) return showToast('Digite um número (ex.: 3, +2, =10).');
          if(t[0]==='=') cbResDelta(x,r,n-a.cur); else cbResDelta(x,r,t[0]==='+'?n:-Math.abs(n)); }})); });
  const extra=h('div',{class:'mv-cb-more'},
    recLinhas.length?h('div',{},...recLinhas):null,
    typeof cbAcoesExtra==='function'?cbAcoesExtra(x):null,
    h('div',{class:'row wrapf'}, h('span',{class:'hint'},'Marcas:'), marcasBtns),
    h('div',{class:'row wrapf'}, h('span',{class:'hint'},'Condições:'), condBtns),
    ataques,
    h('div',{class:'row wrapf'},
      field('Bônus de iniciativa', h('input',{class:'in', type:'number', style:{width:'80px'}, value:x.bonus||0, onchange:e=>{x.bonus=parseInt(e.target.value)||0;render();}})),
      field('PV máx', h('input',{class:'in', type:'number', style:{width:'80px'}, value:mx!=null?mx:'', onchange:e=>{ const n=parseInt(e.target.value); if(n>0){ cbSetHp(x,hp!=null?hp:n,n); render(); } }})),
      h('button',{class:'btn sm ghost', onclick:()=>{x.hidden=!x.hidden; const t=cbToken(x); if(t) t.hidden=x.hidden; render();}}, x.hidden?'👁 Revelar':'🙈 Ocultar'),
      h('button',{class:'btn sm ghost', onclick:()=>cbMover(x,-1)},'↑'),
      h('button',{class:'btn sm ghost', onclick:()=>cbMover(x,1)},'↓'),
      cur?h('button',{class:'btn sm amber', title:'Passa a vez para depois do próximo', onclick:cbAdiar},'⏳ Adiar'):null,
      h('button',{class:'btn sm danger', onclick:()=>cbRemover(x)},'✕ Remover')));
  return h('div',{class:'mv-cb-wrap'}, linha, extra);
}

/* Painel completo da seção "Combate". */
function combateView(){
  const c=S.campaign, cb=cbSt(), ui=cmp(), cur=cbAtual();
  if(ui.cbQty==null) ui.cbQty=3;
  const enemySel=h('select',{id:'cb-enemy', class:'in sm', style:{width:'auto',minWidth:'150px'}, onchange:e=>{ui.cbEnemy=e.target.value;}},
    h('option',{value:''},'— inimigo do bestiário —'),
    c.bestiary.enemies.map(s=>{const o=h('option',{value:s.id},s.name+' ('+s.hp+' PV)'); if(ui.cbEnemy===s.id)o.selected=true; return o;}));
  const topo=h('div',{class:'mv-cb-top'},
    cb.on?h('div',{class:'mv-round'}, h('small',{},'RODADA'), h('b',{}, cb.round)):null,
    h('div',{class:'mv-cb-ctl'},
      cb.on
        ? [h('button',{class:'btn lg primary', onclick:()=>cbAvancar(1)},'▶ Próximo turno'),
           h('button',{class:'btn', onclick:()=>cbAvancar(-1)},'◀ Anterior'),
           h('button',{class:'btn amber', onclick:cbAdiar},'⏳ Adiar'),
           h('button',{class:'btn danger', onclick:()=>cbEncerrar()},'🏁 Encerrar')]
        : [h('button',{class:'btn lg emerald', disabled:c.combat.order.length?null:true, onclick:cbIniciar},'⚔️ Iniciar combate'),
           h('button',{class:'btn', onclick:()=>cbRolarTodos(false)},'🎲 Rolar todos')]));
  const add=h('div',{class:'mv-cb-add'},
    h('button',{class:'btn sm', onclick:cbAddJogadores},'🧍 + Jogadores'),
    h('button',{class:'btn sm', onclick:cbAddTokensMapa, title:'Traz os tokens do mapa aberto'},'🗺️ + Tokens do mapa'),
    h('span',{class:'mv-sep'}),
    enemySel,
    h('input',{class:'in sm', type:'number', min:'1', max:'30', style:{width:'58px'}, value:ui.cbQty, title:'Quantidade', 'aria-label':'Quantidade de inimigos',
      oninput:e=>{ui.cbQty=e.target.value;}}),
    h('label',{class:'chk', title:'Cria um token de cada inimigo no mapa aberto'}, h('input',{type:'checkbox', checked:ui.cbTok!==false, onchange:e=>{ui.cbTok=e.target.checked;}}),' no mapa'),
    h('button',{class:'btn sm primary', onclick:()=>cbAddGrupo(enemySel.value||ui.cbEnemy, ui.cbQty, ui.cbTok!==false)},'+ Grupo'),
    cb.order.length?h('button',{class:'btn sm ghost', style:{marginLeft:'auto'}, onclick:cbLimpar},'🧹 Limpar'):null);

  const lista=cb.order.length
    ? h('div',{class:'mv-cb-list'}, cb.order.map((x,i)=>cbLinha(x,i)))
    : h('div',{class:'pj-empty'},'Ninguém no combate. Adicione os jogadores, tokens do mapa ou um grupo de inimigos do bestiário.');

  const log=cb.log.length
    ? h('div',{class:'mv-log'}, cb.log.slice(0,40).map(l=>h('div',{class:'mv-log-i'}, h('span',{class:'mv-log-r'},'R'+l.round), h('span',{}, l.text), h('span',{class:'hint'},fmtHora(l.ts)))))
    : h('div',{class:'hint'},'O registro do combate aparece aqui.');

  return h('div',{},
    card('Iniciativa'+(cur?' — vez de '+cur.name:''),
      'Toque nos números para editar. HP aceita 7 (dano), +5 (cura), =12 (definir). Atalhos: N próximo · P anterior.',
      null, topo, add, typeof cbPainelUsar==='function'?cbPainelUsar():null, lista),
    card('Registro do combate',null,null, log));
}

/* Painel compacto (usado na barra da Mesa ao vivo): vez atual + próximos + botões. */
function combateMini(){
  const cb=cbSt(); if(!cb.on||!cb.order.length) return null;
  const cur=cb.order[cb.turn]||cb.order[0], n=cb.order.length;
  const prox=[]; for(let k=1;k<n&&prox.length<3;k++){ const y=cb.order[(cb.turn+k)%n]; if(!cbCaido(y)) prox.push(y); }
  const hp=cbHp(cur), mx=cbHpMax(cur);
  return h('div',{class:'mv-mini'},
    h('div',{class:'mv-mini-r'}, h('small',{},'R'), h('b',{},cb.round)),
    h('div',{class:'mv-mini-cur', title:'Quem age agora'}, h('small',{},'Vez de'), h('b',{}, cbIcone(cur)+' '+cur.name),
      hp!=null?h('span',{class:'hint'}, hp+(mx!=null?'/'+mx:'')+' PV'):null),
    h('div',{class:'mv-mini-next'}, h('small',{},'depois'), prox.map(y=>h('span',{class:'mv-chip txt'}, y.name))),
    h('button',{class:'btn sm', title:'Turno anterior (P)', onclick:()=>cbAvancar(-1)},'◀'),
    h('button',{class:'btn sm primary', title:'Próximo turno (N)', onclick:()=>cbAvancar(1)},'▶ Próximo'),
    h('button',{class:'btn sm ghost', title:'Abrir o painel de combate', onclick:()=>irMtab('combate')},'⚔️'));
}

/* Atalhos N / P fora de campos de texto, só com a Mesa à vista. */
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  const t=e.target; if(t&&((t.matches&&t.matches('input,textarea,select'))||t.isContentEditable)) return;
  if(!S.campaign||!S.campaign.combat||!S.campaign.combat.on||!document.querySelector('.mv-live')) return;
  const k=e.key.toLowerCase();
  if(k==='n'){ e.preventDefault(); cbAvancar(1); }
  else if(k==='p'){ e.preventDefault(); cbAvancar(-1); }
});
