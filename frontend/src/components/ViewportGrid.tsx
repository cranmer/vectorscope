import { ViewportPanel } from './ViewportPanel';
import type { Projection, Layer, ProjectedPoint } from '../types';

export interface ViewportConfig {
  id: string;
  projectionId: string | null;
}

interface ViewportGridProps {
  viewports: ViewportConfig[];
  projections: Projection[];
  layers: Layer[];
  projectedPoints: Record<string, ProjectedPoint[]>;
  selectedIds: Set<string>;
  onSelect: (pointIds: string[]) => void;
  onAddViewport: () => void;
  onRemoveViewport: (id: string) => void;
  onViewportProjectionChange: (viewportId: string, projectionId: string) => void;
  loadProjectionCoordinates: (projectionId: string) => Promise<void>;
}

export function ViewportGrid({
  viewports,
  projections,
  layers,
  projectedPoints,
  selectedIds,
  onSelect,
  onAddViewport,
  onRemoveViewport,
  onViewportProjectionChange,
  loadProjectionCoordinates,
}: ViewportGridProps) {
  const handleProjectionChange = async (viewportId: string, projectionId: string) => {
    // Load coordinates if not already loaded
    if (!projectedPoints[projectionId]) {
      await loadProjectionCoordinates(projectionId);
    }
    onViewportProjectionChange(viewportId, projectionId);
  };

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
      <div style={{ display: 'flex', gap: 8 }}>
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
        <span style={{ color: '#666', fontSize: 12, alignSelf: 'center' }}>
          {viewports.length} viewport{viewports.length !== 1 ? 's' : ''}
        </span>
      </div>

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
            onClose={() => onRemoveViewport(viewport.id)}
            onProjectionChange={(projId) => handleProjectionChange(viewport.id, projId)}
            activeProjectionId={viewport.projectionId}
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
    </div>
  );
}
