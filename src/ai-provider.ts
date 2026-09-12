/**
 * AI3DProvider — abstraction over any AI 3D generation service.
 *
 * Per Master Instructions §30 (Provider Independence), the rest of the
 * pipeline must depend only on this interface, never on a concrete
 * provider (Meshy, or any future replacement). Swapping providers means
 * writing a new class that implements this interface — no changes
 * elsewhere in the pipeline.
 */

export interface AI3DGenerationRequest {
  /** Reference image URL or base64 data URI describing the part to generate. */
  referenceImage?: string;
  /** Text prompt describing the part, used alone or alongside a reference image. */
  prompt?: string;
  /** Internal part ID this generation request corresponds to (for traceability). */
  partId: string;
  /** Whether this call should run in the provider's test/sandbox mode (no credit spend). */
  testMode: boolean;
}

export interface AI3DGenerationResult {
  /** True if the provider accepted and completed the request. */
  success: boolean;
  /** URL or local path to the resulting GLB, if success is true. */
  glbUrl?: string;
  /** Raw provider job/task ID, for debugging and re-querying status. */
  providerTaskId?: string;
  /** Human-readable status or error message. */
  message: string;
  /** Set when testMode was true — result is a stub, not a real asset. */
  isTestModeStub: boolean;
}

export interface AI3DProvider {
  readonly providerName: string;

  /**
   * Submits a generation request and returns the result.
   * Implementations MUST throw a descriptive error (never a silent failure)
   * if required configuration (API keys, network) is missing — see
   * Master Instructions §45 "No Guessing Rule".
   */
  generate(request: AI3DGenerationRequest): Promise<AI3DGenerationResult>;
}
