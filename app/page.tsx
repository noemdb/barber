import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Scissors,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { money, initials } from "@/lib/format";
import { toMapsEmbedUrl } from "@/lib/map";
import LandingNav from "@/components/landing/nav";
import Reveal from "@/components/landing/reveal";
import BookingButton from "@/components/landing/booking-button";
import BookingDialog from "@/components/landing/booking-dialog";
import ServiceCard from "@/components/landing/service-card";
import BarberStatusGrid from "@/components/landing/barber-status-grid";
import FloatingBookingButton from "@/components/landing/floating-booking-button";
import FloatingWhatsAppButton from "@/components/landing/floating-whatsapp-button";
import { VisitTracker } from "@/components/landing/visit-tracker";

export const revalidate = 300;

function getSiteUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;
  if (env) {
    return env.startsWith("http") ? env.replace(/\/+$/, "") : `https://${env}`;
  }
  return "http://localhost:3000";
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.businessSettings.findFirst();

  const siteUrl = getSiteUrl();
  const title = settings?.businessName ?? "BarberService";
  const description =
    settings?.slogan ??
    settings?.tagline ??
    settings?.description ??
    "Cortes de cabello, barba y degradados de precisión. Reserva tu cita online en minutos con los mejores barberos.";
  const image = settings?.heroImageUrl ?? "/image/000000000d6081f68d1ea23de4944a97.png";

  return {
    title,
    description,
    keywords: [...marqueeWords, "barbería", settings?.subname ?? title].join(", "),
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "es_VE",
      url: siteUrl,
      siteName: title,
      title,
      description,
      images: [{ url: new URL(image, siteUrl).toString(), width: 800, height: 1000, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL(image, siteUrl).toString()],
    },
  };
}

const marqueeWords = ["Cortes de cabello", "Barba", "Degradados", "Peinados", "Mascarillas"];

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  const settings = await prisma.businessSettings.findFirst();
  const businessId = settings?.id ?? "settings";
  const [services, barbers, businessHours, testimonials, completedAppointments, assignments] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { priceCents: "asc" } }),
    prisma.barber.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.businessHour.findMany({ where: { businessId }, orderBy: { dayOfWeek: "asc" } }),
    prisma.testimonial.findMany({ where: { businessId }, orderBy: { order: "asc" } }),
    prisma.appointment.count({ where: { status: "COMPLETED" } }),
    prisma.barberService.findMany({
      where: { barber: { active: true }, service: { active: true } },
      select: { barberId: true, serviceId: true },
    }),
  ]);

  const serviceIdsByBarber = new Map<string, string[]>();
  const barberIdsByService = new Map<string, string[]>();
  for (const assignment of assignments) {
    serviceIdsByBarber.set(assignment.barberId, [...(serviceIdsByBarber.get(assignment.barberId) ?? []), assignment.serviceId]);
    barberIdsByService.set(assignment.serviceId, [...(barberIdsByService.get(assignment.serviceId) ?? []), assignment.barberId]);
  }
  const bookingServices = services.map((service) => ({ ...service, barberIds: barberIdsByService.get(service.id) ?? [] }));
  const bookingBarbers = barbers.map((barber) => ({ ...barber, serviceIds: serviceIdsByBarber.get(barber.id) ?? [] }));

  const businessName = settings?.businessName ?? "BarberService";
  const currency = settings?.currency ?? "USD";

  const palette =
    (settings?.paletteSlug
      ? await prisma.colorPalette.findUnique({ where: { slug: settings.paletteSlug } })
      : null) ?? (await prisma.colorPalette.findFirst({ where: { isDefault: true }, orderBy: { order: "asc" } }));

  const accentStyle: CSSProperties | undefined = palette
    ? ({
        "--color-gold": palette.accent,
        "--color-gold-light": palette.accentLight,
        "--color-gold-dark": palette.accentDark,
      } as Record<string, string>)
    : undefined;

  const startingPrice = services.length ? Math.min(...services.map((s) => s.priceCents)) : 0;
  const featured = barbers[0];
  const heroImage = settings?.heroImageUrl ?? "/image/000000000d6081f68d1ea23de4944a97.png";
  const heroDescription =
    settings?.description ??
    "Cortes de cabello, barba y degradados de precisión, hechos a tu medida. Elige tu servicio, elige a tu barbero y reserva en minutos, sin esperas.";
  const hoursByDay = new Map(businessHours.map((h) => [h.dayOfWeek, h]));
  const schedule = DAY_LABELS.map((label, dayOfWeek) => {
    const h = hoursByDay.get(dayOfWeek);
    if (!h?.openTime || !h?.closeTime) return `${label} · Cerrado`;
    return `${label} · ${h.openTime} – ${h.closeTime}`;
  });
  const socialLinks = [
    { label: "Instagram", href: settings?.instagramUrl },
    { label: "Facebook", href: settings?.facebookUrl },
  ].filter((s) => s.href) as { label: string; href: string }[];

  const mapsEmbedUrl = await toMapsEmbedUrl(settings?.mapsUrl, settings?.address);

  const siteUrl = getSiteUrl();
  const maxPrice = services.length ? Math.max(...services.map((s) => s.priceCents)) : 0;
  const schemaHours = businessHours
    .filter((h) => h.openTime && h.closeTime)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_NAMES[h.dayOfWeek],
      opens: h.openTime as string,
      closes: h.closeTime as string,
    }));
  const ratingCount = testimonials.filter((t) => t.rating > 0).length;
  const ratingAvg = ratingCount
    ? Math.round((testimonials.reduce((a, t) => a + t.rating, 0) / ratingCount) * 10) / 10
    : null;
  const completedCount = completedAppointments;
  const proofStat =
    completedCount > 0
      ? { value: completedCount, label: "Citas realizadas" }
      : ratingCount > 0
        ? { value: ratingCount, label: "Clientes" }
        : { value: "100%", label: "Clientes satisfechos" };
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    "@id": `${siteUrl}/#business`,
    name: businessName,
    url: siteUrl,
    ...(settings?.subname ? { alternateName: settings.subname } : {}),
    description: settings?.slogan ?? settings?.tagline ?? settings?.description ?? undefined,
    ...(settings?.phone ? { telephone: settings.phone } : {}),
    ...(settings?.email ? { email: settings.email } : {}),
    image: new URL(heroImage, siteUrl).toString(),
    ...(settings?.address ? { address: { "@type": "PostalAddress", streetAddress: settings.address } } : {}),
    ...(settings?.mapsUrl ? { hasMap: settings.mapsUrl } : {}),
    ...(schemaHours.length ? { openingHoursSpecification: schemaHours } : {}),
    ...(services.length
      ? { priceRange: `${money(startingPrice, currency)} – ${money(maxPrice, currency)}` }
      : {}),
    ...(ratingCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (testimonials.reduce((a, t) => a + t.rating, 0) / ratingCount).toFixed(1),
            bestRating: 5,
            worstRating: 1,
            ratingCount,
            reviewCount: ratingCount,
          },
        }
      : {}),
    ...(socialLinks.length ? { sameAs: socialLinks.map((s) => s.href) } : {}),
  };

  return (
    <main data-theme="dark" style={accentStyle} className="min-h-screen w-full min-w-0 overflow-x-clip bg-zinc-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav businessName={businessName} logoUrl={settings?.logoUrl} />

      <section className="relative overflow-hidden">
        {settings?.heroBackgroundUrl && (
          <div className="pointer-events-none absolute inset-0">
            <Image
              src={settings.heroBackgroundUrl}
              alt={`Entrada de ${businessName}`}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/85 via-zinc-950/70 to-zinc-950/85" />
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.12),transparent_34%),radial-gradient(circle_at_85%_80%,var(--gold-glow-20),transparent_40%),radial-gradient(circle_at_78%_42%,var(--gold-glow-16),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: grain }} />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-14 pt-28 md:pb-16 md:pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <Reveal>
              <div>
                <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-gold">
                  <span className="h-px w-8 bg-gold/60" />
                  Desde {new Date().getFullYear() - 3} · {settings?.tagline ?? "Barbería premium"}
                </p>
                <h1 className="mt-4 font-display text-5xl font-semibold uppercase leading-[1.05] tracking-tight md:text-6xl">
                  {settings?.businessName ?? "BarberService"}
                </h1>
                {settings?.subname && (
                  <p className="mt-2 font-display text-lg font-medium normal-case leading-snug tracking-tight text-zinc-200 md:text-2xl">
                    {settings.subname}
                  </p>
                )}
                {settings?.slogan && (
                  <p className="mt-3 font-display text-2xl font-medium normal-case leading-snug tracking-tight text-gold md:text-3xl">
                    {settings.slogan}
                  </p>
                )}
                {settings?.subtitle && (
                  <p className="mt-4 max-w-lg text-base leading-6 text-zinc-400">
                    {settings.subtitle}
                  </p>
                )}
                <p className="mt-3 max-w-lg text-[15px] leading-6 text-zinc-400">
                  {heroDescription}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <BookingButton className="group flex h-11 items-center gap-2 rounded-full bg-gold px-6 text-sm font-semibold text-zinc-950 transition-all hover:bg-gold-light hover:shadow-[0_8px_30px_var(--gold-glow-35)]">
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
                <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-5 text-[13px] text-zinc-400">
                  <span className="flex items-center gap-2">
                    <Star size={14} className="fill-gold text-gold" />{" "}
                    {ratingAvg
                      ? `${ratingAvg.toFixed(1)} · ${ratingCount} ${ratingCount === 1 ? "cliente" : "clientes"}`
                      : "Clientes satisfechos"}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar size={14} /> Reserva en 2 minutos
                  </span>
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} /> Estilo garantizado
                  </span>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={120} className="relative hidden lg:block">
            <div className="relative">
              <div className="pointer-events-none absolute -inset-x-12 -inset-y-10 bg-[radial-gradient(circle_at_50%_45%,var(--gold-glow-22),transparent_62%)] blur-2xl" />
              <div className="pointer-events-none absolute -inset-x-6 -inset-y-4 rounded-[3rem] border border-gold/15" />
              <div
                className="relative ml-auto aspect-[4/5] w-full max-w-md"
              >
                <div
                  className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/5 shadow-[0_0_90px_var(--gold-glow-12),0_30px_80px_-20px_rgba(0,0,0,0.7)]"
                style={{
                  maskImage:
                    "radial-gradient(ellipse 112% 100% at 50% 46%, black 62%, transparent 98%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse 112% 100% at 50% 46%, black 62%, transparent 98%)",
                }}
                >
                <Image
                  src={heroImage}
                  alt={`${businessName} — interior del local`}
                  className="absolute inset-0 object-cover rounded-[2rem] opacity-60"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 28rem"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/35 via-zinc-900/25 to-black/45" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,var(--gold-glow-28),transparent_48%),radial-gradient(circle_at_78%_84%,var(--gold-glow-16),transparent_52%)]" />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0px,transparent_139px,rgba(255,255,255,0.08)_140px)]" />
                </div>

              <div className="absolute -right-6 bottom-16 z-10 flex flex-col items-end gap-2">
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

              <div className="absolute -left-5 bottom-8 z-10 animate-float rounded-2xl border border-white/10 bg-zinc-950/85 px-4 py-2.5 shadow-2xl backdrop-blur">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-400">Desde</div>
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
                <div className="absolute -left-12 top-16 z-10 animate-float rounded-2xl border border-white/10 bg-zinc-950/85 p-3 shadow-2xl backdrop-blur">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dark font-display text-xs font-semibold text-zinc-950">
                      {initials(featured.name)}
                    </div>
                    <div>
                      <div className="truncate text-[13px] font-semibold">{featured.name}</div>
                      <div className="truncate text-[11px] text-zinc-400 line-clamp-1">{featured.specialty ?? "Barbero"}</div>
                    </div>
                  </div>
                </div>
              )}

              <div
                className="absolute -right-7 top-12 z-10 animate-float rounded-full border border-gold/40 bg-zinc-950/85 px-3.5 py-1.5 text-xs text-gold shadow-xl backdrop-blur"
                style={{ animationDelay: "1.2s" }}
              >
                ✦ Agendado hoy
              </div>
            </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="relative overflow-x-clip border-y border-gold/20 bg-zinc-900/40 py-3">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center">
              {marqueeWords.map((word) => (
                <span
                  key={`${dup}-${word}`}
                  className="flex items-center gap-6 pr-6 text-xs uppercase tracking-[0.3em] text-zinc-400"
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
            <p className="max-w-sm text-[13px] leading-5 text-zinc-400">
              Cortes, barba y más a precios claros en {currency}. Elige el tuyo y reserva tu lugar.
            </p>
          </div>
        </Reveal>

        <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
          {services.map((service, i) => (
            <Reveal key={service.id} delay={Math.min(i, 4) * 60}>
              <ServiceCard service={service} index={i} currency={currency} />
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
          <p className="mt-3 max-w-sm text-[13px] leading-5 text-zinc-400">
            Cada corte es una pieza de autor. Elige a tu barbero de confianza.
          </p>
        </Reveal>

        <Reveal>
          <BarberStatusGrid barbers={barbers} timezone={settings?.timezone ?? "America/Caracas"} />
        </Reveal>
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
                  <p className="mt-1 text-[13px] leading-5 text-zinc-400">{feature.text}</p>
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
              proofStat,
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-display text-3xl font-semibold text-gold">{stat.value}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-400">{stat.label}</div>
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
                  <p className="mt-1 text-[13px] leading-5 text-zinc-400">{s.text}</p>
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
            <Reveal key={item.id} delay={i * 80}>
              <figure className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: item.rating }).map((_, s) => (
                      <Star key={s} size={13} className="fill-gold text-gold" />
                    ))}
                  </div>
                  <blockquote className="mt-3 text-[13px] leading-6 text-zinc-300">
                    “{item.quote}”
                  </blockquote>
                </div>
                <figcaption className="mt-5 flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dark font-display text-[11px] font-semibold text-zinc-950">
                    {initials(item.author)}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold">{item.author}</div>
                    <div className="text-[11px] text-zinc-400">{item.role ?? "Cliente"}</div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        {testimonials.length === 0 && (
          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-zinc-400">
            Sin testimonios todavía.
          </div>
        )}
      </section>

      <section id="contacto" className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <div className="relative overflow-hidden rounded-[2rem] border border-gold/30 bg-zinc-900 px-6 py-10 text-center md:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--gold-glow-20),transparent_60%)]" />
          <Reveal className="relative">
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Tu próximo corte te espera</p>
            <h2 className="mx-auto mt-2 max-w-2xl font-display text-4xl font-semibold uppercase leading-tight tracking-tight md:text-5xl">
              Reserva tu lugar en minutos.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[13px] leading-5 text-zinc-400">
              Elige tu servicio y a tu barbero, confirma y nosotros nos encargamos del resto.
              Sin registros obligatorios, sin esperas.
            </p>
          </Reveal>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { icon: <Phone size={17} />, label: "Teléfono", value: settings?.phone, href: settings?.phone ? `tel:${settings.phone}` : null },
            {
              icon: <MessageCircle size={17} />,
              label: "WhatsApp",
              value: settings?.whatsapp,
              href: settings?.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}` : null,
            },
            { icon: <Mail size={17} />, label: "Correo", value: settings?.email, href: settings?.email ? `mailto:${settings.email}` : null },
            { icon: <MapPin size={17} />, label: "Dirección", value: settings?.address, href: settings?.mapsUrl ?? null },
          ].map((item, i) => (
            <Reveal key={item.label} delay={i * 70}>
              {item.value ? (
                <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2.5 text-gold">
                    {item.icon}
                    <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">{item.label}</span>
                  </div>
                  {item.href ? (
                    <a href={item.href} className="mt-2 block break-words text-sm text-zinc-300 transition-colors hover:text-gold">
                      {item.value}
                    </a>
                  ) : (
                    <div className="mt-2 break-words text-sm text-zinc-300">{item.value}</div>
                  )}
                </div>
              ) : null}
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <Reveal>
          <Eyebrow>Ubicación</Eyebrow>
          <h2 className="mt-3 font-display text-4xl font-semibold uppercase tracking-tight md:text-5xl">
            Visítanos
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <div className="mt-7 overflow-hidden rounded-[2rem] border border-gold/30 bg-zinc-900">
            <div className="h-[320px] w-full overflow-hidden md:h-[420px]">
              <iframe
                title="Mapa de ubicación"
                src={mapsEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full border-0 saturate-[85%]"
                style={{ filter: "invert(0.92) hue-rotate(180deg) brightness(0.9) contrast(0.9)" }}
                allowFullScreen
              />
            </div>
            {settings?.address && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <MapPin size={16} className="text-gold" />
                  <span className="break-words">{settings.address}</span>
                </div>
                {settings?.mapsUrl && (
                  <a
                    href={settings.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-gold/40 px-5 text-sm font-medium text-gold transition-all hover:bg-gold/10"
                  >
                    Ver ruta
                    <ArrowRight size={14} />
                  </a>
                )}
              </div>
            )}
          </div>
        </Reveal>
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
              {settings?.subname && (
                <p className="mt-1 font-display text-sm font-medium normal-case tracking-tight text-zinc-300">
                  {settings.subname}
                </p>
              )}
              {settings?.subtitle && (
                <p className="mt-2 max-w-xs text-[13px] leading-5 text-zinc-400">{settings.subtitle}</p>
              )}
              {settings?.slogan && (
                <p className="mt-2 font-display text-sm font-medium normal-case tracking-tight text-gold/90">
                  {settings.slogan}
                </p>
              )}
              <p className="mt-3 max-w-xs text-[13px] leading-5 text-zinc-400">
                Cortes, barba y estilo de primer nivel en un ambiente pensado para ti. Reserva
                online y vive la experiencia.
              </p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">Explorar</div>
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
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">Contacto</div>
              <ul className="mt-3 space-y-2 break-words text-[13px] text-zinc-400">
                {settings?.phone && <li>{settings.phone}</li>}
                {settings?.email && <li>{settings.email}</li>}
                {settings?.address && <li>{settings.address}</li>}
                {settings?.mapsUrl && (
                  <li>
                    <a href={settings.mapsUrl} className="transition-colors hover:text-gold">
                      Ver en el mapa
                    </a>
                  </li>
                )}
              </ul>
              {socialLinks.length > 0 && (
                <div className="mt-3 flex gap-4 text-[11px] uppercase tracking-[0.15em]">
                  {socialLinks.map((s) => (
                    <a key={s.label} href={s.href} className="text-zinc-400 transition-colors hover:text-gold">
                      {s.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">Horario</div>
              <ul className="mt-3 space-y-1.5 text-[13px] text-zinc-400">
                {schedule.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[13px] text-zinc-400">
            <span>© {new Date().getFullYear()} {businessName}</span>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/terminos" className="transition-colors hover:text-gold">
                Términos y Condiciones
              </Link>
              <Link href="/privacidad" className="transition-colors hover:text-gold">
                Política de Privacidad
              </Link>
              <Link href="/login" className="transition-colors hover:text-gold">
                Área de administración
              </Link>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[13px] text-zinc-400">
            <span>
              WebMaster:{" "}
              <a href="https://github.com/noemdb" className="transition-colors hover:text-gold">
                @noemdb
              </a>
            </span>
            <a
              href="https://wa.me/584121560804"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-gold"
            >
              WhatsApp: +584121560804
            </a>
          </div>
          <p className="mt-3 border-t border-white/10 pt-4 text-center text-[12px] text-zinc-400">
            © {new Date().getFullYear()} {businessName} — Todos los derechos reservados.
            <br />
            Este sitio está bajo la licencia{" "}
            <a
              href="https://opensource.org/license/mit"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-gold"
            >
              MIT
            </a>
            .
          </p>
        </div>
      </footer>

      <BookingDialog services={bookingServices} barbers={bookingBarbers} currency={currency} />

      <VisitTracker />

      <FloatingBookingButton>
        <Calendar size={15} /> Reservar cita
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </FloatingBookingButton>

      {settings?.whatsapp && (
        <FloatingWhatsAppButton whatsapp={settings.whatsapp} message="Hola, quiero reservar una cita 💈" />
      )}
    </main>
  );
}