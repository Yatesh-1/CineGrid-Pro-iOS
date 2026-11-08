import { frameWidthOverHeight } from './frameFit';

/**
 * The viewfinder shows the camera frame cropped to the chosen ratio, zoomed digitally and (for selfies) mirrored.
 * Subject boxes are measured on that visible frame; this maps one back to raw camera-frame coordinates so a
 * sharpness measurement looks at the same pixels the user sees.
 */
export function visibleRect(videoW: number, videoH: number, aspectRatio: Parameters<typeof frameWidthOverHeight>[0], digitalScale: number) {
  const ratio = frameWidthOverHeight(aspectRatio);
  let cw = videoW;
  let ch = cw / ratio;
  if (ch > videoH) {
    ch = videoH;
    cw = ch * ratio;
  }
  const z = Math.max(1, digitalScale);
  cw /= z;
  ch /= z;
  return { x: (videoW - cw) / 2, y: (videoH - ch) / 2, w: cw, h: ch };
}

/** A small JPEG still of the current video frame (or null when there is no frame yet). */
export function snapshotFrame(video: HTMLVideoElement | null | undefined, width = 540): string | null {
  if (!video || !video.videoWidth || !video.videoHeight) return null;
  try {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = Math.round((width * video.videoHeight) / video.videoWidth);
    const g = c.getContext('2d');
    if (!g) return null;
    g.drawImage(video, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', 0.7);
    c.width = 0;
    return url;
  } catch {
    return null;
  }
}

/** Box in visible-frame coordinates (0..1) to a region in raw video coordinates (0..1). */
export function boxToVideoRoi(
  box: { x: number; y: number; w: number; h: number },
  videoW: number,
  videoH: number,
  aspectRatio: Parameters<typeof frameWidthOverHeight>[0],
  digitalScale: number,
  mirrored: boolean
) {
  const v = visibleRect(videoW, videoH, aspectRatio, digitalScale);
  const bx = mirrored ? 1 - box.x - box.w : box.x;
  return {
    x: (v.x + bx * v.w) / videoW,
    y: (v.y + box.y * v.h) / videoH,
    w: (box.w * v.w) / videoW,
    h: (box.h * v.h) / videoH,
  };
}
