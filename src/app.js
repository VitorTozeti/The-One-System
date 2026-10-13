/* ============================================================ APP ============================================================ */
/* Baixa um backup JSON de TODOS os dados da conta (personagens, sistemas, campanhas). */
function backupConta(){
  if(!S.account) return;
  persist();
  downloadJSON({app:'nexus-rpg', versao:1, conta:S.account.name, exportadoEm:new Date().toISOString(), dados:loadAccountData(S.account.id)},
    'nexus-backup-'+new Date().toISOString().slice(0,10)+'.json');
  showToast('Backup baixado');
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
    h('button',{class:'btn ghost sm', title:'Baixar backup de todos os seus dados', onclick:backupConta},'💾 Backup'),
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
