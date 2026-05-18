"use client";
/**
 * PastDayDetail — M9c: read-only day detail for an archived day.
 * Resolves SG-m9c-04.
 *
 * Props: { archivedDay: ArchivedDay; isoDate: string; onClose: () => void }
 *
 * Strictly read-only (AC #13):
 *   - No dispatch, no reducer action
 *   - No BrickChip / TimelineBlock / AddBrickSheet / stepper / toggle
 *   - Only interactive element is Close
 *
 * Accessibility:
 *   - role="region" aria-label="Day detail"
 *   - Close button with aria-label="Close"
 *
 * Design tokens: --font-display (header), --font-ui (body), --fs-22 (header),
 *                --fs-12/--fs-14 (body text), --card / --card-edge / --ink-dim
 */

import { X } from "lucide-react";
import type { ArchivedDay, Block, Brick } from "@/lib/types";
import { dateLabel, fmtRange, brickLabel, dayPct } from "@/lib/dharma";

type PastDayDetailProps = {
  archivedDay: ArchivedDay;
  isoDate: string;
  onClose: () => void;
};

export function PastDayDetail({
  archivedDay,
  isoDate,
  onClose,
}: PastDayDetailProps) {
  // Compute score: dayPct over the ArchivedDay (blocks + looseBricks)
  const score = Math.round(
    dayPct({
      blocks: archivedDay.blocks,
      looseBricks: archivedDay.looseBricks,
      categories: archivedDay.categories,
      programStart: isoDate,
      currentDate: isoDate,
      history: {},
    }),
  );

  const formattedDate = dateLabel(isoDate);
  const hasLooseBricks = archivedDay.looseBricks.length > 0;

  return (
    <div
      role="region"
      aria-label="Day detail"
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg)",
        overflowY: "auto",
        padding: "var(--sp-12, 12px)",
        zIndex: 10,
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--sp-12, 12px)",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-22)",
              margin: 0,
              color: "var(--ink)",
            }}
          >
            {formattedDate}
          </h2>
          <p
            style={{
              fontSize: "var(--fs-14, 0.875rem)",
              color: "var(--ink-dim)",
              margin: 0,
            }}
          >
            {score}%
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ink)",
            padding: "var(--sp-8, 8px)",
            minHeight: "44px",
            minWidth: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Blocks list */}
      {archivedDay.blocks.map((block: Block) => (
        <div key={block.id} style={{ marginBottom: "var(--sp-12, 12px)" }}>
          <div
            style={{
              fontSize: "var(--fs-12)",
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: "var(--sp-4, 4px)",
            }}
          >
            {block.name}
          </div>
          <div
            style={{
              fontSize: "var(--fs-10, 0.625rem)",
              color: "var(--ink-dim)",
              marginBottom: "var(--sp-4, 4px)",
            }}
          >
            {fmtRange(block)}
          </div>
          {block.bricks.map((brick: Brick) => (
            <div
              key={brick.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "var(--fs-12)",
                color: "var(--ink)",
                padding: "2px 0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {brick.name}
              </span>
              <span
                style={{
                  color: "var(--ink-dim)",
                  marginLeft: "var(--sp-8, 8px)",
                  flexShrink: 0,
                }}
              >
                {brickLabel(brick)}
              </span>
            </div>
          ))}
        </div>
      ))}

      {/* Loose bricks */}
      {hasLooseBricks && (
        <div>
          <div
            style={{
              fontSize: "var(--fs-12)",
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: "var(--sp-4, 4px)",
            }}
          >
            Loose bricks
          </div>
          {archivedDay.looseBricks.map((brick: Brick) => (
            <div
              key={brick.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "var(--fs-12)",
                color: "var(--ink)",
                padding: "2px 0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {brick.name}
              </span>
              <span
                style={{
                  color: "var(--ink-dim)",
                  marginLeft: "var(--sp-8, 8px)",
                  flexShrink: 0,
                }}
              >
                {brickLabel(brick)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
