import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchMarket, getSmartWalletsForMarket, SMART_WALLETS } from '../services/polymarket'
import type { Market, SmartWalletPosition } from '../services/polymarket'
import ProbabilityChart from '../components/ProbabilityChart'
import TraderModal from '../components/TraderModal'

interface TraderForModal {
    rank: number
    username: string
    address: string
    pnl: number
    unrealizedPnl?: number
}

function formatNumber(n: number | string | undefined): string {
    const num = Number(n) || 0
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K'
    return '$' + num.toFixed(0)
}

function formatPnl(n: number): string {
    const sign = n >= 0 ? '+' : ''
    if (Math.abs(n) >= 1000000) return sign + '$' + (n / 1000000).toFixed(2) + 'M'
    if (Math.abs(n) >= 1000) return sign + '$' + (n / 1000).toFixed(1) + 'K'
    return sign + '$' + n.toFixed(0)
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
    } catch {
        return 50
    }
}

function LiveTime() {
    const [time, setTime] = useState(new Date())
    useEffect(() => {
        const i = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(i)
    }, [])
    return <span>{time.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' })} UTC</span>
}

export default function MarketPage() {
    const { id } = useParams<{ id: string }>()
    const [market, setMarket] = useState<Market | null>(null)
    const [smartWallets, setSmartWallets] = useState<SmartWalletPosition[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTrader, setSelectedTrader] = useState<TraderForModal | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)

    useEffect(() => {
        async function loadMarket() {
            if (!id) return
            try {
                setLoading(true)
                const data = await fetchMarket(id)
                if (data) {
                    setMarket(data)
                    const wallets = await getSmartWalletsForMarket(data.conditionId || data.id)
                    setSmartWallets(wallets)
                }
            } catch (err) {
                console.error('Market load error:', err)
            } finally {
                setLoading(false)
            }
        }
        loadMarket()
    }, [id])

    const handleCopy = async (address: string) => {
        await navigator.clipboard.writeText(address)
        setCopied(address)
        setTimeout(() => setCopied(null), 1500)
    }

    if (loading) {
        return (
            <div className="matrix-grid" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div style={{ color: 'var(--matrix-green)', fontSize: 18 }}>LOADING_MARKET...</div>
                <div style={{ color: 'var(--matrix-text-muted)', fontSize: 12, marginTop: 8 }}>FETCHING FROM POLYMARKET API</div>
            </div>
        )
    }

    if (!market) {
        return (
            <div className="matrix-grid" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                <div style={{ color: 'var(--matrix-red)', fontSize: 18 }}>ERROR: MARKET_NOT_FOUND</div>
                <Link to="/markets" className="matrix-btn">← RETURN_TO_MARKETS</Link>
            </div>
        )
    }

    const yesPrice = parsePrice(market.outcomePrices)
    const noPrice = 100 - yesPrice
    const volume = Number(market.volume) || 0
    const liquidity = Number(market.liquidity) || 0
    const endDate = market.endDate ? new Date(market.endDate).toLocaleDateString() : 'TBD'

    return (
        <div className="matrix-grid" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{
                padding: '12px 24px',
                borderBottom: '1px solid var(--matrix-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--matrix-bg-secondary)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Link to="/markets" style={{ color: 'var(--matrix-text-muted)', textDecoration: 'none', fontSize: 12 }}>← MARKETS</Link>
                    <span style={{ color: 'var(--matrix-border)' }}>|</span>
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <span style={{ color: 'var(--matrix-green)', fontWeight: 700, fontSize: 14 }}>
                            POLY<span style={{ color: 'var(--matrix-text-white)' }}>SCREENER</span>
                        </span>
                    </Link>
                    {smartWallets.length > 0 && (
                        <span className="matrix-badge profit">🧠 {smartWallets.length} SMART</span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="status-dot online" />
                    <span style={{ fontSize: 11, color: 'var(--matrix-text-dim)' }}>LIVE :: <LiveTime /></span>
                </div>
            </header>

            {/* Main Grid */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0 }}>
                {/* Left Content */}
                <main style={{ padding: 24, borderRight: '1px solid var(--matrix-border)' }}>
                    {/* Market Info */}
                    <div style={{ marginBottom: 24 }}>
                        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--matrix-text)', marginBottom: 12, lineHeight: 1.4 }}>
                            {market.question}
                        </h1>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            {market.featured && <span className="matrix-badge featured">FEATURED</span>}
                            <span style={{ fontSize: 11, color: 'var(--matrix-text-muted)' }}>
                                ID: {(market.conditionId || market.id).slice(0, 20)}...
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--matrix-amber)' }}>ENDS: {endDate}</span>
                        </div>
                    </div>

                    {/* Outcome Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                        <div className="glow-border" style={{ padding: 16, textAlign: 'center', background: 'rgba(0, 255, 65, 0.03)' }}>
                            <div style={{ fontSize: 11, color: 'var(--matrix-text-muted)', marginBottom: 4 }}>YES</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--matrix-green)' }}>{yesPrice.toFixed(0)}%</div>
                        </div>
                        <div className="glow-border" style={{ padding: 16, textAlign: 'center', background: 'rgba(255, 51, 51, 0.03)' }}>
                            <div style={{ fontSize: 11, color: 'var(--matrix-text-muted)', marginBottom: 4 }}>NO</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--matrix-red)' }}>{noPrice.toFixed(0)}%</div>
                        </div>
                        <div className="glow-border" style={{ padding: 16, textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--matrix-text-muted)', marginBottom: 4 }}>VOLUME</div>
                            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--matrix-text)' }}>{formatNumber(volume)}</div>
                        </div>
                        <div className="glow-border" style={{ padding: 16, textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--matrix-text-muted)', marginBottom: 4 }}>LIQUIDITY</div>
                            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--matrix-text)' }}>{formatNumber(liquidity)}</div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="matrix-panel" style={{ marginBottom: 24 }}>
                        <div className="matrix-panel-header">
                            <span>PROBABILITY_CHART</span>
                        </div>
                        <ProbabilityChart height={280} color="#00ff41" />
                    </div>

                    {/* Description */}
                    {market.description && (
                        <div className="matrix-panel">
                            <div className="matrix-panel-header">MARKET_DESCRIPTION</div>
                            <p style={{ fontSize: 13, color: 'var(--matrix-text-dim)', lineHeight: 1.7 }}>
                                {market.description}
                            </p>
                        </div>
                    )}
                </main>

                {/* Right Sidebar */}
                <aside style={{ padding: 16, background: 'var(--matrix-bg-secondary)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Smart Money */}
                    {smartWallets.length > 0 ? (
                        <div className="matrix-panel">
                            <div className="matrix-panel-header">
                                🧠 SMART_MONEY
                                <span style={{ marginLeft: 'auto', color: 'var(--matrix-green)' }}>{smartWallets.length}</span>
                            </div>
                            {smartWallets.map((wallet, i) => (
                                <div
                                    key={wallet.address}
                                    onClick={() => {
                                        setSelectedTrader({ rank: i + 1, username: wallet.username, address: wallet.address, pnl: wallet.value, unrealizedPnl: wallet.unrealizedPnl })
                                        setIsModalOpen(true)
                                    }}
                                    style={{
                                        padding: '10px 0',
                                        borderBottom: i < smartWallets.length - 1 ? '1px solid var(--matrix-border)' : 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 500, fontSize: 13 }}>{wallet.username}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                <span style={{ fontSize: 10, color: 'var(--matrix-text-muted)' }}>
                                                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleCopy(wallet.address) }}
                                                    style={{
                                                        background: copied === wallet.address ? 'var(--matrix-green)' : 'transparent',
                                                        border: '1px solid var(--matrix-border)',
                                                        padding: '1px 4px',
                                                        borderRadius: 2,
                                                        cursor: 'pointer',
                                                        fontSize: 9,
                                                        color: copied === wallet.address ? 'var(--matrix-bg)' : 'var(--matrix-text-muted)',
                                                    }}
                                                >
                                                    {copied === wallet.address ? '✓' : '📋'}
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span className={`matrix-badge ${wallet.outcome === 'yes' ? 'profit' : 'loss'}`}>
                                                {wallet.outcome.toUpperCase()}
                                            </span>
                                            <div style={{ fontSize: 11, color: wallet.unrealizedPnl >= 0 ? 'var(--matrix-green)' : 'var(--matrix-red)', marginTop: 4 }}>
                                                {formatPnl(wallet.unrealizedPnl)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="matrix-panel" style={{ textAlign: 'center', padding: 24 }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>🧠</div>
                            <div style={{ color: 'var(--matrix-text-muted)', fontSize: 12 }}>NO_SMART_WALLETS</div>
                            <div style={{ fontSize: 10, color: 'var(--matrix-text-muted)', marginTop: 4 }}>
                                TRACKING {SMART_WALLETS.length} WALLETS
                            </div>
                        </div>
                    )}

                    {/* Order Flow */}
                    <div className="matrix-panel">
                        <div className="matrix-panel-header">ORDER_FLOW_24H</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                    <span style={{ color: 'var(--matrix-text-muted)' }}>BUY</span>
                                    <span style={{ color: 'var(--matrix-green)' }}>{formatNumber(volume * 0.55)}</span>
                                </div>
                                <div style={{ height: 6, background: 'var(--matrix-border)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: '55%', background: 'var(--matrix-green)' }} />
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                    <span style={{ color: 'var(--matrix-text-muted)' }}>SELL</span>
                                    <span style={{ color: 'var(--matrix-red)' }}>{formatNumber(volume * 0.45)}</span>
                                </div>
                                <div style={{ height: 6, background: 'var(--matrix-border)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: '45%', background: 'var(--matrix-red)' }} />
                                </div>
                            </div>
                            <div style={{ padding: 12, background: 'rgba(0, 255, 65, 0.05)', border: '1px solid var(--matrix-dark-green)', textAlign: 'center' }}>
                                <span style={{ color: 'var(--matrix-green)', fontWeight: 600 }}>NET_FLOW: +{formatNumber(volume * 0.1)}</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            <TraderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} trader={selectedTrader} />
        </div>
    )
}
