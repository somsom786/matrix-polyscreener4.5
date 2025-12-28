import { useMemo } from 'react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts'

interface TradingChartProps {
    height?: number
}

// Generate mock OHLC data
function generateOHLCData(days: number = 60) {
    const data: { time: string; open: number; high: number; low: number; close: number; volume: number; sma7: number; sma21: number }[] = []
    let price = 50 + Math.random() * 20
    const prices: number[] = []
    const now = Date.now()

    for (let i = days; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000)
        const volatility = 2 + Math.random() * 3
        const open = price
        const close = open + (Math.random() - 0.48) * volatility
        const high = Math.max(open, close) + Math.random() * volatility * 0.5
        const low = Math.min(open, close) - Math.random() * volatility * 0.5

        price = Math.max(5, Math.min(95, close))
        prices.push(price)

        // Calculate SMAs
        let sma7 = price
        let sma21 = price
        if (prices.length >= 7) {
            sma7 = prices.slice(-7).reduce((a, b) => a + b, 0) / 7
        }
        if (prices.length >= 21) {
            sma21 = prices.slice(-21).reduce((a, b) => a + b, 0) / 21
        }

        data.push({
            time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            open: Math.round(Math.max(5, Math.min(95, open)) * 10) / 10,
            high: Math.round(Math.max(5, Math.min(95, high)) * 10) / 10,
            low: Math.round(Math.max(5, Math.min(95, low)) * 10) / 10,
            close: Math.round(price * 10) / 10,
            volume: Math.floor(Math.random() * 100000) + 10000,
            sma7: Math.round(sma7 * 10) / 10,
            sma21: Math.round(sma21 * 10) / 10,
        })
    }
    return data
}

export function TradingChart({ height = 400 }: TradingChartProps) {
    const data = useMemo(() => generateOHLCData(60), [])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Main Price Chart */}
            <ResponsiveContainer width="100%" height={height - 100}>
                <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        tickFormatter={(v) => `${v}%`}
                        width={45}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 8,
                            fontSize: 12,
                        }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(value: number, name: string) => {
                            const label = name === 'close' ? 'Price' : name === 'sma7' ? 'SMA(7)' : name === 'sma21' ? 'SMA(21)' : name
                            return [`${value}%`, label]
                        }}
                    />

                    {/* Price Area */}
                    <Area
                        type="monotone"
                        dataKey="close"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#priceGradient)"
                    />

                    {/* SMA 7 */}
                    <Line
                        type="monotone"
                        dataKey="sma7"
                        stroke="#4ade80"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 2"
                    />

                    {/* SMA 21 */}
                    <Line
                        type="monotone"
                        dataKey="sma21"
                        stroke="#f472b6"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 2"
                    />
                </ComposedChart>
            </ResponsiveContainer>

            {/* Volume Chart */}
            <ResponsiveContainer width="100%" height={80}>
                <ComposedChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="time" hide />
                    <YAxis hide />
                    <Bar
                        dataKey="volume"
                        fill="#22d3ee"
                        fillOpacity={0.4}
                        radius={[2, 2, 0, 0]}
                    />
                </ComposedChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 16, height: 2, background: '#8b5cf6' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Price</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 16, height: 2, background: '#4ade80', borderTop: '2px dashed #4ade80' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>SMA(7)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 16, height: 2, background: '#f472b6', borderTop: '2px dashed #f472b6' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>SMA(21)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 16, height: 8, background: 'rgba(34, 211, 238, 0.4)', borderRadius: 2 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Volume</span>
                </div>
            </div>
        </div>
    )
}

export default TradingChart
