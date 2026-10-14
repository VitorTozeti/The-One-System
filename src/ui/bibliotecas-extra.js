/* ---------- Classes, origens e itens prontos (só identidade; habilidades e efeitos o Mestre liga depois) ---------- */
const CATALOGO_CLASSES=[
  {n:'Guerreiro',d:'Combate corpo a corpo e resistência física.'},{n:'Mago',d:'Estuda e domina a magia.'},
  {n:'Ladino',d:'Furtivo, ágil e esperto; vive de golpes certeiros.'},{n:'Clérigo',d:'Canaliza o poder divino para curar e proteger.'},
  {n:'Arqueiro',d:'Mestre do combate à distância.'},{n:'Bardo',d:'Inspira aliados e encanta com palavras e música.'},
  {n:'Druida',d:'Fala com a natureza e muda de forma.'},{n:'Paladino',d:'Guerreiro sagrado movido por um juramento.'},
  {n:'Detetive',d:'Investiga pistas e desvenda mistérios.'},{n:'Engenheiro',d:'Cria engenhocas e resolve problemas com tecnologia.'}];
const CATALOGO_ORIGENS=[
  {n:'Humano',d:'Versátil e adaptável, de qualquer lugar do mundo.'},{n:'Elfo',d:'Longevo, gracioso e ligado à natureza e à magia.'},
  {n:'Anão',d:'Robusto, teimoso e mestre de pedra e metal.'},{n:'Halfling',d:'Pequeno, sortudo e difícil de pegar desprevenido.'},
  {n:'Meio-orc',d:'Força bruta com uma vida inteira entre dois mundos.'},{n:'Tiefling',d:'Herança sombria que desperta desconfiança.'},
  {n:'Nômade',d:'Criado na estrada, sem lar fixo.'},{n:'Nobre',d:'Cresceu entre privilégios, etiqueta e intrigas.'},
  {n:'Órfão das ruas',d:'Aprendeu a sobreviver sozinho nas vielas.'},{n:'Soldado veterano',d:'Marcado por campanhas e disciplina militar.'}];
const CATALOGO_ITENS=[
  {n:'Espada longa',c:'arma',w:1.5,e:true,d:'Lâmina versátil de uma mão.'},{n:'Arco curto',c:'arma',w:1,e:true,d:'Leve, para disparos rápidos.'},
  {n:'Adaga',c:'arma',w:0.5,e:true,d:'Pequena e fácil de esconder.'},{n:'Cajado',c:'arma',w:2,e:true,d:'Foco de magia e apoio de viagem.'},
  {n:'Armadura de couro',c:'armadura',w:5,e:true,d:'Proteção leve.'},{n:'Cota de malha',c:'armadura',w:10,e:true,d:'Proteção média, barulhenta.'},
  {n:'Escudo',c:'armadura',w:3,e:true,d:'Desvia golpes.'},{n:'Anel simples',c:'acessorio',w:0.1,e:true,d:'Um anel sem poder aparente.'},
  {n:'Mochila',c:'ferramenta',w:1,e:false,d:'Carrega o equipamento da aventura.'},{n:'Corda (15 m)',c:'ferramenta',w:2.5,e:false,d:'Útil para escalar e amarrar.'},
  {n:'Tocha',c:'ferramenta',w:0.5,e:false,d:'Ilumina por algumas horas.'},{n:'Poção de cura',c:'consumivel',w:0.2,e:false,d:'Restaura ferimentos ao beber.'},
  {n:'Ração de viagem',c:'consumivel',w:0.5,e:false,d:'Comida para um dia.'}];
/* Excluir com rede de proteção: guarda o sistema antes e oferece "Desfazer" por toast. */
function comDesfazer(msg,acao){
  const snap=JSON.stringify(S.system);
  acao(); S.ui.sel=null; render();
  uiToastUndo(msg,()=>{ S.system=JSON.parse(snap); S.ui.sel=null; render(); },9000);
}
function bibliotecaGenerica(titulo,lista,jaTem,adicionar){
  const faltam=lista.filter(p=>!jaTem(p));
  return h('div',{class:'per-lib',style:{margin:'10px 0'}},
    h('div',{class:'per-g-cab'},h('b',{},titulo),
      h('button',{class:'btn ghost sm',type:'button',disabled:!faltam.length,
        onclick:()=>{ faltam.forEach(adicionar); render(); showToast(faltam.length+' adicionado(s)'); }},
        faltam.length?('+ todos ('+faltam.length+')'):'✓ todos')),
    h('div',{class:'row wrapf'},...lista.map(p=>{
      const tem=jaTem(p);
      return h('button',{type:'button',class:'chip'+(tem?' on':''),'aria-pressed':tem?'true':'false',disabled:tem,
        title:p.d+(tem?'\n(já adicionado)':'\n(clique para adicionar)'),onclick:()=>{ adicionar(p); render(); }},(tem?'✓ ':'+ ')+p.n);
    })));
}
const _tem=(l,n)=>(l||[]).some(x=>semAcento(x.name||'')===semAcento(n));
function bibliotecaClasses(sys){
  return bibliotecaGenerica('📚 Classes prontas',CATALOGO_CLASSES,p=>_tem(sys.classes,p.n),
    p=>sys.classes.push({id:uid(),name:p.n,description:p.d,abilities:[]}));
}
function bibliotecaOrigens(sys){
  return bibliotecaGenerica('📚 Origens prontas',CATALOGO_ORIGENS,p=>_tem(sys.origins,p.n),
    p=>sys.origins.push({id:uid(),name:p.n,description:p.d,abilities:[],traits:[]}));
}
function bibliotecaItens(sys){
  return bibliotecaGenerica('📚 Itens prontos',CATALOGO_ITENS,p=>_tem(sys.items,p.n),
    p=>sys.items.push({id:uid(),name:p.n,description:p.d,categoria:p.c,weight:p.w,equipavel:p.e,effects:[]}));
}
