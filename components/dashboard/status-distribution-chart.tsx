"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "@/components/theme/theme-provider";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type StatusCount = { label: string; count: number };

type Props = {
  statuses: StatusCount[];
};

const COLORS_LIGHT = ["#10b981", "#f59e0b", "#6366f1", "#ef4444", "#71717a"];
const COLORS_DARK = ["#34d399", "#fbbf24", "#818cf8", "#f87171", "#a1a1aa"];

export function StatusDistributionChart({ statuses }: Props) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const colors = dark ? COLORS_DARK : COLORS_LIGHT;

  if (statuses.length === 0) {
    return (
      <p className="mt-5 grid h-48 place-items-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
        Sin datos aún.
      </p>
    );
  }

  const total = statuses.reduce((s, st) => s + st.count, 0);
  const sliceStroke = dark ? "#18181b" : "#ffffff";
  const textMuted = dark ? "#71717a" : "#a1a1aa";

  const options: ApexOptions = {
    chart: {
      type: "donut",
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      fontFamily: "var(--font-manrope), sans-serif",
      animations: { enabled: true, speed: 450 },
    },
    colors,
    labels: statuses.map((st) => st.label),
    legend: {
      position: "bottom",
      fontSize: "10px",
      fontWeight: 600,
      itemMargin: { horizontal: 6, vertical: 4 },
      labels: { colors: dark ? "#d4d4d8" : "#3f3f46" },
      formatter: (name, opts) => {
        if (!opts || !opts.w?.globals?.series) return name;
        const count = opts.w.globals.series[opts.seriesIndex];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `${name} · ${pct}%`;
      },
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: "68%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "11px",
              fontWeight: 600,
              color: textMuted,
            },
            value: {
              fontSize: "26px",
              fontWeight: 700,
              offsetY: -2,
              color: dark ? "#fafafa" : "#18181b",
              formatter: (value) => `${value}`,
            },
            total: {
              show: true,
              label: "Citas",
              fontSize: "10px",
              fontWeight: 600,
              color: textMuted,
              formatter: () => String(total),
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: [sliceStroke] },
    tooltip: {
      theme,
      style: { fontSize: "11px", fontFamily: "var(--font-manrope), sans-serif" },
      y: {
        formatter: (value) => {
          const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
          return `${value} citas (${pct}%)`;
        },
      },
    },
    states: {
      hover: { filter: { type: "lighten", value: 0.06 } },
      active: { filter: { type: "none" } },
    },
  };

  return (
    <Chart
      options={options}
      series={statuses.map((s) => s.count)}
      type="donut"
      height="100%"
    />
  );
}
