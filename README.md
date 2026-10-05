# BHOS Table Tennis Club Management & Ranking Portal

A modern, responsive full-stack web application designed for the **Baku Higher Oil School (BHOS / Bakı Ali Neft Məktəbi) Table Tennis Club**, inspired by official ITTF rating standards and modern dark sports visual design.

> 📖 **Detailed Project Status:** See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for current milestones, roster state, UI architecture, and deployment information.

---

## 🌟 Key Features

1. **Modern Obsidian Dark UI (`#080D16`)**:
   - High-contrast, minimalist sports interface with electric blue (`#3B82F6`), warm gold (`#EAB308`), and emerald green (`#22C55E`) accents.
   - Fully responsive design tailored for Desktop, Tablet, and Mobile devices.
   - Framer Motion scroll-reveal animations (`components/SmoothReveal.tsx`), staggered row entrances, and smooth hover micro-interactions.

2. **Official Table Tennis ELO Rating Engine (`lib/elo.ts`)**:
   - Standard ITTF-calibrated ELO formula:
     $$E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}$$
     $$\Delta = \text{round}(K \times (S_A - E_A))$$
   - Dynamic $K$-factors: $K=32$ for regular ranked matches, $K=48$ for tournament matches, $K=40$ for provisional players (<10 matches).
   - Real-time ELO prediction preview during score input before logging.
   - Comprehensive set score parser with ITTF deuce / minimum 11-point lead validation.

3. **Current Club Roster & Benchmark Points**:
   - **Coach Iftixar Meherremov** holds the benchmark **#1 spot** with **9,999 PTS** (`Coach / BHOS`, `Donic / Rubbers pending`).
   - Student athletes starting at initial **0 PTS** (`0W - 0L`):
     - **Ali Iskandarli** (President, Information Security)
     - **Ali Abdulov** (Petroleum Engineering)
     - **Ali Aghayev** (Computer Engineering)
     - **Huseyn Muradzade** (Process Automation)
     - **Fateh Memmedli** (Chemical Engineering)
     - **Rinad Avazzade** (Information Security)
     - **Anar Alakbarli** (Computer Engineering)
     - **Nihat Ismayilzade** (Petroleum Engineering)

4. **Visual Table & Sports Hall Information (`app/tables/page.tsx`)**:
   - Schedule and facility guide for **Tables 1 through 4** at the BHOS campus sports hall (10:00 to 21:00).
   - Dedicated table zones: Table 1 dedicated for Women/Girls, Tables 2–4 for Men / General Training.

5. **Interactive Knockout Tournament Brackets (`components/BracketTree.tsx`)**:
   - Single Elimination brackets (8, 16, 32 players) with automatic seeding (1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6).
   - Direct bracket progression from Round 1 through Semifinals and Finals.
   - Visual bracket preview widget on the homepage.

6. **Community Integration**:
   - Direct onboarding CTA to the official BHOS Table Tennis WhatsApp Community (`https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN`).

7. **Multi-Language Support (`lib/i18n.tsx`)**:
   - Azerbaijani (`az` - default)
   - English (`en`)
   - Russian (`ru`)

---

## 🚀 Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Locally
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

## ☁️ Deployment Configuration

### **Vercel**
- **Framework Preset:** `Next.js`
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Node.js Version:** `20.x`
- **Install Command:** `npm install`

### **Render**
- Configured via `render.yaml` with automatic builds on push to `main`.
- Web service command: `npm install && npm run build` followed by `npm start`.

---

## 🗄️ Database Architecture & Supabase Integration

The project includes SQL migrations in `supabase/migrations/`:
- `001_initial_schema.sql`: Profiles, Matches, Tournaments, and Table Reservations tables.
- `002_rls_and_triggers.sql`: Row-Level Security (RLS) policies and automated triggers.
- `003_seed_data.sql`: Seed data for BHOS athletes, coach benchmark rating, and tournaments.

### Optional Live Database Connection
Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
If omitted, the application runs entirely standalone with a reactive persistent store (`lib/data/store.ts`).
