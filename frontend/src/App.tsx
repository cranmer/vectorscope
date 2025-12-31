import { useEffect, useState } from 'react';
import { useAppStore } from './stores/appStore';
import { ViewportGrid } from './components/ViewportGrid';
import { GraphEditor } from './components/GraphEditor';
import { ConfigPanel } from './components/ConfigPanel';

function App() {
  const {
    layers,
    projections,
    transformations,
    projectedPoints,
    selectedPointIds,
    viewports,
    viewSets,
    activeView,
    isLoading,
    error,
    scenarios,
    savedSessions,
    loadLayers,
    loadProjections,
    loadTransformations,
    loadScenarios,
    loadScenario,
    createSyntheticLayer,
    createProjection,
    updateTransformation,
    updateLayer,
    updateProjection,
    loadProjectionCoordinates,
    addViewport,
    removeViewport,
    setViewportProjection,
    setViewportsForLayer,
    saveViewSet,
    loadViewSet,
    deleteViewSet,
    setActiveView,
    setSelectedPoints,
    clearSelection,
    newSession,
    loadSavedSessions,
    saveSession,
    loadSavedSession,
  } = useAppStore();

  // Graph editor selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<'layer' | 'transformation' | 'projection' | null>(null);

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Load data on mount
  useEffect(() => {
    loadLayers();
    loadProjections();
    loadTransformations();
    loadScenarios();
    loadSavedSessions();
  }, [loadLayers, loadProjections, loadTransformations, loadScenarios, loadSavedSessions]);

  const handleNewSession = async () => {
    if (layers.length > 0 && !confirm('Clear all data and start a new session?')) {
      return;
    }
    await newSession();
    setSelectedNodeId(null);
    setSelectedNodeType(null);
  };

  const handleSaveSession = async () => {
    if (saveName.trim()) {
      await saveSession(saveName.trim());
      setShowSaveDialog(false);
      setSaveName('');
    }
  };

  const handleLoadSavedSession = async (filename: string) => {
    await loadSavedSession(filename);
    setSelectedNodeId(null);
    setSelectedNodeType(null);
  };

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

  const handleSelectNode = (nodeId: string | null, nodeType: 'layer' | 'transformation' | 'projection') => {
    setSelectedNodeId(nodeId);
    setSelectedNodeType(nodeId ? nodeType : null);
  };

  const handleAddView = async (layerId: string, type: 'pca' | 'tsne', name: string) => {
    await createProjection({
      name,
      type,
      layer_id: layerId,
      dimensions: 2,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 20 }}>
      <header style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/logo.svg" alt="VectorScope" style={{ height: 48 }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>
            <span style={{ color: '#fff' }}>Vector</span>
            <span style={{ color: '#2cc7c8' }}>Scope</span>
          </h1>
          <p style={{ margin: '2px 0 0', color: '#888', fontSize: 13 }}>
            Interactive vector embedding visualization
          </p>
        </div>
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
        {/* Session management */}
        <button
          onClick={handleNewSession}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            background: '#3a3a5e',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: isLoading ? 'wait' : 'pointer',
            fontSize: 13,
          }}
        >
          New Session
        </button>

        {layers.length > 0 && (
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              background: '#2d5a27',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: isLoading ? 'wait' : 'pointer',
              fontSize: 13,
            }}
          >
            Save
          </button>
        )}

        {savedSessions.length > 0 && (
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleLoadSavedSession(e.target.value);
              }
            }}
            disabled={isLoading}
            value=""
            style={{
              padding: '8px 12px',
              background: '#1a1a2e',
              color: '#aaa',
              border: '1px solid #3a3a5e',
              borderRadius: 4,
              cursor: isLoading ? 'wait' : 'pointer',
              fontSize: 13,
            }}
          >
            <option value="">Open Saved...</option>
            {savedSessions.map((s) => (
              <option key={s.filename} value={s.filename}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <div style={{ width: 1, background: '#3a3a5e', margin: '0 4px' }} />

        {/* Scenario selector */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              loadScenario(e.target.value);
              setSelectedNodeId(null);
              setSelectedNodeType(null);
            }
          }}
          disabled={isLoading}
          value=""
          style={{
            padding: '8px 12px',
            background: '#1a1a2e',
            color: '#aaa',
            border: '1px solid #3a3a5e',
            borderRadius: 4,
            cursor: isLoading ? 'wait' : 'pointer',
            fontSize: 13,
          }}
        >
          <option value="">Load Scenario...</option>
          {scenarios.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Only show create button if no source layers exist */}
        {!layers.some(l => !l.is_derived) && (
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
          Layers: {layers.length} | Transforms: {transformations.length} | Views: {projections.length}
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
            viewSets={viewSets}
            onSelect={setSelectedPoints}
            onAddViewport={() => addViewport()}
            onRemoveViewport={removeViewport}
            onViewportProjectionChange={setViewportProjection}
            loadProjectionCoordinates={loadProjectionCoordinates}
            onSetViewportsForLayer={setViewportsForLayer}
            onSaveViewSet={saveViewSet}
            onLoadViewSet={loadViewSet}
            onDeleteViewSet={deleteViewSet}
          />
        ) : (
          <div style={{ display: 'flex', gap: 16, height: '100%' }}>
            {/* Graph */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <GraphEditor
                layers={layers}
                projections={projections}
                transformations={transformations}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
              />
            </div>

            {/* Config Panel */}
            <ConfigPanel
              selectedNodeId={selectedNodeId}
              selectedNodeType={selectedNodeType}
              layers={layers}
              projections={projections}
              transformations={transformations}
              onAddView={handleAddView}
              onUpdateTransformation={updateTransformation}
              onUpdateLayer={updateLayer}
              onUpdateProjection={updateProjection}
            />
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            style={{
              background: '#16213e',
              padding: 24,
              borderRadius: 8,
              minWidth: 300,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', color: '#fff' }}>Save Session</h3>
            <input
              type="text"
              placeholder="Session name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSession()}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#1a1a2e',
                border: '1px solid #3a3a5e',
                borderRadius: 4,
                color: '#fff',
                fontSize: 14,
                marginBottom: 16,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  padding: '8px 16px',
                  background: '#3a3a5e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSession}
                disabled={!saveName.trim()}
                style={{
                  padding: '8px 16px',
                  background: saveName.trim() ? '#4a9eff' : '#3a3a5e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: saveName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 13,
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
