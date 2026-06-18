## ADR-019 — Recurrence is an enum + optional payload, not iCal RRULE

**Status:** Accepted · 2026-04-29

**Context.** The spec lists four recurrence options: just-today, every-weekday, every-day, custom range. iCal-grade RRULE is overkill for Phase 1.

**Decision.**

```ts
type Recurrence =
  | { kind: "just-today"; date: string } // ISO date
  | { kind: "every-weekday" } // Mon–Fri
  | { kind: "every-day" } // every day
  | {
      kind: "custom-range";
      from: string;
      to: string; // ISO dates inclusive
      weekdays?: number[];
    }; // 0=Sun..6=Sat; omitted = all
```

`appliesOn(recurrence, date)` is a pure function in `lib/recurrence.ts`. `currentDayBlocks(today, state)` filters templates by this rule and applies `deletions` overrides.

**Consequences.**

- "This event only / following / all" recurrence-edit semantics from the spec are deferred — Phase 1 only supports the simpler "just today / all recurrences" delete prompt.
- If we ever need RRULE (alarms, calendar export), introduce it as ADR-NNN superseding this. Today, simpler is better.

---
