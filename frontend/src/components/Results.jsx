import { useLayoutEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '../lib/motion'

const ORDER = ['STAR', 'GALAXY', 'QSO']
const KEYS = ['GALAXY', 'QSO', 'STAR']      // order used by the model and the confusion matrix
const RING = { STAR: '#F1D3A8', GALAXY: '#C08552', QSO: '#D6693C' }
const C = 2 * Math.PI * 52

export default function Results({ meta }) {
  const root = useRef(null)
  const acc = useRef(null)
  const best = meta.models.find((m) => m.chosen) || meta.models[0]
  const top = Math.max(...meta.models.map((m) => m.accuracy))
  const cls = (k) => meta.classes.find((c) => c.key === k)
  const cm = (a, b) => meta.confusion_pct[KEYS.indexOf(a)][KEYS.indexOf(b)]
  let slip = { a: 'QSO', b: 'GALAXY', v: 0 }
  ORDER.forEach((a) => ORDER.forEach((b) => { if (a !== b && cm(a, b) > slip.v) slip = { a, b, v: cm(a, b) } }))
  const imp = meta.importance.slice(0, 4), maxImp = imp[0]?.share || 1

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      const o = { v: 0 }
      gsap.from(acc.current, { yPercent: 100, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.b-acc', start: 'top 80%' } })
      gsap.to(o, { v: best.accuracy, duration: 2.6, ease: 'expo.out', scrollTrigger: { trigger: '.b-acc', start: 'top 80%' }, onUpdate: () => { acc.current.textContent = o.v.toFixed(1) } })
      acc.current.textContent = '0.0'
      gsap.utils.toArray('.rv').forEach((c, i) => {
        const len = C * parseFloat(c.dataset.pct) / 100
        gsap.fromTo(c, { attr: { 'stroke-dasharray': `0 ${C}` } }, { attr: { 'stroke-dasharray': `${len} ${C}` }, duration: 2.2, ease: 'expo.out', delay: i * .15, scrollTrigger: { trigger: '.rings', start: 'top 85%' } })
      })
      gsap.from('.cell', { scale: .5, opacity: 0, duration: 1, ease: 'back.out(1.6)', stagger: .05, scrollTrigger: { trigger: '.cm', start: 'top 85%' } })
      gsap.utils.toArray('.b-shap .bar-x i').forEach((el) => gsap.from(el, { scaleX: 0, transformOrigin: 'left center', duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' } }))
    }, root)
    return () => ctx.revert()
  }, [best.accuracy])

  const names = { STAR: 'Star', GALAXY: 'Galaxy', QSO: 'Quasar' }
  return (
    <section className="sec" id="results" style={{ paddingTop: 20 }} ref={root}>
      <div className="wrap">
        <p className="kicker" data-rise>Results</p>
        <h2 className="h2 serif" data-rise>Right <em className="it">{Math.round(best.accuracy)} times</em> in a hundred.</h2>
        <p className="lead" data-rise>
          Tested on {meta.test_rows.toLocaleString('en-IN')} objects the model never saw while training.
          {meta.data_source === 'demo' && ' These numbers come from synthetic demo data.'}
        </p>
        <div className="bento">
          <div className="b glass b-acc" data-pop>
            <small>{best.name} accuracy</small>
            <div className="acc"><span ref={acc}>{best.accuracy.toFixed(1)}</span><sup>%</sup></div>
            <small style={{ textTransform: 'none', letterSpacing: 0 }}>
              Macro F1 {best.macro_f1.toFixed(3)}{top > best.accuracy ? `. Best of the three: ${top}%.` : ''}
            </small>
          </div>
          <div className="b glass b-rings" data-pop>
            <small>Found correctly, per class</small>
            <div className="rings">
              {ORDER.map((k) => (
                <div className="ring" key={k}>
                  <svg viewBox="0 0 120 120" aria-hidden="true">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(232,200,160,.1)" strokeWidth="4" />
                    <circle className="rv" data-pct={cls(k).recall} cx="60" cy="60" r="52" fill="none" stroke={RING[k]} strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={`${C * cls(k).recall / 100} ${C}`} transform="rotate(-90 60 60)" />
                    <text x="60" y="69" textAnchor="middle" fontFamily="Instrument Serif, serif" fontSize="28" fill="#F3E7DA">{cls(k).recall}</text>
                  </svg>
                  <b>{names[k]}s</b><span>recall %</span>
                </div>
              ))}
            </div>
          </div>
          <div className="b glass b-cm" data-pop>
            <small>Confusion matrix, % of each true class</small>
            <div className="cm" role="img" aria-label="Confusion matrix of true class against predicted class">
              <span />{ORDER.map((k) => <span key={k} className="h">{names[k]}</span>)}
              {ORDER.map((a) => (
                <div key={a} style={{ display: 'contents' }}>
                  <span className="r">{names[a]}</span>
                  {ORDER.map((b) => {
                    const v = cm(a, b), diag = a === b
                    return <span key={b} className="cell" style={{ background: diag ? `rgba(224,176,122,${(.2 + v / 250).toFixed(2)})` : `rgba(214,105,60,${Math.min(.05 + v / 40, .4).toFixed(2)})`, color: diag ? '#1A120B' : undefined }}>{v}</span>
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="b glass b-shap" data-pop>
            <small>Most useful clues (SHAP)</small>
            {imp.map((f) => (
              <div className="bar" key={f.factor}>
                <div className="bar-t"><span>{f.factor}</span><b>{Math.round(f.share * 100)}%</b></div>
                <div className="bar-x"><i style={{ width: `${(f.share / maxImp) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="b glass b-slip" data-pop>
            <p>Where it slips: <em className="it">{slip.v}% of {names[slip.a].toLowerCase()}s are mistaken for {names[slip.b].toLowerCase()}s.</em></p>
            <small>Biggest error</small>
          </div>
        </div>
      </div>
    </section>
  )
}
