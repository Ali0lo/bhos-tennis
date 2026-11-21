'use client';

import React, { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Download, Copy, Check, X } from 'lucide-react';
import ScrollLock from './ScrollLock';
import { useTranslation } from '../lib/i18n';

interface PlayerQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  playerSlug?: string | null;
  department?: string | null;
  currentElo?: number;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export default function PlayerQrModal({
  isOpen,
  onClose,
  playerId,
  playerName,
  playerSlug,
  department,
  currentElo,
}: PlayerQrModalProps) {
  const { t } = useTranslation();
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const envBase = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const baseUrl = (
    envBase ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://www.tabletennisbhos.me')
  ).replace(/\/+$/, '');
  const qrUrl = `${baseUrl}/log-match?opponentId=${encodeURIComponent(playerId)}`;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
    } catch {
      // Fallback ignored if clipboard permission denied
    }
  };

  const handleDownloadPng = () => {
    const sourceCanvas = qrContainerRef.current?.querySelector('canvas');
    if (!sourceCanvas) return;

    const safeIdentifier =
      (playerSlug || playerId)
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-|-$/g, '') || 'player';
    const filename = `bhos-match-qr-${safeIdentifier}.png`;

    let dataUrl = sourceCanvas.toDataURL('image/png');

    try {
      const cardWidth = 640;
      const cardHeight = 800;
      const cardCanvas = document.createElement('canvas');
      cardCanvas.width = cardWidth;
      cardCanvas.height = cardHeight;
      const ctx = cardCanvas.getContext('2d');

      if (ctx) {
        // Outer canvas background
        ctx.fillStyle = '#0B0F19';
        ctx.fillRect(0, 0, cardWidth, cardHeight);

        // Card container
        drawRoundedRect(ctx, 28, 28, cardWidth - 56, cardHeight - 56, 36);
        ctx.fillStyle = '#0F1623';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.stroke();

        // Top club header
        ctx.textAlign = 'center';
        ctx.fillStyle = '#22D3EE';
        ctx.font = '700 18px system-ui, -apple-system, sans-serif';
        ctx.fillText('BHOS TABLE TENNIS', cardWidth / 2, 92);

        // Athlete name
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '800 32px system-ui, -apple-system, sans-serif';
        ctx.fillText(playerName, cardWidth / 2, 140, cardWidth - 104);

        // Subtitle (department & ELO)
        const metaParts: string[] = [];
        if (department) metaParts.push(department);
        if (typeof currentElo === 'number') metaParts.push(`${currentElo} ELO`);
        if (metaParts.length > 0) {
          ctx.fillStyle = '#94A3B8';
          ctx.font = '600 18px system-ui, -apple-system, sans-serif';
          ctx.fillText(metaParts.join(' • '), cardWidth / 2, 174, cardWidth - 104);
        }

        // White QR frame
        const qrFrameSize = 440;
        const qrFrameX = (cardWidth - qrFrameSize) / 2;
        const qrFrameY = 216;
        drawRoundedRect(ctx, qrFrameX, qrFrameY, qrFrameSize, qrFrameSize, 28);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Crisp QR drawing
        const qrSize = 400;
        const qrX = (cardWidth - qrSize) / 2;
        const qrY = qrFrameY + (qrFrameSize - qrSize) / 2;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sourceCanvas, qrX, qrY, qrSize, qrSize);

        // Bottom scan hint
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '600 19px system-ui, -apple-system, sans-serif';
        ctx.fillText(
          t('profile.qr_scan_footer', 'Matç qeydiyyatı üçün skan edin'),
          cardWidth / 2,
          712,
          cardWidth - 104
        );

        dataUrl = cardCanvas.toDataURL('image/png');
      }
    } catch {
      // Fallback to raw QR canvas PNG
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-qr-modal-title"
    >
      <ScrollLock />
      <div
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#0F1623] p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <h2
              id="player-qr-modal-title"
              className="text-base font-display font-bold text-white truncate"
            >
              {t('profile.qr_modal_title', 'Sürətli Matç QR Kodu')}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('profile.qr_close', 'Bağla')}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Athlete Identity */}
        <div className="text-center space-y-0.5">
          <p className="text-lg font-display font-extrabold text-white truncate">{playerName}</p>
          {(department || typeof currentElo === 'number') && (
            <p className="text-xs text-slate-400 font-medium">
              {[department, typeof currentElo === 'number' ? `${currentElo} ELO` : null]
                .filter(Boolean)
                .join(' • ')}
            </p>
          )}
        </div>

        {/* QR Code Canvas */}
        <div className="flex justify-center">
          <div
            ref={qrContainerRef}
            className="bg-white p-4 rounded-2xl shadow-inner inline-flex items-center justify-center"
          >
            <QRCodeCanvas
              value={qrUrl}
              size={220}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#0B0F19"
            />
          </div>
        </div>

        {/* Hint */}
        <p className="text-xs text-slate-400 text-center leading-relaxed">
          {t(
            'profile.qr_modal_subtitle',
            'Rəqibiniz bu kodu skan edərək dərhal sizinlə matç qeyd edə bilər.'
          )}
        </p>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-slate-100 transition active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">{t('profile.qr_copied', 'Kopyalandı!')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span>{t('profile.qr_copy_link', 'Linki Kopyala')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('profile.qr_download_png', 'PNG Yüklə')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
