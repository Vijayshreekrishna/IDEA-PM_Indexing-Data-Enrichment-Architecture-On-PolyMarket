import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, defs, linearGradient, stop } from 'recharts'

interface Trade {
    block_number: string
    maker_amount: string
}

export default function TradeVolumeChart() {
    const [chartData, setChartData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchChartData = () => {
            fetch('/api/trades')
                .then(r => r.json())
                .then((trades: Trade[]) => {
                    const grouped = trades.reduce((acc: any, trade) => {
                        const blockRange = Math.floor(parseInt(trade.block_number) / 100) * 100
                        if (!acc[blockRange]) {
                            acc[blockRange] = { block: blockRange, volume: 0 }
                        }
                        acc[blockRange].volume += parseFloat(trade.maker_amount) / 1e6 // Convert to USDC major
                        return acc
                    }, {})

                    const data = Object.values(grouped)
                        .sort((a: any, b: any) => a.block - b.block)
                        .slice(-24) // Last 24 intervals for a "wave" feel

                    setChartData(data)
                    setLoading(false)
                })
                .catch(console.error)
        }

        fetchChartData()
        const interval = setInterval(fetchChartData, 30000)
        return () => clearInterval(interval)
    }, [])

    if (loading) {
        return (
            <div className="glass-card p-8 min-h-[400px] flex items-center justify-center border border-white/5">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-1 bg-white/10 rounded-full overflow-hidden w-32 relative">
                        <div className="absolute top-0 left-0 h-full bg-purple-500 w-1/2 animate-shimmer" />
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Generating Visualizer</div>
                </div>
            </div>
        )
    }

    return (
        <div className="glass-card p-6 border border-white/5 relative overflow-hidden group">
            {/* Background Accent */}
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="flex justify-between items-end mb-8 relative z-10">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="text-purple-400">📈</span>
                        Volume Intensity
                    </h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mt-1">
                        Flow across block ranges
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black text-white">
                        {chartData.reduce((acc, curr) => acc + curr.volume, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[9px] text-gray-500 font-mono uppercase">Total Window volume</div>
                </div>
            </div>

            <div className="h-[300px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="rgba(255,255,255,0.03)"
                        />
                        <XAxis
                            dataKey="block"
                            stroke="rgba(255,255,255,0.1)"
                            tick={{ fill: '#6b7280', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => `B${val.toString().slice(-4)}`}
                        />
                        <YAxis
                            stroke="rgba(255,255,255,0.1)"
                            tick={{ fill: '#6b7280', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-2xl">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Block Range Start</div>
                                            <div className="text-xs font-mono text-purple-400 mb-2">{payload[0].payload.block}</div>
                                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Total Volume</div>
                                            <div className="text-sm font-black text-white">{payload[0].value?.toLocaleString()} USDC</div>
                                        </div>
                                    )
                                }
                                return null
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="volume"
                            stroke="#a855f7"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorVolume)"
                            animationDuration={2000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex justify-between items-center text-[9px] text-gray-600 font-mono uppercase tracking-widest border-t border-white/5 pt-4">
                <span>Real-time Stream Active</span>
                <span className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full" />
                    Live Data
                </span>
            </div>
        </div>
    )
}
