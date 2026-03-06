import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number | string;
  onChange: (value: number) => void;
  distribution?: { counts: number[], bin_edges: number[] };
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  distribution
}) => {
  const renderHistogram = () => {
    if (!distribution) return <div style={{ height: '40px', width: '100%' }} />;

    const { counts, bin_edges } = distribution;
    const maxCount = Math.max(...counts);
    const range = max - min;

    const bars = counts.map((count, i) => {
      const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
      const leftPct = ((bin_edges[i] - min) / range) * 100;
      const rightPct = ((bin_edges[i + 1] - min) / range) * 100;
      const widthPct = rightPct - leftPct;

      if (rightPct < 0 || leftPct > 100) return null;

      const isActive = value >= bin_edges[i] && (value < bin_edges[i + 1] || (i === counts.length - 1 && value <= bin_edges[i + 1]));

      return (
        <rect
          key={i}
          x={`${Math.max(0, leftPct)}%`}
          y={`${100 - heightPct}%`}
          width={`${Math.min(100, widthPct)}%`}
          height={`${heightPct}%`}
          fill={isActive ? "#0056b3" : "#cce5ff"}
          stroke="#ffffff"
          strokeWidth="0.5"
          rx="1"
          style={{ transition: 'fill 0.2s ease' }}
        />
      );
    });

    const thumbWidth = 16;
    const thumbHalf = thumbWidth / 2;

    return (
      <div style={{ position: 'relative', width: `calc(100% - ${thumbWidth}px)`, marginLeft: `${thumbHalf}px`, marginRight: `${thumbHalf}px`, height: '40px', marginBottom: '-5px' }}>
        <svg width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
          {bars}
        </svg>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>{label}</label>
        <span style={{
          fontWeight: 'bold',
          color: '#0056b3',
          backgroundColor: '#eef8ff',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '14px'
        }}>
          {typeof value === 'number' ? parseFloat(value.toFixed(2)) : value}
        </span>
      </div>
      
      {renderHistogram()}

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          cursor: 'pointer',
          accentColor: '#0056b3',
          margin: 0,
          zIndex: 2,
          position: 'relative'
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginTop: '4px' }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

export default Slider;
