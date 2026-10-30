import { useEffect } from "react";

// Ease discrete wheel steps without replacing the browser's scroll containers.
// Touch, fine trackpad deltas, keyboard input and map gestures remain native.
export default function useSoftScroll(route) {
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      owner = null,
      target = 0,
      position = 0,
      lastWritten = 0,
      lastTime = 0;
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      owner = null;
      lastTime = 0;
    }
    function scrollOwner(event, delta) {
      for (const element of event.composedPath()) {
        if (
          !(element instanceof HTMLElement) ||
          element === document.body ||
          element === document.documentElement
        )
          continue;
        const style = getComputedStyle(element);
        if (
          !/auto|scroll/.test(style.overflowY) ||
          element.scrollHeight <= element.clientHeight + 1
        )
          continue;
        if (
          (delta < 0 && element.scrollTop > 0) ||
          (delta > 0 &&
            element.scrollTop < element.scrollHeight - element.clientHeight - 1)
        )
          return element;
        if (/contain|none/.test(style.overscrollBehaviorY)) return null;
      }
      if (
        document.body.hasAttribute("data-scroll-locked") ||
        getComputedStyle(document.body).overflowY === "hidden"
      )
        return null;
      return document.scrollingElement;
    }
    function tick(time) {
      if (
        !owner?.isConnected ||
        motion.matches ||
        Math.abs(owner.scrollTop - lastWritten) > 2
      ) {
        stop();
        return;
      }
      target = Math.max(
        0,
        Math.min(target, owner.scrollHeight - owner.clientHeight),
      );
      const dt = lastTime ? Math.min(time - lastTime, 32) : 16;
      lastTime = time;
      // Frame-rate independent decay: immediate response with a gentle ~400ms tail.
      position += (target - position) * (1 - Math.exp(-dt / 85));
      const finished = Math.abs(target - position) < 0.35;
      owner.scrollTo({
        top: finished ? target : position,
        behavior: "instant",
      });
      lastWritten = owner.scrollTop;
      if (finished) stop();
      else frame = requestAnimationFrame(tick);
    }
    function wheel(event) {
      const element = event.target instanceof Element ? event.target : null;
      if (
        motion.matches ||
        event.defaultPrevented ||
        !event.cancelable ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        !event.deltaY ||
        element?.closest(
          '.maplibregl-map, input, textarea, select, [contenteditable="true"]',
        )
      ) {
        stop();
        return;
      }
      // Trackpads supply their own fine-grained motion and operating-system inertia.
      if (event.deltaMode === 0 && Math.abs(event.deltaY) < 32) {
        stop();
        return;
      }
      const delta =
        event.deltaY *
        (event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? innerHeight : 1);
      const nextOwner = scrollOwner(event, delta);
      if (!nextOwner) {
        stop();
        return;
      }
      const maximum = nextOwner.scrollHeight - nextOwner.clientHeight;
      if (
        (delta < 0 && nextOwner.scrollTop <= 0) ||
        (delta > 0 && nextOwner.scrollTop >= maximum)
      ) {
        stop();
        return;
      }
      event.preventDefault();
      if (owner !== nextOwner || !frame) {
        stop();
        owner = nextOwner;
        position = target = lastWritten = owner.scrollTop;
      }
      // Bound queued travel so a fast wheel burst never leaves a long runaway glide.
      const ahead = Math.min(650, owner.clientHeight * 0.85);
      if (Math.sign(delta) !== Math.sign(target - position)) target = position;
      target = Math.max(
        0,
        Math.min(
          maximum,
          Math.max(
            position - ahead,
            Math.min(position + ahead, target + delta),
          ),
        ),
      );
      if (!frame) frame = requestAnimationFrame(tick);
    }
    const keyboard = (event) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          " ",
          "Tab",
          "Escape",
        ].includes(event.key)
      )
        stop();
    };
    document.addEventListener("wheel", wheel, { passive: false });
    document.addEventListener("pointerdown", stop, true);
    document.addEventListener("touchstart", stop, { passive: true });
    document.addEventListener("keydown", keyboard, true);
    document.addEventListener("visibilitychange", stop);
    motion.addEventListener("change", stop);
    return () => {
      stop();
      document.removeEventListener("wheel", wheel);
      document.removeEventListener("pointerdown", stop, true);
      document.removeEventListener("touchstart", stop);
      document.removeEventListener("keydown", keyboard, true);
      document.removeEventListener("visibilitychange", stop);
      motion.removeEventListener("change", stop);
    };
  }, [route]);
}
