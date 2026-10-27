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
    ? h('div',{class:'pj-grid'}, c.players.map(p=>h('div',{class:'pj-card jogador', id:'px-'+p.id},
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
      h('button',{class:'btn ghost', onclick:()=>importarFichaNova()},'⬆ Importar ficha direto'),
      /* testar o PRÓPRIO sistema ponta a ponta: leva o personagem criado em "Testar como jogador" para a mesa/combate */
      h('button',{class:'btn emerald', title:'Usa a ficha que você montou em “Testar como jogador” como se fosse um jogador da mesa (para testar combate, mapa e Tela dos jogadores).',
        onclick:()=>adicionarPersonagemDeTeste()},'🧪 Adicionar meu personagem de teste')));

  return h('div',{},
    card('Jogadores da campanha','O jogador cria a ficha na conta dele, exporta e você importa aqui (offline).',null),
    lista, addBox);
}

function adicionarPersonagemDeTeste(){
  const c=S.campaign, d=S.draft;
  if(!d){   /* sem ficha de teste ainda: leva direto para montar uma, em vez de só reclamar */
    S.draft=initDraft(S.system); S.view='jogador'; S.step=0; render(); window.scrollTo(0,0);
    return showToast('Monte o personagem de teste e depois volte em Jogadores → 🧪 para pô-lo na mesa.',6000);
  }
  const nome=(d.name||'').trim()||'Personagem de teste';
  const copia=JSON.parse(JSON.stringify(d));
  const ja=c.players.find(p=>p.teste);
  if(ja){ ja.sheet=copia; ja.name=nome; ja.importedAt=Date.now(); showToast('🧪 Personagem de teste atualizado'); }
  else { c.players.push({id:uid(), name:nome, note:'personagem de teste', teste:true, sheet:copia, importedAt:Date.now()}); showToast('🧪 '+nome+' entrou na mesa'); }
  render();
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
