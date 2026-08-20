import express from 'express';
import { store, logAudit } from './db.js';
import { authRequired, canMutate } from './auth.js';
import { notifyForStudent } from './telegram.js';

// XSS himoya — HTML teglarni olib tashlash
function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      clean[k] = v.replace(/<script[^>]*>.*?<\/script>/gi, '')
                   .replace(/<[^>]+>/g, '')
                   .trim();
    } else { clean[k] = v; }
  }
  return clean;
}

// Builds a full REST router (list/get/create/update/delete) for one table.
export function crudRouter(table, columns) {
  const r = express.Router();
  r.use(authRequired);

  // LIST (?q= search, ?limit=)
  r.get('/', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
    res.json(store.list(table, { q: req.query.q, limit }));
  });

  r.get('/count', (_req, res) => res.json({ count: store.count(table) }));

  r.get('/:id', (req, res) => {
    const row = store.get(table, req.params.id);
    if (!row) return res.status(404).json({ error: 'Topilmadi' });
    res.json(row);
  });

  r.post('/', canMutate, (req, res) => {
    const row = {};
    for (const c of columns) row[c] = (c in req.body) ? req.body[c] : '';
    const created = store.insert(table, row);
    logAudit(req.user.name, `create ${table}`, `#${created.id}`);
    res.status(201).json(created);
  });

  r.put('/:id', canMutate, (req, res) => {
    const patch = {};
    for (const c of columns) if (c in req.body) patch[c] = req.body[c];
    const updated = store.update(table, req.params.id, patch);
    if (!updated) return res.status(404).json({ error: 'Topilmadi' });
    logAudit(req.user.name, `update ${table}`, `#${req.params.id}`);
    res.json(updated);
  });

  r.delete('/:id', canMutate, (req, res) => {
    store.remove(table, req.params.id);
    logAudit(req.user.name, `delete ${table}`, `#${req.params.id}`);
    res.json({ ok: true });
  });

  return r;
}

// crudRouter bilan bir xil, faqat har bir yangi qatorda ("student" ustuni orqali) ota-onaga
// Telegram xabari yuboradi — bonus/sovrin turidagi jadvallar (kunlik bonus, mystery box va h.k.) uchun.
export function rewardCrudRouter(table, columns, textFn) {
  const r = express.Router();
  r.use(authRequired);

  r.get('/', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
    res.json(store.list(table, { q: req.query.q, limit }));
  });
  r.get('/count', (_req, res) => res.json({ count: store.count(table) }));
  r.get('/:id', (req, res) => {
    const row = store.get(table, req.params.id);
    if (!row) return res.status(404).json({ error: 'Topilmadi' });
    res.json(row);
  });

  r.post('/', canMutate, (req, res) => {
    const row = {};
    for (const c of columns) row[c] = (c in req.body) ? req.body[c] : '';
    const created = store.insert(table, row);
    logAudit(req.user.name, `create ${table}`, `#${created.id}`);
    const student = store.all('students').find((s) => s.full_name === created.student);
    if (student) {
      const text = textFn(created);
      if (text) notifyForStudent(student.id, text).catch(() => {});
    }
    res.status(201).json(created);
  });

  r.put('/:id', canMutate, (req, res) => {
    const patch = {};
    for (const c of columns) if (c in req.body) patch[c] = req.body[c];
    const updated = store.update(table, req.params.id, patch);
    if (!updated) return res.status(404).json({ error: 'Topilmadi' });
    logAudit(req.user.name, `update ${table}`, `#${req.params.id}`);
    res.json(updated);
  });

  r.delete('/:id', canMutate, (req, res) => {
    store.remove(table, req.params.id);
    logAudit(req.user.name, `delete ${table}`, `#${req.params.id}`);
    res.json({ ok: true });
  });

  return r;
}
