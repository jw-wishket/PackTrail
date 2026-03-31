-- Migration: Add product_id to equipment_sets for per-product inventory pools

-- 1. Add nullable product_id column with FK
ALTER TABLE equipment_sets
  ADD COLUMN product_id INT REFERENCES products(id);

-- 2. Assign existing sets to products (distribute evenly)
-- SET-01~03 → product 1 (베이직 솔로 세트)
-- SET-04~06 → product 2 (프리미엄 듀오 세트)
-- SET-07~09 → product 3 (풀패키지 세트)
-- SET-10    → product 4 (라이트 솔로 세트)
UPDATE equipment_sets SET product_id = 1 WHERE name IN ('SET-01', 'SET-02', 'SET-03');
UPDATE equipment_sets SET product_id = 2 WHERE name IN ('SET-04', 'SET-05', 'SET-06');
UPDATE equipment_sets SET product_id = 3 WHERE name IN ('SET-07', 'SET-08', 'SET-09');
UPDATE equipment_sets SET product_id = 4 WHERE name IN ('SET-10');

-- 3. Make product_id NOT NULL after data migration
ALTER TABLE equipment_sets
  ALTER COLUMN product_id SET NOT NULL;

-- 4. Add index on product_id
CREATE INDEX idx_equipment_sets_product_id ON equipment_sets(product_id);

-- 5. Remove TOTAL_SETS system setting (now derived per-product)
DELETE FROM system_settings WHERE key = 'TOTAL_SETS';
