// Move data between the three phones with no backend: JSON file, or a link whose fragment carries the
// lz-string-compressed session (also rendered as a QR code).
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { ExpId, Session } from "./store";

export interface SharePayload {
  v: 1;
  exp: ExpId;
  name: string;
  data: unknown;
  at: number;
}

export function payloadOf(s: Session): SharePayload {
  return { v: 1, exp: s.exp, name: s.name, data: s.data, at: s.updated };
}

export function shareLink(s: Session): string {
  const code = compressToEncodedURIComponent(JSON.stringify(payloadOf(s)));
  return `${location.origin}${import.meta.env.BASE_URL}#/import/${code}`;
}

export function decodeShare(code: string): SharePayload | null {
  try {
    const json = decompressFromEncodedURIComponent(code);
    if (!json) return null;
    const p = JSON.parse(json);
    return p && p.v === 1 && p.exp && p.data ? p : null;
  } catch {
    return null;
  }
}

export function parseImportFile(text: string): SharePayload[] {
  const j = JSON.parse(text);
  const list = Array.isArray(j) ? j : j.sessions ? j.sessions : [j];
  return list.filter((p: SharePayload) => p && p.exp && p.data).map((p: SharePayload) => ({ v: 1, exp: p.exp, name: p.name || "Imported", data: p.data, at: p.at || Date.now() }));
}

export async function qrSvg(text: string): Promise<string | null> {
  const QR = await import("qrcode");
  try {
    return await QR.toString(text, { type: "svg", errorCorrectionLevel: "L", margin: 2 });
  } catch {
    return null; // too long for a QR code
  }
}
