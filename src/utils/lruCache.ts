// Generic Bounded Least-Recently-Used (LRU) Cache with Memory Budgeting

export interface LRUCacheOptions<V> {
  maxEntries?: number;
  maxSizeBytes?: number;
  sizeCalculator?: (value: V) => number;
  onEvict?: (key: string, value: V) => void;
}

export class LRUCache<K extends string, V> {
  private cache: Map<K, { value: V; size: number }> = new Map();
  private maxEntries: number;
  private maxSizeBytes: number;
  private currentSizeBytes: number = 0;
  private sizeCalculator?: (value: V) => number;
  private onEvict?: (key: string, value: V) => void;

  constructor(options: LRUCacheOptions<V> = {}) {
    this.maxEntries = options.maxEntries || 50;
    this.maxSizeBytes = options.maxSizeBytes || 64 * 1024 * 1024; // 64 MB default
    this.sizeCalculator = options.sizeCalculator;
    this.onEvict = options.onEvict;
  }

  public get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Refresh position to mark as recently used
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  public has(key: K): boolean {
    return this.cache.has(key);
  }

  public set(key: K, value: V): void {
    const itemSize = this.sizeCalculator ? this.sizeCalculator(value) : 1;

    // If item itself exceeds max size, do not cache or evict everything
    if (this.maxSizeBytes > 0 && itemSize > this.maxSizeBytes) {
      if (this.cache.has(key)) {
        this.delete(key);
      }
      return;
    }

    // If key already exists, delete it first to adjust size calculation
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict oldest until within constraints
    while (
      this.cache.size >= this.maxEntries ||
      (this.maxSizeBytes > 0 && this.currentSizeBytes + itemSize > this.maxSizeBytes)
    ) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) break;
      this.delete(oldestKey);
    }

    this.cache.set(key, { value, size: itemSize });
    this.currentSizeBytes += itemSize;
  }

  public delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.currentSizeBytes -= entry.size;
    if (this.onEvict) {
      try {
        this.onEvict(key, entry.value);
      } catch (err) {
        console.warn(`Error during LRU eviction for ${key}:`, err);
      }
    }
    return true;
  }

  public clear(): void {
    if (this.onEvict) {
      for (const [key, entry] of this.cache.entries()) {
        try {
          this.onEvict(key, entry.value);
        } catch {}
      }
    }
    this.cache.clear();
    this.currentSizeBytes = 0;
  }

  public size(): number {
    return this.cache.size;
  }

  public getByteSize(): number {
    return this.currentSizeBytes;
  }
}
