/**
 * True in the single-file standalone build, which runs the whole app — API,
 * offline engine and storage — inside the browser with no server.
 */
export const isStandalone = import.meta.env.VITE_STANDALONE === "true";
