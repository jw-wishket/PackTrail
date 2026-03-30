import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const valueProps = [
  {
    emoji: "🎒",
    title: "풀세트 렌탈",
    description: "텐트, 침낭, 매트, 버너까지 — 필요한 장비를 한 번에 빌려보세요.",
  },
  {
    emoji: "🚛",
    title: "배송 & 회수",
    description: "원하는 날짜에 배송, 사용 후 간편하게 회수해 드립니다.",
  },
  {
    emoji: "📅",
    title: "간편 예약",
    description: "날짜와 세트만 고르면 끝. 복잡한 절차 없이 바로 예약하세요.",
  },
  {
    emoji: "💰",
    title: "합리적 가격",
    description: "구매 대비 최대 80% 절약. 부담 없이 백패킹을 시작하세요.",
  },
];

const steps = [
  { num: 1, label: "세트 선택" },
  { num: 2, label: "날짜 예약" },
  { num: 3, label: "배송 수령" },
  { num: 4, label: "사용 & 반납" },
];

const products = [
  {
    emoji: "⛺",
    name: "백패킹 기본 세트",
    description: "입문자를 위한 1인 경량 백패킹 풀세트",
    tags: ["텐트", "침낭", "매트", "버너"],
    price1: "49,000",
    price2: "69,000",
    gradient: "from-olive/20 to-sage/20",
  },
  {
    emoji: "🏔️",
    name: "프리미엄 세트",
    description: "경량 고급 장비로 구성된 프리미엄 세트",
    tags: ["경량텐트", "다운침낭", "에어매트", "버너세트"],
    price1: "79,000",
    price2: "109,000",
    gradient: "from-moss/20 to-olive/20",
  },
  {
    emoji: "👫",
    name: "커플 세트",
    description: "2인용 장비로 구성된 커플·친구 세트",
    tags: ["2인텐트", "침낭x2", "매트x2", "코펠세트"],
    price1: "89,000",
    price2: "129,000",
    gradient: "from-sage/20 to-cream",
  },
];

const reviews = [
  {
    stars: 5,
    quote:
      "장비 하나하나 고르는 스트레스 없이, 세트 하나로 편하게 다녀왔어요. 진짜 강추합니다!",
    name: "김지훈",
  },
  {
    stars: 5,
    quote:
      "배송도 빠르고 장비 상태도 깨끗했어요. 반납도 택배로 간단하게 끝나서 너무 좋았습니다.",
    name: "이수민",
  },
  {
    stars: 4,
    quote:
      "백패킹 처음인데 필요한 게 다 들어있어서 준비할 게 없었어요. 다음에도 이용할게요!",
    name: "박준영",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  return (
    <>
      {/* ===== Hero ===== */}
      <section className="bg-cream">
        <div className="container-page py-20 text-center sm:py-28 lg:py-36">
          <p className="text-sm font-semibold uppercase tracking-widest text-olive">
            Backpacking Rental
          </p>
          <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold leading-tight text-moss sm:text-4xl lg:text-5xl">
            장비 걱정 없이,
            <br />
            백패킹을 시작하세요
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-sage sm:text-lg">
            텐트부터 버너까지, 검증된 장비 세트를 빌려 가볍게 떠나보세요.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/products"
              className="inline-block rounded-lg bg-olive px-8 py-3 font-semibold text-white shadow transition hover:brightness-110"
            >
              세트 둘러보기
            </Link>
            <Link
              href="#how-it-works"
              className="inline-block rounded-lg border-2 border-moss px-8 py-3 font-semibold text-moss transition hover:bg-moss/10"
            >
              이용 방법 보기
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Value Props ===== */}
      <section className="bg-beige">
        <div className="container-page py-16 sm:py-20">
          <h2 className="text-center text-2xl font-bold text-moss sm:text-3xl">
            왜 PackTrail인가요?
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {valueProps.map((v) => (
              <div
                key={v.title}
                className="rounded-xl bg-white p-6 text-center shadow-sm"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-olive/10 text-2xl">
                  {v.emoji}
                </div>
                <h3 className="mt-4 font-bold text-moss">{v.title}</h3>
                <p className="mt-2 text-sm text-sage">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How it Works ===== */}
      <section id="how-it-works" className="bg-cream">
        <div className="container-page py-16 sm:py-20">
          <h2 className="text-center text-2xl font-bold text-moss sm:text-3xl">
            이용 방법
          </h2>
          <div className="relative mt-12 grid grid-cols-2 gap-y-10 sm:grid-cols-4 sm:gap-y-0">
            {/* connector line (desktop) */}
            <div className="absolute top-7 right-[12.5%] left-[12.5%] hidden h-0.5 bg-olive/30 sm:block" />

            {steps.map((s) => (
              <div key={s.num} className="relative flex flex-col items-center text-center">
                <div className="z-10 flex h-14 w-14 items-center justify-center rounded-full bg-olive text-lg font-bold text-white">
                  {s.num}
                </div>
                <p className="mt-3 font-semibold text-moss">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Product Preview ===== */}
      <section className="bg-white">
        <div className="container-page py-16 sm:py-20">
          <h2 className="text-center text-2xl font-bold text-moss sm:text-3xl">
            인기 세트
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div
                key={p.name}
                className="overflow-hidden rounded-xl border border-beige shadow-sm"
              >
                {/* image area */}
                <div
                  className={`flex h-48 items-center justify-center bg-gradient-to-br ${p.gradient} text-6xl`}
                >
                  {p.emoji}
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-moss">{p.name}</h3>
                  <p className="mt-1 text-sm text-sage">{p.description}</p>

                  {/* tags */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-olive/10 px-2.5 py-0.5 text-xs font-medium text-olive"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* prices */}
                  <div className="mt-4 flex items-baseline gap-4 text-sm">
                    <span className="font-bold text-price-green">
                      1박 ₩{p.price1}
                    </span>
                    <span className="font-bold text-price-green">
                      2박 ₩{p.price2}
                    </span>
                  </div>

                  <Link
                    href="/products"
                    className="mt-4 inline-block w-full rounded-lg bg-olive py-2.5 text-center text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    자세히 보기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Reviews ===== */}
      <section id="reviews" className="bg-cream">
        <div className="container-page py-16 sm:py-20">
          <h2 className="text-center text-2xl font-bold text-moss sm:text-3xl">
            이용 후기
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <div
                key={r.name}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                {/* stars */}
                <div className="flex gap-1 text-olive">
                  {Array.from({ length: r.stars }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                  {Array.from({ length: 5 - r.stars }).map((_, i) => (
                    <span key={i} className="text-beige">
                      ★
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sage">&ldquo;{r.quote}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-muted">
                  {r.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA Banner ===== */}
      <section className="bg-moss">
        <div className="container-page py-16 text-center sm:py-20">
          <h2 className="text-2xl font-bold text-cream sm:text-3xl">
            첫 백패킹, 지금 시작하세요
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-cream/80">
            복잡한 장비 준비는 PackTrail에 맡기고, 자연 속으로 떠나보세요.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-block rounded-lg bg-olive px-10 py-3 font-semibold text-white shadow transition hover:brightness-110"
          >
            세트 둘러보기
          </Link>
        </div>
      </section>
    </>
  );
}
