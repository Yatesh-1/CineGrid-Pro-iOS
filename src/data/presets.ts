import type { CompositionPreset, CameraFilter } from '../types/camera';

// SVG Data URLs for crisp, self-contained visual preset thumbnails
const createThumbSvg = (title: string, sub: string, bgGrad: string, gridLines: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        ${bgGrad}
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="16" fill="url(#g)"/>
    ${gridLines}
    <rect y="112" width="160" height="48" fill="rgba(0,0,0,0.55)" rx="0"/>
    <text x="80" y="132" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="middle">${title}</text>
    <text x="80" y="146" fill="#facc15" font-family="system-ui, sans-serif" font-weight="500" font-size="10" text-anchor="middle">${sub}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const COMPOSITION_PRESETS: CompositionPreset[] = [
  {
    id: 'name_raw',
    name: 'Raw Focus',
    category: 'all',
    gridType: 'none',
    description: 'Clean full-frame viewfinder without overlay guides for unobstructed viewing.',
    recommendedSubject: 'Spontaneous candid moments & minimalist frames',
    thumbnail: createThumbSvg('Raw View', 'Clear Frame', '<stop offset="0%" stop-color="#374151"/><stop offset="100%" stop-color="#1f2937"/>', ''),
    proTip: 'Use when you want absolute zero distraction to capture fleeting moments.'
  },
  {
    id: 'travel',
    name: 'Travel & Horizon',
    category: 'travel',
    gridType: 'rule_of_thirds',
    description: 'Rule of Thirds tailored for travel, placing horizon along the lower third and destination subject on vertical intersection.',
    recommendedSubject: 'Coastlines, pathways, monuments, street explorers',
    thumbnail: createThumbSvg('Travel', 'Rule of 3rds', '<stop offset="0%" stop-color="#0284c7"/><stop offset="50%" stop-color="#0d9488"/><stop offset="100%" stop-color="#15803d"/>', `
      <line x1="53.3" y1="0" x2="53.3" y2="160" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
      <line x1="106.6" y1="0" x2="106.6" y2="160" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
      <line x1="0" y1="53.3" x2="160" y2="53.3" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
      <line x1="0" y1="106.6" x2="160" y2="106.6" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
      <circle cx="53.3" cy="53.3" r="4" fill="#facc15"/>
      <circle cx="106.6" cy="53.3" r="4" fill="#facc15"/>
    `),
    proTip: 'Place sea or road along the bottom third; allow the sky or backdrop to occupy the top two thirds.',
    isFavorite: true
  },
  {
    id: 'two_thirds',
    name: '2/3 Upper Focus',
    category: 'landscape',
    gridType: 'rule_of_thirds_top',
    description: 'Emphasizes the upper two-thirds, ideal when dramatic sky, mountain peaks or elevated towers command the frame.',
    recommendedSubject: 'Lighthouses, skyscrapers, dramatic clouds, towering trees',
    thumbnail: createThumbSvg('2/3 Ratio', 'Sky & Height', '<stop offset="0%" stop-color="#1e3a8a"/><stop offset="50%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#10b981"/>', `
      <line x1="0" y1="106.6" x2="160" y2="106.6" stroke="#facc15" stroke-width="2.5"/>
      <line x1="80" y1="0" x2="80" y2="160" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-dasharray="4 4"/>
      <circle cx="80" cy="53.3" r="5" fill="#facc15"/>
    `),
    proTip: 'Give 66% of the frame to the upper spectacle and anchor with ground in the bottom 33%.'
  },
  {
    id: 'one_third',
    name: '1/3 Ground Focus',
    category: 'landscape',
    gridType: 'rule_of_thirds_bottom',
    description: 'Ground emphasis where textures, reflections, bridges and floral foregrounds dominate 2/3 of frame.',
    recommendedSubject: 'Bridges, reflection pools, blooming fields, city street reflections',
    thumbnail: createThumbSvg('1/3 Ratio', 'Foreground', '<stop offset="0%" stop-color="#60a5fa"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/>', `
      <line x1="0" y1="53.3" x2="160" y2="53.3" stroke="#facc15" stroke-width="2.5"/>
      <line x1="80" y1="0" x2="80" y2="160" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-dasharray="4 4"/>
      <circle cx="80" cy="106.6" r="5" fill="#facc15"/>
    `),
    proTip: 'Get low to the ground to exaggerate leading textures while maintaining a subtle horizon line.'
  },
  {
    id: 'center',
    name: 'Center & Symmetry',
    category: 'architecture',
    gridType: 'center_symmetry',
    description: 'Perfect geometric crosshair and concentric bullseye for symmetrical architecture, corridors, and minimal objects.',
    recommendedSubject: 'Cathedral arches, spiral staircases, coffee art, portraits looking into lens',
    thumbnail: createThumbSvg('Center', 'Symmetry', '<stop offset="0%" stop-color="#18181b"/><stop offset="50%" stop-color="#27272a"/><stop offset="100%" stop-color="#3f3f46"/>', `
      <circle cx="80" cy="80" r="36" fill="none" stroke="#facc15" stroke-width="2"/>
      <circle cx="80" cy="80" r="14" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
      <line x1="80" y1="20" x2="80" y2="140" stroke="#facc15" stroke-width="1.5"/>
      <line x1="20" y1="80" x2="140" y2="80" stroke="#facc15" stroke-width="1.5"/>
    `),
    proTip: 'Stand dead-center. Align vertical architectural pillars with the crosshair for hypnotic symmetry.'
  },
  {
    id: 'golden_ratio',
    name: 'Golden Ratio (Phi)',
    category: 'architecture',
    gridType: 'golden_ratio',
    description: 'Proportions based on the divine phi proportion 1 : 0.618 : 1 (lines at 38.2% and 61.8%). Creates a tighter, more harmonious harmony than standard thirds.',
    recommendedSubject: 'Classical architecture, fine art portraits, natural patterns',
    thumbnail: createThumbSvg('Golden Phi', '1 : 1.618', '<stop offset="0%" stop-color="#854d0e"/><stop offset="50%" stop-color="#ca8a04"/><stop offset="100%" stop-color="#eab308"/>', `
      <line x1="61.1" y1="0" x2="61.1" y2="160" stroke="#fef08a" stroke-width="2"/>
      <line x1="98.9" y1="0" x2="98.9" y2="160" stroke="#fef08a" stroke-width="2"/>
      <line x1="0" y1="61.1" x2="160" y2="61.1" stroke="#fef08a" stroke-width="2"/>
      <line x1="0" y1="98.9" x2="160" y2="98.9" stroke="#fef08a" stroke-width="2"/>
      <circle cx="61.1" cy="61.1" r="4.5" fill="#ffffff"/>
      <circle cx="98.9" cy="61.1" r="4.5" fill="#ffffff"/>
      <circle cx="61.1" cy="98.9" r="4.5" fill="#ffffff"/>
      <circle cx="98.9" cy="98.9" r="4.5" fill="#ffffff"/>
    `),
    proTip: 'The human eye naturally rests at phi intersections. Place your main emotional anchor on one of the four phi nodes.'
  },
  {
    id: 'golden_spiral',
    name: 'Fibonacci Spiral',
    category: 'cinematic',
    gridType: 'golden_spiral',
    description: 'The golden spiral naturally directs the viewer’s eye along an organic sweeping curve into the focal focal point.',
    recommendedSubject: 'Curved staircases, waves, portraits with gaze direction, sweeping road curves',
    thumbnail: createThumbSvg('Spiral', 'Fibonacci Flow', '<stop offset="0%" stop-color="#4c1d95"/><stop offset="50%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#a855f7"/>', `
      <path d="M 140 140 A 120 120 0 0 0 20 140 A 80 80 0 0 1 100 60 A 50 50 0 0 0 100 110 A 30 30 0 0 1 70 110 A 18 18 0 0 0 88 92" fill="none" stroke="#facc15" stroke-width="2.5"/>
      <circle cx="88" cy="92" r="5" fill="#ffffff"/>
    `),
    proTip: 'Position the eye of the spiral over the emotional climax (e.g., subject’s eyes or peak of the wave).'
  },
  {
    id: 'golden_triangles',
    name: 'Golden Triangles',
    category: 'travel',
    gridType: 'golden_triangles',
    description: 'Dynamic diagonal partition cutting the frame corner-to-corner with perpendicular intersecting right angles.',
    recommendedSubject: 'Mountain ridges, winding staircases, motion, athletic portraits, dynamic street scenes',
    thumbnail: createThumbSvg('Triangles', 'Dynamic Angles', '<stop offset="0%" stop-color="#991b1b"/><stop offset="50%" stop-color="#dc2626"/><stop offset="100%" stop-color="#f97316"/>', `
      <line x1="0" y1="160" x2="160" y2="0" stroke="#facc15" stroke-width="2"/>
      <line x1="0" y1="0" x2="96" y2="64" stroke="#facc15" stroke-width="2"/>
      <line x1="160" y1="160" x2="64" y2="96" stroke="#facc15" stroke-width="2"/>
      <circle cx="96" cy="64" r="4.5" fill="#ffffff"/>
      <circle cx="64" cy="96" r="4.5" fill="#ffffff"/>
    `),
    proTip: 'Use when the subject contains strong diagonal energy (e.g. arms raised, mountain slopes, or leaning buildings).'
  },
  {
    id: 'portrait_headroom',
    name: 'Portrait & Headroom',
    category: 'portrait',
    gridType: 'portrait_headroom',
    description: 'Professional portrait guide with upper eye-line level, face silhouette boundary, and optimal headroom marker.',
    recommendedSubject: 'Editorial portraits, headshots, candid street character profiles',
    thumbnail: createThumbSvg('Portrait', 'Eye-Line & Head', '<stop offset="0%" stop-color="#831843"/><stop offset="50%" stop-color="#db2777"/><stop offset="100%" stop-color="#fb7185"/>', `
      <line x1="0" y1="56" x2="160" y2="56" stroke="#facc15" stroke-width="2"/>
      <ellipse cx="80" cy="72" rx="30" ry="40" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.8" stroke-dasharray="5 3"/>
      <circle cx="68" cy="64" r="3" fill="#facc15"/>
      <circle cx="92" cy="64" r="3" fill="#facc15"/>
      <path d="M 50 145 C 50 115 110 115 110 145" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
    `),
    proTip: 'Keep the subject’s dominant eye along the gold eye-line for instant cinematic connection and presence.'
  },
  {
    id: 'dynamic_symmetry',
    name: 'Dynamic Harmonic Armature',
    category: 'cinematic',
    gridType: 'dynamic_symmetry',
    description: 'Baroque and sinister diagonal armature used by Renaissance masters and master cinema directors.',
    recommendedSubject: 'Multi-character cinematic scenes, layered street compositions, fine art framing',
    thumbnail: createThumbSvg('Cinema', 'Harmonic Grid', '<stop offset="0%" stop-color="#064e3b"/><stop offset="50%" stop-color="#059669"/><stop offset="100%" stop-color="#34d399"/>', `
      <line x1="0" y1="0" x2="160" y2="160" stroke="#facc15" stroke-width="1.5"/>
      <line x1="160" y1="0" x2="0" y2="160" stroke="#facc15" stroke-width="1.5"/>
      <line x1="80" y1="0" x2="80" y2="160" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
      <line x1="0" y1="80" x2="160" y2="80" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
      <line x1="0" y1="80" x2="80" y2="0" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
      <line x1="80" y1="160" x2="160" y2="80" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
    `),
    proTip: 'Align multiple elements along the intersecting diagonal vectors to create rhythm and depth in complex scenes.'
  }
];

export const FILM_LOOK_CATEGORIES = [
  'All Looks',
  'Clean Digital',
  'Kodak Inspired',
  'Fuji Inspired',
  'Cinematic',
  'Vintage',
  'Black & White',
  'Creative',
] as const;

export const CAMERA_FILTERS: CameraFilter[] = [
  // 1. Clean Digital
  {
    id: 'none',
    name: 'Clean Raw',
    subtitle: 'True Sensor Feed',
    category: 'Clean Digital',
    previewColor: '#64748b',
    previewGradient: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
    hueRotate: 0,
    temperature: 0,
    tint: 0,
    vignette: 0,
    grain: 0,
  },
  {
    id: 'studio_neutral',
    name: 'Studio Neutral',
    subtitle: 'Controlled Linear Grading',
    category: 'Clean Digital',
    previewColor: '#94a3b8',
    previewGradient: 'linear-gradient(135deg, #64748b 0%, #cbd5e1 100%)',
    brightness: 101,
    contrast: 102,
    saturation: 98,
    sepia: 0,
    hueRotate: 0,
    temperature: 0,
    tint: 0,
    vignette: 0,
    grain: 0,
  },

  // 2. Kodak Inspired
  {
    id: 'portra',
    name: 'Portra 400',
    subtitle: 'Warm Fine Skin',
    category: 'Kodak Inspired',
    previewColor: '#e0a96d',
    previewGradient: 'linear-gradient(135deg, #c27803 0%, #fbd5a5 100%)',
    brightness: 104,
    contrast: 108,
    saturation: 112,
    sepia: 12,
    hueRotate: -4,
    temperature: 300,
    tint: -2,
    vignette: 15,
    grain: 12,
    isFavorite: true,
  },
  {
    id: 'ektar_100',
    name: 'Ektar 100',
    subtitle: 'Ultra Vivid Landscape',
    category: 'Kodak Inspired',
    previewColor: '#ea580c',
    previewGradient: 'linear-gradient(135deg, #c2410c 0%, #fb923c 100%)',
    brightness: 102,
    contrast: 122,
    saturation: 138,
    sepia: 6,
    hueRotate: -6,
    temperature: 200,
    tint: 2,
    vignette: 18,
    grain: 8,
  },
  {
    id: 'kodachrome_64',
    name: 'Kodachrome 64',
    subtitle: 'Nostalgic Rich Contrast',
    category: 'Kodak Inspired',
    previewColor: '#b91c1c',
    previewGradient: 'linear-gradient(135deg, #991b1b 0%, #f87171 100%)',
    brightness: 98,
    contrast: 126,
    saturation: 125,
    sepia: 14,
    hueRotate: -2,
    temperature: 350,
    tint: 4,
    vignette: 24,
    grain: 14,
  },

  // 3. Fuji Inspired
  {
    id: 'fuji_superia',
    name: 'Fuji Superia 400',
    subtitle: 'Punchy Emerald Greens',
    category: 'Fuji Inspired',
    previewColor: '#10b981',
    previewGradient: 'linear-gradient(135deg, #047857 0%, #34d399 100%)',
    brightness: 102,
    contrast: 115,
    saturation: 128,
    sepia: 5,
    hueRotate: 6,
    temperature: -150,
    tint: -8,
    vignette: 18,
    grain: 14,
    isFavorite: true,
  },
  {
    id: 'fuji_velvia',
    name: 'Velvia 50 Nature',
    subtitle: 'Deep Greens & Azure Skys',
    category: 'Fuji Inspired',
    previewColor: '#059669',
    previewGradient: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
    brightness: 100,
    contrast: 130,
    saturation: 145,
    sepia: 4,
    hueRotate: 8,
    temperature: -100,
    tint: -10,
    vignette: 22,
    grain: 6,
  },
  {
    id: 'fuji_classic_chrome',
    name: 'Classic Chrome',
    subtitle: 'Subdued Documentary Look',
    category: 'Fuji Inspired',
    previewColor: '#64748b',
    previewGradient: 'linear-gradient(135deg, #334155 0%, #94a3b8 100%)',
    brightness: 97,
    contrast: 118,
    saturation: 85,
    sepia: 8,
    hueRotate: -4,
    temperature: -50,
    tint: 2,
    vignette: 26,
    grain: 16,
  },

  // 4. Cinematic
  {
    id: 'cinestill',
    name: 'CineStill 800T',
    subtitle: 'Tungsten Halation',
    category: 'Cinematic',
    previewColor: '#38bdf8',
    previewGradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    brightness: 102,
    contrast: 122,
    saturation: 120,
    sepia: 8,
    hueRotate: 12,
    temperature: -500,
    tint: 8,
    vignette: 25,
    grain: 20,
    isFavorite: true,
  },
  {
    id: 'teal_orange',
    name: 'Teal & Orange',
    subtitle: 'Hollywood Blockbuster',
    category: 'Cinematic',
    previewColor: '#f97316',
    previewGradient: 'linear-gradient(135deg, #0e7490 0%, #f97316 100%)',
    brightness: 98,
    contrast: 125,
    saturation: 135,
    sepia: 15,
    hueRotate: -15,
    temperature: 200,
    tint: -5,
    vignette: 30,
    grain: 10,
  },
  {
    id: 'anamorphic_gold',
    name: 'Anamorphic Gold',
    subtitle: 'Warm Flare & Inky Blacks',
    category: 'Cinematic',
    previewColor: '#eab308',
    previewGradient: 'linear-gradient(135deg, #a16207 0%, #fde047 100%)',
    brightness: 103,
    contrast: 128,
    saturation: 118,
    sepia: 18,
    hueRotate: -8,
    temperature: 400,
    tint: 5,
    vignette: 35,
    grain: 12,
  },

  // 5. Vintage
  {
    id: 'vintage_70s',
    name: 'Vintage 70s',
    subtitle: 'Muted Faded Nostalgia',
    category: 'Vintage',
    previewColor: '#a16207',
    previewGradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
    brightness: 106,
    contrast: 92,
    saturation: 95,
    sepia: 35,
    hueRotate: 10,
    temperature: 450,
    tint: 6,
    vignette: 32,
    grain: 26,
  },
  {
    id: 'polaroid_fade',
    name: '1960s Polaroid',
    subtitle: 'Cyan Shadows & Cream',
    category: 'Vintage',
    previewColor: '#0284c7',
    previewGradient: 'linear-gradient(135deg, #0369a1 0%, #fde68a 100%)',
    brightness: 108,
    contrast: 88,
    saturation: 90,
    sepia: 25,
    hueRotate: 18,
    temperature: -100,
    tint: -6,
    vignette: 40,
    grain: 22,
  },
  {
    id: 'sepia_heritage',
    name: 'Sepia Heritage',
    subtitle: 'Archival Warm Tone',
    category: 'Vintage',
    previewColor: '#78350f',
    previewGradient: 'linear-gradient(135deg, #451a03 0%, #b45309 100%)',
    brightness: 95,
    contrast: 110,
    saturation: 40,
    sepia: 75,
    hueRotate: -5,
    temperature: 600,
    tint: 10,
    vignette: 45,
    grain: 28,
  },

  // 6. Black & White
  {
    id: 'monochrome',
    name: 'Tri-X 400 B&W',
    subtitle: 'Rich High-Contrast Film',
    category: 'Black & White',
    previewColor: '#475569',
    previewGradient: 'linear-gradient(135deg, #1e293b 0%, #94a3b8 100%)',
    brightness: 100,
    contrast: 140,
    saturation: 0,
    sepia: 0,
    hueRotate: 0,
    temperature: 0,
    tint: 0,
    vignette: 35,
    grain: 30,
    isFavorite: true,
  },
  {
    id: 'moody_noir',
    name: 'Moody Noir',
    subtitle: 'Dramatic Shadow Drop',
    category: 'Black & White',
    previewColor: '#312e81',
    previewGradient: 'linear-gradient(135deg, #09090b 0%, #475569 100%)',
    brightness: 88,
    contrast: 155,
    saturation: 0,
    sepia: 0,
    hueRotate: 0,
    temperature: 0,
    tint: 0,
    vignette: 50,
    grain: 24,
  },
  {
    id: 'silver_gelatin',
    name: 'Silver Gelatin',
    subtitle: 'Silky Smooth Tonal Range',
    category: 'Black & White',
    previewColor: '#64748b',
    previewGradient: 'linear-gradient(135deg, #334155 0%, #cbd5e1 100%)',
    brightness: 102,
    contrast: 112,
    saturation: 0,
    sepia: 0,
    hueRotate: 0,
    temperature: 0,
    tint: 0,
    vignette: 15,
    grain: 10,
  },

  // 7. Creative
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    subtitle: 'Magic Sunlit Warmth',
    category: 'Creative',
    previewColor: '#fbbf24',
    previewGradient: 'linear-gradient(135deg, #d97706 0%, #fde047 100%)',
    brightness: 108,
    contrast: 106,
    saturation: 130,
    sepia: 28,
    hueRotate: -10,
    temperature: 750,
    tint: 4,
    vignette: 22,
    grain: 8,
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Neon',
    subtitle: 'Violet & Electric Blue',
    category: 'Creative',
    previewColor: '#ec4899',
    previewGradient: 'linear-gradient(135deg, #831843 0%, #06b6d4 100%)',
    brightness: 105,
    contrast: 130,
    saturation: 155,
    sepia: 0,
    hueRotate: 45,
    temperature: -400,
    tint: 25,
    vignette: 28,
    grain: 16,
  },
  {
    id: 'emerald_forest',
    name: 'Emerald Forest',
    subtitle: 'Lush Botanical Shadows',
    category: 'Creative',
    previewColor: '#047857',
    previewGradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
    brightness: 101,
    contrast: 120,
    saturation: 132,
    sepia: 6,
    hueRotate: 15,
    temperature: -180,
    tint: -12,
    vignette: 25,
    grain: 10,
  },
];

// Sample fallback scenes for desktop or when camera access is not granted
export const FALLBACK_SCENES = [
  {
    id: 'tropical_walk',
    name: 'Tropical Coastal Alley',
    category: 'travel',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
    description: 'Pathway flanked by lush palm trees leading to azure ocean (similar to reference image)'
  },
  {
    id: 'beach_coast',
    name: 'Island Coast & Cliffs',
    category: 'landscape',
    url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1400&q=80',
    description: 'Emerald water and towering karst limestone peaks'
  },
  {
    id: 'portrait_girl',
    name: 'Cinematic Portrait',
    category: 'portrait',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1400&q=80',
    description: 'Natural light portrait with golden highlights'
  },
  {
    id: 'street_bike',
    name: 'Urban Path & Cyclist',
    category: 'travel',
    url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1400&q=80',
    description: 'S-curve tree-lined promenade with cyclist'
  },
  {
    id: 'architecture_arch',
    name: 'Minimal Architecture',
    category: 'architecture',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80',
    description: 'Geometric concrete shadows and symmetrical arches'
  }
];
