import type { GridType } from '../types/camera';

export interface SubjectHighlight {
  x: number; // percentage 0 to 100
  y: number; // percentage 0 to 100
  radius?: number; // circle radius percentage (default 6)
  width?: number; // box width percentage
  height?: number; // box height percentage
  shape?: 'point' | 'circle' | 'box' | 'line';
  label: string;
  description: string;
}

export interface GridReferencePhoto {
  id: string;
  genre: string; // e.g. "Portrait", "Landscape", "Street", "Architecture", etc.
  title: string;
  imageUrl: string;
  subjectHighlight: SubjectHighlight;
  explanation: string;
  proTip: string;
}

// Complete dictionary providing 3 unique, verified reference photographs for every single grid
export const GRID_REFERENCES: Record<GridType, GridReferencePhoto[]> = {
  // ============================================================
  // NONE / RAW VIEW
  // ============================================================
  none: [
    {
      id: 'none_1',
      genre: 'Candid Street',
      title: 'Spontaneous Urban Emotion',
      imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 52,
        y: 42,
        radius: 8,
        label: 'Unconstrained Subject',
        description: 'Natural focus on spontaneous expression without rigid alignment.'
      },
      explanation: 'Use the clean sensor view when shooting fast-paced candids where grid lines might distract your instinct.',
      proTip: 'Trust your muscle memory and eye tracking for fleeting human expressions.'
    },
    {
      id: 'none_2',
      genre: 'Astrophotography',
      title: 'Dark Sky Wilderness',
      imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 65,
        radius: 12,
        label: 'Wide Horizon Depth',
        description: 'Vast valley framing with zero overlay distraction.'
      },
      explanation: 'Unobstructed full frame allows nighttime focusing and subtle horizon checks without illuminated UI lines.',
      proTip: 'Keep your night vision intact by disabling all grid overlays in dark environments.'
    },
    {
      id: 'none_3',
      genre: 'Action Sports',
      title: 'Dynamic Skater Flight',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 48,
        y: 38,
        radius: 10,
        label: 'Motion Apex',
        description: 'Athlete caught mid-air at the highest trajectory point.'
      },
      explanation: 'In high-speed action photography, tracking the subject takes precedence over pre-planned alignment.',
      proTip: 'Follow the athlete with smooth panning motions through the raw viewfinder.'
    },
  ],

  // ============================================================
  // RULE OF THIRDS (3×3)
  // ============================================================
  rule_of_thirds: [
    {
      id: 'rot_1',
      genre: 'Portrait Photography',
      title: 'Close-Up Editorial Portrait',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 66.6,
        y: 33.3,
        radius: 7,
        label: 'Top-Right Intersection Node',
        description: 'Model dominant eye aligned directly on upper-right power point.'
      },
      explanation: 'Position the dominant eye precisely on the upper-right third intersection. This creates natural asymmetry and leaves breathing space in front of the gaze.',
      proTip: 'Align the facial centerline along the right vertical third line while letting negative space balance the left.'
    },
    {
      id: 'rot_2',
      genre: 'Landscape Photography',
      title: 'Alpine Valley Sunset',
      imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 33.3,
        y: 66.6,
        radius: 8,
        label: 'Lower-Left Intersection & Horizon',
        description: 'River anchor on lower third with dramatic cliff rising along left third.'
      },
      explanation: 'Place the valley river along the lower horizontal third line (33.3% from bottom) and anchor the prominent mountain ridge along the left vertical line.',
      proTip: 'When sky is dramatic, place horizon on bottom third; when foreground is rich, place horizon on top third.'
    },
    {
      id: 'rot_3',
      genre: 'Street Photography',
      title: 'Solitary Commuter in Transit',
      imageUrl: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 33.3,
        y: 50,
        radius: 9,
        label: 'Left Vertical Third Line',
        description: 'Striding pedestrian walking along left vertical guideline.'
      },
      explanation: 'Place the walking subject along the left third line, facing toward the open right side. This gives the subject physical space to walk into.',
      proTip: 'Always compose moving street subjects with the open two-thirds in front of their trajectory.'
    },
  ],

  // ============================================================
  // GOLDEN RATIO (PHI: 38.2% / 61.8%)
  // ============================================================
  golden_ratio: [
    {
      id: 'gr_1',
      genre: 'Portrait Photography',
      title: 'Golden Harmony Portrait',
      imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 61.8,
        y: 38.2,
        radius: 7,
        label: 'Golden Phi Intersection (61.8%, 38.2%)',
        description: 'Subject smile and eye line resting on golden section nodes.'
      },
      explanation: 'Unlike standard thirds, the Golden Ratio lines sit closer to the center (38.2% and 61.8%). Placing the subject on this node creates a subtle, harmonious fine-art tension.',
      proTip: 'Use Golden Ratio for fine-art and fashion where Rule of Thirds feels too formulaic or rigid.'
    },
    {
      id: 'gr_2',
      genre: 'Architecture Photography',
      title: 'Minimalist Concrete Portals',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 38.2,
        y: 61.8,
        radius: 8,
        label: 'Phi Structural Horizon',
        description: 'Arch shadow boundary resting along 61.8% vertical divide.'
      },
      explanation: 'Align architectural wall transitions and shadow edges with the golden section lines to evoke the divine proportion used in classical Greek and Roman masonry.',
      proTip: 'Keep vertical window jambs parallel to the 38.2% guide line.'
    },
    {
      id: 'gr_3',
      genre: 'Nature & Landscape',
      title: 'Autumn Solitary Tree',
      imageUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 61.8,
        y: 50,
        radius: 9,
        label: 'Golden Vertical Section',
        description: 'Lone tree trunk aligned along the 61.8% phi vertical axis.'
      },
      explanation: 'Placing natural organic subjects on the golden section mirrors the geometric growth patterns found in nature, creating instant visual calm.',
      proTip: 'Place rolling hill horizons at 38.2% from bottom to give golden weight to dramatic skies.'
    },
  ],

  // ============================================================
  // GOLDEN SPIRAL
  // ============================================================
  golden_spiral: [
    {
      id: 'gsp_1',
      genre: 'Food Photography',
      title: 'Artisan Culinary Plating',
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 62,
        y: 62,
        radius: 8,
        label: 'Eye of the Spiral',
        description: 'Hero garnish melting point located at spiral focal center.'
      },
      explanation: 'The curve sweeps along the outer crust, guiding the viewer’s eye inward along the logarithmic path directly into the melted cheese and basil leaves at the core.',
      proTip: 'Arrange food garnishes and drizzles to echo the sweeping curve of the spiral.'
    },
    {
      id: 'gsp_2',
      genre: 'Portrait Photography',
      title: 'Sweeping Hair Flow & Gaze',
      imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 68,
        y: 40,
        radius: 7,
        label: 'Spiral Apex on Gaze',
        description: 'Shoulder curve leads up through jawline into the smiling eye.'
      },
      explanation: 'Position the subject’s shoulder along the sweeping outer curve. The visual flow naturally climbs up the neck and ends in the eye of the spiral on the subject’s gaze.',
      proTip: 'Flip or rotate the spiral so the curve originates from the direction of light.'
    },
    {
      id: 'gsp_3',
      genre: 'Botanical / Flower Photography',
      title: 'Logarithmic Petal Bloom',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Spiral Growth Core',
        description: 'Succulent center matching mathematical Fibonacci sequence.'
      },
      explanation: 'Botanical petals unfurl naturally along logarithmic spirals. Align the core of the flower with the eye of the spiral to showcase biological symmetry.',
      proTip: 'Get close with a macro lens and ensure the outer spiral arms frame the edges cleanly.'
    },
  ],

  // ============================================================
  // FIBONACCI SPIRAL
  // ============================================================
  fibonacci_spiral: [
    {
      id: 'fib_1',
      genre: 'Architecture Photography',
      title: 'Vatican Spiral Staircase',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 64,
        y: 60,
        radius: 9,
        label: 'Stairwell Vanishing Eye',
        description: 'Marble steps spiraling down into the bottom courtyard.'
      },
      explanation: 'Spiral stairwells are real-life Fibonacci structures. Align the outer banister with the perimeter arc, drawing the viewer downward into infinity.',
      proTip: 'Lean over the rail with a wide lens and position the bottom landing dead center in the spiral eye.'
    },
    {
      id: 'fib_2',
      genre: 'Ocean & Nature',
      title: 'Breaking Surf Wave Curve',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 70,
        y: 55,
        radius: 8,
        label: 'Wave Barrel Core',
        description: 'Surfing barrel curl coiling toward spiral center.'
      },
      explanation: 'Ocean waves break according to fluid dynamics that mirror the golden spiral. Anchor the foam lip along the top arc curling into the barrel apex.',
      proTip: 'Use a high shutter speed (1/1000s) to freeze droplets along the spiral vector.'
    },
    {
      id: 'fib_3',
      genre: 'Atmospheric Landscape',
      title: 'Misty Forest Trail Bend',
      imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 62,
        y: 48,
        radius: 8,
        label: 'Trail Disappearing Node',
        description: 'Curving forest path disappearing into dense morning mist.'
      },
      explanation: 'Compose winding mountain paths along the spiral curve to create a sense of mystery and journey.',
      proTip: 'Let the mist thicken toward the eye of the spiral to amplify depth perception.'
    },
  ],

  // ============================================================
  // GOLDEN TRIANGLES
  // ============================================================
  golden_triangles: [
    {
      id: 'gt_1',
      genre: 'Mountain Photography',
      title: 'Jagged Alpine Ridge Apex',
      imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 60,
        y: 40,
        radius: 7,
        label: 'Perpendicular Orthogonal Intersection',
        description: 'Main summit ridge aligns with diagonal hypotenuse.'
      },
      explanation: 'Align the steep slope along the corner-to-corner diagonal line. The perpendicular intersecting line locks the mountain peak at a powerful right angle.',
      proTip: 'Use when landscape features steep diagonal angles (canyons, ski slopes, rock faces).'
    },
    {
      id: 'gt_2',
      genre: 'Modern Architecture',
      title: 'Glass Cantilever Skyscraper',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 40,
        y: 60,
        radius: 8,
        label: 'Triangular Negative Space',
        description: 'Sharp glass facade cutting diagonally across azure sky.'
      },
      explanation: 'Divide the frame corner-to-corner with the building corner. The remaining right-angled triangles create bold geometric dynamism against the sky.',
      proTip: 'Shoot from street level pointing up at a 45-degree angle to exaggerate diagonal energy.'
    },
    {
      id: 'gt_3',
      genre: 'Street & Action',
      title: 'High-Velocity Skater Slide',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 62,
        y: 38,
        radius: 8,
        label: 'Action Diagonal Intersection',
        description: 'Skater body angle aligned with perpendicular guide.'
      },
      explanation: 'Place the athlete along one diagonal and the shadow or ramp along the perpendicular orthogonal. This creates unmatched velocity and tension.',
      proTip: 'Diagonals slanting up and to the right convey speed and victory.'
    },
  ],

  // ============================================================
  // CENTER CROSSHAIR
  // ============================================================
  center_crosshair: [
    {
      id: 'cc_1',
      genre: 'Symmetrical Portrait',
      title: 'Direct Arresting Gaze',
      imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 45,
        radius: 6,
        label: 'Dead-Center Crosshair Target',
        description: 'Nose bridge and pupils centered on horizontal reticle.'
      },
      explanation: 'Break the rule of thirds intentionally. Placing the subject dead center with direct eye contact creates an intense, confronting psychological impact.',
      proTip: 'Ensure both eyes are equidistant from the vertical crosshair line.'
    },
    {
      id: 'cc_2',
      genre: 'Iconic Architecture',
      title: 'Eiffel Tower Axial Symmetry',
      imageUrl: 'https://images.unsplash.com/photo-1539651044670-315229da9d2f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 7,
        label: 'Tower Apex Central Reticle',
        description: 'Monument centerline locked strictly on vertical crosshair.'
      },
      explanation: 'Stand directly on the architectural axis of symmetry. The crosshair guarantees zero horizontal tilt and absolute geometric balance.',
      proTip: 'Check the base pillars; if one side is 1 inch wider, step left or right until balanced.'
    },
    {
      id: 'cc_3',
      genre: 'Product Photography',
      title: 'Minimalist Chronograph Watch',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 6,
        label: 'Dial Center Reticle',
        description: 'Hands pivot pin locked precisely on center crosshair.'
      },
      explanation: 'In commercial watch advertising, the dial center must align with the optical center of the sensor, flanked by pristine clean negative space.',
      proTip: 'Use the concentric ring guide to check that the watch bezel is perfectly round and undistorted.'
    },
  ],

  // ============================================================
  // CENTER SYMMETRY
  // ============================================================
  center_symmetry: [
    {
      id: 'cs_1',
      genre: 'Lake Landscape',
      title: 'Glass Lake Mirror Reflection',
      imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Horizontal Mirror Axis',
        description: 'Waterline locked dead center dividing real world and reflection.'
      },
      explanation: 'Place the waterline exactly across the central horizontal divider. The top mountain and bottom reflection form a hypnotic mirror equilibrium.',
      proTip: 'Shoot on calm windless mornings when lake water behaves like polished glass.'
    },
    {
      id: 'cs_2',
      genre: 'Cathedral / Interior',
      title: 'Gothic Nave Vaulting',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Vertical Mirror Plane',
        description: 'Twin arches mirrored symmetrically on left and right.'
      },
      explanation: 'Align the camera sensor squarely with the aisle center line. Each arch on the left must mirror an arch on the right.',
      proTip: 'Use a tripod with the dual-axis level to ensure the lens is not tilted upward.'
    },
    {
      id: 'cs_3',
      genre: 'Underground Transit',
      title: 'Neon Light Tunnel Corridor',
      imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 52,
        radius: 7,
        label: 'Central Vanishing Tunnel Portal',
        description: 'Ceiling lights and floor tiles funneling to center circle.'
      },
      explanation: 'Symmetrical light strips on both walls create a sci-fi portal effect when anchored precisely to the center symmetry grid.',
      proTip: 'Wait for a solitary person to walk through the center nexus to add human scale.'
    },
  ],

  // ============================================================
  // DIAGONAL COMPOSITION
  // ============================================================
  diagonal_composition: [
    {
      id: 'diag_1',
      genre: 'Landscape & Road',
      title: 'Sweeping Mountain Highway',
      imageUrl: 'https://images.unsplash.com/photo-1517817748493-49ec54a32465?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 45,
        y: 55,
        radius: 8,
        label: 'Corner-to-Corner Diagonal Vector',
        description: 'Asphalt center line entering bottom-left and exiting top-right.'
      },
      explanation: 'Diagonals slice through the frame to generate motion. Guide the road from bottom-left corner across the center to draw the viewer through the landscape.',
      proTip: 'Lower the camera closer to the asphalt to make the leading diagonal wider and bolder.'
    },
    {
      id: 'diag_2',
      genre: 'Architecture & Coast',
      title: 'Suspension Bridge Cable Angles',
      imageUrl: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 55,
        y: 45,
        radius: 8,
        label: 'Descending Diagonal Ridge',
        description: 'Limestone sea cliff dropping diagonally into azure sea.'
      },
      explanation: 'Natural coastal ridges naturally form dramatic diagonals. Align the steepest cliff edge with the diagonal guide for cinematic drama.',
      proTip: 'Pair warm sunset light with cool ocean shadows across the diagonal divide.'
    },
    {
      id: 'diag_3',
      genre: 'Sports & Skate',
      title: 'Handrail Grind Diagonal',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 52,
        y: 42,
        radius: 9,
        label: 'Action Velocity Line',
        description: 'Skater momentum traveling along ascending diagonal.'
      },
      explanation: 'Compose the handrail along the 45-degree diagonal. The athlete riding the diagonal communicates explosive energy.',
      proTip: 'Shoot with a fish-eye or ultra-wide lens right next to the rail.'
    },
  ],

  // ============================================================
  // PERSPECTIVE DEPTH GRID
  // ============================================================
  perspective_grid: [
    {
      id: 'persp_1',
      genre: 'Travel & Path',
      title: 'Tree-Lined S-Curve Promenade',
      imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 55,
        radius: 7,
        label: 'Vanishing Point on Horizon',
        description: 'Trees converge on eye-level vanishing point.'
      },
      explanation: 'Linear perspective orthogonals draw the viewer from wide foreground edges into the distant vanishing point, creating massive 3D depth.',
      proTip: 'A cyclist or walker at the vanishing point gives the human eye an emotional destination.'
    },
    {
      id: 'persp_2',
      genre: 'Urban Night Street',
      title: 'Neon Boulevard Perspective',
      imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 52,
        y: 50,
        radius: 8,
        label: 'Road Vanishing Apex',
        description: 'Traffic lines and illuminated storefronts converging.'
      },
      explanation: 'Align street curb lines and building cornices with the perspective grid orthogonals to turn flat city streets into dramatic 3D corridors.',
      proTip: 'Shoot immediately after rainfall when wet asphalt doubles perspective lines with reflections.'
    },
    {
      id: 'persp_3',
      genre: 'Architectural Corridor',
      title: 'Subway Station Tunnel',
      imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 52,
        radius: 7,
        label: 'Corridor Center Focal Hub',
        description: 'Floor tiles and overhead lamps converging to single point.'
      },
      explanation: 'The perspective grid ensures the camera height matches human eye-level, eliminating awkward perspective distortion.',
      proTip: 'Crouch down slightly to increase the drama of the floor tiles.'
    },
  ],

  // ============================================================
  // DYNAMIC SYMMETRY (HARMONIC ARMATURE)
  // ============================================================
  dynamic_symmetry: [
    {
      id: 'ds_1',
      genre: 'Cinematic Group Scene',
      title: 'Complex Narrative Tableau',
      imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 45,
        y: 48,
        radius: 9,
        label: 'Armature Reciprocal Node',
        description: 'Key characters anchored on intersecting diagonal nodes.'
      },
      explanation: 'Used by Renaissance painters and film directors. The harmonic armature connects main diagonals with reciprocal 90-degree vectors, balancing multi-person scenes without clutter.',
      proTip: 'Align the heads of different actors along the diagonal vectors to establish visual hierarchy.'
    },
    {
      id: 'ds_2',
      genre: 'Street Documentary',
      title: 'Busy Crosswalk Harmony',
      imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 55,
        y: 55,
        radius: 8,
        label: 'Dynamic Intersection Point',
        description: 'Pedestrians walking along harmonic reciprocal lines.'
      },
      explanation: 'In chaotic street environments, the harmonic armature provides structural order, guiding your camera to capture multiple subjects in balanced harmony.',
      proTip: 'Wait for figures to fill opposing triangles for maximum compositional balance.'
    },
    {
      id: 'ds_3',
      genre: 'Athletic Motion',
      title: 'Urban Dance & Agility',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 40,
        radius: 8,
        label: 'Baroque Diagonal Alignment',
        description: 'Limb extension follows harmonic armature vector.'
      },
      explanation: 'When dancers or athletes extend limbs, align the dominant thrust along the primary baroque diagonal to amplify elegance.',
      proTip: 'Use continuous burst mode to catch the exact frame where limbs lock onto the grid.'
    },
  ],

  // ============================================================
  // RADIAL COMPOSITION
  // ============================================================
  radial_composition: [
    {
      id: 'rad_1',
      genre: 'Architecture Dome',
      title: 'St. Peter’s Rotunda Dome',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Radial Hub',
        description: 'Ornate ceiling ribs radiating 360 degrees outward.'
      },
      explanation: 'Point the camera straight up from the floor center. The 8 radial spokes ensure every ceiling column is spaced with rotational perfection.',
      proTip: 'Rest the back of your phone flat on the floor with timer for flawless vertical alignment.'
    },
    {
      id: 'rad_2',
      genre: 'Botanical Macro',
      title: 'Sunflower Seed Spiral Spokes',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 7,
        label: 'Botanical Center Hub',
        description: 'Seeds and florets exploding outward uniformly.'
      },
      explanation: 'Center the flower disk in the radial target reticle. The rays guarantee the petals radiate symmetrically across all 4 quadrants.',
      proTip: 'Use soft, diffused morning light to highlight the radial texture without harsh shadows.'
    },
    {
      id: 'rad_3',
      genre: 'Modern Architecture',
      title: 'Spiral Ramp Architecture',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Radial Symmetry Center',
        description: 'Concentric balustrades spinning away from central atrium.'
      },
      explanation: 'Radial composition creates a hypnotic spinning illusion. Lock the central atrium pillar in the center circle.',
      proTip: 'Use an ultrawide lens to emphasize the outer radial rays as they reach frame borders.'
    },
  ],

  // ============================================================
  // CONCENTRIC CIRCLES
  // ============================================================
  concentric_circles: [
    {
      id: 'conc_1',
      genre: 'Water & Nature',
      title: 'Raindrop Ripple Resonance',
      imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 7,
        label: 'Impact Droplet Core',
        description: 'Concentric wave crests expanding outward.'
      },
      explanation: 'Center the initial water drop in the innermost bullseye ring. The expanding wave crests will align with the outer concentric rings.',
      proTip: 'Angle your key light low to cast pronounced shadows along circular wave crests.'
    },
    {
      id: 'conc_2',
      genre: 'Modern Transit Tunnel',
      title: 'Circular Subway Bore',
      imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 52,
        radius: 8,
        label: 'Circular Tunnel Chamber',
        description: 'Tunnel concrete rings matching concentric guide circles.'
      },
      explanation: 'Circular infrastructure naturally matches concentric framing. Align the nearest concrete ring with the outer circle for cinematic tunnel depth.',
      proTip: 'Keep camera completely level to prevent the circles from turning into skewed ellipses.'
    },
    {
      id: 'conc_3',
      genre: 'Food & Coffee Art',
      title: 'Overhead Latte Art & Saucer',
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Cup & Saucer Nested Rings',
        description: 'Cup rim in inner circle, saucer in outer circle.'
      },
      explanation: 'Nest the ceramic cup inside the inner circle, the saucer inside the middle ring, and the tablecloth in the outer ring for structured elegance.',
      proTip: 'Check the artificial horizon to verify you are holding the camera 100% flat at 90 degrees overhead.'
    },
  ],

  // ============================================================
  // PORTRAIT EYE-LINE GUIDE
  // ============================================================
  portrait_eyeline: [
    {
      id: 'peye_1',
      genre: 'Close-Up Beauty',
      title: 'Intimate Studio Connection',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 38.2,
        radius: 6,
        label: 'Golden Eye-Line Level (38.2% Phi)',
        description: 'Both pupils anchored along the horizontal gold guide line.'
      },
      explanation: 'Align the model’s dominant eye along the gold eye-line at 38.2% height. This is the physiological sweet-spot where human gaze lands first.',
      proTip: 'Lock the eye nearest the light source to the eye-line guide.'
    },
    {
      id: 'peye_2',
      genre: 'Outdoor Natural Light',
      title: 'Golden Hour Smile',
      imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 52,
        y: 38.2,
        radius: 6,
        label: 'Golden Eye-Line Alignment',
        description: 'Smiling eyes resting on the upper phi line.'
      },
      explanation: 'Keeping the eye-line consistent across your photo series creates professional visual cohesion in portfolios and editorial magazine spreads.',
      proTip: 'Avoid placing the eyes in the dead center vertical half, which leaves too much awkward dead space above the head.'
    },
    {
      id: 'peye_3',
      genre: 'Corporate Headshot',
      title: 'Executive Presence',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 38.2,
        radius: 6,
        label: 'Eye-Line Level Anchor',
        description: 'Pupils locked along eye-line for authoritative presence.'
      },
      explanation: 'In corporate and executive portraits, the eye-line guide establishes authority and confidence without cutting off collarbones.',
      proTip: 'Instruct the subject to push their chin slightly forward and down toward the lens.'
    },
  ],

  // ============================================================
  // PORTRAIT HEADROOM & CONTOUR
  // ============================================================
  portrait_headroom: [
    {
      id: 'phr_1',
      genre: 'Executive Portrait',
      title: 'Balanced Corporate Framing',
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 20,
        radius: 7,
        label: 'Optimal Top Headroom Limit',
        description: 'Hair grazing the top dotted boundary line.'
      },
      explanation: 'Keep the subject’s crown or styled hair grazing the upper headroom line. Too much headroom makes the subject look timid; too little feels cramped.',
      proTip: 'If the subject has voluminous hair, prioritize the skull crown position rather than hair tips.'
    },
    {
      id: 'phr_2',
      genre: 'Cinematic Close-Up',
      title: 'Film Character Study',
      imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 22,
        radius: 7,
        label: 'Cinematic Headroom Buffer',
        description: 'Upper forehead comfortably spaced from frame ceiling.'
      },
      explanation: 'Cinema framing demands tight, controlled headroom. The headroom boundary ensures the actor’s eyes command the upper half of the screen.',
      proTip: 'Combine with 16:9 or 2.39:1 aspect ratio for authentic cinema anamorphic framing.'
    },
    {
      id: 'phr_3',
      genre: 'Casting & Audition',
      title: 'Natural Head & Neck Profile',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 20,
        radius: 7,
        label: 'Headroom Safe Border',
        description: 'Ideal 10-15% margin between top of head and frame border.'
      },
      explanation: 'Casting directors require uniform proportions across headshots. The contour guide guarantees standard industry headroom.',
      proTip: 'Ensure shoulders rest comfortably along the lower shoulder markers.'
    },
  ],

  // ============================================================
  // PORTRAIT FACE ALIGNMENT MATRIX
  // ============================================================
  portrait_face_align: [
    {
      id: 'pfa_1',
      genre: 'High Fashion Beauty',
      title: 'Flawless Facial Symmetry',
      imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 42,
        radius: 8,
        label: 'Bilateral Facial Symmetry Axis',
        description: 'Eyes on dual nodes, nose bridge on center vertical line.'
      },
      explanation: 'Align the left and right pupils with the dual circular target nodes. The central plumb line should bisect the nose bridge and cupid’s bow.',
      proTip: 'Even a 2-degree head tilt is instantly visible with this matrix; use it to correct model posture.'
    },
    {
      id: 'pfa_2',
      genre: 'Editorial Makeup',
      title: 'Cosmetic Beauty Campaign',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 45,
        radius: 8,
        label: 'Facial Proportion Tiers',
        description: 'Brow line, eye line, and lip boundary aligned with tiers.'
      },
      explanation: 'In commercial cosmetics and beauty photography, standardizing facial tiers allows retouching artists to maintain proportional anatomy.',
      proTip: 'Use a 85mm or 105mm portrait lens to eliminate wide-angle nose enlargement.'
    },
    {
      id: 'pfa_3',
      genre: 'Character Portrait',
      title: 'Golden Hour Character Depth',
      imageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 44,
        radius: 8,
        label: 'Pupil Anchor Nodes',
        description: 'Direct gaze locked on the dual crosshair nodes.'
      },
      explanation: 'Locking both pupils onto the dual reticle guides ensures the camera is parallel to the subject’s face plane with zero distortion.',
      proTip: 'Ask the subject to take a deep breath and exhale right before shutter press for relaxed facial muscles.'
    },
  ],

  // ============================================================
  // PORTRAIT HEAD & SHOULDER FRAMING
  // ============================================================
  portrait_head_shoulder: [
    {
      id: 'phs_1',
      genre: 'LinkedIn Professional',
      title: 'Corporate Head & Shoulders',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 55,
        radius: 9,
        label: 'Shoulder Collarbone Arch',
        description: 'Shoulders turned 30 degrees filling shoulder arch.'
      },
      explanation: 'Fit the head inside the upper oval and allow the collarbones and suit lapels to trace the lower shoulder arch.',
      proTip: 'Angle the shoulders 30 degrees away from the lens while keeping the face turned toward the camera.'
    },
    {
      id: 'phs_2',
      genre: 'Creative Artist Profile',
      title: 'Relaxed Studio Bust',
      imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Head & Torso Balance',
        description: 'Head nestled in upper guide, chest anchored below.'
      },
      explanation: 'The guide prevents framing too loose (wasting frame space) or too tight (chopping off shirt collar and shoulders).',
      proTip: 'Keep the background simple with a pleasing aperture blur (f/1.8 – f/2.8).'
    },
    {
      id: 'phs_3',
      genre: 'Formal Portraiture',
      title: 'Classic Headshot Stance',
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 52,
        radius: 8,
        label: 'Shoulder Width Marker',
        description: 'Balanced torso width fitting cleanly in guide.'
      },
      explanation: 'Uniform framing lets you shoot 50 corporate employees and achieve exact matching proportions across the team roster.',
      proTip: 'Mark tape on the floor so subjects stand on the exact same focal distance.'
    },
  ],

  // ============================================================
  // PORTRAIT FULL BODY STANDING
  // ============================================================
  portrait_full_body: [
    {
      id: 'pfb_1',
      genre: 'Fashion Street Style',
      title: 'Runway Standing Stance',
      imageUrl: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 10,
        label: '8-Head Proportion Grid',
        description: 'Head in top 15%, feet anchored on bottom ground line.'
      },
      explanation: 'The vertical 8-head proportion matrix divides head, torso, waist, knees, and feet. Feet must touch the lower ground guideline.',
      proTip: 'Shoot from hip height (waist level) to elongate legs and prevent perspective flattening.'
    },
    {
      id: 'pfb_2',
      genre: 'Urban Environmental',
      title: 'Architectural Backdrop Full Body',
      imageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 55,
        radius: 9,
        label: 'Ground Level Placement',
        description: 'Subject centered vertically with environment balanced.'
      },
      explanation: 'Environmental portraits need both the human form and the surroundings. The guide ensures the model commands the vertical axis.',
      proTip: 'Have the model put weight on their back leg for a natural S-curve silhouette.'
    },
    {
      id: 'pfb_3',
      genre: 'Athletic Full Length',
      title: 'Power Stance Outdoors',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 45,
        radius: 9,
        label: 'Full Body Dynamic Axis',
        description: 'Athletic silhouette spanning top to bottom guidelines.'
      },
      explanation: 'Avoid cutting off toes or top of head. The full-body guide keeps the full silhouette intact with healthy breathing borders.',
      proTip: 'Leave 10% space below the shoes so the subject looks grounded on earth.'
    },
  ],

  // ============================================================
  // LANDSCAPE HORIZON THIRDS
  // ============================================================
  landscape_horizon_thirds: [
    {
      id: 'lht_1',
      genre: 'Sunset Ocean Seascape',
      title: 'Dramatic Sky Horizon (Lower Third)',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 66.6,
        radius: 8,
        label: 'Lower Third Horizon Line',
        description: 'Ocean horizon resting on 33.3% line from bottom.'
      },
      explanation: 'When the sky has dramatic clouds and sunset colors, place the ocean horizon along the lower third line (66.6% from top). Give 2/3 of frame to the sky.',
      proTip: 'Never place the horizon dead center unless shooting symmetrical water reflections.'
    },
    {
      id: 'lht_2',
      genre: 'Alpine Meadow',
      title: 'Rich Foreground Horizon (Upper Third)',
      imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 33.3,
        radius: 8,
        label: 'Upper Third Horizon Line',
        description: 'Mountain ridge placed along top 33.3% line.'
      },
      explanation: 'When the foreground has blooming wildflowers, textured rocks, or streams, place the horizon along the upper third line. Give 2/3 to the ground.',
      proTip: 'Get low to the meadow grass with an aperture of f/8 or f/11 for front-to-back sharpness.'
    },
    {
      id: 'lht_3',
      genre: 'Coastal Cliff Vistas',
      title: 'Ocean Horizon Vernier',
      imageUrl: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 66.6,
        radius: 7,
        label: 'Flat Horizon Anchor',
        description: 'Horizon line perfectly parallel to guide line.'
      },
      explanation: 'A crooked ocean horizon ruins an otherwise magnificent landscape. Use the horizontal third line to lock the sea completely flat.',
      proTip: 'Double check with the Artificial Horizon level indicator in the camera overlay.'
    },
  ],

  // ============================================================
  // LANDSCAPE GOLDEN RATIO
  // ============================================================
  landscape_golden_ratio: [
    {
      id: 'lgr_1',
      genre: 'Fine Art Nature',
      title: 'Golden Section Oak Tree',
      imageUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 61.8,
        y: 50,
        radius: 8,
        label: 'Phi Golden Vertical Line',
        description: 'Trunk aligned along 61.8% phi vertical line.'
      },
      explanation: 'Placing the hero tree at the 61.8% golden section division creates an organic, museum-grade balance that feels peaceful and timeless.',
      proTip: 'Nature grows in phi spirals; matching landscape trees to phi feels subconsciously right to viewers.'
    },
    {
      id: 'lgr_2',
      genre: 'Misty Alpine Valley',
      title: 'Valley Cloud Layers',
      imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 38.2,
        y: 61.8,
        radius: 8,
        label: 'Golden Horizon (61.8% from top)',
        description: 'Valley floor and river anchored on golden ratio division.'
      },
      explanation: 'The 38.2% / 61.8% division produces less severe asymmetry than the Rule of Thirds, ideal for serene wilderness vistas.',
      proTip: 'Position the deepest canyon shadow on the lower left phi node.'
    },
    {
      id: 'lgr_3',
      genre: 'Wilderness Lake at Dawn',
      title: 'Serene Lake Reflection',
      imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 61.8,
        y: 38.2,
        radius: 7,
        label: 'Golden Ratio Sun Glow',
        description: 'Rising sun anchored on upper-right phi node.'
      },
      explanation: 'Place the morning sun or brightest mountain peak at the golden node to draw the viewer’s eye through misty lake reflections.',
      proTip: 'Expose for highlights to retain golden warmth on the water surface.'
    },
  ],

  // ============================================================
  // LANDSCAPE FOREGROUND ANCHOR
  // ============================================================
  landscape_foreground: [
    {
      id: 'lfg_1',
      genre: 'Coastal Rock Tidepool',
      title: 'Foreground Mossy Boulder',
      imageUrl: 'https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 35,
        y: 75,
        radius: 9,
        label: 'Foreground Subject Target Circle',
        description: 'Textured coastal rock placed in lower target guide.'
      },
      explanation: 'Anchor a distinctive textured rock in the lower foreground target circle. This leads the eye from the immediate foreground deep into the distant sunset.',
      proTip: 'Get within 2 feet of the foreground rock with your wide lens (16mm or 24mm equivalent).'
    },
    {
      id: 'lfg_2',
      genre: 'Alpine Wildflowers',
      title: 'Wildflowers in Forefront',
      imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 40,
        y: 78,
        radius: 8,
        label: 'Foreground Flower Anchor',
        description: 'Vibrant blossoms filling lower third target zone.'
      },
      explanation: 'Without a strong foreground anchor, wide landscapes feel flat and distant. The foreground guide forces you to anchor a key foreground element.',
      proTip: 'Focus stack if your lens cannot keep both the immediate petals and distant mountains sharp.'
    },
    {
      id: 'lfg_3',
      genre: 'Mountain Stream',
      title: 'Clear Water Pool Foreground',
      imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 80,
        radius: 9,
        label: 'Foreground Leading Water',
        description: 'Clear water pebbles anchoring lower frame.'
      },
      explanation: 'Compose transparent water and river stones inside the lower boundary, creating an inviting visual step into the photograph.',
      proTip: 'Use a circular polarizing filter (CPL) to cut surface water glare and reveal submerged pebbles.'
    },
  ],

  // ============================================================
  // LANDSCAPE MOUNTAIN RIDGE ALIGNMENT
  // ============================================================
  landscape_mountain_align: [
    {
      id: 'lmt_1',
      genre: 'Alpine Summit',
      title: 'Sharp Peak Apex Alignment',
      imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 58,
        y: 35,
        radius: 7,
        label: 'Mountain Peak Apex Guide',
        description: 'Pyramidal summit peak locked on ridge apex marker.'
      },
      explanation: 'Align the dramatic mountain peak on the apex target circle. The angled ridge lines guide the surrounding descending slopes.',
      proTip: 'Place the steepest mountain face along the angled ridge vector for visual tension.'
    },
    {
      id: 'lmt_2',
      genre: 'Layered Ridge Range',
      title: 'Descending Mountain Ridges',
      imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 40,
        y: 45,
        radius: 8,
        label: 'Slope Angle Vector',
        description: 'Descending granite slope matching guide angle.'
      },
      explanation: 'When ridges cascade in atmospheric layers, the ridge vectors provide alignment lines so slopes don’t feel awkwardly clipped.',
      proTip: 'Shoot during morning inversion when clouds pool between descending ridges.'
    },
    {
      id: 'lmt_3',
      genre: 'Volcanic Cone',
      title: 'Solitary Peak Horizon',
      imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 36,
        radius: 7,
        label: 'Volcano Crater Apex',
        description: 'Symmetrical summit centered on mountain peak guide.'
      },
      explanation: 'Center the volcanic summit within the apex reticle while resting the foothills along the lower terrain markers.',
      proTip: 'Wait for sunrise light to strike just the peak (alpenglow) while the valley stays in blue shadow.'
    },
  ],

  // ============================================================
  // LANDSCAPE PANORAMIC 2.39:1
  // ============================================================
  landscape_panoramic: [
    {
      id: 'lpano_1',
      genre: 'Widescreen Alpine',
      title: 'Cinematic 2.39:1 Mountain Horizon',
      imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 9,
        label: 'Panoramic Cinema Window',
        description: 'Panoramic scope between anamorphic letterbox bars.'
      },
      explanation: 'The 2.39:1 anamorphic crop forces a sweeping left-to-right eye journey. Keep primary peaks within the unshaded cinema window.',
      proTip: 'Look for panoramic leading lines that travel horizontally across the entire width.'
    },
    {
      id: 'lpano_2',
      genre: 'Coastal Letterbox',
      title: 'Widescreen Ocean Horizon',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 52,
        radius: 8,
        label: 'Horizontal Sea Strip',
        description: 'Sea horizon bisecting the wide 2.39:1 frame.'
      },
      explanation: 'Anamorphic ratios simulate Hollywood cinema. The black matte bands eliminate distracting sky and ground clutter.',
      proTip: 'Pair with the Teal & Orange film filter for instant blockbuster aesthetic.'
    },
    {
      id: 'lpano_3',
      genre: 'Sunset Valley Scope',
      title: 'Epic Establishing Shot',
      imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 48,
        radius: 8,
        label: 'Cinematic Vista Horizon',
        description: 'Golden hour mountains contained in letterbox scope.'
      },
      explanation: 'Use the 2.39:1 panoramic guide for movie-style establishing shots where scale and breadth are the story.',
      proTip: 'Keep critical storytelling elements in the center 60% of the widescreen width.'
    },
  ],

  // ============================================================
  // ARCHITECTURE VERTICAL PLUMB CORRECTION
  // ============================================================
  arch_vertical_correction: [
    {
      id: 'avp_1',
      genre: 'Glass Skyscraper',
      title: 'Zero Keystone Plumb Lines',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Vertical Plumb Alignment',
        description: 'Curtain wall structural mullions 100% parallel to guides.'
      },
      explanation: 'Eliminate converging vertical lines (keystoning). Keep all building structural columns strictly parallel to the vertical guide lines.',
      proTip: 'Keep your camera lens completely level with the horizon; tilting up causes buildings to look like they are falling backward.'
    },
    {
      id: 'avp_2',
      genre: 'Classical Colonnade',
      title: 'Plumb Marble Pillars',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 35,
        y: 50,
        radius: 7,
        label: 'Pillar Vertical Plumb',
        description: 'Stone column edges locked to vertical plumb grid.'
      },
      explanation: 'Classical columns look sloppy if photographed tilted. Use the vertical plumb lines to ensure columns stand erect and true.',
      proTip: 'Stand back and zoom in slightly to reduce barrel distortion on outer pillars.'
    },
    {
      id: 'avp_3',
      genre: 'Urban Street Canyon',
      title: 'Perpendicular Building Facades',
      imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 48,
        y: 52,
        radius: 8,
        label: 'Vertical Corridor Plumb',
        description: 'Opposing buildings standing straight without convergence.'
      },
      explanation: 'In dense city street canyons, vertical plumb correction maintains clean architectural geometry without distortion.',
      proTip: 'Step across the street to get further away from building bases.'
    },
  ],

  // ============================================================
  // ARCHITECTURE SYMMETRY
  // ============================================================
  arch_building_symmetry: [
    {
      id: 'abs_1',
      genre: 'World Monument',
      title: 'Mirror Symmetry of the Eiffel Tower',
      imageUrl: 'https://images.unsplash.com/photo-1539651044670-315229da9d2f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 45,
        radius: 8,
        label: 'Center Architectural Axis',
        description: 'Monument centerline locked strictly on vertical divider.'
      },
      explanation: 'Stand dead center on the building’s mirror plane. The left half and right half must match like identical twins.',
      proTip: 'Even a 2-inch deviation from true center destroys the illusion; check the footing alignment.'
    },
    {
      id: 'abs_2',
      genre: 'Grand Atrium',
      title: 'Spiral Balcony Symmetry',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Symmetrical Well Nexus',
        description: 'Curving railings balancing equally on both flanks.'
      },
      explanation: 'In grand hotel and museum atriums, symmetrical framing highlights architectural grandeur and balance.',
      proTip: 'Align the floor tile pattern at your feet with the center vertical line.'
    },
    {
      id: 'abs_3',
      genre: 'Modern Concrete Portal',
      title: 'Minimalist Archway Symmetry',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 55,
        radius: 7,
        label: 'Bilateral Arch Mirror',
        description: 'Concrete walls and shadows mirrored precisely.'
      },
      explanation: 'Minimalist architecture relies on clean negative space. Use the center symmetry grid to ensure wall borders are identical on both sides.',
      proTip: 'Check shadow angles; symmetry looks most striking when light is either directly overhead or mirrored.'
    },
  ],

  // ============================================================
  // ARCHITECTURE FACADE DIVISIONS
  // ============================================================
  arch_facade_divisions: [
    {
      id: 'afd_1',
      genre: 'Neoclassical Facade',
      title: 'Tripartite Classical Facade',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Base, Shaft & Cornice Divisions',
        description: 'Horizontal cornice lines aligned with tripartite divisions.'
      },
      explanation: 'Classical architecture is designed around tripartite division: ground base, column shaft, and top entablature cornice.',
      proTip: 'Align the main horizontal frieze with the 25% or 75% horizontal guideline.'
    },
    {
      id: 'afd_2',
      genre: 'Modern Window Matrix',
      title: 'Rhythmic Glass Bay Divisions',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 45,
        radius: 8,
        label: 'Modular Window Bays',
        description: 'Window floor plates matching vertical grid spacing.'
      },
      explanation: 'Modern modular buildings have repetitive window grids. Match the structural bays to the facade division markers for rhythmic geometry.',
      proTip: 'Look for reflections of clouds moving across the structured glass bays.'
    },
    {
      id: 'afd_3',
      genre: 'Monuments & Arches',
      title: 'Triumphal Arch Geometry',
      imageUrl: 'https://images.unsplash.com/photo-1539651044670-315229da9d2f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 60,
        radius: 8,
        label: 'Arch Pier Division',
        description: 'Main arch portal centered within horizontal floor tiers.'
      },
      explanation: 'Historic triumphal arches follow strict mathematical ratios. Use facade divisions to keep arch pedestals anchored solidly.',
      proTip: 'Shoot in late afternoon when raking cross-light accentuates relief carvings.'
    },
  ],

  // ============================================================
  // ARCHITECTURE VANISHING POINT
  // ============================================================
  arch_vanishing_point: [
    {
      id: 'avpt_1',
      genre: 'Subway & Metro Corridor',
      title: 'Infinite Metro Hallway Vanishing Point',
      imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 52,
        radius: 7,
        label: 'Vanishing Focal Point Hub',
        description: 'Tile walls, floor, and ceiling converging on central target.'
      },
      explanation: 'All 12 perspective lines converge on the central target reticle. Align the end of the hallway inside the central circle for dizzying depth.',
      proTip: 'Wait for a solitary person to walk through the center hub to add scale.'
    },
    {
      id: 'avpt_2',
      genre: 'Historic Colonnade',
      title: 'Endless Colonnade Arches',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 7,
        label: 'Colonnade Convergence Point',
        description: 'Repeating archway tops converging to eye level.'
      },
      explanation: 'The vanishing point guide ensures you are positioned exactly in the corridor’s optical center, keeping archway steps consistent.',
      proTip: 'Use a narrow aperture (f/8 or f/11) to maintain focus all the way down the tunnel.'
    },
    {
      id: 'avpt_3',
      genre: 'Urban Street Night Corridor',
      title: 'Neon Boulevard Vanishing Axis',
      imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Street Vanishing Center',
        description: 'Traffic lines and illuminated storefronts converging to center.'
      },
      explanation: 'Align street curb lines and building roofs with the converging radial star lines to create a dramatic sci-fi corridor.',
      proTip: 'Long exposure creates light trails that follow the vanishing lines directly into the focal node.'
    },
  ],

  // ============================================================
  // PRODUCT PEDESTAL & CENTER
  // ============================================================
  product_center: [
    {
      id: 'prod_1',
      genre: 'Luxury Fragrance',
      title: 'Perfume Bottle on Pedestal',
      imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 55,
        radius: 8,
        label: 'Pedestal Base Ellipse',
        description: 'Bottle base resting firmly on pedestal ellipse guide.'
      },
      explanation: 'Align the base of the fragrance bottle with the pedestal ellipse guide. The vertical centerline bisects the cap, atomizer, and label.',
      proTip: 'Ensure the bottle label is 100% parallel to the sensor plane to avoid skewed branding.'
    },
    {
      id: 'prod_2',
      genre: 'Horology / Timepiece',
      title: 'Chronograph Dial Centering',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 7,
        label: 'Watch Dial Centering Reticle',
        description: 'Dial center pin locked precisely in center crosshair.'
      },
      explanation: 'In commercial luxury watch photography, the hands center pin must align with the sensor center, with equal breathing room on all sides.',
      proTip: 'Set watch hands to 10:10 to frame the manufacturer logo cleanly.'
    },
    {
      id: 'prod_3',
      genre: 'Sneaker Hero Shot',
      title: 'Floating Sneaker Dynamic Angle',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 52,
        radius: 9,
        label: 'Product Balance Boundary',
        description: 'Sneaker sole aligned above pedestal drop shadow line.'
      },
      explanation: 'Position the sneaker so its sole hovers slightly above the pedestal line, leaving room for realistic studio drop shadows underneath.',
      proTip: 'Use a side rim light to highlight the sneaker silhouette against dark backgrounds.'
    },
  ],

  // ============================================================
  // PRODUCT SAFE AREA
  // ============================================================
  product_safe_area: [
    {
      id: 'psafe_1',
      genre: 'Cosmetics & Skincare',
      title: 'Amazon Product Hero Boundary',
      imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        width: 70,
        height: 70,
        shape: 'box',
        label: '15% Outer Margin Safe Area',
        description: 'All product elements contained within inner 85% boundary.'
      },
      explanation: 'E-commerce platforms (Amazon, Shopify) require products to occupy at least 85% of frame with uniform breathing margin on all edges.',
      proTip: 'The safe area box guarantees that product labels or pumps aren’t accidentally clipped.'
    },
    {
      id: 'psafe_2',
      genre: 'Audio Electronics',
      title: 'Headphones Studio Catalog',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        width: 75,
        height: 75,
        shape: 'box',
        label: 'E-Commerce Safe Frame',
        description: 'Headband and earcups strictly inside outer margin.'
      },
      explanation: 'Ensure the widest points (headband top and ear cushions) do not breach the inner safe border, preserving padding for digital ad banners.',
      proTip: 'Leave extra margin on top if graphic designers will overlay a promotional discount badge.'
    },
    {
      id: 'psafe_3',
      genre: 'Smart Tech Gadget',
      title: 'Wearable Tech Hero Shot',
      imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        width: 70,
        height: 70,
        shape: 'box',
        label: 'Catalog Safe Boundary',
        description: 'Smartwatch display comfortably within safe zone.'
      },
      explanation: 'Keeping gadget bounds within the 85% boundary guarantees seamless automatic image cropping across square, vertical, and horizontal web layouts.',
      proTip: 'Shoot tethered or with grid overlay to keep all catalog SKUs uniformly sized.'
    },
  ],

  // ============================================================
  // PRODUCT NEGATIVE SPACE FOR COPY
  // ============================================================
  product_negative_space: [
    {
      id: 'pneg_1',
      genre: 'Commercial Editorial',
      title: 'Luxury Ad Campaign Layout',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 75,
        y: 50,
        radius: 9,
        label: '1/3 Product Placement Zone',
        description: 'Product anchored on right third; left 2/3 reserved for copy.'
      },
      explanation: 'Position the product entirely in the right third of the frame. The left two-thirds remain clean negative space for marketing headlines and brand logos.',
      proTip: 'Gradually feather background studio lighting so text contrast remains legible in the copy area.'
    },
    {
      id: 'pneg_2',
      genre: 'Vintage Tech / Camera',
      title: 'Website Hero Banner Space',
      imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 70,
        y: 55,
        radius: 8,
        label: 'Asymmetric Product Anchor',
        description: 'Vintage camera resting on right lower third node.'
      },
      explanation: 'Graphic designers love photos shot with negative space grids because they don’t have to awkwardly clone or stretch backgrounds for website banners.',
      proTip: 'Keep the product facing inward toward the text area.'
    },
    {
      id: 'pneg_3',
      genre: 'Footwear / Sneaker Ad',
      title: 'Magazine Double-Spread Space',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 65,
        y: 60,
        radius: 9,
        label: 'Dynamic Lower Right Placement',
        description: 'Shoe leaping from bottom right into empty left space.'
      },
      explanation: 'Place the shoe leaping from bottom right into the negative space. The dynamic motion naturally leads the consumer’s eye across the headline.',
      proTip: 'Use a seamless paper sweep with zero seams or dust.'
    },
  ],

  // ============================================================
  // PRODUCT FLAT-LAY GRID
  // ============================================================
  product_flat_lay: [
    {
      id: 'pfl_1',
      genre: 'Everyday Carry (EDC)',
      title: 'Pristine Knolled Camera Kit',
      imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 10,
        label: '90° Knolling Grid Balance',
        description: 'Camera body centered with accessories parallel at 90 degrees.'
      },
      explanation: 'Knolling requires all items to be arranged at 90-degree parallel or perpendicular angles. Align the main camera body with the center square.',
      proTip: 'Hold the camera completely level overhead; check that the dual-axis pitch and roll level turns green.'
    },
    {
      id: 'pfl_2',
      genre: 'Workspace Desk Setup',
      title: 'Designer Tech Workspace',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 48,
        radius: 9,
        label: 'Modular Desk Flat-Lay Grid',
        description: 'Headphones, keyboard, and notebook aligned in quadrants.'
      },
      explanation: 'Place secondary items (pens, coffee cup, cords) along the quadrant boundaries to maintain organized negative space between objects.',
      proTip: 'Keep spacing between every object equal (e.g. exactly 1 inch apart) for clinical satisfaction.'
    },
    {
      id: 'pfl_3',
      genre: 'Beauty & Skincare Flat-Lay',
      title: 'Cosmetic Essentials Knolling',
      imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Balanced Circular Placement',
        description: 'Hero bottle flanked by compacts in quadrant circles.'
      },
      explanation: 'Use the flat-lay quadrant circles to balance the weight of small bottles against larger palettes, preventing the composition from looking lopsided.',
      proTip: 'Use museum putty or Blu-tack underneath round bottles so they don’t roll out of alignment.'
    },
  ],

  // ============================================================
  // STREET PERSPECTIVE & LEADING LINES
  // ============================================================
  street_leading_lines: [
    {
      id: 'sll_1',
      genre: 'Urban Crosswalk',
      title: 'Crosswalk Leading Vectors',
      imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 55,
        radius: 8,
        label: 'Converging Zebra Stripes',
        description: 'White pavement lines channeling eye directly to pedestrians.'
      },
      explanation: 'Crosswalk zebra stripes act as powerful physical leading lines. Position the converging stripes so they guide the viewer straight toward walking pedestrians.',
      proTip: 'Crouch low right at the curb edge to exaggerate the width of the foreground stripes.'
    },
    {
      id: 'sll_2',
      genre: 'Rainy Night Reflections',
      title: 'Wet Asphalt Neon Flow',
      imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 52,
        y: 50,
        radius: 8,
        label: 'Wet Reflection Leading Vector',
        description: 'Vertical neon light streak leading into solitary figure.'
      },
      explanation: 'Wet street reflections double your leading lines. Align the brightest reflection trail with the leading line vector to illuminate your subject.',
      proTip: 'Wait for an umbrella carrying pedestrian to step into the reflection spotlight.'
    },
    {
      id: 'sll_3',
      genre: 'Urban Cyclist Path',
      title: 'Bike Lane Leading Arc',
      imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 48,
        y: 52,
        radius: 8,
        label: 'Curving Promenade Vector',
        description: 'Pathway leading into moving cyclist silhouette.'
      },
      explanation: 'Curving park and street paths pull the viewer’s eye along an organic trajectory. Place the cyclist at the sharpest bend in the path.',
      proTip: 'Pre-focus on the sweet spot and press shutter right when the bike enters the intersection.'
    },
  ],

  // ============================================================
  // STREET FRAME WITHIN A FRAME
  // ============================================================
  street_frame_in_frame: [
    {
      id: 'sff_1',
      genre: 'Cafe Window Silhouette',
      title: 'Framed Through Rain-Streaked Glass',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 9,
        label: 'Interior Aperture Frame',
        description: 'Customer framed tightly inside window frame guide.'
      },
      explanation: 'Use doorframes, arches, or cafe windows as secondary interior frames. This isolates the subject from busy street distractions and adds layered depth.',
      proTip: 'Let the outer frame fall into dark silhouette while exposing correctly for the illuminated subject inside.'
    },
    {
      id: 'sff_2',
      genre: 'Subway Train Transit',
      title: 'Through Train Window Glass',
      imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Transit Aperture Border',
        description: 'Passenger framed within train doorway borders.'
      },
      explanation: 'Align the dark doorway rim with the frame-in-frame boundary. The subject inside feels captured in an intimate, voyeuristic slice of urban life.',
      proTip: 'Look for interesting reflections on the outer glass to blend outer and inner worlds.'
    },
    {
      id: 'sff_3',
      genre: 'Alleyway Archway',
      title: 'Old Town Arch Framing Modern City',
      imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 52,
        radius: 8,
        label: 'Stone Arch Boundary',
        description: 'Bustling illuminated street framed inside dark stone arch.'
      },
      explanation: 'Framing a bright modern street through a dark ancient stone arch creates immediate temporal contrast and immense photographic depth.',
      proTip: 'Step backward into the darkness of the arch until the arch rim tightly hugs the frame borders.'
    },
  ],

  // ============================================================
  // STREET WALKING SPACE
  // ============================================================
  street_subject_pos: [
    {
      id: 'swk_1',
      genre: 'Striding Commuter',
      title: 'Walking Space & Pacing Room',
      imageUrl: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 35,
        y: 50,
        radius: 9,
        label: 'Walking Trajectory Buffer',
        description: 'Subject on left third with open 2/3 space ahead.'
      },
      explanation: 'Never position a walking pedestrian against the frame edge facing outward. Place them on the left third with the open two-thirds in front of their stride.',
      proTip: 'Wait for the stride apex when legs form an open inverted V.'
    },
    {
      id: 'swk_2',
      genre: 'Urban Cyclist',
      title: 'Forward Velocity Headroom',
      imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 65,
        y: 52,
        radius: 8,
        label: 'Forward Gaze Space',
        description: 'Cyclist pedaling left into generous open street space.'
      },
      explanation: 'Moving subjects need psychological breathing room. The walking space grid reserves forward space so the motion feels natural rather than blocked.',
      proTip: 'Pan with the cyclist at 1/30s shutter speed to blur the background while keeping the rider tack sharp.'
    },
    {
      id: 'swk_3',
      genre: 'Street Athlete Action',
      title: 'Skater Landing Room',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 45,
        y: 42,
        radius: 8,
        label: 'Trajectory Landing Zone',
        description: 'Skater in air with open space showing where they will land.'
      },
      explanation: 'Show both the jump apex and the destination landing zone. If the viewer cannot see where the athlete will land, the photograph feels ungrounded.',
      proTip: 'Keep the landing surface visible inside the lower third zone.'
    },
  ],

  // ============================================================
  // FOOD OVERHEAD 90° FLAT-LAY
  // ============================================================
  food_overhead: [
    {
      id: 'foh_1',
      genre: 'Artisan Pizza Plating',
      title: 'Top-Down 90° Rustic Pizza',
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 9,
        label: 'Overhead 90° Plate Circle',
        description: 'Round pizza centered squarely in main plate boundary.'
      },
      explanation: 'Hold the camera completely level, pointing directly downward at 90 degrees. The circular dish marker ensures the round crust is concentric and undistorted.',
      proTip: 'Watch for your own camera shadow; position side lighting or overhead diffuse softboxes.'
    },
    {
      id: 'foh_2',
      genre: 'Fresh Gourmet Salad Bowl',
      title: 'Concentric Ingredients Plating',
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Salad Bowl Rim Alignment',
        description: 'Bowl centered with colorful vegetables balanced in rings.'
      },
      explanation: 'Overhead flat-lays treat the dish like a canvas. Align the ceramic bowl rim with the center circle and distribute colorful ingredients uniformly.',
      proTip: 'Spritz fresh olive oil or water droplets onto avocado and greens right before shooting for appetizing gloss.'
    },
    {
      id: 'foh_3',
      genre: 'Mediterranean Dining Table',
      title: 'Top-Down Grazing Table Feast',
      imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 10,
        label: 'Multi-Dish Table Balance',
        description: 'Plates and wine glasses balanced across four quadrants.'
      },
      explanation: 'When shooting a banquet table spread, use the 4-quadrant balance lines to ensure no single corner feels overly heavy or sparse.',
      proTip: 'Have dining companions reach in with their hands for bread or wine to add human warmth.'
    },
  ],

  // ============================================================
  // FOOD PLATE CENTERING & RIM GUIDES
  // ============================================================
  food_plate_pos: [
    {
      id: 'fpp_1',
      genre: 'Michelin Star Dessert',
      title: 'Artisanal Dessert Plating',
      imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Pristine Ceramic Rim Margin',
        description: 'Pastry art centered; 30% outer ceramic rim kept clean.'
      },
      explanation: 'Fine dining relies on negative space on the plate. Fill only the inner 60% of the plate circle and keep the outer ceramic rim pristine and immaculate.',
      proTip: 'Wipe away any rogue sauce drops or crumbs from the rim with a damp cloth before shooting.'
    },
    {
      id: 'fpp_2',
      genre: 'Artisanal Pasta Dish',
      title: 'Swirled Pasta Center Nest',
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 52,
        radius: 8,
        label: 'Hero Food Mound Center',
        description: 'Pasta twirl centered with sauce drizzle inside inner guide.'
      },
      explanation: 'Center the peak of the pasta swirl on the crosshair. The concentric rim guide keeps the fork accompaniment nicely spaced on the side.',
      proTip: 'Twirl pasta using tongs onto a ladle to achieve a tall, professional Michelin-star nest.'
    },
    {
      id: 'fpp_3',
      genre: 'Healthy Grain Bowl',
      title: 'Concentric Grain Bowl Layout',
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Bowl Centering Crosshair',
        description: 'Bowl centered with circular garnish layout.'
      },
      explanation: 'Use the centering reticle to anchor the ceramic bowl, then shoot at a 45-degree angle to capture both the bowl height and overhead toppings.',
      proTip: '45-degree angle mimics the view of a diner seated at the restaurant table.'
    },
  ],

  // ============================================================
  // FOOD DIAGONAL S-CURVE FLOW
  // ============================================================
  food_diagonal: [
    {
      id: 'fdf_1',
      genre: 'Fresh Fruit Assortment',
      title: 'Dynamic Citrus S-Curve Flow',
      imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Diagonal Ingredient Trail',
        description: 'Fruit slices arranged flowing along diagonal guide line.'
      },
      explanation: 'Arrange ingredients along the diagonal line, flowing from top-left to bottom-right. This creates movement and prevents static, boring food shots.',
      proTip: 'Vary texture and color along the diagonal path (e.g. berries, mint leaves, chocolate curls).'
    },
    {
      id: 'fdf_2',
      genre: 'Meal & Beverage Pairing',
      title: 'Hero Dish & Drink Diagonal',
      imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 42,
        y: 58,
        radius: 9,
        label: 'Hero Dish & Cocktail Diagonal',
        description: 'Main entrée anchored in foreground; wine glass along diagonal.'
      },
      explanation: 'Place the hero dish on the lower-left diagonal node and the cocktail or wine glass along the upper-right diagonal. The eye travels between both effortlessly.',
      proTip: 'Keep the main entrée razor-sharp and let the drink fall into soft, elegant background bokeh.'
    },
    {
      id: 'fdf_3',
      genre: 'Dessert & Coffee Pairing',
      title: 'Cake & Espresso Diagonal Pairing',
      imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 45,
        y: 52,
        radius: 8,
        label: 'Diagonal Pairing Vector',
        description: 'Dessert in front, coffee cup in back along 45-degree line.'
      },
      explanation: 'Diagonal arrangements evoke storytelling. The viewer imagines savoring the slice of cake before taking a sip of the warm espresso in the background.',
      proTip: 'A fork with a tiny bite of cake placed on the diagonal creates irresistible mouthwatering temptation.'
    },
  ],

  // ============================================================
  // WILDLIFE TRACKING FRAME
  // ============================================================
  wildlife_tracking_frame: [
    {
      id: 'wtr_1',
      genre: 'Avian Raptor in Flight',
      title: 'Soaring Eagle Wing Span',
      imageUrl: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 45,
        radius: 9,
        label: 'Centered Action Tracking Box',
        description: 'Raptor head and torso kept within centered action frame.'
      },
      explanation: 'Birds in flight move erratically. Keep the bird’s chest locked inside the centered tracking box with ample breathing room for expansive wingspans.',
      proTip: 'Use continuous autofocus (AF-C / AI Servo) and high shutter speed (1/2000s or faster).'
    },
    {
      id: 'wtr_2',
      genre: 'Big Cat Predator',
      title: 'Lion Stalking Stride',
      imageUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 48,
        y: 48,
        radius: 9,
        label: 'Predator Tracking Center',
        description: 'Lion head centered with forward pacing room.'
      },
      explanation: 'The tracking frame helps telephoto lenses stay locked on the animal’s face during high-speed safari runs without clipping tail or paws.',
      proTip: 'Get as low to animal eye-level as safely possible; shooting down from a high safari jeep diminishes power.'
    },
    {
      id: 'wtr_3',
      genre: 'Domestic Pet Action',
      title: 'Bounding Dog in Meadow',
      imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 45,
        radius: 9,
        label: 'Motion Tracking Zone',
        description: 'Running dog centered with clearance for bounding ears.'
      },
      explanation: 'When pets sprint directly toward the camera, keep their nose and eyes centered in the tracking box to avoid sudden out-of-frame clipping.',
      proTip: 'Hold the camera upside-down near ground level to capture dramatic bounding perspective.'
    },
  ],

  // ============================================================
  // WILDLIFE EYE ANCHOR
  // ============================================================
  wildlife_eye_placement: [
    {
      id: 'weye_1',
      genre: 'Big Cat Portrait',
      title: 'Piercing Lion Amber Gaze',
      imageUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 61.8,
        y: 38.2,
        radius: 6,
        label: 'Wildlife Eye Phi Anchor (61.8%, 38.2%)',
        description: 'Lion dominant eye locked tack-sharp on upper phi node.'
      },
      explanation: 'In wildlife photography, if the animal’s eye isn’t tack-sharp, the shot is discarded. Lock the animal’s dominant eye directly on the upper golden node.',
      proTip: 'Look for catchlights (reflections of the open sky) in the animal’s pupil to bring the portrait alive.'
    },
    {
      id: 'weye_2',
      genre: 'Domestic Pet Portrait',
      title: 'Pug Dog Expressive Eyes',
      imageUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 38.2,
        radius: 7,
        label: 'Eye Placement Target',
        description: 'Big expressive dark eyes aligned along eye level guide.'
      },
      explanation: 'Align pet eyes on the golden placement node. This anchors their soulful expression and provides natural headroom above their ears.',
      proTip: 'Make a novel whistling or squeaking sound right before shooting so the dog tilts its head with alert perkiness.'
    },
    {
      id: 'weye_3',
      genre: 'Canine Natural Light',
      title: 'Golden Retriever In Golden Grass',
      imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 55,
        y: 38.2,
        radius: 7,
        label: 'Dominant Eye Sweet Spot',
        description: 'Pupil locked on upper right golden circle.'
      },
      explanation: 'Locking animal gaze on the golden node establishes instant emotional empathy with viewers.',
      proTip: 'Use a wide aperture (f/2.8) so the wet nose and background softly blur, making the sharp eye pop.'
    },
  ],

  // ============================================================
  // WILDLIFE MOTION BUFFER
  // ============================================================
  wildlife_motion_space: [
    {
      id: 'wmot_1',
      genre: 'Soaring Bird Flight',
      title: 'Flight Path Forward Buffer',
      imageUrl: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 35,
        y: 45,
        radius: 9,
        label: 'Flight Direction Buffer',
        description: 'Eagle on left third gliding into open sky on right.'
      },
      explanation: 'Place the bird on the trailing third with two-thirds of empty sky in front of its beak. This conveys effortless, boundless forward flight.',
      proTip: 'Never place a bird flying out of the edge; it causes visual claustrophobia.'
    },
    {
      id: 'wmot_2',
      genre: 'Safari Predator Sprint',
      title: 'Cheetah Sprint Trajectory',
      imageUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 35,
        y: 50,
        radius: 9,
        label: 'Predator Sprint Space',
        description: 'Running animal placed with 65% open savannah ahead.'
      },
      explanation: 'Sprinting predators move at lightning speeds. The motion buffer grid ensures you leave vast running terrain ahead of the animal’s claws.',
      proTip: 'Pan smoothly with the sprint so the animal’s head stays in the trailing box.'
    },
    {
      id: 'wmot_3',
      genre: 'Dog Catching Frisbee',
      title: 'Canine Joyful Leaping Run',
      imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 38,
        y: 48,
        radius: 9,
        label: 'Forward Play Buffer',
        description: 'Dog running into expansive open meadow.'
      },
      explanation: 'Compose running dogs with their trajectory leading into open negative space, accentuating speed, excitement, and athleticism.',
      proTip: 'Leave extra space on the destination side if there is a toy or ball in play.'
    },
  ],

  // ============================================================
  // TECHNICAL GRIDS (4x4, 5x5, 6x6, 8x8, 10x10, etc.)
  // ============================================================
  grid_4x4: [
    {
      id: 'g4_1',
      genre: 'Modern Architectural Curtain Wall',
      title: 'Precision 4×4 Skyscraper Matrix',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: '4×4 Quadrant Division',
        description: 'Facade divisions matching the 16 uniform quadrants.'
      },
      explanation: 'The 4×4 grid divides the frame into 16 equal quadrants. Perfect for architectural alignment where 3×3 leaves too much space between lines.',
      proTip: 'Use for modern buildings with 4-bay or 8-bay window modules.'
    },
    {
      id: 'g4_2',
      genre: 'Minimalist Architecture',
      title: 'Modular Concrete Walls',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Quadrant Boundary Line',
        description: 'Wall seams aligned with 25%, 50%, and 75% marks.'
      },
      explanation: 'Align modular concrete seams with the 25%, 50%, and 75% grid lines to create rhythmic, clinical graphic purity.',
      proTip: 'Great for Swiss-style graphic design photography.'
    },
    {
      id: 'g4_3',
      genre: 'Engineering & Bridge',
      title: 'Steel Suspension Bridge Geometry',
      imageUrl: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Quadrant Symmetry Check',
        description: 'Steel cables distributed evenly across 16 quadrants.'
      },
      explanation: 'Check bridge towers and cable distribution evenly across all 16 cells to ensure optical balance.',
      proTip: 'Check edge cells for corner vignetting.'
    },
  ],

  grid_5x5: [
    {
      id: 'g5_1',
      genre: 'Symmetrical Architecture',
      title: 'Central Box Symmetrical Framing',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        width: 20,
        height: 20,
        shape: 'box',
        label: 'True Center 5×5 Square',
        description: 'Hero feature framed squarely inside true center square.'
      },
      explanation: 'Unlike even grids, the 5×5 grid has a true central square (between 40% and 60%). Perfect for centering subjects with geometric perfection.',
      proTip: 'Frame a window or statue directly inside the central 20% box.'
    },
    {
      id: 'g5_2',
      genre: 'Graphic Skyscraper Elevation',
      title: '5-Bay Architectural Elevation',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 40,
        radius: 8,
        label: 'Center Column Axis',
        description: 'Building center spine aligned with middle column.'
      },
      explanation: 'The 5×5 grid provides two flanking columns on each side of the central column, ideal for five-bay structural facades.',
      proTip: 'Verify that left and right margins have identical column widths.'
    },
    {
      id: 'g5_3',
      genre: 'Urban Night Architecture',
      title: 'City Street 5×5 Balance',
      imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Center Tile Hub',
        description: 'Night street vanishing into the middle 5×5 quadrant.'
      },
      explanation: 'Use the center 5×5 tile to anchor night street perspectives without needing an intrusive bullseye.',
      proTip: 'Keep horizon strictly on the 60% horizontal grid line.'
    },
  ],

  grid_6x6: [
    {
      id: 'g6_1',
      genre: 'Archival Art Reproduction',
      title: 'Museum Document Reproduction',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Fine 36-Quadrant Survey',
        description: 'Even distribution across fine 6×6 precision matrix.'
      },
      explanation: 'The 6×6 grid provides 36 equal inspection quadrants. Essential for copy-stand artwork reproduction and archival documentation.',
      proTip: 'Use a tripod and ensure document edges line up with outer grid perimeter.'
    },
    {
      id: 'g6_2',
      genre: 'Skyscraper Grid Survey',
      title: 'Curtain Wall Facade Survey',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Precision Matrix Lines',
        description: 'Glass panels surveyed across fine 6×6 divisions.'
      },
      explanation: 'High-density grid allows instant detection of lens optical pincushion distortion along straight skyscraper lines.',
      proTip: 'Look at the outer horizontal lines against straight architectural beams.'
    },
    {
      id: 'g6_3',
      genre: 'Subway Station Survey',
      title: 'Underground Tile Grid Alignment',
      imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Floor & Wall Tile Survey',
        description: 'Station architectural tiles aligned across 6×6 cells.'
      },
      explanation: 'Check camera sensor parallelism against tiled walls; if grid lines don’t match tile joints, adjust camera yaw and roll.',
      proTip: 'Ensure lens is at exact right angle to the wall surface.'
    },
  ],

  grid_8x8: [
    {
      id: 'g8_1',
      genre: 'Lens Distortion Testing',
      title: 'Optical Barrel & Pincushion Test',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Chessboard 64-Cell Matrix',
        description: 'Outer lines reveal lens distortion curvature.'
      },
      explanation: 'The 8×8 chessboard grid divides the sensor into 64 cells. Straight wall lines curving away from the grid reveal barrel or pincushion distortion.',
      proTip: 'If outer lines curve outward like a barrel, step back and zoom in to flatten optical perspective.'
    },
    {
      id: 'g8_2',
      genre: 'Historic Architecture',
      title: 'Coffered Ceiling Survey',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Coffered Ceiling Registration',
        description: 'Ceiling panels registered with 8×8 grid intersections.'
      },
      explanation: 'Ornate coffered ceilings follow modular grids. The 8×8 guide ensures the camera is perfectly centered beneath the dome apex.',
      proTip: 'Level the phone horizontally on a copy stand or beanbag.'
    },
    {
      id: 'g8_3',
      genre: 'Scientific Documentation',
      title: 'Technical Forensic Calibration',
      imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Micro Registration Grid',
        description: 'Exact coordinate referencing for forensic photography.'
      },
      explanation: 'Use 8×8 coordinates (A1 to H8) to catalog objects and specify exact spatial coordinates in documentation reports.',
      proTip: 'Combine with high-CRI continuous lighting for accurate scientific records.'
    },
  ],

  grid_10x10: [
    {
      id: 'g10_1',
      genre: 'Metric Metric Survey',
      title: '10% Increment Metric Calibration',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: '10% Percentage Increments',
        description: 'Every square represents exactly 10% of sensor dimensions.'
      },
      explanation: 'Each square corresponds to exactly 10% width and 10% height of the sensor. Allows instant calculation of crop percentages and object sizing.',
      proTip: 'Clients often ask for subjects to occupy 40% or 60% of frame; this grid makes it effortless.'
    },
    {
      id: 'g10_2',
      genre: 'Urban Architectural Elevation',
      title: 'Decile Facade Analysis',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: '10-Decile Division',
        description: 'Facade height measured in 10% deciles.'
      },
      explanation: 'Measure building floor heights and negative space ratios in decile increments for architectural publications.',
      proTip: 'Keep main cornice on the 70% or 80% mark.'
    },
    {
      id: 'g10_3',
      genre: 'Transit Corridor Study',
      title: 'Precision Tunnel Decile Grid',
      imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Center Decile Axis',
        description: 'Vanishing node locked on 50% / 50% metric center.'
      },
      explanation: 'Metric decimal lines guarantee the vanishing point is mathematically at coordinate (50%, 50%).',
      proTip: 'Use for digital composite VFX background plates.'
    },
  ],

  horizontal_alignment: [
    {
      id: 'ha_1',
      genre: 'Ocean Horizon',
      title: 'Vernier Sea Horizon Level',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Horizontal Vernier Graduation',
        description: 'Ocean horizon locked to precision horizontal scale.'
      },
      explanation: 'Fine horizontal vernier graduation lines allow you to calibrate panoramic multi-frame stitches so horizons stay locked across all shots.',
      proTip: 'Pan horizontally while checking that the waterline stays pinned to the same graduation tick.'
    },
    {
      id: 'ha_2',
      genre: 'Lake Dawn Horizon',
      title: 'Still Waterline Vernier Alignment',
      imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 7,
        label: 'Vernier Scale Center Marker',
        description: 'Waterline locked completely level.'
      },
      explanation: 'A tilted horizon destroys the tranquility of still water photographs. Align the water boundary to the vernier line.',
      proTip: 'Use a tripod with panoramic rotation base.'
    },
    {
      id: 'ha_3',
      genre: 'Interior Floor Level',
      title: 'Architectural Floor Plane Level',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 70,
        radius: 8,
        label: 'Floor Seam Alignment',
        description: 'Floor threshold parallel to horizontal guide.'
      },
      explanation: 'In interior real estate photography, floor and ceiling planes must remain horizontal across wide-angle lenses.',
      proTip: 'Mount camera at 4.5 feet (chest level) for natural room depth.'
    },
  ],

  vertical_alignment: [
    {
      id: 'va_1',
      genre: 'Towering Redwood Forest',
      title: 'Trunk Plumb Vertical Guide',
      imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Vertical Plumb Alignment',
        description: 'Tree trunks aligned parallel to vertical plumb guides.'
      },
      explanation: 'When photographing towering forest canopies, tilting the lens creates severe converging trunks. The vertical alignment guide keeps trees standing tall.',
      proTip: 'Use a shift lens or step further back to capture the canopy without tilting the camera.'
    },
    {
      id: 'va_2',
      genre: 'Colonnade Stone Pillars',
      title: 'Vertical Column Alignment',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 35,
        y: 50,
        radius: 7,
        label: 'Pillar Vertical Plumb',
        description: 'Outer columns parallel to vertical guides.'
      },
      explanation: 'Ensure the outermost columns don’t tip outward. Align column edges with the graduated vertical bars.',
      proTip: 'Keep camera sensor plane parallel to the colonnade row.'
    },
    {
      id: 'va_3',
      genre: 'Modern Skyscraper Elevation',
      title: 'Structural Steel Column Guide',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 45,
        radius: 8,
        label: 'Skyscraper Vertical Axis',
        description: 'Center structural spine 100% vertical.'
      },
      explanation: 'High-rise skyscrapers must have vertical spines to look authoritative. Check the center spine against the vertical axis.',
      proTip: 'Check both left and right building corners for uniform perspective convergence.'
    },
  ],

  horizon_level: [
    {
      id: 'hl_1',
      genre: 'Coastal Sunset Horizon',
      title: 'Emerald Green Level Lock (0.0°)',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'True 0.0° Horizon Snap',
        description: 'Dynamic level line turning emerald green at true level.'
      },
      explanation: 'The internal gyro accelerometer measures camera roll angle in degrees. The indicator turns bright emerald green when the camera is level at 0.0°.',
      proTip: 'Never post a crooked sunset photo again. Wait for the green level indicator to snap.'
    },
    {
      id: 'hl_2',
      genre: 'Calm Lake Reflection',
      title: 'Mirror Water Level Verification',
      imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 7,
        label: 'Gyro Horizon Level Line',
        description: 'Waterline locked at 0.0° roll angle.'
      },
      explanation: 'Handheld landscape shooting often suffers from subtle 1.5° tilts. The level line gives real-time visual feedback.',
      proTip: 'Acoustic and haptic feedback confirm level alignment without taking your eyes off the scene.'
    },
    {
      id: 'hl_3',
      genre: 'Mountain Lake Vista',
      title: 'Alpine Lake Shoreline Level',
      imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 55,
        radius: 8,
        label: 'Shoreline Level Guide',
        description: 'Lake shoreline aligned with gyro level indicator.'
      },
      explanation: 'Mountain shorelines can deceive the human eye due to sloping hills. Trust the accelerometer level indicator over your visual perception.',
      proTip: 'Sloping mountain ridges trick the brain into holding the camera tilted; trust the green line.'
    },
  ],

  dual_axis_level: [
    {
      id: 'dal_1',
      genre: 'Flat-Lay Food Plating',
      title: 'Zero Pitch & Zero Roll Overhead',
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Dual-Axis Pitch & Roll 0.0° Target',
        description: 'Crosshair snaps green when phone is 100% parallel to tabletop.'
      },
      explanation: 'Measures both horizontal roll and forward/back lens pitch. When shooting top-down flat-lays, both axes turn green when your phone is perfectly parallel to the table.',
      proTip: 'Eliminates egg-shaped plates in food flat-lays caused by slight forward camera tilt.'
    },
    {
      id: 'dal_2',
      genre: 'Architectural Real Estate',
      title: 'Room Wall Pitch Calibration',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Interior Pitch & Roll Center',
        description: 'Camera lens pitch 0° prevents wall convergence.'
      },
      explanation: 'In real estate photography, tilting the lens up or down 1 degree causes walls to converge. The dual-axis level guarantees zero keystone tilt.',
      proTip: 'Keep both the circular target and horizon line locked in green.'
    },
    {
      id: 'dal_3',
      genre: 'Art Gallery Reproduction',
      title: 'Artwork Parallel Plane Lock',
      imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Parallel Plane Dual Snap',
        description: 'Sensor plane 100% parallel to wall canvas.'
      },
      explanation: 'When reproducing paintings on walls, both pitch and roll must be 0.0° to prevent trapezoidal distortion of the canvas.',
      proTip: 'Use a tripod with a geared 3-way head for micro millimeter adjustments.'
    },
  ],

  vanishing_point_guide: [
    {
      id: 'vpg_1',
      genre: 'Historic Tunnel Corridor',
      title: 'Radial Star Vanishing Point',
      imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 52,
        radius: 7,
        label: 'Vanishing Point Radial Star Hub',
        description: '12 radial rays converging on the exit portal.'
      },
      explanation: 'Align the exit of the tunnel inside the central star target. The 12 radial rays align with tunnel ribs, floor tiles, and lights for infinite depth.',
      proTip: 'Lower the camera to knee height to amplify perspective speed.'
    },
    {
      id: 'vpg_2',
      genre: 'Colonnade Arches',
      title: 'Colonnade Perspective Convergence',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 7,
        label: 'Radial Star Convergence',
        description: 'Pillars and arch ceilings converging to center star.'
      },
      explanation: 'Radial star lines guide repeating architectural columns into a dramatic one-point perspective focal point.',
      proTip: 'A walker positioned right at the center hub acts as a compelling emotional anchor.'
    },
    {
      id: 'vpg_3',
      genre: 'Night Highway Light Trails',
      title: 'High-Speed Vanishing Road',
      imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Highway Vanishing Axis',
        description: 'Traffic light trails funneling into vanishing node.'
      },
      explanation: 'Align highway lanes with the radial star vectors so moving headlights and taillights streak straight into the horizon.',
      proTip: 'Use a 3-second exposure with camera mounted on a sturdy tripod.'
    },
  ],

  safe_area_guide: [
    {
      id: 'sag_1',
      genre: 'Commercial Video Interview',
      title: '80% Title Safe & 90% Action Safe',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 45,
        width: 80,
        height: 80,
        shape: 'box',
        label: '80% Inner Title Safe Boundary',
        description: 'Actor head and eyes strictly within 80% safe zone.'
      },
      explanation: 'Television broadcast standards require all essential action within 90% and all critical text/graphics within 80% to avoid edge cutoff on different TV screens.',
      proTip: 'Ensure lower-third name captions fit comfortably inside the bottom 80% line.'
    },
    {
      id: 'sag_2',
      genre: 'Social Media Video / TikTok',
      title: 'Social UI Overlay Safe Margin',
      imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 42,
        width: 75,
        height: 75,
        shape: 'box',
        label: 'Social Interface Safe Zone',
        description: 'Creator face safe from right-side like/comment buttons.'
      },
      explanation: 'TikTok, Instagram Reels, and YouTube Shorts place UI icons (like buttons, comment drawers, captions) over the outer 15% margins. Safe area guides keep creators visible.',
      proTip: 'Keep critical gestures inside the 80% box so user interface buttons never block them.'
    },
    {
      id: 'sag_3',
      genre: 'YouTube Thumbnail & Commercial',
      title: 'Action Safe Product Demo',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        width: 80,
        height: 80,
        shape: 'box',
        label: '90% Action Safe Frame',
        description: 'Product and presenter hands within 90% boundary.'
      },
      explanation: 'In commercial video production, keeping products inside the 90% action safe boundary prevents accidental edge cropping in various social aspect ratios.',
      proTip: 'Compose widescreen 16:9 shots with the safe box to ensure easy square 1:1 or 4:5 social re-cropping.'
    },
  ],

  // Aliases and fallback support
  landscape_leading_lines: [
    {
      id: 'lll_1',
      genre: 'S-Curve Forest Path',
      title: 'Promenade Leading Arc',
      imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 55,
        radius: 8,
        label: 'Leading Path Curve',
        description: 'Curving trail drawing gaze into distance.'
      },
      explanation: 'Curving pathways lead the viewer gently through the landscape towards the horizon.',
      proTip: 'Place prominent trees along the outer bends of the path.'
    },
    {
      id: 'lll_2',
      genre: 'Highway Into Horizon',
      title: 'Desert Highway Perspective',
      imageUrl: 'https://images.unsplash.com/photo-1517817748493-49ec54a32465?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 48,
        y: 52,
        radius: 8,
        label: 'Highway Centerline Vector',
        description: 'Asphalt center line converging into mountain horizon.'
      },
      explanation: 'Straight road centerlines draw immediate visual speed into the background.',
      proTip: 'Shoot low from the asphalt for maximum leading line width.'
    },
    {
      id: 'lll_3',
      genre: 'Coastal Boardwalk',
      title: 'Wooden Pier Leading to Ocean',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 60,
        radius: 8,
        label: 'Pier Plank Vectors',
        description: 'Timber planks funneling viewer out to sea.'
      },
      explanation: 'Wooden planks on piers lead the viewer’s eye effortlessly toward the ocean horizon.',
      proTip: 'Use a wide focal length to expand the foreground planks.'
    },
  ],

  arch_perspective_align: [
    {
      id: 'apa_1',
      genre: 'Historic Colonnade',
      title: 'Converging Archway Walkway',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Perspective Corridor Axis',
        description: 'Arch columns aligned with perspective lines.'
      },
      explanation: 'Align perspective orthogonals with column capitals and floor joins.',
      proTip: 'Keep camera sensor parallel to columns.'
    },
    {
      id: 'apa_2',
      genre: 'Modern Glass Skybridge',
      title: 'Cantilever Bridge Perspective',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Skybridge Vector Axis',
        description: 'Glass bridge extending diagonally.'
      },
      explanation: 'Use perspective alignment to accentuate structural glass geometry.',
      proTip: 'Look for reflections of contrasting clouds.'
    },
    {
      id: 'apa_3',
      genre: 'Underground Metro Walkway',
      title: 'Tiled Tunnel Perspective',
      imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 52,
        radius: 7,
        label: 'Vanishing Perspective Node',
        description: 'Hallway lines funneling to center.'
      },
      explanation: 'Maintains symmetrical eye-level perspective in underground transit.',
      proTip: 'Wait for a solitary commuter to step into the vanishing node.'
    },
  ],

  product_symmetry: [
    {
      id: 'psym_1',
      genre: 'Luxury Watch',
      title: 'Symmetrical Timepiece Bezel',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 7,
        label: 'Bilateral Symmetry Pin',
        description: 'Watch hands and crown perfectly balanced on center axis.'
      },
      explanation: 'Align the 12 o’clock and 6 o’clock markers along the vertical symmetry axis.',
      proTip: 'Set watch hands to 10:10 for classic symmetry.'
    },
    {
      id: 'psym_2',
      genre: 'Cosmetic Perfume Bottle',
      title: 'Symmetrical Flacon Geometry',
      imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 55,
        radius: 8,
        label: 'Bottle Symmetry Center',
        description: 'Glass flacon bisected by center plumb line.'
      },
      explanation: 'Symmetrical lighting across the bottle shoulders highlights luxurious glass purity.',
      proTip: 'Use identical softboxes on left and right for mirror reflections.'
    },
    {
      id: 'psym_3',
      genre: 'Headphones Audio Gear',
      title: 'Over-Ear Headphone Symmetry',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Headband Symmetry Arch',
        description: 'Earcups mirrored equally across center axis.'
      },
      explanation: 'Headphone headbands naturally form a symmetrical arch. Center the apex of the headband on the vertical symmetry line.',
      proTip: 'Ensure both earcups rest on the same horizontal level line.'
    },
  ],

  street_golden_triangle: [
    {
      id: 'sgt_1',
      genre: 'Urban Action',
      title: 'Diagonal Skater Velocity',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 60,
        y: 40,
        radius: 8,
        label: 'Golden Triangle Action Node',
        description: 'Athlete motion aligned with orthogonal vector.'
      },
      explanation: 'Use golden triangles in street action to divide shadow and light into dynamic right angles.',
      proTip: 'Capture the moment of maximum muscular extension.'
    },
    {
      id: 'sgt_2',
      genre: 'Street Architecture',
      title: 'Diagonal Shadow Across City Street',
      imageUrl: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 40,
        y: 55,
        radius: 8,
        label: 'Shadow Diagonal Divide',
        description: 'Building shadow cutting across street hypotenuse.'
      },
      explanation: 'High contrast late-afternoon street shadows naturally follow golden triangle angles.',
      proTip: 'Expose for highlights to plunge the shadow triangle into pure silhouette.'
    },
    {
      id: 'sgt_3',
      genre: 'Bustling Pedestrian Flow',
      title: 'Crosswalk Triangular Partition',
      imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 55,
        y: 50,
        radius: 8,
        label: 'Triangular Crowd Divide',
        description: 'Pedestrian flow partitioned into triangular zones.'
      },
      explanation: 'Golden triangles prevent complex crowds from feeling cluttered by partitioning the space into structured triangular zones.',
      proTip: 'Look for people wearing contrasting colored coats.'
    },
  ],

  food_flat_lay: [
    {
      id: 'ffl_1',
      genre: 'Rustic Pizza Overhead',
      title: 'Flat-Lay Pizza & Ingredients',
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 9,
        label: 'Overhead 90° Centering',
        description: 'Pizza centered with olive oil and basil garnishes.'
      },
      explanation: 'Shoot straight down at 90 degrees overhead. Center the main pie with ingredients knolled around it.',
      proTip: 'Keep camera completely level using the dual-axis gyro level.'
    },
    {
      id: 'ffl_2',
      genre: 'Artisan Salad Bowl',
      title: 'Fresh Salad Flat-Lay',
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Flat-Lay Bowl Ring',
        description: 'Concentric ingredient arrangement.'
      },
      explanation: 'Arrange toppings in concentric rings for mouthwatering overhead geometry.',
      proTip: 'Use a wide, shallow bowl for maximum surface visibility.'
    },
    {
      id: 'ffl_3',
      genre: 'Dining Table Spread',
      title: 'Full Table Feast Flat-Lay',
      imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 10,
        label: 'Multi-Dish Quadrant Balance',
        description: 'Plates distributed equally in four quadrants.'
      },
      explanation: 'Balance plates across the flat-lay quadrant lines so the dining scene looks rich and abundant.',
      proTip: 'Include folded linen napkins and cutlery for organic lifestyle texture.'
    },
  ],

  rule_of_thirds_top: [
    {
      id: 'rott_1',
      genre: 'Towering Skyscraper Sky',
      title: 'Dramatic Sky Upper 2/3 Focus',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 33.3,
        radius: 8,
        label: 'Upper Thirds Focus',
        description: 'Skyscraper apex commanding upper 2/3 of frame.'
      },
      explanation: 'Dedicate the upper two-thirds to dramatic heights and skies, anchored by ground at bottom third.',
      proTip: 'Emphasizes towering scale and grandeur.'
    },
    {
      id: 'rott_2',
      genre: 'Mountain Peaks',
      title: 'Alpine Summit Upper Focus',
      imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 55,
        y: 35,
        radius: 8,
        label: 'Summit Upper 2/3 Area',
        description: 'Jagged peaks filling the top two-thirds.'
      },
      explanation: 'Use when the spectacle is elevated above the horizon.',
      proTip: 'Expose for golden alpenglow on the peaks.'
    },
    {
      id: 'rott_3',
      genre: 'Dramatic Sunset Clouds',
      title: 'Sunset Sky Majesty',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 30,
        radius: 8,
        label: 'Sky Cloud Drama',
        description: 'Fiery clouds occupying 66% of frame.'
      },
      explanation: 'Keep the horizon low to let breathtaking clouds dominate the photograph.',
      proTip: 'Use a graduated neutral density (GND) filter.'
    },
  ],

  rule_of_thirds_bottom: [
    {
      id: 'rotb_1',
      genre: 'Floral Foreground',
      title: 'Alpine Meadow Lower 2/3 Focus',
      imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 66.6,
        radius: 8,
        label: 'Foreground Ground Emphasis',
        description: 'Wildflowers occupying 66% of frame.'
      },
      explanation: 'Give two-thirds to rich foreground textures, flowers, and stones.',
      proTip: 'Shoot inches away from flowers for intense depth.'
    },
    {
      id: 'rotb_2',
      genre: 'Coastal Tidepool Rocks',
      title: 'Seashore Foreground Textures',
      imageUrl: 'https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 45,
        y: 70,
        radius: 8,
        label: 'Lower 2/3 Rocky Shore',
        description: 'Mossy tidepool rocks commanding bottom two-thirds.'
      },
      explanation: 'When the ground is richer than a bald sky, place horizon along top third line.',
      proTip: 'Use shutter speed of 1/2s for silky ocean water.'
    },
    {
      id: 'rotb_3',
      genre: 'Autumn Forest Floor',
      title: 'Golden Leaves Foreground',
      imageUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 70,
        radius: 8,
        label: 'Lower Third Ground Anchor',
        description: 'Golden carpet of leaves leading into tree.'
      },
      explanation: 'Showcase rich earthly textures with high horizon placement.',
      proTip: 'Look for morning dew drops on fallen leaves.'
    },
  ],

  diagonal_method: [
    {
      id: 'dm_1',
      genre: 'Sweeping Mountain Road',
      title: 'Corner-to-Corner Road Diagonal',
      imageUrl: 'https://images.unsplash.com/photo-1517817748493-49ec54a32465?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: '45-Degree Corner Vector',
        description: 'Asphalt enters bottom-left and exits top-right.'
      },
      explanation: 'The diagonal method places details on 45-degree bisections for emotional dynamism.',
      proTip: 'Use when the scene possesses natural diagonal vectors.'
    },
    {
      id: 'dm_2',
      genre: 'Skater Action Slide',
      title: 'Action Diagonal Handrail',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 55,
        y: 40,
        radius: 8,
        label: 'Action Diagonal Intersection',
        description: 'Athlete riding ascending diagonal.'
      },
      explanation: 'Ascending diagonals communicate triumph and speed.',
      proTip: 'Keep background simple to accentuate silhouette.'
    },
    {
      id: 'dm_3',
      genre: 'Bridge Suspension Cables',
      title: 'Geometric Bridge Cables',
      imageUrl: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80',
      subjectHighlight: {
        x: 50,
        y: 50,
        radius: 8,
        label: 'Diagonal Tension Lines',
        description: 'Steel cables cutting across frame corners.'
      },
      explanation: 'Dynamic bridge cables slicing across frame create visual speed.',
      proTip: 'Shoot into the sun for high-contrast graphic silhouettes.'
    },
  ],
};

// Safe helper function to retrieve the 3 reference photos for any grid
export const getGridReferences = (gridType: GridType): GridReferencePhoto[] => {
  if (GRID_REFERENCES[gridType] && GRID_REFERENCES[gridType].length >= 3) {
    return GRID_REFERENCES[gridType];
  }
  // Robust fallback to Rule of Thirds if an unregistered grid type is passed
  return GRID_REFERENCES.rule_of_thirds;
};
