export const SOCIAL_PLATFORMS = [
  'TikTok',
  'Instagram',
  'Twitter / X',
  'Telegram',
  'YouTube',
  'Website',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type SocialLink = { label: string; url: string };

const PLATFORM_HOSTS: Record<Exclude<SocialPlatform, 'Website'>, string[]> = {
  TikTok: ['tiktok.com', 'www.tiktok.com'],
  Instagram: ['instagram.com', 'www.instagram.com'],
  'Twitter / X': ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  Telegram: ['t.me', 'telegram.me', 'telegram.org', 'www.telegram.org'],
  YouTube: ['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be'],
};

export function isSupportedSocialPlatform(label: string): label is SocialPlatform {
  return SOCIAL_PLATFORMS.includes(label as SocialPlatform);
}

export function normalizeSocialLinks(socials: SocialLink[]): SocialLink[] {
  const used = new Set<string>();
  return socials.filter((social) => {
    if (!isSupportedSocialPlatform(social.label) || used.has(social.label)) return false;
    used.add(social.label);
    return true;
  });
}

export function validateSocialLink(label: string, url: string): string | undefined {
  if (!label && !url.trim()) return undefined;
  if (!isSupportedSocialPlatform(label)) return 'Select a supported platform.';
  if (!url.trim()) return 'Enter one link for this platform.';
  if (/\s/.test(url.trim()) || (url.match(/https?:\/\//gi) || []).length > 1) return 'Enter only one link.';

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return 'Enter a valid URL starting with https://.';
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return 'Enter a valid URL starting with https://.';
  if (label === 'Website') return undefined;

  const hosts = PLATFORM_HOSTS[label];
  if (!hosts.some((host) => parsed.hostname.toLowerCase() === host)) return `Use a ${label} link.`;
  return undefined;
}

export function validateSocialLinks(socials: SocialLink[]): Record<number, string> {
  const errors: Record<number, string> = {};
  socials.forEach((social, index) => {
    const error = validateSocialLink(social.label, social.url);
    if (error) errors[index] = error;
  });
  return errors;
}