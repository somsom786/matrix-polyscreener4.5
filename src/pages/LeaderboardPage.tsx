import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SMART_WALLETS } from '../services/polymarket'
import TraderModal from '../components/TraderModal'

interface Trader {
    rank: number
    username: string
    twitter: string
    address: string
    fullAddress: string
    pnl: number
    realizedPnl: number
    unrealizedPnl: number
    winRate: number
    trades: number
    volume: number
}

function generateLeaderboard(): Trader[] {
    return SMART_WALLETS.map((wallet, i) => {
        const unrealized = (Math.random() - 0.3) * wallet.pnl * 0.15
        return {
            rank: i + 1,
            username: wallet.username,
            twitter: wallet.twitter,
            fullAddress: wallet.address,
            address: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
            pnl: wallet.pnl,
            realizedPnl: wallet.pnl - unrealized,
            unrealizedPnl: unrealized,
            winRate: 0.50 + Math.random() * 0.25,
            trades: 100 + Math.floor(Math.random() * 5000),
            volume: wallet.pnl * (3 + Math.random() * 8),
        }
    })
}

function formatCurrency(n: number, showSign = false): string {
    const sign = showSign && n > 0 ? '+' : ''
    if (Math.abs(n) >= 1000000) return sign + '$' + (n / 1000000).toFixed(2) + 'M'
    if (Math.abs(n) >= 1000) return sign + '$' + (n / 1000).toFixed(0) + 'K'
    return sign + '$' + n.toFixed(0)
}

function LiveTime() {
    const [time, setTime] = useState(new Date())
    useEffect(() => {
        const i = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(i)
    }, [])
    return <span>{time.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' })} UTC</span>
}

export default function LeaderboardPage() {
    const [traders] = useState<Trader[]>(() => generateLeaderboard())
    const [search, setSearch] = useState('')
    const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)

    const filteredTraders = useMemo(() => {
        if (!search) return traders
        const q = search.toLowerCase()
        return traders.filter(t => t.username.toLowerCase().includes(q) || t.twitter.toLowerCase().includes(q))
    }, [traders, search])

    const totalPnl = useMemo(() => traders.reduce((sum, t) => sum + t.pnl, 0), [traders])

    const handleCopy = async (address: string) => {
        await navigator.clipboard.writeText(address)
        setCopied(address)
        setTimeout(() => setCopied(null), 1500)
    }

    return (
        <div className="matrix-grid" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--matrix-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--matrix-bg-secondary)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <span style={{ color: 'var(--matrix-green)', fontWeight: 700, fontSize: 16, letterSpacing: '0.05em' }}>
                            POLY<span style={{ color: 'var(--matrix-text-white)' }}>SCREENER</span>
                        </span>
                    </Link>
                    <span style={{ color: 'var(--matrix-text-muted)' }}>/</span>
                    <span style={{ color: 'var(--matrix-text-dim)' }}>LEADERBOARD</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span className="status-dot online" />
                    <span style={{ fontSize: 12, color: 'var(--matrix-text-dim)' }}>
                        LIVE FEED :: <LiveTime />
                    </span>
                    <Link to="/markets" className="matrix-btn">MARKETS</Link>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ flex: 1, padding: 24 }}>
                {/* Title */}
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, color: 'var(--matrix-green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--matrix-text-muted)' }}>&gt;</span>
                        SMART_WALLET_LEADERBOARD
                    </h1>
                    <p style={{ color: 'var(--matrix-text-muted)', fontSize: 13 }}>
                        52 VERIFIED WALLETS :: COMBINED_PNL: <span style={{ color: 'var(--matrix-green)' }}>{formatCurrency(totalPnl)}</span>
                    </p>
                </div>

                {/* Search */}
                <div style={{ marginBottom: 24 }}>
                    <input
                        type="text"
                        placeholder="SEARCH_TRADER..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="matrix-input"
                        style={{ width: 300 }}
                    />
                </div>

                {/* Top 3 Podium */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                    marginBottom: 32,
                    maxWidth: 800,
                }}>
                    {filteredTraders.slice(0, 3).map((trader, i) => (
                        <div
                            key={trader.fullAddress}
                            onClick={() => { setSelectedTrader(trader); setIsModalOpen(true) }}
                            className="glow-border"
                            style={{
                                padding: 20,
                                background: 'var(--matrix-panel)',
                                cursor: 'pointer',
                                order: i === 0 ? 1 : i === 1 ? 0 : 2,
                            }}
                        >
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: 32,
                                    marginBottom: 8,
                                    color: i === 0 ? 'var(--matrix-amber)' : i === 1 ? 'var(--matrix-text-white)' : '#cd7f32',
                                }}>
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                                </div>
                                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{trader.username}</div>
                                <div style={{ fontSize: 11, color: 'var(--matrix-cyan)', marginBottom: 12 }}>{trader.twitter}</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--matrix-green)' }}>
                                    {formatCurrency(trader.pnl)}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--matrix-text-muted)', marginTop: 4 }}>
                                    {(trader.winRate * 100).toFixed(0)}% WIN_RATE
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Leaderboard Table */}
                <table className="matrix-table">
                    <thead>
                        <tr>
                            <th style={{ width: 60 }}>RANK</th>
                            <th>TRADER</th>
                            <th>ADDRESS</th>
                            <th style={{ textAlign: 'right' }}>TOTAL_PNL</th>
                            <th style={{ textAlign: 'right' }}>WIN_RATE</th>
                            <th style={{ textAlign: 'right' }}>TRADES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTraders.map((trader) => (
                            <tr
                                key={trader.fullAddress}
                                onClick={() => { setSelectedTrader(trader); setIsModalOpen(true) }}
                                style={{ cursor: 'pointer' }}
                            >
                                <td>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 28,
                                        height: 28,
                                        background: trader.rank <= 3 ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                                        border: trader.rank <= 3 ? '1px solid var(--matrix-dark-green)' : 'none',
                                        borderRadius: 4,
                                        fontWeight: trader.rank <= 3 ? 700 : 400,
                                        color: trader.rank <= 3 ? 'var(--matrix-green)' : 'var(--matrix-text-muted)',
                                    }}>
                                        {trader.rank}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 500 }}>{trader.username}</div>
                                    <div style={{ fontSize: 11, color: 'var(--matrix-cyan)' }}>{trader.twitter}</div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: 'var(--matrix-text-muted)', fontSize: 12 }}>{trader.address}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleCopy(trader.fullAddress) }}
                                            style={{
                                                background: copied === trader.fullAddress ? 'var(--matrix-green)' : 'transparent',
                                                border: '1px solid var(--matrix-border)',
                                                padding: '2px 6px',
                                                borderRadius: 2,
                                                cursor: 'pointer',
                                                fontSize: 10,
                                                color: copied === trader.fullAddress ? 'var(--matrix-bg)' : 'var(--matrix-text-muted)',
                                            }}
                                        >
                                            {copied === trader.fullAddress ? '✓' : '📋'}
                                        </button>
                                        <a
                                            href={`https://polymarket.com/profile/${trader.fullAddress}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            style={{
                                                border: '1px solid var(--matrix-border)',
                                                padding: '2px 6px',
                                                borderRadius: 2,
                                                fontSize: 10,
                                                color: 'var(--matrix-cyan)',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            ↗
                                        </a>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <span style={{ color: 'var(--matrix-green)', fontWeight: 600 }}>
                                        {formatCurrency(trader.pnl)}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--matrix-amber)' }}>
                                    {(trader.winRate * 100).toFixed(0)}%
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--matrix-text-dim)' }}>
                                    {trader.trades.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>

            {/* Trader Modal */}
            <TraderModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                trader={selectedTrader}
            />
        </div>
    )
}
