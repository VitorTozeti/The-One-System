/* ============================================================ JOGADOR ============================================================ */
function jogadorView(){
  const sys=S.system, d=S.draft;
  sanitizeDraft(d,sys);
  /* Os passos são dinâmicos: "Escolhas" só existe se o sistema tiver pontos de
     escolha liberados no degrau do personagem. */
  const escolhasDisp=(sys.choices||[]).filter(c=>(c.level||1)<=d.level);
  const passos=[{k:'id',l:'Identidade'},{k:'attr',l:'Atributos'},{k:'skill',l:'Perícias'}];
  if(escolhasDisp.length) passos.push({k:'choice',l:'Escolhas'});
  passos.push({k:'sheet',l:'Ficha'});
  if(S.step>=passos.length) S.step=passos.length-1;
  if(S.step<0) S.step=0;
  const labels=passos.map(p=>p.l);
  const atual=passos[S.step].k;
  const ultimo=S.step===passos.length-1;
  const lp=levelPoints(sys,d.level);
  const eff=gatherEffects(sys,d);
  const effMin=sys.allowDump?sys.attrMin:sys.startAttrValue;
  const used=sys.attributes.reduce((s,a)=>s+((d.attrs[a.id]??0)-sys.startAttrValue),0);
  const left=lp.attrPoints-used;

  const dots=h('div',{class:'dots'});
  labels.forEach((l,i)=>{
    dots.appendChild(h('div',{class:'dot '+(i<S.step?'done':i===S.step?'cur':'')}, i<S.step?'✓':(i+1)));
    dots.appendChild(h('span',{class:'dotlbl '+(i===S.step?'cur':'')},l));
    if(i<labels.length-1) dots.appendChild(h('div',{class:'dotline'}));
  });

  let body, canNext=true;

  if(atual==='id'){
    canNext=!!(d.name.trim() && d.classId && d.originId);
    const levelSel=h('select',{class:'in',onchange:e=>{d.level=parseInt(e.target.value);d.attrs=Object.fromEntries(sys.attributes.map(a=>[a.id,sys.startAttrValue]));d.skills=[];render();}});
    for(let lv=sys.startLevel;lv<=sys.maxLevel;lv++){const o=h('option',{value:lv},levelLabel(sys,lv));if(lv===d.level)o.selected=true;levelSel.appendChild(o);}
    const featBtns=(listp,selKey,isRace)=>listp.map(c=>h('button',{class:'selectable '+(d[selKey]===c.id?'sel-i':''),style:{marginBottom:'8px'},onclick:()=>{d[selKey]=c.id;render();}},
      h('div',{class:'t'},c.name), h('div',{class:'d'},c.description),
      (c.abilities&&c.abilities.length)?h('div',{class:'fx'},'★ '+c.abilities.map(a=>a.name).join(' • ')):null,
      (isRace&&c.traits&&c.traits.length)?h('div',{class:'tr'},'✦ '+c.traits.map(t=>t.name).join(' • ')):null));
    /* P7 — sistema sem classe ou origem travava o jogador em silêncio */
    const faltando=[];
    if(!sys.classes.length) faltando.push('nenhuma classe');
    if(!sys.origins.length) faltando.push('nenhuma origem/raça');
    body=card('Quem é você?','Nome, nível, classe e origem/raça.',null,
      faltando.length?h('div',{class:'aviso'},'⚠ Este sistema tem '+faltando.join(' e ')+
        ' cadastrada(s). Peça ao mestre para criar na aba correspondente — sem isso não dá para avançar.'):null,
      field('Nome do personagem', h('input',{class:'in',value:d.name,placeholder:'Ex: Kára, a andarilha',oninput:e=>{d.name=e.target.value;persist();}})),
      h('div',{style:{marginTop:'10px'}}, field('Nível inicial deste personagem', levelSel)),
      h('div',{class:'hint',style:{margin:'14px 0 6px',color:'#c7d2fe'}},'Classe:'),
      ...featBtns(sys.classes,'classId',false),
      h('div',{class:'hint',style:{margin:'10px 0 6px',color:'#c7d2fe'}},'Origem / Raça:'),
      ...featBtns(sys.origins,'originId',true));
  }
  else if(atual==='attr'){
    canNext=left===0;
    const setAttr=(a,delta)=>{const cur=d.attrs[a.id]??sys.startAttrValue;const nx=cur+delta;
      if(nx<effMin||nx>sys.attrMax)return; if(delta>0&&left<=0)return; d.attrs[a.id]=nx; render();};
    body=card('Distribua seus atributos',
      'Faixa: '+effMin+' a '+sys.attrMax+'. '+(sys.allowDump?'Pode baixar abaixo de '+sys.startAttrValue+' para ganhar pontos.':'')+(sys.attrMode==='modificador'?' (mostrando o modificador)':''),
      h('div',{class:'badge '+(left===0?'ok':'warn')}, left+' pts'),
      ...sys.attributes.map(a=>{const val=d.attrs[a.id]??sys.startAttrValue;const bonus=eff.attrBonus[a.id]||0;const raw=val+bonus;
        return h('div',{class:'attrrow'},
          h('span',{style:{fontWeight:'600'}}, a.name,
            bonus?h('span',{style:{color:'#34d399',fontSize:'12px',marginLeft:'6px'}},'(+'+bonus+' hab.)'):null,
            sys.attrMode==='modificador'?h('span',{class:'attrmod'},'mod '+sign(effAttr(sys,raw))):null),
          h('div',{class:'row'},
            h('button',{class:'btn mini',onclick:()=>setAttr(a,-1)},'−'),
            h('span',{class:'attrval'},val),
            h('button',{class:'btn mini primary',onclick:()=>setAttr(a,1)},'+')));}),
      (()=>{ /* P2 — explicar quando a regra do mestre é impossível de cumprir */
        if(left===0) return null;
        const teto=sys.attributes.length*(sys.attrMax-sys.startAttrValue);
        if(lp.attrPoints>teto) return h('div',{class:'aviso'},
          '⚠ O mestre deu '+lp.attrPoints+' pontos, mas o máximo que cabe é '+teto+
          ' ('+sys.attributes.length+' atributos × '+(sys.attrMax-sys.startAttrValue)+'). Avise o mestre: a regra está impossível.');
        if(left<0) return h('div',{class:'aviso'},'⚠ Você gastou '+(-left)+' ponto(s) a mais.');
        return h('div',{class:'hint',style:{color:'#fbbf24',marginTop:'8px'}},'Distribua todos os pontos para continuar.');
      })());
  }
  else if(atual==='skill'){
    const choosable=sys.skills.filter(s=>!s.auto);
    canNext=d.skills.length===lp.skillCount;
    const toggle=id=>{const has=d.skills.includes(id); if(!has&&d.skills.length>=lp.skillCount)return;
      d.skills=has?d.skills.filter(x=>x!==id):[...d.skills,id];
      /* ao escolher, já entra no primeiro grau que dá valor (peça 2) */
      if(!has && sys.profMode!=='nenhum'){
        const t=(sys.profTiers||[]).find(x=>(sys.profMode==='mult'?x.mult:x.bonus)>0);
        if(t) d.skillTier[id]=t.id;
      }
      render();};
    const autoNames=sys.skills.filter(s=>s.auto).map(s=>s.name);
    const grantedNames=eff.grantedSkills.map(id=>(sys.skills.find(s=>s.id===id)||{}).name).filter(Boolean);
    /* P2 — explicar o bloqueio em vez de só desabilitar o botão */
    const impossivel = lp.skillCount>choosable.length
      ? 'O mestre pediu '+lp.skillCount+' perícias, mas só existem '+choosable.length+' escolhíveis. Avise o mestre: a regra está impossível.'
      : null;
    /* peça 2: seletor de grau para cada perícia que o personagem tem */
    const tierBox=(sys.profMode==='nenhum'||!(sys.profTiers||[]).length)?null:h('div',{style:{marginTop:'14px'}},
      h('div',{class:'hint',style:{marginBottom:'6px',color:'#c7d2fe'}},'Grau de treino:'),
      ...skillRows(sys,d,computeSheet(sys,d)).map(r=>{
        const sel=h('select',{class:'in',style:{maxWidth:'160px'},onchange:e=>{d.skillTier[r.s.id]=e.target.value;render();}});
        sel.appendChild(h('option',{value:''},'— destreinado —'));
        (sys.profTiers||[]).forEach(t=>{const o=h('option',{value:t.id},t.name);if(t.id===(d.skillTier||{})[r.s.id])o.selected=true;sel.appendChild(o);});
        return h('div',{class:'row between',style:{marginBottom:'6px'}},
          h('span',{style:{fontWeight:'600',fontSize:'13px'}},r.s.name),
          h('div',{class:'row'}, sel, h('span',{class:'attrval'},sign(r.value))));
      }));
    body=card('Escolha suas perícias','Escolha exatamente '+lp.skillCount+'.',
      h('div',{class:'badge '+(canNext?'ok':'warn')}, d.skills.length+'/'+lp.skillCount),
      impossivel?h('div',{class:'aviso'},'⚠ '+impossivel):null,
      h('div',{class:'skillgrid'}, ...choosable.map(s=>{const on=d.skills.includes(s.id);const granted=eff.grantedSkills.includes(s.id);
        return h('button',{class:'selectable '+(on?'sel-e':''),onclick:()=>toggle(s.id),title:s.description||''},
          (on?'✓ ':'')+s.name+(granted?'  (concedida)':''));})),
      autoNames.length?h('div',{class:'hint',style:{marginTop:'10px'}},'Automáticas (todos têm): '+autoNames.join(', ')):null,
      grantedNames.length?h('div',{class:'hint',style:{marginTop:'4px'}},'Concedidas por classe/raça: '+grantedNames.join(', ')):null,
      tierBox);
  }
  /* PEÇA 1 — passo de pontos de escolha */
  else if(atual==='choice'){
    const pend=[];
    const blocos=escolhasDisp.map(ch=>{
      const sel=(d.choices[ch.id]||[]);
      const falta=ch.count-sel.length;
      if(falta>0) pend.push(ch.name+' ('+falta+')');
      const marcar=op=>{
        const tem=sel.includes(op.id);
        let nova;
        if(tem) nova=sel.filter(x=>x!==op.id);
        else{
          if(sel.length>=ch.count) return;
          if(!ch.repetivel && sel.includes(op.id)) return;
          nova=[...sel,op.id];
        }
        d.choices[ch.id]=nova; render();
      };
      /* uma opção fica travada se o requisito dela não for cumprido */
      const travada=op=>{
        const r=op.req||{}; const out=[];
        if(r.level&&d.level<r.level) out.push((sys.levelName||'Nível')+' '+r.level);
        (r.attrs||[]).forEach(rq=>{ const tot=(d.attrs[rq.attrId]||0)+(eff.attrBonus[rq.attrId]||0);
          if(tot<rq.min){const a=sys.attributes.find(x=>x.id===rq.attrId);out.push((a?a.name:'?')+' '+rq.min+'+');} });
        (r.choices||[]).forEach(oid=>{
          const escolhida=Object.values(d.choices||{}).some(arr=>(arr||[]).includes(oid));
          if(!escolhida){ let nome='outra opção';
            (sys.choices||[]).forEach(c=>(c.options||[]).forEach(o=>{if(o.id===oid)nome=o.name;}));
            out.push('Requer: '+nome); } });
        return out;
      };
      return card(ch.name, ch.hint||('Escolha '+ch.count+'.'),
        h('div',{class:'badge '+(falta<=0?'ok':'warn')}, sel.length+'/'+ch.count),
        ...(ch.options||[]).map(op=>{
          const on=sel.includes(op.id);
          const rs=travada(op);
          const fx=(op.effects||[]).map(ef=>effectLabel(sys,ef));
          return h('button',{class:'selectable '+(on?'sel-i':'')+(rs.length?' opt-locked':''),
            style:{marginBottom:'8px'}, disabled:!!rs.length && !on,
            onclick:()=>{ if(rs.length&&!on) return showToast('Travada: '+rs.join(', ')); marcar(op); }},
            h('div',{class:'t'},(on?'✓ ':'')+(rs.length?'🔒 ':'')+op.name),
            op.description?h('div',{class:'d'},op.description):null,
            fx.length?h('div',{class:'fx'},fx.join('  •  ')):null,
            rs.length?h('div',{class:'tr',style:{color:'#fbbf24'}},'Requer: '+rs.join(', ')):null);
        }),
        (ch.options||[]).length?null:h('div',{class:'hint'},'O mestre não cadastrou nenhuma opção para esta escolha.'));
    });
    canNext=pend.length===0;
    body=h('div',{}, ...blocos,
      pend.length?h('div',{class:'hint',style:{color:'#fbbf24',marginTop:'8px'}},'Falta escolher: '+pend.join(', ')):null);
  }
  else body=finalSheet(sys,d);

  const nav=h('div',{class:'row between',style:{marginTop:'4px'}},
    h('button',{class:'btn ghost',disabled:S.step===0,onclick:()=>{if(S.step>0){S.step--;render();}}},'← Voltar'),
    !ultimo ? h('button',{class:'btn primary',disabled:!canNext,onclick:()=>{if(canNext){S.step++;render();}}},'Avançar →') : h('span'));

  const themeChips=(sys.themes||[]).map(t=>h('span',{class:'pill'},t));
  return h('div',{class:'wrap-sm'},
    h('div',{class:'row',style:{justifyContent:'flex-end',marginBottom:'12px'}},
      h('button',{class:'btn ghost',onclick:()=>{S.draft=initDraft(sys);S.step=0;render();}},'↻ Recomeçar ficha')),
    h('div',{class:'note',html:'🎲 Campanha <b>“'+esc(sys.campaignName||'')+'”</b> — sistema <b>“'+esc(sys.name)+'”</b>. O app te guia e impede erros.'}),
    themeChips.length?h('div',{class:'row wrapf',style:{marginBottom:'14px'}},...themeChips):null,
    dots, body, nav,
    S.saved.length?h('div',{style:{textAlign:'center',fontSize:'11px',color:'#64748b',marginTop:'14px'}},S.saved.length+' ficha(s) salva(s) neste dispositivo.'):null);
}

/* ---------- Cálculo + montagem da ficha (dirigida pelo layout do mestre) ---------- */
function computeSheet(sys,d){
  const eff=gatherEffects(sys,d);
  const varsTotal={'Nível':d.level,'Nivel':d.level};
  /* o eixo também responde pelo nome que o mestre deu (NEX, Grau…) */
  if(sys.levelName && !varsTotal[sys.levelName]) varsTotal[sys.levelName]=d.level;
  const totals={}, effById={};
  sys.attributes.forEach(a=>{const base=d.attrs[a.id]??0;const bonus=eff.attrBonus[a.id]||0;const raw=base+bonus;
    const ev=effAttr(sys,raw); totals[a.id]={base,bonus,raw,eff:ev}; effById[a.id]=ev; varsTotal[a.name]=ev;});
  /* colunas da tabela de progressão (globais + da classe) viram variáveis */
  Object.assign(varsTotal, progVars(sys,d));
  /* características numéricas (Deslocamento, Resist. a fogo…) também viram variáveis,
     sem sobrescrever nada que já exista (atributo/coluna com mesmo nome vence) */
  for(const k in eff.charNum){ if(!(k in varsTotal)) varsTotal[k]=eff.charNum[k]; }
  /* PEÇA 2 — valor de proficiência do degrau atual, disponível como variável */
  let profVal=0;
  if(sys.profMode!=='nenhum' && (sys.profFormula||'').trim()){
    const p=evalFormula(sys.profFormula,varsTotal); if(!Number.isNaN(p)) profVal=p;
  }
  if(!('Proficiência' in varsTotal)) varsTotal['Proficiência']=profVal;
  if(!('Proficiencia' in varsTotal)) varsTotal['Proficiencia']=profVal;

  /* PEÇA 6 — armadura que DEFINE a fórmula do recurso, em vez de só somar.
     Vence a de maior valor entre as equipadas; os bônus continuam somando por cima. */
  const armaduras={};
  eff.equipped.forEach(({it})=>{
    const ar=it.armor||{}; if(!ar.on||!ar.resId||!(ar.formula||'').trim()) return;
    const vA={...varsTotal};
    if(ar.maxAttrId){ const a=sys.attributes.find(x=>x.id===ar.maxAttrId);
      if(a) vA[a.name]=Math.min(vA[a.name]||0, ar.maxAttrVal||0); }   /* teto de destreza */
    const v=evalFormula(ar.formula,vA);
    if(Number.isNaN(v)) return;
    if(!armaduras[ar.resId] || v>armaduras[ar.resId].v) armaduras[ar.resId]={v,it};
  });

  const allRes=sys.resources.map(r=>{
    const arm=armaduras[r.id];
    let v = arm ? arm.v : evalFormula(r.formula,varsTotal);
    if(!Number.isNaN(v))v+=(eff.resBonus[r.id]||0);
    let cur=d.resCurrent[r.id];
    /* o valor atual nunca passa do máximo (P3): se o mestre baixar a fórmula,
       a ficha acompanha em vez de exibir "999 / 25" */
    if(cur!=null && !Number.isNaN(v)) cur=Math.max(0,Math.min(cur,v));
    let pr=null;
    if(r.perRound&&r.perRound.trim()){ const x=evalFormula(r.perRound,varsTotal); if(!Number.isNaN(x)) pr=x; }
    return {...r,max:v,cur:cur==null?v:cur,perRoundVal:pr,armadura:arm?arm.it.name:null};});

  /* PEÇA 2 — valor final de cada perícia, já com o multiplicador de proficiência */
  const skillVal=(s)=>{
    const base=s.linkedAttrId?(effById[s.linkedAttrId]||0):0;
    if(sys.profMode==='nenhum') return base+(s.trainedBonus||0);
    const tier=(sys.profTiers||[]).find(t=>t.id===(d.skillTier||{})[s.id]);
    if(!tier) return base;
    return base + (sys.profMode==='mult' ? Math.floor(profVal*(tier.mult||0)) : (tier.bonus||0));
  };

  /* carga: soma do peso do inventário (× quantidade) vs. Carga Máxima */
  let peso=0; (d.inventory||[]).forEach(entry=>{const it=(sys.items||[]).find(x=>x.id===entry.itemId);
    if(it) peso+=(+it.weight||0)*Math.max(1,entry.qtd||1);});
  const cargaMax=(sys.cargaFormula&&sys.cargaFormula.trim())?evalFormula(sys.cargaFormula,varsTotal):null;
  const carga={peso,max:cargaMax};

  /* PEÇA 6 — ataques vindos das armas equipadas */
  const ataques=eff.equipped.filter(({it})=>it.attack&&it.attack.on).map(({it})=>{
    const at=it.attack;
    let bonus=0; const partes=[];
    if(at.attrId){ const a=sys.attributes.find(x=>x.id===at.attrId);
      if(a){ bonus+=(effById[a.id]||0); partes.push(a.name); } }
    if(at.skillId){ const s=(sys.skills||[]).find(x=>x.id===at.skillId);
      if(s){ bonus+=skillVal(s); partes.push(s.name); } }
    return {it, at, bonus, partes, tags:at.tags||[]};
  });

  /* PEÇA 6 — sintonização: teto global de itens sintonizados */
  const sintonizados=(d.inventory||[]).filter(e=>{const it=(sys.items||[]).find(x=>x.id===e.itemId);
    return it&&it.sintonia&&e.attuned;}).length;

  /* PEÇA 6 — ocupação de slots */
  const slotUso={};
  eff.equipped.forEach(({it})=>{ if(it.slotId) slotUso[it.slotId]=(slotUso[it.slotId]||0)+1; });

  return {eff,varsTotal,totals,effById,allRes,carga,profVal,skillVal,ataques,
          sintonizados,slotUso,armaduras};
}
/* ============ Conteúdo de cada bloco ============
   mode: 'edit' (editor do mestre) | 'preview' (exemplo) | 'play' (ficha do jogador)
   Só no modo 'play' o conteúdo é interativo. */
function recursosInner(sys,d,ctx,b,mode){
  const bars=ctx.allRes.filter(r=>(r.type||'barra')!=='valor');
  if(!bars.length) return h('div',{class:'hint'},'Nenhum recurso do tipo barra.');
  /* Os botões aparecem também no editor (inertes, via pointer-events:none):
     o mestre precisa dimensionar o bloco vendo o mesmo conteúdo do jogador. */
  const ctrl=b.opts.controls!==false;
  const setRes=(id,cur,max)=>{d.resCurrent[id]=Math.max(0,Math.min(max,cur));render();};
  const temDescanso=(tipo)=>bars.some(r=>(r.recharge||{}).trig===tipo);
  const barraDescanso=(b.opts.showRest!==false && (temDescanso('curto')||temDescanso('longo')))
    ? h('div',{class:'row wrapf',style:{marginBottom:'10px',paddingBottom:'8px',borderBottom:'1px dashed var(--line)'}},
        temDescanso('curto')?h('button',{class:'btn sm',title:'Recupera os recursos marcados como "descanso curto"',
          onclick:()=>aplicarDescanso('curto')},'☕ Descanso curto'):null,
        temDescanso('longo')?h('button',{class:'btn sm emerald',title:'Recupera os recursos marcados como "descanso longo"',
          onclick:()=>aplicarDescanso('longo')},'🌙 Descanso longo'):null)
    : null;
  return h('div',{}, barraDescanso, ...bars.map(r=>h('div',{style:{marginBottom:'12px'}},
    h('div',{class:'row between',style:{fontSize:'13px',marginBottom:'4px'}},
      h('span',{style:{fontWeight:'600'}},r.name,
        (ctx.eff.resBonus[r.id]?h('span',{style:{color:'#34d399',fontSize:'11px',marginLeft:'6px'}},'(+'+ctx.eff.resBonus[r.id]+' hab.)'):null),
        (r.perRoundVal!=null?h('span',{class:'hint',style:{marginLeft:'6px'}},'· máx '+r.perRoundVal+'/rodada'):null)),
      h('span',{class:'hint'}, r.cur+' / '+(Number.isNaN(r.max)?'—':r.max))),
    h('div',{class:'bar-t'}, h('div',{class:'bar-f',style:{width:((Number.isNaN(r.max)||r.max<=0)?0:Math.min(100,(r.cur/r.max)*100))+'%',background:r.color}})),
    ctrl?h('div',{class:'row',style:{marginTop:'6px'}},
      h('button',{class:'btn sm',onclick:()=>setRes(r.id,r.cur-1,r.max)},'−1'),
      h('button',{class:'btn sm',onclick:()=>setRes(r.id,r.cur+1,r.max)},'+1'),
      h('button',{class:'btn sm danger',onclick:()=>setRes(r.id,r.cur-5,r.max)},'Dano 5'),
      h('button',{class:'btn sm',onclick:()=>setRes(r.id,r.max,r.max)},'Cheio')):null)));
}
/* Inventário: carga + lista de itens do personagem, com equipar/remover e adicionar do catálogo.
   Os controles aparecem também no editor (inertes via pointer-events:none) para o
   mestre dimensionar o bloco vendo o mesmo conteúdo do jogador (Regra Aprendida #9). */
function inventarioInner(sys,d,ctx,b,mode){
  const cat=sys.items||[];
  if(!d.inventory) d.inventory=[];
  const inv=d.inventory;
  const carga=ctx.carga||{peso:0,max:null};
  const temMax=carga.max!=null && !Number.isNaN(carga.max);
  const over=temMax && carga.peso>carga.max;
  const cargaNode=h('div',{style:{marginBottom:'10px'}},
    h('div',{class:'row between',style:{fontSize:'13px',marginBottom:'4px'}},
      h('span',{style:{fontWeight:'600'}},'Carga',
        over?h('span',{style:{color:'#fb7185',marginLeft:'6px',fontSize:'11px'}},'⚠ sobrecarregado'):null),
      h('span',{class:'hint'}, (Math.round(carga.peso*10)/10)+(temMax?(' / '+carga.max):' (sem limite)'))),
    temMax?h('div',{class:'bar-t'}, h('div',{class:'bar-f',style:{width:Math.min(100,carga.max>0?(carga.peso/carga.max*100):0)+'%',background:over?'#fb7185':'#f59e0b'}})):null);
  if(!cat.length) return h('div',{}, cargaNode, h('div',{class:'hint'},'O mestre ainda não cadastrou itens (aba 🎒 Itens).'));

  /* peça 6: ocupação de slots e teto de sintonização */
  const slotBar=(sys.slots||[]).length?h('div',{class:'row wrapf',style:{marginBottom:'8px'}},
    ...(sys.slots||[]).map(s=>{const uso=(ctx.slotUso||{})[s.id]||0; const cheio=uso>s.max;
      return h('span',{class:'tg-fx',style:{borderColor:cheio?'#fb7185':null,color:cheio?'#fb7185':null}},
        s.name+' '+uso+'/'+s.max);})):null;
  const sintBar=(sys.sintoniaMax||0)>0?h('div',{class:'hint',style:{marginBottom:'8px',
    color:(ctx.sintonizados>sys.sintoniaMax)?'#fb7185':null}},
    '✦ Sintonizados: '+ctx.sintonizados+' / '+sys.sintoniaMax+
    ((ctx.sintonizados>sys.sintoniaMax)?'  ⚠ acima do limite':'')):null;

  const linhas=inv.map(entry=>{
    const it=cat.find(x=>x.id===entry.itemId); if(!it) return null;
    const fx=(it.effects||[]).map(ef=>effectLabel(sys,ef));
    const equ=it.equipavel&&entry.equipped;
    const semSintonia = it.sintonia && (sys.sintoniaMax||0)>0 && !entry.attuned;
    const slot=(sys.slots||[]).find(s=>s.id===it.slotId);
    return h('div',{class:'item',style:{marginBottom:'6px',opacity:(it.equipavel&&!entry.equipped)?'.72':'1'}},
      h('div',{class:'row between'},
        h('div',{}, h('span',{style:{fontWeight:'700'}},it.name),
          (entry.qtd>1)?h('span',{class:'tg-fx',style:{marginLeft:'6px'}},'×'+entry.qtd):null,
          h('span',{class:'hint',style:{marginLeft:'6px'}},
            itemCatLabel(it.categoria)+(it.weight?(' · '+(Math.round(it.weight*Math.max(1,entry.qtd||1)*10)/10)+' peso'):'')+
            (slot?(' · '+slot.name):''))),
        h('div',{class:'row'},
          it.empilhavel?h('div',{class:'row',style:{gap:'2px'}},
            h('button',{class:'btn mini',onclick:()=>{entry.qtd=Math.max(1,(entry.qtd||1)-1);render();}},'−'),
            h('span',{class:'attrval',style:{minWidth:'22px'}},entry.qtd||1),
            h('button',{class:'btn mini',onclick:()=>{entry.qtd=(entry.qtd||1)+1;render();}},'+')):null,
          (it.sintonia&&(sys.sintoniaMax||0)>0)?h('button',{class:'btn sm '+(entry.attuned?'emerald':'ghost'),
            title:'Sintonizar (teto global: '+sys.sintoniaMax+')',
            onclick:()=>{
              if(!entry.attuned && ctx.sintonizados>=sys.sintoniaMax) return showToast('Limite de sintonização atingido ('+sys.sintoniaMax+')');
              entry.attuned=!entry.attuned;render();}},entry.attuned?'✦ Sintonizado':'✦ Sintonizar'):null,
          it.equipavel?h('button',{class:'btn sm '+(equ?'emerald':'ghost'),
            onclick:()=>{entry.equipped=!entry.equipped;render();}}, equ?'✓ Equipado':'Equipar'):null,
          h('button',{class:'btn sm danger',onclick:()=>{const i=inv.indexOf(entry);if(i>=0)inv.splice(i,1);render();}},'✕'))),
      it.description?h('div',{class:'hint',style:{marginTop:'2px'}},it.description):null,
      (equ&&semSintonia)?h('div',{class:'hint',style:{color:'#fbbf24',marginTop:'2px'}},'⚠ Equipado, mas sem sintonia — os efeitos não se aplicam.'):null,
      fx.length?h('div',{class:'tags',style:{marginTop:'4px'}}, ...fx.map(t=>h('span',{class:'tg-fx'},(equ&&!semSintonia)||!it.equipavel?t:('· '+t)))):null);
  }).filter(Boolean);

  const addSel=h('select',{class:'in',style:{maxWidth:'240px'},onchange:e=>{const id=e.target.value;
    if(!id) return;
    const it=cat.find(x=>x.id===id);
    const ja=it&&it.empilhavel?inv.find(x=>x.itemId===id):null;
    if(ja) ja.qtd=(ja.qtd||1)+1; else inv.push({iid:uid(),itemId:id,equipped:false,qtd:1,attuned:false});
    render();}});
  addSel.appendChild(h('option',{value:''},'+ adicionar item…'));
  cat.forEach(it=>addSel.appendChild(h('option',{value:it.id},it.name)));

  return h('div',{}, cargaNode, slotBar, sintBar,
    linhas.length?h('div',{},...linhas):h('div',{class:'hint',style:{marginBottom:'6px'}},'Inventário vazio — adicione itens abaixo.'),
    h('div',{class:'row',style:{marginTop:'6px'}}, addSel));
}
/* caixas de atributo/valor, compartilhadas pelos blocos 'atributos' e 'valores' */
function statBoxes(sys,ctx,which){
  if(which==='valores'){
    return ctx.allRes.filter(r=>(r.type||'barra')==='valor').map(r=>({
      name:r.name, abbr:(r.name||'?').slice(0,3).toUpperCase(), main:Number.isNaN(r.max)?'—':r.max,
      sub:ctx.eff.resBonus[r.id]?('+'+ctx.eff.resBonus[r.id]+' hab.'):'', color:r.color}));
  }
  return sys.attributes.map(a=>{const t=ctx.totals[a.id];
    return {name:a.name, abbr:attrAbbr(a),
      main: sys.attrMode==='modificador'?t.raw:t.eff,
      sub: sys.attrMode==='modificador'?('mod '+sign(t.eff)):(t.bonus?('base '+t.base+' +'+t.bonus):''),
      color:null};});
}
/* Uma peça estilizada (hexágono/círculo/losango/escudo/octógono/caixa).
   Contorno: caixa e círculo usam border; as formas com clip-path usam a técnica
   de duas camadas (a de baixo é a cor da borda, a de cima é o preenchimento). */
/* Fração da largura aproveitável por forma: as afuniladas (losango, escudo)
   têm bem menos espaço útil que a caixa, senão o texto vaza pelas pontas.
   [largura útil, deslocamento vertical do texto] */
const SHAPE_FIT={ caixa:[.86,0], circulo:[.72,0], octogono:[.76,0], hexagono:[.70,0], escudo:[.66,-.07], losango:[.52,0] };
function shapeNode(o,item){
  const size=Math.max(30,o.shSize||96);
  const clip=SHAPE_CLIP[o.shape];
  const sw=Math.max(0,Math.min(12,o.strokeW==null?3:o.strokeW));
  const fontCls=o.font==='serif'?'f-serif':o.font==='display'?'f-display':o.font==='mono'?'f-mono':'';
  const numSz=Math.max(10,o.numSize||30);
  const fit=SHAPE_FIT[o.shape]||[.8,0];
  const txt=h('div',{class:'shape-txt '+fontCls,style:{color:o.txtColor||'#fff',
    width:(size*fit[0])+'px', maxHeight:(size*(o.shape==='losango'?.6:.8))+'px', overflow:'hidden',
    transform:fit[1]?('translateY('+(fit[1]*100)+'%)'):null}},
    o.nameOnTop&&o.showName?h('div',{class:'shape-nm',style:{fontSize:Math.max(7,numSz*0.28)+'px'}},item.name):null,
    h('div',{class:'shape-num',style:{fontSize:numSz+'px'}},item.main),
    (!o.nameOnTop&&o.showName)?h('div',{class:'shape-nm',style:{fontSize:Math.max(7,numSz*0.28)+'px'}},item.name):null,
    o.showAbbr&&item.abbr?h('div',{class:'shape-ab',style:{fontSize:Math.max(9,numSz*0.42)+'px'}},item.abbr):null,
    (o.showBonus&&item.sub)?h('div',{class:'shape-sub',style:{fontSize:Math.max(7,numSz*0.24)+'px'}},item.sub):null);

  const wrap=h('div',{class:'shape'});
  wrap.style.width=size+'px'; wrap.style.height=size+'px';
  if(clip){
    const outer=h('div',{style:{position:'absolute',inset:'0',clipPath:clip,background:sw>0?(o.stroke||'#c7d2fe'):(o.fill||'#0f1729')}});
    const inner=h('div',{style:{position:'absolute',inset:sw+'px',clipPath:clip,background:o.fill||'#0f1729'}});
    wrap.appendChild(outer); wrap.appendChild(inner);
  }else{
    const base=h('div',{style:{position:'absolute',inset:'0',background:o.fill||'#0f1729',
      border:sw>0?(sw+'px solid '+(o.stroke||'#c7d2fe')):'none',
      borderRadius:o.shape==='circulo'?'50%':'12px'}});
    wrap.appendChild(base);
  }
  wrap.appendChild(txt);
  return wrap;
}
/* Arranjo FLOR: peças distribuídas em roseta ao redor de um núcleo, como a
   referência de Ordem Paranormal (AGI no topo, e as demais girando em volta). */
function florInner(o,items){
  const n=items.length;
  const size=Math.max(30,o.shSize||96);
  if(!n) return h('div',{class:'hint'},'Nenhum atributo.');
  /* raio automático: encosta as peças sem sobrepor, seja qual for a quantidade.
     (lado de um polígono regular de n vértices = 2*r*sen(pi/n)) */
  const auto = n<2 ? 0 : Math.round((size+ (o.shGap==null?8:o.shGap)) / (2*Math.sin(Math.PI/n)));
  const r = Math.max(0, o.radius==null?auto:o.radius);
  const W = 2*r + size + 4;
  const box=h('div',{style:{position:'relative',width:W+'px',height:W+'px',margin:'0 auto'}});
  const a0 = (o.startAngle==null?-90:o.startAngle);
  if(o.hub!==false){
    /* Núcleo automático = o vão livre no meio da roseta (2 × distância do centro até
       a borda interna das peças). Maior que isso e as peças comem o texto. */
    const vao = Math.max(40, Math.round(2*(r - size*0.5)));
    const hs = o.hubSize==null ? vao : o.hubSize;
    const fontCls=o.font==='serif'?'f-serif':o.font==='display'?'f-display':o.font==='mono'?'f-mono':'';
    const texto=(o.hubText||'');
    /* A fonte encolhe conforme o texto cresce. Nada de overflow:hidden aqui — isso
       CORTAVA a palavra ("ATRIBUTO" sem o S). Melhor letra menor que letra faltando. */
    const fs=Math.max(7, Math.min(hs*0.15, hs*1.0/Math.max(1,texto.length)));
    box.appendChild(h('div',{class:'hub '+fontCls,style:{width:hs+'px',height:hs+'px',
      left:(W/2-hs/2)+'px', top:(W/2-hs/2)+'px', background:o.hubFill||'#0b1020', color:o.hubTxt||'#fff',
      fontSize:fs+'px'}}, texto));
  }
  items.forEach((it,i)=>{
    const ang=(a0 + i*360/n) * Math.PI/180;
    const p=shapeNode(o,it);
    p.style.position='absolute';
    p.style.left=(W/2 + r*Math.cos(ang) - size/2)+'px';
    p.style.top =(W/2 + r*Math.sin(ang) - size/2)+'px';
    p.style.zIndex='1';
    box.appendChild(p);
  });
  return box;
}
function shapesInner(o,items){
  if(o.arranjo==='flor') return florInner(o,items);
  const cols=Math.max(1,Math.min(8,o.cols||5));
  const size=Math.max(30,o.shSize||96), gap=Math.max(0,o.shGap==null?8:o.shGap);
  const hive=o.arranjo==='colmeia'&&o.shape==='hexagono';
  const box=h('div',{class:'shapes'});
  for(let i=0;i<items.length;i+=cols){
    const linha=items.slice(i,i+cols);
    const r=i/cols;
    const row=h('div',{class:'shrow',style:{gap:gap+'px'}});
    /* colmeia: linhas ímpares deslocadas meia peça e encaixadas para cima */
    if(hive){ row.style.marginLeft=(r%2?(size/2+gap/2):0)+'px'; if(r>0) row.style.marginTop=(-size*0.26)+'px'; }
    else if(r>0){ row.style.marginTop=gap+'px'; }
    linha.forEach(it=>row.appendChild(shapeNode(o,it)));
    box.appendChild(row);
  }
  return box;
}
function statsInner(sys,ctx,b,which){
  const items=statBoxes(sys,ctx,which);
  if(!items.length) return h('div',{class:'hint'}, which==='valores'?'Nenhum recurso do tipo valor.':'Nenhum atributo.');
  const view=b.opts.view||'grade';
  if(view==='formas') return shapesInner(b.opts,items);
  if(view==='lista') return h('div',{}, ...items.map(it=>h('div',{class:'arow2'},
    h('span',{style:{fontSize:'13px',fontWeight:'600'}},it.name),
    h('span',{class:'row'}, h('span',{style:{fontSize:'17px',fontWeight:'800'}},it.main),
      it.sub?h('span',{class:'attrmod'},it.sub):null))));
  if(view==='linha') return h('div',{class:'aline'}, ...items.map(it=>h('div',{class:'achip',style:it.color?{borderColor:it.color}:null},
    h('div',{class:'n'},it.name), h('div',{class:'v'},it.main), it.sub?h('div',{class:'b'},it.sub):null)));
  const cols=Math.max(1,Math.min(8,b.opts.cols||5));
  const grid=h('div',{class:'statgrid',style:{marginTop:'0'}}, ...items.map(it=>h('div',{class:'stat',style:it.color?{borderColor:it.color}:null},
    h('div',{class:'n'},it.name), h('div',{class:'v'},it.main), it.sub?h('div',{class:'b'},it.sub):null)));
  grid.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';
  return grid;
}
function skillRows(sys,d,ctx){
  const presentIds=new Set();
  (sys.skills||[]).forEach(s=>{ if(s.auto) presentIds.add(s.id); });
  (d.skills||[]).forEach(id=>presentIds.add(id));
  ctx.eff.grantedSkills.forEach(id=>presentIds.add(id));
  return [...presentIds].map(id=>(sys.skills||[]).find(s=>s.id===id)).filter(Boolean).map(s=>{
    const tier=(sys.profTiers||[]).find(t=>t.id===(d.skillTier||{})[s.id]);
    return {s, value:ctx.skillVal(s), tier,
      tag: sys.profMode!=='nenhum' && tier ? tier.name
         : (s.auto?'auto':(ctx.eff.grantedSkills.includes(s.id)&&!(d.skills||[]).includes(s.id)?'concedida':'treinada')),
      link: s.linkedAttrId?((sys.attributes.find(a=>a.id===s.linkedAttrId)||{}).name||'—'):'—'};
  });
}
function periciasInner(sys,d,ctx,b){
  const rows=skillRows(sys,d,ctx);
  if(!rows.length) return h('div',{class:'hint'},'Nenhuma perícia.');
  const view=b.opts.view||'tabela';
  if(view==='tabela'){
    const tb=h('table',{class:'ptable'},
      h('thead',{},h('tr',{},h('th',{},'Perícia'),h('th',{},'Atributo'),h('th',{},'Tipo'),h('th',{style:{textAlign:'right'}},'Valor'))),
      h('tbody',{}, ...rows.map(r=>h('tr',{title:r.s.description||''},
        h('td',{},r.s.name), h('td',{class:'at'},r.link), h('td',{class:'at'},r.tag), h('td',{class:'vv'},sign(r.value))))));
    return tb;
  }
  if(view==='chips') return h('div',{class:'aline'}, ...rows.map(r=>h('div',{class:'achip',title:r.s.description||''},
    h('div',{class:'n'},r.s.name), h('div',{class:'v'},sign(r.value)))));
  return h('div',{}, ...rows.map(r=>h('div',{class:'skl',title:r.s.description||''},
    h('div',{}, h('span',{class:'nm'},r.s.name), h('span',{class:'tg'},'· '+r.tag+' · '+r.link)),
    h('span',{class:'vl'}, sign(r.value)))));
}
function habilidadesInner(sys,ctx){
  const active=ctx.eff.active.map(x=>h('div',{class:'abil'},
    h('div',{class:'t'},x.ab.name+'  ', h('span',{style:{fontSize:'10px',color:'#64748b'}},'('+x.src+')')),
    x.ab.description?h('div',{class:'d'},x.ab.description):null,
    (x.ab.effects&&x.ab.effects.length)?h('div',{class:'fx'},x.ab.effects.map(ef=>effectLabel(sys,ef)).join('  •  ')):null));
  const locked=ctx.eff.locked.map(x=>h('div',{class:'abil locked'},
    h('div',{class:'t'},'🔒 '+x.ab.name+'  ', h('span',{style:{fontSize:'10px',color:'#64748b'}},'('+x.src+')')),
    x.ab.description?h('div',{class:'d'},x.ab.description):null,
    h('div',{class:'lk'},'Requer: '+x.reasons.join(', '))));
  if(!active.length&&!locked.length) return h('div',{class:'hint'},'Nenhuma habilidade.');
  return h('div',{}, ...active, ...locked);
}
function caracteristicasInner(ctx){
  const race=ctx.eff.org; const traits=(race&&race.traits)||[];
  const tags=ctx.eff.charTags||[]; const nums=ctx.eff.charNum||{}; const numKeys=Object.keys(nums);
  if(!traits.length && !tags.length && !numKeys.length) return h('div',{class:'hint'},'Nenhuma característica.');
  return h('div',{},
    ...traits.map(t=>h('div',{class:'trait'}, h('div',{class:'t'},t.name), t.description?h('div',{class:'d'},t.description):null)),
    ...tags.map(nm=>h('div',{class:'trait'}, h('div',{class:'t'},'🏷 '+nm))),
    ...numKeys.map(k=>h('div',{class:'trait'}, h('div',{class:'row between'}, h('span',{class:'t'},'◆ '+k), h('span',{style:{fontWeight:'800',fontSize:'15px'}},nums[k])))));
}
function anotacoesInner(d,mode){
  return mode==='play'
    ? h('textarea',{class:'in',style:{height:'calc(100% - 4px)',minHeight:'40px'},value:d.notes||'',placeholder:'História, inventário, objetivos…',oninput:e=>{d.notes=e.target.value;persist();}})
    : h('div',{class:'hint'}, d.notes||'—');
}
function nomeInner(sys,d,ctx,b){
  const o=b.opts;
  const sz=o.size==='p'?'15px':o.size==='m'?'18px':'22px';
  const sub=[ctx.eff.cls&&ctx.eff.cls.name, ctx.eff.org&&ctx.eff.org.name, levelLabel(sys,d.level)].filter(Boolean).join(' • ');
  return h('div',{style:{textAlign:o.align||'left'}},
    h('div',{class:'sheet-name',style:{fontSize:sz}}, d.name||'Personagem'),
    o.showSub!==false?h('div',{class:'sheet-sub'},sub):null);
}
/* Mostra o que o degrau atual concede, direto da tabela de progressão. */
function progressaoInner(sys,d){
  const linha=progLinha(sys,d);
  const cab=h('div',{style:{fontWeight:'800',fontSize:'13px',marginBottom:'6px',color:'var(--sheet-accent,#c7d2fe)'}}, levelLabel(sys,d.level));
  if(!linha.length) return h('div',{}, cab, h('div',{class:'hint'},'Sem tabela de progressão para este degrau.'));
  return h('div',{}, cab, h('div',{class:'aline'}, ...linha.map(it=>
    h('div',{class:'achip',title:it.origem==='sistema'?'Do sistema':('Da classe '+it.origem)},
      h('div',{class:'n'},it.name), h('div',{class:'v',style:{fontSize:it.tipo==='texto'?'13px':'17px'}},it.valor)))));
}
function textoInner(b){
  const o=b.opts;
  const sz=o.size==='p'?'11px':o.size==='m'?'14px':'20px';
  return h('div',{style:{textAlign:o.align||'left',fontSize:sz,fontWeight:o.size==='g'?'800':'600',color:'var(--sheet-accent,#c7d2fe)',whiteSpace:'pre-wrap'}}, o.text||'');
}
/* ---- Foto: upload real, reduzida e guardada como base64 (offline) ---- */
function readPhoto(file,cb){
  if(!file) return;
  if(!/^image\//.test(file.type)) return alert('Selecione um arquivo de imagem.');
  const rd=new FileReader();
  rd.onerror=()=>alert('Não foi possível ler o arquivo.');
  rd.onload=()=>{
    const img=new Image();
    img.onerror=()=>alert('Imagem inválida ou corrompida.');
    img.onload=()=>{
      const MAX=320, sc=Math.min(1, MAX/Math.max(img.width,img.height));
      const c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(img.width*sc)); c.height=Math.max(1,Math.round(img.height*sc));
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      cb(c.toDataURL('image/jpeg',0.82));
    };
    img.src=rd.result;
  };
  rd.readAsDataURL(file);
}
function fotoInner(sys,d,b,mode){
  const o=b.opts, sh=sys.sheet;
  const radius=o.shape==='circulo'?'50%':'12px';
  const box=h('div',{style:{position:'relative',width:'100%',height:'100%',borderRadius:radius,overflow:'hidden',background:'rgba(15,23,41,.6)'}});
  if(d.photo) box.appendChild(h('img',{src:d.photo,alt:'',style:{width:'100%',height:'100%',objectFit:o.fit||'cover',display:'block'}}));
  else box.appendChild(h('div',{class:'foto-ph',style:{background:sh.accent||'#4f46e5'}},
    (o.emoji&&o.emoji.trim())?o.emoji.trim():(((d.name||'?').trim().charAt(0)||'🎭').toUpperCase())));
  if(mode!=='play') return box;
  const inp=h('input',{type:'file',accept:'image/*',class:'hide',onchange:e=>{
    readPhoto(e.target.files[0], data=>{ d.photo=data; render(); }); e.target.value='';}});
  box.appendChild(h('div',{style:{position:'absolute',left:'0',right:'0',bottom:'0',display:'flex',gap:'4px',justifyContent:'center',padding:'4px',background:'rgba(11,16,32,.72)'}},
    h('button',{class:'btn sm',onclick:()=>inp.click()}, d.photo?'Trocar':'📷 Foto'),
    d.photo?h('button',{class:'btn sm danger',title:'Remover foto',onclick:()=>{delete d.photo;render();}},'✕'):null));
  box.appendChild(inp);
  return box;
}
/* Também desenhado por inteiro no editor (inerte) para o mestre ver o tamanho real. */
/* ============ PEÇA 3 — ROLADOR ESTRUTURADO ============
   Faz o que o rolador antigo não fazia: vantagem/desvantagem com álgebra
   própria (não somam, se cancelam), pool "melhor de N", crítico que multiplica
   só os dados e o canal de dados vindo de condições. */
function dadosInner(sys,ctx,mode){
  const dc=S.dice, varsTotal=ctx.varsTotal;
  if(dc.vd==null) dc.vd=0;
  if(dc.escopo==null) dc.escopo='pericia';
  const dmDados=diceModDe(ctx.eff,dc.escopo);

  /* monta a expressão final a partir do modo do sistema */
  const montar=()=>{
    const attr=sys.attributes.find(a=>a.id===dc.attrId);
    const bonus=attr?(varsTotal[attr.name]||0):0;
    let expr;
    if(dc.livre&&(dc.expr||'').trim()) expr=dc.expr;
    else if(sys.rollMode==='pool') expr=poolExpr(bonus, sys.poolFaces||20);
    else expr=(sys.rollBase||'1d20')+(bonus?(' + '+bonus):'');
    expr=aplicarModDados(expr,dmDados);
    expr=aplicarVD(expr,dc.vd);
    return {expr, attr, bonus};
  };
  const roll=()=>{
    const {expr,attr}=montar();
    const res=rollExpr(expr, varsTotal);
    const nat=res.detalhes&&res.detalhes[0]?Math.max(...res.detalhes[0].usados):0;
    const crit=nat>=(sys.critNat||20);
    dc.result={livre:true,
      titulo:(dc.livre?'Rolagem livre':(attr?attr.name:'Rolagem'))+(crit?'  ★ CRÍTICO':'')+
             (dc.vd>0?'  (vantagem)':dc.vd<0?'  (desvantagem)':''),
      total:res.erro?null:res.total, sub:res.erro?('⚠ '+res.erro):(expr+'   '+textoRolagem(res))};
    render();
  };
  const attrSel=h('select',{class:'in',style:{maxWidth:'140px'},onchange:e=>{dc.attrId=e.target.value;render();}});
  attrSel.appendChild(h('option',{value:''},'nenhum'));
  sys.attributes.forEach(a=>{const o=h('option',{value:a.id},a.name+' ('+sign(varsTotal[a.name]||0)+')');if(a.id===dc.attrId)o.selected=true;attrSel.appendChild(o);});
  const escSel=h('select',{class:'in',style:{maxWidth:'130px'},onchange:e=>{dc.escopo=e.target.value;render();}});
  DICE_ESCOPOS.filter(x=>x[0]!=='todos').forEach(([v,l])=>{const o=h('option',{value:v},l);if(v===dc.escopo)o.selected=true;escSel.appendChild(o);});
  const vdBtn=(v,l,t)=>h('button',{class:'btn sm '+(dc.vd===v?'emerald':'ghost'),title:t,
    onclick:()=>{dc.vd=(dc.vd===v?0:v);render();}},l);

  const previa=montar().expr;
  return h('div',{},
    h('div',{class:'row wrapf',style:{alignItems:'flex-end'}},
      dc.livre
        ? field('Expressão', h('input',{class:'in mono',style:{minWidth:'140px'},value:dc.expr||'',placeholder:'2d6+3',
            oninput:e=>{dc.expr=e.target.value;persist();},onchange:()=>render()}))
        : field('+ Atributo', attrSel),
      field('Tipo', escSel),
      h('button',{class:'btn primary',onclick:roll},'🎲 Rolar')),
    h('div',{class:'row wrapf',style:{marginTop:'6px'}},
      vdBtn(1,'⬆ Vantagem','Rola um dado a mais e pega o maior'),
      vdBtn(-1,'⬇ Desvantagem','Rola um dado a mais e pega o menor'),
      h('button',{class:'btn sm '+(dc.livre?'emerald':'ghost'),title:'Digitar a expressão na mão',
        onclick:()=>{dc.livre=!dc.livre;render();}},(dc.livre?'✓ ':'')+'✎ Livre')),
    h('div',{class:'hint',style:{marginTop:'6px'}}, 'Vai rolar: ', h('span',{class:'tg-fx'},previa),
      dmDados?h('span',{style:{color:'#fb7185',marginLeft:'6px'}},'('+sign(dmDados)+' dado por condição)'):null),
    dc.result?h('div',{class:'diceres'},
      dc.result.titulo?h('div',{class:'sub',style:{marginBottom:'2px'}},dc.result.titulo):null,
      h('div',{class:'big'},dc.result.total==null?'—':dc.result.total),
      h('div',{class:'sub'},dc.result.sub||'')):null);
}

/* ============ PEÇA 5 — bloco de Condições ============ */
function condicoesInner(sys,d,ctx,b,mode){
  const cat=sys.conditions||[];
  const ativas=ctx.eff.condAtivas||[];
  if(!cat.length) return h('div',{class:'hint'},'O mestre não cadastrou condições (aba 🩸 Condições).');
  const chip=(c,nivel,via)=>h('span',{class:'cond-chip',style:{background:c.color||'#e11d48'},
    title:(c.description||'')+(via?(' (via '+via+')'):'')},
    (c.icon||'⚠')+' '+c.name+(c.niveis>0?(' '+nivel):''));
  const lista=h('div',{class:'row wrapf'}, ...ativas.map(a=>chip(a.cond,a.nivel,a.via)));
  if(mode!=='play') return h('div',{}, ativas.length?lista:h('div',{class:'hint'},'Nenhuma condição ativa.'),
    h('div',{class:'hint',style:{marginTop:'6px'}},'Na ficha do jogador, aqui ficam os botões para ligar e desligar.'));
  const tem=id=>(d.conditions||[]).some(x=>x.condId===id);
  const alterna=c=>{
    if(tem(c.id)) d.conditions=d.conditions.filter(x=>x.condId!==c.id);
    else d.conditions.push({cid:uid(),condId:c.id,nivel:1});
    render();
  };
  const nivelar=(c,delta)=>{
    const e=(d.conditions||[]).find(x=>x.condId===c.id); if(!e) return;
    e.nivel=Math.max(1,Math.min(c.niveis||1,(e.nivel||1)+delta));
    render();
  };
  return h('div',{},
    ativas.length?h('div',{style:{marginBottom:'8px'}},lista):h('div',{class:'hint',style:{marginBottom:'8px'}},'Nenhuma condição ativa.'),
    h('div',{class:'row wrapf'}, ...cat.map(c=>{
      const on=tem(c.id);
      const e=(d.conditions||[]).find(x=>x.condId===c.id);
      return h('div',{class:'row',style:{gap:'2px'}},
        h('button',{class:'btn sm '+(on?'danger':'ghost'),title:c.description||'',onclick:()=>alterna(c)},
          (on?'✓ ':'')+(c.icon||'⚠')+' '+c.name),
        (on&&c.niveis>0)?h('div',{class:'row',style:{gap:'2px'}},
          h('button',{class:'btn mini',onclick:()=>nivelar(c,-1)},'−'),
          h('span',{class:'attrval',style:{minWidth:'22px'}},(e&&e.nivel)||1),
          h('button',{class:'btn mini',onclick:()=>nivelar(c,1)},'+')):null);
    })),
    (()=>{ const dm=ctx.eff.diceMod||{};
      const partes=Object.keys(dm).filter(k=>dm[k]).map(k=>{
        const l=(DICE_ESCOPOS.find(x=>x[0]===k)||[,k])[1];
        return sign(dm[k])+'d em '+l; });
      return partes.length?h('div',{class:'hint',style:{marginTop:'8px',color:'#fb7185'}},'🎲 '+partes.join(' · ')):null; })());
}
/* ============ PEÇA 6+3 — bloco de Ataques ============ */
function ataquesInner(sys,d,ctx,b,mode){
  const ats=ctx.ataques||[];
  if(!ats.length) return h('div',{class:'hint'},'Nenhuma arma equipada que gere ataque.');
  return h('div',{}, ...ats.map(a=>{
    const dmDados=diceModDe(ctx.eff,'ataque');
    const rolar=(vd)=>{
      let expr=sys.rollMode==='pool' ? poolExpr(a.bonus,sys.poolFaces||20) : (sys.rollBase||'1d20');
      expr=aplicarModDados(expr,dmDados);
      expr=aplicarVD(expr,vd);
      const somaBonus = sys.rollMode==='pool' ? '' : (' + '+a.bonus);
      const res=rollExpr(expr+somaBonus, ctx.varsTotal);
      /* crítico: dado natural do primeiro termo ≥ faixa da arma */
      const nat=res.detalhes&&res.detalhes[0]?Math.max(...res.detalhes[0].usados):0;
      const crit=nat>=(a.at.critRange||20);
      const dano=rollExpr(a.at.dano||'0', ctx.varsTotal,
        {crit:crit&&sys.critSoDados, critMult:a.at.critMult||2});
      if(crit && !sys.critSoDados && dano.total!=null) dano.total=dano.total*(a.at.critMult||2);
      S.dice.result={livre:true, titulo:a.it.name+(crit?'  ★ CRÍTICO':''),
        total:res.total, sub:textoRolagem(res)+'  →  dano '+(dano.erro?dano.erro:dano.total)+'  ['+textoRolagem(dano)+']',
        tags:a.tags};
      render();
    };
    const nomeTag=id=>((sys.tags||[]).find(t=>t.id===id)||{});
    return h('div',{class:'item',style:{marginBottom:'8px'}},
      h('div',{class:'row between'},
        h('div',{}, h('span',{style:{fontWeight:'700'}},a.it.name),
          h('span',{class:'hint',style:{marginLeft:'6px'}},
            sign(a.bonus)+(a.partes.length?(' ('+a.partes.join(' + ')+')'):'')+
            (a.at.alcance?(' · '+a.at.alcance):''))),
        h('span',{class:'tg-fx'},a.at.dano||'—')),
      (a.tags||[]).length?h('div',{class:'tags',style:{marginTop:'4px'}},
        ...a.tags.map(id=>{const t=nomeTag(id);return h('span',{class:'tg-fx',style:{borderColor:t.color}},t.name||'?');})):null,
      mode==='play'?h('div',{class:'row',style:{marginTop:'6px'}},
        h('button',{class:'btn sm primary',onclick:()=>rolar(0)},'🎲 Atacar'),
        h('button',{class:'btn sm',title:'Vantagem',onclick:()=>rolar(1)},'⬆ Van'),
        h('button',{class:'btn sm',title:'Desvantagem',onclick:()=>rolar(-1)},'⬇ Des')):null,
      h('div',{class:'hint',style:{marginTop:'4px'}},
        'Crítico em '+(a.at.critRange||20)+'+ · ×'+(a.at.critMult||2)+
        (dmDados?('  ·  🎲 '+sign(dmDados)+' dado(s) por condição'):'')));
  }));
}
/* ============ PEÇA 1 — bloco de Escolhas feitas ============ */
function escolhasInner(sys,d,ctx){
  const feitas=ctx.eff.escolhidas||[];
  if(!feitas.length) return h('div',{class:'hint'},'Nenhuma escolha feita ainda.');
  return h('div',{}, ...feitas.map(({ch,op})=>h('div',{class:'abil'},
    h('div',{class:'t'},op.name+'  ', h('span',{style:{fontSize:'10px',color:'#64748b'}},'('+ch.name+')')),
    op.description?h('div',{class:'d'},op.description):null,
    (op.effects||[]).length?h('div',{class:'fx'},op.effects.map(ef=>effectLabel(sys,ef)).join('  •  ')):null)));
}
/* ============ PEÇA 8 — bloco de Técnicas autorais ============ */
function tecnicasInner(sys,d,ctx,b,mode){
  if(!sys.techAtivo) return h('div',{class:'hint'},'O construtor de técnicas está desligado (aba 🌀 Técnicas).');
  const tiers=(sys.techTiers||[]).filter(t=>(t.reqLevel||0)<=d.level);
  const rec=(sys.resources||[]).find(r=>r.id===sys.techRecursoId);
  const custoDe=t=>{
    const tier=(sys.techTiers||[]).find(x=>x.id===t.tierId); if(!tier) return 0;
    const base=evalFormula(tier.custoFormula||'0',ctx.varsTotal);
    const c=(Number.isNaN(base)?0:base)
      + (t.acaoComplexa?sys.techCustoAcaoComplexa:0)
      + (t.acaoSimples?sys.techCustoAcaoSimples:0)
      + (Math.max(0,t.extras||0)*sys.techCustoExtra);
    return c;
  };
  const validar=t=>{
    const tier=(sys.techTiers||[]).find(x=>x.id===t.tierId);
    if(!tier) return ['Sem tier'];
    const erros=[];
    if((tier.danoMax||'').trim() && (t.dano||'').trim()){
      const meu=mediaExpr(t.dano,ctx.varsTotal), teto=mediaExpr(tier.danoMax,ctx.varsTotal);
      if(Number.isNaN(meu)) erros.push('dano inválido');
      else if(!Number.isNaN(teto) && meu>teto) erros.push('dano acima do teto do '+tier.name+' (≈'+meu+' > ≈'+teto+')');
    }
    if((tier.reqLevel||0)>d.level) erros.push('tier exige '+(sys.levelName||'Nível')+' '+tier.reqLevel);
    return erros;
  };
  const linhas=(d.techniques||[]).map(t=>{
    const erros=validar(t), custo=custoDe(t);
    const tier=(sys.techTiers||[]).find(x=>x.id===t.tierId);
    if(mode!=='play') return h('div',{class:'item',style:{marginBottom:'6px'}},
      h('div',{class:'row between'}, h('span',{style:{fontWeight:'700'}},t.name||'(sem nome)'),
        h('span',{class:'tg-fx'},(tier?tier.name:'?')+' · '+custo+(rec?(' '+rec.name):''))),
      t.dano?h('div',{class:'hint'},'Dano '+t.dano):null);
    const tierSel=h('select',{class:'in',style:{maxWidth:'130px'},onchange:e=>{t.tierId=e.target.value;render();}});
    tiers.forEach(x=>{const o=h('option',{value:x.id},x.name);if(x.id===t.tierId)o.selected=true;tierSel.appendChild(o);});
    return h('div',{class:'item',style:{marginBottom:'8px'}},
      h('div',{class:'row'},
        h('input',{class:'in',value:t.name||'',placeholder:'Nome da técnica',oninput:e=>{t.name=e.target.value;persist();},onchange:()=>render()}),
        tierSel,
        h('button',{class:'btn danger sm',onclick:()=>{d.techniques=d.techniques.filter(x=>x.id!==t.id);render();}},'✕')),
      h('div',{class:'grid g3',style:{marginTop:'6px'}},
        field('Dano', h('input',{class:'in mono',value:t.dano||'',placeholder:'2d8',oninput:e=>{t.dano=e.target.value;persist();},onchange:()=>render()})),
        field('Alcance', h('input',{class:'in',value:t.alcance||'',placeholder:'9m',oninput:e=>{t.alcance=e.target.value;persist();}})),
        field('Duração', h('input',{class:'in',value:t.duracao||'',placeholder:'1 cena',oninput:e=>{t.duracao=e.target.value;persist();}}))),
      h('div',{class:'row wrapf',style:{marginTop:'6px'}},
        h('button',{class:'btn sm '+(t.acaoComplexa?'emerald':'ghost'),onclick:()=>{t.acaoComplexa=!t.acaoComplexa;render();}},
          (t.acaoComplexa?'✓ ':'')+'Ação complexa (+'+sys.techCustoAcaoComplexa+')'),
        h('button',{class:'btn sm '+(t.acaoSimples?'emerald':'ghost'),onclick:()=>{t.acaoSimples=!t.acaoSimples;render();}},
          (t.acaoSimples?'✓ ':'')+'Ação simples (+'+sys.techCustoAcaoSimples+')'),
        field('Extras', h('input',{class:'in',type:'number',min:'0',style:{width:'70px'},value:t.extras||0,
          onchange:e=>{t.extras=Math.max(0,parseInt(e.target.value)||0);render();}}))),
      h('textarea',{class:'in',rows:'2',style:{marginTop:'6px'},value:t.descricao||'',
        placeholder:'Descrição da técnica',oninput:e=>{t.descricao=e.target.value;persist();}}),
      h('div',{class:'row between',style:{marginTop:'6px'}},
        h('span',{class:erros.length?'aviso-in':'tg-fx'}, erros.length?('⚠ '+erros.join(' · ')):'✓ dentro do orçamento'),
        h('span',{style:{fontWeight:'800'}},'Custo '+custo+(rec?(' '+rec.name):''))),
      (mode==='play'&&t.dano)?h('button',{class:'btn sm primary',style:{marginTop:'6px'},onclick:()=>{
        const dm=diceModDe(ctx.eff,'tecnica');
        const res=rollExpr(aplicarModDados(t.dano,dm),ctx.varsTotal);
        S.dice.result={livre:true,titulo:t.name||'Técnica',total:res.total,sub:textoRolagem(res)};
        render();}},'🎲 Rolar dano'):null);
  });
  return h('div',{},
    tiers.length?null:h('div',{class:'hint'},'Nenhum tier liberado no seu degrau ainda.'),
    ...linhas,
    (mode==='play'&&tiers.length)?h('button',{class:'btn sm',style:{marginTop:'6px'},onclick:()=>{
      d.techniques.push({id:uid(),name:'Nova técnica',tierId:tiers[0].id,dano:'',alcance:'',duracao:'',
        acaoComplexa:false,acaoSimples:false,extras:0,descricao:'',campos:{}});
      render();}},'+ Criar '+(sys.techNome||'técnica')):null);
}
/* ============ decorativos ============ */
function divisorInner(b){
  const o=b.opts;
  const cor=o.cor||'var(--sheet-accent,#4f46e5)';
  const linha=h('div',{style:{flex:'1',height:'0',
    borderTop:(o.espessura||2)+'px '+(o.estilo||'solida')==='pontilhada'?'':'',
    borderTopWidth:(o.espessura||2)+'px',
    borderTopStyle:o.estilo==='pontilhada'?'dotted':o.estilo==='tracejada'?'dashed':o.estilo==='dupla'?'double':'solid',
    borderTopColor:cor}});
  const linha2=h('div',{style:{flex:'1',height:'0',
    borderTopWidth:(o.espessura||2)+'px',
    borderTopStyle:o.estilo==='pontilhada'?'dotted':o.estilo==='tracejada'?'dashed':o.estilo==='dupla'?'double':'solid',
    borderTopColor:cor}});
  return h('div',{style:{display:'flex',alignItems:'center',gap:'8px',height:'100%'}},
    linha, (o.enfeite||'').trim()?h('span',{style:{color:cor,fontSize:'14px',whiteSpace:'nowrap'}},o.enfeite):null,
    (o.enfeite||'').trim()?linha2:null);
}
function formaInner(b){
  const o=b.opts;
  const clip=SHAPE_CLIP[o.shape];
  const sw=Math.max(0,Math.min(20,o.strokeW==null?3:o.strokeW));
  const wrap=h('div',{style:{position:'relative',width:'100%',height:'100%'}});
  if(clip){
    wrap.appendChild(h('div',{style:{position:'absolute',inset:'0',clipPath:clip,background:sw>0?(o.stroke||'#6366f1'):(o.fill||'#141a2e')}}));
    wrap.appendChild(h('div',{style:{position:'absolute',inset:sw+'px',clipPath:clip,background:o.fill||'#141a2e'}}));
  }else{
    wrap.appendChild(h('div',{style:{position:'absolute',inset:'0',background:o.fill||'#141a2e',
      border:sw>0?(sw+'px solid '+(o.stroke||'#6366f1')):'none',
      borderRadius:o.shape==='circulo'?'50%':'12px'}}));
  }
  if((o.texto||'').trim()) wrap.appendChild(h('div',{style:{position:'absolute',inset:'0',display:'flex',
    alignItems:'center',justifyContent:'center',color:o.txtColor||'#e2e8f0',
    fontSize:(o.numSize||18)+'px',fontWeight:'800',textAlign:'center',padding:'8px',lineHeight:'1.1'}},o.texto));
  return wrap;
}
function imagemInner(sys,b,mode){
  const o=b.opts;
  const box=h('div',{style:{position:'relative',width:'100%',height:'100%',
    borderRadius:o.shape==='circulo'?'50%':'10px',overflow:'hidden'}});
  if(o.src) box.appendChild(h('img',{src:o.src,alt:'',style:{width:'100%',height:'100%',objectFit:o.fit||'contain',display:'block'}}));
  else box.appendChild(h('div',{class:'hint',style:{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center'}},'🏵 selo / imagem'));
  return box;
}

/* ============ Montagem do canvas ============ */
function blockInner(sys,d,ctx,b,mode){
  switch(b.key){
    case 'nome':            return nomeInner(sys,d,ctx,b);
    case 'foto':            return fotoInner(sys,d,b,mode);
    case 'atributos':       return statsInner(sys,ctx,b,'atributos');
    case 'valores':         return statsInner(sys,ctx,b,'valores');
    case 'recursos':        return recursosInner(sys,d,ctx,b,mode);
    case 'pericias':        return periciasInner(sys,d,ctx,b);
    case 'habilidades':     return habilidadesInner(sys,ctx);
    case 'caracteristicas': return caracteristicasInner(ctx);
    case 'anotacoes':       return anotacoesInner(d,mode);
    case 'dados':           return dadosInner(sys,ctx,mode);
    case 'progressao':      return progressaoInner(sys,d);
    case 'inventario':      return inventarioInner(sys,d,ctx,b,mode);
    case 'condicoes':       return condicoesInner(sys,d,ctx,b,mode);
    case 'ataques':         return ataquesInner(sys,d,ctx,b,mode);
    case 'tecnicas':        return tecnicasInner(sys,d,ctx,b,mode);
    case 'escolhas':        return escolhasInner(sys,d,ctx);
    case 'texto':           return textoInner(b);
    case 'divisor':         return divisorInner(b);
    case 'forma':           return formaInner(b);
    case 'imagem':          return imagemInner(sys,b,mode);
    case 'espaco':          return h('div',{});
  }
  return h('div',{class:'hint'},'Bloco desconhecido: '+b.key);
}
/* blocos que nunca imprimem título (são identidade visual, não seção) */
const SEM_TITULO=['texto','nome','foto','divisor','forma','imagem'];
const SOMBRAS={nenhuma:'', suave:'0 4px 14px rgba(0,0,0,.35)', forte:'0 10px 28px rgba(0,0,0,.6)',
               brilho:'0 0 16px var(--sheet-accent,#4f46e5)', interna:'inset 0 2px 12px rgba(0,0,0,.5)'};
function blockNode(sys,d,ctx,b,mode){
  const o=b.opts||{}, t=BLOCK_TYPES[b.key]||{label:b.key,icon:'▫'};
  /* bloco escondido: some na ficha do jogador, aparece fantasma no editor */
  if(o.hidden && mode!=='edit') return h('div',{style:{display:'none'}});
  let inner;
  try{ inner=blockInner(sys,d,ctx,b,mode); }
  catch(err){ inner=h('div',{class:'hint',style:{color:'#fb7185'}},'⚠ erro neste bloco'); }
  const titulo=(o.showTitle && !SEM_TITULO.includes(b.key))
    ? h('div',{class:'blk-tt',style:{
        color:o.titleColor||null, fontSize:o.titleSize?(o.titleSize+'px'):null,
        textAlign:o.titleAlign||'left', textTransform:o.titleCaps===false?'none':'uppercase'}},
        o.title||t.title||t.label)
    : null;
  const body=h('div',{class:'blk-body'}, titulo, inner);
  if(o.pad!=null) body.style.padding=o.pad+'px';
  const el=h('div',{class:'blk'+(o.framed!==false?' framed':'')
    +(mode==='edit'&&S.ui.sel===b.id?' sel':'')
    +(mode==='edit'&&(S.ui.multi||[]).includes(b.id)?' sel2':'')
    +(mode==='edit'&&o.hidden?' oculto':'')
    +(mode==='edit'&&o.locked?' travado':'')}, body);
  el.dataset.bid=b.id;
  el.style.left=b.x+'px'; el.style.top=b.y+'px'; el.style.width=b.w+'px'; el.style.height=b.h+'px';
  /* --- estilo livre por bloco --- */
  if(o.bg){ el.style.background=o.bg;
    if(o.bgOpacity!=null && o.bgOpacity<100) el.style.background=corComAlfa(o.bg,o.bgOpacity/100); }
  if(o.borderColor) el.style.borderColor=o.borderColor;
  if(o.borderW!=null) el.style.borderWidth=o.borderW+'px';
  if(o.borderW!=null&&o.borderW>0) el.style.borderStyle='solid';
  if(o.radius!=null) el.style.borderRadius=o.radius+'px';
  if(o.shadow&&SOMBRAS[o.shadow]) el.style.boxShadow=SOMBRAS[o.shadow];
  if(o.opacity!=null && o.opacity<100) el.style.opacity=(o.opacity/100);
  if(o.rotate) el.style.transform='rotate('+o.rotate+'deg)';
  if(mode==='edit'){
    el.appendChild(h('div',{class:'blk-tag'},(o.locked?'🔒 ':'')+(o.hidden?'👁 ':'')+t.icon+' '+(o.alias||t.label)));
    attachEdit(sys,el,b);
  }
  return el;
}
/* #rrggbb + alfa → rgba(), para o fundo do bloco poder ser translúcido */
function corComAlfa(hex,a){
  const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex||'').trim());
  if(!m) return hex;
  return 'rgba('+parseInt(m[1],16)+','+parseInt(m[2],16)+','+parseInt(m[3],16)+','+a+')';
}
/* Alinhamento magnético: se uma borda (ou o centro) do bloco chegar perto de uma
   borda/centro de outro bloco, ou do centro do papel, gruda e mostra a guia. */
const SNAP_TOL=6;
function applySnap(sh,b,nx,ny){
  const outros=sh.blocks.filter(x=>x.id!==b.id);
  const xs=[0, CANVAS_W, CANVAS_W/2], ys=[0];
  outros.forEach(o=>{ xs.push(o.x, o.x+o.w, o.x+o.w/2); ys.push(o.y, o.y+o.h, o.y+o.h/2); });
  /* as guias fixas do mestre também atraem */
  (sh.guides||[]).forEach(g=>{ (g.eixo==='gx'?xs:ys).push(g.pos); });
  const acha=(bordas,cands)=>{ let melhor=null;
    bordas.forEach(([pos,off])=>cands.forEach(c=>{ const d=Math.abs(pos-c);
      if(d<=SNAP_TOL && (!melhor||d<melhor.d)) melhor={d, val:c-off, guia:c}; }));
    return melhor; };
  const bx=acha([[nx,0],[nx+b.w,b.w],[nx+b.w/2,b.w/2]], xs);
  const by=acha([[ny,0],[ny+b.h,b.h],[ny+b.h/2,b.h/2]], ys);
  const guias=[];
  if(bx) guias.push({eixo:'gx',pos:bx.guia});
  if(by) guias.push({eixo:'gy',pos:by.guia});
  const g=Math.max(1,sh.grid||GRID);
  return { x: bx?bx.val:Math.round(nx/g)*g, y: by?by.val:Math.round(ny/g)*g, guias };
}
function drawGuides(cv,guias){
  cv.querySelectorAll('.guide').forEach(g=>g.remove());
  (guias||[]).forEach(g=>{
    const el=h('div',{class:'guide '+g.eixo});
    if(g.eixo==='gx') el.style.left=g.pos+'px'; else el.style.top=g.pos+'px';
    cv.appendChild(el);
  });
}
/* arrastar e redimensionar — mexe direto no style durante o gesto e só
   grava no estado (com render) ao soltar, para não recriar a árvore a cada pixel */
/* Todos os blocos selecionados (o principal + os do Shift+clique), sem travados. */
function selecionados(sh){
  const ids=[S.ui.sel, ...(S.ui.multi||[])].filter(Boolean);
  const vistos=new Set();
  return ids.map(id=>sh.blocks.find(b=>b.id===id)).filter(b=>{
    if(!b||vistos.has(b.id)) return false; vistos.add(b.id); return true; });
}
function estaSelecionado(id){ return S.ui.sel===id || (S.ui.multi||[]).includes(id); }
function attachEdit(sys,el,b){
  const sh=sys.sheet;
  const snap=v=>{const g=Math.max(1,sh.grid||GRID); return Math.round(v/g)*g;};
  const grab=(ev,kind)=>{
    if(ev.button!=null && ev.button!==0) return;
    if(b.opts&&b.opts.locked && kind!=='sel'){ ev.stopPropagation();
      S.ui.sel=b.id; S.ui.multi=[]; render(); return showToast('🔒 Bloco travado — destrave no painel'); }
    ev.preventDefault(); ev.stopPropagation();
    const cv=el.closest('.cv');
    const sc=parseFloat(cv&&cv.dataset.scale)||1;

    /* Shift+clique: entra/sai da seleção múltipla, sem arrastar */
    if(ev.shiftKey && kind==='move'){
      if(S.ui.sel===b.id){ const m=S.ui.multi||[]; S.ui.sel=m[0]||null; S.ui.multi=m.slice(1); }
      else if((S.ui.multi||[]).includes(b.id)) S.ui.multi=S.ui.multi.filter(x=>x!==b.id);
      else S.ui.multi=[...(S.ui.multi||[]), b.id];
      render(); return;
    }
    /* Alt+arrastar: duplica e arrasta a cópia (o original fica onde está) */
    let alvo=b;
    if(ev.altKey && kind==='move'){
      const t=BLOCK_TYPES[b.key];
      if(t&&!t.multi){ showToast('Só pode haver um bloco de '+t.label); }
      else{
        pushUndo();
        const copia={...JSON.parse(JSON.stringify(b)), id:uid()};
        sh.blocks.push(copia); alvo=copia; S.ui.sel=copia.id; S.ui.multi=[];
        render();
        const novoEl=document.querySelector('.cv.edit .blk[data-bid="'+copia.id+'"]');
        if(novoEl){ /* o gesto continua no elemento novo */
          const fake=new PointerEvent('pointerdown',{clientX:ev.clientX,clientY:ev.clientY,pointerId:ev.pointerId,bubbles:true});
          novoEl.dispatchEvent(fake);
        }
        return;
      }
    }
    /* seleciona já no primeiro toque, sem re-render (um render aqui mataria o gesto):
       troca a classe na mão e deixa o mesmo movimento continuar arrastando */
    if(!estaSelecionado(b.id)){
      S.ui.sel=b.id; S.ui.multi=[];
      if(cv) cv.querySelectorAll('.blk.sel,.blk.sel2').forEach(x=>x.classList.remove('sel','sel2'));
      el.classList.add('sel');
    }
    /* o grupo inteiro se move junto (os travados ficam de fora) */
    const grupo=(kind==='move')?selecionados(sh).filter(x=>!(x.opts&&x.opts.locked)):[alvo];
    const orig=grupo.map(x=>({b:x, x:x.x, y:x.y}));
    const ow=alvo.w, oh=alvo.h;
    const sx=ev.clientX, sy=ev.clientY;
    let dirty=false;
    el.classList.add('dragging');
    try{ el.setPointerCapture(ev.pointerId); }catch(e){}
    const tag=el.querySelector('.blk-tag');
    const rotulo=tag?tag.textContent:'';
    const move=e=>{
      const dx=(e.clientX-sx)/sc, dy=(e.clientY-sy)/sc;
      if(!dirty && Math.abs(dx)<2 && Math.abs(dy)<2) return;
      if(!dirty){ pushUndo(); dirty=true; }   /* só registra no desfazer se de fato mexeu */
      if(kind==='move'){
        /* o snap é calculado pelo bloco principal e o deslocamento é replicado */
        const p=orig.find(o=>o.b.id===alvo.id)||orig[0];
        const s2=(sh.snap!==false)?applySnap(sh,alvo,p.x+dx,p.y+dy)
                                  :{x:snap(p.x+dx), y:snap(p.y+dy), guias:[]};
        const realDx=Math.max(0,Math.min(s2.x, CANVAS_W-alvo.w))-p.x;
        const realDy=Math.max(0,s2.y)-p.y;
        orig.forEach(o=>{
          o.b.x=Math.max(0,Math.min(o.x+realDx, CANVAS_W-o.b.w));
          o.b.y=Math.max(0,o.y+realDy);
          const n=cv&&cv.querySelector('.blk[data-bid="'+o.b.id+'"]');
          if(n){ n.style.left=o.b.x+'px'; n.style.top=o.b.y+'px'; }
        });
        if(cv) drawGuides(cv,s2.guias);
      }else{
        alvo.w=Math.max(60,Math.min(snap(ow+dx), CANVAS_W-alvo.x));
        alvo.h=Math.max(40,snap(oh+dy));
        el.style.width=alvo.w+'px'; el.style.height=alvo.h+'px';
      }
      /* leitura ao vivo de posição e tamanho, na própria etiqueta do bloco */
      if(tag) tag.textContent=(kind==='move')
        ? (alvo.x+', '+alvo.y+(grupo.length>1?('  ('+grupo.length+' blocos)'):''))
        : (alvo.w+' × '+alvo.h);
    };
    const up=()=>{
      el.removeEventListener('pointermove',move); el.removeEventListener('pointerup',up); el.removeEventListener('pointercancel',up);
      el.classList.remove('dragging');
      if(cv) drawGuides(cv,[]);
      if(tag) tag.textContent=rotulo;
      const baixo=sh.blocks.reduce((m,x)=>Math.max(m,x.y+x.h),0);
      if(baixo>sh.canvasH) sh.canvasH=baixo+20;        /* o papel cresce sozinho */
      render();
    };
    el.addEventListener('pointermove',move); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up);
  };
  el.addEventListener('pointerdown',ev=>{ if(ev.target.closest('.blk-rs'))return; grab(ev,'move'); });
  if(!(b.opts&&b.opts.locked)){
    const rs=h('div',{class:'blk-rs',title:'Redimensionar'});
    rs.addEventListener('pointerdown',ev=>grab(ev,'resize'));
    el.appendChild(rs);
  }
}
/* Encolhe/estica o bloco até o tamanho exato do que ele desenha.
   Medir scrollWidth/scrollHeight NÃO serve: o corpo do bloco tem height:100%, então
   nunca reporta menos que o tamanho atual. Aqui soltamos as amarras por um instante,
   medimos o tamanho natural e devolvemos tudo ao lugar. */
function ajustarAoConteudo(b){
  const el=document.querySelector('.cv.edit .blk[data-bid="'+b.id+'"]');
  if(!el) return false;
  const body=el.querySelector('.blk-body'); if(!body) return false;
  const cv=el.closest('.cv'); const sc=parseFloat(cv&&cv.dataset.scale)||1;
  const salvo={w:el.style.width,h:el.style.height,bh:body.style.height,bo:body.style.overflow};
  el.style.width='auto'; el.style.height='auto'; el.style.maxWidth=(CANVAS_W-b.x)+'px';
  body.style.height='auto'; body.style.overflow='visible';
  const r=body.getBoundingClientRect();
  const pad=(b.opts&&b.opts.framed!==false)?22:2;
  el.style.width=salvo.w; el.style.height=salvo.h; el.style.maxWidth='';
  body.style.height=salvo.bh; body.style.overflow=salvo.bo;
  b.w=Math.max(60, Math.min(CANVAS_W-b.x, Math.ceil(r.width/sc)+pad));
  b.h=Math.max(40, Math.ceil(r.height/sc)+pad);
  const sh=S.system.sheet;
  if(b.y+b.h>sh.canvasH) sh.canvasH=b.y+b.h+20;
  return true;
}
/* Alinha o bloco em relação ao papel */
function alinharNoPapel(b,como){
  const sh=S.system.sheet;
  pushUndo();
  if(como==='esq') b.x=10;
  else if(como==='centroH') b.x=Math.round((CANVAS_W-b.w)/2/GRID)*GRID;
  else if(como==='dir') b.x=CANVAS_W-b.w-10;
  else if(como==='topo') b.y=10;
  else if(como==='centroV') b.y=Math.max(0,Math.round(((sh.canvasH||990)-b.h)/2/GRID)*GRID);
  else if(como==='base') b.y=Math.max(0,(sh.canvasH||990)-b.h-10);
  render();
}
/* Ações rápidas coladas no bloco selecionado — evita ter que descer até o painel */
function blockBar(sh,b){
  const idx=sh.blocks.indexOf(b);
  const bar=h('div',{class:'blk-bar'},
    h('button',{title:'Duplicar (Ctrl+D)',onclick:e=>{e.stopPropagation();duplicarBloco(b);render();}},'⧉'),
    h('button',{title:'Trazer para frente',disabled:idx>=sh.blocks.length-1,
      onclick:e=>{e.stopPropagation();pushUndo();sh.blocks.splice(idx,1);sh.blocks.push(b);render();}},'⬆'),
    h('button',{title:'Enviar para trás',disabled:idx<=0,
      onclick:e=>{e.stopPropagation();pushUndo();sh.blocks.splice(idx,1);sh.blocks.unshift(b);render();}},'⬇'),
    h('button',{class:'rm',title:'Remover (Delete)',onclick:e=>{e.stopPropagation();removerBloco(b);}},'✕'));
  bar.style.left=b.x+'px';
  /* acima do bloco; se não couber, por dentro do topo */
  bar.style.top=(b.y>=34?(b.y-30):(b.y+4))+'px';
  bar.addEventListener('pointerdown',e=>e.stopPropagation());
  return bar;
}
function canvasNode(sys,d,mode){
  const sh=sys.sheet, ctx=computeSheet(sys,d);
  const blocks=(sh.blocks||[]).slice();
  /* modo empilhado: ignora x/y e segue a leitura natural (cima→baixo, esq→dir) */
  if(mode!=='edit' && S.ui.stack){
    blocks.sort((a,b2)=>(a.y-b2.y)||(a.x-b2.x));
    const stack=h('div',{});
    stack.style.setProperty('--sheet-accent', sh.accent||'#4f46e5');
    blocks.forEach(b=>{
      const clone={...b, x:0, y:0, w:CANVAS_W, h:b.h};
      const n=blockNode(sys,d,ctx,clone,mode);
      n.style.position='static'; n.style.width='auto'; n.style.height='auto';
      n.classList.add('stack-blk');
      const body=n.querySelector('.blk-body'); if(body){ body.style.height='auto'; body.style.overflow='visible'; }
      stack.appendChild(n);
    });
    return stack;
  }
  const cv=h('div',{class:'cv'+(mode==='edit'?' edit':'')}, ...blocks.map(b=>blockNode(sys,d,ctx,b,mode)));
  cv.style.width=CANVAS_W+'px';
  cv.style.height=(sh.canvasH||990)+'px';
  cv.dataset.h=sh.canvasH||990;
  cv.style.setProperty('--sheet-accent', sh.accent||'#4f46e5');
  /* fundo do papel: cor sólida e/ou imagem enviada pelo mestre */
  if(sh.bg) cv.style.background=sh.bg;
  if(sh.bgImage){ cv.style.backgroundImage='url('+sh.bgImage+')';
    cv.style.backgroundSize='cover'; cv.style.backgroundPosition='center'; }
  if(mode==='edit'){
    const g=Math.max(2,sh.grid||GRID);
    if(sh.showGrid!==false){
      cv.classList.add('com-grade');
      cv.style.setProperty('--g', g+'px');
    }
    /* guias fixas que o mestre posiciona e reutiliza */
    (sh.guides||[]).forEach(gd=>{
      const el=h('div',{class:'guide fixa '+gd.eixo, title:'Guia em '+gd.pos+'px — clique para remover'});
      if(gd.eixo==='gx') el.style.left=gd.pos+'px'; else el.style.top=gd.pos+'px';
      el.addEventListener('pointerdown',e=>{ e.stopPropagation(); pushUndo();
        sh.guides=sh.guides.filter(x=>x.id!==gd.id); render(); });
      cv.appendChild(el);
    });
    /* clique no vazio: desseleciona · arrastar no vazio: seleção por retângulo */
    cv.addEventListener('pointerdown',ev=>{
      if(ev.target!==cv && !ev.target.classList.contains('cv')) return;
      const r=cv.getBoundingClientRect(), sc=parseFloat(cv.dataset.scale)||1;
      const x0=(ev.clientX-r.left)/sc, y0=(ev.clientY-r.top)/sc;
      const marq=h('div',{class:'marquee'}); cv.appendChild(marq);
      let moveu=false;
      const mv=e=>{
        const x1=(e.clientX-r.left)/sc, y1=(e.clientY-r.top)/sc;
        if(Math.abs(x1-x0)>3||Math.abs(y1-y0)>3) moveu=true;
        marq.style.left=Math.min(x0,x1)+'px'; marq.style.top=Math.min(y0,y1)+'px';
        marq.style.width=Math.abs(x1-x0)+'px'; marq.style.height=Math.abs(y1-y0)+'px';
      };
      const up=e=>{
        document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up);
        const x1=(e.clientX-r.left)/sc, y1=(e.clientY-r.top)/sc;
        marq.remove();
        if(!moveu){ S.ui.sel=null; S.ui.multi=[]; render(); return; }
        const ax=Math.min(x0,x1), ay=Math.min(y0,y1), bx=Math.max(x0,x1), by=Math.max(y0,y1);
        const pegos=sh.blocks.filter(b=>b.x<bx && b.x+b.w>ax && b.y<by && b.y+b.h>ay);
        S.ui.sel=pegos.length?pegos[pegos.length-1].id:null;
        S.ui.multi=pegos.slice(0,-1).map(b=>b.id);
        render();
        if(pegos.length>1) showToast(pegos.length+' blocos selecionados');
      };
      document.addEventListener('pointermove',mv); document.addEventListener('pointerup',up);
    });
    const sel=blocks.find(b=>b.id===S.ui.sel);
    if(sel) cv.appendChild(blockBar(sh,sel));
  }
  const fit=h('div',{class:'cv-fit'}, cv);
  return fit;
}
function finalSheet(sys,d){
  if(!sys.sheet||!Array.isArray(sys.sheet.blocks)) migrateSheet(sys);
  const sh=sys.sheet;
  return card(sh.title||'Ficha', null,
    h('div',{class:'row'},
      h('button',{class:'btn sm ghost',title:'Alterna entre o layout do mestre e a lista empilhada',
        onclick:()=>{S.ui.stack=!S.ui.stack;render();}}, S.ui.stack?'🗺️ Layout':'📱 Empilhar'),
      h('button',{class:'btn amber',onclick:saveCharacter},'💾 Salvar ficha'),
      h('button',{class:'btn ghost',title:'Baixa a ficha em JSON para o Mestre importar na campanha',onclick:exportFicha},'⬆ Exportar ficha')),
    canvasNode(sys,d,'play'));
}
/* Exporta a ficha atual (JSON) — o Mestre importa isso na seção Jogadores. */
function exportFicha(){
  const nome=(S.draft&&S.draft.name||'ficha').replace(/\s+/g,'_');
  if(typeof downloadJSON==='function') downloadJSON(S.draft, nome+'.ficha.json');
  else { const blob=new Blob([JSON.stringify(S.draft,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=nome+'.ficha.json'; a.click(); }
  showToast('Ficha exportada — envie o arquivo ao Mestre.');
}
function sampleDraft(sys){
  const d=initDraft(sys);
  d.name='Herói de Exemplo';
  const lp=levelPoints(sys,d.level);
  let pts=lp.attrPoints, guard=0;
  const ids=sys.attributes.map(a=>a.id);
  while(pts>0 && ids.length && guard<500){ guard++;
    let moved=false;
    for(const id of ids){ if(pts<=0)break; if((d.attrs[id]||0)<sys.attrMax){ d.attrs[id]=(d.attrs[id]||sys.startAttrValue)+1; pts--; moved=true; } }
    if(!moved) break;
  }
  d.skills=sys.skills.filter(s=>!s.auto).slice(0,lp.skillCount).map(s=>s.id);
  d.notes='Exemplo de anotações do jogador.';
  /* inventário de exemplo: os primeiros itens do catálogo, equipando os equipáveis */
  d.inventory=(sys.items||[]).slice(0,4).map(it=>({iid:uid(),itemId:it.id,equipped:!!it.equipavel}));
  return d;
}
function saveCharacter(){ S.saved.push({...S.draft,id:uid(),system:S.system.name}); showToast('Ficha salva! ✔'); }

