# BHOS Table Tennis Portal — Current Project Status

**Last Updated:** November 22, 2026  
**Repository:** [github.com/Ali0lo/bhos-tennis](https://github.com/Ali0lo/bhos-tennis)  
**Production URL:** [www.tabletennisbhos.me](https://www.tabletennisbhos.me)  
**Active Branch:** `main`  

---

## 📌 Executive Summary

The **BHOS Table Tennis Club Management & Ranking Portal** is a full-stack Next.js 14 (App Router) application built for students, faculty, and staff at **Baku Higher Oil School (Bakı Ali Neft Məktəbi)**.

The platform combines a calibrated **0–999 ELO ranking system** (`K = 32` with set-dominance scaling), **2-player match verification + 48-hour auto-resolution**, a **live mobile courtside umpire scoreboard**, an **Open Challenges matchmaking board**, **Faculty Power Rankings**, **Group + Knockout tournament brackets**, **QR quick-match profile cards**, a **15-badge achievement engine**, and the **BHOS Arcade (Sonsuz Ralli)** mini-game with 3-layer anti-cheat protection — all backed by **Supabase PostgreSQL, Auth, RLS, RPCs, and Realtime** across 3 languages (**AZ**, **EN**, **RU**).

---

## 🏗️ Modular Architecture

### Domain Services Layer (`lib/services/`)
`lib/data/store.ts` delegates domain operations to focused modules under `lib/services/` while re-exporting public symbols cleanly:
- `lib/services/storage.ts` — LocalStorage/SessionStorage keys, TTL cache helpers, and avatar normalization.
- `lib/services/profiles.ts` — Official Foundation Cup identity resolution, Coach rating normalization, profile summary RPCs, cache invalidation, and cloud profile/role/ELO mutations.
- `lib/services/matches.ts` — Approved match filtering, `match_audit_logs` queries, cloud void/update/delete RPC wrappers, and bracket match propagation.
- `lib/services/tournaments.ts` — Bracket local cache helpers, Foundation Cup normalization, and native registration/withdrawal/participant cloud RPCs.
- `lib/services/arcade.ts` — Infinity Rally session initialization, anti-cheat score submission, leaderboard queries, and admin score deletion.
- `lib/data/mockData.ts` — Dev-gated wrapper (`process.env.NODE_ENV !== 'production' ? require('./mockData.dev') : null`) preventing large seed rosters from bloating production client bundles.

### Modular Admin Dashboard (`components/admin/`)
`app/admin/page.tsx` acts as a role-gated tab orchestrator over:
- `PlayersTab.tsx` — Verification queue, Add Member (student/staff), roster search/origin filters, inline name editor, role/president/founding toggles, manual ELO override, and 15-badge management modal.
- `MatchesTab.tsx` — Pending approvals, logged match search/limit controls, bulk deletion, Void Match + ELO rollback modal, and match editing modal.
- `TournamentsTab.tsx` — Tournament creator (`groups_and_knockout`, `single_elimination`, `round_robin`), active tournament management, and `EditTournamentModal`.
- `ArcadeModerationTab.tsx` — Infinity Rally leaderboard inspection and admin-only score deletion with badge revocation.
- `AuditLogsTab.tsx` — Chronological `public.match_audit_logs` ledger viewer for 48h auto-resolved and audited matches.

---

## 🗂️ Application Routes & Aliases

**17 Next.js App Router Routes** + **8 Azerbaijani URL Rewrites** (`next.config.mjs`):

| Canonical Route | AZ Rewrite Alias | Purpose |
| :--- | :--- | :--- |
| `/` | — | Hero spotlight, Top-3 podium, Live Results ticker, Arcade discovery card, Foundation Cup banner, Hall Rules |
| `/leaderboard` | `/reytinq` | Player ELO rankings + **Faculty Power Rankings** (`Top-5 Avg ELO`, active players, verified wins) |
| `/matches` | `/oyunlar` | Match history feed, pending queue confirmations, detailed set point formatting, `MatchDetailModal` |
| `/challenges` | `/meydan-oxu` | **Open Challenges Matchmaking Board** (open & direct challenges, Bo3/Bo5/Bo7, time presets, accept/cancel) |
| `/tournaments` | `/turnirler` | Active, upcoming, and completed club tournaments overview |
| `/tournaments/[slug]` | `/turnirler/[slug]` | Live group tables (`TournamentGroupsStage`), Olympic knockout tree (`BracketTree`), 1-click registration |
| `/players/[id]` | `/oyuncular/[id]` | Readable slug profiles, Recharts ELO graph, **What-If Simulator**, **Head-to-Head Duel + Direct Challenge**, 15 badges, **Quick Match QR Code modal** (`PNG` download) |
| `/tables` | `/masalar` | Bibiheybat campus sports hall guide (`08:00–16:40`, Tables 1–4 specs & 5 official hall rules) |
| `/minigame` | `/mini-oyun` | **BHOS Arcade: Masaüstü Ralli** (`easy`, `medium`, `hard`, `infinity`), sensitivity slider, metallic paddle skins, anti-cheat leaderboard |
| `/log-match` | — | Match registration (`?opponentId=` pre-selection from QR scans) + **Fullscreen Live Mobile Courtside Scoreboard** (`Wake Lock`, deuce & 2-serve tracker) |
| `/login` | — | Student (`*.std@bhos.edu.az`) & staff/coach authentication and signup |
| `/admin` | — | Middleware-protected President & Coach modular administration panel |
| `/api/leaderboard` | — | Cached (`30s`) JSON leaderboard standings endpoint with department filters |
| `/api/matches` | — | Cached (`15s`) confirmed match archive endpoint |
| `/api/cron/auto-resolve` | — | Edge cron endpoint requiring `CRON_SECRET` in production and `SUPABASE_SERVICE_ROLE_KEY` |

---

## 🛡️ Security, Performance & CI/CD

- **Database RLS & Role Enforcement:** Migration `050_harden_rls_and_cron.sql` restricts `public.is_admin()` strictly to `role IN ('president', 'coach')` and enforces owner/admin RLS policies on `tournament_registrations`. Migration `051_open_challenges.sql` isolates `challenges` inserts/cancels/accepts with immutability triggers.
- **Arcade Anti-Cheat:** Migration `042_arcade_anti_cheat.sql` + `046` + `049` enforce single-use `arcade_sessions`, elapsed-time lower bounds (`>= score * 0.95s`), trusted input telemetry, and strictly admin-only score deletion.
- **Cron Protection & Headers:** `/api/cron/auto-resolve` requires `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`; `next.config.mjs` serves `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Content-Security-Policy`.
- **GitHub Actions CI (`.github/workflows/deploy.yml`):** Automatically runs `npm ci`, `npx tsc --noEmit`, and `npm run build` on pushes and PRs to `main`.

---

## 🗄️ Database Migrations Summary (`supabase/migrations/`)

- `001`–`020`: Core schema (`profiles`, `matches`, `tournaments`, `table_reservations`), RLS triggers, BHOS student email constraint, auth profile sync, ELO `0` baseline floor, and local avatar cleanup.
- `021`–`031`: Knockout bracket progression (`advance_tournament_bracket`), 48h auto-resolution (`auto_resolve_stale_matches`, `match_audit_logs`), `0–999` ELO cap, admin approval flow, `leaderboard_standings` view, `get_player_profile_summary` RPC, `admin_void_match` rollback, set-dominance ELO scaling, and input sanitization hardening.
- `032`–`039`: 12–15 badge achievements engine, readable profile/tournament URL slugs, native tournament registration RPCs, November 7 `"Zəfər Günü" Foundation Kuboku` group/knockout data (`38` matches, dampened deltas), and name/ELO backfills.
- `040`–`049`: BHOS Arcade (`arcade_highscores`, `arcade_sessions`), 3-layer anti-cheat verification, custom profile `racket` column, cooldown removal, and strictly admin-only arcade moderation RPC (`delete_arcade_score`).
- `050`–`051`: Strict role-based `is_admin()` & hardened `tournament_registrations` RLS (`050`), plus Open & Direct Challenges matchmaking board (`051_open_challenges.sql`).

---

## 🛠️ Tech Stack

- **Framework:** Next.js `14.2.15` (App Router), React `18.3.1`, TypeScript `5.6.2` (`strict: true`)
- **Styling & UI:** Tailwind CSS `3.4.13`, Framer Motion `11.9.0`, Lucide React `0.446.0`
- **Data & Auth:** `@supabase/supabase-js` `2.45.4`, `@supabase/ssr` `0.5.1`, Recharts `2.12.7`, `qrcode.react` `4.2.0`
- **PWA & Localization:** Web App Manifest + Service Worker (`public/sw.js`), trilingual dictionaries (`messages/az.json`, `messages/en.json`, `messages/ru.json`)
