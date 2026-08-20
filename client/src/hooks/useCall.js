import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api.js';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// 1:1 audio/video qo'ng'iroq — signalizatsiya (offer/answer/ICE) server orqali (REST polling,
// call_signals jadvali) uzatiladi, media esa ulanish o'rnatilgach to'g'ridan-to'g'ri P2P oqadi.
// Cheklov: qo'ng'iroq faqat ikkala tomon ham ayni shu DM suhbatini ochib turgan paytda ishlaydi
// (WebSocket/push infratuzilmasi yo'q, shuning uchun "istalgan joyda jiringlash" hali yo'q).
export function useCall({ channel, peerName, myName, enabled }) {
  const [callState, setCallState] = useState('idle'); // idle | calling | ringing | active
  const [callKind, setCallKind] = useState('audio'); // audio | video
  const [incomingSignal, setIncomingSignal] = useState(null);
  const [callError, setCallError] = useState('');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const lastIdRef = useRef(0);
  const callStateRef = useRef('idle');
  const peerRef = useRef(peerName);

  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { peerRef.current = peerName; }, [peerName]);
  // Suhbat almashtirilganda eski qo'ng'iroqqa tegishli signal id hisobini tozalaymiz.
  useEffect(() => { lastIdRef.current = 0; endCall(); }, [channel]); // eslint-disable-line react-hooks/exhaustive-deps

  function sendSignal(to, type, payload) {
    return api.post('/call_signals', { channel, to, type, payload: payload ?? null }).catch(() => {});
  }

  function createPeerConnection(remoteName) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => { if (e.candidate) sendSignal(remoteName, 'ice', e.candidate.toJSON()); };
    pc.ontrack = (e) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; };
    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState) && callStateRef.current !== 'idle') endCall();
    };
    pcRef.current = pc;
    return pc;
  }

  const endCall = useCallback((msg) => {
    if (peerRef.current && callStateRef.current !== 'idle') sendSignal(peerRef.current, 'hangup', null);
    pcRef.current?.close(); pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop()); localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState('idle'); setIncomingSignal(null); setMuted(false); setCamOff(false);
    if (msg) setCallError(msg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  async function handleSignal(s) {
    if (s.type === 'offer') {
      if (callStateRef.current !== 'idle') { sendSignal(s.from, 'busy', null); return; }
      setIncomingSignal(s);
      setCallKind(s.payload?.kind || 'audio');
      setCallState('ringing');
    } else if (s.type === 'answer') {
      if (pcRef.current) await pcRef.current.setRemoteDescription(new RTCSessionDescription(s.payload));
      setCallState('active');
    } else if (s.type === 'ice') {
      if (pcRef.current && s.payload) await pcRef.current.addIceCandidate(new RTCIceCandidate(s.payload)).catch(() => {});
    } else if (s.type === 'hangup') {
      endCall();
    } else if (s.type === 'busy') {
      endCall("Foydalanuvchi hozir band.");
    } else if (s.type === 'decline') {
      endCall("Qo'ng'iroq rad etildi.");
    }
  }

  useEffect(() => {
    if (!enabled || !channel) return;
    const iv = setInterval(async () => {
      const rows = await api.get(`/call_signals?channel=${encodeURIComponent(channel)}&after=${lastIdRef.current}`).catch(() => []);
      for (const s of rows) {
        lastIdRef.current = Math.max(lastIdRef.current, s.id);
        if (s.to === myName) await handleSignal(s);
      }
    }, 1500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channel, myName]);

  async function startCall(kind) {
    if (!peerName) return;
    setCallError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPeerConnection(peerName);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      setCallKind(kind);
      setCallState('calling');
      await sendSignal(peerName, 'offer', { sdp: offer.sdp, type: offer.type, kind });
    } catch (e) {
      setCallError("Kamera/mikrofonga ruxsat berilmadi yoki xatolik: " + e.message);
      setCallState('idle');
    }
  }

  async function acceptCall() {
    if (!incomingSignal) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callKind === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPeerConnection(incomingSignal.from);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription({ sdp: incomingSignal.payload.sdp, type: incomingSignal.payload.type }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(incomingSignal.from, 'answer', { sdp: answer.sdp, type: answer.type });
      setCallState('active');
      setIncomingSignal(null);
    } catch (e) {
      setCallError('Xatolik: ' + e.message);
      declineCall();
    }
  }

  function declineCall() {
    if (incomingSignal) sendSignal(incomingSignal.from, 'decline', null);
    setIncomingSignal(null);
    setCallState('idle');
  }

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMuted(!track.enabled); }
  }
  function toggleCam() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOff(!track.enabled); }
  }

  return {
    callState, callKind, incomingSignal, callError, muted, camOff,
    localVideoRef, remoteVideoRef,
    startCall, acceptCall, declineCall, endCall, toggleMute, toggleCam,
  };
}
