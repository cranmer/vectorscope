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
  type: 'pca' | 'tsne' | 'umap' | 'custom_axes' | 'direct' | 'density' | 'boxplot' | 'violin';
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
  type: 'scaling' | 'rotation' | 'pca';
  source_layer_id: string;
  target_layer_id: string | null;
  parameters: Record<string, unknown>;
  is_invertible: boolean;
}

export interface Scenario {
  name: string;
  description: string;
}

export interface Selection {
  id: string;
  name: string;
  layer_id: string;
  point_ids: string[];
  point_count: number;
}

export interface CustomAxis {
  id: string;
  name: string;
  layer_id: string;
  point_a_id: string;
  point_b_id: string;
  vector: number[];
}
