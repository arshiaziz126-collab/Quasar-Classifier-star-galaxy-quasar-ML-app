import { localMeta, localPredict, localPredictCsv, localRandom } from './model'

// VITE_MODE=static (set on Vercel): the model runs in the browser, no server needed.
// Otherwise the site talks to the FastAPI backend.
const STATIC = import.meta.env.VITE_MODE === 'static'
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function call(path, options) {
  let res
  try {
    res = await fetch(BASE + path, options)
  } catch {
    throw new Error("Can't reach the Quasar API. Start the backend (run.bat), then try again.")
  }
  if (!res.ok) {
    let msg = `The API answered with an error (${res.status}).`
    try {
      const j = await res.json()
      if (Array.isArray(j.detail)) msg = j.detail.map((d) => `${d.loc?.slice(-1)[0] ?? 'value'}: ${d.msg}`).join('. ')
      else if (j.detail) msg = j.detail
    } catch { /* keep default */ }
    throw new Error(msg)
  }
  return res.json()
}

export const getMeta = () => (STATIC ? localMeta() : call('/api/meta'))
export const getRandom = () => (STATIC ? localRandom() : call('/api/random'))
export const predict = (values) => (STATIC ? localPredict(values) :
  call('/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }))
export const predictCsv = (file) => {
  if (STATIC) return localPredictCsv(file)
  const fd = new FormData()
  fd.append('file', file)
  return call('/api/predict-csv', { method: 'POST', body: fd })
}

export const fmt = (n, d = 0) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })
