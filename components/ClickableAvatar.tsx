'use client';

import React, { useState } from 'react';
import AvatarLightboxModal from './AvatarLightboxModal';

interface ClickableAvatarProps {
  avatarUrl?: string | null;
  name: string;
  department?: string | null;
  rating?: number | null;
  /** Classes applied to the <img> element */
  imgClassName?: string;
  /** Rendered when no avatar image exists (not clickable) */
  fallback?: React.ReactNode;
}

/**
 * Avatar image that opens a zoom lightbox on click.
 * Uses span[role=button] so it can safely live inside links / table rows.
 */
export default function ClickableAvatar({
  avatarUrl,
  name,
  department,
  rating,
  imgClassName = 'w-full h-full object-cover',
  fallback = null,
}: ClickableAvatarProps) {
  const [open, setOpen] = useState(false);

  if (!avatarUrl) return <>{fallback}</>;

  const openLightbox = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label={`${name} şəklini böyüt`}
        title="Şəkli böyüt"
        onClick={openLightbox}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') openLightbox(e);
        }}
        className="block w-full h-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-[inherit]"
      >
        <img src={avatarUrl} alt={name} className={imgClassName} />
      </span>
      <AvatarLightboxModal
        isOpen={open}
        onClose={() => setOpen(false)}
        imageUrl={avatarUrl}
        name={name}
        department={department}
        rating={rating}
      />
    </>
  );
}
