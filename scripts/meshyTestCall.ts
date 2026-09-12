import { MeshyProvider } from "../src/meshy-provider.js";

/**
 * Local/alternate path — triggers a single Meshy API call in TEST MODE.
 * Requires MESHY_API_KEY as an environment variable and a network path to
 * api.meshy.ai. Not used by the Safari-only deployment path (which uses
 * functions/meshy-test.ts instead) — kept here for a future environment
 * with normal desktop/network access.
 *
 * Usage:
 *   MESHY_API_KEY=your_key_here npm run meshy:test
 */
async function main() {
  const provider = new MeshyProvider();
  console.log(`Calling ${provider.providerName} in TEST MODE...`);

  const result = await provider.generate({
    partId: "US-02",
    prompt: "Cylindrical aluminum rocket propellant tank with hemispherical end caps",
    testMode: true,
  });

  console.log("Result:", JSON.stringify(result, null, 2));
  if (!result.success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("meshyTestCall failed:", err.message);
  process.exit(1);
});
