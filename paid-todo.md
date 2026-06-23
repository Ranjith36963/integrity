# Paid TODO — items that need money or an external account from you

> Everything Claude can't do without your dollar/credit-card/identity goes here.
> Use this as a checklist when you're ready to start the "go to market" phase.
> Costs are 2026 USD; verify before purchasing.

---

## 1. App Store distribution (required to ship to iPhones)

### Apple Developer Program

- **Cost:** $99/year (individual) or $299/year (organization)
- **Where:** https://developer.apple.com/programs/enroll/
- **Why:** Required to upload any app to the App Store, even free apps. Required to use TestFlight for beta testing. Required to use Apple Push Notification service.
- **Who pays:** You. Apple invoices annually; auto-renews.
- **Once you have it, I can:** Run `npx cap add ios` and produce a signed `.ipa` ready for upload. Already prepped in `capacitor.config.ts` (appId: `app.dharma`).
- **Verification needed:** Apple wallet-tests your identity via 2FA + ID upload (~24–48hrs).

### Google Play Console

- **Cost:** $25 one-time
- **Where:** https://play.google.com/console/signup
- **Why:** Required to publish any app to the Play Store.
- **Who pays:** You. Single payment, no renewal.
- **Once you have it, I can:** Run `npx cap add android` and produce a signed AAB ready for upload.
- **Additional 2024+ requirement:** Google now mandates a **14-day closed test with 12+ testers** before production. Plan for 2–3 weeks of slack.

### Combined: ~$124 one-time + $99/year. This is the floor for native distribution.

---

## 2. Paid feature billing rails (only if you charge users)

### Apple In-App Purchase fees

- **Cost:** 30% commission on subscriptions year 1; **15% year 2+**. 15% flat if you enroll in the [Small Business Program](https://developer.apple.com/app-store/small-business-program/) (revenue <$1M/year).
- **Where:** Auto-configured in App Store Connect; no separate signup.
- **Who pays:** Apple takes the cut at checkout. You see 70¢ (or 85¢) of every $1.
- **Important:** Apple does NOT allow external billing links for digital goods. Stripe/Lemonsqueezy/Paddle are off the table for iOS subscriptions.

### Google Play in-app billing

- **Cost:** Same structure — 30% year 1, 15% year 2+, or **15% flat** if revenue <$1M.
- **Where:** Configured in Play Console.
- **Same restriction:** No external billing for digital goods on Android (though Google's enforcement is laxer than Apple's).

### Stripe (only if web-only / non-IAP routes)

- **Cost:** 2.9% + $0.30 per transaction.
- **Where:** https://stripe.com
- **Useful for:** Selling the **web app** at dharma.app with a Pro tier. App Store/Play Store users would NOT see this — they must use IAP.
- **Note:** A dual-pricing model (web cheaper than IAP) is common; doc it explicitly so App Store reviewers don't flag.

---

## 3. Domain + email (brand)

### Domain — `dharma.app`

- **Cost:** `.app` domains are ~$15/year via Cloudflare, Namecheap, or Porkbun. Google Domains shut down 2023.
- **Where:** https://www.cloudflare.com/products/registrar/ (recommended — at-cost pricing, no markup)
- **Note:** `.app` requires HTTPS (Google enforces HSTS at the TLD level). Vercel handles this automatically; no extra work.
- **Status check:** `dharma.app` is currently owned by someone else (squatter). Backup candidates: `usedharma.app`, `tryDHARMA.com`, `dharma-app.com`, `getdharma.app`.

### Email at the domain

- **Free option:** Cloudflare Email Routing — receive at `you@dharma.app`, send via existing Gmail. $0.
- **Paid option:** Google Workspace $6/user/month. Useful only if you want to send FROM `you@dharma.app` directly.

---

## 4. Cloud sync infrastructure (required for the $5/mo SaaS tier)

### Supabase (recommended)

- **Cost:** **Free tier covers MVP** (500MB DB, 1GB storage, 50K monthly active users, 2GB egress). Pro tier is $25/mo when you outgrow free.
- **Where:** https://supabase.com
- **Why:** Postgres + auth + row-level security + realtime — enough for Dharma's sync needs.
- **Once you have it, I can:** Build the auth + sync layer entirely. Adds ~3 days of work on my side.
- **Alternative:** Firebase (Google) — also free tier, but vendor lock-in is heavier.

### Vercel (you already have this)

- **Current cost:** $0 (hobby tier is generous).
- **When it costs:** Pro tier $20/mo per seat, only needed if you exceed 100GB bandwidth/month or want custom analytics.

---

## 5. App-store launch assets

### App icon

- **DIY:** $0. Tools like [AppIcon.co](https://appicon.co) generate every required size from one master.
- **Hired:** $50–500 on Fiverr/Upwork for a designed icon.
- **Status:** No icon set exists yet. The DHARMA wordmark + amber-brick gradient is a starting point.

### Screenshots

- **DIY:** $0. Use real device screenshots — what the lifecycle test already captures could be the starting point.
- **Hired:** $20–100 for stylized "marketing screenshots" with overlay text.
- **Required per platform:**
  - iOS: 6.5" + 6.7" iPhone (3 minimum, 10 max)
  - Android: phone + 7" + 10" tablet sizes

### App Preview video

- **Optional but doubles install rate.**
- **DIY:** $0 — record on a real device.
- **Hired:** $200–2000 depending on production value.

---

## 6. Legal (one-time)

### Privacy Policy

- **Cost:** $0 (DIY with a template) to $30/mo (Termly / iubenda for managed compliance).
- **Required because:** Both App Store and Play Store demand a privacy policy URL even when you collect zero data.
- **What it says for Dharma today:** "We collect no data. Everything is stored on your device. You can export and delete at any time."
- **Recommended:** Use Termly's free tier; lawyer review only if you launch in EU at scale.

### Terms of Service

- **Cost:** $0 with template, $200–500 for an attorney to customize.
- **Required:** Only if you accept payments (i.e., once you have a paid tier).

### Data Protection

- **GDPR / CCPA exposure:** Currently zero (no server, no data collection). Once you add cloud sync, you need a DPA with Supabase (Supabase offers it free in their dashboard).

---

## 7. Optional: paid services that move the needle

### Analytics

- **Free options:** PostHog Cloud (1M events/month free), Plausible self-hosted ($0), Mixpanel free tier (100K MAU)
- **Paid options:** Plausible Cloud $9/mo, Mixpanel Growth from $25/mo
- **My recommendation:** PostHog Cloud free — covers funnels, retention, sessions, A/B tests in one tool.

### Crash reporting

- **Sentry:** Free tier 5K errors/month, then $26/mo
- **Bugsnag:** Free tier 7.5K events/month
- **Already-included:** Firebase Crashlytics is free with Firebase, no separate signup.

### Customer support / feedback

- **DIY:** GitHub Issues, free.
- **Tally** ($0 with branding) or **Userback** ($29/mo) for in-app feedback widgets.

### Push notification server

- **Apple Push Notification service (APNs):** Free, included with developer account.
- **Firebase Cloud Messaging (FCM):** Free, no limit.
- **Server-side scheduler:** Vercel Cron free, or Cloudflare Workers free, or Supabase Edge Functions free. **No paid service required for "remind me at 9am" pings.**

---

## 8. Marketing / discovery (if/when you want growth)

### Product Hunt launch

- **Cost:** $0.
- **Effort:** ~1 week prep (graphics, copy, hunter outreach).
- **Returns:** A successful PH launch can drive 5K–50K first-week visits.

### App Store Search Ads

- **Cost:** Pay-per-tap, ~$0.50–$3.00/install in productivity category.
- **Where:** https://searchads.apple.com
- **My take:** Don't spend a dollar here until you have at least 100 organic installs and know your retention curve.

### Influencer / community seeding

- **Cost:** $0–500 per micro-influencer (Twitter/X productivity space).
- **Targets:** Productivity Twitter accounts, r/getdisciplined, Hacker News (Show HN).

---

## Bottom line — minimum spend to ship to production

| Item                               | Cost                                | Required?                    |
| ---------------------------------- | ----------------------------------- | ---------------------------- |
| Apple Developer Program            | $99/yr                              | YES for iOS                  |
| Google Play Console                | $25 one-time                        | YES for Android              |
| Domain (`*.app`)                   | ~$15/yr                             | YES                          |
| Privacy policy hosting             | $0 (Termly free)                    | YES                          |
| App icons + screenshots (DIY)      | $0                                  | YES                          |
| Cloud sync (Supabase free)         | $0                                  | NO — only for paid sync tier |
| **Total to launch on both stores** | **~$139 year-one, $114/year after** |                              |

**Everything else is optional and waits until you have actual paying users.**

---

_Last updated: 2026-06-22 by Claude. Re-verify pricing before committing._
