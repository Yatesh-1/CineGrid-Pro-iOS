export type GhostBlendMode = 'screen' | 'normal' | 'difference' | 'multiply' | 'overlay';

export interface GhostOverlaySettings {
  enabled: boolean;
  imageUrl: string | null;
  imageName?: string;
  opacity: number; // 0.0 to 1.0 (default 0.5)
  scale: number; // 0.2 to 3.0 (default 1.0)
  rotation: number; // -180 to 180 (default 0)
  offsetX: number; // translation in pixels (default 0)
  offsetY: number; // translation in pixels (default 0)
  isLocked: boolean; // whether position is locked against dragging
  blendMode: GhostBlendMode;
  aspectRatioFit: 'cover' | 'contain';
}

export const DEFAULT_GHOST_SETTINGS: GhostOverlaySettings = {
  enabled: false,
  imageUrl: null,
  imageName: undefined,
  opacity: 0.5,
  scale: 1.0,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  isLocked: false,
  blendMode: 'screen',
  aspectRatioFit: 'contain',
};
