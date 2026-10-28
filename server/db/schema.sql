-- Sports Science Fitness Club — schema
-- ใช้กับ PostgreSQL 13 ขึ้นไป (gen_random_uuid มาจาก core)

BEGIN;

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'coach', 'admin')),
  full_name text NOT NULL,
  student_id text,
  phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  selected_trainer_id text,
  fitness_package_id text,
  trainer_package_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_lower_key ON accounts (lower(email));

CREATE TABLE IF NOT EXISTS trainers (
  id text PRIMARY KEY,
  account_id uuid UNIQUE REFERENCES accounts(id) ON DELETE SET NULL,
  name text NOT NULL,
  initials text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  title text NOT NULL,
  experience int NOT NULL DEFAULT 0,
  rating numeric(2, 1) NOT NULL DEFAULT 5.0,
  specialties text[] NOT NULL DEFAULT '{}',
  goals text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  bio text NOT NULL DEFAULT '',
  certifications text[] NOT NULL DEFAULT '{}',
  schedule text[] NOT NULL DEFAULT '{}',
  color text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS fitness_packages (
  id text PRIMARY KEY,
  label text NOT NULL,
  name text NOT NULL,
  price numeric(10, 2) NOT NULL,
  unit text NOT NULL,
  months int NOT NULL DEFAULT 1,
  featured boolean NOT NULL DEFAULT false,
  features text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trainer_packages (
  id text PRIMARY KEY,
  label text NOT NULL,
  name text NOT NULL,
  price numeric(10, 2) NOT NULL,
  unit text NOT NULL,
  sessions int NOT NULL DEFAULT 1,
  featured boolean NOT NULL DEFAULT false,
  features text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0
);

-- FK ของตัวเลือกแพ็กเกจ/โค้ช (เพิ่มทีหลังเพราะตารางอ้างอิงสร้างตามลำดับ)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_selected_trainer_fk') THEN
    ALTER TABLE accounts ADD CONSTRAINT accounts_selected_trainer_fk
      FOREIGN KEY (selected_trainer_id) REFERENCES trainers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_fitness_package_fk') THEN
    ALTER TABLE accounts ADD CONSTRAINT accounts_fitness_package_fk
      FOREIGN KEY (fitness_package_id) REFERENCES fitness_packages(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_trainer_package_fk') THEN
    ALTER TABLE accounts ADD CONSTRAINT accounts_trainer_package_fk
      FOREIGN KEY (trainer_package_id) REFERENCES trainer_packages(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('fitness', 'trainer')),
  package_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  start_date date,
  expire_date date,
  sessions_total int,
  sessions_used int NOT NULL DEFAULT 0,
  note text,
  confirmed_by uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS entitlements_one_open_kind_key
  ON entitlements (member_id, kind)
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS entitlements_member_idx ON entitlements (member_id);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  trainer_id text NOT NULL REFERENCES trainers(id) ON DELETE RESTRICT,
  date date NOT NULL,
  time time NOT NULL,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'confirmed', 'cancelled', 'completed', 'no_show')),
  cancel_reason text,
  created_by uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- กันนัดซ้อนทั้งฝั่งโค้ชและฝั่งสมาชิก (นัดที่ยกเลิกแล้วจองซ้ำได้)
CREATE UNIQUE INDEX IF NOT EXISTS appointments_trainer_slot_key
  ON appointments (trainer_id, date, time)
  WHERE status IN ('requested', 'confirmed');

CREATE UNIQUE INDEX IF NOT EXISTS appointments_member_slot_key
  ON appointments (member_id, date, time)
  WHERE status IN ('requested', 'confirmed');

CREATE INDEX IF NOT EXISTS appointments_member_idx ON appointments (member_id, date, time);
CREATE INDEX IF NOT EXISTS appointments_trainer_idx ON appointments (trainer_id, date, time);

CREATE TABLE IF NOT EXISTS coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id text NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES accounts(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, member_id)
);

CREATE TABLE IF NOT EXISTS health_profiles (
  member_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  age int,
  gender text,
  height_cm numeric(5, 1),
  weight_kg numeric(5, 1),
  body_fat numeric(4, 1),
  activity_level text,
  experience_level text,
  goal text,
  limitations text,
  results jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rfid_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  card_uid text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  issued_at date,
  suspended_at date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_logs (
  id bigserial PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  card_id uuid REFERENCES rfid_cards(id) ON DELETE SET NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  direction text NOT NULL DEFAULT 'in' CHECK (direction IN ('in', 'out')),
  source text NOT NULL DEFAULT 'rfid',
  allowed boolean NOT NULL DEFAULT true,
  note text
);

CREATE INDEX IF NOT EXISTS access_logs_member_idx ON access_logs (member_id, entered_at DESC);

-- อัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accounts_set_updated_at ON accounts;
CREATE TRIGGER accounts_set_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS entitlements_set_updated_at ON entitlements;
CREATE TRIGGER entitlements_set_updated_at BEFORE UPDATE ON entitlements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS appointments_set_updated_at ON appointments;
CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS rfid_cards_set_updated_at ON rfid_cards;
CREATE TRIGGER rfid_cards_set_updated_at BEFORE UPDATE ON rfid_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
