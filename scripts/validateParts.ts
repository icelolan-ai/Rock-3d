import { readFile } from "node:fs/promises";
import { validateBoundingBox } from "../src/validate-bbox.js";
import type { PartSpec } from "../src/part-spec.js";

async function main() {
  const specsRaw = await readFile(new URL("../data/part-specs.json", import.meta.url), "utf-8");
  const specs = JSON.parse(specsRaw) as Record<string, PartSpec>;

  console.log("=== Validating generated GLBs against part-specs.json (LOCAL) ===\n");

  let allPass = true;

  {
    const spec = specs["US-02"];
    const dims = spec.dimensions as { diameter: number; height: number; unit: string };
    const result = await validateBoundingBox("output/US-02.glb", spec, {
      x: dims.diameter,
      y: dims.height,
      z: dims.diameter,
      unit: dims.unit,
    });
    console.log(`[${result.partId}] ${result.pass ? "PASS" : "FAIL"}`);
    result.details.forEach((d) => console.log(`  ${d}`));
    if (!result.pass) allPass = false;
  }

  console.log("");

  {
    const spec = specs["PL-02"];
    const dims = spec.dimensions as { topDiameter: number; baseDiameter: number; height: number; unit: string };
    const result = await validateBoundingBox("output/PL-02.glb", spec, {
      x: dims.baseDiameter,
      y: dims.height,
      z: dims.baseDiameter,
      unit: dims.unit,
    });
    console.log(`[${result.partId}] ${result.pass ? "PASS" : "FAIL"}`);
    result.details.forEach((d) => console.log(`  ${d}`));
    if (!result.pass) allPass = false;
  }

  console.log(`\n=== Overall: ${allPass ? "ALL PASS" : "SOME FAILED"} ===`);
  if (!allPass) process.exit(1);
}

main().catch((err) => {
  console.error("validateParts failed:", err.message);
  process.exit(1);
});
