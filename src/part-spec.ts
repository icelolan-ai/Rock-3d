export interface PartSpec {
  partId: string;
  partName: string;
  category: string;
  function: string;
  dimensions: Record<string, number | string>;
  material: string;
  method: "procedural" | "ai3d" | "code" | "hybrid";
  parentAssembly: string;
  connectedParts: string[];
}
