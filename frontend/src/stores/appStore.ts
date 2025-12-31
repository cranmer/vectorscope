import { create } from 'zustand';
import type { Layer, Projection, ProjectedPoint, Transformation, Scenario } from '../types';
import { api } from '../api/client';

export interface ViewportConfig {
  id: string;
  projectionId: string | null;
}

export interface ViewSet {
  name: string;
  viewportProjectionIds: string[];
}

interface SavedSession {
  filename: string;
  name: string;
  description: string;
}

interface CurrentSession {
  name: string;
  filename: string;
}

interface AppState {
  // Data
  layers: Layer[];
  projections: Projection[];
  transformations: Transformation[];
  projectedPoints: Record<string, ProjectedPoint[]>;
  scenarios: Scenario[];
  savedSessions: SavedSession[];
  currentSession: CurrentSession | null;

  // Selection (shared across all viewports)
  selectedPointIds: Set<string>;

  // Viewports
  viewports: ViewportConfig[];
  nextViewportId: number;
  viewSets: ViewSet[];

  // UI state
  activeLayerId: string | null;
  activeView: 'viewports' | 'graph' | 'view-editor';
  activeViewEditorProjectionId: string | null;
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
  loadSklearnDataset: (datasetName: string) => Promise<Layer | null>;
  createProjection: (params: {
    name: string;
    type: 'pca' | 'tsne' | 'umap' | 'custom_axes' | 'direct' | 'histogram' | 'boxplot';
    layer_id: string;
    dimensions?: number;
    parameters?: Record<string, unknown>;
  }) => Promise<Projection | null>;
  createTransformation: (params: {
    name: string;
    type: 'scaling' | 'rotation' | 'affine' | 'linear';
    source_layer_id: string;
    parameters?: Record<string, unknown>;
  }) => Promise<Transformation | null>;
  updateTransformation: (id: string, updates: { name?: string; type?: string; parameters?: Record<string, unknown> }) => Promise<Transformation | null>;
  updateLayer: (id: string, updates: { name?: string; feature_columns?: string[]; label_column?: string | null }) => Promise<Layer | null>;
  updateProjection: (id: string, updates: { name?: string; parameters?: Record<string, unknown> }) => Promise<Projection | null>;
  deleteProjection: (id: string) => Promise<void>;
  loadProjectionCoordinates: (projectionId: string) => Promise<void>;
  setActiveLayer: (layerId: string | null) => void;
  setActiveView: (view: 'viewports' | 'graph' | 'view-editor') => void;
  setActiveViewEditorProjection: (projectionId: string | null) => void;
  openViewEditor: (projectionId: string) => void;

  // Viewport actions
  addViewport: (projectionId?: string | null) => void;
  removeViewport: (viewportId: string) => void;
  clearViewports: () => void;
  setViewportProjection: (viewportId: string, projectionId: string | null) => void;
  setViewportsForLayer: (layerId: string) => Promise<void>;

  // View set actions
  saveViewSet: (name: string) => void;
  loadViewSet: (viewSet: ViewSet) => Promise<void>;
  deleteViewSet: (name: string) => void;

  // Selection actions
  togglePointSelection: (pointId: string) => void;
  setSelectedPoints: (pointIds: string[]) => void;
  clearSelection: () => void;

  // Scenario actions
  loadScenarios: () => Promise<void>;
  loadScenario: (name: string) => Promise<void>;

  // Session actions
  newSession: () => Promise<void>;
  loadSavedSessions: () => Promise<void>;
  saveSession: (name: string, description?: string) => Promise<void>;
  saveCurrentSession: () => Promise<void>;
  loadSavedSession: (filename: string) => Promise<void>;
  setCurrentSession: (session: CurrentSession | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  layers: [],
  projections: [],
  transformations: [],
  projectedPoints: {},
  scenarios: [],
  savedSessions: [],
  currentSession: null,
  selectedPointIds: new Set(),
  viewports: [{ id: 'viewport-1', projectionId: null }],
  nextViewportId: 2,
  viewSets: [],
  activeLayerId: null,
  activeView: 'graph',
  activeViewEditorProjectionId: null,
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

  loadSklearnDataset: async (datasetName) => {
    set({ isLoading: true, error: null });
    try {
      const layer = await api.layers.loadSklearnDataset(datasetName);
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
      // Check if this should be marked as temporary
      const isTemporary = params.parameters?.temporary === true;
      const projectionWithFlag = isTemporary ? { ...projection, temporary: true } : projection;

      set((state) => {
        // Update first viewport without a projection to use this one (skip for temporary)
        const viewports = isTemporary
          ? state.viewports
          : state.viewports.map((v, i) =>
              i === 0 && !v.projectionId ? { ...v, projectionId: projection.id } : v
            );
        return {
          projections: [...state.projections, projectionWithFlag],
          viewports,
          isLoading: false,
        };
      });
      // Load coordinates immediately
      await get().loadProjectionCoordinates(projection.id);
      return projectionWithFlag;
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

  updateTransformation: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const transformation = await api.transformations.update(id, updates);
      // Reload all data if type or parameters changed (chain propagation may update many things)
      if (updates.type || updates.parameters) {
        await get().loadLayers();
        await get().loadTransformations();
        await get().loadProjections();
        // Clear projection cache since layer data changed
        set({ projectedPoints: {}, isLoading: false });
      } else {
        // Just update the transformation name
        set((state) => ({
          transformations: state.transformations.map((t) =>
            t.id === id ? transformation : t
          ),
          isLoading: false,
        }));
      }
      return transformation;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      return null;
    }
  },

  updateLayer: async (id, updates) => {
    try {
      const layer = await api.layers.update(id, updates);
      set((state) => ({
        layers: state.layers.map((l) => (l.id === id ? layer : l)),
      }));
      return layer;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  updateProjection: async (id, updates) => {
    try {
      const projection = await api.projections.update(id, updates);

      // Update projection metadata immediately
      set((state) => ({
        projections: state.projections.map((p) => (p.id === id ? projection : p)),
      }));

      // If parameters changed, reload coordinates (keep old ones visible until new ones ready)
      if (updates.parameters) {
        // Fetch new coordinates, then replace atomically (no clearing first)
        const coordinates = await api.projections.getCoordinates(id);
        set((state) => ({
          projectedPoints: {
            ...state.projectedPoints,
            [id]: coordinates,
          },
        }));
      }

      return projection;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  deleteProjection: async (id) => {
    try {
      await api.projections.delete(id);
      set((state) => {
        // Remove projection
        const projections = state.projections.filter((p) => p.id !== id);
        // Remove from projectedPoints
        const { [id]: _, ...projectedPoints } = state.projectedPoints;
        // Clear any viewports using this projection
        const viewports = state.viewports.map((v) =>
          v.projectionId === id ? { ...v, projectionId: null } : v
        );
        // Clear view editor if it was showing this projection
        const activeViewEditorProjectionId =
          state.activeViewEditorProjectionId === id ? null : state.activeViewEditorProjectionId;
        return { projections, projectedPoints, viewports, activeViewEditorProjectionId };
      });
    } catch (e) {
      set({ error: (e as Error).message });
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
  setActiveViewEditorProjection: (projectionId) => set({ activeViewEditorProjectionId: projectionId }),
  openViewEditor: (projectionId) => {
    set({ activeView: 'view-editor', activeViewEditorProjectionId: projectionId });
    // Load coordinates if not already loaded
    const state = get();
    if (!state.projectedPoints[projectionId]) {
      get().loadProjectionCoordinates(projectionId);
    }
  },

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

  clearViewports: () =>
    set({ viewports: [] }),

  setViewportProjection: (viewportId, projectionId) =>
    set((state) => ({
      viewports: state.viewports.map((v) =>
        v.id === viewportId ? { ...v, projectionId } : v
      ),
    })),

  setViewportsForLayer: async (layerId) => {
    const state = get();
    // Find all projections for this layer
    const layerProjections = state.projections.filter((p) => p.layer_id === layerId);
    if (layerProjections.length === 0) return;

    // Create viewports for each projection
    const newViewports: ViewportConfig[] = layerProjections.map((p, i) => ({
      id: `viewport-${state.nextViewportId + i}`,
      projectionId: p.id,
    }));

    set({
      viewports: newViewports,
      nextViewportId: state.nextViewportId + layerProjections.length,
    });

    // Load coordinates for all projections that aren't already loaded
    const loadPromises = layerProjections
      .filter((p) => !state.projectedPoints[p.id])
      .map((p) => get().loadProjectionCoordinates(p.id));

    await Promise.all(loadPromises);
  },

  // View set actions
  saveViewSet: (name) =>
    set((state) => {
      const viewportProjectionIds = state.viewports
        .filter((v) => v.projectionId)
        .map((v) => v.projectionId as string);

      if (viewportProjectionIds.length === 0) return state;

      // Check if name already exists, replace if so
      const existingIndex = state.viewSets.findIndex((vs) => vs.name === name);
      const newViewSet: ViewSet = { name, viewportProjectionIds };

      if (existingIndex >= 0) {
        const newViewSets = [...state.viewSets];
        newViewSets[existingIndex] = newViewSet;
        return { viewSets: newViewSets };
      }

      return { viewSets: [...state.viewSets, newViewSet] };
    }),

  loadViewSet: async (viewSet) => {
    const state = get();
    const newViewports: ViewportConfig[] = viewSet.viewportProjectionIds.map((projId, i) => ({
      id: `viewport-${state.nextViewportId + i}`,
      projectionId: projId,
    }));

    set({
      viewports: newViewports,
      nextViewportId: state.nextViewportId + viewSet.viewportProjectionIds.length,
    });

    // Load coordinates for all projections that aren't already loaded
    const loadPromises = viewSet.viewportProjectionIds
      .filter((projId) => !state.projectedPoints[projId])
      .map((projId) => get().loadProjectionCoordinates(projId));

    await Promise.all(loadPromises);
  },

  deleteViewSet: (name) =>
    set((state) => ({
      viewSets: state.viewSets.filter((vs) => vs.name !== name),
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

  // Scenario actions
  loadScenarios: async () => {
    try {
      const scenarios = await api.scenarios.list();
      set({ scenarios });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  loadScenario: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.scenarios.load(name);
      // Reload all data after loading scenario
      await get().loadLayers();
      await get().loadProjections();
      await get().loadTransformations();
      // Clear selection and projection cache
      set({
        selectedPointIds: new Set(),
        projectedPoints: {},
        isLoading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  // Session actions
  newSession: async () => {
    set({ isLoading: true, error: null });
    try {
      await api.scenarios.clear();
      set({
        layers: [],
        projections: [],
        transformations: [],
        projectedPoints: {},
        selectedPointIds: new Set(),
        currentSession: null,
        isLoading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  loadSavedSessions: async () => {
    try {
      const savedSessions = await api.scenarios.listSaved();
      set({ savedSessions });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  saveSession: async (name: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.scenarios.save(name, description || '');
      // Refresh the list of saved sessions
      await get().loadSavedSessions();
      // Update current session to track this file
      set({
        currentSession: { name, filename: result.filename },
        isLoading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  saveCurrentSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({ isLoading: true, error: null });
    try {
      await api.scenarios.save(currentSession.name, '');
      await get().loadSavedSessions();
      set({ isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  loadSavedSession: async (filename: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.scenarios.loadSaved(filename);
      // Reload all data
      await get().loadLayers();
      await get().loadProjections();
      await get().loadTransformations();
      set({
        selectedPointIds: new Set(),
        projectedPoints: {},
        currentSession: { name: result.name, filename },
        isLoading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  setCurrentSession: (session) => set({ currentSession: session }),
}));
