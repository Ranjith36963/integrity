import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NowCard } from "./NowCard";
import { BLOCKS } from "@/lib/data";
import { currentBlockIndex, blockPct } from "@/lib/dharma";
import { EditModeProvider } from "./EditModeProvider";

const currentIdx = currentBlockIndex(BLOCKS, "11:47");
const currentBlock = BLOCKS[currentIdx];

function renderNowCard() {
  return render(
    <EditModeProvider>
      <NowCard block={currentBlock} onLogBrick={vi.fn()} />
    </EditModeProvider>,
  );
}

// C-bld-012: NowCard shows NOW pill, block name, time range, category, pct
describe("C-bld-012: NowCard renders required content", () => {
  it("shows NOW, block name, time range, category, and pct numeral", () => {
    renderNowCard();
    expect(screen.getByText(/NOW/i)).toBeInTheDocument();
    expect(screen.getByText("Work block")).toBeInTheDocument();
    // Time range 08:45–17:15
    expect(screen.getByText(/08:45/)).toBeInTheDocument();
    expect(screen.getByText(/17:15/)).toBeInTheDocument();
    // Category label PASSIVE
    expect(screen.getByText("PASSIVE")).toBeInTheDocument();
    // Percentage numeral
    const pct = Math.round(blockPct(currentBlock));
    expect(screen.getByText(String(pct))).toBeInTheDocument();
  });
});

// C-bld-013: NowCard outer container has now-glow; indicator has dot-pulse and ring-ping
describe("C-bld-013: NowCard has correct animation classes", () => {
  it("outer container has now-glow and indicator has dot-pulse and ring-ping", () => {
    const { container } = renderNowCard();
    const nowGlow = container.querySelector(".now-glow");
    expect(nowGlow).not.toBeNull();
    const dotPulse = container.querySelector(".dot-pulse");
    expect(dotPulse).not.toBeNull();
    const ringPing = container.querySelector(".ring-ping");
    expect(ringPing).not.toBeNull();
  });
});
