import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchUserPositions, fetchUserTrades, type UserPosition, type UserTrade } from '../services/polymarket'

interface Trade {
    id: string
    market: string
    type: 'buy' | 'sell'
    outcome: string
    amount: number
    price: number
    pnl: number
    timestamp: Date
}

interface Position {
    id: string
    market: string
    outcome: string
    shares: number
    avgPrice: number
    currentPrice: number
    unrealizedPnl: number
}

interface TraderData {
    address: string
    username: string
    totalValue: number
    unrealizedPnl: number
    realizedPnl: number
    availableBalance: number
    totalTxns: number
    positions: Position[]
    history: Trade[]
    activity: Trade[]
}

interface TraderModalProps {
    isOpen: boolean
    onClose: () => void
    trader: { address: string; fullAddress?: string; username: string; pnl: number } | null
}

type TabType = 'positions' | 'history' | 'top100' | 'activity' | 'calendar'

// Generate calendar PNL data
function generateCalendarData(): { day: number; pnl: number }[] {
    return Array.from({ length: 28 }, (_, i) => ({
        day: i + 1,
        pnl: (Math.random() - 0.3) * 3000, // Slightly positive bias
    }))
}

function formatCurrency(n: number, showSign = false): string {
    const sign = showSign && n > 0 ? '+' : ''
    if (Math.abs(n) >= 1000000) return sign + '$' + (n / 1000000).toFixed(2) + 'M'
    if (Math.abs(n) >= 1000) return sign + '$' + (n / 1000).toFixed(2) + 'K'
    return sign + '$' + n.toFixed(2)
}

function formatPercent(n: number): string {
    return (n * 100).toFixed(1) + '¢'
}

export default function TraderModal({ isOpen, onClose, trader }: TraderModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('positions')
    const [calendarMonth] = useState('Dec 2025')
    const [realPositions, setRealPositions] = useState<UserPosition[]>([])
    const [realTrades, setRealTrades] = useState<UserTrade[]>([])

    // Get the full address for links (fallback to address if fullAddress not provided)
    const fullAddress = trader?.fullAddress || trader?.address || ''

    // Fetch REAL positions and trades from Polymarket API
    useEffect(() => {
        if (!isOpen || !fullAddress) {
            setRealPositions([])
            setRealTrades([])
            return
        }

        // Fetch positions
        fetchUserPositions(fullAddress)
            .then(positions => {
                console.log(`Loaded ${positions.length} real positions for ${trader?.username}`)
                setRealPositions(positions)
            })
            .catch(err => {
                console.error('Failed to fetch positions:', err)
                setRealPositions([])
            })

        // Fetch trades (history)
        fetchUserTrades(fullAddress, 100)
            .then(trades => {
                console.log(`Loaded ${trades.length} real trades for ${trader?.username}`)
                setRealTrades(trades)
            })
            .catch(err => {
                console.error('Failed to fetch trades:', err)
                setRealTrades([])
            })
    }, [isOpen, fullAddress, trader?.username])

    // Convert real data to our display format
    const data = useMemo((): TraderData | null => {
        if (!trader) return null

        const positions: Position[] = realPositions.map((pos, i) => ({
            id: `pos-${i}`,
            market: pos.marketQuestion || `Market ${pos.conditionId?.slice(0, 8)}`,
            outcome: pos.outcome === 'yes' ? 'Yes' : 'No',
            shares: pos.shares,
            avgPrice: pos.avgPrice / 100,
            currentPrice: pos.currentPrice / 100,
            unrealizedPnl: pos.unrealizedPnl,
        }))

        // Convert real trades to Trade format
        const history: Trade[] = realTrades.map((t, i) => ({
            id: t.id || `trade-${i}`,
            market: t.marketTitle || 'Unknown Market',
            type: t.side.toLowerCase() as 'buy' | 'sell',
            outcome: t.outcome === 'yes' ? 'Yes' : 'No',
            amount: t.value,
            price: t.price / 100,
            pnl: t.pnl,
            timestamp: new Date(t.timestamp),
        }))

        const totalUnrealized = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0)
        const totalRealized = history.reduce((sum, t) => sum + t.pnl, 0)
        const totalValue = positions.reduce((sum, p) => sum + p.shares * p.currentPrice, 0) || trader.pnl * 0.3

        return {
            address: fullAddress,
            username: trader.username,
            totalValue,
            unrealizedPnl: totalUnrealized,
            realizedPnl: totalRealized || trader.pnl - totalUnrealized,
            availableBalance: totalValue,
            totalTxns: history.length,
            positions,
            history,
            activity: history.slice(0, 20), // Most recent trades for activity tab
        }
    }, [trader, fullAddress, realPositions, realTrades])

    const calendarData = useMemo(() => generateCalendarData(), [])

    // Top 100 trades (empty since we fetch real positions only)
    const top100 = useMemo(() => {
        if (!data) return []
        return [...data.history].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).slice(0, 100)
    }, [data])

    if (!trader || !data) return null

    const tabs: { id: TabType; label: string }[] = [
        { id: 'positions', label: 'Active Positions' },
        { id: 'history', label: 'History' },
        { id: 'top100', label: 'Top 100' },
        { id: 'activity', label: 'Activity' },
        { id: 'calendar', label: 'Calendar' },
    ]

    // Calculate performance stats
    const winRate = data.history.filter(t => t.pnl > 0).length / data.history.length
    const profitTrades = data.history.filter(t => t.pnl > 0).length
    const lossTrades = data.history.filter(t => t.pnl < 0).length

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                            zIndex: 1000, backdropFilter: 'blur(4px)',
                        }}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        style={{
                            position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)',
                            width: '90%', maxWidth: 1000, maxHeight: '90vh',
                            background: 'var(--bg-secondary)', borderRadius: 16,
                            border: '1px solid var(--glass-border)',
                            zIndex: 1001, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        }}
                    >
                        {/* Header */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                    {data.username.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 16 }}>{data.username}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {trader?.address || `${fullAddress.slice(0, 6)}...${fullAddress.slice(-4)}`}
                                        </span>
                                        <button
                                            onClick={async () => {
                                                await navigator.clipboard.writeText(fullAddress)
                                            }}
                                            title="Copy full address"
                                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)' }}
                                        >
                                            📋
                                        </button>
                                        <a
                                            href={`https://polymarket.com/profile/${fullAddress}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="View on Polymarket"
                                            style={{ background: 'rgba(139, 92, 246, 0.2)', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 10, color: 'var(--accent-primary)', textDecoration: 'none' }}
                                        >
                                            ↗
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>↗ 1d 7d 30d Max</span>
                                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 24, cursor: 'pointer', padding: 4 }}>×</button>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 1, background: 'var(--glass-border)' }}>
                            {/* Balance */}
                            <div style={{ background: 'var(--bg-secondary)', padding: 16 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Value</div>
                                <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{formatCurrency(data.totalValue)}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, marginBottom: 4 }}>Unrealized PNL</div>
                                <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: data.unrealizedPnl >= 0 ? 'var(--accent-profit)' : 'var(--accent-loss)' }}>
                                    {formatCurrency(data.unrealizedPnl, true)}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, marginBottom: 4 }}>Available Balance</div>
                                <div className="mono" style={{ fontSize: 16 }}>{formatCurrency(data.availableBalance)}</div>
                            </div>

                            {/* PNL Chart Placeholder */}
                            <div style={{ background: 'var(--bg-secondary)', padding: 16, position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600 }}>PNL</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📅</span>
                                </div>
                                {/* Simplified chart representation */}
                                <div style={{ height: 80, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                                    {Array.from({ length: 30 }, (_, i) => {
                                        const height = 20 + Math.random() * 60
                                        return (
                                            <div key={i} style={{ flex: 1, height: `${height}%`, background: 'linear-gradient(to top, rgba(74, 222, 128, 0.3), rgba(74, 222, 128, 0.8))', borderRadius: 2 }} />
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Performance */}
                            <div style={{ background: 'var(--bg-secondary)', padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600 }}>Performance</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📤</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Unrealized PNL</span>
                                        <span className="mono" style={{ color: data.unrealizedPnl >= 0 ? 'var(--accent-profit)' : 'var(--accent-loss)' }}>{formatCurrency(data.unrealizedPnl, true)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Realized PNL</span>
                                        <span className="mono" style={{ color: data.realizedPnl >= 0 ? 'var(--accent-profit)' : 'var(--accent-loss)' }}>{formatCurrency(data.realizedPnl, true)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Total TXNs</span>
                                        <span className="mono">{data.totalTxns.toLocaleString()} <span style={{ color: 'var(--accent-profit)' }}>{profitTrades}</span> / <span style={{ color: 'var(--accent-loss)' }}>{lossTrades}</span></span>
                                    </div>
                                </div>
                                {/* Win rate bar */}
                                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden', display: 'flex' }}>
                                        <div style={{ width: `${winRate * 100}%`, background: 'var(--accent-profit)' }} />
                                        <div style={{ flex: 1, background: 'var(--accent-loss)' }} />
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Win Rate: {(winRate * 100).toFixed(0)}%</div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', padding: '0 16px' }}>
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        padding: '12px 16px', background: 'transparent', border: 'none',
                                        color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                                        fontWeight: activeTab === tab.id ? 600 : 400, fontSize: 13, cursor: 'pointer',
                                        borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                        marginBottom: -1,
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                            {/* Active Positions */}
                            {activeTab === 'positions' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Market</th>
                                            <th style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Side</th>
                                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Shares</th>
                                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Avg Price</th>
                                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Current</th>
                                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Unrealized P/L</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.positions.map(pos => (
                                            <tr key={pos.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                <td style={{ padding: '10px 8px', fontSize: 13 }}>{pos.market}</td>
                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                                    <span className="badge" style={{ background: pos.outcome === 'Yes' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)', color: pos.outcome === 'Yes' ? 'var(--accent-profit)' : 'var(--accent-loss)' }}>
                                                        {pos.outcome}
                                                    </span>
                                                </td>
                                                <td className="mono" style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13 }}>{pos.shares.toLocaleString()}</td>
                                                <td className="mono" style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13 }}>{formatPercent(pos.avgPrice)}</td>
                                                <td className="mono" style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13 }}>{formatPercent(pos.currentPrice)}</td>
                                                <td className="mono" style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13, color: pos.unrealizedPnl >= 0 ? 'var(--accent-profit)' : 'var(--accent-loss)', fontWeight: 600 }}>
                                                    {formatCurrency(pos.unrealizedPnl, true)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* History */}
                            {activeTab === 'history' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Type</th>
                                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Market</th>
                                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Amount</th>
                                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Price</th>
                                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>P/L</th>
                                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.history.slice(0, 30).map(trade => (
                                            <tr key={trade.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                <td style={{ padding: '10px 8px' }}>
                                                    <span style={{ color: trade.type === 'buy' ? 'var(--accent-profit)' : 'var(--accent-loss)', fontWeight: 600, fontSize: 12 }}>
                                                        {trade.type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 8px', fontSize: 13 }}>{trade.market}</td>
                                                <td className="mono" style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13 }}>{formatCurrency(trade.amount)}</td>
                                                <td className="mono" style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13 }}>{formatPercent(trade.price)}</td>
                                                <td className="mono" style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13, color: trade.pnl >= 0 ? 'var(--accent-profit)' : 'var(--accent-loss)', fontWeight: 600 }}>
                                                    {formatCurrency(trade.pnl, true)}
                                                </td>
                                                <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
                                                    {Math.floor((Date.now() - trade.timestamp.getTime()) / 3600000)}h
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Top 100 */}
                            {activeTab === 'top100' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>#</th>
                                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Market</th>
                                            <th style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Type</th>
                                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>Amount</th>
                                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>P/L</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {top100.slice(0, 20).map((trade, i) => (
                                            <tr key={trade.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                <td className="mono" style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text-muted)' }}>{i + 1}</td>
                                                <td style={{ padding: '10px 8px', fontSize: 13 }}>{trade.market}</td>
                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                                    <span style={{ color: trade.type === 'buy' ? 'var(--accent-profit)' : 'var(--accent-loss)', fontWeight: 600, fontSize: 12 }}>
                                                        {trade.type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="mono" style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13 }}>{formatCurrency(trade.amount)}</td>
                                                <td className="mono" style={{ padding: '10px 8px', textAlign: 'right', fontSize: 14, color: trade.pnl >= 0 ? 'var(--accent-profit)' : 'var(--accent-loss)', fontWeight: 700 }}>
                                                    {formatCurrency(trade.pnl, true)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Activity */}
                            {activeTab === 'activity' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {data.activity.map(trade => (
                                        <div key={trade.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                                            <span style={{ color: trade.type === 'buy' ? 'var(--accent-profit)' : 'var(--accent-loss)', fontWeight: 600, fontSize: 12, width: 40 }}>
                                                {trade.type.toUpperCase()}
                                            </span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 500 }}>{trade.market}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{trade.outcome}</div>
                                            </div>
                                            <div className="mono" style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 13 }}>{formatCurrency(trade.amount)}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.floor((Date.now() - trade.timestamp.getTime()) / 3600000)}h ago</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Calendar */}
                            {activeTab === 'calendar' && (
                                <div>
                                    {/* Calendar Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>PNL Calendar</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>←</span>
                                            <span style={{ fontWeight: 500 }}>{calendarMonth}</span>
                                            <span style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>→</span>
                                        </div>
                                    </div>

                                    {/* Total Row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                                        <span className="mono" style={{ color: 'var(--accent-profit)', fontWeight: 600 }}>
                                            +{formatCurrency(calendarData.filter(d => d.pnl > 0).reduce((s, d) => s + d.pnl, 0))}
                                        </span>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            <span style={{ color: 'var(--accent-profit)' }}>{calendarData.filter(d => d.pnl > 0).length}</span> / <span style={{ color: 'var(--accent-loss)' }}>{calendarData.filter(d => d.pnl < 0).length}</span>
                                        </div>
                                        <span className="mono" style={{ color: 'var(--accent-loss)', fontWeight: 600 }}>
                                            {formatCurrency(calendarData.filter(d => d.pnl < 0).reduce((s, d) => s + d.pnl, 0))}
                                        </span>
                                    </div>

                                    {/* Weekday Headers */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                                            <div key={i} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: 4 }}>{day}</div>
                                        ))}
                                    </div>

                                    {/* Calendar Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                                        {calendarData.map((day, i) => {
                                            const intensity = Math.min(1, Math.abs(day.pnl) / 2000)
                                            const bgColor = day.pnl >= 0
                                                ? `rgba(74, 222, 128, ${0.2 + intensity * 0.6})`
                                                : `rgba(248, 113, 113, ${0.2 + intensity * 0.6})`
                                            return (
                                                <div
                                                    key={i}
                                                    style={{
                                                        aspectRatio: '1', background: bgColor, borderRadius: 6,
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                        padding: 4, minHeight: 60,
                                                    }}
                                                >
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{day.day}</div>
                                                    <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: day.pnl >= 0 ? 'var(--accent-profit)' : 'var(--accent-loss)' }}>
                                                        {day.pnl >= 0 ? '+' : ''}{formatCurrency(day.pnl).replace('$', '')}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Streak Info */}
                                    <div style={{ display: 'flex', gap: 16, marginTop: 16, padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                                        <div style={{ fontSize: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Current Streak: </span>
                                            <span style={{ fontWeight: 600 }}>3 days</span>
                                        </div>
                                        <div style={{ fontSize: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Best Streak in {calendarMonth}: </span>
                                            <span style={{ fontWeight: 600, color: 'var(--accent-profit)' }}>15 days</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
