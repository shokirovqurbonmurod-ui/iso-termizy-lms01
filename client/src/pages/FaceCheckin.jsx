import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, UserPlus, Users, CheckCircle2, Loader2, ScanFace, LogIn, LogOut, Upload, Video, Wifi, Laptop, ShieldAlert, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Modal, Empty } from '../components/ui.jsx';

const MODEL_URL = '/models';
const MATCH_THRESHOLD = 0.55; // qancha kichik bo'lsa, shuncha qat'iy taqqoslash
const DETECT_INTERVAL_MS = 700;
const IP_CAMERA_KEY = 'iso_ip_camera_url';

export default function FaceCheckin() {
  const videoRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const matcherRef = useRef(null);
  const checkedInRef = useRef(new Set());
  const checkedOutRef = useRef(new Set());
  const detectTimerRef = useRef(null);
  const modeRef = useRef('in');
  const lastUnknownAlertRef = useRef(0);

  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [todayLog, setTodayLog] = useState([]);
  const [status, setStatus] = useState('Modellar yuklanmoqda...');
  const [mode, setMode] = useState('in'); // 'in' = kirish, 'out' = chiqish
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [flash, setFlash] = useState(null); // {name, action} — oxirgi tanilgan hodisa
  const [sourceMode, setSourceMode] = useState('webcam'); // 'webcam' | 'ip'
  const [ipUrl, setIpUrl] = useState(() => { try { return localStorage.getItem(IP_CAMERA_KEY) || ''; } catch { return ''; } });
  const [ipError, setIpError] = useState('');

  const [securityLog, setSecurityLog] = useState([]);

  const [enrollModal, setEnrollModal] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollSearch, setEnrollSearch] = useState('');
  const [enrollSaving, setEnrollSaving] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState('');
  const enrollFileRef = useRef(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  async function loadData() {
    const [enr, st, log, sec] = await Promise.all([
      api.get('/face/enrollments').catch(() => []),
      api.get('/students').catch(() => []),
      api.get('/face/checkins').catch(() => []),
      api.get('/face/unknown').catch(() => []),
    ]);
    setEnrollments(enr || []);
    setStudents(st || []);
    setTodayLog(log || []);
    setSecurityLog(sec || []);
    for (const c of log || []) {
      checkedInRef.current.add(c.student_id);
      if (c.left_at) checkedOutRef.current.add(c.student_id);
    }
    if ((enr || []).length) {
      const labeled = (enr || []).map((e) => new faceapi.LabeledFaceDescriptors(String(e.student_id), [new Float32Array(e.descriptor)]));
      matcherRef.current = new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD);
    } else {
      matcherRef.current = null;
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (cancelled) return;
        setModelsReady(true);
        await loadData();
        await startCamera();
        await refreshDevices();
      } catch (e) {
        setError("Yuz-tanish modellarini yuklashda xatolik: " + e.message);
      }
    })();
    return () => {
      cancelled = true;
      if (detectTimerRef.current) clearInterval(detectTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function refreshDevices() {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === 'videoinput'));
    } catch { /* ruxsat yo'q bo'lsa jim o'tkaziladi */ }
  }

  async function startCamera(deviceId) {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setSourceMode('webcam'); setIpError(''); setCameraReady(false);
      const constraints = { video: deviceId ? { deviceId: { exact: deviceId } } : { width: 640, height: 480 } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      setStatus('Yuz qidirilmoqda...');
      ensureDetectLoop();
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError("Kameraga ruxsat berilmagan. Brauzer manzil qatoridagi 🔒/🎥 belgisini bosib, bu sayt uchun kamerani \"Ruxsat berish\"ga o'zgartiring, so'ng sahifani yangilang. (Windows: Sozlamalar → Maxfiylik → Kamera'da brauzerga ruxsat berilganini ham tekshiring.)");
      } else if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') {
        setError("Kamera topilmadi. Agar noutbukda kamera bo'lmasa yoki band bo'lsa, \"IP kamera\" bo'limidan telefon kamerasini ulang.");
      } else if (e.name === 'NotReadableError') {
        setError("Kamerani boshqa dastur band qilib turibdi (Zoom, Teams va h.k.) — ularni yopib qayta urinib ko'ring.");
      } else {
        setError("Kameraga ulanib bo'lmadi: " + e.message);
      }
    }
  }

  async function switchCamera(deviceId) {
    setSelectedDeviceId(deviceId);
    await startCamera(deviceId);
  }

  function ensureDetectLoop() {
    if (!detectTimerRef.current) detectTimerRef.current = setInterval(detectLoop, DETECT_INTERVAL_MS);
  }

  function connectIpCamera() {
    const url = ipUrl.trim();
    if (!url) { setIpError('Manzilni kiriting'); return; }
    setIpError(''); setError(''); setCameraReady(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try { localStorage.setItem(IP_CAMERA_KEY, url); } catch { /* ignore */ }
    setSourceMode('ip');
    setStatus('IP kameraga ulanmoqda...');
    if (imgRef.current) imgRef.current.src = url;
    ensureDetectLoop();
  }

  function onIpImageLoad() { setCameraReady(true); setStatus('Yuz qidirilmoqda...'); }
  function onIpImageError() { setIpError("IP kameraga ulanib bo'lmadi — manzilni tekshiring."); setCameraReady(false); }

  function getActiveSource() {
    if (sourceMode === 'ip') {
      const img = imgRef.current;
      return img && img.complete && img.naturalWidth > 0 ? img : null;
    }
    const video = videoRef.current;
    return video && video.readyState === 4 ? video : null;
  }

  function getSourceSize(src) {
    return sourceMode === 'ip'
      ? { width: src.naturalWidth, height: src.naturalHeight }
      : { width: src.videoWidth, height: src.videoHeight };
  }

  // Joriy kadrni kichraytirib JPEG (base64) sifatida oladi — kirish/chiqish va xavfsizlik suratlari uchun.
  function captureFrameBase64(source) {
    try {
      const { width, height } = getSourceSize(source);
      if (!width || !height) return null;
      const scale = Math.min(1, 480 / width);
      const c = document.createElement('canvas');
      c.width = Math.round(width * scale);
      c.height = Math.round(height * scale);
      const ctx = c.getContext('2d');
      ctx.drawImage(source, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.7);
    } catch { return null; }
  }

  async function detectLoop() {
    const source = getActiveSource();
    const canvas = canvasRef.current;
    if (!source || !canvas) return;

    const displaySize = getSourceSize(source);
    if (canvas.width !== displaySize.width) faceapi.matchDimensions(canvas, displaySize);

    const detections = await faceapi
      .detectAllFaces(source, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resized = faceapi.resizeResults(detections, displaySize);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!resized.length) { setStatus('Yuz qidirilmoqda...'); return; }

    for (const det of resized) {
      const { x, y, width, height } = det.detection.box;
      let label = "Noma'lum";
      let color = '#E74C3C';

      if (matcherRef.current) {
        const match = matcherRef.current.findBestMatch(det.descriptor);
        if (match.label !== 'unknown') {
          const studentId = match.label;
          const enr = enrollments.find((e) => String(e.student_id) === studentId);
          label = enr?.student_name || 'Tanildi';
          color = '#2ECC71';
          handleRecognized(studentId, label, match.distance);
        } else if (mode === 'in') {
          // Faqat "Kirish" rejimida — begona (ro'yxatga olinmagan) yuz aniqlansa xavfsizlik ogohlantirishi.
          const now = Date.now();
          if (now - lastUnknownAlertRef.current > 60000) {
            lastUnknownAlertRef.current = now;
            const photo = captureFrameBase64(source);
            if (photo) api.post('/face/unknown', { photo }).then((row) => setSecurityLog((prev) => [row, ...prev])).catch(() => {});
          }
        }
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = color;
      ctx.font = 'bold 15px Inter, sans-serif';
      const textW = ctx.measureText(label).width;
      ctx.fillRect(x, y - 24, textW + 12, 24);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 6, y - 6);
    }
    setStatus(`${resized.length} ta yuz aniqlandi`);
  }

  const handleRecognized = useCallback((studentId, studentName, distance) => {
    const source = getActiveSource();
    const photo = source ? captureFrameBase64(source) : null;
    if (modeRef.current === 'in') {
      if (checkedInRef.current.has(studentId)) return;
      checkedInRef.current.add(studentId);
      api.post('/face/checkin', { student_id: studentId, student_name: studentName, distance, photo })
        .then((row) => {
          if (!row.duplicate) { setTodayLog((prev) => [row, ...prev]); setFlash({ name: studentName, action: 'kirdi' }); }
        })
        .catch(() => { checkedInRef.current.delete(studentId); });
    } else {
      if (checkedOutRef.current.has(studentId)) return;
      checkedOutRef.current.add(studentId);
      api.post('/face/checkout', { student_id: studentId, student_name: studentName, photo })
        .then((row) => {
          if (!row.duplicate) { setTodayLog((prev) => prev.map((c) => c.student_id === studentId ? row : c)); setFlash({ name: studentName, action: 'ketdi' }); }
        })
        .catch(() => { checkedOutRef.current.delete(studentId); });
    }
  }, []);

  async function removeSnapshot(id) {
    setSecurityLog((prev) => prev.filter((s) => s.id !== id));
    await api.del(`/face/unknown/${id}`).catch(() => {});
  }

  async function manualCheckout(row) {
    try {
      const updated = await api.post('/face/checkout', { student_id: row.student_id, student_name: row.student_name });
      checkedOutRef.current.add(row.student_id);
      setTodayLog((prev) => prev.map((c) => c.student_id === row.student_id ? updated : c));
    } catch (e) { alert(e.message); }
  }

  function openEnroll() {
    setEnrollStudentId(''); setEnrollSearch(''); setEnrollMsg(''); setEnrollModal(true);
  }

  async function saveDescriptor(descriptor) {
    const student = students.find((s) => s.id === Number(enrollStudentId));
    await api.post('/face/enrollments', {
      student_id: enrollStudentId, student_name: student?.full_name || '',
      descriptor: Array.from(descriptor),
    });
    setEnrollMsg('✅ Saqlandi!');
    await loadData();
    setTimeout(() => setEnrollModal(false), 900);
  }

  async function captureAndEnroll() {
    if (!enrollStudentId) { setEnrollMsg("O'quvchini tanlang"); return; }
    const source = getActiveSource();
    if (!source) { setEnrollMsg('Kamera tayyor emas'); return; }
    setEnrollSaving(true); setEnrollMsg('');
    try {
      const detection = await faceapi.detectSingleFace(source, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks().withFaceDescriptor();
      if (!detection) { setEnrollMsg("Yuz aniqlanmadi — kameraga to'g'ri qarang va qayta urinib ko'ring."); setEnrollSaving(false); return; }
      await saveDescriptor(detection.descriptor);
    } catch (e) { setEnrollMsg('❌ ' + e.message); }
    setEnrollSaving(false);
  }

  async function enrollFromPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!enrollStudentId) { setEnrollMsg("Avval o'quvchini tanlang"); return; }
    setEnrollSaving(true); setEnrollMsg('');
    try {
      const img = await faceapi.bufferToImage(file);
      const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks().withFaceDescriptor();
      if (!detection) { setEnrollMsg("Rasmda yuz aniqlanmadi — boshqa rasm tanlang."); setEnrollSaving(false); return; }
      await saveDescriptor(detection.descriptor);
    } catch (e) { setEnrollMsg('❌ ' + e.message); }
    setEnrollSaving(false);
  }

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const enrolledIds = new Set(enrollments.map((e) => String(e.student_id)));
  const notEnrolled = students.filter((s) => !enrolledIds.has(String(s.id)));
  const filteredStudents = enrollSearch.trim()
    ? students.filter((s) => s.full_name.toLowerCase().includes(enrollSearch.toLowerCase()))
    : students;

  return (
    <div>
      <PageHeader icon={ScanFace} title="Yuz orqali kirish" subtitle={`${enrollments.length}/${students.length} o'quvchi ro'yxatga olingan · haqiqiy yuz-tanish (face recognition)`}
        actions={<button className="btn-gold" onClick={openEnroll}><UserPlus size={16} /> Yuz qo'shish</button>} />

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => { setError(''); startCamera(selectedDeviceId); }} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0">Qayta urinish</button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Camera size={18} className="text-gold" />
            <h3 className="font-display text-lg text-navy-800">Kamera</h3>

            {/* Kirish / Chiqish rejimi */}
            <div className="flex rounded-xl border border-navy-100 overflow-hidden ml-2">
              <button onClick={() => setMode('in')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition ${mode === 'in' ? 'bg-emerald-500 text-white' : 'text-navy-500 hover:bg-navy-50'}`}>
                <LogIn size={13} /> Kirish
              </button>
              <button onClick={() => setMode('out')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition ${mode === 'out' ? 'bg-red-500 text-white' : 'text-navy-500 hover:bg-navy-50'}`}>
                <LogOut size={13} /> Chiqish
              </button>
            </div>

            <span className="text-xs text-navy-400 flex items-center gap-1.5 ml-auto">
              {!modelsReady || !cameraReady ? <Loader2 size={12} className="animate-spin" /> : <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              {status}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="flex rounded-xl border border-navy-100 overflow-hidden">
              <button onClick={() => startCamera(selectedDeviceId)} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition ${sourceMode === 'webcam' ? 'bg-navy-700 text-white' : 'text-navy-500 hover:bg-navy-50'}`}>
                <Laptop size={13} /> Noutbuk kamerasi
              </button>
              <button onClick={() => setSourceMode('ip')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition ${sourceMode === 'ip' ? 'bg-navy-700 text-white' : 'text-navy-500 hover:bg-navy-50'}`}>
                <Wifi size={13} /> IP kamera
              </button>
            </div>

            {sourceMode === 'webcam' && devices.length > 1 && (
              <select className="input !py-1.5 !w-auto text-xs" value={selectedDeviceId} onChange={(e) => switchCamera(e.target.value)}>
                <option value="">Standart kamera</option>
                {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Kamera ${i + 1}`}</option>)}
              </select>
            )}

            {sourceMode === 'ip' && (
              <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
                <input className="input !py-1.5 text-xs flex-1" placeholder="http://192.168.1.50:8080/video"
                  value={ipUrl} onChange={(e) => setIpUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && connectIpCamera()} />
                <button onClick={connectIpCamera} className="btn-gold !py-1.5 !px-3 text-xs shrink-0">Ulash</button>
              </div>
            )}
          </div>
          {sourceMode === 'ip' && (
            <p className="text-[11px] text-navy-400 mb-2">
              📱 <b>Telefon kamerasi ham shu orqali ulanadi:</b> telefoningizga <b>"IP Webcam"</b> (Android) yoki <b>"DroidCam"</b> ilovasini o'rnating, ilovada "Start server" bosing — ekranda chiqadigan manzilni (masalan <code>http://192.168.1.23:8080/video</code>) shu yerga kiriting. Telefon va kompyuter bir xil Wi-Fi tarmog'ida bo'lishi kerak.
            </p>
          )}
          {ipError && <p className="text-xs text-red-500 mb-3">{ipError}</p>}

          <div className="relative rounded-2xl overflow-hidden bg-navy-900" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} muted playsInline hidden={sourceMode !== 'webcam'} className="w-full h-full object-cover" />
            <img ref={imgRef} alt="IP kamera oqimi" hidden={sourceMode !== 'ip'} onLoad={onIpImageLoad} onError={onIpImageError} className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            {(!modelsReady || !cameraReady) && !error && (
              <div className="absolute inset-0 grid place-items-center bg-navy-900/70 text-white text-sm gap-2">
                <Loader2 size={24} className="animate-spin" />
                {status}
              </div>
            )}
            {flash && (
              <div className={`absolute top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-bold text-white shadow-lg animate-fade ${flash.action === 'kirdi' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                {flash.name} — {flash.action === 'kirdi' ? '✅ kirdi' : '👋 ketdi'}
              </div>
            )}
          </div>
          <p className="text-xs text-navy-400 mt-3">
            <b>Kirish</b> rejimida tanilgan o'quvchi "keldi" deb belgilanadi. <b>Chiqish</b> rejimiga o'tkazib qo'ysangiz, tanilgan o'quvchi "ketdi" deb belgilanadi. Har biri kuniga bir marta hisoblanadi.
          </p>
          <p className="text-xs text-navy-400 mt-1">
            📸 Kirish/chiqish paytida bitta kadr olinib ota-onaga Telegram orqali yuboriladi. <b>Kirish</b> rejimida ro'yxatga olinmagan (begona) yuz aniqlansa — kadr saqlanadi va xavfsizlik ogohlantirishiga obuna bo'lgan hisoblarga yuboriladi.
          </p>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><CheckCircle2 size={18} className="text-gold" /> Bugungi kirish-chiqish</h3>
            {todayLog.length === 0 ? (
              <p className="text-sm text-navy-400">Hali hech kim kirmadi</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {todayLog.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                    <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold shrink-0">{(c.student_name || '?')[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-navy-800 truncate">{c.student_name}</div>
                      <div className="text-[10px] text-navy-400 truncate">{c.group_name || '—'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-bold text-emerald-600">↳ {c.at?.slice(11, 16)}</div>
                      {c.left_at ? (
                        <div className="text-[10px] font-bold text-red-500">↴ {c.left_at.slice(11, 16)}</div>
                      ) : (
                        <button onClick={() => manualCheckout(c)} className="text-[9px] text-navy-400 hover:text-red-500 transition underline">chiqdi deb belgilash</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {securityLog.length > 0 && (
            <div className="card p-5 border border-red-100">
              <h3 className="font-display text-lg text-red-600 mb-4 flex items-center gap-2"><ShieldAlert size={18} /> Xavfsizlik jurnali — begona yuzlar</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto">
                {securityLog.map((s) => (
                  <div key={s.id} className="relative rounded-xl overflow-hidden bg-navy-900 group">
                    <img src={api.fileUrl(s.image_url)} alt="Begona yuz" className="w-full aspect-square object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate">{s.at?.slice(11, 16)}</div>
                    <button onClick={() => removeSnapshot(s.id)} className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition hover:bg-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Users size={18} className="text-gold" /> Ro'yxatga olinmagan</h3>
            {notEnrolled.length === 0 ? (
              <p className="text-sm text-navy-400">Hammasi ro'yxatga olingan 🎉</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {notEnrolled.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-navy-50">
                    <span className="text-navy-700 truncate">{s.full_name}</span>
                    <span className="text-[10px] text-navy-400 shrink-0">{s.group_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={enrollModal} title="O'quvchining yuzini ro'yxatga olish" onClose={() => setEnrollModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setEnrollModal(false)}>Yopish</button>
          <button className="btn-ghost" onClick={() => enrollFileRef.current?.click()} disabled={enrollSaving}>
            <Upload size={16} /> Rasm yuklash
          </button>
          <button className="btn-gold" onClick={captureAndEnroll} disabled={enrollSaving || !cameraReady}>
            {enrollSaving ? 'Saqlanmoqda...' : <><Video size={16} /> Kameradan olish</>}
          </button>
        </>}
      >
        <p className="text-sm text-navy-500 mb-4">O'quvchini tanlang, so'ng kameradan jonli surat oling yoki tayyor rasm faylini yuklang.</p>
        <input ref={enrollFileRef} type="file" accept="image/*" className="hidden" onChange={enrollFromPhoto} />
        <input className="input !py-2.5 mb-2" placeholder="O'quvchi qidirish..." value={enrollSearch} onChange={(e) => setEnrollSearch(e.target.value)} />
        <select className="input !py-2.5" value={enrollStudentId} onChange={(e) => setEnrollStudentId(e.target.value)} size={6}>
          {filteredStudents.length === 0 ? <option disabled>Topilmadi</option> : filteredStudents.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name} {enrolledIds.has(String(s.id)) ? '✓' : ''} — {s.group_name}</option>
          ))}
        </select>
        {enrollMsg && <p className="text-sm mt-3">{enrollMsg}</p>}
      </Modal>
    </div>
  );
}
