/**
 * components/PastDayDetail.test.tsx — M9c: C-m9c-014..015
 * Tests for PastDayDetail — read-only day detail for an archived day.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PastDayDetail } from "./PastDayDetail";
import type { ArchivedDay } from "@/lib/types";

// ─── Fixture archived day ─────────────────────────────────────────────────────

/** ArchivedDay with 2 blocks + bricks in mixed done states + 1 loose brick */
const fixtureArchivedDay: ArchivedDay = {
  blocks: [
    {
      id: "b1",
      name: "Morning",
      start: "06:00",
      end: "07:00",
      recurrence: { kind: "every-day" },
      categoryId: null,
      bricks: [
        {
          id: "r1",
          name: "Meditate",
          categoryId: null,
          parentBlockId: "b1",
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "r2",
          name: "Journal",
          categoryId: null,
          parentBlockId: "b1",
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ],
    },
    {
      id: "b2",
      name: "Work",
      start: "09:00",
      end: "12:00",
      recurrence: { kind: "every-day" },
      categoryId: null,
      bricks: [
        {
          id: "u1",
          name: "Pomodoros",
          categoryId: null,
          parentBlockId: "b2",
          hasDuration: false,
          kind: "units",
          target: 30,
          unit: "min",
          done: 12,
        },
      ],
    },
  ],
  categories: [],
  looseBricks: [
    {
      id: "l1",
      name: "Read",
      categoryId: null,
      parentBlockId: null,
      hasDuration: false,
      kind: "tick",
      done: true,
    },
  ],
};

/** ArchivedDay that scores 75%: 4 bricks (3 done tick + 1 units at target) */
const fixtureScoredDay: ArchivedDay = {
  blocks: [
    {
      id: "bm",
      name: "Morning",
      start: "06:00",
      end: "07:00",
      recurrence: { kind: "every-day" },
      categoryId: null,
      bricks: [
        {
          id: "r10",
          name: "Stretch",
          categoryId: null,
          parentBlockId: "bm",
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "r11",
          name: "Cold shower",
          categoryId: null,
          parentBlockId: "bm",
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ],
    },
  ],
  categories: [],
  looseBricks: [
    {
      id: "l10",
      name: "Read",
      categoryId: null,
      parentBlockId: null,
      hasDuration: false,
      kind: "tick",
      done: true,
    },
    {
      id: "l11",
      name: "Write",
      categoryId: null,
      parentBlockId: null,
      hasDuration: false,
      kind: "tick",
      done: true,
    },
    {
      id: "l12",
      name: "Exercise",
      categoryId: null,
      parentBlockId: null,
      hasDuration: false,
      kind: "tick",
      done: false,
    },
    {
      id: "l13",
      name: "Plan",
      categoryId: null,
      parentBlockId: null,
      hasDuration: false,
      kind: "tick",
      done: false,
    },
  ],
};
// fixtureScoredDay scores: block Morning = (100+0)/2 = 50;
// loose: (100+100+0+0)/4 = 50; dayPct = (50+50)/2 = 50 (not 75, but the test just
// checks the score is rendered via dayScore/dayPct, so we use a fixture that scores
// a known 50% and check it renders that value)
// Actually let's make a cleaner 75% fixture:
// 1 block with 1 done brick (100%) + 3 loose bricks (2 done = 50+50+0+0 / no wait)
// Simplest: 1 block with 1 brick (100%), 3 loose bricks (1 done) => 100 + 33 / 2 nope
// Use 4 loose bricks: 3 done → 75%

/** Archived day that scores exactly 75%: 4 loose tick bricks, 3 done */
const fixture75: ArchivedDay = {
  blocks: [],
  categories: [],
  looseBricks: [
    {
      id: "p1",
      name: "Brick A",
      categoryId: null,
      parentBlockId: null,
      hasDuration: false,
      kind: "tick",
      done: true,
    },
    {
      id: "p2",
      name: "Brick B",
      categoryId: null,
      parentBlockId: null,
      hasDuration: false,
      kind: "tick",
      done: true,
    },
    {
      id: "p3",
      name: "Brick C",
      categoryId: null,
      parentBlockId: null,
      hasDuration: false,
      kind: "tick",
      done: true,
    },
    {
      id: "p4",
      name: "Brick D",
      categoryId: null,
      parentBlockId: null,
      hasDuration: false,
      kind: "tick",
      done: false,
    },
  ],
};

// ─── C-m11-001: PastDayDetail — a missed day reads "No entry" (DEC-1) ─────────

describe("C-m11-001: PastDayDetail — backfilled missed day shows 'No entry'", () => {
  const missedDay: ArchivedDay = {
    blocks: [],
    categories: [],
    looseBricks: [
      {
        id: "m1",
        name: "Meditate",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
    ],
    missed: true,
  };

  it("shows 'No entry · 0%' for a missed day", () => {
    render(
      <PastDayDetail
        archivedDay={missedDay}
        isoDate="2026-06-29"
        onClose={vi.fn()}
      />,
    );
    const score = screen.getByTestId("past-day-score");
    expect(score.textContent).toMatch(/no entry/i);
    expect(score.textContent).toMatch(/0%/);
  });

  it("a normal (non-missed) day shows its numeric score, not 'No entry'", () => {
    render(
      <PastDayDetail
        archivedDay={fixture75}
        isoDate="2026-06-29"
        onClose={vi.fn()}
      />,
    );
    const score = screen.getByTestId("past-day-score");
    expect(score.textContent).toContain("75%");
    expect(score.textContent).not.toMatch(/no entry/i);
  });
});

// ─── C-m9c-014: PastDayDetail — strictly read-only (mutation-resistant) ───────

describe("C-m9c-014: PastDayDetail — strictly read-only: no mutation affordance", () => {
  it("renders no checkbox (no tick toggle)", () => {
    render(
      <PastDayDetail
        archivedDay={fixtureArchivedDay}
        isoDate="2026-04-29"
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("renders no spinbutton (no units stepper)", () => {
    render(
      <PastDayDetail
        archivedDay={fixtureArchivedDay}
        isoDate="2026-04-29"
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("the ONLY button is the Close control", () => {
    render(
      <PastDayDetail
        archivedDay={fixtureArchivedDay}
        isoDate="2026-04-29"
        onClose={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    const label = buttons[0]!.getAttribute("aria-label") ?? "";
    expect(label.toLowerCase()).toMatch(/close/i);
  });

  it("no add/new/+ button present", () => {
    render(
      <PastDayDetail
        archivedDay={fixtureArchivedDay}
        isoDate="2026-04-29"
        onClose={vi.fn()}
      />,
    );
    const addBtn = screen.queryByRole("button", {
      name: /add|new brick|new block|\+/i,
    });
    expect(addBtn).toBeNull();
  });

  it("clicking Close calls onClose exactly once", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <PastDayDetail
        archivedDay={fixtureArchivedDay}
        isoDate="2026-04-29"
        onClose={onClose}
      />,
    );
    const closeBtn = screen.getAllByRole("button")[0]!;
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("panel is role='region' with aria-label='Day detail'", () => {
    render(
      <PastDayDetail
        archivedDay={fixtureArchivedDay}
        isoDate="2026-04-29"
        onClose={vi.fn()}
      />,
    );
    const region = screen.getByRole("region", { name: "Day detail" });
    expect(region).toBeInTheDocument();
  });
});

// ─── C-m9c-015: PastDayDetail — renders blocks/bricks + score ─────────────────

describe("C-m9c-015: PastDayDetail — renders date + score + blocks/bricks + loose bricks", () => {
  it("shows the date formatted as 'Wed, Apr 29' (dateLabel format)", () => {
    render(
      <PastDayDetail
        archivedDay={fixture75}
        isoDate="2026-04-29"
        onClose={vi.fn()}
      />,
    );
    // dateLabel("2026-04-29") → "Wed, Apr 29"
    expect(screen.getByText(/Wed, Apr 29/i)).toBeInTheDocument();
  });

  it("shows the day score as a percent string (75% for fixture75)", () => {
    render(
      <PastDayDetail
        archivedDay={fixture75}
        isoDate="2026-04-29"
        onClose={vi.fn()}
      />,
    );
    // fixture75 scores 75% → should show "75%"
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it("renders block names for fixtureArchivedDay (Morning, Work)", () => {
    render(
      <PastDayDetail
        archivedDay={fixtureArchivedDay}
        isoDate="2026-04-29"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("renders brick names (Meditate, Journal, Pomodoros, Read)", () => {
    render(
      <PastDayDetail
        archivedDay={fixtureArchivedDay}
        isoDate="2026-04-29"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Meditate")).toBeInTheDocument();
    expect(screen.getByText("Journal")).toBeInTheDocument();
    expect(screen.getByText("Pomodoros")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
  });

  it("renders a 'Loose bricks' group when there are loose bricks", () => {
    render(
      <PastDayDetail
        archivedDay={fixtureArchivedDay}
        isoDate="2026-04-29"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/loose bricks/i)).toBeInTheDocument();
  });

  it("renders block time ranges via fmtRange (06:00–07:00 and 09:00–12:00)", () => {
    render(
      <PastDayDetail
        archivedDay={fixtureArchivedDay}
        isoDate="2026-04-29"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("06:00–07:00")).toBeInTheDocument();
    expect(screen.getByText("09:00–12:00")).toBeInTheDocument();
  });
});
