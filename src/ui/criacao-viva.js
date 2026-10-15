/* ============================================================ CRIAÇÃO DO PERSONAGEM — PAINEL AO VIVO E ATALHOS ============================================================
   Enquanto o jogador monta a ficha (identidade → atributos → perícias → técnicas → escolhas), um cartão fixo ao lado mostra o
   personagem tomando forma: ícone e cor da classe/origem, atributos finais, barras de recurso, defesa, movimento e resistências.
   Mudou uma classe? A Vida muda na hora. Também tem atalhos para distribuir os pontos de atributo (sortear, equilibrar, zerar).
   Depende de: computeSheet, gatherEffects (player.js / example-system.js), capInfo/resistResumo (arquetipos.js). */

function painelVivo(sys,d){
  let ctx; try{ ctx=computeSheet(sys,d); }catch(e){ return h('aside',{class:'cria-vivo'},h('div',{class:'hint'},'Prévia indisponível.')); }
  const cls=sys.classes.find(c=>c.id===d.classId), org=sys.origins.find(o=>o.id===d.originId);
  const e=ctx.eff, cor=(cls&&cls.color)||(org&&org.color)||'var(--indigo)';
  const atrs=sys.attributes.map(a=>{ const t=ctx.totals[a.id]||{}; const up=t.bonus>0;
    return h('div',{class:'cv-atr'+(up?' up':''),title:a.name+(up?(' (+'+t.bonus+' de habilidades)'):'')},h('small',{},attrAbbr(a)),h('b',{},String(sys.attrMode==='modificador'?t.raw:t.eff))); });
  const barras=ctx.allRes.filter(r=>(r.type||'barra')!=='valor');
  const valores=ctx.allRes.filter(r=>(r.type||'barra')==='valor');
  const caps=Object.keys(e.caps||{}), res=Object.keys(e.resist||{});
  const chips=[
    ...valores.map(r=>h('span',{class:'pv-chip',style:{borderColor:r.color}},r.name+' ',h('b',{},Number.isNaN(r.max)?'?':String(r.max)))),
    ...caps.map(k=>h('span',{class:'pv-chip'},capInfo(k).ic+' '+k+(e.caps[k]?' '+e.caps[k]+(capInfo(k).un||''):''))),
    ...res.map(k=>{ const r=resistResumo(k,e.resist[k]); return h('span',{class:'pv-chip '+r.cls},r.ic+' '+r.t); }),
  ];
  return h('aside',{class:'cria-vivo','aria-label':'Seu personagem ao vivo',style:{'--arq':cor}},
    h('div',{class:'cv-id'},h('span',{class:'cv-ic','data-noicon':''},(cls&&cls.icon)||(org&&org.icon)||'🧍'),
      h('div',{},h('b',{},d.name.trim()||'Sem nome ainda'),
        h('small',{},[cls?cls.name:'sem classe',org?org.name:'sem origem',levelLabel(sys,d.level)].join(' · ')))),
    h('div',{class:'cv-t'},'Atributos'),h('div',{class:'cv-atrs'},...atrs),
    barras.length?h('div',{class:'cv-t'},'Recursos'):null,
    ...barras.map(r=>h('div',{class:'cv-rec'},h('div',{class:'row between'},h('span',{},(r.granted?(r.icon||'✨')+' ':'')+r.name),h('b',{},Number.isNaN(r.max)?'?':String(r.max))),
      h('div',{class:'bar-t'},h('div',{class:'bar-f',style:{width:'100%',background:r.color}})))),
    chips.length?h('div',{class:'cv-chips'},...chips):null,
    h('div',{class:'hint'},d.skills.length+' perícia(s) · '+(d.classTechs||[]).length+' técnica(s) de classe'),
    (e.erros||[]).length?h('div',{class:'fv-erro',style:{fontSize:'12px'}},'⚠ '+e.erros.join(' · ')):null);
}

/* distribui os pontos de atributo: 'zerar' | 'equilibrar' | 'sortear' */
function distribuirAtributos(sys,d,pontos,modo){
  const ids=sys.attributes.map(a=>a.id); if(!ids.length) return;
  ids.forEach(id=>{ d.attrs[id]=sys.startAttrValue; });
  if(modo==='zerar') return;
  let p=Math.max(0,pontos), guard=0;
  const aptos=()=>ids.filter(id=>d.attrs[id]<sys.attrMax);
  while(p>0&&guard<2000){ guard++;
    const lista=aptos(); if(!lista.length) break;
    if(modo==='sortear'){ const id=lista[Math.floor(Math.random()*lista.length)]; d.attrs[id]++; p--; }
    else{ for(const id of lista){ if(p<=0) break; d.attrs[id]++; p--; } }
  }
}
function ferramentasAtributos(sys,d,pontos){
  const go=m=>()=>{ distribuirAtributos(sys,d,pontos,m); render(); };
  return h('div',{class:'cria-ferr'},
    h('button',{type:'button',class:'btn sm',title:'Distribui todos os pontos ao acaso',onclick:go('sortear')},'🎲 Sortear'),
    h('button',{type:'button',class:'btn sm',title:'Reparte os pontos por igual entre os atributos',onclick:go('equilibrar')},'⚖ Equilibrar'),
    h('button',{type:'button',class:'btn sm ghost',title:'Volta tudo ao valor inicial',onclick:go('zerar')},'↺ Zerar'));
}
