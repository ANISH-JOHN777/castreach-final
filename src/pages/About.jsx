import { Radio, ShieldCheck, Headphones, Bot, Check, ArrowRight, Zap, Users, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function About() {
  const plans = [
    {
      name: 'Free Listener & Guest',
      price: '$0',
      period: 'forever',
      description: 'Stream all public podcasts, create your guest speaker profile, and join booked interviews.',
      features: [
        'Unlimited podcast streaming',
        'Guest speaker public profile',
        'Join studio recordings via WebRTC',
        'Live transcriptions & subtitles',
        'Community discussion threads',
      ],
      cta: 'Get Started Free',
      highlighted: false,
    },
    {
      name: 'Pro Creator & Host',
      price: '$29',
      period: '/month',
      description: 'Everything you need to produce, record, and monetize top-charting podcasts with automated escrow.',
      features: [
        'Unlimited 48kHz HD Studio sessions',
        'Separate multi-track local WAV backup',
        'AI Claude show notes & summaries',
        'Automated Stripe escrow bookings',
        'Instant RSS distribution to Spotify & Apple',
        'Priority guest matchmaking engine',
      ],
      cta: 'Start 14-Day Free Trial',
      highlighted: true,
    },
    {
      name: 'Studio Network',
      price: '$99',
      period: '/month',
      description: 'For podcast production houses, media agencies, and multi-show syndicates.',
      features: [
        'Everything in Pro Creator',
        'Up to 10 distinct podcast feeds',
        'Custom brand overlay & intro/outro stitcher',
        'Dedicated producer booth & moderation',
        'Stripe custom split payouts',
        '24/7 Priority technical support',
      ],
      cta: 'Contact Network Sales',
      highlighted: false,
    },
  ];

  return (
    <div style={{ background: '#fdfdfd', minHeight: '100vh', color: '#0f172a' }}>
      <Navbar />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px 100px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 60px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#e0f2fe',
            color: '#0284c7',
            padding: '4px 14px',
            borderRadius: 16,
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 16,
          }}>
            <Sparkles size={14} /> SIMPLE, TRANSPARENT PLATFORM
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Empowering Next-Generation Podcast Creators & Guests
          </h1>

          <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.6 }}>
            CastReach was built with a single mission: to eliminate friction in podcast discovery, host-guest scheduling, verified escrow payments, and browser-native WebRTC studio recording.
          </p>
        </div>

        {/* Pricing Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 28,
          marginBottom: 80,
        }}>
          {plans.map((plan, idx) => (
            <div
              key={idx}
              style={{
                background: plan.highlighted ? '#0f172a' : '#ffffff',
                color: plan.highlighted ? '#ffffff' : '#0f172a',
                borderRadius: 24,
                padding: 36,
                border: plan.highlighted ? 'none' : '1px solid #e2e8f0',
                boxShadow: plan.highlighted
                  ? '0 20px 40px rgba(15, 23, 42, 0.25)'
                  : '0 4px 20px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              {plan.highlighted && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#2563eb',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '4px 14px',
                  borderRadius: 12,
                  letterSpacing: '0.04em',
                }}>
                  MOST POPULAR
                </div>
              )}

              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{plan.name}</h3>
                <p style={{ fontSize: 13, color: plan.highlighted ? '#94a3b8' : '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
                  {plan.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 28 }}>
                  <span style={{ fontSize: 42, fontWeight: 900 }}>{plan.price}</span>
                  <span style={{ fontSize: 14, color: plan.highlighted ? '#94a3b8' : '#64748b' }}>{plan.period}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: plan.highlighted ? '#2563eb' : '#eff6ff',
                        color: plan.highlighted ? '#fff' : '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Check size={12} />
                      </div>
                      <span style={{ color: plan.highlighted ? '#e2e8f0' : '#334155' }}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to="/register"
                style={{
                  background: plan.highlighted ? '#2563eb' : '#0f172a',
                  color: '#ffffff',
                  textAlign: 'center',
                  padding: '13px 20px',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: plan.highlighted ? '0 6px 20px rgba(37, 99, 235, 0.4)' : 'none',
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Technical Architecture & Security Highlights */}
        <div style={{
          background: '#f8fafc',
          borderRadius: 24,
          padding: '48px 40px',
          border: '1px solid #e2e8f0',
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, textAlign: 'center' }}>
            Built on Industry-Grade Architecture
          </h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 15, maxWidth: 600, margin: '0 auto 36px' }}>
            CastReach combines robust WebRTC real-time conferencing, Stripe marketplace escrow, and AI speech intelligence.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            <div style={{ background: '#fff', padding: 24, borderRadius: 18, border: '1px solid #e2e8f0' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Headphones size={20} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>WebRTC 48kHz Studio</h4>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Local multitrack recording isolates speaker audio from network packet loss, producing crystal-clear audio.
              </p>
            </div>

            <div style={{ background: '#fff', padding: 24, borderRadius: 18, border: '1px solid #e2e8f0' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <ShieldCheck size={20} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Stripe Escrow Protocol</h4>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Guest appearance fees are automatically reserved on booking and disbursed only after successful session completion.
              </p>
            </div>

            <div style={{ background: '#fff', padding: 24, borderRadius: 18, border: '1px solid #e2e8f0' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Bot size={20} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>AI Show Notes & Transcripts</h4>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Automated transcription and AI topic generation turn raw recordings into ready-to-publish episodes with key takeaways.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
