/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages Function — GET /r2-selftest
 *
 * Uploads the two pilot GLBs (already deployed as static assets at
 * the public/ folder root, alongside this Pages site) into the bound R2
 * bucket, then fetches them back to confirm a working round-trip.
 * Triggered by tapping a button on /diagnostics.html from Safari on
 * iPhone/iPad.
 *
 * Uses Cloudflare's native R2 binding — NOT the S3-compatible API — so no
 * Access Key ID / Secret Access Key are needed at all. The binding is
 * configured once in the Cloudflare dashboard (Workers & Pages > your
 * project > Settings > Functions > R2 bucket bindings — a web UI action,
 * no CLI). See instructions.md.
 */

interface Env {
  ROCKET_ASSETS: R2Bucket;
  ASSETS: Fetcher;
}

const PILOT_KEYS = ["US-02.glb", "PL-02.glb"];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const bucket = context.env.ROCKET_ASSETS;

  if (!bucket) {
    return jsonResponse(
      {
        success: false,
        message:
          "R2 bucket binding 'ROCKET_ASSETS' is not configured for this Pages project. " +
          "Add it in the Cloudflare dashboard (Settings > Functions > R2 bucket bindings), " +
          "then redeploy.",
      },
      500
    );
  }

  const results: Array<Record<string, unknown>> = [];

  for (const key of PILOT_KEYS) {
    try {
      const assetUrl = new URL(`/${key}`, context.request.url);
      const assetResponse = await context.env.ASSETS.fetch(assetUrl.toString());

      if (!assetResponse.ok) {
        results.push({
          key,
          success: false,
          step: "read-static-asset",
          message: `Could not read /${key} from this deployment's static assets (HTTP ${assetResponse.status}). Was the file included in the build output?`,
        });
        continue;
      }

      const originalBytes = await assetResponse.arrayBuffer();

      await bucket.put(`parts/${key}`, originalBytes);

      const fetchedObject = await bucket.get(`parts/${key}`);
      if (!fetchedObject) {
        results.push({
          key,
          success: false,
          step: "r2-get-after-put",
          message: "Uploaded successfully, but the immediate GET returned null.",
        });
        continue;
      }

      const fetchedBytes = await fetchedObject.arrayBuffer();
      const byteCountsMatch = fetchedBytes.byteLength === originalBytes.byteLength;

      results.push({
        key,
        success: byteCountsMatch,
        step: "roundtrip",
        uploadedBytes: originalBytes.byteLength,
        fetchedBytes: fetchedBytes.byteLength,
        message: byteCountsMatch
          ? `Round-trip OK: ${originalBytes.byteLength} bytes uploaded and fetched back identically.`
          : `Byte count mismatch: uploaded ${originalBytes.byteLength}, fetched back ${fetchedBytes.byteLength}.`,
      });
    } catch (err) {
      results.push({
        key,
        success: false,
        step: "exception",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const allSuccess = results.every((r) => r.success === true);
  return jsonResponse({ success: allSuccess, results });
};
