import { useState, useRef } from 'react';
import { Target } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const PRIZES = [
  { label: '10 🪙', coins: 10, color: '#3498DB', text: '#fff' },
  { label: '25 🪙', coins: 25, color: '#2ECC71', text: '#fff' },
  { label: '50 🪙', coins: 50, color: '#9B59B6', text: '#fff' },
  { label: '100 🪙', coins: 100, color: '#E67E22', text: '#fff' },
  { label: '5 🪙', coins: 5, color: '#1ABC9C', text: '#fff' },
  { label: '200 🪙', coins: 200, color: '#E74C3C', text: '#fff' },
  { label: '15 🪙', coins: 15, color: '#F39C12', text: '#fff' },
  { label: '500 🪙', coins: 500, color: '#8E44AD', text: '#fff' },
  { label: '30 🪙', coins: 30, color: '#2980B9', text: '#fff' },
  { label: '1000 🪙', coins: 1000, color: '#C6A15B', text: '#fff' },
  { label: '20 🪙', coins: 20, color: '#27AE60', text: '#fff' },
  { label: '75 🪙', coins: 75, color: '#D35400', text: '#fff' },
];

const SEG = 360 / PRIZES.length;

export default function LuckyWheel() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const wheelRef = useRef(null);

  async function spin() {
    if (spinning) return;
    setError('');
    setSpinning(true);
    setResult(null);

    // Sovrin klient tomonda emas, serverda tanlanadi (xavfsizlik + "kuniga bitta" cheklovi
    // serverda tekshiriladi) — g'ildirak faqat SO'NGRA shu natijaga mos aylanadi.
    let prize;
    try {
      const res = await api.post('/lucky-wheel/spin', {});
      const winIdx = PRIZES.findIndex((p) => p.coins === res.prize.coins);
      prize = { ...res.prize, color: PRIZES[winIdx >= 0 ? winIdx : 0].color, text: '#fff' };
      const extraSpins = 5 + Math.floor(Math.random() * 3);
      const idx = winIdx >= 0 ? winIdx : 0;
      const targetAngle = extraSpins * 360 + (360 - idx * SEG - SEG / 2);
      setRotation(rotation + targetAngle);
    } catch (e) {
      setError(e.message);
      setSpinning(false);
      return;
    }

    setTimeout(() => {
      setResult(prize);
      setSpinning(false);
      setHistory(prev => [{ ...prize, date: new Date().toLocaleString('uz-UZ') }, ...prev].slice(0, 10));
    }, 4500);
  }

  const SIZE = 320;
  const R = SIZE / 2;
  const cx = R, cy = R;

  function segPath(i) {
    const a1 = (i * SEG - 90) * Math.PI / 180;
    const a2 = ((i + 1) * SEG - 90) * Math.PI / 180;
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    return `M${cx},${cy} L${x1},${y1} A${R},${R} 0 0,1 ${x2},${y2} Z`;
  }

  function labelPos(i) {
    const mid = ((i + 0.5) * SEG - 90) * Math.PI / 180;
    return { x: cx + R * 0.6 * Math.cos(mid), y: cy + R * 0.6 * Math.sin(mid), angle: (i + 0.5) * SEG };
  }

  return (
    <div>
      <PageHeader icon={Target} title="Omad g'ildiragi" subtitle="Aylantirib coin yuting — 10 dan 1000 gacha!" />

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="card p-8 flex flex-col items-center">
          {/* G'ildirak */}
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            {/* Strelka */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
              <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-red-500 drop-shadow-lg" />
            </div>

            <svg width={SIZE} height={SIZE}
              style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 4.5s cubic-bezier(.17,.67,.12,.99)' : 'none' }}>
              {PRIZES.map((p, i) => (
                <g key={i}>
                  <path d={segPath(i)} fill={p.color} stroke="#fff" strokeWidth="2" />
                  <text x={labelPos(i).x} y={labelPos(i).y}
                    transform={`rotate(${labelPos(i).angle}, ${labelPos(i).x}, ${labelPos(i).y})`}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={p.text} fontSize="11" fontWeight="bold">{p.label}</text>
                </g>
              ))}
              <circle cx={cx} cy={cy} r="28" fill="#1C2B45" stroke="#C6A15B" strokeWidth="3" />
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#C6A15B" fontSize="10" fontWeight="bold">SPIN</text>
            </svg>
          </div>

          <button onClick={spin} disabled={spinning || !isStudent}
            className={`mt-6 w-full max-w-xs rounded-2xl py-4 text-lg font-bold shadow-lg transition-all ${
              spinning
                ? 'bg-navy-300 text-white cursor-wait'
                : !isStudent
                ? 'bg-navy-200 text-navy-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-gold-400 to-gold-600 text-white hover:shadow-xl hover:-translate-y-1'
            }`}>
            {spinning ? '🎡 Aylanmoqda...' : '🎡 AYLANTIRISH'}
          </button>
          {!isStudent && <p className="text-xs text-amber-600 text-center mt-2">G'ildirakni faqat o'quvchi aylantiradi.</p>}

          {result && (
            <div className="mt-4 w-full max-w-xs rounded-2xl bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 p-5 text-center animate-fade">
              <div className="text-3xl mb-1">🎉</div>
              <div className="font-display text-2xl text-emerald-700">Tabriklaymiz!</div>
              <div className="text-lg font-bold text-emerald-600 mt-1">{result.label} yutdingiz!</div>
            </div>
          )}
          {error && <p className="text-xs text-red-500 text-center mt-4 max-w-xs">{error}</p>}
        </div>

        {/* Tarix */}
        <div className="card p-6">
          <h3 className="font-display text-lg text-navy-800 mb-4">📜 Yutgan sovrinlar</h3>
          {history.length === 0 ? (
            <div className="text-center text-navy-400 py-10">Hali g'ildirakni aylantirmadingiz</div>
          ) : (
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-3 animate-fade">
                  <div className="w-10 h-10 rounded-xl grid place-items-center text-white font-bold shadow" style={{ background: h.color }}>
                    +{h.coins}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-navy-800">{h.label}</div>
                    <div className="text-xs text-navy-400">{h.date}</div>
                  </div>
                  <span className="chip bg-emerald-100 text-emerald-700">🪙 +{h.coins}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-gold-50 to-amber-50 border border-gold/20">
            <h4 className="font-bold text-navy-800 mb-2">🎯 Qoidalar:</h4>
            <ul className="space-y-1 text-sm text-navy-600">
              <li>• Kuniga 1 marta aylantirish mumkin</li>
              <li>• 10 dan 1000 gacha coin yutish imkoniyati</li>
              <li>• Yutgan coinlar avtomatik hisobga tushadi</li>
              <li>• Streak bonus: 7+ kun = 2x chance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
