export function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("es-VE", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
}

export function dateTime(value: Date | string) {
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}
