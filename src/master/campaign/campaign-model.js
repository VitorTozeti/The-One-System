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
function newMap(kind,theme,name){
  return { id:uid(), name:name||'Novo mapa', kind:kind||'regiao', theme:theme||'rustico',
           image:null, grid:{on:false,size:48}, tokens:[], pins:[], note:'' };
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
    mm.kind=mm.kind||'regiao'; mm.theme=mm.theme||'rustico'; mm.note=mm.note||'';
    mm.pins.forEach(p=>{ if(!p.icon) p.icon='📍'; });
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
function newToken(kind, label, refId){
  const cores={player:'#10b981', enemy:'#e11d48', npc:'#6366f1'};
  return { id:uid(), kind:kind||'npc', label:label||'?', refId:refId||null,
           xPct:50, yPct:50, color:cores[kind]||'#94a3b8' };
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
