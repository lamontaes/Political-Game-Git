import path from "path";
import { extractChromaToPng } from "./chroma-extract";

const [sourcePath, destinationPath] = process.argv.slice(2);
if (!sourcePath || !destinationPath) {
  throw new Error(
    "Usage: cli-chroma-extract.ts <approved-source.png> <runtime-output.png>",
  );
}

const result = await extractChromaToPng(
  path.resolve(sourcePath),
  path.resolve(destinationPath),
);
console.log(JSON.stringify(result));
