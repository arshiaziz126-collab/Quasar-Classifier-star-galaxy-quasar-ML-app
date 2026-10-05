import { useLayoutEffect, useRef } from 'react'
import { ScrollTrigger, gsap, prefersReducedMotion } from '../lib/motion'

export default function Method({ meta }) {
  const root = useRef(null)
  const best = meta.models.find((m) => m.chosen) || meta.models[meta.models.length - 1]
  const top = meta.importance[0]

  useLayoutEffect(() => {
    const items = root.current.querySelectorAll('.tl-item')
    if (prefersReducedMotion()) { items.forEach((i) => i.classList.add('on')); root.current.querySelector('.tl-line i').style.transform = 'scaleY(1)'; return }
    const ctx = gsap.context(() => {
      gsap.to('.tl-line i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.tl', start: 'top 70%', end: 'bottom 60%', scrub: true } })
      items.forEach((item) => {
        const card = item.querySelector('.tcard'), side = card.dataset.side === 'l' ? -1 : 1
        gsap.from(card, { x: (window.innerWidth > 820 ? 90 : 40) * side, opacity: 0, filter: 'blur(12px)', rotateY: 10 * side, transformPerspective: 1000, duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: item, start: 'top 82%' } })
        ScrollTrigger.create({ trigger: item, start: 'top 60%', onEnter: () => item.classList.add('on'), onLeaveBack: () => item.classList.remove('on') })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section className="sec" id="method" style={{ paddingTop: 20 }} ref={root}>
      <div className="wrap">
        <p className="kicker" data-rise>Method</p>
        <h2 className="h2 serif" data-rise>From raw sky <em className="it">to a clear answer.</em></h2>
        <div className="tl">
          <div className="tl-line" aria-hidden="true"><i /></div>
          <div className="tl-item"><span className="node" aria-hidden="true" /><div className="tcard glass" data-side="l"><span className="n">i.</span><h3>Clean the survey</h3><p>Drop ID columns that say nothing about the sky, and remove broken readings.</p><div className="chips"><span>{meta.rows.toLocaleString('en-IN')} objects kept</span><span>{meta.rows_removed} broken {meta.rows_removed === 1 ? 'row' : 'rows'} removed</span><span className="hi">IDs dropped</span></div></div></div>
          <div className="tl-item"><span className="node" aria-hidden="true" /><div className="tcard glass" data-side="r"><span className="n">ii.</span><h3>Read the colours</h3><p>Turn five brightness filters into colour indices, the same trick astronomers use.</p><div className="chips"><span className="hi">u − g</span><span className="hi">g − r</span><span className="hi">r − i</span><span className="hi">i − z</span></div></div></div>
          <div className="tl-item"><span className="node" aria-hidden="true" /><div className="tcard glass" data-side="l"><span className="n">iii.</span><h3>Train and compare</h3><p>A stratified 80/20 split, with classes weighted so the smaller ones count as much as galaxies.</p><div className="chips">{meta.models.map((m) => <span key={m.name} className={m.chosen ? 'hi' : ''}>{m.name} {m.accuracy}%</span>)}</div></div></div>
          <div className="tl-item"><span className="node" aria-hidden="true" /><div className="tcard glass" data-side="r"><span className="n">iv.</span><h3>Explain every answer</h3><p>SHAP shows which clue mattered most for each object, so {best.name} is never a black box.</p><div className="chips"><span className="hi">{top.factor} first</span>{meta.importance.slice(1, 3).map((f) => <span key={f.factor}>{f.factor}</span>)}</div></div></div>
        </div>
      </div>
    </section>
  )
}
