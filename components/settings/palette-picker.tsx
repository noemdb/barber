"use client";

import { Check } from "lucide-react";

export type PaletteOption = {
  slug: string;
  name: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  isDefault?: boolean;
};

export function PalettePicker({
  palettes,
  value,
  onChange,
}: {
  palettes: PaletteOption[];
  value: string | null;
  onChange: (slug: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {palettes.map((p) => {
        const selected = value === p.slug;
        return (
          <button
            key={p.slug}
            type="button"
            onClick={() => onChange(p.slug)}
            aria-pressed={selected}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
              selected
                ? "border-gold bg-gold/10 ring-1 ring-inset ring-gold/40"
                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            }`}
          >
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full shadow-inner"
              style={{ background: p.accent }}
            >
              {selected && <Check size={18} className="text-zinc-950" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{p.name}</span>
              <span className="mt-1 flex gap-1.5">
                {[p.accent, p.accentLight, p.accentDark].map((c) => (
                  <span
                    key={c}
                    className="h-2.5 w-2.5 rounded-full border border-black/10"
                    style={{ background: c }}
                  />
                ))}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
