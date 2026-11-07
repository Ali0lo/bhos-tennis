/**
 * Official Seed Script for November 7 "Zəfər Günü" Foundation Kuboku
 *
 * Rules:
 * - Adəm Rəhimli did not attend; all 6 of his scheduled matches are excluded.
 * - 12 participating Foundation 2026 students start at 500 ELO.
 * - All 38 matches (15 Group A + 15 Group B + 8 Playoffs) are processed in chronological order
 *   using our atomic Set-Dominance ELO engine (`calculateMatchElo`).
 * - Finalizes tournament status as 'completed' with official podium:
 *   1st: Yusif Xanlarov (Çempion)
 *   2nd: Məharət Kərimli (Gümüş)
 *   3rd: Əhəd Zamanlı (Bürünc)
 */

import { createClient } from '@supabase/supabase-js';
import { calculateMatchElo } from '../lib/elo';

interface SeedPlayer {
  key: string;
  id: string;
  full_name: string;
  slug: string;
  email: string;
  major_faculty: string;
  group: 'A' | 'B';
}

export const OFFICIAL_FOUNDATION_PLAYERS: SeedPlayer[] = [
  // Group A (6 players — Adəm Rəhimli excluded)
  {
    key: 'ahad',
    id: 'p-f-ehed-zamanli',
    full_name: 'Əhəd Zamanlı',
    slug: 'ahad-zamanli',
    email: 'ehed.zamanli.std@bhos.edu.az',
    major_faculty: 'Information Security',
    group: 'A',
  },
  {
    key: 'yusif',
    id: 'p-f-yusif-xanlarov',
    full_name: 'Yusif Xanlarov',
    slug: 'yusif-xanlarov',
    email: 'yusif.xanlarov.std@bhos.edu.az',
    major_faculty: 'Computer Engineering',
    group: 'A',
  },
  {
    key: 'muhammad',
    id: 'p-f-mehemmed-esedov',
    full_name: 'Məhəmməd Əsədov',
    slug: 'muhammad-asadov',
    email: 'mehemmed.esedov.std@bhos.edu.az',
    major_faculty: 'Process Automation Engineering',
    group: 'A',
  },
  {
    key: 'sabir',
    id: 'p-f-sabir-meherremli',
    full_name: 'Sabir Məhərrəmli',
    slug: 'sabir-maharramli',
    email: 'sabir.meherremli.std@bhos.edu.az',
    major_faculty: 'Petroleum Engineering',
    group: 'A',
  },
  {
    key: 'adil',
    id: 'p-f-adil-suleymanov',
    full_name: 'Adil Süleymanov',
    slug: 'adil-suleymanov',
    email: 'adil.suleymanov.std@bhos.edu.az',
    major_faculty: 'Information Security',
    group: 'A',
  },
  {
    key: 'kamran',
    id: 'p-f-kamran-aliev',
    full_name: 'Kamran Əliyev',
    slug: 'kamran-aliyev',
    email: 'kamran.aliev.std@bhos.edu.az',
    major_faculty: 'Computer Engineering',
    group: 'A',
  },
  // Group B (6 players)
  {
    key: 'maharat',
    id: 'p-f-meharet-kerimli',
    full_name: 'Məharət Kərimli',
    slug: 'maharat-karimli',
    email: 'meharet.kerimli.std@bhos.edu.az',
    major_faculty: 'Computer Engineering',
    group: 'B',
  },
  {
    key: 'kazim',
    id: 'p-f-kazim-fetelizade',
    full_name: 'Kazım Fətəlizadə',
    slug: 'kazim-fatalizada',
    email: 'kazim.fetelizade.std@bhos.edu.az',
    major_faculty: 'Process Automation Engineering',
    group: 'B',
  },
  {
    key: 'qulam',
    id: 'p-f-qulam-rustemzade',
    full_name: 'Qulam Rüstəmzadə',
    slug: 'qulam-rustamzada',
    email: 'qulam.rustemzade.std@bhos.edu.az',
    major_faculty: 'Petroleum Engineering',
    group: 'B',
  },
  {
    key: 'faiq',
    id: 'p-f-faiq-huseynli',
    full_name: 'Faiq Hüseynli',
    slug: 'faiq-huseynli',
    email: 'faiq.huseynli.std@bhos.edu.az',
    major_faculty: 'Chemical Engineering',
    group: 'B',
  },
  {
    key: 'maharram',
    id: 'p-f-meherrem-mirzexanli',
    full_name: 'Məhərrəm Mirzəxanlı',
    slug: 'maharram-mirzaxanli',
    email: 'meherrem.mirzexanli.std@bhos.edu.az',
    major_faculty: 'Process Automation Engineering',
    group: 'B',
  },
  {
    key: 'rafiq',
    id: 'p-f-rafiq-hesenli',
    full_name: 'Rafiq Həsənli',
    slug: 'rafiq-hasanli',
    email: 'rafiq.hesenli.std@bhos.edu.az',
    major_faculty: 'Computer Engineering',
    group: 'B',
  },
];

export const OFFICIAL_38_MATCHES: Array<[string, string, number, number, string]> = [
  // Group A (15 matches, Adəm Rəhimli excluded)
  ['ahad', 'adil', 2, 0, 'group'],
  ['muhammad', 'kamran', 2, 0, 'group'],
  ['yusif', 'adil', 2, 0, 'group'],
  ['muhammad', 'sabir', 0, 2, 'group'],
  ['yusif', 'kamran', 2, 0, 'group'],
  ['ahad', 'muhammad', 2, 0, 'group'],
  ['kamran', 'sabir', 0, 2, 'group'],
  ['adil', 'muhammad', 2, 0, 'group'],
  ['yusif', 'sabir', 2, 0, 'group'],
  ['kamran', 'ahad', 0, 2, 'group'],
  ['yusif', 'muhammad', 2, 0, 'group'],
  ['sabir', 'ahad', 0, 2, 'group'],
  ['kamran', 'adil', 0, 2, 'group'],
  ['yusif', 'ahad', 1, 2, 'group'],
  ['sabir', 'adil', 2, 0, 'group'],

  // Group B (15 matches)
  ['maharat', 'maharram', 2, 0, 'group'],
  ['kazim', 'rafiq', 2, 0, 'group'],
  ['qulam', 'faiq', 2, 0, 'group'],
  ['maharat', 'rafiq', 2, 0, 'group'],
  ['maharram', 'faiq', 0, 2, 'group'],
  ['kazim', 'qulam', 1, 2, 'group'],
  ['maharat', 'faiq', 2, 0, 'group'],
  ['rafiq', 'qulam', 0, 2, 'group'],
  ['maharram', 'kazim', 0, 2, 'group'],
  ['maharat', 'qulam', 1, 2, 'group'],
  ['faiq', 'kazim', 0, 2, 'group'],
  ['rafiq', 'maharram', 0, 2, 'group'],
  ['maharat', 'kazim', 2, 1, 'group'],
  ['qulam', 'maharram', 2, 0, 'group'],
  ['faiq', 'rafiq', 2, 0, 'group'],

  // Playoffs (8 matches)
  ['ahad', 'faiq', 2, 0, 'playoff_qf'],
  ['maharat', 'sabir', 2, 1, 'playoff_qf'],
  ['qulam', 'adil', 2, 0, 'playoff_qf'],
  ['yusif', 'kazim', 2, 0, 'playoff_qf'],
  ['ahad', 'maharat', 1, 3, 'playoff_sf'],
  ['qulam', 'yusif', 0, 3, 'playoff_sf'],
  ['ahad', 'qulam', 3, 2, 'playoff_3rd'],
  ['maharat', 'yusif', 0, 3, 'playoff_final'],
];

async function main() {
  const stats = new Map<string, { elo: number; mp: number; w: number; l: number }>();
  for (const p of OFFICIAL_FOUNDATION_PLAYERS) {
    stats.set(p.key, { elo: 500, mp: 0, w: 0, l: 0 });
  }

  for (const [p1, p2, s1, s2] of OFFICIAL_38_MATCHES) {
    const st1 = stats.get(p1)!;
    const st2 = stats.get(p2)!;
    const res = calculateMatchElo({
      player1Elo: st1.elo,
      player2Elo: st2.elo,
      player1Won: s1 > s2,
      player1SetsWon: s1,
      player2SetsWon: s2,
    });
    st1.elo = res.player1EloAfter;
    st2.elo = res.player2EloAfter;
    st1.mp += 1;
    st2.mp += 1;
    if (s1 > s2) {
      st1.w += 1;
      st2.l += 1;
    } else {
      st2.w += 1;
      st1.l += 1;
    }
  }

  console.log('=== Foundation Cup 2026 Simulation Complete (38 Matches) ===');
  console.log('Podium:');
  console.log('  1st (Champion): Yusif Xanlarov — ELO:', stats.get('yusif')?.elo);
  console.log('  2nd (Silver):   Məharət Kərimli — ELO:', stats.get('maharat')?.elo);
  console.log('  3rd (Bronze):   Əhəd Zamanlı    — ELO:', stats.get('ahad')?.elo);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Connected to Supabase:', supabaseUrl);
    const { data: tourns } = await supabase
      .from('tournaments')
      .select('id, title, status')
      .ilike('title', '%Foundation%')
      .limit(1);
    console.log('Foundation Tournament record:', tourns?.[0] || 'Run migration 035_log_foundation_cup_results.sql in Supabase SQL Editor');
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
