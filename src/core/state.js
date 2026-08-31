/* ============================================================ ESTADO ============================================================ */
migrateLegacyIfNeeded();   /* embrulha dados globais antigos numa conta, se houver */

let S = {
  view:'mestre', tab:'inicio',
  ui:{open:{}, sel:null, stack:(window.innerWidth||1024)<640,
      modo:load('nexus_modo')||'avancado',  /* simples esconde os módulos avançados */
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
  mtab:'painel',         /* seção do dashboard do Mestre (separada de tab, do editor) */
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
    S.view='mestre'; S.tab='inicio'; S.mtab='painel';
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
  }
  catch(e){
    /* Uma foto grande demais pode estourar a cota do navegador. Avisa uma vez
       em vez de deixar a exceção subir e matar o render(). */
    if(!quotaWarned){ quotaWarned=true;
      alert('Não foi possível salvar: o armazenamento do navegador está cheio.\n\nProvável causa: fotos de personagem muito grandes. Remova alguma foto ou apague fichas salvas.'); }
  }
}
function render(){
  persist();
  const r=document.getElementById('root'); r.innerHTML=''; r.appendChild(App());
  /* avisa o CSS para abrir espaço à direita quando o painel flutuante está aberto */
  document.body.classList.toggle('painel-aberto', S.view==='mestre'&&S.tab==='ficha'&&!!S.ui.sel);
  fitCanvases();
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

