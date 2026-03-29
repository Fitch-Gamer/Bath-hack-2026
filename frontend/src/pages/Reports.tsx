import React, { useEffect, useState } from 'react'

type Report = {
  id?: string | number
  created_at: string
  report: string
  processed: boolean
  score: number
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('http://52.56.138.157:5000/api/listreports', {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const data = await res.json()
        setReports(Array.isArray(data["reports"]) ? data["reports"] : [])
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
                  <th className="px-4 py-2 border">Date/Time</th>
                  <th className="px-4 py-2 border">Score</th>
                  <th className="px-4 py-2 border">Status / Actions</th>
                </tr>
            </thead>
            <tbody>
              {reports.map((r, idx) => (
                <tr key={(r.id as string) || idx} className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-2 align-top border">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 align-top border whitespace-pre-wrap">{r.score}</td>
                  <td className="px-4 py-2 align-top border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.processed ? '' : 'Pending'}</span>
                      {r.processed && (
                        <button
                          onClick={() => { setSelectedReport(r); setModalOpen(true); }}
                          className="ml-2 rounded px-3 py-1 bg-blue-600 text-white text-sm hover:bg-blue-700"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 z-10">
            <div className="flex items-start justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Report Details</h3>
              <button onClick={() => setModalOpen(false)} className="text-sm text-gray-600">Close</button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500">Created: {new Date(selectedReport.created_at).toLocaleString()}</p>
              <pre className="mt-4 whitespace-pre-wrap bg-gray-50 p-3 rounded text-sm">{selectedReport.report}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
