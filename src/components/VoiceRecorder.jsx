import React, { useState, useRef, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:8000';

/**
 * VoiceRecorder — The mic button with animated waveform visualization.
 * Uses the Web Audio API for real-time waveform + MediaRecorder for capture.
 */
export default function VoiceRecorder({ language, authData, onResult, onError }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveData, setWaveData] = useState(new Array(40).fill(0.05));
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Animate waveform from analyser data
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    const bars = 40;
    const step = Math.floor(dataArray.length / bars);
    const newData = [];
    for (let i = 0; i < bars; i++) {
      const val = dataArray[i * step] / 255;
      // Normalize: 0.5 = silence → 0, peaks → 1
      newData.push(Math.abs(val - 0.5) * 2);
    }
    setWaveData(newData);
    animationRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Setup Web Audio analyser for visualisation
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await sendAudioToServer(blob);
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setDuration(0);

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start waveform animation
      updateWaveform();
    } catch (err) {
      console.error('Mic access error:', err);
      onError?.('माइक्रोफोन एक्सेस नहीं मिला। Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Cleanup
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }

      setWaveData(new Array(40).fill(0.05));
    }
  };

  const sendAudioToServer = async (blob) => {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    formData.append('language', language === 'te' ? 'te' : language === 'en' ? 'en' : 'hi');
    if (authData?.phone) formData.append('phone', authData.phone);
    if (authData?.email) formData.append('email', authData.email);
    if (authData?.password) formData.append('password', authData.password);

    try {
      const res = await fetch(`${API_BASE}/api/workers/voice-register`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Server error');
      }

      const data = await res.json();
      onResult?.(data);
    } catch (err) {
      console.error('Voice register error:', err);
      onError?.(err.message || 'Something went wrong. Please try again.');
    }
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">

      {/* Waveform Visualization */}
      <div className="flex items-center justify-center gap-[3px] h-20 w-full max-w-sm px-4">
        {waveData.map((val, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-75"
            style={{
              width: '4px',
              height: `${Math.max(4, val * 64)}px`,
              background: isRecording
                ? `hsl(${20 + i * 2}, 90%, ${55 + val * 20}%)`
                : 'rgba(255,255,255,0.15)',
              opacity: isRecording ? 0.6 + val * 0.4 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Duration */}
      {isRecording && (
        <div className="flex items-center gap-2 text-white/70 text-sm font-mono animate-in">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          {formatDuration(duration)}
        </div>
      )}

      {/* Mic Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 ${
          isRecording
            ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.5)] scale-110'
            : 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:shadow-[0_0_50px_rgba(249,115,22,0.6)] hover:scale-105'
        }`}
      >
        {/* Pulse rings */}
        {isRecording && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30"></span>
            <span className="absolute -inset-3 rounded-full border border-red-400/20 animate-ping opacity-20" style={{animationDelay: '0.5s'}}></span>
          </>
        )}

        {/* Icon */}
        {isRecording ? (
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* Hint Text */}
      <p className="text-white/40 text-sm text-center font-medium max-w-xs">
        {isRecording
          ? 'Bol rahe ho... Jab ho jaye, stop karo ↑'
          : 'Mic dabao aur bolo — "Mera naam Raju hai, main mason hoon, 8 saal ka experience..."'}
      </p>
    </div>
  );
}
