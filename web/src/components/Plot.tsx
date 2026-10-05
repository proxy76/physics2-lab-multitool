// Purpose-built SVG plot (decision D3): error bars, fit lines, highlighted outliers, a residual panel,
// and report-ready export (same renderer, print palette, fixed size).
import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Plot as PlotData } from "../lib/engineTypes";

export interface Palette {
  bg: string;
  grid: string;
  gridMajor: string;
  axis: string;
  text: string;
  muted: string;
  fit: string;
  bad: string;
  series: string[];
  font: string;
}

const SCREEN: Palette = {
  bg: "transparent",
  grid: "var(--grid-minor)",
  gridMajor: "var(--grid-major)",
  axis: "var(--muted)",
  text: "var(--text)",
  muted: "var(--muted)",
  fit: "var(--fit)",
  bad: "var(--bad)",
  series: ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"],
  font: "var(--font-ui)",
};

export const PRINT: Palette = {
  bg: "#ffffff",
  grid: "#f3d9c4",
  gridMajor: "#e2a77a",
  axis: "#222222",
  text: "#111111",
  muted: "#444444",
  fit: "#111111",
  bad: "#c0261c",
  series: ["#b4530f", "#0a6f82", "#5b3fb8", "#1d7a36"],
  font: "Helvetica, Arial, sans-serif",
};

const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
const sup = (n: number) => String(n).split("").map((c) => SUP[c] ?? c).join("");

export function niceTicks(lo: number, hi: number, n = 5): number[] {
  if (!(hi > lo)) {
    const d = Math.abs(lo) || 1;
    lo -= d * 0.1;
    hi += d * 0.1;
  }
  const raw = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => (hi - lo) / s <= n + 1) ?? 10 * mag;
  const start = Math.ceil(lo / step - 1e-9) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

function exponentOf(ticks: number[]): number {
  const m = Math.max(...ticks.map((t) => Math.abs(t)));
  if (!m) return 0;
  const k = Math.floor(Math.log10(m));
  return k >= 4 || k <= -3 ? k : 0;
}

function fmtTick(v: number, k: number, step: number): string {
  const s = v / Math.pow(10, k);
  const d = Math.max(0, -Math.floor(Math.log10(step / Math.pow(10, k)) + 1e-9));
  return s.toFixed(Math.min(d, 6)).replace("-", "−");
}

interface Range {
  lo: number;
  hi: number;
}

function range(vals: number[], zero?: boolean): Range {
  const f = vals.filter((v) => Number.isFinite(v));
  let lo = Math.min(...f);
  let hi = Math.max(...f);
  if (zero) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  if (!f.length) return { lo: 0, hi: 1 };
  const pad = (hi - lo) * 0.06 || Math.abs(hi) * 0.1 || 1;
  return { lo: zero && lo === 0 ? 0 : lo - pad, hi: zero && hi === 0 ? 0 : hi + pad };
}

function axisLabel(a: { label: string; unit: string }, k: number) {
  const unit = a.unit ? (k ? `10${sup(k)} ${a.unit}` : a.unit) : k ? `×10${sup(k)}` : "";
  return unit ? `${a.label} (${unit})` : a.label;
}

export function PlotSvg({ plot, width, palette = SCREEN, selected, onSelect, residuals = true }: {
  plot: PlotData;
  width: number;
  palette?: Palette;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  residuals?: boolean;
}) {
  const P = palette;
  const mainH = Math.round(Math.max(220, Math.min(420, width * 0.62)));
  const resH = residuals && plot.residuals ? 92 : 0;
  const m = { l: 62, r: 14, t: 14, b: 46 };
  const H = mainH + (resH ? resH + 30 : 0);
  const pw = width - m.l - m.r;
  const ph = mainH - m.t - m.b;

  const xs: number[] = [];
  const ys: number[] = [];
  plot.series.forEach((s) => {
    s.x.forEach((x, i) => {
      xs.push(x);
      const e = s.yerr?.[i] ?? 0;
      ys.push(s.y[i] - e, s.y[i] + e);
    });
  });
  const xr = range(xs, plot.xZero);
  const yr = range(ys, plot.yZero);
  const xt = niceTicks(xr.lo, xr.hi, Math.max(3, Math.round(pw / 80)));
  const yt = niceTicks(yr.lo, yr.hi, Math.max(3, Math.round(ph / 55)));
  const X = (v: number) => m.l + ((v - xr.lo) / (xr.hi - xr.lo)) * pw;
  const Y = (v: number) => m.t + ph - ((v - yr.lo) / (yr.hi - yr.lo)) * ph;
  const kx = exponentOf(xt);
  const ky = exponentOf(yt);
  const stepx = xt.length > 1 ? xt[1] - xt[0] : 1;
  const stepy = yt.length > 1 ? yt[1] - yt[0] : 1;
  let pointSeries = 0;

  const resid = plot.residuals;
  const rz = resid ? resid.y : [];
  const rr = resid ? Math.max(...rz.map(Math.abs), 1e-300) * 1.25 : 1;
  const R0 = mainH + 22;
  const RY = (v: number) => R0 + resH / 2 - (v / rr) * (resH / 2 - 6);

  return (
    <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={plot.title} style={{ fontFamily: P.font, display: "block" }}
      xmlns="http://www.w3.org/2000/svg" onClick={() => onSelect?.(null)}>
      {P.bg !== "transparent" && <rect x={0} y={0} width={width} height={H} fill={P.bg} />}
      {/* millimetre grid inside the plot area */}
      <g>
        {xt.map((t) => <line key={"gx" + t} x1={X(t)} x2={X(t)} y1={m.t} y2={m.t + ph} stroke={P.gridMajor} strokeWidth={1} />)}
        {yt.map((t) => <line key={"gy" + t} y1={Y(t)} y2={Y(t)} x1={m.l} x2={m.l + pw} stroke={P.gridMajor} strokeWidth={1} />)}
        {xt.slice(0, -1).flatMap((t) => [1, 2, 3, 4].map((j) => t + (stepx * j) / 5)).map((t, i) => (
          <line key={"mx" + i} x1={X(t)} x2={X(t)} y1={m.t} y2={m.t + ph} stroke={P.grid} strokeWidth={1} />
        ))}
        {yt.slice(0, -1).flatMap((t) => [1, 2, 3, 4].map((j) => t + (stepy * j) / 5)).map((t, i) => (
          <line key={"my" + i} y1={Y(t)} y2={Y(t)} x1={m.l} x2={m.l + pw} stroke={P.grid} strokeWidth={1} />
        ))}
      </g>
      <rect x={m.l} y={m.t} width={pw} height={ph} fill="none" stroke={P.axis} strokeWidth={1} />
      {xt.map((t) => (
        <text key={"tx" + t} x={X(t)} y={m.t + ph + 16} fontSize={11} fill={P.muted} textAnchor="middle">{fmtTick(t, kx, stepx)}</text>
      ))}
      {yt.map((t) => (
        <text key={"ty" + t} x={m.l - 6} y={Y(t) + 4} fontSize={11} fill={P.muted} textAnchor="end">{fmtTick(t, ky, stepy)}</text>
      ))}
      <text x={m.l + pw / 2} y={m.t + ph + 36} fontSize={12} fill={P.text} textAnchor="middle">{axisLabel(plot.x, kx)}</text>
      <text x={14} y={m.t + ph / 2} fontSize={12} fill={P.text} textAnchor="middle" transform={`rotate(-90 14 ${m.t + ph / 2})`}>{axisLabel(plot.y, ky)}</text>
      <clipPath id={`clip-${plot.id}`}>
        <rect x={m.l} y={m.t} width={pw} height={ph} />
      </clipPath>
      <g clipPath={`url(#clip-${plot.id})`}>
        {plot.series.map((s, si) =>
          s.kind === "line" ? (
            <polyline key={si} fill="none" stroke={s.name.includes("drawn") ? P.series[2] : s.dash ? P.muted : P.fit} strokeWidth={s.dash ? 1.4 : 1.8}
              strokeDasharray={s.dash ? "6 5" : undefined} points={s.x.map((x, i) => `${X(x)},${Y(s.y[i])}`).join(" ")} />
          ) : null,
        )}
      </g>
      {plot.series.map((s, si) => {
        if (s.kind === "marker")
          return (
            <g key={si}>
              <path d={`M${X(s.x[0])},${Y(s.y[0]) - 7} l7,7 l-7,7 l-7,-7z`} fill={P.series[0]} stroke={P.text} strokeWidth={1} />
              {s.label && (
                // below-right of the marker when it sits near the top edge, so the frame never crosses it
                <text x={X(s.x[0]) + 12} y={Y(s.y[0]) - 8 < m.t + 14 ? Y(s.y[0]) + 20 : Y(s.y[0]) - 8} fontSize={11} fill={P.text}
                  stroke={P.bg === "transparent" ? "var(--bg)" : P.bg} strokeWidth={3} paintOrder="stroke" strokeLinejoin="round">{s.label}</text>
              )}
            </g>
          );
        if (s.kind !== "points") return null;
        const color = s.name === "excluded" ? P.muted : P.series[pointSeries++ % P.series.length];
        return (
          <g key={si}>
            {s.x.map((x, i) => {
              const id = s.ids?.[i];
              const hi = s.highlight?.[i];
              const e = s.yerr?.[i];
              const sel = id != null && id === selected;
              return (
                <g key={i} onClick={(ev) => { ev.stopPropagation(); onSelect?.(id ?? null); }} style={{ cursor: onSelect ? "pointer" : undefined }}>
                  {e ? <line x1={X(x)} x2={X(x)} y1={Y(s.y[i] - e)} y2={Y(s.y[i] + e)} stroke={color} strokeWidth={1.4} /> : null}
                  {e ? <line x1={X(x) - 4} x2={X(x) + 4} y1={Y(s.y[i] - e)} y2={Y(s.y[i] - e)} stroke={color} strokeWidth={1.4} /> : null}
                  {e ? <line x1={X(x) - 4} x2={X(x) + 4} y1={Y(s.y[i] + e)} y2={Y(s.y[i] + e)} stroke={color} strokeWidth={1.4} /> : null}
                  <circle cx={X(x)} cy={Y(s.y[i])} r={sel ? 6.5 : 4.5} fill={s.name === "excluded" ? "none" : color} stroke={s.name === "excluded" ? color : P.bg === "transparent" ? "var(--bg)" : P.bg} strokeWidth={1.5} />
                  {hi && <circle cx={X(x)} cy={Y(s.y[i])} r={10} fill="none" stroke={P.bad} strokeWidth={2} />}
                  <circle cx={X(x)} cy={Y(s.y[i])} r={16} fill="transparent" />
                </g>
              );
            })}
          </g>
        );
      })}
      {resid && resH > 0 && (
        <g>
          <rect x={m.l} y={R0} width={pw} height={resH} fill="none" stroke={P.axis} strokeWidth={1} />
          <line x1={m.l} x2={m.l + pw} y1={RY(0)} y2={RY(0)} stroke={P.muted} strokeDasharray="4 4" />
          <text x={m.l - 6} y={R0 + 12} fontSize={10} fill={P.muted} textAnchor="end">resid.</text>
          {resid.x.map((x, i) => {
            const bad = resid.bad ? resid.bad[i] : Math.abs(resid.z[i]) > 2.5;
            return (
              <g key={i}>
                <line x1={X(x)} x2={X(x)} y1={RY(0)} y2={RY(resid.y[i])} stroke={bad ? P.bad : P.series[0]} strokeWidth={2} />
                <circle cx={X(x)} cy={RY(resid.y[i])} r={3} fill={bad ? P.bad : P.series[0]} />
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

export function Plot({ plot, selected, onSelect }: { plot: PlotData; selected?: string | null; onSelect?: (id: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(360);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const legend = useMemo(() => plot.series.filter((s) => s.kind !== "marker"), [plot]);
  const sel = selected ? findPoint(plot, selected) : null;
  return (
    <figure className="plot">
      <figcaption className="plot-title">{plot.title}</figcaption>
      <div ref={ref} className="plot-surface">
        <PlotSvg plot={plot} width={w} selected={selected} onSelect={onSelect} />
      </div>
      {sel && (
        <p className="plot-readout num">
          {sel.label ?? sel.id}: x = {sel.x.toPrecision(5)}, y = {sel.y.toPrecision(5)}
          {sel.z != null ? `, residual ${sel.z.toFixed(2)} σ` : ""}
        </p>
      )}
      <div className="plot-foot">
        <ul className="legend">
          {legend.map((s, i) => (
            <li key={i} data-kind={s.kind} data-dash={s.dash ? "1" : undefined}>{s.name}</li>
          ))}
        </ul>
        <div className="plot-export">
          <button type="button" className="btn small ghost" onClick={() => exportPlot(plot, "svg")}>SVG</button>
          <button type="button" className="btn small ghost" onClick={() => exportPlot(plot, "png")}>PNG</button>
        </div>
      </div>
    </figure>
  );
}

function findPoint(plot: PlotData, id: string) {
  for (const s of plot.series) {
    const i = s.ids?.indexOf(id) ?? -1;
    if (i >= 0) {
      const ri = plot.residuals?.ids?.indexOf(id) ?? -1;
      return { id, x: s.x[i], y: s.y[i], label: s.labels?.[i], z: ri >= 0 ? plot.residuals!.z[ri] : null };
    }
  }
  return null;
}

export function plotSvgString(plot: PlotData, width = 900): string {
  const body = renderToStaticMarkup(<PlotSvg plot={plot} width={width} palette={PRINT} />);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body.replace("<svg", `<svg data-title="${plot.title.replace(/"/g, "'")}"`)}`;
}

export function download(name: string, data: Blob | string, type = "text/plain") {
  const blob = typeof data === "string" ? new Blob([data], { type }) : data;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function exportPlot(plot: PlotData, kind: "svg" | "png") {
  const svg = plotSvgString(plot);
  if (kind === "svg") return download(`${slug(plot.title)}.svg`, svg, "image/svg+xml");
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("render failed"));
    img.src = url;
  });
  const scale = 2;
  const c = document.createElement("canvas");
  c.width = img.width * scale;
  c.height = img.height * scale;
  const ctx = c.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  c.toBlob((b) => b && download(`${slug(plot.title)}.png`, b), "image/png");
}
