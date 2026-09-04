"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type Option = { id: string; name: string };

type Props = {
  icon: React.ReactNode;
  placeholder: string;
  value: string[];
  options: Option[];
  optionsCount?: number;
  onChange: (value: string[]) => void;
  ariaLabel: string;
};

export function MultiFilterDropdown({ icon, placeholder, value, options, optionsCount, onChange, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const listboxId = `${uid}-listbox`;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggle(id: string) {
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  }
  function apply() {
    onChange(draft);
    setOpen(false);
  }

  const label =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? options.find((o) => o.id === value[0])?.name ?? placeholder
        : `${value.length} seleccionados`;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setDraft(value);
          setOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        className={`flex h-9 min-w-[150px] items-center gap-1.5 rounded-lg border bg-white pl-2 pr-1.5 transition-colors dark:bg-zinc-800 ${
          open
            ? "border-zinc-500 ring-2 ring-zinc-200 dark:border-zinc-400 dark:ring-zinc-700"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500"
        }`}
      >
        {icon}
        <span className="flex-1 truncate text-left text-xs font-semibold text-zinc-900 dark:text-zinc-50">{label}</span>
        {optionsCount !== undefined && optionsCount > 0 && (
          <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-zinc-200 px-1 text-[9px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
            {optionsCount}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`shrink-0 text-zinc-500 transition-transform duration-200 dark:text-zinc-400 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 z-50 mt-1.5 w-full min-w-[210px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="max-h-56 overflow-y-auto p-1">
            <ul>
              {options.map((o) => {
                const sel = draft.includes(o.id);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sel}
                      onClick={() => toggle(o.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 ${
                        sel ? "bg-zinc-50 dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-50" : "text-zinc-700"
                      }`}
                    >
                      <span>{o.name}</span>
                      {sel && <Check size={14} className="shrink-0 text-zinc-950 dark:text-zinc-100" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-100 p-1 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setDraft([])}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={apply}
              className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-gold dark:text-zinc-950 dark:hover:opacity-90"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
