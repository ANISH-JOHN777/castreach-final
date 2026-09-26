import { Film, Eye } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Shorts() {
  const shorts = [
    { title: 'AI Agent Architecture in 60 Seconds', creator: 'Elena Rostova', views: '24.5k', likes: '1.8k' },
    { title: 'The #1 Mistake Early Stage Founders Make', creator: 'Marcus Vance', views: '18.2k', likes: '1.2k' },
    { title: 'How to Prepare 5 Interview Topics with AI', creator: 'Sophia Chen', views: '32.1k', likes: '2.4k' },
  ];

  return (
    <div style={{ background: 'var(--cream-warm)', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, marginBottom: 8 }}>Podcast Shorts & Clips</h1>
          <p style={{ color: 'var(--text-muted)' }}>High-impact bite-sized highlights from recent CastReach studio recordings.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {shorts.map((s, idx) => (
            <div key={idx} className="card-hover" style={{ background: 'var(--plum-deep)', color: '#fff', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-md)' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', height: 160, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple-castreach)', marginBottom: 16 }}>
                <Film size={44} />
              </div>
              <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 8 }}>{s.title}</h3>
              <div style={{ fontSize: 13, color: 'var(--lavender-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{s.creator}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Eye size={13} /> {s.views}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
