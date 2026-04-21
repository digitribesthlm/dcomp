'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts'

const QUADRANT_LABELS = [
  { x: 15, y: 78, label: 'EMERGING', sub: 'High growth, low reach', color: '#3b82f6' },
  { x: 72, y: 78, label: 'DOMINANT', sub: 'High growth + reach', color: '#ef4444' },
  { x: 15, y: 22, label: 'NOISE', sub: 'Low growth, low reach', color: '#9ca3af' },
  { x: 72, y: 22, label: 'ESTABLISHED', sub: 'High reach, stable', color: '#10b981' },
]

const DOMAIN_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
]

function CustomDot({ cx, cy, payload, isNew }) {
  const color = payload.color || '#3b82f6'
  return (
    <g>
      {isNew && (
        <circle cx={cx} cy={cy} r={14} fill={color} opacity={0.15} />
      )}
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={2} />
    </g>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d?.domain) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-xs">
      <div className="font-bold text-gray-900 mb-1">{d.domain}</div>
      <div className="text-gray-500">Market Penetration: <span className="text-gray-800 font-medium">{d.x.toFixed(1)}</span></div>
      <div className="text-gray-500">Growth Velocity: <span className="text-gray-800 font-medium">{d.y.toFixed(1)}</span></div>
      {d.market && <div className="text-gray-500 mt-1">Market: <span className="font-medium uppercase text-teal-600">{d.market}</span></div>}
    </div>
  )
}

export default function QuadrantChart({ domains = [], xLabel = 'Market Penetration (Reach)', yLabel = 'Growth Velocity (Momentum)' }) {
  const midX = 50
  const midY = 50

  // Each domain may have a history array of {x, y} points + current point
  // We render: a dotted line for history, a filled dot for current position
  const lineData = domains.filter(d => d.history?.length > 1)
  const currentPoints = domains.map(d => ({
    ...d,
    x: d.history ? d.history[d.history.length - 1].x : d.x,
    y: d.history ? d.history[d.history.length - 1].y : d.y,
  }))

  return (
    <div className="relative w-full h-full">
      {/* Quadrant background labels */}
      <div className="absolute inset-0 pointer-events-none" style={{ paddingLeft: 48, paddingRight: 8, paddingTop: 8, paddingBottom: 40 }}>
        <div className="relative w-full h-full">
          {/* Top-left: EMERGING */}
          <div className="absolute top-2 left-2 text-[10px] font-semibold text-blue-400 uppercase tracking-wider opacity-60">
            Emerging
          </div>
          {/* Top-right: DOMINANT */}
          <div className="absolute top-2 right-2 text-[10px] font-semibold text-red-400 uppercase tracking-wider opacity-60">
            Dominant
          </div>
          {/* Bottom-left: NOISE */}
          <div className="absolute bottom-2 left-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider opacity-60">
            Noise
          </div>
          {/* Bottom-right: ESTABLISHED */}
          <div className="absolute bottom-2 right-2 text-[10px] font-semibold text-emerald-500 uppercase tracking-wider opacity-60">
            Established
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 12, right: 16, bottom: 40, left: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          {/* Quadrant dividers */}
          <ReferenceLine x={midX} stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="4 4" />
          <ReferenceLine y={midY} stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="4 4" />

          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            label={{ value: xLabel, position: 'bottom', offset: -4, style: { fontSize: 11, fill: '#9ca3af' } }}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 12, style: { fontSize: 11, fill: '#9ca3af' } }}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Trail lines for each domain with history */}
          {lineData.map((d, i) => (
            <Line
              key={`trail-${i}`}
              data={d.history}
              dataKey="y"
              type="monotone"
              stroke={d.color || DOMAIN_COLORS[i % DOMAIN_COLORS.length]}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          ))}

          {/* Current position dots */}
          <Scatter
            data={currentPoints}
            shape={(props) => {
              const isNew = props.payload?.isNew
              return <CustomDot {...props} isNew={isNew} />
            }}
          >
            {currentPoints.map((d, i) => (
              <Cell key={`cell-${i}`} fill={d.color || DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />
            ))}
          </Scatter>

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
