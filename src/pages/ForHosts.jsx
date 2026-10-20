import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  ShieldCheck, 
  Video, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Sliders, 
  Clock, 
  DollarSign, 
  Lock,
  Headphones,
  Award
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ForHosts() {
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
            <Award size={15} color="#E2B6EE" />
            <span>CastReach for Podcast Hosts</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 4.5vw, 54px)',
            fontWeight: 850,
            letterSpacing: '-0.025em',
            margin: '0 0 20px',
            lineHeight: 1.15
          }}>
            Find the voice that elevates your next episode.
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 1.5vw, 19px)',
            color: '#CBD5E1',
            lineHeight: 1.6,
            margin: '0 auto 36px',
            maxWidth: 720
          }}>
            Stop cold emailing guests who never respond. CastReach connects serious podcast hosts with verified thinkers, founders, and keynote authorities — backed by bonded payment protection and built-in studio recording.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/find-guests"
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
              <Users size={18} />
              <span>Browse Guest Directory</span>
            </Link>

            <Link
              to="/register"
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
              <span>Create Host Account</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4 PILLARS FOR HOSTS ── */}
      <section style={{ padding: '64px 28px', borderBottom: '1px solid rgba(226, 182, 238, 0.16)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 12px' }}>
              Designed around what hosts actually need
            </h2>
            <p style={{ fontSize: 16, color: '#CBD5E1', maxWidth: 640, margin: '0 auto' }}>
              Credibility, zero no-shows, clear terms, and transparent payment settlement.
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
                <Users size={22} color="#E2B6EE" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 750, margin: 0 }}>Vetted Credibility First</h3>
              <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                Every guest profile displays verified credentials, suggested discussion angles, previous audio appearances, and authentic ratings from previous hosts.
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
                <Lock size={22} color="#E2B6EE" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 750, margin: 0 }}>Bonded Escrow Protection</h3>
              <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                Your payment is never sent directly to a stranger. Funds remain securely locked in CastReach bonded custody until you complete and confirm the recording.
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
                <Clock size={22} color="#E2B6EE" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 750, margin: 0 }}>Zero No-Show Risk</h3>
              <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                Guests commit to confirmed calendar slots. If a guest cancels or fails to attend, 100% of your deposit is instantly refunded to your payment method.
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
                <Video size={22} color="#E2B6EE" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 750, margin: 0 }}>HD Studio Recording</h3>
              <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                Conduct your session in CastReach’s built-in WebRTC recording studio with local lossless audio capture, live transcription, and automatic cloud backups.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRANSPARENT PRICING & SETTLEMENT SPECIMEN ── */}
      <section style={{ padding: '64px 28px', background: 'rgba(24, 20, 34, 0.5)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 10px' }}>
              Transparent fee breakdown on every booking
            </h2>
            <p style={{ fontSize: 15, color: '#CBD5E1', margin: 0 }}>
              No hidden fees, no automatic credit card charges when sending an inquiry.
            </p>
          </div>

          <div style={{
            background: '#1E1A29',
            border: '1.5px solid rgba(226, 182, 238, 0.28)',
            borderRadius: 24,
            padding: '32px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid rgba(226, 182, 238, 0.16)' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 750, color: '#FFFFFF' }}>Sample Booking: Interview with Dr. Maya Chen</div>
                <div style={{ fontSize: 13, color: '#E2B6EE', marginTop: 4 }}>45-Minute Remote HD Interview • Autonomous AI Architecture</div>
              </div>
              <span style={{
                background: 'rgba(72, 47, 76, 0.6)',
                border: '1px solid rgba(226, 182, 238, 0.35)',
                padding: '4px 12px',
                borderRadius: 14,
                fontSize: 12,
                fontWeight: 700,
                color: '#E2B6EE'
              }}>
                Funds Held in Custody
              </span>
            </div>

            <div style={{ margin: '24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: '#CBD5E1' }}>
                <span>Agreed Guest Fee</span>
                <strong style={{ color: '#FFFFFF' }}>$500.00</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: '#CBD5E1' }}>
                <span>CastReach Platform Fee (Escrow, HD Studio & Payout Processing)</span>
                <strong style={{ color: '#FFFFFF' }}>$50.00</strong>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 18,
                fontWeight: 800,
                color: '#FFFFFF',
                paddingTop: 16,
                borderTop: '1px solid rgba(226, 182, 238, 0.16)'
              }}>
                <span>Total Payable at Confirmation</span>
                <span style={{ color: '#E2B6EE' }}>$550.00</span>
              </div>
            </div>

            <div style={{
              background: 'rgba(72, 47, 76, 0.3)',
              borderRadius: 14,
              padding: '14px 18px',
              fontSize: 13,
              color: '#CBD5E1',
              lineHeight: 1.5,
              border: '1px solid rgba(226, 182, 238, 0.2)'
            }}>
              <strong>Completion Policy:</strong> The $500 guest fee remains bonded in escrow throughout the recording. Once the host and guest click "Confirm Interview Wrap", payout to the guest's bank account is initiated automatically.
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ── */}
      <section style={{
        padding: '60px 28px',
        textAlign: 'center',
        background: '#13111C'
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 14px' }}>
            Ready to book your next guest?
          </h2>
          <p style={{ fontSize: 15, color: '#CBD5E1', margin: '0 0 28px' }}>
            Search over 100+ verified thinkers and invite them to your show today.
          </p>
          <Link
            to="/find-guests"
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
            <span>Explore Guest Directory</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
