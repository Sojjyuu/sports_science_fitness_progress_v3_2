/* Shared navigation/auth presentation for all nine pages. */
(() => {
 const AUTH_KEYS=['sportsScienceCurrentUser','ssf_current_user'];

 const readCurrentUser=()=>{
  for(const key of AUTH_KEYS){
   try{
    const value=JSON.parse(localStorage.getItem(key)||'null');
    if(value) return value;
   }catch{}
  }
  return null;
 };

 const clearSession=()=>{
  if(window.SSFAPI){window.SSFAPI.clearSession();return;}
  localStorage.removeItem('ssf_token');
  AUTH_KEYS.forEach(key=>{
   localStorage.removeItem(key);
   if(typeof sessionStorage!=='undefined') sessionStorage.removeItem(key);
  });
 };

 const roleOf=user=>user?.role==='admin'||user?.role==='coach'?user.role:'member';
 const roleLabel={admin:'ผู้ดูแลระบบ',coach:'โค้ช',member:'สมาชิก'};
 const dashboardFor=user=>roleOf(user)==='admin'?'admin-dashboard.html':roleOf(user)==='coach'?'coach-dashboard.html':'dashboard.html';
 const dashboardLabel=user=>roleOf(user)==='admin'?'แดชบอร์ดผู้ดูแล':roleOf(user)==='coach'?'แดชบอร์ดโค้ช':'แดชบอร์ด';
 const MEMBER_PAGES=['dashboard.html','membership.html','appointments.html','access.html','assessment.html','profile.html'];
 const STAFF_PAGES={'admin-dashboard.html':'admin','coach-dashboard.html':'coach'};
 const go=url=>{if(typeof location.replace==='function') location.replace(url); else location.href=url;};

 const renderAuth=()=>{
  const actions=document.querySelector('.ui-auth');
  if(!actions) return;
  const user=readCurrentUser();
  const featureHeader=actions.classList.contains('ss-actions');
  if(!user){
   actions.innerHTML=featureHeader
    ? '<a class="ss-btn" href="login.html">เข้าสู่ระบบ</a><a class="ss-btn primary" href="register.html">สมัครสมาชิก</a>'
    : '<a class="btn" href="login.html">เข้าสู่ระบบ</a><a class="btn btn-primary" href="register.html">สมัครสมาชิก</a>';
   return;
  }
  const role=roleOf(user);
  const roleTag=`<span class="ui-role">${roleLabel[role]}</span>`;
  actions.innerHTML=featureHeader
   ? roleTag+`<a class="ss-btn" href="${dashboardFor(user)}">${dashboardLabel(user)}</a><button class="ss-btn primary" type="button" data-ui-logout>ออกจากระบบ</button>`
   : roleTag+`<a class="btn" href="${dashboardFor(user)}">${dashboardLabel(user)}</a><button class="btn btn-primary" type="button" data-ui-logout>ออกจากระบบ</button>`;
 };

 const enforceProtectedPage=()=>{
  const page=location.pathname.split('/').pop()||'index.html';
  const user=readCurrentUser();
  const hasToken=!!localStorage.getItem('ssf_token');
  const staffRole=STAFF_PAGES[page];
  const memberPage=MEMBER_PAGES.includes(page);
  if(!user||!hasToken){
   if(staffRole||memberPage) go('login.html');
   return;
  }
  const role=roleOf(user);
  if(staffRole&&staffRole!==role) go(dashboardFor(user));
  else if(memberPage&&role!=='member') go(dashboardFor(user));
 };

 window.SSFAuth={getCurrentUser:readCurrentUser,clearSession,renderAuth};

 document.addEventListener('click',event=>{
  const logoutButton=event.target.closest('[data-ui-logout],[data-feature-logout],[data-action="logout"],#logoutBtn');
  if(!logoutButton) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  clearSession();
  if(typeof location.replace==='function') location.replace('login.html');
  else location.href='login.html';
 },true);

 document.addEventListener('DOMContentLoaded', () => {
 const toggle=document.querySelector('.hamburger, .ss-menu');
 const nav=document.querySelector('.main-nav, .ss-nav');
 if(toggle && nav){
  nav.id='siteNavigation';
  toggle.setAttribute('aria-controls',nav.id);
  toggle.setAttribute('aria-expanded','false');
  const positionActions=()=>{
   const actions=document.querySelector('.ui-auth');
   const header=document.querySelector('header');
   if(actions && header && document.body.classList.contains('ui-menu-open')){
    actions.style.top=(nav.getBoundingClientRect().bottom-header.getBoundingClientRect().top-1)+'px';
   }
  };
  window.addEventListener('resize',positionActions);
  toggle.addEventListener('click',event=>{
   event.stopImmediatePropagation();
   const open=document.body.classList.toggle('ui-menu-open');
   toggle.setAttribute('aria-expanded',String(open));
   positionActions();
  },true);
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'){
    document.body.classList.remove('ui-menu-open');
    toggle.setAttribute('aria-expanded','false');
   }
  });
 }
 renderAuth();
 enforceProtectedPage();
 if(document.body.classList.contains('feature-page')){
  document.querySelector('.newsletter')?.addEventListener('submit',event=>{
   event.preventDefault();
   const input=event.currentTarget.querySelector('input');
   if(input.value.trim()){alert('ขอบคุณสำหรับการติดตามข่าวสาร');input.value='';}
  });
 }
 });

 window.addEventListener('pageshow',()=>{
  renderAuth();
  enforceProtectedPage();
 });

 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){
   renderAuth();
   enforceProtectedPage();
  }
 });
})();
