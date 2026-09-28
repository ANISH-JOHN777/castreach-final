import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SUPPORTED_LANGUAGES, getLanguageLabel } from '../config/supportedLanguages';

/**
 * Phase E4 — Live Caption Overlay Component
 * Floating, non-blocking caption display for Daily.co meeting sessions.
 * Supports live speech-to-text captions, participant-level language selection,
 * real-time translation, speaker identification, and repositionable UI.
 */

export default function LiveCaptionOverlay({
  bookingId,
  user,
  dailyFrame,
  onSessionChange,
}) {
  const [enabled, setEnabled] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [status, setStatus] = useState('DISABLED'); // 'DISABLED' | 'CONNECTING' | 'ACTIVE' | 'PAUSED' | 'FAILED' | 'RECONNECTING'
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('ta');
  
  const [currentSegment, setCurrentSegment] = useState(null);
  const [recentSegments, setRecentSegments] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const activeSegmentTimeoutRef = useRef(null);

  // Initialize or join caption session
  const initSession = useCallback(async (srcLang = sourceLanguage) => {
    if (!bookingId) return;
    setStatus('CONNECTING');
    setErrorMsg(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/live-captions/${bookingId}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sourceLanguage: srcLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start live caption session.');

      setStatus('ACTIVE');
      setEnabled(true);
      if (onSessionChange) onSessionChange(data.session);
    } catch (err) {
      console.error('[LiveCaptionOverlay] Init session error:', err.message);
      setStatus('FAILED');
      setErrorMsg(err.message || 'Live captions unavailable.');
    }
  }, [bookingId, sourceLanguage, onSessionChange]);

  // Handle incoming Daily app-message caption events or custom socket events
  useEffect(() => {
    if (!dailyFrame || !enabled) return;

    const handleAppMessage = async (evt) => {
      if (!evt || !evt.data || evt.data.type !== 'live-caption') return;

      const raw = evt.data.segment;
      if (!raw || !raw.text) return;

      try {
        let segmentData = raw;

        // If translation is enabled, translate finalized segment
        if (translationEnabled && targetLanguage && raw.isFinal) {
          const token = localStorage.getItem('token');
          const tRes = await fetch(`/api/live-captions/${bookingId}/translate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              segmentId: raw.id,
              text: raw.text,
              sourceLanguage: raw.language || sourceLanguage,
              targetLanguage,
            }),
          });
          const tData = await tRes.json();
          if (tRes.ok && tData.translatedText) {
            segmentData = {
              ...raw,
              translatedText: tData.translatedText,
              translatedLanguage: tData.targetLanguage,
            };
          }
        }

        setCurrentSegment(segmentData);

        if (segmentData.isFinal) {
          setRecentSegments((prev) => [...prev.slice(-4), segmentData]);
        }

        // Auto-fade active segment highlight after 5 seconds
        if (activeSegmentTimeoutRef.current) clearTimeout(activeSegmentTimeoutRef.current);
        activeSegmentTimeoutRef.current = setTimeout(() => {
          setCurrentSegment((prev) => (prev?.id === segmentData.id ? null : prev));
        }, 5000);
      } catch (err) {
        console.warn('[LiveCaptionOverlay] App message process error:', err);
      }
    };

    dailyFrame.on('app-message', handleAppMessage);

    return () => {
      if (dailyFrame) dailyFrame.off('app-message', handleAppMessage);
      if (activeSegmentTimeoutRef.current) clearTimeout(activeSegmentTimeoutRef.current);
    };
  }, [dailyFrame, enabled, translationEnabled, targetLanguage, sourceLanguage, bookingId]);

  // Toggle Captions ON / OFF
  const handleToggleEnabled = () => {
    if (!enabled) {
      initSession(sourceLanguage);
    } else {
      setEnabled(false);
      setStatus('DISABLED');
      setCurrentSegment(null);
    }
  };

  // Source language change
  const handleSourceLangChange = (code) => {
    setSourceLanguage(code);
    if (enabled) {
      initSession(code);
    }
  };

  if (!enabled && status === 'DISABLED') {
    return (
      <div className="absolute bottom-16 right-4 z-40">
        <button
          onClick={handleToggleEnabled}
          className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md transition"
        >
          <span className="bg-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">CC</span>
          <span>Turn On Live Captions</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-16 left-4 right-4 z-40 max-w-2xl mx-auto transition-all duration-300">
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
        {/* Controls Bar Header */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleEnabled}
              className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] transition ${
                enabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              CC {enabled ? 'ON' : 'OFF'}
            </button>

            {/* Source Language Select */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-400 text-[10px]">Speech:</span>
              <select
                value={sourceLanguage}
                onChange={(e) => handleSourceLangChange(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-[11px] focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Translation Toggle & Selector */}
            <div className="flex items-center space-x-1.5 border-l border-slate-800 pl-3">
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={translationEnabled}
                  onChange={(e) => setTranslationEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 h-3 w-3"
                />
                <span className="text-[11px] text-slate-300">Translate</span>
              </label>

              {translationEnabled && (
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="bg-slate-950 border border-indigo-700 text-indigo-300 rounded px-2 py-0.5 text-[11px] focus:outline-none"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      → {l.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {status === 'CONNECTING' && (
              <span className="text-amber-400 text-[10px] animate-pulse">Connecting...</span>
            )}
            {status === 'ACTIVE' && (
              <span className="flex items-center space-x-1 text-emerald-400 text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Live</span>
              </span>
            )}
            <button
              onClick={() => setMinimized(!minimized)}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 text-[11px]"
            >
              {minimized ? 'Expand' : 'Minimize'}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="px-4 py-1.5 bg-red-950/80 text-red-300 text-[11px] flex items-center justify-between border-b border-red-900">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="font-bold text-red-400 hover:text-white">×</button>
          </div>
        )}

        {/* Caption Display Body */}
        {!minimized && (
          <div className="p-4 space-y-2 max-h-44 overflow-y-auto">
            {/* Recent context stream */}
            {recentSegments.map((seg, idx) => (
              <div key={seg.id || idx} className="text-xs text-slate-400 opacity-75">
                <span className="font-semibold text-slate-300 mr-1.5">{seg.speakerName || 'Speaker'}:</span>
                <span>{seg.text}</span>
                {seg.translatedText && (
                  <div className="text-[11px] text-indigo-300 ml-4 font-sans">
                    └ {getLanguageLabel(seg.translatedLanguage)}: {seg.translatedText}
                  </div>
                )}
              </div>
            ))}

            {/* Active Highlighted Segment */}
            {currentSegment ? (
              <div className="text-sm font-medium text-white bg-slate-900/90 p-3 rounded-xl border border-indigo-900/60 shadow-inner space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-indigo-400">
                    {currentSegment.speakerName || 'Speaker'}:
                  </span>
                  {!currentSegment.isFinal && (
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                      listening...
                    </span>
                  )}
                </div>
                <p className="leading-relaxed text-slate-100">{currentSegment.text}</p>
                {currentSegment.translatedText && (
                  <p className="text-xs text-indigo-300 font-sans border-t border-slate-800/80 pt-1 mt-1">
                    <span className="text-[10px] text-indigo-400 uppercase mr-1">
                      [{getLanguageLabel(currentSegment.translatedLanguage)}]:
                    </span>
                    {currentSegment.translatedText}
                  </p>
                )}
              </div>
            ) : (
              recentSegments.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-3 italic">
                  Listening for meeting speech... Captions will appear automatically as participants speak.
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
