import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

export interface TransformNodeData {
  label: string;
  transformType: 'scaling' | 'rotation' | 'affine' | 'linear';
  parameters: Record<string, number>;
  onParameterChange?: (params: Record<string, number>) => void;
}

interface TransformNodeProps {
  data: TransformNodeData;
}

const transformColors: Record<string, string> = {
  scaling: '#9b59b6',
  rotation: '#e67e22',
  affine: '#3498db',
  linear: '#1abc9c',
};

export const TransformNode = memo(({ data }: TransformNodeProps) => {
  const [params, setParams] = useState(data.parameters);
  const color = transformColors[data.transformType] || '#666';

  const handleParamChange = (key: string, value: number) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    data.onParameterChange?.(newParams);
  };

  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: 8,
        background: '#2a2a4e',
        border: `2px solid ${color}`,
        color: '#fff',
        minWidth: 160,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color }}
      />

      <div style={{ fontWeight: 600, marginBottom: 4 }}>{data.label}</div>
      <div
        style={{
          fontSize: 10,
          color: color,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {data.transformType}
      </div>

      {/* Parameter controls */}
      {data.transformType === 'scaling' && (
        <div style={{ fontSize: 11 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#aaa', minWidth: 40 }}>Scale:</span>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={params.scale || 1}
              onChange={(e) => handleParamChange('scale', parseFloat(e.target.value))}
              style={{ flex: 1, cursor: 'pointer' }}
            />
            <span style={{ minWidth: 30 }}>{(params.scale || 1).toFixed(1)}</span>
          </label>
        </div>
      )}

      {data.transformType === 'rotation' && (
        <div style={{ fontSize: 11 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#aaa', minWidth: 40 }}>Angle:</span>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={((params.angle || 0) * 180) / Math.PI}
              onChange={(e) =>
                handleParamChange('angle', (parseFloat(e.target.value) * Math.PI) / 180)
              }
              style={{ flex: 1, cursor: 'pointer' }}
            />
            <span style={{ minWidth: 30 }}>
              {Math.round(((params.angle || 0) * 180) / Math.PI)}°
            </span>
          </label>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color }}
      />
    </div>
  );
});

TransformNode.displayName = 'TransformNode';
