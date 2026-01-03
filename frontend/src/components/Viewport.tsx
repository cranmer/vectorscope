import { useMemo, useRef, useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import type { ProjectedPoint, CustomAxis } from '../types';

interface ViewportProps {
  points: ProjectedPoint[];
  selectedIds: Set<string>;
  onSelect?: (pointIds: string[]) => void;
  onTogglePoint?: (pointId: string, add: boolean) => void;
  axisMinX?: number | null;
  axisMaxX?: number | null;
  axisMinY?: number | null;
  axisMaxY?: number | null;
  axisMinZ?: number | null;
  axisMaxZ?: number | null;
  isDensity?: boolean;
  isBoxplot?: boolean;
  isViolin?: boolean;
  is3D?: boolean;
  densityBins?: number;
  showKde?: boolean;
  customAxes?: CustomAxis[];
  showCustomAxes?: boolean;
}

export function Viewport({
  points,
  selectedIds,
  onSelect,
  onTogglePoint,
  axisMinX,
  axisMaxX,
  axisMinY,
  axisMaxY,
  axisMinZ,
  axisMaxZ,
  isDensity = false,
  isBoxplot = false,
  isViolin = false,
  is3D = false,
  densityBins = 30,
  showKde = true,
  customAxes = [],
  showCustomAxes = true,
}: ViewportProps) {
  const hasSelection = selectedIds.size > 0;
  const isUpdatingRef = useRef(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const clickedOnPointRef = useRef(false);

  // Track shift key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const { x, y, z, colors, sizes, opacities, lineColors, lineWidths, texts, pointIds, symbols } = useMemo(() => {
    const x: number[] = [];
    const y: number[] = [];
    const z: number[] = [];
    const colors: string[] = [];
    const sizes: number[] = [];
    const opacities: number[] = [];
    const lineColors: string[] = [];
    const lineWidths: number[] = [];
    const texts: string[] = [];
    const pointIds: string[] = [];
    const symbols: string[] = [];

    for (const point of points) {
      x.push(point.coordinates[0]);
      y.push(point.coordinates[1]);
      if (point.coordinates.length > 2) {
        z.push(point.coordinates[2]);
      }
      pointIds.push(point.id);

      // Support both 'cluster' (synthetic data) and 'class' (sklearn datasets)
      const groupId = (point.metadata.cluster ?? point.metadata.class) as number | undefined;
      const isSelected = selectedIds.has(point.id);
      const isVirtual = point.is_virtual;

      // Virtual points use star symbol, regular points use circle
      symbols.push(isVirtual ? 'star' : 'circle');

      // Color by group (cluster or class), virtual points get special color
      let baseColor: string;
      if (isVirtual) {
        baseColor = '#f59e0b'; // Amber color for virtual points
      } else if (groupId !== undefined) {
        const hue = (groupId * 60) % 360;
        baseColor = `hsl(${hue}, 70%, 50%)`;
      } else {
        baseColor = '#4a9eff';
      }

      if (isSelected) {
        colors.push(baseColor);
        sizes.push(isVirtual ? 18 : 12); // Virtual points are larger
        opacities.push(1);
        lineColors.push('#ffffff');
        lineWidths.push(2);
      } else {
        colors.push(baseColor);
        sizes.push(isVirtual ? 14 : 7); // Virtual points are larger
        opacities.push(isVirtual ? 1 : (hasSelection ? 0.3 : 0.7)); // Virtual always visible
        lineColors.push(isVirtual ? '#ffffff' : 'rgba(255,255,255,0.3)');
        lineWidths.push(isVirtual ? 1.5 : 0.5);
      }

      texts.push(point.label || point.id.slice(0, 8));
    }

    return { x, y, z, colors, sizes, opacities, lineColors, lineWidths, texts, pointIds, symbols };
  }, [points, selectedIds, hasSelection]);

  const handleSelection = (event: Plotly.PlotSelectionEvent) => {
    if (!onSelect) return;

    // Ignore empty selections triggered by Plotly's reselect during re-render
    if (!event.points || event.points.length === 0) {
      return;
    }

    // Set flag to ignore the reselect that happens after state update
    isUpdatingRef.current = true;
    const newSelectedIds = event.points.map((p) => pointIds[p.pointIndex]);

    // If shift is held, merge with existing selection
    if (shiftHeld) {
      const merged = new Set(selectedIds);
      for (const id of newSelectedIds) {
        merged.add(id);
      }
      onSelect(Array.from(merged));
    } else {
      onSelect(newSelectedIds);
    }

    // Reset flag after a short delay to allow for the re-render cycle
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 100);
  };

  const handleDeselect = () => {
    // Don't clear selection on deselect - user must explicitly clear via button
  };

  // Handle click on individual points (for shift+click toggle)
  const handlePlotlyClick = (event: Plotly.PlotMouseEvent) => {
    // Mark that we clicked on a point (used by container click handler)
    clickedOnPointRef.current = true;

    if (!event.points || event.points.length === 0) return;

    const clickedPointId = pointIds[event.points[0].pointIndex];
    const isCurrentlySelected = selectedIds.has(clickedPointId);

    if (shiftHeld) {
      // Shift+click: toggle individual point
      if (onTogglePoint) {
        onTogglePoint(clickedPointId, !isCurrentlySelected);
      } else if (onSelect) {
        // Fallback if onTogglePoint not provided
        const newSelection = new Set(selectedIds);
        if (isCurrentlySelected) {
          newSelection.delete(clickedPointId);
        } else {
          newSelection.add(clickedPointId);
        }
        onSelect(Array.from(newSelection));
      }
    }
    // Non-shift clicks on points are handled by the selection system, not here
  };

  // Handle click on container - clears selection if clicked on empty area
  const handleContainerClick = () => {
    // Use a small delay to let Plotly's click event fire first
    setTimeout(() => {
      if (!clickedOnPointRef.current && !shiftHeld && hasSelection && onSelect) {
        onSelect([]);
      }
      clickedOnPointRef.current = false;
    }, 10);
  };

  // Group points by class for density/boxplot/violin coloring
  const groupedData = useMemo(() => {
    if (!isDensity && !isBoxplot && !isViolin) return null;

    // Group points by class/cluster, using label if available
    const groups: Record<string, { values: number[]; color: string; label: string }> = {};
    const labelMap: Map<string, string> = new Map();

    for (const point of points) {
      const groupId = (point.metadata.cluster ?? point.metadata.class ?? 'all') as string | number;
      const groupKey = String(groupId);

      // Use point label if available and consistent
      if (point.label && !labelMap.has(groupKey)) {
        labelMap.set(groupKey, point.label);
      }

      if (!groups[groupKey]) {
        const hue = typeof groupId === 'number' ? (groupId * 60) % 360 : 200;
        groups[groupKey] = {
          values: [],
          color: `hsla(${hue}, 70%, 50%, 0.6)`,
          label: labelMap.get(groupKey) || (groupKey === 'all' ? 'All Points' : `Class ${groupKey}`),
        };
      }
      groups[groupKey].values.push(point.coordinates[0]);
    }

    // Update labels from labelMap
    for (const [key, label] of labelMap.entries()) {
      if (groups[key]) {
        groups[key].label = label;
      }
    }

    return groups;
  }, [points, isDensity, isBoxplot, isViolin]);

  // Build axis range configuration
  const xAxisRange = axisMinX !== null && axisMaxX !== null ? [axisMinX, axisMaxX] : undefined;
  const yAxisRange = axisMinY !== null && axisMaxY !== null ? [axisMinY, axisMaxY] : undefined;
  const zAxisRange = axisMinZ !== null && axisMaxZ !== null ? [axisMinZ, axisMaxZ] : undefined;

  // Build arrow annotations and hover traces for custom axes (2D and 3D)
  const { axisAnnotations, axisHoverTrace, axis3DTraces } = useMemo(() => {
    if (!showCustomAxes || customAxes.length === 0) {
      return { axisAnnotations: [], axisHoverTrace: null, axis3DTraces: [] };
    }

    // Create a map of point IDs to their coordinates
    const pointCoords: Record<string, [number, number]> = {};
    const pointCoords3D: Record<string, [number, number, number]> = {};
    for (const point of points) {
      pointCoords[point.id] = [point.coordinates[0], point.coordinates[1]];
      if (point.coordinates.length > 2) {
        pointCoords3D[point.id] = [point.coordinates[0], point.coordinates[1], point.coordinates[2]];
      }
    }

    const annotations: Plotly.Annotations[] = [];
    const hoverX: number[] = [];
    const hoverY: number[] = [];
    const hoverText: string[] = [];
    const hoverColors: string[] = [];
    const colors = ['#e67e22', '#e74c3c', '#2ecc71', '#9b59b6', '#3498db'];

    for (let i = 0; i < customAxes.length; i++) {
      const axis = customAxes[i];
      const pointA = pointCoords[axis.point_a_id];
      const pointB = pointCoords[axis.point_b_id];

      if (!pointA || !pointB) continue;

      const color = colors[i % colors.length];

      // Arrow annotation from point A to point B
      annotations.push({
        x: pointB[0],
        y: pointB[1],
        ax: pointA[0],
        ay: pointA[1],
        xref: 'x',
        yref: 'y',
        axref: 'x',
        ayref: 'y',
        showarrow: true,
        arrowhead: 2,
        arrowsize: 1.5,
        arrowwidth: 2,
        arrowcolor: color,
        standoff: 8, // Distance from point B
        startstandoff: 8, // Distance from point A
      } as Plotly.Annotations);

      // Add hover point at midpoint
      const midX = (pointA[0] + pointB[0]) / 2;
      const midY = (pointA[1] + pointB[1]) / 2;
      hoverX.push(midX);
      hoverY.push(midY);
      hoverText.push(axis.name);
      hoverColors.push(color);
    }

    // Create invisible scatter trace for hover text
    const hoverTrace = hoverX.length > 0 ? {
      x: hoverX,
      y: hoverY,
      type: 'scatter' as const,
      mode: 'markers' as const,
      marker: {
        size: 20,
        color: hoverColors,
        opacity: 0, // Invisible but hoverable
      },
      text: hoverText,
      hoverinfo: 'text' as const,
      hoverlabel: {
        bgcolor: '#1a1a2e',
        font: { color: '#fff', size: 12 },
      },
      showlegend: false,
    } : null;

    // Build 3D axis traces (lines with cone arrowheads)
    const traces3D: Plotly.Data[] = [];
    for (let i = 0; i < customAxes.length; i++) {
      const axis = customAxes[i];
      const pointA = pointCoords3D[axis.point_a_id];
      const pointB = pointCoords3D[axis.point_b_id];

      if (!pointA || !pointB) continue;

      const color = colors[i % colors.length];

      // Line trace from A to B
      traces3D.push({
        x: [pointA[0], pointB[0]],
        y: [pointA[1], pointB[1]],
        z: [pointA[2], pointB[2]],
        type: 'scatter3d',
        mode: 'lines',
        line: {
          color: color,
          width: 4,
        },
        name: axis.name,
        showlegend: false,
        hoverinfo: 'name',
      } as Plotly.Data);

      // Cone arrowhead at point B
      const dx = pointB[0] - pointA[0];
      const dy = pointB[1] - pointA[1];
      const dz = pointB[2] - pointA[2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > 1e-10) {
        traces3D.push({
          x: [pointB[0]],
          y: [pointB[1]],
          z: [pointB[2]],
          u: [dx / len * 0.15],
          v: [dy / len * 0.15],
          w: [dz / len * 0.15],
          type: 'cone',
          colorscale: [[0, color], [1, color]],
          showscale: false,
          sizemode: 'absolute',
          sizeref: 0.3,
          name: axis.name,
          showlegend: false,
          hoverinfo: 'name',
        } as Plotly.Data);
      }
    }

    return { axisAnnotations: annotations, axisHoverTrace: hoverTrace, axis3DTraces: traces3D };
  }, [points, customAxes, showCustomAxes]);

  // Render boxplot view
  if (isBoxplot && groupedData) {
    const traces: Plotly.Data[] = [];
    const groupKeys = Object.keys(groupedData).sort();

    for (const groupKey of groupKeys) {
      const group = groupedData[groupKey];

      traces.push({
        y: group.values,
        type: 'box',
        name: group.label,
        marker: {
          color: group.color.replace('0.6', '1'),
        },
        boxpoints: 'outliers',
        jitter: 0.3,
        pointpos: 0,
      } as Plotly.Data);
    }

    return (
      <div style={{ width: '100%', height: '100%', minHeight: 300 }}>
        <Plot
          data={traces}
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
              title: { text: 'Value', font: { color: '#888', size: 11 } },
              range: xAxisRange,  // Use X range since boxplot Y is the dimension value
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

  // Render violin view
  if (isViolin && groupedData) {
    const traces: Plotly.Data[] = [];
    const groupKeys = Object.keys(groupedData).sort();

    for (const groupKey of groupKeys) {
      const group = groupedData[groupKey];

      traces.push({
        y: group.values,
        type: 'violin',
        name: group.label,
        marker: {
          color: group.color.replace('0.6', '1'),
        },
        box: {
          visible: true,
        },
        meanline: {
          visible: true,
        },
        points: 'outliers',
      } as Plotly.Data);
    }

    return (
      <div style={{ width: '100%', height: '100%', minHeight: 300 }}>
        <Plot
          data={traces}
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
              title: { text: 'Value', font: { color: '#888', size: 11 } },
              range: xAxisRange,  // Use X range since violin Y is the dimension value
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

  // Render density view
  if (isDensity && groupedData) {
    const traces: Plotly.Data[] = [];
    const groupKeys = Object.keys(groupedData).sort();

    // Compute global min/max across all groups for consistent bin boundaries
    let globalMin = Infinity;
    let globalMax = -Infinity;
    for (const groupKey of groupKeys) {
      const values = groupedData[groupKey].values;
      for (const v of values) {
        if (v < globalMin) globalMin = v;
        if (v > globalMax) globalMax = v;
      }
    }
    const globalRange = globalMax - globalMin || 1;
    const binSize = globalRange / densityBins;

    if (showKde) {
      // KDE mode - show smooth density curves instead of histograms
      for (const groupKey of groupKeys) {
        const group = groupedData[groupKey];
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
          name: group.label,
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
        const group = groupedData[groupKey];

        traces.push({
          x: group.values,
          type: 'histogram',
          name: group.label,
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

  // Render 3D scatter plot
  if (is3D && z.length > 0) {
    return (
      <div style={{ width: '100%', height: '100%', minHeight: 300 }}>
        <Plot
          data={[
            {
              x,
              y,
              z,
              type: 'scatter3d',
              mode: 'markers',
              marker: {
                color: colors,
                size: sizes.map(s => s * 0.6), // Slightly smaller in 3D
                symbol: symbols,
                opacity: opacities,
                line: {
                  color: lineColors,
                  width: lineWidths,
                },
              },
              text: texts,
              hoverinfo: 'text',
            },
            ...axis3DTraces,
          ]}
          layout={{
            paper_bgcolor: '#1a1a2e',
            scene: {
              bgcolor: '#16213e',
              xaxis: {
                gridcolor: '#2a2a4e',
                zerolinecolor: '#3a3a5e',
                tickfont: { color: '#aaa', size: 10 },
                title: { text: 'X', font: { color: '#888', size: 11 } },
                range: xAxisRange,
              },
              yaxis: {
                gridcolor: '#2a2a4e',
                zerolinecolor: '#3a3a5e',
                tickfont: { color: '#aaa', size: 10 },
                title: { text: 'Y', font: { color: '#888', size: 11 } },
                range: yAxisRange,
              },
              zaxis: {
                gridcolor: '#2a2a4e',
                zerolinecolor: '#3a3a5e',
                tickfont: { color: '#aaa', size: 10 },
                title: { text: 'Z', font: { color: '#888', size: 11 } },
                range: zAxisRange,
              },
              camera: {
                eye: { x: 1.5, y: 1.5, z: 1.5 },
              },
            },
            hovermode: 'closest',
            margin: { t: 10, r: 10, b: 10, l: 10 },
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

  // Compute selectedpoints indices for Plotly
  const selectedPointIndices = useMemo(() => {
    if (selectedIds.size === 0) return undefined;
    const indices: number[] = [];
    pointIds.forEach((id, index) => {
      if (selectedIds.has(id)) {
        indices.push(index);
      }
    });
    return indices.length > 0 ? indices : undefined;
  }, [selectedIds, pointIds]);

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      style={{ width: '100%', height: '100%', minHeight: 300 }}
    >
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
              symbol: symbols,
              opacity: opacities,
              line: {
                color: lineColors,
                width: lineWidths,
              },
            },
            text: texts,
            hoverinfo: 'text',
            selectedpoints: selectedPointIndices,
          },
          ...(axisHoverTrace ? [axisHoverTrace] : []),
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
          clickmode: 'event+select',
          hovermode: 'closest',
          margin: { t: 10, r: 10, b: 30, l: 40 },
          annotations: axisAnnotations,
        }}
        config={{
          displayModeBar: true,
          modeBarButtonsToRemove: ['lasso2d', 'autoScale2d'],
          displaylogo: false,
        }}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
        onSelected={handleSelection}
        onDeselect={handleDeselect}
        onClick={handlePlotlyClick}
      />
    </div>
  );
}
