/* ============================================================ BESTIÁRIO — CRIAÇÃO RÁPIDA E LIVRE ============================================================
   Deixa montar uma criatura em dois cliques e, se quiser, ir fundo:
     • arquétipos (lobo, esqueleto, mago cultista, dragão, maldição…) × força (lacaio → chefe)
     • técnicas e magias no inimigo — o MESMO editor das técnicas dos jogadores (bola de fogo, sopro…)
     • nível/ND, deslocamento, resistências, traços, fases do chefe, ações lendárias, regra de morte
     • colar um statblock em texto (D&D em inglês ou português) e virar ficha
   Campos novos no statblock: nivel, mov, resist, tracos, habs[], fases[{pct,texto}], lendarias{n,usadas,texto}, usaMorte.
   Depende de bestiary.js, tecnicas-editor.js, conjuracao.js, classes-origens.js (habCard). */

function sbExtras(sb){
  if(!Array.isArray(sb.habs)) sb.habs=[];
  sb.habs.forEach(a=>{ if(!a.id) a.id=uid(); if(!Array.isArray(a.effects)) a.effects=[]; if(!a.req) a.req={level:0,attrs:[]}; sanitizarUsoHab(a); });
  if(!Array.isArray(sb.fases)) sb.fases=[];
  if(!sb.lendarias||typeof sb.lendarias!=='object') sb.lendarias={n:0,usadas:0,texto:''};
  ['nivel','mov','resist','tracos'].forEach(k=>{ if(typeof sb[k]!=='string') sb[k]=sb[k]==null?'':String(sb[k]); });
  sb.usaMorte=!!sb.usaMorte;
  return sb;
}

/* ---------- arquétipos ---------- */
const _hm=n=>MODELOS_TECNICA.find(m=>m.n===n);
const ARQ_CRIATURA=[
  {k:'lobo',ic:'🐺',n:'Lobo / fera',f:'soldado',tags:['fera'],mov:'12 m',tracos:'Faro e audição aguçados. Tática de matilha: vantagem se um aliado estiver perto do alvo.',atk:[['Mordida','2d4 + 2','derruba (Força CD 11)']]},
  {k:'goblin',ic:'👺',n:'Goblin',f:'lacaio',tags:['humanoide'],mov:'9 m',tracos:'Fuga ágil: pode recuar ou se esconder como ação bônus.',atk:[['Cimitarra','1d6 + 2',''],['Arco curto','1d6 + 2','24 m']]},
  {k:'esqueleto',ic:'💀',n:'Esqueleto',f:'soldado',tags:['morto-vivo'],mov:'9 m',resist:'Vulnerável: Impacto · Imune: Veneno, exaustão',tracos:'Não precisa respirar, comer nem dormir.',atk:[['Espada curta','1d6 + 2',''],['Arco curto','1d6 + 2','24 m']]},
  {k:'zumbi',ic:'🧟',n:'Zumbi',f:'soldado',tags:['morto-vivo'],mov:'6 m',resist:'Imune: Veneno',tracos:'Tenacidade de morto-vivo: ao chegar a 0, teste de Constituição (CD 5 + dano) para ficar com 1.',atk:[['Pancada','1d6 + 1','']]},
  {k:'orc',ic:'👹',n:'Orc / bruto',f:'elite',tags:['humanoide'],mov:'9 m',tracos:'Agressivo: avança até o deslocamento como ação bônus em direção a um inimigo.',atk:[['Machado grande','1d12 + 3',''],['Azagaia','1d6 + 3','9 m']]},
  {k:'bandido',ic:'🗡️',n:'Bandido / capanga',f:'lacaio',tags:['humanoide'],mov:'9 m',atk:[['Cimitarra','1d6 + 1',''],['Besta leve','1d8 + 1','24 m']]},
  {k:'aranha',ic:'🕷️',n:'Aranha gigante',f:'elite',tags:['fera'],mov:'9 m, escalada 9 m',tracos:'Anda em paredes e tetos. Sente vibrações na teia.',atk:[['Mordida venenosa','1d8 + 3','+ 2d8 veneno (Constituição CD 11 metade)']],habs:['Teia']},
  {k:'cultista',ic:'🧙',n:'Mago / cultista',f:'soldado',tags:['humanoide','conjurador'],mov:'9 m',atk:[['Adaga','1d4 + 2','']],habs:['Rajada de Fogo','Mísseis Mágicos','Escudo Arcano']},
  {k:'golem',ic:'🗿',n:'Golem / constructo',f:'elite',tags:['constructo'],mov:'6 m',resist:'Imune: Veneno, Psíquico · Resiste (½): dano físico não mágico',tracos:'Forma imutável. Resistência a magia: vantagem contra magias.',atk:[['Pancada','2d8 + 5','']]},
  {k:'espirito',ic:'👻',n:'Espírito / maldição',f:'elite',tags:['espírito','maldição'],mov:'0 m, voo 12 m (flutua)',resist:'Resiste (½): Corte, Impacto, Perfuração · Imune: Necrótico, Veneno',tracos:'Atravessa objetos e paredes. Sensível à luz do sol.',atk:[['Toque sombrio','3d6','necrótico']],habs:['Cegueira']},
  {k:'dragao',ic:'🐲',n:'Dragão jovem',f:'chefe',tags:['dragão'],mov:'12 m, voo 24 m',resist:'Imune: Fogo',tracos:'Visão às cegas 9 m. Presença aterradora.',atk:[['Mordida','2d10 + 4','+ 1d6 fogo'],['Garras','2d6 + 4','']],sopro:true,lend:2},
  {k:'chefe',ic:'👑',n:'Chefe humanoide',f:'chefe',tags:['humanoide','chefe'],mov:'9 m',tracos:'Multiataque: dois ataques por turno.',atk:[['Espada longa','1d8 + 4',''],['Comando','—','um aliado ataca como reação']],lend:3,fases:[[50,'Fica furioso: +2 em ataques, chama reforços.'],[25,'Desesperado: tenta fugir ou usa o último trunfo.']]},
];
function aplicaArquetipo(sys,sb,a){
  sbExtras(sb);
  sb.name=a.n.replace(/ \/.*$/,''); sb.tags=[...new Set([...(sb.tags||[]),...a.tags])];
  sb.mov=a.mov||''; sb.resist=a.resist||''; sb.tracos=a.tracos||'';
  const forAttr=_atrNome(sys,['Força','FOR','Forca','Físico','Corpo']);
  sb.ataques=(a.atk||[]).map(([nome,dano,nota])=>Object.assign(newAttack(),{nome,acerto:'1d20 + '+(forAttr||'0')+' + 2',dano,notas:nota||''}));
  (a.habs||[]).forEach(n=>{ const m=_hm(n); if(m) sb.habs.push(modeloEmHab(sys,m,0)); else if(n==='Teia') sb.habs.push(_habTeia(sys)); });
  if(a.sopro){ const ab=sanitizarUsoHab({id:uid(),name:'Sopro de fogo',icon:'🔥',description:'Recarrega com 5–6 no d6 no início do turno.',req:{level:0,attrs:[]},effects:[]});
    Object.assign(ab.uso,{on:true,tipo:'dano',aplicaEm:'alvo',formula:'10d6',tipoDano:'Fogo',alcance:'area',area:{forma:'cone',tam:'9'},teste:{attr:_atrNome(sys,_DEX),cd:'15',sucesso:'metade'},duracao:'recarga 5–6'}); sb.habs.push(sanitizarUsoHab(ab)); }
  if(a.lend) sb.lendarias={n:a.lend,usadas:0,texto:'Ataque (1) · Mover sem provocar (1) · Ataque de cauda/Grito (2)'};
  if(a.fases) sb.fases=a.fases.map(([pct,texto])=>({id:uid(),pct,texto,vista:false}));
  if(a.f==='chefe') sb.usaMorte=false;
  return sb;
}
function _habTeia(sys){
  const ab=sanitizarUsoHab({id:uid(),name:'Teia',icon:'🕸️',description:'Prende o alvo (escapa com Força ou Atletismo).',req:{level:0,attrs:[]},effects:[]});
  Object.assign(ab.uso,{on:true,tipo:'debuff',alcance:'distancia',area:{forma:'',tam:'9'},alvos:'1',duracao:'até escapar',teste:{attr:_atrNome(sys,_DEX),cd:'12',sucesso:'nada'}});
  ab.uso.condId=_garanteCond(sys,['Preso','🕸️','#94a3b8','Não se move; ataques contra ele têm vantagem.']);
  return sanitizarUsoHab(ab);
}

/* ---------- barra de criação (arquétipo × força + colar texto) ---------- */
function criacaoRapidaInimigo(){
  const ui=cmp(), sys=S.system, lista=S.campaign.bestiary.enemies;
  ui.arqSel=ui.arqSel||''; ui.forcaSel=ui.forcaSel||'';
  const criar=()=>{
    const a=ARQ_CRIATURA.find(x=>x.k===ui.arqSel);
    const fk=ui.forcaSel||(a?a.f:'soldado'); const m=MODELOS_INIMIGO.find(x=>x.k===fk)||null;
    const sb=sbExtras(novoInimigoModelo(sys,m)); if(a) aplicaArquetipo(sys,sb,a);
    if(m&&a) sb.tags=[...new Set([...sb.tags.filter(t=>!MODELOS_INIMIGO.some(x=>x.k===t)),m.k])];
    lista.push(sb); ui.bestAberto=ui.bestAberto||{}; ui.bestAberto[sb.id]=true; render(); focarElemento('bx-'+sb.id);
    showToast((a?a.ic:'🐉')+' '+sb.name+' criado'+(m?(' ('+m.n.toLowerCase()+')'):''));
  };
  return h('div',{class:'best-rapido'},
    h('div',{class:'hint'},'1. Que criatura?'),
    h('div',{class:'row wrapf'},...ARQ_CRIATURA.map(a=>h('button',{type:'button',class:'chip'+(ui.arqSel===a.k?' on':''),title:(a.tracos||'')+(a.habs?(' Técnicas: '+a.habs.join(', ')):''),onclick:()=>{ ui.arqSel=ui.arqSel===a.k?'':a.k; render(); }},a.ic+' '+a.n))),
    h('div',{class:'hint',style:{marginTop:'6px'}},'2. Quão forte? (vazio = o padrão da criatura)'),
    h('div',{class:'row wrapf'},...MODELOS_INIMIGO.map(m=>h('button',{type:'button',class:'chip'+(ui.forcaSel===m.k?' on':''),title:m.d,onclick:()=>{ ui.forcaSel=ui.forcaSel===m.k?'':m.k; render(); }},m.ic+' '+m.n)),
      h('button',{type:'button',class:'btn sm primary',onclick:criar},'✓ Criar'),
      h('button',{type:'button',class:'btn sm ghost',title:'Cole o bloco de estatísticas de um livro (D&D em inglês ou português) e ele vira ficha',onclick:importarStatblock},'📋 Colar statblock')));
}

/* ---------- colar statblock em texto ---------- */
async function importarStatblock(){
  const txt=await uiPrompt('Cole o bloco de estatísticas (nome na 1ª linha). Reconhece CA/AC, PV/HP, Deslocamento/Speed, os 6 atributos, Resistências/Imunidades, Nível de Desafio/Challenge e ataques "Nome. ... +5 para acertar ... 7 (1d8 + 3)".','',{titulo:'📋 Colar statblock',multiline:true,okText:'Criar'});
  if(!txt||!txt.trim()) return;
  const sb=statblockDeTexto(S.system,txt);
  S.campaign.bestiary.enemies.push(sb); const ui=cmp(); ui.bestAberto=ui.bestAberto||{}; ui.bestAberto[sb.id]=true;
  render(); focarElemento('bx-'+sb.id);
  showToast('📋 '+sb.name+': '+sb.ataques.length+' ataque(s), PV '+sb.hpMax+(sb.defesa?(', Defesa '+sb.defesa):''));
}
function statblockDeTexto(sys,txt){
  const sb=sbExtras(newStatblock(sys));
  const linhas=txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  sb.name=(linhas[0]||'Criatura').replace(/[*#_]/g,'').slice(0,60);
  const pega=re=>{ const m=txt.match(re); return m?m[1].trim():''; };
  const ca=pega(/(?:Armor Class|Classe de Armadura|\bCA\b|\bAC\b|Defesa)\s*[:\-]?\s*(\d+)/i); if(ca) sb.defesa=ca;
  const hp=pega(/(?:Hit Points|Pontos de Vida|\bPV\b|\bHP\b)\s*[:\-]?\s*(\d+)/i); if(hp){ sb.hp=sb.hpMax=parseInt(hp); }
  sb.mov=pega(/(?:Speed|Deslocamento)\s*[:\-]?\s*([^\n]+)/i).replace(/\bft\.?/g,'ft');
  const res=[], im=pega(/(?:Damage Immunities|Imunidades? a dano|Imunidades?)\s*[:\-]?\s*([^\n]+)/i), rs=pega(/(?:Damage Resistances|Resist[eê]ncias? a dano|Resist[eê]ncias?)\s*[:\-]?\s*([^\n]+)/i), vu=pega(/(?:Damage Vulnerabilities|Vulnerabilidades?)\s*[:\-]?\s*([^\n]+)/i);
  if(rs) res.push('Resiste (½): '+rs); if(im) res.push('Imune: '+im); if(vu) res.push('Vulnerável: '+vu); sb.resist=res.join(' · ');
  sb.nivel=pega(/(?:Challenge|N[ií]vel de Desafio|\bND\b|\bCR\b)\s*[:\-]?\s*([\d\/]+)/i);
  /* atributos: "STR DEX CON INT WIS CHA" seguido de "16 (+3) 12 (+1)…" ou "FOR 16 (+3)" */
  const nums=[...txt.matchAll(/\b(\d{1,2})\s*\(\s*([+\-−]\s*\d+)\s*\)/g)].map(m=>parseInt(m[1]));
  if(nums.length>=6){
    const ordem=[['Força','Strength','FOR','STR'],['Destreza','Dexterity','Agilidade','DES','DEX','AGI'],['Constituição','Constitution','Vigor','CON','VIG'],['Inteligência','Intelligence','Intelecto','INT'],['Sabedoria','Wisdom','Mente','SAB','WIS'],['Carisma','Charisma','Presença','CAR','CHA','PRE']];
    ordem.forEach((nomes,i)=>{ const a=(sys.attributes||[]).find(x=>nomes.some(n=>semAcento(n)===semAcento(x.name)||semAcento(n)===semAcento(x.abbr||'')));
      if(a){ const v=nums[i]; sb.attrs[a.id]=sys.attrMode==='modificador'?v:Math.floor((v-10)/2); } });
  }
  /* ataques */
  linhas.forEach(l=>{
    const m=l.match(/^([^.]{2,40})\.\s*(?:Melee|Ranged|Corpo a corpo|À distância|A distância|Ataque)[^+]*?([+\-]\s*\d+)\s*(?:to hit|para acertar|no ataque)?[\s\S]*?\(\s*(\d+d\d+(?:\s*[+\-]\s*\d+)?)\s*\)\s*([a-zà-ú]+)?/i);
    if(m){ sb.ataques.push(Object.assign(newAttack(),{nome:m[1].trim(),acerto:'1d20 '+m[2].replace(/\s/g,'').replace(/^\+/,'+ ').replace(/^-/,'- '),dano:m[3].replace(/\s+/g,' '),notas:m[4]||''})); return; }
    const sv=l.match(/^([^.]{2,40})\.[\s\S]*?(?:DC|CD)\s*(\d+)\s*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|For[cç]a|Destreza|Constitui[cç][aã]o|Intelig[eê]ncia|Sabedoria|Carisma)[\s\S]*?\(\s*(\d+d\d+(?:\s*[+\-]\s*\d+)?)\s*\)\s*([a-zà-ú]+)?/i);
    if(sv){ const mapa={strength:'Força',dexterity:'Destreza',constitution:'Constituição',intelligence:'Inteligência',wisdom:'Sabedoria',charisma:'Carisma'};
      const nm=mapa[sv[3].toLowerCase()]||sv[3]; const at=_atrNome(sys,[nm,...(nm==='Destreza'?_DEX:nm==='Constituição'?_CON:nm==='Sabedoria'?_SAB:[])]);
      const ab=sanitizarUsoHab({id:uid(),name:sv[1].trim(),icon:'💥',description:l.slice(0,220),req:{level:0,attrs:[]},effects:[]});
      Object.assign(ab.uso,{on:true,tipo:'dano',aplicaEm:'alvo',formula:sv[4].replace(/\s+/g,' '),tipoDano:sv[5]||'',alcance:/cone|line|linha|radius|raio|sphere|esfera/i.test(l)?'area':'distancia',area:_areaDeTexto(l),teste:{attr:at,cd:sv[2],sucesso:/half|metade/i.test(l)?'metade':'nada'}});
      sb.habs.push(sanitizarUsoHab(ab)); }
  });
  const leg=pega(/(?:Legendary Actions|A[cç][oõ]es Lend[aá]rias)[^\n]*?(\d+)/i); if(leg) sb.lendarias={n:parseInt(leg),usadas:0,texto:'veja as notas'};
  sb.notes=txt.slice(0,4000);
  return sb;
}

/* "15-foot cone" / "cone de 4,5 m" / "20-foot radius" → {forma,tam em metros} */
function _areaDeTexto(l){
  const forma=/cone/i.test(l)?'cone':/line|linha/i.test(l)?'linha':/cube|cubo/i.test(l)?'cubo':/radius|raio|sphere|esfera/i.test(l)?'circulo':'';
  const ft=l.match(/(\d+)[-\s]?(?:foot|feet|ft)/i), m=l.match(/(\d+(?:[.,]\d+)?)\s*m(?![a-zà-ú])/i);
  const tam=ft?String(Math.round(parseInt(ft[1])*0.3*10)/10):(m?m[1].replace(',','.'):'');
  return {forma,tam};
}
/* ---------- editor extra dentro do cartão do inimigo ---------- */
function statblockExtras(sys,sb){
  sbExtras(sb);
  const ui=cmp(); ui.sbAba=ui.sbAba||{}; const aba=ui.sbAba[sb.id]||'tecnicas';
  const abas=[['tecnicas','✨ Técnicas ('+sb.habs.length+')'],['perfil','🧾 Perfil'],['chefe','👑 Chefe']];
  const nav=h('div',{class:'row wrapf sb-abas'},...abas.map(([k,t])=>h('button',{type:'button',class:'btn sm '+(aba===k?'emerald':'ghost'),onclick:()=>{ui.sbAba[sb.id]=k;render();}},t)));
  let corpo;
  if(aba==='tecnicas') corpo=h('div',{},
    sb.habs.length?null:h('div',{class:'hint'},'Magias, sopros, teias, gritos… usam o mesmo editor das técnicas dos jogadores. No combate, o botão ✨ rola ataque/teste e aplica nos alvos.'),
    ...sb.habs.map(ab=>h('div',{class:'sb-hab'},habCard(sys,sb.habs,ab,{ph:'Nome da técnica'}),
      ab.uso&&ab.uso.on?h('button',{type:'button',class:'btn sm primary',title:'Rola agora (fora do combate)',onclick:()=>usarHabInimigo(sb,ab)},'🎲 Usar'):null)),
    h('div',{class:'row wrapf',style:{marginTop:'8px'}},
      h('button',{type:'button',class:'btn sm',onclick:()=>{ const ab=sanitizarUsoHab({id:uid(),name:'Nova técnica',description:'',req:{level:0,attrs:[]},effects:[]}); ab.uso.on=true; sb.habs.push(ab); S.ui.open[ab.id]=true; render(); }},'+ Técnica'),
      botoesAssistente({arr:sb.habs,habArr:sb.habs,nivel:0})),
    modelosRapidos(sys,sb.habs,0,'Pronto para usar (inclui magias de D&D):'));
  else if(aba==='perfil') corpo=h('div',{class:'grid g2'},
    field('Nível / ND',h('input',{class:'in',value:sb.nivel,placeholder:'3, 1/2, Grau 2…',onchange:e=>{sb.nivel=e.target.value;render();}})),
    field('Deslocamento',h('input',{class:'in',value:sb.mov,placeholder:'9 m, voo 18 m',onchange:e=>{sb.mov=e.target.value;render();}})),
    field('Resistências / imunidades',h('input',{class:'in',value:sb.resist,placeholder:'Imune: Fogo · Resiste: Corte',onchange:e=>{sb.resist=e.target.value;render();}})),
    h('div',{},h('button',{type:'button',class:'btn sm '+(sb.usaMorte?'emerald':'ghost'),style:{marginTop:'18px'},title:'Ao chegar a 0, segue a regra de morte do sistema (caído, testes…) em vez de morrer na hora',onclick:()=>{sb.usaMorte=!sb.usaMorte;render();}},(sb.usaMorte?'✓ ':'')+'☠ Usa a regra de morte do sistema')),
    h('div',{style:{gridColumn:'1 / -1'}},field('Traços (passivos)',h('textarea',{class:'in',rows:'2',placeholder:'Faro aguçado. Anda em paredes. Regenera 10 por turno…',onchange:e=>{sb.tracos=e.target.value;render();}},sb.tracos))));
  else corpo=h('div',{},
    h('div',{class:'hint'},'Fases: ao cair abaixo de X% da vida, o combate avisa o que muda.'),
    ...sb.fases.map(f=>h('div',{class:'row wrapf'},
      h('input',{class:'in',type:'number',min:'1',max:'99',style:{width:'70px'},value:f.pct,'aria-label':'Percentual',onchange:e=>{f.pct=Math.max(1,Math.min(99,parseInt(e.target.value)||50));render();}}),h('span',{class:'hint'},'% da vida →'),
      h('input',{class:'in',style:{flex:'1',minWidth:'200px'},value:f.texto,placeholder:'O que acontece',onchange:e=>{f.texto=e.target.value;render();}}),
      h('button',{type:'button',class:'btn mini ghost','aria-label':'Remover fase',onclick:()=>{sb.fases=sb.fases.filter(x=>x!==f);render();}},'✕'))),
    h('button',{type:'button',class:'btn sm ghost',onclick:()=>{sb.fases.push({id:uid(),pct:50,texto:'',vista:false});render();}},'+ Fase'),
    h('div',{class:'row wrapf',style:{marginTop:'10px'}},
      field('Ações lendárias por rodada',h('input',{class:'in',type:'number',min:'0',max:'9',style:{width:'70px'},value:sb.lendarias.n,onchange:e=>{sb.lendarias.n=Math.max(0,parseInt(e.target.value)||0);render();}})),
      h('div',{style:{flex:'1',minWidth:'220px'}},field('Quais',h('input',{class:'in',value:sb.lendarias.texto,placeholder:'Ataque (1) · Mover (1) · Sopro (2)',onchange:e=>{sb.lendarias.texto=e.target.value;render();}})))));
  return h('div',{class:'sb-extra'},nav,corpo);
}
/* resumo de uma linha para o cartão recolhido */
function sbResumoExtra(sb){
  sbExtras(sb); const p=[];
  if(sb.nivel) p.push('ND '+sb.nivel); if(sb.mov) p.push('🦶 '+sb.mov); if(sb.habs.length) p.push('✨ '+sb.habs.length); if(sb.lendarias.n) p.push('👑 '+sb.lendarias.n);
  return p.join(' · ');
}

/* ---------- usar técnica de inimigo fora do combate (só rola e mostra) ---------- */
function varsInimigo(sb){
  const sys=S.system, v={'Nível':parseInt(sb.nivel)||sys.startLevel||1}; v['Nivel']=v['Nível']; v[sys.levelName||'Nível']=v['Nível'];
  (sys.attributes||[]).forEach(a=>{ const raw=sb.attrs[a.id]; v[a.name]=effAttr(sys,raw!=null?raw:sys.startAttrValue); });
  let prof=2; if(sys.profFormula){ const p=evalFormula(sys.profFormula,v); if(!Number.isNaN(p)) prof=p; }
  v['Proficiência']=prof; v['Proficiencia']=prof;
  (sys.resources||[]).forEach(r=>{ const n=evalFormula(r.formula,v); if(!Number.isNaN(n)&&!(r.name in v)) v[r.name]=n; });
  return v;
}
function usarHabInimigo(sb,ab){
  const sys=S.system, us=ab.uso, v=varsInimigo(sb), p=[];
  if(us.ataque&&us.ataque.on){ const a=rolarAtaqueMagia(sys,us,v); p.push(a.txt); }
  if(String(us.formula||'').trim()){ const r=rollExpr(us.formula,v); p.push((usoTipo(us)==='cura'?'cura ':'dano ')+(r.erro?'?':r.total)+(us.tipoDano?(' '+us.tipoDano):'')); logDice({expr:sb.name+' — '+ab.name+' ('+us.formula+')',total:r.total,erro:r.erro,detalhes:r.detalhes},sb.name); }
  if(us.teste&&us.teste.attr){ const cd=evalFormula(us.teste.cd||'10',v); p.push('teste de '+us.teste.attr+' CD '+(Number.isNaN(cd)?'?':Math.round(cd))+(us.teste.sucesso==='metade'?' (metade)':'')); }
  const c=_cond(sys,us.condId); if(c) p.push('condição '+c.name);
  showToast('✨ '+sb.name+' — '+ab.name+': '+(p.join(' · ')||'usado'),5000);
}
