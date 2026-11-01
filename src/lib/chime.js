'use client';

// Satu AudioContext bersama yang dibuat saat gestur pengguna pertama.
let audioCtx = null;

const getContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
};

// Generator Chime WAV in-memory (HTML5 Audio fallback untuk iOS/Android)
let chimeWavUri = null;
let htmlAudio = null;

const getChimeUri = () => {
  if (chimeWavUri) return chimeWavUri;
  if (typeof window === 'undefined') return '';
  try {
    const sampleRate = 22050;
    const tones = [
      { freq: 523.25, start: 0.0, dur: 0.28 },
      { freq: 659.25, start: 0.18, dur: 0.28 },
      { freq: 783.99, start: 0.36, dur: 0.28 },
      { freq: 1046.5, start: 0.54, dur: 0.55 },
    ];
    const totalSamples = Math.floor(sampleRate * 1.15);
    const dataSize = totalSamples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i += 1) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    const samples = new Float32Array(totalSamples);
    for (const t of tones) {
      const startIdx = Math.floor(t.start * sampleRate);
      const toneSamples = Math.floor(t.dur * sampleRate);
      for (let i = 0; i < toneSamples && startIdx + i < totalSamples; i += 1) {
        const time = i / sampleRate;
        const progress = i / toneSamples;
        const env = progress < 0.04 ? progress / 0.04 : Math.exp(-progress * 4.2);
        const s = (Math.sin(2 * Math.PI * t.freq * time) + 0.3 * Math.sin(2 * Math.PI * t.freq * 2 * time)) * env * 0.7;
        samples[startIdx + i] += s;
      }
    }

    let offset = 44;
    for (let i = 0; i < totalSamples; i += 1) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunk = 0x8000;
    for (let i = 0; i < len; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, len)));
    }
    chimeWavUri = `data:audio/wav;base64,${btoa(binary)}`;
    return chimeWavUri;
  } catch {
    return '';
  }
};

const getHtmlAudio = () => {
  if (typeof window === 'undefined') return null;
  if (!htmlAudio) {
    const uri = getChimeUri();
    if (uri) {
      htmlAudio = new Audio(uri);
      htmlAudio.preload = 'auto';
    }
  }
  return htmlAudio;
};

// Browser mobile hanya mengizinkan audio setelah gestur pengguna. Panggil dari event klik/sentuh.
export const unlockAudio = async () => {
  try {
    const c = getContext();
    if (c && c.state === 'suspended') {
      await c.resume();
    }
    const a = getHtmlAudio();
    if (a) {
      a.load();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      window.speechSynthesis.getVoices();
    }
  } catch {}
};

export const isAudioReady = () => {
  const c = getContext();
  return !!c && c.state === 'running';
};

const note = (c, freq, start, duration, gainValue) => {
  try {
    const osc = c.createOscillator();
    const overtone = c.createOscillator();
    const gain = c.createGain();
    const overtoneGain = c.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2, start);

    const safeGain = Math.max(0.001, gainValue);
    gain.gain.setValueAtTime(safeGain, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    overtoneGain.gain.setValueAtTime(safeGain * 0.35, start);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.7);

    osc.connect(gain);
    gain.connect(c.destination);
    overtone.connect(overtoneGain);
    overtoneGain.connect(c.destination);

    osc.start(start);
    overtone.start(start);
    osc.stop(start + duration);
    overtone.stop(start + duration);
  } catch {}
};

// Empat nada naik C5-E5-G5-C6. Menggunakan Web Audio Oscillator sebagai audio utama, dan HTML5 Audio WAV sebagai fallback.
export const playChime = async (volume = 0.8) => {
  try {
    const c = getContext();
    if (c) {
      if (c.state === 'suspended') {
        await c.resume();
      }
      if (c.state === 'running') {
        const t = c.currentTime + 0.02;
        note(c, 523.25, t, 0.35, 0.85 * volume);
        note(c, 659.25, t + 0.22, 0.35, 0.85 * volume);
        note(c, 783.99, t + 0.44, 0.35, 0.85 * volume);
        note(c, 1046.5, t + 0.66, 0.8, 0.95 * volume);
        return true;
      }
    }
  } catch (err) {
    console.warn('WebAudio play error:', err);
  }

  try {
    const a = getHtmlAudio();
    if (a) {
      a.currentTime = 0;
      a.volume = Math.max(0, Math.min(1, volume));
      const p = a.play();
      if (p && typeof p.then === 'function') {
        await p;
        return true;
      }
      return true;
    }
  } catch {}

  return false;
};

export const vibrate = (pattern = [300, 150, 300, 150, 500]) => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {}
};

const speechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

const pickVoice = () => {
  try {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang === 'id-ID' && /google|natural|online/i.test(v.name)) ||
      voices.find((v) => v.lang === 'id-ID') ||
      voices.find((v) => v.lang?.toLowerCase().startsWith('id')) ||
      null
    );
  } catch {
    return null;
  }
};

let activeUtterances = [];

export const speak = (text, { repeat = 1, rate = 0.95 } = {}) => {
  if (!speechSupported()) return false;
  try {
    const synth = window.speechSynthesis;
    if (synth.paused) synth.resume();
    synth.cancel();
    activeUtterances = [];

    for (let i = 0; i < repeat; i += 1) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      u.rate = rate;
      u.volume = 1;
      const voice = pickVoice();
      if (voice) u.voice = voice;

      u.onend = () => {
        activeUtterances = activeUtterances.filter((x) => x !== u);
      };
      u.onerror = () => {
        activeUtterances = activeUtterances.filter((x) => x !== u);
      };
      activeUtterances.push(u);
      synth.speak(u);
    }
    return true;
  } catch {
    return false;
  }
};

export const spokenNumber = (queueNumber) => {
  const m = /^([A-Za-z]+)[-\s]?0*(\d+)$/.exec(queueNumber || '');
  return m ? `${m[1]} ${m[2]}` : String(queueNumber || '');
};

let announceTimer = null;

export const announceQueue = (queueNumber) => {
  if (announceTimer) {
    clearTimeout(announceTimer);
    announceTimer = null;
  }
  playChime(1);
  const text = `Nomor antrian ${spokenNumber(queueNumber)}, silakan menuju photobooth.`;
  announceTimer = setTimeout(() => {
    speak(text, { repeat: 2 });
    announceTimer = null;
  }, 1300);
};

const chime = { unlockAudio, isAudioReady, playChime, vibrate, speak, spokenNumber, announceQueue };
export default chime;
