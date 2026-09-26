import { Link } from 'react-router-dom';
import { Mic, ShieldCheck, Video, CheckCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--plum-deep)',
      color: 'var(--lavender-mist)',
      padding: '64px 24px 32px',
      borderTop: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 48,
          marginBottom: 48,
        }}>
          {/* Brand Column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Mic size={26} color="var(--purple-castreach)" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: '#fff' }}>
                CastReach
              </span>
            </div>
            <p style={{ color: 'var(--lavender-soft)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              The premier marketplace and WebRTC recording studio connecting podcast hosts with industry leaders, authors, and experts worldwide.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 20, fontSize: 12, color: 'var(--lavender-soft)' }}>
                <ShieldCheck size={14} /> Escrow Security
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 20, fontSize: 12, color: 'var(--lavender-soft)' }}>
                <Video size={14} /> HD Studio
              </span>
            </div>
          </div>

          {/* Marketplace Links */}
          <div>
            <h4 style={{ color: '#fff', fontSize: 16, marginBottom: 20, fontFamily: 'var(--font-display)' }}>Marketplace</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--lavender-soft)' }}>
              <li><Link to="/discover">Discover Creators</Link></li>
              <li><Link to="/explore">Featured Guests</Link></li>
              <li><Link to="/shorts">Podcast Shorts</Link></li>
              <li><Link to="/register?role=host">Become a Host</Link></li>
              <li><Link to="/register?role=guest">Become a Guest</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 style={{ color: '#fff', fontSize: 16, marginBottom: 20, fontFamily: 'var(--font-display)' }}>Top Categories</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--lavender-soft)' }}>
              <li><Link to="/discover?category=Technology">Technology & AI</Link></li>
              <li><Link to="/discover?category=Startups">Startups & Venture</Link></li>
              <li><Link to="/discover?category=Business">Business & Leadership</Link></li>
              <li><Link to="/discover?category=Marketing">Growth & Marketing</Link></li>
              <li><Link to="/discover?category=Creator Economy">Creator Economy</Link></li>
            </ul>
          </div>

          {/* Platform Security */}
          <div>
            <h4 style={{ color: '#fff', fontSize: 16, marginBottom: 20, fontFamily: 'var(--font-display)' }}>Trust & Security</h4>
            <p style={{ color: 'var(--lavender-soft)', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
              Stripe Escrow protects payments until session verification. Every studio session is monitored by DataStitcher audit security.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 600, fontSize: 13 }}>
              <CheckCircle size={16} color="var(--color-success)" /> Verified Profiles & Reviews
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 24,
          display: 'flex',
          justifyKeyword: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          fontSize: 13,
          color: 'var(--lavender-soft)',
        }}>
          <div>© {new Date().getFullYear()} CastReach Platform. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security Statement</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
