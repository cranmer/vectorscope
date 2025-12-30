import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { Viewport } from './components/Viewport';

function App() {
  const {
    layers,
    projections,
    projectedPoints,
    selectedPointIds,
    activeProjectionId,
    isLoading,
    error,
    loadLayers,
    createSyntheticLayer,
    createProjection,
    setSelectedPoints,
    clearSelection,
  } = useAppStore();

  // Load layers on mount
  useEffect(() => {
    loadLayers();
  }, [loadLayers]);

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

  const activePoints = activeProjectionId ? projectedPoints[activeProjectionId] || [] : [];
  const activeProjection = projections.find((p) => p.id === activeProjectionId);
  const activeLayer = layers.find((l) => l.id === activeProjection?.layer_id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 20 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>VectorScope</h1>
        <p style={{ margin: '8px 0', color: '#888' }}>
          Interactive vector embedding visualization
        </p>
      </header>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <button
          onClick={handleCreateSynthetic}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            background: '#4a9eff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Loading...' : 'Create Synthetic Dataset'}
        </button>

        {selectedPointIds.size > 0 && (
          <button
            onClick={clearSelection}
            style={{
              padding: '10px 20px',
              background: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Clear Selection ({selectedPointIds.size})
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: 10,
            background: '#ff6b6b22',
            color: '#ff6b6b',
            borderRadius: 4,
            marginBottom: 20,
          }}
        >
          Error: {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, marginBottom: 20, color: '#888' }}>
        <span>Layers: {layers.length}</span>
        <span>Projections: {projections.length}</span>
        {activeLayer && <span>Active: {activeLayer.name} ({activeLayer.point_count} points)</span>}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {activePoints.length > 0 ? (
          <Viewport
            points={activePoints}
            selectedIds={selectedPointIds}
            onSelect={setSelectedPoints}
            title={`${activeProjection?.name || 'Projection'} - ${activeLayer?.name || 'Layer'}`}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#666',
              fontSize: 18,
            }}
          >
            Click "Create Synthetic Dataset" to start exploring
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
