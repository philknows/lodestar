export class MapDef<K, V> extends Map<K, V> {
  constructor(private readonly getDefault: () => V) {
    super();
  }

  getOrDefault(key: K): V {
    let value = super.get(key);
    if (value === undefined) {
      value = this.getDefault();
      this.set(key, value);
    }
    return value;
  }
}

/**
 * Extends MapDef but ensures that there always a max of `maxKeys` keys
 */
export class MapDefMax<K, V> {
  private readonly map = new Map<K, V>();

  constructor(
    private readonly getDefault: () => V,
    private readonly maxKeys: number
  ) {}

  getOrDefault(key: K): V {
    let value = this.map.get(key);
    if (value === undefined) {
      value = this.getDefault();
      this.map.set(key, value);
      pruneSetToMax(this.map, this.maxKeys);
    }
    return value;
  }

  get(key: K): V | undefined {
    return this.map.get(key);
  }
}

/**
 * 2 dimensions Es6 Map
 */
export class Map2d<K1, K2, V> {
  readonly map = new Map<K1, Map<K2, V>>();

  get(k1: K1, k2: K2): V | undefined {
    return this.map.get(k1)?.get(k2);
  }

  set(k1: K1, k2: K2, v: V): void {
    let map2 = this.map.get(k1);
    if (!map2) {
      map2 = new Map<K2, V>();
      this.map.set(k1, map2);
    }
    map2.set(k2, v);
  }
}

/**
 * 2 dimensions Es6 Map + regular array
 */
export class Map2dArr<K1, V> {
  readonly map = new Map<K1, V[]>();

  get(k1: K1, idx: number): V | undefined {
    return this.map.get(k1)?.[idx];
  }

  set(k1: K1, idx: number, v: V): void {
    let arr = this.map.get(k1);
    if (!arr) {
      arr = [];
      this.map.set(k1, arr);
    }
    arr[idx] = v;
  }
}

/**
 * Prune an arbitrary set removing the first keys to have a set.size === maxItems.
 * Returns the count of deleted items.
 *
 * Keys can be sorted by `compareFn` to get more control over which items to prune first
 */
export function pruneSetToMax<T>(
  set: Set<T> | Map<T, unknown>,
  maxItems: number,
  compareFn?: (a: T, b: T) => number
): number {
  let itemsToDelete = set.size - maxItems;
  const deletedItems = Math.max(0, itemsToDelete);

  if (itemsToDelete > 0) {
    const keys = compareFn ? Array.from(set.keys()).sort(compareFn) : set.keys();
    for (const key of keys) {
      set.delete(key);
      itemsToDelete--;
      if (itemsToDelete <= 0) {
        break;
      }
    }
  }

  return deletedItems;
}
