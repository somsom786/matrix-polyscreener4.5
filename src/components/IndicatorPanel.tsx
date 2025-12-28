import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts'

interface IndicatorPanelProps {
    height?: number
}

// Generate RSI data
function generateRSI(days: number = 30): { time: string; value: number }[] {
    const data: { time: string; value: number }[] = []
    let rsi = 50 + Math.random() * 20
    const now = Date.now()

    for (let i = days; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000)
        rsi += (Math.random() - 0.5) * 10
        rsi = Math.max(10, Math.min(90, rsi))
        data.push({
            time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: Math.round(rsi * 10) / 10,
        })
    }
    return data
}

// Generate MACD data
function generateMACD(days: number = 30): { time: string; macd: number; signal: number; histogram: number }[] {
    const data: { time: string; macd: number; signal: number; histogram: number }[] = []
    let macd = 0
    let signal = 0
    const now = Date.now()

    for (let i = days; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000)
        macd += (Math.random() - 0.48) * 2
        macd = Math.max(-10, Math.min(10, macd))
        signal = signal * 0.9 + macd * 0.1

        data.push({
            time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            macd: Math.round(macd * 100) / 100,
            signal: Math.round(signal * 100) / 100,
            histogram: Math.round((macd - signal) * 100) / 100,
        })
    }
    return data
}

export function IndicatorPanel({ height = 120 }: IndicatorPanelProps) {
    const rsiData = useMemo(() => generateRSI(30), [])
    const macdData = useMemo(() => generateMACD(30), [])
    const currentRSI = rsiData[rsiData.length - 1]?.value || 50
    const currentMACD = macdData[macdData.length - 1]?.histogram || 0

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* RSI Panel */}
            <div className="glass" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>RSI (14)</span>
                    <span className="mono" style={{
                        color: currentRSI > 70 ? '#f87171' : currentRSI < 30 ? '#4ade80' : '#94a3b8',
                        fontWeight: 600
                    }}>
                        {currentRSI.toFixed(1)}
                        {currentRSI > 70 ? ' Overbought' : currentRSI < 30 ? ' Oversold' : ''}
                    </span>
                </div>
                <ResponsiveContainer width="100%" height={height}>
                    <LineChart data={rsiData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0, 100]} hide />
                        <ReferenceLine y={70} stroke="#f87171" strokeDasharray="3 3" strokeOpacity={0.5} />
                        <ReferenceLine y={30} stroke="#4ade80" strokeDasharray="3 3" strokeOpacity={0.5} />
                        <ReferenceLine y={50} stroke="#64748b" strokeDasharray="3 3" strokeOpacity={0.3} />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* MACD Panel */}
            <div className="glass" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>MACD</span>
                    <span className="mono" style={{
                        color: currentMACD > 0 ? '#4ade80' : '#f87171',
                        fontWeight: 600
                    }}>
                        {currentMACD > 0 ? '▲ Bullish' : '▼ Bearish'}
                    </span>
                </div>
                <ResponsiveContainer width="100%" height={height}>
                    <LineChart data={macdData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <XAxis dataKey="time" hide />
                        <YAxis hide />
                        <ReferenceLine y={0} stroke="#64748b" strokeOpacity={0.3} />
                        <Line type="monotone" dataKey="macd" stroke="#22d3ee" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="signal" stroke="#f472b6" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div className="glass" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>MA(7)</div>
                    <div className="mono" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>62.3%</div>
                </div>
                <div className="glass" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>MA(21)</div>
                    <div className="mono" style={{ fontWeight: 600, color: 'var(--accent-cluster)' }}>58.7%</div>
                </div>
                <div className="glass" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>VWAP</div>
                    <div className="mono" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>64.1%</div>
                </div>
            </div>
        </div>
    )
}

export default IndicatorPanel
