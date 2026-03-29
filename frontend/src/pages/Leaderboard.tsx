
import React, { useEffect, useState } from "react";

type LeaderboardEntry = Record<string, any>;

export default function Leaderboard(): JSX.Element {
	const [data, setData] = useState<LeaderboardEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		const url = "http://52.56.138.157:5000/api/getleaderboard";

		fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		})
			.then((res) => {
				if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
				return res.json();
			})
			.then((json) => {
				if (!mounted) return;
				if (Array.isArray(json["leaderboard"])) setData(json["leaderboard"]);
				else if (json && typeof json === "object" && Array.isArray((json as any).data)) setData((json as any).data);
				else setError("Unexpected response format from /api/leaderboard");
			})
			.catch((err) => {
				if (!mounted) return;
				setError(err.message ?? String(err));
			})
			.finally(() => {
				if (!mounted) return;
				setLoading(false);
			});

		return () => {
			mounted = false;
		};
	}, []);

	if (loading) return <div className="p-4">Loading leaderboard…</div>;
	if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
	if (data.length === 0) return <div className="p-4">No leaderboard entries yet.</div>;

	const headers = Object.keys(data[0]);

	return (
		<div className="p-4">
			<h1 className="text-2xl font-semibold mb-4">Leaderboard</h1>
			<div className="overflow-x-auto">
				<table className="min-w-full bg-white border">
					<thead>
						<tr>
							{headers.map((h) => (
								<th key={h} className="px-4 py-2 text-left bg-gray-100">
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.map((row, idx) => (
							<tr key={(row.id as string) ?? idx} className="border-t">
								{headers.map((h) => (
									<td key={h} className="px-4 py-2">
										{row[h] === null || row[h] === undefined ? "" : String(row[h])}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

