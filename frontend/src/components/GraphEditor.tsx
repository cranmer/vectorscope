import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { LayerNode, TransformNode, ViewportNode } from './nodes';
import type { Layer, Projection, Transformation } from '../types';

interface GraphEditorProps {
  layers: Layer[];
  projections: Projection[];
  transformations: Transformation[];
  onCreateTransformation: (
    sourceLayerId: string,
    type: 'scaling' | 'rotation',
    params: Record<string, number>
  ) => Promise<void>;
  onCreateProjection: (layerId: string, type: 'pca' | 'tsne') => Promise<void>;
}

const nodeTypes = {
  layer: LayerNode,
  transform: TransformNode,
  viewport: ViewportNode,
};

export function GraphEditor({
  layers,
  projections,
  transformations,
}: GraphEditorProps) {
  // Build nodes from data
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Layer nodes (left column)
    layers.forEach((layer, i) => {
      nodes.push({
        id: `layer-${layer.id}`,
        type: 'layer',
        position: { x: 50, y: 50 + i * 100 },
        data: {
          label: layer.name,
          layerId: layer.id,
          pointCount: layer.point_count,
          dimensionality: layer.dimensionality,
          isSource: !layer.is_derived,
        },
      });
    });

    // Transformation nodes (middle column)
    transformations.forEach((transform, i) => {
      nodes.push({
        id: `transform-${transform.id}`,
        type: 'transform',
        position: { x: 280, y: 50 + i * 120 },
        data: {
          label: transform.name,
          transformType: transform.type,
          parameters: transform.parameters as Record<string, number>,
        },
      });

      // Layer → Transformation edge
      edges.push({
        id: `e-layer-${transform.source_layer_id}-transform-${transform.id}`,
        source: `layer-${transform.source_layer_id}`,
        target: `transform-${transform.id}`,
        animated: true,
        style: { stroke: '#9b59b6' },
      });

      // Transformation → Target Layer edge
      if (transform.target_layer_id) {
        edges.push({
          id: `e-transform-${transform.id}-layer-${transform.target_layer_id}`,
          source: `transform-${transform.id}`,
          target: `layer-${transform.target_layer_id}`,
          animated: true,
          style: { stroke: '#9b59b6' },
        });
      }
    });

    // Viewport/Projection nodes (right column)
    projections.forEach((projection, i) => {
      nodes.push({
        id: `viewport-${projection.id}`,
        type: 'viewport',
        position: { x: 500, y: 50 + i * 100 },
        data: {
          label: projection.name,
          projectionType: projection.type,
          viewportId: projection.id,
        },
      });

      // Layer → Projection edge
      edges.push({
        id: `e-layer-${projection.layer_id}-viewport-${projection.id}`,
        source: `layer-${projection.layer_id}`,
        target: `viewport-${projection.id}`,
        animated: true,
        style: { stroke: '#4a9eff' },
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [layers, projections, transformations]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges]
  );

  return (
    <div style={{ width: '100%', height: '100%', background: '#0d1117', borderRadius: 8 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a4e" />
        <Controls
          style={{
            background: '#1a1a2e',
            border: '1px solid #3a3a5e',
            borderRadius: 4,
          }}
        />
        <MiniMap
          style={{
            background: '#1a1a2e',
            border: '1px solid #3a3a5e',
          }}
          nodeColor={(node) => {
            if (node.type === 'layer') return '#4a9eff';
            if (node.type === 'transform') return '#9b59b6';
            if (node.type === 'viewport') return '#4a9eff';
            return '#666';
          }}
        />
      </ReactFlow>
    </div>
  );
}
