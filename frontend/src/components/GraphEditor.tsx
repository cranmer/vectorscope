import { useMemo, useState } from 'react';
import type { Layer, Projection, Transformation } from '../types';

type ViewType = 'pca' | 'tsne' | 'umap' | 'custom_axes' | 'direct' | 'density' | 'boxplot' | 'violin';
type TransformType = 'scaling' | 'rotation' | 'pca' | 'custom_axes' | 'custom_affine';

interface GraphEditorProps {
  layers: Layer[];
  projections: Projection[];
  transformations: Transformation[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null, nodeType: 'layer' | 'transformation' | 'projection') => void;
  onAddTransformation?: (sourceLayerId: string, type: TransformType, name: string) => void;
  onAddView?: (layerId: string, type: ViewType, name: string, dimensions?: number) => void;
  onOpenViewEditor?: (projectionId: string) => void;
  onDeleteView?: (projectionId: string) => void;
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
  onAddTransformation,
  onAddView,
  onOpenViewEditor,
  onDeleteView,
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
      // Add layer node with its projections (excluding temporary ones)
      const layerProjections = projections.filter(p => p.layer_id === currentLayer!.id && !p.temporary);
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

  // Modal state for adding views/transformations
  const [showViewModal, setShowViewModal] = useState<string | null>(null); // layerId or null
  const [showTransformModal, setShowTransformModal] = useState<string | null>(null); // layerId or null

  const viewCategories: { category: string; views: { type: ViewType; label: string; color: string; dimensions: number }[] }[] = [
    {
      category: '1D',
      views: [
        { type: 'density', label: 'Density', color: '#e74c3c', dimensions: 1 },
        { type: 'boxplot', label: 'Box Plot', color: '#f39c12', dimensions: 1 },
        { type: 'violin', label: 'Violin', color: '#9b59b6', dimensions: 1 },
      ],
    },
    {
      category: '2D',
      views: [
        { type: 'direct', label: 'Direct Axes', color: '#2ecc71', dimensions: 2 },
        { type: 'custom_axes', label: 'Custom Axes', color: '#e67e22', dimensions: 2 },
        { type: 'pca', label: 'PCA', color: '#4a9eff', dimensions: 2 },
        { type: 'tsne', label: 't-SNE', color: '#9b59b6', dimensions: 2 },
        { type: 'umap', label: 'UMAP', color: '#1abc9c', dimensions: 2 },
      ],
    },
    {
      category: '3D',
      views: [
        { type: 'direct', label: 'Direct Axes 3D', color: '#2ecc71', dimensions: 3 },
        { type: 'pca', label: 'PCA 3D', color: '#4a9eff', dimensions: 3 },
      ],
    },
  ];

  const transformTypes: { type: TransformType; label: string; color: string }[] = [
    { type: 'scaling', label: 'Scaling', color: '#9b59b6' },
    { type: 'rotation', label: 'Rotation', color: '#e67e22' },
    { type: 'pca', label: 'PCA', color: '#e74c3c' },
    { type: 'custom_axes', label: 'Custom Axes', color: '#f39c12' },
    { type: 'custom_affine', label: 'Custom Affine', color: '#3498db' },
  ];

  const handleNodeClick = (nodeId: string, nodeType: 'layer' | 'transformation') => {
    onSelectNode(selectedNodeId === nodeId ? null : nodeId, nodeType);
  };

  const handleProjectionClick = (projectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode(selectedNodeId === projectionId ? null : projectionId, 'projection');
  };

  const handleAddViewType = (layerId: string, type: ViewType, label: string, dimensions: number) => {
    onAddView?.(layerId, type, label, dimensions);
    setShowViewModal(null);
  };

  const handleAddTransformType = (layerId: string, type: TransformType) => {
    const names: Record<TransformType, string> = {
      scaling: 'Scale', rotation: 'Rotate', pca: 'PCA', custom_axes: 'Custom Axes', custom_affine: 'Custom Affine',
    };
    onAddTransformation?.(layerId, type, names[type]);
    setShowTransformModal(null);
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#0d1117',
      borderRadius: 8,
      padding: 24,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {graphNodes.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          color: '#666',
          gap: 40,
        }}>
          <div style={{ textAlign: 'center', fontSize: 14 }}>
            No layers yet.<br />
            Load data, load scenario, or create a synthetic dataset.
          </div>
          <img src="/logo.svg" alt="VectorScope" style={{ height: 400 }} />
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 0,
          paddingLeft: 24,
        }}>
          {graphNodes.map((node, index) => (
            <div key={node.id}>
              {/* Connector line from previous node */}
              {index > 0 && (
                <div style={{
                  width: 2,
                  height: 20,
                  background: '#3a3a5e',
                  marginLeft: 80,  /* Center of the 160px wide box */
                }} />
              )}

              {node.type === 'layer' ? (() => {
                const layerData = node.data as Layer;
                const hasOutgoing = transformations.some(t => t.source_layer_id === layerData.id);
                return (
                  <LayerRow
                    layer={layerData}
                    projections={node.projections}
                    isSelected={selectedNodeId === node.id}
                    selectedProjectionId={selectedNodeId}
                    onClick={() => handleNodeClick(node.id, 'layer')}
                    onProjectionClick={handleProjectionClick}
                    onProjectionDoubleClick={onOpenViewEditor}
                    onDeleteView={onDeleteView}
                    hasOutgoingTransformation={hasOutgoing}
                    onAddTransformation={onAddTransformation ? () => setShowTransformModal(layerData.id) : undefined}
                    onAddView={onAddView ? () => setShowViewModal(layerData.id) : undefined}
                  />
                );
              })() : (
                <TransformationBox
                  transformation={node.data as Transformation}
                  isSelected={selectedNodeId === node.id}
                  onClick={() => handleNodeClick(node.id, 'transformation')}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add View Modal */}
      {showViewModal && (
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
          onClick={() => setShowViewModal(null)}
        >
          <div
            style={{
              background: '#16213e',
              padding: 24,
              borderRadius: 8,
              minWidth: 280,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', color: '#fff' }}>Add View</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {viewCategories.map(({ category, views }) => (
                <div key={category}>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>
                    {category}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {views.map(({ type, label, color, dimensions }) => (
                      <button
                        key={`${type}-${dimensions}`}
                        onClick={() => handleAddViewType(showViewModal, type, label, dimensions)}
                        style={{
                          padding: '8px 12px',
                          background: '#1a1a2e',
                          border: `2px solid ${color}`,
                          borderRadius: 6,
                          color: '#fff',
                          fontSize: 13,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowViewModal(null)}
              style={{
                marginTop: 16,
                padding: '8px 16px',
                background: '#3a3a5e',
                color: '#aaa',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Transformation Modal */}
      {showTransformModal && (
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
          onClick={() => setShowTransformModal(null)}
        >
          <div
            style={{
              background: '#16213e',
              padding: 24,
              borderRadius: 8,
              minWidth: 280,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', color: '#fff' }}>Add Transformation</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transformTypes.map(({ type, label, color }) => (
                <button
                  key={type}
                  onClick={() => handleAddTransformType(showTransformModal, type)}
                  style={{
                    padding: '10px 16px',
                    background: '#1a1a2e',
                    border: `2px solid ${color}`,
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 14,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTransformModal(null)}
              style={{
                marginTop: 16,
                padding: '8px 16px',
                background: '#3a3a5e',
                color: '#aaa',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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
  onProjectionDoubleClick?: (id: string) => void;
  onDeleteView?: (id: string) => void;
  hasOutgoingTransformation: boolean;
  onAddTransformation?: () => void;
  onAddView?: () => void;
}

function LayerRow({
  layer,
  projections,
  isSelected,
  selectedProjectionId,
  onClick,
  onProjectionClick,
  onProjectionDoubleClick,
  onDeleteView,
  hasOutgoingTransformation,
  onAddTransformation,
  onAddView,
}: LayerRowProps) {
  const borderColor = layer.is_derived ? '#4a9eff' : '#4a9';
  const bgColor = layer.is_derived ? '#1e3a5f' : '#2d5a27';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
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
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{layer.name}</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>
            {layer.point_count.toLocaleString()} pts · {layer.dimensionality}D
          </div>
        </div>

        {/* Views to the right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
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
                  onDoubleClick={() => onProjectionDoubleClick?.(proj.id)}
                  onDelete={onDeleteView ? () => onDeleteView(proj.id) : undefined}
                />
              ))}
            </>
          )}
          {/* Add view button */}
          {onAddView && (
            <>
              <div style={{
                width: 20,
                height: 2,
                background: '#3a3a5e',
              }} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddView();
                }}
                title="Add view"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#4a9eff',
                  border: '2px solid #3a7ed4',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                +
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add transformation button - show if no outgoing transformation */}
      {!hasOutgoingTransformation && onAddTransformation && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 164, marginLeft: 0 }}>
          <div style={{ width: 2, height: 12, background: '#3a3a5e' }} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddTransformation();
            }}
            title="Add transformation"
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#9b59b6',
              border: '2px solid #7b3d96',
              color: '#fff',
              fontSize: 16,
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              lineHeight: 1,
            }}
          >
            +
          </button>
          <div style={{ width: 2, height: 12, background: '#3a3a5e' }} />
        </div>
      )}
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
    </div>
  );
}

interface ProjectionBoxProps {
  projection: Projection;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  onDelete?: () => void;
}

function ProjectionBox({ projection, isSelected, onClick, onDoubleClick, onDelete }: ProjectionBoxProps) {
  const colors: Record<string, string> = {
    pca: '#4a9eff',
    tsne: '#9b59b6',
    umap: '#1abc9c',
    custom_axes: '#e67e22',
    direct: '#2ecc71',
    density: '#e74c3c',
    boxplot: '#f39c12',
    violin: '#9b59b6',
  };
  const color = colors[projection.type] || '#666';

  return (
    <div
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
      style={{
        position: 'relative',
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
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete view "${projection.name}"?`)) {
              onDelete();
            }
          }}
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#ff4444',
            border: 'none',
            color: '#fff',
            fontSize: 10,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          title="Delete view"
        >
          ×
        </button>
      )}
      <div style={{ fontWeight: 500, fontSize: 12 }}>{projection.name}</div>
      <div style={{ fontSize: 9, color, textTransform: 'uppercase', marginTop: 2 }}>
        {projection.type}
      </div>
    </div>
  );
}
