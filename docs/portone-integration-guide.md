# PackTrail — PortOne v2 결제 연동 가이드

> 작성일: 2026-03-30
> 대상 독자: PackTrail 백엔드/풀스택 개발자
> PortOne 버전: v2 (REST API v2 + Browser SDK v2)

---

## 목차

1. [사전 준비](#1-사전-준비)
2. [PortOne 콘솔 설정](#2-portone-콘솔-설정)
3. [결제 채널 설정 (네이버페이 / 카카오페이)](#3-결제-채널-설정)
4. [환경변수 설정](#4-환경변수-설정)
5. [테스트 모드 연동](#5-테스트-모드-연동)
6. [결제 플로우 상세 설명](#6-결제-플로우-상세-설명)
7. [웹훅 설정](#7-웹훅-설정)
8. [프로덕션 전환](#8-프로덕션-전환)
9. [환불 처리 구현](#9-환불-처리-구현-todo)
10. [트러블슈팅](#10-트러블슈팅)
11. [관련 코드 파일 목록](#관련-코드-파일-목록)

---

## 1. 사전 준비

### 1.1 필요 계정

| 서비스 | URL | 필수 여부 |
|--------|-----|-----------|
| PortOne | https://admin.portone.io | 필수 |
| 네이버페이 개발자센터 | https://developer.pay.naver.com | 네이버페이 사용 시 |
| 카카오페이 비즈니스 | https://business.kakaopay.com | 카카오페이 사용 시 |

### 1.2 현재 코드 상태

PackTrail에는 이미 PortOne v2 연동 코드가 구현되어 있습니다. 별도 SDK 설치 없이 아래 파일들이 즉시 사용 가능합니다.

| 파일 | 역할 |
|------|------|
| `src/lib/portone/client.ts` | 브라우저 SDK 래퍼 — `@portone/browser-sdk/v2`로 결제창 호출 |
| `src/lib/portone/verify.ts` | 서버 결제 검증 — PortOne REST API로 결제 금액/상태 확인 |
| `src/lib/portone/webhook.ts` | 웹훅 서명 검증 — HMAC-SHA256으로 위변조 방지 |
| `src/app/api/webhooks/portone/route.ts` | 웹훅 핸들러 — PAID/FAILED/CANCELLED 처리 |
| `src/app/api/reservations/[id]/confirm/route.ts` | 결제 후 예약 확정 API |
| `src/app/api/reservations/[id]/cancel/route.ts` | 예약 취소 API (환불 로직 미구현) |
| `src/app/(public)/checkout/[reservationId]/page.tsx` | 결제 UI 페이지 |

### 1.3 필요한 환경변수 목록

```
PORTONE_API_SECRET                    # PortOne REST API 인증용 (서버 전용)
NEXT_PUBLIC_PORTONE_STORE_ID          # 스토어 식별자 (클라이언트 노출 가능)
PORTONE_WEBHOOK_SECRET                # 웹훅 서명 검증용 (서버 전용)
NEXT_PUBLIC_PORTONE_NAVER_CHANNEL_KEY # 네이버페이 채널 키 (클라이언트 노출 가능)
NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY # 카카오페이 채널 키 (클라이언트 노출 가능)
```

> **보안 주의**: `PORTONE_API_SECRET`과 `PORTONE_WEBHOOK_SECRET`은 `NEXT_PUBLIC_` 접두어 없이 선언해야 합니다. 이 값들이 클라이언트에 노출되면 결제 위변조가 가능해집니다.

---

## 2. PortOne 콘솔 설정

### 2.1 회원가입 및 스토어 생성

1. https://admin.portone.io 접속
2. 회원가입 또는 로그인
3. 우측 상단 **"+ 스토어 추가"** 클릭
4. 스토어 이름: `PackTrail`, 업종: 렌탈/기타 입력
5. 스토어 생성 완료 후 대시보드로 이동

### 2.2 API 키 확인

1. 콘솔 좌측 메뉴 → **스토어 설정** → **API Keys**
2. 다음 값을 복사해 안전한 곳에 보관:

| 항목 | 형식 예시 | 환경변수 |
|------|-----------|----------|
| Store ID | `store-a1b2c3d4e5f6` | `NEXT_PUBLIC_PORTONE_STORE_ID` |
| API Secret | `PortOneAPISecret_xxxxxxxx` | `PORTONE_API_SECRET` |

> **Webhook Secret**은 섹션 7(웹훅 설정)에서 생성합니다.

### 2.3 V2 API 모드 확인

PortOne 콘솔 → 스토어 설정에서 **"V2 API"** 모드가 활성화되어 있는지 확인하세요. PackTrail의 코드는 v2 전용입니다.

---

## 3. 결제 채널 설정

결제 채널(Channel)은 실제 PG사와의 연결 단위입니다. 개발용 테스트 채널과 프로덕션 채널을 별도로 만들어야 합니다.

### 3.1 테스트 채널 (개발 필수)

개발 단계에서는 실제 PG사 가맹점 계약 없이 테스트 채널로 결제를 시뮬레이션할 수 있습니다.

1. 콘솔 → **결제 연동** → **테스트 채널 관리** → **+ 채널 추가**
2. 아래 설정으로 채널 생성:

   | 항목 | 값 |
   |------|----|
   | PG사 | 토스페이먼츠 (테스트) |
   | 채널 이름 | `테스트결제` (임의) |
   | 결제 방식 | 간편결제 (EASY_PAY) |

3. 채널 생성 후 **채널 키(Channel Key)** 복사 (`channel-key-xxxxxxxx` 형식)
4. 이 채널 키를 개발 환경의 `NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY`에 임시 설정

> 테스트 단계에서는 네이버페이/카카오페이 채널 키 모두 동일한 테스트 채널 키를 사용해도 무방합니다.

### 3.2 네이버페이 채널 (프로덕션)

**가맹점 등록 (PortOne과 별도):**

1. https://developer.pay.naver.com 접속 → 가맹점 신청
2. 검수 완료 후 다음 정보 발급:
   - 가맹점 ID (MerchantID)
   - 클라이언트 ID
   - 클라이언트 시크릿

**PortOne 채널 등록:**

1. 콘솔 → **결제 연동** → **실연동 채널 관리** → **+ 채널 추가**
2. PG사: `네이버페이` 선택
3. 발급받은 네이버페이 가맹점 정보 입력
4. 채널 생성 후 채널 키 복사 → `NEXT_PUBLIC_PORTONE_NAVER_CHANNEL_KEY`에 설정

### 3.3 카카오페이 채널 (프로덕션)

**가맹점 등록 (PortOne과 별도):**

1. https://business.kakaopay.com 접속 → 온라인 결제 가맹점 신청
2. 검수 완료 후 다음 정보 발급:
   - CID (가맹점 코드, 일반적으로 `TC0ONETIME` 또는 실제 발급값)

**PortOne 채널 등록:**

1. 콘솔 → **결제 연동** → **실연동 채널 관리** → **+ 채널 추가**
2. PG사: `카카오페이` 선택
3. 발급받은 카카오페이 CID 입력
4. 채널 생성 후 채널 키 복사 → `NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY`에 설정

---

## 4. 환경변수 설정

### 4.1 로컬 개발 환경 (`.env.local`)

프로젝트 루트의 `.env.local` 파일에 아래 내용 추가:

```env
# PortOne v2 결제 연동
PORTONE_API_SECRET=PortOneAPISecret_여기에_실제값_입력
NEXT_PUBLIC_PORTONE_STORE_ID=store-여기에_실제값_입력
PORTONE_WEBHOOK_SECRET=whsec_여기에_실제값_입력

# 결제 채널 키 (테스트 단계에서는 동일한 테스트 채널 키 사용 가능)
NEXT_PUBLIC_PORTONE_NAVER_CHANNEL_KEY=channel-key-여기에_실제값_입력
NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY=channel-key-여기에_실제값_입력
```

> `.env.local`은 Git에 커밋되지 않습니다. `.gitignore`에 이미 포함되어 있는지 확인하세요.

### 4.2 Vercel 프로덕션 환경

**방법 A: Vercel 대시보드**

1. Vercel 대시보드 → 프로젝트 선택 → **Settings** → **Environment Variables**
2. 각 변수를 `Production` 환경에 추가

**방법 B: Vercel CLI**

```bash
# 각 명령어를 실행하면 값을 입력하라는 프롬프트가 나타납니다
npx vercel env add PORTONE_API_SECRET production
npx vercel env add NEXT_PUBLIC_PORTONE_STORE_ID production
npx vercel env add PORTONE_WEBHOOK_SECRET production
npx vercel env add NEXT_PUBLIC_PORTONE_NAVER_CHANNEL_KEY production
npx vercel env add NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY production
```

또는 `printf`로 비대화형 설정:

```bash
printf "PortOneAPISecret_실제값" | npx vercel env add PORTONE_API_SECRET production --yes
printf "store-실제값" | npx vercel env add NEXT_PUBLIC_PORTONE_STORE_ID production --yes
printf "whsec_실제값" | npx vercel env add PORTONE_WEBHOOK_SECRET production --yes
printf "channel-key-실제값" | npx vercel env add NEXT_PUBLIC_PORTONE_NAVER_CHANNEL_KEY production --yes
printf "channel-key-실제값" | npx vercel env add NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY production --yes
```

### 4.3 환경변수 확인

설정 후 Next.js 서버를 재시작하고 다음으로 확인:

```bash
# 서버 재시작
npm run dev

# 서버 로그에서 PortOne 관련 에러가 없는지 확인
# 브라우저에서 결제 페이지(/checkout/[reservationId]) 접속 후 콘솔 에러 확인
```

---

## 5. 테스트 모드 연동

### 5.1 테스트 결제 실행 순서

1. 환경변수 설정 완료 (`NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY` 최소 설정)
2. `npm run dev` 실행
3. 상품 페이지 → 날짜 선택 → 예약 진행 → 결제 페이지(`/checkout/[reservationId]`) 도달
4. 배송 정보 입력 (수령인, 연락처, 주소 — 필수)
5. **"네이버페이"** 또는 **"카카오페이"** 버튼 클릭
6. PortOne 테스트 결제창이 팝업으로 열림

### 5.2 테스트 카드 정보

테스트 결제창에서 아래 테스트 카드 사용:

| 항목 | 테스트 값 |
|------|-----------|
| 카드번호 | `4242-4242-4242-4242` |
| 유효기간 | 미래 임의 날짜 (예: 12/30) |
| CVC | 임의 3자리 (예: 123) |
| 비밀번호 앞 2자리 | 임의 (예: 00) |

> PG사별로 테스트 카드 번호가 다를 수 있습니다. PortOne 콘솔 → 개발자 도구 → 테스트 결제 가이드를 참고하세요.

### 5.3 결제 성공 확인

결제가 정상 처리되면 다음 단계로 진행됩니다:

1. 결제 완료 → `/booking/complete?id=[reservationId]`로 리다이렉트
2. DB에서 예약 상태가 `HOLDING` → `CONFIRMED`로 변경됨
3. PortOne 콘솔 → **결제 내역**에서 해당 결제 확인 가능

### 5.4 결제 실패 시뮬레이션

PortOne 테스트 환경에서 카드 번호 `4000-0000-0000-0002`를 사용하면 결제 실패를 시뮬레이션할 수 있습니다. 실패 시:

- 결제 페이지에 에러 메시지 표시
- 예약 상태는 `HOLDING` 유지 (10분 타이머 내 재결제 가능)
- 웹훅으로 `FAILED` 이벤트 수신 시 예약 자동 취소

---

## 6. 결제 플로우 상세 설명

### 6.1 전체 흐름

```
사용자: 결제 버튼 클릭 (네이버페이 / 카카오페이)
  │
  ↓ [checkout page: src/app/(public)/checkout/[reservationId]/page.tsx]
  │
  ├─ paymentId 생성: "packtrail-{reservationId}-{timestamp}"
  │
  ↓ [client: src/lib/portone/client.ts]
  │
  PortOne.requestPayment() 호출
    - storeId: NEXT_PUBLIC_PORTONE_STORE_ID
    - channelKey: NAVER 또는 KAKAO 채널 키
    - currency: "CURRENCY_KRW"
    - payMethod: "EASY_PAY"
  │
  ↓
  PortOne 결제창 표시 (PG사 UI)
  │
  ↓ 결제 완료 / 실패
  │
  ┌─────────────────────┬────────────────────────────────┐
  │ [경로 A: 클라이언트] │ [경로 B: 서버 웹훅]             │
  │                     │                                │
  │ 결제창 닫힘 후       │ PortOne 서버가 비동기로 호출     │
  │ 즉시 실행            │                                │
  │                     │                                │
  ↓                     ↓                                │
POST /api/reservations  POST /api/webhooks/portone        │
/[id]/confirm           (route.ts)                        │
  │                     │                                │
  ├─ verifyPayment()    ├─ verifyPortOneSignature()       │
  │  (금액 검증)        │  (HMAC-SHA256 서명 검증)        │
  │                     │                                │
  ├─ 금액 일치 확인     ├─ PAID → reservation CONFIRMED  │
  │                     │                                │
  ├─ reservation        ├─ FAILED/CANCELLED →            │
  │  CONFIRMED          │  reservation CANCELLED          │
  │                     │  (reservationBlock 삭제)        │
  ↓                     └────────────────────────────────┘
/booking/complete
리다이렉트
```

### 6.2 이중 확인 구조의 의의

PackTrail은 결제 확인을 **클라이언트 경로**와 **웹훅 경로** 두 가지로 처리합니다:

- **클라이언트 경로 (경로 A)**: 사용자 결제 직후 즉시 `/confirm` API 호출 → 빠른 UX 제공, 즉시 예약 확정 화면으로 이동
- **웹훅 경로 (경로 B)**: PortOne 서버가 비동기로 호출 → 클라이언트가 장애(네트워크 끊김, 탭 닫힘 등) 나더라도 서버에서 안전하게 처리

두 경로 모두 `verifyPayment()`를 통해 PortOne REST API에서 결제 상태와 금액을 독립적으로 검증합니다.

### 6.3 paymentId 생성 규칙

`src/app/(public)/checkout/[reservationId]/page.tsx` 내부:

```typescript
const paymentId = `packtrail-${data.reservation.id}-${Date.now()}`;
```

- 형식: `packtrail-{UUID}-{Unix타임스탬프(ms)}`
- 동일 예약에 대해 결제 재시도 시 타임스탬프로 유일성 보장
- PortOne 콘솔에서 이 ID로 결제 내역 조회 가능

### 6.4 금액 검증 로직 (위변조 방지 핵심)

`src/app/api/reservations/[id]/confirm/route.ts`:

```typescript
// 1. PortOne REST API로 결제 상태 확인
const verification = await verifyPayment(paymentId);

// 2. 결제 상태가 PAID가 아니면 거부
if (!verification.verified) {
  return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
}

// 3. 실제 결제 금액과 DB에 저장된 예약 금액 비교
if (verification.amount !== reservation.totalPrice) {
  return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
}
```

`src/lib/portone/verify.ts`:

```typescript
export async function verifyPayment(paymentId: string): Promise<{
  verified: boolean;
  amount?: number;
  status?: string;
}> {
  const response = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
      },
    }
  );

  const data = await response.json();
  return {
    verified: data.status === 'PAID',
    amount: data.amount?.total,   // PortOne이 실제 처리한 금액
    status: data.status,
  };
}
```

> `reservation.totalPrice`는 서버에서 계산한 금액(`src/app/api/reservations/route.ts`)이므로, 클라이언트가 금액을 조작해도 서버 검증 단계에서 차단됩니다.

### 6.5 10분 홀딩 타이머

결제 페이지 진입 시 예약은 `HOLDING` 상태로 전환되고 `holdExpiresAt`이 설정됩니다:

- `src/components/booking/PaymentTimer.tsx`가 카운트다운을 표시
- 타이머 만료 시 `handleExpire()` 콜백으로 `/products`로 리다이렉트
- `pg_cron`이 매분 실행되어 만료된 `HOLDING` 예약을 자동 취소
- `/confirm` API도 `holdExpiresAt` 만료 여부를 체크함 (`status: 410` 반환)

---

## 7. 웹훅 설정

### 7.1 PortOne 콘솔에서 웹훅 등록

1. 콘솔 → 좌측 메뉴 **웹훅** → **+ 웹훅 추가**
2. 아래 설정 입력:

   | 항목 | 값 |
   |------|----|
   | 엔드포인트 URL | `https://your-domain.vercel.app/api/webhooks/portone` |
   | 이벤트 | `payment.confirmed`, `payment.failed`, `payment.cancelled` 체크 |

3. **Webhook Secret 생성** 버튼 클릭 → 생성된 값(`whsec_xxx`) 복사
4. 복사한 값을 `PORTONE_WEBHOOK_SECRET` 환경변수에 설정
5. 저장

### 7.2 웹훅 서명 검증 코드

`src/lib/portone/webhook.ts`:

```typescript
import crypto from 'crypto';

export function verifyPortOneSignature(
  body: string,        // raw request body (text, JSON 파싱 전)
  signature: string | null
): boolean {
  if (!signature || !process.env.PORTONE_WEBHOOK_SECRET) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', process.env.PORTONE_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  // timing-safe 비교로 타이밍 공격 방지
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(signatureBuf, expectedBuf);
}
```

> **중요**: 서명 검증에는 반드시 `raw body` (JSON 파싱 전 문자열)를 사용해야 합니다. `src/app/api/webhooks/portone/route.ts`에서 `request.text()`로 먼저 읽은 후 `JSON.parse()`하는 이유입니다.

### 7.3 웹훅 핸들러 동작

`src/app/api/webhooks/portone/route.ts`:

```typescript
// PAID: 예약을 CONFIRMED로 업데이트
if (status === 'PAID') {
  await prisma.reservation.updateMany({
    where: { paymentId, status: 'HOLDING' },
    data: { status: 'CONFIRMED', holdExpiresAt: null },
  });
}

// FAILED 또는 CANCELLED: 예약 취소 + 블록 해제
else if (status === 'FAILED' || status === 'CANCELLED') {
  await prisma.$transaction([
    prisma.reservationBlock.deleteMany({ where: { reservationId: reservation.id } }),
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
```

### 7.4 로컬 개발에서 웹훅 테스트 (ngrok)

로컬 서버는 외부에서 직접 접근이 안 되므로 ngrok으로 터널을 만듭니다:

```bash
# ngrok 설치 (최초 1회)
npm install -g ngrok
# 또는
npx ngrok --version

# 터널 생성
npx ngrok http 3000
# 출력 예시: https://abcd-1234.ngrok-free.app → localhost:3000
```

터널 생성 후:
1. PortOne 콘솔 웹훅 URL을 `https://abcd-1234.ngrok-free.app/api/webhooks/portone`으로 임시 변경
2. 테스트 결제 진행
3. PortOne 콘솔 → **웹훅 로그**에서 수신 여부 확인

> ngrok URL은 세션마다 변경됩니다. 매 개발 세션마다 콘솔에서 URL을 업데이트해야 합니다.

### 7.5 웹훅 수신 확인

PortOne 콘솔 → **웹훅** → **웹훅 로그**에서 확인:
- HTTP 200 응답 = 정상 수신
- HTTP 4xx/5xx = 처리 실패 (로그 내용으로 원인 파악)
- PortOne은 실패 시 최대 5회 재시도합니다

---

## 8. 프로덕션 전환

### 8.1 전환 전 체크리스트

- [ ] PortOne 콘솔에서 실연동 채널 설정 완료 (네이버페이 / 카카오페이)
- [ ] 네이버페이 가맹점 심사 완료 및 채널 키 발급
- [ ] 카카오페이 가맹점 심사 완료 및 채널 키 발급
- [ ] Vercel 프로덕션 환경변수를 실연동 값으로 교체
- [ ] 웹훅 URL이 프로덕션 도메인(`https://your-domain.vercel.app/...`)으로 설정됨
- [ ] 프로덕션 환경에서 테스트 결제 3회 이상 성공 확인
- [ ] 환불 처리 로직 구현 완료 (섹션 9 참고)
- [ ] 환불 테스트 완료
- [ ] PortOne 콘솔에서 실연동 모드 활성화

### 8.2 테스트 채널과 실연동 채널의 차이

| 구분 | 테스트 채널 | 실연동 채널 |
|------|-------------|-------------|
| Store ID | 동일 | 동일 |
| Channel Key | `channel-key-test-xxx` (테스트용) | `channel-key-live-xxx` (실제 PG사 연결) |
| 실제 과금 | 없음 | **있음** |
| 카드 정보 | 테스트 카드 사용 가능 | 실제 카드만 가능 |

전환 시 `NEXT_PUBLIC_PORTONE_NAVER_CHANNEL_KEY`와 `NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY`를 실연동 채널 키로 교체하면 됩니다. Store ID와 API Secret은 그대로 사용합니다.

### 8.3 주의사항

- 실연동 전환 후 결제 테스트는 **실제 과금**됩니다. 테스트 후 반드시 환불 처리하세요.
- 가맹점 심사에는 통상 1~2주 소요됩니다. 런칭 일정에 맞춰 미리 신청하세요.
- 카카오페이와 네이버페이는 각각 별도 심사 절차가 있습니다.

---

## 9. 환불 처리 구현 (TODO)

현재 `src/app/api/reservations/[id]/cancel/route.ts`는 DB 상태만 `CANCELLED`로 변경하고, PortOne에 환불 요청을 보내지 않습니다. **프로덕션 전에 반드시 구현이 필요합니다.**

### 9.1 환불 API 구현

`src/app/api/reservations/[id]/cancel/route.ts`에 PortOne 환불 요청 추가:

```typescript
// 기존 예약 조회 후, CONFIRMED 상태이고 paymentId가 있는 경우 환불 처리
if (reservation.status === 'CONFIRMED' && reservation.paymentId) {
  const refundAmount = calculateRefundAmount(reservation); // 아래 9.3 참고

  const refundResponse = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(reservation.paymentId)}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${process.env.PORTONE_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: body.reason || '사용자 취소',
        requester: 'CUSTOMER',
        // 전액 환불이면 amount 생략, 부분 환불이면 명시
        ...(refundAmount < reservation.totalPrice && { amount: refundAmount }),
      }),
    }
  );

  if (!refundResponse.ok) {
    const errData = await refundResponse.json();
    console.error('Refund failed:', errData);
    return NextResponse.json(
      { error: 'Refund request failed', detail: errData },
      { status: 500 }
    );
  }
}

// 환불 성공 후 기존 취소 트랜잭션 실행
await prisma.$transaction([
  prisma.reservationBlock.deleteMany({ where: { reservationId: id } }),
  prisma.reservation.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: body.reason || '사용자 취소',
    },
  }),
]);
```

### 9.2 환불 정책 및 금액 계산

취소 정책(SYSTEM_DESIGN.md 기준)에 따른 환불 금액 계산 함수 예시:

```typescript
function calculateRefundAmount(reservation: {
  totalPrice: number;
  useStartDate: Date | string;
}): number {
  const now = new Date();
  const startDate = new Date(reservation.useStartDate);
  const diffDays = Math.ceil(
    (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays >= 3) {
    return reservation.totalPrice;          // 출발 3일 전: 전액 환불
  } else if (diffDays === 2) {
    return Math.floor(reservation.totalPrice * 0.5); // 출발 2일 전: 50% 환불
  } else {
    return 0;                               // 당일 취소: 환불 불가
  }
}
```

### 9.3 환불 불가 시 처리

환불 금액이 0인 경우(당일 취소), DB 상태는 변경하되 환불 요청은 생략합니다:

```typescript
if (refundAmount === 0) {
  // 환불 없이 취소 처리만 진행
  // 단, 사용자에게 환불 불가 안내 필요
}
```

### 9.4 HOLDING 상태 취소

`HOLDING` 상태는 결제가 완료되지 않은 상태이므로 PortOne 환불 API 호출 없이 DB 취소만 해도 됩니다. 현재 코드가 이를 올바르게 처리하고 있습니다.

---

## 10. 트러블슈팅

### 문제: 결제창이 열리지 않음

**증상**: 결제 버튼 클릭 후 아무것도 일어나지 않거나 콘솔 에러 발생

**확인 사항**:

1. 브라우저 개발자 도구 → Console 탭에서 에러 메시지 확인
2. `NEXT_PUBLIC_PORTONE_STORE_ID` 값이 올바르게 설정되어 있는지 확인
3. 사용하려는 결제 수단의 채널 키가 설정되어 있는지 확인:
   - 네이버페이 → `NEXT_PUBLIC_PORTONE_NAVER_CHANNEL_KEY`
   - 카카오페이 → `NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY`
4. 채널 키가 해당 스토어에 속한 채널인지 PortOne 콘솔에서 확인
5. 팝업 차단 설정 확인 (PortOne 결제창은 팝업으로 열림)

---

### 문제: 결제 후 예약이 확정되지 않음

**증상**: 결제는 완료됐지만 예약 상태가 `HOLDING`에서 변경되지 않음

**확인 사항**:

1. `/api/reservations/[id]/confirm` 응답 확인 (Network 탭):
   - `400 Payment verification failed` → `PORTONE_API_SECRET` 확인
   - `400 Payment amount mismatch` → 결제 금액과 DB 금액 불일치 (코드 확인 필요)
   - `410 Hold has expired` → 홀딩 시간 10분 초과, 재예약 필요

2. `PORTONE_API_SECRET`이 올바른지 확인:
   ```bash
   # 직접 PortOne API 호출 테스트
   curl -X GET "https://api.portone.io/payments/{paymentId}" \
     -H "Authorization: PortOne {PORTONE_API_SECRET}"
   ```

3. Vercel 환경에서는 함수 로그 확인:
   ```bash
   npx vercel logs --follow
   ```

---

### 문제: 웹훅이 수신되지 않음

**증상**: PortOne 콘솔 결제 내역은 PAID인데 웹훅 로그에 실패 기록

**확인 사항**:

1. PortOne 콘솔 → 웹훅 → 웹훅 로그에서 HTTP 응답 코드 확인
2. `401 Invalid signature` → `PORTONE_WEBHOOK_SECRET` 값이 콘솔의 Webhook Secret과 다름
3. 웹훅 URL이 접근 가능한지 확인 (로컬 개발 시 ngrok 필요)
4. Next.js의 `bodyParser`가 웹훅 라우트에서 비활성화되어 있는지 확인:
   - `route.ts`에서 `request.text()`로 raw body를 읽고 있으면 정상
5. Vercel 배포 후 환경변수 재배포 여부 확인 (환경변수 변경 후 재배포 필요)

---

### 문제: 금액 불일치 에러 (`Payment amount mismatch`)

**증상**: `verify`는 통과하지만 금액 검증 실패

**원인 분석**:

- 클라이언트에서 결제창에 전달한 `totalAmount`와 DB의 `reservation.totalPrice`가 다름
- 옵션 가격 계산 로직 변경 후 기존 예약 데이터와 불일치

**해결**:

1. `src/app/api/reservations/route.ts`의 가격 계산 로직 확인
2. `priceAtOrder` 필드가 예약 시점 가격을 올바르게 저장하는지 확인
3. 테스트 시 DB에서 해당 예약의 `totalPrice` 직접 조회:
   ```sql
   SELECT id, status, total_price, payment_id FROM reservations WHERE id = 'your-reservation-id';
   ```

---

### 문제: 홀딩 시간 초과 (`Hold has expired`)

**증상**: 결제 완료 후 confirm API에서 `410` 에러

**원인**: 결제 페이지 진입 후 10분 이내에 결제를 완료하지 않으면 `holdExpiresAt`이 만료됩니다.

**해결**:
- `PaymentTimer` 컴포넌트의 카운트다운을 확인하고 시간 내에 결제 진행
- 만료된 경우 재예약 필요
- 개발 중 테스트 편의를 위해 DB에서 `holdExpiresAt`을 미래로 직접 수정 가능:
  ```sql
  UPDATE reservations SET hold_expires_at = NOW() + INTERVAL '10 minutes' WHERE id = 'your-id';
  ```

---

## 관련 코드 파일 목록

| 파일 경로 | 역할 |
|-----------|------|
| `src/lib/portone/client.ts` | 브라우저 SDK 래퍼 (`requestPayment`) |
| `src/lib/portone/verify.ts` | 서버 결제 검증 (PortOne REST API 호출) |
| `src/lib/portone/webhook.ts` | 웹훅 서명 검증 (HMAC-SHA256) |
| `src/app/api/webhooks/portone/route.ts` | 웹훅 핸들러 (PAID/FAILED/CANCELLED 처리) |
| `src/app/api/reservations/route.ts` | 예약 생성 API (서버 사이드 가격 계산) |
| `src/app/api/reservations/[id]/confirm/route.ts` | 결제 확인 + 예약 확정 API |
| `src/app/api/reservations/[id]/cancel/route.ts` | 예약 취소 API (환불 로직 추가 필요) |
| `src/app/(public)/checkout/[reservationId]/page.tsx` | 결제 UI 페이지 |
| `src/components/booking/PaymentTimer.tsx` | 10분 결제 타이머 컴포넌트 |

---

## 참고 링크

- [PortOne v2 공식 문서](https://developers.portone.io/docs/ko/v2-payment/readme)
- [PortOne Browser SDK v2 레퍼런스](https://developers.portone.io/docs/ko/v2-payment/sdk/readme)
- [PortOne REST API v2 레퍼런스](https://developers.portone.io/api/rest-v2)
- [PortOne 웹훅 가이드](https://developers.portone.io/docs/ko/v2-payment/webhook)
- [네이버페이 개발자센터](https://developer.pay.naver.com)
- [카카오페이 비즈니스](https://business.kakaopay.com)
