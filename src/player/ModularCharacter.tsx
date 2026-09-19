import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { acquirePreparedVariant } from "./engine-people29-svg";
import type { AppearanceMaterial } from "../simulation/appearance-material";
import { ENGINE_PEOPLE29_TEMPLATES } from "../presentation/engine-people29-data";

import type { CharacterRenderPlan } from "../presentation/character-render-plan";

interface ModularCharacterProps {
  readonly plan: CharacterRenderPlan;
  /** Developer-only: draw the root and attachment anchors as DOM markers. */
  readonly debugAnchors?: boolean;
  readonly testId?: string;
  readonly expression?: "neutral" | "smile";
}

/**
 * Renders one character render plan as ordered DOM image layers inside a
 * transformed scene camera. Every layer is positioned in plate percent units
 * exactly as the pure plan computed them; this component adds no geometry.
 * Anchor markers are DOM overlays, never part of any raster.
 */
function ModularCharacterLayers({
  plan,
  debugAnchors = false,
  testId = "modular-character",
  expression = "neutral",
}: ModularCharacterProps) {
  return (
    <div
      className="modular-character"
      data-testid={testId}
      data-person-id={plan.personId}
      data-anchor-id={plan.anchorId}
      data-pose-family={plan.poseFamily}
      data-recipe-key={plan.recipeKey}
      data-appearance-seed={plan.appearanceSeed}
      data-catalog-generation={plan.catalogGeneration}
      data-pinned-by-person={plan.pinnedByPerson ? "true" : "false"}
      data-complete={plan.complete ? "true" : "false"}
      data-layer-count={plan.layers.length}
      data-expression={expression}
      style={{ zIndex: plan.depth } satisfies CSSProperties}
    >
      {plan.layers.map((layer, index) =>
        layer.url ? (
          <MaterialImage
            key={layer.assetId}
            assetId={layer.assetId}
            material={plan.material}
            drawnIds={plan.layers.map((l) => l.assetId)}
            expression={expression}
            className={`modular-character-layer modular-character-layer--${layer.kind}`}
            src={layer.url}
            alt=""
            aria-hidden="true"
            draggable="false"
            data-testid={`${testId}-layer`}
            data-layer-index={index}
            data-layer={layer.layer}
            data-asset-id={layer.assetId}
            data-kind={layer.kind}
            data-slot-id={layer.slotId}
            data-attachment-anchor-id={layer.attachmentAnchorId ?? ""}
            style={
              {
                left: `${layer.leftPercent}%`,
                top: `${layer.topPercent}%`,
                width: `${layer.widthPercent}%`,
                height: `${layer.heightPercent}%`,
                zIndex: layer.layer,
              } satisfies CSSProperties
            }
          />
        ) : (
          <span
            key={layer.assetId}
            className="modular-character-layer modular-character-layer--missing"
            data-testid={`${testId}-missing-layer`}
            data-asset-id={layer.assetId}
            style={
              {
                left: `${layer.leftPercent}%`,
                top: `${layer.topPercent}%`,
                width: `${layer.widthPercent}%`,
                height: `${layer.heightPercent}%`,
                zIndex: layer.layer,
              } satisfies CSSProperties
            }
          />
        ),
      )}
      {debugAnchors && plan.root ? (
        <span
          className="character-anchor-marker character-anchor-marker--root"
          data-testid={`${testId}-root-marker`}
          data-marker-id={plan.root.id}
          title={`Character root: ${plan.root.id}`}
          style={
            {
              left: `${plan.root.xPercent}%`,
              top: `${plan.root.yPercent}%`,
            } satisfies CSSProperties
          }
        />
      ) : null}
      {debugAnchors
        ? plan.attachmentAnchors.map((anchor) => (
            <span
              key={anchor.id}
              className="character-anchor-marker character-anchor-marker--attachment"
              data-testid={`${testId}-attachment-marker`}
              data-marker-id={anchor.id}
              title={`Attachment anchor: ${anchor.id}`}
              style={
                {
                  left: `${anchor.xPercent}%`,
                  top: `${anchor.yPercent}%`,
                } satisfies CSSProperties
              }
            >
              <small>{anchor.id}</small>
            </span>
          ))
        : null}
    </div>
  );
}

/** Resolve every material layer before showing a person. A rejected layer must
 * never produce a headless or partially dressed person. */
const MaterialGroupContext = createContext<ReadonlyMap<string, string> | null>(
  null,
);
interface MaterialGroupLayer {
  readonly assetId?: string;
  readonly url?: string | null;
  readonly material?: AppearanceMaterial;
}
export function MaterialGroup({
  layers,
  expression = "neutral",
  children,
}: {
  readonly layers: readonly MaterialGroupLayer[];
  readonly expression?: "neutral" | "smile";
  readonly children: ReactNode;
}) {
  const request = JSON.stringify([layers, expression]);
  const [result, setResult] = useState<{
    request: string;
    urls: Map<string, string>;
    error?: string;
  }>();
  useEffect(() => {
    const [members, faceExpression] = JSON.parse(request) as [
      MaterialGroupLayer[],
      "neutral" | "smile",
    ];
    let active = true;
    const leases: ReturnType<typeof acquirePreparedVariant>[] = [];
    const ids = members.flatMap((layer) =>
      layer.assetId ? [layer.assetId] : [],
    );
    void Promise.all(
      members.map(async (layer) => {
        if (!layer.url) throw new Error("Missing character layer source.");
        if (
          !layer.assetId ||
          !layer.material ||
          !ENGINE_PEOPLE29_TEMPLATES[layer.assetId]
        ) {
          const image = new Image();
          image.src = layer.url;
          await image.decode();
          return;
        }
        const lease = acquirePreparedVariant(
          layer.assetId,
          layer.material,
          ids,
          faceExpression,
        );
        leases.push(lease);
        const url = await lease.url;
        const image = new Image();
        image.src = url;
        await image.decode();
        return [layer.assetId, url] as const;
      }),
    ).then(
      (values) => {
        if (active)
          setResult({
            request,
            urls: new Map(values.filter((value) => value !== undefined)),
          });
      },
      (error) => {
        if (active)
          setResult({ request, urls: new Map(), error: String(error) });
      },
    );
    return () => {
      active = false;
      leases.forEach((lease) => lease.release());
    };
  }, [request]);
  const current = result?.request === request ? result : undefined;
  if (!current || current.error)
    return (
      <span
        data-material-group-state={current?.error ? "unavailable" : "loading"}
        data-diagnostic={current?.error}
      >
        {current?.error
          ? "Character artwork unavailable."
          : "Loading character artwork…"}
      </span>
    );
  return (
    <MaterialGroupContext.Provider value={current.urls}>
      {children}
    </MaterialGroupContext.Provider>
  );
}

export function ModularCharacter(props: ModularCharacterProps) {
  return (
    <MaterialGroup
      layers={props.plan.layers.map((layer) => ({
        assetId: layer.assetId,
        url: layer.url,
        material: props.plan.material,
      }))}
      expression={props.expression}
    >
      <ModularCharacterLayers {...props} />
    </MaterialGroup>
  );
}

export function MaterialImage({
  assetId,
  material,
  drawnIds,
  expression = "neutral",
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  assetId: string;
  material?: AppearanceMaterial;
  drawnIds: readonly string[];
  expression?: "neutral" | "smile";
}) {
  const group = useContext(MaterialGroupContext);
  const groupedUrl = group?.get(assetId);
  const wanted =
    !group && material && ENGINE_PEOPLE29_TEMPLATES[assetId]
      ? JSON.stringify([assetId, material, drawnIds, expression])
      : null;
  const [variant, setVariant] = useState<{ key: string; url: string } | null>(
    null,
  );
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!wanted) return;
    const [sourceId, parameters, drawn, faceExpression] = JSON.parse(
      wanted,
    ) as [string, AppearanceMaterial, string[], "neutral" | "smile"];
    let active = true;
    setError(false);
    let acquired: ReturnType<typeof acquirePreparedVariant>;
    try {
      acquired = acquirePreparedVariant(
        sourceId,
        parameters,
        drawn,
        faceExpression,
      );
      void acquired.url.then(
        (url) => {
          if (active) setVariant({ key: wanted, url });
        },
        () => {
          if (active) setError(true);
        },
      );
    } catch {
      setError(true);
      return;
    }
    return () => {
      active = false;
      acquired.release();
    };
  }, [wanted]);
  const src = wanted
    ? variant?.key === wanted
      ? variant.url
      : undefined
    : (groupedUrl ?? props.src);
  return (
    <img
      {...props}
      src={src}
      data-material-version={material?.version}
      data-material-parameters={material ? JSON.stringify(material) : undefined}
      data-material-state={
        group
          ? "ready"
          : wanted
            ? error
              ? "unavailable"
              : src
                ? "ready"
                : "loading"
            : undefined
      }
    />
  );
}
