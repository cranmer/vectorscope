import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { ProjectedPoint } from '../types';

interface ViewportProps {
  points: ProjectedPoint[];
  selectedIds: Set<string>;
  onSelect?: (pointIds: string[]) => void;
}

export function Viewport({ points, selectedIds, onSelect }: ViewportProps) {
  const hasSelection = selectedIds.size > 0;

  const { x, y, colors, sizes, opacities, lineColors, lineWidths, texts, pointIds } = useMemo(() => {
    const x: number[] = [];
    const y: number[] = [];
    const colors: string[] = [];
    const sizes: number[] = [];
    const opacities: number[] = [];
    const lineColors: string[] = [];
    const lineWidths: number[] = [];
    const texts: string[] = [];
    const pointIds: string[] = [];

    for (const point of points) {
      x.push(point.coordinates[0]);
      y.push(point.coordinates[1]);
      pointIds.push(point.id);

      // Support both 'cluster' (synthetic data) and 'class' (sklearn datasets)
      const groupId = (point.metadata.cluster ?? point.metadata.class) as number | undefined;
      const isSelected = selectedIds.has(point.id);

      // Color by group (cluster or class)
      let baseColor: string;
      if (groupId !== undefined) {
        const hue = (groupId * 60) % 360;
        baseColor = `hsl(${hue}, 70%, 50%)`;
      } else {
        baseColor = '#4a9eff';
      }

      if (isSelected) {
        colors.push(baseColor);
        sizes.push(12);
        opacities.push(1);
        lineColors.push('#ffffff');
        lineWidths.push(2);
      } else {
        colors.push(baseColor);
        sizes.push(7);
        opacities.push(hasSelection ? 0.3 : 0.7);
        lineColors.push('rgba(255,255,255,0.3)');
        lineWidths.push(0.5);
      }

      texts.push(point.label || point.id.slice(0, 8));
    }

    return { x, y, colors, sizes, opacities, lineColors, lineWidths, texts, pointIds };
  }, [points, selectedIds, hasSelection]);

  const handleSelection = (event: Plotly.PlotSelectionEvent) => {
    if (!onSelect || !event.points) return;
    const selectedPointIds = event.points.map((p) => pointIds[p.pointIndex]);
    onSelect(selectedPointIds);
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 300 }}>
      <Plot
        data={[
          {
            x,
            y,
            type: 'scatter',
            mode: 'markers',
            marker: {
              color: colors,
              size: sizes,
              opacity: opacities,
              line: {
                color: lineColors,
                width: lineWidths,
              },
            },
            text: texts,
            hoverinfo: 'text',
          },
        ]}
        layout={{
          paper_bgcolor: '#1a1a2e',
          plot_bgcolor: '#16213e',
          xaxis: {
            gridcolor: '#2a2a4e',
            zerolinecolor: '#3a3a5e',
            tickfont: { color: '#aaa', size: 10 },
          },
          yaxis: {
            gridcolor: '#2a2a4e',
            zerolinecolor: '#3a3a5e',
            tickfont: { color: '#aaa', size: 10 },
          },
          dragmode: 'select',
          hovermode: 'closest',
          margin: { t: 10, r: 10, b: 30, l: 40 },
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
