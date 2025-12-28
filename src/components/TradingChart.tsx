import { useEffect, useRef, useState } from 'react';

// Types for props
interface ChartProps {
    data: {
        time: number;
        open: number;
        high: number;
        low: number;
        close: number;
    }[];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
    };
    height?: number;
    markers?: { time: number; position: 'aboveBar' | 'belowBar'; color: string; shape: 'arrowDown' | 'arrowUp'; text: string }[];
}

export function TradingChart(props: ChartProps) {
    const {
        data,
        colors: {
            backgroundColor = 'transparent',
            textColor = '#64748b',
        } = {},
        height = 400,
        markers = []
    } = props;

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const candlestickSeriesRef = useRef<any>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        let chartApi: any = null;

        const initChart = async () => {
            try {
                // Dynamic import to prevent build/init crashes
                const module = await import('lightweight-charts');
                const createChart = module.createChart || module.default?.createChart;
                const ColorType = module.ColorType || module.default?.ColorType;
                const CandlestickSeries = module.CandlestickSeries || module.default?.CandlestickSeries;

                if (!createChart) {
                    throw new Error('Could not find createChart in module');
                }

                setIsLoading(false);

                if (!chartContainerRef.current) return;

                const chart = createChart(chartContainerRef.current, {
                    layout: {
                        background: { type: ColorType.Solid, color: backgroundColor },
                        textColor,
                    },
                    width: chartContainerRef.current.clientWidth,
                    height: height,
                    grid: {
                        vertLines: { color: 'rgba(42, 46, 57, 0.15)' },
                        horzLines: { color: 'rgba(42, 46, 57, 0.15)' },
                    },
                    rightPriceScale: {
                        scaleMargins: {
                            top: 0.1,
                            bottom: 0.1,
                        },
                        // Format as percentage
                        visible: true,
                    },
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: false,
                        borderColor: 'rgba(42, 46, 57, 0.3)',
                    },
                    crosshair: {
                        vertLine: {
                            color: 'rgba(100, 204, 150, 0.4)',
                            width: 1,
                            style: 2,
                        },
                        horzLine: {
                            color: 'rgba(100, 204, 150, 0.4)',
                            width: 1,
                            style: 2,
                        },
                    },
                    handleScroll: true,
                    handleScale: true,
                });

                chartRef.current = chart;
                chartApi = chart;

                let candlestickSeries;
                const seriesOptions = {
                    upColor: '#22c55e',
                    downColor: '#ef4444',
                    borderVisible: false,
                    wickUpColor: '#22c55e',
                    wickDownColor: '#ef4444',
                    // Price format as percentage
                    priceFormat: {
                        type: 'custom',
                        formatter: (price: number) => `${(price * 100).toFixed(1)}%`,
                        minMove: 0.001,
                    },
                };

                // Check for v4 API
                if (typeof chart.addCandlestickSeries === 'function') {
                    candlestickSeries = chart.addCandlestickSeries(seriesOptions);
                }
                // Check for v5 API
                else if (typeof chart.addSeries === 'function' && CandlestickSeries) {
                    candlestickSeries = chart.addSeries(CandlestickSeries, seriesOptions);
                } else {
                    throw new Error('Chart API incompatibility: Could not add candlestick series.');
                }

                candlestickSeriesRef.current = candlestickSeries;

                // Apply price scale options for 0-100% range
                candlestickSeries.applyOptions({
                    priceScaleId: 'right',
                });

                // Set visible range (0 to 1 = 0% to 100%)
                try {
                    chart.priceScale('right').applyOptions({
                        autoScale: true,
                    });
                } catch (e) {
                    // Ignore if method not available
                }

                // Initial data if available
                if (data.length > 0) {
                    // Sort and normalize data (values should be 0-1 for probability)
                    const sortedData = [...data]
                        .sort((a, b) => a.time - b.time)
                        .map(d => ({
                            time: d.time,
                            open: Math.max(0, Math.min(1, d.open)),
                            high: Math.max(0, Math.min(1, d.high)),
                            low: Math.max(0, Math.min(1, d.low)),
                            close: Math.max(0, Math.min(1, d.close)),
                        }));
                    candlestickSeries.setData(sortedData);
                    chart.timeScale().fitContent();
                }

                // Initial markers
                if (markers.length > 0) {
                    candlestickSeries.setMarkers(markers);
                }

            } catch (err: any) {
                console.error('Failed to load chart:', err);
                setErrorMsg(err.message || 'Unknown error loading chart');
                setIsLoading(false);
            }
        };

        if (isLoading && !chartRef.current) {
            initChart();
        }

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartApi) {
                chartApi.remove();
                chartRef.current = null;
            }
        };
    }, [isLoading]);

    // Update data effect
    useEffect(() => {
        if (candlestickSeriesRef.current && data.length > 0) {
            // Sort and normalize data
            const sortedData = [...data]
                .sort((a, b) => a.time - b.time)
                .map(d => ({
                    time: d.time,
                    open: Math.max(0, Math.min(1, d.open)),
                    high: Math.max(0, Math.min(1, d.high)),
                    low: Math.max(0, Math.min(1, d.low)),
                    close: Math.max(0, Math.min(1, d.close)),
                }));
            candlestickSeriesRef.current.setData(sortedData);

            // Fit content to show all data
            if (chartRef.current) {
                chartRef.current.timeScale().fitContent();
            }
        }
    }, [data]);

    // Update markers effect
    useEffect(() => {
        if (candlestickSeriesRef.current && markers.length > 0) {
            candlestickSeriesRef.current.setMarkers(markers);
        }
    }, [markers]);

    return <div ref={chartContainerRef} style={{ width: '100%', height: height, position: 'relative' }}>
        {isLoading && (
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                background: 'rgba(0,0,0,0.3)'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <div style={{
                        width: 24,
                        height: 24,
                        border: '2px solid rgba(100,100,100,0.3)',
                        borderTopColor: 'var(--accent-primary)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <span style={{ fontSize: 11 }}>Loading Chart...</span>
                </div>
            </div>
        )}
        {errorMsg && (
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                textAlign: 'center',
                padding: 20,
                background: 'rgba(0,0,0,0.5)'
            }}>
                <div style={{ fontSize: 13, marginBottom: 4 }}>Failed to load chart</div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{errorMsg}</div>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: 12,
                        padding: '6px 12px',
                        background: 'var(--accent-danger)',
                        border: 'none',
                        borderRadius: 4,
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: 11
                    }}
                >
                    Refresh Page
                </button>
            </div>
        )}
        {!isLoading && !errorMsg && data.length === 0 && (
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                pointerEvents: 'none',
                fontSize: 12
            }}>
                No chart data available
            </div>
        )}
    </div>;
}

export default TradingChart;
