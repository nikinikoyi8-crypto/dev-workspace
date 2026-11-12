import { canonicalizeUserKey } from '@/services/storyService';
import type { Story } from '@/services/storyService';

export interface DemoArtist {
  id: string;
  ownerId: string;
  handle: string;
  username: string;
  displayName: string;
  gradient: [string, string, string];
  initials: string;
}

export const DEMO_ARTISTS: DemoArtist[] = [
  { id: 'mara', ownerId: 'maravoss', handle: 'maravoss', username: 'Mara Voss', displayName: 'Mara Voss', gradient: ['#e98b6e', '#8b4b78', '#312344'], initials: 'MV' },
  { id: 'kenji', ownerId: 'kenji.arai', handle: 'kenji.arai', username: 'Kenji Arai', displayName: 'Kenji Arai', gradient: ['#55c6ba', '#3d5c9c', '#191b36'], initials: 'KA' },
  { id: 'lina', ownerId: 'linapaints', handle: 'linapaints', username: 'Lina Park', displayName: 'Lina Park', gradient: ['#d1a769', '#a25270', '#291e38'], initials: 'LP' },
  { id: 'theo', ownerId: 'theom', handle: 'theom', username: 'Theo Martin', displayName: 'Theo Martin', gradient: ['#81b8ad', '#477a85', '#26334e'], initials: 'TM' },
  { id: 'yuki', ownerId: 'yukitanaka', handle: 'yukitanaka', username: 'Yuki Tanaka', displayName: 'Yuki Tanaka', gradient: ['#d963a3', '#6d49ba', '#1b2046'], initials: 'YT' },
  { id: 'aria', ownerId: 'ariasole', handle: 'ariasole', username: 'Aria Solé', displayName: 'Aria Solé', gradient: ['#edb56f', '#b86452', '#3a2847'], initials: 'AS' },
];

const DEMO_CREATED_AT = Date.now();

function artSvg(artist: DemoArtist, index: number): string {
  const [first, second, third] = artist.gradient;
  const art = index % 2 === 0
    ? `<circle cx="450" cy="720" r="280" fill="url(#glow)"/><path d="M0 1120 Q230 760 470 1090 T900 1010 V1600 H0Z" fill="${second}" opacity=".72"/><path d="M100 560 C260 350 380 480 490 670 S710 870 820 520" fill="none" stroke="${first}" stroke-width="34" stroke-linecap="round" opacity=".86"/>`
    : `<rect x="128" y="380" width="620" height="760" rx="310" fill="url(#glow)" opacity=".72"/><path d="M180 1180 L460 440 L740 1180Z" fill="${first}" opacity=".65"/><circle cx="460" cy="860" r="138" fill="${third}" stroke="${first}" stroke-width="18"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1600"><defs><linearGradient id="wash" x2=".9" y2="1"><stop stop-color="${first}"/><stop offset=".48" stop-color="${second}"/><stop offset="1" stop-color="${third}"/></linearGradient><radialGradient id="glow"><stop stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="${first}" stop-opacity="0"/></radialGradient></defs><rect width="900" height="1600" fill="url(#wash)"/>${art}<text x="72" y="1450" fill="#fff" opacity=".86" font-family="Georgia,serif" font-size="36">${artist.displayName}</text><text x="74" y="1500" fill="#fff" opacity=".65" font-family="sans-serif" font-size="17" letter-spacing="5">STUDIO NOTE · ${index === 0 ? '01' : '02'}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function artistAvatar(artist: DemoArtist): string {
  const [first, second] = artist.gradient;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="a" x2="1" y2="1"><stop stop-color="${first}"/><stop offset="1" stop-color="${second}"/></linearGradient></defs><rect width="96" height="96" rx="48" fill="url(#a)"/><circle cx="48" cy="38" r="17" fill="#f5ded1"/><path d="M15 91c3-23 15-34 33-34s30 11 33 34" fill="#282138"/><text x="48" y="91" fill="white" font-size="9" text-anchor="middle" font-family="sans-serif">${artist.initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function demoStoriesFor(artist: DemoArtist, t: (key: string) => string): Story[] {
  return [0, 1].map((index): Story => ({
    id: `demo-${artist.id}-${index}`,
    ownerId: canonicalizeUserKey(artist.ownerId),
    username: canonicalizeUserKey(artist.handle),
    mediaUrl: artSvg(artist, index),
    type: 'image',
    caption: t(index === 0 ? 'stories.viewer.sampleCaptionStudy' : 'stories.viewer.sampleCaptionDetail'),
    audience: 'everyone',
    moodFilter: index === 0 ? 'warm' : 'none',
    frame: index === 0 ? 'gallery' : 'paper',
    artistName: artist.displayName,
    artistAvatarUrl: artistAvatar(artist),
    artistProfileUrl: `/artist/${canonicalizeUserKey(artist.handle)}`,
    palette: artist.gradient,
    viewers: [],
    viewCount: 0,
    likeCount: 0,
    createdAt: DEMO_CREATED_AT - (2 - index) * 60_000,
    expiresAt: DEMO_CREATED_AT + 22 * 60 * 60_000,
  }));
}

export function getDemoStories(t: (key: string) => string): Story[] {
  return DEMO_ARTISTS.flatMap((artist) => demoStoriesFor(artist, t));
}
