import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

// Columns exported in every sheet
const COLUMNS = [
  'Date',
  'Domain',
  'Product',
  'TSS Order ID',
  'Status',
  'Years',
  'Contact Email',
  'Ordered By',
  'Environment',
]

function orderToRow(order, companyName = '') {
  return [
    order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB') : '',
    order.domain || '',
    (order.product_code || 'RapidSSL DV').toUpperCase().replace(/_/g, ' '),
    order.tss_order_id || '',
    order.major_status || order.status || '',
    order.years || 1,
    order.contact_email || '',
    companyName || order.company_name || '',
    order.is_sandbox ? 'Sandbox' : 'Live',
  ]
}

function buildSheet(rows, columns = COLUMNS) {
  const ws = XLSX.utils.aoa_to_sheet([columns, ...rows])
  // Column widths
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 32 }, // Domain
    { wch: 18 }, // Product
    { wch: 16 }, // TSS Order ID
    { wch: 12 }, // Status
    { wch: 6  }, // Years
    { wch: 28 }, // Contact Email
    { wch: 22 }, // Ordered By
    { wch: 10 }, // Environment
  ]
  // Bold header row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c })
    if (!ws[cell]) continue
    ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'F1F5F9' } } }
  }
  return ws
}

function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename)
}

// ─── MASTER ADMIN EXPORTS ────────────────────────────────────────────────────

// All orders platform-wide across all resellers and their customers
export async function downloadAllOrdersAdmin() {
  // Get all resellers
  const { data: resellers } = await supabase
    .from('accounts')
    .select('id, company_name, email')
    .eq('role', 'sub_reseller')
    .eq('status', 'active')

  // Get all end customers
  const { data: customers } = await supabase
    .from('accounts')
    .select('id, company_name, email, parent_id')
    .eq('role', 'end_customer')

  // Build lookup maps
  const resellerMap = {}
  for (const r of resellers || []) resellerMap[r.id] = r.company_name || r.email

  const customerMap = {}
  for (const c of customers || []) {
    customerMap[c.id] = {
      company: c.company_name || c.email,
      reseller: resellerMap[c.parent_id] || 'Direct',
    }
  }

  const allUserIds = [
    ...(resellers || []).map(r => r.id),
    ...(customers || []).map(c => c.id),
  ]

  if (!allUserIds.length) {
    alert('No orders found')
    return
  }

  const { data: orders } = await supabase
    .from('tss_orders')
    .select('id, user_id, domain, product_code, tss_order_id, years, status, major_status, created_at, contact_email, is_sandbox')
    .in('user_id', allUserIds)
    .order('created_at', { ascending: false })

  if (!orders?.length) { alert('No orders found'); return }

  const wb = XLSX.utils.book_new()

  // Sheet 1: All orders
  const allRows = orders.map(o => {
    const customerInfo = customerMap[o.user_id]
    const resellerName = customerInfo?.reseller || resellerMap[o.user_id] || 'Unknown'
    const orderedBy = customerInfo?.company
      ? `${customerInfo.company} (via ${resellerName})`
      : resellerName
    return orderToRow(o, orderedBy)
  })
  XLSX.utils.book_append_sheet(wb, buildSheet(allRows), 'All Orders')

  // Sheet per reseller
  for (const reseller of resellers || []) {
    const resellerCustomerIds = (customers || [])
      .filter(c => c.parent_id === reseller.id)
      .map(c => c.id)
    const resellerOrders = orders.filter(o => resellerCustomerIds.includes(o.user_id))
    if (!resellerOrders.length) continue
    const rows = resellerOrders.map(o => {
      const customerInfo = customerMap[o.user_id]
      return orderToRow(o, customerInfo?.company || '')
    })
    const sheetName = (reseller.company_name || reseller.email || 'Reseller').slice(0, 31)
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), sheetName)
  }

  const date = new Date().toISOString().slice(0, 10)
  downloadWorkbook(wb, `sslvault-all-orders-${date}.xlsx`)
}

// Single reseller's orders (called from admin account tree)
export async function downloadResellerOrders(resellerId, resellerName) {
  const { data: customers } = await supabase
    .from('accounts')
    .select('id, company_name, email')
    .eq('parent_id', resellerId)
    .eq('role', 'end_customer')

  const customerMap = {}
  for (const c of customers || []) customerMap[c.id] = c.company_name || c.email

  const customerIds = (customers || []).map(c => c.id)
  if (!customerIds.length) { alert('No customers under this reseller'); return }

  const { data: orders } = await supabase
    .from('tss_orders')
    .select('id, user_id, domain, product_code, tss_order_id, years, status, major_status, created_at, contact_email, is_sandbox')
    .in('user_id', customerIds)
    .order('created_at', { ascending: false })

  if (!orders?.length) { alert('No orders for this reseller'); return }

  const wb = XLSX.utils.book_new()

  // All orders for this reseller
  const allRows = orders.map(o => orderToRow(o, customerMap[o.user_id] || ''))
  XLSX.utils.book_append_sheet(wb, buildSheet(allRows), 'All Orders')

  // Per customer sheet
  for (const customer of customers || []) {
    const custOrders = orders.filter(o => o.user_id === customer.id)
    if (!custOrders.length) continue
    const rows = custOrders.map(o => orderToRow(o, customer.company_name || customer.email))
    const sheetName = (customer.company_name || customer.email || 'Customer').slice(0, 31)
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), sheetName)
  }

  const safe = (resellerName || 'reseller').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const date = new Date().toISOString().slice(0, 10)
  downloadWorkbook(wb, `sslvault-${safe}-orders-${date}.xlsx`)
}

// ─── RESELLER EXPORTS ────────────────────────────────────────────────────────

// All orders under this reseller (all customers combined + per-customer sheets)
export async function downloadAllOrdersReseller(resellerId, resellerName) {
  const { data: customers } = await supabase
    .from('accounts')
    .select('id, company_name, email')
    .eq('parent_id', resellerId)
    .eq('role', 'end_customer')

  const customerMap = {}
  for (const c of customers || []) customerMap[c.id] = c.company_name || c.email

  const customerIds = (customers || []).map(c => c.id)
  if (!customerIds.length) { alert('No customers yet'); return }

  const { data: orders } = await supabase
    .from('tss_orders')
    .select('id, user_id, domain, product_code, tss_order_id, years, status, major_status, created_at, contact_email, is_sandbox')
    .in('user_id', customerIds)
    .order('created_at', { ascending: false })

  if (!orders?.length) { alert('No orders found'); return }

  const wb = XLSX.utils.book_new()

  // Sheet 1: All orders combined
  const allRows = orders.map(o => orderToRow(o, customerMap[o.user_id] || ''))
  XLSX.utils.book_append_sheet(wb, buildSheet(allRows), 'All Orders')

  // Per-customer sheets
  for (const customer of customers || []) {
    const custOrders = orders.filter(o => o.user_id === customer.id)
    if (!custOrders.length) continue
    const rows = custOrders.map(o => orderToRow(o, customer.company_name || customer.email))
    const sheetName = (customer.company_name || customer.email || 'Customer').slice(0, 31)
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), sheetName)
  }

  const safe = (resellerName || 'orders').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const date = new Date().toISOString().slice(0, 10)
  downloadWorkbook(wb, `sslvault-${safe}-orders-${date}.xlsx`)
}

// Single customer's orders (called from reseller customer list)
export async function downloadCustomerOrders(customerId, customerName) {
  const { data: orders } = await supabase
    .from('tss_orders')
    .select('id, user_id, domain, product_code, tss_order_id, years, status, major_status, created_at, contact_email, is_sandbox')
    .eq('user_id', customerId)
    .order('created_at', { ascending: false })

  if (!orders?.length) { alert('No orders for this customer'); return }

  const wb = XLSX.utils.book_new()
  const rows = orders.map(o => orderToRow(o, customerName))
  XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Orders')

  const safe = (customerName || 'customer').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const date = new Date().toISOString().slice(0, 10)
  downloadWorkbook(wb, `sslvault-${safe}-orders-${date}.xlsx`)
}
