"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type RevenueDay = { dayKey: string; label: string; amount: number };

type RevenueChartProps = {
  days: RevenueDay[];
  currency: string;
};

export function RevenueChart({ days, currency }: RevenueChartProps) {
  const formatter = new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      fontFamily: "var(--font-manrope), sans-serif",
    },
    colors: ["#18181b"],
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: "48%",
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "#f4f4f5",
      strokeDashArray: 4,
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    xaxis: {
      categories: days.map((day) => day.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#a1a1aa", fontSize: "10px" },
      },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        formatter: (value) => formatter.format(value),
        style: { colors: "#a1a1aa", fontSize: "10px" },
      },
    },
    tooltip: {
      theme: "light",
      y: { formatter: (value) => formatter.format(value) },
    },
    states: {
      hover: { filter: { type: "lighten" } },
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
