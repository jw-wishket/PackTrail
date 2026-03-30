# PackTrail — 백패킹 장비 렌탈 플랫폼 MVP 시스템 설계서

> **Version** 1.0 · 2026년 3월  
> **Status** Draft  
> **Confidential**

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [인프라 및 배포 아키텍처](#3-인프라-및-배포-아키텍처)
4. [Supabase 프로젝트 구성](#4-supabase-프로젝트-구성)
5. [데이터베이스 설계](#5-데이터베이스-설계)
6. [핵심 예약/재고 블락 엔진](#6-핵심-예약재고-블락-엔진)
7. [API 설계](#7-api-설계)
8. [화면 설계 및 사용자 플로우](#8-화면-설계-및-사용자-플로우)
9. [인증 및 보안](#9-인증-및-보안)
10. [비기능적 요구사항](#10-비기능적-요구사항)
11. [개발 환경 세팅 가이드](#11-개발-환경-세팅-가이드)
12. [개발 일정 및 마일스톤](#12-개발-일정-및-마일스톤)
13. [향후 확장 계획](#13-향후-확장-계획)

---

## 1. 프로젝트 개요

### 1.1 배경

백패킹 입문자들이 고가의 장비를 구매하는 부담 없이 쉽게 경험할 수 있는 렌탈 서비스를 제공한다. 한정된 수량의 장비 세트(10세트)가 물리적으로 불가능한 날짜에 중복 예약되지 않도록 하는 정교한 예약/재고 관리 시스템이 핵심이다.

### 1.2 목표

- 복잡한 운영 로직(날짜 블락, 물류 처리)을 시스템으로 자동화
- 사용자에게 직관적인 예약 경험 제공 (캘린더 기반 예약 불가일 자동 비활성화)
- 관리자에게 효율적인 운영 환경 제공 (통합 대시보드, 세트별 타임라인)
- MVP 형태로 1차 구축 후 점진적 확장 가능한 구조

### 1.3 운영 모델 요약

| 항목 | 설명 |
|------|------|
| 장비 세트 | 총 10개 세트, 각각 독립 운영 |
| 렌탈 기간 | 1박 2일 / 2박 3일 |
| 블락 공식 | 사용일 + 전후 운영 영업일 (기본 3+3~4) |
| 예약 가능 시점 | 오늘 기준 3영업일 이후부터 |
| 결제 홀딩 | 10분간 재고 홀딩, 미결제 시 자동 취소 |

---

## 2. 기술 스택

### 2.1 스택 총괄

| 영역 | 기술 | 선정 이유 |
|------|------|-----------|
| 프레임워크 | **Next.js 14** (App Router) | SSR/SSG 지원, SEO 최적화, API Routes 통합 |
| 언어 | **TypeScript** | 프론트/백 통일, 타입 안정성 |
| UI | **Tailwind CSS + shadcn/ui** | 빠른 반응형 UI 구축, 커스터마이징 용이 |
| 상태 관리 | **TanStack Query** (React Query) | 서버 상태 캐싱, 낙관적 갱신, 폴링 |
| 데이터베이스 | **PostgreSQL** (Supabase) | 날짜 범위 연산 최적화, RLS, 실시간 구독 |
| ORM | **Prisma** | Type-safe 쿼리, 마이그레이션 관리 |
| 인증 | **Supabase Auth** | OAuth, 이메일/비밀번호, 카카오 로그인 |
| 스토리지 | **Supabase Storage** | 상품/후기 이미지 업로드 |
| 실시간 | **Supabase Realtime** | 관리자 실시간 상태 업데이트 |
| 결제 | **PortOne v2** | 네이버페이/카카오페이 통합 연동 |
| 캘린더 | **react-day-picker** | 날짜 범위 선택, 커스텀 비활성화 지원 |
| 배포 | **Vercel** | Zero-config 배포, Edge Functions, 자동 스케일링 |
| 공휴일 데이터 | **한국천문연구원 API** | 연간 공휴일 데이터 조회 |

### 2.2 아키텍처 선택 근거

**Monolithic + Serverless Hybrid**: MVP 단계에서는 Next.js의 API Routes를 백엔드로 활용하여 단일 프로젝트로 유지한다. 향후 트래픽 증가 시 예약 엔진을 별도 서비스로 분리 가능하다.

**PostgreSQL(Supabase) 선택 이유**: 날짜 범위 연산(`daterange`, `tsrange`), Advisory Lock을 통한 동시성 제어, `EXCLUDE` 제약조건으로 중복 예약 방지가 DB 레벨에서 보장된다.

**Vercel 선택 이유**: Next.js 공식 호스팅으로 빌드/배포 최적화가 기본 제공되며, Edge Network를 통한 글로벌 CDN, Preview Deployments를 통한 PR별 미리보기, Serverless Functions의 자동 스케일링이 MVP에 적합하다.

---

## 3. 인프라 및 배포 아키텍처

### 3.1 전체 구성도

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Browser / Mobile)                                  │
│  Next.js App (SSR + CSR)                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│  Vercel Platform                                            │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │ Edge Network  │  │ Serverless    │  │ Cron Jobs      │  │
│  │ (CDN/Static)  │  │ Functions     │  │ (vercel.json)  │  │
│  │               │  │ (API Routes)  │  │                │  │
│  └───────────────┘  └───────┬───────┘  └───────┬────────┘  │
└─────────────────────────────┼──────────────────┼────────────┘
                              │ Prisma           │
┌─────────────────────────────▼──────────────────▼────────────┐
│  Supabase Cloud                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │ PostgreSQL    │  │ Auth          │  │ Storage        │  │
│  │ (Database)    │  │ (인증/OAuth)  │  │ (이미지)       │  │
│  ├───────────────┤  └───────────────┘  └────────────────┘  │
│  │ Realtime      │  ┌───────────────┐                      │
│  │ (WebSocket)   │  │ Edge          │                      │
│  │               │  │ Functions     │                      │
│  └───────────────┘  └───────────────┘                      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│  External Services                                          │
│  ┌───────────────┐  ┌───────────────┐                      │
│  │ PortOne v2    │  │ 천문연구원    │                      │
│  │ (결제)        │  │ (공휴일 API)  │                      │
│  └───────────────┘  └───────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Vercel 배포 설정

**프로젝트 구조**

```
packtrial/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (public)/           # 사용자 페이지 (layout 공유)
│   │   │   ├── page.tsx        # 홈
│   │   │   ├── products/       # 상품 목록/상세
│   │   │   ├── booking/        # 예약/결제
│   │   │   └── my/             # 마이페이지
│   │   ├── admin/              # 관리자 페이지 (별도 layout)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        # 대시보드
│   │   │   ├── reservations/
│   │   │   ├── sets/
│   │   │   └── settings/
│   │   └── api/                # API Routes (Serverless Functions)
│   │       ├── availability/
│   │       ├── reservations/
│   │       ├── products/
│   │       ├── admin/
│   │       └── webhooks/
│   ├── components/             # 공유 UI 컴포넌트
│   ├── lib/                    # 유틸리티 & 비즈니스 로직
│   │   ├── booking-engine/     # 블락 엔진 코어
│   │   ├── supabase/           # Supabase 클라이언트
│   │   └── portone/            # PortOne 연동
│   └── types/                  # TypeScript 타입 정의
├── prisma/
│   ├── schema.prisma           # DB 스키마
│   └── migrations/             # 마이그레이션 파일
├── public/                     # 정적 파일
├── vercel.json                 # Vercel 설정
├── .env.local                  # 로컬 환경변수
└── package.json
```

**vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-holdings",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/sync-holidays",
      "schedule": "0 0 1 12 *"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

**환경변수 (Vercel Dashboard → Settings → Environment Variables)**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database (Prisma)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres

# PortOne
PORTONE_API_SECRET=...
NEXT_PUBLIC_PORTONE_STORE_ID=...
PORTONE_WEBHOOK_SECRET=...

# App
NEXT_PUBLIC_BASE_URL=https://packtrial.vercel.app
CRON_SECRET=...
```

**배포 파이프라인**

```
GitHub Push → Vercel Auto Build → Preview (PR) / Production (main)
                 │
                 ├── npm run build (Next.js 빌드)
                 ├── npx prisma generate (Prisma Client 생성)
                 └── 자동 배포 + Edge Network 배포
```

### 3.3 외부 서비스 연동

| 서비스 | 역할 | 연동 방식 |
|--------|------|-----------|
| PortOne v2 | 결제 처리 (네이버/카카오페이) | REST API + Webhook |
| Supabase Auth | 사용자 인증 | SDK 통합 |
| Supabase Realtime | 관리자 실시간 상태 업데이트 | WebSocket 구독 |
| Supabase Storage | 상품/후기 이미지 | SDK 업로드/URL |
| 한국천문연구원 API | 공휴일 데이터 | REST API (연간 조회) |

---

## 4. Supabase 프로젝트 구성

### 4.1 프로젝트 생성

- **Region**: Northeast Asia (Seoul) — `ap-northeast-2`
- **Plan**: Free tier (MVP) → Pro 업그레이드 시점: 동시접속 200+ 또는 DB 500MB 초과 시
- **Project Name**: `packtrial-mvp`

### 4.2 Database 설정

**Connection Pooling (PgBouncer)**

Vercel Serverless Functions는 요청마다 새 커넥션을 생성하므로 반드시 PgBouncer를 사용한다.

```
# Prisma용 (PgBouncer 경유 — 포트 6543)
DATABASE_URL=postgresql://postgres.[ref]:[pw]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true

# 마이그레이션용 (직접 연결 — 포트 5432)
DIRECT_URL=postgresql://postgres.[ref]:[pw]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

**Prisma 설정** (`prisma/schema.prisma`)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}
```

**필수 Extension 활성화**

Supabase Dashboard → Database → Extensions에서 활성화:

- `btree_gist` — EXCLUDE 제약조건에 필요
- `pg_trgm` — 검색 최적화 (향후)
- `uuid-ossp` — UUID 자동 생성

### 4.3 Auth 설정

**Supabase Dashboard → Authentication → Providers**

| Provider | 용도 | 설정 |
|----------|------|------|
| Email | 기본 회원가입/로그인 | Confirm Email: ON |
| Kakao | 소셜 로그인 | Kakao Developers 앱 등록 후 Client ID/Secret 입력 |
| Google | 소셜 로그인 (선택) | GCP OAuth 2.0 설정 |

**Auth Hook — 사용자 프로필 자동 생성**

```sql
-- Supabase Dashboard → Database → Functions
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

### 4.4 Storage 설정

**버킷 구성**

| 버킷명 | 접근 | 용도 | 파일 크기 |
|---------|------|------|-----------|
| `product-images` | Public | 상품 이미지 | 최대 5MB |
| `review-images` | Public | 후기 이미지 | 최대 5MB |

**Storage Policy (RLS)**

```sql
-- product-images: 누구나 읽기, 관리자만 쓰기
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admin upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- review-images: 누구나 읽기, 인증 사용자만 쓰기
CREATE POLICY "Public read review images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-images');

CREATE POLICY "Auth users upload review images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'review-images'
    AND auth.role() = 'authenticated'
  );
```

### 4.5 Realtime 설정

관리자 대시보드에서 예약 상태 변경을 실시간으로 수신한다.

```typescript
// lib/supabase/realtime.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function subscribeReservationChanges(
  callback: (payload: any) => void
) {
  return supabase
    .channel('reservation-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reservations',
      },
      callback
    )
    .subscribe();
}
```

**Supabase Dashboard → Database → Publications**

`supabase_realtime` publication에 `reservations`, `equipment_sets` 테이블을 추가한다.

### 4.6 Edge Functions (Supabase)

Vercel Cron에서 호출할 수 없는 장시간 작업이나 DB 트리거 기반 작업에 활용한다.

```
supabase/
└── functions/
    ├── sync-holidays/     # 공휴일 데이터 동기화
    └── send-notification/ # 향후 알림 발송
```

---

## 5. 데이터베이스 설계

### 5.1 ERD 개요

```
users 1──* reservations : "예약한다"
reservations 1──1 reservation_blocks : "블락을 생성한다"
reservations *──1 equipment_sets : "세트가 배정된다"
reservations *──1 products : "상품을 렌탈한다"
reservations 1──0..1 reviews : "후기를 작성한다"
reservations *──* consumable_options : "reservation_options (N:M)"
```

### 5.2 테이블 상세

#### users (사용자)

| 컬럼명 | 타입 | 제약 | 설명 |
|---------|------|------|------|
| id | UUID | PK | Supabase Auth UID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 |
| name | VARCHAR(100) | NOT NULL | 이름 |
| phone | VARCHAR(20) | | 연락처 |
| role | user_role | NOT NULL, DEFAULT 'USER' | USER / ADMIN |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 가입일 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일 |

```sql
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
```

#### products (렌탈 상품)

| 컬럼명 | 타입 | 제약 | 설명 |
|---------|------|------|------|
| id | SERIAL | PK | 상품 ID |
| name | VARCHAR(200) | NOT NULL | 상품명 |
| description | TEXT | | 상품 설명 |
| price_1night | INTEGER | NOT NULL | 1박 2일 가격 (원) |
| price_2night | INTEGER | NOT NULL | 2박 3일 가격 (원) |
| images | JSONB | DEFAULT '[]' | 이미지 URL 배열 |
| includes | JSONB | DEFAULT '[]' | 포함 장비 목록 |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 판매 활성화 여부 |
| sort_order | INTEGER | DEFAULT 0 | 정렬 순서 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |

#### equipment_sets (장비 세트)

| 컬럼명 | 타입 | 제약 | 설명 |
|---------|------|------|------|
| id | SERIAL | PK | 세트 번호 (1~10) |
| name | VARCHAR(100) | NOT NULL, UNIQUE | 세트 명칭 (SET-01) |
| status | set_status | NOT NULL, DEFAULT 'AVAILABLE' | 현재 물류 상태 |
| current_reservation_id | UUID | FK → reservations(id) | 현재 배정된 예약 ID |
| notes | TEXT | | 관리자 메모 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 상태 변경 시각 |

```sql
CREATE TYPE set_status AS ENUM (
  'AVAILABLE', 'PREP', 'SHIPPING', 'IN_USE',
  'RETURNING', 'MAINTENANCE'
);
```

#### reservations (예약)

| 컬럼명 | 타입 | 제약 | 설명 |
|---------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 예약 고유 ID |
| user_id | UUID | FK → users(id), NOT NULL | 예약자 |
| equipment_set_id | INTEGER | FK → equipment_sets(id) | 배정된 장비 세트 |
| product_id | INTEGER | FK → products(id), NOT NULL | 렌탈 상품 |
| rental_type | rental_type | NOT NULL | ONE_NIGHT / TWO_NIGHT |
| use_start_date | DATE | NOT NULL | 사용 시작일 |
| use_end_date | DATE | NOT NULL | 사용 종료일 |
| block_start_date | DATE | NOT NULL | 블락 시작일 (출고준비일) |
| block_end_date | DATE | NOT NULL | 블락 종료일 (정비완료일) |
| status | reservation_status | NOT NULL, DEFAULT 'HOLDING' | 예약 상태 |
| total_price | INTEGER | NOT NULL | 총 결제 금액 (원) |
| payment_id | VARCHAR(100) | | PortOne 결제 ID |
| hold_expires_at | TIMESTAMPTZ | | 홀딩 만료 시각 (결제 전) |
| delivery_address | TEXT | | 배송지 |
| delivery_memo | TEXT | | 배송 메모 |
| cancelled_at | TIMESTAMPTZ | | 취소 시각 |
| cancel_reason | TEXT | | 취소 사유 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 예약 생성 시각 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정 시각 |

```sql
CREATE TYPE rental_type AS ENUM ('ONE_NIGHT', 'TWO_NIGHT');

CREATE TYPE reservation_status AS ENUM (
  'HOLDING',    -- 결제 대기 (10분 홀딩)
  'CONFIRMED',  -- 결제 완료, 예약 확정
  'SHIPPING',   -- 배송 중
  'IN_USE',     -- 사용 중
  'RETURNING',  -- 회수 중
  'COMPLETED',  -- 완료
  'CANCELLED'   -- 취소
);
```

#### reservation_blocks (예약 블락 — 핵심 테이블)

중복 예약 방지의 핵심 테이블이다. PostgreSQL의 `EXCLUDE` 제약조건과 `daterange` 타입을 활용하여 DB 레벨에서 중복을 원천 차단한다.

| 컬럼명 | 타입 | 제약 | 설명 |
|---------|------|------|------|
| id | SERIAL | PK | 블락 레코드 ID |
| reservation_id | UUID | FK → reservations(id), NOT NULL | 예약 ID |
| equipment_set_id | INTEGER | FK → equipment_sets(id), NOT NULL | 장비 세트 ID |
| block_range | DATERANGE | NOT NULL | 블락 날짜 범위 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성 시각 |

```sql
-- 필수: btree_gist extension 활성화
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- EXCLUDE 제약조건: 동일 세트의 블락 기간 겹침 방지
ALTER TABLE reservation_blocks
  ADD CONSTRAINT no_overlapping_blocks
  EXCLUDE USING gist (
    equipment_set_id WITH =,
    block_range WITH &&
  );

-- 인덱스: 가용 세트 조회 최적화
CREATE INDEX idx_blocks_range ON reservation_blocks
  USING gist (block_range);

CREATE INDEX idx_blocks_set_range ON reservation_blocks
  USING gist (equipment_set_id, block_range);
```

이 제약조건으로 동일 세트의 블락 기간이 겹치는 INSERT가 DB 레벨에서 자동 거부된다.

#### reservation_options (예약-소모품 N:M)

| 컬럼명 | 타입 | 제약 | 설명 |
|---------|------|------|------|
| reservation_id | UUID | PK, FK → reservations(id) | 예약 ID |
| option_id | INTEGER | PK, FK → consumable_options(id) | 소모품 ID |
| quantity | INTEGER | NOT NULL, DEFAULT 1 | 수량 |
| price_at_order | INTEGER | NOT NULL | 주문 시점 가격 |

#### consumable_options (소모품 옵션)

| 컬럼명 | 타입 | 제약 | 설명 |
|---------|------|------|------|
| id | SERIAL | PK | 옵션 ID |
| name | VARCHAR(200) | NOT NULL | 옵션명 |
| description | TEXT | | 설명 |
| price | INTEGER | NOT NULL | 가격 (원) |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 판매 활성화 |
| sort_order | INTEGER | DEFAULT 0 | 정렬 순서 |

#### reviews (후기)

| 컬럼명 | 타입 | 제약 | 설명 |
|---------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 후기 ID |
| reservation_id | UUID | FK → reservations(id), UNIQUE | 예약당 1개 후기 |
| user_id | UUID | FK → users(id), NOT NULL | 작성자 |
| rating | SMALLINT | NOT NULL, CHECK (1-5) | 별점 |
| content | TEXT | NOT NULL | 후기 내용 |
| images | JSONB | DEFAULT '[]' | 후기 이미지 URL |
| is_visible | BOOLEAN | NOT NULL, DEFAULT TRUE | 노출 여부 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 작성일 |

#### holidays (공휴일)

| 컬럼명 | 타입 | 제약 | 설명 |
|---------|------|------|------|
| id | SERIAL | PK | ID |
| date | DATE | UNIQUE, NOT NULL | 공휴일 날짜 |
| name | VARCHAR(100) | NOT NULL | 공휴일 명칭 |
| year | INTEGER | NOT NULL | 연도 (조회 편의용) |
| is_custom | BOOLEAN | DEFAULT FALSE | 관리자 수동 추가 여부 |

#### system_settings (시스템 설정)

| 컬럼명 | 타입 | 제약 | 설명 |
|---------|------|------|------|
| key | VARCHAR(100) | PK | 설정 키 |
| value | JSONB | NOT NULL | 설정 값 |
| description | TEXT | | 설명 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 시각 |

```sql
-- 기본 운영 파라미터 삽입
INSERT INTO system_settings (key, value, description) VALUES
('PRE_USE_BUSINESS_DAYS', '3', '사용일 전 운영 영업일 수'),
('POST_USE_BUSINESS_DAYS', '4', '사용일 후 운영 영업일 수'),
('MIN_ADVANCE_BUSINESS_DAYS', '3', '예약 가능 최소 선행 영업일'),
('HOLD_DURATION_MINUTES', '10', '결제 홀딩 시간 (분)'),
('TOTAL_SETS', '10', '총 장비 세트 수');
```

### 5.3 Row Level Security (RLS)

Supabase에서 RLS를 활성화하여 사용자별 데이터 격리를 보장한다.

```sql
-- users: 본인 데이터만 조회/수정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- reservations: 본인 예약만 조회, 관리자는 전체 조회
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reservations"
  ON reservations FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Users create own reservations"
  ON reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- products: 누구나 읽기, 관리자만 쓰기
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
  ));

-- reviews: 누구나 읽기, 본인만 쓰기
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible reviews"
  ON reviews FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Users create own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## 6. 핵심 예약/재고 블락 엔진

### 6.1 영업일 계산기 (BusinessDayCalculator)

모든 날짜 계산의 기반이 되는 모듈이다. 주말(토/일)과 공휴일을 제외한 영업일 기준으로 날짜를 계산한다.

**공휴일 데이터 관리**

- 한국천문연구원 API에서 연간 공휴일 데이터를 조회하여 `holidays` 테이블에 저장
- 매년 12월에 다음 해 공휴일 데이터를 자동 갱신 (Vercel Cron Job)
- 관리자가 임시 휴무일을 수동 추가/삭제 가능

**핵심 함수**

```typescript
// lib/booking-engine/business-days.ts

export async function isBusinessDay(date: Date): Promise<boolean> {
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // 주말 제외

  const dateStr = formatISO(date, { representation: 'date' });
  const holiday = await prisma.holiday.findUnique({
    where: { date: dateStr }
  });
  return !holiday; // 공휴일 제외
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

### 6.2 블락 기간 산출기 (BlockPeriodCalculator)

사용일 기반으로 전체 블락 기간을 산출한다. 운영 파라미터는 `system_settings` 테이블에서 읽어 하드코딩하지 않는다.

**운영 파라미터**

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| PRE_USE_BUSINESS_DAYS | 3 | 사용일 전 운영일 (출고준비 + 출고 + 배송) |
| POST_USE_BUSINESS_DAYS | 4 | 사용일 후 운영일 (회수 + 회수완료 + 정비 + 준비) |
| MIN_ADVANCE_BUSINESS_DAYS | 3 | 예약 가능 최소 선행 영업일 |
| HOLD_DURATION_MINUTES | 10 | 결제 홀딩 시간 (분) |

**블락 계산 예시 (1박 2일, 사용일: 3/26~3/27)**

| 단계 | 날짜 | 영업일 | 설명 |
|------|------|--------|------|
| 출고준비 | 3/23 (월) | Pre-3 | **블락 시작일** |
| 출고 | 3/24 (화) | Pre-2 | 택배사 인계 |
| 배송완료 | 3/25 (수) | Pre-1 | 고객 수령 |
| **사용 시작** | **3/26 (목)** | Use-1 | 캠핑 출발 |
| **사용 종료** | **3/27 (금)** | Use-2 | 캠핑 복귀 |
| (주말) | 3/28~29 | - | 영업일 제외 |
| 회수진행 | 3/30 (월) | Post-1 | 택배 회수 |
| 회수완료 | 3/31 (화) | Post-2 | 창고 입고 |
| 정비 | 4/1 (수) | Post-3 | 장비 점검/세척 |
| 정비/준비 | 4/2 (목) | Post-4 | **블락 종료일** |

결과: 블락 범위 = `[2026-03-23, 2026-04-02]`, 다음 예약 가능일 = `2026-04-03(금)`

```typescript
// lib/booking-engine/block-calculator.ts

interface BlockPeriod {
  useStart: Date;
  useEnd: Date;
  blockStart: Date;
  blockEnd: Date;
  blockRange: string; // PostgreSQL daterange 형식
}

export async function calculateBlockPeriod(
  useStartDate: Date,
  rentalType: 'ONE_NIGHT' | 'TWO_NIGHT'
): Promise<BlockPeriod> {
  const settings = await getSystemSettings();
  const preUseDays = settings.PRE_USE_BUSINESS_DAYS;   // 3
  const postUseDays = settings.POST_USE_BUSINESS_DAYS; // 4

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
    blockRange: `[${formatISO(blockStart)}, ${formatISO(blockEnd)}]`,
  };
}
```

### 6.3 재고 확인기 (InventoryChecker)

캘린더에 표시할 예약 가능/불가 상태를 계산한다.

**날짜별 가용 세트 수 조회**

```typescript
// lib/booking-engine/inventory.ts

export async function getAvailableSetCount(
  targetDate: Date,
  rentalType: 'ONE_NIGHT' | 'TWO_NIGHT'
): Promise<number> {
  const block = await calculateBlockPeriod(targetDate, rentalType);
  const totalSets = await getSystemSetting('TOTAL_SETS'); // 10

  // 해당 블락 범위와 겹치는 기존 블락 조회
  const blockedSets = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT equipment_set_id) as count
    FROM reservation_blocks
    WHERE block_range && daterange(
      ${block.blockStart}::date,
      ${block.blockEnd}::date,
      '[]'
    )
  `;

  return totalSets - Number(blockedSets[0].count);
}

// 월별 가용 현황 벌크 조회 (캘린더 최적화)
export async function getMonthlyAvailability(
  year: number,
  month: number,
  rentalType: 'ONE_NIGHT' | 'TWO_NIGHT'
): Promise<Map<string, number>> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const availability = new Map<string, number>();

  // 해당 월의 모든 블락을 한 번에 조회
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const allBlocks = await prisma.$queryRaw<
    { equipment_set_id: number; block_range: string }[]
  >`
    SELECT equipment_set_id, block_range
    FROM reservation_blocks
    WHERE block_range && daterange(${monthStart}::date, ${monthEnd}::date, '[]')
  `;

  // 날짜별 가용 수 계산
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatISO(date, { representation: 'date' });
    const block = await calculateBlockPeriod(date, rentalType);

    const blockedSetIds = new Set(
      allBlocks
        .filter(b => rangesOverlap(b.block_range, block.blockRange))
        .map(b => b.equipment_set_id)
    );

    availability.set(dateStr, 10 - blockedSetIds.size);
  }

  return availability;
}
```

### 6.4 결제 홀딩 관리자 (PaymentHoldManager)

결제 전 10분간 재고를 임시 확보하고, 미결제 시 자동 복구하는 로직이다.

**홀딩 플로우**

```
1. 사용자가 날짜 선택 → 가용 세트 확인
2. 예약 레코드 생성 (status: HOLDING)
   → reservation_blocks에 블락 삽입 (DB EXCLUDE로 중복 방지)
   → hold_expires_at = NOW() + 10분
3. 결제 페이지로 이동 (PortOne SDK)
4-A. 결제 성공 → Webhook으로 status: CONFIRMED 변경
4-B. 결제 실패/타임아웃 → CANCELLED + 블락 삭제
```

**홀딩 만료 Cron Job** (매분 실행)

```typescript
// app/api/cron/expire-holdings/route.ts

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Vercel Cron 인증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 만료된 홀딩 조회
  const expired = await prisma.reservation.findMany({
    where: {
      status: 'HOLDING',
      hold_expires_at: { lt: new Date() },
    },
  });

  // 트랜잭션으로 일괄 처리
  for (const reservation of expired) {
    await prisma.$transaction([
      prisma.reservationBlock.deleteMany({
        where: { reservation_id: reservation.id },
      }),
      prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'CANCELLED',
          cancelled_at: new Date(),
          cancel_reason: '결제 시간 초과',
        },
      }),
    ]);
  }

  return NextResponse.json({
    expired: expired.length,
    timestamp: new Date().toISOString(),
  });
}
```

### 6.5 동시성 제어 전략

다수 사용자가 동시에 동일 날짜를 예약할 때 데이터 무결성을 보장하는 다층 전략이다.

| 계층 | 방법 | 설명 |
|------|------|------|
| DB 레벨 | EXCLUDE 제약조건 | daterange 겹침 시 INSERT 자체가 실패 (최후방어선) |
| DB 레벨 | SERIALIZABLE 격리 | 예약 생성 트랜잭션에 적용 |
| App 레벨 | Advisory Lock | 세트별 잠금으로 경합 최소화 |
| Client 레벨 | Optimistic UI | 빠른 UX 제공 + 실패 시 롤백 |

```typescript
// lib/booking-engine/create-reservation.ts

export async function createReservation(input: CreateReservationInput) {
  const block = await calculateBlockPeriod(input.useStartDate, input.rentalType);

  return await prisma.$transaction(async (tx) => {
    // 1. Advisory Lock 획득 (세트별)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${input.equipmentSetId})`;

    // 2. 가용 세트 재확인
    const available = await getAvailableSetCount(input.useStartDate, input.rentalType);
    if (available <= 0) {
      throw new Error('SOLD_OUT');
    }

    // 3. 가용 세트 중 하나 선택 (라운드 로빈)
    const availableSet = await findAvailableSet(tx, block);
    if (!availableSet) throw new Error('NO_AVAILABLE_SET');

    // 4. 예약 생성
    const reservation = await tx.reservation.create({
      data: {
        user_id: input.userId,
        equipment_set_id: availableSet.id,
        product_id: input.productId,
        rental_type: input.rentalType,
        use_start_date: block.useStart,
        use_end_date: block.useEnd,
        block_start_date: block.blockStart,
        block_end_date: block.blockEnd,
        status: 'HOLDING',
        total_price: input.totalPrice,
        hold_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        delivery_address: input.deliveryAddress,
      },
    });

    // 5. 블락 삽입 (EXCLUDE 제약조건이 중복 방지)
    await tx.$executeRaw`
      INSERT INTO reservation_blocks
        (reservation_id, equipment_set_id, block_range)
      VALUES (
        ${reservation.id}::uuid,
        ${availableSet.id},
        daterange(${block.blockStart}::date, ${block.blockEnd}::date, '[]')
      )
    `;

    return reservation;
  }, {
    isolationLevel: 'Serializable',
  });
}
```

---

## 7. API 설계

### 7.1 사용자 API

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| GET | `/api/products` | 렌탈 상품 목록 조회 | - |
| GET | `/api/products/[id]` | 상품 상세 + 후기 목록 | - |
| GET | `/api/availability?month=YYYY-MM&type=ONE_NIGHT` | 월별 예약 가능일 조회 | - |
| GET | `/api/availability/[date]/sets?type=ONE_NIGHT` | 특정일 가용 세트 수 조회 | - |
| POST | `/api/reservations` | 예약 생성 + 홀딩 시작 | Required |
| POST | `/api/reservations/[id]/confirm` | 결제 완료 확인 | Required |
| GET | `/api/my/reservations` | 내 예약 목록 | Required |
| GET | `/api/my/reservations/[id]` | 예약 상세 조회 | Required |
| POST | `/api/my/reservations/[id]/cancel` | 예약 취소 | Required |
| POST | `/api/reviews` | 후기 작성 | Required |
| GET | `/api/reviews?productId=N` | 상품별 후기 목록 | - |

### 7.2 관리자 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/admin/dashboard` | 대시보드 요약 데이터 |
| GET | `/api/admin/reservations` | 전체 예약 목록 (필터/페이징) |
| GET | `/api/admin/reservations/[id]` | 예약 상세 |
| PATCH | `/api/admin/reservations/[id]/status` | 예약 상태 변경 |
| GET | `/api/admin/sets` | 장비 세트 목록 + 현재 상태 |
| PATCH | `/api/admin/sets/[id]/status` | 세트 물류 상태 수동 변경 |
| GET | `/api/admin/sets/[id]/timeline` | 세트별 예약 타임라인 |
| CRUD | `/api/admin/products` | 상품 관리 |
| CRUD | `/api/admin/consumables` | 소모품 옵션 관리 |
| CRUD | `/api/admin/holidays` | 공휴일/임시휴무일 관리 |
| GET/PUT | `/api/admin/settings` | 시스템 설정 조회/변경 |

### 7.3 Webhook

| 엔드포인트 | 출처 | 설명 |
|-----------|------|------|
| `/api/webhooks/portone` | PortOne | 결제 성공/실패 알림 수신 |

**PortOne Webhook 처리**

```typescript
// app/api/webhooks/portone/route.ts

export async function POST(request: Request) {
  const body = await request.json();

  // 1. Webhook 서명 검증
  const signature = request.headers.get('x-portone-signature');
  if (!verifyPortOneSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. 결제 상태에 따라 처리
  const { paymentId, status } = body;

  if (status === 'PAID') {
    // 결제 성공 → 예약 확정
    await prisma.reservation.update({
      where: { payment_id: paymentId },
      data: {
        status: 'CONFIRMED',
        hold_expires_at: null,
      },
    });
  } else if (status === 'FAILED' || status === 'CANCELLED') {
    // 결제 실패 → 예약 취소 + 블락 해제
    const reservation = await prisma.reservation.findFirst({
      where: { payment_id: paymentId },
    });
    if (reservation) {
      await prisma.$transaction([
        prisma.reservationBlock.deleteMany({
          where: { reservation_id: reservation.id },
        }),
        prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'CANCELLED',
            cancelled_at: new Date(),
            cancel_reason: '결제 실패',
          },
        }),
      ]);
    }
  }

  return NextResponse.json({ received: true });
}
```

### 7.4 주요 API 요청/응답 예시

**GET `/api/availability?month=2026-04&type=ONE_NIGHT`**

```json
{
  "month": "2026-04",
  "rentalType": "ONE_NIGHT",
  "minBookableDate": "2026-04-03",
  "availability": {
    "2026-04-03": { "available": 8, "total": 10 },
    "2026-04-04": { "available": 10, "total": 10 },
    "2026-04-07": { "available": 6, "total": 10 },
    "2026-04-08": { "available": 0, "total": 10 },
    ...
  }
}
```

**POST `/api/reservations`**

```json
// Request
{
  "productId": 1,
  "rentalType": "ONE_NIGHT",
  "useStartDate": "2026-04-09",
  "deliveryAddress": "서울시 강남구 ...",
  "deliveryMemo": "문 앞에 놓아주세요",
  "options": [
    { "optionId": 1, "quantity": 1 },
    { "optionId": 3, "quantity": 1 }
  ]
}

// Response
{
  "reservationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "HOLDING",
  "holdExpiresAt": "2026-04-01T14:30:00Z",
  "totalPrice": 98000,
  "equipmentSet": "SET-03",
  "schedule": {
    "blockStart": "2026-04-06",
    "deliveryDate": "2026-04-08",
    "useStart": "2026-04-09",
    "useEnd": "2026-04-10",
    "pickupDate": "2026-04-13",
    "blockEnd": "2026-04-16"
  },
  "payment": {
    "storeId": "store-xxx",
    "channelKey": "channel-xxx",
    "paymentId": "pay_xxx"
  }
}
```

---

## 8. 화면 설계 및 사용자 플로우

### 8.1 사용자 화면 목록

| 화면 | 경로 | 주요 기능 |
|------|------|-----------|
| 메인 페이지 | `/` | 서비스 소개, 이용 방법, CTA |
| 상품 목록 | `/products` | 렌탈 상품 카드 목록 |
| 상품 상세 | `/products/[id]` | 상세 정보, 포함 장비, 후기, 예약 진입 |
| 예약 페이지 | `/booking/[productId]` | 캘린더 + 옵션 선택 + 가격 요약 |
| 결제 페이지 | `/checkout/[reservationId]` | 배송지 입력 + 결제 (PortOne) |
| 결제 완료 | `/booking/complete` | 예약 확인 + 예약 번호 |
| 마이페이지 | `/my` | 예약 목록 + 상태 표시 |
| 예약 상세 | `/my/reservations/[id]` | 예약 상세 + 상태 트래커 |
| 후기 작성 | `/my/reservations/[id]/review` | 별점 + 텍스트 + 사진 |
| 로그인/회원가입 | `/auth/*` | Supabase Auth UI |

### 8.2 관리자 화면 목록

| 화면 | 경로 | 주요 기능 |
|------|------|-----------|
| 대시보드 | `/admin` | 예약 현황, 금주 출고/회수, 매출 요약 |
| 예약 관리 | `/admin/reservations` | 예약 목록 + 필터 + 상세 |
| 세트 관리 | `/admin/sets` | 세트별 상태 + 타임라인 뷰 |
| 상품 관리 | `/admin/products` | CRUD + 이미지 업로드 |
| 콘텐츠 관리 | `/admin/content` | 가이드/후기 관리 |
| 공휴일 관리 | `/admin/holidays` | 공휴일 목록 + 수동 추가 |
| 설정 | `/admin/settings` | 운영 파라미터 변경 |

### 8.3 예약 플로우 (사용자 시점)

```
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ 상품 선택 │ →  │ 날짜 선택 │ →  │ 옵션 선택 │ →  │ 주문 요약 │
│ /products │    │ 캘린더    │    │ 소모품    │    │ 가격 확인 │
└───────────┘    └───────────┘    └───────────┘    └───────────┘
                                                        │
                                                        ▼
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ 예약 완료 │ ←  │ 결제 처리 │ ←  │ 배송지    │ ←  │ 홀딩 시작 │
│ 확인 페이지│    │ PortOne   │    │ 입력      │    │ 10분 타이머│
└───────────┘    └───────────┘    └───────────┘    └───────────┘
```

### 8.4 관리자 물류 상태 변경 플로우

```
예약 확정 → 출고준비(PREP) → 배송중(SHIPPING) → 사용중(IN_USE)
                                                      │
         정비완료 → 정비중(MAINTENANCE) → 회수중(RETURNING) ←┘
            │
            ▼
      대기(AVAILABLE) ← 다음 예약 가능
```

---

## 9. 인증 및 보안

### 9.1 인증 체계

**Supabase Auth 클라이언트 설정**

```typescript
// lib/supabase/client.ts (클라이언트용)
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// lib/supabase/server.ts (서버용)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// lib/supabase/admin.ts (Service Role용 — 서버 전용)
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**미들웨어 (Next.js)**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 인증 필요 페이지 보호
  if (request.nextUrl.pathname.startsWith('/my') && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 관리자 페이지 보호
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
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

  return response;
}

export const config = {
  matcher: ['/my/:path*', '/admin/:path*', '/api/admin/:path*'],
};
```

### 9.2 보안 체크리스트

| 항목 | 방법 | 상태 |
|------|------|------|
| 사용자 데이터 격리 | Supabase RLS (Row Level Security) | 필수 |
| 관리자 API 보호 | ADMIN 역할 검증 미들웨어 | 필수 |
| 결제 위변조 방지 | PortOne Webhook 서명 검증 | 필수 |
| HTTPS 전송 | Vercel 기본 제공 | 자동 |
| SQL Injection | Prisma ORM 파라미터 바인딩 | 자동 |
| XSS 방지 | React 자동 이스케이프 + CSP 헤더 | 설정 필요 |
| CSRF 방지 | SameSite Cookie + API Route 검증 | 필수 |
| 환경변수 보호 | Vercel Encrypted Environment Variables | 자동 |
| Cron Job 인증 | CRON_SECRET Bearer 토큰 검증 | 필수 |

---

## 10. 비기능적 요구사항

### 10.1 성능

| 항목 | 목표치 | 달성 방법 |
|------|--------|-----------|
| 캘린더 조회 API 응답 | 200ms 이내 | 월별 벌크 조회 + TanStack Query 캐싱 (staleTime: 30초) |
| 동시 접속 사용자 | 50명 이상 | Vercel Serverless 자동 스케일링 |
| 예약 생성 트랜잭션 | 500ms 이내 | Advisory Lock + SERIALIZABLE 격리 |
| 페이지 초기 로드 | 1.5초 이내 | Next.js SSR + Vercel Edge CDN |

### 10.2 데이터 무결성

- DB 레벨 `EXCLUDE` 제약조건으로 중복 예약 원천 차단
- `SERIALIZABLE` 트랜잭션 격리 레벨로 레이스 컨디션 방지
- 홀딩 만료 Cron으로 고아 재고 방지
- 예약 변경 시 Supabase Realtime으로 캐시 무효화

### 10.3 모니터링

| 도구 | 용도 |
|------|------|
| Vercel Analytics | 페이지 성능, Web Vitals |
| Vercel Logs | Serverless Function 로그 |
| Supabase Dashboard | DB 쿼리 성능, 커넥션 수 |
| Sentry (향후) | 에러 트래킹 |

---

## 11. 개발 환경 세팅 가이드

### 11.1 사전 준비

```bash
# 필수 도구
node -v   # v20+ 필요
npm -v    # v10+ 권장
git -v
```

### 11.2 프로젝트 초기화

```bash
# 1. Next.js 프로젝트 생성
npx create-next-app@latest packtrial \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*"

cd packtrial

# 2. 핵심 의존성 설치
npm install @supabase/supabase-js @supabase/ssr
npm install prisma @prisma/client
npm install @tanstack/react-query
npm install react-day-picker date-fns
npm install zod                          # API 유효성 검증

# 3. UI 라이브러리
npx shadcn@latest init
npx shadcn@latest add button card dialog input label \
  select table tabs badge calendar toast

# 4. 개발 도구
npm install -D @types/node
```

### 11.3 Prisma 초기화

```bash
npx prisma init

# schema.prisma 작성 후
npx prisma migrate dev --name init
npx prisma generate
```

### 11.4 Supabase 로컬 개발 (선택)

```bash
# Supabase CLI 설치
npm install -g supabase

# 로컬 Supabase 실행
supabase init
supabase start

# 로컬 환경변수 (.env.local)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<로컬 anon key>
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### 11.5 개발 실행

```bash
npm run dev
# → http://localhost:3000
```

---

## 12. 개발 일정 및 마일스톤

총 개발 기간: 약 5주 (2026년 4월 초 ~ 5월 초)

| 주차 | 기간 | 주요 과업 | 산출물 |
|------|------|-----------|--------|
| **1주차** | 4/1 ~ 4/7 | 프로젝트 세팅, DB 스키마 생성, Supabase 프로젝트 세팅, 인증 구현, UI 디자인 시안 | Supabase 프로젝트, Prisma 마이그레이션, Auth 동작 확인 |
| **2주차** | 4/8 ~ 4/14 | 핵심 예약/블락 엔진 개발, 캘린더 UI 구현, 영업일 계산기, 공휴일 API 연동 | 블락 엔진 유닛 테스트 통과, 캘린더 예약 가능일 표시 |
| **3주차** | 4/15 ~ 4/21 | 결제 연동 (PortOne), 사용자 페이지 전체 구현, 홀딩/타임아웃 로직 | 결제 → 예약 확정 플로우 완성 |
| **4주차** | 4/22 ~ 4/28 | 관리자 페이지 구현, 대시보드, 세트 관리, 예약 관리 | 관리자 기능 완성 |
| **5주차** | 4/29 ~ 5/5 | QA 및 버그 수정, 성능 최적화, Vercel 프로덕션 배포 및 오픈 | 프로덕션 배포 완료 |

---

## 13. 향후 확장 계획

### Phase 2 확장 후보 기능

| 기능 | 설명 | 예상 기술 |
|------|------|-----------|
| 백패킹 장소 추천 | 지도 기반 캠핑장 추천 + 렌더링 필터 | Kakao Map API, 공공데이터 연동 |
| 개인 장비 체크리스트 | 캠핑 준비물 체크리스트 제공 | 로컬 저장 + 서버 동기화 |
| 알림 시스템 | 배송/회수 알림, 후기 작성 유도 | FCM/APNs, 이메일, 카카오 알림톡 |
| 쿠폰/할인 | 첫 렌탈 할인, 시즌 프로모션 | 쿠폰 코드 시스템 |
| 보험 연동 | 장비 파손/분실 보험 상품 연계 | 보험사 API |
| 모바일 앱 | React Native 네이티브 앱 | React Native (API 공유) |

### 확장성을 위한 설계 원칙

- 운영 파라미터(`PRE/POST_USE_DAYS` 등)는 하드코딩하지 않고 `system_settings` 테이블로 관리
- 상품/옵션 구조를 유연하게 설계하여 새로운 렌탈 상품 추가 용이
- API를 RESTful 표준으로 설계하여 모바일 앱/외부 연동 대비
- 세트 수를 10개에서 동적으로 확장 가능한 구조
- Vercel + Supabase 모두 Pro Plan 업그레이드 시 자동 스케일링 지원

---

## 부록

### A. Prisma Schema (전체)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

enum UserRole {
  USER
  ADMIN
}

enum SetStatus {
  AVAILABLE
  PREP
  SHIPPING
  IN_USE
  RETURNING
  MAINTENANCE
}

enum RentalType {
  ONE_NIGHT
  TWO_NIGHT
}

enum ReservationStatus {
  HOLDING
  CONFIRMED
  SHIPPING
  IN_USE
  RETURNING
  COMPLETED
  CANCELLED
}

model User {
  id           String        @id @default(uuid()) @db.Uuid
  email        String        @unique @db.VarChar(255)
  name         String        @db.VarChar(100)
  phone        String?       @db.VarChar(20)
  role         UserRole      @default(USER)
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")
  reservations Reservation[]
  reviews      Review[]

  @@map("users")
}

model Product {
  id           Int           @id @default(autoincrement())
  name         String        @db.VarChar(200)
  description  String?
  price1night  Int           @map("price_1night")
  price2night  Int           @map("price_2night")
  images       Json          @default("[]")
  includes     Json          @default("[]")
  isActive     Boolean       @default(true) @map("is_active")
  sortOrder    Int           @default(0) @map("sort_order")
  createdAt    DateTime      @default(now()) @map("created_at")
  reservations Reservation[]

  @@map("products")
}

model EquipmentSet {
  id                     Int                @id @default(autoincrement())
  name                   String             @unique @db.VarChar(100)
  status                 SetStatus          @default(AVAILABLE)
  currentReservationId   String?            @map("current_reservation_id") @db.Uuid
  notes                  String?
  updatedAt              DateTime           @updatedAt @map("updated_at")
  currentReservation     Reservation?       @relation("CurrentReservation",
                                              fields: [currentReservationId],
                                              references: [id])
  reservations           Reservation[]      @relation("SetReservations")
  blocks                 ReservationBlock[]

  @@map("equipment_sets")
}

model Reservation {
  id               String              @id @default(uuid()) @db.Uuid
  userId           String              @map("user_id") @db.Uuid
  equipmentSetId   Int?                @map("equipment_set_id")
  productId        Int                 @map("product_id")
  rentalType       RentalType          @map("rental_type")
  useStartDate     DateTime            @map("use_start_date") @db.Date
  useEndDate       DateTime            @map("use_end_date") @db.Date
  blockStartDate   DateTime            @map("block_start_date") @db.Date
  blockEndDate     DateTime            @map("block_end_date") @db.Date
  status           ReservationStatus   @default(HOLDING)
  totalPrice       Int                 @map("total_price")
  paymentId        String?             @map("payment_id") @db.VarChar(100)
  holdExpiresAt    DateTime?           @map("hold_expires_at")
  deliveryAddress  String?             @map("delivery_address")
  deliveryMemo     String?             @map("delivery_memo")
  cancelledAt      DateTime?           @map("cancelled_at")
  cancelReason     String?             @map("cancel_reason")
  createdAt        DateTime            @default(now()) @map("created_at")
  updatedAt        DateTime            @updatedAt @map("updated_at")

  user             User                @relation(fields: [userId], references: [id])
  equipmentSet     EquipmentSet?       @relation("SetReservations",
                                         fields: [equipmentSetId],
                                         references: [id])
  product          Product             @relation(fields: [productId], references: [id])
  block            ReservationBlock?
  review           Review?
  options          ReservationOption[]
  currentForSet    EquipmentSet?       @relation("CurrentReservation")

  @@map("reservations")
}

model ReservationBlock {
  id               Int          @id @default(autoincrement())
  reservationId    String       @unique @map("reservation_id") @db.Uuid
  equipmentSetId   Int          @map("equipment_set_id")
  blockRange       Unsupported("daterange") @map("block_range")
  createdAt        DateTime     @default(now()) @map("created_at")

  reservation      Reservation  @relation(fields: [reservationId], references: [id])
  equipmentSet     EquipmentSet @relation(fields: [equipmentSetId], references: [id])

  @@map("reservation_blocks")
}

model ConsumableOption {
  id          Int                 @id @default(autoincrement())
  name        String              @db.VarChar(200)
  description String?
  price       Int
  isActive    Boolean             @default(true) @map("is_active")
  sortOrder   Int                 @default(0) @map("sort_order")
  orders      ReservationOption[]

  @@map("consumable_options")
}

model ReservationOption {
  reservationId String          @map("reservation_id") @db.Uuid
  optionId      Int             @map("option_id")
  quantity      Int             @default(1)
  priceAtOrder  Int             @map("price_at_order")

  reservation   Reservation     @relation(fields: [reservationId], references: [id])
  option        ConsumableOption @relation(fields: [optionId], references: [id])

  @@id([reservationId, optionId])
  @@map("reservation_options")
}

model Review {
  id            String      @id @default(uuid()) @db.Uuid
  reservationId String      @unique @map("reservation_id") @db.Uuid
  userId        String      @map("user_id") @db.Uuid
  rating        Int         @db.SmallInt
  content       String
  images        Json        @default("[]")
  isVisible     Boolean     @default(true) @map("is_visible")
  createdAt     DateTime    @default(now()) @map("created_at")

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
  description String?
  updatedAt   DateTime @default(now()) @map("updated_at")

  @@map("system_settings")
}
```

### B. 초기 데이터 시드

```sql
-- 장비 세트 10개 생성
INSERT INTO equipment_sets (name) VALUES
('SET-01'), ('SET-02'), ('SET-03'), ('SET-04'), ('SET-05'),
('SET-06'), ('SET-07'), ('SET-08'), ('SET-09'), ('SET-10');

-- 시스템 설정 초기값
INSERT INTO system_settings (key, value, description) VALUES
('PRE_USE_BUSINESS_DAYS', '3', '사용일 전 운영 영업일 수'),
('POST_USE_BUSINESS_DAYS', '4', '사용일 후 운영 영업일 수'),
('MIN_ADVANCE_BUSINESS_DAYS', '3', '예약 가능 최소 선행 영업일'),
('HOLD_DURATION_MINUTES', '10', '결제 홀딩 시간 (분)'),
('TOTAL_SETS', '10', '총 장비 세트 수');

-- 2026년 한국 공휴일
INSERT INTO holidays (date, name, year) VALUES
('2026-01-01', '신정', 2026),
('2026-01-29', '설날 연휴', 2026),
('2026-01-30', '설날', 2026),
('2026-01-31', '설날 연휴', 2026),
('2026-03-01', '삼일절', 2026),
('2026-05-05', '어린이날', 2026),
('2026-05-24', '부처님오신날', 2026),
('2026-06-06', '현충일', 2026),
('2026-08-15', '광복절', 2026),
('2026-09-24', '추석 연휴', 2026),
('2026-09-25', '추석', 2026),
('2026-09-26', '추석 연휴', 2026),
('2026-10-03', '개천절', 2026),
('2026-10-09', '한글날', 2026),
('2026-12-25', '성탄절', 2026);
```

---

> **문서 끝** — PackTrail 백패킹 장비 렌탈 플랫폼 MVP 시스템 설계서 v1.0
