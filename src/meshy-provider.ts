import type { AI3DProvider, AI3DGenerationRequest, AI3DGenerationResult } from "./ai-provider.js";

/**
 * MeshyProvider — concrete AI3DProvider backed by api.meshy.ai.
 *
 * Configuration is read from environment variables ONLY. Never hardcode
 * the API key here (Master Instructions §34 Security).
 *
 * Required env var:
 *   MESHY_API_KEY
 *
 * Network requirement:
 *   This class must be able to reach https://api.meshy.ai. In sandboxed
 *   execution environments with an egress allowlist, this domain may not
 *   be reachable — see the network-unreachable error path below.
 */

const MESHY_API_BASE = "https://api.meshy.ai";

export class MeshyProvider implements AI3DProvider {
  readonly providerName = "Meshy";

  private getApiKey(): string {
    const key = process.env.MESHY_API_KEY;
    if (!key || key.trim().length === 0) {
      throw new Error(
        "MeshyProvider configuration error: MESHY_API_KEY is not set. " +
          "Set it as an environment variable before running (see instructions.md, " +
          "section 'Meshy API Key setup'). Refusing to proceed without it — " +
          "this pipeline never uses a mocked or hardcoded key."
      );
    }
    return key;
  }

  async generate(request: AI3DGenerationRequest): Promise<AI3DGenerationResult> {
    const apiKey = this.getApiKey();

    if (!request.prompt && !request.referenceImage) {
      throw new Error(
        `MeshyProvider request error for part "${request.partId}": neither "prompt" nor ` +
          `"referenceImage" was provided. At least one is required by the Meshy API.`
      );
    }

    let response: Response;
    try {
      response = await fetch(`${MESHY_API_BASE}/v2/text-to-3d`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: request.testMode ? "preview" : "refine",
          prompt: request.prompt,
          image_url: request.referenceImage,
          ai_model: "meshy-4",
        }),
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      throw new Error(
        `MeshyProvider network error for part "${request.partId}": could not reach ` +
          `${MESHY_API_BASE}. This usually means "network unreachable at api.meshy.ai" — ` +
          `check that this execution environment's network allowlist includes api.meshy.ai, ` +
          `or run this call from an environment with unrestricted outbound access. ` +
          `Underlying error: ${cause}`
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "<no body>");
      return {
        success: false,
        message: `Meshy API returned HTTP ${response.status} for part "${request.partId}": ${body}`,
        isTestModeStub: request.testMode,
      };
    }

    const data = (await response.json()) as { result?: string };
    return {
      success: true,
      providerTaskId: data.result,
      message: request.testMode
        ? `Meshy test-mode request accepted for part "${request.partId}" (no credit spent). ` +
          `Task ID: ${data.result}. Poll the task status endpoint to retrieve the GLB when ready.`
        : `Meshy generation request accepted for part "${request.partId}". Task ID: ${data.result}.`,
      isTestModeStub: request.testMode,
    };
  }
}
