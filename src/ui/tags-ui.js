/* ============================================================ ABA 🏷 TAGS (nova) ============================================================
   Antes: lista de nomes coloridos + uma lista de relações difícil de ler.
   Agora:
     • tag com ícone, categoria (dano, elemento, criatura, material, paranormal…) e descrição
     • pacotes prontos (Elementos, Físico, Ordem Paranormal, Criaturas, Jujutsu…) com relações já montadas
     • MATRIZ EM GRADE: linha = quem ataca, coluna = quem recebe; clique na casa para ciclar ×2 · ×½ · ×0 · +1 dado · normal
     • as tags viram sugestão no "tipo de dano" das técnicas e nas resistências
   sys.tags[] {id,name,color,icon,cat,desc} · sys.tagMatrix[] {id,from,to,mult,dice,nota} */

const TAG_CATS=[['dano','⚔ Tipo de dano'],['elemento','🔥 Elemento'],['criatura','🐺 Tipo de criatura'],['material','🪨 Material'],['paranormal','👁 Paranormal'],['outro','🏷 Outro']];
const TAG_PACOTES=[
  {n:'🔥 Elementos',tags:[['Fogo','🔥','#ef4444','elemento'],['Gelo','❄️','#38bdf8','elemento'],['Raio','⚡','#facc15','elemento'],['Ácido','🧪','#84cc16','elemento'],['Trovão','🌩️','#a78bfa','elemento']],
   rel:[['Fogo','Gelo',2],['Gelo','Fogo',0.5],['Raio','Gelo',1,1],['Fogo','Fogo',0.5]]},
  {n:'⚔ Físico',tags:[['Corte','🗡️','#94a3b8','dano'],['Impacto','🔨','#78716c','dano'],['Perfuração','🏹','#a1a1aa','dano']],rel:[]},
  {n:'👁 Ordem Paranormal',tags:[['Sangue','🩸','#dc2626','paranormal'],['Morte','💀','#525252','paranormal'],['Energia','🌀','#a855f7','paranormal'],['Conhecimento','📜','#eab308','paranormal'],['Medo','😱','#0f172a','paranormal']],
   rel:[['Sangue','Conhecimento',1,1],['Conhecimento','Energia',1,1],['Energia','Morte',1,1],['Morte','Sangue',1,1]]},
  {n:'🐺 Criaturas',tags:[['Morto-vivo','🧟','#65a30d','criatura'],['Fera','🐾','#b45309','criatura'],['Constructo','⚙️','#64748b','criatura'],['Espírito','👻','#a5b4fc','criatura'],['Demônio','😈','#be123c','criatura'],['Celestial','✨','#fde047','criatura']],
   rel:[['Celestial','Morto-vivo',2],['Celestial','Demônio',2]]},
  {n:'🌀 Jujutsu (F&M)',tags:[['Energia Amaldiçoada','🟣','#7c3aed','paranormal'],['Energia Reversa','🟢','#22c55e','paranormal'],['Maldição','👹','#9f1239','criatura']],
   rel:[['Energia Reversa','Maldição',2],['Energia Amaldiçoada','Maldição',1]]},
];
const MATRIZ_CICLO=[{mult:2,dice:0,t:'×2',c:'#ef4444'},{mult:0.5,dice:0,t:'×½',c:'#38bdf8'},{mult:0,dice:0,t:'×0',c:'#64748b'},{mult:1,dice:1,t:'+1d',c:'#a855f7'},{mult:1,dice:-1,t:'−1d',c:'#f59e0b'},null];

function sanitizeTagsExtra(sys){
  (sys.tags||[]).forEach(t=>{ if(typeof t.icon!=='string') t.icon=''; if(!TAG_CATS.some(c=>c[0]===t.cat)) t.cat='outro'; if(typeof t.desc!=='string') t.desc=''; });
}
function tagPorNome(sys,n){ return (sys.tags||[]).find(t=>semAcento(t.name)===semAcento(n)); }
function aplicarPacoteTags(sys,p){
  pushUndo(); let novas=0;
  p.tags.forEach(([n,ic,cor,cat])=>{ if(!tagPorNome(sys,n)){ sys.tags.push({id:uid(),name:n,icon:ic,color:cor,cat,desc:''}); novas++; } });
  p.rel.forEach(([a,b,mult,dice])=>{ const A=tagPorNome(sys,a), Bt=tagPorNome(sys,b); if(!A||!Bt) return;
    if(!sys.tagMatrix.some(m=>m.from===A.id&&m.to===Bt.id)) sys.tagMatrix.push({id:uid(),from:A.id,to:Bt.id,mult:mult==null?1:mult,dice:dice||0,nota:''}); });
  showToast('🏷 '+p.n+': '+novas+' tag(s) nova(s)'); render();
}
function tabTagsNova(sys){
  sanitizeTagsExtra(sys);
  const ui=S.ui, filtro=ui.tagCat||'';
  const vis=sys.tags.filter(t=>!filtro||t.cat===filtro);
  const lista=card(tit('Tags','tag'),'Etiquetas que classificam dano, elementos, criaturas e materiais. Aparecem nas armas, técnicas, condições e resistências.',
    h('button',{class:'btn primary',onclick:()=>{sys.tags.push({id:uid(),name:'Nova tag',color:'#6366f1',icon:'🏷',cat:filtro||'dano',desc:''});render();}},'+ Tag'),
    h('div',{class:'row wrapf'},h('span',{class:'hint'},'Pacotes prontos:'),...TAG_PACOTES.map(p=>h('button',{type:'button',class:'chip',title:'Tags: '+p.tags.map(t=>t[0]).join(', ')+(p.rel.length?(' · '+p.rel.length+' relação(ões)'):''),onclick:()=>aplicarPacoteTags(sys,p)},'+ '+p.n))),
    sys.tags.length?h('div',{class:'row wrapf',style:{margin:'10px 0 4px'}},
      h('button',{type:'button',class:'chip'+(!filtro?' on':''),onclick:()=>{ui.tagCat='';render();}},'Todas ('+sys.tags.length+')'),
      ...TAG_CATS.filter(([k])=>sys.tags.some(t=>t.cat===k)).map(([k,n])=>h('button',{type:'button',class:'chip'+(filtro===k?' on':''),onclick:()=>{ui.tagCat=k;render();}},n+' ('+sys.tags.filter(t=>t.cat===k).length+')'))):null,
    sys.tags.length?null:h('div',{class:'vazio'},h('div',{class:'vazio-t'},'Nenhuma tag'),h('div',{class:'hint'},'Use um pacote pronto acima — já vem com as relações (ex.: Fogo ×2 em Gelo).')),
    h('div',{class:'tag-grid'},...vis.map(t=>h('div',{class:'tag-card',style:{'--tc':t.color}},
      h('div',{class:'row'},
        h('input',{type:'color',value:t.color,'aria-label':'Cor',class:'tag-cor',oninput:e=>{t.color=e.target.value;persist();},onchange:()=>render()}),
        h('input',{class:'in tag-ic',value:t.icon,maxlength:'4','aria-label':'Ícone',onchange:e=>{t.icon=e.target.value;render();}}),
        h('input',{class:'in',style:{fontWeight:'700'},value:t.name,'aria-label':'Nome',oninput:e=>{t.name=e.target.value;persist();},onchange:()=>render()}),
        h('button',{class:'btn mini ghost','aria-label':'Excluir tag',onclick:()=>comDesfazer('Tag “'+t.name+'” excluída',()=>{
          sys.tags=sys.tags.filter(x=>x.id!==t.id); sys.tagMatrix=sys.tagMatrix.filter(m=>m.from!==t.id&&m.to!==t.id);
          (sys.items||[]).forEach(it=>{ if(it.attack) it.attack.tags=(it.attack.tags||[]).filter(x=>x!==t.id); }); })},'✕')),
      h('div',{class:'row'},
        h('select',{class:'in',style:{maxWidth:'170px'},'aria-label':'Categoria',onchange:e=>{t.cat=e.target.value;render();}},...TAG_CATS.map(([k,n])=>h('option',{value:k,selected:t.cat===k},n))),
        h('input',{class:'in',value:t.desc,placeholder:'O que é (opcional)',oninput:e=>{t.desc=e.target.value;persist();}})),
      tagRelResumo(sys,t))))) ;
  return h('div',{},lista,cardMatriz(sys));
}
function tagRelResumo(sys,t){
  const fortes=sys.tagMatrix.filter(m=>m.from===t.id).map(m=>{ const o=sys.tags.find(x=>x.id===m.to); return o?('▸ '+(o.icon||'')+o.name+' '+relTexto(m)):null; }).filter(Boolean);
  return fortes.length?h('div',{class:'hint'},fortes.join(' · ')):null;
}
function relTexto(m){ return (m.mult!==1?('×'+(m.mult===0.5?'½':m.mult)):'')+(m.dice?((m.mult!==1?' ':'')+(m.dice>0?'+':'')+m.dice+'d'):'')||'='; }
function cardMatriz(sys){
  const tags=sys.tags.filter(t=>!S.ui.tagCatMat||t.cat===S.ui.tagCatMat);
  if(sys.tags.length<1) return card(tit('Matriz de interação','matriz'),'Crie tags primeiro.',null);
  const celula=(a,b)=>{
    const m=sys.tagMatrix.find(x=>x.from===a.id&&x.to===b.id);
    const i=m?MATRIZ_CICLO.findIndex(c=>c&&c.mult===m.mult&&c.dice===(m.dice||0)):-1;
    const atual=m?(MATRIZ_CICLO[i]||{t:relTexto(m),c:'#6366f1'}):null;
    return h('td',{},h('button',{type:'button',class:'mx-c'+(m?' on':''),style:atual?{'--mc':atual.c}:null,title:a.name+' atingindo '+b.name+(m?(': '+relTexto(m)):': normal')+' — clique para mudar',
      onclick:()=>{ const prox=MATRIZ_CICLO[(i+1)%MATRIZ_CICLO.length];
        if(!prox){ sys.tagMatrix=sys.tagMatrix.filter(x=>x!==m); }
        else if(m){ m.mult=prox.mult; m.dice=prox.dice; }
        else sys.tagMatrix.push({id:uid(),from:a.id,to:b.id,mult:prox.mult,dice:prox.dice,nota:''});
        render(); }},atual?atual.t:'·'));
  };
  return card(tit('Matriz de interação','matriz'),'Linha = quem ATACA · coluna = quem RECEBE. Clique numa casa para ciclar: ×2 → ×½ → ×0 → +1 dado → −1 dado → normal.',
    h('select',{class:'in',style:{maxWidth:'200px'},'aria-label':'Filtrar categoria',onchange:e=>{S.ui.tagCatMat=e.target.value;render();}},h('option',{value:''},'todas as categorias'),...TAG_CATS.map(([k,n])=>h('option',{value:k,selected:S.ui.tagCatMat===k},n))),
    h('div',{class:'mx-wrap'},h('table',{class:'mx'},
      h('thead',{},h('tr',{},h('th',{class:'mx-canto'},'ataca ▸ / recebe ▾'),...tags.map(b=>h('th',{title:b.name},h('span',{class:'mx-th',style:{color:b.color}},(b.icon||'')+' '+b.name))))),
      h('tbody',{},...tags.map(a=>h('tr',{},h('th',{class:'mx-row',style:{color:a.color}},(a.icon||'')+' '+a.name),...tags.map(b=>celula(a,b))))))),
    sys.tagMatrix.length?h('details',{style:{marginTop:'8px'}},h('summary',{class:'hint'},'📝 Anotações das relações ('+sys.tagMatrix.length+')'),
      ...sys.tagMatrix.map(m=>{ const A=sys.tags.find(x=>x.id===m.from), Bt=sys.tags.find(x=>x.id===m.to); if(!A||!Bt) return null;
        return h('div',{class:'row'},h('span',{style:{minWidth:'200px'}},(A.icon||'')+A.name+' ▸ '+(Bt.icon||'')+Bt.name+' '+relTexto(m)),
          h('input',{class:'in',value:m.nota||'',placeholder:'Anotação (ex.: ciclo de opressão)',oninput:e=>{m.nota=e.target.value;persist();}})); })):null);
}
/* lista de sugestões (datalist) com as tags — usada no "tipo de dano" das técnicas */
function datalistTags(sys,id){
  return h('datalist',{id},...(sys.tags||[]).map(t=>h('option',{value:t.name})));
}
