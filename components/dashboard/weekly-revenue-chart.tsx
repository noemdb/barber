"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "@/components/theme/theme-provider";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type PeriodPoint = { label: string; current: number; previous: number };

type WeeklyRevenueChartProps = {
  weeks: PeriodPoint[];
  currency: string;
};

export function WeeklyRevenueChart({ weeks, currency }: WeeklyRevenueChartProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const formatter = new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  const primary = dark ? "#ddc692" : "#b8944f";
  const secondary = dark ? "#52525b" : "#a1a1aa";
  const text = dark ? "#71717a" : "#a1a1aa";
  const legendText = dark ? "#d4d4d8" : "#3f3f46";
  const grid = dark ? "#27272a" : "#f4f4f5";

  const categories = weeks.map((w) => w.label);

  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      fontFamily: "var(--font-manrope, sans-serif)",
      animations: { enabled: true, speed: 450 },
    },
    colors: [primary, secondary],
    stroke: {
      curve: "smooth",
      width: [2.5, 1.5],
      lineCap: "round",
      dashArray: [0, 3],
    },
    fill: {
      type: "gradient",
      gradient: {
        type: "vertical",
        shadeIntensity: 0.25,
        opacityFrom: 0.32,
        opacityTo: 0.02,
        gradientToColors: [primary, secondary],
      },
    },
    markers: {
      size: 0,
      strokeWidth: 0,
      hover: { size: 5, sizeOffset: 0 },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: grid,
      strokeDashArray: 3,
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
      position: "back",
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories,
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
      shared: true,
      intersect: false,
      style: { fontSize: "11px", fontFamily: "var(--font-manrope), sans-serif" },
      y: {
        formatter: (value) =>
          value !== undefined && value !== null ? formatter.format(value as number) : "—",
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "10px",
      fontWeight: 600,
      markers: { size: 6, shape: "circle" },
      itemMargin: { horizontal: 8, vertical: 0 },
      labels: { colors: legendText },
    },
    states: {
      hover: { filter: { type: "none" } },
      active: { filter: { type: "none" } },
    },
  };

  return (
    <Chart
      options={options}
      series={[
        { name: "Periodo actual", data: weeks.map((w) => w.current) },
        { name: "Periodo anterior", data: weeks.map((w) => w.previous) },
      ]}
      type="area"
      height="100%"
    />
  );
}
