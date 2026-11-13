/**
 * Budget Management module.
 * Pure budget threshold calculations (80% warning, >100% exceeded)
 * are decoupled from UI rendering.
 */

import { formatCurrency, formatMonthLabel } from './transactions.js';
import { calculateCategoryBreakdown } from './dashboard.js';

export function validateBudgetInput(monthKey, limitValue) {
  const errors = {};
  const month = String(monthKey ?? '').trim();
  const limit = Number(limitValue);

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    errors.month = 'Please select a valid month.';
  }

  if (limitValue === '' || limitValue === null || limitValue === undefined || Number.isNaN(limit)) {
    errors.limit = 'Please enter a valid monthly budget amount.';
  } else if (limit <= 0) {
    errors.limit = 'Budget limit must be greater than zero.';
  } else if (limit > 100000000) {
    errors.limit = 'Budget limit exceeds supported maximum.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function calculateBudgetStatus(transactions, monthKey, budgetLimit) {
  const limit = Number(budgetLimit || 0);
  const monthlyExpenses = transactions
    .filter((tx) => tx.type === 'expense' && tx.date.startsWith(monthKey))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const roundedExpenses = Number(monthlyExpenses.toFixed(2));
  const roundedLimit = Number(limit.toFixed(2));

  if (!roundedLimit || roundedLimit <= 0) {
    return {
      monthKey,
      budgetLimit: 0,
      monthlyExpenses: roundedExpenses,
      remainingBudget: 0,
      overageAmount: 0,
      utilizationPercent: 0,
      status: 'unset',
    };
  }

  const remainingBudget = Number((roundedLimit - roundedExpenses).toFixed(2));
  const overageAmount = roundedExpenses > roundedLimit ? Number((roundedExpenses - roundedLimit).toFixed(2)) : 0;
  const utilizationPercent = Number(((roundedExpenses / roundedLimit) * 100).toFixed(1));

  let status = 'nominal';
  if (roundedExpenses > roundedLimit) {
    status = 'exceeded';
  } else if (utilizationPercent >= 80) {
    status = 'warning';
  }

  return {
    monthKey,
    budgetLimit: roundedLimit,
    monthlyExpenses: roundedExpenses,
    remainingBudget,
    overageAmount,
    utilizationPercent,
    status,
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

export function initBudgetView({ defaultMonth, onMonthChange, onSaveBudget }) {
  const monthInput = document.getElementById('budget-month');
  const limitInput = document.getElementById('budget-limit');
  const formEl = document.getElementById('budget-form');
  const monthErrEl = document.getElementById('budget-month-error');
  const limitErrEl = document.getElementById('budget-limit-error');

  if (monthInput && !monthInput.value) {
    monthInput.value = defaultMonth;
  }

  function clearErrors() {
    if (monthErrEl) monthErrEl.textContent = '';
    if (limitErrEl) limitErrEl.textContent = '';
    monthInput?.classList.remove('has-error');
    limitInput?.classList.remove('has-error');
  }

  monthInput?.addEventListener('change', (e) => {
    clearErrors();
    onMonthChange(e.target.value);
  });

  formEl?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const month = monthInput?.value || '';
    const limitVal = limitInput?.value || '';
    const validation = validateBudgetInput(month, limitVal);

    if (!validation.valid) {
      if (validation.errors.month && monthErrEl) {
        monthErrEl.textContent = validation.errors.month;
        monthInput?.classList.add('has-error');
      }
      if (validation.errors.limit && limitErrEl) {
        limitErrEl.textContent = validation.errors.limit;
        limitInput?.classList.add('has-error');
      }
      return;
    }

    onSaveBudget(month, Number(limitVal));
  });

  return {
    getSelectedMonth: () => monthInput?.value || defaultMonth,
    setLimitInput: (val) => {
      if (limitInput) {
        limitInput.value = val ? String(val) : '';
      }
    },
  };
}

export function renderBudgetView(transactions, monthKey, budgetLimit) {
  const statusData = calculateBudgetStatus(transactions, monthKey, budgetLimit);
  const monthLabel = formatMonthLabel(monthKey);

  const limitInput = document.getElementById('budget-limit');
  if (limitInput && document.activeElement !== limitInput) {
    limitInput.value = statusData.budgetLimit > 0 ? String(statusData.budgetLimit) : '';
  }

  const headingEl = document.getElementById('budget-status-heading');
  const subheadingEl = document.getElementById('budget-status-subheading');
  const indicatorEl = document.getElementById('budget-status-indicator');
  const totalLimitEl = document.getElementById('budget-total-limit');
  const totalSpentEl = document.getElementById('budget-total-spent');
  const remainingEl = document.getElementById('budget-remaining');
  const utilizationEl = document.getElementById('budget-utilization');
  const progressBarEl = document.getElementById('budget-progressbar');
  const progressFillEl = document.getElementById('budget-progress-fill');

  const bannerEl = document.getElementById('budget-alert-banner');
  const bannerIconEl = document.getElementById('budget-alert-icon');
  const bannerTitleEl = document.getElementById('budget-alert-title');
  const bannerMsgEl = document.getElementById('budget-alert-message');

  if (headingEl) headingEl.textContent = `${monthLabel} Budget Utilization`;
  if (subheadingEl) {
    subheadingEl.textContent =
      statusData.status === 'unset'
        ? `No monthly budget configured for ${monthLabel}`
        : `Tracking actual ${monthLabel} expenses against your limit`;
  }

  if (totalLimitEl) {
    totalLimitEl.textContent = statusData.budgetLimit > 0 ? formatCurrency(statusData.budgetLimit) : 'Not set';
  }
  if (totalSpentEl) {
    totalSpentEl.textContent = formatCurrency(statusData.monthlyExpenses);
  }
  if (remainingEl) {
    if (statusData.status === 'unset') {
      remainingEl.textContent = '—';
      remainingEl.className = 'budget-metric-val tabular-nums';
    } else if (statusData.remainingBudget < 0) {
      remainingEl.textContent = `-${formatCurrency(Math.abs(statusData.remainingBudget))}`;
      remainingEl.className = 'budget-metric-val tabular-nums text-expense';
    } else {
      remainingEl.textContent = formatCurrency(statusData.remainingBudget);
      remainingEl.className = 'budget-metric-val tabular-nums text-income';
    }
  }
  if (utilizationEl) {
    utilizationEl.textContent = statusData.status === 'unset' ? '0.0%' : `${statusData.utilizationPercent.toFixed(1)}%`;
  }

  const clampedWidth = Math.min(100, Math.max(0, statusData.utilizationPercent));
  if (progressFillEl) {
    progressFillEl.style.width = `${clampedWidth}%`;
    progressFillEl.className = `progress-fill is-${statusData.status}`;
  }
  if (progressBarEl) {
    progressBarEl.setAttribute('aria-valuenow', String(Math.round(statusData.utilizationPercent)));
  }

  if (indicatorEl) {
    indicatorEl.className = `status-text is-${statusData.status}`;
    if (statusData.status === 'exceeded') {
      indicatorEl.textContent = 'Budget exceeded';
    } else if (statusData.status === 'warning') {
      indicatorEl.textContent = 'Approaching limit (80%+)';
    } else if (statusData.status === 'nominal') {
      indicatorEl.textContent = 'On track';
    } else {
      indicatorEl.textContent = 'Budget not set';
    }
  }

  if (bannerEl && bannerTitleEl && bannerMsgEl) {
    bannerEl.className = `alert-banner is-${statusData.status}`;
    if (statusData.status === 'exceeded') {
      bannerEl.hidden = false;
      bannerIconEl?.setAttribute('data-lucide', 'alert-octagon');
      bannerTitleEl.textContent = 'Budget Exceeded';
      bannerMsgEl.textContent = `Your ${monthLabel} expenses (${formatCurrency(statusData.monthlyExpenses)}) exceed your budget by ${formatCurrency(statusData.overageAmount)}.`;
    } else if (statusData.status === 'warning') {
      bannerEl.hidden = false;
      bannerIconEl?.setAttribute('data-lucide', 'alert-triangle');
      bannerTitleEl.textContent = 'Approaching Budget Limit';
      bannerMsgEl.textContent = `You have used ${statusData.utilizationPercent.toFixed(1)}% of your ${monthLabel} budget. ${formatCurrency(statusData.remainingBudget)} remaining.`;
    } else if (statusData.status === 'nominal') {
      bannerEl.hidden = false;
      bannerIconEl?.setAttribute('data-lucide', 'check-circle-2');
      bannerTitleEl.textContent = 'Budget On Track';
      bannerMsgEl.textContent = `You have used ${statusData.utilizationPercent.toFixed(1)}% of your ${monthLabel} budget with ${formatCurrency(statusData.remainingBudget)} remaining.`;
    } else {
      bannerEl.hidden = true;
    }
  }

  // Monthly Category Breakdown
  const breakdownSub = document.getElementById('budget-breakdown-subtitle');
  const breakdownEl = document.getElementById('budget-category-breakdown');
  if (breakdownSub) {
    breakdownSub.textContent = `Expenses recorded in ${monthLabel}`;
  }
  if (breakdownEl) {
    const categories = calculateCategoryBreakdown(transactions, monthKey);
    if (categories.length === 0) {
      breakdownEl.innerHTML = `<p class="text-sm text-muted">No expenses recorded for ${escapeHtml(monthLabel)} yet.</p>`;
    } else {
      breakdownEl.innerHTML = categories
        .map((item) => {
          const budgetShare =
            statusData.budgetLimit > 0
              ? `${((item.amount / statusData.budgetLimit) * 100).toFixed(1)}% of budget`
              : `${item.percentage.toFixed(1)}% of spend`;
          return `
            <div class="breakdown-row">
              <div class="breakdown-row-head">
                <span class="breakdown-cat-name">${escapeHtml(item.category)}</span>
                <span class="breakdown-cat-stats tabular-nums">
                  <span>${formatCurrency(item.amount)}</span>
                  <span class="text-muted">· ${escapeHtml(budgetShare)}</span>
                </span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${Math.min(100, item.percentage)}%"></div>
              </div>
            </div>
          `;
        })
        .join('');
    }
  }
}
