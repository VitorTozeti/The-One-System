/* ============================================================ MODELOS ENRIQUECIDOS + AJUSTES D&D ============================================================
   Os modelos inspirados (regras-extra.js) nasciam rasos: sem rituais, sem técnicas, poucas classes
   e com a regra de morte sem recurso de Vida. Este arquivo completa cada um DEPOIS do pos() original.
   Tudo é aproximado — os livros oficiais continuam sendo a fonte (ver vault: pesquisa-sistemas).
   Também: espaços de magia por círculo (caixas) e o "pacote D&D" de atributos com regras. */

/* ---------- ajudantes (silenciosos: rodam durante a construção do sistema) ---------- */
const _meRid=(s,n)=>((s.resources||[]).find(r=>r.name===n)||{}).id||'';
const _meAid=(s,n)=>((s.attributes||[]).find(a=>a.name===n)||{}).id||'';
function vincularMorteAVida(s){ if(s.morte&&s.morte.on&&!s.morte.resId){ const id=_meRid(s,'Vida'); if(id) s.morte.resId=id; } }
function _meHb(nome,desc,lv,efs){ return {id:uid(),name:nome,description:desc||'',req:{level:lv||0,attrs:[]},effects:efs||[]}; }
const _meEf={
  res:(s,n,v)=>{ const id=_meRid(s,n); return id?{id:uid(),kind:'recurso',targetId:id,value:v}:null; },
  atr:(s,n,v)=>{ const id=_meAid(s,n); return id?{id:uid(),kind:'atributo',targetId:id,value:v}:null; },
  rol:(e,v)=>({id:uid(),kind:'rolagem',escopo:e,value:v}),
  txt:t=>({id:uid(),kind:'livre',text:t,mods:[]}),
};
const _meLimpa=a=>a.filter(Boolean);
/* técnicas de classe: [nome, descrição, nível, efeitos] */
function darTecnicas(s,classe,nome,formula,lista){
  const c=(s.classes||[]).find(x=>x.name===classe); if(!c) return;
  sanitizeArquetipo(c,'classe');
  c.tecnicas.nome=nome; c.tecnicas.formula=formula;
  c.tecnicas.opcoes=lista.map(([n,d,lv,efs])=>_meHb(n,d,lv,_meLimpa(efs||[])));
}
function novaClasse(s,nome,desc,ic,cor,habs){
  if((s.classes||[]).some(c=>c.name===nome)) return null;
  const c=sanitizeArquetipo({id:uid(),name:nome,description:desc,icon:ic,color:cor,abilities:habs.map(([n,d,lv,efs])=>_meHb(n,d,lv,_meLimpa(efs||[])))},'classe');
  s.classes.push(c); return c;
}
function novaOrigem(s,nome,desc,ic,habs){
  if((s.origins||[]).some(c=>c.name===nome)) return;
  s.origins.push(sanitizeArquetipo({id:uid(),name:nome,description:desc,icon:ic,abilities:habs.map(([n,d,lv,efs])=>_meHb(n,d,lv,_meLimpa(efs||[]))),traits:[]},'origem'));
}
function tagsSilenciosas(s,tags){
  s.tags=s.tags||[];
  tags.forEach(([n,ic,cor,cat,desc])=>{ if(!s.tags.some(t=>t.name===n)) s.tags.push({id:uid(),name:n,icon:ic,color:cor,cat,desc:desc||''}); });
}
function iconesClasses(s,mapa){ (s.classes||[]).concat(s.origins||[]).forEach(c=>{ if(mapa[c.name]) c.icon=mapa[c.name]; }); }

/* ---------- ORDEM PARANORMAL ---------- */
const NEX_PCT=[5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,99];
function enriquecerParanormal(s){
  s.progression=s.progression||{cols:[],rows:{},labels:{}}; s.progression.labels=s.progression.labels||{};
  NEX_PCT.forEach((p,i)=>{ s.progression.labels[i+1]='NEX '+p+'%'; });
  tagsSilenciosas(s,[['Sangue','🩸','#dc2626','paranormal','Emoções intensas, dor, carne.'],['Morte','💀','#525252','paranormal','Tempo, decadência, lodo.'],
    ['Energia','🌀','#a855f7','paranormal','Caos, eletricidade, mudança.'],['Conhecimento','📜','#eab308','paranormal','Sigilos, memória, ouro.'],['Medo','😱','#0f172a','paranormal','O elemento de todos os outros.']]);
  const san=(s.resources||[]).find(r=>r.name==='Sanidade'); if(san) san.teste={on:true};
  darTecnicas(s,'Ocultista','Rituais','1 + piso(Nível / 4)',[
    ['Amaldiçoar arma (Sangue)','Uma arma causa +1d6 de dano de Sangue por uma cena.',1,[_meEf.txt('+1d6 de dano de Sangue na arma')]],
    ['Decadência (Morte)','Toque que apodrece: 2d8 de dano de Morte.',1,[_meEf.txt('2d8 de dano de Morte (toque)')]],
    ['Eletrocussão (Energia)','Um raio salta da mão: 3d6 de dano de Energia.',1,[_meEf.txt('3d6 de dano de Energia')]],
    ['Compreensão paranormal (Conhecimento)','Entende qualquer idioma ou símbolo por uma cena.',1,[_meEf.txt('Entende idiomas e sigilos')]],
    ['Cinerária (Medo)','Névoa que dá +5 em testes de ritual na área.',1,[_meEf.rol('tecnica',5)]],
    ['Armadura de sangue (Sangue)','A pele endurece: +5 de Defesa.',5,[_meEf.rol('defesa',5)]],
    ['Desacelerar impacto (Morte)','Reduz o dano de uma queda ou golpe pela metade.',5,[_meEf.txt('Reduz dano pela metade (reação)')]],
    ['Contenção fantasmagórica (Energia)','Laços de energia prendem o alvo.',9,[_meEf.txt('Alvo fica imóvel (Vontade evita)')]],
  ]);
  darTecnicas(s,'Combatente','Poderes de combate','piso((Nível + 1) / 3)',[
    ['Golpe pesado','+1 dado de dano em armas corpo a corpo.',1,[_meEf.rol('dano',2)]],
    ['Tiro certeiro','+2 nos ataques à distância.',1,[_meEf.rol('ataque',2)]],
    ['Casca grossa','+1 PV por NEX.',3,[_meEf.res(s,'Vida',5)]],
    ['Ataque especial','Gasta 2 PE: +5 no ataque ou +1 dado no dano.',5,[_meEf.txt('2 PE: +5 ataque ou +1 dado de dano')]],
  ]);
  darTecnicas(s,'Especialista','Habilidades de perito','piso((Nível + 1) / 3)',[
    ['Perito','Gasta 2 PE: +1d6 num teste de perícia treinada.',1,[_meEf.txt('2 PE: +1d6 em perícia treinada')]],
    ['Eclético','Gasta 2 PE: age como treinado em qualquer perícia.',1,[_meEf.txt('2 PE: treinado em uma perícia')]],
    ['Balística avançada','+2 nos ataques com armas de fogo.',3,[_meEf.rol('ataque',2)]],
    ['Engenhosidade','+2 em todos os testes de perícia.',5,[_meEf.rol('pericia',2)]],
  ]);
  novaOrigem(s,'Militar','Serviu e aprendeu a disciplina.','🎖',[['Para bellum','+2 no dano com armas de fogo.',0,[_meEf.rol('dano',2)]]]);
  novaOrigem(s,'Atleta','Corpo treinado para competir.','🏃',[['110%','Gasta 2 PE: +5 num teste físico.',0,[_meEf.txt('2 PE: +5 em teste de Força ou Agilidade')]]]);
  novaOrigem(s,'Artista','Vive de encantar o público.','🎭',[['Magnum opus','Uma vez por missão, alguém o reconhece e ajuda.',0,[_meEf.txt('Reconhecido uma vez por missão')]]]);
  novaOrigem(s,'Religioso','A fé é seu escudo.','🙏',[['Acalentar','+5 em testes para acalmar e +1d4 de Sanidade recuperada.',0,[_meEf.res(s,'Sanidade',2)]]]);
  novaOrigem(s,'Criminoso','Conhece o submundo.','🕶',[['O crime compensa','Ganha um item extra no início de cada missão.',0,[_meEf.txt('1 item extra por missão')]]]);
  novaOrigem(s,'Médico','Salvar vidas é a profissão.','🩺',[['Técnica medicinal','Cura +1d4 PV quando usa Medicina.',0,[_meEf.txt('+1d4 PV ao curar')]]]);
  iconesClasses(s,{Combatente:'🛡',Especialista:'🔎',Ocultista:'🕯',Acadêmico:'🎓',Policial:'🚓',Investigador:'🕵'});
}

/* ---------- FEITICEIROS & MALDIÇÕES ---------- */
function enriquecerFeiticeiros(s){
  tagsSilenciosas(s,[['Energia Amaldiçoada','🟣','#7c3aed','paranormal'],['Energia Reversa','🟢','#22c55e','paranormal'],['Maldição','👹','#9f1239','criatura']]);
  const tec=[ // comuns a todos: a técnica inata é escolhida aqui
    ['Técnica inata: Manipulação de sangue','Controla o próprio sangue como lâminas e projéteis (gasta Energia).',1,[_meEf.txt('Ataque à distância de sangue: 2d8')]],
    ['Técnica inata: Fala amaldiçoada','Ordens simples que o alvo precisa obedecer (Vontade evita).',1,[_meEf.txt('Comando de uma palavra')]],
    ['Técnica inata: Projeção','Divide o movimento em quadros: age primeiro na rodada.',1,[_meEf.txt('Age primeiro na rodada')]],
    ['Técnica inata: Sombras','Guarda objetos e invoca shikigamis das sombras.',1,[_meEf.txt('Inventário nas sombras + invocação')]],
    ['Flash negro','Golpe com atraso de energia perfeito: dano ×2,5 num acerto crítico.',5,[_meEf.txt('Crítico causa ×2,5')]],
    ['Reversão de técnica','Usa a técnica com energia reversa: efeito oposto e mais forte.',9,[_meEf.rol('tecnica',3)]],
    ['Expansão de Domínio','Cria um domínio: suas técnicas acertam automaticamente lá dentro por 1 rodada.',13,[_meEf.txt('Técnicas acertam automaticamente no domínio')]],
  ];
  ['Lutador','Controlador','Suporte'].forEach(c=>darTecnicas(s,c,'Técnicas','1 + piso(Nível / 4)',tec));
  const lut=(s.classes||[]).find(c=>c.name==='Lutador'); if(lut) lut.tecnicas.opcoes.unshift(_meHb('Reforço de energia','+2 no dano corpo a corpo.',1,[_meEf.rol('dano',2)]));
  const sup=(s.classes||[]).find(c=>c.name==='Suporte'); if(sup) sup.tecnicas.opcoes.unshift(_meHb('Barreira (cortina)','Ergue uma cortina que esconde a área.',1,[_meEf.txt('Cria uma cortina')]));
  (s.classes||[]).forEach(c=>{ if(!c.abilities.some(a=>/Domínio/.test(a.name))) c.abilities.push(_meHb('Domínio simples','Anula a Expansão de Domínio inimiga enquanto se concentra.',9,[_meEf.txt('Anula domínio inimigo')])); });
  novaOrigem(s,'Corpo amaldiçoado','Nasceu de uma maldição: vê energia sem treino.','🧿',[['Olhos amaldiçoados','+2 em Percepção.',0,[_meEf.rol('pericia',2)]]]);
  novaOrigem(s,'Restrição celestial','Sem energia, mas com corpo sobre-humano.','💪',[['Corpo perfeito','+2 em Força e +6 de Vida.',0,[_meEf.atr(s,'Força',2),_meEf.res(s,'Vida',6)]]]);
  iconesClasses(s,{Lutador:'👊',Controlador:'🐺',Suporte:'💚','Clã tradicional':'🏯','Sem clã':'🌱'});
}

/* ---------- TORMENTA20 ---------- */
function enriquecerTormentoso(s){
  const MAGIAS=[ // círculo → nível mínimo: 1º 1 · 2º 5 · 3º 9 · 4º 13 · 5º 17
    ['Seta infalível (1º)','Projéteis mágicos que não erram: 2d4+2.',1,[_meEf.txt('2d4+2 de dano, acerto automático')]],
    ['Armadura arcana (1º)','+5 de Defesa até o fim da cena.',1,[_meEf.rol('defesa',5)]],
    ['Curar ferimentos (1º)','Cura 2d8+2 PV.',1,[_meEf.txt('Cura 2d8+2')]],
    ['Bola de fogo (2º)','Explosão: 6d6 de fogo em área (Reflexos reduz à metade).',5,[_meEf.txt('6d6 fogo em área')]],
    ['Invisibilidade (2º)','Fica invisível até atacar.',5,[_meEf.txt('Invisível')]],
    ['Relâmpago (3º)','Raio em linha: 8d6.',9,[_meEf.txt('8d6 elétrico em linha')]],
    ['Muralha de energia (4º)','Parede intransponível.',13,[_meEf.txt('Muralha')]],
    ['Desejo (5º)','Muda a realidade (com cuidado).',17,[_meEf.txt('Desejo')]],
  ];
  darTecnicas(s,'Arcanista','Magias','2 + piso(Nível / 2)',MAGIAS);
  const D=(n,d,ic,cor,hab,tec)=>{ const c=novaClasse(s,n,d,ic,cor,hab); if(c&&tec) { c.tecnicas.nome=tec[0]; c.tecnicas.formula=tec[1]; c.tecnicas.opcoes=tec[2].map(([a,b,lv,e])=>_meHb(a,b,lv,_meLimpa(e||[]))); } };
  D('Bárbaro','Fúria que o torna quase imparável.','🪓','#9a3412',[['Fúria','+2 em ataques e dano corpo a corpo durante a fúria.',1,[_meEf.txt('Fúria: +2 ataque e dano')]],['Instinto selvagem','+1 em Percepção e Reflexos.',3,[_meEf.rol('pericia',1)]]]);
  D('Bardo','Inspira aliados com música e palavras.','🎻','#be185d',[['Inspiração','Aliados ganham +1 nos testes.',1,[_meEf.rol('todos',1)]]],['Magias','1 + piso(Nível / 2)',MAGIAS.slice(0,5)]);
  D('Caçador','Rastreador e mestre do ermo.','🏹','#15803d',[['Marca da presa','+1d4 de dano contra a presa marcada.',1,[_meEf.txt('+1d4 contra a presa')]],['Rastreador','+2 em Sobrevivência.',1,[_meEf.rol('pericia',2)]]]);
  D('Cavaleiro','Guarda-costas de armadura pesada.','🛡','#1e40af',[['Baluarte','+2 de Defesa.',1,[_meEf.rol('defesa',2)]],['Código de honra','Não ataca desprevenidos.',1,[]]]);
  D('Clérigo','Servo de um deus.','✨','#ca8a04',[['Devoto','Recebe um poder concedido.',1,[_meEf.res(s,'Mana',2)]]],['Magias divinas','2 + piso(Nível / 2)',MAGIAS.filter(m=>/Curar|Armadura|Muralha|Desejo/.test(m[0]))]);
  D('Paladino','Campeão sagrado.','⚜','#a16207',[['Golpe divino','Gasta 2 PM: +1d8 de dano.',1,[_meEf.txt('2 PM: +1d8 de dano')]],['Cura pelas mãos','Cura 1d8 PV por PM gasto.',2,[_meEf.txt('Cura 1d8 por PM')]]]);
  D('Lutador','Briga com os punhos.','👊','#b91c1c',[['Briga','Ataque desarmado causa 1d6.',1,[_meEf.txt('Desarmado 1d6')]],['Golpe relâmpago','Ataque extra desarmado.',5,[_meEf.txt('Ataque extra')]]]);
  novaOrigem(s,'Halfling','Pequeno, sortudo e ágil.','🍀',[['Sorte salvadora','Rerrola um teste por dia.',0,[_meEf.txt('Rerrolar 1×/dia')]]]);
  novaOrigem(s,'Minotauro','Força bruta e chifres.','🐂',[['Chifres','Ataque natural 1d6.',0,[_meEf.atr(s,'Força',1)]]]);
  novaOrigem(s,'Qareen','Descendente de gênios.','🧞',[['Desejos','+1 PM por nível de magia.',0,[_meEf.res(s,'Mana',2)]]]);
  iconesClasses(s,{Guerreiro:'⚔',Arcanista:'🔮',Ladino:'🗡',Humano:'🧑',Anão:'⛏',Elfo:'🧝'});
}

/* liga os enriquecimentos aos modelos existentes */
(function(){
  if(typeof MODELOS_SISTEMA==='undefined') return;
  const liga=(k,fn,desc)=>{ const m=MODELOS_SISTEMA.find(x=>x.k===k); if(!m) return;
    const pos0=m.pos; m.pos=s=>{ if(pos0) pos0(s); fn(s); vincularMorteAVida(s); }; if(desc) m.desc=desc; };
  liga('paranormal',enriquecerParanormal,'Agentes contra o Outro Lado: 5 atributos, pool “melhor de N d20”, PV/PE/Sanidade (com teste), NEX de 5% a 99%, 3 classes com rituais e poderes, 9 origens e os 5 elementos. Aproximado — confira no livro.');
  liga('feiticeiros',enriquecerFeiticeiros,'Jujutsu: 6 atributos com modificador, d20, Energia Amaldiçoada, graus de feiticeiro, técnicas inatas (sangue, fala, projeção, sombras), Flash negro e Expansão de Domínio. Aproximado — confira no livro.');
  liga('tormentoso',enriquecerTormentoso,'Fantasia brasileira d20: 6 atributos, d20 + ½ nível, PV/PM, 10 classes, magias por círculo (travadas por nível), 6 raças. Aproximado — confira no livro.');
  /* qualquer modelo com morte ligada ganha o recurso de Vida */
  MODELOS_SISTEMA.forEach(m=>{ if(['paranormal','feiticeiros','tormentoso'].includes(m.k)) return;
    const pos0=m.pos; m.pos=s=>{ if(pos0) pos0(s); vincularMorteAVida(s); }; });
})();

/* ---------- D&D: dado de vida por classe ---------- */
const DADO_VIDA={Guerreiro:10,'Bárbaro':12,Mago:6,Feiticeiro:6,Ladino:8,'Clérigo':8,Bardo:8,Druida:8,Arqueiro:10,Patrulheiro:10,Paladino:10,Monge:8,Bruxo:8,Artífice:8};
function vidaPorDadoDeVida(s,c){
  const dv=DADO_VIDA[c.name]; const vida=(s.resources||[]).find(r=>/^(vida|pv|hp|pontos de vida)$/i.test(r.name)); if(!dv||!vida) return;
  const con=((s.attributes||[]).find(a=>/constitui|vigor/i.test(a.name))||{}).name||'0';
  const f=dv+' + '+con+' + (Nível - 1) * ('+(dv/2+1)+' + '+con+')';
  c.recursos=(c.recursos||[]).filter(r=>r.resId!==vida.id); c.recursos.push({id:uid(),resId:vida.id,modo:'substitui',formula:f});
}
/* pacote "D&D (6)" completo: atributos 8–15 com modificador, compra de pontos, proficiência e Vida por nível */
function aplicarRegrasDnD(s){
  s.attrMode='modificador'; s.modFormula='(V - 10) / 2';
  s.startAttrValue=8; s.attrMin=8; s.attrMax=15; s.allowDump=false; s.attributePoints=24;   /* ≈ matriz padrão 15,14,13,12,10,8 */
  s.profMode='mult'; s.profFormula='2 + piso((Nível - 1) / 4)';
  if(!(s.profTiers||[]).some(t=>t.mult===1)) s.profTiers=[['Destreinado',0],['Metade',0.5],['Proficiente',1],['Especialista',2]].map(([n,m])=>({id:uid(),name:n,mult:m,bonus:0}));
  const con=((s.attributes||[]).find(a=>/constitui/i.test(a.name))||{}).name, des=((s.attributes||[]).find(a=>/destreza/i.test(a.name))||{}).name;
  const vida=(s.resources||[]).find(r=>/^(vida|pv|hp|pontos de vida)$/i.test(r.name));
  if(vida&&con) vida.formula='8 + '+con+' + (Nível - 1) * (5 + '+con+')';
  const def=(s.resources||[]).find(r=>/^(defesa|ca)$/i.test(r.name));
  if(def&&des) def.formula='10 + '+des;
  s.dndVida=true; (s.classes||[]).forEach(c=>vidaPorDadoDeVida(s,c));
}
/* espaços de magia por círculo como caixas (D&D/T20): recupera no descanso longo */
const ESPACOS_CIRCULO=[
  ['1º círculo','min(4, Nível + 1)'],['2º círculo','(Nível >= 3) * min(3, Nível - 1)'],['3º círculo','(Nível >= 5) * min(3, Nível - 3)'],
  ['4º círculo','(Nível >= 7) * min(3, Nível - 6)'],['5º círculo','(Nível >= 9) * min(3, Nível - 8)'],
];
function criarEspacosDeMagia(s){
  pushUndo(); let n=0;
  ESPACOS_CIRCULO.forEach(([c,f])=>{ const nome='Espaços '+c;
    if(s.resources.some(r=>r.name===nome)) return;
    s.resources.push({id:uid(),name:nome,type:'barra',formula:f,color:'#8b5cf6',icon:'✨',visual:'caixas',contador:false,start:'',recharge:{trig:'longo',amt:'tudo',formula:''},perRound:''}); n++; });
  showToast(n?('✨ '+n+' recursos de espaços de magia criados (caixas, recuperam no descanso longo)'):'Os espaços de magia já existem');
}
