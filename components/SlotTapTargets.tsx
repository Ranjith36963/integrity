"use client";
// SlotTapTargets — new for M2 (plan.md § Components — Empty-slot tap target):
// - 24 absolutely-positioned transparent <button> elements
// - Each HOUR_HEIGHT_PX (64px) tall — satisfies ADR-031 44px touch-target minimum
// - z-index above hour-grid (z-1), below block cards (z-2)
// - aria-label="Add block at HH:00" per button
// - onSlotTap(hour: number) fires on click where hour ∈ 0..23
// - When editMode === true, returns null (forward-compat for M5 drag conflict)

import { HOUR_HEIGHT_PX } from "@/lib/timeOffset";

interface Props {
  onSlotTap: (hour: number) => void;
  editMode?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  return String(h).padStart(2, "0") + ":00";
}

export function SlotTapTargets({ onSlotTap, editMode = false }: Props) {
  if (editMode) return null;

  return (
    <>
      {HOURS.map((hour) => (
        // R7-ROOT-M2-11: tabIndex={-1} removes the 24 invisible slot buttons
        // from the main tab order. Pre-R7 SR users hit 24 sequential "Add
        // block at HH:00" stops between page chrome and the timeline. The
        // dock + button + slot-tap (pointer) remain the primary add paths;
        // keyboard add is via the dock + → chooser route. Visible no-op
        // affordance: cursor stays default (R7-ROOT-M2-17) so empty timeline
        // doesn't suggest interactivity at every pixel.
        <button
          key={hour}
          type="button"
          tabIndex={-1}
          aria-label={`Add block at ${formatHour(hour)}`}
          onClick={() => onSlotTap(hour)}
          style={{
            position: "absolute",
            top: `${hour * HOUR_HEIGHT_PX}px`,
            left: 0,
            right: 0,
            height: `${HOUR_HEIGHT_PX}px`,
            background: "transparent",
            border: "none",
            zIndex: 1,
            padding: 0,
          }}
        />
      ))}
    </>
  );
}
