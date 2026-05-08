"use client";
// LooseBricksTray — NEW in M3 (plan.md § Components — <LooseBricksTray>).
// Pinned above dock. Visible iff caller mounts it (caller checks blocks.length > 0 || looseBricks.length > 0).
// Collapsed chip-row default (max-height 56px). Chevron expands to vertical list.
// Always shows + Brick pill in trailing position (collapsed) or top (expanded).
// Accessibility: role="region" aria-label="Loose bricks" aria-expanded + aria-controls.
// Haptics: chevron light, + Brick pill light.

import { useState, useId } from "react";
import { ChevronUp, ChevronDown, Plus } from "lucide-react";
import type { Brick, Category } from "@/lib/types";
import { BrickChip } from "./BrickChip";
import { haptics } from "@/lib/haptics";

interface Props {
  looseBricks: Brick[];
  categories: Category[];
  onAddBrick: () => void;
}

export function LooseBricksTray({
  looseBricks,
  categories,
  onAddBrick,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  function toggleExpanded() {
    haptics.light();
    setExpanded((e) => !e);
  }

  function handleAddBrick() {
    haptics.light();
    onAddBrick();
  }

  return (
    <section
      role="region"
      aria-label="Loose bricks"
      aria-expanded={expanded}
      style={{
        position: "relative",
        padding: "0 20px",
        paddingBottom: "8px",
      }}
    >
      {/* Chevron toggle — top-right */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "4px",
        }}
      >
        <button
          type="button"
          aria-label={
            expanded ? "Collapse loose bricks" : "Expand loose bricks"
          }
          aria-controls={listId}
          aria-expanded={expanded}
          onClick={toggleExpanded}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "44px",
            minHeight: "44px",
            padding: "0 8px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-dim)",
          }}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {expanded ? (
        // Expanded view: + Brick button at top, then vertical list
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            type="button"
            aria-label="Add loose brick"
            onClick={handleAddBrick}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              width: "100%",
              minHeight: "44px",
              borderRadius: "8px",
              border: "1px dashed var(--ink-dim)",
              background: "transparent",
              color: "var(--ink-dim)",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-14)",
            }}
          >
            <Plus size={16} />
            Add Brick
          </button>

          <ul
            id={listId}
            role="list"
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {looseBricks.map((brick) => (
              <li key={brick.id} role="listitem">
                <BrickChip brick={brick} categories={categories} size="md" />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        // Collapsed view: horizontal scroll row with sm chips + trailing + Brick pill
        <div
          id={listId}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflowX: "auto",
            maxHeight: "56px",
            paddingBottom: "4px",
          }}
        >
          {looseBricks.map((brick) => (
            <div key={brick.id} style={{ flexShrink: 0, maxWidth: "180px" }}>
              <BrickChip brick={brick} categories={categories} size="sm" />
            </div>
          ))}

          {/* + Brick pill — always last, always visible */}
          <button
            type="button"
            aria-label="Add loose brick"
            data-testid="add-loose-brick-pill"
            onClick={handleAddBrick}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              flexShrink: 0,
              minHeight: "44px",
              minWidth: "80px",
              padding: "0 12px",
              borderRadius: "9999px",
              border: "1px solid var(--ink-dim)",
              background: "transparent",
              color: "var(--ink-dim)",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-12)",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={12} />
            Brick
          </button>
        </div>
      )}
    </section>
  );
}
