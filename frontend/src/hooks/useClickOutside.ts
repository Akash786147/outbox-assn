import { useEffect, type RefObject } from "react";

export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside, enabled]);
}
