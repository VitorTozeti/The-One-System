/* ============================================================ APP ============================================================ */
/* Baixa um backup JSON de TODOS os dados da conta (personagens, sistemas, campanhas). */
function backupConta(){
  if(!S.account) return;
  persist();
  downloadJSON({app:'nexus-rpg', versao:1, conta:S.account.name, exportadoEm:new Date().toISOString(), dados:loadAccountData(S.account.id)},
    'nexus-backup-'+new Date().toISOString().slice(0,10)+'.json');
  showToast('Backup baixado');
}
/* ---------- Restaurar backup ----------
   Valida o arquivo gerado por backupConta(): formato, tamanho, tipos; migra cada
   sistema de Mestre; descarta o que estiver corrompido (e conta quantos). */
function validarBackup(o){
  if(!o || typeof o!=='object' || Array.isArray(o) || o.app!=='nexus-rpg')
    return {erro:'Este arquivo não é um backup do Nexus RPG (use o botão 💾 Backup para gerar um).'};
  if(typeof o.versao==='number' && o.versao>1) return {erro:'Este backup é de uma versão mais nova do Nexus. Atualize o app para restaurá-lo.'};
  const d=o.dados;
  if(!d || typeof d!=='object' || !Array.isArray(d.personagens)) return {erro:'O backup está incompleto (sem a lista de personagens).'};
  const ok=[]; let descartados=0; const ids=new Set();
  d.personagens.forEach(p=>{
    if(!p || typeof p!=='object' || (p.kind!=='mestre'&&p.kind!=='jogador')){ descartados++; return; }
    const q={id:(typeof p.id==='string'&&p.id&&!ids.has(p.id))?p.id:uid(), kind:p.kind,
      name:String(p.name||(p.kind==='mestre'?'Mestre':'Jogador')).slice(0,60), createdAt:+p.createdAt||Date.now()};
    ids.add(q.id);
    if(p.kind==='mestre'){
      const sys=migrateSystem(p.system);
      if(!sys){ descartados++; return; }
      q.system=sys;
      q.campaign=(typeof sanitizeCampaign==='function')?sanitizeCampaign(p.campaign):(p.campaign||{});
    } else {
      q.draft=sanitizeDraft(p.draft,defaultSystem());
      q.saved=Array.isArray(p.saved)?p.saved:[];
    }
    ok.push(q);
  });
  const templates=(Array.isArray(d.templates)?d.templates:[]).filter(t=>t&&typeof t==='object'&&typeof t.id==='string'&&typeof t.nome==='string'&&migrateSystem(t.system))
    .map(t=>({id:t.id,nome:t.nome.slice(0,60),system:migrateSystem(t.system)}));
  return {personagens:ok, templates, descartados, conta:String(o.conta||''), data:o.exportadoEm||''};
}
function restaurarBackupUI(){
  if(!S.account) return;
  const inp=h('input',{type:'file',accept:'.json,application/json',style:{display:'none'}});
  inp.addEventListener('change',async()=>{
    const f=inp.files[0]; inp.remove(); if(!f) return;
    let txt; try{ txt=await lerArquivoTexto(f); }catch(e){ return uiAlert(e.message,{titulo:'Não foi possível restaurar'}); }
    let o; try{ o=lerJSONSeguro(txt); }catch(e){ return uiAlert('O arquivo não é um JSON válido — talvez esteja incompleto ou corrompido.',{titulo:'Não foi possível restaurar'}); }
    const r=validarBackup(o);
    if(r.erro) return uiAlert(r.erro,{titulo:'Não foi possível restaurar'});
    if(!r.personagens.length) return uiAlert('O backup não tem nenhum personagem aproveitável.'+(r.descartados?' ('+r.descartados+' item(ns) estavam corrompidos.)':''),{titulo:'Backup vazio'});
    const quando=r.data?new Date(r.data).toLocaleString('pt-BR'):'data desconhecida';
    const msg='Backup de “'+(r.conta||'?')+'” feito em '+quando+'.\n'+
      r.personagens.length+' personagem(ns) ('+r.personagens.filter(p=>p.kind==='mestre').length+' Mestre, '+r.personagens.filter(p=>p.kind==='jogador').length+' Jogador)'+
      (r.descartados?'\n⚠ '+r.descartados+' item(ns) corrompido(s) serão ignorados.':'')+
      '\n\nVocê tem '+S.personagens.length+' personagem(ns) agora. O que fazer?';
    const esc=await uiChoice(msg,[
      {rot:'➕ Mesclar (manter os atuais e adicionar)',valor:'mesclar',tipo:'primary',padrao:true},
      {rot:'♻ Substituir tudo',valor:'substituir',tipo:'danger'},
      {rot:'Cancelar',valor:null,tipo:'ghost'}],{titulo:'Restaurar backup'});
    if(!esc) return;
    persist();
    const antesP=JSON.stringify(S.personagens), antesT=JSON.stringify(loadAccountData(S.account.id).templates||[]);
    const data=loadAccountData(S.account.id);
    if(esc==='substituir'){ S.personagens=r.personagens; data.templates=r.templates; }
    else {
      const tem=new Set(S.personagens.map(p=>p.id));
      r.personagens.forEach(p=>{ if(tem.has(p.id)){ p.id=uid(); p.name=(p.name+' (restaurado)').slice(0,70); } S.personagens.push(p); });
      const tt=new Set((data.templates||[]).map(t=>t.id));
      data.templates=(data.templates||[]).concat(r.templates.filter(t=>!tt.has(t.id)));
    }
    data.personagens=S.personagens;
    S.currentId=null; S.system=null; S.draft=null; S.saved=[]; S.campaign=null; setSession(S.account.id,null);
    try{ saveAccountData(S.account.id,data); }catch(e){ S.personagens=JSON.parse(antesP); return uiAlert('Não foi possível gravar a restauração (armazenamento cheio). Nada foi alterado.',{titulo:'Falha ao salvar'}); }
    render();
    uiToastUndo('Backup restaurado ('+r.personagens.length+' personagem(ns))',()=>{
      S.personagens=JSON.parse(antesP); const d2=loadAccountData(S.account.id); d2.personagens=S.personagens; d2.templates=JSON.parse(antesT);
      S.currentId=null; S.system=null; S.draft=null; S.campaign=null; setSession(S.account.id,null);
      try{ saveAccountData(S.account.id,d2); }catch(e){} render();
    },10000);
  });
  document.body.appendChild(inp); inp.click();
}
/* Tela de emergência quando o desenho da interface falha: oferece backup e recarregar. */
function telaFalha(msg){
  const r=document.getElementById('root'); if(!r) return;
  r.innerHTML='';
  r.appendChild(h('div',{class:'falha', role:'alert'},
    h('h2',{},'⚠️ Algo deu errado'),
    h('p',{},'O Nexus RPG não conseguiu desenhar a tela. Seus dados continuam salvos no navegador — baixe um backup por segurança e recarregue a página.'),
    h('p',{class:'hint'}, String(msg||'')),
    h('div',{class:'row'},
      S.account?h('button',{class:'btn primary', onclick:backupConta},'💾 Baixar backup'):null,
      h('button',{class:'btn', onclick:()=>location.reload()},'↻ Recarregar'))));
}
function App(){
  /* Gate de acesso:
     1) sem conta logada        → tela de login/cadastro
     2) logado, sem personagem  → hub "Meus personagens"
     3) com personagem          → Mestre ou Jogador conforme o tipo (kind) */
  if(!S.account) return h('div',{}, loginView(), S.toast?h('div',{class:'toast'},S.toast):null);

  const p=currentPersonagem();
  const logo=h('div',{class:'row'}, h('span',{style:{fontSize:'20px'}},'⬡'),
    h('div',{class:'logo',html:'NEXUS <span>RPG</span><small>protótipo</small>'}));
  /* Só um personagem MESTRE pode alternar para o preview de jogador ("Testar
     como jogador"). Um personagem JOGADOR fica travado na ficha — sem acesso
     ao editor (isolamento). */
  const preview = p && p.kind==='mestre' ?
    h('div',{class:'toggle'},
      h('button',{class:S.view!=='jogador'?'on-m':'', onclick:()=>{S.view='mestre';render();}},'🛠️ Editor'),
      h('button',{class:S.view==='jogador'?'on-j':'', onclick:()=>{if(!S.draft)S.draft=initDraft(S.system);S.view='jogador';render();}},'🎲 Testar')) : null;

  const contaInfo=h('div',{class:'row conta-info'},
    preview,
    h('span',{class:'conta-nome'}, '👤 '+S.account.name),
    p ? h('span',{class:'conta-pj '+p.kind}, (p.kind==='mestre'?'🛠️ ':'🎲 ')+p.name) : null,
    p ? h('button',{class:'btn ghost sm', onclick:trocarPersonagem},'↺ Trocar') : null,
    h('span',{id:'save-ind', class:'save-ind '+(saveState.ok?'ok':'erro'), role:'status', 'aria-live':'polite',
      title:saveState.ok?('Salvo no navegador'+(saveState.t?' às '+saveState.t.toTimeString().slice(0,5):'')):saveState.erro},
      saveState.ok?'✔ salvo':'⚠ NÃO salvo'),
    h('button',{class:'btn ghost sm', title:'Baixar backup de todos os seus dados', onclick:backupConta},'💾 Backup'),
    h('button',{class:'btn ghost sm', title:'Restaurar um backup (.json) baixado antes', onclick:restaurarBackupUI},'📥 Restaurar'),
    h('button',{class:'btn ghost sm', onclick:doLogout},'⎋ Sair'));
  const header=h('header',{class:'top'}, h('div',{class:'bar'}, logo, contaInfo));

  let content;
  if(!p) content=personagensView();                          /* hub */
  else if(p.kind==='jogador') content=jogadorView();         /* jogador travado na ficha */
  else content=(S.view==='jogador') ? jogadorView() : mestreDashboard();  /* mestre: dashboard ou preview */

  const main=h('main',{id:'conteudo', tabindex:'-1'}, content);
  const foot=h('footer',{},'Nexus RPG — protótipo local • dados salvos no seu navegador (LocalStorage)');
  const app=h('div',{}, h('a',{class:'skip', href:'#conteudo'},'Pular para o conteúdo'), header, main, foot);
  if(S.toast) app.appendChild(h('div',{class:'toast', role:'status', 'aria-live':'polite'},S.toast));
  return app;
}
render();
