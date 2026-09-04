"use client";

// Renderer de markdown liviano y sin dependencias. Soporta el subconjunto que usan los
// manuales de docs/manual (h1–h4, párrafos, negrita, cursiva, código inline, fenced code,
// listas anidadas de hasta 2 niveles, tablas, blockquote, hr y enlaces). Devuelve elementos
// React — nunca dangerouslySetInnerHTML, para evitar XSS — con estilos inline de Tailwind
// coherentes con el tema (dark: y acento --color-gold).

import type { ReactNode } from "react";

// ── Inline ────────────────────────────────────────────────────────────────

function renderInline(text: string, keyBase: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let i = 0;
  const token = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/;
  while (rest.length > 0) {
    const m = rest.match(token);
    if (!m || m.index === undefined) {
      nodes.push(rest);
      break;
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    const t = m[0];
    if (t.startsWith("**")) {
      nodes.push(<strong key={`${keyBase}-b${i}`} className="font-semibold text-zinc-900 dark:text-zinc-50">{t.slice(2, -2)}</strong>);
    } else if (t.startsWith("`")) {
      nodes.push(<code key={`${keyBase}-c${i}`} className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">{t.slice(1, -1)}</code>);
    } else if (t.startsWith("[")) {
      const mm = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (mm) {
        nodes.push(
          <a key={`${keyBase}-a${i}`} href={mm[2]} target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-600 dark:text-zinc-100 dark:decoration-zinc-600 dark:hover:text-zinc-300">
            {mm[1]}
          </a>,
        );
      }
    } else if (t.startsWith("*")) {
      nodes.push(<em key={`${keyBase}-i${i}`} className="italic text-zinc-700 dark:text-zinc-300">{t.slice(1, -1)}</em>);
    }
    rest = rest.slice(m.index + t.length);
    i++;
  }
  return nodes;
}

// ── Bloques ───────────────────────────────────────────────────────────────

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}.*\|.*$/.test(line.trim()) && line.trim().split("|").filter(Boolean).every((c) => /:?-{2,}:?/.test(c.trim()));
}

function isHeading(line: string): boolean {
  return /^#{1,4}\s+/.test(line);
}

function isBlockquote(line: string): boolean {
  return /^\s*>\s?/.test(line);
}

function isList(line: string): number {
  const m = line.match(/^(\s*)([-*]|\d+\.)\s+/);
  return m ? m[1].length : -1;
}

function splitCells(line: string): string[] {
  return line.trim().slice(1, -1).split("|").map((c) => c.trim());
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  const tags = { h1: "text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50",
    h2: "text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-8 mb-3",
    h3: "text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-6 mb-2",
    h4: "text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-5 mb-2" };

  let i = 0;
  let k = 0;
  const inline = (t: string) => renderInline(t, k++);

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    const blank = line.length === 0;

    if (blank) {
      i++;
      continue;
    }

    // Código fenced
    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // cierre
      blocks.push(
        <pre key={`k${k++}`} className="mt-3 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-100 dark:bg-zinc-950">
          <code className="font-mono">{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Encabezado
    if (isHeading(line)) {
      const lvl = line.match(/^#+/)![0].length;
      const text = line.replace(/^#{1,4}\s+/, "");
      const cls = tags[`h${lvl}` as keyof typeof tags];
      if (lvl === 1) {
        blocks.push(
          <header key={`k${k++}`} className="mb-5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{inline(text)}</h1>
            <hr className="mt-3 border-zinc-200 dark:border-zinc-800" />
          </header>,
        );
      } else {
        blocks.push(<h2 key={`k${k++}`} className={cls}>{inline(text)}</h2>);
      }
      i++;
      continue;
    }

    // HR
    if (/^---+\s*$/.test(line) || /^___+\s*$/.test(line) || /^\*\*\*+\s*$/.test(line)) {
      blocks.push(<hr key={`k${k++}`} className="my-6 border-zinc-200 dark:border-zinc-800" />);
      i++;
      continue;
    }

    // Blockquote
    if (isBlockquote(line)) {
      const buf: string[] = [];
      while (i < lines.length && isBlockquote(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={`k${k++}`} className="my-4 rounded-r-xl border-l-4 border-gold bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-gold-light dark:bg-zinc-900 dark:text-zinc-300">
          <p className="leading-relaxed">{inline(buf.join(" "))}</p>
        </blockquote>,
      );
      continue;
    }

    // Tabla
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitCells(lines[i]));
        i++;
      }
      blocks.push(
        <div key={`k${k++}`} className="my-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                {header.map((h, hi) => (
                  <th key={hi} className="px-4 py-2.5 font-semibold text-zinc-700 dark:text-zinc-200">{inline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} className="px-4 py-2 text-zinc-600 dark:text-zinc-300">{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Listas
    const listIndent = isList(line);
    if (listIndent !== -1) {
      const items: { depth: number; ordered: boolean; text: string; children: string[] }[] = [];
      while (i < lines.length) {
        const d = isList(lines[i]);
        if (d === -1) {
          // siguiente línea de contenido sin sangría no pertenece a la lista
          if (lines[i].trim().length > 0) break;
          i++;
          continue;
        }
        const depth = d === 0 ? 0 : 1;
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)!;
        items.push({ depth, ordered: /^\d+\./.test(m[2]), text: m[3], children: [] });
        i++;
      }
      const top = items.filter((x) => x.depth === 0);
      const nestedByTop = (topIdx: number) => {
        const start = items.indexOf(top[topIdx]);
        const out: { depth: number; ordered: boolean; text: string }[] = [];
        for (let j = start + 1; j < items.length; j++) {
          if (items[j].depth === 0) break;
          out.push(items[j]);
        }
        return out;
      };
      blocks.push(
        <ul key={`k${k++}`} className="mt-3 space-y-1.5">
          {top.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" aria-hidden="true" />
              <div className="min-w-0">
                <div className="leading-relaxed">{inline(item.text)}</div>
                <ul className="mt-1 space-y-1.5">
                  {nestedByTop(idx).map((c, cidx) => (
                    <li key={cidx} className="flex items-start gap-2 pl-5">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" aria-hidden="true" />
                      <div className="leading-relaxed">{inline(c.text)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Párrafo
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim().length > 0 && isList(lines[i]) === -1 && !isHeading(lines[i]) && !lines[i].trim().startsWith("```")) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(<p key={`k${k++}`} className="my-3 leading-relaxed text-zinc-700 dark:text-zinc-300">{inline(buf.join(" "))}</p>);
  }

  return <div className="text-sm text-zinc-600 dark:text-zinc-300">{blocks}</div>;
}
