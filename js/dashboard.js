/**
 * Dashboard module.
 * All financial KPIs, monthly series, and category totals are calculated dynamically
 * from transaction data — never hardcoded.
 */

import { formatCurrency, formatDateDisplay, formatMonthLabel, sortTransactions } from './transactions.js';
import { calculateBudgetStatus } from './budget.js';

export const CATEGORY_COLORS = [
  '#1D4ED8',
  '#0F766E',
  '#D97706',
  '#7C3AED',
  '#0284C7',
  '#BE185D',
  '#475569',
  '#65A30D',
];

let overviewChartInstance = null;
let categoryChartInstance = null;

export function calculateSummaryMetrics(transactions, targetMonth) {
  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let monthlySpending = 0;
  let monthlyIncome = 0;
  let monthlyExpenseCount = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
      incomeCount += 1;
      if (targetMonth && tx.date.startsWith(targetMonth)) {
        monthlyIncome += tx.amount;
      }
    } else {
      totalExpenses += tx.amount;
      expenseCount += 1;
      if (targetMonth && tx.date.startsWith(targetMonth)) {
        monthlySpending += tx.amount;
        monthlyExpenseCount += 1;
      }
    }
  }

  totalIncome = Number(totalIncome.toFixed(2));
  totalExpenses = Number(totalExpenses.toFixed(2));
  const totalBalance = Number((totalIncome - totalExpenses).toFixed(2));
  monthlySpending = Number(monthlySpending.toFixed(2));
  monthlyIncome = Number(monthlyIncome.toFixed(2));

  return {
    totalBalance,
    totalIncome,
    totalExpenses,
    monthlySpending,
    monthlyIncome,
    incomeCount,
    expenseCount,
    monthlyExpenseCount,
    transactionCount: transactions.length,
  };
}

export function calculateMonthlyOverviewSeries(transactions, referenceMonth, monthsCount = 6) {
  const [refYear, refMon] = referenceMonth.split('-').map(Number);
  const monthKeys = [];
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const dt = new Date(refYear, refMon - 1 - i, 1);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    monthKeys.push(`${y}-${m}`);
  }

  const incomeMap = new Map(monthKeys.map((k) => [k, 0]));
  const expenseMap = new Map(monthKeys.map((k) => [k, 0]));

  for (const tx of transactions) {
    const key = tx.date.slice(0, 7);
    if (!incomeMap.has(key)) continue;
    if (tx.type === 'income') {
      incomeMap.set(key, incomeMap.get(key) + tx.amount);
    } else {
      expenseMap.set(key, expenseMap.get(key) + tx.amount);
    }
  }

  const labels = monthKeys.map((k) => {
    const [y, m] = k.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(new Date(y, m - 1, 1));
  });

  return {
    monthKeys,
    labels,
    income: monthKeys.map((k) => Number(incomeMap.get(k).toFixed(2))),
    spending: monthKeys.map((k) => Number(expenseMap.get(k).toFixed(2))),
  };
}

export function calculateCategoryBreakdown(transactions, targetMonth = null) {
  const categoryTotals = new Map();
  const categoryCounts = new Map();
  let totalExpenses = 0;

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (targetMonth && targetMonth !== 'all' && !tx.date.startsWith(targetMonth)) continue;

    totalExpenses += tx.amount;
    categoryTotals.set(tx.category, (categoryTotals.get(tx.category) || 0) + tx.amount);
    categoryCounts.set(tx.category, (categoryCounts.get(tx.category) || 0) + 1);
  }

  const breakdown = Array.from(categoryTotals.entries()).map(([category, amount]) => {
    const rounded = Number(amount.toFixed(2));
    const percentage = totalExpenses > 0 ? Number(((rounded / totalExpenses) * 100).toFixed(1)) : 0;
    return {
      category,
      amount: rounded,
      percentage,
      count: categoryCounts.get(category) || 0,
    };
  });

  breakdown.sort((a, b) => b.amount - a.amount);
  return breakdown;
}

export function getRecentTransactions(transactions, limit = 5) {
  return sortTransactions(transactions, 'date-desc').slice(0, limit);
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderDashboardView(transactions, currentMonth, budgetLimit) {
  const metrics = calculateSummaryMetrics(transactions, currentMonth);
  const budgetStatus = calculateBudgetStatus(transactions, currentMonth, budgetLimit);

  // KPI cards
  const balanceEl = document.getElementById('kpi-balance');
  const incomeEl = document.getElementById('kpi-income');
  const expensesEl = document.getElementById('kpi-expenses');
  const monthlyEl = document.getElementById('kpi-monthly-spending');
  const incomeMetaEl = document.getElementById('kpi-income-meta');
  const expensesMetaEl = document.getElementById('kpi-expenses-meta');
  const monthlyMetaEl = document.getElementById('kpi-monthly-meta');
  const sidebarNetEl = document.getElementById('sidebar-net-balance');

  if (balanceEl) {
    balanceEl.textContent = formatCurrency(metrics.totalBalance);
    balanceEl.className = `kpi-value tabular-nums ${metrics.totalBalance < 0 ? 'text-expense' : ''}`;
  }
  if (sidebarNetEl) {
    sidebarNetEl.textContent = formatCurrency(metrics.totalBalance);
  }
  if (incomeEl) incomeEl.textContent = formatCurrency(metrics.totalIncome);
  if (expensesEl) expensesEl.textContent = formatCurrency(metrics.totalExpenses);
  if (monthlyEl) monthlyEl.textContent = formatCurrency(metrics.monthlySpending);

  if (incomeMetaEl) {
    incomeMetaEl.textContent = `${metrics.incomeCount} ${metrics.incomeCount === 1 ? 'income entry' : 'income entries'}`;
  }
  if (expensesMetaEl) {
    expensesMetaEl.textContent = `${metrics.expenseCount} ${metrics.expenseCount === 1 ? 'expense entry' : 'expense entries'}`;
  }
  if (monthlyMetaEl) {
    monthlyMetaEl.textContent = `${formatMonthLabel(currentMonth)} · ${metrics.monthlyExpenseCount} ${metrics.monthlyExpenseCount === 1 ? 'expense' : 'expenses'}`;
  }

  // Dashboard Budget Strip
  const budgetBadgeEl = document.getElementById('dashboard-budget-badge');
  const budgetBarEl = document.getElementById('dashboard-budget-bar');
  const budgetNumbersEl = document.getElementById('dashboard-budget-numbers');

  if (budgetBadgeEl) {
    budgetBadgeEl.className = `status-text is-${budgetStatus.status}`;
    if (budgetStatus.status === 'exceeded') {
      budgetBadgeEl.textContent = `Exceeded by ${formatCurrency(budgetStatus.overageAmount)}`;
    } else if (budgetStatus.status === 'warning') {
      budgetBadgeEl.textContent = `Warning · ${budgetStatus.utilizationPercent.toFixed(1)}% used`;
    } else if (budgetStatus.status === 'nominal') {
      budgetBadgeEl.textContent = `On track · ${budgetStatus.utilizationPercent.toFixed(1)}% used`;
    } else {
      budgetBadgeEl.textContent = 'No monthly budget set';
    }
  }

  if (budgetBarEl) {
    const pct = Math.min(100, Math.max(0, budgetStatus.utilizationPercent));
    budgetBarEl.style.width = `${pct}%`;
    budgetBarEl.className = `progress-fill is-${budgetStatus.status}`;
  }

  if (budgetNumbersEl) {
    budgetNumbersEl.textContent =
      budgetStatus.budgetLimit > 0
        ? `${formatCurrency(budgetStatus.monthlyExpenses)} of ${formatCurrency(budgetStatus.budgetLimit)} used`
        : `${formatCurrency(budgetStatus.monthlyExpenses)} spent this month`;
  }

  // Charts
  renderDashboardCharts(transactions, currentMonth);

  // Recent Transactions
  const recentContainer = document.getElementById('recent-transactions-container');
  if (recentContainer) {
    const recent = getRecentTransactions(transactions, 5);
    if (recent.length === 0) {
      recentContainer.innerHTML = `<p class="text-sm text-muted">No transactions recorded yet. Add your first income or expense entry to see activity here.</p>`;
    } else {
      recentContainer.innerHTML = recent
        .map((tx) => {
          const isIncome = tx.type === 'income';
          const sign = isIncome ? '+' : '-';
          const cls = isIncome ? 'text-income' : 'text-expense';
          return `
            <div class="recent-row">
              <div class="recent-main">
                <div class="recent-title">${escapeHtml(tx.title)}</div>
                <div class="recent-meta">
                  <span>${escapeHtml(tx.category)}</span>
                  <span aria-hidden="true">·</span>
                  <span>${escapeHtml(formatDateDisplay(tx.date))}</span>
                </div>
              </div>
              <div class="recent-amount tabular-nums ${cls}">
                ${sign}${formatCurrency(tx.amount)}
              </div>
            </div>
          `;
        })
        .join('');
    }
  }
}

function renderDashboardCharts(transactions, currentMonth) {
  const ChartLib = globalThis.Chart;
  if (!ChartLib) return;

  // 1. Monthly Spending Overview (Bar Chart)
  const overviewCanvas = document.getElementById('dashboard-overview-chart');
  if (overviewCanvas) {
    const series = calculateMonthlyOverviewSeries(transactions, currentMonth, 6);
    if (overviewChartInstance) {
      overviewChartInstance.destroy();
    }
    overviewChartInstance = new ChartLib(overviewCanvas, {
      type: 'bar',
      data: {
        labels: series.labels,
        datasets: [
          {
            label: 'Income',
            data: series.income,
            backgroundColor: '#15803D',
            borderRadius: 4,
            maxBarThickness: 28,
          },
          {
            label: 'Expenses',
            data: series.spending,
            backgroundColor: '#0F172A',
            borderRadius: 4,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              color: '#475569',
              font: { family: 'Plus Jakarta Sans', size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748B', font: { family: 'Plus Jakarta Sans', size: 11.5 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#F1F5F9' },
            ticks: {
              color: '#64748B',
              font: { family: 'JetBrains Mono', size: 11 },
              callback: (val) => `$${Number(val).toLocaleString()}`,
            },
          },
        },
      },
    });
  }

  // 2. Expense Category Breakdown (Doughnut)
  const categoryCanvas = document.getElementById('dashboard-category-chart');
  const legendEl = document.getElementById('dashboard-category-legend');
  const breakdown = calculateCategoryBreakdown(transactions, null);

  if (categoryCanvas) {
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
    }

    const hasExpenses = breakdown.length > 0;
    const labels = hasExpenses ? breakdown.map((b) => b.category) : ['No Expenses'];
    const data = hasExpenses ? breakdown.map((b) => b.amount) : [1];
    const colors = hasExpenses
      ? breakdown.map((_, idx) => CATEGORY_COLORS[idx % CATEGORY_COLORS.length])
      : ['#E2E8F0'];

    categoryChartInstance = new ChartLib(categoryCanvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#FFFFFF',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: hasExpenses,
            callbacks: {
              label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}`,
            },
          },
        },
      },
    });
  }

  if (legendEl) {
    if (breakdown.length === 0) {
      legendEl.innerHTML = `<span class="text-sm text-muted">No expenses recorded yet.</span>`;
    } else {
      legendEl.innerHTML = breakdown
        .slice(0, 6)
        .map((item, idx) => {
          const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
          return `
            <div class="legend-item">
              <div class="legend-label-group">
                <span class="legend-swatch" style="background-color: ${color}"></span>
                <span class="legend-name">${escapeHtml(item.category)}</span>
              </div>
              <span class="legend-val tabular-nums">${item.percentage.toFixed(0)}%</span>
            </div>
          `;
        })
        .join('');
    }
  }
}
