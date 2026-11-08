// Centralized Resource Management System for CineGrid Pro
// Tracks and safely disposes of streams, tracks, WebGL contexts, textures,
// image buffers, Object URLs, workers, listeners, and timers.

export type ManagedResourceType =
  | 'stream'
  | 'track'
  | 'video_element'
  | 'canvas_element'
  | 'webgl_context'
  | 'gpu_texture'
  | 'shader_program'
  | 'buffer'
  | 'object_url'
  | 'worker'
  | 'event_listener'
  | 'timer'
  | 'audio_context';

export interface ResourceDescriptor {
  id: string;
  type: ManagedResourceType;
  ownerId: string;
  resource: unknown;
  dispose: () => void | Promise<void>;
  createdAt: number;
}

export interface DeviceMemoryProfile {
  deviceMemoryGb: number;
  hardwareConcurrency: number;
  maxLutCacheCount: number;
  maxImageCacheMb: number;
  targetPreviewFps: number;
  preferLowMemory: boolean;
}

export class ResourceManager {
  private static instance: ResourceManager;
  private resources: Map<string, ResourceDescriptor> = new Map();
  private objectUrls: Set<string> = new Set();
  private isShuttingDown = false;

  private memoryProfile: DeviceMemoryProfile;

  private constructor() {
    this.memoryProfile = this.detectDeviceProfile();
    this.attachLifecycleListeners();
  }

  public static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  /**
   * Detects device capabilities to adjust memory limits dynamically
   */
  private detectDeviceProfile(): DeviceMemoryProfile {
    const nav = typeof navigator !== 'undefined' ? (navigator as unknown as { deviceMemory?: number; hardwareConcurrency?: number }) : {};
    const memGb = nav.deviceMemory || 4; // default 4GB if unspecified
    const cores = nav.hardwareConcurrency || 4;

    const preferLow = memGb <= 2 || cores <= 2;

    return {
      deviceMemoryGb: memGb,
      hardwareConcurrency: cores,
      maxLutCacheCount: preferLow ? 4 : 8,
      maxImageCacheMb: preferLow ? 64 : 256,
      targetPreviewFps: preferLow ? 30 : 60,
      preferLowMemory: preferLow,
    };
  }

  public getMemoryProfile(): DeviceMemoryProfile {
    return { ...this.memoryProfile };
  }

  public isTerminating(): boolean {
    return this.isShuttingDown;
  }

  private attachLifecycleListeners() {
    if (typeof window === 'undefined') return;

    // Cleanup on window unload / pagehide
    const handleUnload = () => {
      this.isShuttingDown = true;
      this.cleanupAll();
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
  }

  /**
   * Registers a managed resource under an explicit owner
   */
  public register(
    id: string,
    type: ManagedResourceType,
    ownerId: string,
    resource: unknown,
    dispose: () => void | Promise<void>
  ): string {
    // If resource ID already exists, dispose old one first
    if (this.resources.has(id)) {
      this.release(id);
    }

    this.resources.set(id, {
      id,
      type,
      ownerId,
      resource,
      dispose,
      createdAt: Date.now(),
    });

    return id;
  }

  /**
   * Registers and tracks an Object URL for safe lifecycle management
   */
  public createManagedObjectURL(blob: Blob, ownerId: string): string {
    if (typeof URL === 'undefined' || !URL.createObjectURL) {
      return '';
    }

    const url = URL.createObjectURL(blob);
    this.objectUrls.add(url);

    this.register(
      `objurl_${url}`,
      'object_url',
      ownerId,
      url,
      () => {
        try {
          URL.revokeObjectURL(url);
          this.objectUrls.delete(url);
        } catch {}
      }
    );

    return url;
  }

  /**
   * Revokes a managed Object URL immediately
   */
  public revokeManagedObjectURL(url: string): void {
    const key = `objurl_${url}`;
    if (this.resources.has(key)) {
      this.release(key);
    } else {
      try {
        URL.revokeObjectURL(url);
        this.objectUrls.delete(url);
      } catch {}
    }
  }

  /**
   * Helper to register a managed timer (timeout or interval)
   */
  public registerTimer(
    id: string,
    ownerId: string,
    timerHandle: number,
    isInterval: boolean = false
  ): string {
    return this.register(
      id,
      'timer',
      ownerId,
      timerHandle,
      () => {
        if (isInterval) {
          clearInterval(timerHandle);
        } else {
          clearTimeout(timerHandle);
        }
      }
    );
  }

  /**
   * Helper to register an event listener with automatic cleanup
   */
  public registerEventListener(
    target: EventTarget,
    eventName: string,
    handler: EventListenerOrEventListenerObject,
    ownerId: string,
    options?: boolean | AddEventListenerOptions
  ): string {
    const id = `ev_${ownerId}_${eventName}_${Math.random().toString(36).substring(2, 7)}`;
    target.addEventListener(eventName, handler, options);

    return this.register(
      id,
      'event_listener',
      ownerId,
      { target, eventName, handler },
      () => {
        try {
          target.removeEventListener(eventName, handler, options);
        } catch {}
      }
    );
  }

  /**
   * Releases a specific resource by ID
   */
  public release(id: string): void {
    const desc = this.resources.get(id);
    if (!desc) return;

    this.resources.delete(id);
    try {
      desc.dispose();
    } catch (err) {
      console.warn(`Error disposing resource ${id} (${desc.type}):`, err);
    }
  }

  /**
   * Releases all resources associated with a specific owner (e.g. unmounted component or closed modal)
   */
  public releaseByOwner(ownerId: string): void {
    for (const [id, desc] of this.resources.entries()) {
      if (desc.ownerId === ownerId) {
        this.release(id);
      }
    }
  }

  /**
   * Releases all resources of a specific type (e.g. all 'gpu_texture' or 'track')
   */
  public releaseByType(type: ManagedResourceType): void {
    for (const [id, desc] of this.resources.entries()) {
      if (desc.type === type) {
        this.release(id);
      }
    }
  }

  /**
   * Get active resource count
   */
  public getResourceCount(): number {
    return this.resources.size;
  }

  /**
   * Inspect active resources for debugging & leak prevention
   */
  public inspectResources(): { id: string; type: ManagedResourceType; ownerId: string; ageMs: number }[] {
    const now = Date.now();
    return Array.from(this.resources.values()).map((r) => ({
      id: r.id,
      type: r.type,
      ownerId: r.ownerId,
      ageMs: now - r.createdAt,
    }));
  }

  /**
   * Emergency teardown of all allocated resources
   */
  public cleanupAll(): void {
    for (const desc of this.resources.values()) {
      try {
        desc.dispose();
      } catch {}
    }
    this.resources.clear();

    // Revoke any remaining Object URLs
    for (const url of this.objectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    this.objectUrls.clear();
  }
}

export const resourceManager = ResourceManager.getInstance();
