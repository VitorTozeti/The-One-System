/* ============================================================ ESTÚDIO DA FICHA ============================================================
   O editor da ficha em tela cheia, como um app de design: ferramentas à esquerda, o papel no centro, opções do bloco à direita.
     • 🧱 Blocos   — paleta por categoria, com descrição e busca; arraste para o papel ou clique para encaixar; sugestões do que falta
     • 🎨 Estilo   — TEMAS da ficha (paleta inteira, clara ou escura), papel e fundo, cantos/sombra/bordas de todos os blocos de uma vez
     • 📐 Modelos  — galeria com miniaturas dos layouts prontos + "Meus modelos" (salvos no sistema)
     • ☰ Camadas   — lista de tudo que está no papel
     • Edição direta: duplo clique num bloco edita o texto/título ali mesmo
   Usa o motor de canvas existente (canvasNode/attachEdit/palletDrag/propsCard). Abre pelo botão "Abrir estúdio" da aba Ficha (S.ui.estudio).
   Tema: sh.tema={n,vars} aplica variáveis CSS no papel (aplicaTemaFicha) sem mexer nas opções de cada bloco. */

const BLOCOS_INFO={
  nome:['Essenciais','Nome do personagem, classe, raça e nível.'],
  foto:['Essenciais','Retrato ou emoji do personagem.'],
  atributos:['Essenciais','Atributos em grade, lista, linha ou formas.'],
  valores:['Essenciais','Números calculados, como a Defesa.'],
  recursos:['Essenciais','Barras de Vida, Mana… com dano/cura e descanso.'],
  pericias:['Essenciais','Perícias com o bônus já calculado.'],
  habilidades:['Essenciais','Habilidades e técnicas de classe — com botão de usar/ligar.'],
  caracteristicas:['Essenciais','Voo, resistências, traços físicos e avisos.'],
  anotacoes:['Essenciais','Espaço livre para o jogador escrever.'],
  dados:['Jogo','Rolador de dados com bônus.'],
  progressao:['Jogo','O que o degrau atual libera.'],
  condicoes:['Jogo','Estados como Envenenado ou Caído.'],
  ataques:['Jogo','Ataques das armas equipadas, com rolagem.'],
  inventario:['Jogo','Itens, carga, equipar e usar.'],
  tecnicas:['Jogo','Técnicas criadas pelo jogador.'],
  escolhas:['Jogo','Talentos e trilhas escolhidos.'],
  texto:['Decoração','Texto livre: títulos, frases, lembretes.'],
  divisor:['Decoração','Linha separadora com enfeite.'],
  forma:['Decoração','Hexágono, escudo, losango… com texto.'],
  imagem:['Decoração','Selo, brasão ou ilustração.'],
  espaco:['Decoração','Moldura vazia para organizar.'],
};
/* variáveis CSS que o tema troca no papel (o resto do app não muda) */
const _CLARO={'--acc-txt':'#3730a3','--acc-txt2':'#4338ca','--warn-txt':'#92400e','--ok-txt':'#047857','--rose-txt':'#be123c'};
const _tv=(bg,panel,txt,muted,line,surf,claro)=>Object.assign({'--bg':bg,'--panel':panel,'--panel2':panel,'--surf':surf||panel,'--surf2':surf||panel,'--line':line,'--line2':line,'--txt':txt,'--muted':muted,'--dim':muted},claro?_CLARO:{});
const FICHA_TEMAS=[
  {n:'Noite',ic:'🌙',accent:'#4f46e5',vars:_tv('#0b1020','#141a2e','#e5e7f0','#9aa3bd','#2a3350','#1b2340')},
  {n:'Pergaminho',ic:'📜',accent:'#8a6a2f',vars:_tv('#f1e6cb','#f8efd9','#3b2b12','#6b5530','#c9b27c','#efe2bf',true)},
  {n:'Papel claro',ic:'📄',accent:'#4f46e5',vars:_tv('#ffffff','#f6f7fb','#1b1b22','#5a5f73','#d6d8e4','#eceef6',true)},
  {n:'Neon',ic:'💠',accent:'#22d3ee',vars:_tv('#07070f','#10101d','#e8fdff','#8fb5c4','#0e7490','#161628')},
  {n:'Sci-fi',ic:'🛰️',accent:'#38bdf8',vars:_tv('#08111f','#0e1b30','#d6f1ff','#8aa9c4','#1e3a5f','#122440')},
  {n:'Terror',ic:'🩸',accent:'#dc2626',vars:_tv('#120808','#1d0e0e','#f3e1e1','#b99a9a','#5b1a1a','#2a1212')},
  {n:'Floresta',ic:'🌲',accent:'#22c55e',vars:_tv('#0b1710','#132419','#e4f3e9','#9bbba6','#1f4a30','#1a3324')},
  {n:'Oceano',ic:'🌊',accent:'#0ea5e9',vars:_tv('#07161f','#0d2230','#dff3fb','#8fb4c4','#17425a','#12303f')},
  {n:'Vinho',ic:'🍷',accent:'#db2777',vars:_tv('#180a13','#26111d','#f6e3ee','#b998aa','#5a1f40','#331626')},
  {n:'Ouro real',ic:'👑',accent:'#eab308',vars:_tv('#130f06','#1f190a','#f7efd6','#b9aa7e','#5b4a14','#2b2210')},
  {n:'Grafite',ic:'⚙️',accent:'#94a3b8',vars:_tv('#101114','#1a1c21','#e6e8ec','#9a9fab','#30343c','#23262d')},
];
function aplicaTemaFicha(el,sh){ if(sh&&sh.tema&&sh.tema.vars){ for(const k in sh.tema.vars) el.style.setProperty(k,sh.tema.vars[k]); el.style.color='var(--txt)'; } }

/* ---------- sugestões: o que a ficha ainda não mostra / o que está torto ---------- */
function sugestoesFicha(sys){
  const sh=sys.sheet, tem=k=>sh.blocks.some(b=>b.key===k), out=[];
  const add=(k,t,cond)=>{ if(cond&&!tem(k)) out.push({k,t}); };
  add('nome','A ficha não mostra o nome e a classe do personagem.',true);
  add('atributos','Faltam os Atributos.',(sys.attributes||[]).length>0);
  add('recursos','Falta o bloco de Recursos (Vida, Mana…).',(sys.resources||[]).some(r=>(r.type||'barra')!=='valor'));
  add('valores','Há valores calculados (como Defesa) que não aparecem.',(sys.resources||[]).some(r=>(r.type||'barra')==='valor'));
  add('pericias','Faltam as Perícias.',(sys.skills||[]).length>0);
  add('inventario','O sistema tem itens: falta o Inventário.',(sys.items||[]).length>0);
  add('ataques','Há armas com ataque: mostre-as no bloco Ataques.',(sys.items||[]).some(i=>i.attack&&i.attack.on));
  add('tecnicas','As técnicas autorais estão ligadas: falta o bloco Técnicas.',!!sys.techAtivo&&(sys.techTiers||[]).length>0);
  add('condicoes','Há condições no sistema: falta o bloco Condições.',(sys.conditions||[]).length>0);
  add('escolhas','Há escolhas/talentos: falta o bloco Escolhas.',(sys.choices||[]).length>0);
  add('progressao','Há tabela de progressão: falta o bloco Progressão.',!!(sys.progression&&(sys.progression.cols||[]).length));
  add('habilidades','Faltam as Habilidades (classe, origem e técnicas).',(sys.classes||[]).length>0||(sys.origins||[]).length>0);
  const nm=b=>(b.opts&&b.opts.alias)||(BLOCK_TYPES[b.key]||{label:b.key}).label;
  const bs=sh.blocks.filter(b=>!(b.opts&&b.opts.hidden)&&!['forma','imagem','divisor','texto','espaco'].includes(b.key));
  for(let i=0;i<bs.length;i++) for(let j=i+1;j<bs.length;j++){
    const a=bs[i],b=bs[j], w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x), hh=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
    if(w>8&&hh>8&&(w*hh)>0.2*Math.min(a.w*a.h,b.w*b.h)) out.push({ids:[a.id,b.id],t:'“'+nm(a)+'” e “'+nm(b)+'” estão sobrepostos.'});
  }
  sh.blocks.forEach(b=>{ if(b.x+b.w>CANVAS_W+2) out.push({ids:[b.id],t:'“'+nm(b)+'” passa da borda do papel.'}); });
  return out;
}

/* ---------- miniatura de um layout ---------- */
function miniaturaLayout(sheet,accent){
  const H=sheet.canvasH||990, w=132, k=w/CANVAS_W;
  const m=h('div',{class:'fs-mini',style:{width:w+'px',height:Math.max(40,Math.round(H*k))+'px','--ac':accent||sheet.accent||'#4f46e5'}});
  (sheet.blocks||[]).forEach(b=>{ const t=BLOCK_TYPES[b.key]||{icon:'▫'};
    m.appendChild(h('div',{class:'fs-mb fs-mb-'+b.key,style:{left:(b.x*k)+'px',top:(b.y*k)+'px',width:Math.max(3,b.w*k)+'px',height:Math.max(3,b.h*k)+'px'}},
      (b.w*k>16&&b.h*k>14)?h('span',{'data-noicon':''},t.icon):null)); });
  return m;
}

/* ---------- ações em lote ---------- */
function aplicarNosBlocos(fn,msg){
  const sh=S.system.sheet; pushUndo();
  sh.blocks.forEach(b=>{ if(['forma','imagem','divisor','texto','foto','nome'].includes(b.key)) return; fn(b.opts); });
  render(); if(msg) uiToastUndo(msg,()=>{undo();render();});
}
function aplicarModeloFicha(nome,fabrica){
  uiConfirm('Aplicar o modelo “'+nome+'”? O layout atual é substituído (dá para desfazer). As regras do sistema não mudam.',{titulo:'Aplicar modelo de ficha',okText:'Aplicar'}).then(ok=>{
    if(!ok) return; const sh=S.system.sheet; pushUndo(); const novo=fabrica();
    sh.blocks=novo.blocks.map(b=>({...b,id:uid()})); sh.canvasH=novo.canvasH||sh.canvasH; if(novo.accent&&!sh.tema) sh.accent=novo.accent;
    S.ui.sel=null; S.ui.multi=[]; render(); uiToastUndo('Modelo aplicado: '+nome,()=>{undo();render();}); });
}

/* ---------- peças do estúdio ---------- */
function fsAbaBlocos(sys,sh){
  const q=semAcento(String(S.ui.fsQ||'').trim());
  const busca=h('input',{class:'in',type:'search',placeholder:'🔎 Buscar bloco…','aria-label':'Buscar bloco',value:S.ui.fsQ||'',
    oninput:e=>{ S.ui.fsQ=e.target.value; render(); }});
  const sug=sugestoesFicha(sys);
  const sugBox=sug.length?h('div',{class:'fs-sug'},h('div',{class:'fs-h'},'💡 Sugestões ('+sug.length+')'),
    ...sug.slice(0,5).map(s=>s.k
      ?h('button',{type:'button',class:'fs-sug-i',onclick:()=>{ const t=BLOCK_TYPES[s.k]; const sp=freeSpot(sh,t.w,t.h); addBlockAt(s.k,sp.x,sp.y); }},h('span',{},s.t),h('b',{},'+ Adicionar'))
      :h('button',{type:'button',class:'fs-sug-i',onclick:()=>{ S.ui.sel=s.ids[0]; S.ui.multi=s.ids.slice(1); render(); }},h('span',{},s.t),h('b',{},'Ver')))):null;
  const cats=['Essenciais','Jogo','Decoração'];
  const grupos=cats.map(c=>{
    const ks=Object.keys(BLOCK_TYPES).filter(k=>(BLOCOS_INFO[k]||['Jogo'])[0]===c&&(!q||semAcento(BLOCK_TYPES[k].label+' '+((BLOCOS_INFO[k]||[])[1]||'')).includes(q)));
    if(!ks.length) return null;
    return h('div',{},h('div',{class:'fs-h'},c),h('div',{class:'fs-blocos'},...ks.map(k=>{
      const t=BLOCK_TYPES[k], usado=!t.multi&&sh.blocks.some(b=>b.key===k);
      const btn=h('button',{type:'button',class:'fs-bl'+(usado?' usado':''),title:usado?'Já está na ficha — clique para selecionar':'Arraste para o papel ou clique para encaixar'},
        h('span',{class:'fs-bl-ic','data-noicon':''},t.icon),h('span',{class:'fs-bl-t'},h('b',{},t.label),h('small',{},(BLOCOS_INFO[k]||['',''])[1])),
        usado?h('span',{class:'fs-ok'},'✓'):null);
      if(usado) btn.addEventListener('click',()=>{ const b=sh.blocks.find(x=>x.key===k); if(b){ S.ui.sel=b.id; S.ui.multi=[]; render(); } });
      else btn.addEventListener('pointerdown',ev=>palletDrag(ev,k,btn));
      return btn; })));
  }).filter(Boolean);
  return h('div',{class:'fs-aba'},busca,sugBox,...(grupos.length?grupos:[h('div',{class:'hint'},'Nenhum bloco com esse nome.')]));
}
function fsAbaEstilo(sys,sh){
  const bgInput=h('input',{type:'file',accept:'image/*',class:'hide',onchange:e=>{ lerImagemLivro(e.target.files[0],data=>{ pushUndo(); sh.bgImage=data; render(); },1000); e.target.value=''; }});
  const seg=(rot,opts,atual,fn)=>h('div',{class:'fs-seg-w'},h('div',{class:'hint'},rot),h('div',{class:'seg'},...opts.map(([v,l])=>h('button',{type:'button',class:String(atual)===String(v)?'on':'',onclick:()=>fn(v)},l))));
  const r0=sh.blocks.find(b=>b.opts&&!['forma','imagem','divisor','texto'].includes(b.key));
  const o0=(r0&&r0.opts)||{};
  return h('div',{class:'fs-aba'},
    h('div',{class:'fs-h'},'Tema da ficha'),
    h('div',{class:'fs-temas'},...FICHA_TEMAS.map(t=>{ const on=sh.tema&&sh.tema.n===t.n;
      return h('button',{type:'button',class:'fs-tema'+(on?' on':''),title:t.n,'aria-pressed':on?'true':'false',
        onclick:()=>{ pushUndo(); sh.tema={n:t.n,vars:{...t.vars}}; sh.accent=t.accent; sh.bg=''; render(); uiToastUndo('Tema: '+t.n,()=>{undo();render();}); }},
        h('span',{class:'fs-tema-sw',style:{background:t.vars['--bg'],borderColor:t.accent}},h('i',{style:{background:t.vars['--panel']}}),h('i',{style:{background:t.accent}})),
        h('span',{class:'fs-tema-n'},h('span',{'data-noicon':''},t.ic+' '),t.n)); })),
    sh.tema?h('button',{type:'button',class:'btn sm ghost',onclick:()=>{ pushUndo(); delete sh.tema; render(); }},'✕ Tirar o tema (usar as cores do app)'):null,
    h('div',{class:'fs-h'},'Papel'),
    field('Título da ficha',h('input',{class:'in',value:sh.title||'',oninput:e=>{sh.title=e.target.value;persist();}})),
    h('div',{class:'grid g2',style:{marginTop:'8px'}},
      field('Cor de destaque',h('input',{type:'color',class:'fs-cor',value:sh.accent||'#4f46e5',oninput:e=>{sh.accent=e.target.value;refreshCanvas();}})),
      field('Cor do fundo',h('input',{type:'color',class:'fs-cor',value:sh.bg||(sh.tema&&sh.tema.vars['--bg'])||'#0b1020',oninput:e=>{sh.bg=e.target.value;refreshCanvas();}}))),
    h('div',{class:'row wrapf',style:{marginTop:'8px'}},
      sh.bg?h('button',{type:'button',class:'btn sm ghost',onclick:()=>{pushUndo();sh.bg='';render();}},'✕ cor própria'):null,
      h('button',{type:'button',class:'btn sm',onclick:()=>bgInput.click()},sh.bgImage?'🖼 Trocar fundo':'🖼 Imagem de fundo'),
      sh.bgImage?h('button',{type:'button',class:'btn sm danger',onclick:()=>{pushUndo();sh.bgImage='';render();}},'✕'):null,bgInput),
    h('div',{style:{marginTop:'8px'}},field('Altura do papel (px)',h('input',{class:'in',type:'number',min:'200',step:'10',value:sh.canvasH,onchange:e=>{sh.canvasH=Math.max(200,parseInt(e.target.value)||990);render();}}))),
    h('div',{class:'fs-h'},'Todos os blocos de uma vez'),
    seg('Cantos',[[0,'Retos'],[8,'Leves'],[14,'Redondos'],[26,'Bolha']],o0.radius==null?14:o0.radius,v=>aplicarNosBlocos(o=>{o.radius=v;})),
    seg('Sombra',[['nenhuma','Sem'],['suave','Suave'],['forte','Forte'],['brilho','Brilho']],o0.shadow||'nenhuma',v=>aplicarNosBlocos(o=>{o.shadow=v;})),
    seg('Borda',[[0,'Sem'],[1,'Fina'],[2,'Média'],[4,'Grossa']],o0.borderW==null?1:o0.borderW,v=>aplicarNosBlocos(o=>{o.borderW=v;})),
    seg('Moldura',[[true,'Com fundo'],[false,'Sem fundo']],o0.framed!==false,v=>aplicarNosBlocos(o=>{o.framed=v;})),
    h('button',{type:'button',class:'btn sm ghost',style:{marginTop:'10px'},onclick:()=>aplicarNosBlocos(o=>{ Object.assign(o,{bg:'',bgOpacity:100,borderColor:'',borderW:null,radius:null,shadow:'nenhuma'}); },'Estilos dos blocos restaurados')},'↺ Restaurar estilo de todos os blocos'));
}
function fsAbaModelos(sys,sh){
  const meus=sys.modelosFicha||(sys.modelosFicha=[]);
  const card1=(nome,sheet,acoes)=>h('div',{class:'fs-mod'},miniaturaLayout(sheet),h('div',{class:'fs-mod-t'},h('b',{},nome),h('small',{},(sheet.blocks||[]).length+' blocos')),h('div',{class:'row'},...acoes));
  return h('div',{class:'fs-aba'},
    h('div',{class:'fs-h'},'Modelos prontos'),
    h('div',{class:'fs-mods'},...Object.keys(LAYOUT_PRESETS).map(n=>{ const s=LAYOUT_PRESETS[n]();
      return card1(n,s,[h('button',{type:'button',class:'btn sm primary',onclick:()=>aplicarModeloFicha(n,LAYOUT_PRESETS[n])},'Usar')]); })),
    h('div',{class:'fs-h'},'Meus modelos'),
    h('div',{class:'hint'},'Guarde o layout atual para reutilizar (fica salvo junto com o sistema).'),
    h('button',{type:'button',class:'btn sm',style:{margin:'8px 0'},onclick:async()=>{
      const nome=await uiPrompt('Nome do modelo:','Meu layout',{titulo:'Salvar layout como modelo'}); if(!nome||!String(nome).trim()) return;
      meus.push({id:uid(),nome:String(nome).trim().slice(0,40),sheet:JSON.parse(JSON.stringify({blocks:sh.blocks,canvasH:sh.canvasH,accent:sh.accent}))}); render(); showToast('Modelo salvo'); }},'💾 Salvar o layout atual'),
    meus.length?h('div',{class:'fs-mods'},...meus.map(m=>card1(m.nome,m.sheet,[
      h('button',{type:'button',class:'btn sm primary',onclick:()=>aplicarModeloFicha(m.nome,()=>JSON.parse(JSON.stringify(m.sheet)))},'Usar'),
      h('button',{type:'button',class:'btn sm danger','aria-label':'Excluir',onclick:()=>{ pushUndo(); meus.splice(meus.indexOf(m),1); render(); }},'✕')]))):null);
}
function fsDireita(sys,sh,sel){
  if(sel){ const p=propsCard(sys,sh,sel); p.classList.add('fs-props'); return p; }
  const sug=sugestoesFicha(sys);
  return h('div',{class:'fs-vazio'},
    h('div',{class:'fs-h'},'Nada selecionado'),
    h('p',{class:'hint'},'Clique num bloco para editar as opções dele aqui. Dê duplo clique para editar o texto direto no papel.'),
    sug.length?h('div',{class:'fs-sug'},h('div',{class:'fs-h'},'💡 Para melhorar'),...sug.map(s=>h('div',{class:'fs-sug-l'},s.t))):h('div',{class:'hint'},'✓ Nada a corrigir: todos os dados do sistema aparecem e não há blocos sobrepostos.'),
    h('div',{class:'fs-h'},'Atalhos'),
    h('div',{class:'keys'},...[['Arrastar','mover'],['Shift+clique','somar à seleção'],['Alt+arrastar','duplicar'],['Setas','1 px'],['Delete','remover'],['Ctrl+D','duplicar'],['Ctrl+Z','desfazer'],['Duplo clique','editar texto']]
      .map(([k,d])=>h('span',{class:'keycap'},h('b',{},k),d))));
}
function estudioFicha(sys){
  const sh=sys.sheet, sel=sh.blocks.find(b=>b.id===S.ui.sel)||null;
  const aba=['blocos','estilo','modelos','camadas'].includes(S.ui.fsAba)?S.ui.fsAba:'blocos';
  const abas=[['blocos','🧱','Blocos'],['estilo','🎨','Estilo'],['modelos','📐','Modelos'],['camadas','☰','Camadas']];
  const esq=h('aside',{class:'fs-esq'},
    h('div',{class:'fs-abas',role:'tablist'},...abas.map(([k,ic,l])=>h('button',{type:'button',role:'tab','aria-selected':aba===k?'true':'false',class:'fs-ab'+(aba===k?' on':''),onclick:()=>{S.ui.fsAba=k;render();}},h('span',{'data-noicon':''},ic),h('small',{},l)))),
    aba==='blocos'?fsAbaBlocos(sys,sh):aba==='estilo'?fsAbaEstilo(sys,sh):aba==='modelos'?fsAbaModelos(sys,sh):h('div',{class:'fs-aba'},camadasBox(sh)));
  const z=S.ui.zoom, setZoom=v=>{S.ui.zoom=v;render();};
  const topo=h('header',{class:'fs-top'},
    h('button',{type:'button',class:'btn sm',onclick:()=>{S.ui.estudio=false;render();}},'← Sair do estúdio'),
    h('input',{class:'in fs-titulo','aria-label':'Título da ficha',value:sh.title||'',placeholder:'Título da ficha',oninput:e=>{sh.title=e.target.value;persist();}}),
    h('div',{class:'row wrapf'},
      h('button',{type:'button',class:'btn sm ghost',disabled:!undoStack.length,title:'Desfazer (Ctrl+Z)','aria-label':'Desfazer',onclick:()=>{undo();render();}},'↩'),
      h('button',{type:'button',class:'btn sm ghost',disabled:!redoStack.length,title:'Refazer','aria-label':'Refazer',onclick:()=>{redo();render();}},'↪'),
      h('span',{class:'fs-sep'}),
      h('button',{type:'button',class:'btn sm ghost','aria-label':'Diminuir zoom',onclick:()=>setZoom(Math.max(.25,(z||1)-.15))},'−'),
      h('span',{class:'tg-fx',style:{minWidth:'54px',textAlign:'center'}},z?Math.round(z*100)+'%':'auto'),
      h('button',{type:'button',class:'btn sm ghost','aria-label':'Aumentar zoom',onclick:()=>setZoom(Math.min(2.5,(z||1)+.15))},'+'),
      h('button',{type:'button',class:'btn sm '+(z?'ghost':'emerald'),title:'Ajustar à tela',onclick:()=>setZoom(null)},'⤢'),
      h('span',{class:'fs-sep'}),
      h('button',{type:'button',class:'btn sm '+(sh.showGrid!==false?'emerald':'ghost'),onclick:()=>{sh.showGrid=!(sh.showGrid!==false);render();}},'▦ Grade'),
      h('button',{type:'button',class:'btn sm '+(sh.snap!==false?'emerald':'ghost'),title:'Grudar nas bordas e centros dos outros blocos',onclick:()=>{sh.snap=!(sh.snap!==false);render();}},'🧲 Ímã'),
      h('button',{type:'button',class:'btn sm ghost',title:'Encolhe o papel até o último bloco',onclick:()=>{pushUndo();const low=sh.blocks.reduce((m,b)=>Math.max(m,b.y+b.h),0);sh.canvasH=Math.max(200,low+20);render();}},'⇕ Ajustar altura')),
    h('button',{type:'button',class:'btn sm emerald',onclick:()=>{ if(!S.draft)S.draft=initDraft(sys); S.ui.estudio=false; S.view='jogador'; render(); window.scrollTo(0,0); }},'▶ Testar'));
  const centro=h('main',{class:'fs-centro'},canvasNode(sys,sampleDraft(sys),'edit'),
    h('div',{class:'hint',style:{textAlign:'center',padding:'8px'}},'Personagem de exemplo — é assim que o jogador verá.'));
  return h('div',{class:'fs',role:'region','aria-label':'Estúdio da ficha'},topo,h('div',{class:'fs-corpo'},esq,centro,h('aside',{class:'fs-dir'},fsDireita(sys,sh,sel))));
}

/* ---------- a aba Ficha ---------- */
function tabFicha(sys){
  if(!sys.sheet||!Array.isArray(sys.sheet.blocks)) migrateSheet(sys);
  if(S.ui.estudio) return estudioFicha(sys);
  const sh=sys.sheet, sug=sugestoesFicha(sys);
  const hero=h('div',{class:'fs-hero'},
    h('div',{class:'fs-hero-prev'},miniaturaLayout(sh)),
    h('div',{class:'fs-hero-t'},
      h('h3',{},'Estúdio da ficha'),
      h('p',{class:'hint'},'Edite a ficha em tela cheia: temas prontos, galeria de modelos, blocos com descrição, sugestões do que falta e edição direta no papel.'),
      h('div',{class:'row wrapf'},
        h('button',{type:'button',class:'btn primary',onclick:()=>{S.ui.estudio=true;render();}},'🎨 Abrir estúdio'),
        sug.length?h('span',{class:'tg-fx'},'💡 '+sug.length+' sugestão(ões)'):h('span',{class:'tg-fx'},'✓ ficha completa'))));
  return h('div',{},hero,h('details',{class:'fs-leg',ontoggle:()=>setTimeout(fitCanvases,0)},h('summary',{},'Editor clássico (versão compacta)'),tabFichaLegado(sys)));
}

/* ---------- edição direta: duplo clique no bloco ---------- */
function editarTextoNoBloco(el,b){
  if(el.querySelector('.blk-ed')) return;
  const o=b.opts||(b.opts={}); let chave='title', multi=false;
  if(b.key==='texto'){ chave='text'; multi=true; } else if(b.key==='forma') chave='texto'; else if(b.key==='divisor') chave='enfeite';
  const t=BLOCK_TYPES[b.key]||{};
  let feito=false;
  const ed=h(multi?'textarea':'input',{class:'in blk-ed',value:o[chave]||'',placeholder:chave==='title'?(t.title||t.label||'Título'):'Digite aqui','aria-label':'Editar texto do bloco'});
  ed.style.cssText='position:absolute;z-index:12;left:0;right:0;top:0;'+(multi?'bottom:0;resize:none;':'')+'margin:0;border-radius:8px;box-shadow:0 0 0 2px var(--indigo)';
  const fim=salvar=>{ if(feito) return; feito=true;
    if(salvar&&ed.value!==(o[chave]||'')){ pushUndo(); o[chave]=ed.value; if(chave==='title') o.showTitle=true; render(); } else ed.remove(); };
  ed.addEventListener('pointerdown',e=>e.stopPropagation());
  ed.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Escape'){ e.preventDefault(); fim(false); } else if(e.key==='Enter'&&(!multi||e.ctrlKey)){ e.preventDefault(); fim(true); } });
  ed.addEventListener('blur',()=>fim(true));
  el.appendChild(ed); setTimeout(()=>{ ed.focus(); if(ed.select) ed.select(); },0);
}
