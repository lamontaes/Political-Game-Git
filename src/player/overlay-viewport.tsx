import { useLayoutEffect, type RefObject } from "react";

import {
  clampOverlayBox,
  contentViewportSize,
  conversationInViewport,
  menuBesideAnchor,
  visualViewportInsets,
} from "./overlay-focus";

function viewportNow() {
  const view = window.visualViewport;
  const layout = { width: window.innerWidth, height: window.innerHeight };
  const size = contentViewportSize(view, layout);
  const insets = visualViewportInsets(view, layout.height);
  return { size, insets, offsetLeft: view?.offsetLeft ?? 0 };
}

function writeContentCssVars() {
  const { size, insets } = viewportNow();
  const root = document.documentElement;
  root.style.setProperty("--pg-vv-width", `${size.width}px`);
  root.style.setProperty("--pg-vv-height", `${size.height}px`);
  root.style.setProperty("--pg-vv-inset-top", `${insets.top}px`);
  root.style.setProperty("--pg-vv-inset-bottom", `${insets.bottom}px`);
}

function subscribeViewport(apply: () => void) {
  apply();
  const view = window.visualViewport;
  view?.addEventListener("resize", apply);
  view?.addEventListener("scroll", apply);
  window.addEventListener("resize", apply);
  return () => {
    view?.removeEventListener("resize", apply);
    view?.removeEventListener("scroll", apply);
    window.removeEventListener("resize", apply);
  };
}

/** Keep layout math on the actual Safari content rectangle. */
export function useContentViewportCss() {
  useLayoutEffect(() => subscribeViewport(writeContentCssVars), []);
}

export function useClampedConversation(
  ref: RefObject<HTMLElement | null>,
  reservedBottom = 72,
) {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const apply = () => {
      const { size, offsetLeft } = viewportNow();
      const box = node.getBoundingClientRect();
      const placed = conversationInViewport(
        { width: box.width, height: box.height },
        size,
        reservedBottom,
      );
      node.style.position = "fixed";
      node.style.left = `${placed.left + offsetLeft}px`;
      node.style.top = `${placed.top}px`;
      node.style.right = "auto";
      node.style.bottom = "auto";
      node.style.maxHeight = `${Math.max(8, size.height - reservedBottom - 16)}px`;
    };
    return subscribeViewport(apply);
  }, [ref, reservedBottom]);
}

export function useClampedMenu(
  menuRef: RefObject<HTMLElement | null>,
  anchor: HTMLElement | null,
) {
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const apply = () => {
      const { size, offsetLeft } = viewportNow();
      const menuBox = menu.getBoundingClientRect();
      const placed = anchor
        ? menuBesideAnchor(
            {
              left: anchor.getBoundingClientRect().left,
              top: anchor.getBoundingClientRect().top,
              width: anchor.getBoundingClientRect().width,
              height: anchor.getBoundingClientRect().height,
            },
            { width: menuBox.width, height: menuBox.height },
            size,
          )
        : clampOverlayBox(
            {
              left: size.width - menuBox.width - 16,
              top: size.height - menuBox.height - 80,
              width: menuBox.width,
              height: menuBox.height,
            },
            size,
          );
      menu.style.position = "fixed";
      menu.style.left = `${placed.left + offsetLeft}px`;
      menu.style.top = `${placed.top}px`;
      menu.style.right = "auto";
      menu.style.bottom = "auto";
      menu.style.maxHeight = `${Math.max(8, size.height - 16)}px`;
    };
    return subscribeViewport(apply);
  }, [menuRef, anchor]);
}
