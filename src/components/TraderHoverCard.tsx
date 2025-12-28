import { useState, useRef } from 'react'
import { fetchUserPositions, fetchUserTrades } from '../services/polymarket'

interface TraderHoverCardProps {
    address: string
    username?: string
    children: React.ReactNode
}

interface TraderStats {
    pnl: number
    positionValue: number
    totalTrades: number
    winRate: number
    avgTradeSize: number
    recentPerformance: number[] // Last 10 trades P/L for mini chart
}

// Helper to format address as shortened display
function formatAddress(address: string): string {
    if (!address || address.length < 10) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function TraderHoverCard({ address, username, children }: TraderHoverCardProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [stats, setStats] = useState<TraderStats | null>(null)
    const [loading, setLoading] = useState(false)
    const timeoutRef = useRef<number | null>(null)
    const cardRef = useRef<HTMLDivElement>(null)

    // Display name: use username if exists, otherwise shortened address
    const displayName = username && username.trim() ? username : formatAddress(address)

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setIsOpen(true)
        if (!stats && !loading) {
            loadStats()
        }
    }

    const handleMouseLeave = () => {
        timeoutRef.current = window.setTimeout(() => {
            setIsOpen(false)
        }, 300)
    }

    async function loadStats() {
        setLoading(true)
        try {
            // Fetch positions and trades
            const [positions, trades] = await Promise.all([
                fetchUserPositions(address),
                fetchUserTrades(address, 50)
            ])

            const totalValue = positions.reduce((acc, p) => acc + p.value, 0)
            const totalPnl = positions.reduce((acc, p) => acc + p.unrealizedPnl, 0)

            // Calculate win rate and average trade size from trades
            const wins = trades.filter(t => t.pnl > 0).length
            const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0
            const avgTradeSize = trades.length > 0
                ? trades.reduce((acc, t) => acc + t.value, 0) / trades.length
                : 0

            // Get recent performance for mini chart (last 10 trades P/L)
            const recentPerformance = trades.slice(0, 10).map(t => t.pnl || 0)

            setStats({
                pnl: totalPnl,
                positionValue: totalValue,
                totalTrades: trades.length,
                winRate,
                avgTradeSize,
                recentPerformance
            })
        } catch (err) {
            console.error('Failed to load trader stats:', err)
            setStats({
                pnl: 0,
                positionValue: 0,
                totalTrades: 0,
                winRate: 0,
                avgTradeSize: 0,
                recentPerformance: []
            })
        } finally {
            setLoading(false)
        }
    }

    // Mini sparkline chart component
    const MiniSparkline = ({ data }: { data: number[] }) => {
        if (data.length === 0) return null

        const max = Math.max(...data.map(Math.abs), 1)
        const height = 24
        const width = 80
        const pointWidth = width / Math.max(data.length - 1, 1)

        const points = data.map((val, i) => {
            const x = i * pointWidth
            const y = height / 2 - (val / max) * (height / 2 - 2)
            return `${x},${y}`
        }).join(' ')

        return (
            <svg width={width} height={height} style={{ display: 'block' }}>
                <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
                <polyline
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth="1.5"
                    points={points}
                />
            </svg>
        )
    }

    return (
        <div
            ref={cardRef}
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: 12,
                    background: 'rgba(10, 15, 25, 0.98)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: 16,
                    zIndex: 1000,
                    minWidth: 240,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(12px)',
                    animation: 'fadeInUp 0.2s ease-out',
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                        paddingBottom: 10,
                        borderBottom: '1px solid var(--border-subtle)'
                    }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                            {displayName}
                        </span>
                        <a
                            href={`https://polymarket.com/profile/${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                fontSize: 9,
                                color: 'var(--accent-primary)',
                                textDecoration: 'none',
                                opacity: 0.8,
                                transition: 'opacity 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                        >
                            View Profile →
                        </a>
                    </div>

                    {loading ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px 0',
                            color: 'var(--text-muted)',
                            fontSize: 11
                        }}>
                            <div style={{
                                width: 14,
                                height: 14,
                                border: '2px solid var(--border-subtle)',
                                borderTopColor: 'var(--accent-primary)',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                                marginRight: 8
                            }} />
                            Loading stats...
                        </div>
                    ) : stats ? (
                        <div>
                            {/* Main Stats Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 10,
                                marginBottom: 12
                            }}>
                                <div style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '8px 10px',
                                    borderRadius: 6
                                }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Portfolio</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
                                        ${stats.positionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                </div>
                                <div style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '8px 10px',
                                    borderRadius: 6
                                }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Est. PnL</div>
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        fontFamily: 'monospace',
                                        color: stats.pnl >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)'
                                    }}>
                                        {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                </div>
                                <div style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '8px 10px',
                                    borderRadius: 6
                                }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Win Rate</div>
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: stats.winRate >= 50 ? 'var(--accent-primary)' : 'var(--accent-danger)'
                                    }}>
                                        {stats.winRate.toFixed(0)}%
                                    </div>
                                </div>
                                <div style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '8px 10px',
                                    borderRadius: 6
                                }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Total Trades</div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                                        {stats.totalTrades}
                                    </div>
                                </div>
                            </div>

                            {/* Mini Performance Chart */}
                            {stats.recentPerformance.length > 0 && (
                                <div style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Recent Performance</div>
                                    <MiniSparkline data={stats.recentPerformance} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>
                            No data available
                        </div>
                    )}

                    {/* Arrow */}
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        borderWidth: 8,
                        borderStyle: 'solid',
                        borderColor: 'rgba(10, 15, 25, 0.98) transparent transparent transparent',
                    }} />
                </div>
            )}
        </div>
    )
}
