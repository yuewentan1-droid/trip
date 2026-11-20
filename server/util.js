exports.ok = (res, data = null) => res.json({ code: 0, msg: 'ok', data });
exports.err = (res, msg, code = 1) => res.json({ code, msg });
exports.sealed = (res) => res.json({ code: 403, msg: '这块地已经封存了' });
