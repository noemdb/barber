"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

export type TestimonialEntry = {
  id?: string;
  author: string;
  role: string;
  quote: string;
  rating: number;
  order: number;
};

const fieldClass =
  "mt-1.5 h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none";
const textareaClass =
  "mt-1.5 min-h-20 w-full resize-y rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none";

export function TestimonialsEditor({
  value,
  onChange,
}: {
  value: TestimonialEntry[];
  onChange: (value: TestimonialEntry[]) => void;
}) {
  const update = (index: number, p: Partial<TestimonialEntry>) => {
    onChange(value.map((t, i) => (i === index ? { ...t, ...p } : t)));
  };
  const move = (index: number, dir: -1 | 1) => {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((t, i) => ({ ...t, order: i })));
  };
  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index).map((t, i) => ({ ...t, order: i })));
  };
  const add = () => {
    onChange([
      ...value,
      { author: "", role: "", quote: "", rating: 5, order: value.length },
    ]);
  };

  return (
    <div className="space-y-3">
      {value.map((item, index) => (
        <div
          key={item.id ?? index}
          className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Testimonio {index + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                aria-label="Subir testimonio"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === value.length - 1}
                className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                aria-label="Bajar testimonio"
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-400"
                aria-label="Eliminar testimonio"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Autor
              <input value={item.author} onChange={(e) => update(index, { author: e.target.value })} className={fieldClass} />
            </label>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Rol (opcional)
              <input value={item.role} onChange={(e) => update(index, { role: e.target.value })} className={fieldClass} />
            </label>
          </div>

          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Cita
            <textarea value={item.quote} onChange={(e) => update(index, { quote: e.target.value })} className={textareaClass} />
          </label>

          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Estrellas (1–5)
            <select
              value={item.rating}
              onChange={(e) => update(index, { rating: Number(e.target.value) })}
              className="mt-1.5 h-10 w-40 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "estrella" : "estrellas"}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-sm font-semibold text-zinc-600 dark:text-zinc-400 transition-colors hover:border-gold/50 hover:text-gold"
      >
        <Plus size={16} /> Añadir testimonio
      </button>
    </div>
  );
}
