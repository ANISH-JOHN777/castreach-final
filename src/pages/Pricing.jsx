import { Link } from 'react-router-dom';
import { Check, ArrowRight, ShieldCheck, Zap, Radio, Video, Calendar, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Pricing() {
  const plans = [
    {
      name: 'Explorer',
      tagline: 'For new hosts and emerging guest speakers getting started.',
      price: '$0',
      period: 'forever free',
      highlight: false,
      cta: 'Get Started Free',
      ctaLink: '/register',
      features: [
        'Browse all verified Host & Guest profiles',
        'Direct messaging with mutual matches',
        'Schedule virtual Google Meet recording sessions',
        'In-person studio session location mapping',
        '1 live cloud session recording per month',
        'Standard profile transparency badge',
      ],
    },
    {
      name: 'Creator Pro',
      tagline: 'For active podcasters and frequent guest speakers scaling their presence.',
      price: '$29',
      period: 'per month',
      badge: 'MOST POPULAR',
      highlight: true,
      cta: 'Start Pro Membership',
      ctaLink: '/register?plan=pro',
      features: [
        'Unlimited Google Meet virtual session bookings',
        'Unlimited In-Person physical studio scheduling',
        'Multi-track cloud studio recording & editing (EDL)',
        'Automatic AI transcription & episode timestamps',
        'Priority search placement in Creator Discover directory',
        'Verified audience metric confirmation for Hosts',
        'Speaker topic verification for Guests',
        'Custom Google Calendar direct integration',
      ],
    },
    {
      name: 'Network & Studio',
      tagline: 'For podcast production studios, agencies, and multi-show networks.',
      price: '$89',
      period: 'per month',
      highlight: false,
      cta: 'Contact Studio Team',
      ctaLink: '/about',
      features: [
        'Everything in Creator Pro',
        'Multi-host & multi-channel management',
        'Custom physical studio booking management system',
        'Lossless high-bitrate WAV & 4K video exports',
        'Dedicated escrow settlement for paid appearances',
        'Custom domain & public RSS feed generator',
        'Dedicated onboarding & technical sound engineer',
      ],
    },
  ];

  return (
    <div style={{ background: 'var(--bg-obsidian)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      <Navbar />

      <main style={{ maxWidth: 1360, margin: '0 auto', padding: '60px 24px 120px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 60px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-lime)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            MEMBERSHIPS & ACCESS
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', fontWeight: 850, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>
            Simple, Transparent Creator Pricing
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Whether connecting over Google Meet or meeting in a physical podcast studio, choose the plan that powers your show.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          alignItems: 'stretch',
          marginBottom: 80,
        }}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="bento-card"
              style={{
                padding: '36px 30px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderColor: plan.highlight ? 'var(--accent-lime)' : 'var(--border-subtle)',
                background: plan.highlight ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                position: 'relative',
              }}
            >
              {plan.badge && (
                <span style={{
                  position: 'absolute',
                  top: 18,
                  right: 20,
                  fontSize: 11,
                  fontWeight: 800,
                  background: 'var(--accent-lime)',
                  color: 'var(--text-dark)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  letterSpacing: '0.06em',
                }}>
                  {plan.badge}
                </span>
              )}

              <div>
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#ffffff' }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', minHeight: 40, lineHeight: 1.5, marginBottom: 24 }}>
                  {plan.tagline}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 44, fontWeight: 900, color: plan.highlight ? 'var(--accent-lime)' : '#ffffff' }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    / {plan.period}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}>
                  {plan.features.map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <Check size={16} color={plan.highlight ? 'var(--accent-lime)' : 'var(--accent-purple)'} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ lineHeight: 1.4 }}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to={plan.ctaLink}
                className={plan.highlight ? 'btn-primary-lime' : 'btn-ghost-dark'}
                style={{ width: '100%', textAlign: 'center', padding: '12px' }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', marginBottom: 32 }}>
            Frequently Asked Questions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="bento-card" style={{ padding: 22 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#fff' }}>
                How do Google Meet and in-person studio bookings work?
              </h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                When requesting or accepting a session, you choose between Google Meet (a video link is automatically generated and added to both participants' Google Calendars) or In-Person (physical studio venue address, city, and check-in instructions are provided with a one-click Google Maps link).
              </p>
            </div>

            <div className="bento-card" style={{ padding: 22 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#fff' }}>
                How is host and guest transparency verified?
              </h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Hosts disclose verified listener metrics, typical show formats, and studio equipment. Guests declare their areas of expertise, speaking topics, portfolio links, and prior podcast appearances. All information is directly visible before sending or accepting an invitation.
              </p>
            </div>

            <div className="bento-card" style={{ padding: 22 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#fff' }}>
                Can I switch between Host and Guest roles?
              </h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Yes, your account allows you to both host your own show and appear as a guest speaker on others with unified scheduling and session management.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
