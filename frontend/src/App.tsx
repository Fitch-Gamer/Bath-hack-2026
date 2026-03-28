import React, { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('Loading...')
  useEffect(() => {
    fetch('http://localhost:5000/api/hello')
      .then((r) => r.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('Could not reach backend'))
  }, [])
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <h1>React + TypeScript + Flask</h1>
      <p>{message}</p>
    </div>
  )
}

export default App
