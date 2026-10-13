import { localApi } from "@/standalone/local-api";
import { onExternalChange as onStandaloneChange, type ExternalChange } from "@/standalone/store";
import { onDeviceChanged } from "./device";
import { isStandalone } from "./env";
import { httpApi, onSessionRestored as onHttpSessionRestored } from "./http-api";

export { ApiError } from "./api-error";

export type Api = typeof httpApi;

/**
 * The app talks to this object only. Normally it calls the Express API; the
 * standalone build swaps in an in-browser implementation with the same
 * contract (the unused one is removed from the bundle at build time).
 */
export const api: Api = isStandalone ? localApi : httpApi;

/** Notifies when a lapsed session was restored behind the scenes (the standalone build never loses its session). */
export const onSessionRestored: typeof onHttpSessionRestored = isStandalone ? () => () => false : onHttpSessionRestored;

/**
 * Notifies when another tab changed the profile ("profile": switched or erased)
 * or, in the standalone build, its data ("data").
 */
export const onExternalChange: (listener: (change: ExternalChange) => void) => () => void = isStandalone
  ? onStandaloneChange
  : (listener) => onDeviceChanged(() => listener("profile"));
