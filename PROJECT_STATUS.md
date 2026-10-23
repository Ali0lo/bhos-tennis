# BHOS Table Tennis Portal — Current Project Status

**Last Updated:** October 23, 2026  
**Repository:** [github.com/Ali0lo/bhos-tennis](https://github.com/Ali0lo/bhos-tennis)  
**Active Branch:** `main`  
**Current Commit:** `2f8349e` ("feat: add interactive What-If pre-match ELO simulator on athlete profiles")

---

## 📌 Executive Summary

The **BHOS Table Tennis Club Management & Ranking Portal** is a production-ready Next.js 14 web application designed for students, faculty, and athletes at **Baku Higher Oil School (Bakı Ali Neft Məktəbi)**.

The project features a sleek **obsidian dark sports UI** (`#080D16`), an **ITTF-compliant ELO ranking engine** with an interactive **"What-If" Pre-Match ELO Simulator**, **dynamic knockout tournament bracket progression**, an **uncontested 48-hour pending match auto-resolution engine**, a **sports hall table booking system**, **match verification queues**, **profile customization**, and **seamless responsive support** across Desktop, Tablet, and Mobile devices.

---

## 🎨 Current UI & Visual Design Situation

The interface follows a minimalist dark sports aesthetic inspired by modern tournament portals and Framer design specifications:

- **Color Palette:**
  - Background: `#080D16` (Deep obsidian dark)
  - Card Surfaces: `#0F1623` (Dark navy container cards)
  - Row Surfaces: `#131C2B` (Elevated pill rows with subtle border `rgba(255, 255, 255, 0.06)`)
  - Accent Colors:
    - **Electric Royal Blue (`#3B82F6`):** Section numbers (`01`, `02`, `03`, `04`), primary CTA buttons, table numbers, live ready-to-play bracket node glow, and What-If win probability bars.
    - **Warm Gold (`#EAB308`):** #1 spot badges, leader ELO points (`9999 PTS`), Table 1 indicator, Finalist bracket border.
    - **Emerald Green (`#22C55E`):** WhatsApp community buttons, confirmed status, win badges, and projected ELO gain indicators.

- **Responsive Breakpoint Layouts:**
  - **Desktop (`lg`):** Full 12-column asymmetric hero, 6-column leaderboard table, 2x2 table grid, and side-by-side tournament championship + bracket view.
  - **Tablet (`md`):** Centered brand top header, navigation row with language toggle and WhatsApp CTA, streamlined leaderboard rows, and adaptive grid columns.
  - **Phone (`sm` / `< md`):** Clean stacked navigation, simplified `Rank + Name + Points` leaderboard rows, touch-friendly tap targets, and 1-column responsive cards.

- **Animations & Micro-Interactions:**
  - Reusable Framer Motion scroll-reveal wrapper (`components/SmoothReveal.tsx`) using custom cubic-bezier easing `[0.22, 1, 0.36, 1]`.
  - Spring-driven number counters and animated win-probability bars in `components/WhatIfSimulator.tsx`.
  - Pulse micro-animations on newly advanced knockout bracket slots in `components/BracketTree.tsx`.
  - Staggered entrance animations on leaderboard rows, smooth hover elevation, and native smooth scrolling (`app/globals.css`).

---

## 👥 Player Roster & ELO Points State

The portal operates on an official ELO system ($K = 32$) with a **0-point floor constraint**:
- **Coach İftixar Məhərrəmov** holds the benchmark honorary rating of **9,999 ELO**.
- **All other athletes** start with a **0 ELO baseline** until official matches are played and confirmed.
- Minimum ELO check constraint: `chk_profiles_min_elo CHECK (current_elo >= 0)`.

### Seed Roster (9 Default Members):

| # | Player Name | Email | Role | Faculty / Department | Starting ELO | Origin |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| 1 | **İftixar Məhərrəmov** | `iftixar.coach@gmail.com` | Coach | İdman Klubu (Staff) | **9,999** | İlkin Heyət |
| 2 | **Ali Iskandarli** | `ali.iskandarli.std@bhos.edu.az` | President | Computer Engineering | **0** | İlkin Heyət |
| 3 | **Ali Abdulov** | `ali.abdulov.std@bhos.edu.az` | Player | Computer Engineering | **0** | İlkin Heyət |
| 4 | **Ali Aghayev** | `ali.aghayev.std@bhos.edu.az` | Player | Process Automation | **0** | İlkin Heyət |
| 5 | **Huseyn Muradzada** | `huseyn.muradzade.std@bhos.edu.az` | Player | Computer Engineering | **0** | İlkin Heyət |
| 6 | **Fateh Mammadli** | `fateh.mammadli.std@bhos.edu.az` | Player | Process Automation | **0** | İlkin Heyət |
| 7 | **Rinad Evezzade** | `rinad.evezzade.std@bhos.edu.az` | Player | Computer Engineering | **0** | İlkin Heyət |
| 8 | **Anar Alakbarli** | `anar.alakbarli.std@bhos.edu.az` | Player | Process Automation | **0** | İlkin Heyət |
| 9 | **Nihat Ismayilzade** | `nihat.ismayilzade.std@bhos.edu.az` | Player | Process Automation | **0** | İlkin Heyət |

> All other users created on the platform are authentic registered members, flagged with `Qeydiyyat` badges and exact join dates.

---

## 🎓 Academic Faculties & Majors

The registration system and leaderboard filters support all active BHOS faculties and programs:
1. **Information Security** (İnformasiya təhlükəsizliyi)
2. **Computer Engineering** (Kompüter mühəndisliyi)
3. **Computer Science** (Kompüter elmləri)
4. **Data Analytics** (Data analitikası)
5. **Chemical Engineering** (Kimya mühəndisliyi)
6. **Petroleum Engineering** (Neft-qaz mühəndisliyi)
7. **Process Automation** (Proseslərin avtomatlaşdırılması)
8. **Business Administration** (Biznesin idarə edilməsi)
9. **Finance** (Maliyyə)
10. **Staff / Faculty** (İdman Klubu, Dekanlıq və Kafedralar)

---

## 🗂️ Application Structure & Core Pages

| Route | Component | Purpose / Description |
| :--- | :--- | :--- |
| `/` | `app/page.tsx` | Main landing page featuring Top Ranked Hero spotlight, Leaderboard (`01`), Tables (`02`), Tournament preview (`03`), and WhatsApp Community (`04`). |
| `/leaderboard` | `app/leaderboard/page.tsx` | Dedicated ranking table with real-time search, faculty filters, win-rate metrics, and player profile links. |
| `/matches` | `app/matches/page.tsx` | Live matches feed with tabbed filter (**"Bütün Oyunlar"** vs **"Mənim Oyunlarım"**), verification signatures (`CheckCheck`), and 48-hour auto-approval badges (`Avto-təsdiq (48 saat)` with `Clock` icon). |
| `/tournaments` | `app/tournaments/page.tsx` | Active & upcoming tournaments with single-elimination knockout brackets (`components/BracketTree.tsx`). |
| `/tournaments/[slug]` | `app/tournaments/[slug]/page.tsx` | Detailed tournament bracket view with live Realtime match progression, ready-to-play node glow, awaiting slot skeleton badges, and official tournament regulations. |
| `/tables` | `app/tables/page.tsx` | Sports hall facility guide (`Masa 1 — Xanımlar üçün Masa`, `Masalar 2–6`) and time-slot booking scheduler for Tables 1 through 6. |
| `/players/[id]` | `app/players/[id]/page.tsx` | Athlete profile page with **Interactive "What-If" Pre-Match ELO Simulator** (`components/WhatIfSimulator.tsx`), joined date, membership tag (`İlkin Heyət` vs `Rəsmi Qeydiyyat`), head-to-head rivalries, ELO progression chart, and match history with auto-approval indicators. |
| `/admin` | `app/admin/page.tsx` | President dashboard for member roster management (inline name editing, joined dates, origin filters), match deletion (single & bulk), tournament creation, and ELO override. |
| `/login` | `app/login/page.tsx` | Authentication portal with student/staff login, sign-up with email rate-limit resilience, and role verification. |
| `/log-match` | `app/log-match/page.tsx` | Match logging interface supporting pre-selected opponent via `?opponentId=[id]`, set score validation, and 2-player submission. |
| `/api/cron/auto-resolve` | `app/api/cron/auto-resolve/route.ts` | Authorized Edge Cron endpoint (`Authorization: Bearer CRON_SECRET`) invoking `public.auto_resolve_stale_matches(48)`. |

---

## 🚀 Recent Key Deliverables & System Upgrades

1. **Interactive "What-If" Pre-Match ELO Simulator (`components/WhatIfSimulator.tsx` & `lib/elo/calculator.ts`):**
   - Pure ITTF logistic ELO calculator (`calculateWhatIf`) with $K = 32$ and `0` rating floor protection.
   - Searchable opponent combobox on athlete profile pages showing Name, Faculty, and Current ELO.
   - Dynamic dual-color win probability progress bar (`#3B82F6` vs purple/pink) and 2x2 projected outcome grid (**"Qələbə Qazansanız"** / **"Məğlub Olsanız"** + opponent projections) with Framer Motion spring number transitions.
   - Direct **"Bu Oyunçu ilə Matç Qeyd Et"** button linking to `/log-match?opponentId=[id]`.

2. **Uncontested Pending Match Auto-Resolution Engine (48h) (`022_auto_resolve_pending_matches.sql`):**
   - Idempotent PostgreSQL RPC `public.approve_match_safely` and `public.auto_resolve_stale_matches(48)` with audit logging in `public.match_audit_logs` (`reason = 'auto_resolved_48h_inactivity'`).
   - Hourly `pg_cron` schedule plus Next.js Edge fallback route `/api/cron/auto-resolve`.
   - UI transparency badges (`Avto-təsdiq (48 saat)` with `Clock` icon) on `/matches` and `/players/[id]`.

3. **Dynamic Knockout Bracket Progression (`021_tournament_bracket_progression.sql` & `components/BracketTree.tsx`):**
   - Database trigger and RPC `public.advance_tournament_bracket(p_match_id)` that automatically propagates match winners to the next round slot (`round_number + 1`, `floor(bracket_node_index / 2)`), transitions filled matches from `'waiting'` to `'scheduled'`, and crowns the tournament winner on the final match.
   - Enhanced `BracketTree.tsx` visuals for completed matches, live ready-to-play matches (`#3B82F6` border glow), awaiting opponent slots (`TBD`), and pulse animations on newly advanced players.
   - Real-time bracket state synchronization via `BHOSDataStore`.

4. **User Joined Dates & Origin Distinction:**
   - Display of user registration dates (`Qoşulub: DD.MM.YYYY`) across President Panel, athlete profile headers, and pending verification cards.
   - Clear distinction between the 9 initial seed accounts (`İlkin Heyət`) and newly registered club members (`Qeydiyyat`).

5. **Personal Match History ("Mənim Oyunlarım"):**
   - Filter tab on `/matches` allowing logged-in players to isolate their personal match history, win rate, and match outcome badges.

6. **100% Authentic Table Tennis Preset Avatars & President Panel In-Place Name Editor:**
   - Local high-resolution varsity table tennis avatars in `/images/avatars/` and inline member name editing in `/admin`.

7. **0 ELO Baseline & Check Constraint Fix:**
   - Lowered minimum rating check constraint to `0` (`chk_profiles_min_elo CHECK (current_elo >= 0)`), giving all players a `0` ELO starting rating (Coach İftixar retains `9,999` ELO).

---

## 🗄️ Database Migrations History (`supabase/migrations/`)

| File | Purpose |
| :--- | :--- |
| `001_initial_schema.sql` | Core schema: `profiles`, `matches`, `tournaments`, `table_reservations`. |
| `002_rls_and_triggers.sql` | Row Level Security policies, automated profile creation on signup. |
| `003_seed_data.sql` | Initial seed data for club players and mock matches. |
| `004_supabase_cloud_sync.sql` | Cloud sync setup, extensions, views, and seed auth users. |
| `005_registration_and_verification.sql` | Verification queue and profile status flags. |
| `006_two_factor_match_verification.sql` | 2-player match confirmation protocol. |
| `007_update_roster_and_faculties.sql` | Roster update, staff department support. |
| `008_tournament_registrations.sql` | Self-service tournament participant registrations. |
| `009_support_staff_profiles.sql` | Staff/faculty admission year nullability and designations. |
| `010_auth_profiles_trigger.sql` | Trigger linking `auth.users` metadata with `public.profiles`. |
| `011_student_email_constraint.sql` | BHOS university domain validation. |
| `012_fix_auth_users_and_profiles.sql` | Cross-table foreign key repairs. |
| `013_set_president_credentials.sql` | Official credentials and role privileges for President. |
| `014_minimum_elo_1000.sql` | 1000 baseline ELO constraint. |
| `015_matches_update_rls.sql` | RLS permissions for match approval and deletion. |
| `016_seed_initial_matches.sql` | Initial clean match records. |
| `017_fresh_start_reset.sql` | Season reset wiping old test matches. |
| `018_fix_pending_matches_trigger.sql` | Fix for pending matches trigger constraint. |
| `019_reset_elo_floor_to_zero.sql` | Lowered ELO floor to 0, updated `chk_profiles_min_elo >= 0`, 0 starting baseline. |
| `020_cleanup_legacy_preset_avatars.sql` | Database migration pointing all preset avatars to local assets. |
| `021_tournament_bracket_progression.sql` | Knockout bracket columns (`round_number`, `bracket_node_index`, `next_match_id`, `is_bye`) and `advance_tournament_bracket` trigger/RPC. |
| `022_auto_resolve_pending_matches.sql` | 48-hour uncontested match auto-resolution (`auto_resolve_stale_matches`, `approve_match_safely`, `match_audit_logs`, and `pg_cron` job). |

---

## 🛠️ Tech Stack & Key Libraries

- **Framework:** Next.js 14.2 (App Router, React 18, TypeScript 5)
- **Styling:** Tailwind CSS 3.4 with custom `@font-display` and obsidian dark aesthetics
- **Animations:** Framer Motion 11.9
- **Icons:** Lucide React
- **Data & State Management:** Reactive Singleton Store (`lib/data/store.ts`) with LocalStorage cache and Supabase PostgreSQL Realtime sync
- **ELO Calculation Engine:** `lib/elo.ts` and `lib/elo/calculator.ts`
- **Charts & Data Viz:** Recharts 2.12
- **Testing:** Standalone ELO and Bracket verification test suite (`scripts/test-elo.ts` via `tsx`)

---

## ⚙️ Build & Deployment Status

- **Build Status:** Verified passing (`npm run build` exits with code 0).
- **Routes:** All 13 static and dynamic routes (including `/api/cron/auto-resolve`, `/players/[id]`, and `/tournaments/[slug]`) compile cleanly.
- **Git State:** Clean working tree on `main`, synchronized with `origin/main`.
