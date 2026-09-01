"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "@/components/theme/theme-provider";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type TopSection = { path: string; count: number };

type TopSectionsChartProps = {
  sections: TopSection[];
};

export function TopSectionsChart({ sections }: TopSectionsChartProps) {
  const { theme } = useTheme();
  const isEmpty = sections.length === 0;

  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      fontFamily: "var(--font-manrope), sans-serif",
    },
    colors: ["#8b5cf6"],
    plotOptions: { bar: { horizontal: true, barHeight: "58%", borderRadius: 4 } },
    dataLabels: { enabled: false },
    grid: {
      borderColor: theme === "dark" ? "#27272a" : "#f4f4f5",
      strokeDashArray: 4,
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    xaxis: {
      categories: sections.map((section) => section.path),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: theme === "dark" ? "#71717a" : "#a1a1aa", fontSize: "10px" },
      },
    },
    yaxis: {
      labels: {
        style: { colors: theme === "dark" ? "#71717a" : "#a1a1aa", fontSize: "10px" },
      },
    },
    tooltip: { theme, y: { formatter: (value) => `${value} vistas` } },
    states: {
      hover: { filter: { type: theme === "dark" ? "none" : "darken" } },
      active: { filter: { type: "none" } },
    },
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
      series={[{ name: "Vistas", data: sections.map((section) => section.count) }]}
      type="bar"
      height="100%"
    />
  );
}
