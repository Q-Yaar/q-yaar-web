/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  AUTH: 'auth',
  DICE_CONFIGURATIONS: 'dice_configurations',
  DICE_HISTORY_PREFIX: 'dice_history_',
} as const;

/**
 * Type for storage keys to ensure type safety
 */
export type StorageKey =
  | (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
  | string;

/**
 * Local Storage Utility
 */
export const storage = {
  /**
   * Get item from local storage
   * @param key The key to retrieve
   * @returns The parsed value or null if not found or error
   */
  get: <T>(key: StorageKey): T | null => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return null;
    }
  },

  /**
   * Set item in local storage
   * @param key The key to set
   * @param value The value to store
   */
  set: <T>(key: StorageKey, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  },

  /**
   * Remove item from local storage
   * @param key The key to remove
   */
  remove: (key: StorageKey): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage key "${key}":`, error);
    }
  },

  /**
   * Clear all items from local storage
   */
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};
