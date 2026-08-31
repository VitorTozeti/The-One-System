/* ============================================================ CONTAS (AUTH) ============================================================
   Sistema de contas SIMPLES e 100% LOCAL, só para teste.

   ⚠️  AVISO: a senha é guardada em TEXTO PLANO no LocalStorage. NÃO há
   criptografia, hash nem servidor. Isto simula o fluxo de login/contas para
   protótipo — não é segurança real e não deve ser usado com senhas de verdade.

   Modelo de dados no LocalStorage:
     nexus_accounts   → [ {id, name, pass, createdAt} ]
     nexus_session    → { accountId, personagemId? } | null
     nexus_acct_<id>  → { personagens: [ Personagem ] }

   Personagem = { id, kind:'mestre'|'jogador', name, createdAt,
                  // mestre:  system  (regras)
                  // jogador: draft (ficha) + saved:[fichas salvas] }
   Depende de: helpers.js (load/store/uid), example-system.js (defaultSystem/initDraft). */

/* ---------- Contas ---------- */
function listAccounts(){ return load('nexus_accounts') || []; }
function findAccount(name){
  const n=String(name||'').trim().toLowerCase();
  return listAccounts().find(a=>a.name.trim().toLowerCase()===n) || null;
}
function getAccount(id){ return listAccounts().find(a=>a.id===id) || null; }
function checkPass(acc, pass){ return !!acc && acc.pass===String(pass); }
function createAccount(name, pass){
  name=String(name||'').trim();
  if(!name) return {error:'Informe um nome de usuário.'};
  if(!String(pass)) return {error:'Informe uma senha.'};
  if(findAccount(name)) return {error:'Já existe uma conta com esse nome.'};
  const acc={ id:uid(), name, pass:String(pass), createdAt:Date.now() };
  const list=listAccounts(); list.push(acc); store('nexus_accounts', list);
  saveAccountData(acc.id, {personagens:[]});
  return {account:acc};
}

/* ---------- Sessão ---------- */
function getSession(){ return load('nexus_session'); }
function setSession(accountId, personagemId){ store('nexus_session', {accountId, personagemId:personagemId||null}); }
function clearSession(){ localStorage.removeItem('nexus_session'); }

/* ---------- Dados por conta ---------- */
function loadAccountData(id){ const d=load('nexus_acct_'+id) || {personagens:[]}; if(!d.templates) d.templates=[]; return d; }
function saveAccountData(id, data){ store('nexus_acct_'+id, data); }

/* ---------- Personagens ---------- */
function newPersonagem(kind, name, templateSystem){
  name=String(name||'').trim() || (kind==='mestre'?'Mestre':'Jogador');
  const base={ id:uid(), kind, name, createdAt:Date.now() };
  if(kind==='mestre'){
    base.system=templateSystem?JSON.parse(JSON.stringify(templateSystem)):defaultSystem();
    base.campaign=(typeof defaultCampaign==='function')?defaultCampaign():{};
  }
  else { base.draft=initDraft(defaultSystem()); base.saved=[]; }
  return base;
}

/* ---------- Migração dos dados globais antigos (roda uma vez) ----------
   Se ainda não há contas mas existem chaves antigas (nexus_system / nexus_characters),
   embrulha tudo numa "Conta local" para não perder nada. */
function migrateLegacyIfNeeded(){
  if(listAccounts().length) return;
  const oldSystem=load('nexus_system');
  const oldChars=load('nexus_characters');
  if(!oldSystem && !(oldChars && oldChars.length)) return;
  const r=createAccount('Conta local','1234'); if(r.error) return;
  const acc=r.account, personagens=[];
  if(oldSystem){ personagens.push({ id:uid(), kind:'mestre', name:'Mestre (migrado)', createdAt:Date.now(), system:oldSystem }); }
  if(oldChars && oldChars.length){
    const draft=load('nexus_draft') || initDraft(defaultSystem());
    personagens.push({ id:uid(), kind:'jogador', name:'Jogador (migrado)', createdAt:Date.now(), draft, saved:oldChars });
  }
  saveAccountData(acc.id, {personagens});
}
