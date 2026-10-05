import { useEffect, useRef } from 'react'
import { finePointer, prefersReducedMotion } from '../lib/motion'

/** Golden dust drifting behind the page, plus a soft light that follows the pointer. */
export default function Ambient() {
  const canvas = useRef(null)
  const glow = useRef(null)

  useEffect(() => {
    const cv = canvas.current, ctx = cv.getContext('2d'), reduce = prefersReducedMotion()
    let W = 0, H = 0, vel = 0, raf = 0, alive = true
    const size = () => { const d = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0) }
    size()
    const D = Array.from({ length: W < 700 ? 30 : 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + .4, a: Math.random() * .4 + .15, s: Math.random() * .5 + .2, ph: Math.random() * 6.28 }))
    const draw = (move) => {
      ctx.clearRect(0, 0, W, H); vel *= .92
      for (const p of D) {
        if (move) { p.y -= (.06 + vel) * p.s; p.ph += .02 }
        if (p.y < -10) p.y = H + 10
        if (p.y > H + 10) p.y = -10
        ctx.fillStyle = `rgba(224,176,122,${(p.a * (.5 + .5 * Math.sin(p.ph))).toFixed(3)})`
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
      }
    }
    const onScroll = (e) => { vel = Math.max(-4, Math.min(4, e.detail.velocity * .1)) }
    window.addEventListener('resize', size)
    window.addEventListener('as:scroll', onScroll)
    if (reduce) draw(false)
    else { const loop = () => { if (!alive) return; draw(true); raf = requestAnimationFrame(loop) }; raf = requestAnimationFrame(loop) }

    let gx = 0, gy = 0, tx = 0, ty = 0, graf = 0
    const g = glow.current
    const move = (e) => { tx = e.clientX; ty = e.clientY; g.style.opacity = 1 }
    if (finePointer() && !reduce) {
      window.addEventListener('pointermove', move)
      const follow = () => { if (!alive) return; gx += (tx - gx) * .12; gy += (ty - gy) * .12; g.style.transform = `translate(${gx.toFixed(1)}px,${gy.toFixed(1)}px)`; graf = requestAnimationFrame(follow) }
      graf = requestAnimationFrame(follow)
    }
    return () => {
      alive = false; cancelAnimationFrame(raf); cancelAnimationFrame(graf)
      window.removeEventListener('resize', size); window.removeEventListener('as:scroll', onScroll); window.removeEventListener('pointermove', move)
    }
  }, [])

  return (<><canvas ref={canvas} className="dust" aria-hidden="true" /><div ref={glow} className="glow" aria-hidden="true" /></>)
}
