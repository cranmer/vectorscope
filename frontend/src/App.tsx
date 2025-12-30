import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { ViewportGrid } from './components/ViewportGrid';

function App() {
  const {
    layers,
    projections,
    projectedPoints,
    selectedPointIds,
    viewports,
    isLoading,
    error,
    loadLayers,
    loadProjections,
    createSyntheticLayer,
    createProjection,
    loadProjectionCoordinates,
    addViewport,
    removeViewport,
    setViewportProjection,
    setSelectedPoints,
    clearSelection,
  } = useAppStore();

  // Load data on mount
  useEffect(() => {
    loadLayers();
    loadProjections();
  }, [loadLayers, loadProjections]);

  const handleCreateSynthetic = async () => {
    const layer = await createSyntheticLayer({
      n_points: 1000,
      dimensionality: 30,
      n_clusters: 5,
      name: 'synthetic',
    });

    if (layer) {
      // Create PCA projection
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 20 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>VectorScope</h1>
        <p style={{ margin: '4px 0', color: '#888', fontSize: 14 }}>
          Interactive vector embedding visualization
        </p>
      </header>

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
            Add t-SNE Projection
          </button>
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
          Layers: {layers.length} | Projections: {projections.length} | Selected: {selectedPointIds.size}
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

      {/* Viewport Grid */}
      <div style={{ flex: 1, minHeight: 0 }}>
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
      </div>
    </div>
  );
}

export default App;
