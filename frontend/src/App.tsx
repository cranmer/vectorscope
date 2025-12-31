import { useEffect, useState, useRef } from 'react';
import { useAppStore } from './stores/appStore';
import { ViewportGrid } from './components/ViewportGrid';
import { GraphEditor } from './components/GraphEditor';
import { ConfigPanel } from './components/ConfigPanel';
import { Viewport } from './components/Viewport';
import { api } from './api/client';

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
    createTransformation,
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
    activeViewEditorProjectionId,
    setActiveViewEditorProjection,
    openViewEditor,
  } = useAppStore();

  // Graph editor selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<'layer' | 'transformation' | 'projection' | null>(null);

  // Dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Status polling
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const statusPollRef = useRef<number | null>(null);

  // File input ref for native file picker
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View Editor parameter state
  const [pcaComponentX, setPcaComponentX] = useState(0);
  const [pcaComponentY, setPcaComponentY] = useState(1);
  const [tsnePerplexity, setTsnePerplexity] = useState(30);
  const [tsneIterations, setTsneIterations] = useState(1000);

  // Load data on mount
  useEffect(() => {
    loadLayers();
    loadProjections();
    loadTransformations();
    loadScenarios();
    loadSavedSessions();
  }, [loadLayers, loadProjections, loadTransformations, loadScenarios, loadSavedSessions]);

  // Poll status when loading
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const status = await api.scenarios.getStatus();
        if (status.state !== 'idle') {
          setStatusMessage(status.message || status.state);
        } else {
          setStatusMessage(null);
        }
      } catch {
        // Ignore errors during polling
      }
    };

    if (isLoading) {
      pollStatus();
      statusPollRef.current = window.setInterval(pollStatus, 300);
    } else {
      setStatusMessage(null);
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
        statusPollRef.current = null;
      }
    }

    return () => {
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
      }
    };
  }, [isLoading]);

  // Sync local parameter state when active projection changes
  useEffect(() => {
    if (activeViewEditorProjectionId) {
      const projection = projections.find((p) => p.id === activeViewEditorProjectionId);
      if (projection) {
        const params = projection.parameters || {};
        if (projection.type === 'pca') {
          const components = params.components as number[] | undefined;
          setPcaComponentX(components?.[0] ?? 0);
          setPcaComponentY(components?.[1] ?? 1);
        } else if (projection.type === 'tsne') {
          setTsnePerplexity((params.perplexity as number) ?? 30);
          setTsneIterations((params.n_iter as number) ?? 1000);
        }
      }
    }
  }, [activeViewEditorProjectionId, projections]);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Find config and data files
    let configFile: File | null = null;
    let dataFile: File | null = null;

    for (const file of Array.from(files)) {
      if (file.name.endsWith('_config.json') || file.name.endsWith('.json')) {
        configFile = file;
      } else if (file.name.endsWith('_data.npz') || file.name.endsWith('.npz')) {
        dataFile = file;
      }
    }

    if (!configFile) {
      alert('Please select a config JSON file (*_config.json)');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('config', configFile);
      if (dataFile) {
        formData.append('data', dataFile);
      }

      const response = await fetch('/api/scenarios/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Reload all data
      await loadLayers();
      await loadProjections();
      await loadTransformations();
      setSelectedNodeId(null);
      setSelectedNodeType(null);
    } catch (e) {
      alert(`Failed to load file: ${(e as Error).message}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const handleAddTransformation = async (sourceLayerId: string, type: 'scaling' | 'rotation', name: string) => {
    await createTransformation({
      name,
      type,
      source_layer_id: sourceLayerId,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 20 }}>
      <header style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Logo + Title - fixed width for centering balance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 240 }}>
          <img src="/logo.svg" alt="VectorScope" style={{ height: 48 }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontStyle: 'italic' }}>
              <span style={{ color: '#fff' }}>Vector</span>
              <span style={{ color: '#2cc7c8' }}>Scope</span>
            </h1>
            <p style={{ margin: '2px 0 0', color: '#888', fontSize: 13 }}>
              Interactive vector embedding visualization
            </p>
          </div>
        </div>

        {/* View Toggle - centered */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              gap: 4,
              background: '#16213e',
              padding: 4,
              borderRadius: 6,
            }}
          >
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
            <button
              onClick={() => setActiveView('view-editor')}
              style={{
                padding: '8px 16px',
                background: activeView === 'view-editor' ? '#4a9eff' : 'transparent',
                color: activeView === 'view-editor' ? 'white' : '#888',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeView === 'view-editor' ? 600 : 400,
              }}
            >
              View Editor
            </button>
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
          </div>
        </div>

        {/* Spacer to balance logo for true centering */}
        <div style={{ minWidth: 240 }} />
      </header>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* File controls */}
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
          New
        </button>

        <button
          onClick={() => setShowOpenDialog(true)}
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
          Open
        </button>

        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={isLoading || layers.length === 0}
          style={{
            padding: '8px 16px',
            background: layers.length > 0 ? '#3a3a5e' : '#2a2a3e',
            color: layers.length > 0 ? '#fff' : '#666',
            border: 'none',
            borderRadius: 4,
            cursor: layers.length > 0 && !isLoading ? 'pointer' : 'not-allowed',
            fontSize: 13,
          }}
        >
          Save
        </button>

        {/* Hidden file input for native file picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.npz"
          multiple
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        {/* Show data controls when no data loaded */}
        {layers.length === 0 && (
          <>
            <div style={{ width: 1, height: 24, background: '#3a3a5e', margin: '0 8px' }} />
            <button
              onClick={() => fileInputRef.current?.click()}
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
              Load Data
            </button>
            <button
              onClick={() => setShowOpenDialog(true)}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                background: '#3a3a5e',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                fontSize: 13,
              }}
            >
              Load Scenario
            </button>
            <button
              onClick={handleCreateSynthetic}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                background: '#3a3a5e',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                fontSize: 13,
              }}
            >
              {isLoading ? 'Loading...' : 'Create Synthetic'}
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

        {/* Status indicator */}
        {(isLoading || statusMessage) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: '#2d4a7c',
              borderRadius: 4,
              fontSize: 12,
              color: '#88bbff',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#4a9eff',
                animation: 'pulse 1s ease-in-out infinite',
              }}
            />
            <style>
              {`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}
            </style>
            {statusMessage || 'Loading...'}
          </div>
        )}

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
        {activeView === 'viewports' && (
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
        )}

        {activeView === 'graph' && (
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
              onAddTransformation={handleAddTransformation}
              onUpdateTransformation={updateTransformation}
              onUpdateLayer={updateLayer}
              onUpdateProjection={updateProjection}
              onOpenViewEditor={openViewEditor}
            />
          </div>
        )}

        {activeView === 'view-editor' && (
          <div style={{ display: 'flex', gap: 16, height: '100%' }}>
            {/* Viewport */}
            <div style={{ flex: 1, minWidth: 0, background: '#1e1e3f', borderRadius: 8, overflow: 'hidden' }}>
              {activeViewEditorProjectionId && projectedPoints[activeViewEditorProjectionId] ? (
                <Viewport
                  points={projectedPoints[activeViewEditorProjectionId]}
                  selectedIds={selectedPointIds}
                  onSelect={setSelectedPoints}
                />
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#666',
                  gap: 20,
                }}>
                  <img src="/logo.svg" alt="VectorScope" style={{ height: 80, opacity: 0.5 }} />
                  <div style={{ textAlign: 'center', fontSize: 14 }}>
                    {projections.length === 0 ? (
                      <>No views available.<br />Load data, load scenario, or create a synthetic dataset.</>
                    ) : (
                      'Select a view to display'
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* View Editor Config Panel */}
            <div style={{
              width: 280,
              background: '#16213e',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              <h3 style={{ margin: 0, fontSize: 14, color: '#888', textTransform: 'uppercase' }}>
                View Editor
              </h3>

              {/* View Selector */}
              <div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>SELECT VIEW</div>
                <select
                  value={activeViewEditorProjectionId || ''}
                  onChange={(e) => {
                    const projId = e.target.value;
                    if (projId) {
                      setActiveViewEditorProjection(projId);
                      if (!projectedPoints[projId]) {
                        loadProjectionCoordinates(projId);
                      }
                    } else {
                      setActiveViewEditorProjection(null);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#1a1a2e',
                    border: '1px solid #3a3a5e',
                    borderRadius: 4,
                    color: '#eaeaea',
                    fontSize: 12,
                  }}
                >
                  <option value="">Select a view...</option>
                  {projections.map((p) => {
                    const layer = layers.find((l) => l.id === p.layer_id);
                    return (
                      <option key={p.id} value={p.id}>
                        {layer?.name || 'unknown'}: {p.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* View Configuration */}
              {activeViewEditorProjectionId && (() => {
                const projection = projections.find((p) => p.id === activeViewEditorProjectionId);
                const layer = layers.find((l) => l.id === projection?.layer_id);
                if (!projection) return null;

                const colors: Record<string, string> = {
                  pca: '#4a9eff',
                  tsne: '#9b59b6',
                  custom_axes: '#e67e22',
                };
                const color = colors[projection.type] || '#666';

                return (
                  <>
                    <div style={{
                      padding: '8px 12px',
                      background: '#1a1a2e',
                      borderRadius: 6,
                      borderLeft: `3px solid ${color}`,
                    }}>
                      <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                        {projection.name}
                      </div>
                      <div style={{ fontSize: 11, color, textTransform: 'uppercase' }}>
                        {projection.type}
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#aaa' }}>
                      <div><strong>Layer:</strong> {layer?.name || 'unknown'}</div>
                      <div><strong>Dimensions:</strong> {projection.dimensions}</div>
                      {projection.random_seed && (
                        <div><strong>Seed:</strong> {projection.random_seed}</div>
                      )}
                    </div>

                    {/* PCA Configuration */}
                    {projection.type === 'pca' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
                          Component Selection
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <label style={{ fontSize: 12, color: '#aaa', width: 50 }}>X Axis:</label>
                          <select
                            value={pcaComponentX}
                            onChange={(e) => setPcaComponentX(parseInt(e.target.value))}
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              background: '#1a1a2e',
                              border: '1px solid #3a3a5e',
                              borderRadius: 4,
                              color: '#eaeaea',
                              fontSize: 12,
                            }}
                          >
                            {Array.from({ length: Math.min(layer?.dimensionality || 10, 20) }, (_, i) => (
                              <option key={i} value={i}>PC{i + 1}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <label style={{ fontSize: 12, color: '#aaa', width: 50 }}>Y Axis:</label>
                          <select
                            value={pcaComponentY}
                            onChange={(e) => setPcaComponentY(parseInt(e.target.value))}
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              background: '#1a1a2e',
                              border: '1px solid #3a3a5e',
                              borderRadius: 4,
                              color: '#eaeaea',
                              fontSize: 12,
                            }}
                          >
                            {Array.from({ length: Math.min(layer?.dimensionality || 10, 20) }, (_, i) => (
                              <option key={i} value={i}>PC{i + 1}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            updateProjection(projection.id, {
                              parameters: { components: [pcaComponentX, pcaComponentY] },
                            });
                          }}
                          disabled={isLoading}
                          style={{
                            padding: '8px 12px',
                            background: '#4a9eff',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: isLoading ? 'wait' : 'pointer',
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          {isLoading ? 'Computing...' : 'Apply'}
                        </button>
                      </div>
                    )}

                    {/* t-SNE Configuration */}
                    {projection.type === 'tsne' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
                          t-SNE Parameters
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa', marginBottom: 4 }}>
                            <span>Perplexity</span>
                            <span>{tsnePerplexity}</span>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={Math.min(100, (layer?.point_count || 100) - 1)}
                            value={tsnePerplexity}
                            onChange={(e) => setTsnePerplexity(parseInt(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa', marginBottom: 4 }}>
                            <span>Iterations</span>
                            <span>{tsneIterations}</span>
                          </div>
                          <input
                            type="range"
                            min={250}
                            max={2000}
                            step={50}
                            value={tsneIterations}
                            onChange={(e) => setTsneIterations(parseInt(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <button
                          onClick={() => {
                            updateProjection(projection.id, {
                              parameters: {
                                perplexity: tsnePerplexity,
                                n_iter: tsneIterations,
                              },
                            });
                          }}
                          disabled={isLoading}
                          style={{
                            padding: '8px 12px',
                            background: '#9b59b6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: isLoading ? 'wait' : 'pointer',
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          {isLoading ? 'Computing...' : 'Recompute'}
                        </button>
                        <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                          Note: t-SNE recomputation can be slow for large datasets
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: 12, color: '#aaa' }}>
                      <div><strong>Points:</strong> {layer?.point_count.toLocaleString() || 0}</div>
                      {selectedPointIds.size > 0 && (
                        <div><strong>Selected:</strong> {selectedPointIds.size}</div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Open Dialog */}
      {showOpenDialog && (
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
          onClick={() => setShowOpenDialog(false)}
        >
          <div
            style={{
              background: '#16213e',
              padding: 24,
              borderRadius: 8,
              minWidth: 400,
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', color: '#fff' }}>Open</h3>

            {/* Saved Sessions */}
            {savedSessions.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 8px', color: '#aaa', fontSize: 12, textTransform: 'uppercase' }}>
                  Saved Sessions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {savedSessions.map((s) => (
                    <button
                      key={s.filename}
                      onClick={() => {
                        handleLoadSavedSession(s.filename);
                        setShowOpenDialog(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        background: '#1a1a2e',
                        color: '#fff',
                        border: '1px solid #3a3a5e',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 13,
                        textAlign: 'left',
                      }}
                    >
                      {s.name}
                      {s.description && (
                        <span style={{ color: '#666', marginLeft: 8, fontSize: 12 }}>
                          {s.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Test Scenarios */}
            {scenarios.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 8px', color: '#aaa', fontSize: 12, textTransform: 'uppercase' }}>
                  Test Scenarios
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {scenarios.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => {
                        loadScenario(s.name);
                        setSelectedNodeId(null);
                        setSelectedNodeType(null);
                        setShowOpenDialog(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        background: '#1a1a2e',
                        color: '#fff',
                        border: '1px solid #3a3a5e',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 13,
                        textAlign: 'left',
                      }}
                    >
                      {s.name}
                      {s.description && (
                        <span style={{ color: '#666', marginLeft: 8, fontSize: 12 }}>
                          — {s.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {savedSessions.length === 0 && scenarios.length === 0 && (
              <p style={{ color: '#666', fontSize: 13 }}>No saved sessions or scenarios available.</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setShowOpenDialog(false)}
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
            </div>
          </div>
        </div>
      )}

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
