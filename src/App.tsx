import { useMemo, useState } from 'react'
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Activity,
  Banknote,
  BarChart3,
  ClipboardList,
  Download,
  Edit3,
  Factory,
  FileDown,
  FileText,
  Filter,
  Landmark,
  Menu,
  PackageCheck,
  Printer,
  Receipt,
  Search,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

type ModuleKey =
  | 'dashboard'
  | 'funds'
  | 'unit'
  | 'indirect'
  | 'breakeven'
  | 'cashbook'
  | 'sales'
  | 'production'
  | 'expenses'
  | 'reports'

type RecordKind = 'fund' | 'sale' | 'production' | 'expense' | 'balance'

type SittoRecord = {
  id: string
  date: string
  module: ModuleKey
  kind: RecordKind
  ref: string
  description: string
  purpose: string
  category: string
  quantity: number
  unitPrice: number
  amount: number
}

type FormState = Omit<SittoRecord, 'id' | 'ref'>

const UGX = new Intl.NumberFormat('en-UG', {
  style: 'currency',
  currency: 'UGX',
  maximumFractionDigits: 0,
})

const sellingPrice = 150000
const directCost = 100000
const contributionMargin = sellingPrice - directCost
const statedIndirectCosts = 395000

const modules: Array<{ key: ModuleKey; label: string; icon: typeof BarChart3 }> = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'funds', label: 'Fund Utilisation Statement', icon: Landmark },
  { key: 'unit', label: 'Unit Economics', icon: PackageCheck },
  { key: 'indirect', label: 'Monthly Indirect Costs', icon: ClipboardList },
  { key: 'breakeven', label: 'Break-even Analysis', icon: Activity },
  { key: 'cashbook', label: 'Cash Book', icon: Banknote },
  { key: 'sales', label: 'Sales Register', icon: Receipt },
  { key: 'production', label: 'Production Register', icon: Factory },
  { key: 'expenses', label: 'Expense Register', icon: WalletCards },
  { key: 'reports', label: 'Reports', icon: FileText },
]

const directCostBreakdown = [
  ['Harness System', 35000],
  ['Aluminium Frame', 25000],
  ['Seat Platform', 25000],
  ['Rubber Foot Pads', 6000],
  ['Paint', 5000],
  ['Bolts & Fasteners', 4000],
] as const

const indirectCostRows = [
  ['Business Name Registration', 90000],
  ['Wood Casting (Prototype Tooling)', 70000],
  ['Transport', 50000],
  ['Marketing & Promotion', 90000],
  ['Internet & Communication', 35000],
  ['Stationery & Record Keeping', 25000],
  ['Miscellaneous Expenses', 35000],
] as const

const seedCounters: Record<string, number> = {}

const initialRecords: SittoRecord[] = [
  makeRecord('2026-06-10', 'cashbook', 'fund', 'Stanbic Seed Fund Received', 'Seed funding', 'Grant Funding', 1, 500000),
  makeRecord('2026-06-11', 'funds', 'expense', 'Wood Casting (Prototype Tooling)', 'Prototype development', 'Indirect', 1, 70000),
  makeRecord('2026-06-13', 'funds', 'expense', 'Prototype Re-innovation', 'Product improvement', 'Product Development', 1, 110000),
  makeRecord('2026-06-13', 'funds', 'expense', 'Transport', 'Collection of materials', 'Indirect', 1, 10000),
  makeRecord('2026-06-15', 'production', 'production', 'Production of First 2 Sitto Chairs', 'Initial manufacturing', 'Direct', 2, directCost),
  makeRecord('2026-06-15', 'funds', 'balance', 'Cash Balance Retained', 'Working capital', 'Working Capital', 1, 20000),
  makeRecord('2026-06-20', 'sales', 'sale', 'Sitto Wearable Chair', 'Chair #1', 'Product Sale', 1, sellingPrice),
  makeRecord('2026-06-23', 'sales', 'sale', 'Sitto Wearable Chair', 'Chair #2', 'Product Sale', 1, sellingPrice),
  makeRecord('2026-06-24', 'production', 'production', 'Production of 2 Chairs', 'Second Production', 'Direct', 2, directCost),
  makeRecord('2026-06-25', 'funds', 'expense', 'Business Name Registration', 'Business formalisation', 'Indirect', 1, 90000),
  makeRecord('2026-06-28', 'sales', 'sale', 'Sitto Wearable Chair', 'Chairs #3 & #4', 'Product Sale', 2, sellingPrice),
  makeRecord('2026-06-30', 'production', 'production', 'Production of 1 Chair', 'Third Production', 'Direct', 1, directCost),
  makeRecord('2026-07-03', 'sales', 'sale', 'Sitto Wearable Chair', 'Chair #5', 'Product Sale', 1, sellingPrice),
  makeRecord('2026-07-05', 'production', 'production', 'Production of 4 Chairs', 'Fourth Production', 'Direct', 4, directCost),
  makeRecord('2026-07-08', 'sales', 'sale', 'Sitto Wearable Chair', 'Chairs #6-#8', 'Product Sale', 3, sellingPrice),
  makeRecord('2026-07-10', 'sales', 'sale', 'Sitto Wearable Chair', 'Chair #9', 'Product Sale', 1, sellingPrice),
  makeRecord('2026-07-12', 'production', 'production', 'Production of 4 Chairs', 'Fifth Production', 'Direct', 4, directCost),
  makeRecord('2026-07-13', 'sales', 'sale', 'Sitto Wearable Chair', 'Chairs #10 & #11', 'Product Sale', 2, sellingPrice),
]

const emptyForm: FormState = {
  date: '2026-07-14',
  module: 'sales',
  kind: 'sale',
  description: 'Sitto Wearable Chair',
  purpose: '',
  category: 'Product Sale',
  quantity: 1,
  unitPrice: sellingPrice,
  amount: sellingPrice,
}

function App() {
  const [active, setActive] = useState<ModuleKey>('dashboard')
  const [records, setRecords] = useState(initialRecords)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const metrics = useMemo(() => calculateMetrics(records), [records])
  const visibleRecords = useMemo(() => selectRecords(records, active, query, filter), [records, active, query, filter])
  const activeModule = modules.find((module) => module.key === active) ?? modules[0]

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: SittoRecord = {
      ...form,
      id: editingId ?? crypto.randomUUID(),
      ref: editingId ? records.find((item) => item.id === editingId)?.ref ?? nextRef(form.kind, records) : nextRef(form.kind, records),
      amount: Number(form.quantity) * Number(form.unitPrice),
      quantity: Number(form.quantity),
      unitPrice: Number(form.unitPrice),
    }

    setRecords((current) => (editingId ? current.map((item) => (item.id === editingId ? next : item)) : [...current, next]))
    setEditingId(null)
    setForm(emptyForm)
    setActive(next.module)
  }

  function editRecord(record: SittoRecord) {
    const { id: _id, ref: _ref, ...rest } = record
    void _id
    void _ref
    setEditingId(record.id)
    setForm(rest)
    setActive(record.module)
  }

  function deleteRecord(record: SittoRecord) {
    setRecords((current) => current.filter((item) => item.id !== record.id))
  }

  function exportRows(format: 'csv' | 'xls' | 'pdf' | 'doc') {
    const rows = rowsForExport(active, visibleRecords, metrics)
    const fileName = `sitto-${active}-source-records`
    if (format === 'csv') downloadBlob(`${fileName}.csv`, toCsv(rows), 'text/csv')
    if (format === 'xls') downloadBlob(`${fileName}.xls`, toHtmlTable(activeModule.label, rows), 'application/vnd.ms-excel')
    if (format === 'doc') downloadBlob(`${fileName}.doc`, toHtmlTable(activeModule.label, rows), 'application/msword')
    if (format === 'pdf') {
      const doc = new jsPDF()
      doc.text(`Sitto Mobility Solutions - ${activeModule.label}`, 14, 18)
      autoTable(doc, {
        startY: 26,
        head: [Object.keys(rows[0] ?? { Notice: 'No records' })],
        body: rows.map((row) => Object.values(row)),
      })
      doc.save(`${fileName}.pdf`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button className="icon-button lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open modules">
              <Menu size={20} />
            </button>
            <div className="grid h-10 w-10 place-items-center rounded-md bg-emerald-700 text-white">
              <Factory size={21} />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Sitto Mobility Solutions</h1>
              <p className="text-xs text-slate-500">Records produced from the supplied Sitto source data only</p>
            </div>
          </div>
          <button className="button-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
        </div>
      </header>

      <aside className={`sidebar ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="mb-4 flex items-center justify-between px-3 lg:hidden">
          <span className="font-semibold">Sections</span>
          <button className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close modules">
            <X size={18} />
          </button>
        </div>
        <nav className="space-y-1">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <button
                className={`nav-item ${active === module.key ? 'nav-item-active' : ''}`}
                key={module.key}
                onClick={() => {
                  setActive(module.key)
                  setSidebarOpen(false)
                }}
              >
                <Icon size={18} />
                <span>{module.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="min-w-0 px-4 py-5 lg:ml-72 lg:px-6">
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">{activeModule.label}</p>
            <h2 className="text-2xl font-semibold tracking-tight">Source-only Sitto business records</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="button-secondary" onClick={() => exportRows('csv')}>
              <Download size={16} /> CSV
            </button>
            <button className="button-secondary" onClick={() => exportRows('xls')}>
              <FileDown size={16} /> Excel
            </button>
            <button className="button-secondary" onClick={() => exportRows('pdf')}>
              <FileText size={16} /> PDF
            </button>
            <button className="button-secondary" onClick={() => exportRows('doc')}>
              <FileText size={16} /> Word
            </button>
          </div>
        </div>

        {active === 'dashboard' ? (
          <Dashboard metrics={metrics} records={records} setActive={setActive} />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-5">
              <Toolbar query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} />
              {renderModule(active, visibleRecords, records, metrics, editRecord, deleteRecord)}
            </section>
            {['funds', 'cashbook', 'sales', 'production', 'expenses'].includes(active) && (
              <RecordForm form={form} setForm={setForm} saveRecord={saveRecord} editingId={editingId} setEditingId={setEditingId} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function Dashboard({ metrics, records, setActive }: { metrics: ReturnType<typeof calculateMetrics>; records: SittoRecord[]; setActive: (key: ModuleKey) => void }) {
  const cards = [
    ['Total Revenue', UGX.format(metrics.revenue), Receipt, 'sales'],
    ['Total Expenses', UGX.format(metrics.expenses), WalletCards, 'expenses'],
    ['Net Profit', UGX.format(metrics.netProfit), BarChart3, 'reports'],
    ['Cash Balance', UGX.format(metrics.cashBalance), Banknote, 'cashbook'],
    ['Chairs Produced', `${metrics.produced}`, Factory, 'production'],
    ['Chairs Sold', `${metrics.sold}`, PackageCheck, 'sales'],
    ['Inventory Balance', `${metrics.inventory} chairs`, PackageCheck, 'production'],
    ['Break-even Point', `${metrics.breakEvenQuantity} chairs`, Activity, 'breakeven'],
  ] as const

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, target]) => (
          <button className="metric-card text-left" key={label} onClick={() => setActive(target)}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{label}</span>
              <Icon className="text-emerald-700" size={19} />
            </div>
            <strong className="mt-3 block text-2xl font-semibold">{value}</strong>
          </button>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Cash Book Movement">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashRows(records)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => UGX.format(Number(value))} />
                <Line dataKey="receipts" stroke="#047857" strokeWidth={2} dot={false} />
                <Line dataKey="payments" stroke="#be123c" strokeWidth={2} dot={false} />
                <Line dataKey="balance" stroke="#1d4ed8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Recent Source Records">
          <div className="space-y-3">
            {[...records].slice(-7).reverse().map((record) => (
              <div className="rounded-md border border-slate-200 p-3" key={record.id}>
                <p className="text-sm font-medium">{record.date} · {record.description}</p>
                <p className="text-xs text-slate-500">{record.ref} · {record.category} · {UGX.format(record.amount)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  )
}

function renderModule(
  active: ModuleKey,
  visibleRecords: SittoRecord[],
  records: SittoRecord[],
  metrics: ReturnType<typeof calculateMetrics>,
  editRecord: (record: SittoRecord) => void,
  deleteRecord: (record: SittoRecord) => void,
) {
  if (active === 'unit') return <UnitEconomics />
  if (active === 'indirect') return <IndirectCosts />
  if (active === 'breakeven') return <BreakEven metrics={metrics} />
  if (active === 'cashbook') return <CashBook records={records} />
  if (active === 'reports') return <Reports metrics={metrics} />
  if (active === 'expenses') {
    return <RecordTable records={records.filter((record) => record.kind === 'expense' || record.kind === 'production')} editRecord={editRecord} deleteRecord={deleteRecord} />
  }
  return <RecordTable records={visibleRecords} editRecord={editRecord} deleteRecord={deleteRecord} />
}

function Toolbar({ query, setQuery, filter, setFilter }: { query: string; setQuery: (value: string) => void; filter: string; setFilter: (value: string) => void }) {
  return (
    <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_220px]">
      <label className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
        <input className="input pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search date, reference, description, purpose, or category" />
      </label>
      <label className="relative">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
        <select className="input pl-10" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option>All</option>
          <option>Product Sale</option>
          <option>Direct</option>
          <option>Indirect</option>
          <option>Product Development</option>
          <option>Working Capital</option>
          <option>Grant Funding</option>
        </select>
      </label>
    </div>
  )
}

function RecordForm({ form, setForm, saveRecord, editingId, setEditingId }: { form: FormState; setForm: Dispatch<SetStateAction<FormState>>; saveRecord: (event: FormEvent<HTMLFormElement>) => void; editingId: string | null; setEditingId: (value: string | null) => void }) {
  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'kind') {
        next.module = kindToModule(value as RecordKind)
        next.category = defaultCategory(value as RecordKind)
        next.unitPrice = value === 'sale' ? sellingPrice : value === 'production' ? directCost : current.unitPrice
      }
      next.amount = Number(next.quantity) * Number(next.unitPrice)
      return next
    })
  }

  return (
    <aside className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">{editingId ? 'Edit Source Record' : 'Add Source Record'}</h3>
      <p className="mb-4 text-xs text-slate-500">Limited to the sections present in the Sitto records.</p>
      <form className="space-y-3" onSubmit={saveRecord}>
        <Field label="Date"><input className="input" type="date" value={form.date} onChange={(event) => update('date', event.target.value)} required /></Field>
        <Field label="Type">
          <select className="input" value={form.kind} onChange={(event) => update('kind', event.target.value as RecordKind)}>
            <option value="fund">Fund Receipt</option>
            <option value="sale">Sale</option>
            <option value="production">Production</option>
            <option value="expense">Expense</option>
            <option value="balance">Cash Balance Retained</option>
          </select>
        </Field>
        <Field label="Description"><input className="input" value={form.description} onChange={(event) => update('description', event.target.value)} required /></Field>
        <Field label="Purpose"><input className="input" value={form.purpose} onChange={(event) => update('purpose', event.target.value)} /></Field>
        <Field label="Category"><input className="input" value={form.category} onChange={(event) => update('category', event.target.value)} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity"><input className="input" min="0" type="number" value={form.quantity} onChange={(event) => update('quantity', Number(event.target.value))} required /></Field>
          <Field label="Unit Price"><input className="input" min="0" type="number" value={form.unitPrice} onChange={(event) => update('unitPrice', Number(event.target.value))} required /></Field>
        </div>
        <div className="rounded-md bg-slate-100 p-3 text-sm">
          <span>Total Amount</span>
          <strong className="float-right">{UGX.format(form.amount)}</strong>
        </div>
        <div className="flex gap-2">
          <button className="button-primary flex-1" type="submit">{editingId ? 'Save Changes' : 'Create Record'}</button>
          {editingId && <button className="button-secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button>}
        </div>
      </form>
    </aside>
  )
}

function RecordTable({ records, editRecord, deleteRecord }: { records: SittoRecord[]; editRecord: (record: SittoRecord) => void; deleteRecord: (record: SittoRecord) => void }) {
  return (
    <Panel title="Register">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Ref</th><th>Description</th><th>Purpose</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Actions</th></tr></thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{record.date}</td>
                <td>{record.ref}</td>
                <td>{record.description}</td>
                <td>{record.purpose}</td>
                <td>{record.category}</td>
                <td>{record.quantity}</td>
                <td>{UGX.format(record.unitPrice)}</td>
                <td>{UGX.format(record.amount)}</td>
                <td>
                  <div className="flex gap-1">
                    <button className="icon-button" onClick={() => editRecord(record)} aria-label="Edit"><Edit3 size={15} /></button>
                    <button className="icon-button danger" onClick={() => deleteRecord(record)} aria-label="Delete"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function CashBook({ records }: { records: SittoRecord[] }) {
  return (
    <Panel title="Cash Book">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Particulars</th><th>Receipts</th><th>Payments</th><th>Balance</th></tr></thead>
          <tbody>
            {cashRows(records).map((row) => (
              <tr key={row.id}><td>{row.date}</td><td>{row.description}</td><td>{row.receipts ? UGX.format(row.receipts) : '-'}</td><td>{row.payments ? UGX.format(row.payments) : '-'}</td><td>{UGX.format(row.balance)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function UnitEconomics() {
  return (
    <div className="space-y-5">
      <SimpleRows title="Unit Economics" rows={[['Selling Price per Chair', sellingPrice], ['Direct Production Cost per Chair', directCost], ['Contribution Margin per Chair', contributionMargin], ['Gross Profit Margin', '33.3%']]} />
      <SimpleRows title="Direct Cost Breakdown" rows={directCostBreakdown.map(([label, value]) => [label, value])} totalLabel="Total Direct Cost" total={directCost} />
    </div>
  )
}

function IndirectCosts() {
  return <SimpleRows title="Monthly Indirect Costs" rows={indirectCostRows.map(([label, value]) => [label, value])} totalLabel="Total Indirect Costs" total={statedIndirectCosts} />
}

function BreakEven({ metrics }: { metrics: ReturnType<typeof calculateMetrics> }) {
  const data = Array.from({ length: 12 }, (_, index) => {
    const quantity = index + 1
    return { quantity, revenue: quantity * sellingPrice, totalCost: statedIndirectCosts + quantity * directCost }
  })

  return (
    <Panel title="Break-even Analysis">
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="quantity" />
              <YAxis />
              <Tooltip formatter={(value) => UGX.format(Number(value))} />
              <Bar dataKey="revenue" fill="#047857" />
              <Bar dataKey="totalCost" fill="#be123c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          <Stat label="Selling Price per Chair" value={UGX.format(sellingPrice)} />
          <Stat label="Variable Direct Cost per Chair" value={UGX.format(directCost)} />
          <Stat label="Contribution Margin" value={UGX.format(contributionMargin)} />
          <Stat label="Break-even Quantity" value={`${metrics.breakEvenQuantity} chairs`} />
          <Stat label="Break-even Sales Revenue" value={UGX.format(metrics.breakEvenRevenue)} />
        </div>
      </div>
    </Panel>
  )
}

function Reports({ metrics }: { metrics: ReturnType<typeof calculateMetrics> }) {
  return (
    <div className="space-y-5">
      <SimpleRows title="Summary Report" rows={[['Total Sales Revenue', metrics.revenue], ['Chairs Sold', `${metrics.sold} chairs`], ['Total Chairs Produced', `${metrics.produced} chairs`], ['Total Production Cost', metrics.productionCost], ['Total Expenses in Register', metrics.expenses], ['Cash Balance', metrics.cashBalance], ['Break-even Point', `${metrics.breakEvenQuantity} chairs`]]} />
      <BreakEven metrics={metrics} />
    </div>
  )
}

function SimpleRows({ title, rows, totalLabel, total }: { title: string; rows: Array<[string, number | string]>; totalLabel?: string; total?: number }) {
  return (
    <Panel title={title}>
      <div className="divide-y divide-slate-200">
        {rows.map(([label, value]) => (
          <div className="flex justify-between gap-4 py-3" key={label}>
            <span className="text-slate-600">{label}</span>
            <strong>{typeof value === 'number' ? UGX.format(value) : value}</strong>
          </div>
        ))}
        {totalLabel && (
          <div className="flex justify-between gap-4 py-3">
            <span className="font-semibold">{totalLabel}</span>
            <strong>{UGX.format(total ?? 0)}</strong>
          </div>
        )}
      </div>
    </Panel>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-4 font-semibold">{title}</h3>{children}</section>
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-xl">{value}</strong></div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700"><span className="mb-1 block">{label}</span>{children}</label>
}

function makeRecord(date: string, module: ModuleKey, kind: RecordKind, description: string, purpose: string, category: string, quantity: number, unitPrice: number): SittoRecord {
  const ref = nextSeedRef(kind)
  return { id: crypto.randomUUID(), date, module, kind, ref, description, purpose, category, quantity, unitPrice, amount: quantity * unitPrice }
}

function nextSeedRef(kind: RecordKind) {
  const prefix = prefixFor(kind)
  seedCounters[prefix] = (seedCounters[prefix] ?? 0) + 1
  return `${prefix}${String(seedCounters[prefix]).padStart(3, '0')}`
}

function nextRef(kind: RecordKind, records: SittoRecord[]) {
  const prefix = prefixFor(kind)
  const count = records.filter((record) => record.ref.startsWith(prefix)).length + 1
  return `${prefix}${String(count).padStart(3, '0')}`
}

function prefixFor(kind: RecordKind) {
  if (kind === 'sale') return 'SIT'
  if (kind === 'production') return 'PRO'
  if (kind === 'expense') return 'EXP'
  if (kind === 'fund') return 'FND'
  return 'BAL'
}

function kindToModule(kind: RecordKind): ModuleKey {
  if (kind === 'sale') return 'sales'
  if (kind === 'production') return 'production'
  if (kind === 'expense') return 'expenses'
  if (kind === 'fund') return 'cashbook'
  return 'funds'
}

function defaultCategory(kind: RecordKind) {
  if (kind === 'sale') return 'Product Sale'
  if (kind === 'production') return 'Direct'
  if (kind === 'expense') return 'Indirect'
  if (kind === 'fund') return 'Grant Funding'
  return 'Working Capital'
}

function selectRecords(records: SittoRecord[], active: ModuleKey, query: string, filter: string) {
  const queryText = query.toLowerCase()
  return records.filter((record) => {
    const belongs =
      active === 'funds'
        ? ['funds', 'cashbook'].includes(record.module) && ['fund', 'expense', 'balance'].includes(record.kind)
        : active === 'expenses'
          ? record.kind === 'expense' || record.kind === 'production'
        : record.module === active
    const matchesQuery = [record.date, record.ref, record.description, record.purpose, record.category].join(' ').toLowerCase().includes(queryText)
    const matchesFilter = filter === 'All' || record.category === filter
    return belongs && matchesQuery && matchesFilter
  })
}

function cashRows(records: SittoRecord[]) {
  let balance = 0
  return [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((record) => record.kind !== 'balance')
    .map((record) => {
      const receipts = record.kind === 'fund' || record.kind === 'sale' ? record.amount : 0
      const payments = receipts ? 0 : record.amount
      balance += receipts - payments
      return { ...record, receipts, payments, balance }
    })
}

function calculateMetrics(records: SittoRecord[]) {
  const sales = records.filter((record) => record.kind === 'sale')
  const production = records.filter((record) => record.kind === 'production')
  const expenses = records.filter((record) => record.kind === 'expense' || record.kind === 'production')
  const revenue = sales.reduce((total, record) => total + record.amount, 0)
  const sold = sales.reduce((total, record) => total + record.quantity, 0)
  const produced = production.reduce((total, record) => total + record.quantity, 0)
  const productionCost = production.reduce((total, record) => total + record.amount, 0)
  const expenseTotal = expenses.reduce((total, record) => total + record.amount, 0)
  const cashBalance = cashRows(records).at(-1)?.balance ?? 0
  const breakEvenQuantity = Math.ceil(statedIndirectCosts / contributionMargin)
  return {
    revenue,
    sold,
    produced,
    inventory: produced - sold,
    productionCost,
    expenses: expenseTotal,
    netProfit: revenue - sold * directCost - statedIndirectCosts,
    cashBalance,
    breakEvenQuantity,
    breakEvenRevenue: breakEvenQuantity * sellingPrice,
  }
}

function rowsForExport(active: ModuleKey, records: SittoRecord[], metrics: ReturnType<typeof calculateMetrics>) {
  if (active === 'unit') return [
    { Item: 'Selling Price per Chair', Amount: sellingPrice },
    { Item: 'Direct Production Cost per Chair', Amount: directCost },
    { Item: 'Contribution Margin per Chair', Amount: contributionMargin },
    { Item: 'Gross Profit Margin', Amount: '33.3%' },
  ]
  if (active === 'indirect') return indirectCostRows.map(([Expense, Amount]) => ({ Expense, Amount }))
  if (active === 'breakeven') return [{ Item: 'Break-even Quantity', Value: `${metrics.breakEvenQuantity} chairs` }, { Item: 'Break-even Sales Revenue', Value: metrics.breakEvenRevenue }]
  if (active === 'reports') return [{ Revenue: metrics.revenue, Expenses: metrics.expenses, CashBalance: metrics.cashBalance, Produced: metrics.produced, Sold: metrics.sold, Inventory: metrics.inventory }]
  return records.map(({ date, ref, description, purpose, category, quantity, unitPrice, amount }) => ({ Date: date, Reference: ref, Description: description, Purpose: purpose, Category: category, Quantity: quantity, UnitPrice: unitPrice, Amount: amount }))
}

function toCsv(rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] ?? { Notice: 'No records' })
  return [headers.join(','), ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(','))].join('\n')
}

function toHtmlTable(title: string, rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] ?? { Notice: 'No records' })
  return `<html><body><h1>Sitto Mobility Solutions - ${title}</h1><table border="1" cellspacing="0" cellpadding="6"><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${row[header] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`
}

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default App
