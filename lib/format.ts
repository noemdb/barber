export function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("es-VE", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
}

export function dateTime(value: Date | string) {
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function tzFormat(value: Date | string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-VE", { ...options, timeZone }).format(new Date(value));
}

export function zonedDate(value: Date | string, timeZone: string) {
  const map: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value))) {
    map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}
