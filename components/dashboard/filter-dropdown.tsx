"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type Option = { id: string; name: string };

type Props = {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel: string;
};

export function FilterDropdown({ icon, placeholder, value, options, onChange, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const selected = options.find((o) => o.id === value);

  function choose(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`flex h-9 min-w-[150px] items-center gap-1.5 rounded-lg border bg-white pl-2 pr-1.5 transition-colors dark:bg-zinc-800 ${
          open
            ? "border-zinc-500 ring-2 ring-zinc-200 dark:border-zinc-400 dark:ring-zinc-700"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500"
        }`}
      >
        {icon}
        <span className="flex-1 truncate text-left text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-zinc-500 transition-transform duration-200 dark:text-zinc-400 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 z-50 mt-1.5 w-full min-w-[200px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          <ul className="max-h-60 overflow-y-auto p-1">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                onClick={() => choose("")}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <span>{placeholder}</span>
                {value === "" && <Check size={14} className="shrink-0 text-zinc-950 dark:text-zinc-100" />}
              </button>
            </li>
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === o.id}
                  onClick={() => choose(o.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <span>{o.name}</span>
                  {value === o.id && <Check size={14} className="shrink-0 text-zinc-950 dark:text-zinc-100" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
