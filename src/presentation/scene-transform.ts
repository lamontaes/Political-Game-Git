export interface SceneSize {
  readonly width: number;
  readonly height: number;
}

export interface SceneRect extends SceneSize {
  readonly x: number;
  readonly y: number;
}

export interface SceneCameraPolicy {
  readonly minimumAspectRatio: number;
  readonly maximumAspectRatio: number;
  readonly horizontalFocus: number;
  readonly verticalFocus: number;
}

export interface SceneTransform {
  readonly viewport: SceneSize;
  readonly virtualScene: SceneSize;
  readonly camera: SceneRect;
  readonly visibleScene: SceneRect;
  readonly uniformScale: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly xOffset: number;
  readonly yOffset: number;
  readonly renderedSceneWidth: number;
  readonly renderedSceneHeight: number;
  readonly devicePixelRatio: number;
  readonly constrainedAxis: "none" | "horizontal" | "vertical";
}

export interface RasterFidelityMeasurement {
  readonly nativeWidth: number;
  readonly nativeHeight: number;
  readonly renderedCssWidth: number;
  readonly renderedCssHeight: number;
  readonly devicePixelRatio: number;
  readonly requiredPhysicalWidth: number;
  readonly requiredPhysicalHeight: number;
  readonly effectiveSourceCoverageX: number;
  readonly effectiveSourceCoverageY: number;
}

const validPositive = (value: number) => Number.isFinite(value) && value > 0;

function snapToPhysicalPixel(value: number, devicePixelRatio: number): number {
  return Math.round(value * devicePixelRatio) / devicePixelRatio;
}

export function resolveSceneTransform(
  viewport: SceneSize,
  virtualScene: SceneSize,
  policy: SceneCameraPolicy,
  requestedDevicePixelRatio = 1,
): SceneTransform {
  if (
    !validPositive(viewport.width) ||
    !validPositive(viewport.height) ||
    !validPositive(virtualScene.width) ||
    !validPositive(virtualScene.height)
  ) {
    throw new Error("Scene and viewport dimensions must be positive numbers.");
  }
  if (
    !validPositive(policy.minimumAspectRatio) ||
    policy.maximumAspectRatio < policy.minimumAspectRatio ||
    policy.horizontalFocus < 0 ||
    policy.horizontalFocus > 1 ||
    policy.verticalFocus < 0 ||
    policy.verticalFocus > 1
  ) {
    throw new Error("Scene camera policy is invalid.");
  }

  const devicePixelRatio = validPositive(requestedDevicePixelRatio)
    ? requestedDevicePixelRatio
    : 1;
  const viewportAspect = viewport.width / viewport.height;
  let cameraWidth = viewport.width;
  let cameraHeight = viewport.height;
  let cameraX = 0;
  let cameraY = 0;
  let constrainedAxis: SceneTransform["constrainedAxis"] = "none";

  if (viewportAspect > policy.maximumAspectRatio) {
    cameraWidth = viewport.height * policy.maximumAspectRatio;
    cameraX = (viewport.width - cameraWidth) * policy.horizontalFocus;
    constrainedAxis = "horizontal";
  } else if (viewportAspect < policy.minimumAspectRatio) {
    cameraHeight = viewport.width / policy.minimumAspectRatio;
    cameraY = (viewport.height - cameraHeight) * policy.verticalFocus;
    constrainedAxis = "vertical";
  }

  cameraX = snapToPhysicalPixel(cameraX, devicePixelRatio);
  cameraY = snapToPhysicalPixel(cameraY, devicePixelRatio);
  cameraWidth = snapToPhysicalPixel(cameraWidth, devicePixelRatio);
  cameraHeight = snapToPhysicalPixel(cameraHeight, devicePixelRatio);

  const uniformScale = Math.max(
    cameraWidth / virtualScene.width,
    cameraHeight / virtualScene.height,
  );
  const renderedSceneWidth = virtualScene.width * uniformScale;
  const renderedSceneHeight = virtualScene.height * uniformScale;
  const xOffset = snapToPhysicalPixel(
    cameraX + (cameraWidth - renderedSceneWidth) * policy.horizontalFocus,
    devicePixelRatio,
  );
  const yOffset = snapToPhysicalPixel(
    cameraY + (cameraHeight - renderedSceneHeight) * policy.verticalFocus,
    devicePixelRatio,
  );

  return {
    viewport,
    virtualScene,
    camera: {
      x: cameraX,
      y: cameraY,
      width: cameraWidth,
      height: cameraHeight,
    },
    visibleScene: {
      x: (cameraX - xOffset) / uniformScale,
      y: (cameraY - yOffset) / uniformScale,
      width: cameraWidth / uniformScale,
      height: cameraHeight / uniformScale,
    },
    uniformScale,
    scaleX: uniformScale,
    scaleY: uniformScale,
    xOffset,
    yOffset,
    renderedSceneWidth,
    renderedSceneHeight,
    devicePixelRatio,
    constrainedAxis,
  };
}

export function projectSceneRect(
  rect: SceneRect,
  transform: SceneTransform,
): SceneRect {
  return {
    x: transform.xOffset + rect.x * transform.uniformScale,
    y: transform.yOffset + rect.y * transform.uniformScale,
    width: rect.width * transform.uniformScale,
    height: rect.height * transform.uniformScale,
  };
}

export function containsSceneRect(
  container: SceneRect,
  rect: SceneRect,
): boolean {
  return (
    rect.x >= container.x &&
    rect.y >= container.y &&
    rect.x + rect.width <= container.x + container.width &&
    rect.y + rect.height <= container.y + container.height
  );
}

export function measureRasterFidelity(
  nativeSource: SceneSize,
  virtualBounds: SceneSize,
  transform: SceneTransform,
): RasterFidelityMeasurement {
  const renderedCssWidth = virtualBounds.width * transform.uniformScale;
  const renderedCssHeight = virtualBounds.height * transform.uniformScale;
  const requiredPhysicalWidth = renderedCssWidth * transform.devicePixelRatio;
  const requiredPhysicalHeight = renderedCssHeight * transform.devicePixelRatio;
  return {
    nativeWidth: nativeSource.width,
    nativeHeight: nativeSource.height,
    renderedCssWidth,
    renderedCssHeight,
    devicePixelRatio: transform.devicePixelRatio,
    requiredPhysicalWidth,
    requiredPhysicalHeight,
    effectiveSourceCoverageX: nativeSource.width / requiredPhysicalWidth,
    effectiveSourceCoverageY: nativeSource.height / requiredPhysicalHeight,
  };
}
