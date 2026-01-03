import { useState } from 'react';
import type { Selection, ProjectedPoint, CustomAxis } from '../types';

interface AnnotationsPanelProps {
  selections: Selection[];
  selectedPointCount: number;
  selectedPointIds: string[];
  activeLayerId: string | null;
  activeProjectionId: string | null;
  projectedPoints: ProjectedPoint[];
  customAxes: CustomAxis[];
  onSaveSelection: (name: string, layerId: string) => void;
  onApplySelection: (selection: Selection) => void;
  onDeleteSelection: (id: string) => void;
  onClearSelection: () => void;
  onCreateBarycenter?: (layerId: string, name?: string) => void;
  onDeleteVirtualPoint?: (layerId: string, pointId: string) => void;
  onCreateSelectionsFromClasses?: (layerId: string, projectionId: string) => void;
  onCreateBarycentersFromClasses?: (layerId: string, projectionId: string) => void;
  onCreateCustomAxis?: (name: string, layerId: string, pointAId: string, pointBId: string) => void;
  onDeleteCustomAxis?: (id: string) => void;
  onCreateCustomAxesProjection?: (layerId: string, xAxisId: string, yAxisId: string | null) => void;
}

export function AnnotationsPanel({
  selections,
  selectedPointCount,
  selectedPointIds,
  activeLayerId,
  activeProjectionId,
  projectedPoints,
  customAxes,
  onSaveSelection,
  onApplySelection,
  onDeleteSelection,
  onClearSelection,
  onCreateBarycenter,
  onDeleteVirtualPoint,
  onCreateSelectionsFromClasses,
  onCreateBarycentersFromClasses,
  onCreateCustomAxis,
  onDeleteCustomAxis,
  onCreateCustomAxesProjection,
}: AnnotationsPanelProps) {
  const [selectionName, setSelectionName] = useState('');
  const [barycenterName, setBarycenterName] = useState('');
  const [axisName, setAxisName] = useState('');
  const [selectionsExpanded, setSelectionsExpanded] = useState(true);
  const [virtualPointsExpanded, setVirtualPointsExpanded] = useState(true);
  const [customAxesExpanded, setCustomAxesExpanded] = useState(true);
  const [classGenerateExpanded, setClassGenerateExpanded] = useState(true);
  const [selectedXAxisId, setSelectedXAxisId] = useState<string>('');
  const [selectedYAxisId, setSelectedYAxisId] = useState<string>('');

  const handleSaveSelection = () => {
    if (!selectionName.trim() || !activeLayerId) return;
    onSaveSelection(selectionName.trim(), activeLayerId);
    setSelectionName('');
    onClearSelection();
  };

  const handleCreateBarycenter = () => {
    if (!activeLayerId || !onCreateBarycenter) return;
    onCreateBarycenter(activeLayerId, barycenterName.trim() || undefined);
    setBarycenterName('');
    onClearSelection();
  };

  const handleCreateAxis = () => {
    if (!activeLayerId || !onCreateCustomAxis || selectedPointIds.length !== 2) return;
    // Use layer-filtered axes count for default naming
    const layerAxesCount = customAxes.filter(a => a.layer_id === activeLayerId).length;
    const name = axisName.trim() || `Axis ${layerAxesCount + 1}`;
    onCreateCustomAxis(name, activeLayerId, selectedPointIds[0], selectedPointIds[1]);
    setAxisName('');
    onClearSelection();
  };

  const handleCreateProjection = () => {
    if (!activeLayerId || !onCreateCustomAxesProjection || !selectedXAxisId) return;
    onCreateCustomAxesProjection(
      activeLayerId,
      selectedXAxisId,
      selectedYAxisId || null
    );
    // Reset selections after creating projection
    setSelectedXAxisId('');
    setSelectedYAxisId('');
  };

  // Get point labels for displaying axis creation info
  const getPointLabel = (pointId: string) => {
    const point = projectedPoints.find(p => p.id === pointId);
    return point?.label || pointId.slice(0, 8);
  };

  // Get virtual points from projected points
  const virtualPoints = projectedPoints.filter(p => p.is_virtual);

  // Filter custom axes by active layer - show only axes for the current layer
  const layerCustomAxes = activeLayerId
    ? customAxes.filter(a => a.layer_id === activeLayerId)
    : [];

  // Get unique class labels from non-virtual points
  const classLabels = Array.from(
    new Set(
      projectedPoints
        .filter(p => !p.is_virtual && p.label)
        .map(p => p.label as string)
    )
  ).sort();

  const hasClassLabels = classLabels.length > 0;

  const sectionHeaderStyle = {
    width: '100%',
    padding: '8px 0',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase' as const,
  };

  const compactButtonStyle = {
    padding: '4px 10px',
    border: 'none',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <h3 style={{ margin: 0, fontSize: 14, color: '#888', textTransform: 'uppercase' }}>
        Annotations
      </h3>

      {/* Current Selection Controls */}
      {selectedPointCount > 0 && (
        <div style={{
          background: '#1a1a2e',
          borderRadius: 6,
          padding: 10,
        }}>
          <div style={{
            fontSize: 12,
            color: '#4ade80',
            marginBottom: 8,
          }}>
            {selectedPointCount} point{selectedPointCount === 1 ? '' : 's'} selected
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Save as Selection */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={selectionName}
                onChange={(e) => setSelectionName(e.target.value)}
                placeholder="Selection name..."
                onKeyDown={(e) => e.key === 'Enter' && handleSaveSelection()}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  background: '#0f0f1a',
                  border: '1px solid #333',
                  borderRadius: 4,
                  color: '#e0e0e0',
                  fontSize: 12,
                }}
              />
              <button
                onClick={handleSaveSelection}
                disabled={!selectionName.trim() || !activeLayerId}
                style={{
                  ...compactButtonStyle,
                  background: selectionName.trim() && activeLayerId ? '#3b82f6' : '#333',
                  color: selectionName.trim() && activeLayerId ? '#fff' : '#666',
                  cursor: selectionName.trim() && activeLayerId ? 'pointer' : 'not-allowed',
                }}
              >
                Save
              </button>
            </div>

            {/* Create Barycenter */}
            {onCreateBarycenter && activeLayerId && (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={barycenterName}
                  onChange={(e) => setBarycenterName(e.target.value)}
                  placeholder="Barycenter name..."
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBarycenter()}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    background: '#0f0f1a',
                    border: '1px solid #333',
                    borderRadius: 4,
                    color: '#e0e0e0',
                    fontSize: 12,
                  }}
                />
                <button
                  onClick={handleCreateBarycenter}
                  title="Create a virtual point at the center (mean) of selected points"
                  style={{
                    ...compactButtonStyle,
                    background: '#8b5cf6',
                    color: '#fff',
                  }}
                >
                  + Point
                </button>
              </div>
            )}

            {/* Create Custom Axis (only when exactly 2 points selected) */}
            {onCreateCustomAxis && activeLayerId && selectedPointIds.length === 2 && (
              <div style={{
                borderTop: '1px solid #333',
                paddingTop: 6,
                marginTop: 2,
              }}>
                <div style={{ fontSize: 11, color: '#e67e22', marginBottom: 4 }}>
                  Create axis: {getPointLabel(selectedPointIds[0])} → {getPointLabel(selectedPointIds[1])}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={axisName}
                    onChange={(e) => setAxisName(e.target.value)}
                    placeholder="Axis name..."
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateAxis()}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      background: '#0f0f1a',
                      border: '1px solid #333',
                      borderRadius: 4,
                      color: '#e0e0e0',
                      fontSize: 12,
                    }}
                  />
                  <button
                    onClick={handleCreateAxis}
                    title="Create a custom axis from point A to point B"
                    style={{
                      ...compactButtonStyle,
                      background: '#e67e22',
                      color: '#fff',
                    }}
                  >
                    + Axis
                  </button>
                </div>
              </div>
            )}

            {/* Clear button */}
            <button
              onClick={onClearSelection}
              style={{
                ...compactButtonStyle,
                background: '#3a3a5e',
                color: '#aaa',
                width: '100%',
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Selections Section */}
      <div>
        <button
          onClick={() => setSelectionsExpanded(!selectionsExpanded)}
          style={sectionHeaderStyle}
        >
          <span>Selections ({selections.length})</span>
          <span style={{ fontSize: 10 }}>{selectionsExpanded ? '▼' : '▶'}</span>
        </button>

        {selectionsExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selections.length > 0 ? (
              selections.map((selection) => (
                <div
                  key={selection.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    background: '#1a1a2e',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selection.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#666' }}>
                      {selection.point_count} pts
                    </div>
                  </div>
                  <button
                    onClick={() => onApplySelection(selection)}
                    title="Apply selection"
                    style={{
                      ...compactButtonStyle,
                      background: '#3b82f6',
                      color: '#fff',
                    }}
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => onDeleteSelection(selection.id)}
                    title="Delete"
                    style={{
                      ...compactButtonStyle,
                      background: 'transparent',
                      border: '1px solid #555',
                      color: '#888',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 11, color: '#555', fontStyle: 'italic', padding: '4px 0' }}>
                No saved selections
              </div>
            )}
          </div>
        )}
      </div>

      {/* Virtual Points Section */}
      <div>
        <button
          onClick={() => setVirtualPointsExpanded(!virtualPointsExpanded)}
          style={sectionHeaderStyle}
        >
          <span>Virtual Points ({virtualPoints.length})</span>
          <span style={{ fontSize: 10 }}>{virtualPointsExpanded ? '▼' : '▶'}</span>
        </button>

        {virtualPointsExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {virtualPoints.length > 0 ? (
              virtualPoints.map((point) => (
                <div
                  key={point.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    background: '#1a1a2e',
                    borderRadius: 4,
                    borderLeft: '3px solid #f59e0b',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {point.label || 'Barycenter'}
                    </div>
                    <div style={{ fontSize: 10, color: '#666' }}>
                      ({point.coordinates[0].toFixed(2)}, {point.coordinates[1].toFixed(2)})
                    </div>
                  </div>
                  {onDeleteVirtualPoint && activeLayerId && (
                    <button
                      onClick={() => onDeleteVirtualPoint(activeLayerId, point.id)}
                      title="Delete virtual point"
                      style={{
                        ...compactButtonStyle,
                        background: 'transparent',
                        border: '1px solid #555',
                        color: '#888',
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div style={{ fontSize: 11, color: '#555', fontStyle: 'italic', padding: '4px 0' }}>
                No virtual points. Select points and click "+ Point" to create a barycenter.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Axes Section */}
      <div>
        <button
          onClick={() => setCustomAxesExpanded(!customAxesExpanded)}
          style={sectionHeaderStyle}
        >
          <span>Custom Axes ({layerCustomAxes.length})</span>
          <span style={{ fontSize: 10 }}>{customAxesExpanded ? '▼' : '▶'}</span>
        </button>

        {customAxesExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {layerCustomAxes.length > 0 ? (
              layerCustomAxes.map((axis) => (
                <div
                  key={axis.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    background: '#1a1a2e',
                    borderRadius: 4,
                    borderLeft: '3px solid #e67e22',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {axis.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#666' }}>
                      {getPointLabel(axis.point_a_id)} → {getPointLabel(axis.point_b_id)}
                    </div>
                  </div>
                  {onDeleteCustomAxis && (
                    <button
                      onClick={() => onDeleteCustomAxis(axis.id)}
                      title="Delete custom axis"
                      style={{
                        ...compactButtonStyle,
                        background: 'transparent',
                        border: '1px solid #555',
                        color: '#888',
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div style={{ fontSize: 11, color: '#555', fontStyle: 'italic', padding: '4px 0' }}>
                No custom axes. Select exactly 2 points to create an axis.
              </div>
            )}

            {/* Create Projection from Axes */}
            {layerCustomAxes.length > 0 && onCreateCustomAxesProjection && activeLayerId && (
              <div style={{
                borderTop: '1px solid #333',
                paddingTop: 8,
                marginTop: 8,
              }}>
                <div style={{ fontSize: 11, color: '#e67e22', marginBottom: 6 }}>
                  Create projection from axes:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#888', width: 20 }}>X:</span>
                    <select
                      value={selectedXAxisId}
                      onChange={(e) => setSelectedXAxisId(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        background: '#0f0f1a',
                        border: '1px solid #333',
                        borderRadius: 4,
                        color: '#e0e0e0',
                        fontSize: 11,
                      }}
                    >
                      <option value="">Select axis...</option>
                      {layerCustomAxes.map((axis) => (
                        <option key={axis.id} value={axis.id}>
                          {axis.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#888', width: 20 }}>Y:</span>
                    <select
                      value={selectedYAxisId}
                      onChange={(e) => setSelectedYAxisId(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        background: '#0f0f1a',
                        border: '1px solid #333',
                        borderRadius: 4,
                        color: '#e0e0e0',
                        fontSize: 11,
                      }}
                    >
                      <option value="">Select axis...</option>
                      {layerCustomAxes.map((axis) => (
                        <option key={axis.id} value={axis.id}>
                          {axis.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleCreateProjection}
                    disabled={!selectedXAxisId || !selectedYAxisId}
                    title="Create a projection using the selected custom axes (both X and Y required)"
                    style={{
                      ...compactButtonStyle,
                      background: selectedXAxisId && selectedYAxisId ? '#e67e22' : '#333',
                      color: selectedXAxisId && selectedYAxisId ? '#fff' : '#666',
                      cursor: selectedXAxisId && selectedYAxisId ? 'pointer' : 'not-allowed',
                      width: '100%',
                    }}
                  >
                    Create View
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Class-based Generation Section */}
      {hasClassLabels && (onCreateSelectionsFromClasses || onCreateBarycentersFromClasses) && (
        <div>
          <button
            onClick={() => setClassGenerateExpanded(!classGenerateExpanded)}
            style={sectionHeaderStyle}
          >
            <span>Auto-Generate from Classes ({classLabels.length})</span>
            <span style={{ fontSize: 10 }}>{classGenerateExpanded ? '▼' : '▶'}</span>
          </button>

          {classGenerateExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Class labels preview */}
              <div style={{
                fontSize: 11,
                color: '#888',
                padding: '4px 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                Classes: {classLabels.join(', ')}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                {onCreateSelectionsFromClasses && activeLayerId && activeProjectionId && (
                  <button
                    onClick={() => onCreateSelectionsFromClasses(activeLayerId, activeProjectionId)}
                    title="Create a named selection for each class label"
                    style={{
                      ...compactButtonStyle,
                      flex: 1,
                      background: '#3b82f6',
                      color: '#fff',
                    }}
                  >
                    Selections
                  </button>
                )}
                {onCreateBarycentersFromClasses && activeLayerId && activeProjectionId && (
                  <button
                    onClick={() => onCreateBarycentersFromClasses(activeLayerId, activeProjectionId)}
                    title="Create a barycenter (centroid) for each class label"
                    style={{
                      ...compactButtonStyle,
                      flex: 1,
                      background: '#8b5cf6',
                      color: '#fff',
                    }}
                  >
                    Barycenters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
