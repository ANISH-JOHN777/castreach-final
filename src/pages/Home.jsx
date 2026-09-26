import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Bot, 
  Rocket, 
  Briefcase, 
  TrendingUp, 
  Gem, 
  Dna, 
  Palette, 
  Mic, 
  Star, 
  ArrowRight 
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Home() {
  const navigate = useNavigate();

  const categories = [
    { title: 'Technology & AI', count: '4.2k Hosts', Icon: Bot },
    { title: 'Startups & Venture', count: '3.8k Hosts', Icon: Rocket },
    { title: 'Business & Leadership', count: '5.1k Hosts', Icon: Briefcase },
    { title: 'Growth & Marketing', count: '2.9k Hosts', Icon: TrendingUp },
    { title: 'Finance & Crypto', count: '2.4k Hosts', Icon: Gem },
    { title: 'Health & Science', count: '1.9k Hosts', Icon: Dna },
    { title: 'Design & Product', count: '2.1k Hosts', Icon: Palette },
    { title: 'Creator Economy', count: '3.5k Hosts', Icon: Mic },
  ];

  const featuredCreators = [
    {
      id: 'demo-1',
      name: 'Dr. Elena Rostova',
      podcast: 'AI Frontiers & Ethics',
      category: 'Technology',
      rating: 4.95,
      reviews: 48,
      price: '$150',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      expertise: ['Artificial Intelligence', 'Neural Nets', 'Ethics'],
    },
    {
      id: 'demo-2',
      name: 'Marcus Vance',
      podcast: 'The B2B Growth Engine',
      category: 'Marketing',
      rating: 4.92,
      reviews: 62,
      price: '$200',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
      expertise: ['SaaS Growth', 'GTM Strategy', 'Demand Gen'],
    },
    {
      id: 'demo-3',
      name: 'Sophia Chen',
      podcast: 'Founder Uncut Podcast',
      category: 'Startups',
      rating: 5.0,
      reviews: 35,
      price: '$175',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
      expertise: ['Venture Capital', 'Scaling 0 to 1', 'Product Strategy'],
    },
  ];

  return (
    <div style={{ background: 'var(--cream-warm)', minHeight: '100vh' }}>
      <Navbar />

      {/* SECTION 1: HERO */}
      <section style={{
        position: 'relative',
        padding: '90px 24px 80px',
        maxWidth: 1280,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 60,
        alignItems: 'center',
      }}>
        <div className="fade-in">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 30,
            background: 'var(--lavender-mist)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--plum-primary)',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 24,
          }}>
            <Sparkles size={14} color="var(--purple-castreach)" />
            <span>THE FUTURE OF PODCAST COLLABORATION</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            lineHeight: 1.1,
            color: 'var(--plum-deep)',
            marginBottom: 24,
            fontWeight: 800,
          }}>
            Connect. Record. <span className="gradient-text">Grow Together.</span>
          </h1>

          <p style={{
            fontSize: 18,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: 36,
            maxWidth: 540,
          }}>
            Find remarkable podcast guests, authorize secure escrow holds, record studio-quality audio in WebRTC rooms, and prepare with built-in AI assistance.
          </p>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/discover')}
              style={{
                background: 'linear-gradient(135deg, var(--plum-deep), var(--plum-primary))',
                color: '#fff',
                padding: '16px 32px',
                borderRadius: 'var(--radius-md)',
                fontSize: 16,
                fontWeight: 700,
                boxShadow: 'var(--shadow-plum)',
              }}
            >
              Explore Guests & Hosts
            </button>
            <button
              onClick={() => navigate('/register?role=host')}
              style={{
                background: '#fff',
                color: 'var(--plum-deep)',
                border: '2px solid var(--border-subtle)',
                padding: '14px 28px',
                borderRadius: 'var(--radius-md)',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              Become a Host
            </button>
          </div>
        </div>

        {/* Hero Studio Card Visual */}
        <div style={{ position: 'relative' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--plum-deep) 0%, var(--plum-primary) 100%)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            color: '#fff',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.05em' }}>LIVE STUDIO SESSION</span>
              </div>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>HD 1080p WebRTC</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', margin: '0 auto 10px', overflow: 'hidden' }}>
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" alt="Host" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Sarah Miller (Host)</div>
                <div style={{ fontSize: 11, color: 'var(--lavender-soft)' }}>Mic Active • 48kHz</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', margin: '0 auto 10px', overflow: 'hidden' }}>
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" alt="Guest" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>David Kim (Guest)</div>
                <div style={{ fontSize: 11, color: 'var(--lavender-soft)' }}>Mic Active • 48kHz</div>
              </div>
            </div>

            {/* Simulated Audio Waveform */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 8px' }}>
              {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 30, 75, 85, 40, 90, 65, 30, 80].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--lavender-soft)', borderRadius: 2, opacity: 0.8 }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: PLATFORM STATISTICS */}
      <section style={{ background: 'var(--plum-deep)', color: '#fff', padding: '60px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, textAlign: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 800, color: 'var(--lavender-soft)' }}>10K+</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Verified Creators</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 800, color: 'var(--lavender-soft)' }}>50K+</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Recorded Episodes</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 800, color: 'var(--lavender-soft)' }}>120+</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Podcast Categories</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 800, color: 'var(--lavender-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              4.9 <Star size={28} fill="currentColor" color="var(--color-warning)" />
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Average Rating</div>
          </div>
        </div>
      </section>

      {/* SECTION 3: DISCOVER EXCEPTIONAL GUESTS */}
      <section style={{ padding: '90px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 54 }}>
          <h2 style={{ fontSize: 36, marginBottom: 12 }}>Discover Featured Guests</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>Connect with top authors, founders, and industry experts for your next show.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          {featuredCreators.map((creator) => (
            <div key={creator.id} className="card-hover" style={{
              background: '#fff',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                <img src={creator.avatar} alt={creator.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <h3 style={{ fontSize: 18, marginBottom: 2 }}>{creator.name}</h3>
                  <div style={{ fontSize: 13, color: 'var(--plum-primary)', fontWeight: 600 }}>{creator.podcast}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={13} fill="currentColor" color="var(--color-warning)" /> {creator.rating} ({creator.reviews} reviews)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                {creator.expertise.map((tag, idx) => (
                  <span key={idx} style={{ background: 'var(--lavender-mist)', color: 'var(--plum-deep)', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Session Rate</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--plum-deep)' }}>{creator.price}</span>
                </div>
                <button
                  onClick={() => navigate('/discover')}
                  style={{
                    background: 'var(--plum-primary)',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: EXPLORE CATEGORIES */}
      <section style={{ background: 'var(--lavender-mist)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 32, marginBottom: 8 }}>Explore Podcast Categories</h2>
              <p style={{ color: 'var(--text-muted)' }}>Browse creators across high-impact verticals.</p>
            </div>
            <button onClick={() => navigate('/discover')} style={{ background: 'transparent', color: 'var(--plum-primary)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              View All Categories <ArrowRight size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {categories.map((cat, idx) => (
              <div
                key={idx}
                onClick={() => navigate(`/discover?category=${encodeURIComponent(cat.title)}`)}
                className="card-hover"
                style={{
                  background: '#fff',
                  borderRadius: 'var(--radius-md)',
                  padding: 20,
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--lavender-mist)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--plum-primary)' }}>
                  <cat.Icon size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--plum-deep)', fontSize: 15 }}>{cat.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cat.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: HOW IT WORKS */}
      <section style={{ padding: '90px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 36, marginBottom: 12 }}>How CastReach Works</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>Four simple steps from discovery to published podcast.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
          {[
            { step: '01', title: 'Discover', desc: 'Browse verified hosts and guest experts with transparent ratings and session rates.' },
            { step: '02', title: 'Connect', desc: 'Send booking requests, propose slot times, and hold funds safely in Stripe Escrow.' },
            { step: '03', title: 'Record', desc: 'Enter the HD WebRTC studio with built-in AI topic preparation and live waveform audio.' },
            { step: '04', title: 'Grow', desc: 'Verify completion, release payment, publish episodes, and build your audience.' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 32, border: '1px solid var(--border-subtle)', position: 'relative' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800, color: 'var(--lavender-soft)', display: 'block', marginBottom: 12 }}>
                {item.step}
              </span>
              <h3 style={{ fontSize: 20, marginBottom: 10 }}>{item.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 7: ESCROW SECURITY WORKFLOW */}
      <section style={{ background: 'var(--plum-deep)', color: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--lavender-soft)', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            STRIPE CONNECT ESCROW PROTECTION
          </span>
          <h2 style={{ fontSize: 36, color: '#fff', marginTop: 16, marginBottom: 20 }}>
            Guaranteed Payment Escrow Workflow
          </h2>
          <p style={{ color: 'var(--lavender-soft)', fontSize: 16, marginBottom: 48, maxWidth: 640, margin: '0 auto 48px' }}>
            Funds are authorized upon booking confirmation and held securely in escrow until both host and guest verify the completed session.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {[
              { title: '1. Authorized', text: 'Guest authorizes fee' },
              { title: '2. Funds Secured', text: 'Held in Stripe Escrow' },
              { title: '3. Session Live', text: 'Record in Studio' },
              { title: '4. Verified', text: 'Host/Guest confirm' },
              { title: '5. Released', text: 'Automatic payout' },
            ].map((step, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--lavender-soft)', marginBottom: 4 }}>{step.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{step.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 10: FINAL CTA */}
      <section style={{ padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 42, marginBottom: 20 }}>Your Next Great Conversation Starts Here.</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 18, marginBottom: 36 }}>
            Join thousands of podcast creators, industry leaders, and experts on CastReach.
          </p>
          <button
            onClick={() => navigate('/register')}
            style={{
              background: 'linear-gradient(135deg, var(--plum-deep), var(--plum-primary))',
              color: '#fff',
              padding: '18px 40px',
              borderRadius: 'var(--radius-md)',
              fontSize: 18,
              fontWeight: 800,
              boxShadow: 'var(--shadow-plum)',
            }}
          >
            Get Started Free
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
