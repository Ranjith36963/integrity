/**
 * lib/shareCard.ts — render a stylized PNG of a Dharma year for sharing.
 *
 * Pure canvas API, runs entirely client-side, no server, no network.
 * Output: 1080×1920 PNG (vertical aspect ratio matches Instagram Stories,
 * X mobile, LinkedIn vertical). Color-matches the in-app blueprint
 * aesthetic so the share asset reads as part of the brand.
 *
 * Composition:
 *   - Top:    DHARMA wordmark + year
 *   - Center: italic-serif "N%" hero numeral
 *   - Below:  12-month bar grid with per-month % bar height
 *   - Bottom: "Building today, brick by brick. — dharma.app"
 *
 * Returns a Blob the caller can either:
 *   - Download via blob → object URL → a[download]
 *   - Share via navigator.share({ files: [...] }) when available
 *
 * Why canvas not html2canvas/dom-to-image: those drop fonts / shadow /
 * gradients unreliably across browsers. Native canvas is deterministic.
 */

import type { AppState } from "./types";
import { monthScore, yearScore } from "./history";

const CARD_W = 1080;
const CARD_H = 1920;

// Color palette — must mirror app/globals.css :root vars
const BG = "#07090f";
const INK = "#f5f1e8";
const INK_DIM = "rgba(245, 241, 232, 0.5)";
const ACCENT = "#fbbf24";
const SURFACE_2 = "rgba(245, 241, 232, 0.08)";

function fontStack(family: "display" | "ui"): string {
  return family === "display"
    ? '"Instrument Serif", ui-serif, Georgia, serif'
    : '"JetBrains Mono", ui-monospace, Menlo, monospace';
}

/**
 * Render the share card to a Blob (PNG).
 * Async to align with canvas.toBlob's callback shape.
 */
export async function renderShareCard(
  state: AppState,
  year: number,
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("renderShareCard requires a DOM environment");
  }

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  // ── Background ───────────────────────────────────────────────────
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Subtle radial accent at top (mirrors body grid gradient)
  const radial = ctx.createRadialGradient(
    CARD_W / 2,
    -CARD_H * 0.1,
    0,
    CARD_W / 2,
    -CARD_H * 0.1,
    CARD_H * 0.7,
  );
  radial.addColorStop(0, "rgba(245, 158, 11, 0.16)");
  radial.addColorStop(1, "rgba(245, 158, 11, 0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ── Top: DHARMA wordmark + year ───────────────────────────────────
  const padX = 80;
  const y = 140;

  // Brick icon
  const brickGrad = ctx.createLinearGradient(padX, y - 40, padX, y);
  brickGrad.addColorStop(0, ACCENT);
  brickGrad.addColorStop(1, "#b45309");
  ctx.fillStyle = brickGrad;
  roundRect(ctx, padX, y - 40, 40, 40, 6);
  ctx.fill();

  // Wordmark
  ctx.fillStyle = INK;
  ctx.font = `28px ${fontStack("ui")}`;
  ctx.textBaseline = "middle";
  // Approximate letter-spacing via individual char draw
  drawTrackedText(ctx, "DHARMA", padX + 60, y - 18, 8);

  // Year, right-aligned
  ctx.fillStyle = INK_DIM;
  ctx.font = `28px ${fontStack("ui")}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.fillText(String(year), CARD_W - padX, y - 18);
  ctx.textAlign = "left";

  // ── Hero: percent score ──────────────────────────────────────────
  const pct = yearScore(state, year);
  const heroY = 540;

  // Numeral
  ctx.fillStyle = INK;
  ctx.font = `italic 320px ${fontStack("display")}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(pct === null ? "—" : `${Math.round(pct)}%`, CARD_W / 2, heroY);

  // Label
  ctx.fillStyle = INK_DIM;
  ctx.font = `32px ${fontStack("ui")}`;
  ctx.textAlign = "center";
  drawTrackedText(ctx, `THIS YEAR`, CARD_W / 2 - 70, heroY + 60, 8);

  // ── 12-month bars ────────────────────────────────────────────────
  const monthsY = 880;
  const monthsH = 520;
  const monthGap = 16;
  const monthCols = 12;
  const monthW = (CARD_W - padX * 2 - monthGap * (monthCols - 1)) / monthCols;
  const labels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  for (let m = 0; m < 12; m++) {
    const ms = monthScore(state, year, m);
    const x = padX + m * (monthW + monthGap);

    // Background bar (always visible)
    ctx.fillStyle = SURFACE_2;
    roundRect(ctx, x, monthsY, monthW, monthsH, 8);
    ctx.fill();

    // Filled portion
    if (ms !== null && ms > 0) {
      const fillH = (ms / 100) * monthsH;
      const grad = ctx.createLinearGradient(
        x,
        monthsY + monthsH - fillH,
        x,
        monthsY + monthsH,
      );
      grad.addColorStop(0, ACCENT);
      grad.addColorStop(1, "#b45309");
      ctx.fillStyle = grad;
      roundRect(ctx, x, monthsY + monthsH - fillH, monthW, fillH, 8);
      ctx.fill();
    }

    // Letter under bar
    ctx.fillStyle = INK_DIM;
    ctx.font = `28px ${fontStack("ui")}`;
    ctx.textAlign = "center";
    ctx.fillText(labels[m]!, x + monthW / 2, monthsY + monthsH + 50);
  }

  // ── Bottom: tagline ──────────────────────────────────────────────
  ctx.fillStyle = INK;
  ctx.font = `italic 56px ${fontStack("display")}`;
  ctx.textAlign = "center";
  ctx.fillText("Brick by brick.", CARD_W / 2, CARD_H - 200);

  ctx.fillStyle = INK_DIM;
  ctx.font = `28px ${fontStack("ui")}`;
  ctx.textAlign = "center";
  drawTrackedText(
    ctx,
    "DHARMA  —  BUILD TODAY",
    CARD_W / 2 - 180,
    CARD_H - 120,
    6,
  );

  // ── Output ───────────────────────────────────────────────────────
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      "image/png",
      0.95,
    );
  });
}

/**
 * Manually space letters when CanvasRenderingContext2D doesn't support
 * letterSpacing (older Safari). x is the leftmost baseline of the first
 * character; spacing is added between glyph advances.
 */
function drawTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
): void {
  // letterSpacing IS available on most modern browsers; use it when present.
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if (typeof c.letterSpacing !== "undefined") {
    const prev = c.letterSpacing;
    c.letterSpacing = `${spacing}px`;
    ctx.textAlign = "left";
    ctx.fillText(text, x, y);
    c.letterSpacing = prev;
    return;
  }
  // Fallback: manual per-char draw
  ctx.textAlign = "left";
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
}

/**
 * Helper: stroke or fill a rounded rectangle. Caller chooses fill/stroke.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Convenience — render, then either trigger a browser download or use
 * the native share sheet on supporting devices.
 */
export async function shareOrDownload(
  state: AppState,
  year: number,
): Promise<"shared" | "downloaded" | "error"> {
  try {
    const blob = await renderShareCard(state, year);
    const filename = `dharma-${year}.png`;

    // Try Web Share API first (iOS, Android Chrome)
    const file = new File([blob], filename, { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
      await nav.share({
        files: [file],
        title: `Dharma ${year}`,
        text: `My year, brick by brick. ${year}.`,
      });
      return "shared";
    }

    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return "downloaded";
  } catch {
    return "error";
  }
}
