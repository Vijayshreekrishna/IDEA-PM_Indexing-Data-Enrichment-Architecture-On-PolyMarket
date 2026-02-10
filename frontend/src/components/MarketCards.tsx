import { useState, useEffect } from 'react'

interface Trade {
    id: number
    condition_id: string
    maker: string
    taker: string
    maker_amount: string
    taker_amount: string
    market_title?: string
    block_number: string
    liquidity?: number
    volume_24h?: number
}

export default function MarketCards() {
    const [trades, setTrades] = useState<Trade[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTrades = () => {
            fetch('/api/trades')
                .then(r => r.json())
                .then(data => {
                    setTrades(data)
                    setLoading(false)
                })
                .catch(console.error)
        }

        fetchTrades()
        const interval = setInterval(fetchTrades, 20000)
        return () => clearInterval(interval)
    }, [])

    if (loading) {
        return (
            <div className="glass-card p-8 border border-white/5 space-y-4">
                <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-white/[0.02] rounded-xl border border-white/5 animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="glass-card flex flex-col h-full border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-purple-400">⚡</span>
                    Recent Activity
                </h2>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-semibold">
                    Live Trades & Execution
                </p>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[600px] scrollbar-thin">
                {trades.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-4 opacity-20">📭</div>
                        <div className="text-gray-500 text-sm italic">Waiting for market activity...</div>
                    </div>
                ) : (
                    trades.slice(0, 15).map((trade) => (
                        <div
                            key={trade.id}
                            className="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl p-4 transition-all duration-300 hover:translate-x-1"
                        >
                            <div className="text-xs font-bold text-gray-400 mb-2 truncate group-hover:text-purple-300 transition-colors">
                                {trade.market_title || 'Polymarket Order'}
                            </div>

                            <div className="flex items-end justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="text-[10px] text-gray-600 uppercase font-mono">Volume</div>
                                    <div className="text-lg font-black text-white leading-none">
                                        {(parseFloat(trade.maker_amount) / 1e6).toFixed(2)}
                                        <span className="text-[10px] text-gray-500 ml-1 font-normal uppercase">USDC</span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-[10px] text-gray-600 uppercase font-mono mb-1">Status</div>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-bold">
                                        <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                                        FILLED
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-[9px] text-gray-600 font-mono">
                                <span>BLOCK {trade.block_number}</span>
                                <span className="text-gray-500">SETTLED ON-CHAIN</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-black/20 border-t border-white/5 mt-auto">
                <button className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all">
                    View All Trades
                </button>
            </div>
        </div>
    )
}
