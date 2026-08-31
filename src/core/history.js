/* ============================================================ DESFAZER / REFAZER ============================================================
   Guarda um retrato do SISTEMA INTEIRO antes de cada ação — layout, regras,
   progressão, recursos. (Até a Entrada 004 só cobria o layout, o que fazia o
   Ctrl+Z mentir fora da aba Ficha.) Ações repetidas do mesmo tipo em sequência
   rápida (segurar a seta, arrastar um slider) viram um passo só. */
let undoStack=[], redoStack=[];
const snapLayout=()=>JSON.stringify(S.system);
function pushUndo(tag){
  const s=snapLayout(), last=undoStack[undoStack.length-1];
  if(last && last.s===s) return;
  if(tag && last && last.tag===tag && (Date.now()-last.t)<700){ last.t=Date.now(); return; }
  undoStack.push({s, tag:tag||null, t:Date.now()});
  if(undoStack.length>40) undoStack.shift();
  redoStack.length=0;
}
function applyLayout(json){
  const s=JSON.parse(json);
  S.system=s;
  const sh=S.system.sheet;
  if(!sh || !Array.isArray(sh.blocks) || !sh.blocks.some(b=>b.id===S.ui.sel)) S.ui.sel=null;
}
function undo(){ if(!undoStack.length) return showToast('Nada para desfazer');
  const cur=snapLayout(); redoStack.push({s:cur}); applyLayout(undoStack.pop().s); showToast('↩ Desfeito'); }
function redo(){ if(!redoStack.length) return showToast('Nada para refazer');
  const cur=snapLayout(); undoStack.push({s:cur, tag:null, t:Date.now()}); applyLayout(redoStack.pop().s); showToast('↪ Refeito'); }

