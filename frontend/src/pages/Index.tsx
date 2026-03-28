import React from 'react'
import { useNavigate } from 'react-router-dom'

const Index: React.FC = () => {
	const navigate = useNavigate()

	return (
		<section className="flex min-h-[calc(100vh-5.5rem)] items-center justify-center py-6">
			<div className="w-full max-w-2xl rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
				<header className="mb-6">
					<h1 className="text-3xl font-bold text-[var(--on-surface)]">Dashboard</h1>
					<p className="mt-1 text-sm text-[var(--muted)]">Pick an action to begin your performance review</p>
				</header>

				<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					<button
						onClick={() => navigate('/record')}
						className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow hover:bg-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
					>
						Start Drill
					</button>
					<button
						onClick={() => navigate('/reports')}
						className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--on-surface)] shadow hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
					>
						Reports
					</button>
					<button
						onClick={() => navigate('/leaderboard')}
						className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--on-surface)] shadow hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
					>
						Leaderboard
					</button>
					<button
						onClick={() => navigate('/settings')}
						className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--on-surface)] shadow hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
					>
						Settings
					</button>
				</div>
			</div>
		</section>
	)
}

export default Index

