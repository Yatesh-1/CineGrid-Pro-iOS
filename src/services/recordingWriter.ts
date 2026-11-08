import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Streams a recording to a file in app storage while it is being recorded.
 * MediaRecorder hands over a chunk every second; without this, every chunk stayed in memory until Stop, so a long or
 * high-bitrate clip (25 Mbps is ~190 MB per minute) could exhaust the phone. Chunks are written in order and released.
 */
export class RecordingWriter {
  private path: string;
  private uri = '';
  private queue: Promise<void> = Promise.resolve();
  private started = false;
  /** Chunks that could not be written (disk full / bridge error) stay in memory so nothing is lost. */
  public failed = false;
  public memoryChunks: Blob[] = [];
  public bytesWritten = 0;

  constructor(ext: string) {
    this.path = `recordings/rec_${Date.now()}.${ext}`;
  }

  static available(): boolean {
    return Capacitor.isNativePlatform();
  }

  private static toBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const s = String(reader.result);
        resolve(s.slice(s.indexOf(',') + 1));
      };
      reader.onerror = () => reject(reader.error ?? new Error('read failed'));
      reader.readAsDataURL(blob);
    });
  }

  /** Queue a chunk; chunks are appended strictly in arrival order. */
  write(blob: Blob): void {
    if (this.failed) {
      this.memoryChunks.push(blob);
      return;
    }
    this.queue = this.queue.then(async () => {
      if (this.failed) {
        this.memoryChunks.push(blob);
        return;
      }
      try {
        const data = await RecordingWriter.toBase64(blob);
        if (!this.started) {
          this.uri = (await Filesystem.writeFile({ path: this.path, data, directory: Directory.Data, recursive: true })).uri;
          this.started = true;
        } else {
          await Filesystem.appendFile({ path: this.path, data, directory: Directory.Data });
        }
        this.bytesWritten += blob.size;
      } catch (err) {
        console.warn('[RecordingWriter] disk write failed, keeping the rest in memory:', err);
        this.failed = true;
        this.memoryChunks.push(blob);
      }
    });
  }

  /** Resolves when every queued chunk has been written. */
  async finish(): Promise<{ uri: string; url: string } | null> {
    await this.queue;
    if (!this.started) return null;
    return { uri: this.uri, url: Capacitor.convertFileSrc(this.uri) };
  }

  async discard(): Promise<void> {
    await this.queue.catch(() => {});
    if (this.started) await Filesystem.deleteFile({ path: this.path, directory: Directory.Data }).catch(() => {});
  }
}
