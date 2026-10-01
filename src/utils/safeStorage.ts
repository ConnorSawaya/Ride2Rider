export type SafeStorage = Pick<Storage, "getItem" | "setItem">;

type StorageFactory = () => SafeStorage | null;

function getBrowserStorage(): SafeStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Accessing this property itself can throw in opaque-origin sandboxed frames.
  return window.localStorage;
}

/**
 * Use localStorage when the browser permits it, and keep the current page
 * interactive with a per-instance memory fallback when storage is unavailable.
 */
export function createSafeStorage(getStorage: StorageFactory = getBrowserStorage): SafeStorage {
  const memory = new Map<string, string>();
  let persistentStorage: SafeStorage | null = null;
  let memoryOnly = false;

  function resolvePersistentStorage(): SafeStorage | null {
    if (memoryOnly) {
      return null;
    }

    try {
      persistentStorage ??= getStorage();
      if (!persistentStorage) {
        memoryOnly = true;
      }
      return persistentStorage;
    } catch {
      memoryOnly = true;
      return null;
    }
  }

  return {
    getItem(key) {
      const storage = resolvePersistentStorage();
      if (!storage) {
        return memory.get(key) ?? null;
      }

      try {
        const value = storage.getItem(key);
        if (value === null) {
          memory.delete(key);
        } else {
          // Keep a mirror so a later storage failure does not discard state.
          memory.set(key, value);
        }
        return value;
      } catch {
        memoryOnly = true;
        return memory.get(key) ?? null;
      }
    },

    setItem(key, value) {
      // Update memory first; this remains the fallback if persistence throws.
      memory.set(key, value);
      const storage = resolvePersistentStorage();
      if (!storage) {
        return;
      }

      try {
        storage.setItem(key, value);
      } catch {
        memoryOnly = true;
      }
    }
  };
}
