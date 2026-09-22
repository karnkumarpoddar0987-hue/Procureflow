import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, FunnelChart, Funnel, LabelList
} from 'recharts'
import {
  TrendingUp, Users, Scale, CreditCard, FileText,
  Download, RefreshCw, BarChart2, PieChart as PieIcon, List
} from 'lucide-react'
import { operatorApi } from '@/api/operator'
import { cn } from '@/utils/cn'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const GRADE_COLORS: Record<string, string> = { A: '#10b981', B: '#3b82f6', C: '#f59e0b' }

type Tab = 'overview' | 'trends' | 'crops' | 'report'

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-xs text-primary-600 font-medium mt-0.5">{sub}</p>}
    </div>
  )
}

export default function OperatorAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [days, setDays] = useState(30)
  const [generating, setGenerating] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['operator-analytics', days],
    queryFn: () => operatorApi.getAnalytics(days).then(r => r.data),
  })

  const summary = data?.summary
  const daily = data?.daily_trend ?? []
  const crops = data?.crop_breakdown ?? []
  const grades = data?.grade_breakdown ?? []
  const farmers = data?.farmers_report ?? []

  // ── AI-style local analysis ───────────────────────────────────────
  const runAnalysis = async () => {
    if (!data) return
    setAnalysing(true)
    await new Promise(r => setTimeout(r, 1200))
    const topCrop = crops.sort((a: any, b: any) => b.count - a.count)[0]
    const topGrade = grades.sort((a: any, b: any) => b.count - a.count)[0]
    const completionRate = summary?.completion_rate ?? 0
    const avgWeight = summary?.avg_weight_per_farmer ?? 0
    const trend = daily.slice(-7).reduce((sum: number, d: any) => sum + d.completed, 0)

    const lines = [
      `📊 Analysis Period: Last ${days} days — ${data.centre_name}`,
      ``,
      `✅ Completion Rate: ${completionRate}% — ${completionRate >= 80 ? 'Excellent performance' : completionRate >= 60 ? 'Good, room for improvement' : 'Needs attention — many incomplete procurements'}`,
      ``,
      `🌾 Top Crop: ${topCrop?.crop || 'N/A'} with ${topCrop?.count || 0} procurements (${topCrop?.weight?.toFixed(1) || 0} quintals)`,
      ``,
      `🏅 Dominant Quality Grade: Grade ${topGrade?.grade || 'N/A'} (${topGrade?.count || 0} farmers)`,
      ``,
      `⚖️ Avg Weight per Farmer: ${avgWeight} quintals — ${avgWeight > 30 ? 'High volume farmers' : avgWeight > 15 ? 'Medium volume' : 'Small farmers dominant'}`,
      ``,
      `📈 Last 7-day completions: ${trend} — ${trend > 10 ? 'High activity week' : 'Low activity week'}`,
      ``,
      `💰 Total Amount Disbursed: ₹${(summary?.total_amount_paid ?? 0).toLocaleString('en-IN')}`,
      ``,
      `🔍 Recommendation: ${completionRate < 70 ? 'Focus on reducing incomplete procurements by streamlining quality check process.' : 'Continue current operations. Consider expanding capacity during peak season.'}`,
    ]
    setAnalysisResult(lines.join('\n'))
    setAnalysing(false)
  }

  // ── PDF Report Generation ─────────────────────────────────────────
  const downloadPDF = async () => {
    if (!data) return
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()

      // Header
      doc.setFillColor(29, 78, 216)
      doc.rect(0, 0, W, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16); doc.setFont('helvetica', 'bold')
      doc.text('Procureflow — Operator Report', 14, 11)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal')
      doc.text(`Centre: ${data.centre_name}  |  Period: Last ${days} days  |  Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 20)

      let y = 36

      // Summary
      doc.setTextColor(0); doc.setFontSize(12); doc.setFont('helvetica', 'bold')
      doc.text('Summary Statistics', 14, y); y += 6

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Total Bookings', String(summary?.total_bookings ?? 0)],
          ['Completed Procurements', String(summary?.total_completed ?? 0)],
          ['Completion Rate', `${summary?.completion_rate ?? 0}%`],
          ['Total Weight Procured', `${(summary?.total_weight_quintals ?? 0).toFixed(2)} qtl`],
          ['Total Amount Disbursed', `₹${(summary?.total_amount_paid ?? 0).toLocaleString('en-IN')}`],
          ['Avg Weight per Farmer', `${summary?.avg_weight_per_farmer ?? 0} qtl`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [29, 78, 216] },
        margin: { left: 14, right: 14 },
      })

      y = (doc as any).lastAutoTable.finalY + 10

      // Crop breakdown
      if (crops.length > 0) {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('Crop-wise Breakdown', 14, y); y += 4
        autoTable(doc, {
          startY: y,
          head: [['Crop', 'Farmers', 'Total Weight (qtl)', 'Total Amount (₹)']],
          body: crops.map((c: any) => [c.crop, c.count, c.weight.toFixed(2), `₹${c.amount.toLocaleString('en-IN')}`]),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129] },
          margin: { left: 14, right: 14 },
        })
        y = (doc as any).lastAutoTable.finalY + 10
      }

      // All Farmers Report
      if (farmers.length > 0) {
        if (y > 220) { doc.addPage(); y = 20 }
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('All Farmers Report', 14, y); y += 4
        autoTable(doc, {
          startY: y,
          head: [['Token', 'Farmer', 'Mobile', 'Crop', 'Net Wt(qtl)', 'Grade', 'Amount(₹)', 'Stage', 'Date']],
          body: farmers.map((f: any) => [
            f.token, f.farmer_name, f.farmer_mobile || '—',
            f.crop, f.net_weight.toFixed(2), f.grade,
            f.amount > 0 ? `₹${f.amount.toLocaleString('en-IN')}` : '—',
            f.stage?.replace(/_/g, ' ') || '—', f.date
          ]),
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] },
          styles: { fontSize: 7 },
          margin: { left: 14, right: 14 },
        })
      }

      // Footer on each page
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8); doc.setTextColor(150)
        doc.text(`Procureflow | Page ${i} of ${pageCount} | Confidential`, 14, doc.internal.pageSize.getHeight() - 8)
      }

      doc.save(`Operator_Report_${data.centre_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e) {
      console.error(e)
    }
    setGenerating(false)
  }

  const TABS = [
    { id: 'overview' as Tab, label: 'Overview', icon: BarChart2 },
    { id: 'trends' as Tab, label: 'Trends', icon: TrendingUp },
    { id: 'crops' as Tab, label: 'Crops & Grades', icon: PieIcon },
    { id: 'report' as Tab, label: 'Farmers Report', icon: List },
  ]

  if (isLoading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-surface-alt animate-pulse rounded-2xl" />)}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground">{data?.centre_name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="input-field py-1.5 text-sm w-32">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={() => refetch()}
            className="p-2 rounded-xl border border-border hover:bg-surface-alt">
            <RefreshCw size={16} />
          </button>
          {/* ANALYSE button */}
          <button onClick={runAnalysis} disabled={analysing}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors">
            {analysing ? <RefreshCw size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            {analysing ? 'Analysing...' : 'Analyse'}
          </button>
          {/* Download PDF */}
          <button onClick={downloadPDF} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
            {generating ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            {generating ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Analysis result */}
      {analysisResult && (
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-400">📊 Analysis Report</p>
            <button onClick={() => setAnalysisResult(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
          </div>
          <pre className="text-xs text-violet-800 dark:text-violet-300 whitespace-pre-wrap font-mono leading-relaxed">
            {analysisResult}
          </pre>
        </div>
      )}

      {/* Summary KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Bookings"    value={summary?.total_bookings ?? 0}       color="text-blue-600" />
        <StatCard label="Completed"         value={summary?.total_completed ?? 0}      color="text-green-600" />
        <StatCard label="Completion Rate"   value={`${summary?.completion_rate ?? 0}%`} color="text-primary-600" />
        <StatCard label="Total Weight (qtl)"value={`${(summary?.total_weight_quintals ?? 0).toFixed(1)}`} color="text-amber-600" />
        <StatCard label="Amount Paid"       value={`₹${((summary?.total_amount_paid ?? 0)/1000).toFixed(0)}K`} color="text-emerald-600" />
        <StatCard label="Avg Wt/Farmer"     value={`${summary?.avg_weight_per_farmer ?? 0} qtl`} color="text-cyan-600" />
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto gap-1 bg-surface-alt p-1 rounded-2xl w-fit max-w-full">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Stage funnel */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Procurement Stage Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(data?.stage_funnel ?? {}).map(([stage, count]) => (
                <div key={stage} className="bg-surface-alt rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">{count as number}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stage.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Completion bar */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-3">Completion Rate</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-surface-alt rounded-full h-4 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${summary?.completion_rate ?? 0}%` }} />
              </div>
              <span className="font-bold text-green-600">{summary?.completion_rate ?? 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Trends ── */}
      {tab === 'trends' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Daily Bookings vs Completions</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={daily.slice(-30)}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any, n: string) => [v, n === 'bookings' ? 'Bookings' : 'Completed']} />
                <Legend />
                <Line type="monotone" dataKey="bookings"  stroke="#3b82f6" strokeWidth={2} dot={false} name="Bookings" />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Daily Amount Disbursed (₹)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily.slice(-30)}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Amount']} />
                <Bar dataKey="amount" fill="#10b981" radius={[4,4,0,0]} name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Crops & Grades ── */}
      {tab === 'crops' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Crop-wise Farmer Count</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={crops} dataKey="count" nameKey="crop" cx="50%" cy="50%" outerRadius={80} label={({ crop, percent }) => `${crop} ${(percent*100).toFixed(0)}%`}>
                  {crops.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any, _: any, p: any) => [v, p.payload.crop]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Quality Grade Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={grades}>
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" radius={[6,6,0,0]}>
                  {grades.map((g: any, i: number) => <Cell key={i} fill={GRADE_COLORS[g.grade] || COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 md:col-span-2">
            <h3 className="font-semibold mb-4">Crop-wise Weight & Amount</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={crops}>
                <XAxis dataKey="crop" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left"  dataKey="weight" fill="#3b82f6" name="Weight (qtl)" radius={[4,4,0,0]} />
                <Bar yAxisId="right" dataKey="amount" fill="#10b981" name="Amount (₹)"   radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Farmers Report ── */}
      {tab === 'report' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h3 className="font-semibold">All Farmers Report ({farmers.length})</h3>
            <button onClick={downloadPDF} disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium">
              <FileText size={12} /> {generating ? 'Generating...' : 'Export PDF'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt">
                <tr>
                  {['Token','Farmer','Mobile','Crop','Net Wt','Grade','Amount','Stage','Date'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {farmers.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">No records found</td></tr>
                )}
                {farmers.map((f: any, i: number) => (
                  <tr key={i} className="border-t border-border hover:bg-surface-alt/50 transition-colors">
                    <td className="px-3 py-2 font-mono text-xs text-primary-600 font-semibold">{f.token}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{f.farmer_name}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{f.farmer_mobile || '—'}</td>
                    <td className="px-3 py-2">{f.crop}</td>
                    <td className="px-3 py-2">{f.net_weight > 0 ? `${f.net_weight.toFixed(2)} qtl` : '—'}</td>
                    <td className="px-3 py-2">
                      {f.grade !== '—' && (
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold',
                          f.grade === 'A' ? 'bg-green-100 text-green-700' :
                          f.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700')}>
                          {f.grade}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-semibold text-emerald-600">
                      {f.amount > 0 ? `₹${f.amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs bg-surface-alt px-2 py-0.5 rounded-full">
                        {f.stage?.replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{f.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
