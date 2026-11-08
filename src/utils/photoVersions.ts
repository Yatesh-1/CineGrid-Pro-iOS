import type { CapturedPhoto } from '../types/camera';

type PhotoImages = Pick<CapturedPhoto, 'dataUrl' | 'lookDataUrl' | 'editedDataUrl'>;

/**
 * Every photo keeps up to three images and the original is never overwritten:
 *   dataUrl      the untouched capture (BEFORE)
 *   lookDataUrl  capture with the live look applied (starting point for AFTER)
 *   editedDataUrl  the last version saved from the editor
 */

/** The version to show in galleries, thumbnails and exports. */
export const currentPhotoUrl = (p: PhotoImages): string => p.editedDataUrl ?? p.lookDataUrl ?? p.dataUrl;

/** The image the editor's AFTER view starts from. */
export const editorBaseUrl = (p: PhotoImages): string => p.lookDataUrl ?? p.dataUrl;

/** True when AFTER can differ from BEFORE even before any editing. */
export const hasCaptureLook = (p: PhotoImages): boolean => !!p.lookDataUrl;
