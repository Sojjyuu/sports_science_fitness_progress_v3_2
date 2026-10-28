const db = require('./db');
const { HttpError, todayISO, addMonths } = require('./utils');

/* สร้าง/อัปเดตสิทธิ์ที่ยังไม่ยืนยันให้ตรงกับแพ็กเกจที่เลือก
   - ถ้ามีสิทธิ์ confirmed อยู่แล้ว จะไม่เขียนทับ (ต้องให้แอดมินจัดการ)
   - ใช้กับทั้งตอนสมัครและตอนเปลี่ยนแพ็กเกจ */
async function ensurePendingEntitlement(client, memberId, kind, packageId) {
  const table = kind === 'trainer' ? 'trainer_packages' : 'fitness_packages';
  const { rows } = await client.query(`SELECT * FROM ${table} WHERE id = $1`, [packageId]);
  const pkg = rows[0];
  if (!pkg) throw new HttpError(400, 'ไม่พบแพ็กเกจที่เลือก');

  const startDate = todayISO();
  const expireDate = kind === 'fitness' ? addMonths(startDate, pkg.months) : null;
  const sessionsTotal = kind === 'trainer' ? pkg.sessions : null;

  const existing = await client.query(
    `SELECT id, status FROM entitlements
     WHERE member_id = $1 AND kind = $2 AND status IN ('pending', 'confirmed')`,
    [memberId, kind]
  );

  if (existing.rowCount) {
    if (existing.rows[0].status === 'confirmed') {
      return { changed: false, id: existing.rows[0].id };
    }
    const updated = await client.query(
      `UPDATE entitlements
       SET package_id = $2, start_date = $3, expire_date = $4, sessions_total = $5, status = 'pending'
       WHERE id = $1 RETURNING id`,
      [existing.rows[0].id, packageId, startDate, expireDate, sessionsTotal]
    );
    return { changed: true, id: updated.rows[0].id };
  }

  const inserted = await client.query(
    `INSERT INTO entitlements (member_id, kind, package_id, status, start_date, expire_date, sessions_total)
     VALUES ($1, $2, $3, 'pending', $4, $5, $6) RETURNING id`,
    [memberId, kind, packageId, startDate, expireDate, sessionsTotal]
  );
  return { changed: true, id: inserted.rows[0].id };
}

async function listEntitlements(memberId) {
  const { rows } = await db.query(
    `SELECT e.*,
            CASE WHEN e.kind = 'fitness' THEN f.name ELSE tp.name END AS package_name
     FROM entitlements e
     LEFT JOIN fitness_packages f ON e.kind = 'fitness' AND f.id = e.package_id
     LEFT JOIN trainer_packages tp ON e.kind = 'trainer' AND tp.id = e.package_id
     WHERE e.member_id = $1
     ORDER BY e.created_at DESC`,
    [memberId]
  );
  return rows;
}

module.exports = { ensurePendingEntitlement, listEntitlements };
