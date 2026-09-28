import React, { useState, useEffect } from 'react';
import { Play, Search, RefreshCw, AlertCircle, CheckCircle2, Clock, FileText, Sparkles } from 'lucide-react';

export default function TranscriptViewer({
  bookingId,
  episodeId,
  podcastId,
  currentTime = 0,
  onSeek,
  token,
}) {
  const [transcription, setTranscription] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const status = transcription?.status || 'NOT_REQUESTED';

  // Fetch status & transcript content
  const fetchStatusAndContent = async () => {
    try {
      setError('');
      let statusUrl = bookingId
        ? `/api/transcriptions/booking/${bookingId}`
        : `/api/podcasts/${podcastId}/episodes/${episodeId}`;

      const res = await fetch(statusUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();
      const tx = bookingId ? data.transcription : data.episode?.transcription;
      setTranscription(tx || { status: 'NOT_REQUESTED' });

      if (tx?.status === 'READY') {
        let contentUrl = bookingId
          ? `/api/transcriptions/booking/${bookingId}/content`
          : `/api/podcasts/${data.podcast?.slug || podcastId}/episodes/${data.episode?.slug || episodeId}/transcript`;

        const contentRes = await fetch(contentUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (contentRes.ok) {
          const contentData = await contentRes.json();
          setTranscript(contentData.transcript);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndContent();
  }, [bookingId, episodeId, podcastId, token]);

  // Controlled polling when QUEUED or PROCESSING
  useEffect(() => {
    if (status !== 'QUEUED' && status !== 'PROCESSING') return;

    const interval = setInterval(() => {
      fetchStatusAndContent();
    }, 3000);

    return () => clearInterval(interval);
  }, [status, bookingId, episodeId, podcastId]);

  // Handle request transcription
  const handleRequestTranscription = async () => {
    try {
      setRequesting(true);
      setError('');

      let endpoint = bookingId
        ? `/api/transcriptions/booking/${bookingId}`
        : `/api/podcasts/${podcastId}/episodes/${episodeId}/transcription`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ language: 'en' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request transcription');
      }

      setTranscription(data.transcription || { status: 'QUEUED' });
      fetchStatusAndContent();
    } catch (err) {
      setError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  // Handle retry
  const handleRetry = async () => {
    if (!bookingId) return;
    try {
      setRequesting(true);
      setError('');
      const res = await fetch(`/api/transcriptions/booking/${bookingId}/retry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to retry transcription');
      }

      setTranscription(data.transcription || { status: 'QUEUED' });
      fetchStatusAndContent();
    } catch (err) {
      setError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  const formatTime = (secs) => {
    if (!secs && secs !== 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const segments = transcript?.segments || [];
  const filteredSegments = searchQuery.trim()
    ? segments.filter((s) => s.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : segments;

  if (loading) {
    return (
      <div style={containerCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30, color: 'var(--text-muted)' }}>
          <RefreshCw size={20} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--plum-primary)' }} />
          <span style={{ fontSize: 14 }}>Loading transcript status...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={containerCardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--lavender-mist)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={20} color="var(--plum-deep)" />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--plum-deep)' }}>Episode Transcript</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Search, inspect timestamps, and jump to specific audio moments.
            </p>
          </div>
        </div>

        {status === 'READY' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 12, background: 'var(--color-success-bg)', color: 'var(--color-success)', fontWeight: 600 }}>
              <CheckCircle2 size={14} /> READY
            </span>
            <span>•</span>
            <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{transcription?.language || 'EN'}</span>
            <span>•</span>
            <span>{segments.length} segments</span>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', borderRadius: 10, color: 'var(--color-error)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* STATE 1: NOT_REQUESTED */}
      {status === 'NOT_REQUESTED' && (
        <div style={emptyBoxStyle}>
          <FileText size={42} color="var(--plum-primary)" style={{ marginBottom: 10, opacity: 0.8 }} />
          <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--plum-deep)', margin: '0 0 6px' }}>No Transcript Generated Yet</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 18px', lineHeight: 1.5 }}>
            Generate an automated timestamped transcript for this podcast recording.
          </p>
          <button
            onClick={handleRequestTranscription}
            disabled={requesting}
            style={primaryBtnStyle}
          >
            {requesting ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={15} />}
            {requesting ? 'Queuing Transcript...' : 'Generate Transcript'}
          </button>
        </div>
      )}

      {/* STATE 2: QUEUED */}
      {status === 'QUEUED' && (
        <div style={{ ...emptyBoxStyle, background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)' }}>
          <Clock size={40} color="var(--color-warning)" style={{ marginBottom: 10, animation: 'floatSlow 2s infinite' }} />
          <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-warning)', margin: '0 0 6px' }}>Transcript Queued</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: 0 }}>
            Your recording transcript has been queued for background processing. This page will update automatically.
          </p>
        </div>
      )}

      {/* STATE 3: PROCESSING */}
      {status === 'PROCESSING' && (
        <div style={{ ...emptyBoxStyle, background: 'var(--lavender-mist)', border: '1px solid var(--border-subtle)' }}>
          <RefreshCw size={40} color="var(--plum-deep)" style={{ marginBottom: 10, animation: 'spin 1.5s linear infinite' }} />
          <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--plum-deep)', margin: '0 0 6px' }}>Generating Transcript...</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: 0 }}>
            Extracting audio stream and generating timestamped dialogue segments...
          </p>
        </div>
      )}

      {/* STATE 4: FAILED */}
      {status === 'FAILED' && (
        <div style={{ ...emptyBoxStyle, background: 'var(--color-error-bg)', border: '1px solid var(--color-error)' }}>
          <AlertCircle size={40} color="var(--color-error)" style={{ marginBottom: 10 }} />
          <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-error)', margin: '0 0 6px' }}>Transcription Failed</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 16px' }}>
            {transcription?.error || 'An unexpected error occurred during transcription processing.'}
          </p>
          <button
            onClick={handleRetry}
            disabled={requesting}
            style={{ ...primaryBtnStyle, background: 'var(--color-error)' }}
          >
            <RefreshCw size={15} style={{ animation: requesting ? 'spin 1s linear infinite' : 'none' }} />
            {requesting ? 'Retrying...' : 'Retry Transcription'}
          </button>
        </div>
      )}

      {/* STATE 5: READY */}
      {status === 'READY' && (
        <div>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 12 }} />
            <input
              type="text"
              placeholder="Search transcript text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
            {filteredSegments.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No matching transcript segments found.</p>
            ) : (
              filteredSegments.map((seg, idx) => {
                const isActive = currentTime >= seg.start && currentTime <= seg.end;
                return (
                  <div
                    key={idx}
                    onClick={() => onSeek && onSeek(seg.start)}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: isActive ? '1px solid var(--plum-deep)' : '1px solid var(--border-subtle)',
                      background: isActive ? 'var(--lavender-mist)' : 'var(--white-pure)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      transition: 'all 0.2s',
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        background: 'var(--lavender-mist)',
                        border: '1px solid var(--border-accent)',
                        color: 'var(--plum-deep)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                        shrink: 0,
                      }}
                    >
                      <Play size={11} /> {formatTime(seg.start)}
                    </button>

                    <div style={{ flex: 1 }}>
                      {seg.speaker && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--plum-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 2 }}>
                          {seg.speaker}:
                        </span>
                      )}
                      <p style={{ fontSize: 13, color: 'var(--text-dark)', margin: 0, lineHeight: 1.5 }}>{seg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const containerCardStyle = {
  background: '#ffffff',
  border: '1px solid var(--border-subtle)',
  borderRadius: 16,
  padding: 24,
  boxShadow: 'var(--shadow-md)',
  marginBottom: 24,
};

const emptyBoxStyle = {
  textAlign: 'center',
  padding: '36px 20px',
  background: 'var(--color-background-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
};

const primaryBtnStyle = {
  background: 'var(--plum-deep)',
  color: '#ffffff',
  border: 'none',
  borderRadius: 10,
  padding: '10px 20px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: 'var(--shadow-sm)',
  transition: 'all 0.2s',
};

const searchInputStyle = {
  width: '100%',
  padding: '10px 14px 10px 40px',
  borderRadius: 10,
  border: '1px solid var(--border-subtle)',
  background: 'var(--color-background-primary)',
  fontSize: 13,
  color: 'var(--text-dark)',
  outline: 'none',
};
