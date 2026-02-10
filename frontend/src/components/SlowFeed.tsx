import { useState, useEffect, useRef } from 'react'
import { copyToClipboard } from '../utils/export'

interface Event {
    block_number: string
    tx_hash: string
    event_name: string
    decoded: any
    market_title?: string
    market_description?: string
    timestamp?: string
}

interface SlowFeedProps {
    searchQuery?: string
}

export default function SlowFeed({ searchQuery = '' }: SlowFeedProps) {
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
    const [isHovered, setIsHovered] = useState(false)
    const [expandDescription, setExpandDescription] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchSlowEvents = () => {
            fetch('/api/events')
                .then(r => r.json())
                .then(data => {
                    // Filter for variety
                    const raw = data as Event[];

                    // Diversity Logic: 
                    // 1. Prioritize events with titles
                    // 2. Ensure we don't show the same exact market/event pair too many times in a row
                    const seenKeys = new Set();
                    const diverse = [];

                    for (const e of raw) {
                        const key = `${e.market_title || 'unnamed'}-${e.event_name}`;
                        // Allow duplicates but limit them for variety
                        const count = diverse.filter(d => `${d.market_title || 'unnamed'}-${d.event_name}` === key).length;

                        if (count < 2) { // Allow up to 2 of the same market-event pair in the visible set
                            diverse.push(e);
                        }
                        if (diverse.length >= 40) break;
                    }

                    setEvents(diverse)
                    setLoading(false)
                })
                .catch(console.error)
        }

        fetchSlowEvents()
        const interval = setInterval(fetchSlowEvents, 15000) // Moderate refresh for new events
        return () => clearInterval(interval)
    }, [])

    // Smooth Auto-Scroll Logic
    useEffect(() => {
        if (loading || isHovered || !scrollRef.current) return

        const scroll = () => {
            if (scrollRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
                if (scrollTop + clientHeight >= scrollHeight - 1) {
                    scrollRef.current.scrollTop = 0
                } else {
                    scrollRef.current.scrollTop += 0.4 // Slightly slower for better readability
                }
            }
        }

        const scrollInterval = setInterval(scroll, 30)
        return () => clearInterval(scrollInterval)
    }, [loading, isHovered])

    const filteredEvents = events.filter(event => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            event.event_name.toLowerCase().includes(query) ||
            event.market_title?.toLowerCase().includes(query) ||
            event.tx_hash.toLowerCase().includes(query)
        )
    })

    if (loading) {
        return (
            <div className="glass-card h-[700px] p-8 flex items-center justify-center border border-white/5">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest animate-pulse font-bold">
                    Analyzing Market Sentiment...
                </div>
            </div>
        )
    }

    return (
        <div className="glass-card h-[700px] flex flex-col border border-white/5 overflow-hidden bg-purple-500/[0.01]">
            <div className="p-6 border-b border-white/5 bg-purple-500/[0.03]">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <span className="text-purple-400">🔭</span>
                    Market Insights
                </h2>
                <div className="flex justify-between items-center mt-1">
                    <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-bold">
                        Filtered Diversity • High Velocity
                    </p>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[8px] text-green-500 font-bold uppercase">Streaming</span>
                    </div>
                </div>
            </div>

            <div
                ref={scrollRef}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none"
                style={{ scrollBehavior: 'auto' }}
            >
                {filteredEvents.length === 0 ? (
                    <div className="text-center py-12 text-gray-600 text-[10px] uppercase font-bold tracking-widest">
                        No matches found
                    </div>
                ) : (
                    [...filteredEvents, ...filteredEvents].map((event, idx) => (
                        <div
                            key={`${event.tx_hash}-${idx}`}
                            onClick={() => {
                                setSelectedEvent(event)
                                setExpandDescription(false)
                            }}
                            className="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl p-4 cursor-pointer transition-all duration-700 hover:border-purple-500/30"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${event.market_title ? 'text-purple-400 bg-purple-500/10' : 'text-gray-500 bg-white/5'}`}>
                                    {event.event_name}
                                </span>
                                <span className="text-[9px] text-gray-600 font-mono italic">
                                    {event.market_title ? 'ENRICHED' : 'ON-CHAIN RAW'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-200 font-medium leading-relaxed group-hover:text-white transition-colors line-clamp-2">
                                {event.market_title || (
                                    event.decoded?.args?.conditionId ? `Market ${event.decoded.args.conditionId.slice(0, 10)}...` :
                                        event.decoded?.args?.id ? `Token ${event.decoded.args.id.toString().slice(0, 10)}...` :
                                            `System Event: ${event.event_name}`
                                )}
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[8px] text-gray-600 uppercase tracking-widest font-bold border-t border-white/5 pt-2">
                                <span>BLOCK {event.block_number}</span>
                                <span className={`opacity-0 group-hover:opacity-100 transition-opacity ${event.market_title ? 'text-purple-400' : 'text-gray-500'}`}>View Data →</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Detail View */}
            {selectedEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div
                        className="glass-card w-full max-w-2xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600" />

                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] mb-2">Market Sentiment Analysis</div>
                                    <h3 className="text-xl font-bold text-white leading-tight">
                                        {selectedEvent.market_title || 'Unmapped Network Event'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5 relative">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Intel Description</div>
                                    <p className={`text-sm text-gray-300 leading-relaxed italic ${!expandDescription ? 'line-clamp-3' : ''}`}>
                                        "{selectedEvent.market_description || 'Detailed intelligence pending for this market outcome block. The engine is currently mapping this condition ID to the Gamma market pool.'}"
                                    </p>
                                    {selectedEvent.market_description && selectedEvent.market_description.length > 150 && (
                                        <button
                                            onClick={() => setExpandDescription(!expandDescription)}
                                            className="mt-2 text-[10px] text-purple-400 font-bold uppercase tracking-tighter hover:text-purple-300 transition-colors"
                                        >
                                            {expandDescription ? 'Show Less ↑' : 'Read Full Description ↓'}
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">TX IDENTIFIER</div>
                                        <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 bg-black/40 p-2 rounded truncate">
                                            {selectedEvent.tx_hash}
                                            <button onClick={() => copyToClipboard(selectedEvent.tx_hash)} className="hover:text-white transition-colors">📋</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">NETWORK LOCATION</div>
                                        <div className="text-[11px] font-mono text-gray-400 bg-black/40 p-2 rounded">
                                            POLYGON BLOCK {selectedEvent.block_number}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-4">Atomic Parameters</div>
                                    <div className="bg-black/20 rounded-lg p-4 font-mono text-[10px] text-purple-300 max-h-[150px] overflow-auto border border-white/5">
                                        <pre>{JSON.stringify(selectedEvent.decoded, null, 2)}</pre>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="w-full mt-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                            >
                                Dissolve View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
