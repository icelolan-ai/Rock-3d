import { readFile } from "node:fs/promises";
import { generateTankGLB } from "../src/generate-tank.js";
import { generateAdapterGLB } from "../src/generate-adapter.js";
import type { PartSpec } from "../src/part-spec.js";

async function main() {
  const specsRaw = await readFile(new URL("../data/part-specs.json", import.meta.url), "utf-8");
  const specs = JSON.parse(specsRaw) as Record<string, PartSpec>;

  console.log("=== Generating procedural parts (LOCAL — no network calls) ===\n");

  await generateTankGLB(specs["US-02"], "output/US-02.glb");
  console.log("[US-02] LOX Tank generated -> output/US-02.glb");

  await generateAdapterGLB(specs["PL-02"], "output/PL-02.glb");
  console.log("[PL-02] Payload Adapter generated -> output/PL-02.glb");

  console.log("\nDone. Run `npm run validate:parts` next.");
}

main().catch((err) => {
  console.error("generateParts failed:", err.message);
  process.exit(1);
});
