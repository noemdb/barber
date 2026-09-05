"use client";

import { useCallback, useEffect, useReducer, useRef, type FormEvent } from "react";

export type BookingService = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  barberIds: string[];
};

export type BookingBarber = { id: string; name: string; specialty: string | null; serviceIds: string[] };

export type CreatedAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  service: { name: string };
  barber: { name: string };
  client: { name: string };
};

export type Step = "choice" | "datos" | "services" | "barber" | "details" | "success";

type Quick = {
  token: string;
  byBarber: Record<string, Record<string, string[]>>;
};

type Returning = { exists: boolean; name: string | null; phone: string | null };

type State = {
  open: boolean;
  step: Step;
  serviceId: string;
  barberId: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  submitting: boolean;
  error: string;
  result: CreatedAppointment | null;
  quick: Quick;
  activeDay: string;
  refreshKey: number;
  holdToken: string;
  returning: Returning | null;
};

const DRAFT_KEY = "barber:booking-draft";

const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function newHoldToken() {
  try {
    return crypto.randomUUID();
  } catch {
    return `hold_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

// Los próximos 3 días (incluido hoy) en formato local YYYY-MM-DD.
export function next3Days(): string[] {
  return [0, 1, 2].map((n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return localDateStr(d);
  });
}

export function dayLabel(dayStr: string): string {
  const today = localDateStr(new Date());
  if (dayStr === today) return "Hoy";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dayStr === localDateStr(tomorrow)) return "Mañana";
  return new Date(`${dayStr}T00:00:00`).toLocaleDateString("es-VE", { weekday: "short", day: "numeric" });
}

type Draft = {
  serviceId: string;
  barberId: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  step: Step;
};

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

function saveDraft(s: State) {
  if (!s.open) return;
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        serviceId: s.serviceId,
        barberId: s.barberId,
        name: s.name,
        email: s.email,
        phone: s.phone,
        date: s.date,
        time: s.time,
        step: s.step,
      } satisfies Draft),
    );
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

type Action =
  | { type: "OPEN"; serviceId: string; barberId: string }
  | { type: "CLOSE" }
  | { type: "SET_STEP"; step: Step }
  | { type: "SELECT_SERVICE"; id: string }
  | { type: "SELECT_BARBER"; id: string }
  | { type: "CLEAR_SERVICE" }
  | { type: "CLEAR_BARBER" }
  | { type: "SET_CONTACT"; name: string; email: string; phone: string }
  | { type: "SET_DATE"; date: string }
  | { type: "SET_TIME"; time: string }
  | { type: "SET_ACTIVE_DAY"; day: string }
  | { type: "SET_QUICK"; token: string; byBarber: Quick["byBarber"] }
  | { type: "SET_SUBMITTING"; submitting: boolean }
  | { type: "SET_ERROR"; error: string }
  | { type: "SET_RESULT"; result: CreatedAppointment | null }
  | { type: "SET_RETURNING"; returning: Returning | null }
  | { type: "REFRESH_AVAILABILITY" };

const initialState: State = {
  open: false,
  step: "choice",
  serviceId: "",
  barberId: "",
  name: "",
  email: "",
  phone: "",
  date: "",
  time: "",
  submitting: false,
  error: "",
  result: null,
  quick: { token: "", byBarber: {} },
  activeDay: "",
  refreshKey: 0,
  holdToken: newHoldToken(),
  returning: null,
};

function nextAfterService(s: State): Step {
  if (s.barberId) return s.name.trim() && s.email.trim() ? "details" : "datos";
  return "barber";
}

function nextAfterBarber(s: State): Step {
  return s.serviceId ? (s.name.trim() && s.email.trim() ? "details" : "datos") : s.step;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "OPEN": {
      const draft = loadDraft();
      const hasPreselection = Boolean(action.serviceId || action.barberId);
      // Si vino con servicio/barbero desde el landing, usar esa selección.
      // Si vino vacío, restaurar el borrador guardado (si existe) para retomar.
      const base = hasPreselection
        ? { serviceId: action.serviceId, barberId: action.barberId }
        : {
            serviceId: draft?.serviceId ?? "",
            barberId: draft?.barberId ?? "",
          };
      const step: Step = hasPreselection
        ? "barber"
        : base.serviceId || base.barberId
          ? (draft?.step ?? "barber")
          : "choice";
      return {
        ...state,
        open: true,
        step,
        serviceId: base.serviceId,
        barberId: base.barberId,
        name: hasPreselection ? "" : (draft?.name ?? ""),
        email: hasPreselection ? "" : (draft?.email ?? ""),
        phone: hasPreselection ? "" : (draft?.phone ?? ""),
        date: hasPreselection ? "" : (draft?.date ?? ""),
        time: hasPreselection ? "" : (draft?.time ?? ""),
        submitting: false,
        error: "",
        result: null,
        quick: { token: "", byBarber: {} },
        activeDay: "",
        refreshKey: 0,
        holdToken: newHoldToken(),
        returning: null,
      };
    }
    case "CLOSE":
      return { ...state, open: false };
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SELECT_SERVICE":
      return { ...state, serviceId: action.id, step: nextAfterService(state) };
    case "SELECT_BARBER":
      return { ...state, barberId: action.id, step: nextAfterBarber(state) };
    case "CLEAR_SERVICE":
      return { ...state, serviceId: "" };
    case "CLEAR_BARBER":
      return { ...state, barberId: "" };
    case "SET_CONTACT":
      return { ...state, name: action.name, email: action.email, phone: action.phone };
    case "SET_DATE":
      return { ...state, date: action.date };
    case "SET_TIME":
      return { ...state, time: action.time };
    case "SET_ACTIVE_DAY":
      return { ...state, activeDay: action.day };
    case "SET_QUICK":
      return { ...state, quick: { token: action.token, byBarber: action.byBarber } };
    case "SET_SUBMITTING":
      return { ...state, submitting: action.submitting };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_RESULT":
      return { ...state, result: action.result };
    case "SET_RETURNING":
      return { ...state, returning: action.returning };
    case "REFRESH_AVAILABILITY":
      return { ...state, refreshKey: state.refreshKey + 1 };
    default:
      return state;
  }
}

export function useBookingWizard({ services, barbers }: { services: BookingService[]; barbers: BookingBarber[] }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  // Abrir el diálogo desde el evento global (landing: cards, botones de reserva).
  useEffect(() => {
    const openDialog = (event: Event) => {
      const detail = (event as CustomEvent<{ serviceId?: string; barberId?: string }>).detail;
      dispatch({ type: "OPEN", serviceId: detail?.serviceId ?? "", barberId: detail?.barberId ?? "" });
    };
    window.addEventListener("barber:open-booking", openDialog);
    return () => window.removeEventListener("barber:open-booking", openDialog);
  }, []);

  // Escape para cerrar, bloquear scroll y focus-trap.
  useEffect(() => {
    if (!state.open) return;
    previouslyFocused.current = document.activeElement;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () => {
      if (!dialog) return [] as HTMLElement[];
      return Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dispatch({ type: "CLOSE" });
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = focusable();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const t = setTimeout(() => {
      const nodes = focusable();
      nodes[0]?.focus();
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (previouslyFocused.current instanceof HTMLElement) previouslyFocused.current.focus();
    };
  }, [state.open]);

  // Prefetch de disponibilidad: al elegir servicio (o al entrar al paso de barbero),
  // consultar todos los barberos para que al seleccionar uno cargue instantáneo.
  useEffect(() => {
    if (!state.serviceId) return;
    let cancelled = false;
    const service = services.find((s) => s.id === state.serviceId);
    const durationMin = service?.durationMin;
    const from = new Date();
    const to = new Date(from);
    to.setDate(to.getDate() + 3);
    to.setHours(23, 59, 59, 999);
    const token = state.holdToken;
    const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), token });
    if (durationMin) qs.set("durationMin", String(durationMin));
    fetch(`/api/availability?${qs.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const barbers = (json.data?.barbers ?? []) as Array<{ id?: string; freeSlots?: string[] }>;
        const byBarber: Quick["byBarber"] = {};
        for (const b of barbers) {
          if (!b.id) continue;
          const slotsByDay: Record<string, string[]> = {};
          for (const iso of b.freeSlots ?? []) {
            const day = localDateStr(new Date(iso));
            (slotsByDay[day] ??= []).push(iso);
          }
          byBarber[b.id] = slotsByDay;
        }
        dispatch({ type: "SET_QUICK", token, byBarber });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "SET_QUICK", token, byBarber: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [state.serviceId, services, state.refreshKey, state.holdToken]);

  // Persistir borrador cuando cambia la selección / datos de contacto.
  useEffect(() => {
    if (!state.open || state.step === "success") return;
    saveDraft(state);
  }, [state]);

  const quickReady = Boolean(state.barberId) && state.quick.token === state.holdToken && Boolean(state.quick.byBarber[state.barberId]);
  const days = next3Days();
  const activeSlots = quickReady ? (state.quick.byBarber[state.barberId][state.activeDay] ?? []) : [];

  const stepIndex =
    state.step === "choice"
      ? 1
      : state.step === "datos"
        ? 2
        : state.step === "services"
          ? 3
          : state.step === "barber"
            ? 4
            : state.step === "details"
              ? 5
              : 6;

  const selectedService = services.find((s) => s.id === state.serviceId);
  const availableServices = state.barberId
    ? services.filter((service) => service.barberIds.includes(state.barberId))
    : services;
  const availableBarbers = state.serviceId
    ? barbers.filter((barber) => barber.serviceIds.includes(state.serviceId))
    : barbers;

  const goTo = useCallback((step: Step) => dispatch({ type: "SET_STEP", step }), []);
  const close = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const setContact = useCallback((name: string, email: string, phone: string) => dispatch({ type: "SET_CONTACT", name, email, phone }), []);
  const setDate = useCallback((date: string) => dispatch({ type: "SET_DATE", date }), []);
  const setTime = useCallback((time: string) => dispatch({ type: "SET_TIME", time }), []);
  const setActiveDay = useCallback((day: string) => dispatch({ type: "SET_ACTIVE_DAY", day }), []);
  const selectService = useCallback(
    (id: string) => {
      dispatch({ type: "SELECT_SERVICE", id });
      if (state.barberId && !services.find((service) => service.id === id)?.barberIds.includes(state.barberId)) {
        dispatch({ type: "CLEAR_BARBER" });
      }
    },
    [services, state.barberId],
  );
  const selectBarber = useCallback(
    (id: string) => {
      dispatch({ type: "SELECT_BARBER", id });
      if (state.serviceId && !barbers.find((barber) => barber.id === id)?.serviceIds.includes(state.serviceId)) {
        dispatch({ type: "CLEAR_SERVICE" });
      }
    },
    [barbers, state.serviceId],
  );
  const setReturning = useCallback((returning: Returning | null) => dispatch({ type: "SET_RETURNING", returning }), []);

  // #2 — Buscar cliente existente por email para pre-rellenar nombre/teléfono.
  const lookupReturning = useCallback(
    async (email: string) => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !trimmed.includes("@")) {
        setReturning(null);
        return;
      }
      try {
        const res = await fetch(`/api/booking/lookup?email=${encodeURIComponent(trimmed)}`);
        const json = await res.json();
        if (json?.data?.exists) {
          setReturning({ exists: true, name: json.data.name ?? null, phone: json.data.phone ?? null });
          if (json.data.name && !state.name.trim()) {
            setContact(json.data.name, state.email, state.phone);
          }
        } else {
          setReturning(null);
        }
      } catch {
        setReturning(null);
      }
    },
    [setReturning, state.name, state.email, state.phone, setContact],
  );

  function holdSlot(startsAtIso: string) {
    const service = services.find((s) => s.id === state.serviceId);
    const dur = service?.durationMin ?? 30;
    fetch("/api/availability/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId: state.barberId, serviceId: state.serviceId, startsAt: startsAtIso, durationMin: dur, token: state.holdToken }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) {
          dispatch({ type: "SET_ERROR", error: j?.error?.message ?? "Ese horario acaba de ser reservado por otra persona" });
          dispatch({ type: "REFRESH_AVAILABILITY" });
        }
      })
      .catch(() => {});
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", error: "" });
    if (!state.serviceId || !state.barberId) {
      dispatch({ type: "SET_ERROR", error: "Selecciona un servicio y un barbero" });
      return;
    }
    if (!state.name.trim()) {
      dispatch({ type: "SET_ERROR", error: "El nombre es obligatorio" });
      dispatch({ type: "SET_STEP", step: "datos" });
      return;
    }
    if (!state.email.trim()) {
      dispatch({ type: "SET_ERROR", error: "El correo es obligatorio" });
      dispatch({ type: "SET_STEP", step: "datos" });
      return;
    }
    if (!state.date || !state.time) {
      dispatch({ type: "SET_ERROR", error: "Selecciona fecha y hora" });
      return;
    }
    const startsAt = new Date(`${state.date}T${state.time}:00`);
    if (startsAt <= new Date()) {
      dispatch({ type: "SET_ERROR", error: "La fecha y hora deben ser futuras" });
      return;
    }
    dispatch({ type: "SET_SUBMITTING", submitting: true });
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          email: state.email,
          phone: state.phone.trim() || undefined,
          serviceId: state.serviceId,
          barberId: state.barberId,
          startsAt: startsAt.toISOString(),
          holdToken: state.holdToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message ?? "No fue posible reservar");
      dispatch({ type: "SET_RESULT", result: data.data });
      dispatch({ type: "SET_STEP", step: "success" });
      clearDraft();
    } catch (err) {
      dispatch({ type: "SET_ERROR", error: err instanceof Error ? err.message : "No fue posible reservar" });
    } finally {
      dispatch({ type: "SET_SUBMITTING", submitting: false });
    }
  }

  return {
    state,
    dialogRef,
    quickReady,
    days,
    activeSlots,
    stepIndex,
    selectedService,
    availableServices,
    availableBarbers,
    goTo,
    close,
    setContact,
    setDate,
    setTime,
    setActiveDay,
    selectService,
    selectBarber,
    lookupReturning,
    setReturning,
    holdSlot,
    submit,
  };
}
