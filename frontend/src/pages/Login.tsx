import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const Login: React.FC = () => {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		const res = await fetch('http://localhost:5000/api/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ username, password }),
		})

		if (res.ok) {
			window.location.href = '/'
		} else {
			alert('Login failed')
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
				<h1 className="text-2xl font-semibold text-center mb-6">Login</h1>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-1">Username</label>
						<input
							type="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1">Password</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
						/>
					</div>

					<button
						type="submit"
						className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					>
						Login
					</button>
				</form>

				<p className="text-sm text-center text-gray-500 mt-4">
					Don’t have an account? <Link to="/signup" className="text-blue-600 hover:underline">Sign up</Link>
				</p>
			</div>
		</div>
	)
}

export default Login

