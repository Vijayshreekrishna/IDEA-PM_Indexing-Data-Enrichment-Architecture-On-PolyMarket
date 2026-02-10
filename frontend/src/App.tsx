import { useState, useEffect } from 'react'
import LiveFeed from './components/LiveFeed'
import Stats from './components/Stats'
import AdminPanel from './components/AdminPanel'
import SlowFeed from './components/SlowFeed'

function App() {
    const [stats, setStats] = useState<any>({
        total_events: 0,
        total_trades: 0,
        unique_markets: 0,
        last_block: '0'
    })
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        const fetchStats = () => {
            fetch('/api/stats')
                .then(r => r.json())
                .then(setStats)
                .catch(console.error)
        }
        fetchStats()

        // Handle Real-time WebSocket Stats Triggers
        const ws = new WebSocket(`ws://${window.location.hostname}:3000/ws`)
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data)
            if (message.type === 'NEW_EVENT' || message.type === 'NEW_TRADE') {
                fetchStats() // Instant refresh when a new event occurs
            }
        }

        const interval = setInterval(fetchStats, 2000) // Fast polling for sub-block stats
        return () => {
            clearInterval(interval)
            ws.close()
        }
    }, [])

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30">
            {/* Header / Nav */}
            <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-[1700px] mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                            <span className="text-xl font-black">PM</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">
                                IDEA <span className="text-purple-500">Truth Machine</span>
                            </h1>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1">
                                Polymarket Intelligence Engine
                            </p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-96 group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="SEARCH MARKETS, HASHS, OR EVENTS..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs font-bold tracking-widest focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all"
                        />
                    </div>
                </div>
            </nav>

            <main className="max-w-[1700px] mx-auto px-6 py-8">
                {/* Admin Section */}
                <AdminPanel />

                {/* Stats Overview */}
                <div className="mb-8">
                    <Stats stats={stats} />
                </div>

                {/* Dashboard Layout - Dual Feed View (50/50 Split) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Primary Feed - High Velocity */}
                    <div className="lg:col-span-6">
                        <LiveFeed searchQuery={searchQuery} />
                    </div>

                    {/* Secondary Feed - Slow Insights */}
                    <div className="lg:col-span-6 sticky top-28">
                        <SlowFeed searchQuery={searchQuery} />
                    </div>
                </div>
            </main>

            <footer className="border-t border-white/5 py-12 mt-12 bg-black/40">
                <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        IDEA-PM © 2026 • ADVANCED INDEXING ARCHITECTURE
                    </div>
                    <div className="flex gap-8">
                        <a href="#" className="text-gray-500 hover:text-purple-400 transition-colors text-[10px] uppercase font-bold tracking-widest">Documentation</a>
                        <a href="#" className="text-gray-500 hover:text-purple-400 transition-colors text-[10px] uppercase font-bold tracking-widest">Support</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default App
