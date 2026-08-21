import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// Guruh audio/video chat — mesh topologiya: har bir ishtirokchi boshqa HAR BIR ishtirokchi bilan
// alohida P2P ulanish ochadi. Kichik guruhlar (bir nechta kishi) uchun mos, ko'p kishilik katta
// guruhlarda har bir qo'shimcha kishi barchaning tarmoq yukini oshiradi (SFU emas).
export function useGroupCall({ channel, myName, enabled }) {
  const [inCall, setInCall] = useState(false);
  const [callKind, setCallKind] = useState('audio');
  const [remoteCount, setRemoteCount] = useState(0); // kanalda hozir qo'ng'iroqda turganlar (men bo'lmasam ham)
  const [participants, setParticipants] = useState({}); // { name: MediaStream }
  const [callError, setCallError] = useState('');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const localStreamRef = useRef(null);
  const pcsRef = useRef({}); // { name: RTCPeerConnection }
  const lastIdRef = useRef(0);
  const inCallRef = useRef(false);
  const kindRef = useRef('audio');

  useEffect(() => { inCallRef.current = inCall; }, [inCall]);
  useEffect(() => { kindRef.current = callKind; }, [callKind]);

  function sendSignal(to, type, payload) {
    return api.post('/call_signals', { channel, to, type, payload: payload ?? null }).catch(() => {});
  }

  function createPeer(remoteName) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => { if (e.candidate) sendSignal(remoteName, 'group-ice', e.candidate.toJSON()); };
    pc.ontrack = (e) => {
      setParticipants((p) => ({ ...p, [remoteName]: e.streams[0] }));
    };
    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) removePeer(remoteName);
    };
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
    pcsRef.current[remoteName] = pc;
    return pc;
  }

  function removePeer(name) {
    pcsRef.current[name]?.close();
    delete pcsRef.current[name];
    setParticipants((p) => { const n = { ...p }; delete n[name]; return n; });
  }

  // Kim bilan alohida bog'lanmasam ham, kanalda hozir nechta kishi qo'ng'iroqda ekanini ko'rsatib turadi.
  useEffect(() => {
    if (!enabled || !channel) return;
    const iv = setInterval(async () => {
      const rows = await api.get(`/group_calls?channel=${encodeURIComponent(channel)}`).catch(() => []);
      setRemoteCount(rows.filter((p) => p.user !== myName).length);
    }, 4000);
    return () => clearInterval(iv);
  }, [enabled, channel, myName]);

  // Signalizatsiyani tinglash (faqat men qo'ng'iroqda ekanimda kerak).
  useEffect(() => {
    if (!enabled || !channel || !inCall) return;
    const iv = setInterval(async () => {
      const rows = await api.get(`/call_signals?channel=${encodeURIComponent(channel)}&after=${lastIdRef.current}`).catch(() => []);
      for (const s of rows) {
        lastIdRef.current = Math.max(lastIdRef.current, s.id);
        if (s.to !== myName) continue;
        if (s.type === 'group-offer') {
          const pc = pcsRef.current[s.from] || createPeer(s.from);
          await pc.setRemoteDescription(new RTCSessionDescription({ sdp: s.payload.sdp, type: s.payload.type }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal(s.from, 'group-answer', { sdp: answer.sdp, type: answer.type });
        } else if (s.type === 'group-answer') {
          const pc = pcsRef.current[s.from];
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription({ sdp: s.payload.sdp, type: s.payload.type }));
        } else if (s.type === 'group-ice') {
          const pc = pcsRef.current[s.from];
          if (pc && s.payload) await pc.addIceCandidate(new RTCIceCandidate(s.payload)).catch(() => {});
        } else if (s.type === 'group-leave') {
          removePeer(s.from);
        }
      }
    }, 1500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channel, inCall, myName]);

  async function join(kind) {
    setCallError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
      localStreamRef.current = stream;
      setCallKind(kind);
      const { participants: existing } = await api.post('/group_calls/join', { channel, kind });
      setInCall(true);
      for (const p of existing || []) {
        const pc = createPeer(p.user);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(p.user, 'group-offer', { sdp: offer.sdp, type: offer.type });
      }
    } catch (e) {
      setCallError("Kamera/mikrofonga ruxsat berilmadi yoki xatolik: " + e.message);
    }
  }

  function leave() {
    for (const name of Object.keys(pcsRef.current)) { sendSignal(name, 'group-leave', null); pcsRef.current[name].close(); }
    pcsRef.current = {};
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setParticipants({});
    setInCall(false);
    setMuted(false);
    setCamOff(false);
  }

  useEffect(() => () => { if (inCallRef.current) leave(); }, [channel]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMute() {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMuted(!t.enabled); }
  }
  function toggleCam() {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setCamOff(!t.enabled); }
  }

  return {
    inCall, callKind, remoteCount, participants, callError, muted, camOff,
    localStream: localStreamRef.current,
    join, leave, toggleMute, toggleCam,
  };
}
