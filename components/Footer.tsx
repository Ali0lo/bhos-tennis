'use client';

import React from 'react';
import { useTranslation, Locale } from '../lib/i18n';

const FOOTER_COPY: Record<Locale, { left: string; right: string }> = {
  en: {
    left: 'BHOS / TABLE TENNIS CLUB',
    right: 'Made for the next rally. Baku, Azerbaijan.',
  },
  az: {
    left: 'BANM / STOLÜSTÜ TENNİS KLUBU',
    right: 'Növbəti ralli üçün yaradılıb. Bakı, Azərbaycan.',
  },
  ru: {
    left: 'БВШН / КЛУБ НАСТОЛЬНОГО ТЕННИСА',
    right: 'Создано для следующего розыгрыша. Баку, Азербайджан.',
  },
};

export default function Footer() {
  const { locale } = useTranslation();
  const c = FOOTER_COPY[locale] || FOOTER_COPY.en;

  return (
    <footer className="w-full max-w-[1060px] mx-auto px-4 sm:px-6 pt-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <span className="font-extrabold tracking-tight text-white uppercase">{c.left}</span>
        <span className="text-[#64748B]">{c.right}</span>
      </div>
    </footer>
  );
}
