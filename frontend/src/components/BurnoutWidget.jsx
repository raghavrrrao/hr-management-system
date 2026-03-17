import React, { useEffect, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid
} from "recharts";
import { getMyBurnoutScore } from "../api/burnout";
import BurnoutMeter from "./BurnoutMeter";

const SIGNAL_LABELS = {
    avgDailyHours: "Avg Daily Hours",
    consecutiveLongDays: "Consecutive Long Days",
    hoursIncreasing: "Hours Trending Up",
    taskCompletionRate: "Task Completion Rate",
    lowCompletionHighHours: "High Hours, Low Output",
    recentSickLeaves: "Sick Leaves (30 days)",
    lateCheckouts: "Late Check-outs (week)",
};

const SignalRow = ({ label, value, isFlag }) => {
    const display = typeof value === "boolean"
        ? (value ? "⚠️ Yes" : "✅ No")
        : typeof value === "number"
            ? (label.includes("Rate") ? `${value}%` : value)
            : value;

    const isWarning = typeof value === "boolean" ? value : false;

    return (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 0",
            borderBottom: "1px solid #f3f4f6",
        }}>
            <span style={{ color: "#6b7280", fontSize: 13 }}>{label}</span>
            <span style={{
                fontWeight: 600,
                fontSize: 13,
                color: isWarning ? "#dc2626" : "#111827",
            }}>
                {display}
            </span>
        </div>
    );
};

const formatWeek = (dateStr) => {
    const d = new Date(dateStr);
    return `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString("default", { month: "short" })}`;
};

const BurnoutWidget = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        getMyBurnoutScore()
            .then((res) => setData(res.data))
            .catch(() => setError("Could not load wellness data."))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={cardStyle}>
            <div style={{ color: "#9ca3af", textAlign: "center", padding: 32 }}>
                Analysing your wellness data…
            </div>
        </div>
    );

    if (error) return (
        <div style={cardStyle}>
            <div style={{ color: "#ef4444", textAlign: "center", padding: 32 }}>{error}</div>
        </div>
    );

    const { current, history } = data;
    const chartData = history.map((h) => ({
        week: formatWeek(h.weekStart),
        score: h.score,
    }));

    const strokeColor =
        current.riskLevel === "High" ? "#ef4444" :
            current.riskLevel === "Moderate" ? "#f59e0b" : "#22c55e";

    return (
        <div style={cardStyle}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "#111827" }}>
                    🧠 Your Wellness Score
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                    Calculated from your attendance, tasks & leave patterns this week.
                </p>
            </div>

            {/* Score meter */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <BurnoutMeter score={current.score} riskLevel={current.riskLevel} size={150} />
            </div>

            {/* Trend chart */}
            {chartData.length > 1 && (
                <div style={{ marginBottom: 24 }}>
                    <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13, color: "#374151" }}>
                        4-Week Trend
                    </p>
                    <ResponsiveContainer width="100%" height={100}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v) => [`${v}`, "Score"]} />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke={strokeColor}
                                strokeWidth={2}
                                dot={{ r: 4, fill: strokeColor }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Signals breakdown */}
            <div style={{ marginBottom: 20 }}>
                <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 13, color: "#374151" }}>
                    Signal Breakdown
                </p>
                {Object.entries(current.signals).map(([key, val]) => (
                    <SignalRow key={key} label={SIGNAL_LABELS[key] || key} value={val} />
                ))}
            </div>

            {/* Suggestions */}
            <div style={{
                background: "#f9fafb",
                borderRadius: 10,
                padding: "12px 14px",
            }}>
                <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 13, color: "#374151" }}>
                    💡 Personalised Tips
                </p>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {current.suggestions.map((s, i) => (
                        <li key={i} style={{ fontSize: 13, color: "#4b5563", marginBottom: 4 }}>{s}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const cardStyle = {
    background: "#ffffff",
    borderRadius: 16,
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
    fontFamily: "inherit",
};

export default BurnoutWidget;