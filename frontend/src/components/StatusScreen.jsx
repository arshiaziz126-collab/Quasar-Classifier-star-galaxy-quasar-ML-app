export default function StatusScreen({ error, onRetry }) {
  return (
    <main className="status">
      <div className="status-in">
        <h1>Quasar</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button type="button" className="btn solid" onClick={onRetry}>Try again</button>
          </>
        ) : (
          <>
            <div className="loader" aria-hidden="true"><i /></div>
            <p>Pointing the telescope…</p>
          </>
        )}
      </div>
    </main>
  )
}
