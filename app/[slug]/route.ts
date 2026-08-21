import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/global-config";

// Where to send scanners if a slug isn't configured (or Global Config
// is unreachable). Never dead-end a scanned QR code.
const FALLBACK_URL = "https://instafixd.com";

type RedirectEntry = {
  destination: string;
  permanent?: boolean;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let entry: RedirectEntry | undefined;
  try {
    entry = await get<RedirectEntry>(slug);
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
