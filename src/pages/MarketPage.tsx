import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchMarket, getSmartWalletsForMarket, SMART_WALLETS, fetchMarketTrades, fetchAllMarketHolders } from '../services/polymarket'
import type { Market, SmartWalletPosition, MarketTrade, MarketHolder } from '../services/polymarket'
import { fetchOrderBook, fetchPriceHistory } from '../services/polymarket'
import TradingChart from '../components/TradingChart'
import { ProbabilityChart } from '../components/ProbabilityChart'
import TraderModal from '../components/TraderModal'
import { OrderBook } from '../components/OrderBook'
import { TraderHoverCard } from '../components/TraderHoverCard'

// Timeframe intervals in seconds
const TIMEFRAME_INTERVALS: Record<string, number> = {
    '1h': 60,         // 1 minute intervals for 1 hour view
    '6h': 360,        // 6 minute intervals for 6 hour view
    '1d': 1440,       // 24 minute intervals for 1 day view
    '1w': 10080,      // ~2.8 hour intervals for 1 week view
    '1m': 43200,      // 12 hour intervals for 1 month view
    'all': 86400,     // 1 day intervals for all time
}

// Generate mock OHLC data when API returns empty (values in 0-1 range for probability)
function generateMockChartData(currentPrice: number = 0.5, timeframe: string = '1h'): Array<{ time: number; open: number; high: number; low: number; close: number }> {
    const data = [];
    // Convert currentPrice from percentage (0-100) to probability (0-1) if needed
    let price = currentPrice > 1 ? currentPrice / 100 : currentPrice;
    const now = Math.floor(Date.now() / 1000);
    const interval = TIMEFRAME_INTERVALS[timeframe] || 3600;
    const numPoints = 100;

    for (let i = numPoints; i >= 0; i--) {
        const time = now - i * interval;
        const open = price;
        // Smaller volatility for probability values (0-1 range)
        const change = (Math.random() - 0.48) * 0.03;
        price = Math.max(0.05, Math.min(0.95, price + change));
        const close = price;
        const high = Math.min(1, Math.max(open, close) + Math.random() * 0.02);
        const low = Math.max(0, Math.min(open, close) - Math.random() * 0.02);

        data.push({ time, open, high, low, close });
    }
    return data;
}

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
    const [activeTab, setActiveTab] = useState<'activity' | 'traders' | 'holders'>('traders')
    const [timeframe, setTimeframe] = useState('1h')
    const [chartMode, setChartMode] = useState<'probability' | 'candlestick'>('probability')
    const [chartData, setChartData] = useState<any[]>([])
    const [pinnedWallet, setPinnedWallet] = useState<string>('')
    const [chartMarkers, setChartMarkers] = useState<any[]>([])

    // NEW: Real market data from API
    const [marketTrades, setMarketTrades] = useState<MarketTrade[]>([])
    const [allHolders, setAllHolders] = useState<MarketHolder[]>([])
    const [orderBook, setOrderBook] = useState<{ bids: any[], asks: any[] }>({ bids: [], asks: [] })

    useEffect(() => {
        async function loadMarket() {
            if (!id) return
            try {
                setLoading(true)
                const data = await fetchMarket(id)
                if (data) {
                    setMarket(data)
                    const conditionId = data.conditionId || data.id
                    console.log(`Market loaded - conditionId: ${conditionId}, id: ${data.id}, length: ${conditionId?.length}`)

                    // Fetch all data in parallel
                    const [wallets, trades, holders] = await Promise.all([
                        getSmartWalletsForMarket(conditionId),
                        fetchMarketTrades(conditionId, 50),
                        fetchAllMarketHolders(conditionId, 100),
                    ])

                    // Fetch Order Book if token ID is available (YES outcome usually index 0 or 1 depending on market)
                    // For now, try the first token ID
                    if (data.clobTokenIds && data.clobTokenIds.length > 0) {
                        fetchOrderBook(data.clobTokenIds[0]).then(book => {
                            console.log('Order Book loaded:', book.bids.length, 'bids')
                            setOrderBook(book)
                        })
                        // Initial chart fetch with fallback
                        fetchPriceHistory(data.clobTokenIds[0], timeframe).then(result => {
                            if (result.length === 0) {
                                // Use mock data as fallback
                                const yesPrice = parsePrice(data.outcomePrices);
                                setChartData(generateMockChartData(yesPrice));
                            } else {
                                setChartData(result);
                            }
                        })
                    }

                    setSmartWallets(wallets)
                    setMarketTrades(trades)
                    setAllHolders(holders)

                    console.log(`Loaded: ${wallets.length} smart wallets, ${trades.length} trades, ${holders.length} holders`)
                }
            } catch (err) {
                console.error('Market load error:', err)
            } finally {
                setLoading(false)
            }
        }
        loadMarket()
    }, [id])

    // Fetch chart data when timeframe changes
    useEffect(() => {
        if (market?.clobTokenIds?.[0]) {
            const yesPrice = parsePrice(market.outcomePrices);
            fetchPriceHistory(market.clobTokenIds[0], timeframe).then(result => {
                if (result.length === 0) {
                    // Use mock data as fallback with proper 0-1 scale
                    setChartData(generateMockChartData(yesPrice, timeframe));
                } else {
                    setChartData(result);
                }
            });
        } else if (market) {
            // Generate mock data even without token ID
            const yesPrice = parsePrice(market.outcomePrices);
            setChartData(generateMockChartData(yesPrice, timeframe));
        }
    }, [timeframe, market])

    useEffect(() => {
        if (!pinnedWallet || marketTrades.length === 0) {
            setChartMarkers([])
            return
        }

        const markers = marketTrades
            .filter(t => t.user.toLowerCase() === pinnedWallet.toLowerCase())
            .map(t => ({
                time: t.timestamp / 1000, // lightweight-charts uses seconds
                position: t.side === 'BUY' ? 'belowBar' : 'aboveBar',
                color: t.side === 'BUY' ? '#22c55e' : '#ef4444',
                shape: t.side === 'BUY' ? 'arrowUp' : 'arrowDown',
                text: t.side === 'BUY' ? 'B' : 'S',
            }))

        setChartMarkers(markers)
    }, [pinnedWallet, marketTrades])

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

            {/* Fireplace-style Market Stats Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                padding: '0 24px',
                height: 44,
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
            }}>
                {/* Market Title (truncated) */}
                <div style={{ flex: '0 0 300px', overflow: 'hidden', paddingRight: 24, borderRight: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {market.question}
                    </div>
                </div>

                {/* Stats Strip */}
                <div style={{ display: 'flex', flex: 1, justifyContent: 'space-around' }}>
                    <div style={{ textAlign: 'center', padding: '0 16px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Probability</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {yesPrice.toFixed(1)}%
                        </div>
                    </div>
                    <div style={{ width: 1, background: 'var(--border-subtle)' }} />
                    <div style={{ textAlign: 'center', padding: '0 16px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>24h Volume</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {formatNumber(Number(market.volume24hr) || volume * 0.1)}
                        </div>
                    </div>
                    <div style={{ width: 1, background: 'var(--border-subtle)' }} />
                    <div style={{ textAlign: 'center', padding: '0 16px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Volume</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {formatNumber(volume)}
                        </div>
                    </div>
                    <div style={{ width: 1, background: 'var(--border-subtle)' }} />
                    <div style={{ textAlign: 'center', padding: '0 16px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Liquidity</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {formatNumber(liquidity)}
                        </div>
                    </div>
                    <div style={{ width: 1, background: 'var(--border-subtle)' }} />
                    <div style={{ textAlign: 'center', padding: '0 16px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Smart Wallets</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: smartWallets.length > 0 ? 'var(--accent-primary)' : 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                            🧠 {smartWallets.length}
                        </div>
                    </div>
                    <div style={{ width: 1, background: 'var(--border-subtle)' }} />
                    <div style={{ textAlign: 'center', padding: '0 16px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ends</div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--accent-highlight)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {endDate}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid - Responsive: stacks on mobile */}
            <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 320px)',
                gap: 0,
            }} className="market-grid">
                {/* Left Content */}
                <main style={{ padding: 'clamp(12px, 3vw, 24px)', borderRight: '1px solid var(--matrix-border)' }}>
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
                            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--accent-highlight)' }}>{formatNumber(volume)}</div>
                        </div>
                        <div className="glow-border" style={{ padding: 16, textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--matrix-text-muted)', marginBottom: 4 }}>LIQUIDITY</div>
                            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--matrix-text)' }}>{formatNumber(liquidity)}</div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="matrix-panel" style={{ marginBottom: 24 }}>
                        <div className="matrix-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {/* Chart Mode Toggle */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => setChartMode('probability')}
                                    style={{
                                        background: chartMode === 'probability' ? 'var(--accent-primary)' : 'transparent',
                                        color: chartMode === 'probability' ? 'var(--bg-primary)' : 'var(--text-muted)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: 4,
                                        padding: '4px 12px',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    📈 Probability
                                </button>
                                <button
                                    onClick={() => setChartMode('candlestick')}
                                    style={{
                                        background: chartMode === 'candlestick' ? 'var(--accent-primary)' : 'transparent',
                                        color: chartMode === 'candlestick' ? 'var(--bg-primary)' : 'var(--text-muted)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: 4,
                                        padding: '4px 12px',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    🕯️ Candlestick
                                </button>
                            </div>
                            {/* Timeframe buttons (shown for both modes) */}
                            <div style={{ display: 'flex', gap: 4 }}>
                                {['1h', '6h', '1d', '1w', '1m', 'all'].map((tf) => (
                                    <button
                                        key={tf}
                                        onClick={() => setTimeframe(tf)}
                                        style={{
                                            background: timeframe === tf ? 'var(--accent-primary)' : 'transparent',
                                            color: timeframe === tf ? 'var(--bg-primary)' : 'var(--text-muted)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 4,
                                            padding: '4px 8px',
                                            fontSize: 10,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Conditional Chart Rendering */}
                        {chartMode === 'probability' ? (
                            <ProbabilityChart
                                data={chartData.length > 0 ? chartData.map(c => ({
                                    time: new Date(c.time * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' }),
                                    value: c.close * 100 // Convert 0-1 to 0-100 for probability chart
                                })) : undefined}
                                color="var(--accent-primary)"
                                height={350}
                            />
                        ) : (
                            <TradingChart data={chartData} height={350} markers={chartMarkers} />
                        )}
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

                    {/* Order Book with integrated PIN WALLET */}
                    <OrderBook
                        bids={orderBook.bids}
                        asks={orderBook.asks}
                        loading={loading}
                        pinnedWallet={pinnedWallet}
                        onPinnedWalletChange={setPinnedWallet}
                    />
                </aside>
            </div>

            {/* Fireplace-style Tabbed Bottom Panel */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                {/* Tab Headers */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-subtle)', padding: '0 24px' }}>
                    {(['activity', 'traders', 'holders'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '12px 20px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontWeight: 500,
                                fontSize: 13,
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                            }}
                        >
                            {tab === 'traders' ? 'Top Traders' : tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div style={{ padding: 24, maxHeight: 300, overflow: 'auto' }}>
                    {activeTab === 'activity' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                            {marketTrades.length > 0 ? marketTrades.slice(0, 20).map((trade, i) => {
                                const timeAgo = trade.timestamp ? Math.floor((Date.now() - trade.timestamp) / 60000) : 0
                                const isTx = trade.id && trade.id.startsWith('0x')
                                return (
                                    <div
                                        key={trade.id || i}
                                        onClick={() => isTx && window.open(`https://polygonscan.com/tx/${trade.id}`, '_blank')}
                                        style={{
                                            position: 'relative',
                                            padding: 12,
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: 8,
                                            border: '1px solid var(--border-subtle)',
                                            cursor: isTx ? 'pointer' : 'default',
                                            transition: 'border-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => isTx && (e.currentTarget.style.borderColor = 'var(--text-muted)')}
                                        onMouseLeave={(e) => isTx && (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                            <span style={{ color: trade.side === 'BUY' ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
                                                {trade.side} {trade.outcome.toUpperCase()}
                                            </span>
                                            <span style={{ color: 'var(--text-muted)' }}>{timeAgo}m ago {isTx && '↗'}</span>
                                        </div>
                                        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}>
                                            ${trade.value.toFixed(2)}
                                        </div>
                                        {trade.username && (
                                            <div style={{ fontSize: 10, color: 'var(--accent-primary)', marginTop: 4 }}>
                                                🧠
                                                <TraderHoverCard address={trade.user} username={trade.username}>
                                                    <a
                                                        href={`https://polymarket.com/profile/${trade.user}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ color: 'inherit', textDecoration: 'none', marginLeft: 4 }}
                                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                                    >
                                                        {trade.username}
                                                    </a>
                                                </TraderHoverCard>
                                            </div>
                                        )}
                                    </div>
                                )
                            }) : (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                                    No recent trades found
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'traders' && (
                        <table className="table table-dense" style={{ fontSize: 13 }}>
                            <thead>
                                <tr>
                                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>#</th>
                                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>Trader</th>
                                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>Outcome</th>
                                    <th style={{ textAlign: 'right', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>Shares</th>
                                    <th style={{ textAlign: 'right', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>PnL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Show TOP 50 Holders, not just smart wallets. Sorted by PnL or Balance */}
                                {allHolders.length > 0 ? allHolders.slice(0, 50).map((holder, i) => {
                                    const smartWallet = SMART_WALLETS.find(sw => sw.address.toLowerCase() === holder.address.toLowerCase())
                                    const isPinned = pinnedWallet && holder.address.toLowerCase() === pinnedWallet.toLowerCase()

                                    // Use PnL from API
                                    const pnl = holder.pnl || 0

                                    return (
                                        <tr key={holder.address}
                                            onClick={() => {
                                                setSelectedTrader({ rank: i + 1, username: holder.username || 'Unknown', address: holder.address, pnl: pnl });
                                                setIsModalOpen(true);
                                            }}
                                            style={{ background: isPinned ? 'rgba(34, 197, 94, 0.1)' : undefined }}
                                        >
                                            <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <TraderHoverCard address={holder.address} username={holder.username}>
                                                        <a
                                                            href={`https://polymarket.com/profile/${holder.address}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ fontWeight: 500, color: 'var(--text-primary)', textDecoration: 'none' }}
                                                        >
                                                            {smartWallet ? '🧠 ' : ''}{holder.username || 'Trader'}
                                                        </a>
                                                    </TraderHoverCard>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{holder.address.slice(0, 6)}...</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${holder.outcome === 'yes' ? 'badge-success' : 'badge-danger'}`}>
                                                    {holder.outcome.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                                                {formatNumber(holder.balance)}
                                            </td>
                                            <td style={{ textAlign: 'right', color: pnl >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)', fontFamily: "'JetBrains Mono', monospace" }}>
                                                {formatPnl(pnl)}
                                            </td>
                                        </tr>
                                    )
                                }) : (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No traders found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'holders' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            {/* Yes Holders */}
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                                    YES Holders
                                    <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>{allHolders.filter(h => h.outcome === 'yes').length}</span>
                                </div>
                                {allHolders.filter(h => h.outcome === 'yes').length > 0 ? allHolders.filter(h => h.outcome === 'yes').slice(0, 20).map((holder) => {
                                    // Check if this is a smart wallet
                                    const smartWallet = SMART_WALLETS.find(sw => sw.address.toLowerCase() === holder.address.toLowerCase())
                                    return (
                                        <div
                                            key={holder.address}
                                            onClick={() => {
                                                setSelectedTrader({
                                                    rank: 0,
                                                    username: holder.username || holder.address.slice(0, 8),
                                                    address: holder.address,
                                                    pnl: holder.pnl || 0,
                                                });
                                                setIsModalOpen(true);
                                            }}
                                            style={{
                                                padding: '8px 0',
                                                borderBottom: '1px solid var(--border-subtle)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: 13,
                                                cursor: 'pointer',
                                                transition: 'background 0.15s ease',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <span>
                                                {holder.username ? (
                                                    <span style={{ color: smartWallet ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                                                        {smartWallet ? '🧠 ' : ''}{holder.username}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>{holder.address.slice(0, 6)}...{holder.address.slice(-4)}</span>
                                                )}
                                            </span>
                                            <span style={{ color: 'var(--accent-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{formatNumber(holder.balance)}</span>
                                        </div>
                                    )
                                }) : (
                                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No YES holders found</div>
                                )}
                            </div>
                            {/* No Holders */}
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-danger)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-danger)' }} />
                                    NO Holders
                                    <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>{allHolders.filter(h => h.outcome === 'no').length}</span>
                                </div>
                                {allHolders.filter(h => h.outcome === 'no').length > 0 ? allHolders.filter(h => h.outcome === 'no').slice(0, 20).map((holder) => {
                                    const smartWallet = SMART_WALLETS.find(sw => sw.address.toLowerCase() === holder.address.toLowerCase())
                                    return (
                                        <div
                                            key={holder.address}
                                            onClick={() => {
                                                setSelectedTrader({
                                                    rank: 0,
                                                    username: holder.username || holder.address.slice(0, 8),
                                                    address: holder.address,
                                                    pnl: holder.pnl || 0,
                                                });
                                                setIsModalOpen(true);
                                            }}
                                            style={{
                                                padding: '8px 0',
                                                borderBottom: '1px solid var(--border-subtle)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: 13,
                                                cursor: 'pointer',
                                                transition: 'background 0.15s ease',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <span>
                                                {holder.username ? (
                                                    <span style={{ color: smartWallet ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                                                        {smartWallet ? '🧠 ' : ''}{holder.username}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>{holder.address.slice(0, 6)}...{holder.address.slice(-4)}</span>
                                                )}
                                            </span>
                                            <span style={{ color: 'var(--accent-danger)', fontFamily: "'JetBrains Mono', monospace" }}>{formatNumber(holder.balance)}</span>
                                        </div>
                                    )
                                }) : (
                                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No NO holders found</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>


            <TraderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} trader={selectedTrader} />
        </div>
    )
}
