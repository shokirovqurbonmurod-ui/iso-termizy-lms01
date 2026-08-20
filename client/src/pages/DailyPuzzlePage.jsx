import { useEffect, useState } from 'react';
import { Puzzle, Check, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

export default function DailyPuzzlePage() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const [data, setData] = useState(null);
  const [choice, setChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const d = await api.get('/daily-puzzle/today').catch(() => null);
    setData(d);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (choice === null || busy) return;
    setError(''); setBusy(true);
    try {
      const res = await api.post('/daily-puzzle/answer', { choice });
      setResult(res);
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  if (data === null) return <Spinner />;

  const alreadyAnswered = data.answered || !!result;
  const shownCorrect = result ? result.correct : data.correct;
  const shownCorrectIndex = result?.correctIndex;

  return (
    <div>
      <PageHeader icon={Puzzle} title="Kunlik topishmoq" subtitle={`Har kuni yangi savol — to'g'ri topsangiz ${data.reward} coin yutasiz`} />

      <div className="max-w-xl mx-auto card p-8">
        <div className="text-xs text-navy-400 mb-2">{data.date}</div>
        <h2 className="font-display text-xl text-navy-800 mb-6">{data.question}</h2>

        {!isStudent && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">Topishmoqqa faqat o'quvchi hisobidan javob berish mumkin.</p>
        )}

        <div className="space-y-2 mb-6">
          {data.options.map((opt, i) => {
            const isChosen = choice === i;
            const isCorrectOpt = alreadyAnswered && shownCorrectIndex === i;
            const isWrongChosen = alreadyAnswered && isChosen && !shownCorrect;
            return (
              <button key={i} disabled={!isStudent || alreadyAnswered}
                onClick={() => setChoice(i)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm font-semibold transition flex items-center justify-between ${
                  isCorrectOpt ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
                  isWrongChosen ? 'border-red-300 bg-red-50 text-red-600' :
                  isChosen ? 'border-gold bg-gold/10 text-gold-700' :
                  'border-navy-100 text-navy-700 hover:border-gold/50'
                } ${(!isStudent || alreadyAnswered) ? 'cursor-default' : 'cursor-pointer'}`}>
                <span>{opt}</span>
                {isCorrectOpt && <Check size={16} />}
                {isWrongChosen && <X size={16} />}
              </button>
            );
          })}
        </div>

        {!alreadyAnswered && isStudent && (
          <button onClick={submit} disabled={choice === null || busy} className="btn-gold w-full py-2.5 justify-center">
            {busy ? 'Yuborilmoqda...' : 'Javobni yuborish'}
          </button>
        )}

        {alreadyAnswered && (
          <div className={`rounded-xl px-4 py-3 text-center font-semibold ${shownCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-navy-50 text-navy-500'}`}>
            {shownCorrect ? `🎉 To'g'ri! ${result?.reward || data.reward} coin yutdingiz!` : "Bugungi javobingiz noto'g'ri edi. Ertaga qayta urinib ko'ring!"}
          </div>
        )}

        {error && <p className="text-xs text-red-500 text-center mt-3">{error}</p>}
      </div>
    </div>
  );
}
