import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion as Motion, MotionConfig, useReducedMotion } from "motion/react";
import { useLocation } from "react-router-dom";
import { Modal } from "./ui.jsx";
const IslandRegistry = createContext(null);
const PanelSheets = createContext(null);
export function useAtlasWide() {
  const [wide, setWide] = useState(
    () => matchMedia("(min-width:1100px)").matches,
  );
  useEffect(() => {
    const m = matchMedia("(min-width:1100px)");
    const change = () => setWide(m.matches);
    m.addEventListener("change", change);
    return () => m.removeEventListener("change", change);
  }, []);
  return wide;
}
export function AtlasPresentation({ children }) {
  const [entries, setEntries] = useState({}),
    [sheet, setSheet] = useState(null),
    [panels, setPanels] = useState({});
  const { pathname } = useLocation();
  const registry = useMemo(
    () => ({
      publish: (id, entry) => setEntries((old) => ({ ...old, [id]: entry })),
      remove: (id) =>
        setEntries((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        }),
    }),
    [],
  );
  const sheets = useMemo(
    () => ({ sheet, setSheet, panels, setPanels }),
    [sheet, panels],
  );
  useEffect(() => {
    if (!sheet) return;
    const closeForDialog = () => {
      if (
        document.querySelector(
          '[role="dialog"][data-state="open"]:not(.atlas-sheet)',
        )
      )
        setSheet(null);
    };
    const observer = new MutationObserver(closeForDialog);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [sheet]);
  const entry = Object.values(entries)
    .filter((e) => e.path === pathname)
    .sort((a, b) => b.priority - a.priority)[0];
  return (
    <MotionConfig reducedMotion="user">
      <IslandRegistry.Provider value={registry}>
        <PanelSheets.Provider value={sheets}>
          {children}
          <ContextIsland key={pathname} entry={entry} />
        </PanelSheets.Provider>
      </IslandRegistry.Provider>
    </MotionConfig>
  );
}
export function IslandContent({
  id,
  priority = 0,
  title,
  children,
  active = true,
}) {
  const registry = useContext(IslandRegistry),
    { pathname } = useLocation();
  useLayoutEffect(() => {
    if (active)
      registry.publish(id, { priority, title, children, path: pathname });
    else registry.remove(id);
  }, [registry, id, priority, title, children, active, pathname]);
  useEffect(() => () => registry.remove(id), [registry, id]);
  return null;
}
function ContextIsland({ entry }) {
  const wide = useAtlasWide(),
    reduced = useReducedMotion(),
    [open, setOpen] = useState(false),
    [blocked, setBlocked] = useState(false);
  const root = useRef(null),
    trigger = useRef(null);
  useEffect(() => {
    const update = () => {
      const other = [
        ...document.querySelectorAll('[role="dialog"][data-state="open"]'),
      ].some((e) => !e.classList.contains("island-sheet"));
      const keyboard =
        window.visualViewport &&
        window.innerHeight - window.visualViewport.height > 150;
      setBlocked(other || keyboard);
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    window.visualViewport?.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  if (!entry) return null;
  return (
    <div className="context-island-slot" hidden={blocked} ref={root}>
      <Motion.aside
        layout
        transition={{ duration: reduced ? 0 : 0.28, ease: "easeOut" }}
        className={`context-island ${open ? "is-expanded" : ""}`}
        aria-label="Journey context"
      >
        <button
          ref={trigger}
          className="island-trigger"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{entry.title}</span>
          <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        {wide && open && (
          <Motion.div
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="island-content"
          >
            {entry.children}
          </Motion.div>
        )}
      </Motion.aside>
      {!wide && (
        <Modal
          open={open && !blocked}
          onOpenChange={setOpen}
          title="Your journey"
          description="Current trip context and next action."
          variant="atlas-sheet island-sheet"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            trigger.current?.focus();
          }}
        >
          {entry.children}
        </Modal>
      )}
    </div>
  );
}
export function FloatingPanel({
  children,
  title,
  storageKey,
  className = "",
  inline = false,
  ref,
  ...props
}) {
  const wide = useAtlasWide(),
    reduced = useReducedMotion(),
    sheets = useContext(PanelSheets),
    trigger = useRef(null),
    panel = useRef(null),
    savedScroll = useRef(0);
  const collapsed =
    sheets.panels[storageKey] ??
    (() => {
      try {
        return sessionStorage.getItem(`gt.panel.${storageKey}`) === "closed";
      } catch {
        return false;
      }
    })();
  const setCollapsed = (update) =>
    sheets.setPanels((old) => ({ ...old, [storageKey]: update(collapsed) }));
  const sheetId = useId();
  const open = sheets.sheet === sheetId;
  const toggle = () =>
    setCollapsed((old) => {
      if (!old) savedScroll.current = panel.current?.scrollTop || 0;
      try {
        sessionStorage.setItem(
          `gt.panel.${storageKey}`,
          old ? "open" : "closed",
        );
      } catch {
        /* Storage is optional. */
      }
      return !old;
    });
  return (
    <aside
      {...props}
      ref={(element) => {
        panel.current = element;
        if (typeof ref === "function") ref(element);
        else if (ref) ref.current = element;
      }}
      className={`floating-panel ${className} ${collapsed ? "is-collapsed" : ""}`}
      data-panel={storageKey}
    >
      {wide ? (
        <>
          <button
            className="panel-toggle"
            aria-expanded={!collapsed}
            onClick={toggle}
          >
            {title}
            <span aria-hidden="true">{collapsed ? "+" : "−"}</span>
          </button>
          <Motion.div
            className="panel-body"
            onAnimationComplete={() => {
              if (!collapsed && panel.current)
                panel.current.scrollTop = savedScroll.current;
            }}
            animate={{
              opacity: collapsed ? 0 : 1,
              height: collapsed ? 0 : "auto",
            }}
            transition={{ duration: reduced ? 0 : 0.24, ease: "easeOut" }}
            inert={collapsed}
            style={{
              overflow: collapsed ? "hidden" : undefined,
              visibility: collapsed ? "hidden" : "visible",
            }}
          >
            {children}
          </Motion.div>
        </>
      ) : inline ? (
        <div className="panel-inline">{children}</div>
      ) : (
        <>
          <button
            ref={trigger}
            className="panel-toggle"
            aria-expanded={open}
            onClick={() => sheets.setSheet(sheetId)}
          >
            {title}
            <span aria-hidden="true">+</span>
          </button>
          <Modal
            open={open}
            onOpenChange={(value) => sheets.setSheet(value ? sheetId : null)}
            title={title}
            description="Explore without leaving your workspace."
            variant="atlas-sheet"
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              if (
                !document.querySelector(
                  '[role="dialog"][data-state="open"]:not(.atlas-sheet)',
                )
              )
                trigger.current?.focus();
            }}
          >
            {children}
          </Modal>
        </>
      )}
    </aside>
  );
}
export function EditorialTitle({ children }) {
  const reduced = useReducedMotion(),
    words = String(children).split(" ");
  return (
    <h1 aria-label={String(children)}>
      {words.map((word, index) => (
        <React.Fragment key={index}>
          <Motion.span
            aria-hidden="true"
            style={{ display: "inline-block" }}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? 0 : 0.22,
              delay: reduced ? 0 : Math.min(index * 0.035, 0.23),
            }}
          >
            {word}
          </Motion.span>{" "}
        </React.Fragment>
      ))}
    </h1>
  );
}
export function PageEntry({ children, identity, cinematic = false }) {
  const reduced = useReducedMotion();
  return (
    <Motion.div
      className="page-entry"
      initial={false}
      animate={identity}
      variants={{
        [identity]: {
          opacity: cinematic ? 1 : [0.7, 1],
          y: reduced || cinematic ? 0 : [6, 0],
        },
      }}
      transition={{ duration: reduced ? 0 : 0.2 }}
    >
      {children}
    </Motion.div>
  );
}

export function TabIndicator({ active, group }) {
  const reduced = useReducedMotion();
  return active ? (
    <Motion.span
      className="atlas-tab-indicator"
      layoutId={`atlas-tab-${group}`}
      transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
      aria-hidden="true"
    />
  ) : null;
}
