"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Image as ImageIcon, Link, Loader2, RefreshCw, RotateCcw, Save, Send, Upload, X } from "lucide-react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { BusinessHoursEditor, type HourEntry } from "@/components/settings/business-hours-editor";
import { TestimonialsEditor, type TestimonialEntry } from "@/components/settings/testimonials-editor";
import { PalettePicker, type PaletteOption } from "@/components/settings/palette-picker";

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

type ScalarSettings = {
  businessName: string;
  subname: string;
  subtitle: string;
  slogan: string;
  tagline: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  heroImageUrl: string;
  heroBackgroundUrl: string;
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
  telegramChatId: string;
  paletteSlug: string;
};

const DEFAULTS: ScalarSettings = {
  businessName: "",
  subname: "",
  subtitle: "",
  slogan: "",
  tagline: "",
  description: "",
  logoUrl: "",
  faviconUrl: "",
  heroImageUrl: "",
  heroBackgroundUrl: "",
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
  telegramChatId: "",
  paletteSlug: "",
};

const NULLABLE_KEYS = new Set([
  "tagline", "description", "logoUrl", "faviconUrl", "heroImageUrl", "heroBackgroundUrl", "phone", "whatsapp",
  "email", "address", "mapsUrl", "instagramUrl", "facebookUrl", "telegramChatId", "paletteSlug",
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
    subname: String(data.subname ?? ""),
    subtitle: String(data.subtitle ?? ""),
    slogan: String(data.slogan ?? ""),
    tagline: String(data.tagline ?? ""),
    description: String(data.description ?? ""),
    logoUrl: String(data.logoUrl ?? ""),
    faviconUrl: String(data.faviconUrl ?? ""),
    heroImageUrl: String(data.heroImageUrl ?? ""),
    heroBackgroundUrl: String(data.heroBackgroundUrl ?? ""),
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
    telegramChatId: String(data.telegramChatId ?? ""),
    paletteSlug: String(data.paletteSlug ?? ""),
  };
}

const inputClass =
  "mt-1.5 h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none";

type TabId = "general" | "notificaciones" | "horarios" | "testimonios" | "base-de-datos";
const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "notificaciones", label: "Notificaciones" },
  { id: "horarios", label: "Horarios" },
  { id: "testimonios", label: "Testimonios" },
  { id: "base-de-datos", label: "Base de datos" }
];

// Palabra clave que el admin debe tipear para habilitar el botón de reinicio (señal de confirmación).
const RESET_CONFIRM_WORD = "REINICIAR";
// Palabra clave que el admin debe tipear para habilitar la restauración (señal de confirmación).
const RESTORE_CONFIRM_WORD = "RESTAURAR";

type BackupFile = { exportedAt: string; app: string; tables: Record<string, Record<string, unknown>[]> };

export default function SettingsPage() {
  const [form, setForm] = useState<ScalarSettings>(DEFAULTS);
  const [hours, setHours] = useState<HourEntry[]>(normalizeHours([]));
  const [testimonials, setTestimonials] = useState<TestimonialEntry[]>([]);
  const [palettes, setPalettes] = useState<PaletteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [envChatId, setEnvChatId] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("general");
  const [confirmWord, setConfirmWord] = useState("");
  const [resetting, setResetting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreWord, setRestoreWord] = useState("");
  const [restoring, setRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof ScalarSettings, value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          const d = json.data as { settings: Record<string, unknown>; businessHours: HourEntry[]; testimonials: TestimonialEntry[]; palettes?: PaletteOption[]; telegramEnvChatId?: string | null };
          setForm(pickScalars(d.settings ?? {}));
          setHours(normalizeHours(d.businessHours ?? []));
          setTestimonials(d.testimonials ?? []);
          setPalettes(d.palettes ?? []);
          setEnvChatId(d.telegramEnvChatId ?? null);
        } else {
          toast.error(json.error?.message || "No se pudieron cargar los datos");
        }
      })
      .catch(() => toast.error("No se pudieron cargar los datos"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    fetch("/api/telegram/bot")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) setBotUsername(json.data?.username ?? null);
      })
      .catch(() => {});

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
      const d = json.data as { settings: Record<string, unknown>; businessHours: HourEntry[]; testimonials: TestimonialEntry[]; palettes?: PaletteOption[]; telegramEnvChatId?: string | null };
      setForm(pickScalars(d.settings ?? {}));
      setHours(normalizeHours(d.businessHours ?? []));
      setTestimonials(d.testimonials ?? []);
      setPalettes(d.palettes ?? []);
      setEnvChatId(d.telegramEnvChatId ?? null);
      toast.success("Configuración guardada");
    } catch {
      toast.error("No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  async function testTelegram() {
    setTesting(true);
    try {
      const chatId = form.telegramChatId.trim() || undefined;
      const r = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId }),
      });
      const json = await r.json();
      if (!json.success) {
        toast.error(json.error?.message || "No se pudo enviar la prueba");
        return;
      }
      const d = json.data as {
        ok: boolean;
        message: string;
        chatId?: string | null;
        source?: string;
      };
      if (d.ok) {
        toast.success(d.message);
      } else {
        toast.error(d.message, {
          description: d.chatId ? `chat_id: ${d.chatId} · fuente: ${d.source}` : undefined,
        });
      }
    } catch {
      toast.error("No se pudo conectar con el servidor de prueba");
    } finally {
      setTesting(false);
    }
  }

  async function resetDb() {
    setResetting(true);
    try {
      const r = await fetch("/api/db/reset", { method: "POST" });
      const json = await r.json();
      if (!json.success) {
        toast.error(json.error?.message || "No se pudo reiniciar la base de datos");
        return;
      }
      const d = json.data as { deleted: Record<string, number> };
      const parts = Object.entries(d.deleted ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ");
      toast.success("Base de datos reiniciada", { description: parts });
      setConfirmWord("");
    } catch {
      toast.error("No se pudo conectar con el servidor");
    } finally {
      setResetting(false);
    }
  }

  async function downloadBackup() {
    setBackingUp(true);
    try {
      const r = await fetch("/api/db/backup", { method: "POST" });
      const json = await r.json();
      if (!json.success) {
        toast.error(json.error?.message || "No se pudo generar el backup");
        return;
      }
      const backup = json.data as BackupFile;
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = url;
      a.download = `barberservice-backup-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const entries = Object.entries(backup.tables ?? {});
      const total = entries.reduce((n, [, rows]) => n + rows.length, 0);
      toast.success("Backup descargado", { description: `${entries.length} tablas · ${total} registros` });
    } catch {
      toast.error("No se pudo generar el backup");
    } finally {
      setBackingUp(false);
    }
  }

  function onRestoreFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRestoreFile(e.target.files?.[0] ?? null);
    setRestoreWord("");
  }

  async function restoreDb() {
    if (!restoreFile) {
      toast.error("Selecciona un archivo de backup");
      return;
    }
    if (restoreWord.trim().toUpperCase() !== RESTORE_CONFIRM_WORD) {
      toast.error(`Escribe "${RESTORE_CONFIRM_WORD}" para habilitar la restauración`);
      return;
    }
    setRestoring(true);
    try {
      const text = await restoreFile.text();
      const r = await fetch("/api/db/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const json = await r.json();
      if (!json.success) {
        toast.error(json.error?.message || "No se pudo restaurar la base de datos");
        return;
      }
      const d = json.data as { restored: Record<string, number> };
      const parts = Object.entries(d.restored ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ");
      toast.success("Base de datos restaurada", { description: parts });
      setRestoreWord("");
      setRestoreFile(null);
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    } catch {
      toast.error("No se pudo conectar con el servidor");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <form onSubmit={save} className="w-full px-4 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Configuración</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Identidad, contacto, marca y operación del negocio.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : (
        <>
          <NavTabs value={tab} onChange={setTab} />

          {tab === "general" && (
            <>
              <Card title="Identidad" description="Nombre y textos que se muestran en la web y el panel.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre del negocio">
                    <input required value={form.businessName} onChange={(e) => set("businessName", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Subnombre">
                    <input value={form.subname} onChange={(e) => set("subname", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Subtítulo">
                    <input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Eslogan">
                    <input value={form.slogan} onChange={(e) => set("slogan", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Tagline del hero">
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

              <Card title="Imágenes" description="Logo, favicon, imagen principal y fondo del hero. Si no se sube alguna se usa un recurso local por defecto.">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <BrandImageField label="Logo" value={form.logoUrl} onChange={(v) => set("logoUrl", v)} />
                  <BrandImageField label="Favicon" value={form.faviconUrl} onChange={(v) => set("faviconUrl", v)} />
                  <BrandImageField label="Imagen del hero" value={form.heroImageUrl} onChange={(v) => set("heroImageUrl", v)} />
                  <div className="sm:col-span-2 lg:col-span-3">
                    <BrandImageField
                      label="Imagen de fondo del hero"
                      description="La entrada del negocio. Debe ser horizontal (paisaje) con relación de aspecto 1.91:1."
                      value={form.heroBackgroundUrl}
                      onChange={(v) => set("heroBackgroundUrl", v)}
                      aspectRatio={1.91}
                    />
                  </div>
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

              <Card title="Apariencia" description="Paleta de colores del sitio público. El landing siempre se muestra en modo oscuro.">
                {palettes.length > 0 ? (
                  <PalettePicker
                    palettes={palettes}
                    value={form.paletteSlug || null}
                    onChange={(slug) => set("paletteSlug", slug ?? "")}
                  />
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin paletas disponibles.</p>
                )}
              </Card>
            </>
          )}

          {tab === "notificaciones" && (
            <Card title="Notificaciones de Telegram" description="Chat que recibe los avisos de citas. Si se deja vacío se usa el valor de .env (TELEGRAM_CHAT_ID).">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Chat ID de Telegram">
                  <input
                    value={form.telegramChatId}
                    onChange={(e) => set("telegramChatId", e.target.value)}
                    className={inputClass}
                    placeholder="ej. -1001234567890"
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={testTelegram}
                    disabled={testing}
                    title="Envía un mensaje de prueba al chat configurado"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors hover:border-zinc-300 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {testing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    Enviar prueba
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Se usa:{" "}
                <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5">
                  {form.telegramChatId.trim() || envChatId || "—"}
                </code>
                {" · fuente: "}
                {form.telegramChatId.trim()
                  ? "ajustes"
                  : envChatId
                    ? "variable de entorno (TELEGRAM_CHAT_ID)"
                    : "ninguna"}
              </p>

              {(form.telegramChatId.trim() || envChatId) && botUsername && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors hover:border-zinc-300 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <Link size={15} />
                    Abrir bot en Telegram
                    <span className="font-mono text-xs font-medium text-zinc-400 dark:text-zinc-500">
                      @{botUsername}
                    </span>
                  </a>
                </div>
              )}
            </Card>
          )}

          {tab === "horarios" && (
              <Card title="Horarios" description="Días y horas laborables (mostrados en el footer).">
                <BusinessHoursEditor value={hours} onChange={setHours} />
              </Card>
          )}

          {tab === "testimonios" && (
            <Card title="Testimonios" description="Lo que dicen tus clientes en la página principal.">
              <TestimonialsEditor value={testimonials} onChange={setTestimonials} />
            </Card>
          )}

          {tab === "base-de-datos" && (
            <>
              <Card title="Backup de la base de datos" description="Descarga una copia completa de todas las tablas en un archivo JSON.">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-400">
                    El archivo incluye todas las tablas (usuarios, clientes, citas, pagos, visitantes, bitácora…).{" "}
                    <span className="font-medium text-red-500 dark:text-red-400">Contiene datos sensibles</span> (hashes de contraseña y datos personales); guárdalo en un lugar seguro.
                  </p>
                  <button
                    type="button"
                    onClick={downloadBackup}
                    disabled={backingUp}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 dark:bg-gold px-5 text-sm font-semibold text-white dark:text-zinc-950 transition-colors hover:bg-zinc-800 dark:hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {backingUp ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    Descargar backup
                  </button>
                </div>
              </Card>

              <Card title="Restaurar base de datos" description="Reemplaza los datos actuales por los de un archivo JSON descargado con «Descargar backup». Esta acción no se puede deshacer.">
                <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <strong className="font-semibold">Se reemplazarán todos los datos actuales.</strong>
                      <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/80">
                        Se restaurarán las tablas del archivo elegido. Asegúrate de que sea un backup legítimo:{" "}
                        <span className="font-medium">contiene datos sensibles</span> (hashes de contraseña y datos personales).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => restoreInputRef.current?.click()}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors hover:border-zinc-300 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <Upload size={15} />
                    Seleccionar archivo
                  </button>
                  <input ref={restoreInputRef} type="file" accept=".json,application/json" onChange={onRestoreFileChange} className="hidden" />
                  <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {restoreFile ? restoreFile.name : "Ningún archivo seleccionado"}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Field label={`Escribe "${RESTORE_CONFIRM_WORD}" para habilitar la restauración`}>
                    <input
                      value={restoreWord}
                      onChange={(e) => setRestoreWord(e.target.value)}
                      placeholder={RESTORE_CONFIRM_WORD}
                      autoComplete="off"
                      spellCheck={false}
                      className={inputClass}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={restoreDb}
                    disabled={restoring || !restoreFile || restoreWord.trim().toUpperCase() !== RESTORE_CONFIRM_WORD}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 dark:bg-gold px-5 text-sm font-semibold text-white dark:text-zinc-950 transition-colors hover:bg-zinc-800 dark:hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {restoring ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                    Restaurar base de datos
                  </button>
                </div>
              </Card>

              <Card title="Reiniciar datos" description="Limpia las tablas de operación del negocio. Esta acción no se puede deshacer.">
                <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500 dark:text-red-400" />
                    <div className="text-sm text-red-700 dark:text-red-300">
                      <strong className="font-semibold">Se perderán datos de forma permanente.</strong>
                      <p className="mt-1 text-xs text-red-600/90 dark:text-red-300/80">
                        Se vaciarán las tablas: <code>{`Appointment`}</code>, <code>{`Barber`}</code>, <code>{`BusinessHour`}</code>, <code>{`Client`}</code>, <code>{`Payment`}</code> y <code>{`Service`}</code>.{" "}
                        La configuración, usuarios y testimonios se conservan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Field label={`Escribe "${RESET_CONFIRM_WORD}" para habilitar el reinicio`}>
                    <input
                      value={confirmWord}
                      onChange={(e) => setConfirmWord(e.target.value)}
                      placeholder={RESET_CONFIRM_WORD}
                      autoComplete="off"
                      spellCheck={false}
                      className={inputClass}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={resetDb}
                    disabled={resetting || confirmWord.trim().toUpperCase() !== RESET_CONFIRM_WORD}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {resetting ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                    Reiniciar datos
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                  Esta acción borra los registros de las tablas indicadas y no admite deshacer.
                </p>
              </Card>
            </>
          )}
        </>
      )}

      {!loading && (
        <button
          type="submit"
          disabled={saving || loading}
          title="Guardar cambios"
          className="group fixed bottom-6 right-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 shadow-lg transition-all duration-200 hover:w-auto hover:gap-2 hover:px-5 hover:bg-zinc-800 dark:hover:bg-gold-light disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          <span className="hidden whitespace-nowrap text-sm font-semibold group-hover:inline">Guardar cambios</span>
        </button>
      )}
    </form>
  );
}

function NavTabs({ value, onChange }: { value: TabId; onChange: (tab: TabId) => void }) {
  return (
    <div role="tablist" className="flex w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-1">
      {TABS.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            onClick={() => onChange(t.id)}
            aria-selected={active}
            title={t.label}
            className={`min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-xs sm:text-sm font-medium transition-colors ${
              active
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 font-semibold shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
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

function validateAspectRatio(file: File, target: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = img.naturalWidth / img.naturalHeight;
      if (Math.abs(ratio - target) > 0.06) {
        reject(
          new Error(
            `La imagen debe ser horizontal con relación de aspecto ${target}:1 (paisaje). Recibiste una de ${ratio.toFixed(2)}:1.`,
          ),
        );
      } else {
        resolve();
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen. Usa un archivo PNG, JPG, GIF o SVG válido."));
    };
    img.src = url;
  });
}

function BrandImageField({
  label,
  description,
  value,
  onChange,
  aspectRatio,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  aspectRatio?: number;
}) {
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
    if (aspectRatio) {
      try {
        await validateAspectRatio(file, aspectRatio);
      } catch (err) {
        toast.error((err as Error).message);
        return;
      }
    }
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
        {description ? `${description} ` : ""}
        PNG, JPG o SVG · máx. 4 MB
      </p>
    </div>
  );
}