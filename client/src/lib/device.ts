/**
 * The key that ties this browser to its Poise profile (there's no sign-up).
 * Kept in localStorage so the profile survives an expired session cookie;
 * every access is guarded because storage can be blocked.
 */
const KEY = "poise:device";

export interface DeviceCredentials {
  id: string;
  key: string;
}

export function readDevice(): DeviceCredentials | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<DeviceCredentials> | null;
    return typeof value?.id === "string" && typeof value.key === "string" ? { id: value.id, key: value.key } : undefined;
  } catch {
    return undefined;
  }
}

/** Calls back when another tab changes this browser's profile (e.g. erases it). */
export function onDeviceChanged(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function writeDevice(device: DeviceCredentials | null): void {
  try {
    if (device) localStorage.setItem(KEY, JSON.stringify(device));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — the session cookie still works for this visit */
  }
}
