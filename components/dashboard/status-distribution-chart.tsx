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
  const colors = theme === "dark" ? COLORS_DARK : COLORS_LIGHT;

  if (statuses.length === 0) {
    return <p className="mt-5 grid h-48 place-items-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">Sin datos aún.</p>;
  }

  const total = statuses.reduce((s, st) => s + st.count, 0);

  const options: ApexOptions = {
    chart: {
      type: "donut",
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      fontFamily: "var(--font-manrope), sans-serif",
    },
    colors,
    labels: statuses.map((st) => st.label),
    legend: {
      position: "bottom",
      fontSize: "10px",
      fontWeight: 600,
      itemMargin: { horizontal: 6, vertical: 4 },
      formatter: (name, opts) => {
        if (!opts || !opts.w?.globals?.series) return name;
        const pct = ((opts.w.globals.series[opts.seriesIndex] / total) * 100).toFixed(0);
        return `${name} ${pct}%`;
      },
      labels: {
        colors: theme === "dark" ? "#a1a1aa" : "#52525b",
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              fontSize: "10px",
              color: theme === "dark" ? "#71717a" : "#a1a1aa",
              formatter: () => String(total),
            },
            value: {
              fontSize: "22px",
              fontWeight: 700,
              color: theme === "dark" ? "#fafafa" : "#18181b",
              formatter: () => String(total),
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    tooltip: {
      theme,
      y: { formatter: (value) => `${value} citas (${((value / total) * 100).toFixed(1)}%)` },
    },
    stroke: { show: false },
    states: {
      hover: { filter: { type: "lighten" } },
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
