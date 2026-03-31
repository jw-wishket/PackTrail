# PackTrail — 세션 인수인계 문서

> 이 문서는 새로운 Claude Code 세션이 프로젝트 컨텍스트를 빠르게 파악하고 작업을 이어갈 수 있도록 작성되었습니다.
> 마지막 업데이트: 2026-03-31

---

## 1. 프로젝트 개요

- **프로젝트명:** PackTrail — 백패킹 장비 렌탈 플랫폼 MVP
- **목적:** 백패킹 입문자를 위한 장비 세트 렌탈 서비스
- **핵심 기능:** 날짜 블락 기반 예약/재고 관리, 상품별 독립 세트 풀
- **현재 상태:** MVP 구현 완료, Vercel 프로덕션 배포됨
- **코드 규모:** 106개 TypeScript/TSX 파일, 약 9,910줄, 77개 커밋

### 운영 모델

| 항목 | 설명 |
|------|------|
| 장비 세트 | 상품별 독립 세트 풀 (각각 독립 운영) |
| 렌탈 기간 | 1박 2일 / 2박 3일 |
| 블락 공식 | 사용일 + 전후 운영 영업일 (기본 3+3~4) |
| 예약 가능 시점 | 오늘 기준 3영업일 이후부터 |
| 결제 홀딩 | 10분간 재고 홀딩, 미결제 시 자동 취소 |

---

## 2. 기술 스택

| 영역 | 기술 | 버전/상세 |
|------|------|-----------|
| Framework | Next.js (App Router) | 16.2.1 |
| Language | TypeScript | 5.x |
| React | React | 19.2.4 |
| Styling | Tailwind CSS v4 + shadcn/ui | tailwindcss ^4, shadcn ^4.1.1 |
| Database | PostgreSQL | Supabase Cloud, Seoul region |
| ORM | Prisma | 6.19.2 |
| Auth | Supabase Auth | Email + Kakao OAuth (Kakao 미설정) |
| Storage | Supabase Storage | product-images, review-images |
| Payment | PortOne v2 | @portone/browser-sdk ^0.1.3 (코드 구현됨, 실연동 미설정) |
| Realtime | Supabase Realtime | admin dashboard, my page |
| State | TanStack Query | ^5.95.2 |
| Calendar | react-day-picker | ^9.14.0 |
| Validation | Zod | ^4.3.6 |
| Deployment | Vercel | https://packtrial.vercel.app |
| Cron | pg_cron (홀딩 만료 매분) + Vercel Cron (공휴일 동기화 연 1회) | |
| Testing | Vitest (unit) + Playwright (e2e) | vitest ^4.1.2, playwright ^1.58.2 |

---

## 3. 프로젝트 구조

### 핵심 디렉토리

```
PackTrail/
├── prisma/
│   ├── schema.prisma          # DB 스키마 (10개 모델)
│   ├── seed.ts                # 시드 데이터 (TypeScript)
│   └── seed.sql               # 시드 데이터 (SQL, Supabase 직접 실행용)
├── src/
│   ├── app/
│   │   ├── (public)/          # 사용자 화면 (메인, 상품, 예약, 마이페이지)
│   │   │   ├── page.tsx              # 랜딩 페이지
│   │   │   ├── layout.tsx            # 공개 레이아웃 (Navbar + Footer)
│   │   │   ├── products/             # 상품 목록 + 상세
│   │   │   ├── booking/              # 예약 (캘린더 → 옵션 → 확인)
│   │   │   ├── checkout/             # 결제 페이지
│   │   │   └── my/                   # 마이페이지 (예약 목록/상세/리뷰)
│   │   ├── admin/             # 관리자 화면
│   │   │   ├── page.tsx              # 대시보드
│   │   │   ├── layout.tsx            # 관리자 레이아웃 (사이드바)
│   │   │   ├── reservations/         # 예약 관리
│   │   │   ├── products/             # 상품 관리
│   │   │   ├── sets/                 # 세트 관리 (타임라인)
│   │   │   ├── holidays/             # 공휴일 관리
│   │   │   └── settings/             # 시스템 설정
│   │   ├── api/               # API Route Handlers
│   │   │   ├── admin/                # 관리자 API (dashboard, products, reservations, sets, settings, holidays, consumables, upload)
│   │   │   ├── availability/         # 예약 가능일 조회 (월별 + 날짜별 세트)
│   │   │   ├── cron/                 # Cron Jobs (expire-holdings, sync-holidays)
│   │   │   ├── my/                   # 사용자 예약 조회
│   │   │   ├── products/             # 상품 조회
│   │   │   ├── reservations/         # 예약 생성/확정/취소
│   │   │   ├── reviews/              # 리뷰 CRUD
│   │   │   └── webhooks/portone/     # PortOne 결제 웹훅
│   │   ├── auth/              # 인증 (login, signup, callback)
│   │   ├── layout.tsx         # 루트 레이아웃
│   │   ├── not-found.tsx      # 404 페이지
│   │   ├── error.tsx          # 에러 페이지
│   │   └── global-error.tsx   # 전역 에러 페이지
│   ├── components/
│   │   ├── admin/             # 관리자 컴포넌트 (GanttTimeline, HoldingTimer, ReservationTable, SetStatusGrid, StatsCard)
│   │   ├── booking/           # 예약 컴포넌트 (BookingCalendar, StepIndicator, OptionsSelector, OrderSummary, PaymentTimer, RentalTypeSelector, ScheduleTimeline)
│   │   ├── layout/            # 레이아웃 컴포넌트 (Navbar, Footer, AdminSidebar)
│   │   ├── products/          # 상품 컴포넌트 (ProductCard, ProductFilterTabs)
│   │   ├── reservations/      # 예약 컴포넌트 (ReservationCard, ReservationStatusBadge, StatusTracker)
│   │   └── ui/                # shadcn/ui 기본 컴포넌트 (badge, button, calendar, card, dialog, input, label, select, skeleton-card, sonner, spinner, table, tabs)
│   ├── lib/
│   │   ├── booking-engine/    # 핵심 예약 엔진
│   │   │   ├── block-calculator.ts    # 블락 기간 계산
│   │   │   ├── business-days.ts       # 영업일 계산
│   │   │   ├── create-reservation.ts  # 예약 생성 (동시성 제어)
│   │   │   ├── inventory.ts           # 재고/가용성 조회
│   │   │   ├── settings.ts            # 시스템 설정 캐시
│   │   │   ├── index.ts               # 배럴 익스포트
│   │   │   └── __tests__/             # 유닛 테스트 (block-calculator, business-days)
│   │   ├── portone/           # PortOne 결제 연동
│   │   │   ├── client.ts              # 클라이언트 SDK 래퍼
│   │   │   ├── verify.ts              # 결제 검증
│   │   │   └── webhook.ts             # 웹훅 처리
│   │   ├── supabase/          # Supabase 클라이언트
│   │   │   ├── client.ts              # 브라우저 클라이언트
│   │   │   ├── server.ts              # 서버 클라이언트
│   │   │   ├── admin.ts               # 서비스 역할 클라이언트
│   │   │   └── realtime.ts            # Realtime 구독
│   │   ├── admin-auth.ts      # 관리자 인증 헬퍼 (캐시됨)
│   │   ├── prisma.ts          # Prisma 싱글턴 (서버리스 최적화)
│   │   └── utils.ts           # 유틸리티 (cn 등)
│   └── middleware.ts          # 인증 미들웨어 (라우트 보호)
├── e2e/
│   └── full-audit.spec.ts     # E2E 테스트 (Playwright)
├── docs/
│   ├── e2e-test-report.md     # E2E 테스트 보고서
│   ├── portone-integration-guide.md  # PortOne 연동 가이드
│   ├── session-handoff.md     # 이 문서
│   └── superpowers/           # 설계 문서
│       ├── specs/             # UI 디자인 스펙
│       └── plans/             # 구현 계획서
├── CLAUDE.md                  # Claude Code 작업 규칙
├── SYSTEM_DESIGN.md           # 전체 시스템 설계서
├── vercel.json                # Vercel 배포 설정 (cron, headers)
├── package.json               # 의존성 및 스크립트
└── .env.example               # 환경변수 템플릿
```

### 주요 파일 설명

| 파일 | 설명 |
|------|------|
| `src/lib/booking-engine/create-reservation.ts` | 예약 생성 핵심 로직 — Advisory Lock + SERIALIZABLE 격리로 동시성 제어 |
| `src/lib/booking-engine/block-calculator.ts` | 사용일로부터 전후 운영 영업일을 계산하여 블락 기간 산출 |
| `src/lib/booking-engine/inventory.ts` | 월별 가용성 조회 — 성능 최적화됨 (캐시 + 병렬 쿼리) |
| `src/middleware.ts` | Supabase Auth 기반 라우트 보호 (/admin, /my, /booking, /checkout) |
| `src/lib/prisma.ts` | Prisma 싱글턴 패턴 — 서버리스 환경에서 커넥션 풀 재사용 |
| `prisma/schema.prisma` | 10개 모델, EXCLUDE 제약조건 + GiST 인덱스 (raw SQL migration) |

---

## 4. 데이터베이스 스키마 요약

### 모델 목록 (10개)

| 모델 | 테이블명 | 설명 |
|------|----------|------|
| User | users | 사용자 (UUID PK, email unique, role: USER/ADMIN) |
| Product | products | 상품 (가격, 이미지, 포함 장비, 정렬순서) |
| EquipmentSet | equipment_sets | 장비 세트 (상품별 귀속, 상태 관리, 현재 예약 참조) |
| Reservation | reservations | 예약 (사용일, 블락일, 상태, 결제정보, 배송정보) |
| ReservationBlock | reservation_blocks | 블락 범위 (daterange 타입, EXCLUDE 제약조건) |
| ConsumableOption | consumable_options | 소모품 옵션 (부탄가스, 코펠 등) |
| ReservationOption | reservation_options | 예약-옵션 연결 (복합 PK) |
| Review | reviews | 리뷰 (별점, 내용, 이미지, 노출 여부) |
| Holiday | holidays | 공휴일 (date unique, 커스텀 공휴일 지원) |
| SystemSetting | system_settings | 시스템 설정 (key-value, JSON value) |

### 핵심 설계 포인트

- **EquipmentSet은 Product에 귀속** (`product_id` FK) — 상품별 독립 재고 풀
- **ReservationBlock의 `daterange` + EXCLUDE 제약조건**으로 중복 예약 DB 레벨 차단
- **Advisory Lock + SERIALIZABLE 격리**로 동시성 제어
- **pg_cron**으로 HOLDING 만료 매분 자동 처리
- `Unsupported("daterange")` — Prisma에서 직접 지원하지 않아 raw SQL로 관리

### Enum 정의

| Enum | 값 |
|------|-----|
| UserRole | USER, ADMIN |
| SetStatus | AVAILABLE, PREP, SHIPPING, IN_USE, RETURNING, MAINTENANCE |
| RentalType | ONE_NIGHT, TWO_NIGHT |
| ReservationStatus | HOLDING, CONFIRMED, SHIPPING, IN_USE, RETURNING, COMPLETED, CANCELLED |

### 시스템 설정 (system_settings 테이블)

| 키 | 기본값 | 설명 |
|----|--------|------|
| PRE_USE_BUSINESS_DAYS | 3 | 사용 전 운영 영업일 |
| POST_USE_BUSINESS_DAYS | 4 | 사용 후 운영 영업일 |
| MIN_ADVANCE_BUSINESS_DAYS | 3 | 최소 예약 선행 영업일 |
| HOLD_DURATION_MINUTES | 10 | 결제 홀딩 시간 (분) |

---

## 5. 외부 서비스 연결 정보

### Supabase

| 항목 | 값 |
|------|-----|
| Project | PackTrail |
| Reference ID | gdziewwzephruhqsxstk |
| Region | ap-northeast-2 (Seoul) |
| Pooler Host | aws-1-ap-northeast-2.pooler.supabase.com |
| 사용 기능 | PostgreSQL, Auth, Storage, Realtime |

### Vercel

| 항목 | 값 |
|------|-----|
| Project | packtrial (jwlabs-projects) |
| Production URL | https://packtrial.vercel.app |
| Auto deploy | 수동 (`npx vercel --prod --yes`), GitHub 연동은 Dashboard에서 설정 필요 |
| Cron | `/api/cron/sync-holidays` — 매년 12월 1일 (공휴일 동기화) |
| Headers | 모든 API 경로에 `Cache-Control: no-store` |

### GitHub

| 항목 | 값 |
|------|-----|
| Repository | https://github.com/jw-wishket/PackTrail (public) |
| Branch | master |

### PortOne

| 항목 | 값 |
|------|-----|
| Status | 코드 구현 완료, 실제 연동 미설정 |
| SDK | @portone/browser-sdk ^0.1.3 |
| Guide | `docs/portone-integration-guide.md` |

---

## 6. 테스트 계정

### 관리자

| 항목 | 값 |
|------|-----|
| Email | admin@packtrial.com |
| Password | admin123! |
| Role | ADMIN |

### 일반 사용자

| 항목 | 값 |
|------|-----|
| Email | user@test.com |
| Password | test1234! |
| Role | USER |

---

## 7. 현재까지 완료된 작업

### Phase 1: 프로젝트 스캐폴딩 (Tasks 1-3)
- Next.js 프로젝트 생성, 의존성 설치
- Prisma 스키마 정의 (10개 모델)
- Tailwind 커스텀 컬러 및 디자인 토큰 설정
- 유틸리티 함수 및 클라이언트 설정

### Phase 2: 데이터베이스 설정 (Tasks 4-6)
- DB 마이그레이션 (EXCLUDE 제약조건, RLS)
- 시드 데이터 (장비 세트, 시스템 설정, 공휴일, 상품)
- GiST 인덱스 (raw SQL)

### Phase 3: 예약 엔진 (Tasks 7-11)
- 시스템 설정 접근자 (캐시)
- 영업일 계산기 (테스트 포함)
- 블락 기간 계산기 (테스트 포함)
- 재고 체크 (월별 가용성)
- 예약 생성 (Advisory Lock + SERIALIZABLE)

### Phase 4: API Route Handlers (Tasks 12-17)
- 상품 목록/상세 API
- 리뷰 API (GET, POST)
- 예약 API (생성, 확정, 취소, 목록, 상세)
- PortOne 웹훅 + Cron Job
- 관리자 API 전체 (dashboard, products, reservations, sets, settings, holidays, consumables, upload)

### Phase 5: 사용자 화면 — 인증 (Tasks 18-19)
- 로그인/회원가입 페이지
- 인증 미들웨어 (라우트 보호)

### Phase 6: 사용자 화면 — 상품/예약 (Tasks 20-25)
- 공개 레이아웃 (Navbar + Footer)
- 상품 목록/상세 페이지
- 랜딩 페이지
- 멀티스텝 예약 페이지 (캘린더, 옵션, 확인)
- 결제/완료 페이지

### Phase 7: 사용자 화면 — 마이페이지 (Tasks 26-28)
- 예약 목록/상세/리뷰 작성

### Phase 8: 관리자 화면 (Tasks 29-35)
- 관리자 레이아웃 (사이드바 + 모바일 탭바)
- 대시보드 (통계 카드)
- 예약 관리 (목록 + 상세 + 상태 전환)
- 세트 타임라인 (Gantt 차트)
- 상품 관리
- 공휴일 관리
- 시스템 설정

### Phase 9: 결제/Realtime (Tasks 36-39)
- PortOne 클라이언트 SDK 래퍼
- 결제 검증 로직
- 홀딩 만료 Cron 개선
- Supabase Realtime 구독

### 추가 개선 작업 (MVP 이후)

| 커밋 | 내용 |
|------|------|
| 코드 리뷰 수정 | 가격 검증, 타임존, 인증, 동시성 관련 크리티컬 이슈 수정 |
| Suspense 경계 | `useSearchParams` 사용 컴포넌트에 Suspense 추가 |
| 캘린더 UI 개선 | 더 큰 셀, 간격, 범례, 비활성화 날짜 시각적 구분 |
| 예약 상태 중복 제거 | 예약 페이지 스텝 인디케이터 중복 제거 |
| 관리자 네비게이션 | Navbar에 ADMIN 역할 사용자용 관리자 링크 추가 |
| 상품별 독립 세트 | 리팩토링: 상품별 장비 세트 독립 재고 풀 |
| 쿼리 최적화 | SQL 서브쿼리 사용, 상태 필터 완화, 스코프 쿼리 |
| pg_cron 전환 | Vercel Cron 대신 pg_cron으로 홀딩 만료 매분 처리 |
| 모바일 터치 타겟 | 터치 타겟 크기 개선, UI 감사 테스트 스위트 |
| SEO 메타데이터 | 루트/관리자 레이아웃에 메타데이터 추가 |
| 404/에러 페이지 | 커스텀 404, error, global-error 페이지 |
| 로그아웃 버튼 | Navbar에 로그아웃 기능 추가 |
| 설정 페이지 수정 | 영업일 값이 0으로 표시되는 버그 수정 |
| 상태 머신 검증 | 예약 상태 전환 state machine 유효성 검사 |
| 이미지 업로드 | Supabase Storage 상품 이미지 업로드 |
| 스켈레톤/스피너 | 로딩 UX 개선 (스켈레톤 카드, 스피너) |
| 접근성 개선 | 시맨틱 HTML, 스킵 링크, 포커스 스타일 |
| 캘린더 비활성화 | 비활성화 날짜 opacity + strikethrough |

### 성능 최적화

| 최적화 | 내용 |
|--------|------|
| 월별 가용성 계산 | 300+ 직렬 await 제거 → 캐시된 월별 데이터에서 파생 |
| 날짜별 가용성 | 캐시된 월별 데이터에서 per-date 가용성 파생 |
| 관리자 역할 조회 | DB 쿼리 캐시로 매 요청마다 조회 방지 |
| 상품 상세 쿼리 | Promise.all로 병렬화 |
| Prisma 싱글턴 | 프로덕션 서버리스 환경 커넥션 풀 재사용 |

---

## 8. 알려진 이슈 / TODO

### 미구현 기능

- **PortOne 실제 연동** — 가이드 문서 있음 (`docs/portone-integration-guide.md`)
- **카카오 로그인** — Supabase Provider 설정 필요
- **환불 로직** — 가이드에 코드 포함
- **이메일 알림** — 예약 확정/배송/회수 알림

### 알려진 이슈

- **Vercel GitHub auto-deploy 미설정** — Dashboard에서 수동 연결 필요
- **상품 이미지는 현재 이모지** — Supabase Storage 업로드 코드는 구현됨
- **관리자 상태 전환은 state machine으로 제한됨** — 잘못된 전환 시도 시 에러

### 코드 리뷰에서 지적된 미해결 항목

- **웹훅 idempotency** — PortOne 웹훅 중복 처리 방지 미구현
- **확정 예약 취소 시 환불** — 환불 로직 미구현
- **/api/my/reservations 페이지네이션** — 미적용 (현재 전체 조회)

---

## 9. 개발 환경 설정 가이드

### 사전 요구사항

- Node.js 20+
- npm 10+
- Supabase CLI (`npx supabase`)
- GitHub CLI (`gh`)

### 로컬 실행

```bash
git clone https://github.com/jw-wishket/PackTrail.git
cd PackTrail
npm install
# .env.local 설정 (아래 환경변수 참조)
npx prisma generate
npm run dev
```

### 환경변수 (.env.local)

`.env.example` 참조. 아래는 필요한 환경변수 목록:

| 변수명 | 설명 | 비고 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase Dashboard에서 확인 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (공개 키) | Supabase Dashboard에서 확인 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 (비공개) | 관리자 API에서 사용 |
| `DATABASE_URL` | Prisma DB 연결 URL (Pooler) | Supabase Connection Pooler |
| `DIRECT_URL` | Prisma 직접 연결 URL | 마이그레이션용 |
| `PORTONE_API_SECRET` | PortOne API 시크릿 | PortOne 콘솔에서 발급 |
| `NEXT_PUBLIC_PORTONE_STORE_ID` | PortOne 스토어 ID | PortOne 콘솔에서 확인 |
| `PORTONE_WEBHOOK_SECRET` | PortOne 웹훅 시크릿 | PortOne 콘솔에서 설정 |
| `NEXT_PUBLIC_BASE_URL` | 앱 기본 URL | 로컬: `http://localhost:3000` |
| `CRON_SECRET` | Cron Job 인증 토큰 | Vercel 환경변수로 설정 |
| `HOLIDAY_API_KEY` | 한국천문연구원 공휴일 API 키 | 공공데이터포털에서 발급 |

### npm 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 로컬 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint 실행 |
| `npm run test` | Vitest 유닛 테스트 실행 |
| `npm run test:watch` | Vitest watch 모드 |
| `npm run db:seed` | Supabase에 시드 데이터 삽입 (SQL) |
| `npm run db:seed:local` | 로컬 환경 시드 데이터 삽입 (TypeScript) |

### 테스트 실행

```bash
npx vitest run          # 유닛 테스트 (booking-engine 테스트)
npx playwright test     # E2E 테스트 (full-audit.spec.ts)
```

- 유닛 테스트: `src/lib/booking-engine/__tests__/` (block-calculator, business-days)
- E2E 테스트: `e2e/full-audit.spec.ts`
- Vitest 설정에서 e2e 디렉토리는 제외됨

### 배포

```bash
git push origin master    # GitHub push
npx vercel --prod --yes   # Vercel 프로덕션 배포
```

---

## 10. 작업 방식 규칙

- **메인 세션은 설계와 오케스트레이션 전용** — 직접 구현하지 않음
- **모든 실행 작업(구현, 분석, 문서화)은 서브에이전트로 위임**
- 독립적인 작업은 **병렬로** 서브에이전트 실행
- 커밋 시 **Co-Authored-By 문구 제외**
- **한국어 UI**, 코드는 **영어**

---

## 11. 주요 문서 목록

| 문서 | 경로 | 내용 |
|------|------|------|
| 시스템 설계서 | `SYSTEM_DESIGN.md` | 전체 아키텍처, DB 설계, API, 화면 설계 |
| UI 디자인 스펙 | `docs/superpowers/specs/2026-03-31-ui-design.md` | 컬러 시스템, 화면별 레이아웃 |
| 구현 계획 | `docs/superpowers/plans/2026-03-31-packtrial-mvp.md` | 9 Phase, 39 Task |
| E2E 테스트 보고서 | `docs/e2e-test-report.md` | E2E 시나리오 결과 및 스크린샷 |
| PortOne 연동 가이드 | `docs/portone-integration-guide.md` | 결제 연동 단계별 가이드 |
| Claude Code 규칙 | `CLAUDE.md` | 작업 방식 규칙 |
| 이 문서 | `docs/session-handoff.md` | 세션 인수인계 |

---

## 12. 디자인 시스템 (컬러)

아웃도어/자연 감성 디자인. 크림/베이지 배경 + 모스 그린/올리브 그린 포인트.

| 역할 | 색상 | Tailwind 클래스 |
|------|------|-----------------|
| 모스 그린 (Primary) | #3A5A3A | `text-moss`, `bg-moss` |
| 올리브 그린 (Secondary) | #7BA35E | `text-olive`, `bg-olive` |
| 세이지 (Muted) | #6B7C6B | `text-sage` |
| 크림 (Background) | #F7F3EC | `bg-cream` |
| 베이지 (Surface) | #EDE8DD | `bg-beige` |
| 가격 그린 | #5A8A3C | `text-price-green` |
| 상태 블루 | #3A8AC8 | `text-status-blue` |
| 워닝 오렌지 | #E8743A | `text-warning` |
| 푸터 다크 | #2D4A2D | `bg-footer-dark` |
| 관리자 배경 | #F4F4F5 | `bg-admin-bg` |

---

## 13. API 엔드포인트 요약

### 공개 API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/products` | 상품 목록 |
| GET | `/api/products/[id]` | 상품 상세 |
| GET | `/api/availability?productId=&month=` | 월별 예약 가용성 |
| GET | `/api/availability/[date]/sets?productId=` | 날짜별 가용 세트 |
| GET | `/api/reviews?productId=` | 리뷰 목록 |
| POST | `/api/reviews` | 리뷰 작성 |
| POST | `/api/reservations` | 예약 생성 (HOLDING) |
| POST | `/api/reservations/[id]/confirm` | 예약 확정 (결제 검증) |
| POST | `/api/reservations/[id]/cancel` | 예약 취소 |

### 사용자 API (인증 필요)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/my/reservations` | 내 예약 목록 |
| GET | `/api/my/reservations/[id]` | 내 예약 상세 |

### 관리자 API (ADMIN 역할 필요)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/dashboard` | 대시보드 통계 |
| GET/POST | `/api/admin/products` | 상품 CRUD |
| PUT | `/api/admin/products/[id]` | 상품 수정 |
| GET/POST | `/api/admin/reservations` | 예약 목록 |
| GET | `/api/admin/reservations/[id]` | 예약 상세 |
| PATCH | `/api/admin/reservations/[id]/status` | 예약 상태 전환 |
| GET/POST | `/api/admin/sets` | 세트 관리 |
| PATCH | `/api/admin/sets/[id]/status` | 세트 상태 전환 |
| GET | `/api/admin/sets/[id]/timeline` | 세트 타임라인 |
| GET/PUT | `/api/admin/settings` | 시스템 설정 |
| GET/POST | `/api/admin/holidays` | 공휴일 관리 |
| DELETE | `/api/admin/holidays/[id]` | 공휴일 삭제 |
| POST | `/api/admin/holidays/sync` | 공휴일 동기화 |
| GET/POST | `/api/admin/consumables` | 소모품 옵션 |
| PUT | `/api/admin/consumables/[id]` | 소모품 수정 |
| POST | `/api/admin/upload` | 이미지 업로드 |

### Cron / Webhook

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/cron/expire-holdings` | HOLDING 만료 처리 (pg_cron) |
| GET | `/api/cron/sync-holidays` | 공휴일 동기화 (Vercel Cron, 연 1회) |
| POST | `/api/webhooks/portone` | PortOne 결제 웹훅 |

---

## 14. 예약 플로우 요약

```
1. 사용자: 상품 선택 → 예약 페이지 진입
2. 캘린더에서 날짜 선택 (비활성화 날짜 자동 표시)
3. 렌탈 타입 선택 (1박/2박)
4. 소모품 옵션 선택
5. 주문 확인 → 예약 생성 API 호출
   → 서버: Advisory Lock 획득 → 가용 세트 찾기 → HOLDING 예약 생성 → 블락 생성
6. 결제 페이지로 이동 (10분 타이머)
7. PortOne 결제 진행
8. 결제 검증 → 예약 확정 (CONFIRMED)
9. 미결제 시 pg_cron이 매분 HOLDING 만료 처리 → CANCELLED
```

### 관리자 상태 전환 (State Machine)

```
CONFIRMED → SHIPPING → IN_USE → RETURNING → COMPLETED
         ↘ CANCELLED
```
