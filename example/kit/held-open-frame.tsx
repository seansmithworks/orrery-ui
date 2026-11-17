import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A held-open popup's frame: a same-origin iframe, one document per frame, so the popup's
 * viewport is the frame whatever the library does with it. A library that renders popups in the
 * browser's top layer (showPopover, showModal) puts them in the iframe's top layer, which the
 * iframe clips; a library that portals into a container is handed the iframe's <body>. Fixed
 * elements (a dialog's backdrop) fill the frame, not the window.
 *
 * The iframe's document carries what the panel's subtree would have: the page's style sheets
 * (kit CSS, the forced-state preview CSS, the specimen CSS, the brand token CSS from ./scope),
 * kept in step with the page's <head>, and the panel's data-brand and data-theme on its <html>.
 * The children are rendered into its <body> through a React portal, so they stay in the
 * specimen's React tree. `children` receives that <body>, for a library's `container` prop.
 *
 * Gate side: example/kit-baseline.spec.ts records a cell through its frames (the iframe is a
 * spec- element, so it is skipped and its document's elements are recorded in its place), and
 * example/kit/kit-test.ts reaches in with heldPopupsShown and panelScopes.
 *
 *   <HeldOpenFrame className="spec-dialog-frame" title="Rename orbit dialog, held open">
 *     {(body) => (
 *       <Dialog.Root open modal={false}>
 *         <Dialog.Popup container={body}>...</Dialog.Popup>
 *       </Dialog.Root>
 *     )}
 *   </HeldOpenFrame>
 */
export function HeldOpenFrame({
  className,
  bodyClassName,
  title,
  inert,
  children,
}: {
  /** The frame's drawing and size, on the element around the iframe. */
  className: string;
  /** Classes for the iframe's <body>: the frame's inner layout. */
  bodyClassName?: string;
  /** The iframe's accessible name. */
  title: string;
  /** A picture only: nothing in the frame takes focus or a press. */
  inert?: boolean;
  children: (body: HTMLElement) => ReactNode;
}) {
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    // No src: the iframe keeps its initial about:blank document, same-origin with the page.
    const doc = frame?.contentDocument;
    if (!frame || !doc) return;
    const html = doc.documentElement;
    const scope = frame.closest("[data-brand]");
    html.lang = document.documentElement.lang;
    for (const attr of ["data-brand", "data-theme"]) {
      const v = scope?.getAttribute(attr);
      if (v != null) html.setAttribute(attr, v);
    }
    // The page's sheets, cloned, and re-cloned when the page's <head> changes (Vite's CSS HMR
    // rewrites its <style> elements in place).
    const sync = () => {
      for (const el of doc.head.querySelectorAll("[data-held-copy]"))
        el.remove();
      for (const el of document.head.querySelectorAll(
        'style, link[rel="stylesheet"]',
      )) {
        const copy = el.cloneNode(true) as HTMLElement;
        copy.setAttribute("data-held-copy", "");
        doc.head.append(copy);
      }
    };
    sync();
    const watch = new MutationObserver(sync);
    watch.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    doc.body.className = ["spec-held__body", bodyClassName]
      .filter(Boolean)
      .join(" ");
    doc.body.inert = !!inert;
    setBody(doc.body);
    return () => {
      watch.disconnect();
      setBody(null);
    };
  }, [frame, bodyClassName, inert]);

  return (
    <div className={`spec-held ${className}`}>
      <iframe
        ref={setFrame}
        className="spec-held__doc"
        title={title}
        inert={inert}
      />
      {body && createPortal(children(body), body)}
    </div>
  );
}
