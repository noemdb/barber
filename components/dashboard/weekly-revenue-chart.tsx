"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "@/components/theme/theme-provider";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type WeeklyRevenueData = { dayKey: string; thisWeek: number; lastWeek: number };

type WeeklyRevenueChartProps = {
  weeks: WeeklyRevenueData[];
  currency: string;
};

export function WeeklyRevenueChart({ weeks, currency }: WeeklyRevenueChartProps) {
  const { theme } = useTheme();
  const formatter = new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      fontFamily: "var(--font-manrope, sans-serif)",
    },
    colors: [theme === "dark" ? "#ddc692" : "#d4a85c", "#a1a1aa"],
    stroke: { curve: "smooth", width: [2, 1] },
    fill: {
      type: "solid",
      gradient: { opacityFrom: 0.35, opacityTo: 0.05 },
    },
    markers: { size: 3, strokeWidth: 0, hover: { size: 5 } },
    dataLabels: { enabled: false },
    grid: {
      borderColor: theme === "dark" ? "#27272a" : "#f4f4f5",
      strokeDashArray: 3,
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    xaxis: {
      categories: weeks.map((w) => w.dayKey.split("-").slice(2).join("/") + "/" + w.dayKey.split("-")[1]),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: theme === "dark" ? "#71717a" : "#a1a1aa", fontSize: "10px" },
      },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true as any,
      labels: {
        formatter: (value) => formatter.format(value),
        style: { colors: theme === "dark" ? "#71717a" : "#a1a1aa", fontSize: "10px" },
      },
    },
    tooltip: {
      theme,
      shared: true,
      y: { formatter: (value) => value !== undefined ? formatter.format(value as number) : "—" },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "10px",
      fontWeight: 600,
      tooltips: { enabled: true },
      markers: { size: 8 },
      itemMargin: { horizontal: 8, vertical: 0 },
      color: theme === "dark" ? "#d4d4d8" : "#3f3f46",
    } as any,
    states: {
      hover: { filter: { type: theme === "dark" ? "none" : "darken" } },
      active: { filter: { type: "none" } },
    },
  };

  return (
    <Chart
      options={options}
      series={[
        { name: "Esta semana", data: weeks.map((w) => w.thisWeek) },
        { name: "Semana anterior", data: weeks.map((w) => w.lastWeek) },
      ]}
      type="area"
      height="100%"
    />
  );
}
