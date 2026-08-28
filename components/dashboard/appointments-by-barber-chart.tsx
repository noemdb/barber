"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "@/components/theme/theme-provider";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type BarberCount = { name: string; count: number };

type Props = {
  barbers: BarberCount[];
};

export function AppointmentsByBarberChart({ barbers }: Props) {
  const { theme } = useTheme();

  if (barbers.length === 0) {
    return <p className="mt-5 grid h-48 place-items-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">Sin datos aún.</p>;
  }

  const maxCount = Math.max(...barbers.map((b) => b.count));
  const colors = ["#c8a45c", "#ddc692", "#9c7c3f", "#e8d5a8", "#b8944f"];

  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      fontFamily: "var(--font-manrope), sans-serif",
    },
    colors: barbers.slice(0, 5).map((_, i) => colors[i % colors.length]),
    plotOptions: {
      bar: {
        borderRadius: 6,
        horizontal: true,
        barHeight: "55%",
        distributed: true,
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: theme === "dark" ? "#27272a" : "#f4f4f5",
      strokeDashArray: 4,
      padding: { top: 0, right: 12, bottom: 0, left: 8 },
    },
    xaxis: {
      min: 0,
      max: maxCount + 1,
      categories: barbers.map((b) => b.name),
      labels: {
        style: { colors: theme === "dark" ? "#71717a" : "#a1a1aa", fontSize: "10px" },
      },
    },
    yaxis: {
      labels: {
        style: { colors: theme === "dark" ? "#a1a1aa" : "#52525b", fontSize: "11px" },
      },
    },
    tooltip: {
      theme,
      y: { formatter: (value) => `${value} cita${value !== 1 ? "s" : ""}` },
    },
    states: {
      hover: { filter: { type: "none" } },
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
