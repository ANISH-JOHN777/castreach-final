import { Link } from 'react-router-dom';
import { Radio, ShieldCheck, Video, Headphones, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--bg-obsidian)',
      color: 'var(--text-secondary)',
      padding: '60px 24px 32px',
      borderTop: '1px solid var(--border-subtle)',
    }}>
      <div style={{ maxWidth: 1360, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 40,
          marginBottom: 48,
        }}>
          {/* Brand Column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--accent-lime)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-dark)',
              }}>
                <Radio size={18} strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 850, fontSize: 20, color: '#fff' }}>
                CASTREACH
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--accent-lime)',
                background: 'rgba(203, 251, 69, 0.1)',
                padding: '2px 6px',
                borderRadius: 6,
                letterSpacing: '0.04em',
              }}>
                PODCAST
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 18 }}>
              Modern podcast host & guest matchmaking. Connect over Google Meet virtual video rooms or physical in-person recording studios with verified real data transparency.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-surface)', padding: '5px 10px', borderRadius: 20, fontSize: 11.5, color: 'var(--text-primary)' }}>
                <Video size={13} color="var(--accent-lime)" /> Google Meet
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-surface)', padding: '5px 10px', borderRadius: 20, fontSize: 11.5, color: 'var(--text-primary)' }}>
                <MapPin size={13} color="var(--accent-purple)" /> In-Person Studio
              </span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Platform
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <li><Link to="/discover" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Creator Directory</Link></li>
              <li><Link to="/episodes" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Episodes & Broadcasts</Link></li>
              <li><Link to="/pricing" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Pricing & Memberships</Link></li>
              <li><Link to="/about" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Project Philosophy</Link></li>
            </ul>
          </div>

          {/* Creator Tools */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Creator Hub
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <li><Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Host Dashboard</Link></li>
              <li><Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Guest Dashboard</Link></li>
              <li><Link to="/bookings" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Session Schedules</Link></li>
              <li><Link to="/settings" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Studio Settings</Link></li>
            </ul>
          </div>

          {/* Standards & Transparency */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Data & Ethics
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              CastReach operates on 100% real community accounts. Listener stats and guest credentials are verified directly on the platform without pre-seeded mock personas.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 24,
          borderTop: '1px solid var(--border-subtle)',
          fontSize: 12,
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            &copy; {new Date().getFullYear()} CastReach Podcast Platform. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <span>Verified Real Data</span>
            <span>·</span>
            <span>Google Meet & Studio Scheduling</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
