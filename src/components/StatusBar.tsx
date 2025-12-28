import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

// Simulated price data - in production this would come from an API
function useCryptoPrices() {
    const [prices, setPrices] = useState({
        BTC: { price: 94521, change: 2.3 },
        ETH: { price: 3412, change: 1.8 },
        SOL: { price: 189.5, change: -0.5 },
    })

    useEffect(() => {
        // Simulate price updates
        const interval = setInterval(() => {
            setPrices(prev => ({
                BTC: { price: prev.BTC.price * (1 + (Math.random() - 0.5) * 0.001), change: prev.BTC.change + (Math.random() - 0.5) * 0.1 },
                ETH: { price: prev.ETH.price * (1 + (Math.random() - 0.5) * 0.001), change: prev.ETH.change + (Math.random() - 0.5) * 0.1 },
                SOL: { price: prev.SOL.price * (1 + (Math.random() - 0.5) * 0.001), change: prev.SOL.change + (Math.random() - 0.5) * 0.1 },
            }))
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    return prices
}

export default function StatusBar() {
    const prices = useCryptoPrices()
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        // Add body class for padding
        document.body.classList.add('has-status-bar')
        return () => document.body.classList.remove('has-status-bar')
    }, [])

    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    const formatPrice = (price: number, decimals = 0) => {
        if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: decimals })
        return '$' + price.toFixed(2)
    }

    return (
        <div className="status-bar">
            {/* Left side - Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
                <div className="status-bar-item">
                    <span className="status-dot online" style={{ width: 6, height: 6 }} />
                    <span>Connected</span>
                </div>
                <div className="status-bar-item">
                    <span>52 wallets tracked</span>
                </div>
            </div>

            {/* Center - Crypto prices */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
                {Object.entries(prices).map(([symbol, data]) => (
                    <div key={symbol} className="status-bar-item">
                        <span>{symbol}</span>
                        <span className={`status-bar-price ${data.change >= 0 ? 'up' : 'down'}`}>
                            {formatPrice(data.price, symbol === 'SOL' ? 2 : 0)}
                        </span>
                        <span style={{ color: data.change >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)', fontSize: 10 }}>
                            {data.change >= 0 ? '↑' : '↓'}{Math.abs(data.change).toFixed(1)}%
                        </span>
                    </div>
                ))}
            </div>

            {/* Right side - Links & Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 'var(--text-xs)' }}>
                    Docs
                </Link>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 'var(--text-xs)' }}>
                    Twitter
                </a>
                <span style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {time.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' })} UTC
                </span>
            </div>
        </div>
    )
}

// Sparkline Component
export function Sparkline({ data, height = 24 }: { data: number[]; height?: number }) {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const isUp = data[data.length - 1] >= data[0]

    return (
        <div className="sparkline" style={{ height }}>
            {data.map((value, i) => {
                const heightPercent = ((value - min) / range) * 100
                return (
                    <div
                        key={i}
                        className={`sparkline-bar ${isUp ? '' : 'down'}`}
                        style={{ height: `${Math.max(10, heightPercent)}%` }}
                    />
                )
            })}
        </div>
    )
}

// Circular Progress Component
export function CircularProgress({ value, size = 40 }: { value: number; size?: number }) {
    const radius = (size - 8) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (value / 100) * circumference

    return (
        <div className="circular-progress" style={{ width: size, height: size }}>
            <svg>
                <circle
                    className="circular-progress-bg"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                />
                <circle
                    className="circular-progress-fill"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                />
            </svg>
            <span className="circular-progress-text">{Math.round(value)}%</span>
        </div>
    )
}
