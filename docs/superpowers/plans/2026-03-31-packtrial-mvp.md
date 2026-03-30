# PackTrail MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 백패킹 장비 렌탈 플랫폼 MVP 구축 — 날짜 블락 기반 예약/재고 관리 시스템과 사용자/관리자 화면 전체 구현

**Architecture:** Next.js 14 App Router의 Serverless Functions를 백엔드로 사용하는 Monolithic + Serverless Hybrid 구조. PostgreSQL(Supabase)의 daterange + EXCLUDE 제약조건으로 중복 예약을 DB 레벨에서 차단하고, Advisory Lock + SERIALIZABLE 격리로 동시성을 제어한다.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS + shadcn/ui, Prisma, Supabase (PostgreSQL + Auth + Storage + Realtime), PortOne v2, TanStack Query, react-day-picker

---

## Phase 1: 프로젝트 스캐폴딩 (Tasks 1-3)

### Task 1: Next.js 프로젝트 생성 및 의존성 설치

**파일:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`

**Steps:**

- [ ] Next.js 프로젝트 생성:
  ```bash
  npx create-next-app@latest packtrial --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
  ```

- [ ] 코어 의존성 설치:
  ```bash
  npm install @supabase/supabase-js @supabase/ssr prisma @prisma/client @tanstack/react-query react-day-picker date-fns zod @portone/browser-sdk lucide-react
  ```

- [ ] shadcn/ui 초기화 및 컴포넌트 설치:
  ```bash
  npx shadcn@latest init
  npx shadcn@latest add button card dialog input label select table tabs badge calendar toast
  ```

- [ ] 개발 서버 구동 확인:
  ```bash
  npm run dev
  ```
  `http://localhost:3000`에서 기본 페이지가 정상 렌더링되는지 확인한다.

- [ ] Commit: `feat: scaffold Next.js 14 project with core dependencies`

---

### Task 2: Tailwind 커스텀 컬러 및 디자인 토큰 설정

**파일:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`

**Steps:**

- [ ] `tailwind.config.ts`에 커스텀 컬러 추가:
  ```typescript
  import type { Config } from 'tailwindcss';

  const config: Config = {
    darkMode: ['class'],
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          moss: '#3A5A3A',
          olive: '#7BA35E',
          sage: '#6B7C6B',
          cream: '#F7F3EC',
          beige: '#EDE8DD',
          'price-green': '#5A8A3C',
          'status-blue': '#3A8AC8',
          'status-purple': '#8B5CF6',
          warning: '#E8743A',
          holding: '#B8860B',
          muted: '#A0ADA0',
          'footer-dark': '#2D4A2D',
          'admin-bg': '#F4F4F5',
        },
        fontFamily: {
          sans: ['Pretendard', 'system-ui', 'sans-serif'],
        },
      },
    },
    plugins: [require('tailwindcss-animate')],
  };

  export default config;
  ```

- [ ] `src/app/globals.css`에 기본 스타일 설정:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  @layer base {
    body {
      @apply bg-cream text-gray-900 antialiased;
    }
  }

  @layer components {
    .container-page {
      @apply mx-auto max-w-7xl px-4 sm:px-6 lg:px-8;
    }
  }
  ```

- [ ] 테스트 컴포넌트로 컬러가 정상 적용되는지 확인한다. `src/app/page.tsx`에서 `bg-moss`, `text-olive` 등 클래스를 임시 적용하여 검증한다.

- [ ] Commit: `feat: configure Tailwind custom colors and design tokens`

---

### Task 3: 기본 유틸리티 및 Supabase/Prisma 클라이언트 설정

**파일:**
- Create: `src/lib/utils.ts`
- Create: `src/lib/prisma.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `.env.local`
- Create: `vercel.json`

**Steps:**

- [ ] `src/lib/utils.ts` 작성:
  ```typescript
  import { clsx, type ClassValue } from 'clsx';
  import { twMerge } from 'tailwind-merge';

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }

  export function formatPrice(price: number): string {
    return `₩${price.toLocaleString('ko-KR')}`;
  }

  export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    });
  }

  export function formatDateFull(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }

  export function formatDateISO(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  ```

- [ ] `src/lib/prisma.ts` 작성:
  ```typescript
  import { PrismaClient } from '@prisma/client';

  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

  export const prisma = globalForPrisma.prisma ?? new PrismaClient();

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
  ```

- [ ] `src/lib/supabase/client.ts` 작성:
  ```typescript
  import { createBrowserClient } from '@supabase/ssr';

  export function createClient() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  ```

- [ ] `src/lib/supabase/server.ts` 작성:
  ```typescript
  import { createServerClient } from '@supabase/ssr';
  import { cookies } from 'next/headers';

  export function createServerSupabase() {
    const cookieStore = cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
  }
  ```

- [ ] `src/lib/supabase/admin.ts` 작성:
  ```typescript
  import { createClient } from '@supabase/supabase-js';

  export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  ```

- [ ] `.env.local` 템플릿 작성:
  ```env
  # Supabase
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=

  # Database (Prisma)
  DATABASE_URL=
  DIRECT_URL=

  # PortOne v2
  PORTONE_API_SECRET=
  NEXT_PUBLIC_PORTONE_STORE_ID=
  PORTONE_WEBHOOK_SECRET=

  # App
  NEXT_PUBLIC_BASE_URL=http://localhost:3000
  CRON_SECRET=dev-cron-secret

  # 한국천문연구원 공휴일 API
  HOLIDAY_API_KEY=
  ```

- [ ] `vercel.json` 작성:
  ```json
  {
    "crons": [
      { "path": "/api/cron/expire-holdings", "schedule": "* * * * *" },
      { "path": "/api/cron/sync-holidays", "schedule": "0 0 1 12 *" }
    ],
    "headers": [
      {
        "source": "/api/(.*)",
        "headers": [{ "key": "Cache-Control", "value": "no-store" }]
      }
    ]
  }
  ```

- [ ] `.env.local`이 `.gitignore`에 포함되어 있는지 확인한다.

- [ ] Commit: `feat: add utility functions and Supabase/Prisma client setup`

---

## Phase 2: 데이터베이스 스키마 (Tasks 4-6)

### Task 4: Prisma 스키마 작성

**파일:**
- Create: `prisma/schema.prisma`

**Steps:**

- [ ] `prisma/schema.prisma` 전체 작성:
  ```prisma
  generator client {
    provider        = "prisma-client-js"
    previewFeatures = ["postgresqlExtensions"]
  }

  datasource db {
    provider   = "postgresql"
    url        = env("DATABASE_URL")
    directUrl  = env("DIRECT_URL")
    extensions = [btree_gist, uuid_ossp(map: "uuid-ossp")]
  }

  // ─── Enums ───────────────────────────────────────────────────

  enum UserRole {
    USER
    ADMIN

    @@map("user_role")
  }

  enum SetStatus {
    AVAILABLE
    PREP
    SHIPPING
    IN_USE
    RETURNING
    MAINTENANCE

    @@map("set_status")
  }

  enum RentalType {
    ONE_NIGHT
    TWO_NIGHT

    @@map("rental_type")
  }

  enum ReservationStatus {
    HOLDING
    CONFIRMED
    SHIPPING
    IN_USE
    RETURNING
    COMPLETED
    CANCELLED

    @@map("reservation_status")
  }

  // ─── Models ──────────────────────────────────────────────────

  model User {
    id           String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    email        String             @unique @db.VarChar(255)
    name         String             @db.VarChar(100)
    phone        String?            @db.VarChar(20)
    role         UserRole           @default(USER)
    createdAt    DateTime           @default(now()) @map("created_at") @db.Timestamptz()
    updatedAt    DateTime           @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
    reservations Reservation[]
    reviews      Review[]

    @@map("users")
  }

  model Product {
    id           Int           @id @default(autoincrement())
    name         String        @db.VarChar(200)
    description  String?       @db.Text
    capacity     Int           @default(1) // 인원수 (1=1인용, 2=2인용)
    price1Night  Int           @map("price_1night")
    price2Night  Int           @map("price_2night")
    images       Json          @default("[]")
    includes     Json          @default("[]")
    isActive     Boolean       @default(true) @map("is_active")
    sortOrder    Int           @default(0) @map("sort_order")
    createdAt    DateTime      @default(now()) @map("created_at") @db.Timestamptz()
    reservations Reservation[]

    @@map("products")
  }

  model EquipmentSet {
    id                    Int                @id @default(autoincrement())
    name                  String             @unique @db.VarChar(100)
    status                SetStatus          @default(AVAILABLE)
    currentReservationId  String?            @map("current_reservation_id") @db.Uuid
    notes                 String?            @db.Text
    updatedAt             DateTime           @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
    currentReservation    Reservation?       @relation("CurrentReservation", fields: [currentReservationId], references: [id])
    reservations          Reservation[]      @relation("SetReservations")
    blocks                ReservationBlock[]

    @@map("equipment_sets")
  }

  model Reservation {
    id               String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    userId           String            @map("user_id") @db.Uuid
    equipmentSetId   Int?              @map("equipment_set_id")
    productId        Int               @map("product_id")
    rentalType       RentalType        @map("rental_type")
    useStartDate     DateTime          @map("use_start_date") @db.Date
    useEndDate       DateTime          @map("use_end_date") @db.Date
    blockStartDate   DateTime          @map("block_start_date") @db.Date
    blockEndDate     DateTime          @map("block_end_date") @db.Date
    status           ReservationStatus @default(HOLDING)
    totalPrice       Int               @map("total_price")
    paymentId        String?           @map("payment_id") @db.VarChar(100)
    holdExpiresAt    DateTime?         @map("hold_expires_at") @db.Timestamptz()
    deliveryAddress  String?           @map("delivery_address") @db.Text
    deliveryMemo     String?           @map("delivery_memo") @db.Text
    cancelledAt      DateTime?         @map("cancelled_at") @db.Timestamptz()
    cancelReason     String?           @map("cancel_reason") @db.Text
    createdAt        DateTime          @default(now()) @map("created_at") @db.Timestamptz()
    updatedAt        DateTime          @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()

    user             User              @relation(fields: [userId], references: [id])
    equipmentSet     EquipmentSet?     @relation("SetReservations", fields: [equipmentSetId], references: [id])
    product          Product           @relation(fields: [productId], references: [id])
    currentForSet    EquipmentSet[]    @relation("CurrentReservation")
    block            ReservationBlock?
    options          ReservationOption[]
    review           Review?

    @@map("reservations")
  }

  model ReservationBlock {
    id              Int                          @id @default(autoincrement())
    reservationId   String                       @unique @map("reservation_id") @db.Uuid
    equipmentSetId  Int                          @map("equipment_set_id")
    blockRange      Unsupported("daterange")     @map("block_range")
    createdAt       DateTime                     @default(now()) @map("created_at") @db.Timestamptz()

    reservation     Reservation                  @relation(fields: [reservationId], references: [id])
    equipmentSet    EquipmentSet                 @relation(fields: [equipmentSetId], references: [id])

    @@map("reservation_blocks")
  }

  model ReservationOption {
    reservationId  String  @map("reservation_id") @db.Uuid
    optionId       Int     @map("option_id")
    quantity       Int     @default(1)
    priceAtOrder   Int     @map("price_at_order")

    reservation    Reservation       @relation(fields: [reservationId], references: [id])
    option         ConsumableOption  @relation(fields: [optionId], references: [id])

    @@id([reservationId, optionId])
    @@map("reservation_options")
  }

  model ConsumableOption {
    id          Int                 @id @default(autoincrement())
    name        String              @db.VarChar(200)
    description String?             @db.Text
    price       Int
    isActive    Boolean             @default(true) @map("is_active")
    sortOrder   Int                 @default(0) @map("sort_order")
    orders      ReservationOption[]

    @@map("consumable_options")
  }

  model Review {
    id            String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    reservationId String      @unique @map("reservation_id") @db.Uuid
    userId        String      @map("user_id") @db.Uuid
    rating        Int         @db.SmallInt
    content       String      @db.Text
    images        Json        @default("[]")
    isVisible     Boolean     @default(true) @map("is_visible")
    createdAt     DateTime    @default(now()) @map("created_at") @db.Timestamptz()

    reservation   Reservation @relation(fields: [reservationId], references: [id])
    user          User        @relation(fields: [userId], references: [id])

    @@map("reviews")
  }

  model Holiday {
    id       Int      @id @default(autoincrement())
    date     DateTime @unique @db.Date
    name     String   @db.VarChar(100)
    year     Int
    isCustom Boolean  @default(false) @map("is_custom")

    @@map("holidays")
  }

  model SystemSetting {
    key         String   @id @db.VarChar(100)
    value       Json
    description String?  @db.Text
    updatedAt   DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()

    @@map("system_settings")
  }
  ```

- [ ] Prisma Client 생성:
  ```bash
  npx prisma generate
  ```

- [ ] 생성된 타입들이 IDE에서 정상 인식되는지 확인한다.

- [ ] Commit: `feat: define complete Prisma schema with all models and enums`

---

### Task 5: 마이그레이션 및 수동 SQL

**파일:**
- Create: `prisma/migrations/` (자동 생성)

**Steps:**

- [ ] 초기 마이그레이션 생성:
  ```bash
  npx prisma migrate dev --name init
  ```

- [ ] 생성된 마이그레이션 SQL 파일 끝에 수동으로 다음 SQL을 추가한다 (`prisma/migrations/<timestamp>_init/migration.sql`):
  ```sql
  -- Extensions
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- EXCLUDE 제약조건: 동일 세트의 블락 기간 겹침 방지
  ALTER TABLE reservation_blocks
    ADD CONSTRAINT no_overlapping_blocks
    EXCLUDE USING gist (
      equipment_set_id WITH =,
      block_range WITH &&
    );

  -- 인덱스: 블락 범위 조회 최적화
  CREATE INDEX idx_blocks_range ON reservation_blocks USING gist (block_range);
  CREATE INDEX idx_blocks_set_range ON reservation_blocks USING gist (equipment_set_id, block_range);

  -- 인덱스: 예약 상태별 조회 최적화
  CREATE INDEX idx_reservations_status ON reservations (status);
  CREATE INDEX idx_reservations_user ON reservations (user_id);
  CREATE INDEX idx_reservations_hold_expires ON reservations (hold_expires_at) WHERE status = 'HOLDING';
  ```

- [ ] 수정된 마이그레이션 적용:
  ```bash
  npx prisma migrate dev
  ```

- [ ] Supabase Dashboard에서 테이블, 인덱스, 제약조건이 모두 생성되었는지 확인한다.

- [ ] Commit: `feat: apply initial migration with EXCLUDE constraint and GiST indexes`

---

### Task 6: 시드 데이터

**파일:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (`prisma.seed` 추가)

**Steps:**

- [ ] `prisma/seed.ts` 작성:
  ```typescript
  import { PrismaClient } from '@prisma/client';

  const prisma = new PrismaClient();

  async function main() {
    console.log('🌱 Seeding database...');

    // ── 1. 장비 세트 (10개) ──────────────────────────────────
    const sets = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `SET-${String(i + 1).padStart(2, '0')}`,
      status: 'AVAILABLE' as const,
    }));

    for (const set of sets) {
      await prisma.equipmentSet.upsert({
        where: { id: set.id },
        update: {},
        create: set,
      });
    }
    console.log(`  ✓ ${sets.length} equipment sets created`);

    // ── 2. 시스템 설정 ───────────────────────────────────────
    const settings = [
      {
        key: 'PRE_USE_BUSINESS_DAYS',
        value: 3,
        description: '사용일 전 운영 영업일 수 (출고준비 + 출고 + 배송)',
      },
      {
        key: 'POST_USE_BUSINESS_DAYS',
        value: 4,
        description: '사용일 후 운영 영업일 수 (회수 + 회수완료 + 정비 + 준비)',
      },
      {
        key: 'MIN_ADVANCE_BUSINESS_DAYS',
        value: 3,
        description: '예약 가능 최소 선행 영업일',
      },
      {
        key: 'HOLD_DURATION_MINUTES',
        value: 10,
        description: '결제 홀딩 시간 (분)',
      },
      {
        key: 'TOTAL_SETS',
        value: 10,
        description: '총 장비 세트 수',
      },
    ];

    for (const setting of settings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value, description: setting.description },
        create: setting,
      });
    }
    console.log(`  ✓ ${settings.length} system settings created`);

    // ── 3. 2026년 공휴일 (한국) ──────────────────────────────
    const holidays2026 = [
      { date: '2026-01-01', name: '신정' },
      { date: '2026-02-16', name: '설날 전날' },
      { date: '2026-02-17', name: '설날' },
      { date: '2026-02-18', name: '설날 다음날' },
      { date: '2026-03-01', name: '삼일절' },
      { date: '2026-05-05', name: '어린이날' },
      { date: '2026-05-24', name: '부처님오신날' },
      { date: '2026-06-06', name: '현충일' },
      { date: '2026-08-15', name: '광복절' },
      { date: '2026-09-24', name: '추석 전날' },
      { date: '2026-09-25', name: '추석' },
      { date: '2026-09-26', name: '추석 다음날' },
      { date: '2026-10-03', name: '개천절' },
      { date: '2026-10-09', name: '한글날' },
      { date: '2026-12-25', name: '크리스마스' },
    ];

    for (const holiday of holidays2026) {
      await prisma.holiday.upsert({
        where: { date: new Date(holiday.date) },
        update: {},
        create: {
          date: new Date(holiday.date),
          name: holiday.name,
          year: 2026,
          isCustom: false,
        },
      });
    }
    console.log(`  ✓ ${holidays2026.length} holidays for 2026 created`);

    // ── 4. 샘플 상품 (2개) ───────────────────────────────────
    const products = [
      {
        name: '백패킹 기본 세트',
        description:
          '입문자를 위한 필수 장비 구성. 텐트, 침낭, 매트리스, 버너, 코펠이 포함됩니다.',
        capacity: 1,
        price1Night: 79000,
        price2Night: 99000,
        images: JSON.stringify(['/images/products/basic-set-1.jpg']),
        includes: JSON.stringify([
          '1인용 텐트 (MSR Hubba Hubba)',
          '3계절 침낭 (-5℃)',
          '자충 매트리스',
          '가스버너 + 가스캔',
          '코펠 세트 (1~2인용)',
        ]),
        isActive: true,
        sortOrder: 1,
      },
      {
        name: '백패킹 프리미엄 세트',
        description:
          '편안한 캠핑을 위한 프리미엄 장비 구성. 기본 세트에 랜턴, 테이블, 체어가 추가됩니다.',
        capacity: 2,
        price1Night: 119000,
        price2Night: 149000,
        images: JSON.stringify(['/images/products/premium-set-1.jpg']),
        includes: JSON.stringify([
          '2인용 텐트 (Big Agnes Copper Spur)',
          '다운 침낭 (-10℃)',
          '에어 매트리스 (Sea to Summit)',
          '가스버너 + 가스캔',
          '코펠 세트 (2~3인용)',
          'LED 랜턴',
          '경량 테이블',
          '경량 체어',
        ]),
        isActive: true,
        sortOrder: 2,
      },
    ];

    for (const product of products) {
      await prisma.product.upsert({
        where: { id: products.indexOf(product) + 1 },
        update: {},
        create: product,
      });
    }
    console.log(`  ✓ ${products.length} sample products created`);

    console.log('✅ Seeding complete!');
  }

  main()
    .catch((e) => {
      console.error('❌ Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
  ```

- [ ] `package.json`에 seed 명령 추가:
  ```json
  {
    "prisma": {
      "seed": "npx tsx prisma/seed.ts"
    }
  }
  ```

- [ ] tsx 개발 의존성 설치:
  ```bash
  npm install -D tsx
  ```

- [ ] 시드 실행:
  ```bash
  npx prisma db seed
  ```

- [ ] Supabase Dashboard에서 데이터 확인: equipment_sets 10행, system_settings 5행, holidays 15행, products 2행.

- [ ] Commit: `feat: add seed data with equipment sets, settings, holidays, and sample products`

---

## Phase 3: 예약/블락 엔진 (Tasks 7-11)

### Task 7: 시스템 설정 조회

**파일:**
- Create: `src/lib/booking-engine/settings.ts`

**Steps:**

- [ ] `src/lib/booking-engine/settings.ts` 작성:
  ```typescript
  import { prisma } from '@/lib/prisma';

  export interface SystemSettings {
    PRE_USE_BUSINESS_DAYS: number;
    POST_USE_BUSINESS_DAYS: number;
    MIN_ADVANCE_BUSINESS_DAYS: number;
    HOLD_DURATION_MINUTES: number;
    TOTAL_SETS: number;
  }

  const SETTING_KEYS: (keyof SystemSettings)[] = [
    'PRE_USE_BUSINESS_DAYS',
    'POST_USE_BUSINESS_DAYS',
    'MIN_ADVANCE_BUSINESS_DAYS',
    'HOLD_DURATION_MINUTES',
    'TOTAL_SETS',
  ];

  let cachedSettings: SystemSettings | null = null;
  let cacheTimestamp = 0;
  const CACHE_TTL_MS = 60_000; // 1분 캐시

  export async function getSystemSettings(): Promise<SystemSettings> {
    const now = Date.now();
    if (cachedSettings && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedSettings;
    }

    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: SETTING_KEYS } },
    });

    const settings = {} as SystemSettings;
    for (const row of rows) {
      settings[row.key as keyof SystemSettings] = Number(row.value);
    }

    // 기본값 적용
    settings.PRE_USE_BUSINESS_DAYS ??= 3;
    settings.POST_USE_BUSINESS_DAYS ??= 4;
    settings.MIN_ADVANCE_BUSINESS_DAYS ??= 3;
    settings.HOLD_DURATION_MINUTES ??= 10;
    settings.TOTAL_SETS ??= 10;

    cachedSettings = settings;
    cacheTimestamp = now;
    return settings;
  }

  export async function getSystemSetting(
    key: keyof SystemSettings
  ): Promise<number> {
    const settings = await getSystemSettings();
    return settings[key];
  }

  export function invalidateSettingsCache(): void {
    cachedSettings = null;
    cacheTimestamp = 0;
  }
  ```

- [ ] Commit: `feat: add system settings accessor with in-memory cache`

---

### Task 8: 영업일 계산기

**파일:**
- Create: `src/lib/booking-engine/business-days.ts`
- Create: `src/lib/booking-engine/__tests__/business-days.test.ts`

**Steps:**

- [ ] 테스트 먼저 작성 (`src/lib/booking-engine/__tests__/business-days.test.ts`):
  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { isBusinessDay, addBusinessDays, subtractBusinessDays } from '../business-days';
  import { prisma } from '@/lib/prisma';

  // prisma mock
  vi.mock('@/lib/prisma', () => ({
    prisma: {
      holiday: {
        findMany: vi.fn(),
      },
    },
  }));

  describe('BusinessDayCalculator', () => {
    beforeEach(() => {
      vi.mocked(prisma.holiday.findMany).mockResolvedValue([
        // 2026-03-01 삼일절 (일요일이지만 공휴일로도 등록)
        { id: 1, date: new Date('2026-03-01'), name: '삼일절', year: 2026, isCustom: false },
      ]);
    });

    describe('isBusinessDay', () => {
      it('평일이면 true', async () => {
        // 2026-03-23 월요일
        expect(await isBusinessDay(new Date('2026-03-23'))).toBe(true);
      });

      it('토요일이면 false', async () => {
        expect(await isBusinessDay(new Date('2026-03-28'))).toBe(false);
      });

      it('일요일이면 false', async () => {
        expect(await isBusinessDay(new Date('2026-03-29'))).toBe(false);
      });

      it('공휴일이면 false', async () => {
        vi.mocked(prisma.holiday.findMany).mockResolvedValue([
          { id: 1, date: new Date('2026-05-05'), name: '어린이날', year: 2026, isCustom: false },
        ]);
        expect(await isBusinessDay(new Date('2026-05-05'))).toBe(false);
      });
    });

    describe('addBusinessDays', () => {
      it('주말을 건너뛰고 영업일을 더한다', async () => {
        // 2026-03-27(금) + 4영업일 = 2026-04-02(목)
        // 금 → (토,일 skip) → 월(1) → 화(2) → 수(3) → 목(4)
        const result = await addBusinessDays(new Date('2026-03-27'), 4);
        expect(result.toISOString().split('T')[0]).toBe('2026-04-02');
      });

      it('0영업일이면 같은 날짜 반환', async () => {
        const result = await addBusinessDays(new Date('2026-03-23'), 0);
        expect(result.toISOString().split('T')[0]).toBe('2026-03-23');
      });
    });

    describe('subtractBusinessDays', () => {
      it('주말을 건너뛰고 영업일을 뺀다', async () => {
        // 2026-03-26(목) - 3영업일 = 2026-03-23(월)
        // 목 → 수(1) → 화(2) → 월(3)
        const result = await subtractBusinessDays(new Date('2026-03-26'), 3);
        expect(result.toISOString().split('T')[0]).toBe('2026-03-23');
      });
    });
  });
  ```

- [ ] 테스트 실행 설정: vitest 설치 및 설정
  ```bash
  npm install -D vitest @vitejs/plugin-react
  ```
  `vitest.config.ts` 작성:
  ```typescript
  import { defineConfig } from 'vitest/config';
  import path from 'path';

  export default defineConfig({
    test: {
      globals: true,
      environment: 'node',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  });
  ```

- [ ] 구현 작성 (`src/lib/booking-engine/business-days.ts`):
  ```typescript
  import { prisma } from '@/lib/prisma';
  import { formatDateISO } from '@/lib/utils';

  let holidayCache: Set<string> | null = null;
  let holidayCacheTimestamp = 0;
  const HOLIDAY_CACHE_TTL_MS = 300_000; // 5분

  async function getHolidaySet(): Promise<Set<string>> {
    const now = Date.now();
    if (holidayCache && now - holidayCacheTimestamp < HOLIDAY_CACHE_TTL_MS) {
      return holidayCache;
    }

    const holidays = await prisma.holiday.findMany({
      select: { date: true },
    });

    holidayCache = new Set(
      holidays.map((h) => {
        const d = new Date(h.date);
        return formatDateISO(d);
      })
    );
    holidayCacheTimestamp = now;
    return holidayCache;
  }

  export function invalidateHolidayCache(): void {
    holidayCache = null;
    holidayCacheTimestamp = 0;
  }

  export async function isBusinessDay(date: Date): Promise<boolean> {
    const day = date.getDay();
    if (day === 0 || day === 6) return false; // 주말 제외

    const holidays = await getHolidaySet();
    const dateStr = formatDateISO(date);
    return !holidays.has(dateStr);
  }

  export async function addBusinessDays(
    date: Date,
    days: number
  ): Promise<Date> {
    const result = new Date(date);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (await isBusinessDay(result)) added++;
    }
    return result;
  }

  export async function subtractBusinessDays(
    date: Date,
    days: number
  ): Promise<Date> {
    const result = new Date(date);
    let subtracted = 0;
    while (subtracted < days) {
      result.setDate(result.getDate() - 1);
      if (await isBusinessDay(result)) subtracted++;
    }
    return result;
  }
  ```

- [ ] 테스트 실행:
  ```bash
  npx vitest run src/lib/booking-engine/__tests__/business-days.test.ts
  ```

- [ ] 모든 테스트가 통과하는지 확인한다.

- [ ] Commit: `feat: implement business day calculator with TDD`

---

### Task 9: 블락 기간 산출기

**파일:**
- Create: `src/lib/booking-engine/block-calculator.ts`
- Create: `src/lib/booking-engine/__tests__/block-calculator.test.ts`

**Steps:**

- [ ] 테스트 먼저 작성 (`src/lib/booking-engine/__tests__/block-calculator.test.ts`):
  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { calculateBlockPeriod, type BlockPeriod } from '../block-calculator';

  // business-days mock: 공휴일 없이 주말만 제외하는 간단 버전
  vi.mock('../business-days', () => ({
    subtractBusinessDays: vi.fn(async (date: Date, days: number) => {
      const result = new Date(date);
      let subtracted = 0;
      while (subtracted < days) {
        result.setDate(result.getDate() - 1);
        const day = result.getDay();
        if (day !== 0 && day !== 6) subtracted++;
      }
      return result;
    }),
    addBusinessDays: vi.fn(async (date: Date, days: number) => {
      const result = new Date(date);
      let added = 0;
      while (added < days) {
        result.setDate(result.getDate() + 1);
        const day = result.getDay();
        if (day !== 0 && day !== 6) added++;
      }
      return result;
    }),
  }));

  // settings mock
  vi.mock('../settings', () => ({
    getSystemSettings: vi.fn(async () => ({
      PRE_USE_BUSINESS_DAYS: 3,
      POST_USE_BUSINESS_DAYS: 4,
      MIN_ADVANCE_BUSINESS_DAYS: 3,
      HOLD_DURATION_MINUTES: 10,
      TOTAL_SETS: 10,
    })),
  }));

  describe('BlockCalculator', () => {
    it('1박 2일 블락: 2026-03-26 사용 → [2026-03-23, 2026-04-02]', async () => {
      const result = await calculateBlockPeriod(
        new Date('2026-03-26'),
        'ONE_NIGHT'
      );

      expect(result.useStart.toISOString().split('T')[0]).toBe('2026-03-26');
      expect(result.useEnd.toISOString().split('T')[0]).toBe('2026-03-27');
      expect(result.blockStart.toISOString().split('T')[0]).toBe('2026-03-23');
      expect(result.blockEnd.toISOString().split('T')[0]).toBe('2026-04-02');
    });

    it('2박 3일 블락은 useEnd가 하루 더 길다', async () => {
      const result = await calculateBlockPeriod(
        new Date('2026-03-26'),
        'TWO_NIGHT'
      );

      expect(result.useStart.toISOString().split('T')[0]).toBe('2026-03-26');
      expect(result.useEnd.toISOString().split('T')[0]).toBe('2026-03-28');
    });

    it('blockRange가 PostgreSQL daterange 형식이다', async () => {
      const result = await calculateBlockPeriod(
        new Date('2026-03-26'),
        'ONE_NIGHT'
      );

      expect(result.blockRange).toMatch(/^\[.+, .+\]$/);
    });
  });
  ```

- [ ] 구현 작성 (`src/lib/booking-engine/block-calculator.ts`):
  ```typescript
  import { addBusinessDays, subtractBusinessDays } from './business-days';
  import { getSystemSettings } from './settings';
  import { formatDateISO } from '@/lib/utils';

  export interface BlockPeriod {
    useStart: Date;
    useEnd: Date;
    blockStart: Date;
    blockEnd: Date;
    blockRange: string; // PostgreSQL daterange: '[YYYY-MM-DD, YYYY-MM-DD]'
  }

  export async function calculateBlockPeriod(
    useStartDate: Date,
    rentalType: 'ONE_NIGHT' | 'TWO_NIGHT'
  ): Promise<BlockPeriod> {
    const settings = await getSystemSettings();
    const preUseDays = settings.PRE_USE_BUSINESS_DAYS;
    const postUseDays = settings.POST_USE_BUSINESS_DAYS;

    const nights = rentalType === 'TWO_NIGHT' ? 2 : 1;
    const useEnd = new Date(useStartDate);
    useEnd.setDate(useEnd.getDate() + nights);

    const blockStart = await subtractBusinessDays(useStartDate, preUseDays);
    const blockEnd = await addBusinessDays(useEnd, postUseDays);

    return {
      useStart: useStartDate,
      useEnd,
      blockStart,
      blockEnd,
      blockRange: `[${formatDateISO(blockStart)}, ${formatDateISO(blockEnd)}]`,
    };
  }
  ```

- [ ] 테스트 실행:
  ```bash
  npx vitest run src/lib/booking-engine/__tests__/block-calculator.test.ts
  ```

- [ ] 모든 테스트 통과 확인.

- [ ] Commit: `feat: implement block period calculator with TDD`

---

### Task 10: 재고 확인기

**파일:**
- Create: `src/lib/booking-engine/inventory.ts`

**Steps:**

- [ ] `src/lib/booking-engine/inventory.ts` 작성:
  ```typescript
  import { prisma } from '@/lib/prisma';
  import { calculateBlockPeriod } from './block-calculator';
  import { getSystemSetting } from './settings';
  import { formatDateISO } from '@/lib/utils';

  /**
   * 특정 날짜의 가용 세트 수를 조회한다.
   */
  export async function getAvailableSetCount(
    targetDate: Date,
    rentalType: 'ONE_NIGHT' | 'TWO_NIGHT'
  ): Promise<number> {
    const block = await calculateBlockPeriod(targetDate, rentalType);
    const totalSets = await getSystemSetting('TOTAL_SETS');

    const blockStartStr = formatDateISO(block.blockStart);
    const blockEndStr = formatDateISO(block.blockEnd);

    const blockedSets = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT equipment_set_id) as count
      FROM reservation_blocks
      WHERE block_range && daterange(
        ${blockStartStr}::date,
        ${blockEndStr}::date,
        '[]'
      )
    `;

    return totalSets - Number(blockedSets[0].count);
  }

  /**
   * 특정 날짜에 대해 사용 가능한 세트 ID 목록을 반환한다.
   */
  export async function getAvailableSetIds(
    targetDate: Date,
    rentalType: 'ONE_NIGHT' | 'TWO_NIGHT'
  ): Promise<number[]> {
    const block = await calculateBlockPeriod(targetDate, rentalType);
    const totalSets = await getSystemSetting('TOTAL_SETS');

    const blockStartStr = formatDateISO(block.blockStart);
    const blockEndStr = formatDateISO(block.blockEnd);

    const blockedSetIds = await prisma.$queryRaw<
      { equipment_set_id: number }[]
    >`
      SELECT DISTINCT equipment_set_id
      FROM reservation_blocks
      WHERE block_range && daterange(
        ${blockStartStr}::date,
        ${blockEndStr}::date,
        '[]'
      )
    `;

    const blockedIds = new Set(blockedSetIds.map((r) => r.equipment_set_id));
    const allSetIds = Array.from({ length: totalSets }, (_, i) => i + 1);
    return allSetIds.filter((id) => !blockedIds.has(id));
  }

  /**
   * 월별 가용 현황을 벌크 조회한다 (캘린더 렌더링 최적화).
   * 반환값: { 'YYYY-MM-DD': { available: number, total: number } }
   */
  export async function getMonthlyAvailability(
    year: number,
    month: number, // 1-indexed (1=January)
    rentalType: 'ONE_NIGHT' | 'TWO_NIGHT'
  ): Promise<Record<string, { available: number; total: number }>> {
    const totalSets = await getSystemSetting('TOTAL_SETS');
    const daysInMonth = new Date(year, month, 0).getDate();

    // 해당 월 전체 블락을 한 번에 조회 (넉넉한 범위)
    const rangeStart = new Date(year, month - 1, 1);
    rangeStart.setDate(rangeStart.getDate() - 14); // 2주 전부터
    const rangeEnd = new Date(year, month, 0);
    rangeEnd.setDate(rangeEnd.getDate() + 14); // 2주 후까지

    const rangeStartStr = formatDateISO(rangeStart);
    const rangeEndStr = formatDateISO(rangeEnd);

    const allBlocks = await prisma.$queryRaw<
      {
        equipment_set_id: number;
        lower_bound: string;
        upper_bound: string;
      }[]
    >`
      SELECT
        equipment_set_id,
        lower(block_range)::text as lower_bound,
        upper(block_range)::text as upper_bound
      FROM reservation_blocks
      WHERE block_range && daterange(
        ${rangeStartStr}::date,
        ${rangeEndStr}::date,
        '[]'
      )
    `;

    const availability: Record<string, { available: number; total: number }> =
      {};

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = formatDateISO(date);

      const block = await calculateBlockPeriod(date, rentalType);
      const bStart = formatDateISO(block.blockStart);
      const bEnd = formatDateISO(block.blockEnd);

      // 이 날짜의 블락과 겹치는 기존 블락 세트 수 계산
      const blockedSetIds = new Set<number>();
      for (const existing of allBlocks) {
        if (existing.lower_bound <= bEnd && existing.upper_bound >= bStart) {
          blockedSetIds.add(existing.equipment_set_id);
        }
      }

      availability[dateStr] = {
        available: totalSets - blockedSetIds.size,
        total: totalSets,
      };
    }

    return availability;
  }
  ```

- [ ] Commit: `feat: implement inventory checker with bulk monthly availability`

---

### Task 11: 예약 생성 (동시성 제어)

**파일:**
- Create: `src/lib/booking-engine/create-reservation.ts`
- Create: `src/lib/booking-engine/index.ts` (barrel export)

**Steps:**

- [ ] `src/lib/booking-engine/create-reservation.ts` 작성:
  ```typescript
  import { prisma } from '@/lib/prisma';
  import { calculateBlockPeriod } from './block-calculator';
  import { getAvailableSetIds } from './inventory';
  import { getSystemSetting } from './settings';
  import { formatDateISO } from '@/lib/utils';
  import { Prisma } from '@prisma/client';

  export interface CreateReservationInput {
    userId: string;
    productId: number;
    rentalType: 'ONE_NIGHT' | 'TWO_NIGHT';
    useStartDate: Date;
    totalPrice: number;
    deliveryAddress?: string;
    deliveryMemo?: string;
    options?: { optionId: number; quantity: number; priceAtOrder: number }[];
  }

  export interface CreateReservationResult {
    reservationId: string;
    equipmentSetId: number;
    equipmentSetName: string;
    status: string;
    holdExpiresAt: Date;
    blockStart: Date;
    blockEnd: Date;
    useStart: Date;
    useEnd: Date;
  }

  export class ReservationError extends Error {
    constructor(
      public code:
        | 'SOLD_OUT'
        | 'NO_AVAILABLE_SET'
        | 'BLOCK_CONFLICT'
        | 'UNKNOWN',
      message: string
    ) {
      super(message);
      this.name = 'ReservationError';
    }
  }

  export async function createReservation(
    input: CreateReservationInput
  ): Promise<CreateReservationResult> {
    const block = await calculateBlockPeriod(
      input.useStartDate,
      input.rentalType
    );
    const holdMinutes = await getSystemSetting('HOLD_DURATION_MINUTES');

    // 사전 가용 세트 확인
    const availableSetIds = await getAvailableSetIds(
      input.useStartDate,
      input.rentalType
    );

    if (availableSetIds.length === 0) {
      throw new ReservationError(
        'SOLD_OUT',
        '선택하신 날짜에 예약 가능한 세트가 없습니다.'
      );
    }

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // 1. Advisory Lock 획득 (날짜 기반 — 같은 날짜 예약 직렬화)
          const lockKey = Math.abs(
            hashCode(formatDateISO(input.useStartDate))
          );
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

          // 2. 트랜잭션 내에서 가용 세트 재확인
          const blockStartStr = formatDateISO(block.blockStart);
          const blockEndStr = formatDateISO(block.blockEnd);

          const blockedSetIds = await tx.$queryRaw<
            { equipment_set_id: number }[]
          >`
            SELECT DISTINCT equipment_set_id
            FROM reservation_blocks
            WHERE block_range && daterange(
              ${blockStartStr}::date,
              ${blockEndStr}::date,
              '[]'
            )
          `;

          const blockedIds = new Set(
            blockedSetIds.map((r) => r.equipment_set_id)
          );
          const confirmedAvailable = availableSetIds.filter(
            (id) => !blockedIds.has(id)
          );

          if (confirmedAvailable.length === 0) {
            throw new ReservationError(
              'NO_AVAILABLE_SET',
              '다른 사용자가 먼저 예약하여 가용 세트가 없습니다.'
            );
          }

          // 3. 라운드 로빈: 가장 최근 사용이 적은 세트 선택
          const selectedSetId = confirmedAvailable[0];

          // 4. 예약 생성
          const holdExpiresAt = new Date(
            Date.now() + holdMinutes * 60 * 1000
          );

          const reservation = await tx.reservation.create({
            data: {
              userId: input.userId,
              equipmentSetId: selectedSetId,
              productId: input.productId,
              rentalType: input.rentalType,
              useStartDate: block.useStart,
              useEndDate: block.useEnd,
              blockStartDate: block.blockStart,
              blockEndDate: block.blockEnd,
              status: 'HOLDING',
              totalPrice: input.totalPrice,
              holdExpiresAt,
              deliveryAddress: input.deliveryAddress,
              deliveryMemo: input.deliveryMemo,
            },
          });

          // 5. 블락 삽입 (EXCLUDE 제약조건이 최후 방어선)
          await tx.$executeRaw`
            INSERT INTO reservation_blocks
              (reservation_id, equipment_set_id, block_range)
            VALUES (
              ${reservation.id}::uuid,
              ${selectedSetId},
              daterange(${blockStartStr}::date, ${blockEndStr}::date, '[]')
            )
          `;

          // 6. 소모품 옵션 삽입
          if (input.options && input.options.length > 0) {
            await tx.reservationOption.createMany({
              data: input.options.map((opt) => ({
                reservationId: reservation.id,
                optionId: opt.optionId,
                quantity: opt.quantity,
                priceAtOrder: opt.priceAtOrder,
              })),
            });
          }

          // 7. 세트명 조회
          const equipmentSet = await tx.equipmentSet.findUniqueOrThrow({
            where: { id: selectedSetId },
            select: { name: true },
          });

          return {
            reservationId: reservation.id,
            equipmentSetId: selectedSetId,
            equipmentSetName: equipmentSet.name,
            status: reservation.status,
            holdExpiresAt,
            blockStart: block.blockStart,
            blockEnd: block.blockEnd,
            useStart: block.useStart,
            useEnd: block.useEnd,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 10_000,
        }
      );

      return result;
    } catch (error: any) {
      // EXCLUDE 제약조건 위반 감지
      if (
        error?.code === 'P2010' ||
        error?.message?.includes('no_overlapping_blocks')
      ) {
        throw new ReservationError(
          'BLOCK_CONFLICT',
          '해당 날짜에 예약이 중복되었습니다. 다른 날짜를 선택해 주세요.'
        );
      }
      if (error instanceof ReservationError) throw error;
      throw new ReservationError('UNKNOWN', '예약 생성 중 오류가 발생했습니다.');
    }
  }

  /** 문자열을 정수 해시로 변환 (Advisory Lock 키용) */
  function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return hash;
  }
  ```

- [ ] `src/lib/booking-engine/index.ts` barrel export 작성:
  ```typescript
  export { getSystemSettings, getSystemSetting, invalidateSettingsCache } from './settings';
  export { isBusinessDay, addBusinessDays, subtractBusinessDays, invalidateHolidayCache } from './business-days';
  export { calculateBlockPeriod, type BlockPeriod } from './block-calculator';
  export { getAvailableSetCount, getAvailableSetIds, getMonthlyAvailability } from './inventory';
  export { createReservation, ReservationError, type CreateReservationInput, type CreateReservationResult } from './create-reservation';
  ```

- [ ] Commit: `feat: implement reservation creation with advisory lock and SERIALIZABLE isolation`

---

## Phase 4: API 라우트 (Tasks 12-17)

### Task 12: 상품 API

**파일:**
- Create: `src/app/api/products/route.ts`
- Create: `src/app/api/products/[id]/route.ts`

**Steps:**

- [ ] `src/app/api/products/route.ts` 작성:
  ```typescript
  import { NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';

  export async function GET() {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          capacity: true,
          price1Night: true,
          price2Night: true,
          images: true,
          includes: true,
          sortOrder: true,
        },
      });

      return NextResponse.json({ products });
    } catch (error) {
      console.error('GET /api/products error:', error);
      return NextResponse.json(
        { error: '상품 목록을 불러오지 못했습니다.' },
        { status: 500 }
      );
    }
  }
  ```

- [ ] `src/app/api/products/[id]/route.ts` 작성:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';

  export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const productId = parseInt(params.id, 10);
      if (isNaN(productId)) {
        return NextResponse.json(
          { error: '유효하지 않은 상품 ID입니다.' },
          { status: 400 }
        );
      }

      const product = await prisma.product.findUnique({
        where: { id: productId, isActive: true },
      });

      if (!product) {
        return NextResponse.json(
          { error: '상품을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // 해당 상품의 후기 목록
      const reviews = await prisma.review.findMany({
        where: {
          isVisible: true,
          reservation: { productId },
        },
        include: {
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      // 평균 별점
      const avgRating = await prisma.review.aggregate({
        where: {
          isVisible: true,
          reservation: { productId },
        },
        _avg: { rating: true },
        _count: { rating: true },
      });

      // 소모품 옵션 목록
      const consumableOptions = await prisma.consumableOption.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      return NextResponse.json({
        product,
        reviews,
        reviewStats: {
          averageRating: avgRating._avg.rating ?? 0,
          totalCount: avgRating._count.rating,
        },
        consumableOptions,
      });
    } catch (error) {
      console.error('GET /api/products/[id] error:', error);
      return NextResponse.json(
        { error: '상품 정보를 불러오지 못했습니다.' },
        { status: 500 }
      );
    }
  }
  ```

- [ ] Commit: `feat: add product list and detail API routes`

---

### Task 13: 가용성 API

**파일:**
- Create: `src/app/api/availability/route.ts`
- Create: `src/app/api/availability/[date]/sets/route.ts`

**Steps:**

- [ ] `src/app/api/availability/route.ts` 작성:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { getMonthlyAvailability } from '@/lib/booking-engine';
  import { addBusinessDays } from '@/lib/booking-engine';
  import { getSystemSetting } from '@/lib/booking-engine';
  import { formatDateISO } from '@/lib/utils';

  const querySchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'YYYY-MM 형식이어야 합니다.'),
    type: z.enum(['ONE_NIGHT', 'TWO_NIGHT']),
  });

  export async function GET(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const parsed = querySchema.safeParse({
        month: searchParams.get('month'),
        type: searchParams.get('type'),
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { month, type } = parsed.data;
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10);

      // 최소 예약 가능일 계산
      const minAdvanceDays = await getSystemSetting(
        'MIN_ADVANCE_BUSINESS_DAYS'
      );
      const minBookableDate = await addBusinessDays(new Date(), minAdvanceDays);

      const availability = await getMonthlyAvailability(year, monthNum, type);

      return NextResponse.json({
        month,
        rentalType: type,
        minBookableDate: formatDateISO(minBookableDate),
        availability,
      });
    } catch (error) {
      console.error('GET /api/availability error:', error);
      return NextResponse.json(
        { error: '가용 현황을 조회하지 못했습니다.' },
        { status: 500 }
      );
    }
  }
  ```

- [ ] `src/app/api/availability/[date]/sets/route.ts` 작성:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { getAvailableSetCount } from '@/lib/booking-engine';

  const querySchema = z.object({
    type: z.enum(['ONE_NIGHT', 'TWO_NIGHT']),
  });

  export async function GET(
    request: NextRequest,
    { params }: { params: { date: string } }
  ) {
    try {
      const dateStr = params.date;
      const targetDate = new Date(dateStr);
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { error: '유효하지 않은 날짜입니다.' },
          { status: 400 }
        );
      }

      const searchParams = request.nextUrl.searchParams;
      const parsed = querySchema.safeParse({
        type: searchParams.get('type'),
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const available = await getAvailableSetCount(
        targetDate,
        parsed.data.type
      );

      return NextResponse.json({
        date: dateStr,
        rentalType: parsed.data.type,
        available,
        total: 10,
      });
    } catch (error) {
      console.error('GET /api/availability/[date]/sets error:', error);
      return NextResponse.json(
        { error: '가용 세트를 조회하지 못했습니다.' },
        { status: 500 }
      );
    }
  }
  ```

- [ ] Commit: `feat: add availability API routes for monthly and daily queries`

---

### Task 14: 예약 API (사용자)

**파일:**
- Create: `src/app/api/reservations/route.ts`
- Create: `src/app/api/reservations/[id]/confirm/route.ts`
- Create: `src/app/api/reservations/[id]/cancel/route.ts`
- Create: `src/app/api/my/reservations/route.ts`
- Create: `src/app/api/my/reservations/[id]/route.ts`

**Steps:**

- [ ] `src/app/api/reservations/route.ts` 작성 (POST: 예약 생성):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { createServerSupabase } from '@/lib/supabase/server';
  import { createReservation, ReservationError } from '@/lib/booking-engine';

  const createSchema = z.object({
    productId: z.number().int().positive(),
    rentalType: z.enum(['ONE_NIGHT', 'TWO_NIGHT']),
    useStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    deliveryAddress: z.string().optional(),
    deliveryMemo: z.string().optional(),
    options: z
      .array(
        z.object({
          optionId: z.number().int().positive(),
          quantity: z.number().int().positive(),
          priceAtOrder: z.number().int().nonnegative(),
        })
      )
      .optional(),
    totalPrice: z.number().int().positive(),
  });

  export async function POST(request: NextRequest) {
    try {
      const supabase = createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: '로그인이 필요합니다.' },
          { status: 401 }
        );
      }

      const body = await request.json();
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const result = await createReservation({
        userId: user.id,
        productId: parsed.data.productId,
        rentalType: parsed.data.rentalType,
        useStartDate: new Date(parsed.data.useStartDate),
        totalPrice: parsed.data.totalPrice,
        deliveryAddress: parsed.data.deliveryAddress,
        deliveryMemo: parsed.data.deliveryMemo,
        options: parsed.data.options,
      });

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      if (error instanceof ReservationError) {
        const statusMap = {
          SOLD_OUT: 409,
          NO_AVAILABLE_SET: 409,
          BLOCK_CONFLICT: 409,
          UNKNOWN: 500,
        };
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: statusMap[error.code] }
        );
      }
      console.error('POST /api/reservations error:', error);
      return NextResponse.json(
        { error: '예약 생성에 실패했습니다.' },
        { status: 500 }
      );
    }
  }
  ```

- [ ] `src/app/api/reservations/[id]/confirm/route.ts` 작성 (POST: 결제 확인):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { prisma } from '@/lib/prisma';
  import { createServerSupabase } from '@/lib/supabase/server';

  const confirmSchema = z.object({
    paymentId: z.string().min(1),
  });

  export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const supabase = createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
      }

      const body = await request.json();
      const parsed = confirmSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const reservation = await prisma.reservation.findFirst({
        where: { id: params.id, userId: user.id, status: 'HOLDING' },
      });

      if (!reservation) {
        return NextResponse.json(
          { error: '확인할 수 있는 예약이 없습니다.' },
          { status: 404 }
        );
      }

      // 홀딩 만료 확인
      if (
        reservation.holdExpiresAt &&
        reservation.holdExpiresAt < new Date()
      ) {
        return NextResponse.json(
          { error: '결제 시간이 만료되었습니다.' },
          { status: 410 }
        );
      }

      const updated = await prisma.reservation.update({
        where: { id: params.id },
        data: {
          status: 'CONFIRMED',
          paymentId: parsed.data.paymentId,
          holdExpiresAt: null,
        },
      });

      return NextResponse.json({ reservation: updated });
    } catch (error) {
      console.error('POST /api/reservations/[id]/confirm error:', error);
      return NextResponse.json(
        { error: '결제 확인에 실패했습니다.' },
        { status: 500 }
      );
    }
  }
  ```

- [ ] `src/app/api/reservations/[id]/cancel/route.ts` 작성 (POST: 예약 취소):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { prisma } from '@/lib/prisma';
  import { createServerSupabase } from '@/lib/supabase/server';

  const cancelSchema = z.object({
    reason: z.string().optional(),
  });

  export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const supabase = createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
      }

      const body = await request.json();
      const parsed = cancelSchema.safeParse(body);

      const reservation = await prisma.reservation.findFirst({
        where: {
          id: params.id,
          userId: user.id,
          status: { in: ['HOLDING', 'CONFIRMED'] },
        },
      });

      if (!reservation) {
        return NextResponse.json(
          { error: '취소할 수 있는 예약이 없습니다.' },
          { status: 404 }
        );
      }

      await prisma.$transaction([
        prisma.reservationBlock.deleteMany({
          where: { reservationId: reservation.id },
        }),
        prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: parsed.data?.reason ?? '사용자 취소',
          },
        }),
      ]);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('POST /api/reservations/[id]/cancel error:', error);
      return NextResponse.json(
        { error: '예약 취소에 실패했습니다.' },
        { status: 500 }
      );
    }
  }
  ```

- [ ] `src/app/api/my/reservations/route.ts` 작성 (GET: 내 예약 목록):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { createServerSupabase } from '@/lib/supabase/server';

  export async function GET(request: NextRequest) {
    try {
      const supabase = createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
      }

      const status = request.nextUrl.searchParams.get('status');

      const reservations = await prisma.reservation.findMany({
        where: {
          userId: user.id,
          ...(status ? { status: status as any } : {}),
        },
        include: {
          product: { select: { name: true, images: true } },
          equipmentSet: { select: { name: true } },
          review: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ reservations });
    } catch (error) {
      console.error('GET /api/my/reservations error:', error);
      return NextResponse.json(
        { error: '예약 목록을 불러오지 못했습니다.' },
        { status: 500 }
      );
    }
  }
  ```

- [ ] `src/app/api/my/reservations/[id]/route.ts` 작성 (GET: 예약 상세):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { createServerSupabase } from '@/lib/supabase/server';

  export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const supabase = createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
      }

      const reservation = await prisma.reservation.findFirst({
        where: { id: params.id, userId: user.id },
        include: {
          product: true,
          equipmentSet: { select: { name: true, status: true } },
          options: {
            include: { option: { select: { name: true } } },
          },
          review: true,
        },
      });

      if (!reservation) {
        return NextResponse.json(
          { error: '예약을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      return NextResponse.json({ reservation });
    } catch (error) {
      console.error('GET /api/my/reservations/[id] error:', error);
      return NextResponse.json(
        { error: '예약 정보를 불러오지 못했습니다.' },
        { status: 500 }
      );
    }
  }
  ```

- [ ] Commit: `feat: add user reservation API routes (create, confirm, cancel, list, detail)`

---

### Task 15: 후기 API

**파일:**
- Create: `src/app/api/reviews/route.ts`

**Steps:**

- [ ] `src/app/api/reviews/route.ts` 작성:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { prisma } from '@/lib/prisma';
  import { createServerSupabase } from '@/lib/supabase/server';

  // GET: 상품별 후기 목록
  export async function GET(request: NextRequest) {
    try {
      const productId = request.nextUrl.searchParams.get('productId');
      const page = parseInt(
        request.nextUrl.searchParams.get('page') ?? '1',
        10
      );
      const limit = 10;

      const where: any = { isVisible: true };
      if (productId) {
        where.reservation = { productId: parseInt(productId, 10) };
      }

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            user: { select: { name: true } },
            reservation: {
              select: {
                product: { select: { name: true } },
                rentalType: true,
                useStartDate: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.review.count({ where }),
      ]);

      return NextResponse.json({
        reviews,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('GET /api/reviews error:', error);
      return NextResponse.json(
        { error: '후기를 불러오지 못했습니다.' },
        { status: 500 }
      );
    }
  }

  // POST: 후기 작성
  const createReviewSchema = z.object({
    reservationId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    content: z.string().min(10, '최소 10자 이상 작성해 주세요.'),
    images: z.array(z.string().url()).max(5).optional(),
  });

  export async function POST(request: NextRequest) {
    try {
      const supabase = createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
      }

      const body = await request.json();
      const parsed = createReviewSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      // 해당 예약이 본인 것인지, COMPLETED 상태인지 확인
      const reservation = await prisma.reservation.findFirst({
        where: {
          id: parsed.data.reservationId,
          userId: user.id,
          status: 'COMPLETED',
        },
        include: { review: true },
      });

      if (!reservation) {
        return NextResponse.json(
          { error: '후기를 작성할 수 있는 예약이 아닙니다.' },
          { status: 404 }
        );
      }

      if (reservation.review) {
        return NextResponse.json(
          { error: '이미 후기를 작성했습니다.' },
          { status: 409 }
        );
      }

      const review = await prisma.review.create({
        data: {
          reservationId: parsed.data.reservationId,
          userId: user.id,
          rating: parsed.data.rating,
          content: parsed.data.content,
          images: parsed.data.images ?? [],
        },
      });

      return NextResponse.json({ review }, { status: 201 });
    } catch (error) {
      console.error('POST /api/reviews error:', error);
      return NextResponse.json(
        { error: '후기 작성에 실패했습니다.' },
        { status: 500 }
      );
    }
  }
  ```

- [ ] Commit: `feat: add review API routes (list and create)`

---

### Task 16: 관리자 API

**파일:**
- Create: `src/app/api/admin/dashboard/route.ts`
- Create: `src/app/api/admin/reservations/route.ts`
- Create: `src/app/api/admin/reservations/[id]/route.ts`
- Create: `src/app/api/admin/reservations/[id]/status/route.ts`
- Create: `src/app/api/admin/sets/route.ts`
- Create: `src/app/api/admin/sets/[id]/status/route.ts`
- Create: `src/app/api/admin/sets/[id]/timeline/route.ts`
- Create: `src/app/api/admin/products/route.ts`
- Create: `src/app/api/admin/products/[id]/route.ts`
- Create: `src/app/api/admin/consumables/route.ts`
- Create: `src/app/api/admin/consumables/[id]/route.ts`
- Create: `src/app/api/admin/holidays/route.ts`
- Create: `src/app/api/admin/holidays/[id]/route.ts`
- Create: `src/app/api/admin/holidays/sync/route.ts`
- Create: `src/app/api/admin/settings/route.ts`
- Create: `src/lib/admin-auth.ts`

**Steps:**

- [ ] `src/lib/admin-auth.ts` 관리자 인증 헬퍼 작성:
  ```typescript
  import { NextResponse } from 'next/server';
  import { createServerSupabase } from '@/lib/supabase/server';
  import { prisma } from '@/lib/prisma';

  export async function requireAdmin() {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }), user: null };
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (profile?.role !== 'ADMIN') {
      return { error: NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 }), user: null };
    }

    return { error: null, user };
  }
  ```

- [ ] `src/app/api/admin/dashboard/route.ts` 작성:
  ```typescript
  import { NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';

  export async function GET() {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        totalReservations,
        holdingCount,
        confirmedCount,
        todayReservations,
        recentReservations,
        equipmentSets,
      ] = await Promise.all([
        prisma.reservation.count(),
        prisma.reservation.count({ where: { status: 'HOLDING' } }),
        prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
        prisma.reservation.count({
          where: { createdAt: { gte: today, lt: tomorrow } },
        }),
        prisma.reservation.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: { select: { name: true } },
            product: { select: { name: true } },
            equipmentSet: { select: { name: true } },
          },
        }),
        prisma.equipmentSet.findMany({
          orderBy: { id: 'asc' },
          include: {
            currentReservation: {
              select: { id: true, status: true, useStartDate: true, useEndDate: true },
            },
          },
        }),
      ]);

      return NextResponse.json({
        stats: { totalReservations, holdingCount, confirmedCount, todayReservations },
        recentReservations,
        equipmentSets,
      });
    } catch (error) {
      console.error('GET /api/admin/dashboard error:', error);
      return NextResponse.json({ error: '대시보드 데이터 조회 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/reservations/route.ts` 작성 (GET: 전체 예약 목록):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';

  export async function GET(request: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const searchParams = request.nextUrl.searchParams;
      const status = searchParams.get('status');
      const search = searchParams.get('search');
      const page = parseInt(searchParams.get('page') ?? '1', 10);
      const limit = parseInt(searchParams.get('limit') ?? '20', 10);

      const where: any = {};
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { id: { contains: search } },
          { user: { name: { contains: search } } },
          { user: { email: { contains: search } } },
        ];
      }

      const [reservations, total] = await Promise.all([
        prisma.reservation.findMany({
          where,
          include: {
            user: { select: { name: true, email: true } },
            product: { select: { name: true } },
            equipmentSet: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.reservation.count({ where }),
      ]);

      return NextResponse.json({
        reservations,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('GET /api/admin/reservations error:', error);
      return NextResponse.json({ error: '예약 목록 조회 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/reservations/[id]/route.ts` 작성 (GET: 예약 상세):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';

  export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: params.id },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          product: true,
          equipmentSet: true,
          options: { include: { option: true } },
          review: true,
        },
      });

      if (!reservation) {
        return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
      }

      return NextResponse.json({ reservation });
    } catch (error) {
      console.error('GET /api/admin/reservations/[id] error:', error);
      return NextResponse.json({ error: '예약 상세 조회 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/reservations/[id]/status/route.ts` 작성 (PATCH: 상태 변경):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';

  const statusSchema = z.object({
    status: z.enum([
      'HOLDING', 'CONFIRMED', 'SHIPPING', 'IN_USE',
      'RETURNING', 'COMPLETED', 'CANCELLED',
    ]),
  });

  export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const body = await request.json();
      const parsed = statusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }

      const reservation = await prisma.reservation.findUnique({
        where: { id: params.id },
      });
      if (!reservation) {
        return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
      }

      const updateData: any = { status: parsed.data.status };

      // 취소 시 블락 해제
      if (parsed.data.status === 'CANCELLED') {
        await prisma.reservationBlock.deleteMany({
          where: { reservationId: params.id },
        });
        updateData.cancelledAt = new Date();
        updateData.cancelReason = '관리자 취소';
      }

      const updated = await prisma.reservation.update({
        where: { id: params.id },
        data: updateData,
      });

      return NextResponse.json({ reservation: updated });
    } catch (error) {
      console.error('PATCH /api/admin/reservations/[id]/status error:', error);
      return NextResponse.json({ error: '상태 변경 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/sets/route.ts` 작성 (GET: 세트 목록):
  ```typescript
  import { NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';

  export async function GET() {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const sets = await prisma.equipmentSet.findMany({
        orderBy: { id: 'asc' },
        include: {
          currentReservation: {
            select: {
              id: true, status: true, useStartDate: true, useEndDate: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      return NextResponse.json({ sets });
    } catch (error) {
      console.error('GET /api/admin/sets error:', error);
      return NextResponse.json({ error: '세트 목록 조회 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/sets/[id]/status/route.ts` 작성 (PATCH: 세트 상태 변경):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';

  const statusSchema = z.object({
    status: z.enum(['AVAILABLE', 'PREP', 'SHIPPING', 'IN_USE', 'RETURNING', 'MAINTENANCE']),
    currentReservationId: z.string().uuid().nullable().optional(),
    notes: z.string().optional(),
  });

  export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const setId = parseInt(params.id, 10);
      const body = await request.json();
      const parsed = statusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }

      const updated = await prisma.equipmentSet.update({
        where: { id: setId },
        data: {
          status: parsed.data.status,
          ...(parsed.data.currentReservationId !== undefined && {
            currentReservationId: parsed.data.currentReservationId,
          }),
          ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
        },
      });

      return NextResponse.json({ set: updated });
    } catch (error) {
      console.error('PATCH /api/admin/sets/[id]/status error:', error);
      return NextResponse.json({ error: '세트 상태 변경 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/sets/[id]/timeline/route.ts` 작성 (GET: 세트 타임라인):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';

  export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const setId = parseInt(params.id, 10);
      const reservations = await prisma.reservation.findMany({
        where: {
          equipmentSetId: setId,
          status: { notIn: ['CANCELLED'] },
        },
        select: {
          id: true, status: true, rentalType: true,
          useStartDate: true, useEndDate: true,
          blockStartDate: true, blockEndDate: true,
          user: { select: { name: true } },
          product: { select: { name: true } },
        },
        orderBy: { useStartDate: 'asc' },
      });

      return NextResponse.json({ setId, reservations });
    } catch (error) {
      console.error('GET /api/admin/sets/[id]/timeline error:', error);
      return NextResponse.json({ error: '타임라인 조회 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/products/route.ts` 작성 (GET: 목록, POST: 생성):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';

  export async function GET() {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const products = await prisma.product.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      return NextResponse.json({ products });
    } catch (err) {
      return NextResponse.json({ error: '상품 목록 조회 실패' }, { status: 500 });
    }
  }

  const createProductSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    capacity: z.number().int().min(1).max(10).default(1),
    price1Night: z.number().int().positive(),
    price2Night: z.number().int().positive(),
    images: z.array(z.string()).optional(),
    includes: z.array(z.string()).optional(),
    sortOrder: z.number().int().optional(),
  });

  export async function POST(request: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const body = await request.json();
      const parsed = createProductSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }

      const product = await prisma.product.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          capacity: parsed.data.capacity,
          price1Night: parsed.data.price1Night,
          price2Night: parsed.data.price2Night,
          images: parsed.data.images ?? [],
          includes: parsed.data.includes ?? [],
          sortOrder: parsed.data.sortOrder ?? 0,
        },
      });

      return NextResponse.json({ product }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: '상품 생성 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/products/[id]/route.ts` 작성 (PUT: 수정, DELETE: 비활성화):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';

  const updateProductSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    capacity: z.number().int().min(1).max(10).optional(),
    price1Night: z.number().int().positive().optional(),
    price2Night: z.number().int().positive().optional(),
    images: z.array(z.string()).optional(),
    includes: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  });

  export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const body = await request.json();
      const parsed = updateProductSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }

      const product = await prisma.product.update({
        where: { id: parseInt(params.id, 10) },
        data: parsed.data,
      });

      return NextResponse.json({ product });
    } catch (err) {
      return NextResponse.json({ error: '상품 수정 실패' }, { status: 500 });
    }
  }

  export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const product = await prisma.product.update({
        where: { id: parseInt(params.id, 10) },
        data: { isActive: false },
      });

      return NextResponse.json({ product });
    } catch (err) {
      return NextResponse.json({ error: '상품 비활성화 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/consumables/route.ts` 작성 (GET, POST):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';

  export async function GET() {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const options = await prisma.consumableOption.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      return NextResponse.json({ options });
    } catch (err) {
      return NextResponse.json({ error: '소모품 목록 조회 실패' }, { status: 500 });
    }
  }

  const createSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().int().nonnegative(),
    sortOrder: z.number().int().optional(),
  });

  export async function POST(request: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const body = await request.json();
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }

      const option = await prisma.consumableOption.create({ data: parsed.data });
      return NextResponse.json({ option }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: '소모품 생성 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/consumables/[id]/route.ts` 작성 (PUT, DELETE):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';

  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    price: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  });

  export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const body = await request.json();
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }

      const option = await prisma.consumableOption.update({
        where: { id: parseInt(params.id, 10) },
        data: parsed.data,
      });
      return NextResponse.json({ option });
    } catch (err) {
      return NextResponse.json({ error: '소모품 수정 실패' }, { status: 500 });
    }
  }

  export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const option = await prisma.consumableOption.update({
        where: { id: parseInt(params.id, 10) },
        data: { isActive: false },
      });
      return NextResponse.json({ option });
    } catch (err) {
      return NextResponse.json({ error: '소모품 비활성화 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/holidays/route.ts` 작성 (GET, POST):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';
  import { invalidateHolidayCache } from '@/lib/booking-engine';

  export async function GET(request: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const year = request.nextUrl.searchParams.get('year');
      const where = year ? { year: parseInt(year, 10) } : {};

      const holidays = await prisma.holiday.findMany({
        where,
        orderBy: { date: 'asc' },
      });

      return NextResponse.json({ holidays });
    } catch (err) {
      return NextResponse.json({ error: '공휴일 목록 조회 실패' }, { status: 500 });
    }
  }

  const createHolidaySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    name: z.string().min(1),
  });

  export async function POST(request: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const body = await request.json();
      const parsed = createHolidaySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }

      const dateObj = new Date(parsed.data.date);
      const holiday = await prisma.holiday.create({
        data: {
          date: dateObj,
          name: parsed.data.name,
          year: dateObj.getFullYear(),
          isCustom: true,
        },
      });

      invalidateHolidayCache();
      return NextResponse.json({ holiday }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: '공휴일 추가 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/holidays/[id]/route.ts` 작성 (DELETE):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';
  import { invalidateHolidayCache } from '@/lib/booking-engine';

  export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      await prisma.holiday.delete({
        where: { id: parseInt(params.id, 10) },
      });

      invalidateHolidayCache();
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: '공휴일 삭제 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/holidays/sync/route.ts` 작성 (POST: 공휴일 동기화):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';
  import { invalidateHolidayCache } from '@/lib/booking-engine';

  const syncSchema = z.object({
    year: z.number().int().min(2024).max(2030),
  });

  export async function POST(request: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const body = await request.json();
      const parsed = syncSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }

      const { year } = parsed.data;

      // 한국천문연구원 특일정보 API 호출
      const serviceKey = process.env.HOLIDAY_API_KEY;
      if (!serviceKey) {
        return NextResponse.json(
          { error: '공휴일 API 키가 설정되지 않았습니다.' },
          { status: 500 }
        );
      }

      const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?serviceKey=${serviceKey}&solYear=${year}&numOfRows=50&_type=json`;
      const response = await fetch(url);
      const data = await response.json();

      const items =
        data?.response?.body?.items?.item ?? [];
      const holidays = (Array.isArray(items) ? items : [items]).map(
        (item: any) => {
          const dateStr = String(item.locdate);
          return {
            date: new Date(
              `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
            ),
            name: item.dateName,
            year,
            isCustom: false,
          };
        }
      );

      // 해당 연도 비커스텀 공휴일 삭제 후 재삽입
      await prisma.holiday.deleteMany({
        where: { year, isCustom: false },
      });

      await prisma.holiday.createMany({
        data: holidays,
        skipDuplicates: true,
      });

      invalidateHolidayCache();
      return NextResponse.json({ synced: holidays.length, year });
    } catch (err) {
      console.error('Holiday sync error:', err);
      return NextResponse.json({ error: '공휴일 동기화 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/admin/settings/route.ts` 작성 (GET, PUT):
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { prisma } from '@/lib/prisma';
  import { requireAdmin } from '@/lib/admin-auth';
  import { invalidateSettingsCache } from '@/lib/booking-engine';

  export async function GET() {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const settings = await prisma.systemSetting.findMany({
        orderBy: { key: 'asc' },
      });
      return NextResponse.json({ settings });
    } catch (err) {
      return NextResponse.json({ error: '설정 조회 실패' }, { status: 500 });
    }
  }

  const updateSettingsSchema = z.record(z.string(), z.number().int().positive());

  export async function PUT(request: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    try {
      const body = await request.json();
      const parsed = updateSettingsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const updates = Object.entries(parsed.data).map(([key, value]) =>
        prisma.systemSetting.update({
          where: { key },
          data: { value },
        })
      );

      await Promise.all(updates);
      invalidateSettingsCache();

      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: '설정 변경 실패' }, { status: 500 });
    }
  }
  ```

- [ ] Commit: `feat: add complete admin API routes (dashboard, reservations, sets, products, consumables, holidays, settings)`

---

### Task 17: Webhook + Cron API

> **의존성 참고:** PortOne webhook 라우트는 `src/lib/portone/webhook.ts`를 import한다. Task 36에서 해당 파일을 생성하므로, 이 태스크 실행 시 webhook.ts를 먼저 작성해야 한다.

**파일:**
- Create: `src/lib/portone/webhook.ts` (Task 36에서 상세 구현, 여기서 미리 생성)
- Create: `src/app/api/webhooks/portone/route.ts`
- Create: `src/app/api/cron/expire-holdings/route.ts`
- Create: `src/app/api/cron/sync-holidays/route.ts`

**Steps:**

- [ ] `src/lib/portone/webhook.ts` 작성 (Task 36에서 재사용):
  ```typescript
  import crypto from 'crypto';

  export function verifyPortOneWebhook(
    payload: string,
    signature: string | null
  ): boolean {
    if (!signature || !process.env.PORTONE_WEBHOOK_SECRET) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', process.env.PORTONE_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }
  ```

- [ ] `src/app/api/webhooks/portone/route.ts` 작성:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { verifyPortOneWebhook } from '@/lib/portone/webhook';

  export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      const signature = request.headers.get('x-portone-signature');

      // 서명 검증
      if (!verifyPortOneWebhook(JSON.stringify(body), signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const { paymentId, status } = body;

      if (status === 'PAID') {
        await prisma.reservation.updateMany({
          where: { paymentId, status: 'HOLDING' },
          data: {
            status: 'CONFIRMED',
            holdExpiresAt: null,
          },
        });
      } else if (status === 'FAILED' || status === 'CANCELLED') {
        const reservation = await prisma.reservation.findFirst({
          where: { paymentId },
        });

        if (reservation) {
          await prisma.$transaction([
            prisma.reservationBlock.deleteMany({
              where: { reservationId: reservation.id },
            }),
            prisma.reservation.update({
              where: { id: reservation.id },
              data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelReason: `결제 ${status === 'FAILED' ? '실패' : '취소'}`,
              },
            }),
          ]);
        }
      }

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error('PortOne webhook error:', error);
      return NextResponse.json({ error: 'Webhook 처리 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/cron/expire-holdings/route.ts` 작성:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';

  export async function GET(request: NextRequest) {
    // Vercel Cron 인증
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const expired = await prisma.reservation.findMany({
        where: {
          status: 'HOLDING',
          holdExpiresAt: { lt: new Date() },
        },
        select: { id: true },
      });

      let processedCount = 0;
      for (const reservation of expired) {
        try {
          await prisma.$transaction([
            prisma.reservationBlock.deleteMany({
              where: { reservationId: reservation.id },
            }),
            prisma.reservation.update({
              where: { id: reservation.id },
              data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelReason: '결제 시간 초과 (자동 취소)',
              },
            }),
          ]);
          processedCount++;
        } catch (err) {
          console.error(`Failed to expire reservation ${reservation.id}:`, err);
        }
      }

      return NextResponse.json({
        expired: processedCount,
        total: expired.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Expire holdings cron error:', error);
      return NextResponse.json({ error: 'Cron 처리 실패' }, { status: 500 });
    }
  }
  ```

- [ ] `src/app/api/cron/sync-holidays/route.ts` 작성:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { invalidateHolidayCache } from '@/lib/booking-engine';

  export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const nextYear = new Date().getFullYear() + 1;
      const serviceKey = process.env.HOLIDAY_API_KEY;

      if (!serviceKey) {
        return NextResponse.json({ error: 'HOLIDAY_API_KEY not set' }, { status: 500 });
      }

      const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?serviceKey=${serviceKey}&solYear=${nextYear}&numOfRows=50&_type=json`;
      const response = await fetch(url);
      const data = await response.json();

      const items = data?.response?.body?.items?.item ?? [];
      const holidays = (Array.isArray(items) ? items : [items]).map(
        (item: any) => {
          const dateStr = String(item.locdate);
          return {
            date: new Date(
              `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
            ),
            name: item.dateName,
            year: nextYear,
            isCustom: false,
          };
        }
      );

      await prisma.holiday.deleteMany({ where: { year: nextYear, isCustom: false } });
      await prisma.holiday.createMany({ data: holidays, skipDuplicates: true });

      invalidateHolidayCache();
      return NextResponse.json({ synced: holidays.length, year: nextYear });
    } catch (error) {
      console.error('Holiday sync cron error:', error);
      return NextResponse.json({ error: '공휴일 동기화 실패' }, { status: 500 });
    }
  }
  ```

- [ ] Commit: `feat: add PortOne webhook handler and cron jobs for holding expiry and holiday sync`

---

## Phase 5: 인증 시스템 (Tasks 18-20)

### Task 18: Next.js 미들웨어

**파일:**
- Create: `src/middleware.ts`

**Steps:**

- [ ] `src/middleware.ts` 작성:
  ```typescript
  import { createServerClient } from '@supabase/ssr';
  import { NextResponse, type NextRequest } from 'next/server';

  export async function middleware(request: NextRequest) {
    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // 인증 필요 페이지 보호: /my/*
    if (pathname.startsWith('/my') && !user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 관리자 페이지 보호: /admin/*
    if (pathname.startsWith('/admin')) {
      if (!user) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    // 관리자 API 보호: /api/admin/*
    if (pathname.startsWith('/api/admin')) {
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return response;
  }

  export const config = {
    matcher: ['/my/:path*', '/admin/:path*', '/api/admin/:path*'],
  };
  ```

- [ ] Commit: `feat: add Next.js middleware for auth and admin route protection`

---

### Task 19: 인증 페이지

**파일:**
- Create: `src/app/auth/login/page.tsx`
- Create: `src/app/auth/signup/page.tsx`
- Create: `src/app/auth/callback/route.ts`

**Steps:**

- [ ] `src/app/auth/login/page.tsx` 작성:
  ```tsx
  'use client';

  import { useState } from 'react';
  import { useRouter, useSearchParams } from 'next/navigation';
  import Link from 'next/link';
  import { createClient } from '@/lib/supabase/client';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

  export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect') ?? '/';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const supabase = createClient();

    async function handleEmailLogin(e: React.FormEvent) {
      e.preventDefault();
      setLoading(true);
      setError('');

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        setLoading(false);
        return;
      }

      router.push(redirect);
      router.refresh();
    }

    async function handleKakaoLogin() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
        },
      });
      if (error) setError('카카오 로그인에 실패했습니다.');
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-moss">
              PackTrail 로그인
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-moss hover:bg-moss/90"
                disabled={loading}
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted">또는</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleKakaoLogin}
            >
              카카오로 로그인
            </Button>

            <p className="text-center text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <Link href="/auth/signup" className="text-olive hover:underline">
                회원가입
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  ```

- [ ] `src/app/auth/signup/page.tsx` 작성:
  ```tsx
  'use client';

  import { useState } from 'react';
  import { useRouter } from 'next/navigation';
  import Link from 'next/link';
  import { createClient } from '@/lib/supabase/client';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

  export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const supabase = createClient();

    async function handleSignup(e: React.FormEvent) {
      e.preventDefault();
      setLoading(true);
      setError('');

      if (password.length < 6) {
        setError('비밀번호는 6자 이상이어야 합니다.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone },
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    }

    if (success) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-cream px-4">
          <Card className="w-full max-w-md">
            <CardContent className="py-8 text-center">
              <h2 className="mb-4 text-xl font-bold text-moss">회원가입 완료!</h2>
              <p className="mb-4 text-gray-600">
                이메일로 인증 링크가 발송되었습니다. 이메일을 확인해 주세요.
              </p>
              <Link href="/auth/login">
                <Button className="bg-moss hover:bg-moss/90">로그인으로 이동</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-moss">회원가입</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <Label htmlFor="phone">연락처 (선택)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-moss hover:bg-moss/90"
                disabled={loading}
              >
                {loading ? '가입 중...' : '회원가입'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link href="/auth/login" className="text-olive hover:underline">
                로그인
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  ```

- [ ] `src/app/auth/callback/route.ts` 작성:
  ```typescript
  import { createServerSupabase } from '@/lib/supabase/server';
  import { NextRequest, NextResponse } from 'next/server';

  export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const redirect = requestUrl.searchParams.get('redirect') ?? '/';

    if (code) {
      const supabase = createServerSupabase();
      await supabase.auth.exchangeCodeForSession(code);
    }

    return NextResponse.redirect(new URL(redirect, requestUrl.origin));
  }
  ```

- [ ] Commit: `feat: add authentication pages (login, signup, OAuth callback)`

---

### Task 20: Supabase Auth 설정 (수동 단계)

**파일:** 없음 (Supabase Dashboard에서 수동 설정)

**Steps:**

- [ ] Supabase Dashboard > Authentication > Providers에서 Email, Kakao 활성화
- [ ] Supabase Dashboard > Database > Functions에서 `handle_new_user` trigger 생성:
  ```sql
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger AS $$
  BEGIN
    INSERT INTO public.users (id, email, name, role, created_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      'USER',
      NOW()
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  ```
- [ ] RLS 정책 적용 (SYSTEM_DESIGN.md 5.3절 참고)
- [ ] Storage 버킷 생성: `product-images` (public), `review-images` (public) + 정책 적용
- [ ] Realtime publications에 `reservations`, `equipment_sets` 테이블 추가
- [ ] 이메일 로그인/회원가입 동작 확인
- [ ] Commit: 해당 없음 (수동 설정 문서화)

---

## Phase 6: 사용자 페이지 (Tasks 21-28)

### Task 21: 레이아웃 셸

**파일:**
- Create: `src/app/(public)/layout.tsx`
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/components/layout/Footer.tsx`

**Steps:**

- [ ] `src/components/layout/Navbar.tsx` 작성:
  ```tsx
  'use client';

  import { useState } from 'react';
  import Link from 'next/link';
  import { useRouter } from 'next/navigation';
  import { createClient } from '@/lib/supabase/client';
  import { Button } from '@/components/ui/button';
  import { Menu, X, User } from 'lucide-react';

  interface NavbarProps {
    user: { id: string; email: string; name?: string } | null;
  }

  export default function Navbar({ user }: NavbarProps) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleLogout() {
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    }

    return (
      <nav className="sticky top-0 z-50 border-b bg-moss text-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-olive">
            PackTrail
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6 md:flex">
            <Link href="/products" className="hover:text-olive transition-colors">
              장비 둘러보기
            </Link>
            {user ? (
              <>
                <Link href="/my" className="hover:text-olive transition-colors">
                  마이페이지
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-white hover:text-olive"
                >
                  로그아웃
                </Button>
              </>
            ) : (
              <Link href="/auth/login">
                <Button variant="outline" size="sm" className="border-olive text-white hover:bg-olive">
                  로그인
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-white/20 bg-moss px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <Link
                href="/products"
                className="py-2 hover:text-olive"
                onClick={() => setMobileOpen(false)}
              >
                장비 둘러보기
              </Link>
              {user ? (
                <>
                  <Link
                    href="/my"
                    className="py-2 hover:text-olive"
                    onClick={() => setMobileOpen(false)}
                  >
                    마이페이지
                  </Link>
                  <button
                    className="py-2 text-left hover:text-olive"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="py-2 hover:text-olive"
                  onClick={() => setMobileOpen(false)}
                >
                  로그인
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    );
  }
  ```

- [ ] `src/components/layout/Footer.tsx` 작성:
  ```tsx
  import Link from 'next/link';

  export default function Footer() {
    return (
      <footer className="bg-footer-dark text-white/80">
        <div className="container-page py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <h3 className="mb-3 text-lg font-bold text-olive">PackTrail</h3>
              <p className="text-sm leading-relaxed">
                백패킹 입문자를 위한 장비 렌탈 서비스.
                <br />
                고가의 장비 구매 부담 없이 캠핑을 즐겨보세요.
              </p>
            </div>
            <div>
              <h4 className="mb-3 font-semibold">바로가기</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/products" className="hover:text-olive transition-colors">
                    장비 둘러보기
                  </Link>
                </li>
                <li>
                  <Link href="/my" className="hover:text-olive transition-colors">
                    마이페이지
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold">고객센터</h4>
              <ul className="space-y-2 text-sm">
                <li>이메일: support@packtrial.kr</li>
                <li>운영시간: 평일 10:00-18:00</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-white/20 pt-6 text-center text-xs text-white/50">
            &copy; {new Date().getFullYear()} PackTrail. All rights reserved.
          </div>
        </div>
      </footer>
    );
  }
  ```

- [ ] `src/app/(public)/layout.tsx` 작성:
  ```tsx
  import { createServerSupabase } from '@/lib/supabase/server';
  import { prisma } from '@/lib/prisma';
  import Navbar from '@/components/layout/Navbar';
  import Footer from '@/components/layout/Footer';

  export default async function PublicLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    let user = null;
    if (authUser) {
      const profile = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { id: true, email: true, name: true },
      });
      user = profile;
    }

    return (
      <div className="flex min-h-screen flex-col">
        <Navbar user={user} />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    );
  }
  ```

- [ ] Commit: `feat: add public layout shell with Navbar and Footer`

---

### Task 22: 메인 페이지

**파일:**
- Create: `src/app/(public)/page.tsx`

**Steps:**

- [ ] `src/app/(public)/page.tsx` 작성: Hero 섹션, 가치 제안 (4 카드), 이용 방법 (4 스텝), 상품 미리보기, 후기, CTA 배너 포함. 반응형 레이아웃 (데스크톱 + 모바일).
  - Hero: 큰 텍스트 + CTA 버튼, 배경 cream
  - 가치 제안 카드: 4개 아이콘 + 텍스트 카드 (2x2 그리드)
  - 이용 방법: 4단계 스텝 (상품선택 → 날짜선택 → 결제 → 캠핑)
  - 상품 미리보기: 서버에서 products 조회 후 카드 렌더링
  - 후기: 서버에서 최근 후기 조회
  - CTA 배너: "지금 장비를 둘러보세요" 버튼

- [ ] 반응형 확인: 모바일(375px), 태블릿(768px), 데스크톱(1280px).

- [ ] Commit: `feat: implement landing page with all sections`

---

### Task 23: 상품 목록

**파일:**
- Create: `src/app/(public)/products/page.tsx`
- Create: `src/components/products/ProductCard.tsx`
- Create: `src/components/products/ProductFilterTabs.tsx`

**Steps:**

- [ ] `src/components/products/ProductCard.tsx` 작성: 이미지, 상품명, 가격, "예약하기" 버튼. Card 컴포넌트 활용.

- [ ] `src/components/products/ProductFilterTabs.tsx` 작성: 전체/1인용/2인용 필터 탭 (칩 형태, 선택 시 올리브 그린).

- [ ] `src/app/(public)/products/page.tsx` 작성: TanStack Query로 상품 목록 조회. 2열 그리드 (max-width 840px) / 1열 모바일.

- [ ] Commit: `feat: implement product list page with filter tabs`

---

### Task 24: 상품 상세

**파일:**
- Create: `src/app/(public)/products/[id]/page.tsx`

**Steps:**

- [ ] `src/app/(public)/products/[id]/page.tsx` 작성:
  - 데스크톱: 좌측 이미지 갤러리 + 우측 가격 박스
  - 탭: 포함 장비 / 이용 안내 / 후기
  - 모바일: 하단 sticky CTA 버튼 ("예약하기")
  - 서버 사이드에서 상품 + 후기 데이터 조회

- [ ] Commit: `feat: implement product detail page with tabs and sticky CTA`

---

### Task 25: 예약 플로우 — 스텝 컴포넌트

**파일:**
- Create: `src/components/booking/BookingStepIndicator.tsx`
- Create: `src/components/booking/RentalTypeSelector.tsx`
- Create: `src/components/booking/BookingCalendar.tsx`
- Create: `src/components/booking/OptionsSelector.tsx`
- Create: `src/components/booking/OrderSummary.tsx`
- Create: `src/components/booking/PaymentTimer.tsx`
- Create: `src/components/booking/ScheduleTimeline.tsx`

**Steps:**

- [ ] `BookingStepIndicator.tsx`: 4단계 표시기 (렌탈 유형 → 날짜 선택 → 옵션 → 주문 요약). 현재 스텝 하이라이트.

- [ ] `RentalTypeSelector.tsx`: 1박 2일 / 2박 3일 선택 카드. 선택 시 가격 표시.

- [ ] `BookingCalendar.tsx`: react-day-picker v8 활용. 가용성 API에서 비활성화 날짜를 받아 disabled modifiers 설정. 잔여 세트 수를 날짜별로 표시.
  ```tsx
  // 핵심 로직 개요
  // - useQuery로 월별 가용 현황 조회
  // - disabled: 가용 세트 0 또는 minBookableDate 이전
  // - modifiers: { soldOut: [...], limited: [...] }
  // - onDayClick: 선택 시 부모에 콜백
  ```

- [ ] `OptionsSelector.tsx`: 소모품 옵션 목록 (체크박스 + 수량). 가격 합산.

- [ ] `OrderSummary.tsx`: 선택 내역 요약 카드 (렌탈 유형, 날짜, 옵션, 총 가격).

- [ ] `PaymentTimer.tsx`: 10분 카운트다운 타이머. hold_expires_at 기반. 만료 시 경고.

- [ ] `ScheduleTimeline.tsx`: 블락 시작~끝 일정 타임라인 (출고준비 → 배송 → 사용 → 회수 → 정비). 수직 타임라인 UI.

- [ ] Commit: `feat: implement booking step components (calendar, options, summary, timer, timeline)`

---

### Task 26: 예약 페이지 (4스텝 통합)

**파일:**
- Create: `src/app/(public)/booking/[productId]/page.tsx`

**Steps:**

- [ ] `src/app/(public)/booking/[productId]/page.tsx` 작성:
  - 4단계 state machine (`step: 1|2|3|4`) with `useState`
  - Step 1: RentalTypeSelector
  - Step 2: BookingCalendar (+ 가용성 조회)
  - Step 3: OptionsSelector
  - Step 4: OrderSummary + "결제하기" 버튼
  - 데스크톱: 좌측 사이드바 (스텝 진행 인디케이터 + OrderSummary 항상 표시) + 우측 스텝 콘텐츠
  - 모바일: 상단 스텝 바 + 전체 화면 스텝 콘텐츠
  - "결제하기" 클릭 시 POST /api/reservations → 성공 시 /checkout/[reservationId]로 이동

- [ ] Commit: `feat: implement multi-step booking page`

---

### Task 27: 결제 페이지

**파일:**
- Create: `src/app/(public)/checkout/[reservationId]/page.tsx`
- Create: `src/app/(public)/booking/complete/page.tsx`

**Steps:**

- [ ] `src/app/(public)/checkout/[reservationId]/page.tsx` 작성:
  - 주문 요약 (상품, 날짜, 옵션, 가격)
  - 배송지 입력 폼 (주소, 메모)
  - ScheduleTimeline (예상 일정)
  - PaymentTimer (홀딩 카운트다운)
  - PortOne 결제 버튼 (네이버페이, 카카오페이, 카드)
  - 결제 성공 시 POST /api/reservations/[id]/confirm → /booking/complete로 리다이렉트

- [ ] `src/app/(public)/booking/complete/page.tsx` 작성:
  - 예약 확인 메시지 + 예약 번호
  - 예상 일정 타임라인
  - "마이페이지에서 확인" 링크

- [ ] Commit: `feat: implement checkout and booking complete pages`

---

### Task 28: 마이페이지

**파일:**
- Create: `src/components/reservations/ReservationCard.tsx`
- Create: `src/components/reservations/ReservationStatusBadge.tsx`
- Create: `src/components/reservations/StatusTracker.tsx`
- Create: `src/app/(public)/my/page.tsx`
- Create: `src/app/(public)/my/reservations/[id]/page.tsx`
- Create: `src/app/(public)/my/reservations/[id]/review/page.tsx`

**Steps:**

- [ ] `ReservationStatusBadge.tsx`: 상태별 색상 배지 (HOLDING=holding, CONFIRMED=olive, SHIPPING=warning, IN_USE=status-purple, RETURNING=status-blue, COMPLETED=sage, CANCELLED=muted).

- [ ] `StatusTracker.tsx`: 수평 타임라인 형태 상태 트래커 (예약확정 → 배송중 → 사용중 → 회수중 → 완료). 완료 단계는 올리브 그린 원 + 체크, 현재 단계는 올리브 그린 활성 원 (pulse 애니메이션), 미완료 단계는 회색 비활성 원. 각 단계별 날짜/시간 표시. 모바일에서는 컴팩트 모드 (아이콘 + 현재 상태 텍스트).

- [ ] `ReservationCard.tsx`: 상품 이미지 썸네일, 상태 배지, 날짜, 가격, 미니 트래커.

- [ ] `src/app/(public)/my/page.tsx` 작성:
  - 필터 탭 (전체/진행중/완료/취소)
  - ReservationCard 목록
  - TanStack Query로 내 예약 조회

- [ ] `src/app/(public)/my/reservations/[id]/page.tsx` 작성:
  - 예약 상세 정보 전체
  - 풀 StatusTracker
  - 옵션, 배송지, 가격 내역
  - 취소 버튼 (HOLDING/CONFIRMED 상태에서만)
  - 후기 작성 버튼 (COMPLETED 상태 + 미작성 시)

- [ ] `src/app/(public)/my/reservations/[id]/review/page.tsx` 작성:
  - 별점 선택 (1~5)
  - 텍스트 에어리어 (최소 10자)
  - 이미지 업로드 (최대 5장, Supabase Storage)
  - POST /api/reviews 로 제출

- [ ] Commit: `feat: implement my page with reservation list, detail, and review form`

---

## Phase 7: 관리자 페이지 (Tasks 29-35)

### Task 29: 관리자 레이아웃

**파일:**
- Create: `src/components/layout/AdminSidebar.tsx`
- Create: `src/app/admin/layout.tsx`

**Steps:**

- [ ] `AdminSidebar.tsx` 작성:
  - 데스크톱: 좌측 사이드바 (width 220px, bg-moss, 화이트 텍스트)
  - 메뉴: 대시보드, 예약 관리, 세트 관리, 상품 관리, 공휴일 관리, 설정
  - 모바일: 하단 탭 바 (5개 아이콘)
  - 현재 경로: 올리브 그린 좌측 보더 + 반투명 화이트 배경

- [ ] `src/app/admin/layout.tsx` 작성:
  ```tsx
  import AdminSidebar from '@/components/layout/AdminSidebar';

  export default function AdminLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="flex min-h-screen bg-admin-bg">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    );
  }
  ```

- [ ] Commit: `feat: add admin layout with sidebar and mobile tab bar`

---

### Task 30: 대시보드

**파일:**
- Create: `src/components/admin/StatsCard.tsx`
- Create: `src/components/admin/SetStatusGrid.tsx`
- Create: `src/app/admin/page.tsx`

**Steps:**

- [ ] `StatsCard.tsx`: 숫자 + 라벨 + 아이콘 카드.

- [ ] `SetStatusGrid.tsx`: 10개 세트 상태 그리드 (2x5 또는 5x2). 상태별 색상 코딩.

- [ ] `src/app/admin/page.tsx` 작성:
  - 4개 통계 카드 (오늘 예약, 홀딩 중, 확정, 총 예약)
  - 오늘의 할 일 (출고/회수 예정)
  - 최근 예약 테이블
  - SetStatusGrid
  - Supabase Realtime 구독으로 예약 변경 시 자동 갱신

- [ ] Commit: `feat: implement admin dashboard with stats, tasks, and realtime updates`

---

### Task 31: 예약 관리

**파일:**
- Create: `src/components/admin/ReservationTable.tsx`
- Create: `src/components/admin/HoldingTimer.tsx`
- Create: `src/app/admin/reservations/page.tsx`
- Create: `src/app/admin/reservations/[id]/page.tsx`

**Steps:**

- [ ] `ReservationTable.tsx`: shadcn Table 컴포넌트 활용. 컬럼: 예약ID(축약), 고객명, 상품, 세트, 날짜, 상태, 금액. 행 클릭 시 상세 이동.

- [ ] `HoldingTimer.tsx`: HOLDING 상태 예약의 남은 시간 표시 (빨간색 카운트다운).

- [ ] `src/app/admin/reservations/page.tsx` 작성:
  - 검색 입력 (예약ID, 고객명)
  - 상태 필터 칩
  - ReservationTable + 페이지네이션
  - HOLDING 행에 HoldingTimer 표시

- [ ] `src/app/admin/reservations/[id]/page.tsx` 작성:
  - 예약 전체 상세 정보
  - 상태 변경 드롭다운 + 확인 다이얼로그
  - 고객 정보, 배송지, 옵션, 결제 정보
  - 타임라인 (블락 일정)

- [ ] Commit: `feat: implement admin reservation management pages`

---

### Task 32: 세트 타임라인

**파일:**
- Create: `src/components/admin/GanttTimeline.tsx`
- Create: `src/app/admin/sets/page.tsx`

**Steps:**

- [ ] `GanttTimeline.tsx` 작성:
  - 2주 간트 차트 (데스크톱): Y축 = SET-01~10, X축 = 날짜, 블락을 컬러 바로 표시
  - 블락 기간 색상: 출고/배송=warning, 사용중=status-purple, 회수/정비=status-blue, 가용=olive
  - 오늘 표시 라인

- [ ] `src/app/admin/sets/page.tsx` 작성:
  - 데스크톱: GanttTimeline
  - 모바일: 카드 그리드 (세트별 현재 상태 + 다음 예약)
  - 세트 상태 수동 변경 기능

- [ ] Commit: `feat: implement set timeline with Gantt chart view`

---

### Task 33: 상품 관리

**파일:**
- Create: `src/app/admin/products/page.tsx`

**Steps:**

- [ ] `src/app/admin/products/page.tsx` 작성:
  - 상품 카드 목록 (편집/비활성화 버튼)
  - 상품 추가/수정 다이얼로그 (이름, 설명, 가격, 이미지 URL, 포함 장비)
  - 소모품 옵션 테이블 (하단 섹션)
  - 소모품 추가/수정/비활성화

- [ ] Commit: `feat: implement admin product and consumable management`

---

### Task 34: 공휴일 관리

**파일:**
- Create: `src/app/admin/holidays/page.tsx`

**Steps:**

- [ ] `src/app/admin/holidays/page.tsx` 작성:
  - 연도 탭 (2025, 2026, 2027)
  - 공휴일 테이블 (날짜, 이름, 유형 [자동/수동], 삭제 버튼)
  - "공휴일 동기화" 버튼 (POST /api/admin/holidays/sync)
  - "임시 휴무 추가" 다이얼로그 (날짜 선택 + 이름 입력)

- [ ] Commit: `feat: implement admin holiday management page`

---

### Task 35: 시스템 설정

**파일:**
- Create: `src/app/admin/settings/page.tsx`

**Steps:**

- [ ] `src/app/admin/settings/page.tsx` 작성:
  - 설정 그룹별 카드:
    - 예약 블락 설정 (PRE_USE_BUSINESS_DAYS, POST_USE_BUSINESS_DAYS)
    - 예약 정책 (MIN_ADVANCE_BUSINESS_DAYS, HOLD_DURATION_MINUTES)
    - 재고 설정 (TOTAL_SETS)
  - 각 설정: 라벨, 설명, 숫자 입력
  - 안내 배너: "설정 변경 시 새로운 예약부터 적용됩니다."
  - 저장 / 초기화 버튼

- [ ] Commit: `feat: implement admin system settings page`

---

## Phase 8: 결제 연동 (Tasks 36-37)

### Task 36: PortOne 클라이언트 + 검증

**파일:**
- Create: `src/lib/portone/client.ts`
- Create: `src/lib/portone/verify.ts`
- Create: `src/lib/portone/webhook.ts`

**Steps:**

- [ ] `src/lib/portone/client.ts` 작성:
  ```typescript
  'use client';

  export interface PaymentRequest {
    storeId: string;
    paymentId: string;
    orderName: string;
    totalAmount: number;
    currency: string;
    channelKey: string;
    customer: {
      fullName: string;
      email: string;
      phoneNumber?: string;
    };
  }

  export async function requestPayment(params: PaymentRequest) {
    const PortOne = await import('@portone/browser-sdk/v2');

    const response = await PortOne.requestPayment({
      storeId: params.storeId,
      paymentId: params.paymentId,
      orderName: params.orderName,
      totalAmount: params.totalAmount,
      currency: params.currency,
      channelKey: params.channelKey,
      customer: params.customer,
    });

    return response;
  }
  ```

- [ ] `src/lib/portone/verify.ts` 작성:
  ```typescript
  const PORTONE_API_BASE = 'https://api.portone.io';

  interface PortOnePaymentResponse {
    id: string;
    status: string;
    amount: { total: number };
    method: any;
  }

  export async function verifyPayment(
    paymentId: string
  ): Promise<PortOnePaymentResponse> {
    const response = await fetch(
      `${PORTONE_API_BASE}/payments/${paymentId}`,
      {
        headers: {
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`PortOne API error: ${response.status}`);
    }

    return response.json();
  }

  export async function cancelPayment(
    paymentId: string,
    reason: string
  ): Promise<void> {
    const response = await fetch(
      `${PORTONE_API_BASE}/payments/${paymentId}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      }
    );

    if (!response.ok) {
      throw new Error(`PortOne cancel error: ${response.status}`);
    }
  }
  ```

- [ ] `src/lib/portone/webhook.ts` 작성:
  ```typescript
  import crypto from 'crypto';

  export function verifyPortOneWebhook(
    payload: string,
    signature: string | null
  ): boolean {
    if (!signature || !process.env.PORTONE_WEBHOOK_SECRET) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', process.env.PORTONE_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }
  ```

- [ ] Commit: `feat: add PortOne client SDK wrapper, server verification, and webhook signature check`

---

### Task 37: 결제 플로우 통합

**파일:**
- Modify: `src/app/(public)/checkout/[reservationId]/page.tsx`
- Modify: `src/app/api/reservations/[id]/confirm/route.ts`

**Steps:**

- [ ] checkout 페이지에서 실제 PortOne SDK의 `requestPayment`를 호출하도록 연동한다.
  - 결제 성공 시: POST /api/reservations/[id]/confirm에 paymentId 전달
  - confirm 라우트에서 `verifyPayment`로 서버 측 결제 검증 수행
  - 검증 성공 시 status를 CONFIRMED로 변경
  - 검증 실패 시 에러 반환

- [ ] PortOne 테스트 모드에서 동작 확인:
  - 결제 성공 플로우
  - 결제 실패 플로우
  - 결제 취소 플로우

- [ ] Commit: `feat: integrate PortOne payment flow with server-side verification`

---

## Phase 9: Cron + Realtime (Tasks 38-39)

### Task 38: 홀딩 만료 Cron

**파일:**
- Modify: `src/app/api/cron/expire-holdings/route.ts` (이미 Task 17에서 작성)

**Steps:**

- [ ] expire-holdings 라우트에 상세 로깅 추가:
  - 만료 처리된 각 예약의 ID 로깅
  - 처리 시간 측정
  - 에러 발생 시 개별 예약 건 스킵하고 나머지 계속 처리

- [ ] 세트 상태도 함께 초기화: 만료된 예약에 배정된 세트를 AVAILABLE로 변경.

- [ ] 로컬에서 테스트: hold_expires_at을 과거 시간으로 설정한 테스트 예약 생성 후 Cron 엔드포인트 직접 호출하여 자동 취소 확인.

- [ ] Commit: `feat: finalize holding expiry cron with detailed logging and set status reset`

---

### Task 39: Realtime 구독

**파일:**
- Create: `src/lib/supabase/realtime.ts`
- Modify: `src/app/admin/page.tsx` (대시보드에 통합)
- Modify: `src/app/(public)/my/page.tsx` (마이페이지에 통합)

**Steps:**

- [ ] `src/lib/supabase/realtime.ts` 작성:
  ```typescript
  import { createClient } from '@/lib/supabase/client';
  import type { RealtimeChannel } from '@supabase/supabase-js';

  export function subscribeReservationChanges(
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Record<string, any>;
      old: Record<string, any>;
    }) => void
  ): RealtimeChannel {
    const supabase = createClient();

    return supabase
      .channel('reservation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          callback({
            eventType: payload.eventType as any,
            new: payload.new,
            old: payload.old,
          });
        }
      )
      .subscribe();
  }

  export function subscribeSetChanges(
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Record<string, any>;
      old: Record<string, any>;
    }) => void
  ): RealtimeChannel {
    const supabase = createClient();

    return supabase
      .channel('set-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment_sets',
        },
        (payload) => {
          callback({
            eventType: payload.eventType as any,
            new: payload.new,
            old: payload.old,
          });
        }
      )
      .subscribe();
  }
  ```

- [ ] 관리자 대시보드에 Realtime 구독 통합:
  - `useEffect`에서 `subscribeReservationChanges` 호출
  - 변경 이벤트 수신 시 TanStack Query의 `invalidateQueries`로 데이터 갱신
  - 컴포넌트 언마운트 시 채널 unsubscribe

- [ ] 마이페이지에 Realtime 구독 통합:
  - 본인 예약의 상태 변경 시 자동 갱신

- [ ] Realtime 동작 확인: 관리자가 예약 상태를 변경하면 마이페이지에서 실시간 반영되는지 확인.

- [ ] Commit: `feat: add Supabase Realtime subscriptions for admin dashboard and my page`

---

## 최종 점검 체크리스트

- [ ] 모든 API 엔드포인트가 정상 동작하는지 Postman/httpie로 테스트
- [ ] 예약 플로우 전체 E2E 테스트 (상품 선택 → 날짜 선택 → 결제 → 확인)
- [ ] 동시 예약 테스트: 2명이 동시에 같은 날짜 예약 시 1명만 성공하는지 확인
- [ ] 홀딩 만료 테스트: 10분 후 자동 취소 + 블락 해제 확인
- [ ] 관리자 상태 변경 플로우 (CONFIRMED → SHIPPING → IN_USE → RETURNING → COMPLETED)
- [ ] 모바일 반응형 전체 화면 확인 (375px, 768px)
- [ ] 라이트하우스 성능 점수 80+ 확인
- [ ] 환경변수 누락 없는지 확인 (Vercel Dashboard)
- [ ] Vercel Preview 배포 후 통합 테스트
- [ ] Production 배포
