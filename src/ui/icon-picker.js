/* ============================================================ SELETOR DE ÍCONES ============================================================
   Um botão que abre uma gaveta com ~500 ícones em categorias, busca por nome ("espada", "fogo"),
   recentes e um campo para colar qualquer outro emoji. Substitui o campo de texto de 4 letras que
   existia em itens, técnicas, recursos, classes, origens e traços.
   O painel mora no <body> (fora do #root): trocar de tela/redesenhar não o derruba no meio da escolha.
   Evita emojis ZWJ (🧑‍⚕️ etc.): a passada de ícones SVG (icones.js) quebraria a sequência. */
const ICONES_CAT=[
  ['⚔️','Combate',
   '⚔️ espadas|🗡️ adaga espada|🏹 arco flecha|🛡️ escudo defesa|🪓 machado|🔱 tridente|🪃 bumerangue|💣 bomba|🧨 dinamite|🔫 pistola|🪖 capacete|🥊 luva soco|👊 punho soco|🥋 artes marciais|🔪 faca|🪝 gancho|⛓️ corrente|🎯 alvo mira|💥 explosao impacto|🩸 sangue|🦴 osso|💀 caveira morte|☠️ veneno perigo|⚰️ caixao|🪦 lapide|🔨 martelo|⚒️ martelo picareta|🛠️ ferramentas|🏴‍☠️ pirata|🪤 armadilha|📌 alfinete|🔗 elo|⛏️ picareta|🪚 serra|🧱 tijolo muro|🚫 proibido|🛑 pare|🔰 iniciante|🎖️ condecoracao|🏅 medalha'],
  ['🔮','Magia',
   '🔮 bola de cristal|✨ brilho magia|🪄 varinha|📖 grimorio livro|📜 pergaminho|📕 livro vermelho|📘 livro azul|📗 livro verde|📙 livro laranja|🌟 estrela brilhante|⭐ estrela|💫 tontura estrela|🌀 espiral|♾️ infinito|🧿 olho amuleto|🪬 amuleto|🕯️ vela|🔯 estrela de davi|☯️ yin yang|☪️ lua crescente|✡️ estrela|☸️ roda|🕉️ om|⚛️ atomo|🔔 sino|🎇 fogos|🎆 fogos|🌈 arco-iris|☄️ cometa|🪐 planeta|🌌 galaxia|🌠 estrela cadente|🧙 mago|🧚 fada|🧞 genio|🧜 sereia|🧝 elfo|🧛 vampiro|🪞 espelho|🎴 carta|🃏 coringa|🔆 brilho|💠 diamante|⚜️ flor de lis|🔱 tridente|⚗️ alquimia|♈ zodiaco aries|♌ zodiaco leao|♏ zodiaco escorpiao|♒ zodiaco aquario'],
  ['🔥','Elementos',
   '🔥 fogo|💧 agua gota|🌊 onda mar|❄️ gelo neve|⚡ raio energia|🌪️ tornado|🌋 vulcao|🪨 pedra|🌍 terra mundo|💨 vento|☁️ nuvem|🌧️ chuva|⛈️ tempestade|🌩️ trovao|🌫️ nevoa|☀️ sol|🌙 lua|🌑 lua nova|🌕 lua cheia|🌡️ temperatura|☃️ boneco de neve|🧊 cubo de gelo|💦 respingo|🫧 bolhas|🌬️ rajada|🏔️ montanha|⛰️ monte|🪵 madeira tronco|🪨 rocha|⚱️ urna|🌞 sol rosto|🌛 lua rosto|🌝 lua cheia rosto|☢️ radiacao|☣️ biologico|♨️ vapor|🕳️ buraco vazio|🌐 globo'],
  ['🌿','Natureza',
   '🌿 erva|🍃 folha vento|🌱 broto|🌳 arvore|🌲 pinheiro|🌴 palmeira|🌵 cacto|🍄 cogumelo|🌸 flor cerejeira|🌹 rosa|🌻 girassol|🌷 tulipa|🌼 margarida|🍀 trevo sorte|🍁 folha de bordo|🍂 folhas secas|🌾 trigo|🎋 bambu|🎍 pinheiro|🪴 planta vaso|🌺 hibisco|💐 buquê|🪻 lavanda|🪷 lotus|🥀 flor murcha|🪹 ninho|🌰 castanha|🍇 uva|🍎 maca|🍊 laranja|🍋 limao|🍓 morango|🍒 cereja|🍉 melancia|🌽 milho|🥕 cenoura|🥔 batata|🍅 tomate|🧄 alho|🧅 cebola|🏝️ ilha|🏜️ deserto|🏞️ parque|🗻 monte fuji|🌅 nascer do sol|🌄 amanhecer'],
  ['🐉','Criaturas',
   '🐉 dragao|🐲 dragao rosto|🦅 aguia|🦉 coruja|🐺 lobo|🦊 raposa|🐻 urso|🐍 cobra serpente|🦂 escorpiao|🕷️ aranha|🦇 morcego|🐗 javali|🐂 touro|🐎 cavalo|🦄 unicornio|🦁 leao|🐅 tigre|🐆 leopardo|🐘 elefante|🦏 rinoceronte|🦈 tubarao|🐙 polvo|🦑 lula|🐟 peixe|🐠 peixe tropical|🐬 golfinho|🐋 baleia|🐢 tartaruga|🦎 lagarto|🐊 crocodilo|🐸 sapo|🦋 borboleta|🐝 abelha|🐜 formiga|🦗 grilo|🪲 besouro|🪳 barata|🪰 mosca|🦟 mosquito|🪽 asas|🐾 patas|🪶 pena|🦖 dinossauro|🦕 dinossauro|🦍 gorila|🐒 macaco|🐀 rato|🐈 gato|🐕 cachorro|🦌 cervo|🐓 galo|🦜 papagaio|🦢 cisne|🦆 pato|🦩 flamingo|🕊️ pomba|🐧 pinguim|🦭 foca|🦦 lontra|🦘 canguru|🦬 bisao|🐏 carneiro|🐐 cabra|🐃 bufalo|🦙 lama|🦒 girafa|🐿️ esquilo|🦔 ourico|🦡 texugo|🦨 gambá|🐇 coelho|🐁 camundongo|🐌 caracol|🪱 minhoca|🦀 caranguejo|🦞 lagosta|🦐 camarao|🪼 agua-viva|🦠 microbio'],
  ['🧙','Seres',
   '🧙 mago|🧝 elfo|🧛 vampiro|🧟 zumbi|🧞 genio|🧜 sereia|🧚 fada|👹 ogro|👺 goblin|👻 fantasma|👽 alienigena|👾 monstro pixel|🤖 robo|👑 coroa rei|🤴 principe|👸 princesa|🥷 ninja|🦸 heroi|🦹 vilao|🕵️ detetive|👮 policial|💂 guarda|🎅 papai noel|🧌 troll|😈 diabo|👿 demonio|🎃 abobora|🤡 palhaco|🎭 mascaras|🗿 moai|💀 caveira|🦴 esqueleto osso|👁️ olho|🧠 cerebro|😇 anjo|🥶 congelado|😱 medo|😡 raiva|🥴 tonto|😴 sono|🤢 enjoo|🤕 ferido|😎 legal|🤠 cowboy|🧐 curioso|🙈 oculto|🙉 surdo|🙊 mudo|🫥 invisivel|🥸 disfarce|🏴‍☠️ pirata|🧑 pessoa|👤 silhueta|👥 grupo|🫂 abraco|🤝 aperto de mao|👪 familia|👶 bebe|👴 idoso|🧓 idoso'],
  ['🎒','Equipamento',
   '🎒 mochila|👜 bolsa|🧰 caixa de ferramentas|🔦 lanterna|🪔 lamparina|🗝️ chave antiga|🔑 chave|🔒 cadeado|🔓 aberto|📦 caixa|🪙 moeda|💰 saco de dinheiro|💎 gema diamante|💍 anel|📿 colar contas|🎩 cartola|🧢 bone|👢 bota|🥾 bota trilha|🧤 luvas|🧣 cachecol|🧥 casaco manto|🦺 colete armadura|👕 camisa|👖 calca|👗 vestido|👘 quimono|🥽 oculos protecao|🕶️ oculos escuros|👓 oculos|🔭 luneta|🔬 microscopio|⚖️ balanca|🧭 bussola|🗺️ mapa|⌛ ampulheta|⏳ ampulheta|⏰ despertador|🪢 corda|⛏️ picareta|🔧 chave inglesa|🪛 chave de fenda|⚙️ engrenagem|🧲 ima|🕸️ teia|🛏️ cama|📯 trompa|🧵 linha|🪡 agulha|🧶 novelo|🪆 boneca|🧸 urso de pelucia|🎁 presente|🏺 vaso anfora|🪑 cadeira|🛡️ escudo|👑 coroa|⛑️ capacete|🩴 chinelo|🥿 sapato|👒 chapeu|🎓 capelo|💼 maleta|📎 clipe|✂️ tesoura|📏 regua|🧮 abaco|🔋 bateria|💡 lampada|🕹️ joystick|📻 radio|📡 antena|💾 disquete|🖇️ clipes|🪫 bateria fraca'],
  ['🧪','Poções e comida',
   '🧪 pocao frasco|⚗️ alambique|💉 seringa|💊 pilula|🩹 curativo|🩺 estetoscopio|🩸 sangue|🍷 vinho|🍺 cerveja|🍻 brinde|🍶 sake|🥃 whisky|🍹 drink|🧃 suco|🥛 leite|☕ cafe|🍵 cha|🫖 bule|🍖 carne|🍗 frango|🥩 bife|🥓 bacon|🍞 pao|🥖 baguete|🧀 queijo|🥚 ovo|🍳 ovo frito|🍎 maca|🍯 mel|🍬 doce|🍪 biscoito|🍰 bolo|🥧 torta|🍲 ensopado|🥣 tigela|🍜 sopa|🍣 sushi|🌶️ pimenta|🧂 sal|🥫 enlatado|🫙 pote|🍾 garrafa|🏺 jarro|🫗 derramar|🧴 frasco|🧼 sabao|🚰 agua potavel|🥤 copo|🫚 gengibre|🥜 amendoim'],
  ['❤️','Corpo e status',
   '❤️ vida coracao|💙 mana|💚 estamina|💛 energia|💜 sanidade|🖤 escuridao|🤍 pureza|🧡 vigor|🤎 terra|💔 dano coracao partido|🫀 coracao orgao|🧠 mente cerebro|👁️ olho visao|👂 ouvido audicao|👃 nariz olfato|👅 lingua|🦷 dente|🦴 osso|💪 forca musculo|🦵 perna|🦶 pe|🖐️ mao|✋ mao parar|🤲 maos|👣 pegadas|🫁 pulmao|🧬 dna|🩸 sangue|👀 olhos|🗣️ voz|🤚 mao levantada|🤞 dedos cruzados sorte|✌️ paz|🤟 amor|🤘 rock|👌 ok|☝️ dedo|👆 apontar|🫵 apontar|🙏 oracao|🙌 maos ao alto|👏 palmas|💅 unhas|🦾 braco mecanico|🦿 perna mecanica|🦻 aparelho auditivo|🧏 surdo|👋 aceno|🤛 soco|🤜 soco|💋 beijo|💞 coracoes|💕 coracoes|💖 coracao brilhante|💗 coracao crescendo|💓 coracao pulsando|❣️ coracao exclamacao|💘 coracao flecha|💝 coracao presente'],
  ['⭐','Símbolos',
   '🛡️ defesa|⚡ energia raio|🔋 bateria|🍀 sorte|🎲 dados|🃏 coringa|♠️ espadas|♥️ copas|♦️ ouros|♣️ paus|🏆 trofeu|🥇 medalha ouro|🥈 medalha prata|🥉 medalha bronze|🚩 bandeira|🏴 bandeira preta|🏳️ bandeira branca|📍 local|⏱️ cronometro|📢 megafone|💬 fala|💭 pensamento|🔊 som|🔇 mudo|🎵 nota musical|🎶 notas|🎻 violino|🥁 tambor|🎺 trompete|🎸 guitarra|🪕 banjo|🎹 piano|🪈 flauta|🎷 saxofone|🪘 tambor|➕ mais|➖ menos|✖️ vezes|➗ dividir|♻️ reciclar|⚠️ atencao|⛔ proibido|✅ certo|❌ errado|❓ pergunta|❗ exclamacao|🔴 vermelho|🟠 laranja|🟡 amarelo|🟢 verde|🔵 azul|🟣 roxo|🟤 marrom|⚫ preto|⚪ branco|🔺 triangulo|🔻 triangulo|🔷 losango azul|🔶 losango laranja|⬛ quadrado|⬜ quadrado|▶️ play|⏸️ pausa|🔁 repetir|🔀 aleatorio|🔄 girar|⬆️ cima|⬇️ baixo|➡️ direita|⬅️ esquerda|↗️ diagonal|🔝 topo|🆕 novo|🆓 gratis|🆘 socorro|💯 cem|🔱 emblema|〽️ marca|⭕ circulo|✳️ asterisco|❇️ brilho|♟️ peao xadrez|🧩 quebra-cabeca|🪁 pipa|🎪 circo|🎨 arte|🖌️ pincel|🖼️ quadro|🎬 claquete|📸 foto|🎤 microfone|🎧 fone|📚 livros|📝 nota|✒️ pena de escrever|🖋️ caneta|📌 alfinete|📎 clipe|🔖 marcador|🏷️ etiqueta|📊 grafico|📈 progresso|📉 queda|💹 alta|🧾 recibo|📅 calendario|🗓️ agenda|🗒️ bloco de notas|📋 prancheta|🗃️ arquivo|🗑️ lixeira'],
  ['🏰','Lugares e viagem',
   '🏰 castelo|🏯 castelo japones|🏛️ templo|⛪ igreja|🕌 mesquita|🛕 templo hindu|🕍 sinagoga|⛩️ portal torii|🏚️ casa abandonada|🏠 casa|🏘️ vila|🏙️ cidade|🌆 cidade entardecer|🌃 cidade noite|🌉 ponte noite|🗼 torre|🗽 estatua|⛺ barraca|🏕️ acampamento|🚪 porta|🪜 escada|🌉 ponte|⚓ ancora|⛵ veleiro|🚢 navio|🛶 canoa|🚤 lancha|🛤️ trilho|🚀 foguete|🛸 disco voador|✈️ aviao|🚂 trem|🚗 carro|🚲 bicicleta|🛹 skate|🛞 roda|🛖 cabana|🏟️ estadio|🏗️ construcao|🏭 fabrica|⛲ fonte|⛽ posto|🏥 hospital|🏦 banco|🏪 loja|🏫 escola|🏨 hotel|🏤 correio|🕋 caaba|🎡 roda gigante|🎢 montanha russa|🎠 carrossel|🌁 neblina cidade|🧭 bussola|🗺️ mapa|🛣️ estrada|🚏 ponto|🚧 obras|🛟 boia|🪂 paraquedas|🚁 helicoptero|🛰️ satelite|🗾 mapa japao'],
];
const _ipChave='nexus-icones-recentes';
function iconeLista(){
  const out=[]; const vistos=new Set();
  ICONES_CAT.forEach(([cic,cn,txt])=>txt.split('|').forEach(p=>{
    const i=p.indexOf(' '); const e=i<0?p:p.slice(0,i), nome=i<0?'':p.slice(i+1);
    const k=cn+'|'+e; if(vistos.has(k)) return; vistos.add(k);
    out.push({e,nome,cat:cn});
  }));
  return out;
}
let _ipLista=null;
function iconeRecentes(){ try{ const v=JSON.parse(localStorage.getItem(_ipChave)||'[]'); return Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,24):[]; }catch{ return []; } }
function iconeLembrar(e){ if(!e) return; try{ const l=[e,...iconeRecentes().filter(x=>x!==e)].slice(0,24); localStorage.setItem(_ipChave,JSON.stringify(l)); }catch{} }
let _ipAberto=null;
function fecharIconePicker(devolverFoco){
  if(!_ipAberto) return;
  const a=_ipAberto; _ipAberto=null;
  document.removeEventListener('mousedown',a.fora,true); document.removeEventListener('keydown',a.tecla,true);
  window.removeEventListener('resize',a.rez); a.pan.remove();
  if(devolverFoco&&a.btn&&a.btn.isConnected) a.btn.focus();
}
/* Abre a gaveta ancorada ao botão. aoEscolher(emoji|'') é chamado ao clicar; quem chama decide o resto. */
function abrirIconePicker(btn,valor,aoEscolher,opts){
  fecharIconePicker();
  opts=opts||{};
  if(!_ipLista) _ipLista=iconeLista();
  let cat='todos', q='';
  const pan=h('div',{class:'ip','data-noicon':'',role:'dialog','aria-label':'Escolher um ícone'});
  const busca=h('input',{class:'in ip-busca',type:'search',placeholder:'Buscar: espada, fogo, dragão, poção…','aria-label':'Buscar ícone',autocomplete:'off'});
  const abas=h('div',{class:'ip-abas',role:'tablist'});
  const grade=h('div',{class:'ip-grade',role:'listbox'});
  const escolher=e=>{ if(e) iconeLembrar(e); fecharIconePicker(true); aoEscolher(e); };
  const pintar=()=>{
    abas.innerHTML=''; grade.innerHTML='';
    const rec=iconeRecentes();
    const cats=[['todos','Todos'],...(rec.length?[['recentes','Recentes']]:[]),...ICONES_CAT.map(c=>[c[1],c[0]+' '+c[1]])];
    cats.forEach(([k,l])=>abas.appendChild(h('button',{type:'button',class:'ip-aba'+(cat===k?' on':''),role:'tab','aria-selected':cat===k?'true':'false',
      onclick:()=>{ cat=k; pintar(); }},l)));
    const t=(typeof semAcento==='function')?semAcento(q.trim()):q.trim().toLowerCase();
    let itens;
    if(cat==='recentes'&&!t) itens=rec.map(e=>({e,nome:''}));
    else itens=_ipLista.filter(x=>(cat==='todos'||cat==='recentes'||x.cat===cat)&&(!t||((typeof semAcento==='function')?semAcento(x.nome+' '+x.cat):x.nome).includes(t)));
    /* sem busca e na aba "Todos": mostra os recentes primeiro */
    if(cat==='todos'&&!t&&rec.length) itens=[...rec.map(e=>({e,nome:'recente'})),...itens];
    if(!itens.length){ grade.appendChild(h('div',{class:'hint',style:{padding:'12px'}},'Nada com esse nome. Cole qualquer emoji no campo abaixo.')); return; }
    const vistos=new Set();
    itens.forEach(x=>{ if(vistos.has(x.e)) return; vistos.add(x.e);
      grade.appendChild(h('button',{type:'button',class:'ip-it'+(x.e===valor?' on':''),role:'option','aria-selected':x.e===valor?'true':'false',title:x.nome||x.e,'aria-label':x.nome||x.e,onclick:()=>escolher(x.e)},x.e)); });
  };
  busca.addEventListener('input',()=>{ q=busca.value; if(q.trim()&&cat==='recentes') cat='todos'; pintar(); });
  const livre=h('input',{class:'in ip-livre',maxlength:'12',placeholder:'ou cole um emoji',value:'','aria-label':'Colar outro emoji',
    onkeydown:e=>{ if(e.key==='Enter'){ e.preventDefault(); const v=livre.value.trim(); if(v) escolher(v); } }});
  pan.appendChild(h('div',{class:'ip-topo'},busca,
    h('button',{type:'button',class:'btn sm ghost',title:'Fechar (Esc)','aria-label':'Fechar',onclick:()=>fecharIconePicker(true)},'✕')));
  pan.appendChild(abas); pan.appendChild(grade);
  pan.appendChild(h('div',{class:'ip-pe'},livre,
    h('button',{type:'button',class:'btn sm',onclick:()=>{ const v=livre.value.trim(); if(v) escolher(v); }},'Usar'),
    opts.semRemover?null:h('button',{type:'button',class:'btn sm ghost',onclick:()=>escolher('')},'Sem ícone')));
  document.body.appendChild(pan);
  const posicionar=()=>{
    const r=btn.getBoundingClientRect(), w=Math.min(380,innerWidth-16), alt=pan.offsetHeight||360;
    let x=Math.min(Math.max(8,r.left),innerWidth-w-8), y=r.bottom+6;
    if(y+alt>innerHeight-8) y=Math.max(8,r.top-alt-6);
    pan.style.left=x+'px'; pan.style.top=y+'px'; pan.style.width=w+'px';
  };
  const fora=e=>{ if(!pan.contains(e.target)&&e.target!==btn&&!btn.contains(e.target)) fecharIconePicker(); };
  const tecla=e=>{ if(e.key==='Escape'){ e.stopPropagation(); e.preventDefault(); fecharIconePicker(true); } };
  const rez=()=>posicionar();
  document.addEventListener('mousedown',fora,true); document.addEventListener('keydown',tecla,true); window.addEventListener('resize',rez);
  _ipAberto={pan,btn,fora,tecla,rez};
  pintar(); posicionar(); busca.focus();
}
/* O botão que o editor usa no lugar do campo de 4 letras. valor = emoji atual; aoMudar(novo) recebe o escolhido
   e deve guardar no objeto (a persistência e o redesenho são feitos aqui). */
function iconePicker(valor,aoMudar,opts){
  opts=opts||{};
  const btn=h('button',{type:'button',class:'ip-btn '+(opts.cls||'arq-ic-in'),title:'Trocar ícone',
    'aria-label':'Ícone: '+(valor||'nenhum')+'. Clique para trocar','aria-haspopup':'dialog'},
    h('span',{class:'ip-ic'},valor||'＋'), h('span',{class:'ip-seta','aria-hidden':'true'},'▾'));
  btn.addEventListener('click',()=>abrirIconePicker(btn,valor,v=>{ aoMudar(v); persist(); render(); },opts));
  return btn;
}
