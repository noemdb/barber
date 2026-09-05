CREATE TABLE "barber_services" (
  "barberId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  CONSTRAINT "barber_services_pkey" PRIMARY KEY ("barberId", "serviceId"),
  CONSTRAINT "barber_services_barberId_fkey"
    FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "barber_services_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "barber_services_serviceId_idx" ON "barber_services"("serviceId");
