import { describe, it, expect, vi, beforeEach } from 'vitest';

const { native, mediaSaver } = vi.hoisted(() => ({
  native: { isNative: false, platform: 'web' },
  mediaSaver: { saveMedia: vi.fn() },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.isNative, getPlatform: () => native.platform },
  registerPlugin: vi.fn((name: string) => {
    if (name === 'MediaSaver') return mediaSaver;
    return {};
  }),
}));

const media = {
  getAlbums: vi.fn(),
  createAlbum: vi.fn(),
  getAlbumsPath: vi.fn(),
  savePhoto: vi.fn(),
  saveVideo: vi.fn(),
};
vi.mock('@capacitor-community/media', () => ({ Media: media }));

import { ALBUM_NAME, galleryFileName, mediaKindFor, pickAlbumIdentifier, saveToDevice } from '../../services/deviceSaveService';

describe('save helpers', () => {
  it('tells photos from videos by mime type first, then by extension', () => {
    expect(mediaKindFor('x.bin', 'video/webm')).toBe('video');
    expect(mediaKindFor('x.mp4')).toBe('video');
    expect(mediaKindFor('x.jpg')).toBe('photo');
    expect(mediaKindFor('clip.webm', 'image/png')).toBe('photo');
  });

  it('gives the gallery a safe name without extension', () => {
    expect(galleryFileName('cinegrid original 2026-10-30.jpg')).toBe('cinegrid_original_2026-10-30');
    expect(galleryFileName('..\\evil/../name.png')).not.toMatch(/[\\/.]/);
    expect(galleryFileName('.jpg')).toMatch(/^cinegrid_\d+$/);
  });

  it('finds the album, or builds the Android path, or leaves iOS without one', () => {
    expect(pickAlbumIdentifier([{ name: ALBUM_NAME, identifier: '/a/b' }], '/pics', 'android')).toBe('/a/b');
    expect(pickAlbumIdentifier([], '/storage/Pictures/', 'android')).toBe(`/storage/Pictures/${ALBUM_NAME}`);
    expect(pickAlbumIdentifier([], null, 'ios')).toBeUndefined();
  });
});

describe('saveToDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mediaSaver.saveMedia.mockRejectedValue(new Error('MediaSaver unavailable in mock'));
    media.getAlbums.mockResolvedValue({ albums: [] });
    media.getAlbumsPath.mockResolvedValue({ path: '/storage/emulated/0/Pictures' });
    media.savePhoto.mockResolvedValue({});
    media.saveVideo.mockResolvedValue({});
  });

  it('in a browser it downloads the file and never touches the gallery plugin', async () => {
    native.isNative = false;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const res = await saveToDevice('blob:abc', 'shot.jpg');
    expect(res.where).toBe('download');
    expect(click).toHaveBeenCalledTimes(1);
    expect(media.savePhoto).not.toHaveBeenCalled();
    click.mockRestore();
  });

  it('on Android a photo goes to the CineGrid Pro album as a photo', async () => {
    native.isNative = true;
    native.platform = 'android';
    const res = await saveToDevice('data:image/jpeg;base64,AAAA', 'shot.jpg', 'image/jpeg');
    expect(res.where).toBe('gallery');
    expect(media.createAlbum).toHaveBeenCalledWith({ name: ALBUM_NAME });
    expect(media.savePhoto).toHaveBeenCalledWith({
      path: 'data:image/jpeg;base64,AAAA',
      albumIdentifier: `/storage/emulated/0/Pictures/${ALBUM_NAME}`,
      fileName: 'shot',
    });
    expect(media.saveVideo).not.toHaveBeenCalled();
  });

  it('a video is saved as a video, and an existing album is reused', async () => {
    native.isNative = true;
    native.platform = 'android';
    media.getAlbums.mockResolvedValue({ albums: [{ name: ALBUM_NAME, identifier: '/x/CineGrid Pro' }] });
    await saveToDevice('data:video/webm;base64,AAAA', 'clip.webm');
    expect(media.createAlbum).not.toHaveBeenCalled();
    expect(media.saveVideo).toHaveBeenCalledWith(expect.objectContaining({ albumIdentifier: '/x/CineGrid Pro', fileName: 'clip' }));
  });

  it('on iOS it saves without an album identifier requirement', async () => {
    native.isNative = true;
    native.platform = 'ios';
    await saveToDevice('data:image/png;base64,AAAA', 'edit.png');
    expect(media.getAlbumsPath).not.toHaveBeenCalled();
    expect(media.savePhoto).toHaveBeenCalledWith(expect.objectContaining({ albumIdentifier: undefined }));
  });

  it('reports a failure instead of pretending the file was saved', async () => {
    native.isNative = true;
    native.platform = 'android';
    media.savePhoto.mockRejectedValue(new Error('permission denied'));
    await expect(saveToDevice('data:image/jpeg;base64,AAAA', 'a.jpg')).rejects.toThrow('permission denied');
  });

  it('saves directly via native MediaSaver plugin when available on Android', async () => {
    native.isNative = true;
    native.platform = 'android';
    mediaSaver.saveMedia.mockResolvedValueOnce({ success: true, fileName: 'saved.jpg' });
    const res = await saveToDevice('data:image/jpeg;base64,AAAA', 'saved.jpg');
    expect(res.where).toBe('gallery');
    expect(res.fileName).toBe('saved.jpg');
    expect(mediaSaver.saveMedia).toHaveBeenCalledWith(expect.objectContaining({
      mediaType: 'photo',
      fileName: 'saved.jpg',
    }));
    expect(media.savePhoto).not.toHaveBeenCalled();
  });
});
