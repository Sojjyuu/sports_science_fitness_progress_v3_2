/* ข้อมูลตั้งต้น: บัญชีเจ้าหน้าที่ทดลอง, เทรนเนอร์, แพ็กเกจ
   ใช้: npm run db:seed (รันซ้ำได้) */
const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TRAINERS = [
  {
    id: 'coach-narin', email: 'coach.narin@sportscience.local', name: 'โค้ชนรินทร์ วัฒนชัย', initials: 'NR', gender: 'male',
    role: 'Strength & Conditioning Coach', experience: 8, rating: 4.9,
    specialties: ['strength', 'muscle'], goals: ['muscle-gain', 'general'],
    tags: ['เพิ่มกล้ามเนื้อ', 'เวทเทรนนิ่ง', 'ปรับท่าฝึก'],
    bio: 'เชี่ยวชาญการสร้างพื้นฐานความแข็งแรงและเพิ่มมวลกล้ามเนื้ออย่างเป็นระบบ เหมาะทั้งผู้เริ่มต้นและผู้ที่ต้องการยกระดับสมรรถภาพ',
    certifications: ['Certified Personal Trainer (CPT)', 'Strength & Conditioning Fundamentals', 'ปฐมพยาบาลและ CPR'],
    schedule: ['จ. 16:00–20:00', 'อ. 16:00–20:00', 'พฤ. 16:00–20:00', 'ส. 09:00–15:00'],
    color: 'linear-gradient(135deg, #075bd8, #05265c)'
  },
  {
    id: 'coach-pim', email: 'coach.pim@sportscience.local', name: 'โค้ชพิมพ์ชนก ศรีสุข', initials: 'PM', gender: 'female',
    role: 'Weight Management Coach', experience: 6, rating: 4.8,
    specialties: ['fat-loss', 'nutrition'], goals: ['weight-loss', 'general'],
    tags: ['ลดไขมัน', 'คาร์ดิโอ', 'โภชนาการ'],
    bio: 'ดูแลโปรแกรมลดไขมันควบคู่การปรับพฤติกรรม เน้นแผนที่ทำตามได้จริงและติดตามผลอย่างสม่ำเสมอโดยไม่หักโหม',
    certifications: ['Weight Management Specialist', 'Nutrition for Exercise', 'ปฐมพยาบาลและ CPR'],
    schedule: ['จ. 09:00–15:00', 'พ. 09:00–18:00', 'ศ. 09:00–18:00', 'ส. 10:00–16:00'],
    color: 'linear-gradient(135deg, #12a6c9, #0750a4)'
  },
  {
    id: 'coach-ton', email: 'coach.ton@sportscience.local', name: 'โค้ชธนกฤต ภูผา', initials: 'TN', gender: 'male',
    role: 'Athletic Performance Coach', experience: 10, rating: 4.9,
    specialties: ['sport', 'strength'], goals: ['performance', 'muscle-gain'],
    tags: ['กีฬาเฉพาะทาง', 'ความเร็ว', 'ความแข็งแรง'],
    bio: 'ออกแบบโปรแกรมพัฒนาความเร็ว พลัง และความคล่องตัวสำหรับนักกีฬา รวมถึงผู้ที่ต้องการฝึกแบบ Athletic Performance',
    certifications: ['Sports Performance Coach', 'Speed & Agility Training', 'ปฐมพยาบาลและ CPR'],
    schedule: ['อ. 10:00–18:00', 'พ. 12:00–20:00', 'พฤ. 10:00–18:00', 'ส. 08:00–13:00'],
    color: 'linear-gradient(135deg, #5126a8, #075bd8)'
  },
  {
    id: 'coach-may', email: 'coach.may@sportscience.local', name: 'โค้ชเมธาวี อินทร์แก้ว', initials: 'MY', gender: 'female',
    role: 'Mobility & Corrective Exercise', experience: 7, rating: 4.8,
    specialties: ['mobility', 'rehab'], goals: ['rehabilitation', 'general'],
    tags: ['ยืดเหยียด', 'แก้ออฟฟิศซินโดรม', 'ฟื้นฟูการเคลื่อนไหว'],
    bio: 'เน้นคุณภาพการเคลื่อนไหว ความยืดหยุ่น และการฝึกแก้ไขท่าทาง เหมาะกับผู้เริ่มต้นหรือผู้ที่ต้องการกลับมาออกกำลังกายอย่างปลอดภัย',
    certifications: ['Corrective Exercise Specialist', 'Mobility Fundamentals', 'ปฐมพยาบาลและ CPR'],
    schedule: ['จ. 10:00–18:00', 'อ. 12:00–20:00', 'พฤ. 09:00–17:00', 'ศ. 10:00–18:00'],
    color: 'linear-gradient(135deg, #04a878, #087ca7)'
  },
  {
    id: 'coach-beam', email: 'coach.beam@sportscience.local', name: 'โค้ชบีม ปารมีชัย', initials: 'BM', gender: 'male',
    role: 'Functional Training Coach', experience: 5, rating: 4.7,
    specialties: ['functional', 'fat-loss'], goals: ['weight-loss', 'performance', 'general'],
    tags: ['Functional', 'ลดไขมัน', 'Circuit Training'],
    bio: 'โปรแกรมสนุก กระชับ และปรับระดับได้ ช่วยพัฒนาความฟิตทั่วร่างกาย เหมาะกับคนที่ไม่ชอบการฝึกแบบเดิม ๆ',
    certifications: ['Functional Training Specialist', 'Group Exercise Leader', 'ปฐมพยาบาลและ CPR'],
    schedule: ['จ. 14:00–20:00', 'พ. 14:00–20:00', 'ศ. 14:00–20:00', 'ส. 09:00–14:00'],
    color: 'linear-gradient(135deg, #f08025, #bd3c59)'
  },
  {
    id: 'coach-fah', email: 'coach.fah@sportscience.local', name: 'โค้ชฟ้า ณัฐกานต์', initials: 'FA', gender: 'female',
    role: 'Beginner Fitness Coach', experience: 4, rating: 4.8,
    specialties: ['beginner', 'functional'], goals: ['general', 'weight-loss'],
    tags: ['ผู้เริ่มต้น', 'สุขภาพทั่วไป', 'สร้างนิสัย'],
    bio: 'ดูแลผู้เริ่มต้นอย่างใกล้ชิด สอนใช้อุปกรณ์และวางแผนการฝึกทีละขั้น เพื่อสร้างความมั่นใจและนิสัยออกกำลังกายในระยะยาว',
    certifications: ['Certified Personal Trainer (CPT)', 'Behavior Change Basics', 'ปฐมพยาบาลและ CPR'],
    schedule: ['อ. 08:00–16:00', 'พ. 08:00–16:00', 'พฤ. 12:00–20:00', 'ส. 09:00–16:00'],
    color: 'linear-gradient(135deg, #e45b94, #6546c7)'
  }
];

const FITNESS_PACKAGES = [
  { id: '1m', label: 'เริ่มต้น', name: 'Fitness 1 เดือน', price: 300, unit: '/ เดือน', months: 1, featured: false, features: ['เข้าใช้ฟิตเนสตามเวลาเปิดบริการ', 'ประเมินสมรรถภาพเบื้องต้น 1 ครั้ง', 'ดูประวัติการเข้าใช้จาก RFID'] },
  { id: '3m', label: 'ยอดนิยม', name: 'Fitness 3 เดือน', price: 750, unit: '/ 3 เดือน', months: 3, featured: true, features: ['สิทธิ์ทั้งหมดจากแพ็กเกจ 1 เดือน', 'ติดตามผลรายเดือน', 'ประหยัดกว่ารายเดือน 150 บาท'] },
  { id: '6m', label: 'ต่อเนื่อง', name: 'Fitness 6 เดือน', price: 1400, unit: '/ 6 เดือน', months: 6, featured: false, features: ['สิทธิ์ทั้งหมดจากแพ็กเกจ 3 เดือน', 'ประเมินสมรรถภาพซ้ำ 2 ครั้ง', 'เหมาะสำหรับแผนระยะกลาง'] },
  { id: '1y', label: 'คุ้มที่สุด', name: 'Fitness 1 ปี', price: 2500, unit: '/ ปี', months: 12, featured: false, features: ['เข้าใช้ฟิตเนสตลอด 12 เดือน', 'ติดตามผลและประเมินสมรรถภาพ', 'ราคาต่อเดือนคุ้มที่สุด'] }
];

const TRAINER_PACKAGES = [
  { id: 'pt1', label: 'ทดลอง', name: 'Personal Training 1 ครั้ง', price: 350, unit: '/ ครั้ง', sessions: 1, featured: false, features: ['ฝึกส่วนตัว 60 นาที', 'ประเมินเป้าหมายก่อนเริ่ม', 'คำแนะนำหลังการฝึก'] },
  { id: 'pt4', label: 'แนะนำ', name: 'Personal Training 4 ครั้ง', price: 1200, unit: '/ แพ็กเกจ', sessions: 4, featured: true, features: ['ฝึกส่วนตัว 4 ครั้ง', 'วางโปรแกรมตามเป้าหมาย', 'ติดตามผลตลอดแพ็กเกจ'] },
  { id: 'pt8', label: 'จริงจัง', name: 'Personal Training 8 ครั้ง', price: 2200, unit: '/ แพ็กเกจ', sessions: 8, featured: true, features: ['ฝึกส่วนตัว 8 ครั้ง', 'ปรับโปรแกรมตามความก้าวหน้า', 'สรุปผลเมื่อจบแพ็กเกจ'] }
];

async function upsertAccount(client, { email, password, role, fullName }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await client.query('SELECT id FROM accounts WHERE lower(email) = lower($1)', [email]);
  if (existing.rowCount) {
    const { rows } = await client.query(
      `UPDATE accounts SET password_hash = $2, role = $3, full_name = $4, status = 'active'
       WHERE id = $1 RETURNING id`,
      [existing.rows[0].id, passwordHash, role, fullName]
    );
    return rows[0].id;
  }
  const { rows } = await client.query(
    `INSERT INTO accounts (email, password_hash, role, full_name)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [email, passwordHash, role, fullName]
  );
  return rows[0].id;
}

(async () => {
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '1234',
    database: process.env.PGDATABASE || 'sports_science_fitness'
  });

  try {
    await client.connect();
    await client.query('BEGIN');

    const adminId = await upsertAccount(client, {
      email: 'admin@sportscience.local',
      password: 'admin1234',
      role: 'admin',
      fullName: 'ผู้ดูแลระบบ'
    });

    for (let index = 0; index < TRAINERS.length; index += 1) {
      const trainer = TRAINERS[index];
      const accountId = await upsertAccount(client, {
        email: trainer.email,
        password: 'coach1234',
        role: 'coach',
        fullName: trainer.name
      });
      await client.query(
        `INSERT INTO trainers (id, account_id, name, initials, gender, title, experience, rating,
           specialties, goals, tags, bio, certifications, schedule, color, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO UPDATE SET
           account_id = EXCLUDED.account_id, name = EXCLUDED.name, initials = EXCLUDED.initials,
           gender = EXCLUDED.gender, title = EXCLUDED.title, experience = EXCLUDED.experience,
           rating = EXCLUDED.rating, specialties = EXCLUDED.specialties, goals = EXCLUDED.goals,
           tags = EXCLUDED.tags, bio = EXCLUDED.bio, certifications = EXCLUDED.certifications,
           schedule = EXCLUDED.schedule, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order`,
        [
          trainer.id, accountId, trainer.name, trainer.initials, trainer.gender, trainer.role,
          trainer.experience, trainer.rating, trainer.specialties, trainer.goals, trainer.tags,
          trainer.bio, trainer.certifications, trainer.schedule, trainer.color, index
        ]
      );
    }

    for (let index = 0; index < FITNESS_PACKAGES.length; index += 1) {
      const pkg = FITNESS_PACKAGES[index];
      await client.query(
        `INSERT INTO fitness_packages (id, label, name, price, unit, months, featured, features, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           label = EXCLUDED.label, name = EXCLUDED.name, price = EXCLUDED.price, unit = EXCLUDED.unit,
           months = EXCLUDED.months, featured = EXCLUDED.featured, features = EXCLUDED.features,
           sort_order = EXCLUDED.sort_order`,
        [pkg.id, pkg.label, pkg.name, pkg.price, pkg.unit, pkg.months, pkg.featured, pkg.features, index]
      );
    }

    for (let index = 0; index < TRAINER_PACKAGES.length; index += 1) {
      const pkg = TRAINER_PACKAGES[index];
      await client.query(
        `INSERT INTO trainer_packages (id, label, name, price, unit, sessions, featured, features, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           label = EXCLUDED.label, name = EXCLUDED.name, price = EXCLUDED.price, unit = EXCLUDED.unit,
           sessions = EXCLUDED.sessions, featured = EXCLUDED.featured, features = EXCLUDED.features,
           sort_order = EXCLUDED.sort_order`,
        [pkg.id, pkg.label, pkg.name, pkg.price, pkg.unit, pkg.sessions, pkg.featured, pkg.features, index]
      );
    }

    await client.query('COMMIT');
    console.log(`seed สำเร็จ: admin ${adminId}, เทรนเนอร์ ${TRAINERS.length} คน, แพ็กเกจ ${FITNESS_PACKAGES.length + TRAINER_PACKAGES.length} รายการ`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('seed ล้มเหลว:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
