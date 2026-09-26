import { Mic, ShieldCheck, Bot } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function About() {
  return (
    <div style={{ background: 'var(--cream-warm)', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '80px 24px' }}>
        <h1 style={{ fontSize: 42, marginBottom: 20 }}>About CastReach</h1>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 32 }}>
          CastReach was built with a single mission: to eliminate friction in podcast discovery, booking, escrow payments, and high-fidelity WebRTC recording.
        </p>

        <div style={{ background: '#fff', padding: 36, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Our Core Pillars</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, marginTop: 24 }}>
            <div>
              <h3 style={{ fontSize: 16, color: 'var(--plum-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mic size={18} /> WebRTC Studio
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Browser-native 48kHz audio recording powered by Daily.co WebRTC architecture.</p>
            </div>
            <div>
              <h3 style={{ fontSize: 16, color: 'var(--plum-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} /> Escrow Security
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Automated Stripe escrow holds and verification safeguards host & guest funds.</p>
            </div>
            <div>
              <h3 style={{ fontSize: 16, color: 'var(--plum-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bot size={18} /> AI Preparation
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Anthropic Claude AI integration assists hosts with topic outlines and talking points.</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
