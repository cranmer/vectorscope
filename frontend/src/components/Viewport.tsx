import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { ProjectedPoint } from '../types';

interface ViewportProps {
  points: ProjectedPoint[];
  selectedIds: Set<string>;
  onSelect?: (pointIds: string[]) => void;
  title?: string;
}

export function Viewport({ points, selectedIds, onSelect, title = 'Viewport' }: ViewportProps) {
  const { x, y, colors, texts, pointIds } = useMemo(() => {
    const x: number[] = [];
    const y: number[] = [];
    const colors: string[] = [];
    const texts: string[] = [];
    const pointIds: string[] = [];

    for (const point of points) {
      x.push(point.coordinates[0]);
      y.push(point.coordinates[1]);
      pointIds.push(point.id);

      // Color by cluster if available, otherwise use selection state
      const cluster = point.metadata.cluster as number | undefined;
      const isSelected = selectedIds.has(point.id);

      if (isSelected) {
        colors.push('#ff6b6b');
      } else if (cluster !== undefined) {
        const hue = (cluster * 60) % 360;
        colors.push(`hsl(${hue}, 70%, 50%)`);
      } else {
        colors.push('#4a9eff');
      }

      texts.push(point.label || point.id.slice(0, 8));
    }

    return { x, y, colors, texts, pointIds };
  }, [points, selectedIds]);

  const handleSelection = (event: Plotly.PlotSelectionEvent) => {
    if (!onSelect || !event.points) return;

    const selectedPointIds = event.points.map((p) => pointIds[p.pointIndex]);
    onSelect(selectedPointIds);
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 400 }}>
      <Plot
        data={[
          {
            x,
            y,
            type: 'scatter',
            mode: 'markers',
            marker: {
              color: colors,
              size: 8,
              opacity: 0.7,
              line: {
                color: 'white',
                width: 1,
              },
            },
            text: texts,
            hoverinfo: 'text',
          },
        ]}
        layout={{
          title: {
            text: title,
            font: { color: '#eaeaea' },
          },
          paper_bgcolor: '#1a1a2e',
          plot_bgcolor: '#16213e',
          xaxis: {
            gridcolor: '#2a2a4e',
            zerolinecolor: '#3a3a5e',
            tickfont: { color: '#aaa' },
          },
          yaxis: {
            gridcolor: '#2a2a4e',
            zerolinecolor: '#3a3a5e',
            tickfont: { color: '#aaa' },
          },
          dragmode: 'select',
          hovermode: 'closest',
          margin: { t: 50, r: 20, b: 40, l: 50 },
        }}
        config={{
          displayModeBar: true,
          modeBarButtonsToRemove: ['lasso2d', 'autoScale2d'],
          displaylogo: false,
        }}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
        onSelected={handleSelection}
      />
    </div>
  );
}
