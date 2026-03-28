import React from 'react'
import { useNavigate } from 'react-router-dom'

const Index: React.FC = () => {
	const navigate = useNavigate()

	return (
		<div className="flex h-screen items-center justify-center">
			<div className="grid grid-cols-2 gap-4 w-[360px]">
				<button
					onClick={() => navigate('/record')}
					className="py-3 px-4 text-base bg-blue-600 text-white rounded shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
				>
					Record
				</button>
				<button
					onClick={() => navigate('/reports')}
					className="py-3 px-4 text-base bg-blue-600 text-white rounded shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
				>
					Reports
				</button>
				<button
					onClick={() => navigate('/leaderboard')}
					className="py-3 px-4 text-base bg-blue-600 text-white rounded shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
				>
					Leaderboard
				</button>
				<button
					onClick={() => navigate('/settings')}
					className="py-3 px-4 text-base bg-blue-600 text-white rounded shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
				>
					Settings
				</button>
			</div>
		</div>
	)
}

export default Index

