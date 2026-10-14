/* ============================================================ TOUR OPCIONAL + FOCO NOS OVERLAYS ============================================================
   Tour de 4 passos na 1ª vez do Mestre: pode ser dispensado e reaberto por "❓ Tour". Também
   mantém o Tab dentro de qualquer overlay (.busca-bg: busca, glossário, versões, tour). */
const TOUR_PASSOS=[
  {ic:'👁',t:'Ficha ao vivo',d:'A gaveta à direita mostra um herói de exemplo com as suas regras. Mexeu em algo? Ela muda na hora. Use ▶ Testar / Jogar para experimentar como jogador.'},
  {ic:'🧭',t:'Início e sugestões',d:'A aba Início mostra o próximo passo e dá sugestões (💡). Nada disso impede você de testar: o que falta usa valores padrão.'},
  {ic:'🕘',t:'Errar é barato',d:'↶ ↷ desfazem e refazem; 🕘 Versões guarda pontos anteriores do sistema e deixa voltar neles. Exclusões têm “Desfazer” por alguns segundos.'},
  {ic:'🔎',t:'Achar e entender',d:'Ctrl+K procura qualquer ajuste. 📖 Glossário explica cada termo. Os “?” ao lado dos campos abrem a explicação no lugar.'},
];
function tourVisto(){ return load('nexus_tour_visto')===true; }
function tourAbrir(){ S.ui.tour={i:0}; render(); }
function tourFechar(){ S.ui.tour=null; store('nexus_tour_visto',true); render(); }
function tourOverlay(){
  if(S.ui.tour===undefined) S.ui.tour=tourVisto()?null:{i:0};   /* abre sozinho uma única vez */
  const t=S.ui.tour; if(!t) return null;
  const p=TOUR_PASSOS[t.i], ultimo=t.i===TOUR_PASSOS.length-1;
  setTimeout(()=>{ const b=document.querySelector('.tour-cx .primary'); if(b) try{ b.focus(); }catch(e){} },0);
  return h('div',{class:'busca-bg'},
    h('div',{class:'busca-cx tour-cx',role:'dialog','aria-modal':'true','aria-label':'Tour rápido'},
      h('div',{class:'tour-ic','aria-hidden':'true'},p.ic),
      h('h3',{},p.t), h('p',{},p.d),
      h('div',{class:'tour-dots','aria-hidden':'true'},...TOUR_PASSOS.map((_,i)=>h('span',{class:i===t.i?'on':''}))),
      h('div',{class:'row between'},
        h('button',{class:'btn ghost sm',onclick:tourFechar},'Pular tour'),
        h('div',{class:'row'},
          t.i>0?h('button',{class:'btn sm',onclick:()=>{ t.i--; render(); }},'← Voltar'):null,
          h('button',{class:'btn primary sm',onclick:()=>{ if(ultimo) tourFechar(); else { t.i++; render(); } }},ultimo?'Começar ✓':'Próximo →')))));
}
/* Tab preso dentro do overlay aberto (os diálogos de confirmação têm o próprio controle) */
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab') return;
  const bg=document.querySelector('.busca-bg'); if(!bg||document.querySelector('.dlg-bg')) return;
  const foc=[...bg.querySelectorAll('button,input,textarea,select,[href],[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled&&x.offsetParent!==null);
  if(!foc.length) return;
  const i=foc.indexOf(document.activeElement);
  if(e.shiftKey&&i<=0){ e.preventDefault(); foc[foc.length-1].focus(); }
  else if(!e.shiftKey&&(i===foc.length-1||i<0)){ e.preventDefault(); foc[0].focus(); }
});
