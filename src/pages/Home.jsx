import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Sparkles, 
  Mic, 
  Users, 
  Radio, 
  Volume2, 
  Calendar, 
  ShieldCheck, 
  Star, 
  ArrowRight,
  Headphones,
  CheckCircle2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export default function Home() {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  // Top & Latest Podcasts matching Image 1
  const topPodcasts = [
    {
      id: 'track-9',
      title: 'Product Designer',
      episodes: '10 Episode',
      duration: '100 minutes',
      category: 'Design & UX',
      host: 'Sarah Lin',
      image: 'https://images.unsplash.com/photo-1581291518655-9523c9320e6b?auto=format&fit=crop&w=600&q=80',
      description: 'Human-centered design, UI system architectures, and design career growth.',
    },
    {
      id: 'track-10',
      title: 'Digital Marketing',
      episodes: '40 Episode',
      duration: '160 minutes',
      category: 'Growth & Business',
      host: 'Marcus Vance',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
      description: 'B2B SaaS growth tactics, demand generation, and organic inbound playbooks.',
    },
    {
      id: 'track-2',
      title: 'The AI Frontier',
      episodes: '24 Episode',
      duration: '180 minutes',
      category: 'Artificial Intelligence',
      host: 'Dr. Elena Rostova',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      description: 'Conversations with top neural engineers, LLM researchers, and quantum physicists.',
    },
    {
      id: 'track-4',
      title: 'Startup Scaling Playbook',
      episodes: '18 Episode',
      duration: '140 minutes',
      category: 'Venture & Startups',
      host: 'Sophia Chen',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
      description: 'Zero to one milestones, venture funding secrets, and executive hiring lessons.',
    },
  ];

  const handlePlayPodcast = (pod) => {
    playTrack({
      id: pod.id,
      title: pod.title,
      host: pod.host,
      category: pod.category,
      cover: pod.image,
      duration: 3600,
      currentTime: 120,
    });
  };

  return (
    <div style={{ background: '#fdfdfd', minHeight: '100vh', color: '#111827', fontFamily: 'var(--font-body)' }}>
      <Navbar />

      {/* ── SECTION 1: HERO (EXACTLY MATCHING IMAGE 1) ────────────────────── */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 24px 60px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 28,
          alignItems: 'stretch',
        }}>
          {/* LEFT HERO CARD: Soft Cyan / Sky Blue */}
          <div style={{
            background: '#dcf2fd',
            borderRadius: 28,
            padding: '56px 48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(186, 230, 253, 0.45)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.85)',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              color: '#0284c7',
              marginBottom: 28,
              width: 'fit-content',
              letterSpacing: '0.04em',
            }}>
              <Radio size={14} /> LIVE PODCAST MARKETPLACE & STUDIO
            </div>

            <h1 style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#0f172a',
              marginBottom: 20,
            }}>
              Find and listen <br />
              your favorite <br />
              podcast!
            </h1>

            <p style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: '#475569',
              maxWidth: 420,
              marginBottom: 36,
            }}>
              The best podcast websites communicate a feel and make it easy for visitors to discover your podcast.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Link
                to="/discover"
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '14px 28px',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: 15,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.25)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                Start Listening
              </Link>

              <button
                type="button"
                onClick={() => setShowHowItWorksModal(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                  padding: '10px 16px',
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#0f172a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
                  transition: 'transform 0.2s',
                }}>
                  <Play size={18} fill="#ffffff" style={{ marginLeft: 2 }} />
                </div>
                <span>How it's work</span>
              </button>
            </div>
          </div>

          {/* RIGHT HERO CARD: Vibrant Sunny Warm Yellow Card */}
          <div style={{
            background: '#ffc83b',
            borderRadius: 28,
            overflow: 'hidden',
            position: 'relative',
            minHeight: 460,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            boxShadow: '0 12px 36px rgba(255, 200, 59, 0.4)',
          }}>
            {/* Creator Photo with Headphones & Mug matching Image 1 */}
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85"
              alt="Podcast Host Listener"
              style={{
                width: '100%',
                height: '100%',
                maxHeight: 520,
                objectFit: 'cover',
                objectPosition: 'center top',
              }}
            />

            {/* Floating Live Indicator Badge */}
            <div style={{
              position: 'absolute',
              bottom: 24,
              left: 24,
              right: 24,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(12px)',
              borderRadius: 18,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Headphones size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Studio Quality Audio</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>48kHz uncompressed local tracks</div>
                </div>
              </div>

              <div style={{
                background: '#10b981',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                LIVE
              </div>
            </div>
          </div>
        </div>

        {/* ── TOP & LATEST PODCAST SECTION (MATCHING IMAGE 1) ──────────────── */}
        <div style={{ marginTop: 64 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 28,
          }}>
            <div>
              <h2 style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#0f172a',
              }}>
                Top & Latest Podcast
              </h2>
              <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                Curated episodes and professional interview sessions ready to stream
              </p>
            </div>

            <Link
              to="/discover"
              style={{
                background: '#0f172a',
                color: '#ffffff',
                padding: '9px 20px',
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                transition: 'background 0.2s',
              }}
            >
              View More
            </Link>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 22,
          }}>
            {topPodcasts.map((pod) => {
              const isThisPlaying = isPlaying && currentTrack?.id === pod.id;
              return (
                <div
                  key={pod.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 20,
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.04)';
                  }}
                >
                  <div style={{ height: 160, position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={pod.image}
                      alt={pod.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background: 'rgba(15, 23, 42, 0.8)',
                      backdropFilter: 'blur(8px)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 12,
                    }}>
                      {pod.category}
                    </div>
                  </div>

                  <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                      {pod.title}
                    </h3>

                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 16 }}>
                      {pod.episodes} • {pod.duration}
                    </div>

                    <p style={{
                      fontSize: 13,
                      color: '#475569',
                      lineHeight: 1.5,
                      marginBottom: 20,
                      flex: 1,
                    }}>
                      {pod.description}
                    </p>

                    <button
                      type="button"
                      onClick={() => handlePlayPodcast(pod)}
                      style={{
                        background: isThisPlaying ? '#2563eb' : '#f1f5f9',
                        color: isThisPlaying ? '#ffffff' : '#0f172a',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: 9999,
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        width: 'fit-content',
                        transition: 'all 0.2s',
                      }}
                    >
                      {isThisPlaying ? (
                        <>
                          <Pause size={14} fill="#ffffff" />
                          <span>Playing Now</span>
                        </>
                      ) : (
                        <>
                          <Play size={14} fill="#0f172a" />
                          <span>Listen Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: DUAL MARKETPLACE & STUDIO SHOWCASE ─────────────────── */}
      <section style={{
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 56px' }}>
            <span style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#2563eb',
            }}>
              Complete Ecosystem
            </span>
            <h2 style={{
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#0f172a',
              marginTop: 8,
              marginBottom: 14,
            }}>
              Built for Podcast Hosts, Guests & Avid Listeners
            </h2>
            <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.6 }}>
              Whether you want to discover trending audio or find expert guests for your next blockbuster show, CastReach handles matching, recording, payments, and publishing.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 28,
          }}>
            {/* Pillar 1 */}
            <div style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: 36,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Users size={26} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                Host & Guest Matchmaking
              </h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
                Find verified domain experts and top podcasters. Filter by topics, language, follower reach, and instant availability.
              </p>
              <Link
                to="/discover"
                style={{
                  color: '#2563eb',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Browse Podcasters & Guests <ArrowRight size={16} />
              </Link>
            </div>

            {/* Pillar 2 */}
            <div style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: 36,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Mic size={26} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                Studio Recording Room
              </h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
                Broadcast-grade WebRTC recording studio with separate participant tracks, real-time live captions, and automatic audio cloud backups.
              </p>
              <Link
                to="/register"
                style={{
                  color: '#d97706',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Try Recording Studio <ArrowRight size={16} />
              </Link>
            </div>

            {/* Pillar 3 */}
            <div style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: 36,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
                <ShieldCheck size={26} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                Escrow Security & Reviews
              </h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
                Session fees are held in secure Stripe escrow until both parties finish recording. Verified reputation badges and authentic reviews.
              </p>
              <Link
                to="/about"
                style={{
                  color: '#059669',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Learn How Escrow Works <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: HOW IT WORKS MODAL ─────────────────────────────────── */}
      {showHowItWorksModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 24,
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 28,
            maxWidth: 580,
            width: '100%',
            padding: 36,
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
            position: 'relative',
          }}>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
              How CastReach Works
            </h3>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
              Step-by-step workflow for podcast creation and audio streaming:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Discover or Match</h4>
                  <p style={{ fontSize: 13, color: '#64748b' }}>Explore podcasts and stream episodes, or search verified hosts and guests by expertise.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Schedule with Escrow</h4>
                  <p style={{ fontSize: 13, color: '#64748b' }}>Pick an open time slot. Booking payments are securely escrowed with zero risk.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Record in the Studio</h4>
                  <p style={{ fontSize: 13, color: '#64748b' }}>Join the high-fidelity recording room with automated live captions and individual multi-track capture.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  4
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Publish & Stream</h4>
                  <p style={{ fontSize: 13, color: '#64748b' }}>Generate AI show notes, export RSS feeds, and stream directly to thousands of listeners.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowItWorksModal(false)}
              style={{
                width: '100%',
                background: '#0f172a',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: 9999,
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Got it, Let's Explore
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
