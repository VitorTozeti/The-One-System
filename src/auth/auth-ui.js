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
  S.personagens.push(newPersonagem(kind, name, templateSystem)); persist(); render();
}
function removePersonagem(id){
  if(!confirm('Excluir este personagem e seus dados? Não dá para desfazer.')) return;
  S.personagens=S.personagens.filter(p=>p.id!==id);
  if(S.currentId===id){ S.currentId=null; S.system=null; S.draft=null; S.saved=[]; setSession(S.account.id, null); }
  persist(); render();
}

/* ---------- Tela de login / cadastro ---------- */
function loginView(){
  const cadastro = S.auth.mode==='cadastro';
  const card=h('div',{class:'auth-card'},
    h('div',{class:'auth-logo',html:'⬡ NEXUS <span>RPG</span>'}),
    h('div',{class:'auth-sub'}, cadastro?'Criar uma conta':'Entrar na sua conta'),
    S.auth.error ? h('div',{class:'auth-error'}, S.auth.error) : null,
    h('label',{class:'auth-lbl'},'Usuário'),
    h('input',{id:'auth-name', class:'auth-inp', placeholder:'seu nome de usuário',
      onkeydown:(e)=>{ if(e.key==='Enter') document.getElementById('auth-pass').focus(); }}),
    h('label',{class:'auth-lbl'},'Senha'),
    h('input',{id:'auth-pass', class:'auth-inp', type:'password', placeholder:'sua senha',
      onkeydown:(e)=>{ if(e.key==='Enter') submit(); }}),
    h('button',{class:'btn primary auth-go', onclick:()=>submit()}, cadastro?'Criar conta':'Entrar'),
    h('div',{class:'auth-switch'},
      cadastro?'Já tem conta? ':'Não tem conta? ',
      h('a',{href:'#', onclick:(e)=>{ e.preventDefault(); S.auth={mode:cadastro?'login':'cadastro', error:null}; render(); }},
        cadastro?'Entrar':'Criar uma conta')),
    h('div',{class:'auth-warn'},'⚠️ Protótipo de teste: a senha é salva sem criptografia no seu navegador. Não use uma senha real.'));

  function submit(){
    const name=(document.getElementById('auth-name')||{}).value||'';
    const pass=(document.getElementById('auth-pass')||{}).value||'';
    cadastro ? doRegister(name, pass) : doLogin(name, pass);
  }
  return h('div',{class:'auth-wrap'}, card);
}

/* ---------- Hub: Meus personagens ---------- */
function personagensView(){
  const lista=S.personagens.length
    ? h('div',{class:'pj-grid'}, S.personagens.map(p=>h('div',{class:'pj-card '+p.kind},
        h('div',{class:'pj-badge'}, p.kind==='mestre'?'🛠️ Mestre':'🎲 Jogador'),
        h('div',{class:'pj-name'}, p.name),
        h('div',{class:'row'},
          h('button',{class:'btn primary sm', onclick:()=>selectPersonagem(p.id)},'Entrar'),
          h('button',{class:'btn ghost sm', onclick:()=>removePersonagem(p.id)},'Excluir')))))
    : h('div',{class:'pj-empty'},'Nenhum personagem ainda. Crie um Mestre (para montar o sistema) ou um Jogador (para criar uma ficha).');

  const templates=(typeof listTemplates==='function')?listTemplates():[];
  const tplSel=templates.length?h('select',{id:'pj-template', class:'auth-inp', style:{maxWidth:'200px'}},
    h('option',{value:''},'Mestre: sistema em branco'),
    templates.map(t=>h('option',{value:t.id},'a partir de: '+t.nome))):null;

  const novo=h('div',{class:'pj-new'},
    h('div',{class:'pj-new-title'},'Novo personagem'),
    h('div',{class:'row'},
      h('input',{id:'pj-name', class:'auth-inp', placeholder:'nome do personagem', style:{flex:'1'}}),
      tplSel,
      h('button',{class:'btn amber', onclick:()=>criar('mestre')},'🛠️ Mestre'),
      h('button',{class:'btn primary', onclick:()=>criar('jogador')},'🎲 Jogador')));

  function criar(kind){
    const name=(document.getElementById('pj-name')||{}).value||'';
    let tplSystem=null;
    if(kind==='mestre'){
      const tid=(document.getElementById('pj-template')||{}).value||'';
      if(tid){ const t=templates.find(x=>x.id===tid); if(t) tplSystem=t.system; }
    }
    addPersonagem(kind, name, tplSystem);
  }
  return h('div',{class:'pj-wrap'},
    h('h2',{class:'pj-h'},'Meus personagens'),
    h('div',{class:'pj-hint'},'Escolha um personagem para entrar. Personagem Mestre abre o editor de sistema; Jogador abre a ficha.'),
    lista, novo);
}
