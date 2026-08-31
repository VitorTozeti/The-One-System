/* ============================================================ CAMPANHA — JOGADORES ============================================================
   Roster local de jogadores. O "convite" é offline: o Jogador exporta a ficha
   (JSON) e o Mestre importa aqui. Reaproveita canvasNode (render read-only) e
   sanitizeDraft (compatibiliza a ficha com o sistema desta campanha). */

function jogadoresView(){
  const c=S.campaign;

  /* Overlay: ver a ficha de um jogador (read-only) */
  if(S.ui.verFicha){
    const p=c.players.find(x=>x.id===S.ui.verFicha);
    if(p&&p.sheet){
      const d=sanitizeDraft(JSON.parse(JSON.stringify(p.sheet)), S.system);
      return h('div',{},
        h('div',{class:'row', style:{marginBottom:'10px'}},
          h('button',{class:'btn ghost', onclick:()=>{S.ui.verFicha=null;render();}},'← Voltar aos jogadores'),
          h('h3',{style:{margin:'0'}}, '🧍 '+p.name)),
        h('div',{class:'ficha-view'}, canvasNode(S.system, d, 'view')));
    }
    S.ui.verFicha=null;
  }

  const lista=c.players.length
    ? h('div',{class:'pj-grid'}, c.players.map(p=>h('div',{class:'pj-card jogador'},
        h('div',{class:'pj-badge'}, p.sheet?'🎲 ficha importada':'📝 sem ficha'),
        h('div',{class:'pj-name'}, p.name),
        p.note?h('div',{class:'hint', style:{marginBottom:'8px'}}, p.note):null,
        h('div',{class:'row wrapf'},
          p.sheet?h('button',{class:'btn primary sm', onclick:()=>{S.ui.verFicha=p.id;render();}},'👁 Ver ficha'):null,
          h('button',{class:'btn ghost sm', onclick:()=>importarFichaPara(p)}, p.sheet?'↻ Reimportar':'⬆ Importar ficha'),
          h('button',{class:'btn ghost sm', onclick:()=>{
            const nn=prompt('Nota rápida (HP, status, etc.):', p.note||''); if(nn!=null){p.note=nn;render();}}},'📝 Nota'),
          h('button',{class:'btn ghost sm', onclick:()=>{
            if(confirm('Remover '+p.name+' da mesa?')){ c.players=c.players.filter(x=>x.id!==p.id); render(); }}},'✕')))))
    : h('div',{class:'pj-empty'},'Nenhum jogador na mesa. Adicione uma vaga e importe a ficha que o jogador exportou.');

  const addBox=h('div',{class:'pj-new'},
    h('div',{class:'pj-new-title'},'Adicionar jogador'),
    h('div',{class:'row wrapf'},
      h('input',{id:'jog-nome', class:'in', placeholder:'nome do jogador', style:{flex:'1',minWidth:'160px'}}),
      h('button',{class:'btn primary', onclick:()=>{
        const nome=(document.getElementById('jog-nome')||{}).value||'';
        if(!nome.trim()) return alert('Informe o nome do jogador.');
        c.players.push({id:uid(), name:nome.trim(), note:'', sheet:null, importedAt:null}); render();
      }},'+ Adicionar'),
      h('button',{class:'btn ghost', onclick:()=>importarFichaNova()},'⬆ Importar ficha direto')));

  return h('div',{},
    card('Jogadores da campanha','O jogador cria a ficha na conta dele, exporta e você importa aqui (offline).',null),
    lista, addBox);
}

/* Lê um arquivo/JSON de ficha e devolve o objeto via callback. */
function lerFichaJSON(cb){
  const inp=h('input',{type:'file', accept:'.json,.ficha,.nexus', class:'hide',
    onchange:e=>{ const f=e.target.files[0]; if(!f)return; const rd=new FileReader();
      rd.onload=()=>{ try{ cb(JSON.parse(rd.result)); }catch{ alert('Arquivo de ficha inválido.'); } };
      rd.readAsText(f); }});
  document.body.appendChild(inp); inp.click(); setTimeout(()=>inp.remove(),1000);
}
function importarFichaPara(p){
  const via=confirm('OK = escolher arquivo .json  •  Cancelar = colar o código da ficha');
  const aplica=obj=>{ p.sheet=obj; p.importedAt=Date.now(); if(!p.name&&obj.name)p.name=obj.name; showToast('Ficha importada ✔'); };
  if(via) lerFichaJSON(aplica);
  else { const txt=prompt('Cole aqui o código (JSON) da ficha:'); if(txt){ try{ aplica(JSON.parse(txt)); }catch{ alert('Código inválido.'); } } }
}
function importarFichaNova(){
  const aplica=obj=>{ S.campaign.players.push({id:uid(), name:obj.name||'Jogador', note:'', sheet:obj, importedAt:Date.now()}); showToast('Jogador importado ✔'); };
  const via=confirm('OK = escolher arquivo .json  •  Cancelar = colar o código da ficha');
  if(via) lerFichaJSON(aplica);
  else { const txt=prompt('Cole aqui o código (JSON) da ficha:'); if(txt){ try{ aplica(JSON.parse(txt)); }catch{ alert('Código inválido.'); } } }
}
