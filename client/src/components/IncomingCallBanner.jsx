import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, Video as VideoIcon } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';

const RING_TIMEOUT_MS = 25000;

// Layout ichida doim mavjud — foydalanuvchi Chat sahifasida bo'lmasa ham kiruvchi qo'ng'iroqdan
// xabardor qiladi. "Ochish" bosilganda shaxsiy suhbatga o'tkazadi, u yerda GroupChat'ning o'z
// useCall()'i xuddi shu taklifni (offer) qayta ko'rib to'liq jiringlash ekranini ko'rsatadi.
export default function IncomingCallBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const lastIdRef = useRef(0);

  useEffect(() => {
    const iv = setInterval(async () => {
      const rows = await api.get(`/call_signals?to=${encodeURIComponent(user.full_name)}&after=${lastIdRef.current}`).catch(() => []);
      for (const s of rows) {
        lastIdRef.current = Math.max(lastIdRef.current, s.id);
        if (s.type === 'offer') {
          const age = Date.now() - new Date((s.at || '').replace(' ', 'T')).getTime();
          if (age < RING_TIMEOUT_MS) setOffer(s);
        } else if (['hangup', 'busy', 'decline'].includes(s.type)) {
          setOffer((cur) => (cur && cur.from === s.from ? null : cur));
        }
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [user.full_name]);

  useEffect(() => {
    if (!offer) return;
    const t = setTimeout(() => setOffer((cur) => (cur?.id === offer.id ? null : cur)), RING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [offer]);

  if (!offer) return null;

  function decline() {
    api.post('/call_signals', { channel: offer.channel, to: offer.from, type: 'decline' }).catch(() => {});
    setOffer(null);
  }
  function accept() {
    navigate(`/app/group-chat?dm=${encodeURIComponent(offer.from)}`);
    setOffer(null);
  }

  return (
    <div className="fixed top-20 right-4 z-[200] card p-4 w-72 shadow-xl animate-fade border-l-4 border-gold">
      <div className="flex items-center gap-2 mb-1">
        {offer.payload?.kind === 'video' ? <VideoIcon size={15} className="text-gold-600" /> : <Phone size={15} className="text-gold-600" />}
        <span className="text-sm font-bold text-navy-800">Kiruvchi qo'ng'iroq</span>
      </div>
      <p className="text-xs text-navy-500 mb-3">{offer.from} sizga {offer.payload?.kind === 'video' ? 'video' : 'ovozli'} qo'ng'iroq qilmoqda</p>
      <div className="flex gap-2">
        <button onClick={decline} className="btn-ghost flex-1 !py-1.5 text-xs"><PhoneOff size={13} className="inline -mt-0.5 mr-1" /> Rad etish</button>
        <button onClick={accept} className="btn-gold flex-1 !py-1.5 text-xs"><Phone size={13} className="inline -mt-0.5 mr-1" /> Ochish</button>
      </div>
    </div>
  );
}
