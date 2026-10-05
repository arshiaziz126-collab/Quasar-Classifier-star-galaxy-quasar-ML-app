import { useRef, useState } from 'react'
import { getRandom, predict, predictCsv, fmt } from '../lib/api'
import { gsap, prefersReducedMotion } from '../lib/motion'

const FIELDS = [
  ['u', 'u (ultraviolet)'], ['g', 'g (green)'], ['r', 'r (red)'],
  ['i', 'i (near-infrared)'], ['z', 'z (infrared)'], ['redshift', 'Redshift'],
]
const START = { u: '20.39', g: '19.97', r: '19.80', i: '19.73', z: '19.62', redshift: '2.031' }
const EXAMPLE_CSV = `u,g,r,i,z,redshift,class
23.88,22.28,20.40,19.17,18.79,0.634,GALAXY
19.43,17.58,16.88,16.63,16.48,-0.0001,STAR
20.39,19.97,19.80,19.73,19.62,2.031,QSO
22.07,21.43,20.11,19.37,18.95,0.412,GALAXY
18.95,18.20,17.95,17.88,17.80,1.142,QSO
17.21,16.02,15.61,15.47,15.40,0.0002,STAR`

const download = (name, text) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function SkyMap({ z, gr }) {
  const zz = Number.isFinite(z) ? Math.max(0, Math.min(5, z)) : 0
  const gg = Number.isFinite(gr) ? Math.max(-.5, Math.min(2, gr)) : 0
  const x = 40 + Math.sqrt(zz / 5) * 360, y = 280 - ((gg + .5) / 2.5) * 260
  return (
    <svg viewBox="0 0 420 320" role="img" aria-label={`Map of redshift against g minus r colour; your object sits at redshift ${zz.toFixed(2)} and colour ${gg.toFixed(2)}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
      <defs>
        <radialGradient id="rs"><stop offset="0%" stopColor="#F1D3A8" stopOpacity=".45" /><stop offset="100%" stopColor="#F1D3A8" stopOpacity="0" /></radialGradient>
        <radialGradient id="rg"><stop offset="0%" stopColor="#C08552" stopOpacity=".5" /><stop offset="100%" stopColor="#C08552" stopOpacity="0" /></radialGradient>
        <radialGradient id="rq"><stop offset="0%" stopColor="#D6693C" stopOpacity=".45" /><stop offset="100%" stopColor="#D6693C" stopOpacity="0" /></radialGradient>
        <radialGradient id="pt"><stop offset="0%" stopColor="#FFF6EA" /><stop offset="40%" stopColor="#E0B07A" /><stop offset="100%" stopColor="#E0B07A" stopOpacity="0" /></radialGradient>
      </defs>
      <g stroke="rgba(232,200,160,.12)"><line x1="40" y1="280" x2="400" y2="280" /><line x1="40" y1="20" x2="40" y2="280" /></g>
      <ellipse cx="46" cy="170" rx="22" ry="110" fill="url(#rs)" />
      <ellipse cx="150" cy="100" rx="95" ry="70" fill="url(#rg)" />
      <ellipse cx="285" cy="215" rx="130" ry="52" fill="url(#rq)" />
      <g fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="20"><text x="58" y="40" fill="#F1D3A8">stars</text><text x="168" y="56" fill="#E0B07A">galaxies</text><text x="300" y="168" fill="#E8906A">quasars</text></g>
      <g fontSize="11" fill="#8E7864" textAnchor="middle"><text x="40" y="298">0</text><text x="112" y="298">0.2</text><text x="201" y="298">1</text><text x="295" y="298">2.5</text><text x="400" y="298">5</text><text x="220" y="316">redshift</text></g>
      <text x="14" y="150" fontSize="11" fill="#8E7864" transform="rotate(-90 14 150)" textAnchor="middle">g − r</text>
      <circle cx={x} cy={y} r="26" fill="url(#pt)" style={{ transition: 'cx .5s, cy .5s' }} />
      <circle cx={x} cy={y} r="5" fill="#FFF6EA" style={{ transition: 'cx .5s, cy .5s' }} />
    </svg>
  )
}

export default function TryIt() {
  const [vals, setVals] = useState(START)
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [batch, setBatch] = useState(null)
  const [over, setOver] = useState(false)
  const ans = useRef(null)
  const fileIn = useRef(null)
  const num = (k) => parseFloat(vals[k])

  const animate = () => {
    if (!prefersReducedMotion() && ans.current) gsap.fromTo(ans.current, { y: 22, opacity: 0, filter: 'blur(8px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: .8, ease: 'expo.out' })
  }
  const classify = async (e) => {
    e?.preventDefault()
    const body = {}
    for (const [k, label] of FIELDS) {
      const v = parseFloat(vals[k])
      if (!Number.isFinite(v)) { setErr(`Enter a number for ${label}.`); return }
      body[k] = v
    }
    setBusy(true); setErr(null)
    try { setRes(await predict(body)); requestAnimationFrame(animate) } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  const random = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await getRandom()
      setVals(Object.fromEntries(FIELDS.map(([k]) => [k, String(r.input[k])])))
      setRes(r); requestAnimationFrame(animate)
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  const upload = async (file) => {
    if (!file) return
    setBusy(true); setErr(null)
    try { setBatch(await predictCsv(file)) } catch (e2) { setErr(e2.message); setBatch(null) } finally { setBusy(false); if (fileIn.current) fileIn.current.value = '' }
  }
  const resultsCsv = () => {
    const cols = ['u', 'g', 'r', 'i', 'z', 'redshift', 'prediction', 'confidence', ...(batch.rows[0]?.actual ? ['actual'] : [])]
    download('quasar_predictions.csv', [cols.join(','), ...batch.rows.map((r) => cols.map((c) => r[c] ?? '').join(','))].join('\n'))
  }

  return (
    <section className="sec" id="try" style={{ paddingTop: 20 }}>
      <div className="wrap">
        <p className="kicker" data-rise>Try it</p>
        <h2 className="h2 serif" data-rise>Point the telescope. <em className="it">Watch it decide.</em></h2>
        <p className="lead" data-rise>Type an object's brightness in five filters and its redshift, pull a real object from the survey, or upload a CSV of many.</p>

        <div className="console">
          <form className="ctrl glass" onSubmit={classify} data-pop noValidate>
            <div className="fields">
              {FIELDS.map(([k, label]) => (
                <label key={k}>{label}
                  <input type="number" inputMode="decimal" step="any" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
                </label>
              ))}
            </div>
            <div className="row">
              <button className="btn solid" type="submit" disabled={busy}>{busy ? 'Thinking…' : 'Classify'}</button>
              <button className="btn" type="button" onClick={random} disabled={busy}>Random object from the sky</button>
            </div>
            <label className={`drop${over ? ' over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]) }}>
              <b>Upload a CSV</b>
              <span>Columns u, g, r, i, z, redshift. Up to 5,000 rows. Add a "class" column to check accuracy.</span>
              <input ref={fileIn} type="file" accept=".csv,text/csv" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} onChange={(e) => upload(e.target.files[0])} />
            </label>
            <button type="button" className="link" onClick={() => download('example_objects.csv', EXAMPLE_CSV)}>Download an example CSV</button>
            {err && <p className="err" role="alert">{err}</p>}
          </form>

          <div className="out glass" data-pop aria-live="polite">
            <SkyMap z={num('redshift')} gr={num('g') - num('r')} />
            {res ? (
              <>
                <div className="verdict">
                  <span className="lbl">This is probably a</span>
                  <span className="ans" ref={ans}>{res.prediction.label.toLowerCase()}</span>
                  <div className="meta">
                    <span>{(res.confidence * 100).toFixed(1)}% sure</span>
                    {res.actual && <span className={`tag ${res.correct ? 'ok' : 'no'}`}>Really a {res.actual.label.toLowerCase()}: {res.correct ? 'correct' : 'missed'}</span>}
                  </div>
                </div>
                <div className="probs">
                  <h4>Probability</h4>
                  {res.probabilities.map((p) => (
                    <div className="bar" key={p.key}>
                      <div className="bar-t"><span>{p.label}</span><b>{(p.p * 100).toFixed(1)}%</b></div>
                      <div className="bar-x"><i style={{ width: `${p.p * 100}%`, transition: 'width .8s cubic-bezier(.16,1,.3,1)' }} /></div>
                    </div>
                  ))}
                </div>
                <div className="why">
                  <h4>Why (SHAP)</h4>
                  {res.explanation.slice(0, 4).map((x) => (
                    <div className="bar" key={x.factor}>
                      <div className="bar-t"><span>{x.factor}</span><b>{x.direction === 'for' ? `towards ${res.prediction.label.toLowerCase()}` : 'against it'}</b></div>
                      <div className="bar-x"><i className={x.direction === 'for' ? '' : 'against'} style={{ width: `${Math.max(4, x.share * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="verdict"><span className="lbl">Press Classify or pull a random object to see the model's answer.</span></div>
            )}
          </div>
        </div>

        {batch && (
          <div className="batch glass">
            <div className="batch-top">
              <h3>{fmt(batch.count)} objects classified</h3>
              <button className="btn" type="button" onClick={resultsCsv}>Download results</button>
            </div>
            <div className="chips">
              {Object.entries(batch.summary).map(([k, v]) => <span key={k} className="hi">{k}: {fmt(v)}</span>)}
              {batch.accuracy != null && <span className="hi">Accuracy on your file: {batch.accuracy}%</span>}
              {batch.skipped > 0 && <span>{batch.skipped} rows skipped</span>}
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>#</th><th>u</th><th>g</th><th>r</th><th>redshift</th><th>Prediction</th><th>Confidence</th>{batch.rows[0]?.actual && <th>Actual</th>}</tr></thead>
                <tbody>
                  {batch.rows.slice(0, 50).map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td><td className="num">{r.u}</td><td className="num">{r.g}</td><td className="num">{r.r}</td><td className="num">{r.redshift}</td>
                      <td><span className={`badge b-${r.prediction}`}>{r.prediction}</span></td>
                      <td className="num">{(r.confidence * 100).toFixed(1)}%</td>
                      {r.actual && <td>{r.actual}{r.actual === r.prediction ? '' : ' ✗'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {batch.rows.length > 50 && <p className="lead" style={{ fontSize: 14, marginTop: 0 }}>Showing the first 50 rows. Download the results for all of them.</p>}
          </div>
        )}
      </div>
    </section>
  )
}
