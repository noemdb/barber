const COORD = "(-?\\d+(?:\\.\\d+)?)";
const REDIRECTABLE = /maps\.app\.goo\.gl|\/share\/|\/maps\/\w+/;

function extractCoords(url: string): { lat: number; lng: number } | null {
  const at = url.match(new RegExp(`@${COORD},${COORD}`));
  if (at) return { lat: Number(at[1]), lng: Number(at[2]) };

  const q = url.match(new RegExp(`[?&](?:q|query)=${COORD},${COORD}`));
  if (q) return { lat: Number(q[1]), lng: Number(q[2]) };

  const pb = url.match(new RegExp(`!2d${COORD}!3d${COORD}`));
  if (pb) return { lat: Number(pb[2]), lng: Number(pb[1]) };

  return null;
}

function extractPlaceQuery(url: string): string | null {
  const m = url.match(/\/place\/([^/]+)/);
  if (!m) return null;
  let raw = m[1].replace(/%2B/gi, "\u0001");
  try {
    raw = decodeURIComponent(raw).replace(/\+/g, " ").replace(/\u0001/g, "+");
  } catch {
    return null;
  }
  raw = raw.replace(/\s+/g, " ").trim();
  const plusCode = raw.match(/^[0-9A-Z]{4,}\+[0-9A-Z]+/);
  if (plusCode) raw = raw.slice(plusCode[0].length).trim();
  return raw || null;
}

async function resolveRedirect(url: string): Promise<string> {
  if (!REDIRECTABLE.test(url)) return url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    return res.url || url;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}

export async function toMapsEmbedUrl(
  mapsUrl?: string | null,
  address?: string | null,
): Promise<string> {
  if (!mapsUrl) return "";
  if (/\/maps\/embed/.test(mapsUrl)) return mapsUrl;

  const resolved = await resolveRedirect(mapsUrl);
  const coords = extractCoords(resolved) ?? extractCoords(mapsUrl);
  if (coords) {
    return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=17&output=embed&t=m&iwloc=near`;
  }

  const placeQuery = extractPlaceQuery(resolved) ?? extractPlaceQuery(mapsUrl);
  const query = placeQuery || address || resolved || mapsUrl;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed&t=m&iwloc=near`;
}
