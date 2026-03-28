import React from 'react'
import { useNavigate } from 'react-router-dom'

const Index: React.FC = () => {
	const navigate = useNavigate()

	return (
		<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, width: 360 }}>
				<button onClick={() => navigate('/record')} style={{ padding: '12px 16px', fontSize: 16 }}>Record</button>
				<button onClick={() => navigate('/reports')} style={{ padding: '12px 16px', fontSize: 16 }}>Reports</button>
				<button onClick={() => navigate('/leaderboard')} style={{ padding: '12px 16px', fontSize: 16 }}>Leaderboard</button>
				<button onClick={() => navigate('/settings')} style={{ padding: '12px 16px', fontSize: 16 }}>Settings</button>
			</div>
		</div>
	)
}

export default Index

