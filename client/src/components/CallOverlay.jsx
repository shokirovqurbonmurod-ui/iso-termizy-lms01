import { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video as VideoIcon, Mic, MicOff, VideoOff } from 'lucide-react';
import { createRingback } from '../lib/ringtone.js';

// Faol/kiruvchi/chiquvchi qo'ng'iroq uchun butun ekranli overlay. `call` — useCall() hook natijasi.
export default function CallOverlay({ call, peerName }) {
  const { callState, callKind, callError, muted, camOff, localVideoRef, remoteVideoRef,
    acceptCall, declineCall, endCall, toggleMute, toggleCam } = call;

  const ringRef = useRef(null);
  useEffect(() => {
    if (!ringRef.current) ringRef.current = createRingback();
    if (callState === 'calling' || callState === 'ringing') ringRef.current.start();
    else ringRef.current.stop();
  }, [callState]);
  useEffect(() => () => ringRef.current?.stop(), []);

  if (callState === 'idle' && !callError) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-navy-950/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade">
      {callError && callState === 'idle' ? (
        <div className="card p-6 max-w-sm text-center">
          <p className="text-sm text-navy-600 mb-4">{callError}</p>
          <button className="btn-gold" onClick={() => call.endCall()}>Yopish</button>
        </div>
      ) : (
        <>
          {callKind === 'video' && callState === 'active' && (
            <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          )}
          {callKind === 'video' && (
            <video ref={localVideoRef} autoPlay playsInline muted
              className="absolute bottom-28 right-6 w-32 h-44 rounded-2xl object-cover shadow-lg border-2 border-white/20 z-10" />
          )}
          {callKind === 'audio' && (
            <audio ref={remoteVideoRef} autoPlay />
          )}

          <div className="relative z-10 text-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center text-3xl font-bold text-white mx-auto mb-4 shadow-lg">
              {peerName?.[0]?.toUpperCase()}
            </div>
            <div className="text-xl font-bold text-white mb-1">{peerName}</div>
            <div className="text-sm text-white/60">
              {callState === 'calling' && "Qo'ng'iroq qilinmoqda..."}
              {callState === 'ringing' && `${callKind === 'video' ? 'Video' : 'Ovozli'} qo'ng'iroq...`}
              {callState === 'active' && (callKind === 'video' ? 'Video qo\'ng\'iroq' : 'Ovozli qo\'ng\'iroq')}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-4">
            {callState === 'ringing' ? (
              <>
                <button onClick={declineCall} className="grid place-items-center w-14 h-14 rounded-full bg-red-500 text-white shadow-lg hover:scale-105 transition" title="Rad etish">
                  <PhoneOff size={22} />
                </button>
                <button onClick={acceptCall} className="grid place-items-center w-14 h-14 rounded-full bg-emerald-500 text-white shadow-lg hover:scale-105 transition animate-pulse" title="Qabul qilish">
                  <Phone size={22} />
                </button>
              </>
            ) : (
              <>
                <button onClick={toggleMute} className={`grid place-items-center w-12 h-12 rounded-full transition ${muted ? 'bg-white text-navy-900' : 'bg-white/15 text-white hover:bg-white/25'}`} title={muted ? 'Ovozni yoqish' : "Ovozni o'chirish"}>
                  {muted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                {callKind === 'video' && (
                  <button onClick={toggleCam} className={`grid place-items-center w-12 h-12 rounded-full transition ${camOff ? 'bg-white text-navy-900' : 'bg-white/15 text-white hover:bg-white/25'}`} title={camOff ? 'Kamerani yoqish' : "Kamerani o'chirish"}>
                    {camOff ? <VideoOff size={18} /> : <VideoIcon size={18} />}
                  </button>
                )}
                <button onClick={() => endCall()} className="grid place-items-center w-14 h-14 rounded-full bg-red-500 text-white shadow-lg hover:scale-105 transition" title="Tugatish">
                  <PhoneOff size={22} />
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
