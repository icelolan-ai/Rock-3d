import * as THREE from "three";
import { exportGLB } from "./export-glb.js";
import type { PartSpec } from "./part-spec.js";

/**
 * Procedural generator for PL-02 — Payload Adapter.
 *
 * Geometry model (CONCEPTUAL): a truncated cone (frustum) connecting the
 * smaller-diameter payload interface (top) to the larger-diameter upper-stage
 * interface (base). Real payload adapters typically include a machined
 * flange, bolt-hole pattern, and internal rib structure; those are out of
 * scope for this pilot part (procedural method proof-of-pipeline only).
 *
 * Origin placement: base-center (the interface to the Upper Stage, part
 * US-01), per Build Spec §6 — the larger, structurally load-bearing
 * interface, not the bounding-box center.
 */
export function generateAdapter(spec: PartSpec): THREE.Group {
  const dims = spec.dimensions as {
    topDiameter: number;
    baseDiameter: number;
    height: number;
    unit: string;
    status: string;
  };
  const topRadius = dims.topDiameter / 2;
  const baseRadius = dims.baseDiameter / 2;

  const group = new THREE.Group();
  group.name = spec.partId;

  const material = new THREE.MeshStandardMaterial({
    color: 0x9aa0a6,
    metalness: 0.5,
    roughness: 0.5,
  });

  // CylinderGeometry's own origin is at its vertical center, so offset it
  // up by height/2 to place the group's origin at the base (bottom) face.
  const frustumGeom = new THREE.CylinderGeometry(topRadius, baseRadius, dims.height, 48, 1, true);
  const frustum = new THREE.Mesh(frustumGeom, material);
  frustum.position.y = dims.height / 2;
  frustum.name = `${spec.partId}_frustum`;
  group.add(frustum);

  // Base ring (flange proxy) — a thin disc at the base interface, marking
  // the structural attachment plane. Kept at baseRadius (not oversized) so
  // it stays within the ±2% bounding-box tolerance against baseDiameter.
  const flangeThickness = Math.min(dims.height * 0.05, 0.03);
  const flangeGeom = new THREE.CylinderGeometry(baseRadius, baseRadius, flangeThickness, 48);
  const flange = new THREE.Mesh(flangeGeom, material);
  flange.position.y = flangeThickness / 2;
  flange.name = `${spec.partId}_base_flange`;
  group.add(flange);

  return group;
}

export async function generateAdapterGLB(spec: PartSpec, outputPath: string): Promise<void> {
  const group = generateAdapter(spec);
  await exportGLB(group, outputPath);
}
