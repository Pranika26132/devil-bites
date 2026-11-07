/*
  Duke meal plans — Fall 2026.
  Source: Duke Dining's Fall 2026 points chart (shown in the app as the source).

  Each plan's expected balance starts at `total` on `start` and goes down by the
  same amount every day, reaching $0 on `end` (16 weeks, so about `weekly` ÷ 7 a day).
  weekdaysOnly: true → the plan is meant for Monday–Friday, so daily budgets
  only count weekdays.
*/
window.PACE_MEAL_PLANS = {
  source: "Based on Duke Dining’s Fall 2026 points chart.",
  start: "2026-08-24",
  end: "2026-12-14",
  plans: [
    { id: "first-year", name: "First Year",           total: 1057.80, weekly: 66.11,  weekdaysOnly: true },
    { id: "plan-a",     name: "Plan A (Upperclass)",  total: 3071.28, weekly: 191.96, weekdaysOnly: false },
    { id: "plan-b",     name: "Plan B (Upperclass)",  total: 3680.80, weekly: 230.05, weekdaysOnly: false },
    { id: "plan-c",     name: "Plan C (Upperclass)",  total: 4075.33, weekly: 254.71, weekdaysOnly: false },
    { id: "plan-d",     name: "Plan D (Upperclass)",  total: 4373.10, weekly: 273.32, weekdaysOnly: false },
    { id: "plan-e",     name: "Plan E (Upperclass)",  total: 4770.85, weekly: 298.18, weekdaysOnly: false },
    { id: "plan-f",     name: "Off-Campus (Plan F)",  total: 1006.20, weekly: 62.89,  weekdaysOnly: true },
    { id: "plan-j",     name: "Swift (Plan J)",       total: 2172.58, weekly: 135.79, weekdaysOnly: false },
  ],
};
