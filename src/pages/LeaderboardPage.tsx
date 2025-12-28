import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SMART_WALLETS } from '../services/polymarket'
import TraderModal from '../components/TraderModal'
import StatusBar, { CircularProgress } from '../components/StatusBar'

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

function formatCurrency(n: number): string {
    if (Math.abs(n) >= 1000000) return '$' + (n / 1000000).toFixed(2) + 'M'
    if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(0) + 'K'
    return '$' + n.toFixed(0)
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

    const top3 = filteredTraders.slice(0, 3)

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Header */}
            <header className="header" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: 'var(--bg-primary)',
                            fontSize: 12,
                        }}>
                            PS
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Polyscreener</span>
                    </Link>
                    <span style={{ color: 'var(--text-muted)' }}>/</span>
                    <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>🧠 Leaderboard</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <input
                        type="text"
                        placeholder="Search traders..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input font-mono"
                        style={{ width: 220 }}
                    />
                    <Link to="/markets" className="btn btn-secondary">Markets</Link>
                </div>
            </header>

            {/* Content */}
            <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--space-6)' }}>
                {/* Stats */}
                <div style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
                    <div className="card-elevated" style={{ padding: 'var(--space-5)', flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
                            Verified Wallets
                        </div>
                        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }} className="text-gradient font-mono">
                            {traders.length}
                        </div>
                    </div>
                    <div className="card-elevated" style={{ padding: 'var(--space-5)', flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
                            Combined PNL
                        </div>
                        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--accent-primary)' }} className="font-mono">
                            {formatCurrency(totalPnl)}
                        </div>
                    </div>
                    <div className="card-elevated" style={{ padding: 'var(--space-5)', flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
                            Avg Win Rate
                        </div>
                        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--accent-highlight)' }} className="font-mono">
                            62%
                        </div>
                    </div>
                </div>

                {/* Top 3 Podium - Axiom-Style */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                    {top3.map((trader, i) => {
                        const podiumClass = i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze'
                        return (
                            <div
                                key={trader.fullAddress}
                                onClick={() => { setSelectedTrader(trader); setIsModalOpen(true) }}
                                className={`podium-card ${podiumClass}`}
                                style={{
                                    cursor: 'pointer',
                                    order: i === 0 ? 1 : i === 1 ? 0 : 2,
                                    textAlign: 'center',
                                }}
                            >
                                <div style={{ fontSize: 32, marginBottom: 'var(--space-3)' }}>
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                                </div>
                                <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)', marginBottom: 'var(--space-1)' }}>
                                    {trader.username}
                                </div>
                                <a
                                    href={`https://twitter.com/${trader.twitter.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-secondary)', textDecoration: 'none' }}
                                >
                                    {trader.twitter}
                                </a>
                                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--accent-primary)', marginTop: 'var(--space-4)' }} className="font-mono">
                                    {formatCurrency(trader.pnl)}
                                </div>

                                {/* Circular Progress for Win Rate */}
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-4)', gap: 'var(--space-3)', alignItems: 'center' }}>
                                    <CircularProgress value={trader.winRate * 100} size={36} />
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Win Rate</span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Table */}
                <div className="card-elevated" style={{ overflow: 'hidden' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: 60 }}>Rank</th>
                                <th>Trader</th>
                                <th>Address</th>
                                <th style={{ textAlign: 'right' }}>PNL</th>
                                <th style={{ textAlign: 'right' }}>Win Rate</th>
                                <th style={{ textAlign: 'right' }}>Trades</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTraders.map((trader) => (
                                <tr
                                    key={trader.fullAddress}
                                    onClick={() => { setSelectedTrader(trader); setIsModalOpen(true) }}
                                >
                                    <td>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 28,
                                            height: 28,
                                            borderRadius: 'var(--radius-sm)',
                                            background: trader.rank <= 3 ? 'rgba(0, 255, 159, 0.1)' : 'transparent',
                                            fontWeight: trader.rank <= 3 ? 600 : 400,
                                            color: trader.rank <= 3 ? 'var(--accent-primary)' : 'var(--text-muted)',
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 'var(--text-sm)',
                                        }}>
                                            {trader.rank}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{trader.username}</div>
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-secondary)' }}>{trader.twitter}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <span style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--text-sm)' }}>
                                                {trader.address}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleCopy(trader.fullAddress) }}
                                                className="btn btn-ghost"
                                                style={{ padding: '2px 6px', fontSize: 'var(--text-xs)' }}
                                            >
                                                {copied === trader.fullAddress ? '✓' : '📋'}
                                            </button>
                                            <a
                                                href={`https://polymarket.com/profile/${trader.fullAddress}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="btn btn-ghost"
                                                style={{ padding: '2px 6px', fontSize: 'var(--text-xs)', color: 'var(--accent-secondary)' }}
                                            >
                                                ↗
                                            </a>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span style={{ color: 'var(--accent-primary)', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                                            {formatCurrency(trader.pnl)}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', color: 'var(--accent-highlight)', fontFamily: "'JetBrains Mono', monospace" }}>
                                        {(trader.winRate * 100).toFixed(0)}%
                                    </td>
                                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                                        {trader.trades.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            <TraderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} trader={selectedTrader} />
            <StatusBar />
        </div>
    )
}
