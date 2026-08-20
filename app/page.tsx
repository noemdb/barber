import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  Mail,
  MapPin,
  Phone,
  Scissors,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { money, initials } from "@/lib/format";
import LandingNav from "@/components/landing/nav";
import Reveal from "@/components/landing/reveal";
import BookingButton from "@/components/landing/booking-button";
import BookingDialog from "@/components/landing/booking-dialog";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.businessSettings.findFirst();
  return {
    title: settings?.businessName ?? "BarberService",
    description: "Cortes de cabello, barba y degradados de precisión. Reserva tu cita online en minutos con los mejores barberos.",
  };
}

const marqueeWords = ["Cortes de cabello", "Barba", "Degradados", "Peinados", "Mascarillas"];

const testimonials = [
  {
    quote: "Saliendo del local con el mejor fade de la ciudad. Atención de primer nivel, de principio a fin.",
    name: "Carlos Pérez",
    role: "Cliente frecuente",
  },
  {
    quote: "Agendar fue facilísimo y siempre respetan la hora. Una experiencia de lujo.",
    name: "Miguel Rodríguez",
    role: "Cliente",
  },
  {
    quote: "El equipo sabe exactamente lo que hace; el trato es impecable en cada visita.",
    name: "Pedro Sánchez",
    role: "Cliente",
  },
];

const grain =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-gold">
      <span className="h-px w-8 bg-gold/60" />
      {children}
    </p>
  );
}

export default async function Home() {
  const [settings, services, barbers] = await Promise.all([
    prisma.businessSettings.findFirst(),
    prisma.service.findMany({ where: { active: true }, orderBy: { priceCents: "asc" } }),
    prisma.barber.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const businessName = settings?.businessName ?? "BarberService";
  const currency = settings?.currency ?? "USD";
  const startingPrice = services.length ? Math.min(...services.map((s) => s.priceCents)) : 0;
  const featured = barbers[0];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <LandingNav businessName={businessName} />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.12),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(200,164,92,0.2),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: grain }} />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-14 pt-28 md:pb-16 md:pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <Reveal>
              <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-gold">
                <span className="h-px w-8 bg-gold/60" />
                Desde {new Date().getFullYear() - 3} · Barbería premium
              </p>
              <h1 className="mt-4 font-display text-5xl font-semibold uppercase leading-[1.05] tracking-tight md:text-6xl">
                El arte de un <span className="text-gold">buen corte.</span>
              </h1>
              <p className="mt-4 max-w-lg text-base leading-6 text-zinc-400">
                Cortes de cabello, barba y degradados de precisión, hechos a tu medida. Elige tu
                servicio, elige a tu barbero y reserva en minutos, sin esperas.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <BookingButton className="group flex h-11 items-center gap-2 rounded-full bg-gold px-6 text-sm font-semibold text-zinc-950 transition-all hover:bg-gold-light hover:shadow-[0_8px_30px_rgba(200,164,92,0.35)]">
                  <Calendar size={15} /> Reservar cita
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </BookingButton>
                <a
                  href="#servicios"
                  className="flex h-11 items-center rounded-full border border-white/15 px-6 text-sm font-semibold text-zinc-200 transition-colors hover:border-gold/60 hover:text-gold"
                >
                  Ver servicios
                </a>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-5 text-[13px] text-zinc-500">
                <span className="flex items-center gap-2">
                  <Star size={14} className="fill-gold text-gold" /> 5.0 · Clientes satisfechos
                </span>
                <span className="flex items-center gap-2">
                  <Calendar size={14} /> Reserva en 2 minutos
                </span>
                <span className="flex items-center gap-2">
                  <Sparkles size={14} /> Estilo garantizado
                </span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={120} className="relative hidden lg:block">
            <div className="relative ml-auto aspect-square w-full max-w-md overflow-hidden rounded-full border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(200,164,92,0.28),transparent_48%),radial-gradient(circle_at_78%_84%,rgba(200,164,92,0.16),transparent_52%)]" />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0px,transparent_139px,rgba(255,255,255,0.08)_140px)]" />
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 420 420"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="heroLeather" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#3a3a3a" />
                    <stop offset="0.55" stopColor="#161616" />
                    <stop offset="1" stopColor="#050505" />
                  </linearGradient>
                  <linearGradient id="heroLeatherLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#4a4a4a" />
                    <stop offset="1" stopColor="#1a1a1a" />
                  </linearGradient>
                  <linearGradient id="heroMetal" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#8a6d2f" />
                    <stop offset="0.5" stopColor="#e8c878" />
                    <stop offset="1" stopColor="#6f5423" />
                  </linearGradient>
                  <linearGradient id="heroMetalShine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#f4e3b2" />
                    <stop offset="0.5" stopColor="#c9a24b" />
                    <stop offset="1" stopColor="#7a5f26" />
                  </linearGradient>
                  <linearGradient id="heroWood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#3a2d1c" />
                    <stop offset="1" stopColor="#1c1409" />
                  </linearGradient>
                  <radialGradient id="heroMirror" cx="0.5" cy="0.45" r="0.55">
                    <stop offset="0" stopColor="rgba(200,164,92,0.28)" />
                    <stop offset="0.55" stopColor="rgba(200,164,92,0.07)" />
                    <stop offset="1" stopColor="transparent" />
                  </radialGradient>
                  <radialGradient id="heroSpot" cx="0.5" cy="0.28" r="0.55">
                    <stop offset="0" stopColor="rgba(255,255,255,0.12)" />
                    <stop offset="1" stopColor="transparent" />
                  </radialGradient>
                  <linearGradient id="heroBeam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="rgba(200,164,92,0)" />
                    <stop offset="0.35" stopColor="rgba(200,164,92,0.1)" />
                    <stop offset="0.7" stopColor="rgba(200,164,92,0.04)" />
                    <stop offset="1" stopColor="rgba(200,164,92,0)" />
                  </linearGradient>
                  <filter id="heroSoft" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="8" />
                  </filter>
                  <filter id="heroBlur" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="3" />
                  </filter>
                </defs>

                <g transform="translate(42 0) scale(0.8)">
                <ellipse cx="210" cy="120" rx="120" ry="180" fill="url(#heroSpot)" />

                <circle cx="210" cy="222" r="135" fill="url(#heroMirror)" filter="url(#heroSoft)" />
                <ellipse cx="210" cy="222" rx="104" ry="132" fill="rgba(18,20,24,0.5)" />
                <ellipse cx="210" cy="222" rx="104" ry="132" stroke="url(#heroMetalShine)" strokeWidth="5" />
                <ellipse cx="210" cy="222" rx="96" ry="124" fill="url(#heroMirror)" />
                <path d="M132 304 C150 242 192 212 252 200" stroke="rgba(255,255,255,0.08)" strokeWidth="16" strokeLinecap="round" filter="url(#heroBlur)" />

                <polygon points="152,0 268,0 336,330 84,330" fill="url(#heroBeam)" />

                <g fill="rgba(224,189,106,0.5)">
                  <circle cx="150" cy="118" r="1.4" />
                  <circle cx="252" cy="148" r="1" />
                  <circle cx="180" cy="192" r="1.6" />
                  <circle cx="266" cy="214" r="1.1" />
                  <circle cx="138" cy="242" r="0.9" />
                  <circle cx="230" cy="272" r="1.3" />
                  <circle cx="166" cy="302" r="1" />
                  <circle cx="282" cy="120" r="0.8" />
                </g>
                <g fill="rgba(224,189,106,0.22)" filter="url(#heroBlur)">
                  <circle cx="200" cy="138" r="6" />
                  <circle cx="258" cy="232" r="7" />
                  <circle cx="148" cy="210" r="5" />
                </g>

                <rect x="0" y="440" width="420" height="85" fill="rgba(0,0,0,0.38)" />
                <path d="M0 440 H420" stroke="rgba(200,164,92,0.22)" strokeWidth="1" />
                <ellipse cx="210" cy="462" rx="150" ry="16" fill="rgba(200,164,92,0.07)" filter="url(#heroSoft)" />

                <path d="M34 252 L40 240 L46 252 Z" fill="url(#heroMetal)" />
                <path d="M98 252 L104 240 L110 252 Z" fill="url(#heroMetal)" />
                <rect x="30" y="250" width="112" height="6" rx="2" fill="url(#heroWood)" />
                <path d="M30 250 H142" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                <rect x="40" y="206" width="20" height="44" rx="6" fill="#181a1e" />
                <path d="M40 216 H60" stroke="rgba(224,189,106,0.35)" strokeWidth="1.5" />
                <rect x="44" y="201" width="12" height="8" rx="2" fill="url(#heroMetal)" />
                <rect x="44" y="222" width="10" height="14" rx="1" fill="rgba(224,189,106,0.25)" />
                <rect x="72" y="218" width="16" height="32" rx="5" fill="#6a4318" />
                <path d="M72 228 H88" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
                <rect x="75" y="214" width="10" height="7" rx="2" fill="url(#heroMetal)" />
                <rect x="76" y="234" width="8" height="9" rx="1" fill="rgba(255,255,255,0.18)" />
                <rect x="106" y="238" width="28" height="13" rx="4" fill="#232327" />
                <rect x="110" y="231" width="20" height="9" rx="3.5" fill="#2c2c31" />
                <path d="M110 236 H130" stroke="rgba(224,189,106,0.5)" strokeWidth="1" />

                <path d="M334 418 C334 430 344 442 352 444 H376 C384 442 394 430 394 418 Z" fill="#1d2127" />
                <path d="M334 418 C334 406 344 402 364 402 C384 402 394 406 394 418 C394 430 384 434 364 434 C344 434 334 430 334 418 Z" fill="#262b33" />
                <path d="M334 418 H394" stroke="url(#heroMetal)" strokeWidth="1.4" />
                <path d="M360 418 C354 382 350 354 356 324 C364 344 366 382 368 418 Z" fill="#2e4030" />
                <path d="M364 418 C370 384 380 358 396 336 C386 358 376 390 370 418 Z" fill="#283828" />
                <path d="M356 418 C346 390 332 366 316 358 C330 372 346 396 352 418 Z" fill="#354735" />
                <path d="M360 418 C358 396 356 380 360 360" stroke="rgba(224,189,106,0.22)" strokeWidth="1" />

                <ellipse cx="210" cy="447" rx="90" ry="10" fill="rgba(0,0,0,0.65)" filter="url(#heroSoft)" />

                <ellipse cx="210" cy="452" rx="96" ry="14" fill="url(#heroMetal)" />
                <ellipse cx="210" cy="449" rx="96" ry="14" fill="rgba(0,0,0,0.3)" />
                <ellipse cx="210" cy="447" rx="62" ry="9" fill="#1a1408" />
                <ellipse cx="210" cy="446" rx="62" ry="9" fill="url(#heroMetal)" opacity="0.85" />
                <ellipse cx="210" cy="443" rx="34" ry="5" fill="url(#heroMetalShine)" opacity="0.9" />

                <path d="M196 302 L188 442 H232 L224 302 Z" fill="url(#heroMetal)" />
                <path d="M201 302 L195 442" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" opacity="0.55" />
                <rect x="192" y="360" width="36" height="8" rx="3" fill="rgba(0,0,0,0.35)" />
                <rect x="191" y="388" width="38" height="8" rx="3" fill="rgba(0,0,0,0.35)" />
                <rect x="190" y="414" width="40" height="8" rx="3" fill="rgba(0,0,0,0.35)" />

                <path d="M210 420 C240 420 246 429 246 438 H174 C174 429 180 420 210 420 Z" fill="url(#heroMetal)" />
                <path d="M210 420 C226 420 234 425 237 431" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />

                <rect x="150" y="246" width="6" height="150" rx="3" fill="url(#heroMetal)" />
                <rect x="264" y="246" width="6" height="150" rx="3" fill="url(#heroMetal)" />
                <path d="M150 246 L156 246 L156 396 L150 396 Z" fill="url(#heroMetalShine)" opacity="0.25" />
                <rect x="116" y="244" width="48" height="14" rx="7" fill="url(#heroLeatherLight)" stroke="url(#heroMetal)" strokeWidth="1.2" />
                <rect x="256" y="244" width="48" height="14" rx="7" fill="url(#heroLeatherLight)" stroke="url(#heroMetal)" strokeWidth="1.2" />
                <circle cx="122" cy="251" r="1.6" fill="rgba(224,189,106,0.8)" />
                <circle cx="158" cy="251" r="1.6" fill="rgba(224,189,106,0.8)" />
                <circle cx="262" cy="251" r="1.6" fill="rgba(224,189,106,0.8)" />
                <circle cx="298" cy="251" r="1.6" fill="rgba(224,189,106,0.8)" />

                <path d="M118 268 C118 253 132 245 152 245 H268 C286 245 302 253 302 268 V290 C302 301 288 309 272 309 H148 C132 309 118 301 118 290 Z" fill="url(#heroLeather)" />
                <path d="M136 268 C136 257 145 251 156 251" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M120 268 C120 255 134 247 154 247 H268 C284 247 298 254 300 266" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" fill="none" />
                <path d="M150 268 V306" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" strokeDasharray="2 3" fill="none" />
                <path d="M210 268 V306" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" strokeDasharray="2 3" fill="none" />
                <path d="M270 268 V306" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" strokeDasharray="2 3" fill="none" />

                <path d="M138 96 C138 92 142 88 146 88 H274 C278 88 282 92 282 96 V248 C282 260 272 270 258 270 H162 C148 270 138 260 138 248 Z" fill="url(#heroLeather)" />
                <path d="M278 92 C282 92 284 96 284 100 V246" stroke="rgba(224,189,106,0.6)" strokeWidth="1.6" fill="none" />
                <path d="M150 104 C150 98 154 94 160 94 H260 C266 94 270 98 270 104 V242" stroke="rgba(255,255,255,0.08)" strokeWidth="1.6" fill="none" />
                <path d="M152 108 C152 102 156 98 162 98 H258 C264 98 268 102 268 108 V238" stroke="rgba(200,164,92,0.3)" strokeWidth="1.2" strokeDasharray="2 4" fill="none" />
                <g stroke="rgba(0,0,0,0.35)" strokeWidth="1.2">
                  <line x1="168" y1="132" x2="210" y2="170" />
                  <line x1="210" y1="132" x2="168" y2="170" />
                  <line x1="210" y1="132" x2="252" y2="170" />
                  <line x1="252" y1="132" x2="210" y2="170" />
                  <line x1="168" y1="170" x2="210" y2="208" />
                  <line x1="210" y1="170" x2="168" y2="208" />
                  <line x1="210" y1="170" x2="252" y2="208" />
                  <line x1="252" y1="170" x2="210" y2="208" />
                </g>
                {[
                  [168, 132],
                  [210, 132],
                  [252, 132],
                  [168, 170],
                  [210, 170],
                  [252, 170],
                  [168, 208],
                  [210, 208],
                  [252, 208],
                ].map(([cx, cy]) => (
                  <circle key={`btn-${cx}-${cy}`} cx={cx} cy={cy} r="3.2" fill="rgba(0,0,0,0.7)" />
                ))}
                {[
                  [166, 130],
                  [208, 130],
                  [250, 130],
                  [166, 168],
                  [208, 168],
                  [250, 168],
                  [166, 206],
                  [208, 206],
                  [250, 206],
                ].map(([cx, cy]) => (
                  <circle key={`hi-${cx}-${cy}`} cx={cx} cy={cy} r="1" fill="rgba(255,255,255,0.25)" />
                ))}

                <rect x="168" y="56" width="84" height="52" rx="20" fill="url(#heroLeatherLight)" stroke="url(#heroMetal)" strokeWidth="1.4" />
                <path d="M184 76 C184 67 192 62 210 62" stroke="rgba(255,255,255,0.26)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M204 70 V104" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" strokeDasharray="2 3" fill="none" />
                <path d="M216 70 V104" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" strokeDasharray="2 3" fill="none" />
                <rect x="201" y="104" width="18" height="26" rx="5" fill="url(#heroMetal)" />

                <g>
                  <circle cx="114" cy="436" r="6" fill="none" stroke="url(#heroMetal)" strokeWidth="2.5" />
                  <circle cx="142" cy="437" r="5" fill="none" stroke="url(#heroMetal)" strokeWidth="2.5" />
                  <path d="M120 434 L146 426" stroke="url(#heroMetal)" strokeWidth="2" strokeLinecap="round" />
                  <path d="M136 434 L120 424" stroke="url(#heroMetal)" strokeWidth="2" strokeLinecap="round" />
                </g>
                <rect x="296" y="433" width="26" height="4" rx="1.5" fill="#1a1a1c" />
                <g stroke="#1a1a1c" strokeWidth="1.2">
                  <line x1="298" y1="437" x2="298" y2="444" />
                  <line x1="302" y1="437" x2="302" y2="444" />
                  <line x1="306" y1="437" x2="306" y2="444" />
                  <line x1="310" y1="437" x2="310" y2="444" />
                </g>
                </g>
              </svg>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_52%,rgba(0,0,0,0.6)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-zinc-950 to-transparent" />

              <div className="absolute -right-6 bottom-16 flex flex-col items-end gap-2">
                {["Corte", "Barba", "Degradado"].map((label, i) => (
                  <div
                    key={label}
                    className="animate-float flex items-center gap-2 rounded-full border border-gold/40 bg-zinc-950/85 px-3.5 py-1.5 text-xs text-gold shadow-xl backdrop-blur"
                    style={{ animationDelay: `${i * 0.5 + 0.3}s` }}
                  >
                    <span className="text-[10px]">✦</span> {label}
                  </div>
                ))}
              </div>

              <div className="absolute -left-5 bottom-8 animate-float rounded-2xl border border-white/10 bg-zinc-950/85 px-4 py-2.5 shadow-2xl backdrop-blur">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Desde</div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-display text-lg font-semibold text-gold">{money(startingPrice, currency)}</span>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} size={10} className="fill-gold text-gold" />
                    ))}
                  </span>
                </div>
              </div>

              {featured && (
                <div className="absolute -left-12 top-16 animate-float rounded-2xl border border-white/10 bg-zinc-950/85 p-3 shadow-2xl backdrop-blur">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dark font-display text-xs font-semibold text-zinc-950">
                      {initials(featured.name)}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold">{featured.name}</div>
                      <div className="text-[11px] text-zinc-500">{featured.specialty ?? "Barbero"}</div>
                    </div>
                  </div>
                </div>
              )}

              <div
                className="absolute -right-7 top-12 animate-float rounded-full border border-gold/40 bg-zinc-950/85 px-3.5 py-1.5 text-xs text-gold shadow-xl backdrop-blur"
                style={{ animationDelay: "1.2s" }}
              >
                ✦ Agendado hoy
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="relative overflow-hidden border-y border-gold/20 bg-zinc-900/40 py-3">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center">
              {marqueeWords.map((word) => (
                <span
                  key={`${dup}-${word}`}
                  className="flex items-center gap-6 pr-6 text-xs uppercase tracking-[0.3em] text-zinc-500"
                >
                  {word} <span className="text-gold">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section id="servicios" className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <Reveal>
          <Eyebrow>El menú</Eyebrow>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-semibold uppercase tracking-tight md:text-5xl">
              Servicios que inspiran
            </h2>
            <p className="max-w-sm text-[13px] leading-5 text-zinc-500">
              Cortes, barba y más a precios claros en {currency}. Elige el tuyo y reserva tu lugar.
            </p>
          </div>
        </Reveal>

        <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
          {services.map((service, i) => (
            <Reveal key={service.id} delay={Math.min(i, 4) * 60}>
              <div className="group flex flex-col gap-2 px-1 py-4 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-5 md:px-4">
                <span className="font-display text-xs font-semibold text-gold/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-medium uppercase tracking-tight md:text-xl">
                    {service.name}
                  </h3>
                  {service.description && <p className="mt-0.5 text-[13px] text-zinc-500">{service.description}</p>}
                </div>
                <div className="flex items-center gap-5 sm:gap-8">
                  <span className="flex items-center gap-1.5 text-[13px] text-zinc-500">
                    <Clock size={13} /> {service.durationMin} min
                  </span>
                  <span className="font-display text-base font-semibold text-gold md:text-lg">
                    {money(service.priceCents, currency)}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="equipo" className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <Reveal>
          <Eyebrow>El equipo</Eyebrow>
          <h2 className="mt-3 font-display text-4xl font-semibold uppercase tracking-tight md:text-5xl">
            Nuestros Estilistas
          </h2>
          <p className="mt-3 max-w-sm text-[13px] leading-5 text-zinc-500">
            Cada corte es una pieza de autor. Elige a tu barbero de confianza.
          </p>
        </Reveal>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {barbers.map((barber, i) => (
            <Reveal key={barber.id} delay={i * 70}>
              <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dark font-display text-sm font-semibold text-zinc-950 shadow-[0_4px_20px_rgba(200,164,92,0.25)] transition-transform duration-300 group-hover:scale-105">
                  {initials(barber.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-lg font-medium uppercase tracking-tight">
                    {barber.name}
                  </div>
                  {barber.specialty && (
                    <div className="mt-0.5 truncate text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                      {barber.specialty}
                    </div>
                  )}
                  {barber.phone && <div className="mt-1 text-xs text-zinc-600">{barber.phone}</div>}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="experiencia" className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <Reveal>
          <Eyebrow>La experiencia</Eyebrow>
          <h2 className="mt-3 font-display text-4xl font-semibold uppercase tracking-tight md:text-5xl">
            Más que un corte, <span className="text-gold">una rutina.</span>
          </h2>
        </Reveal>

        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: <Sparkles size={20} />,
              title: "Estilo con identidad",
              text: "Cortes personalizados según tu tipo de cabello y tu rostro. Sal con un look que te represente.",
            },
            {
              icon: <Users size={20} />,
              title: "Barberos expertos",
              text: "Un equipo que domina degradados, barba y tendencias, con detalle y precisión en cada corte.",
            },
            {
              icon: <Clock size={20} />,
              title: "Comodidad y puntualidad",
              text: "Citas organizadas al minuto. Reserva online, llega sin esperas y sal a tiempo.",
            },
          ].map((feature, i) => (
            <Reveal key={feature.title} delay={i * 80}>
              <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-gold/30">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-display text-lg font-medium uppercase tracking-tight">{feature.title}</h3>
                  <p className="mt-1 text-[13px] leading-5 text-zinc-500">{feature.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-3 grid grid-cols-2 gap-4 rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/10 via-transparent to-transparent p-5 md:grid-cols-3">
            {[
              { value: services.length, label: "Servicios" },
              { value: barbers.length, label: "Barberos" },
              { value: "100%", label: "Clientes satisfechos" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-display text-3xl font-semibold text-gold">{stat.value}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {[
              { step: "1", title: "Elige tu servicio", text: "Corte, barba, degradado o el combo completo." },
              { step: "2", title: "Elige barbero y horario", text: "Tu barbero de confianza y el momento que mejor te quede." },
              { step: "3", title: "Confirma y listo", text: "Recibe la confirmación y llega sin esperas." },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/40 bg-gold/10 font-display text-sm font-semibold text-gold">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-display text-base font-medium uppercase tracking-tight">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-5 text-zinc-500">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <Reveal>
          <Eyebrow>Testimonios</Eyebrow>
          <h2 className="mt-3 font-display text-4xl font-semibold uppercase tracking-tight md:text-5xl">
            Lo que dicen
          </h2>
        </Reveal>
        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {testimonials.map((item, i) => (
            <Reveal key={item.name} delay={i * 80}>
              <figure className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} size={13} className="fill-gold text-gold" />
                    ))}
                  </div>
                  <blockquote className="mt-3 text-[13px] leading-6 text-zinc-300">
                    “{item.quote}”
                  </blockquote>
                </div>
                <figcaption className="mt-5 flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dark font-display text-[11px] font-semibold text-zinc-950">
                    {initials(item.name)}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold">{item.name}</div>
                    <div className="text-[11px] text-zinc-500">{item.role}</div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="contacto" className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <div className="relative overflow-hidden rounded-[2rem] border border-gold/30 bg-zinc-900 px-6 py-10 text-center md:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(200,164,92,0.2),transparent_60%)]" />
          <Reveal className="relative">
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Tu próximo corte te espera</p>
            <h2 className="mx-auto mt-2 max-w-2xl font-display text-4xl font-semibold uppercase leading-tight tracking-tight md:text-5xl">
              Reserva tu lugar en minutos.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[13px] leading-5 text-zinc-400">
              Elige tu servicio y a tu barbero, confirma y nosotros nos encargamos del resto.
              Sin registros obligatorios, sin esperas.
            </p>
            <BookingButton className="group mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-gold px-7 text-sm font-semibold text-zinc-950 transition-all hover:bg-gold-light hover:shadow-[0_8px_30px_rgba(200,164,92,0.4)]">
              Reservar cita
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </BookingButton>
          </Reveal>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { icon: <Phone size={17} />, label: "Teléfono", value: settings?.phone, href: settings?.phone ? `tel:${settings.phone}` : null },
            { icon: <Mail size={17} />, label: "Correo", value: settings?.email, href: settings?.email ? `mailto:${settings.email}` : null },
            { icon: <MapPin size={17} />, label: "Dirección", value: settings?.address, href: null },
          ].map((item, i) => (
            <Reveal key={item.label} delay={i * 70}>
              {item.value ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2.5 text-gold">
                    {item.icon}
                    <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{item.label}</span>
                  </div>
                  {item.href ? (
                    <a href={item.href} className="mt-2 block text-sm text-zinc-300 transition-colors hover:text-gold">
                      {item.value}
                    </a>
                  ) : (
                    <div className="mt-2 text-sm text-zinc-300">{item.value}</div>
                  )}
                </div>
              ) : null}
            </Reveal>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-gold/40 bg-gold/10 text-gold">
                  <Scissors size={16} />
                </div>
                <div className="font-display text-base font-semibold uppercase tracking-tight">{businessName}</div>
              </div>
              <p className="mt-3 max-w-xs text-[13px] leading-5 text-zinc-500">
                Cortes, barba y estilo de primer nivel en un ambiente pensado para ti. Reserva
                online y vive la experiencia.
              </p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Explorar</div>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  { label: "Servicios", href: "#servicios" },
                  { label: "Equipo", href: "#equipo" },
                  { label: "Experiencia", href: "#experiencia" },
                  { label: "Contacto", href: "#contacto" },
                ].map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="text-zinc-400 transition-colors hover:text-gold">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Contacto</div>
              <ul className="mt-3 space-y-2 text-[13px] text-zinc-400">
                {settings?.phone && <li>{settings.phone}</li>}
                {settings?.email && <li>{settings.email}</li>}
                {settings?.address && <li>{settings.address}</li>}
              </ul>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Horario</div>
              <ul className="mt-3 space-y-2 text-[13px] text-zinc-400">
                <li>Lun – Vie · 8:00 – 18:00</li>
                <li>Sáb · 9:00 – 17:00</li>
                <li>Dom · Cerrado</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[13px] text-zinc-500">
            <span>© {new Date().getFullYear()} {businessName}</span>
            <Link href="/login" className="transition-colors hover:text-gold">
              Área de administración
            </Link>
          </div>
        </div>
      </footer>

      <BookingDialog services={services} barbers={barbers} currency={currency} />
    </main>
  );
}