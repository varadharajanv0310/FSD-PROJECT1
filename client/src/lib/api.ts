import { localApi } from "@/standalone/local-api";
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
