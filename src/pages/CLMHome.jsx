import { useState, useEffect, useRef } from 'react'
import {
  Shield, Plus, Activity, Globe, Server, Zap,
  RefreshCw, AlertTriangle, CheckCircle, ChevronRight,
  BarChart2, Clock, X, Settings, FileText, Search,
  Database, Layout, Users, Tool, CreditCard, LogOut,
  Menu, Bell, ChevronDown, Download, ExternalLink
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { differenceInDays, format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Area, AreaChart
} from 'recharts'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.cc-shell {
  font-family: 'Inter', -apple-system, system-ui, sans-serif;
  display: flex;
  min-height: calc(100vh - 56px);
  background: #f4f6f9;
  -webkit-font-smoothing: antialiased;
  color: #1a2332;
}

.cc-sidebar {
  width: 220px;
  background: #1c2d3e;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
  scrollbar-width: none;
}
.cc-sidebar::-webkit-scrollbar { display: none; }