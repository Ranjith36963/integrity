"use client";
/**
 * HarnessClient — client component for the design harness.
 * Contains all interactive state (modal open, stepper value, etc.)
 * for the 10 UI primitives.
 */
import React, { useState } from "react";
import {
  Button,
  Modal,
  Sheet,
  Chip,
  Input,
  Stepper,
  Toggle,
  EmptyState,
  BlockCard,
  BrickChip,
} from "@/components/ui";

export function HarnessClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [stepperVal, setStepperVal] = useState(5);
  const [togglePressed, setTogglePressed] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [chipSelected, setChipSelected] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Button ── */}
      <section>
        <h2 className="mb-3 font-mono tracking-wider text-[--fs-12] text-[--ink-dim] uppercase">
          Button
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button data-testid="button" variant="primary" size="md">
            Primary
          </Button>
          <Button variant="secondary" size="md">
            Secondary
          </Button>
          <Button variant="ghost" size="md">
            Ghost
          </Button>
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* ── Modal ── */}
      <section>
        <h2 className="mb-3 font-mono tracking-wider text-[--fs-12] text-[--ink-dim] uppercase">
          Modal
        </h2>
        <Button
          data-testid="modal-trigger"
          variant="secondary"
          onClick={() => setModalOpen(true)}
        >
          Open Modal
        </Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Modal Title"
        >
          <p className="mb-4 font-mono text-[--fs-14] text-[--ink-dim]">
            Modal body content
          </p>
          <Button variant="primary" onClick={() => setModalOpen(false)}>
            Close
          </Button>
        </Modal>
      </section>

      {/* ── Sheet ── */}
      <section>
        <h2 className="mb-3 font-mono tracking-wider text-[--fs-12] text-[--ink-dim] uppercase">
          Sheet
        </h2>
        <Button
          data-testid="sheet-trigger"
          variant="secondary"
          onClick={() => setSheetOpen(true)}
        >
          Open Sheet
        </Button>
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Sheet Title"
        >
          <p className="mb-4 font-mono text-[--fs-14] text-[--ink-dim]">
            Sheet body content
          </p>
          <Button variant="primary" onClick={() => setSheetOpen(false)}>
            Close
          </Button>
        </Sheet>
      </section>

      {/* ── Chip ── */}
      <section>
        <h2 className="mb-3 font-mono tracking-wider text-[--fs-12] text-[--ink-dim] uppercase">
          Chip
        </h2>
        <div className="flex flex-wrap gap-3">
          <Chip
            data-testid="chip"
            tone="neutral"
            selected={chipSelected}
            onClick={() => setChipSelected((s) => !s)}
          >
            Neutral
          </Chip>
          <Chip tone="category-health" selected>
            Health
          </Chip>
          <Chip tone="category-mind">Mind</Chip>
          <Chip tone="category-career" selected>
            Career
          </Chip>
          <Chip tone="category-passive">Passive</Chip>
          <Chip tone="neutral" size="sm">
            Small
          </Chip>
        </div>
      </section>

      {/* ── Input ── */}
      <section>
        <h2 className="mb-3 font-mono tracking-wider text-[--fs-12] text-[--ink-dim] uppercase">
          Input
        </h2>
        <div className="flex flex-col gap-3">
          <Input
            id="harness-input"
            type="text"
            value={inputVal}
            onChange={setInputVal}
            label="Text Input"
            placeholder="Type something"
          />
          <Input
            id="harness-input-error"
            type="text"
            value=""
            onChange={() => {}}
            label="Error State"
            error="This field is required"
          />
          <Input
            id="harness-input-number"
            type="number"
            value="3"
            onChange={() => {}}
            label="Number Input"
          />
        </div>
      </section>

      {/* ── Stepper ── */}
      <section>
        <h2 className="mb-3 font-mono tracking-wider text-[--fs-12] text-[--ink-dim] uppercase">
          Stepper
        </h2>
        {/* wrapper div provides the data-testid for e2e targeting */}
        <div data-testid="stepper">
          <Stepper
            value={stepperVal}
            min={0}
            max={20}
            onChange={setStepperVal}
            unit="reps"
          />
        </div>
      </section>

      {/* ── Toggle ── */}
      <section>
        <h2 className="mb-3 font-mono tracking-wider text-[--fs-12] text-[--ink-dim] uppercase">
          Toggle
        </h2>
        {/* wrapper div provides the data-testid for e2e targeting */}
        <div data-testid="toggle">
          <Toggle
            pressed={togglePressed}
            onPressedChange={setTogglePressed}
            label="Edit mode"
          />
        </div>
      </section>

      {/* ── EmptyState ── */}
      <section>
        <h2 className="mb-3 font-mono tracking-wider text-[--fs-12] text-[--ink-dim] uppercase">
          EmptyState
        </h2>
        <EmptyState
          message="No blocks yet. Tap + to add your first block."
          actionLabel="Add Block"
          onAction={() => {}}
        />
      </section>

      {/* ── BlockCard ── */}
      <section>
        <h2 className="mb-3 font-mono tracking-wider text-[--fs-12] text-[--ink-dim] uppercase">
          BlockCard
        </h2>
        <div className="flex flex-col gap-3">
          <BlockCard
            data-testid="block-card"
            name="Work"
            start="08:45"
            end="17:15"
            category="passive"
            status="current"
            pct={42}
          />
          <BlockCard
            name="Morning"
            start="04:00"
            end="08:45"
            category="health"
            status="past"
            pct={100}
          />
          <BlockCard
            name="Evening"
            start="17:15"
            end="22:00"
            category="mind"
            status="future"
            pct={0}
          />
        </div>
      </section>

      {/* ── BrickChip ── */}
      <section>
        <h2 className="mb-3 font-mono tracking-wider text-[--fs-12] text-[--ink-dim] uppercase">
          BrickChip
        </h2>
        <div className="flex flex-col gap-2">
          {/* wrapper div provides the data-testid for e2e targeting */}
          <div data-testid="brick-chip">
            <BrickChip
              kind="tick"
              name="meditate"
              done={false}
              onToggle={() => {}}
              category="mind"
            />
          </div>
          <BrickChip
            kind="tick"
            name="journal"
            done
            onToggle={() => {}}
            category="mind"
          />
          <BrickChip
            kind="goal"
            name="pushups"
            current={30}
            target={50}
            unit="reps"
            onCommit={() => {}}
            category="health"
          />
          <BrickChip
            kind="time"
            name="deep work"
            accumulatedSec={1800}
            targetSec={5400}
            running={false}
            onToggle={() => {}}
            category="career"
          />
        </div>
      </section>
    </div>
  );
}
