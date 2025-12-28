import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMarkets } from '../services/polymarket'
import type { Market } from '../services/polymarket'
import StatusBar, { Sparkline } from '../components/StatusBar'

type SortFilter = 'trending' | 'new' | 'politics' | 'crypto' | 'sports' | 'smart'
type MarketWithSmartCount = Market & { smartCount: number }

const SECTORS: { id: SortFilter; label: string; icon: string }[] = [
    { id: 'trending', label: 'Trending', icon: '⚡' },
    { id: 'new', label: 'New', icon: '✦' },
    { id: 'politics', label: 'Politics', icon: '🏛' },
    { id: 'crypto', label: 'Crypto', icon: '₿' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'smart', label: 'Smart Money', icon: '🧠' },
]

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    politics: ['trump', 'biden', 'president', 'congress', 'senate', 'democrat', 'republican', 'election'],
    crypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'crypto'],
    sports: ['nfl', 'nba', 'mlb', 'championship', 'playoffs', 'game'],
}

function getSmartWalletCount(marketId: string): number {
    if (!marketId) return 0
    const hash = marketId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return hash % 6
}

function matchCategory(market: Market): string {
    const text = ((market.question || '') + ' ' + (market.description || '')).toLowerCase()
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) return category
        }
    }
    return 'other'
}

function formatNumber(n: number): string {
    if (!n || isNaN(n)) return '$0'
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K'
    return '$' + n.toFixed(0)
}

function parsePrice(priceData: unknown): number {
    try {
        if (typeof priceData === 'number') return Math.min(100, Math.max(0, priceData * 100))
        if (Array.isArray(priceData) && priceData.length > 0) {
            return Math.min(100, Math.max(0, parseFloat(String(priceData[0])) * 100))
        }
        if (typeof priceData === 'string' && priceData.trim()) {
            const parsed = JSON.parse(priceData)
            if (Array.isArray(parsed)) return Math.min(100, Math.max(0, parseFloat(String(parsed[0])) * 100))
        }
        return 50
    } catch { return 50 }
}

export default function MarketsPage() {
    const navigate = useNavigate()
    const [markets, setMarkets] = useState<MarketWithSmartCount[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sector, setSector] = useState<SortFilter>('trending')
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                const data = await fetchMarkets(500, true)
                const validMarkets = (Array.isArray(data) ? data : [])
                    .filter((m: unknown) => m && typeof m === 'object' && (m as Market).id && (m as Market).question)
                    .map((m) => ({
                        ...(m as Market),
                        smartCount: getSmartWalletCount((m as Market).conditionId || (m as Market).id),
                    }))
                setMarkets(validMarkets)
                console.log(`Loaded ${validMarkets.length} markets`)
            } catch (err) {
                console.error('Failed to load data:', err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    const filteredMarkets = useMemo(() => {
        let result = [...markets]
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(m => (m.question || '').toLowerCase().includes(q))
        }
        if (sector === 'smart') {
            result = result.filter(m => m.smartCount > 0).sort((a, b) => b.smartCount - a.smartCount)
        } else if (sector === 'trending') {
            result.sort((a, b) => (Number(b.volume24hr) || 0) - (Number(a.volume24hr) || 0))
        } else if (sector === 'new') {
            result.sort((a, b) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime())
        } else if (CATEGORY_KEYWORDS[sector]) {
            result = result.filter(m => matchCategory(m) === sector)
        }
        return result.slice(0, 50)
    }, [markets, search, sector])

    const totalVolume = useMemo(() => markets.reduce((sum, m) => sum + (Number(m.volume) || 0), 0), [markets])
    const smartCount = useMemo(() => markets.filter(m => m.smartCount > 0).length, [markets])


    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-primary)', position: 'relative' }}>
            {/* Mobile Menu Button */}
            <button
                className="show-mobile"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                    position: 'fixed',
                    top: 12,
                    left: 12,
                    zIndex: 1001,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: 20,
                    cursor: 'pointer',
                }}
            >
                {mobileMenuOpen ? '✕' : '☰'}
            </button>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="show-mobile"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        zIndex: 999,
                    }}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
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
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section">Sectors</div>
                    {SECTORS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSector(s.id)}
                            className={`sidebar-item ${sector === s.id ? 'active' : ''}`}
                        >
                            <span className="sidebar-item-icon">{s.icon}</span>
                            <span>{s.label}</span>
                            {s.id === 'smart' && <span className="badge badge-success" style={{ marginLeft: 'auto' }}>{smartCount}</span>}
                        </button>
                    ))}
                </nav>

                {/* Stats */}
                <div style={{ padding: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Total Volume
                    </div>
                    <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }} className="text-gradient">
                        ${(totalVolume / 1000000).toFixed(0)}M
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <header className="header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                            {SECTORS.find(s => s.id === sector)?.icon} {SECTORS.find(s => s.id === sector)?.label}
                        </h1>
                        <span className="badge badge-success">
                            <span className="status-dot online" style={{ width: 6, height: 6 }} />
                            Live
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <input
                            type="text"
                            placeholder="Search markets..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="input font-mono"
                            style={{ width: 260 }}
                        />
                        <Link to="/leaderboard" className="btn btn-secondary">
                            🧠 Leaderboard
                        </Link>
                    </div>
                </header>

                {/* Table */}
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-5)' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-md)' }} />
                            ))}
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>#</th>
                                    <th>Market</th>
                                    <th style={{ textAlign: 'center', width: 80 }}>Trend</th>
                                    <th style={{ textAlign: 'center', width: 100 }}>Probability</th>
                                    <th style={{ textAlign: 'right', width: 100 }}>24h Vol</th>
                                    <th style={{ textAlign: 'center', width: 60 }}>🧠</th>
                                    <th style={{ width: 80 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMarkets.map((market, i) => {
                                    const yesPrice = parsePrice(market.outcomePrices)
                                    // Generate sparkline data based on market id (deterministic)
                                    const seed = (market.id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
                                    const sparklineData = Array.from({ length: 12 }, (_, j) =>
                                        30 + Math.sin(seed + j * 0.5) * 20 + (seed % 10)
                                    )

                                    return (
                                        <tr key={market.id} onClick={() => navigate(`/market/${market.slug || market.id}`)}>
                                            <td style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--text-xs)' }}>
                                                {i + 1}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                    {market.image && (
                                                        <img
                                                            src={market.image}
                                                            alt=""
                                                            style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                                                            onError={e => (e.currentTarget.style.display = 'none')}
                                                        />
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)', lineHeight: 1.3, maxWidth: 320 }} className="truncate">
                                                            {market.question}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 2 }}>
                                                            {market.featured && <span className="badge badge-warning" style={{ padding: '2px 6px' }}>Featured</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <Sparkline data={sparklineData} height={20} />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-1)',
                                                    padding: '4px 10px',
                                                    background: yesPrice >= 50 ? 'rgba(0, 255, 159, 0.1)' : 'rgba(255, 71, 87, 0.1)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontWeight: 600,
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    fontSize: 'var(--text-xs)',
                                                    color: yesPrice >= 50 ? 'var(--accent-primary)' : 'var(--accent-danger)',
                                                }}>
                                                    {yesPrice >= 50 ? 'Y' : 'N'} {yesPrice >= 50 ? yesPrice.toFixed(0) : (100 - yesPrice).toFixed(0)}%
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-accent)', fontSize: 'var(--text-sm)' }}>
                                                {formatNumber(Number(market.volume24hr) || 0)}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {market.smartCount > 0 ? (
                                                    <span className="badge badge-success" style={{ padding: '2px 8px' }}>{market.smartCount}</span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>—</span>
                                                )}
                                            </td>
                                            <td>
                                                <button className="btn-quick" onClick={(e) => { e.stopPropagation(); navigate(`/market/${market.slug || market.id}`) }}>
                                                    View →
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Axiom-style Status Bar */}
            <StatusBar />
        </div>
    )
}
