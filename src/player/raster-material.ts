/** Array operation: alpha and excluded pixels stay exact in the supplied buffer.
 * Browser PNG/canvas decode and encode use premultiplied alpha; semitransparent
 * RGB can quantize during that round trip. This is not a byte-exact PNG editor. */
export function remapRasterMaterial(
  pixels: Uint8ClampedArray,
  map: Uint8ClampedArray,
  stops: readonly string[],
): Uint8ClampedArray {
  if (
    pixels.length !== map.length ||
    pixels.length % 4 !== 0 ||
    stops.length < 2
  )
    throw new Error("Invalid raster material dimensions or ramp.");
  const colors = stops.map((stop) => {
    if (!/^#[0-9a-f]{6}$/i.test(stop))
      throw new Error("Invalid material stop.");
    return [1, 3, 5].map((offset) =>
      Number.parseInt(stop.slice(offset, offset + 2), 16),
    );
  });
  const out = new Uint8ClampedArray(pixels);
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3] || !map[i + 3]) continue;
    const weight = map[i + 3]! / 255;
    const shade = (map[i]! / 255) * (colors.length - 1);
    const low = Math.min(Math.floor(shade), colors.length - 2);
    const fraction = shade - low;
    for (let c = 0; c < 3; c++) {
      const color =
        colors[low]![c]! * (1 - fraction) + colors[low + 1]![c]! * fraction;
      out[i + c] = Math.round(pixels[i + c]! * (1 - weight) + color * weight);
    }
  }
  return out;
}
