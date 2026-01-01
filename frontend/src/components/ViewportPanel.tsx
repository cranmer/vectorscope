import { useState } from 'react';
import { Viewport } from './Viewport';
import type { Projection, Layer, ProjectedPoint } from '../types';

interface ViewportPanelProps {
  projections: Projection[];
  layers: Layer[];
  projectedPoints: Record<string, ProjectedPoint[]>;
  selectedIds: Set<string>;
  onSelect: (pointIds: string[]) => void;
  onClose: () => void;
  onProjectionChange: (projectionId: string) => void;
  activeProjectionId: string | null;
  onEditView?: (projectionId: string) => void;
}

export function ViewportPanel({
  projections,
  layers,
  projectedPoints,
  selectedIds,
  onSelect,
  onClose,
  onProjectionChange,
  activeProjectionId,
  onEditView,
}: ViewportPanelProps) {
  const [selectedProjectionId, setSelectedProjectionId] = useState<string | null>(
    activeProjectionId
  );

  const handleProjectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projId = e.target.value || null;
    setSelectedProjectionId(projId);
    if (projId) {
      onProjectionChange(projId);
    }
  };

  const points = selectedProjectionId ? projectedPoints[selectedProjectionId] || [] : [];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#1e1e3f',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #2a2a4e',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#16213e',
          borderBottom: '1px solid #2a2a4e',
          cursor: selectedProjectionId && onEditView ? 'pointer' : 'default',
        }}
        onDoubleClick={() => {
          if (selectedProjectionId && onEditView) {
            onEditView(selectedProjectionId);
          }
        }}
        title={selectedProjectionId && onEditView ? 'Double-click to edit view' : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={selectedProjectionId || ''}
            onChange={handleProjectionChange}
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '4px 8px',
              background: '#1a1a2e',
              color: '#eaeaea',
              border: '1px solid #3a3a5e',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <option value="">Select projection...</option>
            {projections.map((p) => {
              const l = layers.find((l) => l.id === p.layer_id);
              return (
                <option key={p.id} value={p.id}>
                  {l?.name || 'unknown'}: {p.name}
                </option>
              );
            })}
          </select>

          {selectedProjectionId && onEditView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditView(selectedProjectionId);
              }}
              style={{
                padding: '4px 8px',
                background: '#4a9eff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 11,
              }}
              title="Edit view in View Editor"
            >
              Edit
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '4px 8px',
            background: 'transparent',
            color: '#888',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 16,
          }}
          title="Close panel"
        >
          ×
        </button>
      </div>

      {/* Viewport Content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {points.length > 0 ? (() => {
          const projection = projections.find((p) => p.id === selectedProjectionId);
          const isDensity = projection?.type === 'density';
          const isBoxplot = projection?.type === 'boxplot';
          const isViolin = projection?.type === 'violin';
          const is3D = projection?.dimensions === 3;
          const densityBins = (projection?.parameters?.bins as number) ?? 30;
          const showKde = (projection?.parameters?.kde as boolean) ?? true;
          return (
            <Viewport
              points={points}
              selectedIds={selectedIds}
              onSelect={onSelect}
              isDensity={isDensity}
              isBoxplot={isBoxplot}
              isViolin={isViolin}
              is3D={is3D}
              densityBins={densityBins}
              showKde={showKde}
            />
          );
        })() : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#666',
              fontSize: 14,
            }}
          >
            {projections.length === 0
              ? 'No projections available'
              : 'Select a projection'}
          </div>
        )}
      </div>
    </div>
  );
}
