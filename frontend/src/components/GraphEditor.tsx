import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  BackgroundVariant,
} from '@xyflow/react';
import Dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';

import { LayerNode, TransformNode } from './nodes';
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
};

// Use dagre to compute a proper tree layout
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: direction,
    nodesep: 80,
    ranksep: 100,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: node.type === 'transform' ? 180 : 160,
      height: node.type === 'transform' ? 100 : 70
    });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    const width = node.type === 'transform' ? 180 : 160;
    const height = node.type === 'transform' ? 100 : 70;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function GraphEditor({
  layers,
  projections,
  transformations,
}: GraphEditorProps) {
  // Build transformation DAG (layers + transformations only, no projections)
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create a map of layer_id -> projections for that layer
    const layerProjections = new Map<string, Projection[]>();
    projections.forEach((p) => {
      const existing = layerProjections.get(p.layer_id) || [];
      existing.push(p);
      layerProjections.set(p.layer_id, existing);
    });

    // Add layer nodes
    layers.forEach((layer) => {
      const layerProjs = layerProjections.get(layer.id) || [];
      nodes.push({
        id: `layer-${layer.id}`,
        type: 'layer',
        position: { x: 0, y: 0 }, // Will be set by dagre
        data: {
          label: layer.name,
          layerId: layer.id,
          pointCount: layer.point_count,
          dimensionality: layer.dimensionality,
          isSource: !layer.is_derived,
          projections: layerProjs.map(p => ({ name: p.name, type: p.type })),
        },
      });
    });

    // Add transformation nodes and edges
    transformations.forEach((transform) => {
      nodes.push({
        id: `transform-${transform.id}`,
        type: 'transform',
        position: { x: 0, y: 0 }, // Will be set by dagre
        data: {
          label: transform.name,
          transformType: transform.type,
          parameters: transform.parameters as Record<string, number>,
        },
      });

      // Source Layer → Transformation edge
      edges.push({
        id: `e-layer-${transform.source_layer_id}-transform-${transform.id}`,
        source: `layer-${transform.source_layer_id}`,
        target: `transform-${transform.id}`,
        animated: true,
        style: { stroke: '#9b59b6', strokeWidth: 2 },
      });

      // Transformation → Target Layer edge
      if (transform.target_layer_id) {
        edges.push({
          id: `e-transform-${transform.id}-layer-${transform.target_layer_id}`,
          source: `transform-${transform.id}`,
          target: `layer-${transform.target_layer_id}`,
          animated: true,
          style: { stroke: '#9b59b6', strokeWidth: 2 },
        });
      }
    });

    // Apply dagre layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'TB' // Top to bottom
    );

    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [layers, projections, transformations]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onLayout = useCallback(
    (direction: 'TB' | 'LR') => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction
      );
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges, setNodes, setEdges]
  );

  return (
    <div style={{ width: '100%', height: '100%', background: '#0d1117', borderRadius: 8 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
            if (node.type === 'layer') {
              const data = node.data as { isSource?: boolean };
              return data.isSource ? '#4a9' : '#4a9eff';
            }
            if (node.type === 'transform') return '#9b59b6';
            return '#666';
          }}
        />
        <Panel position="top-right">
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => onLayout('TB')}
              style={{
                padding: '6px 12px',
                background: '#1a1a2e',
                color: '#aaa',
                border: '1px solid #3a3a5e',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Vertical
            </button>
            <button
              onClick={() => onLayout('LR')}
              style={{
                padding: '6px 12px',
                background: '#1a1a2e',
                color: '#aaa',
                border: '1px solid #3a3a5e',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Horizontal
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
