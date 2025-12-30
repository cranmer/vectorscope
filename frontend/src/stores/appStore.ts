import { create } from 'zustand';
import type { Layer, Projection, ProjectedPoint, Transformation } from '../types';
import { api } from '../api/client';

export interface ViewportConfig {
  id: string;
  projectionId: string | null;
}

interface AppState {
  // Data
  layers: Layer[];
  projections: Projection[];
  transformations: Transformation[];
  projectedPoints: Record<string, ProjectedPoint[]>;

  // Selection (shared across all viewports)
  selectedPointIds: Set<string>;

  // Viewports
  viewports: ViewportConfig[];
  nextViewportId: number;

  // UI state
  activeLayerId: string | null;
  activeView: 'viewports' | 'graph';
  isLoading: boolean;
  error: string | null;

  // Actions
  loadLayers: () => Promise<void>;
  loadProjections: () => Promise<void>;
  loadTransformations: () => Promise<void>;
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
  createTransformation: (params: {
    name: string;
    type: 'scaling' | 'rotation' | 'affine' | 'linear';
    source_layer_id: string;
    parameters?: Record<string, unknown>;
  }) => Promise<Transformation | null>;
  loadProjectionCoordinates: (projectionId: string) => Promise<void>;
  setActiveLayer: (layerId: string | null) => void;
  setActiveView: (view: 'viewports' | 'graph') => void;

  // Viewport actions
  addViewport: (projectionId?: string | null) => void;
  removeViewport: (viewportId: string) => void;
  setViewportProjection: (viewportId: string, projectionId: string | null) => void;

  // Selection actions
  togglePointSelection: (pointId: string) => void;
  setSelectedPoints: (pointIds: string[]) => void;
  clearSelection: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  layers: [],
  projections: [],
  transformations: [],
  projectedPoints: {},
  selectedPointIds: new Set(),
  viewports: [{ id: 'viewport-1', projectionId: null }],
  nextViewportId: 2,
  activeLayerId: null,
  activeView: 'viewports',
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

  loadProjections: async () => {
    try {
      const projections = await api.projections.list();
      set({ projections });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  loadTransformations: async () => {
    try {
      const transformations = await api.transformations.list();
      set({ transformations });
    } catch (e) {
      set({ error: (e as Error).message });
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
      set((state) => {
        // Update first viewport without a projection to use this one
        const viewports = state.viewports.map((v, i) =>
          i === 0 && !v.projectionId ? { ...v, projectionId: projection.id } : v
        );
        return {
          projections: [...state.projections, projection],
          viewports,
          isLoading: false,
        };
      });
      // Load coordinates immediately
      await get().loadProjectionCoordinates(projection.id);
      return projection;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      return null;
    }
  },

  createTransformation: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const transformation = await api.transformations.create(params);
      // Reload layers to get the new derived layer
      await get().loadLayers();
      set((state) => ({
        transformations: [...state.transformations, transformation],
        isLoading: false,
      }));
      return transformation;
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
  setActiveView: (view) => set({ activeView: view }),

  // Viewport actions
  addViewport: (projectionId = null) =>
    set((state) => ({
      viewports: [
        ...state.viewports,
        { id: `viewport-${state.nextViewportId}`, projectionId },
      ],
      nextViewportId: state.nextViewportId + 1,
    })),

  removeViewport: (viewportId) =>
    set((state) => ({
      viewports: state.viewports.filter((v) => v.id !== viewportId),
    })),

  setViewportProjection: (viewportId, projectionId) =>
    set((state) => ({
      viewports: state.viewports.map((v) =>
        v.id === viewportId ? { ...v, projectionId } : v
      ),
    })),

  // Selection actions
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
