/* ============================================================ DIÁLOGOS PRÓPRIOS ============================================================
   Substitui alert()/confirm()/prompt() por componentes acessíveis:
   role=dialog + aria-modal, foco preso (Tab/Shift+Tab), Esc cancela, Enter confirma,
   devolve o foco a quem abriu. Vivem em document.body (fora de #root), então
   render() NÃO os destrói no meio de uma pergunta.

   API ESTÁVEL (outros módulos checam typeof antes de usar):
     uiConfirm(msg, opts)         -> Promise<boolean>
         opts: {titulo, okText, cancelText, perigo:true}
     uiPrompt(msg, valorPadrao, opts) -> Promise<string|null>
         opts: {titulo, okText, multiline, placeholder}
     uiAlert(msg, opts)           -> Promise<void>      opts: {titulo, okText}
     uiChoice(msg, botoes, opts)  -> Promise<valor|null>
         botoes: [{rot, valor, tipo:'primary'|'danger'|'ghost'}] ; Esc/cancelar = null
     uiToastUndo(msg, onUndo, ms) -> void  (toast com botão "Desfazer")
   Todas as funções funcionam também sem Promise-await (fire and forget). */

let _uiDlgSeq=0;
function _uiDialog(cfg){
  return new Promise(resolve=>{
    const antes=document.activeElement;
    const idT='dlg-t-'+(++_uiDlgSeq), idD='dlg-d-'+_uiDlgSeq;
    let feito=false;
    const fim=v=>{
      if(feito) return; feito=true;
      document.removeEventListener('keydown',onKey,true);
      bg.remove();
      if(antes && antes.isConnected && typeof antes.focus==='function'){ try{ antes.focus(); }catch(e){} }
      resolve(v);
    };
    const corpo=h('div',{class:'dlg-corpo', id:idD});
    String(cfg.msg==null?'':cfg.msg).split('\n').forEach(l=>{ corpo.appendChild(h('p',{},l||' ')); });
    let campo=null, erro=null;
    if(cfg.input){
      campo=h(cfg.multiline?'textarea':'input',{class:'in dlg-campo', rows:cfg.multiline?7:null,
        placeholder:cfg.placeholder||'', 'aria-labelledby':idT, 'aria-describedby':idD});
      campo.value=cfg.valor==null?'':String(cfg.valor);
      erro=h('div',{class:'dlg-erro', role:'alert'});
      corpo.appendChild(campo); corpo.appendChild(erro);
    }
    const botoes=cfg.botoes.map(b=>h('button',{type:'button', class:'btn '+(b.tipo||'ghost'),
      onclick:()=>{
        if(cfg.input && b.valor===true){
          const v=campo.value;
          if(cfg.validar){ const m=cfg.validar(v); if(m){ erro.textContent=m; campo.setAttribute('aria-invalid','true'); campo.focus(); return; } }
          fim(v);
        } else fim(cfg.input ? null : b.valor);
      }}, b.rot));
    const caixa=h('div',{class:'dlg-cx'+(cfg.perigo?' perigo':''), role:cfg.alerta?'alertdialog':'dialog',
      'aria-modal':'true','aria-labelledby':idT,'aria-describedby':idD, tabindex:'-1'},
      h('h3',{class:'dlg-t', id:idT}, cfg.titulo||'Nexus RPG'),
      corpo,
      h('div',{class:'dlg-bt'}, botoes));
    const bg=h('div',{class:'dlg-bg', onmousedown:e=>{ if(e.target===bg && !cfg.semFundo) fim(cfg.input?null:(cfg.cancelaValor===undefined?null:cfg.cancelaValor)); }}, caixa);
    function onKey(e){
      if(!document.body.contains(bg)) return;
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); fim(cfg.input?null:(cfg.cancelaValor===undefined?null:cfg.cancelaValor)); return; }
      if(e.key==='Enter'){
        const t=e.target;
        if(t && t.tagName==='BUTTON') return;               /* Enter em botão = aciona o botão */
        if(t && t.tagName==='TEXTAREA' && !e.ctrlKey && !e.metaKey) return;
        e.preventDefault(); e.stopPropagation();
        const ok=botoes.find((b,i)=>cfg.botoes[i].padrao);
        if(ok) ok.click();
        return;
      }
      if(e.key==='Tab'){
        const foc=[...caixa.querySelectorAll('button,input,textarea,select,[href],[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled);
        if(!foc.length){ e.preventDefault(); return; }
        const i=foc.indexOf(document.activeElement);
        if(e.shiftKey && (i<=0)){ e.preventDefault(); foc[foc.length-1].focus(); }
        else if(!e.shiftKey && (i===foc.length-1 || i<0)){ e.preventDefault(); foc[0].focus(); }
      }
    }
    document.addEventListener('keydown',onKey,true);
    document.body.appendChild(bg);
    const pad=botoes.find((b,i)=>cfg.botoes[i].padrao);
    setTimeout(()=>{ try{ (campo||pad||botoes[0]||caixa).focus(); if(campo&&campo.select) campo.select(); }catch(e){} },0);
  });
}
function uiChoice(msg, botoes, opts){
  opts=opts||{};
  return _uiDialog({msg, titulo:opts.titulo, perigo:opts.perigo, botoes:botoes.map((b,i)=>({rot:b.rot,valor:b.valor,tipo:b.tipo,padrao:b.padrao||(i===0&&!botoes.some(x=>x.padrao))}))});
}
function uiConfirm(msg, opts){
  opts=opts||{};
  return _uiDialog({msg, titulo:opts.titulo||'Confirmar', perigo:opts.perigo, cancelaValor:false,
    /* ação destrutiva: o padrão (foco e Enter) é CANCELAR — confirmar exige escolha deliberada */
    botoes:[{rot:opts.cancelText||'Cancelar', valor:false, tipo:'ghost', padrao:!!opts.perigo},
            {rot:opts.okText||'Confirmar', valor:true, tipo:opts.perigo?'danger':'primary', padrao:!opts.perigo}]})
    .then(v=>v===true);
}
function uiPrompt(msg, valorPadrao, opts){
  opts=opts||{};
  return _uiDialog({msg, titulo:opts.titulo||'Informe', input:true, valor:valorPadrao, multiline:opts.multiline, placeholder:opts.placeholder, validar:opts.validar,
    botoes:[{rot:'Cancelar', valor:false, tipo:'ghost'},{rot:opts.okText||'OK', valor:true, tipo:'primary', padrao:true}]});
}
function uiAlert(msg, opts){
  opts=opts||{};
  return _uiDialog({msg, titulo:opts.titulo||'Aviso', alerta:true, cancelaValor:true,
    botoes:[{rot:opts.okText||'Entendi', valor:true, tipo:'primary', padrao:true}]}).then(()=>{});
}

/* Toast com "Desfazer". Fica fora do #root: sobrevive aos render() e some sozinho. */
let _uiUndoTimer=null;
function uiToastUndo(msg, onUndo, ms){
  const velho=document.getElementById('ui-toast-undo'); if(velho) velho.remove();
  clearTimeout(_uiUndoTimer);
  const fecha=()=>{ const t=document.getElementById('ui-toast-undo'); if(t) t.remove(); };
  const t=h('div',{id:'ui-toast-undo', class:'toast-undo', role:'status', 'aria-live':'polite'},
    h('span',{}, msg),
    h('button',{type:'button', class:'btn sm', onclick:()=>{ fecha(); clearTimeout(_uiUndoTimer); try{ onUndo&&onUndo(); }catch(e){ console.error(e); } }},'↩ Desfazer'),
    h('button',{type:'button', class:'toast-x', 'aria-label':'Fechar aviso', onclick:fecha},'✕'));
  document.body.appendChild(t);
  _uiUndoTimer=setTimeout(fecha, ms||7000);
}
