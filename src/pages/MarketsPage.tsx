import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMarkets, SMART_WALLETS } from '../services/polymarket'
import type { Market } from '../services/polymarket'

// Sort filter types
type SortFilter = 'trending' | 'new' | 'politics' | 'crypto' | 'sports' | 'business' | 'science' | 'culture' | 'smart'
type MarketWithSmartCount = Market & { smartCount: number }

const SECTORS: { id: SortFilter; label: string; icon: string }[] = [
    { id: 'trending', label: 'Trending', icon: '⚡' },
    { id: 'new', label: 'New', icon: '✦' },
    { id: 'politics', label: 'Politics', icon: '⚖' },
    { id: 'crypto', label: 'Crypto', icon: '₿' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'business', label: 'Business', icon: '$' },
    { id: 'science', label: 'Science', icon: '⚗' },
    { id: 'culture', label: 'Culture', icon: '#' },
    { id: 'smart', label: 'Smart Only', icon: '🧠' },
]

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    politics: ['trump', 'biden', 'president', 'congress', 'senate', 'democrat', 'republican', 'election', 'vote'],
    crypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'crypto', 'token', 'blockchain'],
    sports: ['nfl', 'nba', 'mlb', 'championship', 'playoffs', 'game', 'win the', 'football', 'basketball'],
    business: ['fed', 'interest rate', 'stock', 'market', 'nasdaq', 'trading', 'earnings'],
    science: ['ai', 'gpt', 'spacex', 'nasa', 'climate', 'research'],
    culture: ['movie', 'oscar', 'grammy', 'celebrity', 'netflix', 'album'],
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
            if (Array.isArray(parsed) && parsed.length > 0) {
                return Math.min(100, Math.max(0, parseFloat(String(parsed[0])) * 100))
            }
        }
        return 50
    } catch {
        return 50
    }
}

// Live time component
function LiveTime() {
    const [time, setTime] = useState(new Date())
    useEffect(() => {
        const i = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(i)
    }, [])
    return <span>{time.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' })} UTC</span>
}

export default function MarketsPage() {
    const navigate = useNavigate()
    const [markets, setMarkets] = useState<MarketWithSmartCount[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sector, setSector] = useState<SortFilter>('trending')

    useEffect(() => {
        async function loadMarkets() {
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
            } catch (err) {
                console.error('Failed to load markets:', err)
            } finally {
                setLoading(false)
            }
        }
        loadMarkets()
    }, [])

    const filteredMarkets = useMemo(() => {
        let result = [...markets]

        // Search
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(m => (m.question || '').toLowerCase().includes(q))
        }

        // Sector filter
        if (sector === 'smart') {
            result = result.filter(m => m.smartCount > 0).sort((a, b) => b.smartCount - a.smartCount)
        } else if (sector === 'trending') {
            result.sort((a, b) => (Number(b.volume24hr) || Number(b.volume) || 0) - (Number(a.volume24hr) || Number(a.volume) || 0))
        } else if (sector === 'new') {
            result.sort((a, b) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime())
        } else if (CATEGORY_KEYWORDS[sector]) {
            result = result.filter(m => matchCategory(m) === sector)
            result.sort((a, b) => (Number(b.volume24hr) || 0) - (Number(a.volume24hr) || 0))
        }

        return result.slice(0, 100)
    }, [markets, search, sector])

    const totalVolume = useMemo(() => markets.reduce((sum, m) => sum + (Number(m.volume) || 0), 0), [markets])
    const smartMarketsCount = useMemo(() => markets.filter(m => m.smartCount > 0).length, [markets])

    return (
        <div className="matrix-grid" style={{ minHeight: '100vh', display: 'flex' }}>
            {/* Left Sidebar */}
            <aside style={{
                width: 200,
                background: 'var(--matrix-bg-secondary)',
                borderRight: '1px solid var(--matrix-border)',
                display: 'flex',
                flexDirection: 'column',
                position: 'sticky',
                top: 0,
                height: '100vh',
            }}>
                {/* Logo */}
                <Link to="/" style={{
                    padding: '20px 16px',
                    borderBottom: '1px solid var(--matrix-border)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <span style={{ color: 'var(--matrix-green)', fontWeight: 700, fontSize: 16, letterSpacing: '0.05em' }}>
                        POLY<span style={{ color: 'var(--matrix-text-white)' }}>SCREENER</span>
                    </span>
                </Link>

                {/* Sectors */}
                <div style={{ padding: '12px 0' }}>
                    <div style={{
                        padding: '8px 16px',
                        fontSize: 11,
                        color: 'var(--matrix-text-muted)',
                        letterSpacing: '0.15em',
                    }}>
                        SECTORS
                    </div>
                    {SECTORS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSector(s.id)}
                            className={`sidebar-nav-item ${sector === s.id ? 'active' : ''}`}
                            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                        >
                            <span style={{ width: 20, textAlign: 'center' }}>{s.icon}</span>
                            <span>{s.label}</span>
                        </button>
                    ))}
                </div>

                {/* Market Pulse */}
                <div style={{ marginTop: 'auto', padding: 16, borderTop: '1px solid var(--matrix-border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--matrix-text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>
                        MARKET_PULSE
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--matrix-green)' }}>
                        {(totalVolume / 1000000).toFixed(1)}M
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--matrix-text-muted)' }}>TOTAL_VOLUME</div>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Top Bar */}
                <header style={{
                    padding: '12px 24px',
                    borderBottom: '1px solid var(--matrix-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--matrix-bg-secondary)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span className="status-dot online" />
                        <span style={{ fontSize: 12, color: 'var(--matrix-text-dim)' }}>
                            LIVE FEED CONNECTED :: <LiveTime />
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <input
                            type="text"
                            placeholder="SEARCH_MARKET_DATABASE..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="matrix-input"
                            style={{ width: 280 }}
                        />
                        <Link to="/leaderboard" className="matrix-btn">
                            LEADERBOARD
                        </Link>
                    </div>
                </header>

                {/* Section Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--matrix-border)' }}>
                    <h2 style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: 'var(--matrix-green)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <span style={{ color: 'var(--matrix-text-muted)' }}>&gt;</span>
                        {SECTORS.find(s => s.id === sector)?.label.toUpperCase() || 'TRENDING'}
                    </h2>
                    <div style={{ fontSize: 12, color: 'var(--matrix-text-muted)', marginTop: 4 }}>
                        MARKETS_LOADED: {filteredMarkets.length} •• SOCKET_STATUS: <span style={{ color: 'var(--matrix-green)' }}>ONLINE</span>
                    </div>
                </div>

                {/* Markets Table */}
                <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
                    {loading ? (
                        <div style={{ padding: 60, textAlign: 'center', color: 'var(--matrix-text-dim)' }}>
                            <div style={{ fontSize: 16 }}>LOADING_MARKETS...</div>
                            <div style={{ fontSize: 12, marginTop: 8 }}>CONNECTING TO POLYMARKET API</div>
                        </div>
                    ) : (
                        <table className="matrix-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}></th>
                                    <th>MARKET CONTRACT</th>
                                    <th style={{ textAlign: 'center' }}>TOP OUTCOME</th>
                                    <th style={{ textAlign: 'right' }}>24H VOLUME</th>
                                    <th style={{ textAlign: 'right' }}>END DATE</th>
                                    <th style={{ textAlign: 'center' }}>DATA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMarkets.map((market, i) => {
                                    const yesPrice = parsePrice(market.outcomePrices)
                                    const topOutcome = yesPrice >= 50 ? 'Yes' : 'No'
                                    const topProb = yesPrice >= 50 ? yesPrice : 100 - yesPrice
                                    const endDate = market.endDate ? new Date(market.endDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '—'
                                    const isFeatured = market.featured || Number(market.volume24hr) > 100000

                                    return (
                                        <tr
                                            key={market.id}
                                            onClick={() => navigate(`/market/${market.slug || market.id}`)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <span style={{ color: market.smartCount > 0 ? 'var(--matrix-green)' : 'var(--matrix-text-muted)' }}>●</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <span style={{ fontWeight: 500 }}>{market.question}</span>
                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        {isFeatured && <span className="matrix-badge featured">FEATURED</span>}
                                                        <span style={{ fontSize: 11, color: 'var(--matrix-text-muted)' }}>
                                                            ID: {(market.conditionId || market.id).slice(0, 10)}...
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    color: topOutcome === 'Yes' ? 'var(--matrix-green)' : 'var(--matrix-red)',
                                                    fontWeight: 600,
                                                }}>
                                                    {topOutcome}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', color: 'var(--matrix-green)', fontWeight: 500 }}>
                                                {formatNumber(Number(market.volume24hr) || 0)}
                                            </td>
                                            <td style={{ textAlign: 'right', color: 'var(--matrix-amber)' }}>
                                                {endDate}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {market.smartCount > 0 ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        padding: '2px 8px',
                                                        background: 'rgba(0, 255, 65, 0.1)',
                                                        border: '1px solid var(--matrix-dark-green)',
                                                        borderRadius: 2,
                                                        fontSize: 11,
                                                    }}>
                                                        🧠 {market.smartCount}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--matrix-text-muted)' }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    )
}
