import { useState, useEffect } from 'react';
import { ViewportPanel } from './ViewportPanel';
import type { Projection, Layer, ProjectedPoint, CustomAxis } from '../types';

export interface ViewportConfig {
  id: string;
  projectionId: string | null;
}

export interface ViewSet {
  name: string;
  viewportProjectionIds: string[];
}

interface ViewportGridProps {
  viewports: ViewportConfig[];
  projections: Projection[];
  layers: Layer[];
  projectedPoints: Record<string, ProjectedPoint[]>;
  selectedIds: Set<string>;
  viewSets: ViewSet[];
  onSelect: (pointIds: string[]) => void;
  onTogglePoint?: (pointId: string, add: boolean) => void;
  onAddViewport: () => void;
  onRemoveViewport: (id: string) => void;
  onViewportProjectionChange: (viewportId: string, projectionId: string) => void;
  loadProjectionCoordinates: (projectionId: string) => Promise<void>;
  onSetViewportsForLayer: (layerId: string) => void;
  onSaveViewSet: (name: string) => void;
  onLoadViewSet: (viewSet: ViewSet) => void;
  onDeleteViewSet: (name: string) => void;
  onCreateCornerPlot?: (layerId: string) => void;
  onCreateDensity?: (layerId: string) => void;
  onCreateBoxPlots?: (layerId: string) => void;
  onCreateViolins?: (layerId: string) => void;
  onClearViewports?: () => void;
  onEditView?: (projectionId: string) => void;
  customAxes?: CustomAxis[];
}

export function ViewportGrid({
  viewports,
  projections,
  layers,
  projectedPoints,
  selectedIds,
  viewSets,
  onSelect,
  onTogglePoint,
  onAddViewport,
  onRemoveViewport,
  onViewportProjectionChange,
  loadProjectionCoordinates,
  onSetViewportsForLayer,
  onSaveViewSet,
  onLoadViewSet,
  onDeleteViewSet,
  onCreateCornerPlot,
  onCreateDensity,
  onCreateBoxPlots,
  onCreateViolins,
  onClearViewports,
  onEditView,
  customAxes = [],
}: ViewportGridProps) {
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [viewSetName, setViewSetName] = useState('');

  // Default to first source layer (non-derived)
  useEffect(() => {
    if (!selectedLayerId && layers.length > 0) {
      const sourceLayer = layers.find(l => !l.is_derived);
      if (sourceLayer) {
        setSelectedLayerId(sourceLayer.id);
      }
    }
  }, [layers, selectedLayerId]);

  const handleProjectionChange = async (viewportId: string, projectionId: string) => {
    // Load coordinates if not already loaded
    if (!projectedPoints[projectionId]) {
      await loadProjectionCoordinates(projectionId);
    }
    onViewportProjectionChange(viewportId, projectionId);
  };

  const handleShowLayerViews = () => {
    if (selectedLayerId) {
      onSetViewportsForLayer(selectedLayerId);
    }
  };

  const handleSaveViewSet = () => {
    if (viewSetName.trim()) {
      onSaveViewSet(viewSetName.trim());
      setShowSaveDialog(false);
      setViewSetName('');
    }
  };

  // Get projections count for selected layer
  const selectedLayerProjections = selectedLayerId
    ? projections.filter((p) => p.layer_id === selectedLayerId)
    : [];

  // Calculate grid layout based on number of viewports
  const getGridStyle = () => {
    const count = viewports.length;
    if (count <= 1) return { gridTemplateColumns: '1fr' };
    if (count <= 2) return { gridTemplateColumns: '1fr 1fr' };
    if (count <= 4) return { gridTemplateColumns: '1fr 1fr' };
    return { gridTemplateColumns: '1fr 1fr 1fr' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={onAddViewport}
          style={{
            padding: '6px 12px',
            background: '#2a2a4e',
            color: '#eaeaea',
            border: '1px solid #3a3a5e',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          + Add Viewport
        </button>

        <div style={{ width: 1, height: 20, background: '#3a3a5e' }} />

        {/* Layer selector */}
        <select
          value={selectedLayerId}
          onChange={(e) => setSelectedLayerId(e.target.value)}
          style={{
            padding: '6px 10px',
            background: '#1a1a2e',
            color: '#aaa',
            border: '1px solid #3a3a5e',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          <option value="">Select Layer...</option>
          {layers.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.name} ({projections.filter((p) => p.layer_id === layer.id).length} views)
            </option>
          ))}
        </select>

        <button
          onClick={handleShowLayerViews}
          disabled={!selectedLayerId || selectedLayerProjections.length === 0}
          style={{
            padding: '6px 12px',
            background: selectedLayerId && selectedLayerProjections.length > 0 ? '#4a9eff' : '#2a2a4e',
            color: selectedLayerId && selectedLayerProjections.length > 0 ? 'white' : '#666',
            border: 'none',
            borderRadius: 4,
            cursor: selectedLayerId && selectedLayerProjections.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: 12,
          }}
        >
          Show Layer Views ({selectedLayerProjections.length})
        </button>

        {onCreateCornerPlot && (
          <button
            onClick={() => selectedLayerId && onCreateCornerPlot(selectedLayerId)}
            disabled={!selectedLayerId}
            title="Create corner plot: all axis pairs + histograms on diagonal"
            style={{
              padding: '6px 12px',
              background: selectedLayerId ? '#e67e22' : '#2a2a4e',
              color: selectedLayerId ? 'white' : '#666',
              border: 'none',
              borderRadius: 4,
              cursor: selectedLayerId ? 'pointer' : 'not-allowed',
              fontSize: 12,
            }}
          >
            Corner Plot
          </button>
        )}

        {onCreateDensity && (
          <button
            onClick={() => selectedLayerId && onCreateDensity(selectedLayerId)}
            disabled={!selectedLayerId}
            title="Create density plot (KDE) for each dimension"
            style={{
              padding: '6px 12px',
              background: selectedLayerId ? '#e74c3c' : '#2a2a4e',
              color: selectedLayerId ? 'white' : '#666',
              border: 'none',
              borderRadius: 4,
              cursor: selectedLayerId ? 'pointer' : 'not-allowed',
              fontSize: 12,
            }}
          >
            Density
          </button>
        )}

        {onCreateBoxPlots && (
          <button
            onClick={() => selectedLayerId && onCreateBoxPlots(selectedLayerId)}
            disabled={!selectedLayerId}
            title="Create box plot for each dimension"
            style={{
              padding: '6px 12px',
              background: selectedLayerId ? '#f39c12' : '#2a2a4e',
              color: selectedLayerId ? 'white' : '#666',
              border: 'none',
              borderRadius: 4,
              cursor: selectedLayerId ? 'pointer' : 'not-allowed',
              fontSize: 12,
            }}
          >
            Box Plots
          </button>
        )}

        {onCreateViolins && (
          <button
            onClick={() => selectedLayerId && onCreateViolins(selectedLayerId)}
            disabled={!selectedLayerId}
            title="Create violin plot for each dimension"
            style={{
              padding: '6px 12px',
              background: selectedLayerId ? '#9b59b6' : '#2a2a4e',
              color: selectedLayerId ? 'white' : '#666',
              border: 'none',
              borderRadius: 4,
              cursor: selectedLayerId ? 'pointer' : 'not-allowed',
              fontSize: 12,
            }}
          >
            Violin
          </button>
        )}

        <div style={{ width: 1, height: 20, background: '#3a3a5e' }} />

        {/* View Sets */}
        {viewports.length > 0 && viewports.some((v) => v.projectionId) && (
          <button
            onClick={() => setShowSaveDialog(true)}
            style={{
              padding: '6px 12px',
              background: '#2d5a27',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Save View Set
          </button>
        )}

        {viewports.length > 0 && onClearViewports && (
          <button
            onClick={onClearViewports}
            style={{
              padding: '6px 12px',
              background: '#3a3a5e',
              color: '#aaa',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Clear Viewports
          </button>
        )}

        <div style={{ flex: 1 }} />

        <span style={{ color: '#666', fontSize: 12 }}>
          {viewports.length} viewport{viewports.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* View Sets Row */}
      {viewSets.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#666', fontSize: 12 }}>View Sets:</span>
          {viewSets.map((vs) => (
            <div
              key={vs.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#1a1a2e',
                border: '1px solid #3a3a5e',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => onLoadViewSet(vs)}
                style={{
                  padding: '4px 10px',
                  background: 'transparent',
                  color: '#aaa',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
                title={`Load ${vs.name} (${vs.viewportProjectionIds.length} views)`}
              >
                {vs.name}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete view set "${vs.name}"?`)) {
                    onDeleteViewSet(vs.name);
                  }
                }}
                style={{
                  padding: '4px 6px',
                  background: 'transparent',
                  color: '#ff6b6b',
                  border: 'none',
                  borderLeft: '1px solid #3a3a5e',
                  cursor: 'pointer',
                  fontSize: 12,
                  lineHeight: 1,
                }}
                title={`Delete ${vs.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gap: 12,
          minHeight: 0,
          ...getGridStyle(),
        }}
      >
        {viewports.map((viewport) => (
          <ViewportPanel
            key={viewport.id}
            projections={projections}
            layers={layers}
            projectedPoints={projectedPoints}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onTogglePoint={onTogglePoint}
            onClose={() => onRemoveViewport(viewport.id)}
            onProjectionChange={(projId) => handleProjectionChange(viewport.id, projId)}
            activeProjectionId={viewport.projectionId}
            onEditView={onEditView}
            customAxes={customAxes}
          />
        ))}

        {viewports.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#666',
              fontSize: 14,
              border: '2px dashed #3a3a5e',
              borderRadius: 8,
            }}
          >
            Click "+ Add Viewport" to create a visualization
          </div>
        )}
      </div>

      {/* Save View Set Dialog */}
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
            <h3 style={{ margin: '0 0 16px', color: '#fff' }}>Save View Set</h3>
            <input
              type="text"
              placeholder="View set name"
              value={viewSetName}
              onChange={(e) => setViewSetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveViewSet()}
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
                onClick={handleSaveViewSet}
                disabled={!viewSetName.trim()}
                style={{
                  padding: '8px 16px',
                  background: viewSetName.trim() ? '#4a9eff' : '#3a3a5e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: viewSetName.trim() ? 'pointer' : 'not-allowed',
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
