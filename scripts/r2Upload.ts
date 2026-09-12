import { uploadToR2 } from "../src/r2-client.js";

/**
 * Local/alternate path — not used by the Safari-only deployment (which
 * uses the native R2 binding in functions/r2-selftest.ts instead). Kept
 * for a future environment with normal desktop/network access.
 *
 * Usage:
 *   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
 *   R2_BUCKET_NAME=... npm run r2:upload
 */
async function main() {
  const parts = [
    { local: "output/US-02.glb", key: "parts/US-02.glb" },
    { local: "output/PL-02.glb", key: "parts/PL-02.glb" },
  ];

  for (const part of parts) {
    const result = await uploadToR2(part.local, part.key);
    console.log(`Uploaded ${part.local} -> r2://${result.bucket}/${result.key}`);
  }
}

main().catch((err) => {
  console.error("r2Upload failed:", err.message);
  process.exit(1);
});
