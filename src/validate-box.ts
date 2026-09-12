import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { readFile } from "node:fs/promises";
import type { PartSpec } from "./part-spec.js";

export interface BoundingBoxCheckResult {
  partId: string;
  pass: boolean;
  expected: { x: number; y: number; z: number; unit: string };
  actual: { x: number; y: number; z: number };
  toleranceFraction: number;
  details: string[];
}

/**
 * Loads a GLB file (from disk, by path) and checks its overall bounding-box
 * dimensions against the expected dimensions in the part spec, within a
 * tolerance fraction (default ±2%, per Build Spec §6).
 *
 * This validates the ACTUAL exported GLB, not the in-memory Three.js object
 * that produced it — catching export-step bugs (e.g. bad scale/orientation).
 */
export async function validateBoundingBox(
  glbPath: string,
  spec: PartSpec,
  expected: { x: number; y: number; z: number; unit: string },
  toleranceFraction = 0.02
): Promise<BoundingBoxCheckResult> {
  const fileBuffer = await readFile(glbPath);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );

  const loader = new GLTFLoader();
  const gltf = await new Promise<any>((resolve, reject) => {
    loader.parse(arrayBuffer, "", resolve, reject);
  });

  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = new THREE.Vector3();
  box.getSize(size);

  const actual = { x: size.x, y: size.y, z: size.z };
  const details: string[] = [];
  let pass = true;

  for (const axis of ["x", "y", "z"] as const) {
    const expectedVal = expected[axis];
    const actualVal = actual[axis];
    const diffFraction = Math.abs(actualVal - expectedVal) / expectedVal;
    const axisPass = diffFraction <= toleranceFraction;
    if (!axisPass) pass = false;
    details.push(
      `${axis.toUpperCase()}: expected ${expectedVal.toFixed(3)}${expected.unit}, ` +
        `got ${actualVal.toFixed(3)} (${(diffFraction * 100).toFixed(2)}% diff) — ` +
        `${axisPass ? "PASS" : "FAIL"}`
    );
  }

  return {
    partId: spec.partId,
    pass,
    expected,
    actual,
    toleranceFraction,
    details,
  };
}
