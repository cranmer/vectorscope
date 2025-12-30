import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export interface LayerNodeData {
  label: string;
  layerId: string;
  pointCount: number;
  dimensionality: number;
  isSource: boolean;
}

interface LayerNodeProps {
  data: LayerNodeData;
}

export const LayerNode = memo(({ data }: LayerNodeProps) => {
  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: 8,
        background: data.isSource ? '#2d5a27' : '#1e3a5f',
        border: `2px solid ${data.isSource ? '#4a9' : '#4a9eff'}`,
        color: '#fff',
        minWidth: 140,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#4a9eff' }}
      />

      <div style={{ fontWeight: 600, marginBottom: 4 }}>{data.label}</div>
      <div style={{ fontSize: 11, color: '#aaa' }}>
        {data.pointCount} points · {data.dimensionality}D
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#4a9eff' }}
      />
    </div>
  );
});

LayerNode.displayName = 'LayerNode';
