# BHOS Table Tennis Club Management & Ranking Portal

A modern, responsive full-stack web application designed for the **Baku Higher Oil School (BHOS / Bakı Ali Neft Məktəbi) Table Tennis Club**, inspired by [tabletennis.az](https://tabletennis.az) and official ITTF rating standards.

---

## 🌟 Key Features

1. **Official Table Tennis ELO Rating Engine (`lib/elo.ts`)**:
   - Standard ITTF-calibrated ELO formula:
     $$E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}$$
     $$\Delta = \text{round}(K \times (S_A - E_A))$$
   - Dynamic $K$-factors: $K=32$ for regular ranked matches, $K=48$ for tournament matches, $K=40$ for provisional players (<10 matches).
   - Real-time ELO prediction preview during score input before logging.
   - Comprehensive set score parser with ITTF deuce / minimum 11-point lead validation.

2. **Interactive Knockout Tournament Brackets (`components/BracketTree.tsx`)**:
   - Single Elimination brackets (8, 16, 32 players) with automatic seeding (1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6).
   - Score entry directly inside the bracket for Club Officials.
   - Automatic winner propagation to Semifinals and Finals.
   - Formatted Markdown Tournament Regulations and custom rules.

3. **BHOS Sports Hall Table Booking (`components/TableScheduler.tsx`)**:
   - Visual representation of **Tables 1 through 6** at the BHOS Bibiheybat Campus sports hall.
   - Real-time time slot scheduler (09:00 to 22:00) with conflict detection.
   - Purpose categorization: *Free Play*, *Official Coaching*, and *Tournament Block*.

4. **tabletennis.az-Inspired Leaderboard (`app/leaderboard/page.tsx`)**:
   - Top 3 Gold/Silver/Bronze Podium display.
   - Comprehensive ranking table with faculty filtering (Information Security, Computer Engineering, Chemical Engineering, Petroleum Engineering, Process Automation).
   - Search by player name, faculty, or equipment.
   - ELO, win rate %, and match record counters with trend indicators (up/down/same).

5. **Player Profiles & Analytics (`app/players/[id]/page.tsx`)**:
   - Recharts ELO rating progression over time.
   - Equipment breakdown: Blade, Forehand rubber, Backhand rubber, Grip & playing style.
   - Head-to-head comparison tool between any two club athletes with projected win probability.
   - Full historical match logs with detailed set scores.

6. **Role-Based Access Control (RBAC)**:
   - **President (Superadmin)**: Full CRUD, manual ELO override, user promotion (Player -> Coach / President), tournament creation, table blocking.
   - **Coach**: Official match score logging, roster viewing, training session scheduling.
   - **Player**: Profile equipment editing, match history, leaderboard view, practice slot booking.
   - Built-in Demo Role Switcher in the top navigation bar for testing each role instantly.

7. **Multi-Language Support (`lib/i18n.tsx`)**:
   - Azerbaijani (`az` - default)
   - English (`en`)
   - Russian (`ru`)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Locally in Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

### 3. Run ELO & Bracket Test Suite
```bash
npm run test:elo
```

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🗄️ Database Architecture & Supabase Integration

The project includes production-ready SQL migrations in the `supabase/migrations/` directory:

- `001_initial_schema.sql`: Profiles, Matches, Tournaments, and Table Reservations tables.
- `002_rls_and_triggers.sql`: Row-Level Security (RLS) policies and automated triggers for rating updates.
- `003_seed_data.sql`: Seed data for BHOS students, faculty rosters, matches, and tournaments.

### Connecting to Supabase:
Create a `.env.local` file with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
If these variables are omitted, the application runs on its embedded reactive persistent store pre-seeded with BHOS athletes.

