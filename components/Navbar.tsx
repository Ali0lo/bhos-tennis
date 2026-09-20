'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useI18n, SupportedLocale } from '@/lib/i18n';

export default function Navbar() {
  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto backdrop-blur-md bg-black/40 border border-white/10 rounded-full px-6 py-3 shadow-2xl">
      </nav>
    </header>
  );
}
