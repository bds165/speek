import { useEffect, useState } from 'react'

import { Recorder } from './recording/Recorder.tsx'

function App() {
  const [backend, setBackend] = useState<string>('checking...')

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setBackend(d.status))
      .catch(() => setBackend('unreachable'))
  }, [])

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold">Speek</h1>
      <p className="mt-2 text-gray-600">Impromptu speaking practice.</p>
      <p className="mt-6 text-sm">Backend: {backend}</p>
      <Recorder />
    </main>
  )
}

export default App
