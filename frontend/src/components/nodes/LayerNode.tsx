import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export interface LayerNodeData {
  label: string;
  layerId: string;
  pointCount: number;
  dimensionality: number;
  isSource: boolean;
  projections?: Array<{ name: string; type: string }>;
}

interface LayerNodeProps {
  data: LayerNodeData;
}

const projectionColors: Record<string, string> = {
  pca: '#4a9eff',
  tsne: '#9b59b6',
  custom_axes: '#e67e22',
};

export const LayerNode = memo(({ data }: LayerNodeProps) => {
  const borderColor = data.isSource ? '#4a9' : '#4a9eff';
  const bgColor = data.isSource ? '#2d5a27' : '#1e3a5f';

  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: 8,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        color: '#fff',
        minWidth: 140,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: borderColor }}
      />

      <div style={{ fontWeight: 600, marginBottom: 4 }}>{data.label}</div>
      <div style={{ fontSize: 11, color: '#aaa' }}>
        {data.pointCount.toLocaleString()} points · {data.dimensionality}D
      </div>

      {/* Projection badges */}
      {data.projections && data.projections.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
          {data.projections.map((proj, i) => (
            <span
              key={i}
              style={{
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 10,
                background: projectionColors[proj.type] || '#666',
                color: '#fff',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              {proj.type}
            </span>
          ))}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: borderColor }}
      />
    </div>
  );
});

LayerNode.displayName = 'LayerNode';
