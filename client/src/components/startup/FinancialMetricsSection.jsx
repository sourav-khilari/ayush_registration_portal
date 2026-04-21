import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  FaChartLine,
  FaRupeeSign,
  FaPlus,
  FaTrash,
  FaSave,
  FaLock,
  FaDownload,
  FaExclamationTriangle,
} from "react-icons/fa";
import { StartupAPI } from "../../api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const formatCurrency = (v) => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return "—";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function FinancialMetricsSection({
  startup,
  onSaved,
  editable = true,
  showReadOnlyExports = false,
}) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [barChart, setBarChart] = useState(null);
  const [barChartError, setBarChartError] = useState("");
  const [alertsData, setAlertsData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [form, setForm] = useState({
    revenue: "",
    profit_loss: "",
    expenses: "",
    funding_raised: "",
    burn_rate: "",
    valuation: "",
    expenses_breakdown: [],
    revenue_monthly: [],
    revenue_history: [],
  });

  useEffect(() => {
    if (!startup) return;
    setForm({
      revenue: startup.revenue ?? "",
      profit_loss: startup.profit_loss ?? "",
      expenses: startup.expenses ?? "",
      funding_raised: startup.funding_raised ?? "",
      burn_rate: startup.burn_rate ?? "",
      valuation: startup.valuation ?? "",
      expenses_breakdown: Array.isArray(startup.expenses_breakdown) && startup.expenses_breakdown.length
        ? startup.expenses_breakdown.map((e) => ({ category: e.category || "", amount: e.amount ?? "" }))
        : [{ category: "", amount: "" }],
      revenue_monthly: Array.isArray(startup.revenue_monthly) && startup.revenue_monthly.length
        ? startup.revenue_monthly.map((r) => ({ period: r.period || "", value: r.value ?? "" }))
        : [{ period: "", value: "" }],
      revenue_history: Array.isArray(startup.revenue_history) && startup.revenue_history.length
        ? startup.revenue_history.map((r) => ({ year: r.year ?? "", value: r.value ?? "" }))
        : [{ year: "", value: "" }],
    });
  }, [startup]);

  useEffect(() => {
    let mounted = true;
    async function loadBarChart() {
      if (!startup?._id) return;
      setBarChartError("");
      try {
        const res = await StartupAPI.profitExpenseChart(startup._id);
        if (!mounted) return;
        setBarChart(res?.chart || null);
      } catch (e) {
        if (!mounted) return;
        setBarChart(null);
        setBarChartError(e?.message || "Failed to load chart");
      }
    }
    loadBarChart();
    return () => {
      mounted = false;
    };
  }, [startup?._id]);

  useEffect(() => {
    let mounted = true;
    async function loadInsights() {
      if (!startup?._id) return;
      setLoadingInsights(true);
      try {
        const [alertsRes, forecastRes] = await Promise.all([
          StartupAPI.financialAlerts(startup._id).catch(() => ({ alerts: [] })),
          StartupAPI.financialForecast(startup._id).catch(() => ({ forecast: [] })),
        ]);
        if (!mounted) return;
        setAlertsData(Array.isArray(alertsRes?.alerts) ? alertsRes.alerts : []);
        setForecastData(Array.isArray(forecastRes?.forecast) ? forecastRes.forecast : []);
      } finally {
        if (mounted) setLoadingInsights(false);
      }
    }
    loadInsights();
    return () => {
      mounted = false;
    };
  }, [startup?._id]);

  const handleExport = async (format) => {
    if (!startup?._id) return;
    try {
      const token = localStorage.getItem("token");
      const apiBase = import.meta.env.VITE_API_BASE || "/api";
      const resp = await fetch(
        `${apiBase}/startups/${startup._id}/analytics/export?format=${encodeURIComponent(format)}`,
        {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!resp.ok) throw new Error(`Export failed (${resp.status})`);
      const blob = await resp.blob();
      const ext = format === "pdf" ? "pdf" : "csv";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financial-analytics-${startup._id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addExpenseRow = () => {
    setForm((prev) => ({
      ...prev,
      expenses_breakdown: [...prev.expenses_breakdown, { category: "", amount: "" }],
    }));
  };
  const removeExpenseRow = (i) => {
    setForm((prev) => ({
      ...prev,
      expenses_breakdown: prev.expenses_breakdown.filter((_, idx) => idx !== i),
    }));
  };
  const setExpenseRow = (i, field, val) => {
    setForm((prev) => ({
      ...prev,
      expenses_breakdown: prev.expenses_breakdown.map((row, idx) =>
        idx === i ? { ...row, [field]: val } : row
      ),
    }));
  };

  const addRevenueMonthlyRow = () => {
    setForm((prev) => ({
      ...prev,
      revenue_monthly: [...prev.revenue_monthly, { period: "", value: "" }],
    }));
  };
  const removeRevenueMonthlyRow = (i) => {
    setForm((prev) => ({
      ...prev,
      revenue_monthly: prev.revenue_monthly.filter((_, idx) => idx !== i),
    }));
  };
  const setRevenueMonthlyRow = (i, field, val) => {
    setForm((prev) => ({
      ...prev,
      revenue_monthly: prev.revenue_monthly.map((row, idx) =>
        idx === i ? { ...row, [field]: val } : row
      ),
    }));
  };

  const addRevenueHistoryRow = () => {
    setForm((prev) => ({
      ...prev,
      revenue_history: [...prev.revenue_history, { year: "", value: "" }],
    }));
  };
  const removeRevenueHistoryRow = (i) => {
    setForm((prev) => ({
      ...prev,
      revenue_history: prev.revenue_history.filter((_, idx) => idx !== i),
    }));
  };
  const setRevenueHistoryRow = (i, field, val) => {
    setForm((prev) => ({
      ...prev,
      revenue_history: prev.revenue_history.map((row, idx) =>
        idx === i ? { ...row, [field]: val } : row
      ),
    }));
  };

  const handleSave = async () => {
    if (!startup?._id) return;
    setSaving(true);
    try {
      const payload = {
        revenue: form.revenue === "" ? undefined : Number(form.revenue),
        profit_loss: form.profit_loss === "" ? undefined : Number(form.profit_loss),
        expenses: form.expenses === "" ? undefined : Number(form.expenses),
        funding_raised: form.funding_raised === "" ? undefined : Number(form.funding_raised),
        burn_rate: form.burn_rate === "" ? undefined : Number(form.burn_rate),
        valuation: form.valuation === "" ? undefined : Number(form.valuation),
        expenses_breakdown: form.expenses_breakdown
          .filter((e) => e.category.trim() || e.amount !== "")
          .map((e) => ({ category: e.category.trim(), amount: Number(e.amount) || 0 })),
        revenue_monthly: form.revenue_monthly
          .filter((r) => r.period || r.value !== "")
          .map((r) => ({ period: String(r.period), value: Number(r.value) || 0 })),
        revenue_history: form.revenue_history
          .filter((r) => r.year !== "" || r.value !== "")
          .map((r) => ({ year: Number(r.year) || 0, value: Number(r.value) || 0 })),
      };
      await StartupAPI.update(startup._id, payload);
      setEditMode(false);
      onSaved?.();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const revenueHistoryData = (startup?.revenue_history || [])
    .filter((r) => r.year != null && r.value != null)
    .sort((a, b) => (a.year || 0) - (b.year || 0));
  const revenueMonthlyData = (startup?.revenue_monthly || [])
    .filter((r) => r.period && r.value != null)
    .sort((a, b) => String(a.period).localeCompare(String(b.period)));
  const lineLabels = revenueMonthlyData.length
    ? revenueMonthlyData.map((r) => r.period)
    : revenueHistoryData.map((r) => String(r.year));
  const lineValues = revenueMonthlyData.length
    ? revenueMonthlyData.map((r) => r.value)
    : revenueHistoryData.map((r) => r.value);

  const expenseBreakdown = (startup?.expenses_breakdown || []).filter(
    (e) => e.category && (e.amount || 0) > 0
  );
  const profitLoss = startup?.profit_loss != null ? Number(startup.profit_loss) : null;
  const expenses = startup?.expenses != null ? Number(startup.expenses) : null;

  const canEdit = editable === true;

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-white/60 p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FaChartLine className="mr-3 text-ayush-700" />
            Financial Dashboard
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Revenue, profitability and expense insights.
          </p>
        </div>

        {!canEdit ? (
          <div className="flex items-center gap-2">
            {showReadOnlyExports && (
              <>
                <button
                  type="button"
                  onClick={() => handleExport("csv")}
                  className="text-sm font-semibold px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 inline-flex items-center"
                >
                  <FaDownload className="mr-2" /> CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  className="text-sm font-semibold px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 inline-flex items-center"
                >
                  <FaDownload className="mr-2" /> PDF
                </button>
              </>
            )}
            <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
              <FaLock className="mr-2" /> Read-only
            </span>
          </div>
        ) : !editMode ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="text-sm font-semibold px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 inline-flex items-center"
            >
              <FaDownload className="mr-2" /> CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="text-sm font-semibold px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 inline-flex items-center"
            >
              <FaDownload className="mr-2" /> PDF
            </button>
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-ayush-600 text-white hover:bg-ayush-700"
            >
              Edit Metrics
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-ayush-600 text-white hover:bg-ayush-700 disabled:opacity-60"
            >
              <FaSave className="mr-2" /> {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="text-sm font-semibold px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 inline-flex items-center"
            >
              <FaDownload className="mr-2" /> CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="text-sm font-semibold px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 inline-flex items-center"
            >
              <FaDownload className="mr-2" /> PDF
            </button>
          </div>
        )}
      </div>

      {editMode && canEdit ? (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Revenue (Yearly) ₹</label>
              <input
                type="number"
                value={form.revenue}
                onChange={(e) => update("revenue", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500"
                placeholder="Annual revenue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profit / Loss ₹</label>
              <input
                type="number"
                value={form.profit_loss}
                onChange={(e) => update("profit_loss", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500"
                placeholder="Negative = loss"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expenses ₹</label>
              <input
                type="number"
                value={form.expenses}
                onChange={(e) => update("expenses", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Funding Raised ₹</label>
              <input
                type="number"
                value={form.funding_raised}
                onChange={(e) => update("funding_raised", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Burn Rate (Monthly) ₹</label>
              <input
                type="number"
                value={form.burn_rate}
                onChange={(e) => update("burn_rate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valuation ₹ (optional)</label>
              <input
                type="number"
                value={form.valuation}
                onChange={(e) => update("valuation", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Revenue over time (for line chart)</label>
            <p className="text-xs text-gray-500 mb-2">Add period (e.g. 2025-01 for monthly or use Year below)</p>
            {form.revenue_monthly.map((row, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={row.period}
                  onChange={(e) => setRevenueMonthlyRow(i, "period", e.target.value)}
                  placeholder="2025-01"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="number"
                  value={row.value}
                  onChange={(e) => setRevenueMonthlyRow(i, "value", e.target.value)}
                  placeholder="Amount"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button type="button" onClick={() => removeRevenueMonthlyRow(i)} className="p-2 text-red-600">
                  <FaTrash />
                </button>
              </div>
            ))}
            <button type="button" onClick={addRevenueMonthlyRow} className="text-sm text-ayush-600 flex items-center gap-1">
              <FaPlus /> Add month/period
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Revenue by year (alternative)</label>
            {form.revenue_history.map((row, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="number"
                  value={row.year}
                  onChange={(e) => setRevenueHistoryRow(i, "year", e.target.value)}
                  placeholder="Year"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="number"
                  value={row.value}
                  onChange={(e) => setRevenueHistoryRow(i, "value", e.target.value)}
                  placeholder="Amount"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button type="button" onClick={() => removeRevenueHistoryRow(i)} className="p-2 text-red-600">
                  <FaTrash />
                </button>
              </div>
            ))}
            <button type="button" onClick={addRevenueHistoryRow} className="text-sm text-ayush-600 flex items-center gap-1">
              <FaPlus /> Add year
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expense breakdown (for pie chart)</label>
            {form.expenses_breakdown.map((row, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={row.category}
                  onChange={(e) => setExpenseRow(i, "category", e.target.value)}
                  placeholder="Category (e.g. Salaries)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="number"
                  value={row.amount}
                  onChange={(e) => setExpenseRow(i, "amount", e.target.value)}
                  placeholder="Amount"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button type="button" onClick={() => removeExpenseRow(i)} className="p-2 text-red-600">
                  <FaTrash />
                </button>
              </div>
            ))}
            <button type="button" onClick={addExpenseRow} className="text-sm text-ayush-600 flex items-center gap-1">
              <FaPlus /> Add category
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <div className="text-xs uppercase tracking-wide text-amber-700">Alerts</div>
              {loadingInsights ? (
                <p className="text-sm text-amber-800 mt-2">Checking financial alerts…</p>
              ) : alertsData.length ? (
                <ul className="mt-2 space-y-2">
                  {alertsData.map((a, idx) => (
                    <li key={`${a.code}-${idx}`} className="text-sm text-amber-900 flex items-start">
                      <FaExclamationTriangle className="mr-2 mt-0.5" />
                      <span>
                        <strong>{a.title}:</strong> {a.message}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-emerald-700 mt-2">No critical alerts.</p>
              )}
            </div>
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <div className="text-xs uppercase tracking-wide text-blue-700">Runway Forecast (6 months)</div>
              {forecastData.length ? (
                <div className="mt-2 space-y-1">
                  {forecastData.slice(0, 3).map((f) => (
                    <p key={f.month} className="text-sm text-blue-900">
                      M{f.month}: Rev {formatCurrency(f.projected_revenue)} | Burn {formatCurrency(f.projected_burn)} | Net {formatCurrency(f.projected_net)}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-blue-800 mt-2">Forecast unavailable.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <MetricCard label="Revenue" value={formatCurrency(startup?.revenue)} />
            <MetricCard label="Profit / Loss" value={formatCurrency(startup?.profit_loss)} />
            <MetricCard label="Expenses" value={formatCurrency(startup?.expenses)} />
            <MetricCard label="Funding Raised" value={formatCurrency(startup?.funding_raised)} />
            <MetricCard label="Burn Rate" value={formatCurrency(startup?.burn_rate)} />
            <MetricCard label="Valuation" value={formatCurrency(startup?.valuation)} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {lineLabels.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Revenue over time</h3>
                <div className="h-48">
                  <Line
                    data={{
                      labels: lineLabels,
                      datasets: [
                        {
                          label: "Revenue",
                          data: lineValues,
                          borderColor: "rgb(34, 139, 34)",
                          backgroundColor: "rgba(34, 139, 34, 0.1)",
                          tension: 0.2,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </div>
            )}
            {((barChart && Array.isArray(barChart.values)) ||
              profitLoss != null ||
              expenses != null) && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Profit vs Expense</h3>
                  {barChartError ? (
                    <span className="text-xs text-gray-400">Using local values</span>
                  ) : (
                    <span className="text-xs text-gray-400">API chart</span>
                  )}
                </div>
                <div className="h-48">
                  <Bar
                    data={{
                      labels: barChart?.labels || ["Profit / Loss", "Expenses"],
                      datasets: [
                        {
                          label: "₹",
                          data: barChart?.values || [profitLoss ?? 0, expenses ?? 0],
                          backgroundColor: [
                            (Number((barChart?.values || [profitLoss ?? 0])[0]) || 0) >= 0
                              ? "rgba(34, 139, 34, 0.75)"
                              : "rgba(220, 38, 38, 0.75)",
                            "rgba(107, 114, 128, 0.75)",
                          ],
                          borderRadius: 10,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true } },
                    }}
                  />
                </div>
              </div>
            )}
            {expenseBreakdown.length > 0 && (
              <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Expense breakdown</h3>
                <div className="h-48 flex justify-center">
                  <Doughnut
                    data={{
                      labels: expenseBreakdown.map((e) => e.category),
                      datasets: [
                        {
                          data: expenseBreakdown.map((e) => e.amount),
                          backgroundColor: [
                            "rgba(34, 139, 34, 0.7)",
                            "rgba(59, 130, 246, 0.7)",
                            "rgba(234, 179, 8, 0.7)",
                            "rgba(239, 68, 68, 0.7)",
                            "rgba(168, 85, 247, 0.7)",
                          ],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          {!lineLabels.length && !expenseBreakdown.length && profitLoss == null && expenses == null && (
            <p className="text-gray-500 text-sm">Add financial data and save to see charts.</p>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900 flex items-center">
        <FaRupeeSign className="text-gray-400 mr-1 text-xs" />
        {value}
      </div>
    </div>
  );
}
