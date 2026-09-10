/* Shared navigation/auth presentation for all nine pages. */
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
 const actions=document.querySelector('.ui-auth');
 let user=null;
 try{user=JSON.parse(localStorage.getItem('sportsScienceCurrentUser')||'null');}catch{}
 if(actions){
  actions.innerHTML=user
   ? '<a class="btn" href="dashboard.html">แดชบอร์ด</a><button class="btn btn-primary" type="button" data-ui-logout>ออกจากระบบ</button>'
   : '<a class="btn" href="login.html">เข้าสู่ระบบ</a><a class="btn btn-primary" href="register.html">สมัครสมาชิก</a>';
  actions.querySelector('[data-ui-logout]')?.addEventListener('click',()=>{
   localStorage.removeItem('sportsScienceCurrentUser');
   localStorage.removeItem('ssf_current_user');
   window.location.href='login.html';
  });
 }
 if(document.body.classList.contains('feature-page')){
  document.querySelector('.newsletter')?.addEventListener('submit',event=>{
   event.preventDefault();
   const input=event.currentTarget.querySelector('input');
   if(input.value.trim()){alert('ขอบคุณสำหรับการติดตามข่าวสาร');input.value='';}
  });
 }
});
