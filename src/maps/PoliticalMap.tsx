/**
 * Politics → Government map.
 *
 * Adapter contract for UI (the shell's sole owner mounts this):
 *   <PoliticalMap world personId preferences onPreferencesChange
 *                 onOpenPerson onOpenMeasure? focus? />
 * Selecting anything here never moves the player, never advances time,
 * never introduces anyone, and never grants authority. It only reads.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import type { EntityId, World } from "../simulation/types";
import { proseDate } from "../presentation/prose-dates";
import type { MapFeature, MapGeometryPack, MapLayerId } from "./geometry-types";
import {
  featurePath,
  hasStatePack,
  layerFeatures,
  loadNationalPack,
  loadStatePack,
} from "./geometry-runtime";
import { patchMapPreferences, type MapPreferences } from "./map-preferences";
import {
  MAP_MODE_LABEL,
  MAP_MODE_LAYER,
  STATE_ONLY_MODES,
  districtsHeldBy,
  earliestMapDate,
  fillKey,
  inspectRegion,
  measureSponsorIds,
  playerGeography,
  projectPoliticalMap,
  regionLabel,
  stateFipsForUsps,
  stateNameForUsps,
  type LegendEntry,
  type MapMode,
  type OfficeLine,
  type RegionFill,
} from "./political-map-model";
import { MAP_CANVAS } from "./projection";
import {
  dateAtStep,
  stepForDate,
  dayCount,
  type ViewBox,
  fitViewBox,
  zoomViewBox,
  panViewBox,
  HOME_VIEW,
} from "./map-view";
import "./political-map.css";

export interface PoliticalMapFocus {
  /** People to highlight (for example, pinned people or an open card). */
  readonly personIds?: readonly EntityId[];
  /** A bill whose sponsor's district should be highlighted. */
  readonly measureId?: EntityId | null;
}

export interface PoliticalMapProps {
  readonly world: World;
  readonly personId: EntityId;
  readonly preferences: MapPreferences;
  readonly onPreferencesChange: (next: MapPreferences) => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly onOpenMeasure?: (measureId: EntityId) => void;
  readonly focus?: PoliticalMapFocus;
}

interface Selection {
  readonly layer: MapLayerId;
  readonly geoid: string;
  readonly stateUsps: string;
  readonly name: string;
}

const ORDERED_MODES: readonly MapMode[] = [
  "house",
  "senate",
  "state-upper",
  "state-lower",
  "county",
  "place",
];

function fillClass(fill: RegionFill): string {
  switch (fill.kind) {
    case "party":
      return "pg-map-fill-party";
    case "mixed":
      return "pg-map-fill-mixed";
    default:
      return `pg-map-fill-${fill.kind}`;
  }
}

function slotStyle(
  slot: number | undefined,
  pattern: number | undefined,
): React.CSSProperties | undefined {
  if (slot === undefined) return undefined;
  return {
    ["--pg-map-fill" as string]: `var(--pg-map-party-${slot})`,
    ...(pattern
      ? { ["--pg-map-pattern" as string]: "url(#pg-map-repeat-hatch)" }
      : {}),
  };
}

function LegendSwatch({ entry }: { entry: LegendEntry }) {
  return (
    <svg
      className="pg-map-swatch"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="2"
        className={
          entry.fill.kind === "party"
            ? "pg-map-fill-party"
            : `pg-map-fill-${entry.fill.kind}`
        }
        style={slotStyle(entry.slot?.slot, entry.slot?.patternIndex)}
      />
    </svg>
  );
}

function OfficeStatusView({
  line,
  onOpenPerson,
}: {
  line: OfficeLine;
  onOpenPerson: (personId: EntityId) => void;
}) {
  const { status } = line;
  return (
    <li className="pg-map-office">
      <div className="pg-map-office-title">{line.title}</div>
      {status.kind === "held" ? (
        <div className="pg-map-office-body">
          <button
            type="button"
            className="pg-map-link"
            data-testid="map-open-person"
            onClick={() => onOpenPerson(status.holder.personId)}
          >
            {status.holder.name}
          </button>
          <span className="pg-map-muted">
            {status.holder.partyName ?? "No public party affiliation"}
          </span>
          {status.holder.termStartedAt || status.holder.termEndsBefore ? (
            <span className="pg-map-muted">
              Term
              {status.holder.termStartedAt
                ? ` from ${proseDate(status.holder.termStartedAt)}`
                : ""}
              {status.holder.termEndsBefore
                ? ` until ${proseDate(status.holder.termEndsBefore)}`
                : ""}
            </span>
          ) : null}
          {status.holder.serviceSince ? (
            <span className="pg-map-muted">
              Serving since {proseDate(status.holder.serviceSince)}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="pg-map-office-body">
          <span>
            {status.kind === "vacant"
              ? `Vacant since ${proseDate(status.since)}`
              : status.kind === "no-current-record"
                ? `No current record. The last recorded term ended ${proseDate(status.lastTermEnded)}.`
                : status.reason}
          </span>
        </div>
      )}
      <div className="pg-map-basis">{line.basis}</div>
    </li>
  );
}

export function PoliticalMap(props: PoliticalMapProps) {
  const {
    world,
    personId,
    preferences,
    onPreferencesChange,
    onOpenPerson,
    onOpenMeasure,
    focus,
  } = props;
  const headingId = useId();
  const [national, setNational] = useState<MapGeometryPack | null>(null);
  const [statePack, setStatePack] = useState<MapGeometryPack | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const selection = preferences.selection ?? null;
  const setSelection = useCallback(
    (next: Selection | null) =>
      onPreferencesChange(
        patchMapPreferences(preferences, { selection: next }),
      ),
    [preferences, onPreferencesChange],
  );
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewBox>(preferences.view ?? HOME_VIEW);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const setPrefs = useCallback(
    (patch: Partial<MapPreferences>) =>
      onPreferencesChange(patchMapPreferences(preferences, patch)),
    [onPreferencesChange, preferences],
  );

  const stateUsps = preferences.stateUsps;
  const stateFips = stateUsps ? stateFipsForUsps(stateUsps) : null;
  const mode: MapMode =
    !stateUsps && STATE_ONLY_MODES.has(preferences.mode)
      ? "house"
      : preferences.mode;
  const layer = MAP_MODE_LAYER[mode];

  useEffect(() => {
    let live = true;
    loadNationalPack().then(
      (pack) => live && setNational(pack),
      (error: Error) => live && setLoadError(error.message),
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    setStatePack(null);
    if (!stateFips || !hasStatePack(stateFips)) return;
    loadStatePack(stateFips).then(
      (pack) => live && setStatePack(pack),
      (error: Error) => live && setLoadError(error.message),
    );
    return () => {
      live = false;
    };
  }, [stateFips]);

  // The drawn layer: state detail when focused, national otherwise.
  // While a state's detail loads, House/Senate views keep the national shapes.
  const stateLoading = Boolean(stateUsps && !statePack && !loadError);
  const drawPack = stateUsps
    ? (statePack ?? (STATE_ONLY_MODES.has(mode) ? null : national))
    : national;
  const features = useMemo(() => {
    const all = layerFeatures(drawPack, layer);
    if (!stateUsps || drawPack !== national) return all;
    return all.filter((feature) => feature.stateUsps === stateUsps);
  }, [drawPack, national, layer, stateUsps]);
  const geoids = useMemo(
    () => features.map((feature) => feature.geoid),
    [features],
  );

  const model = useMemo(
    () => projectPoliticalMap(world, { mode, stateUsps, asOf, geoids }),
    [world, mode, stateUsps, asOf, geoids],
  );
  const player = useMemo(
    () => playerGeography(world, personId),
    [world, personId],
  );
  useEffect(() => {
    if (!preferences.initialized)
      setPrefs({
        initialized: true,
        stateUsps: preferences.stateUsps ?? player.here?.stateUsps ?? null,
      });
  }, [
    preferences.initialized,
    preferences.stateUsps,
    player.here?.stateUsps,
    setPrefs,
  ]);
  const firstFraming = useRef(true);
  const savedView = useRef(preferences.view);

  const highlighted = useMemo(() => {
    const people = [...(focus?.personIds ?? [])];
    if (focus?.measureId)
      people.push(...measureSponsorIds(world, focus.measureId));
    return districtsHeldBy(world, people, asOf);
  }, [world, focus, asOf]);
  const highlightKeys = useMemo(
    () => new Set(highlighted.map((entry) => `${entry.layer}:${entry.geoid}`)),
    [highlighted],
  );

  const candidateKeys = useMemo(() => {
    const keys = new Set<string>();
    const chamber =
      layer === "congressional" ||
      layer === "state-upper" ||
      layer === "state-lower"
        ? layer
        : null;
    if (!chamber) return keys;
    const relation = player.homeDistricts[chamber];
    if (relation.kind === "candidates")
      for (const geoid of relation.geoids) keys.add(geoid);
    return keys;
  }, [layer, player]);

  // Keep the view on the focused state when it changes.
  useEffect(() => {
    if (!national) return;
    if (firstFraming.current && savedView.current) {
      firstFraming.current = false;
      return;
    }
    firstFraming.current = false;
    if (!stateUsps) {
      setView(HOME_VIEW);
      return;
    }
    const outline = layerFeatures(national, "state").find(
      (feature) => feature.stateUsps === stateUsps,
    );
    if (outline) setView(fitViewBox(outline.bbox));
  }, [stateUsps, national]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (JSON.stringify(preferences.view) !== JSON.stringify(view))
        setPrefs({ view });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [view, preferences.view, setPrefs]);

  const inspection = useMemo(
    () =>
      selection
        ? inspectRegion(world, personId, {
            layer: selection.layer,
            geoid: selection.geoid,
            stateUsps: selection.stateUsps,
            asOf,
          })
        : null,
    [world, personId, selection, asOf],
  );

  // A search typed for one layer means nothing in another; start fresh.
  useEffect(() => {
    setQuery("");
  }, [mode, stateUsps]);

  // Selection is cleared when it no longer belongs to the drawn layer.
  useEffect(() => {
    if (selection && selection.layer !== layer) {
      const counterpart = features.find(
        (feature) =>
          feature.geoid === selection.geoid &&
          feature.stateUsps === selection.stateUsps,
      );
      setSelection(
        counterpart
          ? { ...selection, layer, name: regionLabel(layer, counterpart) }
          : null,
      );
    }
  }, [layer, selection]);

  const select = useCallback(
    (feature: MapFeature, featureLayer: MapLayerId) =>
      setSelection({
        layer: featureLayer,
        geoid: feature.geoid,
        stateUsps: feature.stateUsps,
        name: regionLabel(featureLayer, feature),
      }),
    [setSelection],
  );

  const focusState = useCallback(
    (usps: string | null) => {
      const outline = layerFeatures(national, "state").find(
        (feature) => feature.stateUsps === usps,
      );
      setView(outline ? fitViewBox(outline.bbox) : HOME_VIEW);
      setQuery("");
      setPrefs({
        selection: null,
        stateUsps: usps,
        mode: usps
          ? preferences.mode
          : STATE_ONLY_MODES.has(preferences.mode)
            ? "house"
            : preferences.mode,
      });
    },
    [preferences.mode, setPrefs, national],
  );

  /* ---------------- pan / zoom ---------------- */

  const toViewUnits = (dx: number, dy: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return [0, 0] as const;
    const scale = Math.max(view.w / rect.width, view.h / rect.height);
    return [dx * scale, dy * scale] as const;
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, moved: false };
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 4) return;
    if (!start.moved) svgRef.current?.setPointerCapture?.(event.pointerId);
    const [ux, uy] = toViewUnits(dx, dy);
    drag.current = { x: event.clientX, y: event.clientY, moved: true };
    setView((current) => panViewBox(current, -ux, -uy));
  };
  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current?.moved)
      svgRef.current?.releasePointerCapture?.(event.pointerId);
    // Keep "moved" for the click that follows this pointerup.
    window.setTimeout(() => {
      drag.current = null;
    }, 0);
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const fx = (event.clientX - rect.left) / rect.width;
      const fy = (event.clientY - rect.top) / rect.height;
      setView((current) =>
        zoomViewBox(current, event.deltaY < 0 ? 1.25 : 0.8, fx, fy),
      );
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [national]);

  const onMapKey = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    const step = view.w * 0.1;
    const actions: Record<string, () => ViewBox> = {
      ArrowLeft: () => panViewBox(view, -step, 0),
      ArrowRight: () => panViewBox(view, step, 0),
      ArrowUp: () => panViewBox(view, 0, -step),
      ArrowDown: () => panViewBox(view, 0, step),
      "+": () => zoomViewBox(view, 1.25),
      "=": () => zoomViewBox(view, 1.25),
      "-": () => zoomViewBox(view, 0.8),
      "0": () => (selectionBox ? fitViewBox(selectionBox) : HOME_VIEW),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    setView(action());
  };

  const selectionFeature = useMemo(
    () =>
      selection
        ? (layerFeatures(drawPack, selection.layer).find(
            (feature) => feature.geoid === selection.geoid,
          ) ?? null)
        : null,
    [selection, drawPack],
  );
  const selectionBox = selectionFeature?.bbox ?? null;

  /* ---------------- list ---------------- */

  const listRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return features
      .map((feature) => {
        const label = regionLabel(layer, feature);
        const region = model.regions.get(feature.geoid);
        const summary =
          layer === "place"
            ? placeTypeLabel(feature.lsad)
            : (region?.summary ?? "");
        return { feature, label, summary };
      })
      .filter(
        (row) =>
          !needle ||
          `${row.label} ${row.summary}`.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.label.localeCompare(b.label, "en", { numeric: true }));
  }, [features, layer, model, query, stateUsps]);

  const LIST_LIMIT = 60;
  const shownRows = listRows.slice(0, LIST_LIMIT);

  /* ---------------- markers ---------------- */

  const markers = useMemo(() => {
    const out: {
      key: string;
      x: number;
      y: number;
      kind: "home" | "here";
      label: string;
    }[] = [];
    const locate = (ref: typeof player.home) => {
      if (!ref) return null;
      if (stateUsps && ref.stateUsps === stateUsps && statePack) {
        const feature = layerFeatures(statePack, ref.layer).find(
          (candidate) => candidate.geoid === ref.geoid,
        );
        if (feature) return feature.label;
      }
      const state = layerFeatures(national, "state").find(
        (candidate) => candidate.stateUsps === ref.stateUsps,
      );
      return state?.label ?? null;
    };
    const home = locate(player.home);
    if (home)
      out.push({
        key: "home",
        x: home[0],
        y: home[1],
        kind: "home",
        label: `Home: ${player.homeLabel ?? ""}`,
      });
    const here = locate(player.here);
    if (here)
      out.push({
        key: "here",
        x: here[0],
        y: here[1],
        kind: "here",
        label: `You are here: ${player.hereLabel ?? ""}`,
      });
    return out;
  }, [player, stateUsps, statePack, national]);

  /* ---------------- history ---------------- */

  const earliest = useMemo(() => earliestMapDate(world), [world]);
  const days = dayCount(earliest, world.currentDate);
  const shownDate = model.date.asOf;

  /* ---------------- render ---------------- */

  const scaleHint = view.w / MAP_CANVAS.width;
  // Region strokes use non-scaling-stroke, so widths are screen pixels.
  const strokeWidth = 0.7;
  const contextStates = stateUsps ? layerFeatures(national, "state") : [];
  const outlineStates =
    !stateUsps && layer !== "state" ? layerFeatures(national, "state") : [];
  const detailOutline = stateUsps ? layerFeatures(statePack, "state") : [];
  const statesList = useMemo(
    () =>
      layerFeatures(national, "state")
        .map((feature) => ({
          usps: feature.stateUsps,
          name: stateNameForUsps(feature.stateUsps),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [national],
  );

  const quickTargets = [
    player.here
      ? { key: "here", label: "Here", usps: player.here.stateUsps }
      : null,
    player.home
      ? { key: "home", label: "Home", usps: player.home.stateUsps }
      : null,
  ].filter((entry): entry is { key: string; label: string; usps: string } =>
    Boolean(entry),
  );

  const labelSize = 11 * scaleHint;
  const insetFrames = useMemo(
    () =>
      (["alaska", "hawaii"] as const).flatMap((inset) => {
        const feature = layerFeatures(national, "state").find(
          (candidate) =>
            candidate.stateUsps === (inset === "alaska" ? "AK" : "HI"),
        );
        if (!feature) return [];
        const [x0, y0, x1, y1] = feature.bbox;
        const pad = 6;
        return [
          {
            inset,
            frame: {
              x: x0 - pad,
              y: y0 - pad,
              width: x1 - x0 + pad * 2,
              height: y1 - y0 + pad * 2 + 10,
            },
          },
        ];
      }),
    [national],
  );
  // Label only what is wide enough on screen to read; never a wall of text.
  const labelFits = (feature: MapFeature, text: string) =>
    ((feature.bbox[2] - feature.bbox[0]) / view.w) * 900 >
      text.length * 7 + 6 &&
    ((feature.bbox[3] - feature.bbox[1]) / view.h) * 560 > 14 &&
    feature.bbox[2] > view.x &&
    feature.bbox[0] < view.x + view.w &&
    feature.bbox[3] > view.y &&
    feature.bbox[1] < view.y + view.h;

  return (
    <section
      className="pg-map"
      aria-labelledby={headingId}
      data-testid="political-map"
    >
      <header className="pg-map-header">
        <h2 id={headingId} className="pg-map-title">
          {stateUsps ? stateNameForUsps(stateUsps) : "United States"} ·{" "}
          {MAP_MODE_LABEL[mode]}
        </h2>
        <p className="pg-map-subtitle" data-testid="map-date">
          {model.date.isHistorical
            ? `As recorded on ${proseDate(shownDate)}`
            : `Today, ${proseDate(shownDate)}`}
        </p>
      </header>

      <div className="pg-map-toolbar" role="toolbar" aria-label="Map controls">
        <div className="pg-map-group" role="group" aria-label="Color by">
          {ORDERED_MODES.map((candidate) => {
            const disabled = STATE_ONLY_MODES.has(candidate) && !stateUsps;
            return (
              <button
                key={candidate}
                type="button"
                className="pg-map-chip"
                aria-pressed={mode === candidate}
                disabled={disabled}
                title={disabled ? "Choose a state first" : undefined}
                data-testid={`map-mode-${candidate}`}
                onClick={() => setPrefs({ mode: candidate })}
              >
                {MAP_MODE_LABEL[candidate]}
              </button>
            );
          })}
        </div>
        <div className="pg-map-group" role="group" aria-label="Place">
          <label className="pg-map-select">
            <span>State</span>
            <select
              value={stateUsps ?? ""}
              data-testid="map-state"
              onChange={(event) => focusState(event.target.value || null)}
            >
              <option value="">All states</option>
              {statesList.map((state) => (
                <option key={state.usps} value={state.usps}>
                  {state.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="pg-map-chip"
            data-testid="map-home-view"
            onClick={() => focusState(null)}
          >
            United States
          </button>
          {quickTargets.map((target) => (
            <button
              key={target.key}
              type="button"
              className="pg-map-chip"
              data-testid={`map-quick-${target.key}`}
              onClick={() => focusState(target.usps)}
            >
              {target.label}
            </button>
          ))}
        </div>
        <div className="pg-map-group" role="group" aria-label="View">
          <button
            type="button"
            className="pg-map-chip"
            aria-label="Zoom in"
            data-testid="map-zoom-in"
            onClick={() => setView(zoomViewBox(view, 1.25))}
          >
            +
          </button>
          <button
            type="button"
            className="pg-map-chip"
            aria-label="Zoom out"
            data-testid="map-zoom-out"
            onClick={() => setView(zoomViewBox(view, 0.8))}
          >
            −
          </button>
          <button
            type="button"
            className="pg-map-chip"
            data-testid="map-reset-view"
            onClick={() =>
              setView(
                selectionBox
                  ? fitViewBox(selectionBox)
                  : stateUsps
                    ? view
                    : HOME_VIEW,
              )
            }
          >
            {selectionBox ? "Fit selection" : "Reset view"}
          </button>
          <button
            type="button"
            className="pg-map-chip"
            aria-pressed={preferences.labels}
            data-testid="map-labels"
            onClick={() => setPrefs({ labels: !preferences.labels })}
          >
            Labels
          </button>
          <button
            type="button"
            className="pg-map-chip"
            aria-pressed={preferences.presentation === "list"}
            data-testid="map-list-only"
            onClick={() =>
              setPrefs({
                presentation:
                  preferences.presentation === "list" ? "map" : "list",
              })
            }
          >
            List only
          </button>
        </div>
      </div>

      <div className="pg-map-history">
        <label htmlFor={`${headingId}-date`}>History</label>
        <input
          id={`${headingId}-date`}
          type="range"
          min={0}
          max={days}
          step={1}
          value={stepForDate(earliest, shownDate)}
          disabled={days === 0}
          aria-valuetext={proseDate(shownDate)}
          data-testid="map-history"
          onChange={(event) => {
            const date = dateAtStep(earliest, Number(event.target.value));
            setAsOf(date >= world.currentDate ? null : date);
          }}
        />
        <button
          type="button"
          className="pg-map-chip"
          disabled={!model.date.isHistorical}
          data-testid="map-history-today"
          onClick={() => setAsOf(null)}
        >
          Today
        </button>
        <span className="pg-map-muted">
          {days === 0
            ? "This save has no earlier recorded day to show."
            : `From ${proseDate(earliest)}. Past days show what this save recorded then; nothing is recolored by later changes.`}
        </span>
      </div>

      {stateLoading ? (
        <p className="pg-map-muted" role="status" data-testid="map-loading">
          Loading {stateNameForUsps(stateUsps as string)} in detail…
        </p>
      ) : null}
      {loadError ? (
        <p className="pg-map-error" role="alert">
          The map geometry could not be loaded: {loadError}
        </p>
      ) : null}

      <div
        className={`pg-map-body${preferences.presentation === "list" ? " pg-map-body-list" : ""}`}
      >
        {preferences.presentation === "map" ? (
          <div className="pg-map-canvas">
            <svg
              ref={svgRef}
              className="pg-map-svg"
              viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
              role="img"
              aria-label={`${MAP_MODE_LABEL[mode]} map. Use the list to choose a place with the keyboard. Arrow keys pan, plus and minus zoom, zero resets.`}
              tabIndex={0}
              data-testid="map-svg"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onMapKey}
            >
              <defs>
                <pattern
                  id="pg-map-hatch"
                  patternUnits="userSpaceOnUse"
                  width="4"
                  height="4"
                  patternTransform={`scale(${scaleHint}) rotate(45)`}
                >
                  <rect width="4" height="4" className="pg-map-hatch-bg" />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="4"
                    className="pg-map-hatch-line"
                  />
                </pattern>
                <pattern
                  id="pg-map-dots"
                  patternUnits="userSpaceOnUse"
                  width="4"
                  height="4"
                  patternTransform={`scale(${scaleHint})`}
                >
                  <rect width="4" height="4" className="pg-map-hatch-bg" />
                  <circle cx="2" cy="2" r="0.8" className="pg-map-dot" />
                </pattern>
                <pattern
                  id="pg-map-stripes"
                  patternUnits="userSpaceOnUse"
                  width="6"
                  height="6"
                  patternTransform={`scale(${scaleHint}) rotate(-45)`}
                >
                  <rect width="3" height="6" className="pg-map-stripe-a" />
                  <rect
                    x="3"
                    width="3"
                    height="6"
                    className="pg-map-stripe-b"
                  />
                </pattern>
              </defs>

              {contextStates.map((feature) => (
                <path
                  key={`ctx-${feature.geoid}`}
                  d={featurePath(national as MapGeometryPack, "state", feature)}
                  className="pg-map-context"
                  strokeWidth={strokeWidth}
                  onClick={() => {
                    if (!drag.current?.moved && feature.stateUsps !== stateUsps)
                      focusState(feature.stateUsps);
                  }}
                />
              ))}

              {features.map((feature) => {
                const region = model.regions.get(feature.geoid);
                const fill = region?.fill ?? { kind: "not-recorded" as const };
                const slot =
                  fill.kind === "party"
                    ? model.partySlots.get(fill.organizationId)
                    : undefined;
                const key = `${layer}:${feature.geoid}`;
                const selected =
                  selection?.layer === layer &&
                  selection.geoid === feature.geoid;
                const classes = [
                  "pg-map-region",
                  fillClass(fill),
                  selected ? "pg-map-selected" : "",
                  highlightKeys.has(key) ? "pg-map-highlight" : "",
                  candidateKeys.has(feature.geoid) ? "pg-map-candidate" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <path
                    key={key}
                    d={featurePath(drawPack as MapGeometryPack, layer, feature)}
                    className={classes}
                    style={slotStyle(slot?.slot, slot?.patternIndex)}
                    strokeWidth={strokeWidth}
                    data-geoid={feature.geoid}
                    data-fill={fillKey(fill)}
                    onClick={() => {
                      if (!drag.current?.moved) select(feature, layer);
                    }}
                  >
                    <title>{`${regionLabel(layer, feature)}: ${region?.summary ?? ""}`}</title>
                  </path>
                );
              })}

              {detailOutline.map((feature) => (
                <path
                  key={`outline-${feature.geoid}`}
                  d={featurePath(
                    statePack as MapGeometryPack,
                    "state",
                    feature,
                  )}
                  className="pg-map-outline"
                  strokeWidth={strokeWidth * 2}
                />
              ))}
              {outlineStates.map((feature) => (
                <path
                  key={`outline-${feature.geoid}`}
                  d={featurePath(national as MapGeometryPack, "state", feature)}
                  className="pg-map-outline"
                  strokeWidth={strokeWidth * 1.6}
                />
              ))}

              {!stateUsps
                ? insetFrames.map(({ inset, frame }) => {
                    return (
                      <g
                        key={inset}
                        className="pg-map-inset"
                        aria-hidden="true"
                      >
                        <rect
                          x={frame.x}
                          y={frame.y}
                          width={frame.width}
                          height={frame.height}
                          strokeWidth={strokeWidth}
                        />
                        <text
                          x={frame.x + 3}
                          y={frame.y + frame.height - 3}
                          fontSize={8 * scaleHint}
                        >
                          {inset === "alaska"
                            ? "Alaska (not to scale)"
                            : "Hawaii (not to scale)"}
                        </text>
                      </g>
                    );
                  })
                : null}

              {preferences.labels && !stateUsps && layer !== "state"
                ? outlineStates.map((feature) => {
                    const name = stateNameForUsps(feature.stateUsps);
                    const text = labelFits(feature, name)
                      ? name
                      : feature.stateUsps;
                    return labelFits(feature, text) ? (
                      <text
                        key={`state-context-${feature.geoid}`}
                        x={feature.label[0]}
                        y={feature.label[1]}
                        className="pg-map-label pg-map-state-label"
                        fontSize={labelSize * 1.1}
                        aria-hidden="true"
                      >
                        {text}
                      </text>
                    ) : null;
                  })
                : null}
              {preferences.labels
                ? features.map((feature) => {
                    const text =
                      layer === "state"
                        ? labelFits(
                            feature,
                            stateNameForUsps(feature.stateUsps),
                          )
                          ? stateNameForUsps(feature.stateUsps)
                          : feature.stateUsps
                        : shortName(feature, layer);
                    if (!labelFits(feature, text)) return null;
                    return (
                      <text
                        key={`label-${feature.geoid}`}
                        x={feature.label[0]}
                        y={feature.label[1]}
                        className="pg-map-label"
                        fontSize={labelSize}
                        aria-hidden="true"
                      >
                        {text}
                      </text>
                    );
                  })
                : null}

              {markers.map((marker) => (
                <g
                  key={marker.key}
                  className={`pg-map-marker pg-map-marker-${marker.kind}`}
                  transform={`translate(${marker.x} ${marker.y}) scale(${scaleHint})`}
                  data-testid={`map-marker-${marker.kind}`}
                >
                  <title>{marker.label}</title>
                  {marker.kind === "home" ? (
                    <path d="M0 -9 L8 -2 L6 -2 L6 6 L-6 6 L-6 -2 L-8 -2 Z" />
                  ) : (
                    <circle r="5" />
                  )}
                </g>
              ))}
            </svg>
            <p className="pg-map-attribution">
              Boundaries: U.S. Census Bureau 2025 cartographic boundary files
              (119th Congress districts; state legislative districts as Census
              publishes them). Alaska and Hawaii are drawn as insets.
            </p>
          </div>
        ) : null}

        <aside className="pg-map-side">
          <div className="pg-map-legend" aria-label="Legend">
            <strong>
              {mode === "county" || mode === "place"
                ? "Colors: geography only"
                : "Colors: recorded officeholder affiliation"}
            </strong>
            <span>⌂ Home · ● Current location · outline: selected region</span>
            <h3>Key</h3>
            <ul>
              {model.legend.map((entry) => (
                <li key={entry.key} title={entry.description}>
                  <LegendSwatch entry={entry} />
                  <span className="pg-map-legend-label">{entry.label}</span>
                  <span className="pg-map-muted">{entry.count}</span>
                </li>
              ))}
            </ul>
            {player.home && preferences.presentation === "map" ? (
              <p className="pg-map-muted" data-testid="map-key-home">
                <span className="pg-map-key-home" aria-hidden="true">
                  ⌂
                </span>{" "}
                Home: {player.homeLabel}
              </p>
            ) : null}
            {player.here && preferences.presentation === "map" ? (
              <p className="pg-map-muted" data-testid="map-key-here">
                <span className="pg-map-key-here" aria-hidden="true">
                  ●
                </span>{" "}
                Where you are: {player.hereLabel}
              </p>
            ) : null}
            {candidateKeys.size ? (
              <p className="pg-map-muted">
                Dashed outlines: districts your home may be in. The save does
                not record which one.
              </p>
            ) : null}
            {model.notes.map((note) => (
              <p key={note} className="pg-map-note">
                {note}
              </p>
            ))}
          </div>

          {inspection && selection ? (
            <div
              className="pg-map-inspector"
              data-testid="map-inspector"
              aria-live="polite"
            >
              <h3>{selection.name}</h3>
              {selection.layer === "congressional" &&
              /^0+$/.test(selection.geoid.slice(2)) ? (
                <p>At-large: one House district covers the entire state.</p>
              ) : null}
              <p className="pg-map-muted">
                {selection.layer === "state"
                  ? `${selection.stateUsps === "DC" ? "Federal district" : "State"} · Census GEOID ${selection.geoid}`
                  : `${stateNameForUsps(selection.stateUsps)} · Census GEOID ${selection.geoid}`}
                {selectionFeature?.sessionYear
                  ? ` · districts as of ${selectionFeature.sessionYear}`
                  : ""}
                {selection.layer === "place"
                  ? ` · ${placeTypeLabel(selectionFeature?.lsad)}`
                  : ""}
              </p>
              {inspection.relations.length ? (
                <ul className="pg-map-relations" data-testid="map-relations">
                  {inspection.relations.map((relation) => (
                    <li key={relation}>{relation}</li>
                  ))}
                </ul>
              ) : null}
              {inspection.offices.length ? (
                <ul className="pg-map-offices">
                  {inspection.offices.map((line) => (
                    <OfficeStatusView
                      key={line.key}
                      line={line}
                      onOpenPerson={onOpenPerson}
                    />
                  ))}
                </ul>
              ) : null}
              {inspection.contests.length ? (
                <div className="pg-map-contests">
                  <h4>Elections</h4>
                  {inspection.contests.map((contest) => (
                    <div
                      key={contest.contestId}
                      className="pg-map-contest"
                      data-testid="map-contest"
                    >
                      <div>
                        {contest.title} · {proseDate(contest.electionDate)} ·{" "}
                        {contest.state === "resolved" ? "decided" : "scheduled"}
                      </div>
                      <ul>
                        {contest.candidates.map((candidate) => (
                          <li key={candidate.personId}>
                            <button
                              type="button"
                              className="pg-map-link"
                              onClick={() => onOpenPerson(candidate.personId)}
                            >
                              {candidate.name}
                            </button>
                            {candidate.voteShare !== null
                              ? ` · ${(candidate.voteShare * 100).toFixed(1)}% of the vote in this save`
                              : ""}
                            {candidate.won ? " · won" : ""}
                          </li>
                        ))}
                      </ul>
                      <div className="pg-map-basis">{contest.basis}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {inspection.membership.length ? (
                <ul className="pg-map-membership">
                  {inspection.membership.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {inspection.notes.map((note) => (
                <p key={note} className="pg-map-note">
                  {note}
                </p>
              ))}
              <div className="pg-map-inspector-actions">
                {selection.layer === "state" &&
                selection.stateUsps !== stateUsps ? (
                  <button
                    type="button"
                    className="pg-map-chip"
                    data-testid="map-focus-state"
                    onClick={() => focusState(selection.stateUsps)}
                  >
                    Show {stateNameForUsps(selection.stateUsps)}
                  </button>
                ) : null}
                {selectionBox && preferences.presentation === "map" ? (
                  <button
                    type="button"
                    className="pg-map-chip"
                    data-testid="map-fit-selection"
                    onClick={() => setView(fitViewBox(selectionBox))}
                  >
                    Zoom to {selection.layer === "state" ? "state" : "area"}
                  </button>
                ) : null}
                {focus?.measureId && onOpenMeasure ? (
                  <button
                    type="button"
                    className="pg-map-chip"
                    onClick={() => onOpenMeasure(focus.measureId as EntityId)}
                  >
                    Open the highlighted bill
                  </button>
                ) : null}
                <button
                  type="button"
                  className="pg-map-chip"
                  onClick={() => setSelection(null)}
                >
                  Clear selection
                </button>
              </div>
              <p className="pg-map-muted">
                Looking at a place here does not travel there or change the day.
              </p>
            </div>
          ) : null}

          <div className="pg-map-list" data-testid="map-list">
            <label className="pg-map-search">
              <span>Find {MAP_MODE_LABEL[mode].toLowerCase()}</span>
              <input
                type="search"
                value={query}
                data-testid="map-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  stateUsps
                    ? "Name, number or holder"
                    : "State, district or holder"
                }
              />
            </label>
            <p className="pg-map-muted" aria-live="polite">
              {listRows.length > LIST_LIMIT
                ? `Showing ${LIST_LIMIT} of ${listRows.length}. Type to narrow the list.`
                : `${listRows.length} shown.`}
            </p>
            <ul>
              {shownRows.map((row) => (
                <li key={row.feature.geoid}>
                  <button
                    type="button"
                    className="pg-map-row"
                    aria-current={
                      selection?.geoid === row.feature.geoid &&
                      selection.layer === layer
                        ? "true"
                        : undefined
                    }
                    data-testid="map-list-row"
                    data-geoid={row.feature.geoid}
                    onClick={() => select(row.feature, layer)}
                  >
                    <span className="pg-map-row-name">{row.label}</span>
                    <span className="pg-map-row-summary">{row.summary}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

/** Census LSAD codes for places: incorporated places versus statistical CDPs. */
function placeTypeLabel(lsad: string | undefined): string {
  if (lsad === "57")
    return "Census-designated place (no municipal government of its own)";
  if (lsad === "00" || !lsad) return "Place";
  return "Incorporated place";
}

function shortName(feature: MapFeature, layer: MapLayerId): string {
  if (
    layer === "congressional" ||
    layer === "state-upper" ||
    layer === "state-lower"
  ) {
    const code = feature.geoid.slice(2).replace(/^0+(?=.)/, "");
    return /^0+$/.test(feature.geoid.slice(2))
      ? "At-large"
      : `${feature.stateUsps} ${code}`;
  }
  return feature.name.replace(
    / (city|town|village|borough|CDP|County|Parish|Borough|municipality)$/i,
    "",
  );
}

export default PoliticalMap;
