import { PrismaClient } from '@prisma/client';

// Use direct connection (non-pooler) for seed operations
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

async function main() {
  // 1. Equipment Sets (10 sets)
  for (let i = 1; i <= 10; i++) {
    await prisma.equipmentSet.upsert({
      where: { name: `SET-${String(i).padStart(2, '0')}` },
      update: {},
      create: { name: `SET-${String(i).padStart(2, '0')}` },
    });
  }

  // 2. System Settings
  const settings = [
    { key: 'PRE_USE_BUSINESS_DAYS', value: 3, description: '사용일 전 운영 영업일 수' },
    { key: 'POST_USE_BUSINESS_DAYS', value: 4, description: '사용일 후 운영 영업일 수' },
    { key: 'MIN_ADVANCE_BUSINESS_DAYS', value: 3, description: '예약 가능 최소 선행 영업일' },
    { key: 'HOLD_DURATION_MINUTES', value: 10, description: '결제 홀딩 시간 (분)' },
    { key: 'TOTAL_SETS', value: 10, description: '총 장비 세트 수' },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: { key: s.key, value: s.value, description: s.description },
    });
  }

  // 3. 2026 Korean Holidays
  const holidays = [
    { date: '2026-01-01', name: '신정', year: 2026 },
    { date: '2026-01-29', name: '설날 연휴', year: 2026 },
    { date: '2026-01-30', name: '설날', year: 2026 },
    { date: '2026-01-31', name: '설날 연휴', year: 2026 },
    { date: '2026-03-01', name: '삼일절', year: 2026 },
    { date: '2026-05-05', name: '어린이날', year: 2026 },
    { date: '2026-05-24', name: '부처님오신날', year: 2026 },
    { date: '2026-06-06', name: '현충일', year: 2026 },
    { date: '2026-08-15', name: '광복절', year: 2026 },
    { date: '2026-09-24', name: '추석 연휴', year: 2026 },
    { date: '2026-09-25', name: '추석', year: 2026 },
    { date: '2026-09-26', name: '추석 연휴', year: 2026 },
    { date: '2026-10-03', name: '개천절', year: 2026 },
    { date: '2026-10-09', name: '한글날', year: 2026 },
    { date: '2026-12-25', name: '성탄절', year: 2026 },
  ];
  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: { date: new Date(h.date) },
      update: { name: h.name, year: h.year },
      create: { date: new Date(h.date), name: h.name, year: h.year },
    });
  }

  // 4. Sample Products
  const products = [
    {
      name: '베이직 솔로 세트',
      description: '혼캠 입문자를 위한 필수 장비 풀세트',
      capacity: 1,
      price1night: 59000,
      price2night: 79000,
      images: JSON.stringify([]),
      includes: JSON.stringify(['1인용 돔텐트', '침낭 (3계절)', '에어매트', '가스버너', 'LED 랜턴', '수납 가방']),
      sortOrder: 1,
    },
    {
      name: '프리미엄 듀오 세트',
      description: '커플·친구와 함께하는 프리미엄 캠핑',
      capacity: 2,
      price1night: 89000,
      price2night: 119000,
      images: JSON.stringify([]),
      includes: JSON.stringify(['2인용 텐트', '침낭 x2', '에어매트 x2', '접이식 테이블', 'LED 랜턴', '타프', '수납 가방']),
      sortOrder: 2,
    },
    {
      name: '풀패키지 세트',
      description: '화로대·조리도구까지 올인원 패키지',
      capacity: 2,
      price1night: 119000,
      price2night: 149000,
      images: JSON.stringify([]),
      includes: JSON.stringify(['2인용 텐트', '침낭 x2', '에어매트 x2', '화로대', '조리세트', '접이식 테이블', '체어 x2', 'LED 랜턴', '타프', '수납 가방']),
      sortOrder: 3,
    },
    {
      name: '라이트 솔로 세트',
      description: '가볍게 떠나는 미니멀 백패킹',
      capacity: 1,
      price1night: 39000,
      price2night: 55000,
      images: JSON.stringify([]),
      includes: JSON.stringify(['경량 텐트', '침낭', '에어매트']),
      sortOrder: 4,
    },
  ];
  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.product.create({ data: p });
    }
  }

  // 5. Sample Consumable Options
  const consumables = [
    { name: '참나무 장작 1단', description: '화로대용 · 약 3시간 연소', price: 8000, sortOrder: 1 },
    { name: '숯 3kg', description: '바비큐용 · 착화탄 포함', price: 6000, sortOrder: 2 },
    { name: '모기향 세트', description: '코일 5개 + 거치대', price: 3000, sortOrder: 3 },
    { name: '부탄가스 4팩', description: '이와타니 호환 · 230g x 4', price: 5000, sortOrder: 4 },
  ];
  for (const c of consumables) {
    const existing = await prisma.consumableOption.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.consumableOption.create({ data: c });
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
