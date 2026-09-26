import { useNavigate } from 'react-router-dom';
import { Clock, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Explore() {
  const navigate = useNavigate();

  const featuredEpisodes = [
    { id: 1, title: 'Building Autonomous AI Agents with LangChain', host: 'Alex Rivera', guest: 'Dr. Sam Vance', duration: '48 min', rating: '4.9', tag: 'AI & Tech' },
    { id: 2, title: 'The 0-to-1 Product Playbook for B2B Founders', host: 'Sarah Jenkins', guest: 'Marcus Thorne', duration: '55 min', rating: '5.0', tag: 'Startups' },
    { id: 3, title: 'Scaling Creator Media Brands to $10M ARR', host: 'Elena Rostova', guest: 'Chloe Zhang', duration: '42 min', rating: '4.85', tag: 'Creator Economy' },
  ];

  return (
    <div style={{ background: 'var(--cream-warm)', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, marginBottom: 8 }}>Explore Featured Episodes & Podcasts</h1>
          <p style={{ color: 'var(--text-muted)' }}>Listen to curated recordings created right here on the CastReach Studio platform.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          {featuredEpisodes.map((ep) => (
            <div key={ep.id} className="card-hover" style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 24, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ background: 'var(--lavender-mist)', color: 'var(--plum-deep)', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{ep.tag}</span>
              <h3 style={{ fontSize: 18, marginTop: 14, marginBottom: 10 }}>{ep.title}</h3>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Host: <b>{ep.host}</b> • Guest: <b>{ep.guest}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> {ep.duration}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="#f59e0b" color="#f59e0b" /> {ep.rating}</span>
                <button onClick={() => navigate('/discover')} style={{ background: 'var(--plum-primary)', color: '#fff', padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600 }}>
                  Book Guest
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
