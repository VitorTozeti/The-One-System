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
  Object.assign(ab,{grupo:o.g||'',perdivel:!!o.perd,desbloq:{tipo:o.db||'livre',formaId:'',texto:o.dt||''},_req:o.req||'',grau:o.gr||0,_el:o.el||''});
  if(o.usos) ab.uso.usos=Object.assign({max:'',recarga:'longo'},o.usos);
  return ab;
}
function _montaPoder(sys,o){
  const rec=o.rec?_garanteRec(sys,o.rec):null;
  const P={id:uid(),nome:o.nome,icone:o.icone,cor:o.cor,desc:o.desc,recursoId:rec?rec.id:'',todos:!!o.todos,modo:o.modo||'todas',escolherQtd:o.qtd||'',copia:!!o.copia,copiaMax:o.copiaMax||'',
    categoria:o.cat||'tecnica',grauAuto:!!o.grauAuto,graus:(o.graus||[]).map(g=>({id:uid(),nome:g[0],nivel:String(g[1]||''),desc:g[2]||''})),
    elementos:(o.elementos||[]).map(x=>({id:uid(),nome:x[0],icone:x[1],cor:x[2]})),formas:[],combos:[]};
  P.formas=(o.formas||[]).map(f=>_pf(sys,f));
  P.formas.forEach(f=>{ const el=P.elementos.find(x=>x.nome===f._el); f.elemento=el?el.id:''; delete f._el; });
  const porNome=n=>P.formas.find(f=>f.name===n);
  P.formas.forEach(f=>{ if(f._req){ const x=porNome(f._req); if(x) f.desbloq.formaId=x.id; } delete f._req; });
  P.combos=(o.combos||[]).map(c=>{ const a=porNome(c.a), b=porNome(c.b); const ab=_pf(sys,c.r); delete ab._req; delete ab._el; return {id:uid(),a:a?a.id:'',b:b?b.id:'',ab}; });
  sys.poderes.push(P); sanitizePoderes(sys); return P;
}
const _EA=s=>({n:'Energia Amaldiçoada',ic:'🌑',c:'#7c3aed',rc:'longo',a:['Vontade','Presença','Espírito','Mente','Sabedoria'],f:a=>a?(a+' * 4 + Nível * 4'):'10 + Nível * 5',d:'Combustível das técnicas amaldiçoadas.'});
const _inv=(nome,ic,cor,estilo,vida,def,atk,dano,mov,o)=>Object.assign({nome,icone:ic,cor,estilo,vida,defesa:def,ataque:atk,dano,mov,qtd:'1',duracao:'até dispensar',desc:''},o||{});
const PODER_MODELOS=[
  {k:'sombras',cat:'tecnica',ic:'🐕',n:'Dez Sombras',sub:'estilo Megumi',d:'Shikigamis que se conquistam num ritual, podem ser destruídos para sempre e passam o poder adiante. Tem fusão e expansão de domínio.',
   f:s=>[_montaPoder(s,{nome:'Técnica das Dez Sombras',icone:'🐕',cor:'#4c1d95',rec:_EA(s),modo:'todas',cat:'tecnica',
    graus:[['Grau 1 — Despertar','','Invoca os primeiros shikigamis.'],['Grau 2 — Domínio','3','Shikigamis mais fortes podem ser chamados.'],['Grau 3 — Maestria','7','Feras de elite.'],['Grau 4 — Expansão','12','Expansão de domínio e o proibido.']],
    desc:'Invoca shikigamis a partir da própria sombra. Cada um precisa ser vencido num ritual antes de servir. Um shikigami destruído não volta, mas o que sobra dele fortalece outro.',
    formas:[
      {n:'Cães Divinos',ic:'🐕',g:'Shikigami',perd:true,d:'Dois cães de sombra que rastreiam e mordem.',uso:x=>({tipo:'invocacao',modo:'instantaneo',custo:['2',['Energia Amaldiçoada']],alcance:'distancia',area:{forma:'',tam:'9'},
        invoc:_inv('Cão Divino','🐕','#312e81','espirito','8 + Nível * 2','13','+5','1d8 + 2','12',{qtd:'2',desc:'Faro perfeito; um branco e um preto.'})})},
      {n:'Nue',ic:'🦅',g:'Shikigami',db:'ritual',dt:'Vencer o Nue no ritual de domínio',perd:true,d:'Ave elétrica: carrega você no ar e dá descargas.',uso:x=>({tipo:'invocacao',modo:'ativa',custo:['3',['Energia Amaldiçoada']],alcance:'si',
        invoc:_inv('Nue','🦅','#facc15','espirito','12 + Nível * 2','14','+6','2d6 (elétrico)','18 (voo)',{duracao:'enquanto ligada',desc:'Pode carregar o invocador voando.'})})},
      {n:'Sapo',ic:'🐸',g:'Shikigami',db:'ritual',dt:'Vencer o Sapo no ritual',perd:true,d:'Língua que puxa aliados para longe do perigo ou prende inimigos.',uso:x=>({tipo:'debuff',modo:'instantaneo',custo:['1',['Energia Amaldiçoada']],alcance:'distancia',area:{forma:'',tam:'12'},alvos:'1',
        cond:['Agarrado','🪢','#16a34a','Não se move até se soltar.'],condEm:'alvo',duracao:'1 rodada',teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'sem'}})},
      {n:'Grande Serpente',gr:1,ic:'🐍',g:'Shikigami',db:'ritual',dt:'Vencer a Grande Serpente no ritual',perd:true,nv:3,d:'Surge do chão sob o inimigo e o abocanha.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['3',['Energia Amaldiçoada']],formula:'3d8',tipoDano:'Impacto',alcance:'distancia',area:{forma:'',tam:'18'},alvos:'1',
        cond:['Agarrado','🪢','#16a34a','Não se move até se soltar.'],condEm:'alvo',duracao:'1 rodada'})},
      {n:'Coelhos Fugitivos',gr:1,ic:'🐇',g:'Shikigami',db:'ritual',dt:'Vencer os coelhos no ritual',nv:3,d:'Uma enxurrada de coelhos esconde você e os aliados.',efs:x=>[_rol('defesa',3)],uso:x=>({tipo:'buff',modo:'ativa',custo:['2',['Energia Amaldiçoada']],alcance:'area',area:{forma:'aura',tam:'6'},duracao:'1 rodada'})},
      {n:'Elefante Máximo',gr:1,ic:'🐘',g:'Shikigami',db:'ritual',dt:'Vencer o Elefante no ritual',nv:5,d:'Cai do alto e despeja uma torrente de água.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['5',['Energia Amaldiçoada']],formula:'4d8',tipoDano:'Impacto',alcance:'area',area:{forma:'cone',tam:'9'},
        teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}})},
      {n:'Cervo Redondo',gr:2,ic:'🦌',g:'Shikigami',db:'ritual',dt:'Vencer o Cervo no ritual',nv:7,d:'Cura em volta e desfaz técnicas inimigas.',uso:x=>({tipo:'cura',modo:'instantaneo',custo:['5',['Energia Amaldiçoada']],aplicaEm:'alvo',formula:'3d8 + Nível',alcance:'area',area:{forma:'aura',tam:'6'},texto:'O cervo brilha e as feridas fecham.'})},
      {n:'Boi Perfurante',gr:2,ic:'🐂',g:'Shikigami',db:'ritual',dt:'Vencer o Boi no ritual',nv:7,d:'Investida em linha: quanto mais distância, mais dano.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['4',['Energia Amaldiçoada']],formula:'2d10 + Nível',tipoDano:'Perfuração',alcance:'area',area:{forma:'linha',tam:'18'},
        teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}})},
      {n:'Tigre Funeral',gr:2,ic:'🐅',g:'Shikigami',db:'ritual',dt:'Vencer o Tigre no ritual',nv:9,d:'Fera de caça rápida e brutal.',uso:x=>({tipo:'invocacao',modo:'instantaneo',custo:['5',['Energia Amaldiçoada']],alcance:'distancia',area:{forma:'',tam:'9'},
        invoc:_inv('Tigre Funeral','🐅','#9a3412','fera','25 + Nível * 3','15','+8','2d10 + 4','15')})},
      {n:'Cão Divino: Totalidade',ic:'🐺',g:'Herança',db:'perdida',req:'Cães Divinos',d:'Quando um Cão Divino é destruído, o que restou dele se junta ao outro num lobo maior.',uso:x=>({tipo:'invocacao',modo:'instantaneo',custo:['3',['Energia Amaldiçoada']],alcance:'distancia',area:{forma:'',tam:'9'},
        invoc:_inv('Cão Divino: Totalidade','🐺','#e5e7eb','espirito','20 + Nível * 3','15','+8','2d8 + 4','15',{desc:'Garras longas; muito mais rápido.'})})},
      {n:'Mahoraga',gr:3,ic:'☸️',g:'Proibido',db:'ritual',nv:15,dt:'O ritual é a luta: precisa vencê-lo sozinho. Se falhar, ele destrói todos os presentes, inclusive você.',d:'O shikigami mais forte. Adapta-se a tudo que o fere.',uso:x=>({tipo:'invocacao',modo:'instantaneo',custo:['10',['Energia Amaldiçoada']],alcance:'distancia',area:{forma:'',tam:'9'},
        invoc:_inv('Mahoraga','☸️','#f5f5f4','divino','80 + Nível * 5','18','+12','4d10','12',{desc:'Adaptação: depois de sofrer um tipo de dano, fica imune a ele.'})})},
      {n:'Expansão de Domínio: Jardim das Sombras',gr:3,ic:'🌑',g:'Domínio',db:'ritual',nv:12,dt:'Despertar a expansão de domínio',d:'O chão vira sombra: shikigamis surgem de todo lado e você se move por elas.',efs:x=>[_rol('ataque',2),_rol('defesa',2)],
        uso:x=>({tipo:'buff',modo:'ativa',custo:['8',['Energia Amaldiçoada']],alcance:'area',area:{forma:'aura',tam:'15'},duracao:'enquanto ligada',texto:'As sombras engolem o campo.'}),usos:{max:'1',recarga:'longo'}},
    ],
    combos:[{a:'Nue',b:'Grande Serpente',r:{n:'Fusão: Serpente Alada',ic:'🐉',d:'Nue e Serpente fundidos: ataque aéreo que arrasta o alvo.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['5',['Energia Amaldiçoada']],formula:'4d8',tipoDano:'Elétrico',alcance:'distancia',area:{forma:'',tam:'18'},alvos:'1',
      cond:['Agarrado','🪢','#16a34a','Não se move até se soltar.'],condEm:'alvo',duracao:'1 rodada'})}},
      {a:'Cães Divinos',b:'Sapo',r:{n:'Fusão: Caçada da Sombra',ic:'🐾',d:'Os cães farejam e o sapo puxa a presa até eles.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['3',['Energia Amaldiçoada']],formula:'2d8 + 2',tipoDano:'Perfuração',alcance:'distancia',area:{forma:'',tam:'12'},alvos:'1'})}}]})]},
  {k:'yuta',cat:'tecnica',ic:'💍',n:'Cópia e Rika',sub:'estilo Yuta',d:'Reserva enorme de energia, um espírito ligado a você e o poder de COPIAR qualquer técnica do sistema.',
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
  {k:'hornet',cat:'tecnica',ic:'🕷',n:'Seda e Brasões',sub:'estilo Hornet (Silksong)',d:'Golpes que ENCHEM a Seda, Atar para se curar, habilidades de seda, ferramentas com usos e um BRASÃO equipado por vez.',
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
    _montaPoder(s,{nome:'Brasões',icone:'🛡',cor:'#a16207',modo:'exclusiva',cat:'outro',
      desc:'Só um brasão equipado por vez; trocar exige um banco (descanso). Cada um muda o estilo de luta.',
      formas:[
        {n:'Brasão do Caçador',ic:'🏹',g:'Brasão',d:'Equilibrado: golpes mais precisos.',efs:x=>[_rol('ataque',1),_rol('dano',1)]},
        {n:'Brasão do Ceifador',ic:'💀',g:'Brasão',db:'ritual',dt:'Encontrar o brasão',d:'Golpes largos e pesados, mas lentos.',efs:x=>[_rol('dano',3),_rol('ataque',-1)]},
        {n:'Brasão do Errante',ic:'🌬',g:'Brasão',db:'ritual',dt:'Encontrar o brasão',d:'Rápido e esquivo.',efs:x=>[_rol('defesa',2),_cap('Deslocamento extra',3)]},
        {n:'Brasão da Besta',ic:'🐺',g:'Brasão',db:'ritual',dt:'Encontrar o brasão',d:'Feroz: aguenta mais pancada.',efs:x=>[_res('Físico','reduz',2),_efRecF(s,_V,'Nível')]},
      ]})]; }},
  {k:'elementos',cat:'magia',ic:'🔥',n:'Elementos que combinam',sub:'magias base + fusões',d:'Aprende alguns elementos; ter dois deles libera a combinação (Fogo + Água = Vapor).',
   f:s=>[_montaPoder(s,{nome:'Elementalismo',icone:'🔥',cor:'#ea580c',rec:{n:'Mana',ic:'🔷',c:'#3b82f6',rc:'longo',a:['Mente','Inteligência','Intelecto','Sabedoria'],f:a=>a?(a+' * 4 + 5'):'5 + Nível * 3'},modo:'escolher',qtd:'2 + piso(Nível / 4)',cat:'magia',
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
  {k:'grimorio',cat:'magia',ic:'📖',n:'Grimório de magias',sub:'aprende N magias',d:'Magias conhecidas que crescem com o nível, tiradas da biblioteca pronta.',
   f:s=>{ const nomes=['Cura','Bola de fogo','Raio de gelo','Escudo arcano','Lentidão','Voo','Cegueira','Lobo espiritual','Drenar vida','Bênção'];
    const P=_montaPoder(s,{nome:'Grimório arcano',icone:'📖',cor:'#2563eb',rec:{n:'Mana',ic:'🔷',c:'#3b82f6',rc:'longo',a:['Mente','Inteligência','Intelecto','Sabedoria'],f:a=>a?(a+' * 4 + 5'):'5 + Nível * 3'},modo:'escolher',qtd:'2 + piso(Nível / 2)',cat:'magia',todos:true,grauAuto:true,graus:[['1º círculo','1'],['2º círculo','3'],['3º círculo','5']],
      desc:'Qualquer um pode estudar o grimório; a cada dois níveis aprende mais uma magia. Círculos mais altos abrem com o nível.',formas:[]});
    nomes.forEach((n,i)=>{ const m=MODELOS_TECNICA.find(x=>x.n===n); if(!m) return; const ab=modeloEmHab(s,m,i<4?0:(i<7?3:5)); ab.grau=i<4?0:i<7?1:2; P.formas.push(_formaPadrao(ab)); });
    return [P]; }},
  {k:'ilimitado',cat:'tecnica',ic:'♾️',n:'Ilimitado',sub:'técnica inata estilo Gojo',d:'Técnica única que cresce em graus: Infinito → Azul → Vermelho → Roxo → Expansão de domínio. Cada grau é treinado na história.',
   f:s=>[_montaPoder(s,{nome:'Ilimitado',icone:'♾️',cor:'#0ea5e9',rec:_EA(s),modo:'todas',cat:'tecnica',
    graus:[['Grau 1 — Neutro','','Controle básico do espaço infinito.'],['Grau 2 — Amplificação','3','Azul: atração.'],['Grau 3 — Inversão','6','Energia reversa: Vermelho.'],['Grau 4 — Imaginário','10','Une Azul e Vermelho: Roxo.'],['Grau 5 — Domínio','14','Expansão de domínio.']],
    desc:'Torna o espaço infinito ao redor do usuário. Só ele nasce com esta técnica; ela evolui por graus de domínio que o mestre libera quando o personagem treina.',
    formas:[
      {n:'Infinito',ic:'♾️',g:'Neutro',d:'Nada toca você: o espaço entre vocês nunca acaba.',efs:x=>[_rol('defesa',3)],uso:x=>({tipo:'buff',modo:'ativa',custo:['1',['Energia Amaldiçoada']],alcance:'si',duracao:'enquanto ligada'})},
      {n:'Azul',ic:'🔵',gr:1,g:'Amplificação',d:'Ponto de atração que puxa e esmaga.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['3',['Energia Amaldiçoada']],formula:'3d8',tipoDano:'Força',alcance:'area',area:{forma:'circulo',tam:'3'},teste:{attr:_atrNome(s,_FORTITUDE),cd:'10 + Nível',sucesso:'metade'}})},
      {n:'Vermelho',ic:'🔴',gr:2,g:'Inversão',d:'Repulsão violenta em linha.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['5',['Energia Amaldiçoada']],formula:'5d8',tipoDano:'Força',alcance:'area',area:{forma:'linha',tam:'18'},teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}})},
      {n:'Energia Reversa',ic:'💗',gr:2,g:'Inversão',d:'Cura o próprio corpo.',uso:x=>({tipo:'cura',modo:'instantaneo',custo:['4',['Energia Amaldiçoada']],formula:'3d8 + Nível',alcance:'si'})},
      {n:'Vazio Roxo',ic:'🟣',gr:3,g:'Imaginário',usos:{max:'1',recarga:'longo'},d:'Azul + Vermelho: apaga tudo no caminho.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['10',['Energia Amaldiçoada']],formula:'10d10',tipoDano:'Força',alcance:'area',area:{forma:'linha',tam:'30'},teste:{attr:_atrNome(s,_REFLEXO),cd:'12 + Nível',sucesso:'metade'}})},
      {n:'Expansão de Domínio: Vazio Infinito',ic:'🌌',gr:4,g:'Domínio',usos:{max:'1',recarga:'longo'},d:'Inunda a mente dos alvos com informação infinita.',uso:x=>({tipo:'debuff',modo:'ativa',custo:['15',['Energia Amaldiçoada']],alcance:'area',area:{forma:'aura',tam:'15'},alvos:'todos',
        cond:['Atordoado','💫','#eab308','Perde a próxima ação.'],condEm:'alvo',duracao:'enquanto ligada',teste:{attr:_atrNome(s,_VONTADE),cd:'14 + Nível',sucesso:'sem'}})},
    ]})]},
  {k:'paranormal',cat:'magia',ic:'🕯',n:'Rituais paranormais',sub:'magia aberta estilo Ordem',d:'Grande sistema de rituais que qualquer agente pode aprender: 5 elementos, 4 círculos liberados pelo nível, custo em PE.',
   f:s=>[_montaPoder(s,{nome:'Rituais do Outro Lado',icone:'🕯',cor:'#7f1d1d',todos:true,grauAuto:true,
    rec:{n:'Pontos de Esforço',ic:'⚡',c:'#f59e0b',rc:'longo',a:['Presença','Vontade','Espírito','Carisma'],f:a=>a?(a+' * 2 + Nível * 3'):'2 + Nível * 3',d:'Combustível dos rituais.'},
    modo:'escolher',qtd:'1 + piso(Nível / 2)',cat:'magia',
    graus:[['1º círculo','1','Rituais simples: 1 PE.'],['2º círculo','4','3 PE.'],['3º círculo','8','6 PE.'],['4º círculo','13','10 PE — rituais lendários.']],
    elementos:[['Sangue','🩸','#b91c1c'],['Morte','💀','#525252'],['Conhecimento','👁','#ca8a04'],['Energia','⚡','#7c3aed'],['Medo','🌫','#94a3b8']],
    desc:'O Outro Lado responde a quem estuda seus símbolos. Qualquer personagem pode aprender rituais; o nível abre círculos maiores e cada ritual pertence a um elemento.',
    formas:[
      {n:'Arma Atroz',ic:'🗡',el:'Sangue',g:'Sangue',d:'A arma sangra e corta mais fundo.',efs:x=>[_rol('dano',2)],uso:x=>({tipo:'buff',modo:'ativa',custo:['1',['Pontos de Esforço']],alcance:'toque',duracao:'cena'})},
      {n:'Descarnar',ic:'🩸',el:'Sangue',gr:1,g:'Sangue',d:'A carne do alvo se abre em cortes.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['3',['Pontos de Esforço']],formula:'6d8',tipoDano:'Corte',alcance:'distancia',area:{forma:'',tam:'9'},alvos:'1',teste:{attr:_atrNome(s,_FORTITUDE),cd:'10 + Nível',sucesso:'metade'}})},
      {n:'Decadência',ic:'💀',el:'Morte',g:'Morte',d:'Toque que apodrece.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['1',['Pontos de Esforço']],formula:'2d8 + 2',tipoDano:'Morte',alcance:'toque',alvos:'1',teste:{attr:_atrNome(s,_FORTITUDE),cd:'10 + Nível',sucesso:'metade'}})},
      {n:'Velocidade Mortal',ic:'⏳',el:'Morte',gr:1,g:'Morte',d:'O tempo anda mais devagar para os outros.',uso:x=>({tipo:'buff',modo:'ativa',custo:['3',['Pontos de Esforço']],alcance:'si',duracao:'cena'})},
      {n:'Terceiro Olho',ic:'👁',el:'Conhecimento',g:'Conhecimento',d:'Enxerga o paranormal escondido.',uso:x=>({tipo:'utilidade',modo:'ativa',custo:['1',['Pontos de Esforço']],alcance:'si',duracao:'cena'})},
      {n:'Localização',ic:'🧭',el:'Conhecimento',gr:1,g:'Conhecimento',d:'Sabe onde está um objeto ou pessoa que já tocou.',uso:x=>({tipo:'utilidade',modo:'instantaneo',custo:['3',['Pontos de Esforço']],alcance:'si'})},
      {n:'Amaldiçoar Arma',ic:'⚡',el:'Energia',g:'Energia',d:'A arma crepita com energia instável.',efs:x=>[_rol('dano',2)],uso:x=>({tipo:'buff',modo:'ativa',custo:['1',['Pontos de Esforço']],alcance:'toque',duracao:'cena'})},
      {n:'Eletrocussão',ic:'🌩',el:'Energia',gr:1,g:'Energia',d:'Arco elétrico que salta entre inimigos.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['3',['Pontos de Esforço']],formula:'3d6',tipoDano:'Elétrico',alcance:'area',area:{forma:'linha',tam:'12'},teste:{attr:_atrNome(s,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}})},
      {n:'Convocar o Atroz',ic:'🩸',el:'Sangue',gr:2,g:'Sangue',d:'Uma criatura de sangue rasteja do símbolo.',uso:x=>({tipo:'invocacao',modo:'instantaneo',custo:['6',['Pontos de Esforço']],alcance:'distancia',area:{forma:'',tam:'9'},
        invoc:_inv('Atroz','🩸','#7f1d1d','demonio','30 + Nível * 3','15','+8','2d8 + 4','9',{duracao:'cena'})})},
      {n:'Paradoxo',ic:'🌀',el:'Morte',gr:3,g:'Morte',d:'O tempo implode num ponto: tudo envelhece séculos.',uso:x=>({tipo:'dano',modo:'instantaneo',custo:['10',['Pontos de Esforço']],formula:'13d6',tipoDano:'Morte',alcance:'area',area:{forma:'circulo',tam:'6'},teste:{attr:_atrNome(s,_FORTITUDE),cd:'12 + Nível',sucesso:'metade'}})},
      {n:'Medo Tangível',ic:'🌫',el:'Medo',gr:3,g:'Medo',db:'ritual',dt:'Ter contato direto com o Medo',d:'Você se torna o próprio medo: ferimentos comuns não o matam.',uso:x=>({tipo:'buff',modo:'ativa',custo:['10',['Pontos de Esforço']],alcance:'si',duracao:'cena'})},
    ]})]},
  {k:'posturas',cat:'outro',ic:'🥋',n:'Posturas de combate',sub:'uma por vez',d:'O lutador troca de postura: só a equipada vale.',
   f:s=>[_montaPoder(s,{nome:'Posturas',icone:'🥋',cor:'#0f766e',modo:'exclusiva',cat:'outro',desc:'Trocar de postura gasta a ação bônus. Só uma vale por vez.',
    formas:[{n:'Postura do Tigre',ic:'🐅',g:'Postura',d:'Ofensiva.',efs:x=>[_rol('dano',2),_rol('defesa',-1)]},
      {n:'Postura da Tartaruga',ic:'🐢',g:'Postura',d:'Defensiva.',efs:x=>[_rol('defesa',3),_cap('Deslocamento extra',-3)]},
      {n:'Postura da Garça',ic:'🕊',g:'Postura',d:'Ágil.',efs:x=>[_cap('Deslocamento extra',3),_rol('ataque',1)]},
      {n:'Postura do Dragão',ic:'🐲',g:'Postura',nv:5,d:'Mestre: equilíbrio entre tudo.',efs:x=>[_rol('todos',1),_rol('dano',1)]}]})]},
];

/* ---------- aba do mestre ---------- */
function tabPoderes(sys){
  sanitizePoderes(sys);
  const ui=S.ui; let P=sys.poderes.find(p=>p.id===ui.poderSel)||sys.poderes[0]||null;
  const novo=cat=>{ pushUndo(); const base={tecnica:['Nova técnica inata','🌀','todas'],magia:['Novo sistema de magia','📜','escolher'],outro:['Novo poder','🎽','exclusiva']}[cat||'tecnica'];
    const p={id:uid(),nome:base[0],icone:base[1],cor:'#7c3aed',desc:'',recursoId:'',todos:cat==='magia',modo:base[2],escolherQtd:cat==='magia'?'2 + piso(Nível / 2)':'',copia:false,copiaMax:'',
      categoria:cat||'tecnica',grauAuto:cat==='magia',graus:cat==='tecnica'?[{nome:'Grau 1',nivel:''},{nome:'Grau 2',nivel:'5'},{nome:'Grau 3',nivel:'10'}]:cat==='magia'?[{nome:'1º círculo',nivel:'1'},{nome:'2º círculo',nivel:'5'},{nome:'3º círculo',nivel:'10'}]:[],
      elementos:[],formas:[],combos:[]};
    sys.poderes.push(p); sanitizePoderes(sys); ui.poderSel=p.id; render(); };
  const usarModelo=m=>{ pushUndo(); const ps=m.f(sys); ui.poderSel=ps[0].id; render(); showToast(m.ic+' “'+m.n+'” criado — ligue numa classe ou origem em “Quem recebe”'); };
  const modelos=h('div',{class:'card'},
    h('div',{class:'row between wrapf'},h('h3',{style:{margin:0}},'🔮 Poderes, técnicas e magia'),
      h('div',{class:'row wrapf'},...PODER_CATEGORIAS.map(([k,n])=>h('button',{class:'btn sm'+(k==='tecnica'?' primary':''),onclick:()=>novo(k)},'+ '+n)))),
    h('div',{class:'hint',style:{margin:'4px 0 10px'}},'Separado das habilidades de classe e origem. 🌀 Técnica inata: única de cada personagem, cresce em graus (Dez Sombras, Ilimitado). 📜 Magia: sistema aberto que qualquer um aprende, com círculos e elementos (rituais, grimório). 🎽 Outro: posturas, brasões, modos. Cada técnica dentro dele é uma "forma" — criada com o mesmo editor em blocos.'),
    ...PODER_CATEGORIAS.map(([k,n,dc])=>{ const ms=PODER_MODELOS.filter(m=>(m.cat||'tecnica')===k); return ms.length?h('div',{class:'pod-cat-bloco'},
      h('div',{class:'pod-cat-t'},n,h('small',{},dc)),
      h('div',{class:'pod-modelos'},...ms.map(m=>h('button',{type:'button',class:'pod-modelo',onclick:()=>usarModelo(m)},
        h('span',{class:'pod-mic'},m.ic),h('b',{},m.n),h('span',{class:'pod-msub'},m.sub),h('small',{},m.d))))):null; }));
  if(!P) return h('div',{},modelos,h('div',{class:'card hint'},'Nenhum sistema de poder ainda. Comece por um modelo acima — dá para mudar tudo depois.'));
  const ordem=PODER_CATEGORIAS.map(c=>c[0]);
  const lista=h('div',{class:'pod-lista',role:'tablist'},...sys.poderes.slice().sort((a,b)=>ordem.indexOf(a.categoria)-ordem.indexOf(b.categoria)).map(p=>h('button',{type:'button',role:'tab','aria-selected':p===P?'true':'false',class:'pod-tab'+(p===P?' on':''),style:{'--pc':p.cor||'#7c3aed'},onclick:()=>{ui.poderSel=p.id;render();}},
    h('span',{class:'pod-cat-ch',title:(PODER_CATEGORIAS.find(c=>c[0]===p.categoria)||[])[1]||''},((PODER_CATEGORIAS.find(c=>c[0]===p.categoria)||[])[1]||'').split(' ')[0]),
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
    h('textarea',{class:'in',rows:'2',style:{marginTop:'8px'},value:P.desc||'',placeholder:'Como esse poder funciona na história (aparece na ficha e no livro)',oninput:e=>{P.desc=e.target.value;persist();}}),
    h('div',{class:'uso-sec-t',style:{marginTop:'10px'}},'Que tipo de poder é'),
    h('div',{class:'pod-modos'},...PODER_CATEGORIAS.map(([k,n,dc])=>h('button',{type:'button',class:'pod-modo'+(P.categoria===k?' on':''),'aria-pressed':P.categoria===k?'true':'false',
      onclick:()=>{ P.categoria=k; if(k==='magia'&&!P.graus.length) P.grauAuto=true; render(); }},h('b',{},n),h('small',{},dc)))));
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
    h('div',{class:'rg-linha'},_tog(P.todos,P.categoria==='tecnica'?'Entra na escolha de técnica inata (cada jogador escolhe ou sorteia UMA)':P.categoria==='magia'?'Qualquer personagem pode aprender':'Todo personagem tem',()=>{P.todos=!P.todos;render();}),P.todos?null:darPara),
    !P.todos?h('div',{class:'row wrapf',style:{marginTop:'6px'}},...(quem.length?quem.map(q=>h('span',{class:'tl-chip cls'},q)):[h('span',{class:'hint'},'Ninguém recebe ainda. Dê para uma classe/origem acima, ou coloque o efeito “🔮 Concede um sistema de poder” em qualquer habilidade, escolha ou item.')])):null);
  /* graus de crescimento (técnica) / círculos (magia) */
  const ehMagia=P.categoria==='magia', rotG=ehMagia?'Círculos':'Graus de crescimento';
  const sG=sec(3,rotG+' ('+P.graus.length+')',
    h('div',{class:'hint'},ehMagia?'Círculos de poder: cada forma pertence a um círculo e só pode ser aprendida quando o nível do personagem abre esse círculo.'
      :'Degraus da técnica inata (estilo Jujutsu): a técnica começa no grau 1 e cada forma pede um grau. O mestre/jogador sobe o grau na ficha quando o personagem treina — nunca acima do nível mínimo do grau.'),
    h('div',{class:'rg-linha'},_tog(P.grauAuto,'Sobe sozinho com o nível (sem treino)',()=>{P.grauAuto=!P.grauAuto;render();})),
    ...P.graus.map((g,i)=>h('div',{class:'pod-grau-ed'},
      h('span',{class:'pod-grau-n',style:{'--pc':P.cor||'#7c3aed'}},String(i+1)),
      h('input',{class:'in blk-in',style:{width:'200px'},value:g.nome,placeholder:ehMagia?(i+1)+'º círculo':'Grau '+(i+1),'aria-label':'Nome do grau',oninput:e=>{g.nome=e.target.value;persist();},onchange:()=>render()}),
      h('span',{class:'hint'},'a partir do nível'),
      h('input',{class:'in blk-in mono',style:{width:'110px'},value:g.nivel,placeholder:'1','aria-label':'Nível mínimo',oninput:e=>{g.nivel=e.target.value;persist();},onchange:()=>render()}),
      h('input',{class:'in blk-in',style:{flex:'1',minWidth:'160px'},value:g.desc,placeholder:'O que muda neste grau','aria-label':'Descrição do grau',oninput:e=>{g.desc=e.target.value;persist();}}),
      h('span',{class:'tl-chip'},P.formas.filter(f=>(f.grau||0)===i).length+' formas'),
      h('button',{class:'btn mini ghost','aria-label':'Remover grau',onclick:()=>{ pushUndo(); P.graus.splice(i,1); P.formas.forEach(f=>{ if(f.grau>i) f.grau--; else if(f.grau===i) f.grau=Math.max(0,i-1); }); render(); }},'✕'))),
    h('button',{class:'btn sm',onclick:()=>{ pushUndo(); const n=P.graus.length; P.graus.push({id:uid(),nome:ehMagia?(n+1)+'º círculo':'Grau '+(n+1),nivel:String(n?n*4:1),desc:''}); render(); }},'+ '+(ehMagia?'Círculo':'Grau')),
    h('div',{class:'uso-sec-t',style:{marginTop:'12px'}},'Elementos / afinidades'+(P.elementos.length?' ('+P.elementos.length+')':'')),
    h('div',{class:'hint'},'Opcional. Ex.: Sangue, Morte, Conhecimento, Energia, Medo (Ordem) ou Fogo/Água. Cada forma pode pertencer a um elemento — aparece como chip colorido e filtro na ficha.'),
    h('div',{class:'row wrapf'},...P.elementos.map((x,i)=>h('span',{class:'pod-el-ed',style:{'--ec':x.cor||'#64748b'}},
      h('input',{class:'in blk-in',style:{width:'46px'},value:x.icone,'aria-label':'Ícone',oninput:e=>{x.icone=e.target.value;persist();},onchange:()=>render()}),
      h('input',{class:'in blk-in',style:{width:'130px'},value:x.nome,placeholder:'Elemento','aria-label':'Nome do elemento',oninput:e=>{x.nome=e.target.value;persist();},onchange:()=>render()}),
      h('input',{type:'color',class:'in',style:{width:'34px',padding:'1px'},value:x.cor||'#64748b','aria-label':'Cor do elemento',oninput:e=>{x.cor=e.target.value;persist();},onchange:()=>render()}),
      h('button',{class:'btn mini ghost','aria-label':'Remover elemento',onclick:()=>{ pushUndo(); P.elementos.splice(i,1); P.formas.forEach(f=>{ if(f.elemento===x.id) f.elemento=''; }); render(); }},'✕'))),
      h('button',{class:'btn sm',onclick:()=>{ pushUndo(); P.elementos.push({id:uid(),nome:'',icone:'✦',cor:'#64748b'}); render(); }},'+ Elemento')));
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
        h('input',{class:'in blk-in',style:{width:'150px'},value:f.grupo,placeholder:'Grupo (Shikigami…)',list:'dl-pod-grp-'+P.id,'aria-label':'Grupo',oninput:e=>{f.grupo=e.target.value;persist();},onchange:()=>render()}),
        P.graus.length?h('select',{class:'in blk-in',style:{maxWidth:'190px'},'aria-label':ehMagia?'Círculo':'Grau',onchange:e=>{f.grau=parseInt(e.target.value,10)||0;render();}},
          ...P.graus.map((g,i)=>h('option',{value:String(i),selected:(f.grau||0)===i},(ehMagia?'⭕ ':'⬆ ')+(g.nome||('Grau '+(i+1)))))):null,
        P.elementos.length?sl(f,'elemento',P.elementos.map(x=>[x.id,(x.icone||'')+' '+(x.nome||'?')]),'— sem elemento —','170px'):null),
      habCard(sys,P.formas,f,{nivel:true,ph:'Nome da forma'}));
  };
  const s3=sec(4,'Formas ('+P.formas.length+')',
    h('div',{class:'hint'},'Cada forma é uma técnica completa (botão na ficha, custo, efeitos). Em cima dela você diz COMO ela libera. O nível mínimo fica no número ao lado do nome.'),
    h('datalist',{id:'dl-pod-grp-'+P.id},...grupos.filter(Boolean).map(g=>h('option',{value:g}))),
    ...(P.graus.length?P.graus.map((g,i)=>h('div',{class:'pod-grupo'},h('div',{class:'pod-grupo-t pod-grau-t'},(ehMagia?'⭕ ':'⬆ ')+(g.nome||('Grau '+(i+1)))+(g.nivel?' · nível '+g.nivel:'')),
        ...P.formas.filter(f=>Math.min(f.grau||0,P.graus.length-1)===i).map(formaLinha)))
      :grupos.map(g=>h('div',{class:'pod-grupo'},g?h('div',{class:'pod-grupo-t'},g):null,...P.formas.filter(f=>(f.grupo||'')===g).map(formaLinha)))),
    barraCriarHab(sys,{arr:P.formas,nivel:0},{chave:'pod_'+P.id,titulo:'Criar forma',nomePadrao:'Nova forma'}));
  const s4=sec(5,'Combinações ('+P.combos.length+')',
    h('div',{class:'hint'},'Quando o personagem tem as DUAS formas ativas, a combinação aparece sozinha na ficha (fusão de shikigamis, Fogo + Água = Vapor…).'),
    ...P.combos.map(c=>{ const fs=P.formas.map(x=>[x.id,(x.icon||'')+' '+x.name]);
      const sl=k=>h('select',{class:'in blk-in',style:{maxWidth:'200px'},'aria-label':'Forma '+k,onchange:e=>{c[k]=e.target.value;render();}},h('option',{value:''},'— forma —'),...fs.map(([v,n])=>h('option',{value:v,selected:c[k]===v},n)));
      return h('div',{class:'pod-forma'},h('div',{class:'pod-desb'},sl('a'),h('b',{},'+'),sl('b'),h('b',{},'='),h('span',{class:'hint'},'↓')),
        habCard(sys,{splice:(i,n)=>{ if(n) P.combos=P.combos.filter(x=>x!==c); },indexOf:()=>0},c.ab,{ph:'Nome da combinação'})); }),
    h('button',{class:'btn sm',onclick:()=>{ pushUndo(); const ab=sanitizarUsoHab({id:uid(),name:'Nova combinação',icon:'🔗',description:'',req:{level:0,attrs:[]},effects:[]});
      P.combos.push({id:uid(),a:(P.formas[0]||{}).id||'',b:(P.formas[1]||{}).id||'',ab}); S.ui.open[ab.id]=true; S.ui['habTab_'+ab.id]='uso'; render(); }},'+ Combinação'));
  return h('div',{class:'pod-ed'},s1,s2,P.categoria==='outro'&&!P.graus.length&&!P.elementos.length?null:sG,s3,s4);
}

/* ---------- ficha: grimório ---------- */
const ESTADO_FORMA={ativa:['✓','Ativa'],nivel:['🔒','Nível'],ritual:['🕯','A conquistar'],requer:['🔗','Depende de outra'],perdida:['💀','Destruída'],escolher:['🎓','Pode aprender'],guardada:['🎽','Guardada'],grau:['⛓','Grau acima']};
/* escolha da técnica inata (uma por personagem) entre as marcadas "todos" */
function escolhaInataInner(sys,d){
  const livres=tecnicasInatasLivres(sys); if(!livres.length) return null;
  const atual=livres.find(p=>p.id===d.tecnicaInata);
  if(atual&&!S.ui.trocaInata) return null;
  const escolher=id=>{ d.tecnicaInata=id; delete S.ui.trocaInata; render(); const P=livres.find(p=>p.id===id); if(P) showToast((P.icone||'🌀')+' Técnica inata: '+P.nome); };
  return h('div',{class:'graf-inata'},
    h('div',{class:'row between wrapf'},h('b',{},'🌀 Técnica inata'),
      h('div',{class:'row wrapf'},h('button',{class:'btn sm',onclick:()=>escolher(livres[Math.floor(Math.random()*livres.length)].id)},'🎲 Sortear'),
        atual?h('button',{class:'btn sm ghost',onclick:()=>{delete S.ui.trocaInata;render();}},'cancelar'):null)),
    h('div',{class:'hint'},'Cada personagem nasce com UMA técnica única. Escolha ou sorteie a sua — ela cresce em graus conforme você treina.'),
    h('div',{class:'bib-grid'},...livres.map(P=>h('button',{type:'button',class:'bib-card'+(P===atual?' on':''),style:{'--pc':P.cor||'#7c3aed'},onclick:()=>escolher(P.id)},
      h('span',{class:'bib-ic'},P.icone||'🌀'),h('b',{},P.nome),h('small',{},P.desc||''),h('span',{class:'bib-cat'},P.formas.length+' formas'+(P.graus.length?' · '+P.graus.length+' graus':''))))));
}
function grimorioInner(sys,d,ctx,mode){
  const fontes=[...(ctx.eff.active||[]),...(ctx.eff.locked||[])].filter(x=>x.tipo!=='poder');
  const ordem=PODER_CATEGORIAS.map(c=>c[0]);
  const Ps=poderesDoPersonagem(sys,d,fontes,ctx.eff.equipped).sort((a,b)=>ordem.indexOf(a.categoria)-ordem.indexOf(b.categoria));
  const inata=escolhaInataInner(sys,d);
  if(!Ps.length&&!inata) return null;
  const joga=mode==='play'||mode==='criar'||!mode;
  const ligadaDe=ab=>{ const x=(ctx.eff.active||[]).find(a=>a.ab.id===ab.id); return x?x.ligada!==false:true; };
  return h('div',{class:'graf'},inata,...Ps.map(P=>{
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
    const elChip=f=>{ const x=elementoDe(P,f.elemento); return x?h('span',{class:'pod-el on',style:{'--ec':x.cor||'#64748b',marginLeft:'6px'}},(x.icone||'')+' '+x.nome):null; };
    const linha=f=>{ const s=st[f.id], [ic,rot]=ESTADO_FORMA[s]||['','']; const db=f.desbloq;
      if(s==='ativa') return h('div',{class:'graf-f on'},cartaoTecnica(sys,d,ctx,f,{ligada:ligadaDe(f),play:mode==='play'}),h('div',{class:'row wrapf graf-ac'},...acoes(f)));
      if(s==='grau') return h('div',{class:'graf-f st-grau'},h('span',{class:'graf-ic'},f.icon||'✦'),h('div',{class:'graf-tx'},h('b',{},f.name,elChip(f)),h('small',{},ic+' '+rot+' · precisa de '+grauNome(P,f.grau||0))));
      const motivo=s==='nivel'?('a partir do '+levelLabel(sys,f.req.level).toLowerCase()):s==='ritual'?(db.texto||'precisa ser conquistada'):
        s==='requer'?(db.tipo==='perdida'?('quando '+nomeDe(db.formaId)+' for destruída'):('depois de '+nomeDe(db.formaId))):s==='perdida'?'destruída — não pode mais ser usada':
        s==='escolher'?(typeof habFrase==='function'?habFrase(sys,f):''):s==='guardada'?(typeof habFrase==='function'?habFrase(sys,f):''):'';
      return h('div',{class:'graf-f st-'+s},h('span',{class:'graf-ic'},f.icon||'✦'),h('div',{class:'graf-tx'},h('b',{},f.name,elChip(f)),h('small',{},ic+' '+rot+' · '+motivo)),h('div',{class:'row wrapf graf-ac'},...acoes(f)));
    };
    const grupos=[...new Set(P.formas.map(f=>f.grupo||''))];
    /* graus: cabeçalho de progresso + subir/descer (técnica treinada) */
    const nG=P.graus.length, gAt=nG?grauAtual(sys,d,P):0, gMx=nG?grauMaxPorNivel(sys,d,P):0, ehMagia=P.categoria==='magia';
    const prox=nG&&gAt<nG-1?P.graus[gAt+1]:null;
    const filtroEl=S.ui['grafEl_'+P.id]||'';
    const visivel=f=>!filtroEl||f.elemento===filtroEl;
    const barraGraus=nG?h('div',{class:'graf-graus'},
      h('div',{class:'graf-graus-trilha'},...P.graus.map((g,i)=>h('span',{class:'graf-grau'+(i<=gAt?' on':'')+(i===gAt?' atual':''),title:(g.desc||'')+(g.nivel?' · nível '+g.nivel:'')},(ehMagia?'⭕ ':'')+(g.nome||('Grau '+(i+1)))))),
      !P.grauAuto&&joga?h('div',{class:'row wrapf'},
        prox?h('button',{class:'btn mini emerald',disabled:gAt>=gMx||null,title:gAt>=gMx?('Precisa do nível '+prox.nivel):'Treinou e dominou o próximo grau',onclick:()=>{ e.grau=gAt+1; render(); showToast('⬆ '+P.nome+': '+grauNome(P,gAt+1)); }},'⬆ Subir para '+grauNome(P,gAt+1)):h('span',{class:'tl-chip ini'},'✦ grau máximo'),
        gAt>0?h('button',{class:'btn mini ghost',title:'Voltar um grau',onclick:()=>{ e.grau=gAt-1; render(); }},'↓'):null):null):null;
    const filtros=P.elementos.length?h('div',{class:'row wrapf graf-els'},
      h('button',{class:'btn mini'+(filtroEl?' ghost':' primary'),onclick:()=>{delete S.ui['grafEl_'+P.id];render();}},'Todos'),
      ...P.elementos.map(x=>h('button',{class:'btn mini pod-el'+(filtroEl===x.id?' on':''),style:{'--ec':x.cor||'#64748b'},onclick:()=>{S.ui['grafEl_'+P.id]=x.id;render();}},(x.icone||'')+' '+x.nome))):null;
    const blocos=nG?P.graus.map((g,i)=>[(ehMagia?'⭕ ':'⬆ ')+(g.nome||('Grau '+(i+1))),P.formas.filter(f=>Math.min(f.grau||0,nG-1)===i&&visivel(f))])
      :grupos.map(g=>[g,P.formas.filter(f=>(f.grupo||'')===g&&visivel(f))]);
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
    const cat=PODER_CATEGORIAS.find(c=>c[0]===P.categoria);
    const resumo=[cat?cat[1].split(' ').slice(1).join(' '):null,nG?grauNome(P,gAt):null,rec?((rec.icon||'')+' '+rec.name+' '+rec.cur+'/'+rec.max):null,
      P.modo==='escolher'?('🎓 conhece '+conhecidas+'/'+(lim===Infinity?'∞':lim)):null,
      P.modo==='exclusiva'?('🎽 '+(e.equip&&st[e.equip]==='ativa'?nomeDe(e.equip):'nada equipado')):null,
      nAtivas+' de '+P.formas.length+' formas'].filter(Boolean).join(' · ');
    return h('div',{class:'graf-p',style:{'--pc':P.cor||'#7c3aed'}},
      h('button',{type:'button',class:'graf-cab','aria-expanded':aberto?'true':'false',onclick:()=>{S.ui['graf_'+P.id]=!aberto;render();}},
        h('span',{class:'graf-pic'},P.icone||'🔮'),h('span',{class:'graf-pn'},h('b',{},P.nome),h('small',{},resumo)),h('span',{class:'acc-caret'},aberto?'▼':'▶')),
      aberto?h('div',{class:'graf-corpo'},
        P.desc?h('div',{class:'hint',style:{marginBottom:'6px'}},P.desc):null,
        P.categoria==='tecnica'&&P.todos&&joga?h('button',{class:'btn mini ghost',style:{marginBottom:'6px'},onclick:()=>{S.ui.trocaInata=true;render();}},'🔄 trocar técnica inata'):null,
        barraGraus,filtros,
        ...blocos.filter(([,fs])=>fs.length).map(([g,fs])=>h('div',{class:'graf-grupo'},g?h('div',{class:'pod-grupo-t'},g):null,...fs.map(linha))),
        P.combos.length?h('div',{class:'graf-grupo'},h('div',{class:'pod-grupo-t'},'🔗 Combinações'),...combos):null,
        copias):null);
  }));
}
