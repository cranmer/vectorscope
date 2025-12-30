import { create } from 'zustand';
import type { Layer, Projection, ProjectedPoint } from '../types';
import { api } from '../api/client';

interface AppState {
  // Data
  layers: Layer[];
  projections: Projection[];
  projectedPoints: Record<string, ProjectedPoint[]>;

  // Selection
  selectedPointIds: Set<string>;

  // UI state
  activeLayerId: string | null;
  activeProjectionId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadLayers: () => Promise<void>;
  createSyntheticLayer: (params?: {
    n_points?: number;
    dimensionality?: number;
    n_clusters?: number;
    name?: string;
  }) => Promise<Layer | null>;
  createProjection: (params: {
    name: string;
    type: 'pca' | 'tsne' | 'custom_axes';
    layer_id: string;
    dimensions?: number;
  }) => Promise<Projection | null>;
  loadProjectionCoordinates: (projectionId: string) => Promise<void>;
  setActiveLayer: (layerId: string | null) => void;
  setActiveProjection: (projectionId: string | null) => void;
  togglePointSelection: (pointId: string) => void;
  setSelectedPoints: (pointIds: string[]) => void;
  clearSelection: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  layers: [],
  projections: [],
  projectedPoints: {},
  selectedPointIds: new Set(),
  activeLayerId: null,
  activeProjectionId: null,
  isLoading: false,
  error: null,

  // Actions
  loadLayers: async () => {
    set({ isLoading: true, error: null });
    try {
      const layers = await api.layers.list();
      set({ layers, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  createSyntheticLayer: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const layer = await api.layers.createSynthetic(params || {});
      set((state) => ({
        layers: [...state.layers, layer],
        activeLayerId: layer.id,
        isLoading: false,
      }));
      return layer;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      return null;
    }
  },

  createProjection: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const projection = await api.projections.create(params);
      set((state) => ({
        projections: [...state.projections, projection],
        activeProjectionId: projection.id,
        isLoading: false,
      }));
      // Load coordinates immediately
      await get().loadProjectionCoordinates(projection.id);
      return projection;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      return null;
    }
  },

  loadProjectionCoordinates: async (projectionId: string) => {
    try {
      const coordinates = await api.projections.getCoordinates(projectionId);
      set((state) => ({
        projectedPoints: {
          ...state.projectedPoints,
          [projectionId]: coordinates,
        },
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  setActiveLayer: (layerId) => set({ activeLayerId: layerId }),
  setActiveProjection: (projectionId) => set({ activeProjectionId: projectionId }),

  togglePointSelection: (pointId) =>
    set((state) => {
      const newSelection = new Set(state.selectedPointIds);
      if (newSelection.has(pointId)) {
        newSelection.delete(pointId);
      } else {
        newSelection.add(pointId);
      }
      return { selectedPointIds: newSelection };
    }),

  setSelectedPoints: (pointIds) => set({ selectedPointIds: new Set(pointIds) }),

  clearSelection: () => set({ selectedPointIds: new Set() }),
}));
