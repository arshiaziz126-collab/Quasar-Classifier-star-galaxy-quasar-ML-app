import { scrollToTarget } from '../lib/motion'

export default function Header() {
  const go = (sel) => (e) => { e.preventDefault(); scrollToTarget(sel) }
  return (
    <header className="top">
      <div className="top-in">
        <a className="logo serif" href="#top" onClick={go('#top')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><circle cx="12" cy="12" r="2.6" fill="currentColor" /><ellipse cx="12" cy="12" rx="10.5" ry="4" transform="rotate(-25 12 12)" /></svg>
          <span className="it">Quasar</span>
        </a>
        <nav className="nav" aria-label="Sections">
          <a className="lnk" href="#three" onClick={go('#three')}>The three</a>
          <a className="lnk" href="#method" onClick={go('#method')}>Method</a>
          <a className="lnk" href="#results" onClick={go('#results')}>Results</a>
          <a className="btn-try" href="#try" onClick={go('#try')}>Try it</a>
        </nav>
      </div>
      <div className="progress" aria-hidden="true" />
    </header>
  )
}
