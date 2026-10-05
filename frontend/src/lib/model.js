// Runs the trained LightGBM model inside the browser, so the site needs no server.
// Files come from `python -m ml.export_web` (frontend/public/model/).

const BASE = `${import.meta.env.BASE_URL || '/'}model/`
const BANDS = ['u', 'g', 'r', 'i', 'z']
const INPUTS = [...BANDS, 'redshift']
const FRIENDLY = {
  redshift: 'Redshift', u_g: 'u − g colour', g_r: 'g − r colour', r_i: 'r − i colour', i_z: 'i − z colour',
  u: 'Brightness', g: 'Brightness', r: 'Brightness', i: 'Brightness', z: 'Brightness',
}
const MAX_ROWS = 5000

let loading = null
let M = null, META = null, SAMPLE = null

function load() {
  if (!loading) {
    const get = (f) => fetch(BASE + f).then((r) => {
      if (!r.ok) throw new Error(`Couldn't load ${f}. Run "python -m ml.export_web" and redeploy.`)
      return r.json()
    })
    loading = Promise.all([get('model.json'), get('meta.json'), get('sample.json')])
      .then(([m, meta, sample]) => { M = m; META = meta; SAMPLE = sample })
      .catch((e) => { loading = null; throw e })
  }
  return loading
}

/** Same checks as the API: magnitudes between 0 and 40, redshift between -0.1 and 10. */
function valid(o) {
  return INPUTS.every((k) => Number.isFinite(o[k])) &&
    BANDS.every((k) => o[k] > 0 && o[k] < 40) && o.redshift >= -0.1 && o.redshift <= 10
}

function featureRow(o) {
  return [o.u, o.g, o.r, o.i, o.z, o.redshift, o.u - o.g, o.g - o.r, o.r - o.i, o.i - o.z]
}

/** Walk every tree. Returns raw scores per class and, optionally, how much each feature moved them. */
function score(x, withContrib) {
  const K = M.num_class, F = M.features.length
  const raw = new Array(K).fill(0)
  const contrib = withContrib ? Array.from({ length: K }, () => new Array(F).fill(0)) : null
  M.trees.forEach((tr, ti) => {
    const k = ti % K
    let n = 0
    while (tr.f[n] !== -1) {
      const v = x[tr.f[n]]
      const next = Number.isNaN(v) ? (tr.d[n] ? tr.l[n] : tr.r[n]) : (v <= tr.t[n] ? tr.l[n] : tr.r[n])
      if (contrib) contrib[k][tr.f[n]] += tr.v[next] - tr.v[n]
      n = next
    }
    raw[k] += tr.v[n]
  })
  return { raw, contrib }
}

function softmax(z) {
  const m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / s)
}

const cls = (i) => ({ key: M.classes[i], label: M.labels[M.classes[i]] })

function predictValues(o) {
  const { raw, contrib } = score(featureRow(o), true)
  const p = softmax(raw)
  const k = p.indexOf(Math.max(...p))
  const grouped = {}
  M.features.forEach((f, j) => { grouped[FRIENDLY[f]] = (grouped[FRIENDLY[f]] || 0) + contrib[k][j] })
  const total = Object.values(grouped).reduce((s, v) => s + Math.abs(v), 0) || 1
  const explanation = Object.entries(grouped)
    .map(([factor, v]) => ({ factor, effect: +v.toFixed(3), share: +(Math.abs(v) / total).toFixed(3), direction: v > 0 ? 'for' : 'against' }))
    .sort((a, b) => b.share - a.share).slice(0, 5)
  return {
    prediction: cls(k),
    confidence: +p[k].toFixed(4),
    probabilities: p.map((v, i) => ({ ...cls(i), p: +v.toFixed(4) })),
    explanation,
    explanation_method: 'path-based contributions, a fast approximation of SHAP',
    input: Object.fromEntries(INPUTS.map((c) => [c, o[c]])),
  }
}

// ---------- the same functions the API offers ----------

export async function localMeta() {
  await load()
  return META
}

export async function localPredict(values) {
  await load()
  const o = Object.fromEntries(INPUTS.map((k) => [k, Number(values[k])]))
  if (!valid(o)) throw new Error('Those values look broken. Magnitudes should be between 0 and 40, and redshift between -0.1 and 10.')
  return predictValues(o)
}

export async function localRandom() {
  await load()
  const row = SAMPLE[Math.floor(Math.random() * SAMPLE.length)]
  const res = predictValues(row)
  res.actual = { key: row.class, label: M.labels[row.class] }
  res.correct = res.actual.key === res.prediction.key
  return res
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { header: [], rows: [] }
  const split = (l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
  return { header: split(lines[0]).map((h) => h.toLowerCase()), rows: lines.slice(1).map(split) }
}

export async function localPredictCsv(file) {
  await load()
  if (!/\.csv$/i.test(file.name || '')) throw new Error('Upload a .csv file with columns u, g, r, i, z and redshift.')
  if (file.size > 5_000_000) throw new Error('That file is over 5 MB. Upload a smaller one.')
  const { header, rows } = parseCsv(await file.text())
  const missing = INPUTS.filter((c) => !header.includes(c))
  if (missing.length) throw new Error(`Missing column(s): ${missing.join(', ')}. Needed: ${INPUTS.join(', ')}.`)
  if (rows.length > MAX_ROWS) throw new Error(`That file has ${rows.length.toLocaleString('en-IN')} rows. Upload up to ${MAX_ROWS.toLocaleString('en-IN')} at a time.`)
  const at = Object.fromEntries(header.map((h, i) => [h, i]))
  const hasClass = 'class' in at
  const out = []
  let skipped = 0
  for (const r of rows) {
    const o = Object.fromEntries(INPUTS.map((c) => [c, parseFloat(r[at[c]])]))
    if (!valid(o)) { skipped++; continue }
    const p = softmax(score(featureRow(o), false).raw)
    const k = p.indexOf(Math.max(...p))
    const row = { ...Object.fromEntries(INPUTS.map((c) => [c, o[c]])), prediction: cls(k).label, confidence: +p[k].toFixed(4) }
    const actual = hasClass ? String(r[at.class]).toUpperCase() : null
    if (actual && M.labels[actual]) row.actual = M.labels[actual]
    out.push(row)
  }
  if (!out.length) throw new Error('No usable rows found. Each row needs u, g, r, i, z and redshift as numbers.')
  const summary = Object.fromEntries(M.classes.map((c) => [M.labels[c], out.filter((r) => r.prediction === M.labels[c]).length]))
  const result = { count: out.length, skipped, summary, rows: out }
  if (out.every((r) => r.actual)) result.accuracy = +(out.filter((r) => r.actual === r.prediction).length / out.length * 100).toFixed(2)
  return result
}
