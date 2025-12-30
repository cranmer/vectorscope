import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { ViewportGrid } from './components/ViewportGrid';
import { GraphEditor } from './components/GraphEditor';

function App() {
  const {
    layers,
    projections,
    transformations,
    projectedPoints,
    selectedPointIds,
    viewports,
    activeView,
    isLoading,
    error,
    loadLayers,
    loadProjections,
    loadTransformations,
    createSyntheticLayer,
    createProjection,
    createTransformation,
    loadProjectionCoordinates,
    addViewport,
    removeViewport,
    setViewportProjection,
    setActiveView,
    setSelectedPoints,
    clearSelection,
  } = useAppStore();

  // Load data on mount
  useEffect(() => {
    loadLayers();
    loadProjections();
    loadTransformations();
  }, [loadLayers, loadProjections, loadTransformations]);

  const handleCreateSynthetic = async () => {
    const layer = await createSyntheticLayer({
      n_points: 1000,
      dimensionality: 30,
      n_clusters: 5,
      name: 'synthetic',
    });

    if (layer) {
      await createProjection({
        name: 'PCA',
        type: 'pca',
        layer_id: layer.id,
        dimensions: 2,
      });
    }
  };

  const handleCreateTSNE = async () => {
    const activeLayer = layers[0];
    if (!activeLayer) return;

    await createProjection({
      name: 't-SNE',
      type: 'tsne',
      layer_id: activeLayer.id,
      dimensions: 2,
    });
  };

  const handleCreateTransformation = async (
    sourceLayerId: string,
    type: 'scaling' | 'rotation',
    params: Record<string, number>
  ) => {
    await createTransformation({
      name: type,
      type,
      source_layer_id: sourceLayerId,
      parameters: type === 'scaling' ? { scale_factors: [params.scale || 1] } : params,
    });
  };

  const handleCreateProjectionFromGraph = async (layerId: string, type: 'pca' | 'tsne') => {
    await createProjection({
      name: type.toUpperCase(),
      type,
      layer_id: layerId,
      dimensions: 2,
    });
  };

  const handleAddScaling = async () => {
    const sourceLayer = layers.find((l) => !l.is_derived);
    if (!sourceLayer) return;

    await createTransformation({
      name: 'scale_2x',
      type: 'scaling',
      source_layer_id: sourceLayer.id,
      parameters: { scale_factors: [2.0] },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 20 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>VectorScope</h1>
        <p style={{ margin: '4px 0', color: '#888', fontSize: 14 }}>
          Interactive vector embedding visualization
        </p>
      </header>

      {/* View Toggle */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 16,
          background: '#16213e',
          padding: 4,
          borderRadius: 6,
          width: 'fit-content',
        }}
      >
        <button
          onClick={() => setActiveView('viewports')}
          style={{
            padding: '8px 16px',
            background: activeView === 'viewports' ? '#4a9eff' : 'transparent',
            color: activeView === 'viewports' ? 'white' : '#888',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: activeView === 'viewports' ? 600 : 400,
          }}
        >
          Viewports
        </button>
        <button
          onClick={() => setActiveView('graph')}
          style={{
            padding: '8px 16px',
            background: activeView === 'graph' ? '#4a9eff' : 'transparent',
            color: activeView === 'graph' ? 'white' : '#888',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: activeView === 'graph' ? 600 : 400,
          }}
        >
          Graph Editor
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={handleCreateSynthetic}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            background: '#4a9eff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            fontSize: 13,
          }}
        >
          {isLoading ? 'Loading...' : 'Create Synthetic Dataset'}
        </button>

        {layers.length > 0 && (
          <>
            <button
              onClick={handleCreateTSNE}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                background: '#9b59b6',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                fontSize: 13,
              }}
            >
              Add t-SNE
            </button>

            <button
              onClick={handleAddScaling}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                background: '#e67e22',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                fontSize: 13,
              }}
            >
              Add 2x Scaling
            </button>
          </>
        )}

        {selectedPointIds.size > 0 && (
          <button
            onClick={clearSelection}
            style={{
              padding: '8px 16px',
              background: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Clear Selection ({selectedPointIds.size})
          </button>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ color: '#666', fontSize: 12, alignSelf: 'center' }}>
          Layers: {layers.length} | Transforms: {transformations.length} | Projections: {projections.length} | Selected: {selectedPointIds.size}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 10,
            background: '#ff6b6b22',
            color: '#ff6b6b',
            borderRadius: 4,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          Error: {error}
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeView === 'viewports' ? (
          <ViewportGrid
            viewports={viewports}
            projections={projections}
            layers={layers}
            projectedPoints={projectedPoints}
            selectedIds={selectedPointIds}
            onSelect={setSelectedPoints}
            onAddViewport={() => addViewport()}
            onRemoveViewport={removeViewport}
            onViewportProjectionChange={setViewportProjection}
            loadProjectionCoordinates={loadProjectionCoordinates}
          />
        ) : (
          <GraphEditor
            layers={layers}
            projections={projections}
            transformations={transformations}
            onCreateTransformation={handleCreateTransformation}
            onCreateProjection={handleCreateProjectionFromGraph}
          />
        )}
      </div>
    </div>
  );
}

export default App;
