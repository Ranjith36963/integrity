import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MiniDayRing } from "./MiniDayRing";
import type { Block, Category } from "@/lib/types";

const cats: Category[] = [{ id: "c1", name: "Work", color: "#38bdf8" }];

function block(id: string, start: string, end: string | undefined): Block {
  return {
    id,
    name: id,
    start,
    end,
    recurrence: { kind: "every-day" },
    categoryId: "c1",
    bricks: [],
  };
}

describe("MiniDayRing", () => {
  it("draws one arc per block with an end (overnight included)", () => {
    const { container } = render(
      <MiniDayRing
        blocks={[block("a", "09:00", "17:00"), block("b", "22:00", "04:00")]}
        categories={cats}
        dayStart="04:00"
      />,
    );
    expect(container.querySelectorAll("path").length).toBe(2);
  });

  it("skips open-ended blocks", () => {
    const { container } = render(
      <MiniDayRing
        blocks={[block("a", "09:00", undefined)]}
        categories={cats}
        dayStart="04:00"
      />,
    );
    expect(container.querySelectorAll("path").length).toBe(0);
  });

  it("renders an empty ring (just the band) for no blocks", () => {
    const { container } = render(
      <MiniDayRing blocks={[]} categories={cats} dayStart="04:00" />,
    );
    expect(container.querySelectorAll("path").length).toBe(0);
    expect(container.querySelector("circle")).not.toBeNull();
  });

  it("dims the ring when dimmed", () => {
    const { container } = render(
      <MiniDayRing blocks={[]} categories={cats} dimmed />,
    );
    const svg = container.querySelector("svg")!;
    expect(svg.style.opacity).toBe("0.4");
  });
});
