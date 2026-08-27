import path from "path";
import { deriveOfficeRuntimePlate } from "./office-plate-derive";

const [sourcePath, runtimePath, foregroundMaskPath] = process.argv.slice(2);
if (!sourcePath || !runtimePath || !foregroundMaskPath) {
  throw new Error(
    "Usage: cli-office-plate-derive.ts <approved-source.png> <runtime-output.png> <foreground-mask-output.png>",
  );
}

const result = await deriveOfficeRuntimePlate(
  path.resolve(sourcePath),
  path.resolve(runtimePath),
  path.resolve(foregroundMaskPath),
);
console.log(JSON.stringify(result));
