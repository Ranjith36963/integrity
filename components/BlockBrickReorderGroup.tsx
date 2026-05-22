"use client";
// BlockBrickReorderGroup — M6: wraps the expanded brick list in a Framer Motion
// Reorder.Group so bricks can be dragged to a new position within their block.
// Renders only when editMode=true AND block.bricks.length > 1.
// A single-brick block has nothing to reorder — returns null.

import { useDragControls, Reorder, useReducedMotion } from "motion/react";
import type { Block, Brick, Category } from "@/lib/types";
import { useEditMode } from "./EditModeProvider";
import { BrickChip } from "./BrickChip";

interface Props {
  block: Block;
  categories: Category[];
  /** Called with (blockId, fromIndex, toIndex) when a brick is reordered. */
  onReorderBrickInBlock: (
    blockId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  onTickToggle?: (brickId: string) => void;
  onUnitsOpenSheet?: (brickId: string) => void;
  onRequestDeleteBrick?: (brickId: string) => void;
}

// Per-item wrapper: owns a useDragControls() instance so the handle is the
// only drag origin (dragListener={false} on Reorder.Item; AC #3).
function ReorderBrickItem({
  brick,
  categories,
  onTickToggle,
  onUnitsOpenSheet,
  onRequestDeleteBrick,
}: {
  brick: Brick;
  categories: Category[];
  onTickToggle?: (brickId: string) => void;
  onUnitsOpenSheet?: (brickId: string) => void;
  onRequestDeleteBrick?: (brickId: string) => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      key={brick.id}
      value={brick}
      dragListener={false}
      dragControls={dragControls}
    >
      <BrickChip
        brick={brick}
        categories={categories}
        size="md"
        dragHandle={true}
        dragControls={dragControls}
        onTickToggle={onTickToggle}
        onUnitsOpenSheet={onUnitsOpenSheet}
        onRequestDeleteBrick={onRequestDeleteBrick}
      />
    </Reorder.Item>
  );
}

export function BlockBrickReorderGroup({
  block,
  categories,
  onReorderBrickInBlock,
  onTickToggle,
  onUnitsOpenSheet,
  onRequestDeleteBrick,
}: Props) {
  const { editMode } = useEditMode();
  const prefersReducedMotion = useReducedMotion();

  // Only render in Edit Mode with more than one brick (single-brick has nothing to reorder)
  if (!editMode || block.bricks.length <= 1) {
    return null;
  }

  function handleReorder(newBricks: Brick[]) {
    // Compute fromIndex: the first index where old and new arrays differ
    let fromIndex = -1;
    for (let i = 0; i < block.bricks.length; i++) {
      if (block.bricks[i].id !== newBricks[i].id) {
        fromIndex = i;
        break;
      }
    }
    if (fromIndex === -1) return; // no change

    // The moved brick is the one at fromIndex in the original array
    const movedId = block.bricks[fromIndex].id;
    // toIndex: the new position of the moved brick in newBricks
    const toIndex = newBricks.findIndex((b) => b.id === movedId);

    onReorderBrickInBlock(block.id, fromIndex, toIndex);
  }

  return (
    <Reorder.Group
      axis="y"
      values={block.bricks}
      onReorder={handleReorder}
      data-testid="block-brick-reorder-group"
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        marginBottom: "8px",
        // Suppress Framer's in-flight flow animation under reduced motion
        ...(prefersReducedMotion ? { transition: "none" } : {}),
      }}
    >
      {block.bricks.map((brick) => (
        <ReorderBrickItem
          key={brick.id}
          brick={brick}
          categories={categories}
          onTickToggle={onTickToggle}
          onUnitsOpenSheet={onUnitsOpenSheet}
          onRequestDeleteBrick={onRequestDeleteBrick}
        />
      ))}
    </Reorder.Group>
  );
}
