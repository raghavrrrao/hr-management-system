import API from "./axios";
// Reuses your existing axios instance (already has /api in baseURL + auth interceptor)

// ── Employee ────────────────────────────────────────────────────────────────

/** Fetch current user's burnout score + 4-week history */
export const getMyBurnoutScore = () => API.get("/burnout/my-score");

// ── Admin ────────────────────────────────────────────────────────────────────

/** Fetch all employees' burnout scores + org summary */
export const getAllBurnoutScores = () => API.get("/burnout/all");

/** Fetch a specific employee's burnout score + history */
export const getEmployeeBurnoutScore = (employeeId) =>
    API.get(`/burnout/employee/${employeeId}`);