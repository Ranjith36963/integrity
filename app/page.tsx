import { BuildingClient } from "./(building)/BuildingClient";

// Server shell — mounts the interactive client. BuildingClient owns all state.
export default function BuildingPage() {
  return <BuildingClient />;
}
