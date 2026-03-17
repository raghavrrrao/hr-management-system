import React, { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from "recharts";
import { getAllBurnoutScores, getEmployeeBurnoutScore } from "../api/burnout";
import BurnoutMeter from "../components/BurnoutMeter";

// ── Constants ────────────────────────────────────────────────────────────────

const RISK_COLORS = {
    Low: "#22c55e",
    Moderate: "#f59e0b",
    High: "#ef4444",
};

const RISK_BG = {
    Low: "#f0fdf4",
    Moderate: "#fffbeb",
    High: "#fef2f2",
};

const SIGNAL_LABELS = {
    avgDailyHours: "Avg Daily Hrs",
    consecutiveLongDays: "Consecutive Long Days",
    hoursIncreasing: "Hours Trending Up",
    taskCompletionRate: "Task Completion %",
    lowCompletionHighHours: "Fatigue Pattern",
    recentSickLeaves: "Sick Leaves (30d)",
    lateCheckouts: "Late Check-outs",
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SummaryCard = ({ label, value, color, emoji }) => (
    <div style={{
        background: "#fff",
        borderRadius: 12,
        padding: "18px 20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
        borderLeft: `4px solid ${color}`,
        flex: 1,
        minWidth: 130,
    }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{label}</div>
    </div>
);

const EmployeeRow = ({ record, onSelect, isSelected }) => (
    <tr
        onClick={() => onSelect(record)}
        style={{
            cursor: "pointer",
            background: isSelected ? "#f0f9ff" : "white",
            transition: "background 0.15s",
        }}
    >
        <td style={tdStyle}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{record.employee?.name || "—"}</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{record.employee?.department || record.employee?.email}</div>
        </td>
        <td style={tdStyle}>
            <span style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: RISK_BG[record.riskLevel],
                color: RISK_COLORS[record.riskLevel],
                fontWeight: 700,
                fontSize: 12,
            }}>
                {record.riskLevel}
            </span>
        </td>
        <td style={tdStyle}>
            {/* Mini score bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                    flex: 1,
                    height: 6,
                    background: "#f3f4f6",
                    borderRadius: 999,
                    overflow: "hidden",
                    maxWidth: 100,
                }}>
                    <div style={{
                        height: "100%",
                        width: `${record.score}%`,
                        background: RISK_COLORS[record.riskLevel],
                        borderRadius: 999,
                        transition: "width 0.8s ease",
                    }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{record.score}</span>
            </div>
        </td>
        <td style={tdStyle}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
                {record.signals?.avgDailyHours?.toFixed(1)}h / day
            </span>
        </td>
        <td style={tdStyle}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
                {record.signals?.taskCompletionRate?.toFixed(0)}%
            </span>
        </td>
    </tr>
);

const DetailPanel = ({ record, onClose }) => {
    if (!record) return null;

    const formatWeek = (d) => new Date(d).toLocaleDateString("en-IN", {
        day: "numeric", month: "short",
    });

    return (
        <div style={{
            position: "fixed",
            right: 0, top: 0, bottom: 0,
            width: 380,
            background: "#fff",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
            zIndex: 100,
            overflowY: "auto",
            padding: "28px 24px",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{record.employee?.name}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                        Week of {formatWeek(record.weekStart)}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: "none", border: "1px solid #e5e7eb",
                        borderRadius: 8, padding: "4px 10px",
                        cursor: "pointer", fontSize: 13, color: "#6b7280",
                    }}
                >✕ Close</button>
            </div>

            {/* Meter */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <BurnoutMeter score={record.score} riskLevel={record.riskLevel} size={140} />
            </div>

            {/* Signals */}
            <div style={{ marginBottom: 20 }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#374151" }}>Signal Breakdown</p>
                {Object.entries(record.signals || {}).map(([key, val]) => {
                    const display = typeof val === "boolean"
                        ? (val ? "⚠️ Yes" : "✅ No")
                        : typeof val === "number"
                            ? (key.includes("Rate") ? `${val.toFixed(1)}%` : val)
                            : val;
                    return (
                        <div key={key} style={{
                            display: "flex", justifyContent: "space-between",
                            padding: "7px 0", borderBottom: "1px solid #f3f4f6",
                            fontSize: 13,
                        }}>
                            <span style={{ color: "#6b7280" }}>{SIGNAL_LABELS[key] || key}</span>
                            <span style={{ fontWeight: 600, color: (typeof val === "boolean" && val) ? "#dc2626" : "#111827" }}>
                                {display}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Suggestions */}
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 8px", color: "#374151" }}>
                    💡 Recommended Actions
                </p>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {(record.suggestions || []).map((s, i) => (
                        <li key={i} style={{ fontSize: 13, color: "#4b5563", marginBottom: 5 }}>{s}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// ── Main Page ────────────────────────────────────────────────────────────────

const BurnoutDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);
    const [filterRisk, setFilterRisk] = useState("All");
    const [search, setSearch] = useState("");

    useEffect(() => {
        getAllBurnoutScores()
            .then((res) => setData(res.data))
            .catch(() => setError("Failed to load burnout data."))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
            ⏳ Analysing team wellness data…
        </div>
    );

    if (error) return (
        <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>{error}</div>
    );

    const { summary, scores } = data;

    // Pie chart data
    const pieData = [
        { name: "Low", value: summary.low, color: RISK_COLORS.Low },
        { name: "Moderate", value: summary.moderate, color: RISK_COLORS.Moderate },
        { name: "High", value: summary.high, color: RISK_COLORS.High },
    ].filter((d) => d.value > 0);

    // Bar chart — top 10 by score
    const barData = [...scores]
        .slice(0, 10)
        .map((s) => ({
            name: s.employee?.name?.split(" ")[0] || "—",
            score: s.score,
            fill: RISK_COLORS[s.riskLevel],
        }));

    // Filtered table
    const filtered = scores.filter((s) => {
        const matchRisk = filterRisk === "All" || s.riskLevel === filterRisk;
        const matchName = (s.employee?.name || "").toLowerCase().includes(search.toLowerCase());
        return matchRisk && matchName;
    });

    return (
        <div style={{ padding: "24px 28px", fontFamily: "inherit", maxWidth: 1100 }}>
            {/* Title */}
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontWeight: 800, fontSize: 22, color: "#111827" }}>
                    🧠 Burnout Early Warning System
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6b7280" }}>
                    Proactive risk detection based on attendance, tasks & leave patterns.
                </p>
            </div>

            {/* Summary cards */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
                <SummaryCard label="Total Employees" value={summary.total} color="#6366f1" emoji="👥" />
                <SummaryCard label="High Risk" value={summary.high} color={RISK_COLORS.High} emoji="🔥" />
                <SummaryCard label="Moderate Risk" value={summary.moderate} color={RISK_COLORS.Moderate} emoji="⚠️" />
                <SummaryCard label="Low Risk" value={summary.low} color={RISK_COLORS.Low} emoji="✅" />
                <SummaryCard label="Avg Burnout Score" value={summary.avgScore} color="#8b5cf6" emoji="📊" />
            </div>

            {/* Charts row */}
            <div style={{ display: "flex", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>

                {/* Bar chart */}
                <div style={{ ...chartCard, flex: 2, minWidth: 280 }}>
                    <p style={chartTitle}>Top 10 Highest Burnout Scores</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={barData} barSize={24}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v) => [`${v}`, "Score"]} />
                            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                {barData.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie chart */}
                <div style={{ ...chartCard, flex: 1, minWidth: 200 }}>
                    <p style={chartTitle}>Risk Distribution</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%" cy="50%"
                                outerRadius={65}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                                fontSize={11}
                            >
                                {pieData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Employee table */}
            <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
                {/* Table controls */}
                <div style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #f3f4f6",
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                }}>
                    <input
                        placeholder="Search employee…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={inputStyle}
                    />
                    {["All", "High", "Moderate", "Low"].map((r) => (
                        <button
                            key={r}
                            onClick={() => setFilterRisk(r)}
                            style={{
                                padding: "5px 14px",
                                borderRadius: 999,
                                border: "none",
                                cursor: "pointer",
                                fontWeight: 600,
                                fontSize: 13,
                                background: filterRisk === r
                                    ? (r === "All" ? "#111827" : RISK_COLORS[r])
                                    : "#f3f4f6",
                                color: filterRisk === r ? "#fff" : "#374151",
                            }}
                        >
                            {r}
                        </button>
                    ))}
                    <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: "auto" }}>
                        {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
                    </span>
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#f9fafb" }}>
                                {["Employee", "Risk", "Score", "Avg Hours", "Task Rate"].map((h) => (
                                    <th key={h} style={thStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center", padding: 32, color: "#9ca3af" }}>
                                        No employees match the filter.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((record) => (
                                    <EmployeeRow
                                        key={record._id}
                                        record={record}
                                        onSelect={setSelected}
                                        isSelected={selected?._id === record._id}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Side detail panel */}
            <DetailPanel record={selected} onClose={() => setSelected(null)} />
        </div>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const thStyle = {
    padding: "10px 16px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
};

const tdStyle = {
    padding: "12px 16px",
    borderBottom: "1px solid #f9fafb",
    verticalAlign: "middle",
};

const chartCard = {
    background: "#fff",
    borderRadius: 14,
    padding: "16px 18px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
};

const chartTitle = {
    margin: "0 0 12px",
    fontWeight: 700,
    fontSize: 13,
    color: "#374151",
};

const inputStyle = {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    fontSize: 13,
    outline: "none",
    minWidth: 180,
};

export default BurnoutDashboard;