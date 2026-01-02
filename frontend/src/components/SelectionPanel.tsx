import { useState } from 'react';
import type { Selection, Layer } from '../types';

interface SelectionPanelProps {
  selections: Selection[];
  layers: Layer[];
  selectedPointCount: number;
  activeLayerId: string | null;
  onSaveSelection: (name: string, layerId: string) => void;
  onApplySelection: (selection: Selection) => void;
  onDeleteSelection: (id: string) => void;
  onClearSelection: () => void;
}

export function SelectionPanel({
  selections,
  layers,
  selectedPointCount,
  activeLayerId,
  onSaveSelection,
  onApplySelection,
  onDeleteSelection,
  onClearSelection,
}: SelectionPanelProps) {
  const [newSelectionName, setNewSelectionName] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSave = () => {
    if (!newSelectionName.trim() || !activeLayerId) return;
    onSaveSelection(newSelectionName.trim(), activeLayerId);
    setNewSelectionName('');
  };

  const getLayerName = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    return layer?.name || 'Unknown';
  };

  return (
    <div style={{
      background: '#16213e',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          color: '#888',
          fontSize: 14,
          textTransform: 'uppercase',
        }}
      >
        <span>Selections</span>
        <span style={{ fontSize: 12 }}>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Current selection info */}
          <div style={{
            background: '#1a1a2e',
            borderRadius: 6,
            padding: 12,
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 13,
              color: selectedPointCount > 0 ? '#4ade80' : '#666',
              marginBottom: selectedPointCount > 0 ? 8 : 0,
            }}>
              {selectedPointCount > 0
                ? `${selectedPointCount} point${selectedPointCount === 1 ? '' : 's'} selected`
                : 'No points selected'}
            </div>

            {selectedPointCount > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newSelectionName}
                  onChange={(e) => setNewSelectionName(e.target.value)}
                  placeholder="Selection name..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: '#0f0f1a',
                    border: '1px solid #333',
                    borderRadius: 4,
                    color: '#e0e0e0',
                    fontSize: 13,
                  }}
                />
                <button
                  onClick={handleSave}
                  disabled={!newSelectionName.trim() || !activeLayerId}
                  style={{
                    padding: '6px 12px',
                    background: newSelectionName.trim() && activeLayerId ? '#3b82f6' : '#333',
                    border: 'none',
                    borderRadius: 4,
                    color: newSelectionName.trim() && activeLayerId ? '#fff' : '#666',
                    fontSize: 13,
                    cursor: newSelectionName.trim() && activeLayerId ? 'pointer' : 'not-allowed',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={onClearSelection}
                  style={{
                    padding: '6px 12px',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Saved selections list */}
          {selections.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                Saved Selections
              </div>
              {selections.map((selection) => (
                <div
                  key={selection.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    background: '#1a1a2e',
                    borderRadius: 6,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#e0e0e0' }}>
                      {selection.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#666' }}>
                      {selection.point_count} points · {getLayerName(selection.layer_id)}
                    </div>
                  </div>
                  <button
                    onClick={() => onApplySelection(selection)}
                    title="Apply selection"
                    style={{
                      padding: '4px 8px',
                      background: '#3b82f6',
                      border: 'none',
                      borderRadius: 4,
                      color: '#fff',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => onDeleteSelection(selection.id)}
                    title="Delete selection"
                    style={{
                      padding: '4px 8px',
                      background: 'transparent',
                      border: '1px solid #666',
                      borderRadius: 4,
                      color: '#888',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#555', fontStyle: 'italic' }}>
              No saved selections yet. Select points and save them here.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
