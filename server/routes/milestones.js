const r = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');
const { ok, err, sealed } = require('../util');

r.use(auth);

r.delete('/:id', async (req, res) => {
  const [rows] = await db.query(
    `SELECT m.*, s.user_id AS uid, s.status FROM milestones m JOIN sessions s ON s.id=m.session_id WHERE m.id=?`,
    [req.params.id]);
  const m = rows[0];
  if (!m || m.uid !== req.uid) return err(res, '没这个存档', 404);
  if (m.status === 'finished') return sealed(res);
  await db.query('DELETE FROM milestones WHERE id=?', [m.id]);
  ok(res);
});

module.exports = r;
