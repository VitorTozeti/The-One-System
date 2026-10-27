/* ============================================================ CLASSES E ORIGENS — EDITOR ============================================================
   Mesmo espírito da aba Perícias: lista de cartões à esquerda, editor à direita.
   Uma CLASSE tem: identidade (ícone/cor), fórmulas próprias de recurso, habilidades
   que chegam sozinhas em cada nível e um banco de TÉCNICAS que o jogador escolhe
   (quantas = fórmula da classe + "técnica extra" de qualquer fonte).
   Uma ORIGEM tem: identidade + visual (aparência, tamanho), TRAÇOS FÍSICOS com efeito
   (Asas → Voo), habilidades por nível e ajustes de recurso.
   O motor está em src/data/arquetipos.js; os efeitos usam effectRow (master-pieces). */

const CODIGO_EXEMPLO=
`// Roda a cada cálculo da ficha. Use fx.* para mexer no personagem.
// Exemplo: Fúria — a partir do nível 5, +2 de dano e resistência a corte.
if (fx.nivel >= 5) {
  fx.rolagem('dano', 2);
  fx.resistencia('Corte', 3);
  fx.nota('Fúria ativa: +2 dano, −3 de dano de corte recebido.');
}`;
/* ---------- receitas rápidas: um clique adiciona um efeito comum já configurado ---------- */
function _recPor(sys,nomes){ for(const n of nomes){ const r=_acha(sys.resources,n); if(r) return r; } return null; }
function receitasEfeito(sys){
  const vida=_recPor(sys,['Vida','PV','HP','Pontos de Vida']);
  const mana=_recPor(sys,['Mana','PM','Energia','PE','Pontos de Mana']);
  return [
    ['⚔ +2 em ataques',()=>({kind:'rolagem',escopo:'ataque',value:2})],
    ['💥 +2 de dano',()=>({kind:'rolagem',escopo:'dano',value:2})],
    ['🛡 +2 de defesa',()=>({kind:'rolagem',escopo:'defesa',value:2})],
    vida?['❤️ +1 '+vida.name+' por nível',()=>({kind:'recurso',targetId:vida.id,value:0,formula:'Nível'})]:null,
    mana?['🔷 +1 '+mana.name+' por nível',()=>({kind:'recurso',targetId:mana.id,value:0,formula:'Nível'})]:null,
    ['✨ Recurso especial (cargas)',()=>({kind:'recursoNovo',text:'Cargas',value:3,icon:'⚡',recarga:'longo',color:'#f59e0b'})],
    ['🛡 Defesa +1 a cada 3 níveis',()=>({kind:'rolagem',escopo:'defesa',value:0,formula:'piso(Nível / 3)'})],
    ['🔥 Resistência a fogo 5',()=>({kind:'resistencia',modo:'reduz',text:'Fogo',value:5})],
    ['☠️ Imune a veneno',()=>({kind:'resistencia',modo:'imune',text:'Veneno',value:0})],
    ['🪽 Voo 9 m',()=>({kind:'capacidade',text:'Voo',value:9})],
    ['👁 Visão no escuro 18 m',()=>({kind:'capacidade',text:'Visão no escuro',value:18})],
    ['🌊 Natação 9 m',()=>({kind:'capacidade',text:'Natação',value:9})],
    ['🌀 +1 técnica de classe',()=>({kind:'tecnicas',value:1})],
    ['🎲 +1 dado em perícias',()=>({kind:'dados',escopo:'pericia',value:1})],
    ['⌨ Efeito por código',()=>({kind:'codigo',text:'Efeito especial',code:CODIGO_EXEMPLO})],
  ].filter(Boolean);
}
/* chips das receitas mais comuns + lista completa — tudo visível, nada escondido num select só */
function receitaSelect(sys,arr){
  const rs=receitasEfeito(sys);
  const add=i=>{ const r=rs[i]; if(r){ arr.push(Object.assign({id:uid(),targetId:'',value:0,text:'',charType:'tag',mods:[]},r[1]())); render(); } };
  const sel=h('select',{class:'in rec-sel','aria-label':'Mais efeitos prontos',onchange:e=>{ const i=+e.target.value; if(!Number.isNaN(i)&&e.target.value!=='') add(i); }},
    h('option',{value:''},'✨ Mais efeitos prontos…'), ...rs.map((r,i)=>h('option',{value:String(i)},r[0])));
  return h('div',{class:'row wrapf rec-bar'},
    ...rs.slice(0,4).map((r,i)=>h('button',{type:'button',class:'chip rec-chip',title:'Adicionar este efeito',onclick:()=>add(i)},'+ '+r[0])), sel);
}

/* ---------- cartão de habilidade/técnica/traço (recolhível) ---------- */
function habCard(sys,arr,ab,opts){
  opts=opts||{};
  if(!ab.effects) ab.effects=[];
  if(!ab.req) ab.req={level:0,attrs:[]};
  if(!opts.semUso) sanitizarUsoHab(ab);
  const aberto=!!S.ui.open[ab.id];
  const fx=ab.effects.map(ef=>effectLabel(sys,ef)).filter(Boolean);
  const usoTxt=(!opts.semUso&&ab.uso&&ab.uso.on)?usoHabResumo(sys,ab):'';
  const cab=h('div',{class:'hab-cab',onclick:e=>{ if(e.target.closest('input,button,select')) return; S.ui.open[ab.id]=!aberto; render(); }},
    h('span',{class:'acc-caret'},aberto?'▼':'▶'),
    iconePicker(ab.icon||'',v=>{ab.icon=v;},{cls:'hab-ic'}),
    h('input',{class:'in hab-nome',value:ab.name||'',placeholder:opts.ph||'Nome',oninput:e=>{ab.name=e.target.value;persist();},onchange:()=>render()}),
    opts.nivel?h('label',{class:'hab-nv',title:'A partir de qual nível'},h('span',{},(sys.levelName||'Nível').slice(0,3)+'.'),
      h('input',{class:'in',type:'number',min:'0',value:ab.req.level||0,onchange:e=>{ab.req.level=Math.max(0,parseInt(e.target.value)||0);render();}})):null,
    h('button',{class:'btn sm ghost',type:'button',title:'Duplicar',onclick:()=>{ const c=JSON.parse(JSON.stringify(ab)); c.id=uid(); c.name=(ab.name||'')+' (cópia)'; (c.effects||[]).forEach(x=>x.id=uid()); arr.splice(arr.indexOf(ab)+1,0,c); render(); }},'⧉'),
    h('button',{class:'btn sm danger',type:'button','aria-label':'Excluir',onclick:()=>comDesfazer('“'+(ab.name||'item')+'” excluído',()=>{ const i=arr.indexOf(ab); if(i>=0) arr.splice(i,1); })},'✕'));
  const resumo=!aberto?h('div',{class:'hab-res'},
      ab.description?h('span',{class:'hab-d'},ab.description):null,
      usoTxt?h('span',{class:'tg-fx tg-uso'},usoTxt):null,
      ...fx.map(t=>h('span',{class:'tg-fx'},t)),
      ...((opts.nivel?[]:reqTags(sys,ab)).map(t=>h('span',{class:'tg-req'},'🔒 '+t)))):null;
  /* corpo em 3 abas: o que é · o que vale sempre · o botão na ficha (antes era tudo empilhado) */
  const temUso=!opts.semUso, usoOn=!!(temUso&&ab.uso&&ab.uso.on);
  const aba=S.ui['habTab_'+ab.id]||(usoOn?'uso':(ab.effects.length?'fx':'basico'));
  const tb=(k,t)=>h('button',{type:'button',role:'tab','aria-selected':aba===k?'true':'false',class:'hab-tab'+(aba===k?' on':''),onclick:()=>{S.ui['habTab_'+ab.id]=k;render();}},t);
  let conteudo;
  if(aba==='fx') conteudo=h('div',{},
      h('div',{class:'hint',style:{marginBottom:'6px'}},usoOn&&ab.uso.modo==='ativa'?'Valem ENQUANTO a técnica estiver ligada.':'Valem o TEMPO TODO: +atributo, +Vida, resistência, voo, +técnica… Escolha um pronto ou monte o seu.'),
      ...ab.effects.map(ef=>effectRow(sys,ab.effects,ef,0)),
      h('div',{class:'row wrapf',style:{marginTop:'6px'}},
        receitaSelect(sys,ab.effects),
        h('button',{class:'btn sm ghost',type:'button',onclick:()=>{ab.effects.push(newEffect(sys));render();}},'+ Efeito em branco')));
  else if(aba==='uso'&&temUso) conteudo=(typeof usoBlocos==='function'&&!S.ui.usoDetalhado)?usoBlocos(sys,ab):usoHabEditor(sys,ab);   /* blocos-uso.js */
  else conteudo=h('div',{},
      h('textarea',{class:'in',rows:'2',value:ab.description||'',placeholder:'O que é, em uma frase (aparece na ficha)',oninput:e=>{ab.description=e.target.value;persist();}}),
      opts.semReq?null:reqEditor(sys,ab,!!opts.nivel),
      h('div',{class:'hab-guia'},
        h('button',{type:'button',class:'hab-guia-op',onclick:()=>{S.ui['habTab_'+ab.id]='fx';render();}},h('b',{},'⚙️ Passiva'),h('small',{},'Bônus que sempre valem (+2 Defesa, voo, resistência)')),
        temUso?h('button',{type:'button',class:'hab-guia-op',onclick:()=>{ if(ab.uso) ab.uso.on=true; S.ui['habTab_'+ab.id]='uso';render();}},h('b',{},'🪄 Ação'),h('small',{},'Botão na ficha: magia, ataque, cura, invocação')):null));
  const corpo=aberto?h('div',{class:'hab-corpo'},
      h('div',{class:'hab-frase'},typeof habFrase==='function'?habFrase(sys,ab):''),
      h('div',{class:'hab-tabs',role:'tablist'},tb('basico','✏️ O que é'),tb('fx','⚙️ Sempre ativo'+(ab.effects.length?(' ('+ab.effects.length+')'):'')),temUso?tb('uso','🪄 Ação na ficha'+(usoOn?' ✓':'')):null),
      conteudo):null;
  return h('div',{class:'hab'+(aberto?' on':'')}, cab, resumo, corpo);
}

/* ---------- catálogo com mecânica de verdade ----------
   Atributos e recursos são achados pelo nome (Vida/PV/HP…); o que não existir no
   sistema simplesmente fica de fora — a peça entra com o que der. */
function _efAttr(sys,nomes,v){ for(const n of nomes){ const a=_acha(sys.attributes,n); if(a) return {kind:'atributo',targetId:a.id,value:v}; } return null; }
function _efRecF(sys,nomes,f){ const r=_recPor(sys,nomes); return r?{kind:'recurso',targetId:r.id,value:0,formula:f}:null; }
const _V=['Vida','PV','HP','Pontos de Vida'], _M=['Mana','PM','Energia','PE','Pontos de Mana'];
const _rol=(e,v)=>({kind:'rolagem',escopo:e,value:v}), _res=(t,m,v)=>({kind:'resistencia',text:t,modo:m,value:v||0});
const _cap=(n,v)=>({kind:'capacidade',text:n,value:v||0}), _dad=(e,v)=>({kind:'dados',escopo:e,value:v}), _txt=t=>({kind:'livre',text:t,mods:[]});
const CATALOGO_CLASSES2=[
  {n:'Guerreiro',ic:'⚔️',c:'#b91c1c',d:'Combate corpo a corpo e resistência física.',rec:[[_V,'substitui','Base + Nível * 2']],
   tec:['Manobras','1 + piso(Nível / 2)'],
   hab:s=>[[1,'Treino de combate','Anos de prática com todo tipo de arma.',[_rol('ataque',1)]],[3,'Pele calejada','Golpes físicos machucam menos.',[_res('Físico','reduz',2)]],
           [5,'Ataque extra','Ataca duas vezes quando usa a ação de atacar.',[_txt('Ataque extra')]],[10,'Indomável','Uma vez por descanso, rerrola um teste que falhou.',[]]],
   opc:s=>[['Golpe poderoso','Troca precisão por força bruta.',[_rol('dano',2)]],['Postura defensiva','Guarda alta o tempo todo.',[_rol('defesa',2)]],
           ['Mestre de armas','Domínio total das armas.',[_rol('ataque',1)]],['Vigor de batalha','Aguenta muito mais castigo.',[_efRecF(s,_V,'Nível')]],['Pele de ferro','Quase nada atravessa.',[_res('Físico','reduz',3)],5]]},
  {n:'Mago',ic:'🔮',c:'#4f46e5',d:'Estuda e domina a magia.',rec:[[_M,'substitui','Base + Nível * 3']],
   tec:['Magias','Nível + 1'],
   hab:s=>[[1,'Grimório','Prepara magias a partir do livro.',[]],[5,'Magia potente','Suas magias ficam mais fortes.',[_rol('tecnica',2)]],[10,'Mente blindada','Ataques mentais pegam pela metade.',[_res('Psíquico','metade')]]],
   opc:s=>[['Bola de fogo','Explosão em área (3º círculo).',[_txt('Dano de fogo em área')],5],['Raio de gelo','Projétil que deixa o alvo lento.',[_txt('Dano de frio + Lento')]],
           ['Escudo arcano','Barreira de força.',[_rol('defesa',2)]],['Voar','Levita e se move pelo ar.',[_cap('Voo',9)],5],['Visão arcana','Enxerga no escuro.',[_cap('Visão no escuro',18)]]]},
  {n:'Ladino',ic:'🗡️',c:'#334155',d:'Furtivo, ágil e esperto; vive de golpes certeiros.',
   tec:['Truques','1 + piso(Nível / 3)'],
   hab:s=>[[1,'Ataque furtivo','Dano extra contra quem está desprevenido.',[_dad('dano',1)]],[5,'Esquiva sobrenatural','Reduz à metade o dano de um ataque que vê.',[_res('Físico','metade')]],[9,'Evasão','Escapa ileso de explosões.',[]]],
   opc:s=>[['Mãos leves','Furtos e truques de mão.',[_dad('pericia',1)]],['Passo sombrio','Some nas sombras.',[_txt('Esconde-se como ação bônus')]],
           ['Lâmina envenenada','Veneno na arma.',[_rol('dano',2)]],['Acrobata','Sobe em qualquer coisa.',[_cap('Escalada',9)]]]},
  {n:'Clérigo',ic:'✨',c:'#ca8a04',d:'Canaliza o poder divino para curar e proteger.',rec:[[_V,'soma','Nível']],
   tec:['Milagres','Nível'],
   hab:s=>[[1,'Canalizar divindade','Usa a fé como arma ou cura.',[]],[5,'Proteção divina','Trevas não o tocam como antes.',[_res('Necrótico','metade')]]],
   opc:s=>[['Curar ferimentos','Toca um aliado e fecha feridas.',[_txt('Cura um aliado')]],['Bênção','Aliados próximos ficam mais certeiros.',[_rol('todos',1)]],['Escudo da fé','Uma aura protege o corpo.',[_rol('defesa',2)]]]},
  {n:'Bárbaro',ic:'🪓',c:'#9a3412',d:'Força bruta movida pela fúria.',rec:[[_V,'substitui','Base + Nível * 3']],
   tec:['Instintos','piso(Nível / 2)'],
   hab:s=>[[1,'Fúria','Entra em fúria: mais dano e resistência física (efeito por código).',[{kind:'codigo',text:'Fúria',code:CODIGO_EXEMPLO.replace('fx.nivel >= 5','fx.nivel >= 1')}]],[5,'Movimento rápido','Corre mais que todos.',[{kind:'caracteristica',charType:'num',text:'Deslocamento',value:3}]]],
   opc:s=>[['Totem do urso','Aguenta quase tudo em fúria.',[_res('Físico','metade')]],['Totem da águia','Vê longe e salta alto.',[_cap('Visão no escuro',9)]]]},
  {n:'Arqueiro',ic:'🏹',c:'#15803d',d:'Mestre do combate à distância.',tec:['Tiros especiais','Nível'],
   hab:s=>[[1,'Olho de águia','Pontaria afiada.',[_rol('ataque',2)]],[5,'Passo leve','Move-se sem ser notado na mata.',[_cap('Escalada',6)]],[9,'Chuva de flechas','Dois disparos por ação.',[_txt('Dois disparos por ação')]]],
   opc:s=>[['Tiro preciso','Mira com calma e acerta o ponto fraco.',[_dad('ataque',1)]],['Flecha explosiva','Estoura no alvo e em quem está perto.',[_txt('Dano em área pequena')]],['Disparo atordoante','Derruba o equilíbrio do alvo.',[_txt('Alvo perde o próximo movimento')],3]]},
  {n:'Bardo',ic:'🎻',c:'#be185d',d:'Inspira aliados e encanta com palavras e música.',rec:[[_M,'soma','Nível * 2']],tec:['Canções','1 + piso(Nível / 2)'],
   hab:s=>[[1,'Inspiração','Aliados ouvindo você ficam mais certeiros.',[_rol('todos',1)]],[5,'Voz de comando','Suas palavras pesam.',[_dad('pericia',1)]],[10,'Mestre da arte','Domina qualquer instrumento.',[_rol('pericia',2)]]],
   opc:s=>[['Canção de coragem','Afasta o medo do grupo.',[_res('Medo','metade')]],['Melodia de cura','Acalma e fecha feridas.',[_txt('Cura aliados próximos')]],['Acorde discordante','Machuca quem escuta.',[_rol('tecnica',2)]]]},
  {n:'Druida',ic:'🌿',c:'#4d7c0f',d:'Fala com a natureza e muda de forma.',rec:[[_V,'soma','Nível']],tec:['Formas e magias','1 + piso(Nível / 2)'],
   hab:s=>[[1,'Elo com a natureza','Animais não o atacam sem motivo.',[]],[4,'Forma selvagem','Assume a forma de um animal.',[_txt('Transforma-se em animal')]],[8,'Pele de casca','Madeira viva protege o corpo.',[_res('Físico','reduz',2)]]],
   opc:s=>[['Garras de urso','Forma de combate.',[_rol('dano',2)]],['Asas de águia','Forma voadora.',[_cap('Voo',12)],4],['Cura das folhas','Folhas fecham feridas.',[_txt('Cura um aliado')]]]},
  {n:'Paladino',ic:'🛡️',c:'#0369a1',d:'Guerreiro sagrado movido por um juramento.',rec:[[_V,'substitui','Base + Nível * 2']],tec:['Juramentos','piso(Nível / 2)'],
   hab:s=>[[1,'Aura de proteção','Aliados próximos se sentem seguros.',[_rol('defesa',1)]],[3,'Mãos sagradas','Cura com o toque.',[_txt('Cura um aliado')]],[6,'Aura de coragem','Imune ao medo.',[_res('Medo','imune')]]],
   opc:s=>[['Golpe divino','O ataque brilha.',[_rol('dano',2)]],['Escudo sagrado','Uma luz bloqueia o golpe.',[_rol('defesa',2)]],['Punir o mal','Mais dano contra o profano.',[_rol('ataque',2)]]]},
  {n:'Detetive',ic:'🕵️',c:'#57534e',d:'Investiga pistas e desvenda mistérios.',tec:['Métodos','1 + piso(Nível / 3)'],
   hab:s=>[[1,'Olho clínico','Nota o que ninguém notou.',[_dad('pericia',1)]],[5,'Dedução','Liga os pontos e acerta o alvo.',[_rol('pericia',2)]],[9,'Mente fria','Nada o abala.',[_res('Medo','metade'),_res('Psíquico','metade')]]],
   opc:s=>[['Interrogatório','Pressão certeira.',[_rol('pericia',1)]],['Reconstituição','Revive a cena do crime.',[_txt('Pergunta ao Mestre sobre a cena')]]]},
  /* ---- Pacote isekai / anime (mundos que NÃO são D&D): reino, espíritos, contratos, loops ---- */
  {n:'Cavaleiro Real',ic:'🛡️',c:'#1d4ed8',d:'Guerreiro juramentado a uma casa ou reino: armadura, honra e disciplina.',tec:['Estilos de espada','1 + piso(Nível / 3)'],
   hab:s=>[[1,'Juramento da guarda','Treino de armadura e escudo: protege quem está por perto.',[_rol('defesa',2)]],[3,'Estilo de espada','Domínio técnico da arma.',[_rol('ataque',1)]]],
   opc:s=>[['Estocada rápida','Golpe veloz e preciso.',[_rol('ataque',2)]],['Muralha','Fica entre o perigo e os aliados.',[_rol('defesa',2)]],['Corte de honra','Mais dano contra quem ataca inocentes.',[_rol('dano',2)]]]},
  {n:'Espiritualista',ic:'🔮',c:'#7c3aed',d:'Faz contrato com espíritos e usa magia pela afinidade com a natureza.',tec:['Magias de espírito','Nível + 1'],
   hab:s=>[[1,'Pacto com um espírito','Um espírito menor acompanha e ajuda nas magias.',[_rol('tecnica',1)]],[5,'Sintonia','Magias ficam mais fortes ao lado do espírito.',[_rol('tecnica',2)]]],
   opc:s=>[['Lâmina de vento','Corte de ar condensado.',[_txt('Dano cortante à distância')]],['Névoa protetora','Esconde e protege o grupo.',[_rol('defesa',2)]],['Cura espiritual','O espírito fecha feridas.',[_txt('Cura um aliado')]]]},
  {n:'Curandeiro',ic:'💚',c:'#16a34a',d:'Cuida dos feridos e mantém o grupo de pé.',tec:['Artes de cura','Nível'],
   hab:s=>[[1,'Mãos que curam','Estabiliza ferimentos com o toque.',[_txt('Cura um aliado')]],[5,'Cuidado constante','Aliados próximos aguentam mais.',[_rol('defesa',1)]]],
   opc:s=>[['Cura em área','Fecha feridas de todos ao redor.',[_txt('Cura aliados próximos')]],['Antídoto','Remove veneno e doença.',[_res('Veneno','imune')]]]},
  {n:'Mercenário',ic:'⚔️',c:'#b45309',d:'Luta por quem paga. Prático, durão e sem frescura.',tec:['Truques sujos','piso(Nível / 2) + 1'],
   hab:s=>[[1,'Instinto de sobrevivência','Sabe a hora certa de recuar ou de atacar.',[_rol('ataque',1)]],[4,'Pele grossa','Já apanhou demais para se abalar.',[_res('Físico','reduz',1)]]],
   opc:s=>[['Golpe baixo','Aproveita a abertura.',[_dad('dano',1)]],['Provocação','Atrai a atenção do inimigo.',[_rol('pericia',1)]]]},
  {n:'Forasteiro (Retornante)',ic:'🕰️',c:'#0f766e',d:'Alguém de outro mundo, sem poder especial além de insistir. Cada fracasso ensina algo.',tec:['Lições do retorno','1 + piso(Nível / 2)'],
   hab:s=>[[1,'Memória do que já aconteceu','Lembra de coisas que "ainda não" aconteceram.',[_rol('pericia',1)]],[3,'Teimosia','Não desiste: rerrola um teste por sessão.',[_txt('Rerrola 1 teste por sessão')]]],
   opc:s=>[['Reconhecer o padrão','Percebe o que se repete.',[_rol('pericia',1)]],['Segunda chance','Evita um erro que já cometeu.',[_rol('defesa',2)]]]},
];
const CATALOGO_ORIGENS2=[
  {n:'Humano',ic:'🧑',c:'#b45309',d:'Versátil e adaptável, de qualquer lugar do mundo.',hab:s=>[[0,'Versátil','Aprende de tudo um pouco.',[{kind:'tecnicas',value:1}]]]},
  {n:'Elfo',ic:'🧝',c:'#15803d',d:'Longevo, gracioso e ligado à natureza e à magia.',ap:'Orelhas pontudas, traços finos, olhos brilhantes.',
   tr:s=>[['👁','Olhos élficos','Enxerga no escuro.',[_cap('Visão no escuro',18)]],['🌙','Sangue feérico','Não pode ser posto para dormir por magia.',[_res('Sono','imune')]]],
   hab:s=>[[0,'Graça élfica','Movimentos precisos.',[_efAttr(s,['Agilidade','Destreza','AGI','DES'],1)]]]},
  {n:'Anão',ic:'⛏️',c:'#78350f',d:'Robusto, teimoso e mestre de pedra e metal.',ap:'Baixo, largo e barbudo.',tam:'pequeno',
   tr:s=>[['🪨','Corpo denso','Aguenta mais do que parece.',[_efRecF(s,_V,'Nível')]],['👁','Visão das minas','Enxerga no escuro.',[_cap('Visão no escuro',18)]]],
   hab:s=>[[0,'Estômago de ferro','Venenos fazem metade do efeito.',[_res('Veneno','metade')]]]},
  {n:'Alado',ic:'🪽',c:'#0ea5e9',d:'Descendentes de seres do céu.',ap:'Grandes asas emplumadas nas costas.',
   tr:s=>[['🪽','Asas','Voa livremente.',[_cap('Voo',9)]]],hab:s=>[[5,'Mergulho','Ataque em mergulho causa mais dano.',[_rol('dano',2)]]]},
  {n:'Tritão',ic:'🐟',c:'#0d9488',d:'Povo do fundo do mar.',ap:'Pele escamosa azulada e guelras no pescoço.',
   tr:s=>[['🫧','Guelras','Respira debaixo da água.',[_cap('Respirar na água')]],['🌊','Nadadeiras','Nada muito rápido.',[_cap('Natação',12)]]],
   hab:s=>[[0,'Sangue frio','',[_res('Frio','reduz',3)]]]},
  {n:'Draconato',ic:'🐉',c:'#dc2626',d:'Herdeiro do sangue dos dragões.',ap:'Escamas, focinho e cauda de dragão.',
   tr:s=>[['🛡','Escamas','Couraça natural.',[_rol('defesa',1)]],['🔥','Sopro de fogo','Cospe fogo em cone.',[_txt('Sopro: dano de fogo em cone')]]],
   hab:s=>[[0,'Sangue de dragão','',[_res('Fogo','metade')]]]},
  {n:'Halfling',ic:'🍀',c:'#65a30d',d:'Pequeno, sortudo e difícil de pegar desprevenido.',tam:'pequeno',hab:s=>[[0,'Sortudo','Rerrola um 1 natural.',[]],[0,'Corajoso','',[_res('Medo','metade')]]]},
  {n:'Autômato',ic:'🤖',c:'#64748b',d:'Corpo construído, mente desperta.',ap:'Placas de metal e olhos que brilham.',
   tr:s=>[['⚙️','Corpo de metal','',[_rol('defesa',2)]],['🔩','Sem carne','',[_res('Veneno','imune'),_res('Doença','imune'),_res('Elétrico','vulneravel')]]]},
  {n:'Nobre',ic:'👑',c:'#7c3aed',d:'Cresceu entre privilégios, etiqueta e intrigas.',hab:s=>[[0,'Educação refinada','Domina etiqueta e idiomas.',[_dad('pericia',1)]],[0,'Contatos','Conhece gente poderosa.',[_txt('Pode pedir favores a nobres')]]]},
  {n:'Órfão das ruas',ic:'🏚️',c:'#57534e',d:'Aprendeu a sobreviver sozinho nas vielas.',hab:s=>[[0,'Malandragem','Conhece os becos e os truques.',[_rol('pericia',1)]],[0,'Estômago forte','Come o que aparecer.',[_res('Doença','metade'),_res('Veneno','reduz',1)]]]},
  /* ---- Pacote isekai / anime ---- */
  {n:'Semi-humano',ic:'🧬',c:'#0d9488',d:'Sangue misto: traços de outro povo e olhares atravessados da multidão.',ap:'Orelhas, cauda ou olhos fora do comum.',
   tr:s=>[['👂','Sentidos aguçados','Ouve e cheira mais que os outros.',[_rol('pericia',1)]]],hab:s=>[[0,'Preconceito','Alguns lugares tratam você pior — e o Mestre pode usar isso.',[]]]},
  {n:'Espírito menor',ic:'🌬️',c:'#38bdf8',d:'Ser feito de natureza e mana, leve e fugaz.',ap:'Corpo translúcido que brilha de leve.',
   tr:s=>[['🪽','Flutua','Paira alguns palmos acima do chão.',[_cap('Voo',3)]],['✨','Corpo de mana','Magia o atravessa menos.',[_res('Psíquico','metade')]]]},
  {n:'Convocado (outro mundo)',ic:'🌀',c:'#a855f7',d:'Veio de um mundo diferente, sem raízes aqui — nem saber de como as coisas funcionam.',
   hab:s=>[[0,'Olhar de fora','Percebe o que os locais já nem notam.',[_rol('pericia',1)]],[0,'Sem lugar','Não conhece costumes locais; o Mestre pode cobrar isso.',[]]]},
  {n:'Besta-humana',ic:'🐺',c:'#92400e',d:'Povo selvagem de instintos fortes e força física acima da média.',ap:'Pelagem, presas e olhos de predador.',
   tr:s=>[['🦷','Garras e presas','Ataques desarmados mais perigosos.',[_rol('dano',1)]],['👃','Faro','Segue rastros pelo cheiro.',[_rol('pericia',1)]]]},
];
function _ef(o){ return o?Object.assign({id:uid(),targetId:'',value:0,text:'',charType:'tag',mods:[]},o):null; }
function _hab(sys,[lv,n,d,efs]){ return {id:uid(),name:n,description:d||'',req:{level:lv||0,attrs:[]},effects:(efs||[]).map(_ef).filter(Boolean)}; }
function novaClasseDe(sys,p){
  const c=sanitizeArquetipo({id:uid(),name:p.n,description:p.d||'',icon:p.ic,color:p.c,abilities:[]},'classe');
  (p.rec||[]).forEach(([nomes,modo,f])=>{ const r=_recPor(sys,nomes); if(r) c.recursos.push({id:uid(),resId:r.id,modo,formula:f}); });
  if(p.tec){ c.tecnicas.nome=p.tec[0]; c.tecnicas.formula=p.tec[1]; }
  if(p.hab) c.abilities=p.hab(sys).map(x=>_hab(sys,x));
  if(p.opc) c.tecnicas.opcoes=p.opc(sys).map(([n,d,efs,lv])=>_hab(sys,[lv||0,n,d,efs]));
  if(sys.dndVida&&typeof vidaPorDadoDeVida==='function') vidaPorDadoDeVida(sys,c);
  return c;
}
function novaOrigemDe(sys,p){
  const o=sanitizeArquetipo({id:uid(),name:p.n,description:p.d||'',icon:p.ic,color:p.c,abilities:[],traits:[]},'origem');
  o.visual.aparencia=p.ap||''; if(p.tam) o.visual.tamanho=p.tam;
  (p.rec||[]).forEach(([nomes,modo,f])=>{ const r=_recPor(sys,nomes); if(r) o.recursos.push({id:uid(),resId:r.id,modo,formula:f}); });
  if(p.tr) o.traits=p.tr(sys).map(([ic,n,d,efs])=>Object.assign(_hab(sys,[0,n,d,efs]),{icon:ic}));
  if(p.hab) o.abilities=p.hab(sys).map(x=>_hab(sys,x));
  return o;
}

/* ---------- a aba ---------- */
const ARQ_ABAS={
  classe:[['visao','👁 Visão geral'],['recursos','❤️ Recursos'],['niveis','📈 Habilidades por nível'],['tecnicas','🌀 Técnicas'],['tabela','📊 Tabela']],
  origem:[['visao','👁 Visão e aparência'],['tracos','🪽 Traços físicos'],['niveis','📈 Habilidades'],['recursos','❤️ Recursos']],
};
function tabArquetipos(sys,kind){
  const ehC=kind==='classe';
  const lista=ehC?sys.classes:sys.origins;
  lista.forEach(c=>sanitizeArquetipo(c,kind));
  const chave=ehC?'clsSel':'orgSel';
  const cat=ehC?CATALOGO_CLASSES2:CATALOGO_ORIGENS2;
  const nova=p=>{ const x=ehC?novaClasseDe(sys,p):novaOrigemDe(sys,p); lista.push(x); S.ui[chave]=x.id; return x; };
  const biblioteca=bibliotecaGenerica(ehC?'📚 Classes prontas (já vêm com habilidades, técnicas e fórmulas)':'📚 Origens prontas (traços com efeito, visual e resistências)',
    cat.map(p=>({...p,n:p.n,d:p.d})), p=>_tem(lista,p.n), p=>nova(p));
  const banner=(sys.codigoBloqueado&&sistemaTemCodigo(sys))?h('div',{class:'aviso-aba'},
    h('b',{},'⚠ Efeitos por código bloqueados. '),'Este sistema foi importado de um arquivo e tem efeitos em JavaScript. Leia o código nas habilidades antes de liberar — código roda no seu navegador.',
    h('div',{style:{marginTop:'8px'}},h('button',{class:'btn sm amber',onclick:async()=>{
      if(await uiConfirm('Liberar a execução dos efeitos por código deste sistema? Só faça isso se você confia em quem criou o arquivo.',{titulo:'Liberar código',okText:'Liberar'})){ sys.codigoBloqueado=false; render(); } }},'Li o código — liberar'))):null;
  return mdLayout({
    extraTopo:banner,
    titulo:ehC?'Classes':'Origens / Raças',
    dica:ehC?'A classe define como os recursos crescem, o que o personagem ganha sozinho em cada nível e o banco de técnicas que ele escolhe.'
            :'A origem dá a aparência e o corpo (asas, guelras, escamas), com efeitos de verdade: voo, resistências, visão no escuro…',
    biblioteca, lista, selKey:chave,
    texto:c=>c.name+' '+(c.description||''),
    phCriar:ehC?'+ Nova classe: digite o nome e Enter':'+ Nova origem: digite o nome e Enter',
    aoCriar:v=>{ if(_tem(lista,v)){ showToast('Já existe uma com esse nome.'); return null; } S.ui.arqAba='visao'; 
      /* cada nova classe/origem ganha ícone e cor diferentes (antes todas nasciam iguais e se confundiam na lista) */
      const ICS=ehC?['⚔️','🛡️','🔮','🗡️','🏹','🌿','✨','🎭','🐺','🔥']:['🧬','🌱','👁️','🦴','🌙','⭐','🧪','🪶'];
      const CORS=['#7c3aed','#0d9488','#e11d48','#d97706','#2563eb','#65a30d','#be185d','#0891b2'];
      return nova({n:v,ic:ICS[lista.length%ICS.length],c:CORS[lista.length%CORS.length]}); },
    vazioTitulo:ehC?'Nenhuma classe ainda':'Nenhuma origem ainda', vazioDica:'Adicione da biblioteca acima ou digite um nome.',
    cartao:(c,sel)=>{
      const nTec=ehC?(((c.tecnicas||{}).opcoes)||[]).length:0, nRec=(c.recursos||[]).length;
      const pr=arqProblemas(sys,kind,c).length;
      return mdCartao({sel,cor:c.color,icone:c.icon,nome:c.name,onclick:()=>{ S.ui[chave]=c.id; render(); },
        sub:[(c.abilities||[]).length+' hab.', ehC?(nTec+' técn.'):(((c.traits||[]).length)+' traços'), nRec?('ƒ '+nRec+' rec.'):null, pr?('⚠ '+pr):null].filter(Boolean).join(' · ')});
    },
    editor:c=>arqEditor(sys,kind,lista,c)});
}
function arqEditor(sys,kind,lista,c){
  const ehC=kind==='classe';
  const abas=ARQ_ABAS[kind];
  if(!abas.some(a=>a[0]===S.ui.arqAba)) S.ui.arqAba='visao';
  const aba=S.ui.arqAba;
  const icones=ehC?['⚔️','🔮','🗡️','✨','🪓','🏹','🎻','🌿','🛡️','🕵️','🔫','💀','👊','🎭']:['🧑','🧝','⛏️','🪽','🐟','🐉','🍀','🤖','👑','🏚️','🐺','👹','🧛','🌱'];
  const cab=h('div',{class:'arq-cab',style:{'--arq':c.color}},
    h('div',{class:'arq-ic-g'},
      iconePicker(c.icon,v=>{c.icon=v||(ehC?'⚔️':'🧬');},{semRemover:true}),
      h('input',{type:'color',class:'arq-cor',value:c.color||'#7c3aed','aria-label':'Cor',oninput:e=>{c.color=e.target.value;persist();},onchange:()=>render()})),
    h('div',{class:'arq-cab-t'},
      h('input',{class:'in arq-nome',value:c.name||'',placeholder:'Nome',oninput:e=>{c.name=e.target.value;persist();},onchange:()=>render()}),
      h('div',{class:'arq-ics'}, ...icones.map(ic=>h('button',{type:'button',class:'arq-ic-b'+(c.icon===ic?' on':''),onclick:()=>{c.icon=ic;render();}},ic)))),
    h('div',{class:'row wrapf'}, ...mdBotoes(lista,c,ehC?'classe':'origem',
      ()=>{ const x=clonarComIds(c); x.name=c.name+' (cópia)'; lista.splice(lista.indexOf(c)+1,0,x); S.ui[ehC?'clsSel':'orgSel']=x.id; render(); },
      ()=>comDesfazer((ehC?'Classe':'Origem')+' “'+(c.name||'')+'” excluída',()=>{ lista.splice(lista.indexOf(c),1); }))));
  const tabs=mdAbas(abas,'arqAba',k=>arqContagem(c,k));
  let corpo;
  if(aba==='visao') corpo=arqVisao(sys,kind,c);
  else if(aba==='recursos') corpo=arqRecursos(sys,kind,c);
  else if(aba==='niveis') corpo=arqNiveis(sys,kind,c);
  else if(aba==='tecnicas') corpo=arqTecnicas(sys,c);
  else if(aba==='tracos') corpo=arqTracos(sys,c);
  else corpo=h('div',{},
    h('div',{class:'hint',style:{marginBottom:'10px'}},'Colunas que só valem para quem tem esta classe (sobrescrevem as do sistema com o mesmo nome). Ex.: dado de vida, espaços de magia, PE por nível.'),
    progEditor(sys,(c.progression=sanitizeProg(c.progression)),{}));
  return h('section',{class:'arq-edit'}, cab, tabs, h('div',{class:'arq-corpo'},corpo));
}
function arqContagem(c,k){
  const n={niveis:(c.abilities||[]).length, tecnicas:(((c.tecnicas||{}).opcoes)||[]).length, tracos:(c.traits||[]).length, recursos:(c.recursos||[]).length}[k];
  return n?h('span',{class:'tab-n'},n):null;
}
/* prévia: um herói de exemplo com ESTA classe/origem num nível escolhido */
function arqPrevia(sys,kind,c){
  const lo=sys.startLevel||1, hi=Math.max(lo,sys.maxLevel||lo);
  const lv=Math.min(hi,Math.max(lo,+S.ui.arqLv||hi));
  let d,ctx;
  try{ d=sampleDraft(sys,lv); if(kind==='classe') d.classId=c.id; else d.originId=c.id;
    const eff0=gatherEffects(sys,d); const cls=sys.classes.find(x=>x.id===d.classId);
    const ops=((cls&&cls.tecnicas&&cls.tecnicas.opcoes)||[]).filter(o=>!(o.req&&o.req.level>lv));
    d.classTechs=ops.slice(0,tecnicasPermitidas(sys,d,eff0)).map(o=>o.id);
    ctx=computeSheet(sys,d); }
  catch(e){ return h('div',{class:'hint'},'Não deu para calcular a prévia ainda.'); }
  const e=ctx.eff;
  const chips=[];
  ctx.allRes.forEach(r=>chips.push(h('span',{class:'pv-chip',style:{borderColor:r.color}}, r.name+' ', h('b',{},Number.isNaN(r.max)?'?':String(r.max)), (r.formulaDe||[]).length?h('small',{},' ƒ'):null)));
  Object.keys(e.caps).forEach(k=>chips.push(h('span',{class:'pv-chip'},capInfo(k).ic+' '+k+(e.caps[k]?' '+e.caps[k]+' m':''))));
  Object.keys(e.resist).forEach(k=>{const r=resistResumo(k,e.resist[k]); chips.push(h('span',{class:'pv-chip '+r.cls},r.ic+' '+r.t));});
  Object.keys(e.rollBonus).forEach(k=>chips.push(h('span',{class:'pv-chip'},'⚔ '+sign(e.rollBonus[k])+' '+((DICE_ESCOPOS.find(x=>x[0]===k)||[,k])[1]))));
  const lvSel=h('input',{class:'in',type:'range',min:String(lo),max:String(hi),value:String(lv),style:{maxWidth:'180px'},oninput:ev=>{S.ui.arqLv=+ev.target.value;render();}});
  const ativas=e.active.filter(x=>x.tipo!=='traco').map(x=>x.ab.name);
  const prox=e.locked.filter(x=>x.tipo==='habilidade').sort((a,b)=>((a.ab.req||{}).level||0)-((b.ab.req||{}).level||0))[0];
  return h('div',{class:'pv'},
    h('div',{class:'row between wrapf'}, h('b',{},'Prévia — '+c.name+(sys.semNiveis?'':(' no '+levelLabel(sys,lv)))), sys.semNiveis?null:h('label',{class:'row'},h('span',{class:'hint'},'nível'),lvSel)),
    h('div',{class:'pv-chips'}, ...chips),
    h('div',{class:'hint'}, ativas.length?('Tem: '+ativas.join(', ')):'Nenhuma habilidade ativa neste nível.'),
    prox?h('div',{class:'hint'},'Próxima: '+prox.ab.name+' ('+prox.reasons.join(', ')+')'):null,
    kind==='classe'&&((c.tecnicas||{}).opcoes||[]).length?h('div',{class:'hint'},'Escolhe '+tecnicasPermitidas(sys,d,e)+' '+(c.tecnicas.nome||'técnicas').toLowerCase()+' neste nível.'):null,
    (e.erros||[]).length?h('div',{class:'fv-erro',style:{fontSize:'12px'}},'⚠ '+e.erros.join(' · ')):null);
}
function arqVisao(sys,kind,c){
  const vis=kind==='origem'?c.visual:null;
  const tamSel=vis?h('select',{class:'in',onchange:e=>{vis.tamanho=e.target.value;render();}},
    ...TAMANHOS.map(([v,l])=>{const o=h('option',{value:v},l); if(v===vis.tamanho) o.selected=true; return o;})):null;
  return h('div',{class:'arq-grid2'},
    h('div',{},
      field('Descrição (o jogador vê ao escolher)', h('textarea',{class:'in',rows:'3',value:c.description||'',oninput:e=>{c.description=e.target.value;persist();}})),
      vis?h('div',{style:{marginTop:'12px'}}, field('Aparência (como os outros veem)', h('textarea',{class:'in',rows:'2',value:vis.aparencia,placeholder:'Ex.: grandes asas emplumadas, pele escamosa…',oninput:e=>{vis.aparencia=e.target.value;persist();}}))):null,
      vis?h('div',{class:'row wrapf',style:{marginTop:'12px',alignItems:'flex-end'}},
        field('Tamanho',tamSel),
        h('div',{class:'hint',style:{flex:'1'}},'Traços como Asas e Guelras ficam na aba 🪽 Traços físicos e dão capacidades de verdade (Voo, Respirar na água…).')):null,
      arqProblemasBox(sys,kind,c),
      h('div',{class:'arq-mapa'},
        h('div',{class:'sub-h'},'Resumo'),
        ...arqResumo(sys,kind,c))),
    arqPrevia(sys,kind,c));
}
function arqProblemasBox(sys,kind,c){
  const p=arqProblemas(sys,kind,c);
  if(!p.length) return null;
  return h('div',{class:'aviso-aba',style:{marginTop:'12px'}},h('b',{},'💡 Para ajustar nesta '+(kind==='classe'?'classe':'origem')+':'),h('ul',{},p.map(m=>h('li',{},m))));
}
function arqResumo(sys,kind,c){
  const out=[];
  (c.recursos||[]).forEach(x=>{ const r=sys.resources.find(q=>q.id===x.resId); if(r&&x.formula.trim()) out.push(h('div',{class:'arq-l'},'❤️ ',h('b',{},r.name),x.modo==='soma'?' + ':' = ',h('code',{},x.formula))); });
  (c.traits||[]).forEach(t=>out.push(h('div',{class:'arq-l'},(t.icon||'✦')+' ',h('b',{},t.name),' — ',(t.effects||[]).map(ef=>effectLabel(sys,ef)).join(', ')||'só descrição')));
  const porNv={}; (c.abilities||[]).forEach(a=>{const l=(a.req&&a.req.level)||0;(porNv[l]=porNv[l]||[]).push(a.name);});
  Object.keys(porNv).sort((a,b)=>a-b).forEach(l=>out.push(h('div',{class:'arq-l'},'📈 ',h('b',{},+l?levelLabel(sys,+l):'Desde o início'),': '+porNv[l].join(', '))));
  if(kind==='classe'&&((c.tecnicas||{}).opcoes||[]).length) out.push(h('div',{class:'arq-l'},'🌀 ',h('b',{},c.tecnicas.nome),': '+c.tecnicas.opcoes.length+' opções; escolhe ',h('code',{},c.tecnicas.formula)));
  if(!out.length) out.push(h('div',{class:'hint'},'Ainda sem mecânica. Use as abas acima — ou comece pela biblioteca, que já vem montada.'));
  return out;
}
function arqRecursos(sys,kind,c){
  if(!sys.resources.length) return h('div',{class:'vazio'},h('div',{class:'vazio-t'},'O sistema não tem recursos'),h('div',{class:'hint'},'Crie Vida, Mana etc. na aba ❤️ Recursos.'),
    h('button',{class:'btn sm primary',style:{marginTop:'8px'},onclick:()=>irParaAba('recursos')},'Ir para Recursos →'));
  return h('div',{},
    h('div',{class:'hint',style:{marginBottom:'12px'}},
      (kind==='classe'?'Cada classe pode calcular os recursos do seu jeito. ':'A origem pode trocar ou somar na fórmula. '),
      'Use ',h('code',{},'Base'),' para o valor da fórmula do sistema. Ex.: ',h('code',{},'Base + Nível * 3'),' (Vida do Bárbaro) ou só ',h('code',{},'Nível'),' com “Soma”.'),
    ...sys.resources.map(r=>{
      let x=(c.recursos||[]).find(q=>q.resId===r.id);
      const modo=x?x.modo:'sistema';
      const sel=h('select',{class:'in',style:{maxWidth:'230px'},onchange:e=>{
        const v=e.target.value;
        if(v==='sistema') c.recursos=c.recursos.filter(q=>q.resId!==r.id);
        else if(x) x.modo=v;
        else c.recursos.push({id:uid(),resId:r.id,modo:v,formula:v==='soma'?'Nível':'Base + Nível * 2'});
        render(); }},
        ...[['sistema','Usa a fórmula do sistema'],['substitui','Fórmula própria (substitui)'],['soma','Soma à fórmula do sistema']].map(([v,l])=>{const o=h('option',{value:v},l); if(v===modo)o.selected=true; return o;}));
      const pontos=pontosPadrao(sys).map(p=>({rot:p.rot,vars:{...p.vars,Base:evalFormula(r.formula,p.vars)||0}}));
      return h('div',{class:'arq-rec',style:{borderLeftColor:r.color}},
        h('div',{class:'row between wrapf'}, h('b',{},r.name), h('span',{class:'hint'},'sistema: ',h('code',{},r.formula||'—')), sel),
        x?h('div',{style:{marginTop:'8px'}}, campoFormula(sys,x,'formula',{tipo:'recurso',pontos,placeholder:'Base + Nível * 2',aoMudar:()=>render()}), arqRecComparar(sys,r,x)):null);
    }));
}
/* "sistema → com esta classe" em alguns degraus, para ver a diferença sem abrir a Prévia */
function arqRecComparar(sys,r,x){
  const lo=sys.startLevel||1, hi=Math.max(lo,sys.maxLevel||lo);
  const pts=[...new Set([lo,Math.round((lo+hi)/2),hi])];
  return h('div',{class:'tec-tab'},...pts.map(lv=>{
    const vars=varsNoDegrau(sys,lv); const b=evalFormula(r.formula,vars);
    const v=evalFormula(x.formula,{...vars,Base:Number.isNaN(b)?0:b});
    const fim=Number.isNaN(v)?NaN:(x.modo==='soma'?(Number.isNaN(b)?v:b+v):v);
    return h('div',{class:'tec-c',style:{borderColor:r.color}},h('small',{},levelLabel(sys,lv)),
      h('b',{},Number.isNaN(fim)?'?':String(fim)),h('small',{},'sistema '+(Number.isNaN(b)?'?':b)));}));
}
function arqNiveis(sys,kind,c){
  const lista=c.abilities;
  const nivelDe=a=>(a.req&&a.req.level)||0;
  const niveis=[...new Set(lista.map(nivelDe))].sort((a,b)=>a-b);
  const novoLv=S.ui.arqNovoLv!=null?S.ui.arqNovoLv:(sys.startLevel||1);
  const add=lv=>{ const a={id:uid(),name:'Nova habilidade',description:'',req:{level:lv,attrs:[]},effects:[]}; lista.push(a); S.ui.open[a.id]=true; render(); };
  return h('div',{},
    h('div',{class:'hint',style:{marginBottom:'12px'}}, kind==='classe'
      ?'Habilidades de classe chegam SOZINHAS: todo personagem desta classe ganha ao atingir o nível. As que o jogador ESCOLHE ficam em 🌀 Técnicas.'
      :'Habilidades da origem. Nível 0 = desde a criação. Para corpo (asas, guelras) use 🪽 Traços físicos.'),
    lista.length?mdAbrirTudo(lista):null,
    niveis.length?null:h('div',{class:'vazio'},h('div',{class:'vazio-t'},'Nenhuma habilidade ainda'),h('div',{class:'hint'},'Ex.: Guerreiro — Nv 1 “Treino de combate” (+1 ataque), Nv 5 “Ataque extra”.')),
    h('div',{class:'tl'}, ...niveis.map(lv=>h('div',{class:'tl-nv'},
      h('div',{class:'tl-marca'}, h('span',{class:'tl-bola'},lv||'★'), h('b',{},lv?levelLabel(sys,lv):'Desde o início'),
        h('button',{class:'btn sm ghost',onclick:()=>add(lv)},'+ aqui')),
      h('div',{class:'tl-itens'}, ...lista.filter(a=>nivelDe(a)===lv).map(a=>habCard(sys,lista,a,{nivel:true,ph:'Nome da habilidade'})))))),
    arqCopiarDe(sys,kind,c),
    barraCriarHab(sys,{arr:lista,habArr:lista,nivel:S.ui.arqNovoLv!=null?S.ui.arqNovoLv:novoLv,origem:kind==='origem'?c:null},{chave:'arq'+c.id,titulo:'Criar habilidade (entra no nível escolhido abaixo)'}),
    h('div',{class:'row wrapf tl-add'},
      h('span',{},'Nova habilidade no'),
      h('input',{class:'in',type:'number',min:'0',style:{width:'80px'},value:novoLv,onchange:e=>{S.ui.arqNovoLv=Math.max(0,parseInt(e.target.value)||0);}}),
      h('span',{},'('+(sys.levelName||'nível').toLowerCase()+')'),
      h('button',{class:'btn primary sm',onclick:()=>add(S.ui.arqNovoLv!=null?S.ui.arqNovoLv:novoLv)},'+ Adicionar')));
}
/* copia as habilidades de outra classe/origem (com ids novos) — ponto de partida para variações */
function arqCopiarDe(sys,kind,c){
  const outros=(kind==='classe'?sys.classes:sys.origins).filter(x=>x!==c&&(x.abilities||[]).length);
  if(!outros.length) return null;
  const sel=h('select',{class:'in',style:{maxWidth:'230px'},'aria-label':'Copiar habilidades de',onchange:e=>{
    const o=outros.find(x=>x.id===e.target.value); if(!o) return;
    const novas=clonarComIds(o.abilities); c.abilities.push(...novas);
    showToast(novas.length+' habilidade(s) copiada(s) de '+o.name); render(); }},
    h('option',{value:''},'⧉ Copiar habilidades de…'), ...outros.map(o=>h('option',{value:o.id},o.icon+' '+o.name+' ('+o.abilities.length+')')));
  return h('div',{class:'row wrapf',style:{marginTop:'12px'}},sel,h('span',{class:'hint'},'Traz todas, com os mesmos níveis e efeitos; depois ajuste.'));
}
function arqTecnicas(sys,c){
  const t=c.tecnicas;
  const lo=sys.startLevel||1, hi=Math.max(lo,sys.maxLevel||lo);
  const passo=Math.max(1,Math.ceil((hi-lo+1)/12));
  const pts=[]; for(let lv=lo;lv<=hi;lv+=passo) pts.push(lv); if(pts[pts.length-1]!==hi) pts.push(hi);
  const tabela=h('div',{class:'tec-tab'}, ...pts.map(lv=>{ const n=evalFormula(t.formula||'0',varsNoDegrau(sys,lv));
    return h('div',{class:'tec-c'}, h('small',{},levelLabel(sys,lv)), h('b',{},Number.isNaN(n)?'?':String(Math.max(0,n)))); }));
  return h('div',{},
    h('div',{class:'arq-grid2'},
      field('Nome do banco (aparece para o jogador)', h('input',{class:'in',value:t.nome,placeholder:'Técnicas, Magias, Manobras…',oninput:e=>{t.nome=e.target.value;persist();},onchange:()=>render()})),
      h('div',{}, h('span',{class:'hint'},'Quantas o personagem escolhe (fórmula)'),
        campoFormula(sys,t,'formula',{tipo:'prof',placeholder:'Nível',aoMudar:()=>render()}))),
    h('div',{class:'hint',style:{margin:'8px 0 4px'}},'Por nível: ',h('code',{},'Nível'),' = 1 por nível · ',h('code',{},'Nível + 1'),' = uma a mais · ',h('code',{},'1 + piso(Nível / 2)'),' = a cada 2 níveis. Efeitos “🌀 técnica extra” (ex.: origem Humano) somam a isso.'),
    tabela,
    h('div',{class:'sub-h'},'Opções ('+t.opcoes.length+')'),
    t.opcoes.length?mdAbrirTudo(t.opcoes):null,
    t.opcoes.length?null:h('div',{class:'vazio'},h('div',{class:'vazio-t'},'Nenhuma opção ainda'),h('div',{class:'hint'},'Crie as técnicas que o jogador pode escolher. O nível no cartão é a partir de quando ela fica disponível.')),
    ...t.opcoes.slice().sort((a,b)=>((a.req||{}).level||0)-((b.req||{}).level||0)).map(o=>habCard(sys,t.opcoes,o,{nivel:true,ph:'Nome da técnica'})),
    h('div',{class:'row wrapf',style:{marginTop:'10px'}},
      h('button',{class:'btn primary sm',onclick:()=>{ const o=sanitizarUsoHab({id:uid(),name:'Nova técnica',description:'',req:{level:0,attrs:[]},effects:[]}); t.opcoes.push(o); S.ui.open[o.id]=true; render(); }},'+ Técnica em branco')),
    barraCriarHab(sys,{arr:t.opcoes,habArr:t.opcoes,nivel:null},{chave:'tec'+c.id,titulo:'Criar técnica / magia para o jogador escolher',nomePadrao:'Nova técnica'}));
}
const TRACOS_PRONTOS=[
  ['🪽','Asas','Voa livremente.',()=>[_ef(_cap('Voo',9))]],['🫧','Guelras','Respira debaixo da água.',()=>[_ef(_cap('Respirar na água'))]],
  ['🌊','Nadadeiras','Nada rápido.',()=>[_ef(_cap('Natação',9))]],['👁','Olhos noturnos','Enxerga no escuro.',()=>[_ef(_cap('Visão no escuro',18))]],
  ['🛡','Escamas','Couraça natural.',()=>[_ef(_rol('defesa',1))]],['🦎','Cauda','Equilíbrio e um golpe extra.',()=>[_ef(_txt('Ataque de cauda'))]],
  ['🐂','Chifres','Investida com chifrada.',()=>[_ef(_rol('dano',1))]],['🕷','Garras de escalada','Sobe paredes.',()=>[_ef(_cap('Escalada',9))]],
  ['🧠','Mente ligada','Fala sem palavras.',()=>[_ef(_cap('Telepatia',18))]],['🔥','Sangue quente','Resiste ao calor.',()=>[_ef(_res('Fogo','metade'))]],
];
function arqTracos(sys,c){
  return h('div',{},
    h('div',{class:'hint',style:{marginBottom:'10px'}},'O corpo da origem. Cada traço pode ter efeitos de verdade — Asas dão a capacidade Voo, Guelras deixam respirar na água — e aparece com ícone na ficha.'),
    h('div',{class:'row wrapf',style:{marginBottom:'12px'}}, h('span',{class:'hint'},'Prontos:'),
      ...TRACOS_PRONTOS.map(([ic,n,d,efs])=>{ const tem=_tem(c.traits,n);
        return h('button',{type:'button',class:'chip'+(tem?' on':''),disabled:tem,title:d,onclick:()=>{ c.traits.push({id:uid(),icon:ic,name:n,description:d,req:{level:0,attrs:[]},effects:efs()}); render(); }},(tem?'✓ ':'+ ')+ic+' '+n); })),
    barraCriarHab(sys,{arr:c.traits,habArr:c.abilities,nivel:0,origem:c,tracos:true},{chave:'tr'+c.id,titulo:'Criar traço do corpo',nomePadrao:'Novo traço'}),
    ...c.traits.map(t=>habCard(sys,c.traits,t,{icone:true,semReq:true,semUso:true,ph:'Ex.: Asas'})),
    h('button',{class:'btn primary sm',style:{marginTop:'8px'},onclick:()=>{ const t={id:uid(),icon:'✦',name:'Novo traço',description:'',req:{level:0,attrs:[]},effects:[]}; c.traits.push(t); S.ui.open[t.id]=true; render(); }},'+ Traço'));
}
