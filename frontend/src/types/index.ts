export interface Layer {
  id: string;
  name: string;
  description: string | null;
  dimensionality: number;
  point_count: number;
  source_transformation_id: string | null;
  is_derived: boolean;
  // Column configuration for tabular data (CSV)
  column_names: string[] | null;
  feature_columns: string[] | null;
  label_column: string | null;
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
  type: 'pca' | 'tsne' | 'custom_axes' | 'direct' | 'histogram' | 'boxplot';
  layer_id: string;
  dimensions: number;
  parameters: Record<string, unknown>;
  random_seed: number | null;
  temporary?: boolean;  // If true, not shown in views list/graph editor
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

export interface Scenario {
  name: string;
  description: string;
}
