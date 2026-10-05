import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '../lib/motion'

const COLORS = { STAR: [241, 211, 168], GALAXY: [192, 133, 82], QSO: [214, 105, 60] }
const ORDER = ['STAR', 'GALAXY', 'QSO']        // left, centre, right on screen
const NAMES = { STAR: 'Stars', GALAXY: 'Galaxies', QSO: 'Quasars' }

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const easeIO = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

export default function Story({ meta }) {
  const section = useRef(null)
  const canvas = useRef(null)

  useEffect(() => {
    const sec = section.current, cv = canvas.current, ctx = cv.getContext('2d'), reduce = prefersReducedMotion()
    const caps = [...sec.querySelectorAll('.cap')], cue = sec.querySelector('.scroll-cue')
    const total = meta.class_counts.reduce((s, c) => s + c.count, 0)
    const CLS = ORDER.map((k) => {
      const c = meta.class_counts.find((x) => x.key === k)
      return { key: k, name: NAMES[k], n: c.count, share: c.count / total, col: COLORS[k] }
    })
    let seed = 7
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
    const gauss = () => { const u = rand() || 1e-6, v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

    let SW = 0, SH = 0, P = [], mobile = false, centers = [], bars = [], baseY = 0
    const build = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2)
      SW = cv.clientWidth; SH = cv.clientHeight; cv.width = SW * d; cv.height = SH * d; ctx.setTransform(d, 0, 0, d, 0, 0)
      mobile = SW < 720
      const N = mobile ? 760 : 1500
      if (P.length !== N) {
        P = []; seed = 7
        const cut1 = Math.round(N * CLS[0].share), cut2 = cut1 + Math.round(N * CLS[1].share)
        for (let i = 0; i < N; i++) {
          P.push({ c: i < cut1 ? 0 : i < cut2 ? 1 : 2, arm: rand() < .5 ? 0 : 1, t: Math.pow(rand(), .62), j: gauss(), j2: gauss(), u: rand(), v: rand(), g1: gauss(), g2: gauss(), s: rand() * 1.6 + .7, tone: rand() })
        }
        const k = [0, 0, 0]
        P.forEach((p) => { p.k = k[p.c]++ })
      }
      const cy = SH * (mobile ? .58 : .56)
      centers = mobile ? [[SW * .24, SH * .72], [SW * .5, SH * .46], [SW * .77, SH * .72]] : [[SW * .24, SH * .66], [SW * .5, SH * .5], [SW * .76, SH * .66]]
      const R = Math.min(SW, SH) * (mobile ? .44 : .4), m = Math.min(SW, SH)
      const bw = Math.min(SW * (mobile ? .2 : .13), 170), maxH = SH * (mobile ? .42 : .5)
      baseY = SH * .82
      const nMax = Math.max(...CLS.map((_, i) => P.filter((p) => p.c === i).length))
      const gap = Math.sqrt(bw * maxH / nMax), cols = Math.max(4, Math.floor(bw / gap))
      bars = CLS.map((_, i) => ({ x: centers[i][0], cols, gap: bw / cols }))
      P.forEach((p) => {
        p.ga = p.arm * Math.PI + p.t * 4.6 + p.j * .28; p.gr = p.t * R + p.j2 * 6; p.gy0 = cy
        p.dx = 30 + p.u * (SW - 60); p.dy = 90 + p.v * (SH - 150)
        const spread = Math.sqrt(CLS[p.c].share) * m * (mobile ? .11 : .1)
        p.cx = centers[p.c][0] + p.g1 * spread; p.cy = centers[p.c][1] + p.g2 * spread * .8
        const b = bars[p.c], col = p.k % b.cols, row = Math.floor(p.k / b.cols)
        p.bx = b.x - bw / 2 + (col + .5) * b.gap; p.by = baseY - (row + .5) * b.gap
      })
    }
    build()

    let prog = 0, rot = 0, on = true, raf = 0
    const pos = (p, st) => {
      if (st === 0) { const a = p.ga + rot; return [SW / 2 + Math.cos(a) * p.gr, p.gy0 + Math.sin(a) * p.gr * .5] }
      if (st === 1) return [p.dx, p.dy]
      if (st === 2) return [p.cx, p.cy]
      return [p.bx, p.by]
    }
    const draw = () => {
      const pr = clamp(prog, 0, 3), st = Math.min(2, Math.floor(pr)), t = easeIO(clamp(pr - st))
      ctx.clearRect(0, 0, SW, SH)
      ctx.globalCompositeOperation = 'lighter'
      const reveal = clamp((pr - 1.25) / .6)
      for (const p of P) {
        const A = pos(p, st), B = pos(p, st + 1)
        const x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t
        const warm = p.tone < .5 ? [232, 190, 140] : [200, 140, 92], cc = CLS[p.c].col
        const r = Math.round(warm[0] + (cc[0] - warm[0]) * reveal), g = Math.round(warm[1] + (cc[1] - warm[1]) * reveal), b = Math.round(warm[2] + (cc[2] - warm[2]) * reveal)
        const al = st === 0 ? .55 + .35 * (1 - p.t) : .7
        ctx.fillStyle = `rgba(${r},${g},${b},${al.toFixed(2)})`
        const s = p.s * (pr > 2.6 ? 1 + .25 * clamp((pr - 2.6) / .4) : 1)
        ctx.fillRect(x - s / 2, y - s / 2, s, s)
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.textAlign = 'center'
      const la = clamp((pr - 1.85) / .25) * (1 - clamp((pr - 2.3) / .2)), ba = clamp((pr - 2.75) / .2)
      if (la > 0) {
        ctx.font = `italic 400 ${mobile ? 22 : 32}px "Instrument Serif", Georgia, serif`
        ctx.fillStyle = `rgba(243,231,218,${la})`
        CLS.forEach((c, i) => ctx.fillText(c.name, centers[i][0], centers[i][1] + (i === 1 ? -Math.min(SW, SH) * .2 : Math.min(SW, SH) * .17)))
      }
      if (ba > 0) {
        CLS.forEach((c, i) => {
          ctx.fillStyle = `rgba(224,176,122,${ba})`
          ctx.font = `400 ${mobile ? 26 : 40}px "Instrument Serif", Georgia, serif`
          ctx.fillText(c.n.toLocaleString('en-IN'), bars[i].x, baseY + (mobile ? 34 : 46))
          ctx.fillStyle = `rgba(201,179,157,${ba})`
          ctx.font = `300 ${mobile ? 12 : 14}px Outfit, sans-serif`
          ctx.fillText(c.name, bars[i].x, baseY + (mobile ? 54 : 70))
        })
      }
    }
    const captions = () => {
      caps.forEach((c) => {
        const a = parseFloat(c.dataset.a), b = parseFloat(c.dataset.b)
        let o = clamp((prog - (a - .2)) / .2) * (1 - clamp((prog - b) / .2))
        if (a < 0) o = 1 - clamp((prog - b) / .2)
        const off = (1 - o) * (prog < a ? 24 : -24)
        c.style.opacity = o.toFixed(3)
        c.style.transform = c.classList.contains('cap-hero') ? `translateY(calc(-50% + ${off.toFixed(1)}px))` : `translateY(${off.toFixed(1)}px)`
        c.style.filter = `blur(${((1 - o) * 8).toFixed(1)}px)`
      })
      if (cue) cue.style.opacity = (1 - clamp(prog / .25)).toFixed(2)
    }
    const loop = () => {
      if (!on) return
      const r = sec.getBoundingClientRect(), span = sec.offsetHeight - window.innerHeight
      prog = clamp(-r.top / span) * 3
      if (!reduce) rot += .0016
      draw(); captions()
      raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([en]) => { const was = on; on = en.isIntersecting; if (on && !was) raf = requestAnimationFrame(loop) })
    io.observe(sec)
    raf = requestAnimationFrame(loop)
    const onResize = () => build()
    window.addEventListener('resize', onResize)
    document.fonts?.ready.then(draw)

    let intro
    if (!reduce) {
      intro = gsap.context(() => {
        gsap.from('.cap-hero .eyebrow', { y: 24, opacity: 0, duration: 1.2, ease: 'expo.out', delay: .2 })
        gsap.from('.cap-hero h1', { y: 70, opacity: 0, filter: 'blur(16px)', duration: 1.8, ease: 'expo.out', delay: .3 })
        gsap.from('.cap-hero .sub, .cap-hero .demo-flag', { y: 30, opacity: 0, duration: 1.4, ease: 'expo.out', delay: .7 })
        gsap.from(cv, { opacity: 0, scale: 1.15, duration: 2.6, ease: 'expo.out' })
      }, sec)
    }
    return () => { on = false; cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', onResize); intro && intro.revert() }
  }, [meta])

  return (
    <section className="story" id="top" aria-label="The sky, sorted by a model" ref={section}>
      <div className="stage">
        <canvas ref={canvas} role="img" aria-label={`Particles form a spiral galaxy, scatter into dust, gather into three groups and stack into bars: ${meta.class_counts.map((c) => `${c.count} ${c.label.toLowerCase()}s`).join(', ')}`} />
        <div className="vignette" aria-hidden="true" />
        <div className="cap cap-hero" data-a="-1" data-b="0.42">
          <p className="eyebrow">A machine learning project on {meta.rows.toLocaleString('en-IN')} objects from the Sloan Digital Sky Survey</p>
          <h1 className="serif">Star, galaxy, <em className="it">or quasar?</em></h1>
          <p className="sub">Every light in the sky has a story. This model reads it.</p>
          {meta.data_source === 'demo' && <span className="demo-flag">Running on synthetic demo data</span>}
        </div>
        <div className="cap cap-top" data-a="0.75" data-b="1.4"><h2 className="serif">Through a telescope, each one is <em className="it">just a dot of light.</em></h2></div>
        <div className="cap cap-top" data-a="1.7" data-b="2.35"><h2 className="serif">The model reads colour and redshift, and <em className="it">sorts them into three.</em></h2></div>
        <div className="cap cap-top" data-a="2.65" data-b="9"><h2 className="serif">Galaxies are the most common. <em className="it">Quasars, the rarest.</em></h2></div>
        <div className="scroll-cue" aria-hidden="true">Scroll<i /></div>
      </div>
    </section>
  )
}
