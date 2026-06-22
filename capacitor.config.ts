import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for shipping Dharma as a native iOS / Android app.
 *
 * Workflow (one-time, on a machine with Xcode + Android Studio):
 *   1. CAPACITOR_BUILD=true npm run build      # static export to ./out
 *   2. npx cap add ios && npx cap add android   # creates native projects
 *   3. npx cap sync                             # copies web build into them
 *   4. npx cap open ios  → Xcode               # archive + upload to App Store
 *   5. npx cap open android → Android Studio   # build AAB → Play Console
 *
 * appId — once chosen, never change. Apple keys provisioning profiles by
 * bundle id; Google ties the Play listing to the package name.
 *
 * webDir — must match the Next.js static export output. We pin it to
 * "out" which is Next's default for `output: "export"`.
 */
const config: CapacitorConfig = {
  appId: "app.dharma",
  appName: "Dharma",
  webDir: "out",
  // Server config: when the bundled web build lives entirely in `webDir`
  // we don't need a remote server URL. Leaving this out means Capacitor
  // serves from capacitor://localhost (iOS) / https://localhost (Android),
  // which is the only mode that works offline + with localStorage.
  ios: {
    // The web view tints the status bar to match the page theme color.
    // Dharma's --bg is #07090f; the meta theme-color tag in
    // app/layout.tsx already declares this so iOS picks it up.
    contentInset: "always",
  },
  android: {
    // Hardware back-button: when a sheet/modal is open, handle it via
    // window history; when at the root view, exit. CapacitorApp.exitApp()
    // is called by the App plugin's backButton handler (wired in app code).
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // Show for 600ms then fade — matches our welcome-brick-fall pacing
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: "#07090f",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      // Dark blueprint background → light icons everywhere
      style: "DARK",
      backgroundColor: "#07090f",
    },
  },
};

export default config;
