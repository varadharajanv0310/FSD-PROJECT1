import { useCallback, useEffect, useRef, useState } from "react";
import { isStandalone } from "@/lib/env";

/** Camera self-view needs getUserMedia, which the standalone preview's frame blocks. */
export const cameraSupported = () =>
  !isStandalone && typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

/** Requests a microphone or camera stream on demand and releases it on unmount. */
export function useMediaStream(kind: "audio" | "video") {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const request = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser doesn't support media capture.");
      return null;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia(
        kind === "audio"
          ? { audio: { echoCancellation: true, noiseSuppression: true } }
          : { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } },
      );
      streamRef.current = media;
      setStream(media);
      setError(null);
      return media;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError"
          ? `${kind === "audio" ? "Microphone" : "Camera"} access was blocked. You can allow it from the address bar.`
          : `We couldn't access your ${kind === "audio" ? "microphone" : "camera"}.`,
      );
      return null;
    }
  }, [kind]);

  useEffect(() => stop, [stop]);

  return { stream, error, request, stop };
}

/** Live input level (0–1) from a microphone stream, smoothed for display. */
export function useAudioLevel(stream: MediaStream | null, active = true): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream || !active || stream.getAudioTracks().length === 0) {
      setLevel(0);
      return;
    }
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioCtx();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let frame = 0;
    let smoothed = 0;
    let tick = 0;

    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const sample of data) {
        const value = (sample - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / data.length);
      smoothed = smoothed * 0.75 + Math.min(1, rms * 4) * 0.25;
      if (tick++ % 2 === 0) setLevel(smoothed);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void context.close();
    };
  }, [stream, active]);

  return level;
}

/** Seconds elapsed while `running` is true; resets when `resetKey` changes. */
export function useElapsed(running: boolean, resetKey: unknown): number {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const baseRef = useRef(0);

  useEffect(() => {
    setElapsed(0);
    baseRef.current = 0;
    startRef.current = null;
  }, [resetKey]);

  useEffect(() => {
    if (!running) {
      if (startRef.current !== null) baseRef.current += (Date.now() - startRef.current) / 1000;
      startRef.current = null;
      return;
    }
    startRef.current = Date.now();
    const timer = setInterval(() => {
      setElapsed(baseRef.current + (Date.now() - (startRef.current ?? Date.now())) / 1000);
    }, 250);
    return () => clearInterval(timer);
  }, [running, resetKey]);

  return elapsed;
}
