import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { LogIn, Eye, EyeOff, Phone, Lock, Sparkles } from 'lucide-react';

const KIOSK_KEY = 'iso_kiosk_mode';

const SUBJECTS = [
  { icon: '🇬🇧', label: 'Ingliz' }, { icon: '🎯', label: 'IELTS' }, { icon: '📊', label: 'CEFR' },
  { icon: '🇰🇷', label: 'Koreys' }, { icon: '🇷🇺', label: 'Rus' }, { icon: '➗', label: 'Matematika' },
  { icon: '📜', label: 'Tarix' }, { icon: '⚖️', label: 'Huquq' }, { icon: '💻', label: 'IT' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isKiosk = (() => { try { return localStorage.getItem(KIOSK_KEY) === '1'; } catch { return false; } })();

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  // Faqat qabulxona kiosk sifatida belgilangan qurilmada — noto'g'ri urinishda kamera kadri olinadi.
  async function ensureKioskCamera() {
    if (!isKiosk || streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch { /* kamera yo'q yoki ruxsat berilmagan — jim o'tkaziladi, login odatdagidek davom etadi */ }
  }

  function captureKioskFrame() {
    const video = videoRef.current;
    if (!isKiosk || !video || video.readyState < 2) return null;
    try {
      const c = document.createElement('canvas');
      c.width = video.videoWidth; c.height = video.videoHeight;
      c.getContext('2d').drawImage(video, 0, 0);
      return c.toDataURL('image/jpeg', 0.7);
    } catch { return null; }
  }

  async function submit(e) {
    e?.preventDefault?.();
    setErr(''); setBusy(true);
    try {
      const photo = captureKioskFrame();
      await login(phone, password, photo ? { photo } : undefined);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      navigate('/app/command-center');
    } catch (e) {
      setErr(e.message || 'Telefon yoki parol noto\'g\'ri');
      await ensureKioskCamera();
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-full flex">
      <video ref={videoRef} muted playsInline className="hidden" />
      {/* Chap tomon — brend */}
      <div className="hidden lg:flex lg:w-[480px] flex-col justify-between p-12 bg-gradient-to-br from-navy-800 via-navy-900 to-[#0A1020] text-white relative overflow-hidden">
        <div className="absolute -right-32 -top-32 w-[500px] h-[500px] rounded-full bg-gold/10 blur-[100px] animate-pulse-gold" />
        <div className="absolute left-0 bottom-0 w-[400px] h-[400px] rounded-full bg-gold/5 blur-[80px]" />
        <div className="absolute right-10 bottom-24 w-40 h-40 rounded-full bg-blue-400/[.06] blur-[60px]" />

        <div className="relative flex items-center gap-3">
          <img src="/logo.png" alt="ISO" className="w-12 h-12 rounded-xl object-cover bg-white/90 p-0.5 shadow-lg" />
          <div className="font-display text-2xl"><span className="text-gold-300">ISO</span> Termizy Avlodlari</div>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold text-gold-200 mb-5">
            <Sparkles size={12} /> AI yordamchi bilan yangilandi
          </div>
          <h1 className="font-display text-5xl leading-[1.15] mb-4">Xorijiy tillar<br/>o'quv markazi</h1>
          <p className="text-navy-300 mb-5 text-sm max-w-md">
            Bitta platformada — o'quvchilar, guruhlar, moliya, CRM va boshqaruv.
          </p>
          <div className="flex flex-wrap gap-2 max-w-lg">
            {SUBJECTS.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/[.06] border border-white/10 px-3 py-1.5 text-sm text-navy-100 hover:bg-white/10 transition">
                <span>{s.icon}</span>{s.label}
              </span>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-navy-400">© 2026 ISO Termizy Avlodlari · Sherobod</div>
      </div>

      {/* O'ng tomon — faqat kirish formasi */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-navy-50 to-white">
        <div className="w-full max-w-sm animate-fade">
          {/* Mobil logo */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <img src="/logo.png" alt="ISO" className="w-14 h-14 rounded-xl object-cover shadow" />
            <div className="font-display text-xl text-navy-800 text-center"><span className="text-gold-600">ISO</span> Termizy Avlodlari</div>
            <p className="text-xs text-navy-400">Xorijiy tillar o'quv markazi</p>
          </div>

          <div className="card p-8 !shadow-2xl !rounded-[32px] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-gold-400 via-gold-500 to-amber-400" />
            <div className="text-center mb-6">
              <div className="grid place-items-center w-16 h-16 rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-lg mx-auto mb-3 animate-pulse-gold">
                <LogIn size={26} />
              </div>
              <h2 className="font-display text-2xl text-navy-800">Xush kelibsiz! 👋</h2>
              <p className="text-sm text-navy-400 mt-1">Telefon raqam va parol bilan kiring</p>
            </div>

            {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Telefon raqam</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 text-navy-400 text-sm">+998</span>
                  <input className="input !py-3 !pl-[4.6rem]" placeholder="90 123 45 67" value={phone}
                    onChange={(e) => setPhone(e.target.value)} autoFocus />
                </div>
              </div>
              <div>
                <label className="label">Parol</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
                  <input className="input !py-3 !pl-11 !pr-12" type={showPw ? 'text' : 'password'} placeholder="Parolingiz"
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 transition">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-gold w-full !py-3 text-base" disabled={busy}>
                {busy ? 'Kirilmoqda...' : 'KIRISH'}
              </button>
            </form>
          </div>
          <p className="text-center text-xs text-navy-300 mt-5">✨ ISO Termizy AI yordamchisi sizni kutmoqda</p>
        </div>
      </div>
    </div>
  );
}
