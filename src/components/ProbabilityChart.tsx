import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ProbabilityChartProps {
    data?: { time: string; value: number }[]
    color?: string
    height?: number
}

// Generate mock historical data
function generateMockData(days: number = 30): { time: string; value: number }[] {
    const data: { time: string; value: number }[] = []
    let value = 50 + Math.random() * 20
    const now = Date.now()

    for (let i = days; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000)
        value += (Math.random() - 0.48) * 5
        value = Math.max(5, Math.min(95, value))
        data.push({
            time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: Math.round(value * 10) / 10,
        })
    }
    return data
}

export function ProbabilityChart({ data, color = '#4ade80', height = 300 }: ProbabilityChartProps) {
    const chartData = useMemo(() => data || generateMockData(30), [data])

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    interval="preserveStartEnd"
                />
                <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                    width={45}
                />
                <Tooltip
                    contentStyle={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: 8,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}
                    labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                    formatter={(value: number) => [`${value}%`, 'Probability']}
                />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}

export default ProbabilityChart
