import { describe, it, expect, vi } from 'vitest';
import { LRUCache } from '../../utils/lruCache';

describe('Bounded LRUCache Tests', () => {
  it('evicts oldest entries when exceeding maxEntries constraint', () => {
    const onEvict = vi.fn();
    const cache = new LRUCache<string, string>({ maxEntries: 3, onEvict });

    cache.set('a', 'alpha');
    cache.set('b', 'beta');
    cache.set('c', 'gamma');

    expect(cache.size()).toBe(3);
    expect(cache.has('a')).toBe(true);

    // Adding 4th item should evict 'a' (oldest)
    cache.set('d', 'delta');
    expect(cache.size()).toBe(3);
    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(true);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
    expect(onEvict).toHaveBeenCalledWith('a', 'alpha');
  });

  it('refreshes position on .get() to mark entry as recently used', () => {
    const cache = new LRUCache<string, number>({ maxEntries: 3 });

    cache.set('k1', 10);
    cache.set('k2', 20);
    cache.set('k3', 30);

    // Access k1 -> now k2 is the oldest!
    const val = cache.get('k1');
    expect(val).toBe(10);

    // Insert k4 -> should evict k2!
    cache.set('k4', 40);
    expect(cache.has('k2')).toBe(false);
    expect(cache.has('k1')).toBe(true);
    expect(cache.has('k3')).toBe(true);
    expect(cache.has('k4')).toBe(true);
  });

  it('enforces byte size limits with custom size calculator', () => {
    const cache = new LRUCache<string, { size: number }>({
      maxEntries: 10,
      maxSizeBytes: 100, // 100 bytes budget
      sizeCalculator: (item) => item.size,
    });

    cache.set('item1', { size: 40 });
    cache.set('item2', { size: 40 });
    expect(cache.getByteSize()).toBe(80);

    // Adding item3 (40 bytes) exceeds 100 bytes (80 + 40 = 120) -> evicts item1!
    cache.set('item3', { size: 40 });
    expect(cache.has('item1')).toBe(false);
    expect(cache.has('item2')).toBe(true);
    expect(cache.has('item3')).toBe(true);
    expect(cache.getByteSize()).toBe(80);
  });

  it('deletes entries explicitly and clears all on .clear()', () => {
    const cache = new LRUCache<string, string>({ maxEntries: 5 });
    cache.set('x', '1');
    cache.set('y', '2');

    expect(cache.delete('x')).toBe(true);
    expect(cache.has('x')).toBe(false);
    expect(cache.delete('nonexistent')).toBe(false);

    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.getByteSize()).toBe(0);
  });
});
