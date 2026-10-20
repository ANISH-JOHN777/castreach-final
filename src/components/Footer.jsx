import { Link } from 'react-router-dom';
import CastReachLogo from './CastReachLogo';

export default function Footer() {
  return (
    <footer style={{
      background: '#0A090F', // Pure Dark Footer
      color: '#A39EA9',
      padding: '72px clamp(20px, 4vw, 36px) 48px',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      fontFamily: 'inherit',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 40,
          marginBottom: 56,
        }}>
          {/* Brand Column */}
          <div style={{ maxWidth: 300 }}>
            <div style={{ marginBottom: 18 }}>
              <CastReachLogo size={28} textSize={19} color="#FFFFFF" />
            </div>
            <p style={{ color: '#A39EA9', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
              The premium marketplace where podcast hosts discover vetted thinkers, agree on clear deliverables, and record memorable interviews with bonded escrow protection.
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#22C55E', // Green Accent
              background: 'rgba(34, 197, 94, 0.1)',
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid rgba(34, 197, 94, 0.25)',
            }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
              Bonded escrow custody on every session
            </div>
          </div>

          {/* Discover Column */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Discover
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <li>
                <Link to="/find-guests" style={{ color: '#A39EA9', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = '#A39EA9')}>
                  Discover guests
                </Link>
              </li>
              <li>
                <Link to="/listen" style={{ color: '#A39EA9', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#A855F7')} onMouseLeave={(e) => (e.currentTarget.style.color = '#A39EA9')}>
                  Listen to episodes
                </Link>
              </li>
              <li>
                <Link to="/find-guests?category=Neuroscience+%26+Health" style={{ color: '#A39EA9', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = '#A39EA9')}>
                  Science & health
                </Link>
              </li>
              <li>
                <Link to="/find-guests?category=Tech+%26+AI+Pioneers" style={{ color: '#A39EA9', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = '#A39EA9')}>
                  Tech & AI pioneers
                </Link>
              </li>
            </ul>
          </div>

          {/* Participate Column */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Participate
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <li>
                <Link to="/for-hosts" style={{ color: '#A39EA9', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#22C55E')} onMouseLeave={(e) => (e.currentTarget.style.color = '#A39EA9')}>
                  For podcast hosts
                </Link>
              </li>
              <li>
                <Link to="/for-guests" style={{ color: '#A39EA9', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#A855F7')} onMouseLeave={(e) => (e.currentTarget.style.color = '#A39EA9')}>
                  For expert guests
                </Link>
              </li>
              <li>
                <Link to="/pricing" style={{ color: '#A39EA9', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = '#A39EA9')}>
                  Pricing & 10% fee
                </Link>
              </li>
              <li>
                <Link to="/register" style={{ color: '#A39EA9', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#A855F7')} onMouseLeave={(e) => (e.currentTarget.style.color = '#A39EA9')}>
                  Create account
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Support Column */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Trust & Protection
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <li>
                <Link to="/about" style={{ color: '#A39EA9', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = '#A39EA9')}>
                  How booking works
                </Link>
              </li>
              <li>
                <span style={{ color: '#A39EA9' }}>Escrow payment custody</span>
              </li>
              <li>
                <span style={{ color: '#A39EA9' }}>Cancellation & refund policy</span>
              </li>
              <li>
                <Link to="/login" style={{ color: '#22C55E', textDecoration: 'none', fontWeight: 650 }}>
                  Sign in →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          paddingTop: 28,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          fontSize: 13,
          color: '#6F6A76'
        }}>
          <div>
            © {new Date().getFullYear()} CASTREACH Inc. All rights reserved. Premium marketplace for podcasts.
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <span>Privacy</span>
            <span>Terms</span>
            <span>Studio Quality Standard</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
