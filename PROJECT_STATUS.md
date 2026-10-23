# BHOS Table Tennis Portal — Current Project Status

**Last Updated:** October 2026  
**Repository:** [github.com/Ali0lo/bhos-tennis](https://github.com/Ali0lo/bhos-tennis)  
**Active Branch:** `main`  
**Current Commit:** `d23eb8a` ("feat: display user joined dates and distinguish default vs registered accounts")

---

## 📌 Executive Summary

The **BHOS Table Tennis Club Management & Ranking Portal** is a production-ready Next.js 14 web application designed for students, faculty, and athletes at **Baku Higher Oil School (Bakı Ali Neft Məktəbi)**.

The project features a sleek **obsidian dark sports UI** (`#080D16`), an **ITTF-compliant ELO ranking engine**, an **interactive knockout tournament bracket**, a **sports hall table booking system**, **match verification queues**, **profile customization**, and **seamless responsive support** across Desktop, Tablet, and Mobile devices.

---

## 🎨 Current UI & Visual Design Situation

The interface follows a minimalist dark sports aesthetic inspired by modern tournament portals and Framer design specifications:

- **Color Palette:**
  - Background: `#080D16` (Deep obsidian dark)
  - Card Surfaces: `#0F1623` (Dark navy container cards)
  - Row Surfaces: `#131C2B` (Elevated pill rows with subtle border `rgba(255, 255, 255, 0.06)`)
  - Accent Colors:
    - **Electric Royal Blue (`#3B82F6`):** Section numbers (`01`, `02`, `03`, `04`), primary CTA buttons, table numbers.
    - **Warm Gold (`#EAB308`):** #1 spot badges, leader ELO points (`9999 PTS`), Table 1 indicator, Finalist bracket border.
    - **Emerald Green (`#22C55E`):** WhatsApp community buttons, confirmed status, win badges.

- **Responsive Breakpoint Layouts:**
  - **Desktop (`lg`):** Full 12-column asymmetric hero, 6-column leaderboard table, 2x2 table grid, and side-by-side tournament championship + bracket view.
  - **Tablet (`md`):** Centered brand top header, navigation row with language toggle and WhatsApp CTA, streamlined leaderboard rows, and adaptive grid columns.
  - **Phone (`sm` / `< md`):** Clean stacked navigation, simplified `Rank + Name + Points` leaderboard rows, touch-friendly tap targets, and 1-column responsive cards.

- **Animations & Micro-Interactions:**
  - Reusable Framer Motion scroll-reveal wrapper (`components/SmoothReveal.tsx`) using custom cubic-bezier easing `[0.22, 1, 0.36, 1]`.
  - Staggered entrance animations on leaderboard rows.
  - Smooth hover scale, elevation, and border lighting effects on interactive cards and buttons.
  - Native smooth scrolling enabled in `app/globals.css`.

---

## 👥 Player Roster & ELO Points State

The portal operates on an official ELO system with a **0-point floor constraint**:
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
| `/matches` | `app/matches/page.tsx` | Live matches feed with tabbed filter: **"Bütün Oyunlar"** vs **"Mənim Oyunlarım"** (with win rate, personal game count, and win/loss badges). |
| `/tournaments` | `app/tournaments/page.tsx` | Active & upcoming tournaments with single-elimination knockout brackets (`components/BracketTree.tsx`). |
| `/tournaments/[slug]` | `app/tournaments/[slug]/page.tsx` | Detailed tournament bracket view with live match progression and official tournament regulations. |
| `/tables` | `app/tables/page.tsx` | Sports hall facility guide and time-slot booking scheduler for Tables 1 through 6. |
| `/players/[id]` | `app/players/[id]/page.tsx` | Athlete profile page with joined date, membership tag (`İlkin Heyət` vs `Rəsmi Qeydiyyat`), head-to-head match predictor, ELO progression chart, and equipment breakdown. |
| `/admin` | `app/admin/page.tsx` | President dashboard for member roster management (inline name editing, joined dates, origin filters), match deletion (single & bulk), tournament creation, and ELO override. |
| `/login` | `app/login/page.tsx` | Authentication portal with student/staff login, sign-up with email rate-limit resilience, and role verification. |
| `/log-match` | `app/log-match/page.tsx` | Match logging interface with set score validation and 2-player submission. |

---

## 🚀 Recent Key Deliverables & System Upgrades

1. **User Joined Dates & Origin Distinction:**
   - Display of user registration dates (`Qoşulub: DD.MM.YYYY`) across President Panel, athlete profile headers, and pending verification cards.
   - Clear distinction between the 9 initial seed accounts (`İlkin Heyət`) and newly registered club members (`Qeydiyyat`).
   - Fast filter tabs (`Hamısı`, `Qeydiyyat`, `İlkin Heyət`) and search in the admin panel.

2. **Personal Match History ("Mənim Oyunlarım"):**
   - Filter tab on `/matches` allowing logged-in players to isolate their personal match history.
   - Displays personalized win rate, total matches count, and individual match outcome badges.

3. **100% Authentic Table Tennis Preset Avatars:**
   - Replaced all legacy/third-party Unsplash links with 6 custom high-resolution varsity table tennis avatars stored locally in `/images/avatars/`.

4. **President Panel In-Place Name Editor:**
   - President can directly edit and correct member names inline via pencil icon or double click without entering Supabase console.

5. **0 ELO Baseline & Check Constraint Fix:**
   - Lowered minimum rating check constraint from 1000 to 0.
   - All players start at 0 ELO (Coach retains 9999 ELO).
   - Resolved database check constraint violations when logging matches with 0 ELO players.

6. **Expanded BHOS Majors:**
   - Full support for Business Administration, Finance, Data Analytics, and Computer Science.

7. **Registration UX & Rate Limit Handling:**
   - Streamlined registration form with clear labels and informative feedback when Supabase email rate limits are triggered.

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

---

## 🛠️ Tech Stack & Key Libraries

- **Framework:** Next.js 14.2 (App Router, React 18, TypeScript 5)
- **Styling:** Tailwind CSS 3.4 with custom `@font-display` and obsidian dark aesthetics
- **Animations:** Framer Motion 11.9
- **Icons:** Lucide React
- **Data & State Management:** Reactive Singleton Store (`lib/data/store.ts`) with LocalStorage cache and Supabase PostgreSQL Realtime sync
- **Charts & Data Viz:** Recharts 2.12
- **Testing:** Standalone ELO and Bracket verification test suite (`scripts/test-elo.ts` via `tsx`)

---

## ⚙️ Build & Deployment Status

- **Build Status:** Verified passing (`npm run build` exits with code 0).
- **Static Pages:** All 13 routes compile cleanly.
- **Git State:** Clean working tree on `main`, synchronized with `origin/main`.
