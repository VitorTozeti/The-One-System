/* ============================================================ ATALHOS DO EDITOR ============================================================ */
function duplicarBloco(b){
  const sh=S.system.sheet, t=BLOCK_TYPES[b.key];
  /* duplicar um tipo único criaria justamente o segundo — recusa sempre, não só quando já há outro */
  if(t && !t.multi) return showToast('Só pode haver um bloco de '+t.label);
  pushUndo();
  const spot=freeSpot(sh, b.w, b.h);
  const copia={...JSON.parse(JSON.stringify(b)), id:uid(), x:spot.x, y:spot.y};
  sh.blocks.push(copia); S.ui.sel=copia.id;
  if(copia.y+copia.h+20>sh.canvasH) sh.canvasH=copia.y+copia.h+20;
  showToast('Bloco duplicado');
}
function removerBloco(b){
  const sh=S.system.sheet;
  pushUndo();
  /* remove o grupo inteiro quando há seleção múltipla */
  const alvos=new Set([b.id, ...(estaSelecionado(b.id)?selecionados(sh).map(x=>x.id):[])]);
  const n=alvos.size;
  sh.blocks=sh.blocks.filter(x=>!alvos.has(x.id));
  S.ui.sel=null; S.ui.multi=[]; render();
  if(n>1) showToast(n+' blocos removidos');
}
/* Ctrl+K abre a busca global — vale em qualquer aba, inclusive digitando num campo. */
function ehMestreAtivo(){ const p=(typeof currentPersonagem==='function')?currentPersonagem():null; return !!(S.account && p && p.kind==='mestre'); }
document.addEventListener('keydown',e=>{
  if(!ehMestreAtivo()) return;   /* atalhos do editor só valem para um personagem Mestre logado */
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
    e.preventDefault();
    if(S.view!=='mestre') S.view='mestre';
    S.ui.busca=S.ui.busca?null:{q:''};
    render(); return;
  }
  if(e.key==='Escape'&&(S.ui.busca||S.ui.gloss)){ S.ui.busca=null; S.ui.gloss=null; render(); }
});
document.addEventListener('keydown',e=>{
  if(!ehMestreAtivo()) return;
  if(S.view!=='mestre'||S.tab!=='ficha'||S.ui.busca||S.ui.gloss) return;
  const alvo=e.target;
  /* não sequestrar teclas enquanto o mestre digita num campo */
  if(alvo&&(alvo.matches&&alvo.matches('input,textarea,select')||alvo.isContentEditable)) return;
  const sh=S.system.sheet, k=e.key, mod=e.ctrlKey||e.metaKey;
  if(mod && k.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey?redo():undo(); return; }
  if(mod && k.toLowerCase()==='y'){ e.preventDefault(); redo(); return; }
  if(mod && k.toLowerCase()==='a'){   /* selecionar tudo */
    e.preventDefault();
    if(!sh.blocks.length) return;
    S.ui.sel=sh.blocks[sh.blocks.length-1].id;
    S.ui.multi=sh.blocks.slice(0,-1).map(x=>x.id);
    render(); return;
  }
  const b=sh.blocks.find(x=>x.id===S.ui.sel);
  if(k==='Escape'){ if(S.ui.sel||(S.ui.multi||[]).length){S.ui.sel=null;S.ui.multi=[];render();} return; }
  if(k==='Tab'){ /* percorre os blocos */
    if(!sh.blocks.length) return; e.preventDefault();
    const i=sh.blocks.findIndex(x=>x.id===S.ui.sel);
    const nx=e.shiftKey?(i<=0?sh.blocks.length-1:i-1):((i+1)%sh.blocks.length);
    S.ui.sel=sh.blocks[nx].id; S.ui.multi=[]; render(); return;
  }
  if(!b) return;
  if(mod && k.toLowerCase()==='d'){ e.preventDefault(); duplicarBloco(b); render(); return; }
  if(k==='Delete'||k==='Backspace'){ e.preventDefault(); removerBloco(b); return; }
  const passo=e.shiftKey?Math.max(1,sh.grid||GRID):1;
  const mv={ArrowLeft:[-passo,0],ArrowRight:[passo,0],ArrowUp:[0,-passo],ArrowDown:[0,passo]}[k];
  if(mv){
    e.preventDefault();
    const grupo=selecionados(sh).filter(x=>!(x.opts&&x.opts.locked));
    if(!grupo.length) return;
    pushUndo('mover:'+grupo.map(x=>x.id).join(','));
    grupo.forEach(x=>{
      x.x=Math.max(0,Math.min(x.x+mv[0], CANVAS_W-x.w));
      x.y=Math.max(0,x.y+mv[1]);
      if(x.y+x.h>sh.canvasH) sh.canvasH=x.y+x.h+20;
    });
    render();
  }
});
function showToast(msg){ S.toast=msg; render(); setTimeout(()=>{S.toast=null;render();},1700); }

