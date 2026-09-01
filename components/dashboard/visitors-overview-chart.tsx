"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "@/components/theme/theme-provider";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type OverviewDay = { label: string; total: number; organic: number };

type VisitorsOverviewChartProps = {
  days: OverviewDay[];
};

export function VisitorsOverviewChart({ days }: VisitorsOverviewChartProps) {
  const { theme } = useTheme();
  const isEmpty = days.every((day) => day.total === 0);

  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      fontFamily: "var(--font-manrope), sans-serif",
    },
    colors: ["#0c88ee", "#22c55e"],
    stroke: { curve: "smooth", width: 2, dashArray: [0, 6] },
    dataLabels: { enabled: false },
    grid: {
      borderColor: theme === "dark" ? "#27272a" : "#f4f4f5",
      strokeDashArray: 4,
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    xaxis: {
      categories: days.map((day) => day.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: theme === "dark" ? "#71717a" : "#a1a1aa", fontSize: "10px" },
      },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        style: { colors: theme === "dark" ? "#71717a" : "#a1a1aa", fontSize: "10px" },
      },
    },
    tooltip: { theme, shared: true, intersect: false },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      labels: { colors: theme === "dark" ? "#a1a1aa" : "#71717a" },
      markers: { size: 5 },
    },
    states: {
      hover: { filter: { type: theme === "dark" ? "none" : "darken" } },
      active: { filter: { type: "none" } },
    },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0 } },
  };

  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
        Sin datos aún.
      </div>
    );
  }

  return (
    <Chart
      options={options}
      series={[
        { name: "Total", data: days.map((day) => day.total) },
        { name: "Orgánicas", data: days.map((day) => day.organic) },
      ]}
      type="area"
      height="100%"
    />
  );
}
