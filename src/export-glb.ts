import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * GLTFExporter's binary-export path uses the browser FileReader API
 * (Blob -> ArrayBuffer / DataURL) internally, which does not exist in
 * Node.js. Node's global Blob (available since Node 18) does support an
 * async `.arrayBuffer()` method, so we implement just enough of the
 * FileReader surface (readAsArrayBuffer, readAsDataURL, onloadend, result)
 * for GLTFExporter to work unmodified in this Node-based build pipeline.
 */
if (typeof globalThis.FileReader === "undefined") {
  class NodeFileReaderPolyfill {
    result: ArrayBuffer | string | null = null;
    onload: ((ev: unknown) => void) | null = null;
    onloadend: ((ev: unknown) => void) | null = null;
    onerror: ((err: unknown) => void) | null = null;

    private finish() {
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }

    readAsArrayBuffer(blob: Blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf;
          this.finish();
        })
        .catch((err) => this.onerror?.(err));
    }

    readAsDataURL(blob: Blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          const base64 = Buffer.from(buf).toString("base64");
          const mime = (blob as any).type || "application/octet-stream";
          this.result = `data:${mime};base64,${base64}`;
          this.finish();
        })
        .catch((err) => this.onerror?.(err));
    }
  }
  // @ts-expect-error — intentional minimal polyfill, not a full FileReader
  globalThis.FileReader = NodeFileReaderPolyfill;
}

/**
 * Exports a Three.js Object3D (or Scene) to a binary GLB file on disk.
 * Used by all procedural generators so every part goes through the same
 * export path (consistent settings, consistent error handling).
 */
export async function exportGLB(object: THREE.Object3D, outputPath: string): Promise<void> {
  const exporter = new GLTFExporter();

  const glbArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      object,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          reject(
            new Error(
              "GLTFExporter returned JSON instead of a binary ArrayBuffer — " +
                "check that the 'binary: true' export option was passed."
            )
          );
        }
      },
      (error) => reject(error instanceof Error ? error : new Error(String(error))),
      { binary: true }
    );
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(glbArrayBuffer));
}
