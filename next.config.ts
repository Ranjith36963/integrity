import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable the Next.js dev toolbar so Playwright button-count tests
  // are not affected by framework-injected UI (E-m0-003).
  devIndicators: false,
};

export default nextConfig;
