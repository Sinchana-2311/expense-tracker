import test from 'node:test';
import assert from 'node:assert/strict';

import { createStorageRepository } from '../js/storage.js';
import {
  validateTransactionInput,
  filterTransactions,
  sortTransactions,
  formatCurrency,
} from '../js/transactions.js';
import {
  calculateSummaryMetrics,
  calculateMonthlyOverviewSeries,
  calculateCategoryBreakdown,
  getRecentTransactions,
} from '../js/dashboard.js';
import { calculateAnalyticsData } from '../js/analytics.js';
import { validateBudgetInput, calculateBudgetStatus } from '../js/budget.js';

function createMockAdapter() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('storage repository handles CRUD and budget persistence cleanly', () => {
  const repo = createStorageRepository(createMockAdapter());
  repo.initSeedData();

  const initial = repo.getTransactions();
  assert.ok(initial.length > 0, 'seed transactions should exist');

  const created = repo.saveTransaction({
    title: 'Coffee Beans',
    amount: 24.5,
    category: 'Food',
    type: 'expense',
    date: '2026-11-13',
    description: 'Morning espresso',
  });
  assert.ok(created.id);
  assert.equal(repo.getTransactions().length, initial.length + 1);

  const updated = repo.updateTransaction(created.id, { amount: 30, title: 'Whole Bean Coffee' });
  assert.equal(updated.amount, 30);
  assert.equal(updated.title, 'Whole Bean Coffee');

  const deleted = repo.deleteTransaction(created.id);
  assert.equal(deleted, true);
  assert.equal(repo.getTransactions().length, initial.length);

  repo.saveBudget('2026-11', 3500);
  assert.equal(repo.getBudgetForMonth('2026-11'), 3500);
});

test('transaction validation catches missing and invalid fields', () => {
  const bad = validateTransactionInput({
    title: '   ',
    amount: -10,
    type: 'expense',
    category: '',
    date: 'invalid',
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.title);
  assert.ok(bad.errors.amount);
  assert.ok(bad.errors.category);
  assert.ok(bad.errors.date);

  const good = validateTransactionInput({
    title: 'Grocery Shopping',
    amount: 120.5,
    type: 'expense',
    category: 'Food',
    date: '2026-11-13',
  });
  assert.equal(good.valid, true);
});

test('filtering and sorting transactions work across search, type, category, and date', () => {
  const items = [
    { id: '1', title: 'Salary', amount: 4000, category: 'Salary', type: 'income', date: '2026-11-01', description: 'Pay' },
    { id: '2', title: 'Groceries', amount: 150, category: 'Food', type: 'expense', date: '2026-11-05', description: 'Market' },
    { id: '3', title: 'Coffee', amount: 15, category: 'Food', type: 'expense', date: '2026-11-12', description: 'Cafe' },
  ];

  assert.equal(filterTransactions(items, { search: 'cafe' }).length, 1);
  assert.equal(filterTransactions(items, { type: 'income' }).length, 1);
  assert.equal(filterTransactions(items, { category: 'Food' }).length, 2);

  const newestFirst = sortTransactions(items, 'date-desc');
  assert.equal(newestFirst[0].id, '3');

  const oldestFirst = sortTransactions(items, 'date-asc');
  assert.equal(oldestFirst[0].id, '1');

  assert.equal(formatCurrency(-45.5), '-$45.50');
});

test('dashboard calculations compute Total Balance = Total Income - Total Expenses', () => {
  const items = [
    { id: '1', title: 'Salary', amount: 5000, category: 'Salary', type: 'income', date: '2026-11-01', description: '' },
    { id: '2', title: 'Rent', amount: 1500, category: 'Housing', type: 'expense', date: '2026-11-02', description: '' },
    { id: '3', title: 'Old Expense', amount: 500, category: 'Food', type: 'expense', date: '2026-10-15', description: '' },
  ];

  const summary = calculateSummaryMetrics(items, '2026-11');
  assert.equal(summary.totalIncome, 5000);
  assert.equal(summary.totalExpenses, 2000);
  assert.equal(summary.totalBalance, 3000);
  assert.equal(summary.monthlySpending, 1500);

  const series = calculateMonthlyOverviewSeries(items, '2026-11', 2);
  assert.deepEqual(series.monthKeys, ['2026-10', '2026-11']);
  assert.deepEqual(series.spending, [500, 1500]);
  assert.deepEqual(series.income, [0, 5000]);

  const breakdown = calculateCategoryBreakdown(items, 'all');
  assert.equal(breakdown[0].category, 'Housing');
  assert.equal(breakdown[0].percentage, 75);
  assert.equal(getRecentTransactions(items, 2).length, 2);
});

test('analytics calculations identify savings and highest spending category', () => {
  const items = [
    { id: '1', title: 'Salary', amount: 4000, category: 'Salary', type: 'income', date: '2026-11-01', description: '' },
    { id: '2', title: 'Rent', amount: 1600, category: 'Housing', type: 'expense', date: '2026-11-02', description: '' },
    { id: '3', title: 'Food', amount: 400, category: 'Food', type: 'expense', date: '2026-11-03', description: '' },
  ];

  const analytics = calculateAnalyticsData(items, '2026-11');
  assert.equal(analytics.totalSavings, 2000);
  assert.equal(analytics.savingsRate, 50);
  assert.equal(analytics.highestSpendingCategory.category, 'Housing');
  assert.equal(analytics.averageExpense, 1000);
});

test('budget calculations trigger warning at 80% and alert when exceeded', () => {
  const items = [
    { id: '1', title: 'Rent', amount: 850, category: 'Housing', type: 'expense', date: '2026-11-02', description: '' },
  ];

  const nominal = calculateBudgetStatus(items, '2026-11', 1200);
  assert.equal(nominal.status, 'nominal');
  assert.equal(nominal.remainingBudget, 350);

  const warning = calculateBudgetStatus(items, '2026-11', 1000);
  assert.equal(warning.status, 'warning');
  assert.equal(warning.utilizationPercent, 85);

  const exceeded = calculateBudgetStatus(items, '2026-11', 800);
  assert.equal(exceeded.status, 'exceeded');
  assert.equal(exceeded.overageAmount, 50);
  assert.equal(exceeded.remainingBudget, -50);

  const badBudget = validateBudgetInput('2026-11', 0);
  assert.equal(badBudget.valid, false);
});
