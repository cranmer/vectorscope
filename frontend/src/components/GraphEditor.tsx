import { useMemo } from 'react';
import type { Layer, Projection, Transformation } from '../types';

interface GraphEditorProps {
  layers: Layer[];
  projections: Projection[];
  transformations: Transformation[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null, nodeType: 'layer' | 'transformation' | 'projection') => void;
}

interface GraphNode {
  id: string;
  type: 'layer' | 'transformation';
  data: Layer | Transformation;
  projections: Projection[];
}

export function GraphEditor({
  layers,
  projections,
  transformations,
  selectedNodeId,
  onSelectNode,
}: GraphEditorProps) {
  // Build linear graph: find the chain from source layer down
  const graphNodes = useMemo(() => {
    const nodes: GraphNode[] = [];

    // Create lookup maps
    const layerById = new Map(layers.map(l => [l.id, l]));
    const transformBySource = new Map<string, Transformation>();
    const transformByTarget = new Map<string, Transformation>();

    transformations.forEach(t => {
      transformBySource.set(t.source_layer_id, t);
      if (t.target_layer_id) {
        transformByTarget.set(t.target_layer_id, t);
      }
    });

    // Find source layer (not derived)
    const sourceLayer = layers.find(l => !l.is_derived);
    if (!sourceLayer) return nodes;

    // Build linear chain
    let currentLayer: Layer | undefined = sourceLayer;
    while (currentLayer) {
      // Add layer node with its projections
      const layerProjections = projections.filter(p => p.layer_id === currentLayer!.id);
      nodes.push({
        id: currentLayer.id,
        type: 'layer',
        data: currentLayer,
        projections: layerProjections,
      });

      // Find transformation from this layer
      const transform = transformBySource.get(currentLayer.id);
      if (transform) {
        nodes.push({
          id: transform.id,
          type: 'transformation',
          data: transform,
          projections: [],
        });

        // Get target layer
        if (transform.target_layer_id) {
          currentLayer = layerById.get(transform.target_layer_id);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return nodes;
  }, [layers, projections, transformations]);

  const handleNodeClick = (nodeId: string, nodeType: 'layer' | 'transformation') => {
    onSelectNode(selectedNodeId === nodeId ? null : nodeId, nodeType);
  };

  const handleProjectionClick = (projectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode(selectedNodeId === projectionId ? null : projectionId, 'projection');
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#0d1117',
      borderRadius: 8,
      padding: 24,
      overflow: 'auto',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}>
        {graphNodes.map((node, index) => (
          <div key={node.id}>
            {/* Connector line from previous node */}
            {index > 0 && (
              <div style={{
                width: 2,
                height: 20,
                background: '#3a3a5e',
                margin: '0 auto',
              }} />
            )}

            {node.type === 'layer' ? (
              <LayerRow
                layer={node.data as Layer}
                projections={node.projections}
                isSelected={selectedNodeId === node.id}
                selectedProjectionId={selectedNodeId}
                onClick={() => handleNodeClick(node.id, 'layer')}
                onProjectionClick={handleProjectionClick}
              />
            ) : (
              <TransformationBox
                transformation={node.data as Transformation}
                isSelected={selectedNodeId === node.id}
                onClick={() => handleNodeClick(node.id, 'transformation')}
              />
            )}
          </div>
        ))}

        {graphNodes.length === 0 && (
          <div style={{ color: '#666', padding: 40 }}>
            No layers yet. Load a scenario or create a synthetic dataset.
          </div>
        )}
      </div>
    </div>
  );
}

interface LayerRowProps {
  layer: Layer;
  projections: Projection[];
  isSelected: boolean;
  selectedProjectionId: string | null;
  onClick: () => void;
  onProjectionClick: (id: string, e: React.MouseEvent) => void;
}

function LayerRow({
  layer,
  projections,
  isSelected,
  selectedProjectionId,
  onClick,
  onProjectionClick
}: LayerRowProps) {
  const borderColor = layer.is_derived ? '#4a9eff' : '#4a9';
  const bgColor = layer.is_derived ? '#1e3a5f' : '#2d5a27';

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {/* Left spacer for center alignment */}
      <div style={{ width: 200, display: 'flex', justifyContent: 'flex-end' }}>
        {/* Empty - balances the views on the right */}
      </div>

      {/* Layer box - fixed width for alignment */}
      <div
        onClick={onClick}
        style={{
          padding: '12px 20px',
          borderRadius: 8,
          background: bgColor,
          border: `2px solid ${isSelected ? '#fff' : borderColor}`,
          color: '#fff',
          cursor: 'pointer',
          width: 160,
          textAlign: 'center',
          transition: 'border-color 0.15s',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{layer.name}</div>
        <div style={{ fontSize: 11, color: '#aaa' }}>
          {layer.point_count.toLocaleString()} pts · {layer.dimensionality}D
        </div>
      </div>

      {/* Views to the right */}
      <div style={{ width: 200, display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
        {projections.length > 0 && (
          <>
            <div style={{
              width: 20,
              height: 2,
              background: '#3a3a5e',
            }} />
            {projections.map(proj => (
              <ProjectionBox
                key={proj.id}
                projection={proj}
                isSelected={selectedProjectionId === proj.id}
                onClick={(e) => onProjectionClick(proj.id, e)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

interface TransformationBoxProps {
  transformation: Transformation;
  isSelected: boolean;
  onClick: () => void;
}

function TransformationBox({ transformation, isSelected, onClick }: TransformationBoxProps) {
  const colors: Record<string, string> = {
    scaling: '#9b59b6',
    rotation: '#e67e22',
    affine: '#3498db',
    linear: '#1abc9c',
  };
  const color = colors[transformation.type] || '#666';

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {/* Left spacer for center alignment */}
      <div style={{ width: 200 }} />

      {/* Transformation box - fixed width for alignment */}
      <div
        onClick={onClick}
        style={{
          padding: '10px 16px',
          borderRadius: 6,
          background: '#2a2a4e',
          border: `2px solid ${isSelected ? '#fff' : color}`,
          color: '#fff',
          cursor: 'pointer',
          width: 160,
          textAlign: 'center',
          transition: 'border-color 0.15s',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13 }}>{transformation.name}</div>
        <div style={{ fontSize: 10, color, textTransform: 'uppercase', marginTop: 2 }}>
          {transformation.type}
        </div>
      </div>

      {/* Right spacer */}
      <div style={{ width: 200 }} />
    </div>
  );
}

interface ProjectionBoxProps {
  projection: Projection;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}

function ProjectionBox({ projection, isSelected, onClick }: ProjectionBoxProps) {
  const colors: Record<string, string> = {
    pca: '#4a9eff',
    tsne: '#9b59b6',
    custom_axes: '#e67e22',
  };
  const color = colors[projection.type] || '#666';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '8px 12px',
        borderRadius: 6,
        background: '#1a1a2e',
        border: `2px solid ${isSelected ? '#fff' : color}`,
        color: '#fff',
        cursor: 'pointer',
        minWidth: 80,
        textAlign: 'center',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ fontWeight: 500, fontSize: 12 }}>{projection.name}</div>
      <div style={{ fontSize: 9, color, textTransform: 'uppercase', marginTop: 2 }}>
        {projection.type}
      </div>
    </div>
  );
}
