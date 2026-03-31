import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const sets = await p.equipmentSet.findMany({ where: { productId: 1 }, select: { id: true, name: true } });
  console.log('Sets for product 1:', JSON.stringify(sets));

  const result = await p.$queryRaw`
    SELECT COUNT(DISTINCT equipment_set_id) as count
    FROM reservation_blocks
    WHERE equipment_set_id IN (SELECT id FROM equipment_sets WHERE product_id = ${1})
  `;
  console.log('Blocked count:', JSON.stringify(result));
} catch (e) {
  console.error('ERROR:', e.message);
} finally {
  await p.$disconnect();
}
