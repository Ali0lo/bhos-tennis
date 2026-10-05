# BHOS Table Tennis Portal — Current Project Status

**Last Updated:** October 2026  
**Repository:** [github.com/Ali0lo/bhos-tennis](https://github.com/Ali0lo/bhos-tennis)  
**Active Branch:** `main`  
**Current Commit:** `a3bb096` ("Implement new dark minimalist UI design with updated roster and smooth animations")

---

## 📌 Executive Summary

The **BHOS Table Tennis Club Management & Ranking Portal** is a production-ready Next.js 14 web application designed for students, faculty, and athletes at **Baku Higher Oil School (Bakı Ali Neft Məktəbi)**.

The project features a sleek **obsidian dark sports UI** (`#080D16`), an **ITTF-compliant ELO ranking engine**, an **interactive knockout tournament bracket**, a **sports hall table booking system**, and **seamless responsive support** across Desktop, Tablet, and Mobile devices.

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
    - **Emerald Green (`#22C55E`):** WhatsApp community buttons and ranking status badge.

- **Responsive Breakpoint Layouts:**
  - **Desktop (`lg`):** Full 12-column asymmetric hero, 6-column leaderboard table (`RANK`, `PLAYER NAME`, `FACULTY`, `BLADE / RUBBER`, `MATCHES`, `POINTS`), 2x2 table grid, and side-by-side tournament championship + bracket view.
  - **Tablet (`md`):** Centered brand top header, navigation row with language toggle and WhatsApp CTA, streamlined leaderboard rows, and adaptive grid columns.
  - **Phone (`sm` / `< md`):** Clean stacked navigation, simplified `Rank + Name + Points` leaderboard rows, and 1-column responsive cards.

- **Animations & Micro-Interactions:**
  - Reusable Framer Motion scroll-reveal wrapper (`components/SmoothReveal.tsx`) using custom cubic-bezier easing `[0.22, 1, 0.36, 1]`.
  - Staggered entrance animations on leaderboard rows.
  - Smooth hover scale, elevation, and border lighting effects on interactive cards and buttons.
  - Native smooth scrolling enabled in `app/globals.css`.

---

## 👥 Player Roster & ELO Points State

The player database has been curated according to the latest club specifications:

| Rank | Player Name | Role | Faculty / Department | Equipment Status | Current ELO | Record |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| **1** | **Iftixar Meherremov** | Coach | Coach / BHOS | Donic / Rubbers pending | **9,999** | 0W - 0L |
| **2** | **Ali Iskandarli** | President | Information Security | Not listed | **0** | 0W - 0L |
| **3** | **Ali Abdulov** | Player | Petroleum Engineering | Not listed | **0** | 0W - 0L |
| **4** | **Ali Aghayev** | Player | Computer Engineering | Not listed | **0** | 0W - 0L |
| **5** | **Huseyn Muradzade** | Player | Process Automation | Not listed | **0** | 0W - 0L |
| **6** | **Fateh Memmedli** | Player | Chemical Engineering | Not listed | **0** | 0W - 0L |
| **7** | **Rinad Avazzade** | Player | Information Security | Not listed | **0** | 0W - 0L |
| **8** | **Anar Alakbarli** | Player | Computer Engineering | Not listed | **0** | 0W - 0L |
| **9** | **Nihat Ismayilzade** | Player | Petroleum Engineering | Not listed | **0** | 0W - 0L |

> **Note on Roster Changes:**
> - Added: **Rinad Avazzade**, **Anar Alakbarli**, and **Nihat Ismayilzade**.
> - Removed: **Ayan Aliyeva** has been completely purged from mock data, database migrations, and UI.
> - Points: **Coach Iftixar Meherremov** holds the benchmark **9,999 PTS**, while all other athletes start at **0 PTS** until official matches are logged.
> - Browser Cache: Local storage keys bumped to `v5` (`bhos_tt_profiles_v5`) to ensure client browsers immediately display the new roster without requiring manual cache clearing.

---

## 🗂️ Application Structure & Core Pages

| Route | Component | Purpose / Description |
| :--- | :--- | :--- |
| `/` | `app/page.tsx` | Main landing page featuring the Hero with Top Ranked Spotlight (`01`), `01 / THE FIELD` Leaderboard, `02 / PLAY SPACE` Four Tables grid, `03 / COMPETE` Tournament & Bracket Preview, and `04 / THE COMMUNITY` WhatsApp section. |
| `/leaderboard` | `app/leaderboard/page.tsx` | Dedicated ranking table with real-time search, faculty filters, win-rate metrics, and player profile links. |
| `/tournaments` | `app/tournaments/page.tsx` | Active & upcoming tournaments with single-elimination knockout brackets (`components/BracketTree.tsx`). |
| `/tournaments/[slug]` | `app/tournaments/[slug]/page.tsx` | Detailed tournament bracket view with live match progression and official tournament regulations. |
| `/tables` | `app/tables/page.tsx` | Sports hall facility guide and time-slot booking scheduler for Tables 1 through 4. |
| `/players/[id]` | `app/players/[id]/page.tsx` | Athlete profile page with head-to-head match predictor, ELO progression chart, and equipment breakdown. |
| `/admin` | `app/admin/page.tsx` | President / Club official dashboard for logging matches, managing tournaments, and overriding ratings. |

---

## ⚙️ Deployment & Hosting Presets

### **Vercel Deployment**
- **Framework Preset:** `Next.js`
- **Root Directory:** `./` (default)
- **Build Command:** `npm run build` *(or `next build`)*
- **Output Directory:** `.next`
- **Node.js Version:** `20.x`
- **Install Command:** `npm install`
- **Environment Variables (Optional):**
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```
  *(If omitted, portal seamlessly operates using its built-in client-side data store).*

### **Render Deployment**
- Configured via `render.yaml` web service pointing to branch `main`.
- Node.js runtime: `24.x` / `20.x`.
- Build Command: `npm install && npm run build`.
- Start Command: `npm start`.

---

## 🛠️ Tech Stack & Key Libraries

- **Framework:** Next.js 14.2 (App Router, React 18, TypeScript 5)
- **Styling:** Tailwind CSS 3.4 with custom `@font-display` and glassmorphic utilities
- **Animations:** Framer Motion 11.9
- **Icons:** Lucide React
- **Data & State Management:** Reactive Singleton Store (`lib/data/store.ts`) with LocalStorage fallback and optional Supabase PostgreSQL sync
- **Charts & Data Viz:** Recharts 2.12
- **Testing:** Standalone ELO and Bracket verification test suite (`scripts/test-elo.ts` via `tsx`)

---

## 📋 Next Potential Steps & Recommendations

1. **Connect Live Supabase PostgreSQL:** When ready for shared multi-device cloud storage, run migrations `001`, `002`, and `003` on a Supabase instance and supply the environment variables in Vercel / Render.
2. **Match Verification Workflow:** Allow players to confirm or dispute match scores submitted by their opponents before ratings are finalized.
3. **Automated WhatsApp Bot:** Integrate with WhatsApp API / Webhook to broadcast tournament announcements and weekly leaderboard updates to the group chat.
