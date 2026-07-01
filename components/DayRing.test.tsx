import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DayRing } from "./DayRing";
import type { Block, Category } from "@/lib/types";

const cats: Category[] = [{ id: "c1", name: "Rest", color: "#818cf8" }];

function block(
  id: string,
  name: string,
  start: string,
  end: string | undefined,
  categoryId: string | null = "c1",
): Block {
  return {
    id,
    name,
    start,
    end,
    recurrence: { kind: "every-day" },
    categoryId,
    bricks: [],
  };
}

describe("DayRing: 24h clock-face view", () => {
  it("renders one arc per block with an end (an overnight block included)", () => {
    const { container } = render(
      <DayRing
        blocks={[
          block("b1", "Work", "09:00", "17:00"),
          block("b2", "Sleep", "22:00", "04:00"), // overnight — one arc
        ]}
        categories={cats}
        now="10:00"
        dayStart="04:00"
        pct={0}
      />,
    );
    const arcs = container.querySelectorAll('path[role="button"]');
    expect(arcs.length).toBe(2);
  });

  it("skips open-ended blocks (no end → no arc)", () => {
    const { container } = render(
      <DayRing
        blocks={[block("b1", "Open", "09:00", undefined)]}
        categories={cats}
        now="10:00"
        dayStart="04:00"
        pct={0}
      />,
    );
    expect(container.querySelectorAll('path[role="button"]').length).toBe(0);
  });

  it("shows the day percentage in the centre by default", () => {
    render(
      <DayRing
        blocks={[block("b1", "Work", "09:00", "17:00")]}
        categories={cats}
        now="10:00"
        dayStart="04:00"
        pct={42}
      />,
    );
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("renders a now-hand", () => {
    render(
      <DayRing
        blocks={[]}
        categories={cats}
        now="10:00"
        dayStart="04:00"
        pct={0}
      />,
    );
    expect(screen.getByTestId("ring-now-hand")).toBeInTheDocument();
  });

  it("tapping an arc shows the block's name + time in the centre", () => {
    const { container } = render(
      <DayRing
        blocks={[block("b1", "Deep Work", "09:00", "11:00")]}
        categories={cats}
        now="10:00"
        dayStart="04:00"
        pct={0}
      />,
    );
    const arc = container.querySelector('path[role="button"]')!;
    fireEvent.click(arc);
    const svg = screen.getByTestId("day-ring");
    expect(within(svg).getByText("Deep Work")).toBeInTheDocument();
    expect(within(svg).getByText("09:00–11:00")).toBeInTheDocument();
  });
});
