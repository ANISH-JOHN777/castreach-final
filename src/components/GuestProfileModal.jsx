import React from 'react';
import { 
  X, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  Globe2, 
  Star, 
  Play, 
  Pause, 
  Calendar, 
  ShieldCheck, 
  ArrowRight,
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { PODCAST_CATALOG } from '../podcast';

export default function GuestProfileModal({ guest, isOpen, onClose, onRequestInterview }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();

  if (!isOpen || !guest) return null;

  // Find linked sample episode if available
  const sampleEpisode = PODCAST_CATALOG.find(
    ep => ep.id === guest.sampleEpisodeId || ep.guest?.toLowerCase().includes(guest.name?.toLowerCase())
  );
  const isThisPlaying = isPlaying && currentTrack?.id === sampleEpisode?.id;

  const handlePlaySample = () => {
    if (sampleEpisode) {
      if (currentTrack?.id === sampleEpisode.id) {
        togglePlay();
      } else {
        playTrack(sampleEpisode);
      }
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          backgroundColor: '#171520',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), 0 0 32px rgba(168, 85, 247, 0.1)',
          color: '#FFFFFF',
          fontFamily: 'inherit',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#110F18',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              color: '#22C55E',
            }}>
              <CheckCircle2 size={15} color="#22C55E" />
              Verified Guest
            </span>
            <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
            <span style={{ fontSize: 13, color: '#A39EA9' }}>Direct Booking via Bonded Escrow</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: 6,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A39EA9',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#A39EA9'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div style={{
          padding: '28px 24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}>
          {/* Top Profile Strip */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <img
              src={guest.avatar}
              alt={guest.name}
              style={{
                width: 80,
                height: 80,
                borderRadius: 12,
                objectFit: 'cover',
                border: '2px solid rgba(168, 85, 247, 0.4)',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  {guest.name}
                </h2>
                {guest.verified && (
                  <CheckCircle2 size={18} color="#22C55E" />
                )}
              </div>
              <p style={{ fontSize: 14.5, color: '#A39EA9', fontWeight: 500, margin: '4px 0 10px' }}>
                {guest.title}
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 13, color: '#A39EA9' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={13} color="#A855F7" />
                  {guest.location}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={13} color="#A855F7" />
                  {guest.timeZone}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Globe2 size={13} color="#A855F7" />
                  {guest.languages?.join(', ')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22C55E', fontWeight: 700 }}>
                  <Star size={13} fill="#22C55E" color="#22C55E" />
                  {guest.rating} ({guest.reviewCount} interviews)
                </span>
              </div>
            </div>
          </div>

          {/* Biography */}
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#A855F7', fontWeight: 700, marginBottom: 8 }}>
              Biography & Perspective
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#E2DFE7', margin: 0 }}>
              {guest.bio}
            </p>
          </div>

          {/* Areas of Expertise */}
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#22C55E', fontWeight: 700, marginBottom: 10 }}>
              Areas of Expertise
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {guest.expertise?.map((exp, idx) => (
                <span 
                  key={idx}
                  style={{
                    background: 'rgba(168, 85, 247, 0.12)',
                    border: '1px solid rgba(168, 85, 247, 0.28)',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#E7D6EF',
                  }}
                >
                  {exp}
                </span>
              ))}
            </div>
          </div>

          {/* Suggested Discussion Topics */}
          {guest.suggestedTopics?.length > 0 && (
            <div style={{
              background: '#0D0C12',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '18px 20px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#A855F7', marginBottom: 10 }}>
                Suggested Discussion Topics & Angles
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {guest.suggestedTopics.map((topic, i) => (
                  <li key={i} style={{ fontSize: 13.5, color: '#E2DFE7', lineHeight: 1.5 }}>
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sample Audio Clip / Previous Appearance */}
          {sampleEpisode && (
            <div style={{
              background: '#0D0C12',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  type="button"
                  onClick={handlePlaySample}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#22C55E',
                    color: '#0D0C12',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 0 16px rgba(34, 197, 94, 0.35)',
                  }}
                >
                  {isThisPlaying ? <Pause size={18} fill="#0D0C12" /> : <Play size={18} fill="#0D0C12" style={{ marginLeft: 2 }} />}
                </button>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#A855F7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Sample Audio Appearance
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 650, color: '#FFFFFF', marginTop: 2 }}>
                    {sampleEpisode.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#A39EA9' }}>
                    {sampleEpisode.show} · Host: {sampleEpisode.host}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>
                {Math.round(sampleEpisode.duration / 60)} mins
              </div>
            </div>
          )}

          {/* Pricing, Formats & Scheduling Window */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}>
            {/* Fee Box */}
            <div style={{
              background: '#0D0C12',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '16px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#A39EA9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Agreed Session Fee
              </div>
              <div style={{ fontSize: 22, fontWeight: 750, color: '#22C55E', marginTop: 4 }}>
                {guest.rateDisplay || `$${guest.sessionRate.toLocaleString()} / session`}
              </div>
              <div style={{ fontSize: 12.5, color: '#A39EA9', marginTop: 4, lineHeight: 1.4 }}>
                {guest.rateIncludes}
              </div>
              <div style={{ fontSize: 12, color: '#22C55E', marginTop: 8, fontWeight: 600 }}>
                ✓ Bonded escrow custody until interview wrap
              </div>
            </div>

            {/* Formats & Availability */}
            <div style={{
              background: '#0D0C12',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '16px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#A39EA9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Formats & Availability
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {guest.formats?.map((fmt, i) => (
                  <span key={i} style={{ fontSize: 12, background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '3px 8px', borderRadius: 4, color: '#FFFFFF' }}>
                    {fmt}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: '#A39EA9', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} color="#A855F7" />
                <span>{guest.availability}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#110F18',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 13, color: '#A39EA9' }}>
            No upfront charge. Terms and escrow lock only on mutual agreement.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
              }}
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestInterview(guest);
              }}
              style={{
                background: '#22C55E',
                color: '#0D0C12',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 18px rgba(34, 197, 94, 0.35)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#34D399';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(34, 197, 94, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#22C55E';
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(34, 197, 94, 0.35)';
              }}
            >
              <span>Send Invite</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
