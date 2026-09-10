/* Sports Science Fitness Club — trainer, health and package demo features */
(() => {
  'use strict';

  const KEYS = {
    member: 'sportsScienceMember',
    currentUser: 'sportsScienceCurrentUser',
    healthProfiles: 'sportsScienceHealthProfiles',
    selectedTrainer: 'sportsScienceSelectedTrainer',
    selectedPackage: 'sportsScienceSelectedPackage',
    googleConfig: 'sportsScienceGoogleOAuthConfig'
  };

  const TRAINERS = [
    {
      id: 'coach-narin',
      name: 'โค้ชนรินทร์ วัฒนชัย',
      initials: 'NR',
      gender: 'male',
      role: 'Strength & Conditioning Coach',
      experience: 8,
      rating: 4.9,
      specialties: ['strength', 'muscle'],
      goals: ['muscle-gain', 'general'],
      tags: ['เพิ่มกล้ามเนื้อ', 'เวทเทรนนิ่ง', 'ปรับท่าฝึก'],
      bio: 'เชี่ยวชาญการสร้างพื้นฐานความแข็งแรงและเพิ่มมวลกล้ามเนื้ออย่างเป็นระบบ เหมาะทั้งผู้เริ่มต้นและผู้ที่ต้องการยกระดับสมรรถภาพ',
      certifications: ['Certified Personal Trainer (CPT)', 'Strength & Conditioning Fundamentals', 'ปฐมพยาบาลและ CPR'],
      schedule: ['จ. 16:00–20:00', 'อ. 16:00–20:00', 'พฤ. 16:00–20:00', 'ส. 09:00–15:00'],
      color: 'linear-gradient(135deg, #075bd8, #05265c)'
    },
    {
      id: 'coach-pim',
      name: 'โค้ชพิมพ์ชนก ศรีสุข',
      initials: 'PM',
      gender: 'female',
      role: 'Weight Management Coach',
      experience: 6,
      rating: 4.8,
      specialties: ['fat-loss', 'nutrition'],
      goals: ['weight-loss', 'general'],
      tags: ['ลดไขมัน', 'คาร์ดิโอ', 'โภชนาการ'],
      bio: 'ดูแลโปรแกรมลดไขมันควบคู่การปรับพฤติกรรม เน้นแผนที่ทำตามได้จริงและติดตามผลอย่างสม่ำเสมอโดยไม่หักโหม',
      certifications: ['Weight Management Specialist', 'Nutrition for Exercise', 'ปฐมพยาบาลและ CPR'],
      schedule: ['จ. 09:00–15:00', 'พ. 09:00–18:00', 'ศ. 09:00–18:00', 'ส. 10:00–16:00'],
      color: 'linear-gradient(135deg, #12a6c9, #0750a4)'
    },
    {
      id: 'coach-ton',
      name: 'โค้ชธนกฤต ภูผา',
      initials: 'TN',
      gender: 'male',
      role: 'Athletic Performance Coach',
      experience: 10,
      rating: 4.9,
      specialties: ['sport', 'strength'],
      goals: ['performance', 'muscle-gain'],
      tags: ['กีฬาเฉพาะทาง', 'ความเร็ว', 'ความแข็งแรง'],
      bio: 'ออกแบบโปรแกรมพัฒนาความเร็ว พลัง และความคล่องตัวสำหรับนักกีฬา รวมถึงผู้ที่ต้องการฝึกแบบ Athletic Performance',
      certifications: ['Sports Performance Coach', 'Speed & Agility Training', 'ปฐมพยาบาลและ CPR'],
      schedule: ['อ. 10:00–18:00', 'พ. 12:00–20:00', 'พฤ. 10:00–18:00', 'ส. 08:00–13:00'],
      color: 'linear-gradient(135deg, #5126a8, #075bd8)'
    },
    {
      id: 'coach-may',
      name: 'โค้ชเมธาวี อินทร์แก้ว',
      initials: 'MY',
      gender: 'female',
      role: 'Mobility & Corrective Exercise',
      experience: 7,
      rating: 4.8,
      specialties: ['mobility', 'rehab'],
      goals: ['rehabilitation', 'general'],
      tags: ['ยืดเหยียด', 'แก้ออฟฟิศซินโดรม', 'ฟื้นฟูการเคลื่อนไหว'],
      bio: 'เน้นคุณภาพการเคลื่อนไหว ความยืดหยุ่น และการฝึกแก้ไขท่าทาง เหมาะกับผู้เริ่มต้นหรือผู้ที่ต้องการกลับมาออกกำลังกายอย่างปลอดภัย',
      certifications: ['Corrective Exercise Specialist', 'Mobility Fundamentals', 'ปฐมพยาบาลและ CPR'],
      schedule: ['จ. 10:00–18:00', 'อ. 12:00–20:00', 'พฤ. 09:00–17:00', 'ศ. 10:00–18:00'],
      color: 'linear-gradient(135deg, #04a878, #087ca7)'
    },
    {
      id: 'coach-beam',
      name: 'โค้ชบีม ปารมีชัย',
      initials: 'BM',
      gender: 'male',
      role: 'Functional Training Coach',
      experience: 5,
      rating: 4.7,
      specialties: ['functional', 'fat-loss'],
      goals: ['weight-loss', 'performance', 'general'],
      tags: ['Functional', 'ลดไขมัน', 'Circuit Training'],
      bio: 'โปรแกรมสนุก กระชับ และปรับระดับได้ ช่วยพัฒนาความฟิตทั่วร่างกาย เหมาะกับคนที่ไม่ชอบการฝึกแบบเดิม ๆ',
      certifications: ['Functional Training Specialist', 'Group Exercise Leader', 'ปฐมพยาบาลและ CPR'],
      schedule: ['จ. 14:00–20:00', 'พ. 14:00–20:00', 'ศ. 14:00–20:00', 'ส. 09:00–14:00'],
      color: 'linear-gradient(135deg, #f08025, #bd3c59)'
    },
    {
      id: 'coach-fah',
      name: 'โค้ชฟ้า ณัฐกานต์',
      initials: 'FA',
      gender: 'female',
      role: 'Beginner Fitness Coach',
      experience: 4,
      rating: 4.8,
      specialties: ['beginner', 'functional'],
      goals: ['general', 'weight-loss'],
      tags: ['ผู้เริ่มต้น', 'สุขภาพทั่วไป', 'สร้างนิสัย'],
      bio: 'ดูแลผู้เริ่มต้นอย่างใกล้ชิด สอนใช้อุปกรณ์และวางแผนการฝึกทีละขั้น เพื่อสร้างความมั่นใจและนิสัยออกกำลังกายในระยะยาว',
      certifications: ['Certified Personal Trainer (CPT)', 'Behavior Change Basics', 'ปฐมพยาบาลและ CPR'],
      schedule: ['อ. 08:00–16:00', 'พ. 08:00–16:00', 'พฤ. 12:00–20:00', 'ส. 09:00–16:00'],
      color: 'linear-gradient(135deg, #e45b94, #6546c7)'
    }
  ];

  const FITNESS_PACKAGES = [
    { id: '1m', label: 'เริ่มต้น', name: 'Fitness 1 เดือน', price: 300, unit: '/ เดือน', featured: false, features: ['เข้าใช้ฟิตเนสตามเวลาเปิดบริการ', 'ประเมินสมรรถภาพเบื้องต้น 1 ครั้ง', 'บันทึกการเข้าใช้ผ่าน Dashboard'] },
    { id: '3m', label: 'ยอดนิยม', name: 'Fitness 3 เดือน', price: 750, unit: '/ 3 เดือน', featured: true, features: ['สิทธิ์ทั้งหมดจากแพ็กเกจ 1 เดือน', 'ติดตามผลรายเดือน', 'ประหยัดกว่ารายเดือน 150 บาท'] },
    { id: '6m', label: 'ต่อเนื่อง', name: 'Fitness 6 เดือน', price: 1400, unit: '/ 6 เดือน', featured: false, features: ['สิทธิ์ทั้งหมดจากแพ็กเกจ 3 เดือน', 'ประเมินสมรรถภาพซ้ำ 2 ครั้ง', 'เหมาะสำหรับแผนระยะกลาง'] },
    { id: '1y', label: 'คุ้มที่สุด', name: 'Fitness 1 ปี', price: 2500, unit: '/ ปี', featured: false, features: ['เข้าใช้ฟิตเนสตลอด 12 เดือน', 'ติดตามผลและประเมินสมรรถภาพ', 'ราคาต่อเดือนคุ้มที่สุด'] }
  ];

  const TRAINER_PACKAGES = [
    { id: 'pt1', label: 'ทดลอง', name: 'Personal Training 1 ครั้ง', price: 350, unit: '/ ครั้ง', featured: false, features: ['ฝึกส่วนตัว 60 นาที', 'ประเมินเป้าหมายก่อนเริ่ม', 'คำแนะนำหลังการฝึก'] },
    { id: 'pt4', label: 'แนะนำ', name: 'Personal Training 4 ครั้ง', price: 1200, unit: '/ แพ็กเกจ', featured: true, features: ['ฝึกส่วนตัว 4 ครั้ง', 'วางโปรแกรมตามเป้าหมาย', 'ติดตามผลตลอดแพ็กเกจ'] },
    { id: 'pt8', label: 'จริงจัง', name: 'Personal Training 8 ครั้ง', price: 2200, unit: '/ แพ็กเกจ', featured: false, features: ['ฝึกส่วนตัว 8 ครั้ง', 'ปรับโปรแกรมตามความก้าวหน้า', 'สรุปผลเมื่อจบแพ็กเกจ'] }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const formatBaht = value => new Intl.NumberFormat('th-TH').format(value) + ' ฿';

  function getCurrentUser() {
    return readJSON(KEYS.currentUser, null);
  }

  function updateCurrentUser(changes) {
    const current = getCurrentUser();
    if (!current) return null;
    const next = { ...current, ...changes };
    writeJSON(KEYS.currentUser, next);
    const member = readJSON(KEYS.member, null);
    if (member && (!member.email || !next.email || member.email === next.email)) writeJSON(KEYS.member, { ...member, ...changes });
    return next;
  }

  function getProfile() {
    const user = getCurrentUser();
    const profiles = readJSON(KEYS.healthProfiles, {});
    return profiles[user?.email || 'demo@sportscience.local'] || null;
  }

  function showMessage(element, message, type = 'info') {
    if (!element) return;
    element.className = `status-message show ${type}`;
    element.textContent = message;
  }

  function initSharedNavigation() {
    const menu = $('[data-ss-menu]');
    if (menu) menu.addEventListener('click', () => document.body.classList.toggle('ss-menu-open'));
    $$('.ss-nav a, .ss-actions a').forEach(link => link.addEventListener('click', () => document.body.classList.remove('ss-menu-open')));
    const auth = $('[data-ss-auth-actions]');
    const user = getCurrentUser();
    if (auth && user) {
      auth.innerHTML = `<a class="ss-btn" href="dashboard.html">แดชบอร์ด</a><button class="ss-btn primary" type="button" data-feature-logout>ออกจากระบบ</button>`;
    }
    $$('[data-feature-logout]').forEach(button => button.addEventListener('click', () => {
      localStorage.removeItem(KEYS.currentUser);
      localStorage.removeItem('ssf_current_user');
      window.location.href = 'login.html';
    }));
  }

  function setGoogleStatus(status, type, message) {
    if (!status) return;
    status.className = status.id === 'loginStatus' ? `status-box ${type}` : `status-message show ${type}`;
    status.textContent = message;
  }

  function completeGoogleLogin(profile, demo = false) {
    const googleUser = {
      name: profile.name || 'สมาชิก Google',
      fullName: profile.name || 'สมาชิก Google',
      studentId: demo ? 'GOOGLE-DEMO' : `GOOGLE-${String(profile.sub || '').slice(-6).toUpperCase()}`,
      email: profile.email || 'google.demo@sportscience.local',
      phone: '-',
      plan: '3m',
      planLabel: '3 เดือน / 750 ฿',
      picture: profile.picture || '',
      provider: 'google',
      createdAt: new Date().toISOString()
    };
    writeJSON(KEYS.member, googleUser);
    writeJSON(KEYS.currentUser, { ...googleUser, loggedInAt: new Date().toISOString() });
    return googleUser;
  }

  function decodeGoogleCredential(credential) {
    const payload = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = decodeURIComponent(atob(payload).split('').map(character => `%${(`00${character.charCodeAt(0).toString(16)}`).slice(-2)}`).join(''));
    return JSON.parse(decoded);
  }

  function initGoogleLogin() {
    $$('[data-google-login]').forEach(button => button.addEventListener('click', () => {
      const status = $('#loginStatus') || $('[data-google-status]');
      const clientId = String(window.SSF_GOOGLE_CLIENT_ID || '').trim();
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');

      if (!clientId) {
        button.innerHTML = '<span class="google-mark">G</span>กำลังเชื่อมต่อบัญชีตัวอย่าง...';
        window.setTimeout(() => {
          completeGoogleLogin({ name: 'สมาชิก Google Demo', email: 'google.demo@sportscience.local' }, true);
          setGoogleStatus(status, 'success', 'เข้าสู่ระบบด้วย Google (โหมดสาธิต) สำเร็จ กำลังไปกรอกข้อมูลสุขภาพ...');
          window.setTimeout(() => { window.location.href = 'health-profile.html?welcome=google'; }, 650);
        }, 650);
        return;
      }

      button.innerHTML = '<span class="google-mark">G</span>กำลังเปิด Google OAuth...';
      const startOAuth = () => {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: response => {
            try {
              completeGoogleLogin(decodeGoogleCredential(response.credential));
              setGoogleStatus(status, 'success', 'เข้าสู่ระบบด้วย Google สำเร็จ กำลังไปกรอกข้อมูลสุขภาพ...');
              window.setTimeout(() => { window.location.href = 'health-profile.html?welcome=google'; }, 500);
            } catch {
              button.disabled = false;
              setGoogleStatus(status, 'error', 'ไม่สามารถอ่านข้อมูลบัญชี Google ได้ กรุณาลองใหม่');
            }
          }
        });
        window.google.accounts.id.prompt(notification => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            button.disabled = false;
            button.removeAttribute('aria-busy');
            button.innerHTML = '<span class="google-mark">G</span>เข้าสู่ระบบด้วย Google';
            setGoogleStatus(status, 'error', 'Google OAuth ไม่สามารถเปิดได้ กรุณาตรวจสอบ Client ID และ Authorized JavaScript Origin');
          }
        });
      };
      if (window.google?.accounts?.id) startOAuth();
      else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = startOAuth;
        script.onerror = () => {
          button.disabled = false;
          setGoogleStatus(status, 'error', 'โหลด Google Identity Services ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต');
        };
        document.head.appendChild(script);
      }
    }));
  }

  function trainerScore(trainer, profile) {
    if (!profile) return 0;
    let score = trainer.goals.includes(profile.goal) ? 4 : 0;
    if (profile.goal === 'weight-loss' && trainer.specialties.includes('fat-loss')) score += 2;
    if (profile.goal === 'muscle-gain' && trainer.specialties.includes('muscle')) score += 2;
    if (profile.goal === 'rehabilitation' && trainer.specialties.includes('rehab')) score += 2;
    if (profile.experienceLevel === 'beginner' && trainer.specialties.includes('beginner')) score += 2;
    return score;
  }

  function trainerCard(trainer, recommended = false) {
    return `
      <article class="trainer-card${recommended ? ' recommended' : ''}" data-trainer-card="${trainer.id}">
        <div class="trainer-cover" style="--trainer-bg:${trainer.color}">
          <span class="match-pill">✓ เหมาะกับเป้าหมายคุณ</span>
          <div class="trainer-avatar" aria-hidden="true">${escapeHTML(trainer.initials)}</div>
        </div>
        <div class="trainer-card-body">
          <div class="trainer-meta"><span>ประสบการณ์ ${trainer.experience} ปี</span><span>★ ${trainer.rating}</span></div>
          <h3>${escapeHTML(trainer.name)}</h3>
          <div class="trainer-role">${escapeHTML(trainer.role)}</div>
          <div class="tag-list">${trainer.tags.slice(0, 3).map(tag => `<span class="ss-tag">${escapeHTML(tag)}</span>`).join('')}</div>
          <div class="trainer-actions">
            <a class="ss-btn soft wide" href="trainer-detail.html?id=${trainer.id}">ดูโปรไฟล์</a>
            <button class="ss-btn primary small" type="button" data-select-trainer="${trainer.id}">เลือก</button>
          </div>
        </div>
      </article>`;
  }

  function initTrainerList() {
    const grid = $('#trainerGrid');
    if (!grid) return;
    const search = $('#trainerSearch');
    const specialty = $('#specialtyFilter');
    const goal = $('#goalFilter');
    const gender = $('#genderFilter');
    const reset = $('#resetFilters');
    const count = $('#trainerCount');
    const profile = getProfile();
    const recommendBanner = $('#recommendBanner');

    if (profile && recommendBanner) {
      recommendBanner.classList.add('show');
      const goalLabel = ({ 'weight-loss': 'ลดไขมัน', 'muscle-gain': 'เพิ่มกล้ามเนื้อ', 'general': 'ดูแลสุขภาพ', 'performance': 'พัฒนาสมรรถภาพ', 'rehabilitation': 'ฟื้นฟูการเคลื่อนไหว' })[profile.goal] || 'ของคุณ';
      $('[data-recommend-copy]', recommendBanner).textContent = `ระบบเรียงเทรนเนอร์ที่เหมาะกับเป้าหมาย “${goalLabel}” ไว้ก่อนแล้ว`;
    }

    const queryGoal = new URLSearchParams(window.location.search).get('goal');
    if (queryGoal && [...goal.options].some(option => option.value === queryGoal)) goal.value = queryGoal;
    else if (profile?.goal) goal.value = profile.goal;

    const render = () => {
      const term = search.value.trim().toLowerCase();
      const result = TRAINERS
        .map(trainer => ({ trainer, score: trainerScore(trainer, profile) }))
        .filter(({ trainer }) => !term || `${trainer.name} ${trainer.role} ${trainer.tags.join(' ')}`.toLowerCase().includes(term))
        .filter(({ trainer }) => !specialty.value || trainer.specialties.includes(specialty.value))
        .filter(({ trainer }) => !goal.value || trainer.goals.includes(goal.value))
        .filter(({ trainer }) => !gender.value || trainer.gender === gender.value)
        .sort((a, b) => b.score - a.score || b.rating - a.rating);
      count.textContent = `${result.length} คน`;
      grid.innerHTML = result.length ? result.map(({ trainer, score }) => trainerCard(trainer, score >= 4)).join('') : '<div class="surface empty-filter"><strong>ไม่พบเทรนเนอร์ที่ตรงกับตัวกรอง</strong><br>ลองเปลี่ยนเงื่อนไขหรือกดล้างตัวกรอง</div>';
    };

    [search, specialty, goal, gender].forEach(input => input.addEventListener(input === search ? 'input' : 'change', render));
    reset.addEventListener('click', () => { search.value = ''; specialty.value = ''; goal.value = ''; gender.value = ''; render(); });
    grid.addEventListener('click', event => {
      const button = event.target.closest('[data-select-trainer]');
      if (!button) return;
      const trainer = TRAINERS.find(item => item.id === button.dataset.selectTrainer);
      writeJSON(KEYS.selectedTrainer, trainer);
      window.location.href = `packages.html?type=trainer&trainer=${trainer.id}`;
    });
    render();
  }

  function initTrainerDetail() {
    const root = $('[data-trainer-detail]');
    if (!root) return;
    const id = new URLSearchParams(window.location.search).get('id') || TRAINERS[0].id;
    const trainer = TRAINERS.find(item => item.id === id) || TRAINERS[0];
    document.title = `${trainer.name} | Sports Science Fitness Club`;
    $('[data-detail-portrait]', root).style.setProperty('--trainer-bg', trainer.color);
    $('[data-detail-initials]', root).textContent = trainer.initials;
    $('[data-detail-name]', root).textContent = trainer.name;
    $('[data-detail-role]', root).textContent = trainer.role;
    $('[data-detail-rating]', root).textContent = `★ ${trainer.rating}`;
    $('[data-detail-experience]', root).textContent = `${trainer.experience} ปี`;
    $('[data-detail-bio]', root).textContent = trainer.bio;
    $('[data-detail-tags]', root).innerHTML = trainer.tags.map(tag => `<span class="ss-tag">${escapeHTML(tag)}</span>`).join('');
    $('[data-detail-certs]', root).innerHTML = trainer.certifications.map(item => {
      const certificate = typeof item === 'string' ? { name: item, issuer: 'ยังไม่ได้ระบุ', credentialId: 'ยังไม่ได้แนบข้อมูล', status: 'รอผู้ดูแลตรวจสอบ' } : item;
      return `<button class="certificate-button" type="button" data-certificate-name="${escapeHTML(certificate.name)}" data-certificate-issuer="${escapeHTML(certificate.issuer || 'ยังไม่ได้ระบุ')}" data-certificate-id="${escapeHTML(certificate.credentialId || 'ยังไม่ได้แนบข้อมูล')}" data-certificate-status="${escapeHTML(certificate.status || 'รอผู้ดูแลตรวจสอบ')}"><span class="certificate-icon" aria-hidden="true">▤</span><span class="certificate-name">${escapeHTML(certificate.name)}</span><span class="certificate-status">รอตรวจสอบ</span><span class="certificate-arrow" aria-hidden="true">›</span></button>`;
    }).join('');
    $('[data-detail-schedule]', root).innerHTML = trainer.schedule.map(item => `<div class="schedule-chip">${escapeHTML(item)}</div>`).join('');
    $$('[data-select-current-trainer]', root).forEach(button => button.addEventListener('click', () => {
      writeJSON(KEYS.selectedTrainer, trainer);
      window.location.href = `packages.html?type=trainer&trainer=${trainer.id}`;
    }));

    const modal = $('#certificateModal');
    const closeModal = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    };
    $('[data-detail-certs]', root).addEventListener('click', event => {
      const button = event.target.closest('[data-certificate-name]');
      if (!button) return;
      $('[data-certificate-name]', modal).textContent = button.dataset.certificateName;
      $('[data-certificate-issuer]', modal).textContent = button.dataset.certificateIssuer;
      $('[data-certificate-id]', modal).textContent = button.dataset.certificateId;
      $('[data-certificate-status]', modal).textContent = button.dataset.certificateStatus;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      $('[data-certificate-close]', modal).focus();
    });
    $$('[data-certificate-close]', modal).forEach(button => button.addEventListener('click', closeModal));
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
  }

  function initPackages() {
    const grid = $('#packageGrid');
    if (!grid) return;
    const tabs = $$('[data-package-tab]');
    const context = $('#packageContext');
    const status = $('#packageStatus');
    const params = new URLSearchParams(window.location.search);
    let type = params.get('type') === 'trainer' ? 'trainer' : 'fitness';

    const render = () => {
      tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.packageTab === type));
      const selectedTrainer = readJSON(KEYS.selectedTrainer, null);
      if (type === 'trainer') {
        context.innerHTML = selectedTrainer
          ? `เทรนเนอร์ที่เลือก: <strong>${escapeHTML(selectedTrainer.name)}</strong> · ${escapeHTML(selectedTrainer.role)} <a href="trainers.html">เปลี่ยนเทรนเนอร์</a>`
          : `ยังไม่ได้เลือกเทรนเนอร์ กรุณา <a href="trainers.html"><strong>ค้นหาและเลือกเทรนเนอร์</strong></a> ก่อนเลือกแพ็กเกจ`;
      } else {
        context.innerHTML = '<strong>แพ็กเกจเข้าใช้ฟิตเนส</strong> สำหรับเข้าใช้พื้นที่และอุปกรณ์ โดยไม่รวมค่าบริการเทรนเนอร์ส่วนตัว';
      }
      const list = type === 'trainer' ? TRAINER_PACKAGES : FITNESS_PACKAGES;
      grid.innerHTML = list.map(pkg => `
        <article class="surface package-card${pkg.featured ? ' featured' : ''}">
          <span class="package-label">${escapeHTML(pkg.label)}</span>
          <h3>${escapeHTML(pkg.name)}</h3>
          <div class="package-price">${formatBaht(pkg.price)} <small>${escapeHTML(pkg.unit)}</small></div>
          <ul class="check-list">${pkg.features.map(feature => `<li>${escapeHTML(feature)}</li>`).join('')}</ul>
          <button class="ss-btn primary wide" type="button" data-choose-package="${pkg.id}">เลือกแพ็กเกจ</button>
        </article>`).join('');
    };

    tabs.forEach(tab => tab.addEventListener('click', () => { type = tab.dataset.packageTab; render(); }));
    grid.addEventListener('click', event => {
      const button = event.target.closest('[data-choose-package]');
      if (!button) return;
      const selectedTrainer = readJSON(KEYS.selectedTrainer, null);
      if (type === 'trainer' && !selectedTrainer) {
        showMessage(status, 'กรุณาเลือกเทรนเนอร์ก่อนเลือกแพ็กเกจเทรนเนอร์', 'error');
        return;
      }
      const list = type === 'trainer' ? TRAINER_PACKAGES : FITNESS_PACKAGES;
      const pkg = list.find(item => item.id === button.dataset.choosePackage);
      const selection = { ...pkg, type, trainerId: selectedTrainer?.id || null, selectedAt: new Date().toISOString() };
      writeJSON(KEYS.selectedPackage, selection);
      const user = getCurrentUser();
      if (user && type === 'fitness') updateCurrentUser({ plan: pkg.id, planLabel: `${pkg.name} / ${formatBaht(pkg.price)}` });
      else if (user) updateCurrentUser({ trainerPackage: pkg.id, trainerPackageLabel: pkg.name, selectedTrainerId: selectedTrainer.id });
      showMessage(status, user
        ? `เลือก “${pkg.name}”${selectedTrainer ? ` กับ ${selectedTrainer.name}` : ''} เรียบร้อยแล้ว ระบบบันทึกไว้ในบัญชีสมาชิกแล้ว`
        : `บันทึกตัวเลือก “${pkg.name}” ไว้แล้ว กรุณาเข้าสู่ระบบหรือสมัครสมาชิกเพื่อยืนยันแพ็กเกจ`, 'success');
      status.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    render();
  }

  function bmiCategory(bmi) {
    if (bmi < 18.5) return 'น้ำหนักต่ำกว่าเกณฑ์';
    if (bmi < 23) return 'สมส่วน';
    if (bmi < 25) return 'น้ำหนักเกิน';
    if (bmi < 30) return 'อ้วนระดับ 1';
    return 'อ้วนระดับ 2';
  }

  function calculateHealth(data) {
    const weight = Number(data.weight);
    const height = Number(data.height);
    const age = Number(data.age);
    const activity = Number(data.activity);
    const bodyFat = data.bodyFat ? Number(data.bodyFat) : null;
    const bmi = weight / ((height / 100) ** 2);
    const bmr = (10 * weight) + (6.25 * height) - (5 * age) + (data.sex === 'male' ? 5 : -161);
    const tdee = bmr * activity;
    const adjustment = data.goal === 'weight-loss' ? -400 : data.goal === 'muscle-gain' ? 250 : 0;
    const targetCalories = Math.max(1200, tdee + adjustment);
    const protein = Math.round(weight * (data.goal === 'muscle-gain' ? 1.8 : 1.5));
    return {
      bmi: Number(bmi.toFixed(1)),
      bmiCategory: bmiCategory(bmi),
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories: Math.round(targetCalories),
      protein,
      bodyFat
    };
  }

  function renderHealthResult(result) {
    if (!result) return;
    $('[data-health-empty]')?.setAttribute('hidden', '');
    $('[data-health-results]')?.removeAttribute('hidden');
    $('[data-metric="bmi"]').textContent = result.bmi;
    $('[data-metric="bmi-category"]').textContent = result.bmiCategory;
    $('[data-metric="bmr"]').textContent = result.bmr.toLocaleString('th-TH');
    $('[data-metric="tdee"]').textContent = result.tdee.toLocaleString('th-TH');
    $('[data-metric="calories"]').textContent = result.targetCalories.toLocaleString('th-TH');
    $('[data-metric="protein"]').textContent = result.protein.toLocaleString('th-TH');
    const bodyFat = $('[data-metric="body-fat"]');
    if (bodyFat) bodyFat.textContent = result.bodyFat ? `${result.bodyFat}%` : 'ไม่ได้ระบุ';
  }

  function initHealthProfile() {
    const form = $('#healthProfileForm');
    if (!form) return;
    const user = getCurrentUser();
    const status = $('#healthStatus');
    const stored = getProfile();
    $('[data-health-user-name]').textContent = user?.name || user?.fullName || 'สมาชิก';
    if (new URLSearchParams(window.location.search).get('welcome') === 'google') showMessage(status, 'เข้าสู่ระบบสำเร็จ กรุณากรอกข้อมูลสุขภาพเพื่อให้ระบบแนะนำเทรนเนอร์ได้แม่นยำขึ้น', 'info');
    if (stored) {
      Object.entries(stored).forEach(([key, value]) => {
        const input = form.elements[key];
        if (!input || key === 'results') return;
        if (input instanceof RadioNodeList) {
          const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
          if (radio) radio.checked = true;
        } else input.value = value ?? '';
      });
      renderHealthResult(stored.results);
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const age = Number(data.age), height = Number(data.height), weight = Number(data.weight);
      if (!data.sex || !data.goal || !data.activity || !data.experienceLevel || age < 15 || age > 100 || height < 120 || height > 230 || weight < 30 || weight > 300) {
        showMessage(status, 'กรุณาตรวจสอบข้อมูลให้ครบและอยู่ในช่วงที่สมเหตุสมผล', 'error');
        return;
      }
      if (data.bodyFat && (Number(data.bodyFat) < 3 || Number(data.bodyFat) > 70)) {
        showMessage(status, 'เปอร์เซ็นต์ไขมันควรอยู่ระหว่าง 3–70%', 'error');
        return;
      }
      const results = calculateHealth(data);
      const profile = { ...data, age, height, weight, bodyFat: data.bodyFat ? Number(data.bodyFat) : '', results, updatedAt: new Date().toISOString() };
      const profiles = readJSON(KEYS.healthProfiles, {});
      const email = user?.email || 'demo@sportscience.local';
      profiles[email] = profile;
      writeJSON(KEYS.healthProfiles, profiles);
      updateCurrentUser({ healthProfileCompleted: true });
      renderHealthResult(results);
      showMessage(status, 'บันทึกและคำนวณข้อมูลสุขภาพเรียบร้อยแล้ว ระบบพร้อมแนะนำเทรนเนอร์ให้คุณ', 'success');
    });

    $('#findTrainerButton')?.addEventListener('click', () => {
      const profile = getProfile();
      window.location.href = profile ? `trainers.html?goal=${encodeURIComponent(profile.goal)}` : 'trainers.html';
    });
  }

  function initDashboardFeatureSummary() {
    const healthBox = $('[data-dashboard-health]');
    if (healthBox) {
      const profile = getProfile();
      healthBox.innerHTML = profile?.results
        ? `<h3>BMI ${escapeHTML(profile.results.bmi)} · TDEE ${Number(profile.results.tdee).toLocaleString('th-TH')} kcal</h3><p>เป้าหมายพลังงาน ${Number(profile.results.targetCalories).toLocaleString('th-TH')} kcal/วัน</p>`
        : '<h3>ยังไม่ได้กรอกข้อมูลสุขภาพ</h3><p>กรอกข้อมูลเพื่อคำนวณ BMI, TDEE และรับคำแนะนำเทรนเนอร์</p>';
    }
    const trainerBox = $('[data-dashboard-trainer]');
    if (trainerBox) {
      const trainer = readJSON(KEYS.selectedTrainer, null);
      trainerBox.innerHTML = trainer
        ? `<h3>${escapeHTML(trainer.name)}</h3><p>${escapeHTML(trainer.role)}</p>`
        : '<h3>ยังไม่ได้เลือกเทรนเนอร์</h3><p>ค้นหาเทรนเนอร์ให้ตรงกับเป้าหมายของคุณ</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initSharedNavigation();
    initGoogleLogin();
    initTrainerList();
    initTrainerDetail();
    initPackages();
    initHealthProfile();
    initDashboardFeatureSummary();
  });

  window.SSFitness = { TRAINERS, FITNESS_PACKAGES, TRAINER_PACKAGES, calculateHealth };
})();
