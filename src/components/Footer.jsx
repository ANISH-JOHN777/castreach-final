import { Link } from 'react-router-dom';
import { Radio, ShieldCheck, Video, Headphones, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      background: '#090a0f',
      color: '#94a3b8',
      padding: '64px 24px 32px',
      borderTop: '1px solid #1a1c24',
    }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 48,
          marginBottom: 48,
        }}>
          {/* Brand Column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}>
                <Radio size={18} />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: '#fff' }}>
                Podcast
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '2px 6px',
                borderRadius: 6,
              }}>
                CastReach
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              The all-in-one platform for podcast listeners, creators, and expert guests. Discover trending shows, stream episodes, and collaborate live in our WebRTC recording studio.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#13151f', padding: '6px 12px', borderRadius: 20, fontSize: 12, color: '#e2e8f0' }}>
                <ShieldCheck size={14} color="#10b981" /> Stripe Escrow
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#13151f', padding: '6px 12px', borderRadius: 20, fontSize: 12, color: '#e2e8f0' }}>
                <Headphones size={14} color="#38bdf8" /> 48kHz Studio
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Navigation</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
              <li><Link to="/discover" style={{ color: '#94a3b8' }}>Discover Podcasts</Link></li>
              <li><Link to="/explore" style={{ color: '#94a3b8' }}>Featured Episodes</Link></li>
              <li><Link to="/discover?tab=hosts" style={{ color: '#94a3b8' }}>Top Podcasters</Link></li>
              <li><Link to="/about" style={{ color: '#94a3b8' }}>Pricing & Features</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Popular Genres</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
              <li><Link to="/discover?category=Technology" style={{ color: '#94a3b8' }}>Technology & AI</Link></li>
              <li><Link to="/discover?category=Business" style={{ color: '#94a3b8' }}>Business & Startups</Link></li>
              <li><Link to="/discover?category=Psychology" style={{ color: '#94a3b8' }}>Psychology & Mindset</Link></li>
              <li><Link to="/discover?category=Sport" style={{ color: '#94a3b8' }}>Sport & Fitness</Link></li>
            </ul>
          </div>

          {/* Security & Studio */}
          <div>
            <h4 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Studio Trust</h4>
            <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
              Payments held in trust until guest interview verification. AI show notes and automated live multi-track backups.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 600, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              All Systems Operational (48kHz WebRTC)
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid #1a1c24',
          paddingTop: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: '#64748b',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            © {new Date().getFullYear()} CastReach Podcast Studio Platform. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link to="/about" style={{ color: '#64748b' }}>Privacy Policy</Link>
            <Link to="/about" style={{ color: '#64748b' }}>Terms of Service</Link>
            <Link to="/about" style={{ color: '#64748b' }}>Security Whitepaper</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
