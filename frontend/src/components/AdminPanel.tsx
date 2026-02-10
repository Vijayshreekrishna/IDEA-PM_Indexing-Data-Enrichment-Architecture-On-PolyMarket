import { useState, useEffect } from 'react'

export default function AdminPanel() {
    const [config, setConfig] = useState<any>({ is_paused: false })
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        fetch('/api/admin/config')
            .then(r => r.json())
            .then(data => {
                // If it's an array OR an object with is_paused
                if (Array.isArray(data)) {
                    const mapped = data.reduce((acc: any, curr: any) => {
                        acc[curr.key] = curr.value;
                        return acc;
                    }, {});
                    setConfig(mapped);
                } else {
                    setConfig(data);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const togglePause = async () => {
        setUpdating(true)
        const newValue = !config.is_paused

        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'is_paused', value: newValue })
            })

            if (res.ok) {
                setConfig({ ...config, is_paused: newValue })
            }
        } catch (error) {
            console.error('Failed to update config:', error)
        } finally {
            setUpdating(false)
        }
    }

    if (loading) return null

    const isPaused = config.is_paused === true

    return (
        <div className="mb-12">
            <div className={`glass-card p-6 border transition-all duration-500 relative overflow-hidden ${isPaused ? 'border-amber-500/30 bg-amber-500/5' : 'border-purple-500/30 bg-purple-500/5'}`}>
                {/* Decorative background intensity */}
                <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] transition-colors duration-1000 ${isPaused ? 'bg-amber-600/10' : 'bg-purple-600/10'}`} />

                <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-2xl border transition-all duration-500 ${isPaused ? 'bg-amber-500/20 border-amber-500/40' : 'bg-purple-500/20 border-purple-500/40'}`}>
                            {isPaused ? (
                                <svg className="w-8 h-8 text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            )}
                        </div>

                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-1 flex items-center gap-3">
                                Indexer Control
                                <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest font-bold ${isPaused ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                                    {isPaused ? 'System Paused' : 'Active'}
                                </span>
                            </h2>
                            <p className="text-sm text-gray-400 max-w-md">
                                {isPaused
                                    ? "Indexing is currently suspended. Data and real-time updates are frozen until resumed."
                                    : "Truth Machine is live. Consuming events and enriching market data in real-time."}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={togglePause}
                        disabled={updating}
                        className={`group relative overflow-hidden px-8 py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-xs transition-all duration-500 min-w-[240px] ${isPaused
                                ? 'bg-amber-500 text-black hover:bg-amber-400'
                                : 'bg-purple-600 text-white hover:bg-purple-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:-translate-y-1'
                            } disabled:opacity-50`}
                    >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                            {updating ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isPaused ? '▶ Resume Indexing' : '⏸ Pause Indexing'}
                                </>
                            )}
                        </div>
                    </button>
                </div>
            </div>
        </div>
    )
}
