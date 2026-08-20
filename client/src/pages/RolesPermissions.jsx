import { Fragment, useState } from 'react';
import { KeyRound, RotateCcw } from 'lucide-react';
import { PageHeader } from '../components/ui.jsx';
import { MENU, canAccess } from '../config/menu.js';
import { ROLES, ROLE_LABEL, roleColor } from '../config/roles.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../lib/api.js';

const CAN_EDIT_ROLES = ['founder', 'director', 'super_admin'];

export default function RolesPermissions() {
  const { user, roleOverrides, reloadRoleOverrides } = useAuth();
  const canEdit = CAN_EDIT_ROLES.includes(user.role);
  const [busy, setBusy] = useState(null); // `${role}|${key}` currently saving

  function overrideFor(role, key) {
    return roleOverrides?.find((o) => o.role === role && o.menu_key === key);
  }

  async function toggleCell(role, item) {
    if (!canEdit || busy) return;
    const cellId = `${role}|${item.key}`;
    setBusy(cellId);
    try {
      const current = canAccess(role, item);
      await api.post('/role-overrides', { role, menu_key: item.key, allowed: !current });
      await reloadRoleOverrides();
    } catch (e) { alert(e.message); }
    setBusy(null);
  }

  async function resetAll() {
    if (!canEdit || !roleOverrides?.length) return;
    if (!confirm(`${roleOverrides.length} ta qo'lda o'zgartirilgan ruxsatni standart holatga qaytarasizmi?`)) return;
    for (const o of roleOverrides) {
      await api.del(`/role-overrides/${o.role}/${o.menu_key}`).catch(() => {});
    }
    await reloadRoleOverrides();
  }

  return (
    <div>
      <PageHeader icon={KeyRound} title="Rollar & Ruxsatlar"
        subtitle={canEdit ? "18 rol × modul kirish matritsasi — katakchani bosib yoqing/o'chiring" : "18 rol × modul kirish matritsasi (Director/Super Admin/Admin — barchasi ochiq)"}
        actions={canEdit && roleOverrides?.length > 0 && (
          <button className="btn-ghost" onClick={resetAll}><RotateCcw size={16} /> Standartga qaytarish ({roleOverrides.length})</button>
        )} />

      <div className="flex flex-wrap gap-2 mb-5">
        {ROLES.map((r) => <span key={r} className={`chip ${roleColor(r)}`}>{ROLE_LABEL[r]}</span>)}
      </div>

      <div className="card overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="bg-navy-50/60">
              <th className="sticky left-0 bg-navy-50/60 px-3 py-3 text-left font-semibold text-navy-500 min-w-[180px]">Modul</th>
              {ROLES.map((r) => (
                <th key={r} className="px-2 py-3 font-semibold text-navy-400 whitespace-nowrap">
                  <div className="rotate-0 text-[10px]">{ROLE_LABEL[r]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MENU.map((g) => (
              <Fragment key={g.group}>
                <tr className="bg-gold/5">
                  <td colSpan={ROLES.length + 1} className="sticky left-0 px-3 py-1.5 font-bold text-gold-700 text-[11px] uppercase tracking-wide bg-gold/5">{g.group}</td>
                </tr>
                {g.items.map((it) => (
                  <tr key={it.key} className="border-b border-navy-50 hover:bg-navy-50/40">
                    <td className="sticky left-0 bg-white px-3 py-2 text-navy-700 whitespace-nowrap">{it.label}</td>
                    {ROLES.map((r) => {
                      const allowed = canAccess(r, it);
                      const override = overrideFor(r, it.key);
                      const cellId = `${r}|${it.key}`;
                      return (
                        <td key={r} className="px-2 py-2 text-center">
                          <button
                            onClick={() => toggleCell(r, it)}
                            disabled={!canEdit || busy === cellId}
                            title={override ? "Qo'lda o'zgartirilgan — bosib almashtiring" : (canEdit ? 'Bosib yoqing/o\'chiring' : '')}
                            className={`w-5 h-5 rounded ${canEdit ? 'cursor-pointer hover:scale-125' : ''} transition-transform ${
                              override ? 'ring-2 ring-gold ring-offset-1 rounded-full' : ''} ${busy === cellId ? 'opacity-40' : ''}`}>
                            {allowed
                              ? <span className="text-emerald-500 font-bold">✓</span>
                              : <span className="text-navy-200">·</span>}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-navy-400 mt-4">
        ✓ = ushbu rol modulni ko'ra oladi. {canEdit
          ? <>Katakchani bosib o'zgartirasiz — <span className="inline-block w-3 h-3 rounded-full ring-2 ring-gold ring-offset-1 align-middle" /> belgili katakchalar qo'lda o'zgartirilgan (standartdan farqli).</>
          : <>Faqat Founder/Director/Super Admin o'zgartira oladi.</>}
      </p>
    </div>
  );
}
