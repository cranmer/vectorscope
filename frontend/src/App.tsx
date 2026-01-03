import { useEffect, useState, useRef } from 'react';
import { useAppStore } from './stores/appStore';
import { ViewportGrid } from './components/ViewportGrid';
import { GraphEditor } from './components/GraphEditor';
import { ConfigPanel } from './components/ConfigPanel';
import { AnnotationsPanel } from './components/AnnotationsPanel';
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
    loadSklearnDataset,
    createProjection,
    createTransformation,
    updateTransformation,
    updateLayer,
    updateProjection,
    deleteProjection,
    loadProjectionCoordinates,
    addViewport,
    removeViewport,
    clearViewports,
    setViewportProjection,
    setViewportsForLayer,
    saveViewSet,
    loadViewSet,
    deleteViewSet,
    setActiveView,
    setSelectedPoints,
    togglePointSelection,
    clearSelection,
    namedSelections,
    loadSelections,
    saveSelection,
    applySelection,
    deleteSelection,
    createBarycenter,
    deleteVirtualPoint,
    createSelectionsFromClasses,
    createBarycentersFromClasses,
    customAxes,
    loadCustomAxes,
    createCustomAxis,
    deleteCustomAxis,
    createCustomAxesProjection,
    newSession,
    loadSavedSessions,
    saveSession,
    loadSavedSession,
    activeViewEditorProjectionId,
    setActiveViewEditorProjection,
    openViewEditor,
    currentSession,
    saveCurrentSession,
    setCurrentSession,
  } = useAppStore();

  // Graph editor selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<'layer' | 'transformation' | 'projection' | null>(null);

  // Dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showSklearnPicker, setShowSklearnPicker] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Status polling
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const statusPollRef = useRef<number | null>(null);

  // File input refs for native file pickers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scenarioInputRef = useRef<HTMLInputElement>(null);

  // View Editor parameter state
  const [pcaComponentX, setPcaComponentX] = useState(0);
  const [pcaComponentY, setPcaComponentY] = useState(1);
  const [pcaComponentZ, setPcaComponentZ] = useState(2);
  const [tsnePerplexity, setTsnePerplexity] = useState(30);
  const [tsneIterations, setTsneIterations] = useState(1000);
  const [directDimX, setDirectDimX] = useState(0);
  const [directDimY, setDirectDimY] = useState(1);
  const [directDimZ, setDirectDimZ] = useState(2);
  const [densityDim, setDensityDim] = useState(0);
  const [densityBins, setDensityBins] = useState(30);
  const [densityKde, setDensityKde] = useState(true);  // Default to KDE
  // Axis range state
  const [axisMinX, setAxisMinX] = useState<number | null>(null);
  const [axisMaxX, setAxisMaxX] = useState<number | null>(null);
  const [axisMinY, setAxisMinY] = useState<number | null>(null);
  const [axisMaxY, setAxisMaxY] = useState<number | null>(null);
  const [axisMinZ, setAxisMinZ] = useState<number | null>(null);
  const [axisMaxZ, setAxisMaxZ] = useState<number | null>(null);
  // View Editor layer filter and new view type
  const [viewEditorLayerFilter, setViewEditorLayerFilter] = useState<string>('');
  const [viewEditorNewViewType, setViewEditorNewViewType] = useState<'pca' | 'tsne' | 'umap' | 'direct' | 'density' | 'boxplot' | 'violin'>('pca');
  // Boxplot state
  const [boxplotDim, setBoxplotDim] = useState(0);
  // Violin state
  const [violinDim, setViolinDim] = useState(0);

  // Load data on mount
  useEffect(() => {
    loadLayers();
    loadProjections();
    loadTransformations();
    loadScenarios();
    loadSavedSessions();
    loadSelections();
    loadCustomAxes();
  }, [loadLayers, loadProjections, loadTransformations, loadScenarios, loadSavedSessions, loadSelections, loadCustomAxes]);

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
          setPcaComponentZ(components?.[2] ?? 2);
        } else if (projection.type === 'tsne') {
          setTsnePerplexity((params.perplexity as number) ?? 30);
          setTsneIterations((params.n_iter as number) ?? 1000);
        } else if (projection.type === 'direct') {
          setDirectDimX((params.dim_x as number) ?? 0);
          setDirectDimY((params.dim_y as number) ?? 1);
          setDirectDimZ((params.dim_z as number) ?? 2);
        } else if (projection.type === 'density') {
          setDensityDim((params.dim as number) ?? 0);
          setDensityBins((params.bins as number) ?? 30);
          setDensityKde((params.kde as boolean) ?? true);
        } else if (projection.type === 'boxplot') {
          setBoxplotDim((params.dim as number) ?? 0);
        } else if (projection.type === 'violin') {
          setViolinDim((params.dim as number) ?? 0);
        }
        // Reset axis ranges when switching projections
        setAxisMinX(null);
        setAxisMaxX(null);
        setAxisMinY(null);
        setAxisMaxY(null);
        setAxisMinZ(null);
        setAxisMaxZ(null);
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

    const file = files[0];
    const fileName = file.name;
    const baseName = fileName.replace(/\.(npy|npz|csv)$/, '');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', baseName);

      const response = await fetch('/api/layers/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || response.statusText);
      }

      // Reload layers and auto-select the new one
      await loadLayers();
      await loadProjections();
      // Get the newest layer (last in list)
      const newLayers = useAppStore.getState().layers;
      if (newLayers.length > 0) {
        const newLayer = newLayers[newLayers.length - 1];
        setActiveView('graph');
        setSelectedNodeId(newLayer.id);
        setSelectedNodeType('layer');
      }
    } catch (e) {
      alert(`Failed to load file: ${(e as Error).message}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleScenarioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Find config and data files
    let configFile: File | null = null;
    let dataFile: File | null = null;

    for (const file of Array.from(files)) {
      if (file.name.endsWith('.json')) {
        configFile = file;
      } else if (file.name.endsWith('.npz')) {
        dataFile = file;
      }
    }

    if (!configFile) {
      alert('Please select a JSON config file');
      return;
    }

    try {
      // Read the config file to get the session name
      const configText = await configFile.text();
      const configData = JSON.parse(configText);
      const sessionName = configData.name || configFile.name.replace(/_config\.json$|\.json$/, '');

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
        const error = await response.json();
        throw new Error(error.detail || response.statusText);
      }

      // Reload all data
      await loadLayers();
      await loadProjections();
      await loadTransformations();

      // Clear stale state (old projection IDs, cached coordinates, etc.)
      useAppStore.setState({
        selectedPointIds: new Set(),
        projectedPoints: {},
        viewports: [],
        viewSets: [],
        activeViewEditorProjectionId: null,
      });

      // Set current session to track this file
      const filename = configFile.name.replace(/_config\.json$|\.json$/, '');
      setCurrentSession({ name: sessionName, filename });

      // Auto-select the first layer in graph editor
      const newLayers = useAppStore.getState().layers;
      if (newLayers.length > 0) {
        setActiveView('graph');
        setSelectedNodeId(newLayers[0].id);
        setSelectedNodeType('layer');
      } else {
        setSelectedNodeId(null);
        setSelectedNodeType(null);
      }
    } catch (e) {
      alert(`Failed to load scenario: ${(e as Error).message}`);
    }

    // Reset file input
    if (scenarioInputRef.current) {
      scenarioInputRef.current.value = '';
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
      // Auto-select the new layer in graph editor
      setActiveView('graph');
      setSelectedNodeId(layer.id);
      setSelectedNodeType('layer');
    }
  };

  const handleSelectNode = (nodeId: string | null, nodeType: 'layer' | 'transformation' | 'projection') => {
    setSelectedNodeId(nodeId);
    setSelectedNodeType(nodeId ? nodeType : null);
  };

  const handleAddView = async (
    layerId: string,
    type: 'pca' | 'tsne' | 'umap' | 'direct' | 'density' | 'boxplot' | 'violin',
    name: string,
    dimensions: number = 2,
    parameters?: Record<string, unknown>
  ) => {
    return await createProjection({
      name,
      type,
      layer_id: layerId,
      dimensions,
      parameters,
    });
  };

  const handleCreateCornerPlot = async (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    const dims = layer.dimensionality;
    const maxDims = Math.min(dims, 6); // Limit to avoid too many plots

    // Clear existing viewports first
    for (const vp of viewports) {
      removeViewport(vp.id);
    }

    // Create projections for corner plot
    // Lower triangle: axis pairs where i > j (row > col)
    // Diagonal: density plots
    const createdProjectionIds: string[] = [];

    for (let row = 0; row < maxDims; row++) {
      for (let col = 0; col <= row; col++) {
        if (row === col) {
          // Diagonal: density plot
          const name = layer.column_names?.[row] || `dim_${row}`;
          const proj = await createProjection({
            name: `Density: ${name}`,
            type: 'density',
            layer_id: layerId,
            dimensions: 2,
            parameters: { dim: row, kde: true, temporary: true },
          });
          if (proj) createdProjectionIds.push(proj.id);
        } else {
          // Lower triangle: scatter of (col, row)
          const nameX = layer.column_names?.[col] || `dim_${col}`;
          const nameY = layer.column_names?.[row] || `dim_${row}`;
          const proj = await createProjection({
            name: `${nameX} vs ${nameY}`,
            type: 'direct',
            layer_id: layerId,
            dimensions: 2,
            parameters: { dim_x: col, dim_y: row, temporary: true },
          });
          if (proj) createdProjectionIds.push(proj.id);
        }
      }
    }

    // Create viewports for each projection
    for (const projId of createdProjectionIds) {
      addViewport(projId);
    }
  };

  const handleCreateDensity = async (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    const dims = layer.dimensionality;
    const maxDims = Math.min(dims, 12); // Limit to avoid too many plots

    // Clear existing viewports first
    for (const vp of viewports) {
      removeViewport(vp.id);
    }

    // Create density plot for each dimension
    const createdProjectionIds: string[] = [];

    for (let i = 0; i < maxDims; i++) {
      const name = layer.column_names?.[i] || `dim_${i}`;
      const proj = await createProjection({
        name: `Density: ${name}`,
        type: 'density',
        layer_id: layerId,
        dimensions: 2,
        parameters: { dim: i, kde: true, temporary: true },
      });
      if (proj) createdProjectionIds.push(proj.id);
    }

    // Create viewports for each projection
    for (const projId of createdProjectionIds) {
      addViewport(projId);
    }
  };

  const handleCreateBoxPlots = async (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    const dims = layer.dimensionality;
    const maxDims = Math.min(dims, 12); // Limit to avoid too many plots

    // Clear existing viewports first
    for (const vp of viewports) {
      removeViewport(vp.id);
    }

    // Create box plot for each dimension
    const createdProjectionIds: string[] = [];

    for (let i = 0; i < maxDims; i++) {
      const name = layer.column_names?.[i] || `dim_${i}`;
      const proj = await createProjection({
        name: `Box: ${name}`,
        type: 'boxplot',
        layer_id: layerId,
        dimensions: 2,
        parameters: { dim: i, temporary: true },
      });
      if (proj) createdProjectionIds.push(proj.id);
    }

    // Create viewports for each projection
    for (const projId of createdProjectionIds) {
      addViewport(projId);
    }
  };

  const handleCreateViolins = async (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    const dims = layer.dimensionality;
    const maxDims = Math.min(dims, 12); // Limit to avoid too many plots

    // Clear existing viewports first
    for (const vp of viewports) {
      removeViewport(vp.id);
    }

    // Create violin plot for each dimension
    const createdProjectionIds: string[] = [];

    for (let i = 0; i < maxDims; i++) {
      const name = layer.column_names?.[i] || `dim_${i}`;
      const proj = await createProjection({
        name: `Violin: ${name}`,
        type: 'violin',
        layer_id: layerId,
        dimensions: 2,
        parameters: { dim: i, temporary: true },
      });
      if (proj) createdProjectionIds.push(proj.id);
    }

    // Create viewports for each projection
    for (const projId of createdProjectionIds) {
      addViewport(projId);
    }
  };

  const handleAddTransformation = async (sourceLayerId: string, type: 'scaling' | 'rotation' | 'pca', name: string) => {
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

        {/* Hidden file input for scenario files */}
        <input
          ref={scenarioInputRef}
          type="file"
          accept=".json"
          onChange={handleScenarioUpload}
          style={{ display: 'none' }}
        />

        <button
          onClick={() => scenarioInputRef.current?.click()}
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
          onClick={() => {
            if (currentSession) {
              saveCurrentSession();
            } else {
              setShowSaveDialog(true);
            }
          }}
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
        {currentSession && (
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={isLoading || layers.length === 0}
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
            Save As
          </button>
        )}

        {/* Show current session name */}
        {currentSession && (
          <div style={{ color: '#888', fontSize: 12, padding: '0 8px' }}>
            {currentSession.name}
          </div>
        )}

        {/* Hidden file input for native file picker - accepts numpy files for raw data */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".npy,.npz,.csv"
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
            <button
              onClick={() => setShowSklearnPicker(true)}
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
              Load Dataset
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
            onTogglePoint={togglePointSelection}
            onAddViewport={() => addViewport()}
            onRemoveViewport={removeViewport}
            onViewportProjectionChange={setViewportProjection}
            loadProjectionCoordinates={loadProjectionCoordinates}
            onSetViewportsForLayer={setViewportsForLayer}
            onSaveViewSet={saveViewSet}
            onLoadViewSet={loadViewSet}
            onDeleteViewSet={deleteViewSet}
            onCreateCornerPlot={handleCreateCornerPlot}
            onCreateDensity={handleCreateDensity}
            onCreateBoxPlots={handleCreateBoxPlots}
            onCreateViolins={handleCreateViolins}
            onClearViewports={clearViewports}
            onEditView={openViewEditor}
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
                onAddTransformation={handleAddTransformation}
                onAddView={handleAddView}
                onOpenViewEditor={openViewEditor}
                onDeleteView={deleteProjection}
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
              onRemoveProjection={deleteProjection}
              onOpenViewEditor={openViewEditor}
            />
          </div>
        )}

        {activeView === 'view-editor' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
            {/* Header Bar */}
            <div style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              padding: '8px 12px',
              background: '#16213e',
              borderRadius: 8,
              flexWrap: 'wrap',
            }}>
              {/* Layer Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>Layer:</label>
                <select
                  value={viewEditorLayerFilter || layers[0]?.id || ''}
                  onChange={(e) => setViewEditorLayerFilter(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    background: '#1a1a2e',
                    border: '1px solid #3a3a5e',
                    borderRadius: 4,
                    color: '#eaeaea',
                    fontSize: 12,
                    minWidth: 150,
                  }}
                >
                  {layers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({projections.filter((p) => p.layer_id === l.id).length} views)
                    </option>
                  ))}
                </select>
              </div>

              {/* View Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>View:</label>
                <select
                  value={activeViewEditorProjectionId || ''}
                  onChange={(e) => {
                    const projId = e.target.value;
                    if (projId) {
                      setActiveViewEditorProjection(projId);
                      // Also update layer filter to match the selected view's layer
                      const proj = projections.find((p) => p.id === projId);
                      if (proj) {
                        setViewEditorLayerFilter(proj.layer_id);
                      }
                      if (!projectedPoints[projId]) {
                        loadProjectionCoordinates(projId);
                      }
                    } else {
                      setActiveViewEditorProjection(null);
                    }
                  }}
                  style={{
                    padding: '6px 10px',
                    background: '#1a1a2e',
                    border: '1px solid #3a3a5e',
                    borderRadius: 4,
                    color: '#eaeaea',
                    fontSize: 12,
                    minWidth: 180,
                  }}
                >
                  <option value="">Select a view...</option>
                  {projections
                    .filter((p) => {
                      const filterLayer = viewEditorLayerFilter || layers[0]?.id;
                      return !filterLayer || p.layer_id === filterLayer;
                    })
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ flex: 1 }} />

              {/* Add New View */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <select
                  value={viewEditorNewViewType}
                  onChange={(e) => setViewEditorNewViewType(e.target.value as 'pca' | 'tsne' | 'umap' | 'direct' | 'density' | 'boxplot' | 'violin')}
                  style={{
                    padding: '6px 8px',
                    background: '#1a1a2e',
                    border: '1px solid #3a3a5e',
                    borderRadius: 4,
                    color: '#eaeaea',
                    fontSize: 12,
                  }}
                >
                  <option value="pca">PCA</option>
                  <option value="tsne">t-SNE</option>
                  <option value="umap">UMAP</option>
                  <option value="direct">Direct Axes</option>
                  <option value="density">Density</option>
                  <option value="boxplot">Box Plot</option>
                  <option value="violin">Violin</option>
                </select>
                <button
                  onClick={async () => {
                    const layerId = viewEditorLayerFilter || layers[0]?.id;
                    if (!layerId) return;
                    const names: Record<string, string> = {
                      pca: 'PCA',
                      tsne: 't-SNE',
                      umap: 'UMAP',
                      direct: 'Direct',
                      density: 'Density',
                      boxplot: 'Box Plot',
                      violin: 'Violin',
                    };
                    const proj = await handleAddView(layerId, viewEditorNewViewType, names[viewEditorNewViewType]);
                    if (proj) {
                      setActiveViewEditorProjection(proj.id);
                    }
                  }}
                  disabled={isLoading || layers.length === 0}
                  style={{
                    padding: '6px 14px',
                    background: layers.length > 0 ? '#4a9eff' : '#3a3a5e',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: layers.length > 0 && !isLoading ? 'pointer' : 'not-allowed',
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Add View
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
              {/* Viewport */}
              <div style={{ flex: 1, minWidth: 0, background: '#0d1117', borderRadius: 8, overflow: 'hidden' }}>
                {activeViewEditorProjectionId && projectedPoints[activeViewEditorProjectionId] ? (() => {
                  const proj = projections.find((p) => p.id === activeViewEditorProjectionId);
                  const isDensity = proj?.type === 'density';
                  const isBoxplot = proj?.type === 'boxplot';
                  const isViolin = proj?.type === 'violin';
                  const is3D = proj?.dimensions === 3;
                  return (
                    <Viewport
                      points={projectedPoints[activeViewEditorProjectionId]}
                      selectedIds={selectedPointIds}
                      onSelect={setSelectedPoints}
                      onTogglePoint={togglePointSelection}
                      axisMinX={axisMinX}
                      axisMaxX={axisMaxX}
                      axisMinY={axisMinY}
                      axisMaxY={axisMaxY}
                      axisMinZ={axisMinZ}
                      axisMaxZ={axisMaxZ}
                      isDensity={isDensity}
                      isBoxplot={isBoxplot}
                      isViolin={isViolin}
                      is3D={is3D}
                      densityBins={densityBins}
                      showKde={densityKde}
                      customAxes={customAxes.filter(a => a.layer_id === proj?.layer_id)}
                    />
                  );
                })() : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#666',
                    gap: 40,
                  }}>
                    <div style={{ textAlign: 'center', fontSize: 14 }}>
                      {projections.length === 0 ? (
                        <>No views available.<br />Load data, load scenario, or create a synthetic dataset.</>
                      ) : (
                        'Select a view to display'
                      )}
                    </div>
                    <img src="/logo.svg" alt="VectorScope" style={{ height: 400 }} />
                  </div>
                )}
              </div>

              {/* View Editor Config Panel */}
              <div style={{
                width: 280,
                minHeight: 0,
                background: '#16213e',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                overflowY: 'auto',
              }}>
                <h3 style={{ margin: 0, fontSize: 14, color: '#888', textTransform: 'uppercase' }}>
                  View Configuration
                </h3>

                {!activeViewEditorProjectionId && (
                  <div style={{ color: '#666', fontSize: 13 }}>
                    Select a view from the dropdown above to configure it.
                  </div>
                )}

                {activeViewEditorProjectionId && (() => {
                const projection = projections.find((p) => p.id === activeViewEditorProjectionId);
                const layer = layers.find((l) => l.id === projection?.layer_id);
                if (!projection) return null;

                const colors: Record<string, string> = {
                  pca: '#4a9eff',
                  tsne: '#9b59b6',
                  custom_axes: '#e67e22',
                  direct: '#2ecc71',
                  density: '#e74c3c',
                  boxplot: '#f39c12',
                  violin: '#9b59b6',
                };
                const color = colors[projection.type] || '#666';

                return (
                  <>
                    <div style={{
                      padding: '6px 10px',
                      background: '#1a1a2e',
                      borderRadius: 4,
                      borderLeft: `3px solid ${color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>
                        {projection.name}
                      </div>
                      <div style={{ fontSize: 10, color, textTransform: 'uppercase' }}>
                        {projection.type}
                      </div>
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
                        {projection.dimensions === 3 && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <label style={{ fontSize: 12, color: '#aaa', width: 50 }}>Z Axis:</label>
                            <select
                              value={pcaComponentZ}
                              onChange={(e) => setPcaComponentZ(parseInt(e.target.value))}
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
                        )}
                        <button
                          onClick={() => {
                            const components = projection.dimensions === 3
                              ? [pcaComponentX, pcaComponentY, pcaComponentZ]
                              : [pcaComponentX, pcaComponentY];
                            updateProjection(projection.id, {
                              parameters: { components },
                            });
                          }}
                          disabled={isLoading}
                          style={{
                            padding: '6px 12px',
                            background: '#4a9eff',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: isLoading ? 'wait' : 'pointer',
                            fontSize: 11,
                          }}
                        >
                          {isLoading ? '...' : 'Apply'}
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
                            padding: '6px 12px',
                            background: '#9b59b6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: isLoading ? 'wait' : 'pointer',
                            fontSize: 11,
                          }}
                        >
                          {isLoading ? '...' : 'Apply'}
                        </button>
                      </div>
                    )}

                    {/* Direct Axes Configuration */}
                    {projection.type === 'direct' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
                          Dimension Selection
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <label style={{ fontSize: 12, color: '#aaa', width: 50 }}>X Axis:</label>
                          <select
                            value={directDimX}
                            onChange={(e) => setDirectDimX(parseInt(e.target.value))}
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
                            {Array.from({ length: layer?.dimensionality || 2 }, (_, i) => (
                              <option key={i} value={i}>
                                {layer?.column_names?.[i] || `dim_${i}`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <label style={{ fontSize: 12, color: '#aaa', width: 50 }}>Y Axis:</label>
                          <select
                            value={directDimY}
                            onChange={(e) => setDirectDimY(parseInt(e.target.value))}
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
                            {Array.from({ length: layer?.dimensionality || 2 }, (_, i) => (
                              <option key={i} value={i}>
                                {layer?.column_names?.[i] || `dim_${i}`}
                              </option>
                            ))}
                          </select>
                        </div>
                        {projection.dimensions === 3 && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <label style={{ fontSize: 12, color: '#aaa', width: 50 }}>Z Axis:</label>
                            <select
                              value={directDimZ}
                              onChange={(e) => setDirectDimZ(parseInt(e.target.value))}
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
                              {Array.from({ length: layer?.dimensionality || 2 }, (_, i) => (
                                <option key={i} value={i}>
                                  {layer?.column_names?.[i] || `dim_${i}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            const params = projection.dimensions === 3
                              ? { dim_x: directDimX, dim_y: directDimY, dim_z: directDimZ }
                              : { dim_x: directDimX, dim_y: directDimY };
                            updateProjection(projection.id, { parameters: params });
                          }}
                          disabled={isLoading}
                          style={{
                            padding: '6px 12px',
                            background: '#2ecc71',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: isLoading ? 'wait' : 'pointer',
                            fontSize: 11,
                          }}
                        >
                          {isLoading ? '...' : 'Apply'}
                        </button>
                      </div>
                    )}

                    {/* Boxplot Configuration */}
                    {projection.type === 'boxplot' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
                          Box Plot Settings
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <label style={{ fontSize: 12, color: '#aaa', width: 80 }}>Dimension:</label>
                          <select
                            value={boxplotDim}
                            onChange={(e) => setBoxplotDim(parseInt(e.target.value))}
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
                            {Array.from({ length: layer?.dimensionality || 2 }, (_, i) => (
                              <option key={i} value={i}>
                                {layer?.column_names?.[i] || `dim_${i}`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            updateProjection(projection.id, {
                              parameters: { dim: boxplotDim },
                            });
                          }}
                          disabled={isLoading}
                          style={{
                            padding: '6px 12px',
                            background: '#f39c12',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: isLoading ? 'wait' : 'pointer',
                            fontSize: 11,
                          }}
                        >
                          {isLoading ? '...' : 'Apply'}
                        </button>
                      </div>
                    )}

                    {/* Density Configuration */}
                    {projection.type === 'density' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
                          Density Settings
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <label style={{ fontSize: 12, color: '#aaa', width: 80 }}>Dimension:</label>
                          <select
                            value={densityDim}
                            onChange={(e) => setDensityDim(parseInt(e.target.value))}
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
                            {Array.from({ length: layer?.dimensionality || 2 }, (_, i) => (
                              <option key={i} value={i}>
                                {layer?.column_names?.[i] || `dim_${i}`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa', marginBottom: 4 }}>
                            <span>Bins</span>
                            <span>{densityBins}</span>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={100}
                            value={densityBins}
                            onChange={(e) => setDensityBins(parseInt(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: densityKde ? '#888' : '#fff', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="densityMode"
                              checked={!densityKde}
                              onChange={() => setDensityKde(false)}
                            />
                            Histogram
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: densityKde ? '#fff' : '#888', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="densityMode"
                              checked={densityKde}
                              onChange={() => setDensityKde(true)}
                            />
                            KDE
                          </label>
                        </div>
                        <button
                          onClick={() => {
                            updateProjection(projection.id, {
                              parameters: { dim: densityDim, bins: densityBins, kde: densityKde },
                            });
                          }}
                          disabled={isLoading}
                          style={{
                            padding: '6px 12px',
                            background: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: isLoading ? 'wait' : 'pointer',
                            fontSize: 11,
                          }}
                        >
                          {isLoading ? '...' : 'Apply'}
                        </button>
                      </div>
                    )}

                    {/* Violin Configuration */}
                    {projection.type === 'violin' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
                          Violin Settings
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <label style={{ fontSize: 12, color: '#aaa', width: 80 }}>Dimension:</label>
                          <select
                            value={violinDim}
                            onChange={(e) => setViolinDim(parseInt(e.target.value))}
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
                            {Array.from({ length: layer?.dimensionality || 2 }, (_, i) => (
                              <option key={i} value={i}>
                                {layer?.column_names?.[i] || `dim_${i}`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            updateProjection(projection.id, {
                              parameters: { dim: violinDim },
                            });
                          }}
                          disabled={isLoading}
                          style={{
                            padding: '6px 12px',
                            background: '#9b59b6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: isLoading ? 'wait' : 'pointer',
                            fontSize: 11,
                          }}
                        >
                          {isLoading ? '...' : 'Apply'}
                        </button>
                      </div>
                    )}

                    {/* Axis Range Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
                        Axis Range
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <div>
                          <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 2 }}>X Min</label>
                          <input
                            type="number"
                            value={axisMinX ?? ''}
                            onChange={(e) => setAxisMinX(e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="auto"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              background: '#1a1a2e',
                              border: '1px solid #3a3a5e',
                              borderRadius: 4,
                              color: '#eaeaea',
                              fontSize: 12,
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 2 }}>X Max</label>
                          <input
                            type="number"
                            value={axisMaxX ?? ''}
                            onChange={(e) => setAxisMaxX(e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="auto"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              background: '#1a1a2e',
                              border: '1px solid #3a3a5e',
                              borderRadius: 4,
                              color: '#eaeaea',
                              fontSize: 12,
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 2 }}>Y Min</label>
                          <input
                            type="number"
                            value={axisMinY ?? ''}
                            onChange={(e) => setAxisMinY(e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="auto"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              background: '#1a1a2e',
                              border: '1px solid #3a3a5e',
                              borderRadius: 4,
                              color: '#eaeaea',
                              fontSize: 12,
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 2 }}>Y Max</label>
                          <input
                            type="number"
                            value={axisMaxY ?? ''}
                            onChange={(e) => setAxisMaxY(e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="auto"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              background: '#1a1a2e',
                              border: '1px solid #3a3a5e',
                              borderRadius: 4,
                              color: '#eaeaea',
                              fontSize: 12,
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        {projection.dimensions === 3 && (
                          <>
                            <div>
                              <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 2 }}>Z Min</label>
                              <input
                                type="number"
                                value={axisMinZ ?? ''}
                                onChange={(e) => setAxisMinZ(e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="auto"
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  background: '#1a1a2e',
                                  border: '1px solid #3a3a5e',
                                  borderRadius: 4,
                                  color: '#eaeaea',
                                  fontSize: 12,
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 2 }}>Z Max</label>
                              <input
                                type="number"
                                value={axisMaxZ ?? ''}
                                onChange={(e) => setAxisMaxZ(e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="auto"
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  background: '#1a1a2e',
                                  border: '1px solid #3a3a5e',
                                  borderRadius: 4,
                                  color: '#eaeaea',
                                  fontSize: 12,
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setAxisMinX(null);
                          setAxisMaxX(null);
                          setAxisMinY(null);
                          setAxisMaxY(null);
                          setAxisMinZ(null);
                          setAxisMaxZ(null);
                        }}
                        style={{
                          padding: '6px 12px',
                          background: '#3a3a5e',
                          color: '#aaa',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 11,
                        }}
                      >
                        Reset to Auto
                      </button>
                    </div>

                  </>
                );
              })()}

                {/* Divider */}
                <div style={{ borderTop: '1px solid #2a2a4e', margin: '4px 0' }} />

                {/* Annotations Panel */}
                <AnnotationsPanel
                  selections={namedSelections}
                  selectedPointCount={selectedPointIds.size}
                  selectedPointIds={Array.from(selectedPointIds)}
                  activeLayerId={(() => {
                    const proj = projections.find((p) => p.id === activeViewEditorProjectionId);
                    return proj?.layer_id || null;
                  })()}
                  activeProjectionId={activeViewEditorProjectionId}
                  projectedPoints={activeViewEditorProjectionId ? projectedPoints[activeViewEditorProjectionId] || [] : []}
                  customAxes={customAxes}
                  onSaveSelection={saveSelection}
                  onApplySelection={applySelection}
                  onDeleteSelection={deleteSelection}
                  onClearSelection={clearSelection}
                  onCreateBarycenter={createBarycenter}
                  onDeleteVirtualPoint={deleteVirtualPoint}
                  onCreateSelectionsFromClasses={createSelectionsFromClasses}
                  onCreateBarycentersFromClasses={createBarycentersFromClasses}
                  onCreateCustomAxis={createCustomAxis}
                  onDeleteCustomAxis={deleteCustomAxis}
                  onCreateCustomAxesProjection={createCustomAxesProjection}
                />
            </div>
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

      {/* Sklearn Dataset Picker */}
      {showSklearnPicker && (
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
          onClick={() => setShowSklearnPicker(false)}
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
            <h3 style={{ margin: '0 0 16px', color: '#fff' }}>Load Standard Dataset</h3>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
              Select a standard sklearn dataset to explore:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { id: 'iris', name: 'Iris', desc: '150 samples, 4 features - flower classification' },
                { id: 'wine', name: 'Wine', desc: '178 samples, 13 features - wine cultivar' },
                { id: 'breast_cancer', name: 'Breast Cancer', desc: '569 samples, 30 features' },
                { id: 'digits', name: 'Digits', desc: '1797 samples, 64 features - handwritten' },
                { id: 'diabetes', name: 'Diabetes', desc: '442 samples, 10 features - regression' },
                { id: 'linnerud', name: 'Linnerud', desc: '20 samples, 3 features - physiological' },
              ].map((dataset) => (
                <button
                  key={dataset.id}
                  onClick={async () => {
                    setShowSklearnPicker(false);
                    const layer = await loadSklearnDataset(dataset.id);
                    if (layer) {
                      await createProjection({
                        name: 'PCA',
                        type: 'pca',
                        layer_id: layer.id,
                        dimensions: 2,
                      });
                      // Auto-select the new layer in graph editor
                      setActiveView('graph');
                      setSelectedNodeId(layer.id);
                      setSelectedNodeType('layer');
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    background: '#1a1a2e',
                    color: '#fff',
                    border: '1px solid #3a3a5e',
                    borderRadius: 6,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{dataset.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{dataset.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setShowSklearnPicker(false)}
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
    </div>
  );
}

export default App;
