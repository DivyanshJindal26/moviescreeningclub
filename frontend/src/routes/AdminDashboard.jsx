import { api } from '@/utils/api'
import { useEffect, useState } from 'react'
import { Loading } from '@/components/icons/Loading'

const StatCard = ({ label, value, sub }) => (
  <div className="rounded-2xl bg-white dark:bg-[#212121] p-6 shadow-md">
    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-3xl font-bold mt-1">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
)

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [occupancy, setOccupancy] = useState([])
  const [revenueTrend, setRevenueTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [movies, setMovies] = useState([])
  const [selectedMovie, setSelectedMovie] = useState('')

  useEffect(() => {
    const load = async () => {
      const safe = (p) => p.then((r) => r.data).catch(() => null)
      const [dash, occ, rev, mov] = await Promise.all([
        safe(api.get('/admin/analytics/dashboard')),
        safe(api.get('/admin/analytics/occupancy')),
        safe(api.get('/admin/analytics/revenue-trend')),
        safe(api.get('/movie'))
      ])
      if (dash) setStats(dash)
      if (Array.isArray(occ)) setOccupancy(occ)
      if (Array.isArray(rev)) setRevenueTrend(rev)
      if (Array.isArray(mov)) setMovies(mov)
      setLoading(false)
    }
    load()
  }, [])

  const downloadCsv = async (url, filename) => {
    try {
      const res = await api.get(url, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  if (loading) return <Loading />

  const trendArr = Array.isArray(revenueTrend) ? revenueTrend : []
  const occArr = Array.isArray(occupancy) ? occupancy : []
  const maxRevenue = Math.max(...trendArr.map((r) => r.revenue), 1)

  const filteredOccupancy = selectedMovie
    ? occArr.filter((o) => o.movieId === selectedMovie)
    : occArr.slice(0, 20)

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 font-monts">
      <h1 className="font-bn text-2xl sm:text-4xl text-[#E40C2B] mb-6">
        Admin Dashboard
      </h1>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Users" value={stats.totalMembers} />
          <StatCard label="Active Memberships" value={stats.activeMemberships} />
          <StatCard label="Total Tickets Sold" value={stats.totalTickets} />
          <StatCard
            label="Total Revenue"
            value={`₹${(stats.totalRevenue ?? 0).toLocaleString('en-IN')}`}
          />
        </div>
      )}

      {stats?.membershipsByTier && (
        <div className="rounded-2xl bg-white dark:bg-[#212121] p-6 shadow-md mb-8">
          <h2 className="text-lg font-bold mb-4">Active Memberships by Tier</h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(stats.membershipsByTier).map(([tier, count]) => (
              <div
                key={tier}
                className="flex items-center gap-2 rounded-lg bg-neutral-100 dark:bg-[#141414] px-4 py-2"
              >
                <span className="capitalize font-semibold">{tier}</span>
                <span className="text-[#E40C2B] font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {trendArr.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#212121] p-6 shadow-md mb-8">
          <h2 className="text-lg font-bold mb-4">Monthly Revenue Trend</h2>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 min-w-[500px] h-48">
              {trendArr.map((r) => (
                <div
                  key={r.month}
                  className="flex flex-col items-center flex-1"
                >
                  <div
                    className="w-full bg-[#E40C2B] rounded-t min-w-[20px]"
                    style={{
                      height: `${(r.revenue / maxRevenue) * 160}px`
                    }}
                    title={`₹${r.revenue.toLocaleString('en-IN')} (${r.memberships} memberships)`}
                  />
                  <span className="text-[10px] mt-1 text-gray-500 rotate-[-45deg] origin-top-left whitespace-nowrap">
                    {r.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-[#212121] p-6 shadow-md mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold">Seat Occupancy by Showtime</h2>
          <select
            className="rounded-lg bg-neutral-100 dark:bg-[#141414] px-3 py-2 text-sm"
            value={selectedMovie}
            onChange={(e) => setSelectedMovie(e.target.value)}
          >
            <option value="">All Movies (recent 20)</option>
            {movies.map((m) => (
              <option key={m._id} value={m._id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-left">
                <th className="py-2 px-2">Movie</th>
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Booked</th>
                <th className="py-2 px-2">Blocked</th>
                <th className="py-2 px-2">Available</th>
                <th className="py-2 px-2">Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {filteredOccupancy.map((o) => (
                <tr
                  key={o.showtimeId}
                  className="border-b dark:border-gray-800"
                >
                  <td className="py-2 px-2">{o.movieTitle}</td>
                  <td className="py-2 px-2">
                    {new Date(o.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="py-2 px-2">{o.booked}</td>
                  <td className="py-2 px-2">{o.blocked}</td>
                  <td className="py-2 px-2">{o.available}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-[#E40C2B] h-2 rounded-full"
                          style={{
                            width: `${Math.min(o.occupancyRate, 100)}%`
                          }}
                        />
                      </div>
                      <span>{o.occupancyRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#212121] p-6 shadow-md mb-8">
        <h2 className="text-lg font-bold mb-4">Export Reports</h2>
        <div className="flex flex-wrap gap-4">
          <select
            id="export-movie"
            className="rounded-lg bg-neutral-100 dark:bg-[#141414] px-3 py-2 text-sm"
          >
            <option value="">Select movie for ticket export</option>
            {movies.map((m) => (
              <option key={m._id} value={m._id}>
                {m.title}
              </option>
            ))}
          </select>
          <button
            className="rounded-xl bg-[#E40C2B] text-white px-6 py-2 font-bold text-sm hover:opacity-90"
            onClick={() => {
              const movieId = document.getElementById('export-movie').value
              if (!movieId) return
              const movie = movies.find((m) => m._id === movieId)
              downloadCsv(
                `/admin/export/tickets/${movieId}`,
                `tickets_${movie?.title || 'movie'}.csv`
              )
            }}
          >
            Export Tickets CSV
          </button>
          <button
            className="rounded-xl bg-[#E40C2B] text-white px-6 py-2 font-bold text-sm hover:opacity-90"
            onClick={() =>
              downloadCsv('/admin/export/memberships', 'memberships.csv')
            }
          >
            Export Memberships CSV
          </button>
          <button
            className="rounded-xl bg-[#E40C2B] text-white px-6 py-2 font-bold text-sm hover:opacity-90"
            onClick={() =>
              downloadCsv('/admin/export/revenue', 'revenue_report.csv')
            }
          >
            Export Revenue CSV
          </button>
        </div>
      </div>

      {stats?.ticketTrend && stats.ticketTrend.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#212121] p-6 shadow-md">
          <h2 className="text-lg font-bold mb-4">
            Daily Ticket Sales (Last 30 Days)
          </h2>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 min-w-[500px] h-36">
              {stats.ticketTrend.map((d) => {
                const max = Math.max(
                  ...stats.ticketTrend.map((t) => t.count),
                  1
                )
                return (
                  <div
                    key={d._id}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className="w-full bg-blue-500 rounded-t min-w-[8px]"
                      style={{
                        height: `${(d.count / max) * 120}px`
                      }}
                      title={`${d._id}: ${d.count} tickets`}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
