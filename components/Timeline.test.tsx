import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline } from "./Timeline";
import { EditModeProvider } from "./EditModeProvider";

// C-bld-014, C-bld-015: obsolete — tests asserted against BLOCKS fixture.
// BLOCKS constant removed from lib/data.ts per wipe-demo.
// See tests.md § Migration of demo-build IDs.

// C-bld-016: empty blocks renders empty state copy and no timeline-block elements
describe("C-bld-016: Timeline renders empty state for blocks=[]", () => {
  it("shows empty state copy and no timeline-block elements", () => {
    render(
      <EditModeProvider>
        <Timeline blocks={[]} now="11:47" onLogBrick={vi.fn()} />
      </EditModeProvider>,
    );
    expect(
      screen.getByText(/No blocks yet\. Tap \+ to add your first block\./),
    ).toBeInTheDocument();
    expect(
      document.querySelectorAll("[data-testid='timeline-block']"),
    ).toHaveLength(0);
  });
});
