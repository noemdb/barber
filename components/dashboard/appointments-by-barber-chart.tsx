"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "@/components/theme/theme-provider";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type BarberCount = { name: string; count: number };

type Props = {
  barbers: BarberCount[];
};

const GOLD = ["#c8a45c", "#ddc692", "#9c7c3f", "#e8d5a8", "#b8944f"];

export function AppointmentsByBarberChart({ barbers }: Props) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  if (barbers.length === 0) {
    return (
      <p className="mt-5 grid h-48 place-items-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
        Sin datos aún.
      </p>
    );
  }

  const maxCount = Math.max(...barbers.map((b) => b.count));
  const barColors = barbers.slice(0, GOLD.length).map((_, i) => GOLD[i % GOLD.length]);
  const text = dark ? "#a1a1aa" : "#52525b";
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
    colors: barColors,
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        barHeight: "58%",
        distributed: true,
        dataLabels: {
          position: "center",
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (value) => `${value}`,
      textAnchor: "middle",
      style: { fontSize: "10px", fontWeight: 700, colors: ["#ffffff"] },
      dropShadow: { enabled: false },
    },
    grid: {
      borderColor: grid,
      strokeDashArray: 4,
      padding: { top: 0, right: 12, bottom: 0, left: 8 },
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      min: 0,
      max: maxCount + 1,
      categories: barbers.map((b) => b.name),
      labels: {
        style: { colors: text, fontSize: "10px" },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: text, fontSize: "11px", fontWeight: 600 },
      },
    },
    tooltip: {
      theme,
      style: { fontSize: "11px", fontFamily: "var(--font-manrope), sans-serif" },
      y: {
        formatter: (value, opts) => {
          const name = barbers[opts?.dataPointIndex ?? 0]?.name ?? "";
          return `${value} cita${value !== 1 ? "s" : ""}${name ? ` · ${name}` : ""}`;
        },
      },
    },
    states: {
      hover: { filter: { type: "lighten" } },
      active: { filter: { type: "none" } },
    },
  };

  return (
    <Chart
      options={options}
      series={[{ name: "Citas", data: barbers.map((b) => b.count) }]}
      type="bar"
      height="100%"
    />
  );
}
