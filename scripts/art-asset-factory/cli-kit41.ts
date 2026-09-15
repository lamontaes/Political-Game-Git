import path from "node:path";
import { exportKit, importKit } from "./kit41";
const [command, input, output] = process.argv.slice(2);
if (command === "export" && input && output)
  console.log(
    JSON.stringify(
      exportKit(process.cwd(), path.resolve(output), input),
      null,
      2,
    ),
  );
else if ((command === "preview" || command === "import") && input)
  console.log(
    JSON.stringify(
      await importKit(process.cwd(), path.resolve(input), command === "import"),
      null,
      2,
    ),
  );
else
  throw new Error(
    "Usage: npm run kit:art -- export <source-registry.json> <output-directory> | preview <inbox/bundle.json> | import <inbox/bundle.json>",
  );
