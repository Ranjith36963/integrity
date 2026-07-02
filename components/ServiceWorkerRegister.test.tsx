/**
 * components/ServiceWorkerRegister.test.tsx
 *
 * The component renders nothing and must be inert outside production (so it
 * never fights Next's dev HMR). In a production build with SW support it must
 * register /sw.js exactly once via workbox-window.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

// Vitest statically inlines process.env.NODE_ENV as "test", so the component's
// production-gated registration branch cannot be driven from a unit test — the
// real /sw.js registration is verified live in the Playwright offline check.
// These tests pin the always-true contract: it renders nothing and is inert
// (never touches navigator.serviceWorker) outside a production build.
const registerMock = vi.fn(() => Promise.resolve());
vi.mock("workbox-window", () => ({
  Workbox: vi.fn(function Workbox() {
    return { register: registerMock };
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ServiceWorkerRegister", () => {
  it("renders no DOM output", () => {
    const { container } = render(<ServiceWorkerRegister />);
    expect(container.innerHTML).toBe("");
  });

  it("is inert in the test build (does not touch workbox)", async () => {
    render(<ServiceWorkerRegister />);
    await Promise.resolve();
    expect(registerMock).not.toHaveBeenCalled();
  });
});
