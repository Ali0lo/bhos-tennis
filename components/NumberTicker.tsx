'use client';

import React, { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion';

export interface NumberTickerProps {
  value: number;
  direction?: 'up' | 'down';
  className?: string;
  delay?: number;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
}
