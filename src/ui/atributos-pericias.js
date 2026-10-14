/* ============================================================ ATRIBUTOS E PERÍCIAS (abas do Mestre) ============================================================
   Foco: criar rápido e sem rolar a página.
   • Atributos: digite o nome + Enter (o campo continua pronto para o próximo), conjuntos
     prontos de sistemas conhecidos, sugestões que somem quando já foram usadas, sigla
     automática e setas para reordenar.
   • Perícias: biblioteca de perícias prontas por grupo (Exploração, Social, Física,
     Conhecimento, Ofícios, Combate) — um clique adiciona já ligada ao atributo certo.
   Depende de: formula-field.js (attrAbbr, profCard, skillExplain), ui-basic.js (card, field),
   dialogs.js (uiConfirm, uiToastUndo), master-nav.js (semAcento). */

/* ---------------------------------------------------------------- ATRIBUTOS */
const CONJUNTOS_ATRIBUTOS=[
  {nome:'D&D', n:6, itens:[['Força','FOR'],['Destreza','DES'],['Constituição','CON'],['Inteligência','INT'],['Sabedoria','SAB'],['Carisma','CAR']]},
  {nome:'Ordem Paranormal', n:5, itens:[['Agilidade','AGI'],['Força','FOR'],['Intelecto','INT'],['Presença','PRE'],['Vigor','VIG']]},
  {nome:'Fantasia', n:5, itens:[['Força','FOR'],['Agilidade','AGI'],['Vigor','VIG'],['Mente','MEN'],['Presença','PRE']]},
  {nome:'Investigação', n:4, itens:[['Físico','FIS'],['Intelecto','INT'],['Presença','PRE'],['Sensibilidade','SEN']]},
  {nome:'Sobrevivência', n:4, itens:[['Força','FOR'],['Agilidade','AGI'],['Resistência','RES'],['Percepção','PER']]},
  {nome:'Narrativo', n:3, itens:[['Corpo','COR'],['Mente','MEN'],['Coração','CRA']]},
];
const SUGESTOES_ATRIBUTOS=['Força','Destreza','Agilidade','Constituição','Vigor','Resistência','Inteligência','Intelecto','Mente','Sabedoria',
  'Percepção','Vontade','Carisma','Presença','Sorte','Técnica','Magia'];

function atributoExiste(sys,nome){ const k=semAcento(nome.trim()); return sys.attributes.some(a=>semAcento(a.name.trim())===k); }
/* Adiciona um atributo (nomes são únicos: as fórmulas usam o nome). Devolve true se adicionou. */
function adicionaAtributo(sys,nome,sigla,silencioso){
  nome=String(nome||'').trim().slice(0,24);
  if(!nome) return false;
  if(atributoExiste(sys,nome)){ if(!silencioso) showToast('“'+nome+'” já existe — os nomes não podem se repetir.'); return false; }
  sys.attributes.push({id:uid(), name:nome, abbr:sigla||'', desc:''});
  return true;
}
function resumoPontosAtributos(sys){
  const n=sys.attributes.length; if(!n) return null;
  const lp=levelPoints(sys,sys.startLevel||1);
  return n+' atributo(s) · valor inicial '+sys.startAttrValue+' · faixa '+sys.attrMin+'–'+sys.attrMax+' · o jogador distribui '+lp.attrPoints+' ponto(s) no começo.';
}
function tabAtributos(sys){
  const quando=()=>{ const i=document.getElementById('attr-novo'); if(i) i.focus(); };
  const adicionarDoCampo=()=>{
    const i=document.getElementById('attr-novo'); if(!i) return;
    if(adicionaAtributo(sys,i.value)){ render(); setTimeout(quando,0); } else { i.focus(); i.select(); }
  };
  const novo=h('input',{class:'in',id:'attr-novo',maxlength:'24',placeholder:'Digite o nome do atributo (ex.: Força) e aperte Enter',
    'aria-label':'Nome do novo atributo',
    onkeydown:e=>{ if(e.key==='Enter'){ e.preventDefault(); adicionarDoCampo(); } }});
  const adicionar=h('div',{class:'attr-add'}, novo,
    h('button',{class:'btn primary',type:'button',onclick:adicionarDoCampo},'+ Adicionar'));

  /* conjuntos prontos */
  const conjuntos=h('div',{class:'row wrapf'}, ...CONJUNTOS_ATRIBUTOS.map(c=>
    h('button',{class:'btn sm ghost',type:'button',title:c.itens.map(x=>x[0]).join(', '),onclick:()=>{
      let n=0; c.itens.forEach(([nm,sg])=>{ if(adicionaAtributo(sys,nm,sg,true)) n++; });
      render(); showToast(n?(n+' atributo(s) adicionado(s)'):'Esses atributos já estão na lista');
    }}, c.nome+' ('+c.n+')')));

  /* sugestões que ainda não foram usadas */
  const faltam=SUGESTOES_ATRIBUTOS.filter(n=>!atributoExiste(sys,n));
  const sugestoes=faltam.length?h('div',{class:'row wrapf'}, ...faltam.map(n=>
    h('button',{class:'chip',type:'button',onclick:()=>{ if(adicionaAtributo(sys,n)) render(); }},'+ '+n))):null;

  const lista=sys.attributes.length
    ? h('div',{class:'attr-list'}, ...sys.attributes.map((a,i)=>{
        const mover=d=>{ const j=i+d; if(j<0||j>=sys.attributes.length) return;
          const t=sys.attributes[i]; sys.attributes[i]=sys.attributes[j]; sys.attributes[j]=t; render(); };
        return h('div',{class:'attr-row'},
          h('span',{class:'attr-n'}, String(i+1)),
          h('div',{class:'attr-mv'},
            h('button',{class:'btn ghost sm',type:'button',disabled:i===0,title:'Subir',onclick:()=>mover(-1)},'▲'),
            h('button',{class:'btn ghost sm',type:'button',disabled:i===sys.attributes.length-1,title:'Descer',onclick:()=>mover(1)},'▼')),
          h('div',{class:'attr-campos'},
            h('div',{class:'attr-l1'},
              h('input',{class:'in',value:a.name,maxlength:'24',placeholder:'Nome','aria-label':'Nome do atributo '+(i+1),
                oninput:e=>{a.name=e.target.value;persist();},
                onchange:e=>{ const v=e.target.value.trim();
                  if(!v||sys.attributes.some(x=>x!==a&&semAcento(x.name.trim())===semAcento(v))){ showToast(!v?'O nome não pode ficar vazio.':'Já existe um atributo com esse nome.'); a.name=a.name||'Atributo'; }
                  render(); }}),
              h('input',{class:'in attr-sg',value:a.abbr||'',maxlength:'5',placeholder:attrAbbr(a),title:'Sigla (ex.: FOR). Vazia = 3 primeiras letras.',
                'aria-label':'Sigla de '+a.name,oninput:e=>{a.abbr=e.target.value;persist();},onchange:()=>render()})),
            h('input',{class:'in attr-ds',value:a.desc||'',maxlength:'120',placeholder:'Para que serve? (opcional — ex.: dano corpo a corpo, carga)',
              'aria-label':'Descrição de '+a.name,oninput:e=>{a.desc=e.target.value;persist();}})),
          h('button',{class:'btn danger sm',type:'button',title:'Remover '+a.name,onclick:()=>{
            const pos=i, copia=sys.attributes[i];
            sys.attributes.splice(i,1); render();
            uiToastUndo('“'+copia.name+'” removido',()=>{ sys.attributes.splice(Math.min(pos,sys.attributes.length),0,copia); render(); },7000);
          }},'✕'));
      }))
    : h('div',{class:'vazio'},h('div',{class:'vazio-t'},'Nenhum atributo ainda'),
        h('div',{class:'hint'},'Atributos são o que o personagem é (Força, Mente…). Digite um nome acima, escolha um conjunto pronto ou toque numa sugestão.'));

  const resumo=resumoPontosAtributos(sys);
  return card('Atributos','Modo atual: '+(sys.attrMode==='modificador'?'Modificador':'Valor direto')+'. A sigla aparece na ficha estilizada.',
    sys.attributes.length?h('button',{class:'btn ghost sm',type:'button',onclick:async()=>{
      if(!await uiConfirm('Remover todos os '+sys.attributes.length+' atributos?',{titulo:'Limpar atributos',okText:'Remover todos',perigo:true})) return;
      const copia=sys.attributes.slice(); sys.attributes=[]; render();
      uiToastUndo('Atributos removidos',()=>{ sys.attributes=copia; render(); },8000);
    }},'Limpar todos'):null,
    h('div',{class:'passo-l'},h('b',{},'1. '),'Adicione um por um'), adicionar,
    h('div',{class:'passo-l'},h('b',{},'2. '),'…ou use um conjunto pronto ',h('span',{class:'hint'},'(só entram os que ainda não existem)')), conjuntos,
    sugestoes?h('div',{class:'passo-l'},h('b',{},'3. '),'…ou toque numa sugestão'):null, sugestoes,
    h('div',{class:'passo-l'},h('b',{},'Seus atributos '),h('span',{class:'hint'},'— renomeie à vontade; reordene com ▲▼')), lista,
    resumo?h('div',{class:'hint',style:{marginTop:'10px'}},resumo):null);
}

/* ---------------------------------------------------------------- PERÍCIAS */
/* n = nome · d = descrição · a = nomes de atributo que combinam (em ordem de preferência) */
const CATALOGO_PERICIAS=[
  {g:'Exploração', ic:'🔍', itens:[
    {n:'Percepção',      d:'Notar perigos, ouvir barulhos distantes e evitar emboscadas. A perícia mais rolada do RPG.', a:['Percepção','Sabedoria','Mente','Sensibilidade','Intelecto']},
    {n:'Investigação',   d:'Examinar cenas de crime, decifrar enigmas e encontrar passagens secretas.', a:['Intelecto','Inteligência','Mente','Sabedoria']},
    {n:'Furtividade',    d:'Esconder-se, mover-se em silêncio e realizar ataques surpresa.', a:['Agilidade','Destreza']},
    {n:'Sobrevivência',  d:'Rastrear criaturas, guiar o grupo pela selva e encontrar comida ou abrigo.', a:['Sabedoria','Percepção','Vigor','Resistência','Mente']},
    {n:'Navegação',      d:'Ler mapas, orientar-se por estrelas e não deixar o grupo se perder.', a:['Sabedoria','Inteligência','Intelecto','Mente']},
    {n:'Prontidão',      d:'Acordar rápido, reagir primeiro e não ser pego desprevenido.', a:['Percepção','Sabedoria','Agilidade','Destreza']},
  ]},
  {g:'Social', ic:'🗣️', itens:[
    {n:'Persuasão',      d:'A arte de convencer NPCs de forma amigável, negociar preços e conseguir favores.', a:['Carisma','Presença','Coração']},
    {n:'Enganação',      d:'Contar mentiras convincentes, disfarçar-se e blefar em jogos de azar.', a:['Carisma','Presença','Coração']},
    {n:'Intimidação',    d:'Conseguir o que quer através do medo, ameaças ou imponência física.', a:['Presença','Carisma','Força']},
    {n:'Intuição',       d:'Ler a linguagem corporal e descobrir se alguém está mentindo.', a:['Sabedoria','Sensibilidade','Percepção','Mente']},
    {n:'Atuação',        d:'Cantar, tocar, dançar ou encenar para entreter e cativar uma plateia.', a:['Carisma','Presença','Coração']},
    {n:'Liderança',      d:'Inspirar aliados, dar ordens claras e manter o grupo unido sob pressão.', a:['Carisma','Presença','Coração']},
    {n:'Diplomacia',     d:'Mediar conflitos e firmar acordos entre facções.', a:['Carisma','Presença','Intelecto']},
  ]},
  {g:'Físicas', ic:'💪', itens:[
    {n:'Atletismo',      d:'Força física pura: escalar montanhas, nadar contra a correnteza e saltar fossos.', a:['Força','Corpo','Físico']},
    {n:'Acrobacia',      d:'Agilidade, reflexos, equilíbrio e escapar de amarras ou quedas.', a:['Agilidade','Destreza']},
    {n:'Ladinagem',      d:'Bater carteiras, arrombar fechaduras e sabotar armadilhas.', a:['Destreza','Agilidade']},
    {n:'Cavalgar',       d:'Montar, conduzir e acalmar montarias e veículos de tração.', a:['Destreza','Agilidade','Sabedoria']},
    {n:'Pilotagem',      d:'Conduzir veículos, barcos e naves em situações difíceis.', a:['Destreza','Agilidade','Técnica']},
    {n:'Fortitude',      d:'Resistir a venenos, doenças, fadiga e dor.', a:['Constituição','Vigor','Resistência']},
    {n:'Reflexo',        d:'Reagir a perigos súbitos: armadilhas, explosões, emboscadas.', a:['Agilidade','Destreza']},
    {n:'Vontade',        d:'Resistir a medo, controle mental e tentações.', a:['Vontade','Sabedoria','Mente','Presença']},
  ]},
  {g:'Combate', ic:'⚔️', itens:[
    {n:'Luta',           d:'Combate corpo a corpo, com ou sem armas.', a:['Força','Corpo','Físico']},
    {n:'Pontaria',       d:'Ataques à distância: arcos, bestas, armas de arremesso e de fogo.', a:['Destreza','Agilidade']},
    {n:'Defesa',         d:'Aparar, esquivar e se proteger com escudo ou armadura.', a:['Agilidade','Vigor','Destreza']},
    {n:'Tática',         d:'Ler o campo de batalha e posicionar aliados.', a:['Inteligência','Intelecto','Mente']},
  ]},
  {g:'Conhecimento', ic:'📚', itens:[
    {n:'Medicina',       d:'Estabilizar aliados moribundos, tratar venenos e diagnosticar doenças.', a:['Sabedoria','Intelecto','Inteligência','Mente']},
    {n:'História',       d:'O que o personagem sabe do mundo: reinos antigos, lendas, política e atualidades.', a:['Inteligência','Intelecto','Mente']},
    {n:'Arcanismo',      d:'Identificar feitiços, runas mágicas, artefatos e criaturas de outros planos.', a:['Inteligência','Intelecto','Mente','Magia']},
    {n:'Natureza',       d:'Compreender o mundo natural: plantas medicinais, animais, clima e geografia.', a:['Inteligência','Sabedoria','Intelecto','Mente']},
    {n:'Religião',       d:'Conhecer deuses, ritos, símbolos sagrados e mortos-vivos.', a:['Sabedoria','Inteligência','Mente']},
    {n:'Ocultismo',      d:'Saber sobre o sobrenatural, seitas, maldições e rituais proibidos.', a:['Intelecto','Inteligência','Mente','Sensibilidade']},
    {n:'Tecnologia',     d:'Entender máquinas, computadores e engenhocas.', a:['Intelecto','Inteligência','Técnica','Mente']},
    {n:'Política',       d:'Conhecer leis, nobreza, facções e jogos de poder.', a:['Inteligência','Intelecto','Carisma','Mente']},
    {n:'Idiomas',        d:'Falar, ler e decifrar línguas e escritas estrangeiras ou antigas.', a:['Inteligência','Intelecto','Mente']},
  ]},
  {g:'Ofícios', ic:'🛠️', itens:[
    {n:'Artesanato',     d:'Forjar, costurar, entalhar e consertar equipamentos.', a:['Destreza','Inteligência','Técnica','Intelecto']},
    {n:'Alquimia',       d:'Preparar poções, venenos, antídotos e substâncias.', a:['Inteligência','Intelecto','Sabedoria','Mente']},
    {n:'Mecânica',       d:'Montar, consertar e sabotar mecanismos e veículos.', a:['Técnica','Inteligência','Intelecto','Destreza']},
    {n:'Hacking',        d:'Invadir sistemas, quebrar senhas e manipular redes.', a:['Intelecto','Inteligência','Técnica','Mente']},
    {n:'Adestramento',   d:'Lidar com animais, acalmar bestas e ensinar truques.', a:['Sabedoria','Carisma','Presença']},
    {n:'Disfarce',       d:'Mudar aparência, voz e postura para se passar por outra pessoa.', a:['Carisma','Presença','Destreza']},
    {n:'Culinária',      d:'Preparar refeições que restauram o ânimo (e evitam intoxicação).', a:['Sabedoria','Destreza','Vigor']},
  ]},
];
function periciaExiste(sys,nome){ const k=semAcento(nome.trim()); return (sys.skills||[]).findIndex(s=>semAcento(String(s.name||'').trim())===k); }
/* Procura, entre os atributos do sistema, o que mais combina com a perícia. */
function atributoParaPericia(sys,dicas){
  for(const d of (dicas||[])){
    const k=semAcento(d), a=(sys.attributes||[]).find(x=>semAcento(x.name).includes(k)||k.includes(semAcento(x.name)));
    if(a) return a.id;
  }
  return null;
}
function adicionaPericia(sys,p,auto){
  if(periciaExiste(sys,p.n)>=0) return false;
  sys.skills.push({id:uid(), name:p.n, description:p.d||'', linkedAttrId:atributoParaPericia(sys,p.a), trainedBonus:2, auto:!!auto});
  return true;
}
function removePericia(sys,i){
  const copia=sys.skills[i], pos=i;
  sys.skills.splice(i,1); render();
  uiToastUndo('“'+copia.name+'” removida',()=>{ sys.skills.splice(Math.min(pos,sys.skills.length),0,copia); render(); },7000);
}
function bibliotecaPericias(sys){
  const busca=h('input',{class:'in',type:'search',placeholder:'Filtrar a biblioteca (ex.: furt, medic…)','aria-label':'Filtrar perícias prontas',
    oninput:e=>{
      const q=semAcento(e.target.value.trim());
      lib.querySelectorAll('[data-pn]').forEach(b=>{ b.style.display=(!q||b.dataset.pn.includes(q))?'':'none'; });
      lib.querySelectorAll('.per-grupo').forEach(g=>{ g.style.display=[...g.querySelectorAll('[data-pn]')].some(b=>b.style.display!=='none')?'':'none'; });
    }});
  const chip=p=>{
    const i=periciaExiste(sys,p.n), tem=i>=0;
    return h('button',{type:'button',class:'chip'+(tem?' on':''),'data-pn':semAcento(p.n+' '+p.d),'aria-pressed':tem?'true':'false',
      title:p.d+(tem?'\n(clique para remover)':'\n(clique para adicionar)'),
      onclick:()=>{ const j=periciaExiste(sys,p.n); if(j>=0) removePericia(sys,j); else { adicionaPericia(sys,p); render(); } }},
      (tem?'✓ ':'+ ')+p.n);
  };
  const lib=h('div',{class:'per-lib'}, ...CATALOGO_PERICIAS.map(gr=>{
    const faltam=gr.itens.filter(p=>periciaExiste(sys,p.n)<0);
    return h('div',{class:'per-grupo'},
      h('div',{class:'per-g-cab'}, h('b',{},gr.ic+' '+gr.g),
        h('button',{class:'btn ghost sm',type:'button',disabled:!faltam.length,onclick:()=>{ faltam.forEach(p=>adicionaPericia(sys,p)); render(); showToast(faltam.length+' perícia(s) de '+gr.g+' adicionada(s)'); }},
          faltam.length?('+ todas ('+faltam.length+')'):'✓ todas')),
      h('div',{class:'row wrapf'}, ...gr.itens.map(chip)));
  }));
  const total=CATALOGO_PERICIAS.reduce((s,g)=>s+g.itens.length,0);
  const faltamTodas=CATALOGO_PERICIAS.reduce((s,g)=>s+g.itens.filter(p=>periciaExiste(sys,p.n)<0).length,0);
  return card('Biblioteca de perícias prontas','Clique para adicionar (já ligada ao atributo que mais combina). Passe o mouse para ler a descrição. Clique de novo para remover.',
    h('button',{class:'btn emerald sm',type:'button',disabled:!faltamTodas,onclick:()=>{
      CATALOGO_PERICIAS.forEach(g=>g.itens.forEach(p=>adicionaPericia(sys,p))); render(); showToast('Biblioteca completa adicionada'); }},
      faltamTodas?('✨ Adicionar todas ('+faltamTodas+' de '+total+')'):'✓ Todas adicionadas'),
    busca, lib);
}
/* Painel de detalhes da perícia selecionada (gaveta à direita). Clique no cartão abre; ✕/Esc fecha. */
function painelPericia(sys,s){
  const fechar=()=>{ S.ui.perSel=null; render(); };
  const idx=sys.skills.indexOf(s);
  const linkSel=h('select',{class:'in','aria-label':'Atributo de '+s.name,onchange:e=>{s.linkedAttrId=e.target.value||null;render();}});
  linkSel.appendChild(h('option',{value:''},'— sem atributo —'));
  sys.attributes.forEach(a=>{const o=h('option',{value:a.id},a.name);if(a.id===s.linkedAttrId)o.selected=true;linkSel.appendChild(o);});
  const nome=h('input',{class:'in',value:s.name,maxlength:'40','aria-label':'Nome da perícia',
    oninput:e=>{s.name=e.target.value;persist();},
    onchange:e=>{ const v=e.target.value.trim(); const j=periciaExiste(sys,v);
      if(!v||(j>=0&&j!==idx)){ showToast(!v?'O nome não pode ficar vazio.':'Já existe uma perícia com esse nome.'); s.name=s.name||'Perícia'; }
      render(); }});
  const desc=h('textarea',{class:'in',rows:'5',placeholder:'O que a perícia faz? Quando o jogador deve rolá-la?','aria-label':'Descrição de '+s.name,
    oninput:e=>{s.description=e.target.value;persist();},onchange:()=>render()});
  desc.value=s.description||'';
  return h('aside',{class:'per-painel',role:'dialog','aria-label':'Detalhes da perícia '+s.name},
    h('div',{class:'per-p-cab'}, h('b',{},'Detalhes da perícia'),
      h('button',{class:'btn ghost sm',type:'button',title:'Fechar (Esc)',onclick:fechar},'✕')),
    field('Nome',nome),
    field('Atributo ligado',linkSel),
    field('Descrição',desc),
    field('Bônus ao treinar',h('input',{class:'in',type:'number',value:s.trainedBonus||0,onchange:e=>{s.trainedBonus=parseInt(e.target.value)||0;render();}}),'bonustreino'),
    field('Disponibilidade',h('button',{class:'in',type:'button',style:{cursor:'pointer',textAlign:'left'},onclick:()=>{s.auto=!s.auto;render();}},
      s.auto?'⚡ Automática (todo personagem tem)':'✋ Jogador escolhe'),'periciaauto'),
    h('div',{class:'hint',style:{marginTop:'6px'}}, skillExplain(sys,s)),
    h('div',{class:'row',style:{marginTop:'14px',justifyContent:'space-between'}},
      h('button',{class:'btn danger sm',type:'button',onclick:()=>{ S.ui.perSel=null; removePericia(sys,idx); }},'🗑 Remover'),
      h('button',{class:'btn primary sm',type:'button',onclick:fechar},'Pronto')));
}
function tabPericias(sys){
  const novo=h('input',{class:'in',id:'per-nova',maxlength:'40',placeholder:'Criar uma perícia própria: digite o nome e aperte Enter','aria-label':'Nome da nova perícia',
    onkeydown:e=>{ if(e.key!=='Enter') return; e.preventDefault();
      const v=novo.value.trim(); if(!v) return;
      if(periciaExiste(sys,v)>=0){ showToast('Já existe uma perícia com esse nome.'); return; }
      const nova={id:uid(),name:v,description:'',linkedAttrId:null,trainedBonus:2,auto:false};
      sys.skills.push(nova); S.ui.perSel=nova.id; render(); }});
  const sel=sys.skills.find(x=>x.id===S.ui.perSel)||null;
  if(!sel) S.ui.perSel=null;
  const cartao=s=>{
    const a=sys.attributes.find(x=>x.id===s.linkedAttrId);
    return h('button',{type:'button',class:'per-card'+(s===sel?' sel':''),'aria-pressed':s===sel?'true':'false',
      onclick:()=>{ S.ui.perSel=(s===sel)?null:s.id; render(); }},
      h('div',{class:'per-c-top'}, h('b',{class:'per-c-n'},s.name||'(sem nome)'),
        h('span',{class:'per-c-at'+(a?'':' vz')}, a?attrAbbr(a):'—')),
      h('div',{class:'per-c-d'}, s.description||'Sem descrição — clique para editar.'),
      h('div',{class:'per-c-rod'}, h('span',{},'+'+(s.trainedBonus||0)+' treinada'), h('span',{}, s.auto?'⚡ automática':'✋ escolha')));
  };
  /* agrupa por atributo ligado (na ordem dos atributos); sem atributo vai para o fim; dentro do grupo, ordem alfabética */
  const alfa=l=>l.slice().sort((x,y)=>(x.name||'').localeCompare(y.name||'','pt-BR',{sensitivity:'base'}));
  const grupos=sys.attributes.map(a=>({t:a.name+' ('+attrAbbr(a)+')',l:alfa(sys.skills.filter(s=>s.linkedAttrId===a.id))}));
  grupos.push({t:'Sem atributo',l:alfa(sys.skills.filter(s=>!sys.attributes.some(a=>a.id===s.linkedAttrId)))});
  const visao=sys.skills.length
    ? h('div',{class:'per-grupos'}, ...grupos.filter(g=>g.l.length).map(g=>
        h('div',{class:'per-gp'}, h('div',{class:'per-gp-t'},g.t,h('span',{class:'hint'},' · '+g.l.length)),
          h('div',{class:'per-grid'}, ...g.l.map(cartao)))))
    : h('div',{class:'vazio'},h('div',{class:'vazio-t'},'Nenhuma perícia ainda'),
        h('div',{class:'hint'},'Adicione da biblioteca (um clique) ou digite um nome acima.'));
  return h('div',{class:sel?'per-com-painel':''},
    bibliotecaPericias(sys), profCard(sys),
    card('Perícias do seu sistema', sys.skills.length?(sys.skills.length+' perícia(s), agrupadas por atributo. Clique numa para editar descrição, atributo e bônus.'):'Nenhuma perícia ainda — use a biblioteca acima ou crie a sua.',
      null, novo, visao),
    sel?painelPericia(sys,sel):null);
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&typeof S!=='undefined'&&S.ui&&S.ui.perSel){ S.ui.perSel=null; render(); } });
