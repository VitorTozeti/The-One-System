/* ============================================================ CONTAS (AUTH) ============================================================
   Sistema de contas SIMPLES e 100% LOCAL, só para teste.

   Senha: guardada como HASH SALGADO (SHA-256 iterado), nunca em texto. Contas antigas, criadas
   quando a senha ficava em texto plano, são convertidas sozinhas no próximo login bem-sucedido.
   Continua sendo um protótipo: não há servidor, e quem tem acesso ao navegador tem acesso aos
   dados (LocalStorage) — por isso o aviso "não use senha real" permanece na tela de login.

   Modelo de dados no LocalStorage:
     nexus_accounts   → [ {id, name, salt, hash, algo, createdAt}  (legado: pass) ]
     nexus_session    → { accountId, personagemId? } | null
     nexus_acct_<id>  → { personagens: [ Personagem ] }

   Personagem = { id, kind:'mestre'|'jogador', name, createdAt,
                  // mestre:  system  (regras)
                  // jogador: draft (ficha) + saved:[fichas salvas] }
   Depende de: helpers.js (load/store/uid), example-system.js (defaultSystem/initDraft). */

/* ---------- Hash de senha (SHA-256 em JS puro: síncrono e funciona em file://) ---------- */
const _K256=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function _sha256(bytes){
  const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const l=bytes.length, n=(((l+9+63)>>6)<<6), m=new Uint8Array(n);
  m.set(bytes); m[l]=0x80;
  const bits=l*8; for(let i=0;i<8;i++) m[n-1-i]=(i<4?(bits>>>(8*i)):0)&0xff;   /* comprimento < 2^32 bits (senhas curtas) */
  const w=new Int32Array(64), ror=(x,k)=>(x>>>k)|(x<<(32-k));
  for(let o=0;o<n;o+=64){
    for(let i=0;i<16;i++) w[i]=(m[o+4*i]<<24)|(m[o+4*i+1]<<16)|(m[o+4*i+2]<<8)|m[o+4*i+3];
    for(let i=16;i<64;i++){ const a=w[i-15], b=w[i-2];
      w[i]=(w[i-16]+(ror(a,7)^ror(a,18)^(a>>>3))+w[i-7]+(ror(b,17)^ror(b,19)^(b>>>10)))|0; }
    let [a,b,c,d,e,f,g,hh]=H;
    for(let i=0;i<64;i++){
      const t1=(hh+(ror(e,6)^ror(e,11)^ror(e,25))+((e&f)^(~e&g))+_K256[i]+w[i])|0;
      const t2=((ror(a,2)^ror(a,13)^ror(a,22))+((a&b)^(a&c)^(b&c)))|0;
      hh=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
    }
    H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+c)|0; H[3]=(H[3]+d)|0; H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+hh)|0;
  }
  const out=new Uint8Array(32); for(let i=0;i<8;i++){ out[4*i]=H[i]>>>24; out[4*i+1]=(H[i]>>>16)&255; out[4*i+2]=(H[i]>>>8)&255; out[4*i+3]=H[i]&255; }
  return out;
}
const HASH_ITER=12000;
function hashSenha(pass,salt){
  const enc=new TextEncoder();
  let h=_sha256(enc.encode(salt+':'+String(pass)));
  const s=enc.encode(salt);
  for(let i=0;i<HASH_ITER;i++){ const buf=new Uint8Array(h.length+s.length); buf.set(h); buf.set(s,h.length); h=_sha256(buf); }
  return [...h].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function _igual(a,b){ a=String(a); b=String(b); if(a.length!==b.length) return false; let r=0; for(let i=0;i<a.length;i++) r|=a.charCodeAt(i)^b.charCodeAt(i); return r===0; }

/* ---------- Contas ---------- */
function listAccounts(){ return load('nexus_accounts') || []; }
function findAccount(name){
  const n=String(name||'').trim().toLowerCase();
  return listAccounts().find(a=>a.name.trim().toLowerCase()===n) || null;
}
function getAccount(id){ return listAccounts().find(a=>a.id===id) || null; }
function checkPass(acc, pass){
  if(!acc) return false;
  if(acc.hash) return _igual(hashSenha(pass,acc.salt),acc.hash);
  /* conta antiga (texto plano): confere e, se estiver certa, já converte para hash */
  if(acc.pass!=null && _igual(acc.pass,String(pass))){
    try{ const lista=listAccounts(), a=lista.find(x=>x.id===acc.id);
      if(a){ a.salt=uid()+uid(); a.hash=hashSenha(pass,a.salt); a.algo='sha256x'+HASH_ITER; delete a.pass; store('nexus_accounts',lista); } }catch(e){}
    return true;
  }
  return false;
}
function createAccount(name, pass){
  name=String(name||'').trim();
  if(!name) return {error:'Informe um nome de usuário.'};
  if(!String(pass)) return {error:'Informe uma senha.'};
  if(findAccount(name)) return {error:'Já existe uma conta com esse nome.'};
  const salt=uid()+uid();
  const acc={ id:uid(), name, salt, hash:hashSenha(pass,salt), algo:'sha256x'+HASH_ITER, createdAt:Date.now() };
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
