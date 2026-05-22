/**
 * C-m0-017: BlockCard renders name, time range, category dot, pct, and current status glow.
 * C-m0-018: BlockCard editMode shows × button; card body click does NOT call onClick.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlockCard } from "./BlockCard";

// C-m0-017
describe("C-m0-017: BlockCard content and status rendering", () => {
  it("renders name, time range, category dot, and pct", () => {
    render(
      <BlockCard
        name="Work"
        start="08:45"
        end="17:15"
        category="passive"
        status="current"
        pct={42}
      />,
    );
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("08:45–17:15")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("status='current' adds now-glow class", () => {
    render(
      <BlockCard
        name="Work"
        start="08:45"
        end="17:15"
        category="passive"
        status="current"
        pct={42}
      />,
    );
    const card = screen.getByTestId("block-card");
    expect(card.className).toContain("now-glow");
  });

  it("status='past' adds opacity-55 class", () => {
    render(
      <BlockCard
        name="Work"
        start="08:45"
        end="17:15"
        category="passive"
        status="past"
        pct={100}
      />,
    );
    const card = screen.getByTestId("block-card");
    expect(card.className).toContain("opacity-55");
  });

  it("data-status attribute matches status prop", () => {
    render(
      <BlockCard
        name="Work"
        start="08:45"
        end="17:15"
        category="passive"
        status="future"
        pct={0}
      />,
    );
    const card = screen.getByTestId("block-card");
    expect(card).toHaveAttribute("data-status", "future");
  });

  it("category dot has background color from --cat-passive for passive", () => {
    render(
      <BlockCard
        name="Work"
        start="08:45"
        end="17:15"
        category="passive"
        status="current"
        pct={42}
      />,
    );
    // The category dot span has style.background referencing the cat color
    const dot = document.querySelector('[style*="cat-passive"]') as HTMLElement;
    expect(dot).toBeTruthy();
  });
});

// C-m0-018
describe("C-m0-018: BlockCard editMode × button", () => {
  it("shows × button with aria-label='Delete block' in editMode", () => {
    render(
      <BlockCard
        name="Work"
        start="08:45"
        end="17:15"
        category="passive"
        status="current"
        pct={42}
        editMode
        onDelete={vi.fn()}
      />,
    );
    const deleteBtn = screen.getByRole("button", { name: "Delete block" });
    expect(deleteBtn).toBeInTheDocument();
  });

  it("clicking × calls onDelete, not onClick", async () => {
    const onDelete = vi.fn();
    const onClick = vi.fn();
    render(
      <BlockCard
        name="Work"
        start="08:45"
        end="17:15"
        category="passive"
        status="current"
        pct={42}
        editMode
        onDelete={onDelete}
        onClick={onClick}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete block" }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("clicking card body does NOT call onClick in editMode", async () => {
    const onClick = vi.fn();
    render(
      <BlockCard
        name="Work"
        start="08:45"
        end="17:15"
        category="passive"
        status="current"
        pct={42}
        editMode
        onClick={onClick}
      />,
    );
    const card = screen.getByTestId("block-card");
    await userEvent.click(card);
    expect(onClick).not.toHaveBeenCalled();
  });
});
