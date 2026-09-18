import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import "./controls.css";

/**
 * The game's select (UI DECISION FOLLOW-THROUGH: no stock in-game controls).
 *
 * A drop-in for `<select>` that never opens the operating system's white
 * menu. It takes the same `<option>` / `<optgroup>` children, `value`,
 * `disabled`, `id`, `name` and ARIA props, and calls `onChange` with an
 * object whose `target.value` is the chosen value, so a call site written for
 * a native select keeps its handler.
 *
 * Underneath it is the WAI-ARIA select-only combobox: a focusable trigger with
 * `role="combobox"` and a `role="listbox"` popup referenced through
 * `aria-activedescendant`. Focus never leaves the trigger, so Escape and
 * choosing return it naturally. Arrow keys, Home/End, Page Up/Down, Enter,
 * Space and typeahead work closed and open; the popup is placed inside the
 * viewport, below the trigger or above it when there is no room.
 */

export interface GameSelectChangeEvent {
  readonly target: { readonly value: string; readonly name?: string };
  readonly currentTarget: { readonly value: string; readonly name?: string };
}

export interface GameSelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly group: string | null;
}

export interface GameSelectProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "defaultValue" | "onChange" | "children" | "type"
> {
  readonly value?: string | number;
  readonly defaultValue?: string | number;
  readonly onChange?: (event: GameSelectChangeEvent) => void;
  /** `<option>` and `<optgroup>` elements, exactly as for `<select>`. */
  readonly children?: ReactNode;
  /** Alternative to children. */
  readonly options?: readonly Omit<GameSelectOption, "group">[];
  readonly name?: string;
  readonly required?: boolean;
  /** Shown while no option is chosen; it is not itself a choice. */
  readonly placeholder?: string;
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return "";
}

/** Reads `<option>`/`<optgroup>` children the way the browser would. */
export function optionsFromChildren(
  children: ReactNode,
  group: string | null = null,
  groupDisabled = false,
): GameSelectOption[] {
  const found: GameSelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{
      value?: string | number;
      label?: string;
      disabled?: boolean;
      children?: ReactNode;
    }>;
    if (element.type === Fragment) {
      found.push(
        ...optionsFromChildren(element.props.children, group, groupDisabled),
      );
    } else if (element.type === "optgroup") {
      found.push(
        ...optionsFromChildren(
          element.props.children,
          element.props.label ?? null,
          groupDisabled || Boolean(element.props.disabled),
        ),
      );
    } else if (element.type === "option") {
      const label = element.props.label ?? textOf(element.props.children);
      found.push({
        value:
          element.props.value === undefined
            ? label
            : String(element.props.value),
        label,
        disabled: groupDisabled || Boolean(element.props.disabled),
        group,
      });
    }
  });
  return found;
}

/**
 * The name a choice exposes to a screen reader.
 *
 * It is the option's visible label, and it is never the option's `value`: a
 * value is an internal id — `m47-face-ellis`, `m47-hair-coily-crop`, `skin-6`
 * — and reading one aloud tells a player nothing, while the eye beside it
 * reads "Long mature face", "Coily crop", "Brown". The contract is that the
 * accessible name IS the readable label.
 *
 * When a label is missing this says honestly where the choice sits in its
 * group rather than inventing wording from the id. Un-slugging
 * `hair-coily-crop` into "Coily crop" would fabricate authored wording, so we
 * do not: a missing label is the appearance-data owner's to supply, and this
 * fallback only keeps the control usable and non-silent until they do.
 */
export function optionAccessibleName(
  // The catalog id may travel with the option; it is never read for a name.
  option: {
    readonly value?: string;
    readonly label?: string;
    readonly group?: string | null;
  },
  index: number,
  groupName?: string,
): string {
  const label = option.label?.trim();
  if (label) return label;
  const within = option.group?.trim() || groupName?.trim();
  return within ? `${within} choice ${index + 1}` : `Choice ${index + 1}`;
}

interface Placement {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly maxHeight: number;
  readonly side: "below" | "above";
}

const MARGIN = 8;
const GAP = 4;
const PREFERRED_HEIGHT = 300;

/** Where the list goes, kept inside the viewport. Exported for tests. */
export function placeListbox(
  trigger: { left: number; top: number; width: number; height: number },
  viewport: { width: number; height: number },
  contentHeight: number,
): Placement {
  const wanted = Math.min(contentHeight, PREFERRED_HEIGHT);
  const below = viewport.height - (trigger.top + trigger.height) - GAP - MARGIN;
  const above = trigger.top - GAP - MARGIN;
  const side = below >= wanted || below >= above ? "below" : "above";
  const room = Math.max(96, side === "below" ? below : above);
  const maxHeight = Math.min(room, PREFERRED_HEIGHT);
  const width = Math.min(
    Math.max(trigger.width, 176),
    viewport.width - MARGIN * 2,
  );
  const left = Math.min(
    Math.max(MARGIN, trigger.left),
    viewport.width - MARGIN - width,
  );
  const top =
    side === "below"
      ? trigger.top + trigger.height + GAP
      : Math.max(
          MARGIN,
          trigger.top - GAP - Math.min(contentHeight, maxHeight),
        );
  return { left, top, width, maxHeight, side };
}

const TYPEAHEAD_RESET_MS = 700;

export function GameSelect({
  value,
  defaultValue,
  onChange,
  children,
  options: optionList,
  name,
  required,
  placeholder,
  disabled,
  className,
  id,
  onKeyDown,
  onBlur,
  ...rest
}: GameSelectProps) {
  const options = useMemo<readonly GameSelectOption[]>(
    () =>
      optionList
        ? optionList.map((option) => ({ ...option, group: null }))
        : optionsFromChildren(children),
    [children, optionList],
  );
  const generated = useId();
  const baseId = id ?? `game-select-${generated.replace(/:/g, "")}`;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const [inner, setInner] = useState<string>(() =>
    defaultValue !== undefined
      ? String(defaultValue)
      : placeholder !== undefined
        ? ""
        : (options.find((option) => !option.disabled)?.value ?? ""),
  );
  const current = value !== undefined ? String(value) : inner;
  const selectedIndex = options.findIndex((option) => option.value === current);
  // The group's own name, used only to place an unlabelled choice honestly.
  const groupName = rest["aria-label"];
  const nameOf = (option: GameSelectOption, index: number) =>
    optionAccessibleName(option, index, groupName);
  const shownLabel =
    selectedIndex >= 0
      ? nameOf(options[selectedIndex]!, selectedIndex)
      : (placeholder ?? (options[0] ? nameOf(options[0], 0) : ""));

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const enabledFrom = useCallback(
    (start: number, step: 1 | -1): number => {
      for (
        let index = start;
        index >= 0 && index < options.length;
        index += step
      ) {
        if (!options[index]!.disabled) return index;
      }
      return -1;
    },
    [options],
  );

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    if (value === undefined) setInner(option.value);
    if (option.value !== current) {
      const target = { value: option.value, name };
      onChange?.({ target, currentTarget: target });
    }
  };

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const openList = () => {
    if (disabled || options.length === 0) return;
    setActive(
      selectedIndex >= 0 && !options[selectedIndex]!.disabled
        ? selectedIndex
        : enabledFrom(0, 1),
    );
    setOpen(true);
  };

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const content = listRef.current?.scrollHeight ?? PREFERRED_HEIGHT;
    setPlacement(
      placeListbox(
        {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        { width: window.innerWidth, height: window.innerHeight },
        content,
      ),
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    place();
  }, [open, place, options.length]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };
    const reposition = (event: Event) => {
      if (listRef.current?.contains(event.target as Node)) return;
      place();
    };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open || active < 0) return;
    document
      .getElementById(`${baseId}-option-${active}`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, baseId]);

  const typeahead = (key: string): number => {
    const now = Date.now();
    const text =
      now - typed.current.at > TYPEAHEAD_RESET_MS
        ? key.toLowerCase()
        : typed.current.text + key.toLowerCase();
    typed.current = { text, at: now };
    const from = open ? active : selectedIndex;
    const order = [
      ...options
        .map((_, index) => index)
        .slice(from + (text.length > 1 ? 0 : 1)),
      ...options
        .map((_, index) => index)
        .slice(0, from + (text.length > 1 ? 0 : 1)),
    ];
    return (
      order.find(
        (index) =>
          !options[index]!.disabled &&
          options[index]!.label.toLowerCase().startsWith(text),
      ) ?? -1
    );
  };

  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;
    const { key } = event;
    const from = open ? active : selectedIndex;
    const move = (index: number) => {
      if (index < 0) return;
      if (open) setActive(index);
      else choose(index);
    };
    switch (key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        // Alt+Arrow opens the list; a plain arrow steps the value, as the
        // browser's own select does while closed.
        if (!open && event.altKey) {
          openList();
          return;
        }
        move(
          key === "ArrowDown"
            ? enabledFrom(from + 1, 1)
            : from > 0
              ? enabledFrom(from - 1, -1)
              : -1,
        );
        return;
      case "Home":
        event.preventDefault();
        move(enabledFrom(0, 1));
        return;
      case "End":
        event.preventDefault();
        move(enabledFrom(options.length - 1, -1));
        return;
      case "PageDown":
        event.preventDefault();
        move(
          enabledFrom(Math.min(options.length - 1, from + 10), 1) >= 0
            ? enabledFrom(Math.min(options.length - 1, from + 10), 1)
            : enabledFrom(options.length - 1, -1),
        );
        return;
      case "PageUp":
        event.preventDefault();
        move(
          enabledFrom(Math.max(0, from - 10), -1) >= 0
            ? enabledFrom(Math.max(0, from - 10), -1)
            : enabledFrom(0, 1),
        );
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) {
          if (
            key === " " &&
            typed.current.text &&
            Date.now() - typed.current.at < TYPEAHEAD_RESET_MS
          ) {
            move(typeahead(key));
            return;
          }
          choose(active);
          close();
        } else openList();
        return;
      case "Escape":
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        return;
      case "Tab":
        if (open) close();
        return;
      default:
        if (
          key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          move(typeahead(key));
        }
    }
  };

  let lastGroup: string | null = null;
  const list =
    open && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="pg-select-list"
            aria-labelledby={baseId}
            data-side={placement?.side ?? "below"}
            data-testid={
              rest["data-testid" as keyof typeof rest]
                ? `${String(rest["data-testid" as keyof typeof rest])}-list`
                : undefined
            }
            style={{
              left: placement?.left ?? -9999,
              top: placement?.top ?? -9999,
              width: placement?.width,
              maxHeight: placement?.maxHeight,
              visibility: placement ? "visible" : "hidden",
            }}
            onMouseDown={(event) => event.preventDefault()}
          >
            {options.map((option, index) => {
              const heading =
                option.group !== null && option.group !== lastGroup ? (
                  <li
                    key={`group-${option.group}-${index}`}
                    role="presentation"
                    className="pg-select-group"
                  >
                    {option.group}
                  </li>
                ) : null;
              lastGroup = option.group;
              // One name, read and seen: never `option.value`.
              const readable = nameOf(option, index);
              return (
                <Fragment key={`${option.value}-${index}`}>
                  {heading}
                  <li
                    id={optionId(index)}
                    role="option"
                    className="pg-select-option"
                    aria-label={readable}
                    aria-selected={index === selectedIndex}
                    aria-disabled={option.disabled || undefined}
                    data-value={option.value}
                    data-active={index === active ? "true" : undefined}
                    data-grouped={option.group !== null ? "true" : undefined}
                    onMouseMove={() => {
                      if (!option.disabled && index !== active)
                        setActive(index);
                    }}
                    onClick={() => {
                      if (option.disabled) return;
                      choose(index);
                      close();
                      triggerRef.current?.focus();
                    }}
                  >
                    {readable}
                  </li>
                </Fragment>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        {...rest}
        ref={triggerRef}
        id={baseId}
        type="button"
        role="combobox"
        className={["pg-select", className].filter(Boolean).join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          open && active >= 0 ? optionId(active) : undefined
        }
        aria-required={required || undefined}
        disabled={disabled}
        data-value={current}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleKey}
        onBlur={(event) => {
          onBlur?.(event);
          if (open) close();
        }}
      >
        <span
          className="pg-select-value"
          data-placeholder={
            selectedIndex < 0 && placeholder ? "true" : undefined
          }
        >
          {shownLabel}
        </span>
        <span className="pg-select-caret" aria-hidden="true" />
      </button>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      {list}
    </>
  );
}
