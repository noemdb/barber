"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, RefreshCw, Save, X } from "lucide-react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { BusinessHoursEditor, type HourEntry } from "@/components/settings/business-hours-editor";
import { TestimonialsEditor, type TestimonialEntry } from "@/components/settings/testimonials-editor";

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

type ScalarSettings = {
  businessName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  heroImageUrl: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  mapsUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  currency: string;
  timezone: string;
  appointmentSlot: string;
};

const DEFAULTS: ScalarSettings = {
  businessName: "",
  tagline: "",
  description: "",
  logoUrl: "",
  faviconUrl: "",
  heroImageUrl: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  mapsUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  currency: "USD",
  timezone: "America/Caracas",
  appointmentSlot: "30",
};

const NULLABLE_KEYS = new Set([
  "tagline", "description", "logoUrl", "faviconUrl", "heroImageUrl", "phone", "whatsapp",
  "email", "address", "mapsUrl", "instagramUrl", "facebookUrl",
]);

function normalizeHours(hours: HourEntry[]): HourEntry[] {
  return Array.from({ length: 7 }, (_, i) => {
    const found = hours.find((h) => h.dayOfWeek === i);
    return { dayOfWeek: i, openTime: found?.openTime ?? null, closeTime: found?.closeTime ?? null };
  });
}

function pickScalars(data: Record<string, unknown>): ScalarSettings {
  return {
    businessName: String(data.businessName ?? ""),
    tagline: String(data.tagline ?? ""),
    description: String(data.description ?? ""),
    logoUrl: String(data.logoUrl ?? ""),
    faviconUrl: String(data.faviconUrl ?? ""),
    heroImageUrl: String(data.heroImageUrl ?? ""),
    phone: String(data.phone ?? ""),
    whatsapp: String(data.whatsapp ?? ""),
    email: String(data.email ?? ""),
    address: String(data.address ?? ""),
    mapsUrl: String(data.mapsUrl ?? ""),
    instagramUrl: String(data.instagramUrl ?? ""),
    facebookUrl: String(data.facebookUrl ?? ""),
    currency: String(data.currency ?? "USD"),
    timezone: String(data.timezone ?? "America/Caracas"),
    appointmentSlot: String(data.appointmentSlot ?? "30"),
  };
}

const inputClass =
  "mt-1.5 h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none";

export default function SettingsPage() {
  const [form, setForm] = useState<ScalarSettings>(DEFAULTS);
  const [hours, setHours] = useState<HourEntry[]>(normalizeHours([]));
  const [testimonials, setTestimonials] = useState<TestimonialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof ScalarSettings, value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          const d = json.data as { settings: Record<string, unknown>; businessHours: HourEntry[]; testimonials: TestimonialEntry[] };
          setForm(pickScalars(d.settings ?? {}));
          setHours(normalizeHours(d.businessHours ?? []));
          setTestimonials(d.testimonials ?? []);
        } else {
          toast.error(json.error?.message || "No se pudieron cargar los datos");
        }
      })
      .catch(() => toast.error("No se pudieron cargar los datos"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = {
      ...Object.fromEntries(
        Object.entries(form).map(([k, v]) => (NULLABLE_KEYS.has(k) ? [k, v.trim() === "" ? null : v] : [k, v])),
      ),
      appointmentSlot: Number(form.appointmentSlot),
      businessHours: hours,
      testimonials: testimonials.map((t, i) => ({
        author: t.author.trim(),
        role: t.role.trim() === "" ? null : t.role,
        quote: t.quote.trim(),
        rating: t.rating,
        order: i,
      })),
    };

    try {
      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await r.json();
      if (!json.success) {
        toast.error(json.error?.message || "No se pudo guardar la configuración");
        setSaving(false);
        return;
      }
      const d = json.data as { settings: Record<string, unknown>; businessHours: HourEntry[]; testimonials: TestimonialEntry[] };
      setForm(pickScalars(d.settings ?? {}));
      setHours(normalizeHours(d.businessHours ?? []));
      setTestimonials(d.testimonials ?? []);
      toast.success("Configuración guardada");
    } catch {
      toast.error("No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-4xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Configuración</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Identidad, contacto, marca y operación del negocio.</p>
        </div>
        <button
          type="submit"
          disabled={saving || loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 dark:bg-gold px-5 text-sm font-semibold text-white dark:text-zinc-950 transition-colors hover:bg-zinc-800 dark:hover:bg-gold-light disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Guardar cambios
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : (
        <>
          <Card title="Identidad" description="Nombre y textos que se muestran en la web y el panel.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del negocio">
                <input required value={form.businessName} onChange={(e) => set("businessName", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Eslogan (tagline del hero)">
                <input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Descripción" wide>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className="mt-1.5 min-h-20 w-full resize-y rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </Field>
            </div>
          </Card>

          <Card title="Imágenes" description="Logo, favicon e imagen principal. Si no se sube ninguna se usa una imagen local por defecto.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <BrandImageField label="Logo" value={form.logoUrl} onChange={(v) => set("logoUrl", v)} />
              <BrandImageField label="Favicon" value={form.faviconUrl} onChange={(v) => set("faviconUrl", v)} />
              <BrandImageField label="Imagen del hero" value={form.heroImageUrl} onChange={(v) => set("heroImageUrl", v)} />
            </div>
          </Card>

          <Card title="Contacto" description="Datos que se muestran en la sección de contacto y el footer.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Teléfono">
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
              </Field>
              <Field label="WhatsApp">
                <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Correo">
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Dirección">
                <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inputClass} />
              </Field>
              <Field label="URL de Google Maps" wide>
                <input value={form.mapsUrl} onChange={(e) => set("mapsUrl", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Instagram">
                <input value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Facebook">
                <input value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} className={inputClass} />
              </Field>
            </div>
          </Card>

          <Card title="Operación" description="Moneda, zona horaria y el paso de la agenda.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Moneda (ISO 3 letras)">
                <input value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} className={inputClass} list="currency-list" />
              </Field>
              <Field label="Zona horaria">
                <input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className={inputClass} list="tz-list" />
              </Field>
              <Field label="Intervalo de agenda (min)">
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={form.appointmentSlot}
                  onChange={(e) => set("appointmentSlot", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <datalist id="currency-list">
              {["USD", "EUR", "VES", "COP", "ARS", "MXN"].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <datalist id="tz-list">
              {["America/Caracas", "America/Bogota", "America/Mexico_City", "America/Argentina/Buenos_Aires", "Europe/Madrid", "UTC"].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Card>

          <Card title="Horarios" description="Días y horas laborables (mostrados en el footer).">
            <BusinessHoursEditor value={hours} onChange={setHours} />
          </Card>

          <Card title="Testimonios" description="Lo que dicen tus clientes en la página principal.">
            <TestimonialsEditor value={testimonials} onChange={setTestimonials} />
          </Card>
        </>
      )}
    </form>
  );
}

function Card({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`${wide ? "sm:col-span-2 " : ""}block text-xs font-medium text-zinc-700 dark:text-zinc-300`}>
      {label}
      <div>{children}</div>
    </label>
  );
}

function BrandImageField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { startUpload, isUploading } = useUploadThing("brandingUploader", {
    onClientUploadComplete: (files) => {
      const uploaded = files?.[0];
      if (uploaded) onChange(uploaded.ufsUrl);
    },
    onUploadError: (error) => {
      const message = error.message.includes("FileSizeMismatch")
        ? "La imagen supera el límite de 4 MB"
        : error.message.includes("FileTypeMismatch")
          ? "Solo se permiten imágenes PNG, JPG, GIF o SVG"
          : error.message || "No se pudo subir la imagen";
      toast.error(message);
    },
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await startUpload([file]);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 p-3 dark:bg-zinc-900/60">
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</span>

      <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-zinc-400 dark:text-zinc-500">
            <ImageIcon size={20} />
            <span className="text-[11px]">Sin imagen</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 text-xs font-semibold transition-colors hover:bg-zinc-800 dark:hover:bg-gold-light disabled:pointer-events-none disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
          <span>{isUploading ? "Subiendo..." : value ? "Reemplazar" : "Subir"}</span>
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 transition-colors hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500"
            aria-label={`Quitar ${label}`}
            title="Quitar imagen"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
        <RefreshCw size={11} />
        PNG, JPG o SVG · máx. 4 MB
      </p>
    </div>
  );
}
