export default function Footer({ meta }) {
  return (
    <footer className="foot">
      <h2 data-rise>Keep <em className="it">looking up.</em></h2>
      <p>
        Data: Sloan Digital Sky Survey DR17, stellar classification dataset ({meta.rows.toLocaleString('en-IN')} objects).
        {meta.data_source === 'demo' && ' Currently running on synthetic demo data.'}
      </p>
    </footer>
  )
}
