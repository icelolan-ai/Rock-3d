/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages Function — GET /meshy-test
 *
 * Runs the Meshy test-mode (preview) API call server-side, on Cloudflare's
 * infrastructure. Triggered by tapping a button on /diagnostics.html from
 * Safari on iPhone/iPad — the device never talks to api.meshy.ai directly,
 * and the API key never reaches the browser.
 *
 * Requires: MESHY_API_KEY set as a Pages environment variable/secret
 * (Cloudflare dashboard → Workers & Pages → your project → Settings →
 * Environment variables — a web UI action, no CLI). See instructions.md.
 */

interface Env {
  MESHY_API_KEY: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.MESHY_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    return jsonResponse(
      {
        success: false,
        message:
          "MESHY_API_KEY is not set. Add it as an environment variable/secret for this Pages " +
          "project in the Cloudflare dashboard (Settings > Environment variables), then redeploy.",
      },
      500
    );
  }

  let response: Response;
  try {
    response = await fetch("https://api.meshy.ai/v2/text-to-3d", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "preview", // test mode — no credit spend
        prompt: "Cylindrical aluminum rocket propellant tank with hemispherical end caps",
        ai_model: "meshy-4",
      }),
    });
  } catch (err) {
    return jsonResponse(
      {
        success: false,
        message: `Network error reaching api.meshy.ai from Cloudflare's edge: ${
          err instanceof Error ? err.message : String(err)
        }. This would indicate a Meshy-side outage, not a device/network problem on your end.`,
      },
      502
    );
  }

  const bodyText = await response.text();

  if (!response.ok) {
    return jsonResponse(
      {
        success: false,
        message: `Meshy API returned HTTP ${response.status}: ${bodyText}`,
      },
      502
    );
  }

  let data: { result?: string };
  try {
    data = JSON.parse(bodyText);
  } catch {
    return jsonResponse(
      { success: false, message: `Meshy API returned a non-JSON response: ${bodyText}` },
      502
    );
  }

  return jsonResponse({
    success: true,
    message: `Meshy test-mode request accepted (no credit spent). Task ID: ${data.result}.`,
    providerTaskId: data.result,
  });
};
