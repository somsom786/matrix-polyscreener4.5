import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Matrix rain effect using Canvas
function MatrixRain() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        // Matrix characters
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()ポシマケトヲンイウエオカキクケコサシスセソタチツテナニヌネハヒフヘホマミムメモヤユヨラリルレロワ'
        const charArray = chars.split('')

        const fontSize = 14
        const columns = Math.floor(canvas.width / fontSize)
        const drops: number[] = Array(columns).fill(1).map(() => Math.random() * -100)

        const draw = () => {
            // Semi-transparent black for trail effect
            ctx.fillStyle = 'rgba(10, 10, 10, 0.05)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            ctx.fillStyle = '#00ff41'
            ctx.font = `${fontSize}px JetBrains Mono`

            for (let i = 0; i < drops.length; i++) {
                const char = charArray[Math.floor(Math.random() * charArray.length)]
                const x = i * fontSize
                const y = drops[i] * fontSize

                // Brighter head of the rain drop
                if (Math.random() > 0.9) {
                    ctx.fillStyle = '#ffffff'
                } else if (Math.random() > 0.7) {
                    ctx.fillStyle = '#00ff41'
                } else {
                    ctx.fillStyle = '#008f11'
                }

                ctx.fillText(char, x, y)

                // Reset drop to top randomly
                if (y > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0
                }
                drops[i]++
            }
        }

        const interval = setInterval(draw, 50)

        return () => {
            clearInterval(interval)
            window.removeEventListener('resize', resize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
            }}
        />
    )
}

// Typewriter text component
function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
    const [displayText, setDisplayText] = useState('')
    const [showCursor, setShowCursor] = useState(true)

    useEffect(() => {
        const timeout = setTimeout(() => {
            let i = 0
            const interval = setInterval(() => {
                if (i <= text.length) {
                    setDisplayText(text.slice(0, i))
                    i++
                } else {
                    clearInterval(interval)
                }
            }, 50)
            return () => clearInterval(interval)
        }, delay)

        return () => clearTimeout(timeout)
    }, [text, delay])

    useEffect(() => {
        const interval = setInterval(() => {
            setShowCursor(prev => !prev)
        }, 530)
        return () => clearInterval(interval)
    }, [])

    return (
        <span>
            {displayText}
            <span style={{ opacity: showCursor ? 1 : 0 }}>_</span>
        </span>
    )
}

// Current time display
function LiveTime() {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <span>
            {time.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' })} UTC
        </span>
    )
}

export default function LandingPage() {
    const navigate = useNavigate()
    const [showContent, setShowContent] = useState(false)
    const [showButtons, setShowButtons] = useState(false)

    useEffect(() => {
        setTimeout(() => setShowContent(true), 500)
        setTimeout(() => setShowButtons(true), 2500)
    }, [])

    return (
        <div className="scanlines" style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <MatrixRain />

            {/* Main Content */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                textAlign: 'center',
                padding: '0 20px',
            }}>
                {/* Logo */}
                <div style={{
                    opacity: showContent ? 1 : 0,
                    transform: showContent ? 'translateY(0)' : 'translateY(30px)',
                    transition: 'all 1s ease',
                }}>
                    <h1 style={{
                        fontSize: 'clamp(48px, 10vw, 80px)',
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        color: 'var(--matrix-green)',
                        textShadow: `
              0 0 10px rgba(0, 255, 65, 0.8),
              0 0 20px rgba(0, 255, 65, 0.6),
              0 0 40px rgba(0, 255, 65, 0.4),
              0 0 80px rgba(0, 255, 65, 0.2)
            `,
                        marginBottom: '8px',
                    }}>
                        POLY<span style={{ color: 'var(--matrix-text-white)' }}>SCREENER</span>
                    </h1>

                    <div style={{
                        fontSize: '14px',
                        color: 'var(--matrix-text-dim)',
                        letterSpacing: '0.2em',
                        marginBottom: '40px',
                    }}>
                        <span style={{ color: 'var(--matrix-green)' }}>●</span> LIVE FEED CONNECTED :: <LiveTime />
                    </div>
                </div>

                {/* Tagline with Typewriter */}
                <div style={{
                    opacity: showContent ? 1 : 0,
                    transition: 'opacity 1s ease 0.5s',
                    marginBottom: '60px',
                }}>
                    <p style={{
                        fontSize: '18px',
                        color: 'var(--matrix-text)',
                        fontFamily: 'JetBrains Mono, monospace',
                        marginBottom: '12px',
                    }}>
                        <TypewriterText text="> Track smart money in real-time" delay={1000} />
                    </p>
                    <p style={{
                        fontSize: '14px',
                        color: 'var(--matrix-text-muted)',
                        fontFamily: 'JetBrains Mono, monospace',
                    }}>
                        <TypewriterText text="52 verified wallets • $18M+ combined PNL • Live market data" delay={2000} />
                    </p>
                </div>

                {/* CTA Buttons */}
                <div style={{
                    opacity: showButtons ? 1 : 0,
                    transform: showButtons ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.8s ease',
                    display: 'flex',
                    gap: '16px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={() => navigate('/markets')}
                        className="matrix-btn primary"
                        style={{
                            fontSize: '14px',
                            padding: '16px 40px',
                            minWidth: '200px',
                        }}
                    >
                        ENTER TERMINAL
                    </button>
                    <button
                        onClick={() => navigate('/leaderboard')}
                        className="matrix-btn"
                        style={{
                            fontSize: '14px',
                            padding: '16px 40px',
                            minWidth: '200px',
                        }}
                    >
                        VIEW LEADERBOARD
                    </button>
                </div>

                {/* Stats Grid */}
                <div style={{
                    opacity: showButtons ? 1 : 0,
                    transition: 'opacity 1s ease 0.5s',
                    marginTop: '80px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '24px',
                    maxWidth: '600px',
                    margin: '80px auto 0',
                }}>
                    {[
                        { label: 'SMART_WALLETS', value: '52' },
                        { label: 'TOTAL_PNL', value: '$18M+' },
                        { label: 'MARKETS_LIVE', value: '500+' },
                        { label: 'SOCKET_STATUS', value: 'ONLINE', isStatus: true },
                    ].map((stat) => (
                        <div key={stat.label} style={{
                            padding: '16px',
                            border: '1px solid var(--matrix-border)',
                            background: 'rgba(0, 255, 65, 0.02)',
                        }}>
                            <div style={{
                                fontSize: '11px',
                                color: 'var(--matrix-text-muted)',
                                letterSpacing: '0.1em',
                                marginBottom: '4px',
                            }}>
                                {stat.label}
                            </div>
                            <div style={{
                                fontSize: '20px',
                                fontWeight: 600,
                                color: stat.isStatus ? 'var(--matrix-green)' : 'var(--matrix-text)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                {stat.isStatus && <span className="status-dot online" />}
                                {stat.value}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div style={{
                position: 'absolute',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '11px',
                color: 'var(--matrix-text-muted)',
                letterSpacing: '0.1em',
                zIndex: 10,
            }}>
                POLYSCREENER v1.0 :: POLYMARKET SMART MONEY TRACKER
            </div>
        </div>
    )
}
