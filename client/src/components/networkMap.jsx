import React, { useMemo } from 'react';

const LINE_COLORS = {
  'Red Line': '#e63946',
  'Blue Line': '#457b9d',
  'Green Line': '#2a9d8f',
  'Yellow Line': '#e9c46a',
  'Orange': '#f96400',
};

// Fixed layout positions for the 14 stations (x, y in 0..1 space)
const STATION_POSITIONS = {
  'San Salvario': [0.35, 0.15],
  'Porta Velaria': [0.55, 0.25],
  'Vanchiglia': [0.72, 0.35],
  'Lingotto': [0.82, 0.18],
  'Fontana Oscura': [0.22, 0.35],
  'Borgo Sereno': [0.12, 0.52],
  'Borgo Po': [0.62, 0.58],
  'Torre Cinerea': [0.68, 0.48],
  "Crocetta": [0.48, 0.72],
  'Mercato Antico': [0.90, 0.32],
  'Aurora': [0.78, 0.65],
  'Ponte Aureo': [0.55, 0.82],
  'Quartiere Vecchio': [0.30, 0.82],
  'Bellavista': [0.85, 0.50],
};

// 1. CONFIGURATION AND GRAPHICAL CONSTANTS 
const W = 700; // Width of the SVG drawing area
const H = 420; // Height of the SVG drawing area
const R = 9;   // Radius of the circles representing metro stations

function NetworkMap({ network, showLines = true, highlightRoute = [] }) {
  const { lines, stations, connections } = network || {};

  // useMemo avoid react to recalculate dictionnary
  const stationById = useMemo(() => {
    if (!stations) return {};
    return Object.fromEntries(stations.map(s => [s.id, s]));
  }, [stations]);

  // Transforms an array [{id: 1, name: 'Centrale'}] into an object { 1: {id: 1, name: 'Centrale'} } for direct O(1) lookup/access.
  const pos = (name) => {
    const p = STATION_POSITIONS[name];
    if (!p) return [W / 2, H / 2]; 
    return [p[0] * W, p[1] * H];
  };

  // Group connections by line
  const byLine = useMemo(() => {
    if (!connections || !lines) return {};
    const map = {};

    // Initialize each metro line with an empty array of stations
    for (const l of lines) map[l.id] = { ...l, stations: [] };

    // Assign each station connection to its corresponding line
    for (const ls of connections) {
      if (map[ls.line_id]) map[ls.line_id].stations.push(ls);
    }

    // CRUCIAL: Sort stations within each line according to their physical order along the line
    for (const l of Object.values(map)) l.stations.sort((a, b) => a.position - b.position);
    return map;
  }, [connections, lines]);


  // create a set conatining unique pairs keys
  const routeSet = useMemo(() => {
    const s = new Set();
    for (let i = 0; i < highlightRoute.length - 1; i++) {
      const a = highlightRoute[i];
      const b = highlightRoute[i + 1];
      s.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
    }
    return s;
  }, [highlightRoute]);

  if (!network) return <div className="text-center text-secondary">Loading map…</div>;

  return (
    <div className="network-map">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 420 }}>
        {/* Lines */}
        {showLines && Object.values(byLine).map(line => {
          const color = LINE_COLORS[line.name] || '#070707';
          const pts = line.stations.map(ls => {
            const s = stationById[ls.station_id];
            return s ? pos(s.name) : null;
          }).filter(Boolean);
          return pts.map((p, i) => {
            if (i === 0) return null;
            const prev = pts[i - 1];
            return (
              <line
                key={`${line.id}-seg-${i}`}
                x1={prev[0]} y1={prev[1]}
                x2={p[0]} y2={p[1]}
                stroke={color} strokeWidth={4} strokeLinecap="round"
              />
            );
          });
        })}

        {/* Route highlight */}
        {highlightRoute.length >= 2 && highlightRoute.map((sid, i) => {
          if (i === 0) return null;
          const a = stationById[highlightRoute[i - 1]];
          const b = stationById[sid];
          if (!a || !b) return null;
          const pa = pos(a.name);
          const pb = pos(b.name);
          return (
            <line
              key={`route-${i}`}
              x1={pa[0]} y1={pa[1]}
              x2={pb[0]} y2={pb[1]}
              stroke="#61f47c" strokeWidth={6} strokeDasharray="8 4" strokeLinecap="round"
            />
          );
        })}

        {/* Stations */}
        {stations?.map(s => {
          const [x, y] = pos(s.name);
          const inRoute = highlightRoute.includes(s.id);
          return (
            <g key={s.id}>
              <circle cx={x} cy={y} r={R + 2} fill="#0f172a" />
              <circle
                cx={x} cy={y} r={R}
                fill={inRoute ? '#61f47c' : '#4a4e56'}
                stroke={inRoute ? '#61f47c' : '#94a3b8'}
                strokeWidth={2}
              />
                <text 
                x={x} 
                y={y - 14} 
                textAnchor="middle" 
                fontSize={11} 
                
                fill="#000000"
                stroke="#060709"
                // strokeWidth={3}
                strokeLinejoin="round"
                >
                {s.name}
            </text>
            </g>
          );
        })}

        {/* Line legend */}
        {showLines && (
          <g>
            {Object.values(byLine).map((line, i) => (
              <g key={line.id} transform={`translate(10, ${10 + i * 20})`}>
                <rect width={24} height={8} rx={4} fill={LINE_COLORS[line.name] || '#000000'} y={-4} />
                <text x={30} y={4} fontSize={11} fill="#000000">{line.name}</text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

export {NetworkMap}
