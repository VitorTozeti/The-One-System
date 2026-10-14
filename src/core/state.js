/* ============================================================ ESTADO ============================================================ */
migrateLegacyIfNeeded();   /* embrulha dados globais antigos numa conta, se houver */

let S = {
  view:'mestre', tab:'inicio',
  ui:{open:{}, sel:null, stack:(window.innerWidth||1024)<640,
      live:load('nexus_live')!==false,  /* gaveta Ficha ao vivo */
      modo:load('nexus_modo')||'simples',  /* simples esconde os módulos avançados */
      grupo:'fundacao',  /* grupo de abas aberto no modo mestre */
      busca:null,        /* {q} enquanto a paleta Ctrl+K está aberta */
      gloss:null,        /* {termo} ou {q} enquanto o glossário está aberto */
      multi:[],          /* seleção múltipla: ids além do principal */
      zoom:null,         /* null = ajustar à largura; número = zoom manual */
      estiloCopiado:null,/* área de transferência de estilo */
      camadas:false},    /* painel de camadas aberto */
  account:null,          /* conta logada (ou null = tela de login) */
  personagens:[],        /* personagens da conta logada */
  currentId:null,        /* personagem selecionado (null = hub "Meus personagens") */
  auth:{mode:'login', error:null},  /* estado das telas de login/cadastro */
  system: null,          /* espelho do personagem MESTRE selecionado */
  campaign: null,        /* espelho da campanha do personagem MESTRE selecionado */
  mopen:['painel'],      /* seções do dashboard do Mestre abertas ao mesmo tempo (multi-painel) */
  diceB:{pool:{},mod:0}, /* construtor visual de dados do Mestre: pool[faces]=qtd + modificador */
  draft: null,           /* espelho da ficha do personagem JOGADOR selecionado */
  step:0,
  saved: [],             /* fichas salvas do personagem JOGADOR selecionado */
  dice:{qty:1,die:20,attrId:'',result:null,vd:0,escopo:'pericia',livre:false,expr:''},
  toast:null,
};

/* Personagem atualmente selecionado dentro da conta. */
function currentPersonagem(){ return S.personagens.find(p=>p.id===S.currentId) || null; }

/* Carrega a conta logada e seus personagens no estado. */
function bindAccount(acc){
  S.account=acc;
  S.personagens=loadAccountData(acc.id).personagens || [];
  S.currentId=null; S.system=null; S.draft=null; S.saved=[];
}

/* Liga os espelhos S.system/S.draft/S.saved/S.view ao personagem escolhido.
   O tipo (kind) do personagem é o que define o acesso: mestre → editor de
   sistema; jogador → ficha. */
function bindPersonagem(p){
  S.currentId=p.id;
  if(p.kind==='mestre'){
    S.system=migrateSystem(p.system)||defaultSystem();
    p.campaign=sanitizeCampaign(p.campaign);   /* migra campanhas antigas/ausentes */
    S.campaign=p.campaign;
    S.draft=null; S.saved=[];   /* o preview "Testar como jogador" gera uma ficha na hora */
    S.view='mestre'; S.tab='inicio'; S.mopen=['painel'];
  } else {
    /* por enquanto a ficha do jogador usa o sistema de exemplo embutido */
    S.system=defaultSystem();
    S.draft=p.draft ? sanitizeDraft(p.draft,S.system) : initDraft(S.system);
    S.saved=p.saved || [];
    S.view='jogador'; S.step=0;
  }
}

/* Restaura a sessão anterior (conta + personagem), se válida. */
(function restoreSession(){
  const sess=getSession(); if(!sess) return;
  const acc=getAccount(sess.accountId); if(!acc){ clearSession(); return; }
  bindAccount(acc);
  if(sess.personagemId){ const p=S.personagens.find(x=>x.id===sess.personagemId); if(p) bindPersonagem(p); }
})();

let quotaWarned=false;
/* Situação do salvamento: alimenta o indicador "✔ salvo" do cabeçalho. */
const saveState={ok:true, t:null, erro:''};
function atualizaIndicadorSalvo(){
  const el=document.getElementById('save-ind'); if(!el) return;
  if(saveState.ok){
    const hh=saveState.t?saveState.t.toTimeString().slice(0,5):'';
    el.className='save-ind ok'; el.textContent='✔ salvo'; el.title='Salvo no navegador'+(hh?' às '+hh:'');
    el.removeAttribute('data-erro');
  } else {
    el.className='save-ind erro'; el.textContent='⚠ NÃO salvo'; el.title=saveState.erro; el.setAttribute('data-erro','1');
  }
}
function persist(){
  if(!S.account) return;   /* nada a salvar na tela de login */
  try{
    /* grava os espelhos de volta no personagem selecionado */
    const p=currentPersonagem();
    if(p){
      if(p.kind==='mestre'){ if(S.system) p.system=S.system; if(S.campaign) p.campaign=S.campaign; }
      else { if(S.draft) p.draft=S.draft; p.saved=S.saved; }
    }
    /* preserva outras chaves da conta (ex.: templates) ao salvar os personagens */
    const data=loadAccountData(S.account.id);
    data.personagens=S.personagens;
    saveAccountData(S.account.id, data);
    saveState.ok=true; saveState.t=new Date(); quotaWarned=false;
  }
  catch(e){
    /* Uma foto grande demais pode estourar a cota do navegador. O indicador do
       cabeçalho fica vermelho e o aviso aparece uma vez (não a cada tecla). */
    saveState.ok=false;
    saveState.erro='Falha ao salvar: '+(e&&e.message||'armazenamento indisponível')+'. Baixe um backup (💾) para não perder o trabalho.';
    if(!quotaWarned){ quotaWarned=true;
      const msg='Não foi possível salvar: o armazenamento do navegador está cheio ou bloqueado.\n\nProvável causa: fotos de personagem muito grandes. Remova alguma foto ou apague fichas salvas — e use 💾 Backup agora para não perder o que fez.';
      if(typeof uiAlert==='function') uiAlert(msg,{titulo:'Seus dados NÃO estão sendo salvos'}); else console.error(msg); }
  }
  atualizaIndicadorSalvo();
}
/* Identifica "em que tela estou". Se não mudou entre dois render(), o usuário só
   editou algo ali dentro — então a rolagem e o foco têm que ficar onde estavam. */
let _telaChave='';
function chaveDaTela(){
  return [S.account&&S.account.id, S.currentId, S.view, S.tab, S.step, (S.ui||{}).grupo, (S.ui||{}).mtab].join('|');
}
/* Guarda qual campo está focado (posição entre os campos da tela) e a seleção de texto. */
function capturaFoco(raiz){
  const a=document.activeElement;
  if(!a||!raiz.contains(a)||!/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return null;
  const todos=[...raiz.querySelectorAll('input,textarea,select')];
  const i=todos.indexOf(a); if(i<0) return null;
  let ini=null, fim=null; try{ ini=a.selectionStart; fim=a.selectionEnd; }catch(e){}
  return {i, tag:a.tagName, ini, fim};
}
function restauraFoco(raiz,f){
  if(!f) return;
  const el=[...raiz.querySelectorAll('input,textarea,select')][f.i];
  if(!el||el.tagName!==f.tag) return;
  try{ el.focus({preventScroll:true}); if(f.ini!=null&&el.setSelectionRange) el.setSelectionRange(f.ini,f.fim); }catch(e){}
}
/* Guarda a rolagem interna (painéis laterais, listas, abas) de cada elemento rolável. */
function capturaRolagem(raiz){
  const out=[], cont={};
  raiz.querySelectorAll('*').forEach(el=>{
    const k=el.tagName+'.'+(typeof el.className==='string'?el.className:''); const i=cont[k]=(cont[k]||0)+1;
    if(el.scrollTop||el.scrollLeft) out.push({k,i,t:el.scrollTop,l:el.scrollLeft});
  });
  return out;
}
function restauraRolagem(raiz,lista){
  if(!lista.length) return;
  const cont={}, mapa={}; lista.forEach(o=>mapa[o.k+'#'+o.i]=o);
  raiz.querySelectorAll('*').forEach(el=>{
    const k=el.tagName+'.'+(typeof el.className==='string'?el.className:''); const i=cont[k]=(cont[k]||0)+1;
    const o=mapa[k+'#'+i]; if(o){ el.scrollTop=o.t; el.scrollLeft=o.l; }
  });
}
function render(){
  persist();
  const r=document.getElementById('root');
  const chave=chaveDaTela(), mesma=chave===_telaChave; _telaChave=chave;
  const sx=window.scrollX, sy=window.scrollY, foco=mesma?capturaFoco(r):null, rol=mesma?capturaRolagem(r):[];
  /* Esvaziar o #root encolhe a página e o navegador joga a rolagem para o topo.
     Segurar a altura antiga durante a reconstrução evita isso. */
  if(mesma) r.style.minHeight=r.offsetHeight+'px';
  r.innerHTML='';
  try{ r.appendChild(App()); a11yPass(r); }
  catch(err){ r.style.minHeight=''; console.error(err); telaFalha(err&&err.message); return; }   /* nunca deixa a tela em branco */
  /* avisa o CSS para abrir espaço à direita quando o painel flutuante está aberto */
  document.body.classList.toggle('painel-aberto', S.view==='mestre'&&S.tab==='ficha'&&!!S.ui.sel);
  document.body.classList.toggle('live-aberto', typeof fichaVivaAberta==='function'&&fichaVivaAberta());
  fitCanvases();
  if(mesma){ restauraRolagem(r,rol); window.scrollTo(sx,sy); restauraFoco(r,foco); r.style.minHeight=''; restauraRolagem(r,rol); window.scrollTo(sx,sy); }
  else r.style.minHeight='';
}
/* Redesenha SÓ o canvas do editor, mantendo o resto da tela intacto.
   Necessário para sliders e seletores de cor: um render() completo recriaria o
   próprio controle no meio do gesto e o arrasto morreria (ver Regra Aprendida #8). */
function refreshCanvas(){
  const alvo=document.querySelector('.cv-fit');
  if(!alvo) return render();
  alvo.replaceWith(canvasNode(S.system, sampleDraft(S.system), 'edit'));
  fitCanvases(); persist();
}
/* O canvas tem largura fixa (CANVAS_W). Depois de montado, medimos o espaço real
   disponível e escalamos para caber — assim o layout do mestre é preservado
   em qualquer tela, sem rolagem horizontal. */
function fitCanvases(){
  document.querySelectorAll('.cv-fit').forEach(fit=>{
    const cv=fit.querySelector('.cv'); if(!cv) return;
    const avail=fit.clientWidth||CANVAS_W;
    /* zoom manual só vale no editor; a ficha do jogador sempre se ajusta à tela */
    const manual=cv.classList.contains('edit')&&S.ui.zoom;
    const sc=manual?S.ui.zoom:Math.min(1, avail/CANVAS_W);
    cv.style.transform='scale('+sc+')';
    cv.dataset.scale=sc;
    fit.style.height=(parseFloat(cv.dataset.h||0)*sc)+'px';
    fit.style.overflowX=(CANVAS_W*sc>avail)?'auto':'';
  });
}
let fitTimer=null;
window.addEventListener('resize',()=>{ clearTimeout(fitTimer); fitTimer=setTimeout(fitCanvases,120); });

