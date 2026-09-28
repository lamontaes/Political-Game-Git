import { optionalGlob } from "./optional-glob";

/**
 * The runtime URLs of the owner's place backdrops (art/backdrops), by file
 * name. Shared by the place backdrops and the home scenes so the pictures are
 * bundled once. Outside Vite (plain Node tools) there is no glob and no URL.
 */
const urls = optionalGlob(() =>
  import.meta.glob<string>("../../art/backdrops/*.jpg", {
    eager: true,
    query: "?url",
    import: "default",
  }),
);

export function backdropUrl(file: string): string | null {
  return urls[`../../art/backdrops/${file}`] ?? null;
}
