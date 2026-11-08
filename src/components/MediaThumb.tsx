import React from 'react';
import type { CapturedPhoto } from '../types/camera';
import { currentPhotoUrl } from '../utils/photoVersions';

export const isVideoItem = (p: CapturedPhoto): boolean =>
  p.mediaType === 'video' || /\.(mp4|webm)$/i.test(p.id) || p.dataUrl.startsWith('data:video');

/**
 * A picture for a gallery tile. Photos use their small thumbnail. A video with no saved poster frame shows its first
 * frame through a (muted, metadata-only) video element; an <img> pointed at a video file only shows broken-image text.
 */
export const MediaThumb: React.FC<{ photo: CapturedPhoto; className?: string; alt?: string; lazy?: boolean }> = ({
  photo,
  className,
  alt,
  lazy = false,
}) => {
  if (isVideoItem(photo)) {
    // a real poster frame is a saved *_thumb.jpg; anything else (the video itself, a blob) is not an image
    const poster = photo.thumbnailUrl && photo.thumbnailUrl.includes('_thumb.jpg') ? photo.thumbnailUrl : null;
    if (!poster) {
      return (
        <video
          src={`${photo.dataUrl}#t=0.3`}
          muted
          playsInline
          preload="metadata"
          aria-label={alt}
          className={className}
          style={{ pointerEvents: 'none' }}
        />
      );
    }
    return <img key={photo.id} src={poster} alt={alt ?? ''} loading={lazy ? 'lazy' : undefined} decoding="async" className={className} />;
  }
  return (
    <img
      key={photo.id}
      src={photo.thumbnailUrl || currentPhotoUrl(photo)}
      alt={alt ?? ''}
      loading={lazy ? 'lazy' : undefined}
      decoding="async"
      className={className}
    />
  );
};
