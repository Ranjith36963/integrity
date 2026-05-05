/**
 * components/ui/index.ts — Barrel export for all M0 UI primitives.
 * Imports from this file give access to all 10 design-system components.
 */
export { Button, buttonVariants } from "./Button";
export type { ButtonProps } from "./Button";

export { Modal } from "./Modal";
export type { ModalProps } from "./Modal";

export { Sheet } from "./Sheet";
export type { SheetProps } from "./Sheet";

export { Chip, chipVariants } from "./Chip";
export type { ChipProps, ChipTone } from "./Chip";

export { Input } from "./Input";
export type { InputProps } from "./Input";

export { Stepper } from "./Stepper";
export type { StepperProps } from "./Stepper";

export { Toggle } from "./Toggle";
export type { ToggleProps } from "./Toggle";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

export { BlockCard } from "./BlockCard";
export type { BlockCardProps } from "./BlockCard";

export { BrickChip } from "./BrickChip";
export type {
  BrickChipProps,
  TickBrickChipProps,
  GoalBrickChipProps,
  TimeBrickChipProps,
} from "./BrickChip";
