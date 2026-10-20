import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  FileText, 
  Mic, 
  Repeat, 
  Radio, 
  Headphones, 
  CheckCircle2 
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import loginVideo from '../media/login.mp4';

export default function Pricing() {
  // CastReach Design Tokens (#482F4C Theme)
  const BTN_PLUM = '#482F4C';
  const BTN_PLUM_HOVER = '#613F66';
  const ACCENT_LAVENDER = '#E2B6EE';
  const ACCENT_LAVENDER_BORDER = 'rgba(226, 182, 238, 0.45)';
  const BORDER_LIGHT = 'rgba(226, 182, 238, 0.16)';
  const TEXT_PRI = '#FFFFFF';
  const TEXT_SEC = '#CBD5E1';
  const CARD_DARK = 'linear-gradient(180deg, #241D33 0%, #1A1526 100%)';

  // 4 Steps from Booking to Pay
  const STEPS = [
    {
      num: '01',
      icon: FileText,
      title: 'Host Requests & Agrees on Fee',
      description: 'Verified interview terms and session format (Virtual Google Meet or In-Person Studio), and enters the agreed session fee ($100 – $5,000+).',
    },
    {
      num: '02',
      icon: ShieldCheck,
      title: 'Payment Held in CastReach Escrow',
      description: 'Once the guest accepts the request, the host authorizes payment. Funds are locked securely in CastReach Escrow — never paid directly until the recording is finished.',
    },
    {
      num: '03',
      icon: Mic,
      title: 'Interview Completed & Verified',
      description: 'The recording room completes, the multi-track recording or physical meeting is logged, and both parties mark the session completed.',
    },
    {
      num: '04',
      icon: Repeat,
      title: 'Automatic Payout to Guest',
      description: 'CastReach releases 100% of the guest fee directly to the guest’s bank account or Stripe Connect wallet with zero hidden deductions.',
    },
  ];

  // 3 Built-in Guarantees
  const GUARANTEES = [
    {
      icon: Lock,
      titlePre: 'Host Protection:',
      titleMain: 'No-Show Refunds',
      desc: 'If a guest cancels or fails to attend the agreed session, the escrow hold is immediately reversed back to the host in full.',
    },
    {
      icon: ShieldCheck,
      titlePre: 'Guest Guarantee:',
      titleMain: 'Guaranteed Compensation',
      desc: 'Guests never have to chase invoices or wonder if a podcast host will pay. Funds are pre-funded before stepping into the studio.',
    },
    {
      icon: Radio,
      titlePre: '',
      titleMain: 'Automated Dispute Mediation',
      desc: 'Audio logs and studio timestamps are tracked to prevent disputes and provide clean automated resolution.',
    },
  ];

  return (
    <div style={{
      backgroundColor: '#13111C',
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(85, 40, 95, 0.22) 0%, rgba(19, 17, 28, 0) 65%)',
      minHeight: '100vh',
      color: TEXT_PRI,
      fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Navbar />

      <main style={{ flex: 1, paddingBottom: 110 }}>

        {/* ── 1. HERO SECTION WITH STUDIO BACKGROUND & HEADLINE ── */}
        <section style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '68px 32px 56px',
          borderBottom: '1px solid rgba(226, 182, 238, 0.14)',
          background: '#13111C',
        }}>
          {/* Ambient Video Background of Studio */}
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.38,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            <source src={loginVideo} type="video/mp4" />
          </video>

          {/* Ambient Plum / Violet Glow Gradient Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(19, 17, 28, 0.94) 0%, rgba(35, 22, 44, 0.8) 50%, rgba(19, 17, 28, 0.96) 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />

          {/* Studio Condenser Mic Specular Glow Orb */}
          <div style={{
            position: 'absolute',
            top: '20%',
            right: '10%',
            width: 440,
            height: 440,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(130, 60, 145, 0.35) 0%, rgba(72, 47, 76, 0.1) 60%, transparent 75%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />

          <div style={{
            maxWidth: 1360,
            margin: '0 auto',
            position: 'relative',
            zIndex: 2,
          }}>
            <div style={{ maxWidth: 760 }}>
              {/* Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(72, 47, 76, 0.55)',
                border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
                padding: '7px 18px',
                borderRadius: 30,
                fontSize: 11.5,
                fontWeight: 800,
                color: ACCENT_LAVENDER,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: '0 4px 16px rgba(72, 47, 76, 0.35)',
                marginBottom: 20,
              }}>
                <ShieldCheck size={14} />
                <span>PODCAST ESCROW SETTLEMENT MODEL</span>
              </div>

              {/* Main Headline */}
              <h1 style={{
                fontSize: 'clamp(36px, 4.8vw, 60px)',
                fontWeight: 850,
                letterSpacing: '-0.035em',
                lineHeight: 1.1,
                margin: '0 0 18px',
                color: '#FFFFFF',
              }}>
                How Host &{' '}
                <span style={{
                  background: 'linear-gradient(90deg, #A78BFA 0%, #DDAFE8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  Guest
                </span>{' '}
                <br />
                <span style={{
                  background: 'linear-gradient(90deg, #818CF8 0%, #C084FC 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  Payments
                </span>{' '}
                Work
              </h1>

              {/* Subtitle */}
              <p style={{
                fontSize: 16.5,
                color: TEXT_SEC,
                lineHeight: 1.6,
                margin: 0,
                maxWidth: 680,
              }}>
                We replaced subscriptions with a transparent, milestone-protected <strong>escrow payment</strong> plan. Hosts deposit interview fees upon acceptance; CastReach holds the funds and releases them to the guest once the recording is successfully complete.
              </p>
            </div>
          </div>
        </section>

        {/* ── MAIN CONTENT CONTAINER ── */}
        <div style={{
          maxWidth: 1360,
          margin: '0 auto',
          padding: '48px 32px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 64,
        }}>

          {/* ── SECTION 1: FROM BOOKING TO PAY — IN 4 STEPS ── */}
          <section>
            {/* Header row */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 26,
              flexWrap: 'wrap',
              gap: 16,
            }}>
              <div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: ACCENT_LAVENDER,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  SIMPLE & SECURE PROCESS
                </span>
                <h2 style={{
                  fontSize: 28,
                  fontWeight: 850,
                  margin: '4px 0 0',
                  color: '#FFFFFF',
                  letterSpacing: '-0.025em',
                }}>
                  From Booking to Pay &mdash; In 4 Steps
                </h2>
              </div>

              {/* Right: Protected by Escrow pill badge card */}
              <div style={{
                background: 'rgba(34, 27, 46, 0.85)',
                border: '1px solid rgba(226, 182, 238, 0.22)',
                borderRadius: 14,
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
              }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(72, 47, 76, 0.65)',
                  border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ACCENT_LAVENDER,
                  flexShrink: 0,
                }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 750, color: '#FFFFFF' }}>
                    Protected by Escrow
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
                    Your funds are safe until the recording is complete.
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Connected Step Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 18,
              position: 'relative',
            }}
            className="four-steps-grid"
            >
              {STEPS.map((step, idx) => {
                const IconComponent = step.icon;
                const isNotLast = idx < STEPS.length - 1;

                return (
                  <div
                    key={step.num}
                    className="smooth-card"
                    style={{
                      position: 'relative',
                      background: CARD_DARK,
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 18,
                      padding: 24,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45)',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = 'rgba(226, 182, 238, 0.45)';
                      e.currentTarget.style.boxShadow = '0 12px 28px rgba(72, 47, 76, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.45)';
                    }}
                  >
                    {/* Top Row: 01 and Icon Capsule */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 18,
                    }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: 13,
                        fontWeight: 800,
                        color: '#CBD5E1',
                      }}>
                        {step.num}
                      </div>

                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'rgba(72, 47, 76, 0.6)',
                        border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: ACCENT_LAVENDER,
                      }}>
                        <IconComponent size={16} />
                      </div>
                    </div>

                    {/* Step Title */}
                    <h3 style={{
                      fontSize: 16.5,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      margin: '0 0 10px',
                      lineHeight: 1.3,
                      letterSpacing: '-0.015em',
                    }}>
                      {step.title}
                    </h3>

                    {/* Step Description */}
                    <p style={{
                      fontSize: 13,
                      color: TEXT_SEC,
                      lineHeight: 1.55,
                      margin: 0,
                    }}>
                      {step.description}
                    </p>

                    {/* Arrow connector to next step (desktop) */}
                    {isNotLast && (
                      <div
                        style={{
                          position: 'absolute',
                          right: -13,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 3,
                          color: ACCENT_LAVENDER,
                          fontSize: 16,
                          fontWeight: 700,
                          pointerEvents: 'none',
                        }}
                        className="step-arrow-connector"
                      >
                        &rarr;
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── SECTION 2: FAIR CREATOR ECONOMY (BANNER CONTAINER) ── */}
          <section style={{
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(34, 26, 48, 0.95) 0%, rgba(24, 18, 34, 0.98) 100%)',
            border: '1px solid rgba(226, 182, 238, 0.3)',
            borderRadius: 22,
            padding: '44px 48px',
            display: 'grid',
            gridTemplateColumns: 'minmax(380px, 1.25fr) minmax(320px, 0.95fr)',
            gap: 40,
            alignItems: 'center',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 24px rgba(72, 47, 76, 0.35)',
            overflow: 'hidden',
          }}>
            {/* Ambient Background Glow */}
            <div style={{
              position: 'absolute',
              top: '-30%',
              left: '15%',
              width: 480,
              height: 480,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(120, 50, 135, 0.22) 0%, transparent 70%)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }} />

            {/* Left Content */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                display: 'inline-block',
                background: 'rgba(72, 47, 76, 0.55)',
                border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 10.5,
                fontWeight: 800,
                color: ACCENT_LAVENDER,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}>
                FAIR CREATOR ECONOMY
              </div>

              <h2 style={{
                fontSize: 'clamp(24px, 3vw, 32px)',
                fontWeight: 850,
                color: '#FFFFFF',
                margin: '0 0 14px',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}>
                Simple 0% Guest Fee &bull; <br />
                5% Escrow Protection
              </h2>

              <p style={{
                fontSize: 14.5,
                color: TEXT_SEC,
                lineHeight: 1.6,
                margin: '0 0 24px',
                maxWidth: 540,
              }}>
                Guests receive 100% of their set booking honorarium. To cover multi-track cloud recording, verified identity, and escrow chargeback insurance, CastReach charges a nominal 5% fee on completed payouts.
              </p>

              <Link
                to="/discover"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: BTN_PLUM,
                  border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
                  color: '#FFFFFF',
                  borderRadius: 30,
                  padding: '13px 26px',
                  fontSize: 14,
                  fontWeight: 750,
                  textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(72, 47, 76, 0.55)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = BTN_PLUM_HOVER;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = BTN_PLUM;
                }}
              >
                <span>Find & Request Guests</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Right: Example Calculation Card */}
            <div style={{
              position: 'relative',
              zIndex: 2,
              background: '#1F1A2D',
              border: '1px solid rgba(226, 182, 238, 0.25)',
              borderRadius: 16,
              padding: '28px 26px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 800,
                color: ACCENT_LAVENDER,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                EXAMPLE CALCULATION
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: 14,
              }}>
                <span style={{ color: TEXT_SEC }}>Agreed Guest Interview Fee:</span>
                <span style={{ fontWeight: 750, color: '#FFFFFF' }}>$500.00</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: 14,
              }}>
                <span style={{ color: TEXT_SEC }}>Held in Escrow on Request:</span>
                <span style={{ fontWeight: 750, color: '#FFFFFF' }}>$500.00</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '16px 0 0',
                fontSize: 15,
                fontWeight: 800,
              }}>
                <span style={{ color: '#FFFFFF' }}>Guest Payout upon Completion:</span>
                <span style={{
                  color: ACCENT_LAVENDER,
                  fontSize: 16,
                  fontWeight: 850,
                }}>
                  $500.00 (100%)
                </span>
              </div>
            </div>
          </section>

          {/* ── SECTION 3: BUILT-IN HOST & GUEST GUARANTEES ── */}
          <section>
            <div style={{ marginBottom: 24 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                color: ACCENT_LAVENDER,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                WHY CASTREACH
              </span>
              <h2 style={{
                fontSize: 28,
                fontWeight: 850,
                margin: '4px 0 0',
                color: '#FFFFFF',
                letterSpacing: '-0.025em',
              }}>
                Built-In Host & Guest Guarantees
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 22,
            }}>
              {GUARANTEES.map((g, idx) => {
                const IconComponent = g.icon;
                return (
                  <div
                    key={idx}
                    className="smooth-card"
                    style={{
                      background: CARD_DARK,
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 18,
                      padding: 26,
                      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.4)',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = 'rgba(226, 182, 238, 0.4)';
                      e.currentTarget.style.boxShadow = '0 12px 28px rgba(72, 47, 76, 0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                      e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.4)';
                    }}
                  >
                    {/* Icon in Rounded Purple Square */}
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'rgba(72, 47, 76, 0.65)',
                      border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: ACCENT_LAVENDER,
                      marginBottom: 18,
                    }}>
                      <IconComponent size={22} />
                    </div>

                    {/* Title */}
                    <h3 style={{
                      fontSize: 16.5,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      margin: '0 0 10px',
                      lineHeight: 1.35,
                    }}>
                      {g.titlePre && (
                        <span style={{ color: ACCENT_LAVENDER, display: 'block', fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>
                          {g.titlePre}
                        </span>
                      )}
                      <span>{g.titleMain}</span>
                    </h3>

                    {/* Description */}
                    <p style={{
                      fontSize: 13.5,
                      color: TEXT_SEC,
                      lineHeight: 1.6,
                      margin: 0,
                    }}>
                      {g.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
