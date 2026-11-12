import {
  PenTool, Brush, Pencil, Layers, Users, User, BookOpen, BookImage, Smile,
  Grid3x3, Box, Boxes, Gem, Disc, Wine, Hammer, Wrench, Crown, Shirt, Grid2x2,
  Type, Palette, Layout, MousePointer, Sparkles, Film, Video, Camera, Plane,
  Clapperboard, Mic2, Music, Music2, Headphones, Piano, Guitar, AudioLines, Drum,
  PersonStanding, Drama, Feather, BookText, Quote, Sticker, Brush as BrushAlt,
  Flower, Building2, Sofa, Package, Gamepad2, Mountain, Cpu, Coins, Palette as PaletteAlt,
  Layers2, SprayCan, Printer, FlaskConical, FileText, ScrollText, ToyBrick, MoreHorizontal,
} from 'lucide-react';
import type { ArtCategory } from '@/types';

const GROUPS: Record<string, string[]> = {
  'Visual Arts': ['painter', 'illustrator', 'sketch', 'comic', 'manga', 'cartoonist', 'traditional', 'mixed-media', 'street', 'mural', 'printmaker', 'miniature'],
  'Digital & New Media': ['digital', 'concept', 'character', 'pixel', '3d-artist', '3d-modeler', 'ai-artist', 'nft'],
  Photography: ['photographer', 'drone'],
  'Film & Video': ['videographer', 'cinematographer', 'film-director', 'video-editor', 'animator', 'vfx'],
  'Writing & Literature': ['screenwriter', 'poet', 'writer', 'novelist', 'storyteller'],
  'Performing Arts': ['actor', 'voice-actor', 'theatre', 'dancer', 'choreographer', 'performance', 'puppet'],
  'Music & Sound': ['musician', 'singer', 'songwriter', 'composer', 'producer', 'dj', 'instrumentalist', 'pianist', 'guitarist', 'violinist', 'drummer'],
  'Sculpture & 3D Crafts': ['sculptor', 'ceramic', 'potter', 'glass', 'wood', 'metal', 'resin', 'paper', 'origami', 'leather', 'miniature', 'toy-designer'],
  'Fashion & Textile': ['fashion', 'textile', 'embroidery', 'jewelry', 'tattoo', 'makeup', 'nail'],
  'Architecture & Spatial Arts': ['architect', 'interior', 'industrial', 'product', 'environment', 'floral'],
  'Graphic & Communication Arts': ['calligraphy', 'typography', 'graphic', 'logo', 'ui', 'ux'],
  'Games & Interactive': ['game-artist', 'level-designer', 'game-animator'],
};

const groupFor = (id: string) => Object.entries(GROUPS).find(([, ids]) => ids.includes(id))?.[0] || 'Visual Arts';

const ART_CATEGORIES_RAW: ArtCategory[] = [
  { id: 'digital', label: 'Digital Artist', icon: PenTool },
  { id: 'painter', label: 'Painter', icon: Brush },
  { id: 'illustrator', label: 'Illustrator', icon: Pencil },
  { id: 'sketch', label: 'Sketch Artist', icon: Pencil },
  { id: 'concept', label: 'Concept Artist', icon: Layers },
  { id: 'character', label: 'Character Designer', icon: Users },
  { id: 'comic', label: 'Comic Artist', icon: BookOpen },
  { id: 'manga', label: 'Manga Artist', icon: BookImage },
  { id: 'cartoonist', label: 'Cartoonist', icon: Smile },
  { id: 'pixel', label: 'Pixel Artist', icon: Grid3x3 },
  { id: '3d-artist', label: '3D Artist', icon: Box },
  { id: '3d-modeler', label: '3D Modeler', icon: Boxes },
  { id: 'sculptor', label: 'Sculptor', icon: Gem },
  { id: 'ceramic', label: 'Ceramic Artist', icon: Disc },
  { id: 'potter', label: 'Potter', icon: Disc },
  { id: 'glass', label: 'Glass Artist', icon: Wine },
  { id: 'wood', label: 'Wood Artist', icon: Hammer },
  { id: 'metal', label: 'Metal Artist', icon: Wrench },
  { id: 'jewelry', label: 'Jewelry Designer', icon: Crown },
  { id: 'fashion', label: 'Fashion Designer', icon: Shirt },
  { id: 'textile', label: 'Textile Artist', icon: Grid2x2 },
  { id: 'embroidery', label: 'Embroidery Artist', icon: Grid2x2 },
  { id: 'calligraphy', label: 'Calligrapher', icon: Type },
  { id: 'typography', label: 'Typographer', icon: Type },
  { id: 'graphic', label: 'Graphic Designer', icon: Palette },
  { id: 'logo', label: 'Logo Designer', icon: Palette },
  { id: 'ui', label: 'UI Designer', icon: Layout },
  { id: 'ux', label: 'UX Designer', icon: MousePointer },
  { id: 'motion', label: 'Motion Designer', icon: Sparkles },
  { id: 'animator', label: 'Animator', icon: Film },
  { id: 'vfx', label: 'VFX Artist', icon: Sparkles },
  { id: 'video-editor', label: 'Video Editor', icon: Video },
  { id: 'photographer', label: 'Photographer', icon: Camera },
  { id: 'drone', label: 'Drone Photographer', icon: Plane },
  { id: 'videographer', label: 'Videographer', icon: Video },
  { id: 'cinematographer', label: 'Cinematographer', icon: Clapperboard },
  { id: 'film-director', label: 'Film Director', icon: Clapperboard },
  { id: 'screenwriter', label: 'Screenwriter', icon: Feather },
  { id: 'actor', label: 'Actor', icon: User },
  { id: 'voice-actor', label: 'Voice Actor', icon: Mic2 },
  { id: 'theatre', label: 'Theatre Artist', icon: Drama },
  { id: 'musician', label: 'Musician', icon: Music },
  { id: 'singer', label: 'Singer', icon: Mic2 },
  { id: 'songwriter', label: 'Songwriter', icon: Music2 },
  { id: 'composer', label: 'Composer', icon: Music2 },
  { id: 'producer', label: 'Music Producer', icon: Headphones },
  { id: 'dj', label: 'DJ', icon: Headphones },
  { id: 'instrumentalist', label: 'Instrumentalist', icon: Music },
  { id: 'pianist', label: 'Pianist', icon: Piano },
  { id: 'guitarist', label: 'Guitarist', icon: Guitar },
  { id: 'violinist', label: 'Violinist', icon: AudioLines },
  { id: 'drummer', label: 'Drummer', icon: Drum },
  { id: 'dancer', label: 'Dancer', icon: PersonStanding },
  { id: 'choreographer', label: 'Choreographer', icon: PersonStanding },
  { id: 'performance', label: 'Performance Artist', icon: Drama },
  { id: 'poet', label: 'Poet', icon: Feather },
  { id: 'writer', label: 'Writer', icon: BookText },
  { id: 'novelist', label: 'Novelist', icon: BookText },
  { id: 'storyteller', label: 'Storyteller', icon: Quote },
  { id: 'tattoo', label: 'Tattoo Artist', icon: Sticker },
  { id: 'makeup', label: 'Makeup Artist', icon: BrushAlt },
  { id: 'nail', label: 'Nail Artist', icon: BrushAlt },
  { id: 'floral', label: 'Floral Artist', icon: Flower },
  { id: 'architect', label: 'Architect', icon: Building2 },
  { id: 'interior', label: 'Interior Designer', icon: Sofa },
  { id: 'industrial', label: 'Industrial Designer', icon: Package },
  { id: 'product', label: 'Product Designer', icon: Package },
  { id: 'game-artist', label: 'Game Artist', icon: Gamepad2 },
  { id: 'environment', label: 'Environment Artist', icon: Mountain },
  { id: 'level-designer', label: 'Level Designer', icon: Gamepad2 },
  { id: 'game-animator', label: 'Game Animator', icon: Gamepad2 },
  { id: 'ai-artist', label: 'AI Artist', icon: Cpu },
  { id: 'nft', label: 'NFT Artist', icon: Coins },
  { id: 'traditional', label: 'Traditional Artist', icon: PaletteAlt },
  { id: 'mixed-media', label: 'Mixed Media Artist', icon: Layers2 },
  { id: 'street', label: 'Street Artist', icon: SprayCan },
  { id: 'mural', label: 'Mural Artist', icon: SprayCan },
  { id: 'printmaker', label: 'Printmaker', icon: Printer },
  { id: 'resin', label: 'Resin Artist', icon: FlaskConical },
  { id: 'paper', label: 'Paper Artist', icon: FileText },
  { id: 'origami', label: 'Origami Artist', icon: ScrollText },
  { id: 'leather', label: 'Leather Artist', icon: Hammer },
  { id: 'miniature', label: 'Miniature Artist', icon: Gem },
  { id: 'toy-designer', label: 'Toy Designer', icon: ToyBrick },
  { id: 'puppet', label: 'Puppet Artist', icon: MoreHorizontal },
];

export const ART_CATEGORIES: ArtCategory[] = ART_CATEGORIES_RAW.map((category) => ({ ...category, group: groupFor(category.id) }));
export const ART_DISCIPLINES = ART_CATEGORIES;

export interface PracticeQuestion {
  id: string;
  label: string;
  options: string[];
}

const GROUP_PRACTICE_QUESTIONS: Record<string, PracticeQuestion[]> = {
  'Visual Arts': [
    { id: 'visual-create', label: 'What do you create?', options: ['Portraits', 'Landscapes', 'Abstract', 'Still Life', 'Conceptual', 'Figurative', 'Experimental', 'Other'] },
    { id: 'visual-mediums', label: 'What mediums do you use?', options: ['Oil', 'Acrylic', 'Watercolor', 'Gouache', 'Ink', 'Pastel', 'Charcoal', 'Mixed Media', 'Digital', 'Other'] },
  ],
  'Digital & New Media': [
    { id: 'digital-create', label: 'What do you create?', options: ['Digital Painting', 'Concept Art', 'Character Art', 'Environment Art', 'Pixel Art', '3D Models', '3D Sculpts', 'Generative/AI Art', 'Other'] },
    { id: 'digital-tools', label: 'What tools/software do you use?', options: ['Photoshop', 'Procreate', 'Blender', 'ZBrush', 'Clip Studio Paint', 'Substance Painter', 'Midjourney/AI tools', 'Other'] },
  ],
  Photography: [
    { id: 'photo-subjects', label: 'What do you photograph?', options: ['People', 'Fashion', 'Nature', 'Architecture', 'Street', 'Products', 'Events', 'Wildlife', 'Fine Art', 'Astro', 'Macro', 'Other'] },
  ],
  'Film & Video': [
    { id: 'film-create', label: 'What do you create?', options: ['Short Films', 'Documentaries', 'Animation', 'Music Videos', 'Commercials', 'VFX Sequences', 'Stop Motion', 'Experimental Film', 'Other'] },
    { id: 'film-role', label: "What's your role?", options: ['Director', 'Cinematographer', 'Editor', 'Screenwriter', 'Animator', 'VFX Artist', 'Other'] },
  ],
  'Writing & Literature': [
    { id: 'writing-create', label: 'What do you write?', options: ['Poetry', 'Fiction', 'Short Stories', 'Novels', 'Essays', 'Screenplays', 'Comics/Graphic Novels', 'Journalism', 'Other'] },
  ],
  'Performing Arts': [
    { id: 'performing-discipline', label: "What's your discipline?", options: ['Acting', 'Theater', 'Ballet', 'Contemporary Dance', 'Hip-Hop Dance', 'Traditional Dance', 'Choreography', 'Performance Art', 'Circus Arts', 'Other'] },
  ],
  'Music & Sound': [
    { id: 'music-create', label: 'What do you create?', options: ['Songs', 'Compositions', 'Beats', 'Sound Design', 'Scores', 'Live Performances', 'Remixes', 'Other'] },
    { id: 'music-genres', label: 'What genres do you work in?', options: ['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical', 'Folk', 'R&B', 'Other'] },
  ],
  'Sculpture & 3D Crafts': [
    { id: 'craft-materials', label: 'What do you work with?', options: ['Clay/Ceramic', 'Wood', 'Metal', 'Stone', 'Glass', 'Resin', 'Paper', 'Mixed Materials', 'Other'] },
    { id: 'craft-create', label: 'What do you create?', options: ['Figurative Sculpture', 'Abstract Sculpture', 'Functional Pottery', 'Installation Art', 'Jewelry-Scale Work', 'Other'] },
  ],
  'Fashion & Textile': [
    { id: 'fashion-create', label: 'What do you create?', options: ['Clothing/Garments', 'Textile Art', 'Embroidery', 'Knitwear', 'Jewelry', 'Accessories', 'Costume Design', 'Other'] },
    { id: 'fashion-focus', label: "What's your focus?", options: ['Design', 'Production/Making', 'Styling', 'Custom Commissions', 'Other'] },
  ],
  'Architecture & Spatial Arts': [
    { id: 'spatial-design', label: 'What do you design?', options: ['Residential Spaces', 'Commercial Spaces', 'Furniture', 'Product Design', 'Landscape/Garden Design', 'Exhibition/Set Design', 'Other'] },
  ],
  'Graphic & Communication Arts': [
    { id: 'graphic-create', label: 'What do you create?', options: ['Branding/Logos', 'Posters', 'Typography', 'Editorial Design', 'Packaging', 'UI Design', 'UX Design', 'Motion Graphics', 'Other'] },
  ],
  'Games & Interactive': [
    { id: 'games-role', label: "What's your role?", options: ['Game Art', 'Character Design', 'Environment Design', 'Level Design', 'Game Animation', 'UI/UX for Games', 'Concept Art for Games', 'Other'] },
  ],
};

export const PRACTICE_QUESTIONS: Record<string, PracticeQuestion[]> = Object.fromEntries(
  ART_CATEGORIES.map((discipline) => [discipline.id, GROUP_PRACTICE_QUESTIONS[discipline.group || 'Visual Arts']]),
);

export const PRACTICE_GROUP_QUESTIONS = GROUP_PRACTICE_QUESTIONS;

export const FALLBACK_PRACTICE_QUESTIONS: PracticeQuestion[] = [
  { id: 'general-practice', label: 'What best describes your work?', options: ['Beginner', 'Hobbyist', 'Professional', 'Other'] },
];

export const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'Italy', 'Spain', 'Netherlands', 'Sweden', 'Japan', 'South Korea', 'China',
  'India', 'Brazil', 'Mexico', 'Argentina', 'South Africa', 'Nigeria', 'Egypt',
  'UAE', 'Saudi Arabia', 'Turkey', 'Russia', 'Poland', 'Norway', 'Finland',
  'Denmark', 'Switzerland', 'Austria', 'Belgium', 'Portugal', 'Greece',
  'Singapore', 'Malaysia', 'Indonesia', 'Philippines', 'Thailand', 'Vietnam',
  'New Zealand', 'Ireland', 'Israel', 'Chile', 'Colombia', 'Peru', 'Kenya',
  'Morocco', 'Pakistan', 'Bangladesh', 'Other',
];
