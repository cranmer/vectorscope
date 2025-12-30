export interface Layer {
  id: string;
  name: string;
  description: string | null;
  dimensionality: number;
  point_count: number;
  source_transformation_id: string | null;
  is_derived: boolean;
}

export interface Point {
  id: string;
  label: string | null;
  metadata: Record<string, unknown>;
  vector: number[];
  is_virtual: boolean;
}

export interface Projection {
  id: string;
  name: string;
  type: 'pca' | 'tsne' | 'custom_axes';
  layer_id: string;
  dimensions: number;
  parameters: Record<string, unknown>;
  random_seed: number | null;
}

export interface ProjectedPoint {
  id: string;
  label: string | null;
  metadata: Record<string, unknown>;
  coordinates: number[];
  is_virtual: boolean;
}

export interface Transformation {
  id: string;
  name: string;
  type: 'scaling' | 'rotation' | 'affine' | 'linear';
  source_layer_id: string;
  target_layer_id: string | null;
  parameters: Record<string, unknown>;
  is_invertible: boolean;
}
