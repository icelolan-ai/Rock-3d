import * as THREE from "three";
import { exportGLB } from "./export-glb.js";
import type { PartSpec } from "./part-spec.js";

/**
 * Procedural generator for US-02 — LOX Tank (Upper Stage).
 *
 * Geometry model (CONCEPTUAL — see Master Instructions §14 Dimension Rule):
 *   - Cylindrical barrel section
 *   - Hemispherical dome caps, top and bottom (common real-world tank-head
 *     approach; exact dome geometry for a real vehicle would be elliptical
 *     and is a Level 3+ engineering decision, not assumed here)
 *   - Dome height = radius (hemisphere), barrel height = totalHeight - 2*radius
 *
 * Origin placement: bottom-center of the tank (the primary attachment
 * point to the structure/bulkhead below), per Build Spec §6 — NOT the
 * bounding-box center. This lets Phase 8 (Assembly) position the part by
 * its real interface point.
 */
export function generateTank(spec: PartSpec): THREE.Group {
  const dims = spec.dimensions as { diameter: number; height: number; unit: string; status: string };
  const radius = dims.diameter / 2;
  const domeHeight = radius; // hemispherical dome assumption — CONCEPTUAL
  const barrelHeight = dims.height - 2 * domeHeight;

  if (barrelHeight <= 0) {
    throw new Error(
      `generateTank error for part "${spec.partId}": total height (${dims.height}${dims.unit}) is too small ` +
        `for two hemispherical domes of radius ${radius}${dims.unit}. Barrel height would be ${barrelHeight}. ` +
        `Check part-specs.json dimensions.`
    );
  }

  const group = new THREE.Group();
  group.name = spec.partId;

  const material = new THREE.MeshStandardMaterial({
    color: 0xb8bcc2,
    metalness: 0.6,
    roughness: 0.4,
  });

  // Barrel — origin of the CylinderGeometry is at its own center, so we
  // offset it upward by (domeHeight + barrelHeight/2) from the group origin
  // (which sits at the tank's bottom-center attachment point).
  const barrelGeom = new THREE.CylinderGeometry(radius, radius, barrelHeight, 48, 1, true);
  const barrel = new THREE.Mesh(barrelGeom, material);
  barrel.position.y = domeHeight + barrelHeight / 2;
  barrel.name = `${spec.partId}_barrel`;
  group.add(barrel);

  // Bottom dome — southern hemisphere (theta PI/2 -> PI spans local y in
  // [-radius, 0]), so positioning at y=domeHeight places its world span at
  // [0, domeHeight]: apex (bottom, y=0) touching the group origin, flat
  // equator face merging into the barrel at y=domeHeight. No rotation
  // needed — an earlier version rotated this 180° about X, which flips the
  // hemisphere's local y range and pushes the whole dome upward into the
  // barrel instead of below it (caught by bounding-box validation: it
  // shrank the part's total height from 3.5m to 2.25m).
  const bottomDomeGeom = new THREE.SphereGeometry(radius, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const bottomDome = new THREE.Mesh(bottomDomeGeom, material);
  bottomDome.position.y = domeHeight;
  bottomDome.name = `${spec.partId}_dome_bottom`;
  group.add(bottomDome);

  // Top dome — upper hemisphere, flat side down.
  const topDomeGeom = new THREE.SphereGeometry(radius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const topDome = new THREE.Mesh(topDomeGeom, material);
  topDome.position.y = domeHeight + barrelHeight;
  topDome.name = `${spec.partId}_dome_top`;
  group.add(topDome);

  return group;
}

export async function generateTankGLB(spec: PartSpec, outputPath: string): Promise<void> {
  const group = generateTank(spec);
  await exportGLB(group, outputPath);
}
