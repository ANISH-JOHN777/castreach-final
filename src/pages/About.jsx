import { Radio, ShieldCheck, Headphones, Check, ArrowRight, Users, Video, MapPin, Layers, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function About() {
  return (
    <div style={{ background: 'var(--bg-obsidian)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      <Navbar />

      <main style={{ maxWidth: 1360, margin: '0 auto', padding: '60px 24px 120px' }}>
        {/* Editorial Hero Statement */}
        <div style={{ textAlign: 'center', maxWidth: 840, margin: '0 auto 70px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-lime)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            ABOUT THE PROJECT
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 850, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20 }}>
            The Open Platform for Real Conversations
          </h1>
          <p style={{ fontSize: 16.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            CastReach re-engineers how podcast hosts and guest speakers find each other, book in-person or virtual sessions, and capture studio audio with mutual transparency.
          </p>
        </div>

        {/* 3 Core Pillars Bento Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 80 }}>
          <div className="bento-card" style={{ padding: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Users size={22} color="var(--text-dark)" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: '#fff' }}>
              Zero Fake Accounts & Real Data
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              No pre-seeded stock personas or imaginary credentials. Every host discloses actual listener reach and show formats; every guest presents their actual areas of expertise and prior appearances.
            </p>
          </div>

          <div className="bento-card" style={{ padding: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Video size={22} color="#fff" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: '#fff' }}>
              Dual-Mode Collaboration
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Choose Google Meet for low-latency remote video calls or physical in-person studio tapings. Automated Google Calendar syncing and Google Maps studio location guidance are built in.
            </p>
          </div>

          <div className="bento-card" style={{ padding: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-tangerine)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Layers size={22} color="#fff" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: '#fff' }}>
              In-Browser Studio & Trimming
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              A browser-first recording workspace with local fallback audio capture, AI-driven transcription, and instant non-destructive EDL editing.
            </p>
          </div>
        </div>

        {/* Call to Action Banner */}
        <div className="bento-card" style={{
          padding: '60px 40px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, var(--bg-surface-elevated) 0%, var(--bg-surface) 100%)',
          borderColor: 'var(--border-medium)',
        }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 850, marginBottom: 14, color: '#ffffff' }}>
            Ready to Speak and Be Heard?
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto 28px', lineHeight: 1.6 }}>
            Join thousands of independent podcasters and expert voices scheduling real episodes on CastReach.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn-primary-lime">
              Join CastReach <ArrowRight size={15} />
            </Link>
            <Link to="/discover" className="btn-ghost-dark">
              Explore Creator Directory
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
