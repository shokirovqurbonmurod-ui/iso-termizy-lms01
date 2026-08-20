import { useEffect, useMemo, useState } from 'react';
import { Package, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const today = () => new Date().toISOString().slice(0, 10);

export default function MysteryBoxPage() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const [log, setLog] = useState(null);
  const [opening, setOpening] = useState(null); // box index currently opening
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const rows = await api.get('/mystery_box?limit=500').catch(() => []);
    setLog(rows || []);
  }
  useEffect(() => { load(); }, []);

  const myToday = useMemo(
    () => (log || []).find((r) => r.student === user.full_name && r.date === today()),
    [log, user.full_name]);

  const myHistory = useMemo(
    () => (log || []).filter((r) => r.student === user.full_name).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10),
    [log, user.full_name]);

  async function openBox(idx) {
    if (!isStudent) { setError("Quti faqat o'quvchi hisobidan ochiladi."); return; }
    if (myToday || opening) return;
    setError('');
    setOpening(idx);

    // Sovrin klient tomonda emas, serverda tanlanadi — mijoz JS'ni o'zgartirib eng katta sovrinni
    // "tanlab" ololmasin, va "kuniga bitta" cheklovi ham serverda tekshiriladi.
    setTimeout(async () => {
      try {
        const res = await api.post('/mystery-box/open', {});
        setResult(res.prize);
        await load();
      } catch (e) { setError(e.message); }
      setOpening(null);
    }, 1400);
  }

  if (log === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Package} title="Mystery Box" subtitle="Kuniga bitta qutini oching — ichida qancha coin borligini hech kim bilmaydi!" />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-8">
          {myToday ? (
            <div className="text-center py-6 animate-fade">
              <div className="text-5xl mb-3">📭</div>
              <div className="font-display text-xl text-navy-800 mb-1">Bugungi quti ochildi</div>
              <p className="text-sm text-navy-500 mb-1">Siz bugun <b className="text-gold-600">{myToday.reward}</b> yutdingiz.</p>
              <p className="text-xs text-navy-400">Ertaga yana bitta yangi quti kutmoqda 🎁</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[0, 1, 2].map((i) => (
                  <button key={i} onClick={() => openBox(i)} disabled={!isStudent || opening !== null}
                    className={`aspect-square rounded-2xl grid place-items-center text-5xl border-2 transition-all ${
                      opening === i ? 'scale-110 border-gold bg-gold/10 animate-bounce' :
                      opening !== null ? 'opacity-40 border-navy-100' :
                      'border-navy-100 bg-navy-50/60 hover:border-gold hover:bg-gold/5 hover:-translate-y-1 cursor-pointer'
                    }`}>
                    {opening === i ? '✨' : '🎁'}
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-navy-400">
                {opening !== null ? 'Quti ochilmoqda...' : 'Uchta qutidan birini tanlang'}
              </p>
            </>
          )}

          {result && !myToday && (
            <div className="mt-6 rounded-2xl bg-gradient-to-r from-gold-50 to-amber-50 border border-gold/30 p-5 text-center animate-fade">
              <Sparkles className="mx-auto text-gold mb-1" size={28} />
              <div className="font-display text-xl text-navy-800">Siz yutdingiz:</div>
              <div className="text-2xl font-bold text-gold-600 mt-1">{result.label}</div>
            </div>
          )}

          {error && <p className="text-xs text-red-500 text-center mt-4">{error}</p>}

          <div className="mt-6 p-4 rounded-xl bg-navy-50/60">
            <h4 className="font-bold text-navy-800 mb-2 text-sm">🎯 Qoidalar:</h4>
            <ul className="space-y-1 text-xs text-navy-500">
              <li>• Kuniga faqat bitta quti ochish mumkin</li>
              <li>• 10 dan 500 coingacha (jekpot 2% ehtimol bilan)</li>
              <li>• Yutgan coinlar avtomatik hisobga tushadi</li>
              <li>• Ota-onangizga ham Telegram orqali xabar boradi</li>
            </ul>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-display text-lg text-navy-800 mb-4">📜 Mening tarixim</h3>
          {myHistory.length === 0 ? (
            <div className="text-center text-navy-400 py-10">Hali quti ochmadingiz</div>
          ) : (
            <div className="space-y-2">
              {myHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-navy-50/60 px-4 py-3">
                  <div>
                    <div className="font-bold text-navy-800">{h.reward}</div>
                    <div className="text-xs text-navy-400">{h.date}</div>
                  </div>
                  <span className="chip bg-emerald-100 text-emerald-700">🪙 +{h.coins}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
