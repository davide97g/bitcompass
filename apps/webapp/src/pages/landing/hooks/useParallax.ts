import { useEffect, useState } from "react";

export function useParallax(multiplier = 0.15) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handler = () => {
      setOffset(window.scrollY * multiplier);
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [multiplier]);

  return offset;
}
