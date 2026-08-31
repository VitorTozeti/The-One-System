/* ============================================================ CAMPANHA — ITENS & NOTAS ============================================================
   Loot da campanha (reaproveita o catálogo sys.items) e as anotações/diário.
   Também expõe salvar o sistema atual como template da conta. */

function itensCampanhaView(){
  const c=S.campaign, sys=S.system, cat=sys.items||[];
  const nomeCat=id=>{ const it=cat.find(x=>x.id===id); return it?it.name:'(item removido)'; };
  const jogadorNome=id=>{ const p=c.players.find(x=>x.id===id); return p?p.name:'—'; };

  const linhas=c.loot.map(l=>{
    const ownerSel=h('select',{class:'in', style:{width:'140px'}, onchange:e=>{l.ownerPlayerId=e.target.value||null;render();}},
      h('option',{value:''},'— sem dono —'),
      c.players.map(p=>{const o=h('option',{value:p.id},p.name);if(l.ownerPlayerId===p.id)o.selected=true;return o;}));
    return h('div',{class:'loot-row'},
      h('div',{class:'loot-name'}, l.itemId?('🎒 '+nomeCat(l.itemId)):('✳️ '+(l.nome||'Item'))),
      field('Qtd', h('input',{class:'in', type:'number', style:{width:'64px'}, value:l.qty, onchange:e=>{l.qty=Math.max(1,parseInt(e.target.value)||1);render();}})),
      field('Dono', ownerSel),
      h('input',{class:'in', style:{flex:'1',minWidth:'120px'}, placeholder:'nota', value:l.note||'', onchange:e=>{l.note=e.target.value;render();}}),
      h('button',{class:'btn mini ghost', onclick:()=>{c.loot=c.loot.filter(x=>x.id!==l.id);render();}},'✕'));
  });

  const catSel=h('select',{id:'loot-cat', class:'in', style:{minWidth:'160px'}},
    h('option',{value:''},'— do catálogo —'), cat.map(it=>h('option',{value:it.id},it.name)));
  const add=h('div',{class:'pj-new'},
    h('div',{class:'pj-new-title'},'Adicionar item'),
    h('div',{class:'row wrapf'},
      catSel,
      h('button',{class:'btn', onclick:()=>{ const id=catSel.value; if(!id)return alert('Escolha um item do catálogo.');
        c.loot.push({id:uid(), itemId:id, nome:'', qty:1, ownerPlayerId:null, note:''}); render(); }},'+ do catálogo'),
      h('input',{id:'loot-custom', class:'in', placeholder:'item avulso…', style:{minWidth:'140px'}}),
      h('button',{class:'btn ghost', onclick:()=>{ const nome=(document.getElementById('loot-custom')||{}).value||'';
        if(!nome.trim())return alert('Digite o nome do item avulso.');
        c.loot.push({id:uid(), itemId:null, nome:nome.trim(), qty:1, ownerPlayerId:null, note:''}); render(); }},'+ avulso')));

  return h('div',{},
    card('Itens da campanha','Tesouros e recompensas. Puxe do catálogo do sistema ou crie avulsos e atribua a um jogador.',null),
    c.loot.length?h('div',{class:'loot-list'}, linhas):h('div',{class:'pj-empty'},'Nenhum item ainda.'),
    add);
}

function notasView(){
  const c=S.campaign;
  const diario=card('Anotações do Mestre','Rascunho livre: segredos, ganchos, lembretes.',null,
    h('textarea',{class:'in', rows:'10', style:{width:'100%'}, placeholder:'Escreva aqui…',
      onchange:e=>{c.notes=e.target.value;render();}}, c.notes||''));

  const templates=listTemplates();
  const tpl=card('Sistema & Templates','Salve este sistema como template para reusar em outra campanha.',
    h('button',{class:'btn primary sm', onclick:()=>{ const nome=prompt('Nome do template:', S.system.name||'Meu sistema');
      if(nome){ saveSystemAsTemplate(S.system, nome); showToast('Template salvo ✔'); render(); } }},'💾 Salvar como template'),
    templates.length
      ? h('div',{}, templates.map(t=>h('div',{class:'loot-row'},
          h('div',{class:'loot-name'}, '🧩 '+t.nome),
          h('span',{class:'hint'}, new Date(t.createdAt).toLocaleDateString()),
          h('button',{class:'btn mini ghost', title:'Excluir template', onclick:()=>{if(confirm('Excluir o template '+t.nome+'?')){deleteTemplate(t.id);render();}}},'✕'))))
      : h('div',{class:'hint'},'Nenhum template salvo. Ao criar um novo personagem Mestre você poderá partir de um template.'));

  return h('div',{}, diario, tpl);
}
