'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const ADS = [
  {
    bg: 'linear-gradient(165deg,#0E5C4E 0%,#0A2230 100%)',
    kicker: 'Limited drop',
    brand: 'NEON HYDRO',
    tag: '50% off — today only',
    earned: '+£4.20',
    views: '1,840',
  },
  {
    bg: 'linear-gradient(165deg,#3A2E73 0%,#150F2C 100%)',
    kicker: 'New in',
    brand: 'LUMI SKIN',
    tag: 'The glow serum',
    earned: '+£6.10',
    views: '2,610',
  },
  {
    bg: 'linear-gradient(165deg,#1E3A73 0%,#0B1330 100%)',
    kicker: 'Just landed',
    brand: 'DRIFT',
    tag: 'The 02 sneaker',
    earned: '+£3.80',
    views: '1,290',
  },
]

export default function LandingPage() {
  const [views, setViews] = useState(18402504)
  const [paid, setPaid] = useState(248910)
  const [adIndex, setAdIndex] = useState(0)
  const [prog, setProg] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => {
      setViews((v) => v + Math.floor(Math.random() * 4200 + 600))
      setPaid((p) => p + Math.floor(Math.random() * 40 + 4))
    }, 1100)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    let last = performance.now()
    const STEP = 3400
    let raf: number
    const loop = (t: number) => {
      const dt = t - last
      last = t
      setProg((p) => {
        const next = p + (dt / STEP) * 100
        if (next >= 100) {
          setAdIndex((i) => (i + 1) % ADS.length)
          return next - 100
        }
        return next
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const ad = ADS[adIndex]
  const seg = (i: number) =>
    i < adIndex ? 100 : i === adIndex ? Math.round(prog) : 0
  const fmt = (n: number) => n.toLocaleString('en-US')

  return (
    <div
      style={{
        background: '#08080A',
        minHeight: '100vh',
        fontFamily: "'Archivo', system-ui, sans-serif",
        color: '#fff',
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'hidden',
      }}
    >
      <style>{`
        @keyframes wvBlink { 0%,100%{opacity:1}50%{opacity:.3} }
        @keyframes wvDrift { 0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)} }
        @keyframes wvFloatA { 0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)} }
        @keyframes wvFloatB { 0%,100%{transform:translateY(0)}50%{transform:translateY(12px)} }
        @keyframes wvShimmer { 0%{background-position:0% 50%}100%{background-position:200% 50%} }
        @keyframes wvGlow { 0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.16);opacity:1} }
        @keyframes wvPhone { 0%,100%{transform:translateY(0) scale(1);box-shadow:0 14px 28px rgba(0,0,0,.45);filter:brightness(.86)}50%{transform:translateY(-7px) scale(1.05);box-shadow:0 22px 40px rgba(0,0,0,.5),0 0 30px rgba(110,91,255,.5);filter:brightness(1.12)} }
        @keyframes wvAuroraA { 0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(70px,46px) scale(1.18)} }
        @keyframes wvAuroraB { 0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-60px,38px) scale(1.12)} }
        @keyframes wvAuroraC { 0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-50px) scale(1.22)} }
        @keyframes wvSpin { 0%{transform:translate(-50%,-50%) rotate(0deg)}100%{transform:translate(-50%,-50%) rotate(360deg)} }
        @keyframes wvBounce { 0%,70%,100%{transform:translateY(0);opacity:.5}35%{transform:translateY(-5px);opacity:1} }
        .wv-card{transition:transform .22s,border-color .22s,box-shadow .22s;cursor:default}
        .wv-card:hover{transform:translateY(-6px)!important;border-color:rgba(110,91,255,.45)!important;box-shadow:0 24px 50px rgba(0,0,0,.45)}
        .wv-side{transition:transform .22s,box-shadow .22s}
        .wv-side:hover{transform:translateY(-5px);box-shadow:0 28px 56px rgba(0,0,0,.5)}
        .wv-btn{transition:transform .2s,box-shadow .2s}
        .wv-btn:hover{transform:translateY(-2px)!important;box-shadow:0 12px 30px rgba(98,92,255,.5)!important}
        .wv-btn-ghost{transition:background .2s,border-color .2s}
        .wv-btn-ghost:hover{background:rgba(255,255,255,.12)!important;border-color:rgba(255,255,255,.3)!important}
        .wv-nav-link{transition:color .18s;cursor:pointer}
        .wv-nav-link:hover{color:#fff!important}
      `}</style>

      {/* ── AURORA ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '940px',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '-160px',
            top: '-180px',
            width: '680px',
            height: '680px',
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(110,91,255,.5) 0%,rgba(110,91,255,0) 66%)',
            filter: 'blur(70px)',
            animation: 'wvAuroraA 18s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '-200px',
            top: '-60px',
            width: '720px',
            height: '720px',
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(31,211,163,.34) 0%,rgba(31,211,163,0) 66%)',
            filter: 'blur(80px)',
            animation: 'wvAuroraB 22s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '38%',
            top: '120px',
            width: '560px',
            height: '560px',
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(46,107,255,.4) 0%,rgba(46,107,255,0) 66%)',
            filter: 'blur(75px)',
            animation: 'wvAuroraC 20s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── NAV ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(16px)',
          background: 'rgba(8,8,10,.7)',
          borderBottom: '1px solid rgba(255,255,255,.07)',
        }}
      >
        <div
          style={{
            maxWidth: '1160px',
            margin: '0 auto',
            padding: '17px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '30px', height: '30px', position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(110,91,255,.45)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'linear-gradient(120deg,#6E5BFF,#1FD3A3)',
                  boxShadow: '0 0 12px rgba(110,91,255,.9)',
                }}
              />
            </div>
            <div style={{ fontSize: '21px', fontWeight: 900, letterSpacing: '-.8px' }}>
              WViral
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '30px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255,255,255,.6)',
            }}
          >
            <a href="#how" className="wv-nav-link" style={{ color: 'rgba(255,255,255,.6)', textDecoration: 'none' }}>
              How it works
            </a>
            <a href="#earn" className="wv-nav-link" style={{ color: 'rgba(255,255,255,.6)', textDecoration: 'none' }}>
              Earn
            </a>
            <Link href="/login" style={{ color: '#fff', textDecoration: 'none' }}>
              Log in
            </Link>
            <Link
              href="/signup"
              className="wv-btn"
              style={{
                padding: '11px 22px',
                borderRadius: '12px',
                background: 'linear-gradient(120deg,#6E5BFF,#4D7CFF)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 22px rgba(98,92,255,.4)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Advertise
            </Link>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '1160px',
          margin: '0 auto',
          padding: '88px 40px 80px',
          display: 'grid',
          gridTemplateColumns: '1.02fr .98fr',
          gap: '32px',
          alignItems: 'center',
        }}
      >
        {/* Left */}
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '9px',
              padding: '8px 15px',
              borderRadius: '99px',
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.1)',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '28px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'linear-gradient(120deg,#6E5BFF,#1FD3A3)',
                boxShadow: '0 0 10px rgba(110,91,255,.9)',
                animation: 'wvBlink 1.4s infinite',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: '#9FB2FF',
              }}
            >
              WhatsApp Status marketing
            </span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(52px,7vw,78px)',
              lineHeight: 0.92,
              letterSpacing: '-3.5px',
              fontWeight: 900,
              margin: '0 0 26px',
            }}
          >
            Your ad on
            <br />
            everyone&apos;s
            <br />
            <span
              style={{
                background: 'linear-gradient(120deg,#6E5BFF 0%,#4D7CFF 45%,#1FD3A3 100%)',
                backgroundSize: '200% auto',
                animation: 'wvShimmer 7s linear infinite',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Status.
            </span>
          </h1>
          <p
            style={{
              fontSize: '20px',
              lineHeight: 1.5,
              color: 'rgba(255,255,255,.62)',
              maxWidth: '460px',
              fontWeight: 500,
              margin: '0 0 38px',
            }}
          >
            Post your ad. Real people share it on their WhatsApp Status and earn a
            commission. You reach their whole contact list — multiplied by thousands.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              href="/signup"
              className="wv-btn"
              style={{
                padding: '18px 30px',
                borderRadius: '15px',
                background: 'linear-gradient(120deg,#6E5BFF,#4D7CFF)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '17px',
                cursor: 'pointer',
                boxShadow: '0 12px 34px rgba(98,92,255,.45)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Post an ad →
            </Link>
            <Link
              href="/signup"
              className="wv-btn-ghost"
              style={{
                padding: '18px 30px',
                borderRadius: '15px',
                background: 'rgba(255,255,255,.06)',
                border: '1.5px solid rgba(255,255,255,.16)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '17px',
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Earn on your Status
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '36px', marginTop: '46px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px' }}>
                180K+
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)', fontWeight: 600 }}>
                people posting
              </div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px' }}>
                £{fmt(paid)}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)', fontWeight: 600 }}>
                paid out this week
              </div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px' }}>
                {fmt(views)}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)', fontWeight: 600 }}>
                Status views today
              </div>
            </div>
          </div>
        </div>

        {/* Right — phone mockup */}
        <div
          style={{
            position: 'relative',
            justifySelf: 'center',
            height: '540px',
            width: '420px',
          }}
        >
          {/* Floating poster pills */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 14px 9px 9px',
              borderRadius: '99px',
              background: 'rgba(20,20,26,.9)',
              border: '1px solid rgba(255,255,255,.1)',
              boxShadow: '0 14px 30px rgba(0,0,0,.4)',
              zIndex: 4,
              animation: 'wvFloatA 5s ease-in-out infinite',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                padding: '2px',
                background: 'linear-gradient(120deg,#6E5BFF,#1FD3A3)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'repeating-linear-gradient(45deg,#2A2A30,#2A2A30 4px,#33333A 4px,#33333A 8px)',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                Maya posted{' '}
                <span style={{ color: '#1FD3A3', fontSize: '11px' }}>✓✓</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6FE0A8', fontWeight: 700 }}>+£4.20</div>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              right: '-6px',
              top: '130px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 14px 9px 9px',
              borderRadius: '99px',
              background: 'rgba(20,20,26,.9)',
              border: '1px solid rgba(255,255,255,.1)',
              boxShadow: '0 14px 30px rgba(0,0,0,.4)',
              zIndex: 4,
              animation: 'wvFloatB 6s ease-in-out infinite',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                padding: '2px',
                background: 'linear-gradient(120deg,#4D7CFF,#6E5BFF)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'repeating-linear-gradient(45deg,#2A2A30,#2A2A30 4px,#33333A 4px,#33333A 8px)',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                Sam posted{' '}
                <span style={{ color: '#1FD3A3', fontSize: '11px' }}>✓✓</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6FE0A8', fontWeight: 700 }}>+£3.85</div>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: '10px',
              bottom: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 14px 9px 9px',
              borderRadius: '99px',
              background: 'rgba(20,20,26,.9)',
              border: '1px solid rgba(255,255,255,.1)',
              boxShadow: '0 14px 30px rgba(0,0,0,.4)',
              zIndex: 4,
              animation: 'wvFloatB 5.5s ease-in-out infinite',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                padding: '2px',
                background: 'linear-gradient(120deg,#1FD3A3,#6E5BFF)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'repeating-linear-gradient(45deg,#2A2A30,#2A2A30 4px,#33333A 4px,#33333A 8px)',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                Aïsha posted{' '}
                <span style={{ color: '#1FD3A3', fontSize: '11px' }}>✓✓</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6FE0A8', fontWeight: 700 }}>+£5.10</div>
            </div>
          </div>

          {/* Rotating halo */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%,-50%)',
              width: '320px',
              height: '580px',
              borderRadius: '60px',
              background:
                'conic-gradient(from 0deg,rgba(110,91,255,0),rgba(110,91,255,.55),rgba(31,211,163,.55),rgba(46,107,255,0),rgba(110,91,255,0))',
              filter: 'blur(26px)',
              opacity: 0.55,
              animation: 'wvSpin 14s linear infinite',
              zIndex: 2,
            }}
          />

          {/* The phone */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%,-50%)',
              width: '248px',
              height: '510px',
              borderRadius: '42px',
              background: '#050507',
              border: '1px solid rgba(255,255,255,.14)',
              padding: '11px',
              boxShadow: '0 50px 100px rgba(0,0,0,.6)',
              animation: 'wvDrift 6s ease-in-out infinite',
              zIndex: 3,
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '32px',
                overflow: 'hidden',
                position: 'relative',
                background: ad.bg,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(170deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,.62) 100%)',
                  zIndex: 1,
                }}
              />
              {/* Segment bars + header */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  padding: '16px 14px 0',
                  zIndex: 4,
                }}
              >
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: '3px',
                        borderRadius: '9px',
                        background: 'rgba(255,255,255,.32)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: '#fff',
                          borderRadius: '9px',
                          width: `${seg(i)}%`,
                          transition: 'width 0.1s linear',
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      padding: '2px',
                      background: 'linear-gradient(120deg,#6E5BFF,#1FD3A3)',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '1.5px solid rgba(0,0,0,.4)',
                        background: 'repeating-linear-gradient(45deg,#39343F,#39343F 4px,#433D4A 4px,#433D4A 8px)',
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>Maya K.</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.7)' }}>
                      just now · Status
                    </div>
                  </div>
                </div>
              </div>
              {/* Ad creative */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '9px',
                  zIndex: 2,
                  padding: '0 22px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '10px',
                    letterSpacing: '2px',
                    color: 'rgba(255,255,255,.7)',
                    textTransform: 'uppercase',
                  }}
                >
                  {ad.kicker}
                </div>
                <div
                  style={{
                    fontSize: '30px',
                    fontWeight: 900,
                    letterSpacing: '-1px',
                    color: '#fff',
                    lineHeight: 1,
                  }}
                >
                  {ad.brand}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>
                  {ad.tag}
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 16px',
                    borderRadius: '99px',
                    background: 'rgba(255,255,255,.16)',
                    border: '1px solid rgba(255,255,255,.28)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  Shop now
                </div>
              </div>
              {/* Sponsored label */}
              <div
                style={{
                  position: 'absolute',
                  top: '64px',
                  left: '14px',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,.45)',
                  backdropFilter: 'blur(6px)',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '.5px',
                  color: 'rgba(255,255,255,.85)',
                  zIndex: 4,
                }}
              >
                SPONSORED · via WViral
              </div>
              {/* Earned pill */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '18px',
                  left: '14px',
                  right: '14px',
                  padding: '13px 15px',
                  borderRadius: '16px',
                  background: 'rgba(10,10,12,.5)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  zIndex: 4,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'rgba(255,255,255,.65)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '.5px',
                    }}
                  >
                    You earned
                  </div>
                  <div
                    style={{
                      fontSize: '22px',
                      fontWeight: 900,
                      color: '#6FE0A8',
                      letterSpacing: '-.5px',
                    }}
                  >
                    {ad.earned}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    textAlign: 'right',
                    color: 'rgba(255,255,255,.7)',
                    fontWeight: 600,
                  }}
                >
                  {ad.views}
                  <br />
                  views
                </div>
              </div>
            </div>
          </div>

          {/* Glow orb */}
          <div
            style={{
              position: 'absolute',
              right: '-160px',
              top: '10px',
              width: '600px',
              height: '600px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle,rgba(110,91,255,.26) 0%,rgba(31,211,163,.08) 45%,rgba(46,107,255,0) 72%)',
              pointerEvents: 'none',
              zIndex: -1,
              animation: 'wvGlow 7s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* ── STATUS WALL ── */}
      <div
        style={{
          maxWidth: '1160px',
          margin: '0 auto',
          padding: '6px 40px 86px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            letterSpacing: '2px',
            color: 'rgba(255,255,255,.45)',
            textTransform: 'uppercase',
            marginBottom: '38px',
          }}
        >
          Ads going live across Statuses right now
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {[
            { bg: 'linear-gradient(165deg,#0E5C4E,#0A2230)', letter: 'N', delay: '0s' },
            { bg: 'linear-gradient(165deg,#3A2E73,#150F2C)', letter: 'L', delay: '.2s' },
            { bg: 'linear-gradient(165deg,#1E3A73,#0B1330)', letter: 'D', delay: '.4s' },
            { bg: 'linear-gradient(165deg,#0F5C56,#0A2230)', letter: 'S', delay: '.6s' },
            { bg: 'linear-gradient(165deg,#2C2E73,#0B1330)', letter: 'K', delay: '.8s' },
            { bg: 'linear-gradient(165deg,#0E5C4E,#0A2230)', letter: 'N', delay: '1s' },
            { bg: 'linear-gradient(165deg,#1E3A73,#0B1330)', letter: 'D', delay: '1.2s' },
          ].map((p, i) => (
            <div
              key={i}
              style={{
                width: '76px',
                height: '154px',
                borderRadius: '18px',
                background: '#050507',
                border: '1px solid rgba(255,255,255,.12)',
                padding: '5px',
                animation: `wvPhone 3s ease-in-out infinite ${p.delay}`,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '13px',
                  overflow: 'hidden',
                  position: 'relative',
                  background: p.bg,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(170deg,rgba(0,0,0,.04),rgba(0,0,0,.55))',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    right: '6px',
                    display: 'flex',
                    gap: '2px',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      borderRadius: '9px',
                      background: '#fff',
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      borderRadius: '9px',
                      background: 'rgba(255,255,255,.3)',
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      borderRadius: '9px',
                      background: 'rgba(255,255,255,.3)',
                    }}
                  />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      fontSize: '23px',
                      fontWeight: 900,
                      color: '#fff',
                      letterSpacing: '-1px',
                    }}
                  >
                    {p.letter}
                  </div>
                  <div
                    style={{
                      fontSize: '7px',
                      fontWeight: 700,
                      letterSpacing: '1px',
                      color: 'rgba(255,255,255,.7)',
                    }}
                  >
                    SPONSORED
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div
        id="how"
        style={{
          position: 'relative',
          padding: '70px 40px 90px',
          background:
            'radial-gradient(120% 70% at 50% 0%,rgba(110,91,255,.1) 0%,rgba(8,8,10,0) 60%)',
        }}
      >
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                letterSpacing: '2px',
                color: '#9FB2FF',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              How it works
            </div>
            <h2
              style={{
                fontSize: 'clamp(36px,5vw,52px)',
                lineHeight: 1,
                letterSpacing: '-2px',
                fontWeight: 900,
                margin: 0,
              }}
            >
              Three steps. That&apos;s it.
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
              gap: '20px',
            }}
          >
            {[
              {
                num: '01',
                numColor: '#9FB2FF',
                iconBg: 'rgba(110,91,255,.14)',
                title: 'You post your ad',
                body: 'Upload your Status creative — image or video — and set a budget. You\'re live in minutes.',
                icon: (
                  <div
                    style={{
                      width: '18px',
                      height: '22px',
                      borderRadius: '4px',
                      border: '2px solid #9FB2FF',
                    }}
                  />
                ),
              },
              {
                num: '02',
                numColor: '#8FB0FF',
                iconBg: 'rgba(77,124,255,.14)',
                title: 'We hand it to posters',
                body: 'WViral matches your ad to thousands of everyday people who have real, active Status audiences.',
                icon: (
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[0, 0.2, 0.4].map((d, i) => (
                      <div
                        key={i}
                        style={{
                          width: '11px',
                          height: '11px',
                          borderRadius: '50%',
                          border: '2px solid #8FB0FF',
                          animation: `wvBounce 1.4s ease-in-out infinite ${d}s`,
                        }}
                      />
                    ))}
                  </div>
                ),
              },
              {
                num: '03',
                numColor: '#6FE0A8',
                iconBg: 'rgba(31,211,163,.14)',
                title: 'They post & earn',
                body: 'It runs on their WhatsApp Status for 24 hours. They earn a commission, you reach their whole contact list.',
                icon: (
                  <div
                    style={{ fontSize: '20px', fontWeight: 900, color: '#6FE0A8' }}
                  >
                    £
                  </div>
                ),
              },
            ].map((step, i) => (
              <div
                key={i}
                className="wv-card"
                style={{
                  background: 'linear-gradient(180deg,#16141C,#0E0E12)',
                  border: '1px solid rgba(255,255,255,.09)',
                  borderRadius: '24px',
                  padding: '32px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '56px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '13px',
                      fontWeight: 700,
                      color: step.numColor,
                    }}
                  >
                    {step.num}
                  </div>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '13px',
                      background: step.iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {step.icon}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '23px',
                    fontWeight: 800,
                    letterSpacing: '-.5px',
                    marginBottom: '10px',
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontSize: '15px',
                    lineHeight: 1.55,
                    color: 'rgba(255,255,255,.55)',
                  }}
                >
                  {step.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TWO SIDES ── */}
      <div
        id="earn"
        style={{
          maxWidth: '1160px',
          margin: '0 auto',
          padding: '30px 40px 100px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
          gap: '20px',
        }}
      >
        <div
          className="wv-side"
          style={{
            borderRadius: '26px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,.09)',
            background: '#0E0E12',
          }}
        >
          <div
            style={{
              height: '220px',
              background: 'repeating-linear-gradient(45deg,#171520,#171520 11px,#1E1A29 11px,#1E1A29 22px)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: 'rgba(255,255,255,.4)',
              }}
            >
              photo · brand campaign
            </span>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg,rgba(14,14,18,0) 40%,#0E0E12 100%)',
              }}
            />
          </div>
          <div style={{ padding: '30px 32px 34px' }}>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 900,
                letterSpacing: '-1px',
                marginBottom: '10px',
              }}
            >
              For brands
            </div>
            <div
              style={{
                fontSize: '15px',
                lineHeight: 1.55,
                color: 'rgba(255,255,255,.55)',
                marginBottom: '20px',
              }}
            >
              Reach real people on the app they check 20× a day. Pay for views, not
              promises. Watch it spread live.
            </div>
            <Link
              href="/signup"
              className="wv-btn"
              style={{
                display: 'inline-block',
                padding: '13px 24px',
                borderRadius: '13px',
                background: 'linear-gradient(120deg,#6E5BFF,#4D7CFF)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(98,92,255,.35)',
              }}
            >
              Post an ad →
            </Link>
          </div>
        </div>

        <div
          className="wv-side"
          style={{
            borderRadius: '26px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,.09)',
            background: '#0E0E12',
          }}
        >
          <div
            style={{
              height: '220px',
              background: 'repeating-linear-gradient(45deg,#1A1622,#1A1622 11px,#241A2E 11px,#241A2E 22px)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: 'rgba(255,255,255,.4)',
              }}
            >
              photo · person on phone
            </span>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg,rgba(14,14,18,0) 40%,#0E0E12 100%)',
              }}
            />
          </div>
          <div style={{ padding: '30px 32px 34px' }}>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 900,
                letterSpacing: '-1px',
                marginBottom: '10px',
              }}
            >
              For everyone
            </div>
            <div
              style={{
                fontSize: '15px',
                lineHeight: 1.55,
                color: 'rgba(255,255,255,.55)',
                marginBottom: '20px',
              }}
            >
              Turn your Status into income. Pick ads you like, post them for 24 hours,
              and earn a commission on every view.
            </div>
            <Link
              href="/signup"
              className="wv-btn-ghost"
              style={{
                display: 'inline-block',
                padding: '13px 24px',
                borderRadius: '13px',
                background: 'rgba(255,255,255,.07)',
                border: '1.5px solid rgba(255,255,255,.18)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              Start earning →
            </Link>
          </div>
        </div>
      </div>

      {/* ── CTA BAND ── */}
      <div style={{ maxWidth: '1160px', margin: '0 auto 90px', padding: '0 40px' }}>
        <div
          style={{
            position: 'relative',
            borderRadius: '32px',
            overflow: 'hidden',
            background: 'linear-gradient(120deg,#6E5BFF 0%,#4D7CFF 50%,#1FD3A3 100%)',
            backgroundSize: '200% auto',
            animation: 'wvShimmer 8s linear infinite',
            padding: '70px 48px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(36px,5vw,54px)',
              lineHeight: 1,
              letterSpacing: '-2px',
              fontWeight: 900,
              margin: '0 0 18px',
              color: '#fff',
            }}
          >
            Go viral on Status.
          </h2>
          <p
            style={{
              fontSize: '19px',
              color: 'rgba(255,255,255,.85)',
              fontWeight: 500,
              margin: '0 auto 32px',
              maxWidth: '460px',
            }}
          >
            Launch your first ad in minutes — or start earning on your own Status today.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '14px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/signup"
              style={{
                display: 'inline-block',
                padding: '17px 32px',
                borderRadius: '14px',
                background: '#08080A',
                color: '#fff',
                fontWeight: 700,
                fontSize: '17px',
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'transform .2s',
              }}
            >
              Post an ad
            </Link>
            <Link
              href="/signup"
              style={{
                display: 'inline-block',
                padding: '17px 32px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,.18)',
                border: '1.5px solid rgba(255,255,255,.4)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '17px',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              Earn on Status
            </Link>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', padding: '50px 40px' }}>
        <div
          style={{
            maxWidth: '1160px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '30px',
          }}
        >
          <div style={{ maxWidth: '280px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                marginBottom: '14px',
              }}
            >
              <div style={{ width: '26px', height: '26px', position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    border: '1.5px solid rgba(110,91,255,.45)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: 'linear-gradient(120deg,#6E5BFF,#1FD3A3)',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 900,
                  letterSpacing: '-.5px',
                }}
              >
                WViral
              </div>
            </div>
            <div
              style={{
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,.4)',
              }}
            >
              WhatsApp Status marketing. Your ad on everyone&apos;s Status. WhatsApp is a
              trademark of Meta — WViral is not affiliated with Meta.
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '64px',
              flexWrap: 'wrap',
            }}
          >
            {[
              {
                heading: 'Product',
                links: ['How it works', 'Pricing', 'For brands'],
              },
              {
                heading: 'Earn',
                links: ['Become a poster', 'Payouts', 'FAQ'],
              },
              {
                heading: 'Company',
                links: ['About', 'Privacy', 'Terms'],
              },
            ].map((col) => (
              <div
                key={col.heading}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '13px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,.5)',
                  whiteSpace: 'nowrap',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: 'rgba(255,255,255,.85)',
                    marginBottom: '2px',
                  }}
                >
                  {col.heading}
                </div>
                {col.links.map((l) => (
                  <span key={l} style={{ cursor: 'pointer' }}>
                    {l}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            maxWidth: '1160px',
            margin: '36px auto 0',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255,255,255,.06)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            color: 'rgba(255,255,255,.3)',
          }}
        >
          © 2026 WViral
        </div>
      </div>
    </div>
  )
}
