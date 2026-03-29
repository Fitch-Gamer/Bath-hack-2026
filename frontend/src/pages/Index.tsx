import React from 'react'
import { useNavigate } from 'react-router-dom'
import recordImage from '../images/record.jpg'
import reportsImage from '../images/reports.png'
import leaderboardImage from '../images/leaderboard.jpg'
import settingsImage from '../images/settings.jpg'

const Index: React.FC = () => {
	const navigate = useNavigate()

	return (
		<section className="flex min-h-[calc(100vh-3.5rem)] items-start justify-center py-8">
			<div className="w-full max-w-7xl rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow)]">
				<header className="mb-8">
					<h1 className="text-3xl font-bold text-[var(--on-surface)]">Dashboard</h1>
					<p className="mt-2 text-[var(--muted)]">Choose your workflow and start your performance session.</p>
				</header>

				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
					<button
						onClick={() => navigate('/record')}
						className="group flex flex-col items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
					>
						<div className="mb-4 h-64 w-full overflow-hidden rounded-lg bg-[var(--card)]">
							<img src={recordImage} alt="Record" className="h-full w-full object-cover" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-[var(--on-surface)]">Start Drill</h2>
							<p className="mt-2 text-sm text-[var(--muted)]">Begin a focused recording session with audio/video tracking.</p>
						</div>
					</button>

					<button
						onClick={() => navigate('/reports')}
						className="group flex flex-col items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
					>
						<div className="mb-4 h-64 w-full overflow-hidden rounded-lg bg-[var(--card)]">
							<img src={reportsImage} alt="Reports" className="h-full w-full object-cover" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-[var(--on-surface)]">Reports</h2>
							<p className="mt-2 text-sm text-[var(--muted)]">Review previous sessions, completion trends, and performance metrics.</p>
						</div>
					</button>

					<button
						onClick={() => navigate('/leaderboard')}
						className="group flex flex-col items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
					>
						<div className="mb-4 h-64 w-full overflow-hidden rounded-lg bg-[var(--card)]">
							<img src={leaderboardImage} alt="Leaderboard" className="h-full w-full object-cover" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-[var(--on-surface)]">Leaderboard</h2>
							<p className="mt-2 text-sm text-[var(--muted)]">Compare scores with friends and identify areas for improvement.</p>
						</div>
					</button>

					<button
						onClick={() => navigate('/settings')}
						className="group flex flex-col items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
					>
						<div className="mb-4 h-64 w-full overflow-hidden rounded-lg bg-[var(--card)]">
							<img src={settingsImage} alt="Settings" className="h-full w-full object-cover" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-[var(--on-surface)]">Settings</h2>
							<p className="mt-2 text-sm text-[var(--muted)]">Set your preferences for recording, distractions, and behavior.</p>
						</div>
					</button>
				</div>
			</div>
		</section>
	);
}

export default Index

