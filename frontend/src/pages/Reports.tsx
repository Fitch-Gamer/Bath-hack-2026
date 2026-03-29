import React, { useEffect, useState } from 'react'

type Report = {
  id?: string | number
  name: string
  date: string
  report: string
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/listreports', {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const data = await res.json()
        setReports(Array.isArray(data) ? data : [])
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch reports')
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-4">Reports</h2>

      {loading ? (
        <p>Loading reports...</p>
      ) : error ? (
        <p className="text-red-600">Error: {error}</p>
      ) : reports.length === 0 ? (
        <p>No reports available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-4 py-2 border">Name</th>
                <th className="px-4 py-2 border">Date</th>
                <th className="px-4 py-2 border">Report</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, idx) => (
                <tr key={(r.id as string) || idx} className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-2 align-top border">{r.name}</td>
                  <td className="px-4 py-2 align-top border">{new Date(r.date).toLocaleString()}</td>
                  <td className="px-4 py-2 align-top border whitespace-pre-wrap">{r.report}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
