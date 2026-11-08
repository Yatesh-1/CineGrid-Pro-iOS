import type { AspectRatio, GridType, ProSettings } from './camera';

export type SessionCategory =
  | 'Portrait'
  | 'Wedding'
  | 'Fashion'
  | 'Landscape'
  | 'Architecture'
  | 'Product'
  | 'Food'
  | 'Street'
  | 'Travel'
  | 'Custom';

export type SessionStatus = 'planned' | 'in_progress' | 'completed';

export interface PhotographySession {
  id: string;
  name: string;
  category: SessionCategory;
  date: string; // ISO date or "YYYY-MM-DD"
  description?: string;
  notes?: string;
  referencePhotos: {
    id: string;
    url: string;
    title?: string;
    notes?: string;
  }[];
  selectedGridId?: GridType | string;
  preferredAspectRatio?: AspectRatio;
  cameraSettings?: Partial<ProSettings>;
  capturedPhotoIds: string[]; // references CapturedPhoto.id
  isFavorite: boolean;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
}
