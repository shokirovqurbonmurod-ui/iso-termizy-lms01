import { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video as VideoIcon, Mic, MicOff, VideoOff, Users } from 'lucide-react';

function Tile({ name, stream, muted }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  const hasVideo = stream?.getVideoTracks().length > 0;
  return (
    <div className="relative rounded-xl overflow-hidden bg-navy-800 aspect-video grid place-items-center">
      {hasVideo ? (
        <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      ) : (
        <>
          <audio ref={ref} autoPlay muted={muted} />
          <div className="w-10 h-10 rounded-full bg-gold-500 grid place-items-center text-sm font-bold text-white">{name?.[0]?.toUpperCase()}</div>
        </>
      )}
      <span className="absolute bottom-1 left-1.5 text-[10px] text-white bg-black/40 rounded px-1.5 py-0.5">{name}</span>
    </div>
  );
}

// Guruh audio/video chat paneli — kanal/guruh sarlavhasi ostida ko'rsatiladi: hozircha hech kim
// qo'ng'iroqda bo'lmasa boshlash tugmasi, kimdir bo'lsa qo'shilish taklifi, o'zim ichkarida bo'lsam
// video panjara + boshqaruv tugmalari.
export default function GroupCallPanel({ call, myName }) {
  const { inCall, callKind, remoteCount, participants, callError, muted, camOff, localStream, join, leave, toggleMute, toggleCam } = call;

  if (!inCall && remoteCount === 0) return null;

  if (!inCall) {
    return (
      <div className="mx-4 mt-3 rounded-xl bg-gold/10 border border-gold/30 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-gold-700">
          <Users size={14} /> {remoteCount} kishi hozir qo'ng'iroqda
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => join('audio')} className="btn-gold !py-1 !px-2.5 text-[11px]"><Phone size={12} className="inline -mt-0.5 mr-1" /> Qo'shilish</button>
          <button onClick={() => join('video')} className="btn-ghost !py-1 !px-2.5 text-[11px]"><VideoIcon size={12} className="inline -mt-0.5 mr-1" /> Video</button>
        </div>
      </div>
    );
  }

  const names = Object.keys(participants);

  return (
    <div className="mx-4 mt-3 rounded-xl bg-navy-900 p-3">
      {callError && <p className="text-[11px] text-red-300 mb-2">{callError}</p>}
      <div className={`grid gap-2 mb-3 ${names.length + 1 > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Tile name="Siz" stream={localStream} muted />
        {names.map((n) => <Tile key={n} name={n} stream={participants[n]} />)}
      </div>
      {names.length === 0 && (
        <p className="text-center text-[11px] text-white/50 mb-2">Kutilmoqda — hali hech kim qo'shilmadi...</p>
      )}
      <div className="flex items-center justify-center gap-2">
        <button onClick={toggleMute} className={`grid place-items-center w-9 h-9 rounded-full transition ${muted ? 'bg-white text-navy-900' : 'bg-white/15 text-white hover:bg-white/25'}`}>
          {muted ? <MicOff size={15} /> : <Mic size={15} />}
        </button>
        {callKind === 'video' && (
          <button onClick={toggleCam} className={`grid place-items-center w-9 h-9 rounded-full transition ${camOff ? 'bg-white text-navy-900' : 'bg-white/15 text-white hover:bg-white/25'}`}>
            {camOff ? <VideoOff size={15} /> : <VideoIcon size={15} />}
          </button>
        )}
        <button onClick={leave} className="grid place-items-center w-9 h-9 rounded-full bg-red-500 text-white">
          <PhoneOff size={15} />
        </button>
      </div>
    </div>
  );
}
