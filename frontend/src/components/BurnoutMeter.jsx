import React, { useEffect, useRef } from "react";

const RISK_COLORS = {
    Low: { stroke: "#22c55e", bg: "#dcfce7", text: "#16a34a" },
    Moderate: { stroke: "#f59e0b", bg: "#fef3c7", text: "#d97706" },
    High: { stroke: "#ef4444", bg: "#fee2e2", text: "#dc2626" },
};

const RISK_EMOJI = { Low: "😌", Moderate: "😟", High: "🔥" };

/**
 * Animated circular progress meter for burnout score.
 * Props:
 *   score     — number 0–100
 *   riskLevel — "Low" | "Moderate" | "High"
 *   size      — px (default 160)
 *   showLabel — bool (default true)
 */
const BurnoutMeter = ({ score = 0, riskLevel = "Low", size = 160, showLabel = true }) => {
    const circleRef = useRef(null);
    const colors = RISK_COLORS[riskLevel] || RISK_COLORS.Low;

    const radius = (size / 2) * 0.78;
    const strokeWidth = size * 0.075;
    const circumference = 2 * Math.PI * radius;
    const cx = size / 2;
    const cy = size / 2;

    useEffect(() => {
        const el = circleRef.current;
        if (!el) return;

        // Start at 0 and animate to score
        const targetOffset = circumference - (score / 100) * circumference;
        el.style.strokeDashoffset = circumference; // reset

        requestAnimationFrame(() => {
            el.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)";
            el.style.strokeDashoffset = targetOffset;
        });
    }, [score, circumference]);

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative", width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                    {/* Track */}
                    <circle
                        cx={cx} cy={cy} r={radius}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress */}
                    <circle
                        ref={circleRef}
                        cx={cx} cy={cy} r={radius}
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference}
                    />
                </svg>

                {/* Center label */}
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                }}>
                    <span style={{ fontSize: size * 0.09, lineHeight: 1 }}>{RISK_EMOJI[riskLevel]}</span>
                    <span style={{
                        fontSize: size * 0.22,
                        fontWeight: 800,
                        color: colors.text,
                        lineHeight: 1,
                        fontFamily: "monospace",
                    }}>
                        {score}
                    </span>
                    <span style={{ fontSize: size * 0.09, color: "#9ca3af", lineHeight: 1 }}>/100</span>
                </div>
            </div>

            {showLabel && (
                <span style={{
                    padding: "4px 14px",
                    borderRadius: 999,
                    background: colors.bg,
                    color: colors.text,
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: "0.04em",
                }}>
                    {riskLevel} Risk
                </span>
            )}
        </div>
    );
};

export default BurnoutMeter;