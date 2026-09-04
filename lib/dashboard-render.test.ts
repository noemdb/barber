import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BarberPerformance } from "@/components/dashboard/barber-performance";
import { PeakHoursChart } from "@/components/dashboard/peak-hours-chart";

describe("BarberPerformance", () => {
  it("renderiza cada barbero con citas, ticket y ocupación", () => {
    const html = renderToStaticMarkup(
      React.createElement(BarberPerformance, {
        currency: "USD",
        barbers: [
          { id: "b1", name: "Daniel García", citas: 11, completadas: 5, revenueCents: 7700, avgTicketCents: 1540, occupationPct: 3 },
          { id: "b2", name: "Fabiola Colmenarez", citas: 4, completadas: 0, revenueCents: 0, avgTicketCents: 0, occupationPct: 1 },
        ],
      }),
    );

    expect(html).toContain("Daniel García");
    expect(html).toContain("11 citas");
    expect(html).toContain("3% ocupación");
    expect(html).toContain("Fabiola Colmenarez");
    expect(html).toContain("4 citas");
  });

  it("muestra el placeholder cuando no hay datos", () => {
    const html = renderToStaticMarkup(React.createElement(BarberPerformance, { currency: "USD", barbers: [] }));
    expect(html).toContain("Sin citas en el periodo");
  });
});

describe("PeakHoursChart", () => {
  it("renderiza la cuadrícula día × hora con el conteo visible", () => {
    const html = renderToStaticMarkup(
      React.createElement(PeakHoursChart, {
        days: ["Lun", "Mar"],
        hours: [8, 9],
        counts: [
          [1, 0],
          [0, 2],
        ],
      }),
    );

    expect(html).toContain("Lun");
    expect(html).toContain("Mar");
    expect(html).toContain("08");
    expect(html).toContain("09");
    // tooltip de una celda con 2 citas
    expect(html).toContain("2 citas");
  });

  it("muestra el placeholder cuando no hay horarios configurados", () => {
    const html = renderToStaticMarkup(React.createElement(PeakHoursChart, { days: [], hours: [], counts: [] }));
    expect(html).toContain("Sin horarios de apertura");
  });
});
