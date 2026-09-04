import fs from "fs";
import path from "path";
import * as prettier from "prettier";

/**
 * Writes a generated file in the repository's own formatting.
 *
 * Generated files are checked in and are also checked by `npm run format`, so a
 * generator that emits its own idea of formatting makes the two fight: the
 * formatter rewrites the file and the generator's regeneration test then fails
 * on a byte comparison. Formatting the output at write time settles it in the
 * one place that can.
 */
export async function writeFormatted(
  filePath: string,
  contents: string,
): Promise<void> {
  const config = await prettier.resolveConfig(filePath);
  const formatted = await prettier.format(contents, {
    ...config,
    filepath: filePath,
  });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, formatted, "utf8");
}
