import type { Layer, Projection, ProjectedPoint, Transformation, Scenario, Selection, CustomAxis } from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  layers: {
    list: () => fetchJson<Layer[]>('/layers'),

    get: (id: string) => fetchJson<Layer>(`/layers/${id}`),

    createSynthetic: (params: {
      n_points?: number;
      dimensionality?: number;
      n_clusters?: number;
      name?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params.n_points) searchParams.set('n_points', params.n_points.toString());
      if (params.dimensionality) searchParams.set('dimensionality', params.dimensionality.toString());
      if (params.n_clusters) searchParams.set('n_clusters', params.n_clusters.toString());
      if (params.name) searchParams.set('name', params.name);

      return fetchJson<Layer>(`/layers/synthetic?${searchParams}`, { method: 'POST' });
    },

    update: (id: string, params: { name?: string; description?: string; feature_columns?: string[]; label_column?: string | null }) =>
      fetchJson<Layer>(`/layers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(params),
      }),

    listSklearnDatasets: () =>
      fetchJson<{ id: string; name: string; description: string }[]>('/layers/sklearn-datasets'),

    loadSklearnDataset: (datasetName: string) =>
      fetchJson<Layer>(`/layers/sklearn/${datasetName}`, { method: 'POST' }),

    createBarycenter: (layerId: string, pointIds: string[], name?: string) =>
      fetchJson<{ id: string; label: string; is_virtual: boolean }>(`/layers/${layerId}/barycenter`, {
        method: 'POST',
        body: JSON.stringify({ point_ids: pointIds, name }),
      }),

    deletePoint: (layerId: string, pointId: string) =>
      fetchJson<{ status: string }>(`/layers/${layerId}/points/${pointId}`, {
        method: 'DELETE',
      }),
  },

  projections: {
    list: () => fetchJson<Projection[]>('/projections'),

    get: (id: string) => fetchJson<Projection>(`/projections/${id}`),

    create: (params: {
      name: string;
      type: 'pca' | 'tsne' | 'umap' | 'custom_axes' | 'direct' | 'density' | 'boxplot' | 'violin';
      layer_id: string;
      dimensions?: number;
      parameters?: Record<string, unknown>;
    }) =>
      fetchJson<Projection>('/projections', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    getCoordinates: (id: string) =>
      fetchJson<ProjectedPoint[]>(`/projections/${id}/coordinates`),

    update: (id: string, params: { name?: string; dimensions?: number; parameters?: Record<string, unknown> }) =>
      fetchJson<Projection>(`/projections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(params),
      }),

    delete: (id: string) =>
      fetchJson<{ status: string }>(`/projections/${id}`, {
        method: 'DELETE',
      }),
  },

  transformations: {
    list: () => fetchJson<Transformation[]>('/transformations'),

    get: (id: string) => fetchJson<Transformation>(`/transformations/${id}`),

    create: (params: {
      name: string;
      type: 'scaling' | 'rotation' | 'pca' | 'custom_affine';
      source_layer_id: string;
      parameters?: Record<string, unknown>;
    }) =>
      fetchJson<Transformation>('/transformations', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    update: (id: string, params: { name?: string; type?: string; parameters?: Record<string, unknown> }) =>
      fetchJson<Transformation>(`/transformations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(params),
      }),

    delete: (id: string) =>
      fetchJson<{ status: string }>(`/transformations/${id}`, {
        method: 'DELETE',
      }),
  },

  scenarios: {
    list: () => fetchJson<Scenario[]>('/scenarios'),

    getStatus: () =>
      fetchJson<{ state: string; message: string | null }>('/scenarios/status'),

    load: (name: string) =>
      fetchJson<{ status: string; scenario: { name: string; description: string } }>(
        `/scenarios/${name}`,
        { method: 'POST' }
      ),

    clear: () => fetchJson<{ status: string }>('/scenarios/data', { method: 'DELETE' }),

    listSaved: () =>
      fetchJson<{ filename: string; name: string; description: string }[]>('/scenarios/saved'),

    save: (name: string, description: string = '') =>
      fetchJson<{ status: string; filename: string }>(
        '/scenarios/save',
        {
          method: 'POST',
          body: JSON.stringify({ name, description }),
        }
      ),

    loadSaved: (filename: string) =>
      fetchJson<{ status: string; name: string; layers: number; transformations: number; projections: number }>(
        `/scenarios/load/${filename}`,
        { method: 'POST' }
      ),
  },

  selections: {
    list: () => fetchJson<Selection[]>('/selections'),

    get: (id: string) => fetchJson<Selection>(`/selections/${id}`),

    create: (params: { name: string; layer_id: string; point_ids: string[] }) =>
      fetchJson<Selection>('/selections', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    delete: (id: string) =>
      fetchJson<{ status: string }>(`/selections/${id}`, {
        method: 'DELETE',
      }),
  },

  customAxes: {
    list: (layerId?: string) => {
      const params = layerId ? `?layer_id=${layerId}` : '';
      return fetchJson<CustomAxis[]>(`/custom-axes${params}`);
    },

    get: (id: string) => fetchJson<CustomAxis>(`/custom-axes/${id}`),

    create: (params: { name: string; layer_id: string; point_a_id: string; point_b_id: string }) =>
      fetchJson<CustomAxis>('/custom-axes', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    delete: (id: string) =>
      fetchJson<{ status: string }>(`/custom-axes/${id}`, {
        method: 'DELETE',
      }),
  },
};
