import Plot from 'react-plotly.js';
import { plotlyDarkLayout, plotlyConfig } from '../../utils/helpers';
import type { Data, Layout } from 'plotly.js';

interface TelemetryChartProps {
  title: string;
  data: Data[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  showLegend?: boolean;
}

export default function TelemetryChart({
  title,
  data,
  xAxisLabel = 'Distance (m)',
  yAxisLabel = 'Value',
  height = 400,
  showLegend = true,
}: TelemetryChartProps) {
  const layout: Partial<Layout> = {
    ...plotlyDarkLayout,
    title: {
      text: title,
      font: { size: 16, color: '#F5F5F5' },
    },
    xaxis: {
      ...plotlyDarkLayout.xaxis,
      title: { text: xAxisLabel, font: { size: 12 } },
    },
    yaxis: {
      ...plotlyDarkLayout.yaxis,
      title: { text: yAxisLabel, font: { size: 12 } },
    },
    showlegend: showLegend,
    height,
    autosize: true,
  };

  return (
    <div className="plotly-chart-container apex-card p-4">
      <Plot
        data={data}
        layout={layout}
        config={plotlyConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
      />
    </div>
  );
}
