import { useEffect } from "react";

export function useDocumentTitle(title: string, options: { raw?: boolean } = {}) {
  useEffect(() => {
    const previous = document.title;
    document.title = options.raw ? title : `${title} · Poise`;
    return () => {
      document.title = previous;
    };
  }, [title, options.raw]);
}
