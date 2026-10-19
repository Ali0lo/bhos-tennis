# 🏓 BHOS Table Tennis Club Management & Ranking Portal

[![Live Production](https://img.shields.io/badge/Production-tabletennisbhos.me-00f2fe?style=flat)](https://www.tabletennisbhos.me)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)

🌐 **Live Production Website:** [https://www.tabletennisbhos.me](https://www.tabletennisbhos.me)

A modern, responsive full-stack sports platform designed specifically for the **Baku Higher Oil School (BHOS / Bakı Ali Neft Məktəbi) Table Tennis Club**, inspired by international ITTF rating standards and modern competitive esports portals.

---

## 🌟 Key Features

### 1. Official ITTF ELO Rating Engine (`lib/elo.ts`)
- Standard calibrated ITTF ELO engine with dynamic $K$-factors:
  - $K=32$ for regular ranked match logs.
  - $K=48$ for official tournament bracket matches.
  - $K=40$ for provisional athletes (<10 matches logged).
- Real-time ELO preview calculation during match score input.
- Strict set score validation with ITTF deuce rule (minimum 2-point lead beyond 10–10).
- Minimum rating floor: Athlete ratings never drop below `0 ELO`, with 0 as the official starting baseline for new athletes.

### 2. Multi-Role Authentication & Access Control (RBAC)
- **Role Hierarchy:**
  - **Club President (`president`)**: Full club administrative rights, member verification, manual ELO overrides, player deletion with cascading cleanup, role assignments, tournament creation, and table management.
  - **Coach (`coach`)**: Benchmark rating (`9,999 ELO`), training session management, official match logging.
  - **Player (`player`)**: Profile customization (equipment, style), match scheduling, match logging with opponent confirmation workflow, tournament participation.
- **Dynamic BHOS Domain Validation (`app/login/page.tsx`):**
  - **Students:** Enforces official BHOS student email format (`ad.soyad.std@bhos.edu.az`).
  - **Teachers / Staff / Coaches:** Supports standard external email providers (`@gmail.com`, `@bhos.edu.az`, etc.) to accommodate external coaches and faculty members.
  - Interactive password visibility toggle (`Eye` / `EyeOff`) and automatic session redirection.

### 3. President Administration Panel (`app/admin/page.tsx`)
- **Pending Member Verification Queue (`components/PendingVerificationQueue.tsx`):**
  - Live queue of newly registered athletes awaiting club approval.
  - Initial ELO assignment during approval (default `0` or custom seed rating).
  - One-click application approval or rejection/deletion.
- **Roster Management & ELO Overrides:**
  - Full athlete roster view with real-time ELO adjustment.
  - Dynamic user promotion (Player $\leftrightarrow$ Coach $\leftrightarrow$ President).
  - Student vs Teacher/Staff category toggling.
  - Permanent athlete deletion (`Trash2`) with cascade cleanup across tournaments, matches, and table reservations.
- **Logged Match Management, Editing & Bulk Removal:**
  - Full searchable history of all recorded matches across the club with customizable view limits (last 25, last 50, or all matches).
  - Multi-select capability (select all or individual checkboxes) with batch deletion ("Seçilmişləri Sil").
  - Modal-based editing (`Pencil`) allowing club organizers to adjust match scores, set scores, dates, and verification status.
  - Permanent removal/deletion (`Trash2`) with cloud and local synchronization.
- **Olympic Tournament Generator:**
  - Automated single-elimination tournament generation (4, 8, 16 athletes) with seeding and rule specifications.

### 4. Interactive Knockout Tournament Brackets (`components/BracketTree.tsx`)
- Dynamic Olympic single-elimination bracket renderer with real-time progression.
- In-bracket match score entry for club organizers.
- Automatic winner advancement from Quarterfinals $\rightarrow$ Semifinals $\rightarrow$ Finals.
- Markdown-formatted tournament regulations and rules view.

### 5. Two-Player Match Confirmation Workflow (`app/matches/page.tsx`)
- Athletes log match set scores against fellow club members.
- Opponent receives instant notification badges in the navigation bar.
- Opponent can confirm or dispute pending match logs before ratings update.

### 6. Sports Hall Table Reservation (`app/tables/page.tsx`)
- Digital schedule for **Tables 1 through 4** at the BHOS Bibiheybat Campus sports hall.
- Real-time booking slots (09:00 to 22:00) with conflict prevention.
- Slot categorization: *Free Play*, *Official Coaching*, and *Tournament Block*.

### 7. Athlete Analytics & Equipment Registry (`app/players/[id]/page.tsx`)
- Interactive ELO rating history trajectory charts via Recharts.
- Complete match history feed ("Oyun Tarixçəsi və Nəticələr") displaying both verified victories/losses and pending matches with set scores and dynamic win percentage calculation.
- Equipment breakdown: Blade wood, Forehand rubber, Backhand rubber, Grip style.
- Head-to-head match predictor with probability calculation between any two athletes.

### 8. Internationalization (`lib/i18n.tsx`)
- Full trilingual support:
  - 🇦🇿 **Azerbaijani** (`az` — default)
  - 🇬🇧 **English** (`en`)
  - 🇷🇺 **Russian** (`ru`)

---

## 🎨 UI & Layout Architecture

- **Navbar (`components/Navbar.tsx`):**
  - **Brand Anchor:** BHOS crest emblem on the far left.
  - **Navigation Links:** Centered pill menu (`Reytinq Cədvəli`, `Oyunlarım`, `Turnirlər`, `Zal Qaydaları`, `Haqqında`).
  - **Action Hub:** Distinct right-aligned President Panel with amber shield badge, official WhatsApp community link, one-click match logger, trilingual selector, and profile menu.
- **Theme:** Obsidian dark sports aesthetic (`#080D16`) with electric cyan (`#00E5FF`), amber gold (`#F59E0B`), and emerald green (`#10B981`) accents.
- **Responsive:** Fluid layout optimized across mobile phones, tablets, laptops, and ultra-wide displays.

---

## 🚀 Getting Started

### Prerequisites
- Node.js `20.x` or higher
- npm `10.x` or higher

### 1. Clone & Install
```bash
git clone https://github.com/Ali0lo/bhos-tennis.git
cd bhos-tennis
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
*(If Supabase credentials are not provided, the application runs on its embedded reactive persistent store with initial mock data).*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🗄️ Database Architecture & Migrations

The database is built on PostgreSQL via Supabase with row-level security (RLS) and real-time event streaming:

| Migration File | Description |
| :--- | :--- |
| `001_initial_schema.sql` | Core tables: `profiles`, `matches`, `tournaments`, and `table_reservations`. |
| `002_rls_and_triggers.sql` | Row-Level Security policies and automated rating calculation triggers. |
| `003_seed_data.sql` | Initial club roster, faculty seeds, and practice tournament data. |
| `004_supabase_cloud_sync.sql` | Cloud synchronization and schema alignment. |
| `007_update_roster_and_faculties.sql` | Updated athlete roster, faculties, and staff departments. |
| `008_tournament_registrations.sql` | Tournament athlete registration queue and constraints. |
| `010_auth_profiles_trigger.sql` | Automatic `auth.users` to `public.profiles` insertion trigger. |
| `011_student_email_constraint.sql` | Enforces `*.std@bhos.edu.az` for students while allowing external emails for staff. |
| `012_fix_auth_users_and_profiles.sql` | Foreign key detachment and token normalization. |
| `013_set_president_credentials.sql` | Confirmed credentials and pre-verified President account setup. |
| `014_minimum_elo_1000.sql` | Minimum 1000 starting ELO, auth trigger default, and rating floor constraint. |
| `015_matches_update_rls.sql` | Enables UPDATE & DELETE policies on matches table for game confirmations. |
| `016_seed_initial_matches.sql` | Seeds initial competitive match history for club roster athletes dynamically referencing their profile UUIDs. |

---

## 👥 Club Leadership & Support

- **Club President:** Ali Iskandarli (`ali.iskandarli.std@bhos.edu.az`)
- **Official Coach:** İftixar Məhərrəmov (`iftixar.coach@gmail.com`)
- **Official WhatsApp Community:** [Join Community](https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN)

---

## 📄 License

This project is licensed under the MIT License for Baku Higher Oil School Table Tennis Club.
