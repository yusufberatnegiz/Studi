ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_ocr_count  int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_ocr_date   date,
  ADD COLUMN IF NOT EXISTS daily_gen_count  int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_gen_date   date;
