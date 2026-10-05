import { useState } from 'react'
import { ScrollTrigger, finePointer } from '../lib/motion'

const ART = {
  STAR: (
    <svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="90" fill="#F1D3A8" opacity=".08" /><g className="tw"><path d="M150 50 L160 140 L250 150 L160 160 L150 250 L140 160 L50 150 L140 140 Z" fill="#F1D3A8" /></g><circle cx="150" cy="150" r="14" fill="#FFF8EE" /><circle cx="72" cy="80" r="2" fill="#E0B07A" /><circle cx="236" cy="226" r="2.4" fill="#E0B07A" /><circle cx="226" cy="70" r="1.6" fill="#F1D3A8" /></svg>
  ),
  GALAXY: (
    <svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="110" fill="#C08552" opacity=".07" /><g className="spin"><path d="M150 150 C150 100 212 90 228 134 C244 178 200 216 156 210" fill="none" stroke="#C08552" strokeWidth="3" strokeLinecap="round" /><path d="M150 150 C150 200 88 210 72 166 C56 122 100 84 144 90" fill="none" stroke="#E0B07A" strokeWidth="3" strokeLinecap="round" /><circle cx="216" cy="114" r="3" fill="#E0B07A" /><circle cx="84" cy="186" r="3" fill="#C08552" /><circle cx="192" cy="208" r="2.2" fill="#F1D3A8" /><circle cx="110" cy="94" r="2.2" fill="#F1D3A8" /></g><circle cx="150" cy="150" r="20" fill="#FFF0DC" /></svg>
  ),
  QSO: (
    <svg viewBox="0 0 300 300" aria-hidden="true"><defs><radialGradient id="qcore"><stop offset="0%" stopColor="#FFF6EA" /><stop offset="45%" stopColor="#F1A27A" /><stop offset="100%" stopColor="#D6693C" stopOpacity="0" /></radialGradient></defs><rect x="146" y="22" width="8" height="256" rx="4" fill="#D6693C" opacity=".4" className="tw" /><g className="spin"><ellipse cx="150" cy="150" rx="112" ry="28" fill="none" stroke="#E0B07A" strokeWidth="1.4" opacity=".7" transform="rotate(-18 150 150)" /></g><ellipse cx="150" cy="150" rx="70" ry="17" fill="#C08552" opacity=".55" transform="rotate(-18 150 150)" /><circle cx="150" cy="150" r="44" fill="url(#qcore)" /></svg>
  ),
}

const PANELS = [
  { key: 'STAR', name: 'Stars', tag: 'the nearest', title: <>Stars live <em className="it">next door.</em></>, text: 'They belong to our own Milky Way, so close that they barely move away from us. Their redshift sits almost exactly at zero.', z: '≈ 0', bg: 'radial-gradient(circle at 30% 30%,#3A2A1E,#17110C 70%)', orb: 'radial-gradient(circle,#FFF4E4,#F1D3A8 40%,rgba(241,211,168,0) 70%)' },
  { key: 'GALAXY', name: 'Galaxies', tag: 'the most common', title: <>Galaxies are <em className="it">billions of stars.</em></>, text: 'Each one is a whole island of stars far beyond our own. The expanding universe carries them away at a steady pace.', z: '0.1–1', bg: 'radial-gradient(circle at 60% 40%,#4A2E1C,#1A110B 72%)', orb: 'radial-gradient(circle,#F6DCC0,#C08552 40%,rgba(192,133,82,0) 70%)' },
  { key: 'QSO', name: 'Quasars', tag: 'the farthest', title: <>Quasars are <em className="it">black holes, feeding.</em></>, text: 'A supermassive black hole swallows gas so fast that it outshines its entire galaxy. Most sit billions of light years away.', z: '1–5+', bg: 'radial-gradient(circle at 50% 50%,#4F2416,#160D09 72%)', orb: 'radial-gradient(circle,#FFE2CC,#D6693C 40%,rgba(214,105,60,0) 70%)' },
]

export default function Panels({ meta }) {
  const [open, setOpen] = useState(0)
  const count = (k) => meta.class_counts.find((c) => c.key === k)?.count ?? 0
  const choose = (i) => { setOpen(i); setTimeout(() => ScrollTrigger.refresh(), 1050) }

  return (
    <section className="sec" id="three">
      <div className="wrap">
        <p className="kicker" data-rise>The three</p>
        <h2 className="h2 serif" data-rise>Same dot. <em className="it">Different worlds.</em></h2>
        <div className="panels" data-rise>
          {PANELS.map((p, i) => (
            <article key={p.key} className={`pn${open === i ? ' active' : ''}`}
              onPointerEnter={() => { if (finePointer() && window.innerWidth > 820) choose(i) }}>
              <div className="pn-bg" style={{ background: p.bg }} />
              <button className="pn-head" type="button" aria-expanded={open === i} aria-controls={`pb-${p.key}`} onClick={() => choose(i)}>
                <span className="pn-idx">0{i + 1}</span><span className="pn-name">{p.name}</span>
              </button>
              <span className="pn-orb" style={{ background: p.orb }} aria-hidden="true" />
              <div className="pn-body" id={`pb-${p.key}`}>
                <div className="pn-art">{ART[p.key]}</div>
                <div className="pn-copy">
                  <span className="pn-idx">0{i + 1}, {p.tag}</span>
                  <h3 className="serif">{p.title}</h3>
                  <p>{p.text}</p>
                  <dl>
                    <div><dt>In the data</dt><dd>{count(p.key).toLocaleString('en-IN')}</dd></div>
                    <div><dt>Redshift</dt><dd>{p.z}</dd></div>
                  </dl>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
