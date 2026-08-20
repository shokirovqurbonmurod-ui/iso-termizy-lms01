import { useEffect, useMemo, useState } from 'react';
import { Clock, LogIn, LogOut, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { isAdmin } from '../config/roles.js';

function fmtTime(ts) { return ts ? ts.slice(11, 16) : '—'; }

export default function WorkHoursTracker() {
  const { user } = useAuth();
  const admin = isAdmin(user.role);
  const [todayRow, setTodayRow] = useState(null);
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [t, all] = await Promise.all([
      api.get('/work-hours/today').catch(() => null),
      api.get('/work-hours?limit=500').catch(() => []),
    ]);
    setTodayRow(t);
    setRows(all || []);
  }
  useEffect(() => { load(); }, []);

  async function clockIn() {
    setBusy(true);
    try { setTodayRow(await api.post('/work-hours/clock-in', {})); await load(); }
    catch (e) { alert(e.message); }
    setBusy(false);
  }
  async function clockOut() {
    setBusy(true);
    try { setTodayRow(await api.post('/work-hours/clock-out', {})); await load(); }
    catch (e) { alert(e.message); }
    setBusy(false);
  }

  const thisMonth = useMemo(() => {
    const prefix = new Date().toISOString().slice(0, 7);
    return (rows || []).filter((r) => r.date.startsWith(prefix));
  }, [rows]);

  const myMonthRows = useMemo(() => thisMonth.filter((r) => r.staff === user.full_name), [thisMonth, user.full_name]);
  const myTotalHours = myMonthRows.reduce((a, r) => a + (Number(r.hours) || 0), 0);

  const byStaff = useMemo(() => {
    const map = {};
    for (const r of thisMonth) {
      if (!map[r.staff]) map[r.staff] = { staff: r.staff, days: 0, hours: 0 };
      map[r.staff].days += 1;
      map[r.staff].hours += Number(r.hours) || 0;
    }
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [thisMonth]);

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Clock} title="Ish vaqti tracker" subtitle="Ishga kelish/ketishni belgilang — oylik hisobot avtomatik yig'iladi" />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <div className="grid place-items-center w-16 h-16 rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-lg mx-auto mb-4">
            <Clock size={26} />
          </div>
          <div className="font-display text-2xl text-navy-800 mb-1">
            {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xs text-navy-400 mb-5">{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}</div>

          {!todayRow ? (
            <button onClick={clockIn} disabled={busy} className="btn-gold w-full justify-center py-3"><LogIn size={18} /> Ishga keldim</button>
          ) : !todayRow.clock_out ? (
            <>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 mb-3 text-sm text-emerald-700">
                ✅ Kelgan vaqt: <b>{fmtTime(todayRow.clock_in)}</b>
              </div>
              <button onClick={clockOut} disabled={busy} className="btn-ghost w-full justify-center py-3 !border-red-200 !text-red-500 hover:!bg-red-50"><LogOut size={18} /> Ishdan ketdim</button>
            </>
          ) : (
            <div className="rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-600">
              ✅ {fmtTime(todayRow.clock_in)} — {fmtTime(todayRow.clock_out)}<br />
              <span className="font-bold text-navy-800">{todayRow.hours} soat</span> ishladingiz
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-display text-lg text-navy-800 mb-4">Mening bu oyim</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-navy-50/60 px-4 py-3 text-center">
              <div className="font-display text-2xl text-navy-800">{myMonthRows.length}</div>
              <div className="text-[10px] text-navy-400">Ish kuni</div>
            </div>
            <div className="rounded-xl bg-navy-50/60 px-4 py-3 text-center">
              <div className="font-display text-2xl text-gold-600">{myTotalHours.toFixed(1)}</div>
              <div className="text-[10px] text-navy-400">Jami soat</div>
            </div>
          </div>
          {myMonthRows.length === 0 ? <p className="text-sm text-navy-400">Bu oyda hali yozuv yo'q</p> : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {myMonthRows.slice().reverse().map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs rounded-lg bg-navy-50/40 px-3 py-2">
                  <span className="text-navy-600">{r.date}</span>
                  <span className="text-navy-500">{fmtTime(r.clock_in)} – {fmtTime(r.clock_out)}</span>
                  <span className="font-bold text-navy-800">{r.hours ?? '—'} soat</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {admin && (
          <div className="card p-6">
            <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Users size={18} className="text-gold" /> Xodimlar (bu oy)</h3>
            {byStaff.length === 0 ? <Empty icon={Clock} title="Hali yozuv yo'q" /> : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {byStaff.map((s) => (
                  <div key={s.staff} className="flex items-center justify-between text-sm rounded-lg bg-navy-50/60 px-3 py-2">
                    <span className="font-semibold text-navy-700 truncate">{s.staff}</span>
                    <span className="text-[11px] text-navy-400 shrink-0">{s.days} kun</span>
                    <span className="font-bold text-gold-600 shrink-0">{s.hours.toFixed(1)} soat</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
