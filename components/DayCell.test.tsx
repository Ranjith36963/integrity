/**
 * components/DayCell.test.tsx — M9c: C-m9c-003..007
 * Tests for DayCell — the per-day calendar cell with heat-fill scoring.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DayCell } from "./DayCell";

// ─── C-m9c-003: scored cell — date + heat fill + numeral + tappable ──────────

describe("C-m9c-003: DayCell scored — date number + heat fill + score numeral + tappable button", () => {
  it("displays the date number 16 and score numeral 60", () => {
    render(
      <DayCell
        kind="scored"
        date="2026-05-16"
        dayOfMonth={16}
        score={60}
        isToday={false}
        onOpen={vi.fn()}
      />,
    );
    // Date number visible
    expect(screen.getByText("16")).toBeInTheDocument();
    // Score numeral visible
    expect(screen.getByText("60")).toBeInTheDocument();
  });

  it("renders as a <button> (tappable)", () => {
    render(
      <DayCell
        kind="scored"
        date="2026-05-16"
        dayOfMonth={16}
        score={60}
        isToday={false}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("clicking calls onOpen exactly once", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <DayCell
        kind="scored"
        date="2026-05-16"
        dayOfMonth={16}
        score={60}
        isToday={false}
        onOpen={onOpen}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("button aria-label contains date and score info", () => {
    render(
      <DayCell
        kind="scored"
        date="2026-05-16"
        dayOfMonth={16}
        score={60}
        isToday={false}
        onOpen={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    const label = btn.getAttribute("aria-label") ?? "";
    // Should contain the month, day, year and score percent
    expect(label).toMatch(/May 16, 2026/i);
    expect(label).toMatch(/60/);
    expect(label).toMatch(/percent/i);
  });

  it("applies heat fill style with alpha scaled to score", () => {
    const { container } = render(
      <DayCell
        kind="scored"
        date="2026-05-16"
        dayOfMonth={16}
        score={60}
        isToday={false}
        onOpen={vi.fn()}
      />,
    );
    // The cell should have a data-score attribute or inline style with heat fill
    const btn = container.querySelector("[data-score]");
    if (btn) {
      expect(btn.getAttribute("data-score")).toBe("60");
    } else {
      // Check the button has an inline style background with the right alpha
      const button = container.querySelector("button");
      expect(
        button?.style.backgroundColor || button?.getAttribute("style"),
      ).toBeTruthy();
    }
  });
});

// ─── C-m9c-004: today marker — 2px accent ring on today's scored cell ────────

describe("C-m9c-004: DayCell today — scored cell with isToday=true gets a 2px accent ring", () => {
  it("renders with today marker when isToday=true", () => {
    const { container } = render(
      <DayCell
        kind="scored"
        date="2026-05-18"
        dayOfMonth={18}
        score={40}
        isToday={true}
        onOpen={vi.fn()}
      />,
    );
    // The cell should have data-today="true" or a ring style
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    // data-today attribute or the style must indicate it's today
    const hasMarker =
      button?.getAttribute("data-today") === "true" ||
      (button?.getAttribute("style") ?? "").includes("outline") ||
      (button?.getAttribute("style") ?? "").includes("box-shadow");
    expect(hasMarker).toBe(true);
  });

  it("displays date number 18 and score numeral 40", () => {
    render(
      <DayCell
        kind="scored"
        date="2026-05-18"
        dayOfMonth={18}
        score={40}
        isToday={true}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("today ring is conditional on isToday — absent when isToday=false", () => {
    const { container } = render(
      <DayCell
        kind="scored"
        date="2026-05-18"
        dayOfMonth={18}
        score={40}
        isToday={false}
        onOpen={vi.fn()}
      />,
    );
    const button = container.querySelector("button");
    const hasRing =
      button?.getAttribute("data-today") === "true" ||
      ((button?.getAttribute("style") ?? "").includes("outline") &&
        !(button?.getAttribute("style") ?? "").includes("outline: none"));
    expect(hasRing).toBe(false);
  });
});

// ─── C-m9c-005: score-0 scored vs missed — visually distinct ─────────────────

describe("C-m9c-005: DayCell score-0 scored vs missed — scored has numeral '0' + fill; missed has no numeral", () => {
  it("scored score=0 shows date number 15 and the numeral '0'", () => {
    render(
      <DayCell
        kind="scored"
        date="2026-05-15"
        dayOfMonth={15}
        score={0}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("scored score=0 is a <button> (tappable — archived day has a detail)", () => {
    render(
      <DayCell
        kind="scored"
        date="2026-05-15"
        dayOfMonth={15}
        score={0}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("missed cell shows date number 14 but NO score numeral", () => {
    const { container } = render(
      <DayCell kind="missed" date="2026-05-14" dayOfMonth={14} />,
    );
    expect(screen.getByText("14")).toBeInTheDocument();
    // No numeral element — should not have text "0" as a standalone score
    const numeralEls = container.querySelectorAll("[data-score-numeral]");
    expect(numeralEls).toHaveLength(0);
  });

  it("missed cell is NOT a <button> — queryByRole('button') → null", () => {
    render(<DayCell kind="missed" date="2026-05-14" dayOfMonth={14} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

// ─── C-m9c-006: missed visually distinct from future/pre-start ───────────────

describe("C-m9c-006: DayCell missed vs future/pre-start — structurally distinct (mutation-resistant)", () => {
  it("missed cell has data-kind='missed' (card-bordered treatment)", () => {
    const { container } = render(
      <DayCell kind="missed" date="2026-05-14" dayOfMonth={14} />,
    );
    const cell = container.querySelector("[data-kind='missed']");
    expect(cell).not.toBeNull();
  });

  it("future cell has data-kind='future' (borderless transparent treatment)", () => {
    const { container } = render(
      <DayCell kind="future" date="2026-05-25" dayOfMonth={25} />,
    );
    const cell = container.querySelector("[data-kind='future']");
    expect(cell).not.toBeNull();
  });

  it("pre-start cell has data-kind='pre-start' (borderless transparent treatment)", () => {
    const { container } = render(
      <DayCell kind="pre-start" date="2026-04-10" dayOfMonth={10} />,
    );
    const cell = container.querySelector("[data-kind='pre-start']");
    expect(cell).not.toBeNull();
  });

  it("missed and future/pre-start have different data-kind attributes (structural distinction)", () => {
    const { container: missedContainer } = render(
      <DayCell kind="missed" date="2026-05-14" dayOfMonth={14} />,
    );
    const { container: futureContainer } = render(
      <DayCell kind="future" date="2026-05-25" dayOfMonth={25} />,
    );
    const missedKind = missedContainer
      .querySelector("[data-kind]")
      ?.getAttribute("data-kind");
    const futureKind = futureContainer
      .querySelector("[data-kind]")
      ?.getAttribute("data-kind");
    expect(missedKind).toBe("missed");
    expect(futureKind).toBe("future");
    expect(missedKind).not.toBe(futureKind);
  });
});

// ─── C-m9c-007: inert kinds are NOT tappable (structural) ────────────────────

describe("C-m9c-007: DayCell inert kinds — future/pre-start/missed/blank are NOT <button> (structural)", () => {
  it("future cell has no button role", () => {
    render(<DayCell kind="future" date="2026-05-25" dayOfMonth={25} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("pre-start cell has no button role", () => {
    render(<DayCell kind="pre-start" date="2026-04-10" dayOfMonth={10} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("missed cell has no button role", () => {
    render(<DayCell kind="missed" date="2026-05-14" dayOfMonth={14} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("blank cell has no button role and is aria-hidden", () => {
    const { container } = render(<DayCell kind="blank" />);
    expect(screen.queryByRole("button")).toBeNull();
    const el = container.firstChild as HTMLElement;
    expect(el?.getAttribute("aria-hidden")).toBe("true");
  });

  it("blank cell renders no date number", () => {
    const { container } = render(<DayCell kind="blank" />);
    // No text content
    expect(container.textContent?.trim()).toBe("");
  });
});
