const express = require('express');
const router = express.Router();



function toDateOnlyString(val) {
  if (!val) return null;
  
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }
  
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())}`;
  }
  
  // String with time component "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DD HH:mm:ss"
  if (typeof val === 'string') {
    const s = val.trim();
    if (s.includes('T')) return s.slice(0, 10);
    if (s.includes(' ')) return s.slice(0, 10);
    return s.slice(0, 10);
  }
  
  return null;
}

function normalizeLead(row) {
  if (!row) return row;

  let tags = [];
  if (Array.isArray(row.tags)) {
    tags = row.tags;
  } else if (typeof row.tags === 'string' && row.tags.trim().length > 0) {
    try { tags = JSON.parse(row.tags); } catch { tags = []; }
  }

  // createdAt — keep as ISO string for sorting
  let createdAt = row.createdAt || row.created_at || null;
  if (createdAt instanceof Date) createdAt = createdAt.toISOString();

  return {
    ...row,
    tags,
    createdAt,
    followUp: toDateOnlyString(row.followUp || row.follow_up) || '',
    assignedTo: row.assignedTo || row.assigned_to || '',
    email: row.email || '',
    contact: row.contact || '',
    source: row.source || '',
    status: row.status || 'new',
    name: row.name || '',
  };
}

/* GET ALL LEADS */
router.get('/', async (req, res) => {
  const db = await req.db;
  try {
    const { status, search, tag } = req.query;
    let query = 'SELECT * FROM leads';
    const conditions = [];
    const values = [];

    if (status && status !== 'all') { conditions.push('status = ?'); values.push(status); }
    if (search && search.trim().length > 0) {
      conditions.push('(name LIKE ? OR contact LIKE ? OR email LIKE ?)');
      const s = `%${search.trim()}%`;
      values.push(s, s, s);
    }
    if (tag && tag !== 'all') { conditions.push('tags LIKE ?'); values.push(`%"${tag}"%`); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY createdAt DESC';

    const [rows] = await db.query(query, values);
    res.json(rows.map(normalizeLead));
  } catch (err) {
    console.error('GET /leads failed:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

/* GET SINGLE LEAD */
router.get('/:id', async (req, res) => {
  const db = await req.db;
  try {
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json(normalizeLead(rows[0]));
  } catch (err) {
    console.error('GET /leads/:id failed:', err);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

/* ADD LEAD */
router.post('/', async (req, res) => {
  const db = await req.db;
  const { name, contact, email, source, status, assignedTo, followUp, tags } = req.body;
  try {
    // Store NULL if empty — avoids "0000-00-00" invalid date in MySQL
    const followUpValue = followUp && String(followUp).trim() !== '' ? followUp : null;
    const [result] = await db.query(
      'INSERT INTO leads (name, contact, email, source, status, assignedTo, followUp, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name||'', contact||'', email||'', source||'', status||'new', assignedTo||'', followUpValue, JSON.stringify(Array.isArray(tags) ? tags : [])]
    );
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [result.insertId]);
    res.json(normalizeLead(rows[0]));
  } catch (err) {
    console.error('POST /leads failed:', err);
    res.status(500).json({ error: 'Failed to add lead' });
  }
});

/* UPDATE LEAD */
router.put('/:id', async (req, res) => {
  const db = await req.db;
  const { id } = req.params;
  const { name, contact, email, source, status, assignedTo, followUp, tags } = req.body;
  try {
    const followUpValue = followUp && String(followUp).trim() !== '' ? followUp : null;
    await db.query(
      'UPDATE leads SET name=?, contact=?, email=?, source=?, status=?, assignedTo=?, followUp=?, tags=? WHERE id=?',
      [name||'', contact||'', email||'', source||'', status||'new', assignedTo||'', followUpValue, JSON.stringify(Array.isArray(tags) ? tags : []), id]
    );
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json(normalizeLead(rows[0]));
  } catch (err) {
    console.error('PUT /leads/:id failed:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

/* DELETE LEAD */
router.delete('/:id', async (req, res) => {
  const db = await req.db;
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM leads WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /leads/:id failed:', err);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;