import { useState } from 'react';
import type { Layer, Projection, Transformation } from '../types';

interface ConfigPanelProps {
  selectedNodeId: string | null;
  selectedNodeType: 'layer' | 'transformation' | 'projection' | null;
  layers: Layer[];
  projections: Projection[];
  transformations: Transformation[];
  onAddView: (layerId: string, type: 'pca' | 'tsne', name: string) => void;
  onUpdateTransformation?: (id: string, params: Record<string, unknown>) => void;
}

export function ConfigPanel({
  selectedNodeId,
  selectedNodeType,
  layers,
  projections,
  transformations,
  onAddView,
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
          projections={projections.filter(p => p.layer_id === selectedLayer.id)}
          onAddView={onAddView}
        />
      )}

      {selectedTransformation && (
        <TransformationConfig transformation={selectedTransformation} />
      )}

      {selectedProjection && (
        <ProjectionConfig projection={selectedProjection} />
      )}
    </div>
  );
}

interface LayerConfigProps {
  layer: Layer;
  projections: Projection[];
  onAddView: (layerId: string, type: 'pca' | 'tsne', name: string) => void;
}

function LayerConfig({ layer, projections, onAddView }: LayerConfigProps) {
  const [newViewType, setNewViewType] = useState<'pca' | 'tsne'>('pca');
  const [newViewName, setNewViewName] = useState('');

  const handleAddView = () => {
    const name = newViewName.trim() || `${newViewType.toUpperCase()}_${layer.name}`;
    onAddView(layer.id, newViewType, name);
    setNewViewName('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '8px 12px',
        background: layer.is_derived ? '#1e3a5f' : '#2d5a27',
        borderRadius: 6,
        borderLeft: `3px solid ${layer.is_derived ? '#4a9eff' : '#4a9'}`,
      }}>
        <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>{layer.name}</div>
        <div style={{ fontSize: 11, color: '#aaa' }}>
          {layer.is_derived ? 'Derived Layer' : 'Source Layer'}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#aaa' }}>
        <div><strong>Points:</strong> {layer.point_count.toLocaleString()}</div>
        <div><strong>Dimensions:</strong> {layer.dimensionality}</div>
      </div>

      {projections.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
            VIEWS ({projections.length})
          </div>
          {projections.map(p => (
            <div key={p.id} style={{
              fontSize: 12,
              color: '#aaa',
              padding: '4px 8px',
              background: '#1a1a2e',
              borderRadius: 4,
              marginBottom: 4,
            }}>
              {p.name} <span style={{ color: '#666' }}>({p.type})</span>
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
            onChange={(e) => setNewViewType(e.target.value as 'pca' | 'tsne')}
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
    </div>
  );
}

interface TransformationConfigProps {
  transformation: Transformation;
}

function TransformationConfig({ transformation }: TransformationConfigProps) {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '8px 12px',
        background: '#2a2a4e',
        borderRadius: 6,
        borderLeft: `3px solid ${color}`,
      }}>
        <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>{transformation.name}</div>
        <div style={{ fontSize: 11, color, textTransform: 'uppercase' }}>
          {transformation.type}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#aaa' }}>
        <div><strong>Type:</strong> {transformation.type}</div>
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
                value={scaleFactors[0]}
                disabled
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: 35 }}>{scaleFactors[0].toFixed(2)}</span>
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
                value={(angle * 180) / Math.PI}
                disabled
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: 35 }}>{Math.round((angle * 180) / Math.PI)}°</span>
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
}

function ProjectionConfig({ projection }: ProjectionConfigProps) {
  const colors: Record<string, string> = {
    pca: '#4a9eff',
    tsne: '#9b59b6',
    custom_axes: '#e67e22',
  };
  const color = colors[projection.type] || '#666';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '8px 12px',
        background: '#1a1a2e',
        borderRadius: 6,
        borderLeft: `3px solid ${color}`,
      }}>
        <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>{projection.name}</div>
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
    </div>
  );
}
