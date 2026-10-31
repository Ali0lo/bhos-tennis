export function escapeHtmlEntities(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripDangerousMarkup(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*(iframe|object|embed|style|link|meta|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/(javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, '')
    .replace(/\bon[a-z]+\s*=/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function sanitizePlayerName(input: string, maxLength: number = 80): string {
  const cleaned = stripDangerousMarkup(input)
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, maxLength);
}

export function sanitizeTextInput(input: string, maxLength: number = 250): string {
  const cleaned = stripDangerousMarkup(input)
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, maxLength);
}

export function sanitizeMultilineText(input: string, maxLength: number = 2000): string {
  const cleaned = stripDangerousMarkup(input)
    .replace(/[<>]/g, '')
    .trim();
  return cleaned.slice(0, maxLength);
}

export function sanitizeSafeAvatarUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('/images/')) {
    return trimmed.replace(/[<>"'`]/g, '');
  }

  if (/^data:image\/(jpeg|jpg|png|webp);base64,[a-zA-Z0-9+/=\s]+$/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}
