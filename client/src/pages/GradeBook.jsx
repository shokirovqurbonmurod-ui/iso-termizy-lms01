import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

function scoreColor(score, max) {
  const pct = max ? (score / max) * 100 : score;
  if (pct >= 85) return 'text-emerald-600 bg-emerald-50';
  if (pct >= 60) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

export default function GradeBook() {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [modal, setModal] = useState(false);
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);

  async function loadBase() {
    const [g, s] = await Promise.all([api.get('/groups').catch(() => []), api.get('/students').catch(() => [])]);
    setGroups(g || []); setStudents(s || []);
    if (g?.length && !groupName) setGroupName(g[0].name);
  }
  useEffect(() => { loadBase(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadResults() { setResults(await api.get('/exam_results?limit=2000').catch(() => [])); }
  useEffect(() => { loadResults(); }, []);

  const roster = useMemo(() => students.filter((s) => s.group_name === groupName), [students, groupName]);
  const rosterNames = useMemo(() => new Set(roster.map((s) => s.full_name)), [roster]);

  const groupResults = useMemo(() => (results || []).filter((r) => rosterNames.has(r.student)), [results, rosterNames]);
  const exams = useMemo(() => [...new Set(groupResults.map((r) => r.exam))], [groupResults]);

  const matrix = useMemo(() => {
    const m = {};
    for (const r of groupResults) {
      if (!m[r.student]) m[r.student] = {};
      m[r.student][r.exam] = r;
    }
    return m;
  }, [groupResults]);

  const examAvg = (exam) => {
    const vals = groupResults.filter((r) => r.exam === exam).map((r) => Number(r.score) || 0);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };
  const studentAvg = (name) => {
    const vals = groupResults.filter((r) => r.student === name).map((r) => Number(r.score) || 0);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };

  function openAddExam() {
    setExamName(''); setExamDate(new Date().toISOString().slice(0, 10));
    setScores(Object.fromEntries(roster.map((s) => [s.full_name, ''])));
    setModal(true);
  }

  async function saveExam() {
    if (!examName.trim()) return;
    setSaving(true);
    try {
      await Promise.all(roster.map((s) => {
        const score = scores[s.full_name];
        if (score === '' || score == null) return null;
        return api.post('/exam_results', { student: s.full_name, exam: examName.trim(), score: Number(score), grade: '', date: examDate, status: 'done' });
      }));
      setModal(false);
      await loadResults();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader icon={BookOpen} title="Baholar kitobi" subtitle="Guruh bo'yicha barcha imtihon natijalari — jadval ko'rinishida"
        actions={roster.length > 0 && <button className="btn-gold" onClick={openAddExam}><Plus size={16} /> Yangi imtihon</button>} />

      <div className="mb-5">
        <select className="input !py-2.5 !w-auto" value={groupName} onChange={(e) => setGroupName(e.target.value)}>
          {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
        </select>
      </div>

      {results === null ? <Spinner /> : roster.length === 0 ? (
        <Empty icon={BookOpen} title="Bu guruhda o'quvchi yo'q" />
      ) : exams.length === 0 ? (
        <Empty icon={BookOpen} title="Hali imtihon natijasi yo'q" hint="Yuqoridagi 'Yangi imtihon' tugmasi bilan qo'shing" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-navy-50/70">
                  <th className="sticky left-0 bg-navy-50/70 px-3 py-2.5 text-left font-bold text-navy-500 min-w-[180px] z-10">O'QUVCHI</th>
                  {exams.map((e) => (
                    <th key={e} className="px-3 py-2.5 font-bold text-navy-500 text-center min-w-[110px]">
                      {e}
                      <div className="text-[9px] font-normal text-navy-400 mt-0.5">o'rt: {examAvg(e)}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-bold text-gold-600 text-center min-w-[80px]">O'RTACHA</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.id} className="border-b border-navy-50 hover:bg-gold/[.02]">
                    <td className="sticky left-0 bg-white px-3 py-2 font-semibold text-navy-800 whitespace-nowrap">{s.full_name}</td>
                    {exams.map((e) => {
                      const cell = matrix[s.full_name]?.[e];
                      return (
                        <td key={e} className="px-3 py-2 text-center">
                          {cell ? <span className={`chip text-[11px] font-bold ${scoreColor(Number(cell.score), 100)}`}>{cell.score}{cell.grade ? ` (${cell.grade})` : ''}</span> : <span className="text-navy-200">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-bold text-gold-700">{studentAvg(s.full_name)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modal} title="Yangi imtihon natijalari" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={saveExam} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="label">Imtihon nomi</label>
            <input className="input !py-2.5" placeholder="Masalan: Progress Test — Unit 4" value={examName} onChange={(e) => setExamName(e.target.value)} />
          </div>
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
        </div>
        <label className="label mb-2">Natijalar (bo'sh qoldirilsa — o'quvchi kiritilmaydi)</label>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {roster.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-navy-700 truncate">{s.full_name}</span>
              <input className="input !py-1.5 !w-24 text-sm" type="number" onWheel={(e) => e.target.blur()}
                value={scores[s.full_name] ?? ''} onChange={(e) => setScores({ ...scores, [s.full_name]: e.target.value })} />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
