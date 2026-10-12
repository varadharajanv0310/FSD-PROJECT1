import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the Web Speech API (not yet in lib.dom). */
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechRecognitionSupported = () => getRecognition() !== null;

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser's address bar, or type your answer instead.",
  "service-not-allowed": "Speech recognition isn't available in this browser. You can type your answer instead.",
  "audio-capture": "No microphone was found. Check your input device, or type your answer instead.",
  network: "Speech recognition needs an internet connection in this browser. You can type your answer instead.",
};

/**
 * Continuous dictation. Final phrases are handed to `onFinal` so the caller
 * can append them to an editable answer; the in-progress phrase is exposed
 * as `interim`. Browsers stop listening after a pause, so it restarts itself
 * until `stop()` is called.
 */
export function useSpeechRecognition(lang = "en-US") {
  const supported = speechRecognitionSupported();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const wantListening = useRef(false);
  const onFinalRef = useRef<(text: string) => void>(() => undefined);

  const stop = useCallback(() => {
    wantListening.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      const Recognition = getRecognition();
      if (!Recognition) return;
      onFinalRef.current = onFinal;
      setError(null);
      wantListening.current = true;

      if (!recognitionRef.current) {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;
        recognition.onresult = (event) => {
          let pending = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]!;
            const text = result[0]?.transcript ?? "";
            if (result.isFinal) onFinalRef.current(text.trim());
            else pending += text;
          }
          setInterim(pending.trim());
        };
        recognition.onerror = (event) => {
          if (event.error === "no-speech" || event.error === "aborted") return;
          setError(ERROR_MESSAGES[event.error] ?? "Speech recognition stopped unexpectedly. Try again, or type your answer.");
          wantListening.current = false;
        };
        recognition.onend = () => {
          setInterim("");
          if (wantListening.current) {
            try {
              recognition.start();
              return;
            } catch {
              /* already started */
            }
          }
          setListening(false);
        };
        recognitionRef.current = recognition;
      }
      try {
        recognitionRef.current.start();
      } catch {
        /* start() throws if it's already running — that's fine */
      }
      setListening(true);
    },
    [lang],
  );

  useEffect(
    () => () => {
      wantListening.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  return { supported, listening, interim, error, start, stop };
}

/** Appends a dictated phrase to existing text with sensible spacing and capitalisation. */
export function appendDictation(existing: string, phrase: string): string {
  if (!phrase) return existing;
  const trimmed = existing.replace(/\s+$/, "");
  const startsSentence = trimmed.length === 0 || /[.!?]$/.test(trimmed);
  const text = startsSentence ? phrase.charAt(0).toUpperCase() + phrase.slice(1) : phrase;
  return trimmed.length === 0 ? text : `${trimmed} ${text}`;
}
