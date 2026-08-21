import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/global-config";

// Where to send scanners if a slug isn't configured (or Global Config
// is unreachable). Never dead-end a scanned QR code.
const FALLBACK_URL = "https://instafixd.com";

type RedirectEntry = {
  destination: string;
  permanent?: boolean;
};

// A store item can be entered either as a plain URL string, e.g.
//   "whatsapp": "https://wa.me/94778667795"
// or as an object with extra options, e.g.
//   "whatsapp": { "destination": "https://wa.me/94778667795", "permanent": true }
// Accept both so however it's typed into the store editor, it works.
function parseEntry(value: unknown): RedirectEntry | undefined {
  if (typeof value === "string") {
    return { destination: value };
  }
  if (
    value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).destination === "string"
  ) {
    const record = value as Record<string, unknown>;
    return {
      destination: record.destination as string,
      permanent: Boolean(record.permanent),
    };
  }
  return undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let entry: RedirectEntry | undefined;
  try {
    entry = parseEntry(await get(slug));
  } catch (error) {
    // Global Config not configured/reachable — fail safe, don't 500 on a scan.
    console.error(`Global Config lookup failed for slug "${slug}":`, error);
  }

  const destination = entry?.destination ?? FALLBACK_URL;
  const status = entry?.permanent ? 308 : 302;

  const response = NextResponse.redirect(destination, status);
  // Never let a browser or CDN cache this — the destination can change
  // at any moment (e.g. swapping a banned WhatsApp number).
  response.headers.set("Cache-Control", "no-store");
  return response;
}
