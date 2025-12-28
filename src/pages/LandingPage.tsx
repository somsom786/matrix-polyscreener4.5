import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Subtle floating particles instead of Matrix rain (more premium)
function FloatingParticles() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        // Create particles
        const particles: { x: number; y: number; size: number; speedY: number; opacity: number }[] = []
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1,
                speedY: Math.random() * 0.5 + 0.2,
                opacity: Math.random() * 0.5 + 0.2,
            })
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            particles.forEach(p => {
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(0, 255, 159, ${p.opacity * 0.3})`
                ctx.fill()

                p.y -= p.speedY
                if (p.y < -10) {
                    p.y = canvas.height + 10
                    p.x = Math.random() * canvas.width
                }
            })

            requestAnimationFrame(animate)
        }

        const animationId = requestAnimationFrame(animate)
        return () => {
            cancelAnimationFrame(animationId)
            window.removeEventListener('resize', resize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                opacity: 0.6,
            }}
        />
    )
}

// Animated counter for stats
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
    const [display, setDisplay] = useState(0)

    useEffect(() => {
        const duration = 2000
        const start = Date.now()
        const animate = () => {
            const elapsed = Date.now() - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 4) // Ease out quart
            setDisplay(Math.floor(value * eased))
            if (progress < 1) requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
    }, [value])

    return <>{display.toLocaleString()}{suffix}</>
}

export default function LandingPage() {
    const navigate = useNavigate()
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        setTimeout(() => setLoaded(true), 100)
    }, [])

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <FloatingParticles />

            {/* Gradient orbs for depth */}
            <div style={{
                position: 'absolute',
                top: '20%',
                left: '10%',
                width: 400,
                height: 400,
                background: 'radial-gradient(circle, rgba(0, 255, 159, 0.08) 0%, transparent 70%)',
                borderRadius: '50%',
                filter: 'blur(60px)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                bottom: '10%',
                right: '15%',
                width: 300,
                height: 300,
                background: 'radial-gradient(circle, rgba(0, 212, 255, 0.06) 0%, transparent 70%)',
                borderRadius: '50%',
                filter: 'blur(60px)',
                pointerEvents: 'none',
            }} />

            {/* Header */}
            <header style={{
                padding: 'var(--space-5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: 'var(--bg-primary)',
                        fontSize: 14,
                    }}>
                        PS
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-lg)', letterSpacing: '-0.02em' }}>
                        Polyscreener
                    </span>
                </div>
                <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button onClick={() => navigate('/markets')} className="btn btn-ghost">Markets</button>
                    <button onClick={() => navigate('/leaderboard')} className="btn btn-ghost">Leaderboard</button>
                    <button onClick={() => navigate('/markets')} className="btn btn-secondary">Launch App</button>
                </nav>
            </header>

            {/* Hero Section - F-pattern layout */}
            <main style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-5)',
                position: 'relative',
                zIndex: 10,
            }}>
                <div style={{
                    maxWidth: 800,
                    textAlign: 'center',
                    opacity: loaded ? 1 : 0,
                    transform: loaded ? 'translateY(0)' : 'translateY(30px)',
                    transition: 'all 0.8s var(--ease-out-expo)',
                }}>
                    {/* Badge - create curiosity */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-2) var(--space-4)',
                        background: 'rgba(0, 255, 159, 0.1)',
                        border: '1px solid rgba(0, 255, 159, 0.2)',
                        borderRadius: 'var(--radius-xl)',
                        marginBottom: 'var(--space-6)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-accent)',
                    }}>
                        <span className="status-dot online" style={{ width: 6, height: 6 }} />
                        <span>Live tracking 52 verified wallets</span>
                    </div>

                    {/* Main headline - Clear value proposition */}
                    <h1 style={{
                        fontSize: 'clamp(36px, 6vw, 64px)',
                        fontWeight: 700,
                        lineHeight: 1.1,
                        letterSpacing: '-0.03em',
                        marginBottom: 'var(--space-5)',
                    }}>
                        See where the <span className="text-gradient">smart money</span> is betting
                    </h1>

                    {/* Subheadline - Supporting detail */}
                    <p style={{
                        fontSize: 'var(--text-lg)',
                        color: 'var(--text-secondary)',
                        maxWidth: 560,
                        margin: '0 auto var(--space-7)',
                        lineHeight: 1.6,
                    }}>
                        Track 52 verified Polymarket whales with $18M+ combined profits.
                        Get real-time insights into their positions and follow the alpha.
                    </p>

                    {/* CTA buttons - Primary action first (Fitts's Law) */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-4)',
                        marginBottom: 'var(--space-8)',
                        flexWrap: 'wrap',
                    }}>
                        <button
                            onClick={() => navigate('/markets')}
                            className="btn btn-primary"
                            style={{ padding: 'var(--space-4) var(--space-7)', fontSize: 'var(--text-base)' }}
                        >
                            Start Tracking →
                        </button>
                        <button
                            onClick={() => navigate('/leaderboard')}
                            className="btn btn-secondary"
                            style={{ padding: 'var(--space-4) var(--space-6)' }}
                        >
                            View Leaderboard
                        </button>
                    </div>

                    {/* Social proof stats - Miller's Law (3-4 items) */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 'var(--space-5)',
                        maxWidth: 480,
                        margin: '0 auto',
                    }}>
                        {[
                            { value: 52, label: 'Verified Wallets', suffix: '' },
                            { value: 18, label: 'Combined PNL', suffix: 'M+' },
                            { value: 500, label: 'Markets Tracked', suffix: '+' },
                        ].map((stat, i) => (
                            <div
                                key={stat.label}
                                style={{
                                    padding: 'var(--space-5)',
                                    background: 'var(--bg-glass)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-lg)',
                                    backdropFilter: 'blur(20px)',
                                    opacity: loaded ? 1 : 0,
                                    transform: loaded ? 'translateY(0)' : 'translateY(20px)',
                                    transition: `all 0.6s var(--ease-out-expo) ${0.2 + i * 0.1}s`,
                                }}
                            >
                                <div style={{
                                    fontSize: 'var(--text-2xl)',
                                    fontWeight: 700,
                                    color: 'var(--accent-primary)',
                                    marginBottom: 'var(--space-1)',
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}>
                                    {stat.suffix?.includes('M') ? '$' : ''}
                                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                                </div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                padding: 'var(--space-5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-3)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                position: 'relative',
                zIndex: 10,
            }}>
                <span>Polyscreener v1.0</span>
                <span style={{ opacity: 0.3 }}>•</span>
                <span>Smart Money Tracker for Polymarket</span>
            </footer>
        </div>
    )
}
