import type { Layer, Projection, ProjectedPoint, Transformation } from '../types';

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
  },

  projections: {
    list: () => fetchJson<Projection[]>('/projections'),

    get: (id: string) => fetchJson<Projection>(`/projections/${id}`),

    create: (params: {
      name: string;
      type: 'pca' | 'tsne' | 'custom_axes';
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
  },

  transformations: {
    list: () => fetchJson<Transformation[]>('/transformations'),

    get: (id: string) => fetchJson<Transformation>(`/transformations/${id}`),

    create: (params: {
      name: string;
      type: 'scaling' | 'rotation' | 'affine' | 'linear';
      source_layer_id: string;
      parameters?: Record<string, unknown>;
    }) =>
      fetchJson<Transformation>('/transformations', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  },
};
