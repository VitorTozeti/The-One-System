/* ============================================================ ASSISTENTES DE CRIAÇÃO ============================================================
   Dois passo-a-passos que montam a peça pelo EFEITO e sugerem o custo (pontos de poder):
     🧙 Técnica / magia    tipo → força → alcance → extras (teste, condição, duração) → custo e nome
     ✨ Poder de classe/origem  categoria (bônus, resistência, sentido, ativo, modificação física, narrativo)
                                → detalhes → nome   (modificação física = efeito + ataque natural + lado ruim)
   Abrem como sobreposição (assistenteOverlay, chamada pelo masterView) com um alvo:
     _AS.alvo = {arr, nivel, habArr?, origem?, tracos?}
   Depende de tecnicas-editor.js (TIPOS_USO, _garanteCond, sanitizarUsoHab…) e classes-origens.js (_ef, _cap…). */

let _AS=null;
function abrirAssistente(modo,alvo,inicio){
  _AS={modo,passo:0,alvo,d:Object.assign(modo==='tecnica'?_tecPadrao():_poderPadrao(),inicio||{})};
  render();
}
function fecharAssistente(){ _AS=null; render(); }

/* ---------------- TÉCNICA ---------------- */
const FORCAS=[['Leve','pequena, barata'],['Moderada','o padrão'],['Forte','marca do personagem'],['Devastadora','rara, cara']];
const DADOS_POR_TIPO={dano:['1d6','2d6','4d6','8d6'],cura:['1d8','2d8','4d8','6d8']};
const BUFF_VAL=[1,2,3,5], DEBUFF_DUR=['1 rodada','2 rodadas','1 minuto','10 minutos'];
const INVOC_F={vida:['8','15','30','60'],dano:['1d6','1d8','2d8','3d10'],defesa:['10','12','14','17'],ataque:['+3','+5','+7','+10']};
const CONDS_RAPIDAS=[['Lento','🐢','#38bdf8','Movimento pela metade.'],['Cego','🙈','#475569','Não enxerga: −5 em ataques.'],['Envenenado','🤢','#65a30d','−2 em testes enquanto durar.'],
  ['Atordoado','💫','#eab308','Perde a próxima ação.'],['Amedrontado','😱','#7c3aed','Não se aproxima da fonte do medo.'],['Em chamas','🔥','#ef4444','Sofre 1d6 de fogo por rodada.'],
  ['Inspirado','🎵','#22c55e','+1 em todas as rolagens.'],['Abençoado','✨','#facc15','+1d4 em ataques e testes.'],['Invisível','👻','#94a3b8','Não pode ser visto.']];
function _tecPadrao(){ return {tipo:'dano',forca:1,escala:true,alcance:'distancia',dist:'18',forma:'circulo',tam:'6',alvos:1,
  teste:false,testeAttr:'',sucesso:'metade',condId:'',duracao:'',ativa:false,escopo:'ataque',curaEm:'alvo',tipoDano:'',
  custoRes:'',custo:'',nome:'',icone:'',desc:'',invNome:'Criatura',invIc:'🐺',invEstilo:'fera'}; }
function tecPontos(t){
  let p=(t.forca+1)*2;
  if(t.alcance==='distancia') p+=1; if(t.alcance==='area') p+=2;
  if(t.condId) p+=2; if(t.ativa) p+=1; if(t.escala) p+=2;
  p+=Math.max(0,(parseInt(t.alvos)||1)-1);
  if(t.teste&&t.sucesso==='metade') p-=1;
  return Math.max(1,p);
}
function _forcaDe(t,arr){ return arr[Math.max(0,Math.min(arr.length-1,t.forca))]; }
function tecMontar(sys,t,nivel){
  const pts=tecPontos(t), tp=tipoInfo(t.tipo);
  const vida=_recPor(sys,_V);
  const ab={id:uid(),name:t.nome||(tp.n),description:t.desc||'',icon:t.icone||tp.ic,req:{level:nivel||0,attrs:[]},effects:[]};
  sanitizarUsoHab(ab);
  const u=ab.uso;
  const custoRes=t.custoRes||((_recPor(sys,_M)||{}).id)||'';
  Object.assign(u,{on:true,tipo:t.tipo,modo:t.ativa?'ativa':'instantaneo',custoId:custoRes,custo:custoRes?String(t.custo!==''?t.custo:pts):'',
    alcance:t.alcance,alvos:t.alcance==='area'?'':String(t.alvos||1),tipoDano:t.tipoDano||'',duracao:t.duracao||'',
    area:t.alcance==='area'?{forma:t.forma,tam:t.tam}:{forma:'',tam:t.alcance==='distancia'?t.dist:''}});
  const esc=t.escala?' + Nível':'';
  if(t.tipo==='dano'){ u.aplicaEm='alvo'; u.formula=_forcaDe(t,DADOS_POR_TIPO.dano)+esc; }
  if(t.tipo==='cura'){ u.aplicaEm=t.curaEm; u.formula=_forcaDe(t,DADOS_POR_TIPO.cura)+esc; if(t.curaEm==='eu'&&vida) u.alvoId=vida.id; }
  if(t.tipo==='buff'){ u.modo='ativa'; ab.effects.push(_ef({kind:'rolagem',escopo:t.escopo,value:_forcaDe(t,BUFF_VAL)})); if(t.condId){ u.condId=t.condId; u.condEm='eu'; } }
  if(t.tipo==='debuff'){ u.condId=t.condId; u.condEm='alvo'; if(!u.duracao) u.duracao=_forcaDe(t,DEBUFF_DUR); }
  if(t.tipo==='dano'&&t.condId){ u.condId=t.condId; u.condEm='alvo'; }
  if(t.tipo==='invocacao'){ u.invoc={nome:t.invNome||'Criatura',icone:t.invIc||'🐺',cor:tp.cor,estilo:t.invEstilo||'fera',
    vida:_forcaDe(t,INVOC_F.vida)+(t.escala?' + Nível * 2':''),defesa:_forcaDe(t,INVOC_F.defesa),ataque:_forcaDe(t,INVOC_F.ataque),
    dano:_forcaDe(t,INVOC_F.dano),mov:'9',qtd:String(t.alvos||1),duracao:t.duracao||'1 minuto',desc:''}; u.alvos=''; }
  if(t.teste&&t.testeAttr) u.teste={attr:t.testeAttr,cd:'10 + Nível',sucesso:t.sucesso};
  sanitizarUsoHab(ab);
  return ab;
}
function _nivelSugerido(sys,pts){ if(sys.semNiveis) return 0; return Math.max(sys.startLevel||1,Math.min(sys.maxLevel||20,Math.ceil(pts/2))); }

function _passosTec(sys,t){
  const tp=tipoInfo(t.tipo);
  const set=(k,v)=>()=>{ t[k]=v; render(); };
  const atrs=(sys.attributes||[]).map(a=>a.name);
  const p1=h('div',{},h('div',{class:'as-q'},'O que esta técnica FAZ?'),
    h('div',{class:'as-grade'},...TIPOS_USO.map(x=>h('button',{type:'button',class:'as-op'+(t.tipo===x.k?' on':''),style:{'--c':x.cor},onclick:()=>{t.tipo=x.k;
      if(x.k==='cura') t.alcance='toque'; if(x.k==='buff'){t.alcance='si';t.ativa=true;} if(x.k==='debuff'){t.teste=true; if(!t.testeAttr) t.testeAttr=_atrNome(sys,_VONTADE)||atrs[0]||'';}
      if(x.k==='invocacao') t.alcance='distancia'; _AS.passo=1; render();}}, h('span',{class:'as-ic'},x.ic),h('b',{},x.n),h('small',{},x.d)))));
  const linhaForca=(rot)=>h('div',{class:'as-grade g4'},...FORCAS.map(([n,s],i)=>h('button',{type:'button',class:'as-op'+(t.forca===i?' on':''),onclick:set('forca',i)},
    h('b',{},n),h('small',{},rot(i)),h('small',{class:'as-dim'},s))));
  const rot={dano:i=>DADOS_POR_TIPO.dano[i]+' de dano',cura:i=>'cura '+DADOS_POR_TIPO.cura[i],buff:i=>'+'+BUFF_VAL[i]+' enquanto ligada',
    debuff:i=>'dura '+DEBUFF_DUR[i],invocacao:i=>'criatura com '+INVOC_F.vida[i]+' de vida, '+INVOC_F.dano[i],utilidade:i=>['efeito pequeno','útil','muda a cena','milagre'][i]}[t.tipo];
  const p2=h('div',{},h('div',{class:'as-q'},'Quão forte?'), linhaForca(rot),
    (t.tipo!=='utilidade'&&t.tipo!=='debuff')?h('div',{style:{marginTop:'10px'}},_tog(t.escala,'Cresce com o nível (+'+(t.tipo==='invocacao'?'Nível×2 de vida':'Nível')+')',()=>{t.escala=!t.escala;render();})):null,
    t.tipo==='buff'?h('div',{class:'rg-linha',style:{marginTop:'10px'}},h('span',{class:'rg-r'},'O bônus vale em'),
      h('select',{class:'in',style:{maxWidth:'220px'},onchange:e=>{t.escopo=e.target.value;render();}},...DICE_ESCOPOS.map(([k,n])=>h('option',{value:k,selected:t.escopo===k},n)))):null,
    t.tipo==='dano'?h('div',{class:'rg-linha',style:{marginTop:'10px'}},h('span',{class:'rg-r'},'Tipo de dano'),
      h('input',{class:'in',style:{maxWidth:'180px'},value:t.tipoDano,placeholder:'Fogo, Corte, Psíquico…',oninput:e=>{t.tipoDano=e.target.value;}}),
      ...['Fogo','Frio','Elétrico','Ácido','Corte','Impacto','Psíquico','Luz','Trevas'].map(n=>h('button',{type:'button',class:'chip'+(t.tipoDano===n?' on':''),onclick:set('tipoDano',n)},n))):null,
    t.tipo==='invocacao'?h('div',{class:'rg-linha',style:{marginTop:'10px'}},
      h('input',{class:'in rg-ic-in',value:t.invIc,maxlength:'4','aria-label':'Ícone da criatura',oninput:e=>{t.invIc=e.target.value;}}),
      h('input',{class:'in',style:{maxWidth:'200px'},value:t.invNome,placeholder:'Nome da criatura',oninput:e=>{t.invNome=e.target.value;}}),
      h('select',{class:'in',style:{maxWidth:'180px'},onchange:e=>{t.invEstilo=e.target.value;}},...ESTILOS_INVOC.map(([k,n])=>h('option',{value:k,selected:t.invEstilo===k},n)))):null);
  const p3=h('div',{},h('div',{class:'as-q'},'Em quem / onde?'),
    h('div',{class:'as-grade g4'},...ALCANCES.map(([k,n])=>h('button',{type:'button',class:'as-op'+(t.alcance===k?' on':''),onclick:set('alcance',k)},
      h('span',{class:'as-ic'},{si:'🧍',toque:'✋',distancia:'🎯',area:'💥'}[k]),h('b',{},n),h('small',{class:'as-dim'},{si:'+0',toque:'+0',distancia:'+1 ponto',area:'+2 pontos'}[k])))),
    t.alcance==='distancia'?h('div',{class:'rg-linha',style:{marginTop:'10px'}},h('span',{class:'rg-r'},'Alcance (m)'),h('input',{class:'in',style:{width:'80px'},value:t.dist,oninput:e=>{t.dist=e.target.value;}}),
      h('span',{class:'rg-r'},t.tipo==='invocacao'?'Quantas criaturas':'Alvos'),h('input',{class:'in',type:'number',min:'1',max:'10',style:{width:'70px'},value:t.alvos,onchange:e=>{t.alvos=Math.max(1,parseInt(e.target.value)||1);render();}})):null,
    t.alcance==='area'?h('div',{class:'rg-linha',style:{marginTop:'10px'}},
      ...FORMAS_AREA.map(([k,n])=>h('button',{type:'button',class:'chip'+(t.forma===k?' on':''),onclick:set('forma',k)},n)),
      h('span',{class:'rg-r'},'Tamanho (m)'),h('input',{class:'in',style:{width:'70px'},value:t.tam,oninput:e=>{t.tam=e.target.value;},onchange:()=>render()}),
      areaDesenho({forma:t.forma,tam:t.tam},tp.cor)):null,
    t.tipo==='cura'?h('div',{class:'rg-linha',style:{marginTop:'10px'}},h('span',{class:'rg-r'},'A cura cai'),
      _tog(t.curaEm==='eu','em mim (mexe na minha Vida)',set('curaEm','eu')),_tog(t.curaEm==='alvo','num aliado (rola e mostra)',set('curaEm','alvo'))):null);
  const conds=(sys.conditions||[]);
  const p4=h('div',{},h('div',{class:'as-q'},'Algo a mais?'),
    h('div',{class:'as-bloco'},_tog(t.teste,'O alvo faz um teste de resistência',()=>{t.teste=!t.teste;if(t.teste&&!t.testeAttr)t.testeAttr=_atrNome(sys,t.tipo==='debuff'?_VONTADE:_REFLEXO)||atrs[0]||'';render();}),
      t.teste?h('div',{class:'rg-linha'},h('span',{class:'rg-r'},'Atributo'),h('select',{class:'in',style:{maxWidth:'180px'},onchange:e=>{t.testeAttr=e.target.value;}},...atrs.map(n=>h('option',{value:n,selected:t.testeAttr===n},n))),
        h('span',{class:'rg-r'},'Se passar'),_tog(t.sucesso==='metade','metade (−1 ponto)',set('sucesso','metade')),_tog(t.sucesso==='nada','anula',set('sucesso','nada')),
        h('span',{class:'hint'},'CD = 10 + Nível do conjurador')):null),
    (t.tipo!=='invocacao'&&t.tipo!=='cura')?h('div',{class:'as-bloco'},h('b',{},'🌀 Condição '+(t.tipo==='buff'?'em você':'no alvo')+' (+2 pontos)'),
      h('div',{class:'row wrapf'},h('button',{type:'button',class:'chip'+(!t.condId?' on':''),onclick:set('condId','')},'nenhuma'),
        ...conds.map(c=>h('button',{type:'button',class:'chip'+(t.condId===c.id?' on':''),onclick:set('condId',c.id)},(c.icon||'')+' '+c.name)),
        ...CONDS_RAPIDAS.filter(c=>!conds.some(x=>semAcentoSeguro(x.name)===semAcentoSeguro(c[0]))).map(c=>h('button',{type:'button',class:'chip',title:'Cria a condição “'+c[0]+'” no sistema',onclick:()=>{t.condId=_garanteCond(sys,c);render();}},'+ '+c[1]+' '+c[0])))):null,
    h('div',{class:'rg-linha'},h('span',{class:'rg-r'},'Duração'),h('input',{class:'in',style:{maxWidth:'200px'},value:t.duracao,placeholder:'instantâneo, 1 minuto, concentração…',oninput:e=>{t.duracao=e.target.value;}}),
      t.tipo!=='buff'?_tog(t.ativa,'Liga/desliga (fica ativa) +1',()=>{t.ativa=!t.ativa;render();}):null));
  const pts=tecPontos(t);
  const recs=(sys.resources||[]).filter(r=>(r.type||'barra')!=='valor');
  if(!t.custoRes){ const m=_recPor(sys,_M); if(m) t.custoRes=m.id; }
  const p5=h('div',{},h('div',{class:'as-q'},'Nome e custo'),
    h('div',{class:'rg-linha'},h('input',{class:'in rg-ic-in',value:t.icone||tp.ic,maxlength:'4','aria-label':'Ícone',oninput:e=>{t.icone=e.target.value;}}),
      h('input',{class:'in',style:{maxWidth:'280px'},value:t.nome,placeholder:'Nome (ex.: '+({dano:'Lança de fogo',cura:'Toque restaurador',buff:'Pele de ferro',debuff:'Olhar paralisante',invocacao:'Chamar lobo',utilidade:'Passo sombrio'}[t.tipo])+')',oninput:e=>{t.nome=e.target.value;}})),
    h('textarea',{class:'in',rows:'2',value:t.desc,placeholder:'Como ela aparece na história (texto da ficha)',oninput:e=>{t.desc=e.target.value;}}),
    h('div',{class:'rg-linha'},h('span',{class:'rg-r'},'Paga com'),h('select',{class:'in',style:{maxWidth:'180px'},onchange:e=>{t.custoRes=e.target.value;render();}},
      h('option',{value:''},'sem custo'),...recs.map(r=>h('option',{value:r.id,selected:t.custoRes===r.id},r.name))),
      t.custoRes?h('span',{class:'rg-r'},'Custo'):null, t.custoRes?h('input',{class:'in',style:{width:'90px'},value:t.custo,placeholder:String(pts),oninput:e=>{t.custo=e.target.value;}}):null,
      t.custoRes?h('span',{class:'hint'},'vazio = sugerido ('+pts+')'):null));
  return [['Efeito',p1],['Força',p2],['Alcance',p3],['Extras',p4],['Nome e custo',p5]];
}
function _previaTec(sys,t){
  const pts=tecPontos(t), nv=_nivelSugerido(sys,pts);
  const ab=tecMontar(sys,t,0), tp=tipoInfo(t.tipo);
  const pct=Math.min(100,pts/16*100);
  return h('div',{class:'as-prev',style:{'--c':tp.cor}},
    h('div',{class:'as-pt'},(t.icone||tp.ic)+' '+(t.nome||tp.n)),
    h('div',{class:'as-pr'},usoHabResumo(sys,ab)||'—'),
    (ab.effects||[]).map(ef=>effectLabel(sys,ef)).filter(Boolean).map(x=>h('span',{class:'tg-fx'},x)),
    h('div',{class:'as-medidor'},h('div',{style:{width:pct+'%'}})),
    h('div',{class:'as-pn'},h('b',{},pts+' pontos de poder'),' · custo sugerido '+pts+(sys.semNiveis?'':' · a partir do '+levelLabel(sys,nv).toLowerCase())),
    h('div',{class:'hint'},pts<=3?'Truque: pode ser usado toda hora.':pts<=7?'Técnica comum de aventureiro.':pts<=11?'Assinatura do personagem — 1 ou 2 por combate.':'Golpe final: considere limitar a 1× por descanso.'));
}

/* ---------------- PODER DE CLASSE / ORIGEM ---------------- */
const CATS_PODER=[
  {k:'bonus',ic:'🔢',n:'Bônus passivo',d:'+atributo, +Vida/Mana, +ataque, +defesa… sempre ligado.'},
  {k:'resist',ic:'🛡',n:'Resistência',d:'Reduz, corta à metade ou anula um tipo de dano.'},
  {k:'sentido',ic:'👁',n:'Sentido / movimento',d:'Voo, natação, visão no escuro, telepatia…'},
  {k:'fisico',ic:'🧬',n:'Modificação física',d:'Asas, garras, carapaça, tamanho… efeito + ataque natural + lado ruim.'},
  {k:'ativo',ic:'🌀',n:'Poder ativo',d:'Algo que o personagem USA (gasta recurso): vai para o assistente de técnica.'},
  {k:'narrativo',ic:'📜',n:'Narrativo',d:'Sem número: privilégio, contato, permissão na história.'},
];
const _fis=(k,ic,n,d,o)=>Object.assign({k,ic,n,d},o||{});
const _dsl=v=>({kind:'caracteristica',charType:'num',text:'Deslocamento',value:v});
const MODS_FISICOS=[
  _fis('asas','🪽','Asas','Voa no mesmo deslocamento.',{efs:()=>[_cap('Voo',9)],contra:['Asas largas: não usa armadura pesada',()=>[_txt('Não usa armadura pesada (asas)')]]}),
  _fis('membrana','🦇','Membranas de planar','Plana em quedas e saltos.',{efs:()=>[_cap('Planar')]}),
  _fis('guelras','🫧','Guelras','Respira na água e nada bem.',{efs:()=>[_cap('Respirar na água'),_cap('Natação',6)],contra:['Precisa se molhar 1× por dia',()=>[_txt('Precisa se molhar uma vez por dia ou fica Fatigado')]]}),
  _fis('garras','🐾','Garras','Escala e corta.',{efs:()=>[_cap('Escalada',6)],ataque:['Garras','1d6','Corte']}),
  _fis('presas','🦷','Presas','Mordida perigosa.',{ataque:['Mordida','1d6','Perfuração']}),
  _fis('chifres','🐂','Chifres','Investida com chifrada.',{ataque:['Chifrada','1d8','Perfuração']}),
  _fis('cauda','🦎','Cauda','Equilíbrio e golpe de cauda.',{efs:()=>[_txt('Cauda: segura objetos leves e não cai fácil')],ataque:['Golpe de cauda','1d4','Impacto']}),
  _fis('carapaca','🐢','Carapaça','Couraça natural: +2 Defesa.',{efs:()=>[_rol('defesa',2)],contra:['Pesada: −1,5 m de deslocamento',()=>[_dsl(-1.5)]]}),
  _fis('pedra','🪨','Pele de pedra','Reduz 2 de dano físico.',{efs:()=>[_res('Corte','reduz',2),_res('Perfuração','reduz',2),_res('Impacto','reduz',2)],contra:['Afunda na água',()=>[_txt('Não consegue nadar (afunda)')]]}),
  _fis('bracos','🙌','Braços extras','Segura mais coisas: +1 em ataques.',{efs:()=>[_rol('ataque',1),_txt('Braços extras: segura um item a mais')]}),
  _fis('olhos','👁','Olhos de predador','Enxerga no escuro.',{efs:()=>[_cap('Visão no escuro',18)],contra:['Sensível à luz forte',()=>[_txt('−1 em ataques sob luz do sol forte')]]}),
  _fis('antenas','📡','Antenas','Sente vibrações em volta.',{efs:()=>[_cap('Sentido sísmico',9)]}),
  _fis('grande','🦣','Corpo grande','+1 Força e Vida extra por nível.',{tam:'grande',efs:s=>[_efAttr(s,['Força','FOR','Forca','Físico','Corpo'],1),_efRecF(s,_V,'Nível')],contra:['Difícil se esconder',()=>[_txt('Grande: difícil de se esconder e de caber em lugares apertados')]]}),
  _fis('pequeno','🐭','Corpo pequeno','Mais difícil de acertar.',{tam:'pequeno',efs:()=>[_rol('defesa',1)],contra:['Passos curtos: −1,5 m de deslocamento',()=>[_dsl(-1.5)]]}),
  _fis('pernas','🦵','Pernas de corredor','+3 m de deslocamento.',{efs:()=>[_dsl(3)]}),
  _fis('elastico','🪢','Membros elásticos','Alcance corpo a corpo +1,5 m.',{efs:()=>[_txt('Alcance corpo a corpo +1,5 m')]}),
  _fis('regen','🌿','Regeneração','Fecha feridas sem custo.',{cura:true,contra:['Fogo e ácido impedem a regeneração',()=>[_res('Fogo','vulneravel')]]}),
  _fis('veneno','🦂','Ferrão venenoso','Ataque que envenena.',{ataque:['Ferrão','1d4','Veneno','Envenenado']}),
  _fis('dragao','🐲','Sangue de dragão','Resiste a fogo e cospe chamas.',{efs:()=>[_res('Fogo','metade')],sopro:true}),
  _fis('etereo','👻','Corpo etéreo','Metade do dano físico.',{efs:()=>[_res('Físico','metade')],contra:['Vulnerável a luz',()=>[_res('Luz','vulneravel')]]}),
  _fis('camuflagem','🦎','Camuflagem','Some no ambiente parado.',{efs:()=>[_txt('Camuflagem: parado, conta como escondido')]}),
];
function _poderPadrao(){ return {cat:'bonus',alvoK:'',valor:1,escala:false,resistTipo:'Fogo',resistModo:'metade',resistValor:2,cap:'Voo',capValor:9,
  mods:{},contras:{},nome:'',icone:'',desc:''}; }
function _ataqueNatural(sys,[nome,dado,tipo,cond],ic,previa){
  const f=_atrNome(sys,['Força','FOR','Forca','Físico','Corpo','Agilidade']);
  const ab={id:uid(),name:nome,description:'Ataque natural.',icon:ic||'⚔',req:{level:0,attrs:[]},effects:[]}; sanitizarUsoHab(ab);
  Object.assign(ab.uso,{on:true,tipo:'dano',modo:'instantaneo',aplicaEm:'alvo',formula:dado+(f?' + '+f:''),tipoDano:tipo,alcance:'toque',alvos:'1'});
  if(cond){ const c=CONDS_RAPIDAS.find(x=>x[0]===cond); if(c){ const ja=_acha(sys.conditions||[],c[0]); ab.uso.condId=previa?(ja?ja.id:''):_garanteCond(sys,c); ab.uso.condEm='alvo'; ab.uso.teste={attr:_atrNome(sys,_FORTITUDE),cd:'10 + Nível',sucesso:'nada'}; } }
  return sanitizarUsoHab(ab);
}
function _bonusAlvos(sys){
  return [...(sys.attributes||[]).map(a=>['attr:'+a.id,'💪 '+a.name]),...(sys.resources||[]).map(r=>['res:'+r.id,'❤ '+r.name+' (máximo)']),
    ...DICE_ESCOPOS.map(([k,n])=>['rol:'+k,'🎲 '+n]),['tec:','🌀 +técnica de classe']];
}
/* devolve [{icon,name,description,effects,extraHabs[]}] */
function poderMontar(sys,p,previa){
  const um=(ic,nome,desc,effects,extra)=>({icon:ic,name:nome,description:desc,effects:(effects||[]).filter(Boolean).map(_ef),extra:extra||[]});
  if(p.cat==='bonus'){
    const [t,id]=(p.alvoK||'').split(':'); const v=Number(p.valor)||1; let ef=null, rot='';
    if(t==='attr'){ ef={kind:'atributo',targetId:id,value:v}; rot=((sys.attributes.find(a=>a.id===id)||{}).name||'atributo'); }
    if(t==='res'){ ef=p.escala?{kind:'recurso',targetId:id,value:0,formula:(v===1?'':v+' * ')+'Nível'}:{kind:'recurso',targetId:id,value:v}; rot=((sys.resources.find(r=>r.id===id)||{}).name||'recurso'); }
    if(t==='rol'){ ef={kind:'rolagem',escopo:id,value:v}; rot=(((DICE_ESCOPOS.find(x=>x[0]===id)||[])[1])||'rolagens').toLowerCase(); }
    if(t==='tec'){ ef={kind:'tecnicas',value:v}; rot='técnica de classe'; }
    return ef?[um(p.icone||'🔢',p.nome||('+'+v+(p.escala&&t==='res'?'×Nível':'')+' '+rot),p.desc,[ef])]:[];
  }
  if(p.cat==='resist'){ const r=_res(p.resistTipo||'Fogo',p.resistModo,Number(p.resistValor)||0);
    return [um(p.icone||'🛡',p.nome||resistLabel(p.resistTipo,p.resistModo,Number(p.resistValor)||0),p.desc,[r])]; }
  if(p.cat==='sentido'){ const ci=capInfo(p.cap); return [um(p.icone||ci.ic,p.nome||p.cap,p.desc,[_cap(p.cap,Number(p.capValor)||0)])]; }
  if(p.cat==='narrativo') return [um(p.icone||'📜',p.nome||'Privilégio',p.desc,[_txt(p.desc||p.nome||'Privilégio')])];
  if(p.cat==='fisico'){
    return MODS_FISICOS.filter(m=>p.mods[m.k]).map(m=>{
      const efs=(m.efs?m.efs(sys):[]).slice();
      if(m.contra&&p.contras[m.k]) efs.push(...m.contra[1]());
      const extra=[];
      if(m.ataque) extra.push(_ataqueNatural(sys,m.ataque,m.ic,previa));
      if(m.cura){ const vida=_recPor(sys,_V); const ab=sanitizarUsoHab({id:uid(),name:'Regenerar',description:'O corpo se recompõe.',icon:'🌿',req:{level:0,attrs:[]},effects:[]});
        Object.assign(ab.uso,{on:true,tipo:'cura',aplicaEm:'eu',alvoId:vida?vida.id:'',formula:'1d6 + Nível',alcance:'si',texto:'1× por rodada'}); extra.push(sanitizarUsoHab(ab)); }
      if(m.sopro){ const ab=sanitizarUsoHab({id:uid(),name:'Sopro de fogo',description:'Cospe chamas em cone.',icon:'🐲',req:{level:0,attrs:[]},effects:[]});
        Object.assign(ab.uso,{on:true,tipo:'dano',aplicaEm:'alvo',formula:'2d6 + Nível',tipoDano:'Fogo',alcance:'area',area:{forma:'cone',tam:'4.5'},duracao:'1× por descanso',
          teste:{attr:_atrNome(sys,_REFLEXO),cd:'10 + Nível',sucesso:'metade'}}); extra.push(sanitizarUsoHab(ab)); }
      const r=um(m.ic,m.n,m.d+(m.contra&&p.contras[m.k]?' Lado ruim: '+m.contra[0].toLowerCase()+'.':''),efs,extra); r.tam=m.tam; return r;
    });
  }
  return [];
}
function _passosPoder(sys,p){
  const set=(k,v)=>()=>{ p[k]=v; render(); };
  const ehTraco=!!(_AS.alvo&&_AS.alvo.tracos);
  const p1=h('div',{},h('div',{class:'as-q'},ehTraco?'Que tipo de traço?':'Que tipo de poder?'),
    h('div',{class:'as-grade'},...CATS_PODER.filter(c=>!(ehTraco&&c.k==='ativo')).map(c=>h('button',{type:'button',class:'as-op'+(p.cat===c.k?' on':''),onclick:()=>{
      if(c.k==='ativo'){ abrirAssistente('tecnica',_AS.alvo); return; } p.cat=c.k; _AS.passo=1; render(); }}, h('span',{class:'as-ic'},c.ic),h('b',{},c.n),h('small',{},c.d)))));
  let det;
  if(p.cat==='bonus'){ const op=_bonusAlvos(sys); if(!p.alvoK&&op.length) p.alvoK=op[0][0];
    det=h('div',{},h('div',{class:'as-q'},'O que o poder melhora?'),
      h('div',{class:'rg-linha'},h('select',{class:'in',style:{maxWidth:'280px'},onchange:e=>{p.alvoK=e.target.value;render();}},...op.map(([k,n])=>h('option',{value:k,selected:p.alvoK===k},n))),
        h('span',{class:'rg-r'},'Quanto'),h('input',{class:'in',type:'number',style:{width:'80px'},value:p.valor,onchange:e=>{p.valor=parseFloat(e.target.value)||1;render();}}),
        /^res:/.test(p.alvoK)?_tog(p.escala,'por nível (× Nível)',()=>{p.escala=!p.escala;render();}):null),
      h('div',{class:'hint'},'Referência: +1 atributo ou +1 em rolagens é um bom poder de nível baixo; +2 em Defesa é forte; +Nível de Vida acompanha a campanha toda.')); }
  else if(p.cat==='resist') det=h('div',{},h('div',{class:'as-q'},'Contra o quê?'),
    h('div',{class:'rg-linha'},h('input',{class:'in',style:{maxWidth:'180px'},value:p.resistTipo,oninput:e=>{p.resistTipo=e.target.value;},onchange:()=>render()}),
      ...['Fogo','Frio','Elétrico','Ácido','Veneno','Psíquico','Corte','Impacto','Trevas'].map(n=>h('button',{type:'button',class:'chip'+(p.resistTipo===n?' on':''),onclick:set('resistTipo',n)},n))),
    h('div',{class:'as-grade g4'},...RESIST_MODOS.map(([k,n])=>h('button',{type:'button',class:'as-op'+(p.resistModo===k?' on':''),onclick:set('resistModo',k)},h('b',{},n),
      h('small',{class:'as-dim'},{reduz:'leve',metade:'forte',imune:'muito forte',vulneravel:'lado ruim'}[k])))),
    p.resistModo==='reduz'?h('div',{class:'rg-linha'},h('span',{class:'rg-r'},'Reduz'),h('input',{class:'in',type:'number',style:{width:'70px'},value:p.resistValor,onchange:e=>{p.resistValor=parseInt(e.target.value)||0;render();}})):null);
  else if(p.cat==='sentido') det=h('div',{},h('div',{class:'as-q'},'Qual capacidade?'),
    h('div',{class:'as-grade g4'},...CAPACIDADES.map(c=>h('button',{type:'button',class:'as-op'+(p.cap===c.n?' on':''),onclick:set('cap',c.n)},h('span',{class:'as-ic'},c.ic),h('b',{},c.n)))),
    capInfo(p.cap).un?h('div',{class:'rg-linha'},h('span',{class:'rg-r'},'Alcance / velocidade (m)'),h('input',{class:'in',type:'number',style:{width:'80px'},value:p.capValor,onchange:e=>{p.capValor=parseFloat(e.target.value)||0;render();}})):null);
  else if(p.cat==='fisico') det=h('div',{},h('div',{class:'as-q'},'Quais mudanças no corpo? (marque quantas quiser)'),
    h('div',{class:'as-grade g3'},...MODS_FISICOS.map(m=>{ const on=!!p.mods[m.k];
      return h('div',{class:'as-op as-fis'+(on?' on':'')},
        h('button',{type:'button',class:'as-fis-b',onclick:()=>{p.mods[m.k]=!on; if(!on&&m.contra) p.contras[m.k]=true; render();}},
          h('span',{class:'as-ic'},m.ic),h('b',{},m.n),h('small',{},m.d),
          m.ataque?h('small',{class:'as-tag'},'⚔ '+m.ataque[0]+' '+m.ataque[1]):null, m.sopro?h('small',{class:'as-tag'},'🔥 Sopro 2d6'):null, m.cura?h('small',{class:'as-tag'},'🌿 Regenerar'):null),
        (on&&m.contra)?h('label',{class:'as-contra'},h('input',{type:'checkbox',checked:!!p.contras[m.k],onchange:e=>{p.contras[m.k]=e.target.checked;}}),' lado ruim: '+m.contra[0]):null); })),
    h('div',{class:'hint'},'Cada mudança vira um '+(ehTraco?'traço':'poder')+' próprio; ataques naturais, sopro e regeneração viram técnicas usáveis na ficha (botão Atacar/Curar).'));
  else det=h('div',{},h('div',{class:'as-q'},'O que o personagem pode fazer na história?'),
    h('textarea',{class:'in',rows:'3',value:p.desc,placeholder:'Ex.: É reconhecido em qualquer templo da ordem e recebe abrigo de graça.',oninput:e=>{p.desc=e.target.value;}}));
  const p3=h('div',{},h('div',{class:'as-q'},'Nome'),
    p.cat==='fisico'?h('div',{class:'hint'},'Os nomes vêm das mudanças marcadas — ajuste depois no cartão.'):
    h('div',{class:'rg-linha'},h('input',{class:'in rg-ic-in',value:p.icone,maxlength:'4','aria-label':'Ícone',placeholder:'✦',oninput:e=>{p.icone=e.target.value;}}),
      h('input',{class:'in',style:{maxWidth:'280px'},value:p.nome,placeholder:'Nome (vazio = automático)',oninput:e=>{p.nome=e.target.value;}})),
    p.cat!=='narrativo'&&p.cat!=='fisico'?h('textarea',{class:'in',rows:'2',value:p.desc,placeholder:'Texto da ficha (opcional)',oninput:e=>{p.desc=e.target.value;}}):null);
  return [['Tipo',p1],['Detalhes',det],['Nome',p3]];
}
function _previaPoder(sys,p){
  const itens=poderMontar(sys,p,true);
  if(!itens.length) return h('div',{class:'as-prev'},h('div',{class:'hint'},p.cat==='fisico'?'Marque ao menos uma mudança.':'Escolha os detalhes.'));
  return h('div',{class:'as-prev'}, ...itens.map(it=>h('div',{class:'as-pi'},
    h('div',{class:'as-pt'},(it.icon||'')+' '+it.name),
    h('div',{class:'row wrapf'},...it.effects.map(ef=>effectLabel(sys,ef)).filter(Boolean).map(t=>h('span',{class:'tg-fx'},t)),
      ...it.extra.map(x=>h('span',{class:'tg-fx tg-uso'},(x.icon||'')+' '+x.name+': '+usoHabResumo(sys,x)))))));
}

/* ---------------- sobreposição ---------------- */
function assistenteOverlay(){
  if(!_AS) return null;
  const sys=S.system, ehTec=_AS.modo==='tecnica';
  const passos=ehTec?_passosTec(sys,_AS.d):_passosPoder(sys,_AS.d);
  if(_AS.passo>=passos.length) _AS.passo=passos.length-1;
  const ultimo=_AS.passo===passos.length-1;
  const criar=()=>{
    const al=_AS.alvo; pushUndo();
    if(ehTec){
      const pts=tecPontos(_AS.d);
      const ab=tecMontar(sys,_AS.d,al.nivel!=null?al.nivel:_nivelSugerido(sys,pts));
      if(al.tracos){ (al.habArr||al.arr).push(ab); } else al.arr.push(ab);
      S.ui.open[ab.id]=true; showToast('🧙 “'+ab.name+'” criada'); fecharAssistente(); return;
    }
    const itens=poderMontar(sys,_AS.d); if(!itens.length) return showToast('Escolha ao menos uma opção');
    itens.forEach(it=>{
      const o={id:uid(),icon:it.icon,name:it.name,description:it.description||'',req:{level:al.nivel||0,attrs:[]},effects:it.effects};
      if(!al.tracos) sanitizarUsoHab(o);
      al.arr.push(o);
      it.extra.forEach(x=>{ x.req.level=al.nivel||0; (al.habArr||al.arr).push(x); });
      if(it.tam&&al.origem&&al.origem.visual) al.origem.visual.tamanho=it.tam;
    });
    showToast('✨ '+itens.length+' '+(al.tracos?'traço(s)':'poder(es)')+' criado(s)'); fecharAssistente();
  };
  return h('div',{class:'busca-bg',onclick:e=>{ if(e.target.classList.contains('busca-bg')) fecharAssistente(); }},
    h('div',{class:'as-cx',role:'dialog','aria-label':ehTec?'Assistente de técnica':'Assistente de poder'},
      h('div',{class:'as-top'},h('h3',{},ehTec?'🧙 Assistente de técnica / magia':(_AS.alvo.tracos?'🧬 Assistente de traço físico':'✨ Assistente de poder')),
        h('button',{class:'btn sm ghost','aria-label':'Fechar',onclick:fecharAssistente},'✕')),
      h('div',{class:'as-passos'},...passos.map(([n],i)=>h('button',{type:'button',class:'as-ps'+(i===_AS.passo?' cur':i<_AS.passo?' feito':''),onclick:()=>{_AS.passo=i;render();}},(i<_AS.passo?'✓ ':(i+1)+'. ')+n))),
      h('div',{class:'as-corpo'},h('div',{class:'as-main'},passos[_AS.passo][1]), ehTec?_previaTec(sys,_AS.d):_previaPoder(sys,_AS.d)),
      h('div',{class:'as-pe'},
        _AS.passo>0?h('button',{class:'btn ghost sm',onclick:()=>{_AS.passo--;render();}},'← Voltar'):h('span'),
        h('div',{class:'row'},
          !ultimo?h('button',{class:'btn ghost sm',onclick:criar,title:'Cria já com o que está escolhido'},'Criar agora'):null,
          ultimo?h('button',{class:'btn emerald',onclick:criar},'✓ Criar'):h('button',{class:'btn primary sm',onclick:()=>{_AS.passo++;render();}},'Próximo →')))));
}
/* botões para as listas de habilidades/técnicas/traços */
function botoesAssistente(alvo){
  return h('div',{class:'row wrapf as-bts'},
    h('button',{type:'button',class:'btn sm as-bt',onclick:()=>abrirAssistente('tecnica',alvo)},'🧙 Assistente de técnica/magia'),
    h('button',{type:'button',class:'btn sm as-bt',onclick:()=>abrirAssistente('poder',alvo)},alvo.tracos?'🧬 Assistente de traço físico':'✨ Assistente de poder'),
    alvo.tracos?null:h('button',{type:'button',class:'btn sm as-bt ghost',onclick:()=>abrirAssistente('poder',alvo,{cat:'fisico'})},'🧬 Modificação física'));
}
