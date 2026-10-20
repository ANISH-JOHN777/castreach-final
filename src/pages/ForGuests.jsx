import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ShieldCheck, 
  Calendar, 
  DollarSign, 
  ArrowRight, 
  CheckCircle2, 
  Radio, 
  Lock, 
  Sliders, 
  Headphones, 
  Award,
  Globe2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ForGuests() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: '#13111C', minHeight: '100vh', color: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ── HERO SECTION ── */}
      <section style={{
        padding: '72px 28px 56px',
        borderBottom: '1px solid rgba(226, 182, 238, 0.16)',
        background: 'radial-gradient(circle at 50% 10%, rgba(72, 47, 76, 0.5) 0%, rgba(19, 17, 28, 0) 80%)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(72, 47, 76, 0.5)',
            border: '1px solid rgba(226, 182, 238, 0.35)',
            borderRadius: 24,
            padding: '6px 16px',
            fontSize: 13,
            fontWeight: 700,
            color: '#E2B6EE',
            marginBottom: 20
          }}>
            <Sparkles size={15} color="#E2B6EE" />
            <span>CastReach for Keynote Guests & Experts</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 4.5vw, 54px)',
            fontWeight: 850,
            letterSpacing: '-0.025em',
            margin: '0 0 20px',
            lineHeight: 1.15
          }}>
            Share your ideas with the right audiences. On your terms.
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 1.5vw, 19px)',
            color: '#CBD5E1',
            lineHeight: 1.6,
            margin: '0 auto 36px',
            maxWidth: 720
          }}>
            Stop wasting time with unprepared hosts and unpaid appearances. CastReach gives keynote speakers, researchers, and creators complete control over interview requests, transparent pricing, and guaranteed payouts.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/register"
              style={{
                background: '#482F4C',
                color: '#FFFFFF',
                border: '1px solid rgba(226, 182, 238, 0.5)',
                borderRadius: 28,
                padding: '14px 32px',
                fontSize: 15,
                fontWeight: 750,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 6px 24px rgba(72, 47, 76, 0.55)'
              }}
            >
              <Award size={18} />
              <span>Claim Guest Profile</span>
            </Link>

            <Link
              to="/find-guests"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 28,
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 650,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span>Explore Directory</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4 PILLARS FOR GUESTS ── */}
      <section style={{ padding: '64px 28px', borderBottom: '1px solid rgba(226, 182, 238, 0.16)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 12px' }}>
              Built for experts who value their time
            </h2>
            <p style={{ fontSize: 16, color: '#CBD5E1', maxWidth: 640, margin: '0 auto' }}>
              Every feature protects your brand, calendar, and intellectual contribution.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24
          }}>
            {/* 1 */}
            <div style={{
              background: '#1E1A29',
              border: '1px solid rgba(226, 182, 238, 0.22)',
              borderRadius: 20,
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(72, 47, 76, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sliders size={22} color="#E2B6EE" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 750, margin: 0 }}>Full Control Over Invitations</h3>
              <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                Every inquiry includes the host's podcast metrics, proposed interview topic, date, and agreed terms. Accept, decline, or propose revisions with one click.
              </p>
            </div>

            {/* 2 */}
            <div style={{
              background: '#1E1A29',
              border: '1px solid rgba(226, 182, 238, 0.22)',
              borderRadius: 20,
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(72, 47, 76, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={22} color="#E2B6EE" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 750, margin: 0 }}>Upfront Escrow Guarantee</h3>
              <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                Never chase an invoice again. The host pre-deposits your agreed fee into CastReach escrow before the interview starts. When the session wraps, payment is transferred.
              </p>
            </div>

            {/* 3 */}
            <div style={{
              background: '#1E1A29',
              border: '1px solid rgba(226, 182, 238, 0.22)',
              borderRadius: 20,
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(72, 47, 76, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={22} color="#E2B6EE" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 750, margin: 0 }}>Synchronized Calendar Availability</h3>
              <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                Set your exact preferred interview hours, buffer times between sessions, and maximum slots per week. Never get double-booked or interrupted.
              </p>
            </div>

            {/* 4 */}
            <div style={{
              background: '#1E1A29',
              border: '1px solid rgba(226, 182, 238, 0.22)',
              borderRadius: 20,
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(72, 47, 76, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={22} color="#E2B6EE" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 750, margin: 0 }}>Portfolio of Past Appearances</h3>
              <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                CastReach automatically links published podcast episodes, chapters, and audience reception to your profile, building an authoritative public portfolio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ / TRUST SECTION ── */}
      <section style={{ padding: '64px 28px', background: 'rgba(24, 20, 34, 0.5)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 32px', textAlign: 'center' }}>
            Frequently Asked Questions for Guests
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#1E1A29', border: '1px solid rgba(226, 182, 238, 0.18)', borderRadius: 16, padding: '20px 24px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 750, color: '#FFFFFF', margin: '0 0 8px' }}>
                Can I set my guest fee to zero or donate it to charity?
              </h3>
              <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                Yes! You have full discretion over your rates. Many authors and researchers set their fee to Pro Bono ($0) to maximize book reach, or direct proceeds to a designated non-profit organization.
              </p>
            </div>

            <div style={{ background: '#1E1A29', border: '1px solid rgba(226, 182, 238, 0.18)', borderRadius: 16, padding: '20px 24px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 750, color: '#FFFFFF', margin: '0 0 8px' }}>
                What happens if the host fails to show up or cancels late?
              </h3>
              <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                Because the host pre-funded escrow upon booking confirmation, late host cancellations (within 24 hours of session time) release a cancellation compensation fee directly to you.
              </p>
            </div>

            <div style={{ background: '#1E1A29', border: '1px solid rgba(226, 182, 238, 0.18)', borderRadius: 16, padding: '20px 24px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 750, color: '#FFFFFF', margin: '0 0 8px' }}>
                Do I need special equipment to record?
              </h3>
              <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                Any modern browser (Chrome, Safari, Edge) with a quiet room and standard USB microphone or quality headphones is sufficient. CastReach handles echo cancellation, studio routing, and local backup tracks automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding: '60px 28px',
        textAlign: 'center',
        background: '#13111C'
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 14px' }}>
            Elevate your voice with high-impact conversations
          </h2>
          <p style={{ fontSize: 15, color: '#CBD5E1', margin: '0 0 28px' }}>
            Join leading researchers, founders, and cultural figures on CastReach.
          </p>
          <Link
            to="/register"
            style={{
              background: '#482F4C',
              color: '#FFFFFF',
              border: '1px solid rgba(226, 182, 238, 0.5)',
              borderRadius: 28,
              padding: '14px 36px',
              fontSize: 15,
              fontWeight: 750,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>Apply as Keynote Guest</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
