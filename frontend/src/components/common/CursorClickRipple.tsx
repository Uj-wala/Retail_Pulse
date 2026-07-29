import { useEffect, useState } from "react";

type Ripple = {
  id: number;
  x: number;
  y: number;
};

const RIPPLE_DURATION_MS = 650;

export function CursorClickRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    let nextId = 0;
    const timers = new Set<number>();

    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const id = nextId;
      nextId += 1;
      setRipples((current) => [...current, { id, x: event.clientX, y: event.clientY }]);

      const timeoutId = window.setTimeout(() => {
        timers.delete(timeoutId);
        setRipples((current) => current.filter((ripple) => ripple.id !== id));
      }, RIPPLE_DURATION_MS);
      timers.add(timeoutId);
    }

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]" aria-hidden="true">
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="cursor-click-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </div>
  );
}
