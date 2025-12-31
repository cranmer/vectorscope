import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { ProjectedPoint } from '../types';

interface ViewportProps {
  points: ProjectedPoint[];
  selectedIds: Set<string>;
  onSelect?: (pointIds: string[]) => void;
  axisMinX?: number | null;
  axisMaxX?: number | null;
  axisMinY?: number | null;
  axisMaxY?: number | null;
  isHistogram?: boolean;
  histogramBins?: number;
  showKde?: boolean;
}

export function Viewport({
  points,
  selectedIds,
  onSelect,
  axisMinX,
  axisMaxX,
  axisMinY,
  axisMaxY,
  isHistogram = false,
  histogramBins = 30,
  showKde = false,
}: ViewportProps) {
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

  // Group points by class for histogram coloring
  const histogramData = useMemo(() => {
    if (!isHistogram) return null;

    // Group points by class/cluster
    const groups: Record<string, { values: number[]; color: string }> = {};

    for (const point of points) {
      const groupId = (point.metadata.cluster ?? point.metadata.class ?? 'all') as string | number;
      const groupKey = String(groupId);

      if (!groups[groupKey]) {
        const hue = typeof groupId === 'number' ? (groupId * 60) % 360 : 200;
        groups[groupKey] = {
          values: [],
          color: `hsla(${hue}, 70%, 50%, 0.6)`,
        };
      }
      groups[groupKey].values.push(point.coordinates[0]);
    }

    return groups;
  }, [points, isHistogram]);

  // Build axis range configuration
  const xAxisRange = axisMinX !== null && axisMaxX !== null ? [axisMinX, axisMaxX] : undefined;
  const yAxisRange = axisMinY !== null && axisMaxY !== null ? [axisMinY, axisMaxY] : undefined;

  // Render histogram view
  if (isHistogram && histogramData) {
    const traces: Plotly.Data[] = [];
    const groupKeys = Object.keys(histogramData).sort();

    // Compute global min/max across all groups for consistent bin boundaries
    let globalMin = Infinity;
    let globalMax = -Infinity;
    for (const groupKey of groupKeys) {
      const values = histogramData[groupKey].values;
      for (const v of values) {
        if (v < globalMin) globalMin = v;
        if (v > globalMax) globalMax = v;
      }
    }
    const globalRange = globalMax - globalMin || 1;
    const binSize = globalRange / histogramBins;

    if (showKde) {
      // KDE mode - show smooth density curves instead of histograms
      for (const groupKey of groupKeys) {
        const group = histogramData[groupKey];
        if (group.values.length < 2) continue;

        // Silverman's rule of thumb for bandwidth
        const std = Math.sqrt(
          group.values.reduce((sum, v) => sum + Math.pow(v - group.values.reduce((a, b) => a + b, 0) / group.values.length, 2), 0) / group.values.length
        );
        const bandwidth = 1.06 * std * Math.pow(group.values.length, -0.2);

        // Generate KDE curve over global range
        const nPoints = 100;
        const step = globalRange / nPoints;
        const kdeX: number[] = [];
        const kdeY: number[] = [];

        for (let i = 0; i <= nPoints; i++) {
          const x = globalMin + i * step;
          kdeX.push(x);

          // Gaussian kernel
          let density = 0;
          for (const val of group.values) {
            const u = (x - val) / bandwidth;
            density += Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
          }
          density /= group.values.length * bandwidth;
          kdeY.push(density);
        }

        traces.push({
          x: kdeX,
          y: kdeY,
          type: 'scatter',
          mode: 'lines',
          name: groupKey === 'all' ? 'All Points' : `Class ${groupKey}`,
          line: {
            color: group.color.replace('0.6', '1'),
            width: 2,
          },
          fill: 'tozeroy',
          fillcolor: group.color,
        } as Plotly.Data);
      }
    } else {
      // Histogram mode - use explicit bin boundaries for consistency
      for (const groupKey of groupKeys) {
        const group = histogramData[groupKey];

        traces.push({
          x: group.values,
          type: 'histogram',
          name: groupKey === 'all' ? 'All Points' : `Class ${groupKey}`,
          xbins: {
            start: globalMin,
            end: globalMax,
            size: binSize,
          },
          marker: {
            color: group.color,
            line: {
              color: 'rgba(255, 255, 255, 0.3)',
              width: 1,
            },
          },
          opacity: 0.7,
          histnorm: 'probability density',
        } as Plotly.Data);
      }
    }

    return (
      <div style={{ width: '100%', height: '100%', minHeight: 300 }}>
        <Plot
          data={traces}
          layout={{
            paper_bgcolor: '#1a1a2e',
            plot_bgcolor: '#16213e',
            barmode: 'overlay',
            xaxis: {
              gridcolor: '#2a2a4e',
              zerolinecolor: '#3a3a5e',
              tickfont: { color: '#aaa', size: 10 },
              range: xAxisRange,
            },
            yaxis: {
              gridcolor: '#2a2a4e',
              zerolinecolor: '#3a3a5e',
              tickfont: { color: '#aaa', size: 10 },
              title: { text: 'Density', font: { color: '#888', size: 11 } },
            },
            legend: {
              font: { color: '#aaa', size: 10 },
              bgcolor: 'rgba(0,0,0,0)',
            },
            hovermode: 'closest',
            margin: { t: 10, r: 10, b: 30, l: 50 },
          }}
          config={{
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'autoScale2d'],
            displaylogo: false,
          }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler
        />
      </div>
    );
  }

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
            range: xAxisRange,
          },
          yaxis: {
            gridcolor: '#2a2a4e',
            zerolinecolor: '#3a3a5e',
            tickfont: { color: '#aaa', size: 10 },
            range: yAxisRange,
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
