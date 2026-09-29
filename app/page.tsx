'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile } from '../lib/data/types';
import { useTranslation, Locale } from '../lib/i18n';
import { MessageCircle } from 'lucide-react';

const PAGE_COPY: Record<
  Locale,
  {
    heroEyebrow: string;
    heroLine1: string;
    heroLine2: string;
    heroLine3: string;
    heroSubtitle: string;
    viewLeaderboardBtn: string;
    joinWhatsappBtn: string;
    spotlightLabel: string;
    rankingLabel: string;
    coachNameLine1: string;
    coachNameLine2: string;
    theOneToBeat: string;
    sec1Eyebrow: string;
    sec1Title: string;
    sec1Subtitle: string;
    colRank: string;
    colPlayer: string;
    colFaculty: string;
    colEquipment: string;
    colMatches: string;
    colElo: string;
    sec2Eyebrow: string;
    sec2Title: string;
    sec2Subtitle: string;
    table1Title: string;
    tableMenTitle: string;
    tableWord: string;
    sec3Eyebrow: string;
    sec3Title: string;
    tournEyebrow: string;
    tournTitle: string;
    tournDesc: string;
    bracketEyebrow: string;
    round01: string;
    round02: string;
    final: string;
    sec4Eyebrow: string;
    sec4Title: string;
    sec4Desc: string;
  }
> = {
  en: {
    heroEyebrow: 'BAKU HIGHER OIL SCHOOL  /  EST. ON CAMPUS',
    heroLine1: 'BHOS Official',
    heroLine2: 'Table Tennis Club',
    heroLine3: '& Ranking Portal',
    heroSubtitle:
      'A home for every rally. Follow the campus rankings, find your table, and compete with the BHOS community.',
    viewLeaderboardBtn: 'View Leaderboard',
    joinWhatsappBtn: 'Join WhatsApp Community',
    spotlightLabel: 'TOP RANKED SPOTLIGHT',
    rankingLabel: 'RANKING',
    coachNameLine1: 'Coach Iftixar',
    coachNameLine2: 'Meherremov',
    theOneToBeat: 'THE ONE TO BEAT',
    sec1Eyebrow: '01 / THE FIELD',
    sec1Title: 'The leaderboard.',
    sec1Subtitle: 'Every match moves the needle. Track the current BHOS ELO standings below.',
    colRank: 'RANK',
    colPlayer: 'PLAYER NAME',
    colFaculty: 'FACULTY',
    colEquipment: 'BLADE / RUBBER',
    colMatches: 'MATCHES',
    colElo: 'ELO PTS',
    sec2Eyebrow: '02 / PLAY SPACE',
    sec2Title: 'Four tables. One community.',
    sec2Subtitle: 'Your next session starts here. The sports hall is open daily from 10:00 to 21:00.',
    table1Title: 'Dedicated for Women/Girls',
    tableMenTitle: 'Men / General Training',
    tableWord: 'TABLE',
    sec3Eyebrow: '03 / COMPETE',
    sec3Title: 'The next big rally.',
    tournEyebrow: 'CAMPUS TOURNAMENT  /  AUTUMN EDITION',
    tournTitle: 'BHOS Autumn Open Championship',
    tournDesc:
      'A campus-wide knockout tournament. Follow the bracket as players advance toward the final.',
    bracketEyebrow: 'KNOCKOUT BRACKET  /  PREVIEW',
    round01: 'ROUND 01',
    round02: 'ROUND 02',
    final: 'FINAL',
    sec4Eyebrow: '04 / THE COMMUNITY',
    sec4Title: 'Your people. Your game.',
    sec4Desc:
      'Join 100+ BHOS players on WhatsApp for training sessions, match updates, tournament news, and a little friendly competition.',
  },
  az: {
    heroEyebrow: 'BAKI ALİ NEFT MƏKTƏBİ  /  KAMPUSDA YARADILIB',
    heroLine1: 'BANM Rəsmi',
    heroLine2: 'Stolüstü Tennis Klubu',
    heroLine3: 'və Reytinq Portalı',
    heroSubtitle:
      'Hər ralli üçün vahid məkan. Kampus reytinqini izləyin, masanızı seçin və BANM icması ilə yarışın.',
    viewLeaderboardBtn: 'Reytinqə Bax',
    joinWhatsappBtn: 'WhatsApp İcmasına Qoşul',
    spotlightLabel: 'LİDER İDMANÇI',
    rankingLabel: 'REYTİNQ',
    coachNameLine1: 'Məşqçi İftixar',
    coachNameLine2: 'Məhərrəmov',
    theOneToBeat: 'MƏĞLUBEDİLMƏZ LİDER',
    sec1Eyebrow: '01 / MEYDANÇA',
    sec1Title: 'Reytinq cədvəli.',
    sec1Subtitle: 'Hər oyun reytinqi dəyişir. Cari BANM ELO sıralamasını aşağıdan izləyin.',
    colRank: 'SIRA',
    colPlayer: 'OYUNÇU ADI',
    colFaculty: 'FAKÜLTƏ',
    colEquipment: 'TAXTA / REZİN',
    colMatches: 'OYUNLAR',
    colElo: 'ELO XAL',
    sec2Eyebrow: '02 / OYUN MƏKANI',
    sec2Title: 'Dörd masa. Vahid icma.',
    sec2Subtitle: 'Növbəti məşqiniz burada başlayır. İdman zalı hər gün 10:00-dan 21:00-dək açıqdır.',
    table1Title: 'Xanımlar / Qızlar üçün ayrılıb',
    tableMenTitle: 'Oğlanlar / Ümumi Məşq',
    tableWord: 'MASA',
    sec3Eyebrow: '03 / YARIŞ',
    sec3Title: 'Növbəti böyük turnir.',
    tournEyebrow: 'KAMPUS TURNİRİ  /  PAYIZ BURAXILIŞI',
    tournTitle: 'BANM Payız Açıq Çempionatı',
    tournDesc:
      'Kampus üzrə olimpiya sistemi ilə keçirilən turnir. Oyunçuların finala doğru irəliləyişini izləyin.',
    bracketEyebrow: 'PLEY-OFF CƏDVƏLİ  /  ÖNİZLƏMƏ',
    round01: 'RAUND 01',
    round02: 'RAUND 02',
    final: 'FİNAL',
    sec4Eyebrow: '04 / İCMA',
    sec4Title: 'Sənin komandan. Sənin oyunun.',
    sec4Desc:
      'Məşq saatları, oyun nəticələri, turnir xəbərləri və dostluq yarışları üçün WhatsApp-da 100+ BANM oyunçusuna qoşulun.',
  },
  ru: {
    heroEyebrow: 'БАКИНСКАЯ ВЫСШАЯ ШКОЛА НЕФТИ  /  КАМПУС БВШН',
    heroLine1: 'Официальный Клуб',
    heroLine2: 'Настольного Тенниса',
    heroLine3: 'и Рейтинг БВШН',
    heroSubtitle:
      'Дом для каждого розыгрыша. Следите за рейтингом кампуса, выбирайте стол и соревнуйтесь с сообществом БВШН.',
    viewLeaderboardBtn: 'Таблица лидеров',
    joinWhatsappBtn: 'Сообщество в WhatsApp',
    spotlightLabel: 'ЛИДЕР РЕЙТИНГА',
    rankingLabel: 'РЕЙТИНГ',
    coachNameLine1: 'Тренер Ифтихар',
    coachNameLine2: 'Магеррамов',
    theOneToBeat: 'ГЛАВНЫЙ ФАВОРИТ',
    sec1Eyebrow: '01 / УЧАСТНИКИ',
    sec1Title: 'Таблица лидеров.',
    sec1Subtitle: 'Каждый матч имеет значение. Актуальный рейтинг ELO игроков БВШН ниже.',
    colRank: 'МЕСТО',
    colPlayer: 'ИГРОК',
    colFaculty: 'ФАКУЛЬТЕТ',
    colEquipment: 'ОСНОВАНИЕ / НАКЛАДКИ',
    colMatches: 'МАТЧИ',
    colElo: 'ОЧКИ ELO',
    sec2Eyebrow: '02 / ИГРОВОЙ ЗАЛ',
    sec2Title: 'Четыре стола. Одно сообщество.',
    sec2Subtitle: 'Ваша следующая тренировка начинается здесь. Зал открыт ежедневно с 10:00 до 21:00.',
    table1Title: 'Выделен для девушек',
    tableMenTitle: 'Юноши / Общие тренировки',
    tableWord: 'СТОЛ',
    sec3Eyebrow: '03 / ТУРНИРЫ',
    sec3Title: 'Следующий большой турнир.',
    tournEyebrow: 'ТУРНИР КАМПУСА  /  ОСЕННИЙ СЕЗОН',
    tournTitle: 'Открытый Осенний Чемпионат БВШН',
    tournDesc:
      'Общекампусный турнир на выбывание. Следите за продвижением участников по сетке к финалу.',
    bracketEyebrow: 'ТУРНИРНАЯ СЕТКА  /  ПРЕВЬЮ',
    round01: 'РАУНД 01',
    round02: 'РАУНД 02',
    final: 'ФИНАЛ',
    sec4Eyebrow: '04 / СООБЩЕСТВО',
    sec4Title: 'Твои люди. Твоя игра.',
    sec4Desc:
      'Присоединяйтесь к 100+ игрокам БВШН в WhatsApp: расписание тренировок, результаты матчей и новости турниров.',
  },
};

export default function HomePage() {
  const { locale } = useTranslation();
  const c = PAGE_COPY[locale] || PAGE_COPY.en;

  const store = BHOSDataStore.getInstance();
  const [profiles, setProfiles] = useState<PlayerProfile[]>(store.getProfiles());

  useEffect(() => {
    const update = () => {
      setProfiles(store.getProfiles());
    };
    update();
    return store.subscribe(update);
  }, [store]);

  const topPlayer = profiles[0];

  const tables = [
    {
      num: '01',
      title: c.table1Title,
      meta: `${c.tableWord} 1  •  10:00–21:00`,
      accent: 'text-[#E5B84B]',
    },
    {
      num: '02',
      title: c.tableMenTitle,
      meta: `${c.tableWord} 2  •  10:00–21:00`,
      accent: 'text-[#4E8FF7]',
    },
    {
      num: '03',
      title: c.tableMenTitle,
      meta: `${c.tableWord} 3  •  10:00–21:00`,
      accent: 'text-[#4E8FF7]',
    },
    {
      num: '04',
      title: c.tableMenTitle,
      meta: `${c.tableWord} 4  •  10:00–21:00`,
      accent: 'text-[#4E8FF7]',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-8">
      {/* HERO SECTION */}
      <section className="pt-4 sm:pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left Hero Column */}
        <div className="lg:col-span-7 space-y-5">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#4E8FF7] font-semibold">
            {c.heroEyebrow}
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-[50px] font-extrabold text-white tracking-tight leading-[1.08]">
            {c.heroLine1}
            <br />
            {c.heroLine2}
            <br />
            {c.heroLine3}
          </h1>

          <p className="text-xs sm:text-sm text-[#7E8B9F] leading-relaxed max-w-lg">
            {c.heroSubtitle}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="#leaderboard"
              className="px-5 py-2.5 rounded-full bg-[#4E8FF7] hover:bg-[#3B7DE8] text-[#071124] font-bold text-xs transition active:scale-95"
            >
              {c.viewLeaderboardBtn}
            </a>

            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-full bg-[#121721] hover:bg-[#18202F] border border-[#232D42] text-white font-semibold text-xs transition active:scale-95"
            >
              {c.joinWhatsappBtn}
            </a>
          </div>
        </div>

        {/* Right Hero Column — Top Ranked Spotlight Card */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl bg-[#121721] border border-[#1E2636] p-6 sm:p-7 flex flex-col justify-between min-h-[230px] shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-[#4E8FF7] font-semibold">
                {c.spotlightLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-[#34D399] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                {c.rankingLabel}
              </span>
            </div>

            <div className="my-4">
              <span className="text-6xl sm:text-[68px] font-black text-[#E5B84B] leading-none tracking-tight">
                01
              </span>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-base sm:text-lg font-bold text-white leading-snug">
                  {c.coachNameLine1}
                  <br />
                  {c.coachNameLine2}
                </div>
                <span className="block text-[8px] font-mono uppercase tracking-[0.16em] text-[#64748B] mt-1.5">
                  {c.theOneToBeat}
                </span>
              </div>

              <div className="text-sm sm:text-base font-mono font-extrabold text-[#E5B84B] whitespace-nowrap">
                {(topPlayer?.current_elo ?? 9999).toLocaleString()} PTS
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 01 / THE FIELD — THE LEADERBOARD */}
      <section id="leaderboard" className="space-y-5 scroll-mt-8">
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#4E8FF7] font-semibold">
            {c.sec1Eyebrow}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {c.sec1Title}
          </h2>
          <p className="text-xs sm:text-sm text-[#7E8B9F]">{c.sec1Subtitle}</p>
        </div>

        <div className="rounded-2xl bg-[#121721] border border-[#1E2636] p-3 sm:p-4 shadow-xl">
          {/* Desktop Column Headers */}
          <div className="hidden lg:grid grid-cols-12 items-center rounded-xl bg-[#171E2B] px-5 py-3 text-[9px] font-mono uppercase tracking-[0.15em] text-[#64748B] mb-2.5">
            <div className="col-span-1">{c.colRank}</div>
            <div className="col-span-3">{c.colPlayer}</div>
            <div className="col-span-3">{c.colFaculty}</div>
            <div className="col-span-3">{c.colEquipment}</div>
            <div className="col-span-1">{c.colMatches}</div>
            <div className="col-span-1 text-right">{c.colElo}</div>
          </div>

          {/* Player Rows */}
          <div className="space-y-2">
            {profiles.map((player, index) => {
              const rankNum = index + 1;
              return (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="block rounded-xl bg-[#151B26] hover:bg-[#1A2230] border border-[#1E2636] hover:border-[#2C384E] px-4 sm:px-5 py-3.5 transition"
                >
                  {/* Desktop Row (lg and up) */}
                  <div className="hidden lg:grid grid-cols-12 items-center text-xs">
                    <div className="col-span-1 font-bold text-[#E5B84B]">{rankNum}</div>
                    <div className="col-span-3 font-bold text-white">{player.full_name}</div>
                    <div className="col-span-3 text-[#64748B]">
                      {player.major_faculty || 'Not listed'}
                    </div>
                    <div className="col-span-3 text-[#64748B]">
                      {player.blade_equipment || 'Not listed'}
                    </div>
                    <div className="col-span-1 text-[#94A3B8]">{player.matches_played}</div>
                    <div className="col-span-1 text-right font-bold text-white">
                      {player.current_elo.toLocaleString()}
                    </div>
                  </div>

                  {/* Tablet & Phone Compact Row (< lg) */}
                  <div className="flex lg:hidden items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-[#E5B84B] w-4">{rankNum}</span>
                      <span className="font-bold text-white">{player.full_name}</span>
                    </div>
                    <div className="font-bold text-white">
                      {player.current_elo.toLocaleString()}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 02 / PLAY SPACE — FOUR TABLES. ONE COMMUNITY. */}
      <section id="tables" className="space-y-5 scroll-mt-8">
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#4E8FF7] font-semibold">
            {c.sec2Eyebrow}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {c.sec2Title}
          </h2>
          <p className="text-xs sm:text-sm text-[#7E8B9F]">{c.sec2Subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tables.map((tbl) => (
            <div
              key={tbl.num}
              className="rounded-2xl bg-[#121721] border border-[#1E2636] p-6 sm:p-7 space-y-2.5 shadow-lg"
            >
              <div className={`text-2xl sm:text-3xl font-extrabold ${tbl.accent}`}>{tbl.num}</div>
              <div className="text-sm sm:text-base font-bold text-white">{tbl.title}</div>
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#64748B]">
                {tbl.meta}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 03 / COMPETE — THE NEXT BIG RALLY. */}
      <section id="tournaments" className="space-y-5 scroll-mt-8">
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#4E8FF7] font-semibold">
            {c.sec3Eyebrow}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {c.sec3Title}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left Blue Tournament Card */}
          <div className="lg:col-span-6 rounded-2xl bg-[#4E8FF7] p-6 sm:p-8 flex flex-col justify-between min-h-[210px] shadow-xl">
            <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[#071124]/75 font-bold">
              {c.tournEyebrow}
            </div>

            <div className="my-4">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#071124] tracking-tight leading-tight">
                {c.tournTitle}
              </h3>
              <p className="text-xs sm:text-sm text-[#071124]/85 leading-relaxed mt-3 max-w-md">
                {c.tournDesc}
              </p>
            </div>
          </div>

          {/* Right Knockout Bracket Preview Card */}
          <div className="lg:col-span-6 rounded-2xl bg-[#121721] border border-[#1E2636] p-6 flex flex-col justify-between shadow-xl">
            <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[#4E8FF7] font-semibold">
              {c.bracketEyebrow}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center mt-4">
              {/* Round 01 */}
              <div className="space-y-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.15em] text-[#64748B]">
                  {c.round01}
                </div>
                <div className="rounded-xl bg-[#161C28] border border-[#232D42] p-3 space-y-1">
                  <div className="text-xs font-bold text-white">Seed 01</div>
                  <div className="text-[11px] text-[#64748B]">Seed 08</div>
                </div>
                <div className="rounded-xl bg-[#161C28] border border-[#232D42] p-3 space-y-1">
                  <div className="text-xs font-bold text-white">Seed 04</div>
                  <div className="text-[11px] text-[#64748B]">Seed 05</div>
                </div>
              </div>

              {/* Round 02 */}
              <div className="space-y-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.15em] text-[#64748B]">
                  {c.round02}
                </div>
                <div className="rounded-xl bg-[#161C28] border border-[#232D42] p-3 space-y-1">
                  <div className="text-xs font-bold text-white">Winner A</div>
                  <div className="text-[11px] text-[#64748B]">Winner B</div>
                </div>
              </div>

              {/* Final */}
              <div className="space-y-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.15em] text-[#E5B84B]">
                  {c.final}
                </div>
                <div className="rounded-xl bg-[#161C28] border border-[#E5B84B]/60 p-3 space-y-1">
                  <div className="text-xs font-bold text-white">Finalist 01</div>
                  <div className="text-[11px] text-[#64748B]">Finalist 02</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 / THE COMMUNITY — YOUR PEOPLE. YOUR GAME. */}
      <section id="about" className="scroll-mt-8">
        <div className="rounded-2xl bg-[#121721] border border-[#1E2636] p-7 sm:p-10 space-y-4 shadow-xl">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#4E8FF7] font-semibold">
            {c.sec4Eyebrow}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {c.sec4Title}
          </h2>

          <p className="text-xs sm:text-sm text-[#7E8B9F] max-w-xl leading-relaxed">
            {c.sec4Desc}
          </p>

          <div className="pt-1">
            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#34D399] hover:bg-[#2BB984] text-[#051B11] text-xs font-bold transition active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{c.joinWhatsappBtn}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
