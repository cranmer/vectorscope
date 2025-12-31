import { useState, useEffect } from 'react';
import type { Layer, Projection, Transformation } from '../types';

interface ConfigPanelProps {
  selectedNodeId: string | null;
  selectedNodeType: 'layer' | 'transformation' | 'projection' | null;
  layers: Layer[];
  projections: Projection[];
  transformations: Transformation[];
  onAddView: (layerId: string, type: 'pca' | 'tsne' | 'umap' | 'direct' | 'histogram' | 'boxplot', name: string) => void;
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
  onAddView: (layerId: string, type: 'pca' | 'tsne' | 'umap' | 'direct' | 'histogram' | 'boxplot', name: string) => void;
  onAddTransformation: (sourceLayerId: string, type: 'scaling' | 'rotation', name: string) => void;
  onUpdate: (updates: { name?: string; feature_columns?: string[]; label_column?: string | null }) => void;
  onRemoveProjection?: (id: string) => void;
}

function LayerConfig({ layer, projections, hasOutgoingTransformation, onAddView, onAddTransformation, onUpdate, onRemoveProjection }: LayerConfigProps) {
  const [newViewType, setNewViewType] = useState<'pca' | 'tsne' | 'umap' | 'direct' | 'histogram' | 'boxplot'>('pca');
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
            onChange={(e) => setNewViewType(e.target.value as 'pca' | 'tsne' | 'umap' | 'direct' | 'histogram' | 'boxplot')}
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
            <option value="umap">UMAP</option>
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
    pca: '#e74c3c',
  };
  const color = colors[transformation.type] || '#666';

  // Extract parameters
  const params = transformation.parameters as Record<string, unknown>;
  const scaleFactors = params.scale_factors as number[] | undefined;
  const angle = params.angle as number | undefined;
  const numAxes = (params.num_axes as number) ?? 4; // Default to 4 axes

  // Local state for sliders (for immediate visual feedback)
  const [localScaleFactors, setLocalScaleFactors] = useState<number[]>(
    scaleFactors && scaleFactors.length > 0 ? [...scaleFactors] : Array(numAxes).fill(1.0)
  );
  const [localAngle, setLocalAngle] = useState(angle !== undefined ? (angle * 180) / Math.PI : 0);
  const [linkAxes, setLinkAxes] = useState(true);

  // Sync local state when transformation changes (using useEffect)
  useEffect(() => {
    if (scaleFactors && scaleFactors.length > 0) {
      setLocalScaleFactors([...scaleFactors]);
    }
  }, [JSON.stringify(scaleFactors)]);

  useEffect(() => {
    if (angle !== undefined) {
      setLocalAngle((angle * 180) / Math.PI);
    }
  }, [angle]);

  const handleScaleChange = (axisIndex: number, value: number) => {
    if (linkAxes) {
      // When linked, update all axes to the same value
      const newFactors = localScaleFactors.map(() => value);
      setLocalScaleFactors(newFactors);
    } else {
      const newFactors = [...localScaleFactors];
      newFactors[axisIndex] = value;
      setLocalScaleFactors(newFactors);
    }
  };

  const handleScaleCommit = () => {
    onUpdate({ parameters: { ...params, scale_factors: localScaleFactors } });
  };

  const handleAddAxis = () => {
    const newFactors = [...localScaleFactors, 1.0];
    setLocalScaleFactors(newFactors);
    onUpdate({ parameters: { ...params, scale_factors: newFactors, num_axes: newFactors.length } });
  };

  const handleRemoveAxis = () => {
    if (localScaleFactors.length > 1) {
      const newFactors = localScaleFactors.slice(0, -1);
      setLocalScaleFactors(newFactors);
      onUpdate({ parameters: { ...params, scale_factors: newFactors, num_axes: newFactors.length } });
    }
  };

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
      defaultParams = { scale_factors: [1.0, 1.0, 1.0, 1.0], num_axes: 4 };
    } else if (newType === 'rotation') {
      defaultParams = { angle: 0, dims: [0, 1] };
    } else if (newType === 'pca') {
      defaultParams = { n_components: null, center: true, whiten: false };
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
              <option value="pca">PCA</option>
            </select>
          </label>
        </div>
        <div><strong>Invertible:</strong> {transformation.is_invertible ? 'Yes' : 'No'}</div>
      </div>

      {/* Parameters */}
      <div style={{ borderTop: '1px solid #3a3a5e', paddingTop: 12 }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>PARAMETERS</div>

        {transformation.type === 'scaling' && (
          <div style={{ fontSize: 12, color: '#aaa', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={linkAxes}
                  onChange={(e) => setLinkAxes(e.target.checked)}
                />
                <span style={{ fontSize: 11 }}>Link axes</span>
              </label>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <button
                  onClick={handleRemoveAxis}
                  disabled={localScaleFactors.length <= 1}
                  style={{
                    padding: '2px 8px',
                    background: '#3a3a5e',
                    color: localScaleFactors.length <= 1 ? '#555' : '#aaa',
                    border: 'none',
                    borderRadius: 3,
                    cursor: localScaleFactors.length <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  −
                </button>
                <button
                  onClick={handleAddAxis}
                  style={{
                    padding: '2px 8px',
                    background: '#3a3a5e',
                    color: '#aaa',
                    border: 'none',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {localScaleFactors.map((factor, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 50, fontSize: 11 }}>Axis {i}:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.05"
                    value={factor}
                    onChange={(e) => handleScaleChange(i, parseFloat(e.target.value))}
                    onPointerUp={handleScaleCommit}
                    onKeyUp={(e) => (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && handleScaleCommit()}
                    style={{ flex: 1 }}
                  />
                  <span style={{ minWidth: 35, fontSize: 11 }}>{factor.toFixed(2)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {transformation.type === 'rotation' && (
          <div style={{ fontSize: 12, color: '#aaa', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Rotation Plane:</span>
              <select
                value={(params.dims as number[])?.[0] ?? 0}
                onChange={(e) => {
                  const dims = params.dims as number[] ?? [0, 1];
                  onUpdate({ parameters: { ...params, dims: [parseInt(e.target.value), dims[1]] } });
                }}
                style={{
                  padding: '4px 6px',
                  background: '#1a1a2e',
                  border: '1px solid #3a3a5e',
                  borderRadius: 4,
                  color: '#aaa',
                  fontSize: 11,
                }}
              >
                {Array.from({ length: 20 }, (_, i) => (
                  <option key={i} value={i}>Dim {i}</option>
                ))}
              </select>
              <span>×</span>
              <select
                value={(params.dims as number[])?.[1] ?? 1}
                onChange={(e) => {
                  const dims = params.dims as number[] ?? [0, 1];
                  onUpdate({ parameters: { ...params, dims: [dims[0], parseInt(e.target.value)] } });
                }}
                style={{
                  padding: '4px 6px',
                  background: '#1a1a2e',
                  border: '1px solid #3a3a5e',
                  borderRadius: 4,
                  color: '#aaa',
                  fontSize: 11,
                }}
              >
                {Array.from({ length: 20 }, (_, i) => (
                  <option key={i} value={i}>Dim {i}</option>
                ))}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Angle:</span>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={localAngle}
                onChange={(e) => setLocalAngle(parseFloat(e.target.value))}
                onPointerUp={() => onUpdate({ parameters: { ...params, angle: (localAngle * Math.PI) / 180 } })}
                onKeyUp={(e) => e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? onUpdate({ parameters: { ...params, angle: (localAngle * Math.PI) / 180 } }) : null}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: 35 }}>{Math.round(localAngle)}°</span>
            </label>
          </div>
        )}

        {transformation.type === 'pca' && (
          <div style={{ fontSize: 12, color: '#aaa', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <strong>PCA Transformation</strong>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                Transforms data to principal component coordinates
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={(params.center as boolean) ?? true}
                onChange={(e) => onUpdate({ parameters: { ...params, center: e.target.checked } })}
              />
              <span>Center data</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={(params.whiten as boolean) ?? false}
                onChange={(e) => onUpdate({ parameters: { ...params, whiten: e.target.checked } })}
              />
              <span>Whiten output</span>
            </label>
            {Array.isArray(params._explained_variance_ratio) && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Explained Variance:</div>
                {(params._explained_variance_ratio as number[]).slice(0, 5).map((v: number, i: number) => (
                  <div key={i} style={{ fontSize: 10, color: '#666' }}>
                    PC{i + 1}: {(v * 100).toFixed(1)}%
                  </div>
                ))}
              </div>
            )}
          </div>
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
    umap: '#1abc9c',
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
