/**
 * Expense Analytics module.
 * Pure analytics aggregations are decoupled from DOM and Chart.js rendering.
 */

import { formatCurrency, formatMonthLabel } from './transactions.js';
import { CATEGORY_COLORS, calculateCategoryBreakdown } from './dashboard.js';

let comparisonChartInstance = null;
let distributionChartInstance = null;
let analyticsCategoryChartInstance = null;

export function getAvailableMonths(transactions) {
  const set = new Set();
  for (const tx of transactions) {
    if (tx.date && tx.date.length >= 7) {
      set.add(tx.date.slice(0, 7));
    }
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function calculateAnalyticsData(transactions, selectedMonth = 'all') {
  const scoped =
    selectedMonth && selectedMonth !== 'all'
      ? transactions.filter((tx) => tx.date.startsWith(selectedMonth))
      : [...transactions];

  let totalIncome = 0;
  let totalExpenses = 0;
  let expenseCount = 0;

  for (const tx of scoped) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpenses += tx.amount;
      expenseCount += 1;
    }
  }

  totalIncome = Number(totalIncome.toFixed(2));
  totalExpenses = Number(totalExpenses.toFixed(2));
  const totalSavings = Number((totalIncome - totalExpenses).toFixed(2));
  const savingsRate = totalIncome > 0 ? Number(((totalSavings / totalIncome) * 100).toFixed(1)) : 0;
  const averageExpense = expenseCount > 0 ? Number((totalExpenses / expenseCount).toFixed(2)) : 0;

  const categoryBreakdown = calculateCategoryBreakdown(scoped, 'all');
  const highestSpendingCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

  // Monthly Income vs. Expenses (chronological across all transactions)
  const monthSet = new Set();
  for (const tx of transactions) {
    if (tx.date && tx.date.length >= 7) {
      monthSet.add(tx.date.slice(0, 7));
    }
  }
  const monthsAsc = Array.from(monthSet).sort((a, b) => a.localeCompare(b));
  const monthlyIncomeMap = new Map(monthsAsc.map((m) => [m, 0]));
  const monthlyExpenseMap = new Map(monthsAsc.map((m) => [m, 0]));

  for (const tx of transactions) {
    const key = tx.date.slice(0, 7);
    if (!monthlyIncomeMap.has(key)) continue;
    if (tx.type === 'income') {
      monthlyIncomeMap.set(key, monthlyIncomeMap.get(key) + tx.amount);
    } else {
      monthlyExpenseMap.set(key, monthlyExpenseMap.get(key) + tx.amount);
    }
  }

  const monthlyComparison = {
    labels: monthsAsc.map((m) => {
      const [y, mon] = m.split('-').map(Number);
      return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(y, mon - 1, 1));
    }),
    income: monthsAsc.map((m) => Number(monthlyIncomeMap.get(m).toFixed(2))),
    expenses: monthsAsc.map((m) => Number(monthlyExpenseMap.get(m).toFixed(2))),
  };

  // Spending Distribution over dates in scoped transactions
  const dateMap = new Map();
  for (const tx of scoped) {
    if (tx.type !== 'expense') continue;
    dateMap.set(tx.date, (dateMap.get(tx.date) || 0) + tx.amount);
  }
  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => a.localeCompare(b));
  const spendingDistribution = {
    labels: sortedDates.map((d) => {
      const [y, m, day] = d.split('-').map(Number);
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(y, m - 1, day));
    }),
    values: sortedDates.map((d) => Number(dateMap.get(d).toFixed(2))),
  };

  return {
    totalIncome,
    totalExpenses,
    totalSavings,
    savingsRate,
    expenseCount,
    averageExpense,
    highestSpendingCategory,
    categoryBreakdown,
    monthlyComparison,
    spendingDistribution,
  };
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function initAnalyticsView({ onPeriodChange }) {
  const periodSelect = document.getElementById('analytics-period-select');
  periodSelect?.addEventListener('change', (e) => {
    onPeriodChange(e.target.value);
  });

  return {
    getSelectedPeriod: () => periodSelect?.value || 'all',
  };
}

export function renderAnalyticsView(transactions, selectedPeriod = 'all') {
  const periodSelect = document.getElementById('analytics-period-select');
  if (periodSelect) {
    const months = getAvailableMonths(transactions);
    const currentValue = selectedPeriod;
    periodSelect.innerHTML =
      `<option value="all">All Time</option>` +
      months.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(formatMonthLabel(m))}</option>`).join('');
    periodSelect.value = months.includes(currentValue) || currentValue === 'all' ? currentValue : 'all';
  }

  const effectivePeriod = periodSelect ? periodSelect.value : selectedPeriod;
  const analytics = calculateAnalyticsData(transactions, effectivePeriod);

  // KPI Cards
  const savingsEl = document.getElementById('analytics-total-savings');
  const savingsRateEl = document.getElementById('analytics-savings-rate');
  const topCatEl = document.getElementById('analytics-top-category');
  const topCatMetaEl = document.getElementById('analytics-top-category-meta');
  const avgExpEl = document.getElementById('analytics-avg-expense');
  const expCountEl = document.getElementById('analytics-expense-count');

  if (savingsEl) {
    savingsEl.textContent = formatCurrency(analytics.totalSavings);
    savingsEl.className = `kpi-value tabular-nums ${analytics.totalSavings < 0 ? 'text-expense' : 'text-income'}`;
  }
  if (savingsRateEl) {
    savingsRateEl.textContent = `${analytics.savingsRate.toFixed(1)}% net savings rate`;
  }
  if (topCatEl) {
    topCatEl.textContent = analytics.highestSpendingCategory ? analytics.highestSpendingCategory.category : '—';
  }
  if (topCatMetaEl) {
    topCatMetaEl.textContent = analytics.highestSpendingCategory
      ? `${formatCurrency(analytics.highestSpendingCategory.amount)} · ${analytics.highestSpendingCategory.percentage.toFixed(1)}% of expenses`
      : 'No expenses recorded in period';
  }
  if (avgExpEl) {
    avgExpEl.textContent = formatCurrency(analytics.averageExpense);
  }
  if (expCountEl) {
    expCountEl.textContent = `Across ${analytics.expenseCount} ${analytics.expenseCount === 1 ? 'expense transaction' : 'expense transactions'}`;
  }

  // Ranked Category List
  const catListEl = document.getElementById('analytics-category-list');
  if (catListEl) {
    if (analytics.categoryBreakdown.length === 0) {
      catListEl.innerHTML = `<p class="text-sm text-muted">No expense data available for the selected period.</p>`;
    } else {
      catListEl.innerHTML = analytics.categoryBreakdown
        .map((item, idx) => {
          const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
          return `
            <div class="breakdown-row">
              <div class="breakdown-row-head">
                <span class="breakdown-cat-name">${escapeHtml(item.category)}</span>
                <span class="breakdown-cat-stats tabular-nums">
                  <span>${formatCurrency(item.amount)}</span>
                  <span class="text-muted">· ${item.percentage.toFixed(1)}% (${item.count})</span>
                </span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${Math.min(100, item.percentage)}%; background-color: ${color}"></div>
              </div>
            </div>
          `;
        })
        .join('');
    }
  }

  renderAnalyticsCharts(analytics);
}

function renderAnalyticsCharts(analytics) {
  const ChartLib = globalThis.Chart;
  if (!ChartLib) return;

  // 1. Monthly Income vs Expenses
  const comparisonCanvas = document.getElementById('analytics-comparison-chart');
  if (comparisonCanvas) {
    if (comparisonChartInstance) comparisonChartInstance.destroy();
    comparisonChartInstance = new ChartLib(comparisonCanvas, {
      type: 'bar',
      data: {
        labels: analytics.monthlyComparison.labels,
        datasets: [
          {
            label: 'Income',
            data: analytics.monthlyComparison.income,
            backgroundColor: '#15803D',
            borderRadius: 4,
            maxBarThickness: 30,
          },
          {
            label: 'Expenses',
            data: analytics.monthlyComparison.expenses,
            backgroundColor: '#B91C1C',
            borderRadius: 4,
            maxBarThickness: 30,
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

  // 2. Spending Distribution (Line Chart)
  const distCanvas = document.getElementById('analytics-distribution-chart');
  if (distCanvas) {
    if (distributionChartInstance) distributionChartInstance.destroy();
    distributionChartInstance = new ChartLib(distCanvas, {
      type: 'line',
      data: {
        labels: analytics.spendingDistribution.labels,
        datasets: [
          {
            label: 'Daily Expense',
            data: analytics.spendingDistribution.values,
            borderColor: '#1D4ED8',
            backgroundColor: 'rgba(29, 78, 216, 0.08)',
            borderWidth: 2,
            pointRadius: 3.5,
            pointBackgroundColor: '#1D4ED8',
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Spent: ${formatCurrency(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748B', font: { family: 'Plus Jakarta Sans', size: 11 }, maxTicksLimit: 8 },
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

  // 3. Category-wise Expense Breakdown Doughnut
  const catCanvas = document.getElementById('analytics-category-chart');
  if (catCanvas) {
    if (analyticsCategoryChartInstance) analyticsCategoryChartInstance.destroy();
    const hasData = analytics.categoryBreakdown.length > 0;
    analyticsCategoryChartInstance = new ChartLib(catCanvas, {
      type: 'doughnut',
      data: {
        labels: hasData ? analytics.categoryBreakdown.map((c) => c.category) : ['No Data'],
        datasets: [
          {
            data: hasData ? analytics.categoryBreakdown.map((c) => c.amount) : [1],
            backgroundColor: hasData
              ? analytics.categoryBreakdown.map((_, idx) => CATEGORY_COLORS[idx % CATEGORY_COLORS.length])
              : ['#E2E8F0'],
            borderWidth: 2,
            borderColor: '#FFFFFF',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: hasData,
            callbacks: {
              label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}`,
            },
          },
        },
      },
    });
  }
}
