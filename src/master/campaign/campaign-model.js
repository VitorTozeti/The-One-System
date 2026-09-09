/* ============================================================ CAMPANHA — MODELO ============================================================
   Camada de dados da campanha do Mestre (sem UI). Cada personagem Mestre tem
   UM sistema (regras) e UMA campanha. Depende de helpers (uid) e do estado (S).
   Reaproveita: rollExpr (dados), readPhoto (imagens), canvasNode (ver ficha). */

function defaultCampaign(){
  return {
    name:'', summary:'', notes:'',
    players:[],                       /* {id,name,note,sheet|null,importedAt} */
    bestiary:{ enemies:[], npcs:[] }, /* Statblock[] e NpcCard[] */
    loot:[],                          /* {id,itemId|null,nome,qty,ownerPlayerId|null,note} */
    maps:[],                          /* coleção de mapas (mundo, região, local, interior…) */
    currentMapId:null,                /* mapa aberto no editor */
    diceLog:[],                       /* {id,ts,expr,total,detail,detalhes,by} */
    sessions:[],                      /* {id,date,log} */
  };
}

/* Tipos e temas de mapa (usados pela UI do mapa). */
const MAP_KINDS=[
  {k:'mundo',    ic:'🌍', nome:'Mundo'},
  {k:'regiao',   ic:'🗺️', nome:'Região'},
  {k:'local',    ic:'🏘️', nome:'Local / Cidade'},
  {k:'interior', ic:'🏠', nome:'Interior / Casa'},
  {k:'masmorra', ic:'🕳️', nome:'Masmorra'},
];
const MAP_THEMES=[
  {k:'rustico',  ic:'📜', nome:'Rústico'},
  {k:'natural',  ic:'🌲', nome:'Natural'},
  {k:'futurista',ic:'🛸', nome:'Futurista'},
  {k:'sombrio',  ic:'🕯️', nome:'Sombrio'},
  {k:'limpo',    ic:'▢',  nome:'Limpo'},
];
/* Ícones de local por categoria — as "peças" para construir o mapa. */
const PIN_ICONS=['📍','🏰','🏘️','🏠','⛺','🗼','⚓','🕳️','🌲','⛰️','🌋','🏜️','🏝️','🌊','🛣️','⚔️','☠️','💀','⭐','❓','💎','🔥','🛸','🏭','📡'];

/* Quais tipos são mapas de MUNDO (ferramentas de continente/reinos) e quais são
   TÁTICOS (paredes, árvores, armadilhas…). */
function isWorldKind(k){ return k==='mundo'||k==='regiao'; }

/* ---------- Peças TÁTICAS (mapas pequenos: paredes, mato, armadilhas…) ----------
   shape:'stamp' = ícone solto (tamanho/rotação);  shape:'block' = estrutura
   retangular (parede, sala, água) com largura/altura/rotação. */
const PROP_CATALOG=[
  { cat:'Estrutura', cor:'#9aa4b2', itens:[
    {k:'parede',    ic:'🧱', nome:'Parede',    shape:'block', w:22, h:5,  fill:'wall'},
    {k:'sala',      ic:'▦',  nome:'Sala/Piso', shape:'block', w:26, h:20, fill:'floor'},
    {k:'agua',      ic:'🌊', nome:'Água',      shape:'block', w:24, h:16, fill:'water'},
    {k:'porta',     ic:'🚪', nome:'Porta',     shape:'stamp'},
    {k:'coluna',    ic:'🛢️', nome:'Coluna',    shape:'stamp'},
    {k:'escada',    ic:'🪜', nome:'Escada',    shape:'stamp'},
  ]},
  { cat:'Natureza', cor:'#4caf50', itens:[
    {k:'arvore',    ic:'🌲', nome:'Árvore',    shape:'stamp'},
    {k:'arvore2',   ic:'🌳', nome:'Árvore 2',  shape:'stamp'},
    {k:'mato',      ic:'🌿', nome:'Mato',      shape:'stamp'},
    {k:'arbusto',   ic:'🌱', nome:'Arbusto',   shape:'stamp'},
    {k:'pedra',     ic:'🪨', nome:'Pedra',     shape:'stamp'},
    {k:'tronco',    ic:'🪵', nome:'Tronco',    shape:'stamp'},
    {k:'grama',     ic:'▩',  nome:'Vegetação', shape:'block', w:22, h:16, fill:'grass'},
  ]},
  { cat:'Perigo', cor:'#f43f5e', itens:[
    {k:'armadilha', ic:'⚠️', nome:'Armadilha', shape:'stamp', gm:true},
    {k:'fosso',     ic:'🕳️', nome:'Fosso',     shape:'stamp'},
    {k:'espinhos',  ic:'🌵', nome:'Espinhos',  shape:'stamp'},
    {k:'fogo',      ic:'🔥', nome:'Fogo',      shape:'stamp'},
    {k:'veneno',    ic:'☠️', nome:'Veneno',    shape:'stamp'},
    {k:'gelo',      ic:'❄️', nome:'Gelo',      shape:'block', w:18, h:14, fill:'ice'},
  ]},
  { cat:'Objetos', cor:'#d97706', itens:[
    {k:'bau',       ic:'🧰', nome:'Baú',       shape:'stamp'},
    {k:'tocha',     ic:'🕯️', nome:'Tocha',     shape:'stamp'},
    {k:'mesa',      ic:'🪑', nome:'Móvel',     shape:'stamp'},
    {k:'barril',    ic:'🛢️', nome:'Barril',    shape:'stamp'},
    {k:'altar',     ic:'⛩️', nome:'Altar',     shape:'stamp'},
    {k:'bandeira',  ic:'🚩', nome:'Bandeira',  shape:'stamp'},
  ]},
];
function propMeta(k){ for(const g of PROP_CATALOG){ const it=g.itens.find(x=>x.k===k); if(it) return it; } return null; }

/* Formatos de continente para mapas de MUNDO (clip-path polygon). */
const WORLD_SHAPES=[
  {k:'none',   nome:'Sem contorno', poly:null},
  {k:'pangeia',nome:'Pangeia',  poly:'30% 10%,62% 6%,80% 22%,92% 44%,78% 60%,88% 80%,60% 92%,40% 82%,18% 88%,8% 62%,20% 40%,12% 24%'},
  {k:'ilhas',  nome:'Arquipélago', poly:'20% 20%,42% 12%,58% 24%,50% 40%,70% 44%,84% 62%,66% 74%,72% 90%,44% 82%,30% 92%,22% 70%,36% 56%,14% 46%'},
  {k:'garra',  nome:'Garra',    poly:'12% 40%,34% 14%,50% 30%,60% 10%,74% 30%,90% 22%,82% 50%,94% 72%,64% 66%,56% 90%,40% 68%,20% 78%,26% 56%'},
  {k:'crescente',nome:'Crescente', poly:'50% 6%,78% 16%,90% 44%,80% 74%,54% 92%,60% 66%,44% 54%,58% 40%,40% 30%,58% 22%'},
  {k:'meridional',nome:'Meridional', poly:'34% 8%,66% 12%,74% 34%,64% 52%,72% 74%,52% 94%,34% 76%,42% 54%,28% 40%,40% 24%'},
];
function worldShapeMeta(k){ return WORLD_SHAPES.find(x=>x.k===k)||WORLD_SHAPES[0]; }
/* Paleta de cores para reinos/territórios. */
const KINGDOM_COLORS=['#e11d48','#2563eb','#059669','#d97706','#7c3aed','#0891b2','#be185d','#65a30d','#475569'];

function newMap(kind,theme,name){
  return { id:uid(), name:name||'Novo mapa', kind:kind||'regiao', theme:theme||'rustico',
           image:null, grid:{on:false,size:48}, tokens:[], pins:[], props:[],
           world:{ continent:{shape:'none', color:'#3b6b4a', rot:0, scale:100}, kingdoms:[] },
           note:'' };
}
function newProp(k, xPct, yPct){
  const it=propMeta(k)||{k:k,ic:'❔',shape:'stamp'};
  return { id:uid(), k:it.k, cat:it.cat, icon:it.ic, shape:it.shape,
           xPct:xPct==null?50:xPct, yPct:yPct==null?50:yPct,
           w:it.w||16, h:it.h||16, rot:0, size:100, fill:it.fill||null,
           label:'', note:'', hidden:!!it.gm };
}
function newKingdom(xPct,yPct){
  const cor=KINGDOM_COLORS[Math.floor(Math.random()*KINGDOM_COLORS.length)];
  return { id:uid(), name:'Novo reino', xPct:xPct==null?50:xPct, yPct:yPct==null?50:yPct,
           color:cor, radius:16, note:'' };
}
/* Mapa atualmente aberto no editor (ou null). */
function curMap(){
  const c=S.campaign; if(!c||!Array.isArray(c.maps)||!c.maps.length) return null;
  return c.maps.find(m=>m.id===c.currentMapId) || c.maps[0];
}
/* Soma de locais (pins) em todos os mapas — usada no Painel/badges. */
function totalPins(){
  const c=S.campaign; if(!c||!Array.isArray(c.maps)) return 0;
  return c.maps.reduce((s,m)=>s+(Array.isArray(m.pins)?m.pins.length:0),0);
}
/* Garante que uma campanha carregada tenha todos os campos (migração leve). */
function sanitizeCampaign(c){
  const d=defaultCampaign();
  c=c||{};
  c.name=c.name||''; c.summary=c.summary||''; c.notes=c.notes||'';
  c.players=Array.isArray(c.players)?c.players:[];
  c.bestiary=c.bestiary||{}; c.bestiary.enemies=Array.isArray(c.bestiary.enemies)?c.bestiary.enemies:[];
  c.bestiary.npcs=Array.isArray(c.bestiary.npcs)?c.bestiary.npcs:[];
  c.loot=Array.isArray(c.loot)?c.loot:[];
  /* Mapas: migra o antigo `map` único para a coleção `maps`. */
  if(!Array.isArray(c.maps)){
    c.maps=[];
    const legacy=c.map;
    if(legacy && (legacy.image || (legacy.tokens&&legacy.tokens.length) || (legacy.pins&&legacy.pins.length))){
      const mm=newMap('regiao','rustico','Mapa principal');
      mm.image=legacy.image||null;
      mm.grid=legacy.grid||{on:false,size:48};
      mm.tokens=Array.isArray(legacy.tokens)?legacy.tokens:[];
      mm.pins=Array.isArray(legacy.pins)?legacy.pins:[];
      c.maps.push(mm);
    }
  }
  c.maps.forEach(mm=>{
    mm.grid=mm.grid||{on:false,size:48};
    mm.tokens=Array.isArray(mm.tokens)?mm.tokens:[];
    mm.pins=Array.isArray(mm.pins)?mm.pins:[];
    mm.props=Array.isArray(mm.props)?mm.props:[];
    mm.kind=mm.kind||'regiao'; mm.theme=mm.theme||'rustico'; mm.note=mm.note||'';
    mm.pins.forEach(p=>{ if(!p.icon) p.icon='📍'; });
    /* tokens antigos ganham os novos campos */
    mm.tokens.forEach(t=>{ if(t.icon==null)t.icon=''; if(t.img===undefined)t.img=null;
      if(t.size==null)t.size=100; if(t.hp===undefined)t.hp=null; if(t.hpMax===undefined)t.hpMax=null;
      if(t.hidden==null)t.hidden=false; });
    mm.props.forEach(p=>{ if(p.size==null)p.size=100; if(p.rot==null)p.rot=0;
      if(p.w==null)p.w=16; if(p.h==null)p.h=16; if(p.hidden==null)p.hidden=false; });
    /* mundo (continente + reinos) */
    mm.world=mm.world||{};
    mm.world.continent=mm.world.continent||{shape:'none',color:'#3b6b4a',rot:0,scale:100};
    mm.world.kingdoms=Array.isArray(mm.world.kingdoms)?mm.world.kingdoms:[];
  });
  delete c.map;   /* modelo antigo aposentado */
  c.currentMapId = (c.currentMapId && c.maps.some(x=>x.id===c.currentMapId)) ? c.currentMapId : (c.maps[0]?c.maps[0].id:null);
  c.diceLog=Array.isArray(c.diceLog)?c.diceLog:[];
  c.sessions=Array.isArray(c.sessions)?c.sessions:[];
  return c;
}

/* ---------- Fábricas ---------- */
function newStatblock(sys){
  const attrs={};
  (sys&&sys.attributes||[]).forEach(a=>{ attrs[a.id]=sys.startAttrValue||0; });
  return { id:uid(), name:'Novo inimigo', image:null, attrs, hp:10, hpMax:10,
           defesa:'', ataques:[], tags:[], conds:[], notes:'' };
}
function newAttack(){ return { id:uid(), nome:'Ataque', acerto:'1d20', dano:'1d6', notas:'' }; }
function newNpc(){
  return { id:uid(), name:'Novo NPC', image:null, papel:'', local:'', relacao:'neutro',
           personalidade:'', notes:'' };
}
const TOKEN_CORES={player:'#10b981', enemy:'#e11d48', npc:'#6366f1'};
function newToken(kind, label, refId){
  return { id:uid(), kind:kind||'npc', label:label||'?', refId:refId||null,
           xPct:50, yPct:50, color:TOKEN_CORES[kind]||'#94a3b8',
           icon:'', img:null, size:100, hp:null, hpMax:null, hidden:false };
}
function newPin(xPct,yPct,icon){ return { id:uid(), xPct:xPct==null?50:xPct, yPct:yPct==null?50:yPct, label:'Local', note:'', icon:icon||'📍' }; }

/* ---------- Registro de rolagens ---------- */
function logDice(res, by){
  if(!S.campaign) return;
  const entry={ id:uid(), ts:Date.now(), expr:res&&res.expr||'', by:by||'Mestre',
    total:res&&!res.erro?res.total:null, erro:res&&res.erro||null,
    detail:(typeof textoRolagem==='function')?textoRolagem(res):'',
    detalhes:(res&&!res.erro&&Array.isArray(res.detalhes))?res.detalhes:null };
  S.campaign.diceLog.unshift(entry);
  if(S.campaign.diceLog.length>60) S.campaign.diceLog.length=60;  /* mantém enxuto */
}

/* ---------- Download JSON genérico (export de ficha, etc.) ---------- */
function downloadJSON(obj, filename){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Templates de sistema (nível da CONTA) ----------
   Um sistema salvo na conta pode virar ponto de partida de outro personagem Mestre. */
function listTemplates(){ if(!S.account) return []; return loadAccountData(S.account.id).templates||[]; }
function saveSystemAsTemplate(sys, nome){
  if(!S.account) return;
  const data=loadAccountData(S.account.id);
  data.templates=data.templates||[];
  data.templates.push({ id:uid(), nome:nome||sys.name||'Sistema', createdAt:Date.now(),
    system:JSON.parse(JSON.stringify(sys)) });
  saveAccountData(S.account.id, data);
}
function deleteTemplate(id){
  if(!S.account) return;
  const data=loadAccountData(S.account.id);
  data.templates=(data.templates||[]).filter(t=>t.id!==id);
  saveAccountData(S.account.id, data);
}
