/* ============================================================ VERSÕES AUTOMÁTICAS ============================================================
   Rede de proteção do Mestre: a cada poucos minutos de edição (e ao sair da aba) guarda um
   retrato do SISTEMA, até VER_MAX por personagem. "🕘 Versões" lista e restaura — a pessoa
   pode experimentar sem medo, porque sempre dá para voltar. Restaurar também é desfazível. */
const VER_MAX=8, VER_INTERVALO=4*60*1000;
const verChave=()=>'nexus_ver_'+S.currentId;
function verLista(){ return (S.currentId && load(verChave()))||[]; }
function verGravar(lista){
  while(lista.length){
    try{ store(verChave(),lista); return true; }catch(e){ lista.shift(); }   /* cota cheia: descarta a mais antiga */
  }
  return false;
}
/* motivo: texto curto mostrado na lista. force: ignora o intervalo mínimo. */
function verSnapshot(motivo,force){
  if(!S.account||!S.currentId||!S.system) return;
  const p=currentPersonagem(); if(!p||p.kind!=='mestre') return;
  const s=JSON.stringify(S.system), lista=verLista(), ult=lista[lista.length-1];
  if(ult && ult.s===s) return;
  if(!force && ult && Date.now()-ult.t<VER_INTERVALO) return;
  lista.push({t:Date.now(), m:motivo||'automática', s});
  while(lista.length>VER_MAX) lista.shift();
  verGravar(lista);
}
function verResumo(s){
  try{ const o=JSON.parse(s);
    return (o.attributes||[]).length+' atributos · '+(o.skills||[]).length+' perícias · '+(o.classes||[]).length+' classes · '+(o.items||[]).length+' itens';
  }catch(e){ return '—'; }
}
function verQuando(t){
  const m=Math.round((Date.now()-t)/60000);
  if(m<1) return 'agora há pouco';
  if(m<60) return 'há '+m+' min';
  const hh=Math.round(m/60); if(hh<24) return 'há '+hh+' h';
  return new Date(t).toLocaleDateString('pt-BR');
}
function verRestaurar(v){
  const antes=JSON.stringify(S.system);
  verSnapshot('antes de restaurar',true);
  const novo=migrateSystem(JSON.parse(v.s)); if(!novo) return showToast('Versão ilegível.');
  S.system=novo; S.draft=null; S.ui.sel=null; S.ui.versoes=false; undoStack.length=0; redoStack.length=0; render();
  uiToastUndo('Versão de '+verQuando(v.t)+' restaurada',()=>{ S.system=JSON.parse(antes); S.draft=null; render(); },10000);
}
function versoesOverlay(){
  const lista=verLista().slice().reverse();
  const fechar=()=>{ S.ui.versoes=false; render(); };
  const salvarAgora=()=>{ verSnapshot('salva por você',true); showToast('Versão salva'); render(); };
  const corpo=lista.length
    ? lista.map(v=>h('div',{class:'ver-i'},
        h('div',{},h('b',{},verQuando(v.t)),h('span',{class:'hint'},' · '+v.m),h('div',{class:'hint'},verResumo(v.s))),
        h('button',{class:'btn sm',onclick:()=>verRestaurar(v)},'↩ Voltar para esta')))
    : [h('div',{class:'busca-vazio'},'Ainda não há versões. Elas são guardadas sozinhas enquanto você edita.')];
  return h('div',{class:'busca-bg',onclick:e=>{ if(e.target.classList.contains('busca-bg')) fechar(); },
      onkeydown:e=>{ if(e.key==='Escape') fechar(); }},
    h('div',{class:'busca-cx',role:'dialog','aria-modal':'true','aria-label':'Versões do sistema'},
      h('div',{class:'ver-head'},h('b',{},'🕘 Versões do sistema'),h('span',{style:{flex:'1'}}),
        h('button',{class:'btn sm',onclick:salvarAgora},'＋ Salvar versão agora'),
        h('button',{class:'btn sm ghost','aria-label':'Fechar',onclick:fechar},'✕')),
      h('div',{class:'ver-l'},...corpo)));
}
/* guarda sozinho enquanto o Mestre edita, e ao esconder/fechar a aba */
setInterval(()=>{ if(!document.hidden) verSnapshot('automática'); },60*1000);
document.addEventListener('visibilitychange',()=>{ if(document.hidden) verSnapshot('ao sair da aba',false); });
