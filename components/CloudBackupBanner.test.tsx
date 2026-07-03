/**
 * components/CloudBackupBanner.test.tsx — M11 Option 3: the backup nudge.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CloudBackupBanner } from "./CloudBackupBanner";

const auth = {
  ready: true,
  email: null as string | null,
  configured: true,
  signInWithEmail: vi.fn(),
  signOut: vi.fn(),
};
vi.mock("@/lib/useSupabaseSession", () => ({
  useSupabaseSession: () => auth,
}));

beforeEach(() => {
  localStorage.clear();
  auth.email = null;
  auth.configured = true;
  auth.ready = true;
});
afterEach(cleanup);

describe("CloudBackupBanner", () => {
  it("shows when signed out + has data + not dismissed", () => {
    render(<CloudBackupBanner hasData onSignIn={vi.fn()} />);
    expect(screen.queryByTestId("cloud-backup-banner")).not.toBeNull();
  });

  it("hidden when the user has no data yet", () => {
    render(<CloudBackupBanner hasData={false} onSignIn={vi.fn()} />);
    expect(screen.queryByTestId("cloud-backup-banner")).toBeNull();
  });

  it("hidden when already signed in", () => {
    auth.email = "me@x.com";
    render(<CloudBackupBanner hasData onSignIn={vi.fn()} />);
    expect(screen.queryByTestId("cloud-backup-banner")).toBeNull();
  });

  it("hidden when cloud is not configured", () => {
    auth.configured = false;
    render(<CloudBackupBanner hasData onSignIn={vi.fn()} />);
    expect(screen.queryByTestId("cloud-backup-banner")).toBeNull();
  });

  it("'Back up' fires onSignIn", () => {
    const onSignIn = vi.fn();
    render(<CloudBackupBanner hasData onSignIn={onSignIn} />);
    fireEvent.click(screen.getByTestId("cloud-banner-signin"));
    expect(onSignIn).toHaveBeenCalled();
  });

  it("dismiss hides it and persists so it never returns", () => {
    const { unmount } = render(
      <CloudBackupBanner hasData onSignIn={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId("cloud-banner-dismiss"));
    expect(screen.queryByTestId("cloud-backup-banner")).toBeNull();
    expect(localStorage.getItem("dharma:cloud-nudge-dismissed")).toBe("1");
    unmount();
    // remount → still hidden (dismissal persisted)
    render(<CloudBackupBanner hasData onSignIn={vi.fn()} />);
    expect(screen.queryByTestId("cloud-backup-banner")).toBeNull();
  });
});
