import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
    trader: { address: string; username: string; pnl: number } | null
}

type TabType = 'positions' | 'history' | 'top100' | 'activity' | 'calendar'

// Generate realistic demo data for a trader
function generateTraderData(address: string, username: string): TraderData {
    const markets = [
        'Trump wins 2024?', 'Fed rate cut Jan?', 'BTC above $100k?',
        'Russia ceasefire 2025?', 'Super Bowl Chiefs?', 'Solana above $200?',
        'Xi steps down?', 'ETH flips BTC?', 'Tesla FSD launch?'
    ]

    // Generate positions
    const positions: Position[] = Array.from({ length: 3 + Math.floor(Math.random() * 5) }, (_, i) => {
        const avgPrice = 0.3 + Math.random() * 0.4
        const currentPrice = avgPrice + (Math.random() - 0.5) * 0.3
        const shares = 500 + Math.floor(Math.random() * 10000)
        return {
            id: `pos-${i}`,
            market: markets[Math.floor(Math.random() * markets.length)],
            outcome: Math.random() > 0.4 ? 'Yes' : 'No',
            shares,
            avgPrice,
            currentPrice: Math.max(0.01, Math.min(0.99, currentPrice)),
            unrealizedPnl: shares * (currentPrice - avgPrice),
        }
    })

    // Generate trade history
    const history: Trade[] = Array.from({ length: 50 }, (_, i) => {
        const type = Math.random() > 0.5 ? 'buy' : 'sell'
        const price = 0.2 + Math.random() * 0.6
        const amount = 100 + Math.floor(Math.random() * 5000)
        const pnlPercent = (Math.random() - 0.4) * 0.5 // Slightly positive bias
        return {
            id: `trade-${i}`,
            market: markets[Math.floor(Math.random() * markets.length)],
            type,
            outcome: Math.random() > 0.4 ? 'Yes' : 'No',
            amount,
            price,
            pnl: amount * pnlPercent,
            timestamp: new Date(Date.now() - i * 3600000 * Math.random() * 24),
        }
    })

    const totalUnrealized = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0)
    const totalRealized = history.reduce((sum, t) => sum + t.pnl, 0)

    return {
        address,
        username,
        totalValue: 5000 + Math.random() * 50000,
        unrealizedPnl: totalUnrealized,
        realizedPnl: totalRealized,
        availableBalance: 2000 + Math.random() * 20000,
        totalTxns: 10000 + Math.floor(Math.random() * 50000),
        positions,
        history,
        activity: history.slice(0, 20),
    }
}

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

    // Generate data based on trader
    const data = useMemo(() => {
        if (!trader) return null
        return generateTraderData(trader.address, trader.username)
    }, [trader])

    const calendarData = useMemo(() => generateCalendarData(), [])

    // Top 100 trades sorted by absolute PNL
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
                                        <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.address}</span>
                                        <button
                                            onClick={async () => {
                                                await navigator.clipboard.writeText(data.address)
                                            }}
                                            title="Copy address"
                                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)' }}
                                        >
                                            📋
                                        </button>
                                        <a
                                            href={`https://polymarket.com/profile/${data.address}`}
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
