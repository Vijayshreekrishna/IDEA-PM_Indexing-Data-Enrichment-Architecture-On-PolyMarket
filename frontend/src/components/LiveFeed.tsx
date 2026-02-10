import { useState, useEffect } from 'react'
import { copyToClipboard } from '../utils/export'

interface Event {
    block_number: string
    tx_hash: string
    event_name: string
    decoded: any
    market_title?: string
    market_description?: string
}

interface LiveFeedProps {
    searchQuery?: string
}

export default function LiveFeed({ searchQuery = '' }: LiveFeedProps) {
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
    const [expandDescription, setExpandDescription] = useState<Record<string, boolean>>({})

    useEffect(() => {
        const fetchEvents = () => {
            fetch('/api/events')
                .then(r => r.json())
                .then(data => {
                    setEvents(data)
                    setLoading(false)
                })
                .catch(console.error)
        }

        fetchEvents()

        const ws = new WebSocket(`ws://${window.location.hostname}:3000/ws`)
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data)
            if (message.type === 'NEW_EVENT') {
                setEvents(prev => [message.data, ...prev].slice(0, 100))
            }
        }

        const interval = setInterval(fetchEvents, 15000)
        return () => {
            clearInterval(interval)
            ws.close()
        }
    }, [])

    if (loading) {
        return (
            <div className="glass-card p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                    <div className="text-gray-400 animate-pulse">Synchronizing Live Feed...</div>
                </div>
            </div>
        )
    }

    const toggleExpand = (txHash: string) => {
        setExpandedEvent(expandedEvent === txHash ? null : txHash)
    }

    const filteredEvents = events.filter(event => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            event.event_name.toLowerCase().includes(query) ||
            event.tx_hash.toLowerCase().includes(query) ||
            event.market_title?.toLowerCase().includes(query) ||
            JSON.stringify(event.decoded?.args || {}).toLowerCase().includes(query)
        )
    })

    return (
        <div className="glass-card overflow-hidden border border-white/5">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3">
                    <div className="relative">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-ping absolute"></div>
                        <div className="w-2 h-2 bg-green-500 rounded-full relative"></div>
                    </div>
                    Live Event Stream
                </h2>
                {searchQuery && (
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-500/30">
                        {filteredEvents.length} Matches
                    </span>
                )}
            </div>

            <div className="divide-y divide-white/5 max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                {filteredEvents.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 italic">
                        No events found matching your current filters.
                    </div>
                ) : (
                    filteredEvents.map((event, idx) => {
                        const isExpanded = expandedEvent === event.tx_hash
                        const args = event.decoded?.args || {}
                        const isTrade = event.event_name === 'OrderFilled' || event.event_name === 'LimitOrderFilled'

                        return (
                            <div
                                key={`${event.tx_hash}-${idx}`}
                                className={`group transition-all duration-300 ${isExpanded ? 'bg-white/[0.03]' : 'hover:bg-white/[0.01]'}`}
                            >
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() => toggleExpand(event.tx_hash)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-sm font-bold tracking-tight uppercase ${isTrade ? 'text-green-400' : 'text-purple-400'}`}>
                                                {event.event_name}
                                            </span>
                                            <span className="text-[10px] font-mono text-gray-500 bg-black/30 px-1.5 py-0.5 rounded w-fit">
                                                BLOCK {event.block_number}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                {event.tx_hash.slice(0, 14)}...
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    copyToClipboard(event.tx_hash)
                                                }}
                                                className="p-1.5 hover:bg-white/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Metadata Section */}
                                        <div className="space-y-2">
                                            {event.market_title ? (
                                                <div className="flex gap-2 items-start">
                                                    <span className="text-gray-400 shrink-0 mt-0.5">📊</span>
                                                    <span className="text-sm text-gray-200 line-clamp-2 leading-snug">
                                                        {event.market_title}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-gray-500 italic bg-white/[0.02] p-2 rounded border border-white/10 font-mono">
                                                    {event.decoded?.args?.conditionId ? `MARKET ${event.decoded.args.conditionId.slice(0, 16)}...` :
                                                        event.decoded?.args?.id ? `TOKEN ${event.decoded.args.id.slice(0, 16)}...` :
                                                            `RAW: ${event.event_name} (PENDING METADATA)`}
                                                </div>
                                            )}
                                        </div>

                                        {/* Quick Metrics Section */}
                                        {isTrade && (
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-green-500/5 border border-green-500/10 rounded-lg p-2">
                                                    <span className="text-[9px] text-gray-500 uppercase block mb-1">Maker</span>
                                                    <span className="text-xs font-bold text-green-400">
                                                        {(parseFloat(args.makerAmount) / 1e6).toFixed(2)} USDC
                                                    </span>
                                                </div>
                                                <div className="flex-1 bg-blue-500/5 border border-blue-500/10 rounded-lg p-2">
                                                    <span className="text-[9px] text-gray-500 uppercase block mb-1">Taker</span>
                                                    <span className="text-xs font-bold text-blue-400">
                                                        {(parseFloat(args.takerAmount) / 1e6).toFixed(2)} USDC
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {!isExpanded && (
                                        <div className="mt-3 text-[10px] text-gray-500 flex justify-center hover:text-gray-300 transition-colors">
                                            Click to view on-chain parameters ↓
                                        </div>
                                    )}
                                </div>

                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-2 duration-300">
                                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-4">
                                            {/* Addresses */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {args.from && <AddressItem label="From" value={args.from} color="purple" />}
                                                {args.to && <AddressItem label="To" value={args.to} color="purple" />}
                                                {args.maker && <AddressItem label="Maker" value={args.maker} color="blue" />}
                                                {args.taker && <AddressItem label="Taker" value={args.taker} color="blue" />}
                                                {args.operator && <AddressItem label="Operator" value={args.operator} color="gray" />}
                                            </div>

                                            {/* Values */}
                                            <div className="space-y-3 pt-2">
                                                {args.value && (
                                                    <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded">
                                                        <span className="text-[11px] text-gray-400 uppercase">Value Raw</span>
                                                        <span className="text-xs font-mono text-green-400">{args.value.toString()}</span>
                                                    </div>
                                                )}
                                                {args.id && (
                                                    <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded">
                                                        <span className="text-[11px] text-gray-400 uppercase">Token ID</span>
                                                        <span className="text-xs font-mono text-amber-400">{args.id.toString()}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {event.market_description && (
                                                <div className="pt-2">
                                                    <span className="text-[11px] text-gray-500 uppercase block mb-1">Contextual Info</span>
                                                    <p className={`text-xs text-gray-400 leading-relaxed bg-white/[0.01] p-3 rounded-lg border border-white/5 italic ${!expandDescription[event.tx_hash] ? 'line-clamp-2' : ''}`}>
                                                        "{event.market_description}"
                                                    </p>
                                                    {event.market_description.length > 150 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandDescription(prev => ({ ...prev, [event.tx_hash]: !prev[event.tx_hash] }));
                                                            }}
                                                            className="mt-1 text-[10px] text-purple-400 font-bold uppercase hover:text-purple-300"
                                                        >
                                                            {expandDescription[event.tx_hash] ? 'Show Less ↑' : 'Read Full Context ↓'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex justify-center pt-2">
                                                <button
                                                    onClick={() => setExpandedEvent(null)}
                                                    className="text-[10px] text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
                                                >
                                                    ↑ Collapse Details
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

function AddressItem({ label, value, color }: { label: string, value: string, color: 'purple' | 'blue' | 'gray' }) {
    const colorClasses = {
        purple: 'text-purple-300',
        blue: 'text-blue-300',
        gray: 'text-gray-300'
    }

    return (
        <div className="space-y-1">
            <span className="text-[10px] text-gray-500 uppercase">{label}</span>
            <div className="flex items-center justify-between gap-2 p-1.5 bg-white/[0.03] rounded border border-white/5">
                <span className={`text-[11px] font-mono truncate ${colorClasses[color]}`}>
                    {value}
                </span>
                <button
                    onClick={() => copyToClipboard(value)}
                    className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                >
                    <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
