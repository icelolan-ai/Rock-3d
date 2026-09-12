import { writeFile } from "node:fs/promises";
import { fetchFromR2 } from "../src/r2-client.js";

/**
 * Local/alternate path — not used by the Safari-only deployment. Kept for
 * a future environment with normal desktop/network access.
 *
 * Usage:
 *   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
 *   R2_BUCKET_NAME=... npm run r2:fetch
 */
async function main() {
  const keys = ["parts/US-02.glb", "parts/PL-02.glb"];

  for (const key of keys) {
    const buffer = await fetchFromR2(key);
    const outPath = `output/fetched/${key.split("/").pop()}`;
    await writeFile(outPath, buffer);
    console.log(`Fetched r2://${key} -> ${outPath} (${buffer.byteLength} bytes)`);
  }
}

main().catch((err) => {
  console.error("r2Fetch failed:", err.message);
  process.exit(1);
});
