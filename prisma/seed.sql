-- Seed: Equipment Sets (10 sets)
INSERT INTO equipment_sets (name, status, updated_at) VALUES
  ('SET-01', 'AVAILABLE', NOW()),
  ('SET-02', 'AVAILABLE', NOW()),
  ('SET-03', 'AVAILABLE', NOW()),
  ('SET-04', 'AVAILABLE', NOW()),
  ('SET-05', 'AVAILABLE', NOW()),
  ('SET-06', 'AVAILABLE', NOW()),
  ('SET-07', 'AVAILABLE', NOW()),
  ('SET-08', 'AVAILABLE', NOW()),
  ('SET-09', 'AVAILABLE', NOW()),
  ('SET-10', 'AVAILABLE', NOW())
ON CONFLICT (name) DO NOTHING;

-- Seed: System Settings
INSERT INTO system_settings (key, value, description, updated_at) VALUES
  ('PRE_USE_BUSINESS_DAYS', '3', '사용일 전 운영 영업일 수', NOW()),
  ('POST_USE_BUSINESS_DAYS', '4', '사용일 후 운영 영업일 수', NOW()),
  ('MIN_ADVANCE_BUSINESS_DAYS', '3', '예약 가능 최소 선행 영업일', NOW()),
  ('HOLD_DURATION_MINUTES', '10', '결제 홀딩 시간 (분)', NOW()),
  ('TOTAL_SETS', '10', '총 장비 세트 수', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

-- Seed: 2026 Korean Holidays
INSERT INTO holidays (date, name, year, is_custom) VALUES
  ('2026-01-01', '신정', 2026, false),
  ('2026-01-29', '설날 연휴', 2026, false),
  ('2026-01-30', '설날', 2026, false),
  ('2026-01-31', '설날 연휴', 2026, false),
  ('2026-03-01', '삼일절', 2026, false),
  ('2026-05-05', '어린이날', 2026, false),
  ('2026-05-24', '부처님오신날', 2026, false),
  ('2026-06-06', '현충일', 2026, false),
  ('2026-08-15', '광복절', 2026, false),
  ('2026-09-24', '추석 연휴', 2026, false),
  ('2026-09-25', '추석', 2026, false),
  ('2026-09-26', '추석 연휴', 2026, false),
  ('2026-10-03', '개천절', 2026, false),
  ('2026-10-09', '한글날', 2026, false),
  ('2026-12-25', '성탄절', 2026, false)
ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, year = EXCLUDED.year;

-- Seed: Products
INSERT INTO products (name, description, capacity, price_1night, price_2night, images, includes, is_active, sort_order, created_at) VALUES
  ('베이직 솔로 세트', '혼캠 입문자를 위한 필수 장비 풀세트', 1, 59000, 79000, '[]', '["1인용 돔텐트","침낭 (3계절)","에어매트","가스버너","LED 랜턴","수납 가방"]', true, 1, NOW()),
  ('프리미엄 듀오 세트', '커플·친구와 함께하는 프리미엄 캠핑', 2, 89000, 119000, '[]', '["2인용 텐트","침낭 x2","에어매트 x2","접이식 테이블","LED 랜턴","타프","수납 가방"]', true, 2, NOW()),
  ('풀패키지 세트', '화로대·조리도구까지 올인원 패키지', 2, 119000, 149000, '[]', '["2인용 텐트","침낭 x2","에어매트 x2","화로대","조리세트","접이식 테이블","체어 x2","LED 랜턴","타프","수납 가방"]', true, 3, NOW()),
  ('라이트 솔로 세트', '가볍게 떠나는 미니멀 백패킹', 1, 39000, 55000, '[]', '["경량 텐트","침낭","에어매트"]', true, 4, NOW())
ON CONFLICT DO NOTHING;

-- Seed: Consumable Options
INSERT INTO consumable_options (name, description, price, is_active, sort_order) VALUES
  ('참나무 장작 1단', '화로대용 · 약 3시간 연소', 8000, true, 1),
  ('숯 3kg', '바비큐용 · 착화탄 포함', 6000, true, 2),
  ('모기향 세트', '코일 5개 + 거치대', 3000, true, 3),
  ('부탄가스 4팩', '이와타니 호환 · 230g x 4', 5000, true, 4)
ON CONFLICT DO NOTHING;
