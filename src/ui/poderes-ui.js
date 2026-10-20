/* ============================================================ SISTEMAS DE PODER — ABA 🔮 E GRIMÓRIO NA FICHA ============================================================
   Aba do mestre: lista de sistemas de poder, cada um com
     1 Identidade · 2 Regras (recurso, como o personagem tem as formas, cópia, quem recebe)
     3 Formas (técnicas normais + como desbloqueia + se pode ser destruída) · 4 Combinações (A + B = C)
   Modelos prontos: Dez Sombras (Megumi), Cópia e Rika (Yuta), Seda e Brasões (Hornet), Elementos que combinam,
   Grimório de magias (aprende N), Posturas (uma por vez).
   Na ficha: bloco "🔮 Poderes" com cada forma no seu estado (trancada, conquistar, aprender, equipar, destruída) e as cópias.
   Depende de poderes.js (motor), tecnicas-editor.js (modeloEmHab, cartaoTecnica…), habilidades-ux.js (barraCriarHab, habFrase). */

/* ---------- modelos ---------- */
function _garanteRec(sys,o){
  const ja=(sys.resources||[]).find(r=>semAcentoSeguro(r.name)===semAcentoSeguro(o.n)); if(ja) return ja;
  const r=recursoDoCatalogo(sys,{n:o.n,ic:o.ic,t:'barra',c:o.c,rc:o.rc||'longo',a:o.a||[],f:o.f,d:o.d||''});
  sys.resources.push(r); return r;
}
/* forma a partir de uma descrição curta (mesmo formato dos modelos da biblioteca) */
function _pf(sys,o){
  const ab=modeloEmHab(sys,{n:o.n,ic:o.ic,d:o.d,efs:o.efs,uso:o.uso},o.nv||0);
  Object.assign(ab,{grupo:o.g||'',perdivel:!!o.perd,desbloq:{tipo:o.db||'livre',formaId:'',texto:o.dt||''},_req:o.req||''});
  if(o.usos) ab.uso.usos=Object.assign({max:'',recarga:'longo'},o.usos);
  return ab;
}
function _montaPoder(sys,o){
  const rec=o.rec?_garanteRec(sys,o.rec):null;
  const P={id:uid(),nome:o.nome,icone:o.icone,cor:o.cor,desc:o.desc,recursoId:rec?rec.id:'',todos:false,modo:o.modo||'todas',escolherQtd:o.qtd||'',copia:!!o.copia,copiaMax:o.copiaMax||'',formas:[],combos:[]};
  P.formas=(o.formas||[]).map(f=>_pf(sys,f));
  const porNome=n=>P.formas.find(f=>f.name===n);
  P.formas.forEach(f=>{ if(f._req){ const x=porNome(f._req); if(x) f.desbloq.formaId=x.id; } delete f._req; });
  P.combos=(o.combos||[]).map(c=>{ const a=porNome(c.a), b=porNome(c.b); const ab=_pf(sys,c.r); delete ab._req; return {id:uid(),a:a?a.id:'',b:b?b.id:'',ab}; });
  sys.poderes.push(P); sanitizePoderes(sys); return P;
}
const _EA=s=>({n:'Energia Amaldiçoada',ic:'🌑',c:'#7c3aed',rc:'longo',a:['Vontade','Presença','Espírito','Mente','Sabedoria'],f:a=>a?(a+' * 4 + Nível * 4'):'10 + Nível * 5',d:'Combustível das técnicas amaldiçoadas.'});
const _inv=(nome,ic,cor,estilo,vida,def,atk,dano,mov,o)=>Object.assign({nome,icone:ic,cor,estilo,vida,defesa:def,ataque:atk,dano,mov,qtd:'1',duracao:'até dispensar',desc:''},o||{});
const PODER_MODELOS=[
  {k:'sombras',ic:'🐕',n:'Dez Sombras',sub:'estilo Megumi',d:'Shikigamis que se conquistam num ritual, podem ser destruídos para sempre e passam o poder adiante. Tem fusão e expansão de domínio.',
   f:s=>[_montaPoder(s,{nome:'Técnica das Dez Sombras',icone:'🐕',cor:'#4c1d95',rec:_EA(s),modo:'todas',
    desc:'Invoca shikigamis a partir da própria sombra. Cada um precisa ser vencido num ritual antes de servir. Um shikigami destruído não volta, mas o que sobra dele fortalece outro.',
    formas:[
      {n:'Cães Divinos',ic:'🐕',g:'Shikigami',perd:true,d:'Dois cães de sombra que rastreiam e mordem.',uso:x=>({tipo:'invocacao',modo:'instantaneo',custo:['2',['Energia Amaldiçoada']],alcance:'distancia',area:{forma:'',tam:'9'},
        invoc:_inv('Cão Divino','🐕','#312e81','espirito','8 + Nível * 2','13','+5','1d8 + 2','12',{qtd:'2',desc:'Faro perfeito; um branco e um preto.'})})},
      {n:'Nue',ic:'🦅',g:'Shikigami',db:'ritual',dt:'Vencer o Nue no ritual de domínio',perd:true,d:'Ave elétrica: carrega você no ar e dá descargas.',uso:x=>({tipo:'invocacao',modo:'ativa',custo:['3',['Energia Amaldiçoada']],alcance:'si',
        invoc:_inv('Nue','🦅','#facc15','espirito','12 + Nível * 2','14','+6','2d6 (elétrico)','18 (voo)',{duracao:'enquanto ligada',desc:'Pode carregar o invocador voando.'})})},
      {n:'Sapo',ic:'🐸',g:'Shikigami',db:'ritual',dt:'Vencer o Sapo no ritual',perd:true,d:'Língua que puxa aliados para longe do perigo ou prende inimigos.',uso:x=>({tipo:'debuff',modo:'instantaneo',custo:['1',['Energia Amaldiçoada']],alcance:'distancia',area:{forma:'',tam:'12'},alvos:'1',
        cond:['Agarrado','🪢','#16a34a','Não se move até se soltar.'],condEm:'alvo',duracao:'1 rodada',teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'sem'}})},
      {n:'Grande Serpente',ic:'🐍',g:'Shikigami',db:'ritual',dt:'Vencer a Grande Serpente no ritual',perd:true,nv:3,d:'Surge do chão sob o inimigo e o abocanha.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['3',['Energia Amaldiçoada']],formula:'3d8',tipoDano:'Impacto',alcance:'distancia',area:{forma:'',tam:'18'},alvos:'1',
        cond:['Agarrado','🪢','#16a34a','Não se move até se soltar.'],condEm:'alvo',duracao:'1 rodada'})},
      {n:'Coelhos Fugitivos',ic:'🐇',g:'Shikigami',db:'ritual',dt:'Vencer os coelhos no ritual',nv:3,d:'Uma enxurrada de coelhos esconde você e os aliados.',efs:x=>[_rol('defesa',3)],uso:x=>({tipo:'buff',modo:'ativa',custo:['2',['Energia Amaldiçoada']],alcance:'area',area:{forma:'aura',tam:'6'},duracao:'1 rodada'})},
      {n:'Elefante Máximo',ic:'🐘',g:'Shikigami',db:'ritual',dt:'Vencer o Elefante no ritual',nv:5,d:'Cai do alto e despeja uma torrente de água.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['5',['Energia Amaldiçoada']],formula:'4d8',tipoDano:'Impacto',alcance:'area',area:{forma:'cone',tam:'9'},
        teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}})},
      {n:'Cervo Redondo',ic:'🦌',g:'Shikigami',db:'ritual',dt:'Vencer o Cervo no ritual',nv:7,d:'Cura em volta e desfaz técnicas inimigas.',uso:x=>({tipo:'cura',modo:'instantaneo',custo:['5',['Energia Amaldiçoada']],aplicaEm:'alvo',formula:'3d8 + Nível',alcance:'area',area:{forma:'aura',tam:'6'},texto:'O cervo brilha e as feridas fecham.'})},
      {n:'Boi Perfurante',ic:'🐂',g:'Shikigami',db:'ritual',dt:'Vencer o Boi no ritual',nv:7,d:'Investida em linha: quanto mais distância, mais dano.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['4',['Energia Amaldiçoada']],formula:'2d10 + Nível',tipoDano:'Perfuração',alcance:'area',area:{forma:'linha',tam:'18'},
        teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}})},
      {n:'Tigre Funeral',ic:'🐅',g:'Shikigami',db:'ritual',dt:'Vencer o Tigre no ritual',nv:9,d:'Fera de caça rápida e brutal.',uso:x=>({tipo:'invocacao',modo:'instantaneo',custo:['5',['Energia Amaldiçoada']],alcance:'distancia',area:{forma:'',tam:'9'},
        invoc:_inv('Tigre Funeral','🐅','#9a3412','fera','25 + Nível * 3','15','+8','2d10 + 4','15')})},
      {n:'Cão Divino: Totalidade',ic:'🐺',g:'Herança',db:'perdida',req:'Cães Divinos',d:'Quando um Cão Divino é destruído, o que restou dele se junta ao outro num lobo maior.',uso:x=>({tipo:'invocacao',modo:'instantaneo',custo:['3',['Energia Amaldiçoada']],alcance:'distancia',area:{forma:'',tam:'9'},
        invoc:_inv('Cão Divino: Totalidade','🐺','#e5e7eb','espirito','20 + Nível * 3','15','+8','2d8 + 4','15',{desc:'Garras longas; muito mais rápido.'})})},
      {n:'Mahoraga',ic:'☸️',g:'Proibido',db:'ritual',nv:15,dt:'O ritual é a luta: precisa vencê-lo sozinho. Se falhar, ele destrói todos os presentes, inclusive você.',d:'O shikigami mais forte. Adapta-se a tudo que o fere.',uso:x=>({tipo:'invocacao',modo:'instantaneo',custo:['10',['Energia Amaldiçoada']],alcance:'distancia',area:{forma:'',tam:'9'},
        invoc:_inv('Mahoraga','☸️','#f5f5f4','divino','80 + Nível * 5','18','+12','4d10','12',{desc:'Adaptação: depois de sofrer um tipo de dano, fica imune a ele.'})})},
      {n:'Expansão de Domínio: Jardim das Sombras',ic:'🌑',g:'Domínio',db:'ritual',nv:12,dt:'Despertar a expansão de domínio',d:'O chão vira sombra: shikigamis surgem de todo lado e você se move por elas.',efs:x=>[_rol('ataque',2),_rol('defesa',2)],
        uso:x=>({tipo:'buff',modo:'ativa',custo:['8',['Energia Amaldiçoada']],alcance:'area',area:{forma:'aura',tam:'15'},duracao:'enquanto ligada',texto:'As sombras engolem o campo.'}),usos:{max:'1',recarga:'longo'}},
    ],
    combos:[{a:'Nue',b:'Grande Serpente',r:{n:'Fusão: Serpente Alada',ic:'🐉',d:'Nue e Serpente fundidos: ataque aéreo que arrasta o alvo.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['5',['Energia Amaldiçoada']],formula:'4d8',tipoDano:'Elétrico',alcance:'distancia',area:{forma:'',tam:'18'},alvos:'1',
      cond:['Agarrado','🪢','#16a34a','Não se move até se soltar.'],condEm:'alvo',duracao:'1 rodada'})}},
      {a:'Cães Divinos',b:'Sapo',r:{n:'Fusão: Caçada da Sombra',ic:'🐾',d:'Os cães farejam e o sapo puxa a presa até eles.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['3',['Energia Amaldiçoada']],formula:'2d8 + 2',tipoDano:'Perfuração',alcance:'distancia',area:{forma:'',tam:'12'},alvos:'1'})}}]})]},
  {k:'yuta',ic:'💍',n:'Cópia e Rika',sub:'estilo Yuta',d:'Reserva enorme de energia, um espírito ligado a você e o poder de COPIAR qualquer técnica do sistema.',
   f:s=>[_montaPoder(s,{nome:'Rika e a Cópia',icone:'💍',cor:'#db2777',rec:Object.assign(_EA(s),{f:a=>a?(a+' * 8 + Nível * 10'):'30 + Nível * 10'}),modo:'todas',copia:true,copiaMax:'',
    desc:'Um espírito amaldiçoado preso a um anel. Com Rika manifestada, o personagem copia técnicas que vê (botão 📋 Copiar na ficha).',
    formas:[
      {n:'Rika (manifestação parcial)',ic:'👹',g:'Rika',d:'Braços e boca de Rika saem da sombra para lutar.',uso:x=>({tipo:'invocacao',modo:'ativa',custo:['5',['Energia Amaldiçoada']],alcance:'si',
        invoc:_inv('Rika','👹','#be185d','demonio','30 + Nível * 4','15','+8','2d10 + 4','12',{duracao:'enquanto ligada',desc:'Guarda as técnicas copiadas.'})})},
      {n:'Rika (manifestação completa)',ic:'💍',g:'Rika',db:'ritual',dt:'Liberar o anel (o mestre decide quando a história permite)',nv:8,usos:{max:'1',recarga:'longo'},d:'Rika inteira por 5 minutos: poder quase ilimitado.',
        efs:x=>[_rol('todos',3)],uso:x=>({tipo:'invocacao',modo:'ativa',custo:['15',['Energia Amaldiçoada']],alcance:'si',duracao:'5 minutos',
        invoc:_inv('Rika completa','💍','#9d174d','demonio','80 + Nível * 6','18','+12','4d10 + 6','15',{duracao:'5 minutos',desc:'Amplifica tudo que você faz.'})})},
      {n:'Energia Reversa',ic:'💗',g:'Técnicas',nv:3,d:'Transforma energia negativa em positiva para curar.',uso:x=>({tipo:'cura',modo:'instantaneo',custo:['4',['Energia Amaldiçoada']],formula:'3d8 + Nível',alcance:'toque',aplicaEm:'alvo'})},
      {n:'Lâmina reforçada',ic:'🗡',g:'Técnicas',d:'Enche a espada de energia amaldiçoada.',efs:x=>[_rol('dano',3)],uso:x=>({tipo:'buff',modo:'ativa',custo:['2',['Energia Amaldiçoada']],alcance:'si'})},
      {n:'Fala Amaldiçoada (copiada)',ic:'🗣',g:'Copiadas',db:'ritual',dt:'Ver a técnica de outro usuário com Rika ativa',d:'Uma ordem que o corpo do alvo obedece. Machuca a sua garganta.',uso:x=>({tipo:'debuff',modo:'instantaneo',custo:['4',['Energia Amaldiçoada']],alcance:'distancia',area:{forma:'',tam:'18'},alvos:'todos',
        cond:['Atordoado','💫','#eab308','Perde a próxima ação.'],condEm:'alvo',duracao:'1 rodada',teste:{attr:_atrNome(s,_VONTADE),cd:'10 + Nível',sucesso:'sem'},extras:[{rec:_V,formula:'-1d4',quem:'eu'}]})},
    ]})]},
  {k:'hornet',ic:'🕷',n:'Seda e Brasões',sub:'estilo Hornet (Silksong)',d:'Golpes que ENCHEM a Seda, Atar para se curar, habilidades de seda, ferramentas com usos e um BRASÃO equipado por vez.',
   f:s=>{ const ag=_atrNome(s,_REFLEXO); return [
    _montaPoder(s,{nome:'Agulha e Seda',icone:'🪡',cor:'#dc2626',rec:{n:'Seda',ic:'🕸',c:'#e5e7eb',rc:'longo',f:()=>'9',d:'Enche acertando golpes; gasta com Atar e habilidades.'},modo:'todas',
      desc:'Cada golpe de agulha acrescenta um fio de Seda; com o carretel cheio, ela se ata e se cura. Ferramentas têm usos e voltam no descanso (banco).',
      formas:[
        {n:'Golpe de agulha',ic:'🪡',g:'Agulha',d:'Ataque rápido; cada acerto dá 1 de Seda.',uso:x=>({tipo:'dano',modo:'instantaneo',formula:'1d8'+(ag?(' + '+ag):''),tipoDano:'Perfuração',alcance:'toque',alvos:'1',extras:[{rec:['Seda'],formula:'1',quem:'eu'}]})},
        {n:'Atar',ic:'🧵',g:'Seda',d:'Gasta o carretel inteiro e enrola os ferimentos.',uso:x=>({tipo:'cura',modo:'instantaneo',custo:['9',['Seda']],formula:'2d8 + Nível',alcance:'si',texto:'Fios apertam as feridas.'})},
        {n:'Tempestade de fios',ic:'🌪',g:'Habilidades de seda',nv:2,d:'Gira cortando tudo à volta.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['3',['Seda']],formula:'3d6',tipoDano:'Corte',alcance:'area',area:{forma:'aura',tam:'3'}})},
        {n:'Lança de seda',ic:'🗡',g:'Habilidades de seda',db:'ritual',dt:'Achar o santuário da habilidade',d:'Arremessa uma lança de seda que atravessa a fila.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['3',['Seda']],formula:'3d8',tipoDano:'Perfuração',alcance:'area',area:{forma:'linha',tam:'12'},
          teste:{attr:ag,cd:'10 + Nível',sucesso:'metade'}})},
        {n:'Alfinetes retos',ic:'📌',g:'Ferramentas',usos:{max:'8',recarga:'longo'},d:'Arremessa alfinetes à distância.',uso:x=>({tipo:'dano',modo:'instantaneo',formula:'1d4',tipoDano:'Perfuração',alcance:'distancia',area:{forma:'',tam:'12'},alvos:'1'})},
        {n:'Bomba de fios',ic:'💣',g:'Ferramentas',db:'ritual',dt:'Comprar ou forjar a ferramenta',usos:{max:'2',recarga:'longo'},d:'Explode em fios afiados.',uso:x=>({tipo:'dano',modo:'instantaneo',formula:'2d6',tipoDano:'Corte',alcance:'area',area:{forma:'circulo',tam:'3'},
          teste:{attr:ag,cd:'10 + Nível',sucesso:'metade'}})},
      ]}),
    _montaPoder(s,{nome:'Brasões',icone:'🛡',cor:'#a16207',modo:'exclusiva',
      desc:'Só um brasão equipado por vez; trocar exige um banco (descanso). Cada um muda o estilo de luta.',
      formas:[
        {n:'Brasão do Caçador',ic:'🏹',g:'Brasão',d:'Equilibrado: golpes mais precisos.',efs:x=>[_rol('ataque',1),_rol('dano',1)]},
        {n:'Brasão do Ceifador',ic:'💀',g:'Brasão',db:'ritual',dt:'Encontrar o brasão',d:'Golpes largos e pesados, mas lentos.',efs:x=>[_rol('dano',3),_rol('ataque',-1)]},
        {n:'Brasão do Errante',ic:'🌬',g:'Brasão',db:'ritual',dt:'Encontrar o brasão',d:'Rápido e esquivo.',efs:x=>[_rol('defesa',2),_cap('Deslocamento extra',3)]},
        {n:'Brasão da Besta',ic:'🐺',g:'Brasão',db:'ritual',dt:'Encontrar o brasão',d:'Feroz: aguenta mais pancada.',efs:x=>[_res('Físico','reduz',2),_efRecF(s,_V,'Nível')]},
      ]})]; }},
  {k:'elementos',ic:'🔥',n:'Elementos que combinam',sub:'magias base + fusões',d:'Aprende alguns elementos; ter dois deles libera a combinação (Fogo + Água = Vapor).',
   f:s=>[_montaPoder(s,{nome:'Elementalismo',icone:'🔥',cor:'#ea580c',rec:{n:'Mana',ic:'🔷',c:'#3b82f6',rc:'longo',a:['Mente','Inteligência','Intelecto','Sabedoria'],f:a=>a?(a+' * 4 + 5'):'5 + Nível * 3'},modo:'escolher',qtd:'2 + piso(Nível / 4)',
    desc:'Quatro elementos base. O conjurador aprende alguns; quando conhece dois que combinam, a fusão aparece sozinha.',
    formas:[
      {n:'Fogo',ic:'🔥',g:'Base',d:'Chama direta.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['2',['Mana']],formula:'2d6',tipoDano:'Fogo',alcance:'distancia',area:{forma:'',tam:'18'},alvos:'1'})},
      {n:'Água',ic:'💧',g:'Base',d:'Água que cura e acalma.',uso:x=>({tipo:'cura',modo:'instantaneo',custo:['2',['Mana']],formula:'1d8 + Nível',alcance:'toque',aplicaEm:'alvo'})},
      {n:'Terra',ic:'🪨',g:'Base',d:'Pedra cobre a pele.',efs:x=>[_rol('defesa',2)],uso:x=>({tipo:'buff',modo:'ativa',custo:['2',['Mana']],alcance:'si'})},
      {n:'Ar',ic:'🌬',g:'Base',d:'Vento empurra o inimigo.',uso:x=>({tipo:'debuff',modo:'instantaneo',custo:['2',['Mana']],alcance:'distancia',area:{forma:'',tam:'12'},alvos:'1',cond:['Caído','🛌','#94a3b8','No chão: levantar gasta movimento.'],condEm:'alvo',teste:{attr:_atrNome(s,_FORTITUDE),cd:'10 + Nível',sucesso:'sem'}})},
    ],
    combos:[
      {a:'Fogo',b:'Água',r:{n:'Vapor',ic:'♨️',d:'Nuvem escaldante que cega.',uso:x=>({tipo:'debuff',modo:'instantaneo',custo:['4',['Mana']],formula:'2d6',tipoDano:'Fogo',aplicaEm:'alvo',alcance:'area',area:{forma:'cubo',tam:'6'},cond:['Cego','🙈','#475569','Não enxerga.'],condEm:'alvo',duracao:'1 rodada',teste:{attr:_atrNome(s,_FORTITUDE),cd:'10 + Nível',sucesso:'metade'}})}},
      {a:'Fogo',b:'Terra',r:{n:'Lava',ic:'🌋',d:'O chão derrete.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['5',['Mana']],formula:'4d6',tipoDano:'Fogo',alcance:'area',area:{forma:'circulo',tam:'6'},teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}})}},
      {a:'Água',b:'Ar',r:{n:'Tempestade',ic:'⛈',d:'Raios em linha.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['5',['Mana']],formula:'4d6',tipoDano:'Elétrico',alcance:'area',area:{forma:'linha',tam:'18'},teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}})}},
      {a:'Terra',b:'Ar',r:{n:'Areia cortante',ic:'🏜',d:'Tempestade de areia.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['4',['Mana']],formula:'3d6',tipoDano:'Corte',alcance:'area',area:{forma:'cone',tam:'6'}})}},
      {a:'Fogo',b:'Ar',r:{n:'Tornado de fogo',ic:'🌪',d:'Coluna de fogo que gira.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['5',['Mana']],formula:'5d6',tipoDano:'Fogo',alcance:'area',area:{forma:'circulo',tam:'3'},teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}})}},
      {a:'Água',b:'Terra',r:{n:'Lama',ic:'🟤',d:'Pântano que prende.',uso:x=>({tipo:'debuff',modo:'instantaneo',custo:['3',['Mana']],alcance:'area',area:{forma:'cubo',tam:'6'},cond:['Lento','🐢','#38bdf8','Movimento pela metade.'],condEm:'alvo',duracao:'1 minuto'})}},
    ]})]},
  {k:'grimorio',ic:'📖',n:'Grimório de magias',sub:'aprende N magias',d:'Magias conhecidas que crescem com o nível, tiradas da biblioteca pronta.',
   f:s=>{ const nomes=['Cura','Bola de fogo','Raio de gelo','Escudo arcano','Lentidão','Voo','Cegueira','Lobo espiritual','Drenar vida','Bênção'];
    const P=_montaPoder(s,{nome:'Grimório arcano',icone:'📖',cor:'#2563eb',rec:{n:'Mana',ic:'🔷',c:'#3b82f6',rc:'longo',a:['Mente','Inteligência','Intelecto','Sabedoria'],f:a=>a?(a+' * 4 + 5'):'5 + Nível * 3'},modo:'escolher',qtd:'2 + piso(Nível / 2)',
      desc:'O conjurador conhece algumas magias do grimório; a cada dois níveis aprende mais uma.',formas:[]});
    nomes.forEach((n,i)=>{ const m=MODELOS_TECNICA.find(x=>x.n===n); if(!m) return; const ab=modeloEmHab(s,m,i<4?0:(i<7?3:5)); ab.grupo=i<4?'1º círculo':i<7?'2º círculo':'3º círculo'; P.formas.push(_formaPadrao(ab)); });
    return [P]; }},
  {k:'posturas',ic:'🥋',n:'Posturas de combate',sub:'uma por vez',d:'O lutador troca de postura: só a equipada vale.',
   f:s=>[_montaPoder(s,{nome:'Posturas',icone:'🥋',cor:'#0f766e',modo:'exclusiva',desc:'Trocar de postura gasta a ação bônus. Só uma vale por vez.',
    formas:[{n:'Postura do Tigre',ic:'🐅',g:'Postura',d:'Ofensiva.',efs:x=>[_rol('dano',2),_rol('defesa',-1)]},
      {n:'Postura da Tartaruga',ic:'🐢',g:'Postura',d:'Defensiva.',efs:x=>[_rol('defesa',3),_cap('Deslocamento extra',-3)]},
      {n:'Postura da Garça',ic:'🕊',g:'Postura',d:'Ágil.',efs:x=>[_cap('Deslocamento extra',3),_rol('ataque',1)]},
      {n:'Postura do Dragão',ic:'🐲',g:'Postura',nv:5,d:'Mestre: equilíbrio entre tudo.',efs:x=>[_rol('todos',1),_rol('dano',1)]}]})]},
];

/* ---------- aba do mestre ---------- */
function tabPoderes(sys){
  sanitizePoderes(sys);
  const ui=S.ui; let P=sys.poderes.find(p=>p.id===ui.poderSel)||sys.poderes[0]||null;
  const novo=()=>{ pushUndo(); const p={id:uid(),nome:'Novo sistema de poder',icone:'🔮',cor:'#7c3aed',desc:'',recursoId:'',todos:false,modo:'todas',escolherQtd:'',copia:false,copiaMax:'',formas:[],combos:[]};
    sys.poderes.push(p); sanitizePoderes(sys); ui.poderSel=p.id; render(); };
  const usarModelo=m=>{ pushUndo(); const ps=m.f(sys); ui.poderSel=ps[0].id; render(); showToast(m.ic+' “'+m.n+'” criado — ligue numa classe ou origem em “Quem recebe”'); };
  const modelos=h('div',{class:'card'},
    h('div',{class:'row between wrapf'},h('h3',{style:{margin:0}},'🔮 Sistemas de poder'),h('button',{class:'btn primary sm',onclick:novo},'+ Sistema em branco')),
    h('div',{class:'hint',style:{margin:'4px 0 10px'}},'Um sistema de poder junta técnicas que funcionam como uma coisa só: shikigamis que se conquistam, magias que se combinam, técnicas que se copiam, brasões que se equipam. Cada técnica dentro dele é uma "forma" — criada com o mesmo editor em blocos.'),
    h('div',{class:'pod-modelos'},...PODER_MODELOS.map(m=>h('button',{type:'button',class:'pod-modelo',onclick:()=>usarModelo(m)},
      h('span',{class:'pod-mic'},m.ic),h('b',{},m.n),h('span',{class:'pod-msub'},m.sub),h('small',{},m.d)))));
  if(!P) return h('div',{},modelos,h('div',{class:'card hint'},'Nenhum sistema de poder ainda. Comece por um modelo acima — dá para mudar tudo depois.'));
  const lista=h('div',{class:'pod-lista',role:'tablist'},...sys.poderes.map(p=>h('button',{type:'button',role:'tab','aria-selected':p===P?'true':'false',class:'pod-tab'+(p===P?' on':''),style:{'--pc':p.cor||'#7c3aed'},onclick:()=>{ui.poderSel=p.id;render();}},
    (p.icone||'🔮')+' '+p.nome,h('span',{class:'tab-n'},String(p.formas.length)))));
  return h('div',{},modelos,lista,poderEditor(sys,P));
}
function poderEditor(sys,P){
  const t=(k,ph,w)=>h('input',{class:'in',style:{maxWidth:w||'none'},value:P[k]||'',placeholder:ph||'',oninput:e=>{P[k]=e.target.value;persist();},onchange:()=>render()});
  const sec=(n,tit,...c)=>h('div',{class:'card pod-sec',style:{'--pc':P.cor||'#7c3aed'}},h('div',{class:'uso-passo-t'},h('span',{class:'uso-n',style:{'--tc':P.cor||'#7c3aed'}},String(n)),tit),...c);
  const recs=(sys.resources||[]).filter(r=>(r.type||'barra')!=='valor');
  /* quem recebe: classes/origens que já têm o efeito */
  const quem=[];
  const temEf=(efs)=>(efs||[]).some(ef=>ef&&((ef.kind==='poder'&&ef.targetId===P.id)||(ef.kind==='livre'&&temEf(ef.mods))));
  (sys.classes||[]).forEach(c=>(c.abilities||[]).forEach(a=>{ if(temEf(a.effects)) quem.push('🎭 '+c.name+((a.req||{}).level>1?(' (nível '+a.req.level+')'):'')); }));
  (sys.origins||[]).forEach(o=>(o.abilities||[]).forEach(a=>{ if(temEf(a.effects)) quem.push('🌱 '+o.name); }));
  (sys.choices||[]).forEach(c=>(c.options||[]).forEach(o=>{ if(temEf(o.effects)) quem.push('🌿 '+o.name); }));
  const darPara=h('select',{class:'in',style:{maxWidth:'260px'},'aria-label':'Dar este sistema para',onchange:e=>{ const [k,id]=e.target.value.split(':'); if(!id) return;
    const alvo=k==='c'?(sys.classes||[]).find(x=>x.id===id):(sys.origins||[]).find(x=>x.id===id); if(!alvo) return; pushUndo();
    if(!Array.isArray(alvo.abilities)) alvo.abilities=[];
    alvo.abilities.push(sanitizarUsoHab({id:uid(),name:P.nome,icon:P.icone||'🔮',description:P.desc||'',req:{level:0,attrs:[]},effects:[_ef({kind:'poder',targetId:P.id})]}));
    render(); showToast('🔮 '+alvo.name+' agora recebe “'+P.nome+'”'); }},
    h('option',{value:''},'+ Dar para uma classe ou origem…'),
    h('optgroup',{label:'Classes'},...(sys.classes||[]).map(c=>h('option',{value:'c:'+c.id},'🎭 '+c.name))),
    h('optgroup',{label:'Origens'},...(sys.origins||[]).map(o=>h('option',{value:'o:'+o.id},'🌱 '+o.name))));
  const s1=sec(1,'Identidade',
    h('div',{class:'row wrapf',style:{alignItems:'flex-end'}},
      field('Ícone',iconePicker(P.icone,v=>{P.icone=v;render();})),
      field('Cor',h('input',{type:'color',class:'in',style:{width:'52px',padding:'2px'},'aria-label':'Cor',value:P.cor||'#7c3aed',oninput:e=>{P.cor=e.target.value;persist();},onchange:()=>render()})),
      h('div',{style:{flex:'1',minWidth:'200px'}},field('Nome',t('nome','Técnica das Dez Sombras'))),
      h('button',{class:'btn sm ghost',title:'Duplicar sistema',onclick:()=>{ pushUndo(); const c=JSON.parse(JSON.stringify(P)); c.id=uid(); c.nome+=' (cópia)';
        const mapa={}; c.formas.forEach(f=>{ const n=uid(); mapa[f.id]=n; f.id=n; }); c.formas.forEach(f=>{ if(mapa[f.desbloq.formaId]) f.desbloq.formaId=mapa[f.desbloq.formaId]; });
        c.combos.forEach(x=>{ x.id=uid(); x.ab.id=uid(); x.a=mapa[x.a]||x.a; x.b=mapa[x.b]||x.b; }); sys.poderes.push(c); S.ui.poderSel=c.id; render(); }},'⧉ Duplicar'),
      h('button',{class:'btn sm danger','aria-label':'Excluir sistema',onclick:()=>comDesfazer('“'+P.nome+'” excluído',()=>{ sys.poderes=sys.poderes.filter(x=>x!==P); })},'✕ Excluir')),
    h('textarea',{class:'in',rows:'2',style:{marginTop:'8px'},value:P.desc||'',placeholder:'Como esse poder funciona na história (aparece na ficha e no livro)',oninput:e=>{P.desc=e.target.value;persist();}}));
  const s2=sec(2,'Regras',
    h('div',{class:'rg-linha'},h('span',{class:'rg-r'},'Recurso principal'),
      h('select',{class:'in',style:{maxWidth:'220px'},onchange:e=>{P.recursoId=e.target.value;render();}},h('option',{value:''},'— nenhum —'),...recs.map(r=>h('option',{value:r.id,selected:r.id===P.recursoId},(r.icon||'')+' '+r.name))),
      h('span',{class:'hint'},'Só para mostrar no grimório; o custo de cada forma é escolhido nela.')),
    h('div',{class:'uso-sec-t',style:{marginTop:'10px'}},'Como o personagem tem as formas'),
    h('div',{class:'pod-modos'},...PODER_MODOS.map(([k,n,d])=>h('button',{type:'button',class:'pod-modo'+(P.modo===k?' on':''),'aria-pressed':P.modo===k?'true':'false',onclick:()=>{P.modo=k;render();}},h('b',{},n),h('small',{},d)))),
    P.modo==='escolher'?h('div',{class:'rg-linha'},h('span',{class:'rg-r'},'Quantas conhece'),
      campoFormula(sys,P,'escolherQtd',{tipo:'recarga',placeholder:'2 + piso(Nível / 2)',aoMudar:()=>render()}),
      h('span',{class:'hint'},'no '+levelLabel(sys,sys.startLevel||1).toLowerCase()+': '+poderQtd(sys,P.escolherQtd,sys.startLevel||1,0)+' · no '+levelLabel(sys,sys.maxLevel||20).toLowerCase()+': '+poderQtd(sys,P.escolherQtd,sys.maxLevel||20,0))):null,
    h('div',{class:'rg-linha',style:{marginTop:'8px'}},_tog(P.copia,'📋 Pode COPIAR técnicas de qualquer lugar do sistema (estilo Yuta)',()=>{P.copia=!P.copia;render();}),
      P.copia?h('span',{class:'rg-r'},'Máximo de cópias'):null, P.copia?h('input',{class:'in mono',style:{width:'160px'},value:P.copiaMax,placeholder:'vazio = sem limite',oninput:e=>{P.copiaMax=e.target.value;persist();}}):null),
    h('div',{class:'uso-sec-t',style:{marginTop:'10px'}},'Quem recebe'),
    h('div',{class:'rg-linha'},_tog(P.todos,'Todo personagem tem',()=>{P.todos=!P.todos;render();}),P.todos?null:darPara),
    !P.todos?h('div',{class:'row wrapf',style:{marginTop:'6px'}},...(quem.length?quem.map(q=>h('span',{class:'tl-chip cls'},q)):[h('span',{class:'hint'},'Ninguém recebe ainda. Dê para uma classe/origem acima, ou coloque o efeito “🔮 Concede um sistema de poder” em qualquer habilidade, escolha ou item.')])):null);
  /* formas agrupadas */
  const grupos=[...new Set(P.formas.map(f=>f.grupo||''))];
  const outras=f=>P.formas.filter(x=>x!==f).map(x=>[x.id,(x.icon||'')+' '+x.name]);
  const formaLinha=f=>{ _formaPadrao(f); const db=f.desbloq;
    const sl=(obj,k,lista,vazio,w)=>h('select',{class:'in blk-in',style:{maxWidth:w||'220px'},'aria-label':vazio||k,onchange:e=>{obj[k]=e.target.value;render();}},
      vazio!=null?h('option',{value:''},vazio):null,...lista.map(([v,n])=>h('option',{value:v,selected:obj[k]===v},n)));
    return h('div',{class:'pod-forma'},
      h('div',{class:'pod-desb'},
        h('span',{class:'hint'},'Libera:'),sl(db,'tipo',DESBLOQ_TIPOS.map(x=>[x[0],x[1]]),null,'230px'),
        (db.tipo==='forma'||db.tipo==='perdida')?sl(db,'formaId',outras(f),'— qual forma —'):null,
        db.tipo==='ritual'?h('input',{class:'in blk-in',style:{width:'260px'},value:db.texto,placeholder:'O que precisa fazer (vencer o shikigami…)',oninput:e=>{db.texto=e.target.value;persist();}}):null,
        h('label',{class:'blk-chk',title:'Na ficha aparece o botão “💀 destruída”: a forma some para sempre (e pode liberar uma herança)'},h('input',{type:'checkbox',checked:f.perdivel,onchange:e=>{f.perdivel=e.target.checked;render();}}),' 💀 pode ser destruída'),
        h('input',{class:'in blk-in',style:{width:'150px'},value:f.grupo,placeholder:'Grupo (Shikigami…)',list:'dl-pod-grp-'+P.id,'aria-label':'Grupo',oninput:e=>{f.grupo=e.target.value;persist();},onchange:()=>render()})),
      habCard(sys,P.formas,f,{nivel:true,ph:'Nome da forma'}));
  };
  const s3=sec(3,'Formas ('+P.formas.length+')',
    h('div',{class:'hint'},'Cada forma é uma técnica completa (botão na ficha, custo, efeitos). Em cima dela você diz COMO ela libera. O nível mínimo fica no número ao lado do nome.'),
    h('datalist',{id:'dl-pod-grp-'+P.id},...grupos.filter(Boolean).map(g=>h('option',{value:g}))),
    ...grupos.map(g=>h('div',{class:'pod-grupo'},g?h('div',{class:'pod-grupo-t'},g):null,...P.formas.filter(f=>(f.grupo||'')===g).map(formaLinha))),
    barraCriarHab(sys,{arr:P.formas,nivel:0},{chave:'pod_'+P.id,titulo:'Criar forma',nomePadrao:'Nova forma'}));
  const s4=sec(4,'Combinações ('+P.combos.length+')',
    h('div',{class:'hint'},'Quando o personagem tem as DUAS formas ativas, a combinação aparece sozinha na ficha (fusão de shikigamis, Fogo + Água = Vapor…).'),
    ...P.combos.map(c=>{ const fs=P.formas.map(x=>[x.id,(x.icon||'')+' '+x.name]);
      const sl=k=>h('select',{class:'in blk-in',style:{maxWidth:'200px'},'aria-label':'Forma '+k,onchange:e=>{c[k]=e.target.value;render();}},h('option',{value:''},'— forma —'),...fs.map(([v,n])=>h('option',{value:v,selected:c[k]===v},n)));
      return h('div',{class:'pod-forma'},h('div',{class:'pod-desb'},sl('a'),h('b',{},'+'),sl('b'),h('b',{},'='),h('span',{class:'hint'},'↓')),
        habCard(sys,{splice:(i,n)=>{ if(n) P.combos=P.combos.filter(x=>x!==c); },indexOf:()=>0},c.ab,{ph:'Nome da combinação'})); }),
    h('button',{class:'btn sm',onclick:()=>{ pushUndo(); const ab=sanitizarUsoHab({id:uid(),name:'Nova combinação',icon:'🔗',description:'',req:{level:0,attrs:[]},effects:[]});
      P.combos.push({id:uid(),a:(P.formas[0]||{}).id||'',b:(P.formas[1]||{}).id||'',ab}); S.ui.open[ab.id]=true; S.ui['habTab_'+ab.id]='uso'; render(); }},'+ Combinação'));
  return h('div',{class:'pod-ed'},s1,s2,s3,s4);
}

/* ---------- ficha: grimório ---------- */
const ESTADO_FORMA={ativa:['✓','Ativa'],nivel:['🔒','Nível'],ritual:['🕯','A conquistar'],requer:['🔗','Depende de outra'],perdida:['💀','Destruída'],escolher:['🎓','Pode aprender'],guardada:['🎽','Guardada']};
function grimorioInner(sys,d,ctx,mode){
  const fontes=[...(ctx.eff.active||[]),...(ctx.eff.locked||[])].filter(x=>x.tipo!=='poder');
  const Ps=poderesDoPersonagem(sys,d,fontes,ctx.eff.equipped);
  if(!Ps.length) return null;
  const joga=mode==='play'||mode==='criar'||!mode;
  const ligadaDe=ab=>{ const x=(ctx.eff.active||[]).find(a=>a.ab.id===ab.id); return x?x.ligada!==false:true; };
  return h('div',{class:'graf'},...Ps.map(P=>{
    const e=poderEstadoDe(d,P.id), lv=d.level||1, aberto=S.ui['graf_'+P.id]!==false;
    const st={}; P.formas.forEach(f=>st[f.id]=formaEstado(sys,d,P,f));
    const rec=P.recursoId?(ctx.allRes||[]).find(r=>r.id===P.recursoId):null;
    const lim=P.modo==='escolher'?poderQtd(sys,P.escolherQtd,lv,Infinity):Infinity;
    const conhecidas=P.modo==='escolher'?e.esc.filter(id=>P.formas.some(f=>f.id===id)).length:0;
    const nomeDe=id=>((P.formas.find(f=>f.id===id)||{}).name)||'?';
    const acoes=f=>{ const s=st[f.id], b=[];
      if(s==='ritual') b.push(h('button',{class:'btn mini emerald',title:f.desbloq.texto||'',onclick:()=>{e.des[f.id]=true;render();showToast('🕯 '+f.name+' conquistada!');}},'✓ Conquistado'));
      if(s==='escolher') b.push(h('button',{class:'btn mini primary',disabled:conhecidas>=lim||null,title:conhecidas>=lim?'Já conhece o máximo ('+lim+')':'',onclick:()=>{e.esc.push(f.id);render();}},'🎓 Aprender'));
      if(s==='guardada') b.push(h('button',{class:'btn mini primary',onclick:()=>{e.equip=f.id;render();showToast('🎽 '+f.name+' equipada');}},'🎽 Equipar'));
      if(s==='ativa'&&P.modo==='escolher') b.push(h('button',{class:'btn mini ghost',onclick:()=>{e.esc=e.esc.filter(x=>x!==f.id);render();}},'esquecer'));
      if(s==='ativa'&&P.modo==='exclusiva') b.push(h('span',{class:'tl-chip ini'},'🎽 equipada'));
      if(f.perdivel&&s!=='perdida'&&s!=='nivel'&&s!=='ritual') b.push(h('button',{class:'btn mini ghost',title:'Marca como destruída para sempre',onclick:async()=>{ if(await uiConfirm('“'+f.name+'” foi destruída? Ela some da ficha (dá para restaurar depois).')){ e.perd[f.id]=true; render(); } }},'💀 destruída'));
      if(s==='perdida') b.push(h('button',{class:'btn mini ghost',onclick:()=>{delete e.perd[f.id];render();}},'↺ restaurar'));
      if(e.des[f.id]&&s!=='ritual'&&f.desbloq.tipo==='ritual') b.push(h('button',{class:'btn mini ghost',title:'Desfazer a conquista',onclick:()=>{delete e.des[f.id];render();}},'↺'));
      return b; };
    const linha=f=>{ const s=st[f.id], [ic,rot]=ESTADO_FORMA[s]||['','']; const db=f.desbloq;
      if(s==='ativa') return h('div',{class:'graf-f on'},cartaoTecnica(sys,d,ctx,f,{ligada:ligadaDe(f),play:mode==='play'}),h('div',{class:'row wrapf graf-ac'},...acoes(f)));
      const motivo=s==='nivel'?('a partir do '+levelLabel(sys,f.req.level).toLowerCase()):s==='ritual'?(db.texto||'precisa ser conquistada'):
        s==='requer'?(db.tipo==='perdida'?('quando '+nomeDe(db.formaId)+' for destruída'):('depois de '+nomeDe(db.formaId))):s==='perdida'?'destruída — não pode mais ser usada':
        s==='escolher'?(typeof habFrase==='function'?habFrase(sys,f):''):s==='guardada'?(typeof habFrase==='function'?habFrase(sys,f):''):'';
      return h('div',{class:'graf-f st-'+s},h('span',{class:'graf-ic'},f.icon||'✦'),h('div',{class:'graf-tx'},h('b',{},f.name),h('small',{},ic+' '+rot+' · '+motivo)),h('div',{class:'row wrapf graf-ac'},...acoes(f)));
    };
    const grupos=[...new Set(P.formas.map(f=>f.grupo||''))];
    const combos=P.combos.map(c=>{ const ok=st[c.a]==='ativa'&&st[c.b]==='ativa';
      return ok?h('div',{class:'graf-f on'},cartaoTecnica(sys,d,ctx,c.ab,{ligada:ligadaDe(c.ab),play:mode==='play',fonte:nomeDe(c.a)+' + '+nomeDe(c.b)}))
        :h('div',{class:'graf-f st-requer'},h('span',{class:'graf-ic'},c.ab.icon||'🔗'),h('div',{class:'graf-tx'},h('b',{},c.ab.name),h('small',{},'🔗 precisa de '+nomeDe(c.a)+' + '+nomeDe(c.b)+' ativas'))); });
    /* cópias (Yuta) */
    let copias=null;
    if(P.copia){
      const todas=todasHabsDoSistema(sys), mx=poderQtd(sys,P.copiaMax,lv,Infinity);
      const minhas=e.copias.map(id=>todas.find(t=>t.ab.id===id)).filter(Boolean);
      const busca=S.ui['grafQ_'+P.id];
      const cands=busca!=null?todas.filter(t=>!P.formas.includes(t.ab)&&!P.combos.some(c=>c.ab===t.ab)&&!e.copias.includes(t.ab.id)&&t.ab.uso&&t.ab.uso.on&&(!busca||semAcentoSeguro(t.ab.name+' '+t.de).includes(semAcentoSeguro(busca)))).slice(0,30):[];
      copias=h('div',{class:'graf-grupo'},h('div',{class:'pod-grupo-t'},'📋 Técnicas copiadas ('+minhas.length+(mx!==Infinity?('/'+mx):'')+')'),
        ...minhas.map(t=>h('div',{class:'graf-f on'},cartaoTecnica(sys,d,ctx,t.ab,{ligada:ligadaDe(t.ab),play:mode==='play',fonte:'copiada de '+t.de}),
          h('div',{class:'row wrapf graf-ac'},h('button',{class:'btn mini ghost',onclick:()=>{e.copias=e.copias.filter(x=>x!==t.ab.id);render();}},'esquecer')))),
        busca==null?h('button',{class:'btn sm',disabled:minhas.length>=mx||null,onclick:()=>{S.ui['grafQ_'+P.id]='';render();}},'📋 Copiar uma técnica'):
          h('div',{class:'graf-copia'},h('div',{class:'row wrapf'},h('input',{class:'in',type:'search',placeholder:'🔎 Qual técnica você viu? (nome ou classe)',value:busca,style:{flex:'1'},oninput:e2=>{S.ui['grafQ_'+P.id]=e2.target.value;render();}}),
            h('button',{class:'btn sm ghost',onclick:()=>{delete S.ui['grafQ_'+P.id];render();}},'fechar')),
            h('div',{class:'bib-grid'},...cands.map(t=>h('button',{type:'button',class:'bib-card',onclick:()=>{ e.copias.push(t.ab.id); delete S.ui['grafQ_'+P.id]; render(); showToast('📋 Copiou “'+t.ab.name+'”'); }},
              h('span',{class:'bib-ic'},t.ab.icon||'✨'),h('b',{},t.ab.name),h('small',{},usoHabResumo(sys,t.ab)),h('span',{class:'bib-cat'},t.de)))),
            !cands.length?h('div',{class:'hint'},'Nenhuma técnica usável encontrada.'):null));
    }
    const nAtivas=P.formas.filter(f=>st[f.id]==='ativa').length;
    const resumo=[rec?((rec.icon||'')+' '+rec.name+' '+rec.cur+'/'+rec.max):null,
      P.modo==='escolher'?('🎓 conhece '+conhecidas+'/'+(lim===Infinity?'∞':lim)):null,
      P.modo==='exclusiva'?('🎽 '+(e.equip&&st[e.equip]==='ativa'?nomeDe(e.equip):'nada equipado')):null,
      nAtivas+' de '+P.formas.length+' formas'].filter(Boolean).join(' · ');
    return h('div',{class:'graf-p',style:{'--pc':P.cor||'#7c3aed'}},
      h('button',{type:'button',class:'graf-cab','aria-expanded':aberto?'true':'false',onclick:()=>{S.ui['graf_'+P.id]=!aberto;render();}},
        h('span',{class:'graf-pic'},P.icone||'🔮'),h('span',{class:'graf-pn'},h('b',{},P.nome),h('small',{},resumo)),h('span',{class:'acc-caret'},aberto?'▼':'▶')),
      aberto?h('div',{class:'graf-corpo'},
        P.desc?h('div',{class:'hint',style:{marginBottom:'6px'}},P.desc):null,
        ...grupos.map(g=>h('div',{class:'graf-grupo'},g?h('div',{class:'pod-grupo-t'},g):null,...P.formas.filter(f=>(f.grupo||'')===g).map(linha))),
        P.combos.length?h('div',{class:'graf-grupo'},h('div',{class:'pod-grupo-t'},'🔗 Combinações'),...combos):null,
        copias):null);
  }));
}
