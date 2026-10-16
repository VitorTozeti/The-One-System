/* ============================================================ AUTH — TELAS ============================================================
   Telas de login/cadastro e o hub "Meus personagens". UI pura: a lógica de
   dados vive em accounts.js e a de estado em state.js.
   Depende de: helpers (h), accounts.js, state.js (bindAccount/bindPersonagem/…). */

/* ---------- Fluxo ---------- */
function doLogin(name, pass){
  const acc=findAccount(name);
  if(!acc || !checkPass(acc, pass)){ S.auth.error='Usuário ou senha inválidos.'; render(); return; }
  bindAccount(acc); setSession(acc.id); S.auth={mode:'login', error:null}; render();
}
function doRegister(name, pass){
  const r=createAccount(name, pass);
  if(r.error){ S.auth.error=r.error; render(); return; }
  bindAccount(r.account); setSession(r.account.id); S.auth={mode:'login', error:null}; render();
}
function doLogout(){
  clearSession();
  S.account=null; S.personagens=[]; S.currentId=null;
  S.system=null; S.draft=null; S.saved=[]; S.auth={mode:'login', error:null};
  render();
}
function selectPersonagem(id){
  const p=S.personagens.find(x=>x.id===id); if(!p) return;
  bindPersonagem(p); setSession(S.account.id, id); render();
}
function trocarPersonagem(){
  S.currentId=null; S.system=null; S.draft=null; S.saved=[];
  setSession(S.account.id, null); render();
}
function addPersonagem(kind, name, templateSystem){
  const p=newPersonagem(kind, name, templateSystem);
  S.personagens.push(p); persist(); render();
  return p.id;
}
async function removePersonagem(id){
  const idx=S.personagens.findIndex(p=>p.id===id); if(idx<0) return;
  const alvo=S.personagens[idx];
  const ok=await uiConfirm('Excluir “'+alvo.name+'” e todos os dados dele (sistema, campanha ou fichas)?',
    {titulo:'Excluir personagem', okText:'Excluir', perigo:true});
  if(!ok) return;
  S.personagens=S.personagens.filter(p=>p.id!==id);
  if(S.currentId===id){ S.currentId=null; S.system=null; S.draft=null; S.saved=[]; setSession(S.account.id, null); }
  persist(); render();
  uiToastUndo('“'+alvo.name+'” excluído', ()=>{
    if(S.personagens.some(p=>p.id===alvo.id)) return;
    S.personagens.splice(Math.min(idx,S.personagens.length),0,alvo); persist(); render();
  }, 9000);
}
/* Cria um Mestre guiado: assistente → sistema pronto → entra direto na aba Início. */
function criarMestreGuiado(nome){
  abrirAssistenteSistema({titulo:'Criar o sistema do Mestre', nomeInicial:(nome||'').trim(), okRotulo:'✔ Criar e começar',
    aoCriar:(sys,info)=>{
      const id=addPersonagem('mestre', (nome||'').trim()||sys.campaignName, sys);
      selectPersonagem(id);
      S.mopen=['sistema']; S.tab='inicio'; render();   /* cai direto no editor, aba Início */
      showToast('Sistema criado! Siga o próximo passo em destaque.');
    }});
}

/* ---------- Tela de login / cadastro ---------- */
function loginView(){
  const cadastro = S.auth.mode==='cadastro';
  const card=h('div',{class:'auth-card'},
    h('div',{class:'auth-logo',html:'⬡ NEXUS <span>RPG</span>'}),
    h('div',{class:'auth-tag'},'Crie seu próprio sistema de RPG de mesa e jogue — tudo no seu navegador, sem instalar nada.'),
    h('div',{class:'auth-sub'}, cadastro?'Criar uma conta':'Entrar na sua conta'),
    S.auth.error ? h('div',{class:'auth-error', id:'auth-err', role:'alert'}, S.auth.error) : null,
    h('label',{class:'auth-lbl'},'Usuário'),
    h('input',{id:'auth-name', class:'auth-inp', placeholder:'seu nome de usuário', autocomplete:'username',
      'aria-invalid':S.auth.error?'true':null, 'aria-describedby':S.auth.error?'auth-err':null,
      onkeydown:(e)=>{ if(e.key==='Enter') document.getElementById('auth-pass').focus(); }}),
    h('label',{class:'auth-lbl'},'Senha'),
    h('input',{id:'auth-pass', class:'auth-inp', type:'password', placeholder:'sua senha', autocomplete:cadastro?'new-password':'current-password',
      'aria-invalid':S.auth.error?'true':null,
      onkeydown:(e)=>{ if(e.key==='Enter') submit(); }}),
    h('button',{class:'btn primary auth-go', onclick:()=>submit()}, cadastro?'Criar conta':'Entrar'),
    h('div',{class:'auth-switch'},
      cadastro?'Já tem conta? ':'Não tem conta? ',
      h('a',{href:'#', onclick:(e)=>{ e.preventDefault(); S.auth={mode:cadastro?'login':'cadastro', error:null}; render(); }},
        cadastro?'Entrar':'Criar uma conta')),
    h('div',{class:'auth-warn'},'⚠️ Protótipo local: a senha é guardada só como hash neste navegador (sem servidor) e quem usa este computador acessa os dados. Não use uma senha real.'));

  function submit(){
    const name=(document.getElementById('auth-name')||{}).value||'';
    const pass=(document.getElementById('auth-pass')||{}).value||'';
    cadastro ? doRegister(name, pass) : doLogin(name, pass);
  }
  setTimeout(()=>{ const i=document.getElementById('auth-name'); if(i&&!document.activeElement.closest('.auth-card')) try{ i.focus(); }catch(e){} },0);
  return h('div',{class:'auth-wrap'}, card);
}

/* ---------- Hub: Meus personagens ---------- */
function personagensView(){
  const primeiraVez = !S.personagens.length;

  /* Lista de personagens existentes. */
  const lista = primeiraVez ? null
    : h('div',{class:'pj-grid'}, S.personagens.map(p=>h('div',{class:'pj-card '+p.kind},
        h('div',{class:'pj-badge'}, p.kind==='mestre'?'🛠️ Mestre':'🎲 Jogador'),
        h('div',{class:'pj-name'}, p.name),
        h('div',{class:'pj-role-d'}, p.kind==='mestre'?'Editor de sistema e campanha.':'Ficha de jogador.'),
        h('div',{class:'row'},
          h('button',{class:'btn primary sm', onclick:()=>selectPersonagem(p.id)},'Entrar →'),
          h('button',{class:'btn ghost sm', onclick:()=>removePersonagem(p.id)},'Excluir')))));

  const templates=(typeof listTemplates==='function')?listTemplates():[];
  const tplSel=templates.length?h('select',{id:'pj-template', class:'auth-inp'},
    h('option',{value:''},'assistente guiado (recomendado)'),
    templates.map(t=>h('option',{value:t.id},'a partir de: '+t.nome))):null;

  /* Criação com decisão informada: cada papel explica o que faz NO ponto de
     escolha, e o botão do próprio cartão cria aquele papel. */
  function criar(kind){
    const name=(document.getElementById('pj-name')||{}).value||'';
    let tplSystem=null;
    if(kind==='mestre'){
      const tid=(document.getElementById('pj-template')||{}).value||'';
      if(tid){ const t=templates.find(x=>x.id===tid); if(t) tplSystem=t.system; }
      else return criarMestreGuiado(name);      /* sem modelo salvo → assistente */
    }
    const novoId=addPersonagem(kind, name, tplSystem);
    if(kind==='jogador' || tplSystem) selectPersonagem(novoId);   /* já entra: menos um clique */
  }

  const cartaoMestre=h('div',{class:'pj-role mestre'},
    h('div',{class:'pj-role-ic'},'🛠️'),
    h('div',{class:'pj-role-t'},'Mestre'),
    h('div',{class:'pj-role-s'},'Monta o jogo: atributos, recursos, classes, itens, ficha e campanha. Um assistente de 3 passos cria a base para você — comece por aqui se ninguém montou o sistema ainda.'),
    tplSel ? field2('Começar de', tplSel) : null,
    h('button',{class:'btn amber pj-role-go', onclick:()=>criar('mestre')},tplSel?'Criar Mestre →':'Criar sistema com assistente →'));

  const cartaoJogador=h('div',{class:'pj-role jogador'},
    h('div',{class:'pj-role-ic'},'🎲'),
    h('div',{class:'pj-role-t'},'Jogador'),
    h('div',{class:'pj-role-s'},'Cria uma ficha e joga com o sistema de exemplo já pronto. Escolha isto para experimentar rápido, sem montar regras.'),
    h('button',{class:'btn primary pj-role-go', onclick:()=>criar('jogador')},'Criar Jogador e entrar →'));

  const novo=h('div',{class:'pj-new'},
    h('div',{class:'pj-new-title'}, primeiraVez?'Crie seu primeiro personagem':'Novo personagem'),
    h('label',{class:'auth-lbl'},'Nome (opcional)'),
    h('input',{id:'pj-name', class:'auth-inp', placeholder:'ex.: Mesa de Sexta, Kael, Aria…', maxlength:'60'}),
    h('div',{class:'pj-new-sub'},'Escolha um papel — você pode ter os dois e alternar quando quiser.'),
    h('div',{class:'pj-roles'}, cartaoMestre, cartaoJogador));

  return h('div',{class:'pj-wrap'},
    h('h2',{class:'pj-h'}, primeiraVez?'Bem-vindo ao Nexus RPG' : 'Meus personagens'),
    h('div',{class:'pj-hint'}, primeiraVez
      ? 'Escolha um papel abaixo para começar. Mestre cria o sistema de regras; Jogador cria uma ficha e joga.'
      : 'Escolha um personagem para entrar, ou crie outro logo abaixo.'),
    lista,
    primeiraVez ? null : h('div',{class:'pj-aux hint'},'Já tem um backup? ',
      h('button',{class:'btn ghost sm', onclick:restaurarBackupUI},'📥 Restaurar backup')),
    novo,
    primeiraVez ? h('div',{class:'pj-aux hint'},'Já usou o Nexus em outro navegador? ',
      h('button',{class:'btn ghost sm', onclick:restaurarBackupUI},'📥 Restaurar um backup')) : null);
}

/* Pequeno rótulo + controle, para os cartões de papel. */
function field2(label, control){
  return h('div',{class:'pj-fld'}, h('span',{}, label), control);
}
