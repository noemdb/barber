"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "@/components/theme/theme-provider";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type RevenueDay = { label: string; amount: number };

type RevenueChartProps = {
  days: RevenueDay[];
  currency: string;
};

export function RevenueChart({ days, currency }: RevenueChartProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const formatter = new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  const base = dark ? "#ddc692" : "#b8944f";
  const top = dark ? "#e8d5a8" : "#c8a45c";
  const bottom = dark ? "#9c7c3f" : "#8a6d35";
  const text = dark ? "#71717a" : "#a1a1aa";
  const grid = dark ? "#27272a" : "#f4f4f5";

  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      fontFamily: "var(--font-manrope), sans-serif",
      animations: { enabled: true, speed: 450 },
    },
    colors: [base],
    plotOptions: {
      bar: {
        borderRadius: 5,
        borderRadiusApplication: "end",
        columnWidth: "50%",
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        type: "vertical",
        colorStops: [
          { offset: 0, color: top, opacity: 1 },
          { offset: 100, color: bottom, opacity: 1 },
        ],
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: grid,
      strokeDashArray: 4,
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
      position: "back",
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories: days.map((day) => day.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: text, fontSize: "10px", fontWeight: 600 } },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        formatter: (value) => formatter.format(value),
        style: { colors: text, fontSize: "10px" },
      },
    },
    tooltip: {
      theme,
      style: { fontSize: "11px", fontFamily: "var(--font-manrope), sans-serif" },
      y: { formatter: (value) => formatter.format(value) },
    },
    states: {
      hover: { filter: { type: "darken", value: 0.12 } },
      active: { filter: { type: "none" } },
    },
  };

  return (
    <Chart
      options={options}
      series={[{ name: "Ingresos", data: days.map((day) => day.amount) }]}
      type="bar"
      height="100%"
    />
  );
}
