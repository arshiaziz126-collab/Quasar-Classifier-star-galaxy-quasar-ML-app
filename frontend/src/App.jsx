import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import Ambient from './components/Ambient'
import Header from './components/Header'
import Story from './components/Story'
import Panels from './components/Panels'
import Method from './components/Method'
import Results from './components/Results'
import TryIt from './components/TryIt'
import Footer from './components/Footer'
import StatusScreen from './components/StatusScreen'
import { getMeta } from './lib/api'
import { ScrollTrigger, finePointer, gsap, prefersReducedMotion, startSmoothScroll, stopSmoothScroll } from './lib/motion'

export default function App() {
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try { setMeta(await getMeta()) } catch (e) { setError(e.message) }
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { startSmoothScroll(); return () => stopSmoothScroll() }, [])

  // Headings rise out of a blur, cards float up in 3D, and the header shows reading progress
  useLayoutEffect(() => {
    if (!meta) return
    let ctx
    if (!prefersReducedMotion()) {
      ctx = gsap.context(() => {
        gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } })
        gsap.utils.toArray('[data-rise]').forEach((el) => {
          gsap.from(el, { y: 80, opacity: 0, filter: 'blur(14px)', duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } })
        })
        gsap.utils.toArray('[data-pop]').forEach((el, i) => {
          gsap.from(el, { y: 130, opacity: 0, rotateX: 16, scale: .95, transformPerspective: 1100, transformOrigin: '50% 100%', duration: 1.6, ease: 'expo.out', delay: (i % 2) * .12, scrollTrigger: { trigger: el, start: 'top 90%' } })
        })
        const mag = document.querySelector('.btn-try')
        if (mag && finePointer()) {
          const mx = gsap.quickTo(mag, 'x', { duration: .5, ease: 'power3.out' }), my = gsap.quickTo(mag, 'y', { duration: .5, ease: 'power3.out' })
          mag.addEventListener('pointermove', (e) => { const r = mag.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .3); my((e.clientY - r.top - r.height / 2) * .3) })
          mag.addEventListener('pointerleave', () => { mx(0); my(0) })
        }
      })
    }
    ScrollTrigger.refresh()
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => ctx && ctx.revert()
  }, [meta])

  if (!meta) return <StatusScreen error={error} onRetry={load} />
  return (
    <>
      <Ambient />
      <Header />
      <main>
        <Story meta={meta} />
        <Panels meta={meta} />
        <Method meta={meta} />
        <Results meta={meta} />
        <TryIt />
      </main>
      <Footer meta={meta} />
    </>
  )
}
