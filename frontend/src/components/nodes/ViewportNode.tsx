import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export interface ViewportNodeData {
  label: string;
  projectionType: 'pca' | 'tsne' | 'custom_axes';
  viewportId: string;
}

interface ViewportNodeProps {
  data: ViewportNodeData;
}

const projectionColors: Record<string, string> = {
  pca: '#4a9eff',
  tsne: '#9b59b6',
  custom_axes: '#e67e22',
};

export const ViewportNode = memo(({ data }: ViewportNodeProps) => {
  const color = projectionColors[data.projectionType] || '#4a9eff';

  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: 8,
        background: '#1a1a2e',
        border: `2px solid ${color}`,
        color: '#fff',
        minWidth: 120,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill={color}>
          <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" fill="none" />
          <circle cx="8" cy="16" r="2" />
          <circle cx="12" cy="10" r="2" />
          <circle cx="16" cy="14" r="2" />
        </svg>
        <span style={{ fontWeight: 600 }}>{data.label}</span>
      </div>
      <div
        style={{
          fontSize: 10,
          color: color,
          textTransform: 'uppercase',
          marginTop: 4,
        }}
      >
        {data.projectionType}
      </div>
    </div>
  );
});

ViewportNode.displayName = 'ViewportNode';
