import React, { useState, useEffect } from 'react';
import { Play, Search, RefreshCw, AlertCircle, CheckCircle2, Clock, FileText } from 'lucide-react';

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
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
        <p className="text-sm">Loading transcript state...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Episode Transcript
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Search, inspect timestamps, and jump to specific audio moments.
          </p>
        </div>

        {status === 'READY' && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              READY
            </span>
            <span>•</span>
            <span className="uppercase">{transcription?.language || 'EN'}</span>
            <span>•</span>
            <span>{segments.length} segments</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* STATE 1: NOT_REQUESTED */}
      {status === 'NOT_REQUESTED' && (
        <div className="text-center py-8 px-4 bg-slate-950/50 border border-slate-800/80 rounded-lg">
          <FileText className="w-10 h-10 text-indigo-400/80 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-200">No Transcript Generated Yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Generate an automated timestamped transcript for this podcast recording.
          </p>
          <button
            onClick={handleRequestTranscription}
            disabled={requesting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
          >
            {requesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            Generate Transcript
          </button>
        </div>
      )}

      {/* STATE 2: QUEUED */}
      {status === 'QUEUED' && (
        <div className="text-center py-8 px-4 bg-slate-950/50 border border-amber-500/20 rounded-lg">
          <Clock className="w-10 h-10 text-amber-400 animate-pulse mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-amber-200">Transcript Queued</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Your recording transcript has been queued for background worker processing.
          </p>
        </div>
      )}

      {/* STATE 3: PROCESSING */}
      {status === 'PROCESSING' && (
        <div className="text-center py-8 px-4 bg-slate-950/50 border border-indigo-500/20 rounded-lg">
          <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-indigo-200">Generating Transcript...</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Extracting audio and processing timestamped segments...
          </p>
        </div>
      )}

      {/* STATE 4: FAILED */}
      {status === 'FAILED' && (
        <div className="text-center py-8 px-4 bg-slate-950/50 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-red-200">Transcription Failed</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            {transcription?.error || 'An unexpected error occurred during transcription processing.'}
          </p>
          <button
            onClick={handleRetry}
            disabled={requesting}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
          >
            {requesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Retry Transcription
          </button>
        </div>
      )}

      {/* STATE 5: READY */}
      {status === 'READY' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search in transcript text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
            {filteredSegments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No matching transcript segments found.</p>
            ) : (
              filteredSegments.map((seg, idx) => {
                const isActive = currentTime >= seg.start && currentTime <= seg.end;
                return (
                  <div
                    key={idx}
                    onClick={() => onSeek && onSeek(seg.start)}
                    className={`p-3 rounded-lg border text-xs transition-all cursor-pointer flex items-start gap-3 ${
                      isActive
                        ? 'bg-indigo-950/60 border-indigo-500/60 text-indigo-100 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      className="mt-0.5 text-indigo-400 hover:text-indigo-300 font-mono text-[11px] flex items-center gap-1 shrink-0"
                    >
                      <Play className="w-3 h-3" />
                      {formatTime(seg.start)}
                    </button>

                    <div className="space-y-0.5 flex-1">
                      {seg.speaker && (
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          {seg.speaker}:
                        </span>
                      )}
                      <p className="leading-relaxed">{seg.text}</p>
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
