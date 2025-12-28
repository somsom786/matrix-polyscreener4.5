import { useMemo } from 'react'

interface OrderBookProps {
    bids: { price: string; size: string }[]
    asks: { price: string; size: string }[]
    loading?: boolean
    pinnedWallet?: string
    onPinnedWalletChange?: (value: string) => void
}

export function OrderBook({ bids, asks, loading, pinnedWallet, onPinnedWalletChange }: OrderBookProps) {
    // Process data for visualization
    const processedBids = useMemo(() => {
        return bids.slice(0, 15).map(b => ({
            price: parseFloat(b.price),
            size: parseFloat(b.size),
            total: parseFloat(b.price) * parseFloat(b.size)
        }))
    }, [bids])

    const processedAsks = useMemo(() => {
        return asks.slice(0, 15).map(a => ({
            price: parseFloat(a.price),
            size: parseFloat(a.size),
            total: parseFloat(a.price) * parseFloat(a.size)
        }))
    }, [asks])

    // Calculate max size for depth bars
    const maxSize = useMemo(() => {
        const maxBid = Math.max(...processedBids.map(b => b.size), 0)
        const maxAsk = Math.max(...processedAsks.map(a => a.size), 0)
        return Math.max(maxBid, maxAsk)
    }, [processedBids, processedAsks])

    const spread = useMemo(() => {
        if (processedBids.length === 0 || processedAsks.length === 0) return 0
        return processedAsks[0].price - processedBids[0].price
    }, [processedBids, processedAsks])

    const spreadPercent = useMemo(() => {
        if (processedBids.length === 0) return 0
        return (spread / processedBids[0].price) * 100
    }, [spread, processedBids])

    // Check if order book has no data
    const hasNoData = bids.length === 0 && asks.length === 0

    if (loading && hasNoData) {
        return (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading Order Book...
            </div>
        )
    }

    return (
        <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontWeight: 600 }}>Order Book</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>YES Outcome</span>
            </div>

            {/* Asks (Sells) - Red - Listed TOP DOWN (Highest Price first? No, usually Lowest Ask at bottom close to spread) */}
            {/* Standard: Asks on Top (High -> Low), Bids on Bottom (High -> Low). Spread in middle. */}

            {/* Column Headers */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                padding: '8px 16px',
                color: 'var(--text-muted)',
                fontSize: 11,
                borderBottom: '1px solid var(--border-subtle)'
            }}>
                <div style={{ textAlign: 'left' }}>Price (¢)</div>
                <div style={{ textAlign: 'right' }}>Shares</div>
                <div style={{ textAlign: 'right' }}>Total ($)</div>
            </div>

            <div style={{ maxHeight: 400, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                {/* Asks - Rendered in Reverse order (Highest Price -> Lowest Price) so Lowest is at bottom */}
                <div style={{ display: 'flex', flexDirection: 'column-reverse' }}>
                    {processedAsks.map((ask, i) => (
                        <div key={`ask-${i}`} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            padding: '4px 16px',
                            position: 'relative',
                            alignItems: 'center'
                        }}>
                            {/* Depth Bar (Right aligned for Asks? Or Left? Usually background) */}
                            <div style={{
                                position: 'absolute',
                                top: 0, bottom: 0, right: 0,
                                width: `${(ask.size / maxSize) * 100}%`,
                                background: 'rgba(239, 68, 68, 0.15)',
                                zIndex: 0,
                                transition: 'width 0.3s'
                            }} />

                            <div style={{ color: 'var(--accent-danger)', zIndex: 1 }}>{(ask.price * 100).toFixed(1)}¢</div>
                            <div style={{ textAlign: 'right', color: 'var(--text-primary)', zIndex: 1 }}>{ask.size.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            <div style={{ textAlign: 'right', color: 'var(--text-secondary)', zIndex: 1 }}>${ask.total.toFixed(0)}</div>
                        </div>
                    ))}
                </div>

                {/* Spread */}
                <div style={{
                    padding: '8px 16px',
                    background: 'var(--bg-tertiary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    borderTop: '1px solid var(--border-subtle)',
                    borderBottom: '1px solid var(--border-subtle)'
                }}>
                    <span>Spread</span>
                    <span>{(spread * 100).toFixed(1)}¢ ({spreadPercent.toFixed(2)}%)</span>
                </div>

                {/* Bids - Rendered Normal (Highest Price -> Lowest Price) */}
                <div>
                    {processedBids.map((bid, i) => (
                        <div key={`bid-${i}`} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            padding: '4px 16px',
                            position: 'relative',
                            alignItems: 'center'
                        }}>
                            {/* Depth Bar */}
                            <div style={{
                                position: 'absolute',
                                top: 0, bottom: 0, right: 0,
                                width: `${(bid.size / maxSize) * 100}%`,
                                background: 'rgba(34, 197, 94, 0.15)',
                                zIndex: 0,
                                transition: 'width 0.3s'
                            }} />

                            <div style={{ color: 'var(--accent-primary)', zIndex: 1 }}>{(bid.price * 100).toFixed(1)}¢</div>
                            <div style={{ textAlign: 'right', color: 'var(--text-primary)', zIndex: 1 }}>{bid.size.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            <div style={{ textAlign: 'right', color: 'var(--text-secondary)', zIndex: 1 }}>${bid.total.toFixed(0)}</div>
                        </div>
                    ))}
                </div>

                {/* Empty state */}
                {hasNoData && !loading && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                        No order book data available
                    </div>
                )}
            </div>

            {/* PIN WALLET - Integrated into Order Book */}
            {onPinnedWalletChange && (
                <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-tertiary)'
                }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📌 Pin Wallet
                    </div>
                    <input
                        type="text"
                        placeholder="0x..."
                        value={pinnedWallet || ''}
                        onChange={(e) => onPinnedWalletChange(e.target.value)}
                        style={{
                            width: '100%',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--accent-primary)',
                            fontSize: 11,
                            padding: '8px 10px',
                            borderRadius: 4,
                            fontFamily: "'JetBrains Mono', monospace",
                            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                            outline: 'none'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 255, 159, 0.2)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                    {pinnedWallet && (
                        <div style={{ marginTop: 6, fontSize: 9, color: 'var(--text-muted)' }}>
                            Tracking on chart ↑
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
