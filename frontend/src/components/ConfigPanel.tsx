import { useState } from 'react';
import type { Layer, Projection, Transformation } from '../types';

interface ConfigPanelProps {
  selectedNodeId: string | null;
  selectedNodeType: 'layer' | 'transformation' | 'projection' | null;
  layers: Layer[];
  projections: Projection[];
  transformations: Transformation[];
  onAddView: (layerId: string, type: 'pca' | 'tsne' | 'direct' | 'histogram' | 'boxplot', name: string) => void;
  onAddTransformation: (sourceLayerId: string, type: 'scaling' | 'rotation', name: string) => void;
  onUpdateTransformation: (id: string, updates: { name?: string; type?: string; parameters?: Record<string, unknown> }) => void;
  onUpdateLayer: (id: string, updates: { name?: string; feature_columns?: string[]; label_column?: string | null }) => void;
  onUpdateProjection: (id: string, updates: { name?: string }) => void;
  onRemoveProjection?: (id: string) => void;
  onOpenViewEditor?: (projectionId: string) => void;
}

export function ConfigPanel({
  selectedNodeId,
  selectedNodeType,
  layers,
  projections,
  transformations,
  onAddView,
  onAddTransformation,
  onUpdateTransformation,
  onUpdateLayer,
  onUpdateProjection,
  onRemoveProjection,
  onOpenViewEditor,
}: ConfigPanelProps) {
  // Find selected item
  const selectedLayer = selectedNodeType === 'layer'
    ? layers.find(l => l.id === selectedNodeId)
    : null;

  const selectedTransformation = selectedNodeType === 'transformation'
    ? transformations.find(t => t.id === selectedNodeId)
    : null;

  const selectedProjection = selectedNodeType === 'projection'
    ? projections.find(p => p.id === selectedNodeId)
    : null;

  return (
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
        Configuration
      </h3>

      {!selectedNodeId && (
        <div style={{ color: '#666', fontSize: 13 }}>
          Select a layer, transformation, or view to configure it.
        </div>
      )}

      {selectedLayer && (
        <LayerConfig
          layer={selectedLayer}
          projections={projections.filter(p => p.layer_id === selectedLayer.id && !p.temporary)}
          hasOutgoingTransformation={transformations.some(t => t.source_layer_id === selectedLayer.id)}
          onAddView={onAddView}
          onAddTransformation={onAddTransformation}
          onUpdate={(updates) => onUpdateLayer(selectedLayer.id, updates)}
          onRemoveProjection={onRemoveProjection}
        />
      )}

      {selectedTransformation && (
        <TransformationConfig
          transformation={selectedTransformation}
          onUpdate={(params) => onUpdateTransformation(selectedTransformation.id, params)}
        />
      )}

      {selectedProjection && (
        <ProjectionConfig
          projection={selectedProjection}
          onUpdate={(updates) => onUpdateProjection(selectedProjection.id, updates)}
          onOpenViewEditor={onOpenViewEditor ? () => onOpenViewEditor(selectedProjection.id) : undefined}
          onDelete={onRemoveProjection ? () => onRemoveProjection(selectedProjection.id) : undefined}
        />
      )}
    </div>
  );
}

interface LayerConfigProps {
  layer: Layer;
  projections: Projection[];
  hasOutgoingTransformation: boolean;
  onAddView: (layerId: string, type: 'pca' | 'tsne' | 'direct' | 'histogram' | 'boxplot', name: string) => void;
  onAddTransformation: (sourceLayerId: string, type: 'scaling' | 'rotation', name: string) => void;
  onUpdate: (updates: { name?: string; feature_columns?: string[]; label_column?: string | null }) => void;
  onRemoveProjection?: (id: string) => void;
}

function LayerConfig({ layer, projections, hasOutgoingTransformation, onAddView, onAddTransformation, onUpdate, onRemoveProjection }: LayerConfigProps) {
  const [newViewType, setNewViewType] = useState<'pca' | 'tsne' | 'direct' | 'histogram' | 'boxplot'>('pca');
  const [newViewName, setNewViewName] = useState('');
  const [newTransformType, setNewTransformType] = useState<'scaling' | 'rotation'>('scaling');
  const [newTransformName, setNewTransformName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(layer.name);
  const [viewsExpanded, setViewsExpanded] = useState(false);

  // Column configuration state
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
    new Set(layer.feature_columns || [])
  );
  const [selectedLabel, setSelectedLabel] = useState<string | null>(layer.label_column);

  const handleNameSubmit = () => {
    if (nameValue.trim() && nameValue !== layer.name) {
      onUpdate({ name: nameValue.trim() });
    }
    setEditingName(false);
  };

  const handleAddView = () => {
    const name = newViewName.trim() || `${newViewType.toUpperCase()}_${layer.name}`;
    onAddView(layer.id, newViewType, name);
    setNewViewName('');
  };

  const handleAddTransformation = () => {
    const name = newTransformName.trim() || newTransformType;
    onAddTransformation(layer.id, newTransformType, name);
    setNewTransformName('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '8px 12px',
        background: layer.is_derived ? '#1e3a5f' : '#2d5a27',
        borderRadius: 6,
        borderLeft: `3px solid ${layer.is_derived ? '#4a9eff' : '#4a9'}`,
      }}>
        {editingName ? (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            autoFocus
            style={{
              fontWeight: 600,
              color: '#fff',
              background: 'transparent',
              border: '1px solid #4a9eff',
              borderRadius: 4,
              padding: '2px 6px',
              width: '100%',
              marginBottom: 4,
            }}
          />
        ) : (
          <div
            style={{ fontWeight: 600, color: '#fff', marginBottom: 4, cursor: 'pointer' }}
            onClick={() => setEditingName(true)}
            title="Click to edit name"
          >
            {layer.name}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#aaa' }}>
          {layer.is_derived ? 'Derived Layer' : 'Source Layer'}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#aaa' }}>
        <div><strong>Points:</strong> {layer.point_count.toLocaleString()}</div>
        <div><strong>Dimensions:</strong> {layer.dimensionality}</div>
      </div>

      {/* Column Configuration for CSV data */}
      {layer.column_names && layer.column_names.length > 0 && !layer.is_derived && (
        <div style={{ borderTop: '1px solid #3a3a5e', paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>COLUMN CONFIGURATION</div>

          {/* Label Column Selector */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>
              Label Column:
            </label>
            <select
              value={selectedLabel || ''}
              onChange={(e) => setSelectedLabel(e.target.value || null)}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: '#1a1a2e',
                border: '1px solid #3a3a5e',
                borderRadius: 4,
                color: '#aaa',
                fontSize: 12,
              }}
            >
              <option value="">None</option>
              {layer.column_names.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* Feature Columns Selector */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>
              Feature Columns ({selectedFeatures.size} selected):
            </label>
            <div style={{
              maxHeight: 120,
              overflowY: 'auto',
              background: '#1a1a2e',
              borderRadius: 4,
              padding: 8,
              border: '1px solid #3a3a5e',
            }}>
              {layer.column_names.map((col) => (
                <label
                  key={col}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    color: selectedFeatures.has(col) ? '#fff' : '#888',
                    padding: '2px 0',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedFeatures.has(col)}
                    onChange={(e) => {
                      const newSet = new Set(selectedFeatures);
                      if (e.target.checked) {
                        newSet.add(col);
                      } else {
                        newSet.delete(col);
                      }
                      setSelectedFeatures(newSet);
                    }}
                    style={{ accentColor: '#4a9eff' }}
                  />
                  {col}
                </label>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <button
            onClick={() => {
              // Pass null explicitly when no label column is selected
              onUpdate({
                feature_columns: Array.from(selectedFeatures),
                label_column: selectedLabel,  // null means no label column
              });
            }}
            disabled={selectedFeatures.size === 0}
            style={{
              padding: '8px 12px',
              background: selectedFeatures.size > 0 ? '#4a9eff' : '#3a3a5e',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: selectedFeatures.size > 0 ? 'pointer' : 'not-allowed',
              fontSize: 12,
              width: '100%',
            }}
          >
            Apply Column Configuration
          </button>
        </div>
      )}

      {projections.length > 0 && (
        <div>
          <div
            onClick={() => setViewsExpanded(!viewsExpanded)}
            style={{
              fontSize: 11,
              color: '#888',
              marginBottom: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              userSelect: 'none',
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: viewsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}>▶</span>
            VIEWS ({projections.length})
          </div>
          {viewsExpanded && projections.map(p => (
            <div
              key={p.id}
              style={{
                fontSize: 12,
                color: '#aaa',
                padding: '4px 8px',
                background: '#1a1a2e',
                borderRadius: 4,
                marginBottom: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {p.name} <span style={{ color: '#666' }}>({p.type})</span>
              </span>
              {onRemoveProjection && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remove view "${p.name}"?`)) {
                      onRemoveProjection(p.id);
                    }
                  }}
                  style={{
                    background: '#5a2a2a',
                    color: '#ff6b6b',
                    border: 'none',
                    borderRadius: 3,
                    padding: '2px 6px',
                    fontSize: 10,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid #3a3a5e', paddingTop: 12 }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>ADD VIEW</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            placeholder="View name (optional)"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            style={{
              padding: '8px 10px',
              background: '#1a1a2e',
              border: '1px solid #3a3a5e',
              borderRadius: 4,
              color: '#fff',
              fontSize: 12,
            }}
          />

          <select
            value={newViewType}
            onChange={(e) => setNewViewType(e.target.value as 'pca' | 'tsne' | 'direct' | 'histogram' | 'boxplot')}
            style={{
              padding: '8px 10px',
              background: '#1a1a2e',
              border: '1px solid #3a3a5e',
              borderRadius: 4,
              color: '#aaa',
              fontSize: 12,
            }}
          >
            <option value="pca">PCA</option>
            <option value="tsne">t-SNE</option>
            <option value="direct">Direct Axes</option>
            <option value="histogram">Histogram</option>
            <option value="boxplot">Box Plot</option>
          </select>

          <button
            onClick={handleAddView}
            style={{
              padding: '8px 12px',
              background: '#4a9eff',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Add View
          </button>
        </div>
      </div>

      {/* Add Transformation - only show if layer has no outgoing transformation */}
      {!hasOutgoingTransformation && (
        <div style={{ borderTop: '1px solid #3a3a5e', paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>ADD TRANSFORMATION</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="text"
              placeholder="Transform name (optional)"
              value={newTransformName}
              onChange={(e) => setNewTransformName(e.target.value)}
              style={{
                padding: '8px 10px',
                background: '#1a1a2e',
                border: '1px solid #3a3a5e',
                borderRadius: 4,
                color: '#fff',
                fontSize: 12,
              }}
            />

            <select
              value={newTransformType}
              onChange={(e) => setNewTransformType(e.target.value as 'scaling' | 'rotation')}
              style={{
                padding: '8px 10px',
                background: '#1a1a2e',
                border: '1px solid #3a3a5e',
                borderRadius: 4,
                color: '#aaa',
                fontSize: 12,
              }}
            >
              <option value="scaling">Scaling</option>
              <option value="rotation">Rotation</option>
            </select>

            <button
              onClick={handleAddTransformation}
              style={{
                padding: '8px 12px',
                background: '#9b59b6',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Add Transformation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface TransformationConfigProps {
  transformation: Transformation;
  onUpdate: (updates: { name?: string; type?: string; parameters?: Record<string, unknown> }) => void;
}

function TransformationConfig({ transformation, onUpdate }: TransformationConfigProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(transformation.name);

  const colors: Record<string, string> = {
    scaling: '#9b59b6',
    rotation: '#e67e22',
    affine: '#3498db',
    linear: '#1abc9c',
  };
  const color = colors[transformation.type] || '#666';

  // Extract parameters
  const params = transformation.parameters as Record<string, unknown>;
  const scaleFactors = params.scale_factors as number[] | undefined;
  const angle = params.angle as number | undefined;

  // Local state for sliders (for immediate visual feedback)
  const [localScale, setLocalScale] = useState(scaleFactors?.[0] ?? 1.0);
  const [localAngle, setLocalAngle] = useState(angle !== undefined ? (angle * 180) / Math.PI : 0);

  // Sync local state when transformation changes
  if (scaleFactors && scaleFactors[0] !== localScale && !document.activeElement?.matches('input[type="range"]')) {
    setLocalScale(scaleFactors[0]);
  }
  if (angle !== undefined) {
    const angleDeg = (angle * 180) / Math.PI;
    if (angleDeg !== localAngle && !document.activeElement?.matches('input[type="range"]')) {
      setLocalAngle(angleDeg);
    }
  }

  const handleNameSubmit = () => {
    if (nameValue.trim() && nameValue !== transformation.name) {
      onUpdate({ name: nameValue.trim() });
    }
    setEditingName(false);
  };

  const handleTypeChange = (newType: string) => {
    // Set default parameters for the new type
    let defaultParams: Record<string, unknown> = {};
    if (newType === 'scaling') {
      defaultParams = { scale_factors: [1.0] };
    } else if (newType === 'rotation') {
      defaultParams = { angle: 0, dims: [0, 1] };
    }
    onUpdate({ type: newType, parameters: defaultParams });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '8px 12px',
        background: '#2a2a4e',
        borderRadius: 6,
        borderLeft: `3px solid ${color}`,
      }}>
        {editingName ? (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            autoFocus
            style={{
              fontWeight: 600,
              color: '#fff',
              background: 'transparent',
              border: '1px solid #4a9eff',
              borderRadius: 4,
              padding: '2px 6px',
              width: '100%',
              marginBottom: 4,
            }}
          />
        ) : (
          <div
            style={{ fontWeight: 600, color: '#fff', marginBottom: 4, cursor: 'pointer' }}
            onClick={() => setEditingName(true)}
            title="Click to edit name"
          >
            {transformation.name}
          </div>
        )}
        <div style={{ fontSize: 11, color, textTransform: 'uppercase' }}>
          {transformation.type}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#aaa' }}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span><strong>Type:</strong></span>
            <select
              value={transformation.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              style={{
                padding: '4px 8px',
                background: '#1a1a2e',
                border: '1px solid #3a3a5e',
                borderRadius: 4,
                color: '#aaa',
                fontSize: 12,
              }}
            >
              <option value="scaling">Scaling</option>
              <option value="rotation">Rotation</option>
              <option value="affine">Affine</option>
              <option value="linear">Linear</option>
            </select>
          </label>
        </div>
        <div><strong>Invertible:</strong> {transformation.is_invertible ? 'Yes' : 'No'}</div>
      </div>

      {/* Parameters */}
      <div style={{ borderTop: '1px solid #3a3a5e', paddingTop: 12 }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>PARAMETERS</div>

        {transformation.type === 'scaling' && scaleFactors && (
          <div style={{ fontSize: 12, color: '#aaa' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Scale:</span>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={localScale}
                onChange={(e) => setLocalScale(parseFloat(e.target.value))}
                onPointerUp={() => onUpdate({ parameters: { scale_factors: [localScale] } })}
                onKeyUp={(e) => e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? onUpdate({ parameters: { scale_factors: [localScale] } }) : null}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: 35 }}>{localScale.toFixed(2)}</span>
            </label>
          </div>
        )}

        {transformation.type === 'rotation' && angle !== undefined && (
          <div style={{ fontSize: 12, color: '#aaa' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Angle:</span>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={localAngle}
                onChange={(e) => setLocalAngle(parseFloat(e.target.value))}
                onPointerUp={() => onUpdate({ parameters: { angle: (localAngle * Math.PI) / 180 } })}
                onKeyUp={(e) => e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? onUpdate({ parameters: { angle: (localAngle * Math.PI) / 180 } }) : null}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: 35 }}>{Math.round(localAngle)}°</span>
            </label>
          </div>
        )}

        {transformation.type !== 'scaling' && transformation.type !== 'rotation' && (
          <pre style={{ fontSize: 10, color: '#666', margin: 0, overflow: 'auto' }}>
            {JSON.stringify(params, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

interface ProjectionConfigProps {
  projection: Projection;
  onUpdate: (updates: { name?: string }) => void;
  onOpenViewEditor?: () => void;
  onDelete?: () => void;
}

function ProjectionConfig({ projection, onUpdate, onOpenViewEditor, onDelete }: ProjectionConfigProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(projection.name);

  const colors: Record<string, string> = {
    pca: '#4a9eff',
    tsne: '#9b59b6',
    custom_axes: '#e67e22',
  };
  const color = colors[projection.type] || '#666';

  const handleNameSubmit = () => {
    if (nameValue.trim() && nameValue !== projection.name) {
      onUpdate({ name: nameValue.trim() });
    }
    setEditingName(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '8px 12px',
        background: '#1a1a2e',
        borderRadius: 6,
        borderLeft: `3px solid ${color}`,
      }}>
        {editingName ? (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            autoFocus
            style={{
              fontWeight: 600,
              color: '#fff',
              background: 'transparent',
              border: '1px solid #4a9eff',
              borderRadius: 4,
              padding: '2px 6px',
              width: '100%',
              marginBottom: 4,
            }}
          />
        ) : (
          <div
            style={{ fontWeight: 600, color: '#fff', marginBottom: 4, cursor: 'pointer' }}
            onClick={() => setEditingName(true)}
            title="Click to edit name"
          >
            {projection.name}
          </div>
        )}
        <div style={{ fontSize: 11, color, textTransform: 'uppercase' }}>
          {projection.type}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#aaa' }}>
        <div><strong>Type:</strong> {projection.type}</div>
        <div><strong>Dimensions:</strong> {projection.dimensions}</div>
        {projection.random_seed && (
          <div><strong>Seed:</strong> {projection.random_seed}</div>
        )}
      </div>

      {onOpenViewEditor && (
        <button
          onClick={onOpenViewEditor}
          style={{
            marginTop: 12,
            padding: '10px 16px',
            background: '#4a9eff',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            width: '100%',
          }}
        >
          Show View
        </button>
      )}

      {onDelete && (
        <button
          onClick={() => {
            if (confirm(`Delete view "${projection.name}"?`)) {
              onDelete();
            }
          }}
          style={{
            marginTop: 8,
            padding: '10px 16px',
            background: '#5a2a2a',
            color: '#ff6b6b',
            border: '1px solid #ff4444',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            width: '100%',
          }}
        >
          Delete View
        </button>
      )}
    </div>
  );
}
