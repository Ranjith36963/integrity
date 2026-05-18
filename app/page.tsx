import { AppShell } from "./(building)/AppShell";

// Server shell — mounts the interactive client. AppShell owns all state.
// M9c: replaced BuildingClient with AppShell (SG-m9c-01 — single usePersistedState).
export default function BuildingPage() {
  return <AppShell />;
}
