'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, parse } from 'date-fns';
import { properties, defaultPropertyId } from '@/lib/properties';

const FALLBACK_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];

interface OverviewBase {
  activeUsers: string;
  sessions: string;
  pageViews: string;
  bounceRate: string;
  avgSessionDuration: string;
  newUsers: string;
}

interface Overview extends OverviewBase {
  prev: OverviewBase;
}

interface DailyData {
  date: string;
  users: number;
  sessions: number;
}

interface PageData {
  page: string;
  views: number;
}

interface DeviceData {
  device: string;
  sessions: number;
}

interface CityData {
  city: string;
  users: number;
}

interface AnalyticsData {
  overview: Overview;
  daily: DailyData[];
  pages: PageData[];
  devices: DeviceData[];
  cities: CityData[];
}

function calcChange(current: string, prev: string, isRate = false) {
  const c = parseFloat(current);
  const p = parseFloat(prev);
  if (!p) return null;
  if (isRate) return ((c - p) / p) * 100;
  return ((c - p) / p) * 100;
}

function StatCard({
  label, value, current, prev, invertTrend = false,
}: {
  label: string;
  value: string;
  current?: string;
  prev?: string;
  invertTrend?: boolean;
}) {
  const change = current && prev ? calcChange(current, prev) : null;
  const isPositive = change !== null && (invertTrend ? change < 0 : change > 0);
  const isNegative = change !== null && (invertTrend ? change > 0 : change < 0);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {change !== null && (
        <p className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${
          isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-gray-400'
        }`}>
          {isPositive ? '↑' : isNegative ? '↓' : '–'}
          {Math.abs(change).toFixed(1)}% vs. predch. obdobie
        </p>
      )}
    </div>
  );
}

function formatDuration(seconds: string) {
  const s = Math.round(parseFloat(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function formatDate(dateStr: string) {
  try {
    return format(parse(dateStr, 'yyyyMMdd', new Date()), 'd. M.');
  } catch {
    return dateStr;
  }
}

export default function Dashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState('30');
  const [propertyId, setPropertyId] = useState(defaultPropertyId);

  const colors = properties.find(p => p.id === propertyId)?.colors ?? FALLBACK_COLORS;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?days=${days}&propertyId=${propertyId}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Chyba pri načítaní dát');
    } finally {
      setLoading(false);
    }
  }, [days, propertyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dailyFormatted = data?.daily.map((d) => ({
    ...d,
    date: formatDate(d.date),
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-xs text-gray-400">Google Analytics 4</p>
          </div>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 border-0 cursor-pointer hover:bg-gray-200 transition-colors"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            {['7', '30', '90'].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  days === d
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {d}d
              </button>
            ))}
            <button
              onClick={fetchData}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              ↻
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <strong>Chyba:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Aktívni používatelia" value={parseInt(data.overview.activeUsers).toLocaleString()} current={data.overview.activeUsers} prev={data.overview.prev.activeUsers} />
              <StatCard label="Zobrazenia stránok" value={parseInt(data.overview.pageViews).toLocaleString()} current={data.overview.pageViews} prev={data.overview.prev.pageViews} />
              <StatCard label="Bounce rate" value={`${(parseFloat(data.overview.bounceRate) * 100).toFixed(1)}%`} current={data.overview.bounceRate} prev={data.overview.prev.bounceRate} invertTrend />
              <StatCard label="Priem. trvanie relácie" value={formatDuration(data.overview.avgSessionDuration)} current={data.overview.avgSessionDuration} prev={data.overview.prev.avgSessionDuration} />
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Návštevníci & relácie</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke={colors[0]} strokeWidth={2} dot={false} name="Používatelia" />
                  <Line type="monotone" dataKey="sessions" stroke={colors[2]} strokeWidth={2} dot={false} name="Relácie" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Zariadenia</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={data.devices}
                      dataKey="sessions"
                      nameKey="device"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {data.devices.map((_, i) => (
                        <Cell key={i} fill={colors[i % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Top mestá</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.cities} layout="vertical" margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis dataKey="city" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} width={80} />
                    <Tooltip />
                    <Bar dataKey="users" fill={colors[0]} radius={[0, 4, 4, 0]} name="Používatelia" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Top stránky</h2>
              <div className="space-y-2">
                {data.pages.map((p, i) => {
                  const maxViews = data.pages[0]?.views || 1;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{p.page}</p>
                        <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                          <div
                            className="h-1.5 bg-indigo-500 rounded-full"
                            style={{ width: `${(p.views / maxViews) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-600 shrink-0">
                        {p.views.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
