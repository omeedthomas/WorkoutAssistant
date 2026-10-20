import AsyncStorage from '@react-native-async-storage/async-storage';

/** Reads a JSON value saved on this device, or null if there is none (or it can't be read). */
export async function readJson(key: string): Promise<unknown> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Saves (or, for null, removes) a JSON value on this device. Failures are ignored: the app keeps working. */
export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    if (value === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable: the change lives until the app closes
  }
}
