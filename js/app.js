/**
 * Main Application Coordinator (app.js)
 * Connects storage, pure calculation modules, and DOM view controllers.
 */

import { storage } from './storage.js';
import {
  formatCurrency,
  formatMonthLabel,
  getCategoriesForType,
  initTransactionsView,
  renderTransactionsView,
  validateTransactionInput,
} from './transactions.js';
import { renderDashboardView } from './dashboard.js';
import { initAnalyticsView, renderAnalyticsView } from './analytics.js';
import { initBudgetView, renderBudgetView } from './budget.js';

function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentMonthKey() {
  return getTodayIso().slice(0, 7);
}

const VIEW_METADATA = {
  dashboard: {
    title: 'Dashboard',
    subtitle: () => `Financial overview for ${formatMonthLabel(getCurrentMonthKey())}`,
  },
  transactions: {
    title: 'Transaction History',
    subtitle: () => 'Search, filter, edit, and manage all recorded entries',
  },
  analytics: {
    title: 'Expense Analytics',
    subtitle: () => 'Income vs. expenses, category breakdown, and savings insights',
  },
  budget: {
    title: 'Budget Management',
    subtitle: () => 'Set monthly spending limits and monitor threshold alerts',
  },
};

function initApp() {
  storage.initSeedData();

  const currentMonth = getCurrentMonthKey();
  let activeView = 'dashboard';
  let pendingDeleteId = null;

  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const openSidebarBtn = document.getElementById('open-sidebar-btn');
  const closeSidebarBtn = document.getElementById('close-sidebar-btn');
  const pageTitleEl = document.getElementById('page-title');
  const pageSubtitleEl = document.getElementById('page-subtitle');

  // Modals
  const txModal = document.getElementById('transaction-modal');
  const txModalTitle = document.getElementById('transaction-modal-title');
  const txForm = document.getElementById('transaction-form');
  const txIdInput = document.getElementById('tx-id');
  const txTypeInput = document.getElementById('tx-type');
  const txTypeButtons = document.querySelectorAll('[data-tx-type]');
  const txTitleInput = document.getElementById('tx-title');
  const txAmountInput = document.getElementById('tx-amount');
  const txCategorySelect = document.getElementById('tx-category');
  const txDateInput = document.getElementById('tx-date');
  const txDescriptionInput = document.getElementById('tx-description');

  const deleteModal = document.getElementById('delete-modal');
  const deleteMessageEl = document.getElementById('delete-modal-message');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

  // Controllers
  const transactionsController = initTransactionsView({
    onFilterChange: () => renderActiveView(),
    onEdit: (id) => openEditModal(id),
    onDelete: (id) => openDeleteModal(id),
    onOpenAdd: () => openAddModal(),
  });

  const analyticsController = initAnalyticsView({
    onPeriodChange: () => renderActiveView(),
  });

  const budgetController = initBudgetView({
    defaultMonth: currentMonth,
    onMonthChange: () => renderActiveView(),
    onSaveBudget: (monthKey, limit) => {
      storage.saveBudget(monthKey, limit);
      renderAllViews();
      showToast(`Monthly budget for ${formatMonthLabel(monthKey)} saved.`);
    },
  });

  function refreshIcons() {
    if (globalThis.lucide && typeof globalThis.lucide.createIcons === 'function') {
      globalThis.lucide.createIcons();
    }
  }

  function showToast(message) {
    const region = document.getElementById('toast-region');
    if (!region) return;
    region.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    region.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode === region) {
        toast.remove();
      }
    }, 2600);
  }

  function openMobileSidebar() {
    sidebar?.classList.add('is-open');
    if (sidebarBackdrop) sidebarBackdrop.hidden = false;
    openSidebarBtn?.setAttribute('aria-expanded', 'true');
  }

  function closeMobileSidebar() {
    sidebar?.classList.remove('is-open');
    if (sidebarBackdrop) sidebarBackdrop.hidden = true;
    openSidebarBtn?.setAttribute('aria-expanded', 'false');
  }

  openSidebarBtn?.addEventListener('click', openMobileSidebar);
  closeSidebarBtn?.addEventListener('click', closeMobileSidebar);
  sidebarBackdrop?.addEventListener('click', closeMobileSidebar);

  function setActiveView(viewName) {
    if (!VIEW_METADATA[viewName]) return;
    activeView = viewName;

    document.querySelectorAll('.nav-item[data-view]').forEach((btn) => {
      const isMatch = btn.dataset.view === viewName;
      btn.classList.toggle('is-active', isMatch);
      if (isMatch) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    document.querySelectorAll('.view').forEach((section) => {
      const isMatch = section.id === `view-${viewName}`;
      section.hidden = !isMatch;
      section.classList.toggle('is-active', isMatch);
    });

    const meta = VIEW_METADATA[viewName];
    if (pageTitleEl) pageTitleEl.textContent = meta.title;
    if (pageSubtitleEl) pageSubtitleEl.textContent = meta.subtitle();

    closeMobileSidebar();
    renderActiveView();
  }

  function renderActiveView() {
    const transactions = storage.getTransactions();
    const budgetMonth = budgetController.getSelectedMonth();
    const dashboardBudget = storage.getBudgetForMonth(currentMonth);

    // Always keep dashboard summary/sidebar net balance fresh
    renderDashboardView(transactions, currentMonth, dashboardBudget);

    if (activeView === 'transactions') {
      renderTransactionsView(transactions, transactionsController.getFilters());
    } else if (activeView === 'analytics') {
      renderAnalyticsView(transactions, analyticsController.getSelectedPeriod());
    } else if (activeView === 'budget') {
      const selectedBudget = storage.getBudgetForMonth(budgetMonth);
      renderBudgetView(transactions, budgetMonth, selectedBudget);
    }

    refreshIcons();
  }

  function renderAllViews() {
    const transactions = storage.getTransactions();
    const budgetMonth = budgetController.getSelectedMonth();
    renderDashboardView(transactions, currentMonth, storage.getBudgetForMonth(currentMonth));
    renderTransactionsView(transactions, transactionsController.getFilters());
    renderAnalyticsView(transactions, analyticsController.getSelectedPeriod());
    renderBudgetView(transactions, budgetMonth, storage.getBudgetForMonth(budgetMonth));
    refreshIcons();
  }

  // Navigation listeners
  document.querySelectorAll('.nav-item[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.view;
      window.location.hash = target;
      setActiveView(target);
    });
  });

  document.querySelectorAll('[data-goto-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.gotoView;
      window.location.hash = target;
      setActiveView(target);
    });
  });

  document.querySelector('[data-nav-target="dashboard"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = 'dashboard';
    setActiveView('dashboard');
  });

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (VIEW_METADATA[hash] && hash !== activeView) {
      setActiveView(hash);
    }
  });

  // Transaction Modal Logic
  function populateCategoryOptions(type, selectedCategory = '') {
    if (!txCategorySelect) return;
    const categories = getCategoriesForType(type);
    txCategorySelect.innerHTML = categories
      .map((cat) => `<option value="${cat}">${cat}</option>`)
      .join('');
    if (selectedCategory && categories.includes(selectedCategory)) {
      txCategorySelect.value = selectedCategory;
    }
  }

  function setTransactionType(type, preferredCategory = '') {
    const normalized = type === 'income' ? 'income' : 'expense';
    if (txTypeInput) txTypeInput.value = normalized;

    txTypeButtons.forEach((btn) => {
      const active = btn.dataset.txType === normalized;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });

    populateCategoryOptions(normalized, preferredCategory);
  }

  function clearTransactionErrors() {
    ['title', 'amount', 'category', 'date'].forEach((field) => {
      const errEl = document.getElementById(`tx-${field}-error`);
      const inputEl = document.getElementById(`tx-${field}`);
      if (errEl) errEl.textContent = '';
      inputEl?.classList.remove('has-error');
    });
  }

  function openAddModal() {
    clearTransactionErrors();
    if (txModalTitle) txModalTitle.textContent = 'Add Transaction';
    if (txIdInput) txIdInput.value = '';
    if (txTitleInput) txTitleInput.value = '';
    if (txAmountInput) txAmountInput.value = '';
    if (txDateInput) txDateInput.value = getTodayIso();
    if (txDescriptionInput) txDescriptionInput.value = '';
    setTransactionType('expense');

    if (typeof txModal?.showModal === 'function') {
      txModal.showModal();
    } else {
      txModal?.setAttribute('open', '');
    }
    txTitleInput?.focus();
    refreshIcons();
  }

  function openEditModal(id) {
    const tx = storage.getTransactions().find((item) => item.id === id);
    if (!tx) return;

    clearTransactionErrors();
    if (txModalTitle) txModalTitle.textContent = 'Edit Transaction';
    if (txIdInput) txIdInput.value = tx.id;
    if (txTitleInput) txTitleInput.value = tx.title;
    if (txAmountInput) txAmountInput.value = String(tx.amount);
    if (txDateInput) txDateInput.value = tx.date;
    if (txDescriptionInput) txDescriptionInput.value = tx.description || '';
    setTransactionType(tx.type, tx.category);

    if (typeof txModal?.showModal === 'function') {
      txModal.showModal();
    } else {
      txModal?.setAttribute('open', '');
    }
    txTitleInput?.focus();
    refreshIcons();
  }

  function closeTransactionModal() {
    if (typeof txModal?.close === 'function' && txModal.open) {
      txModal.close();
    } else {
      txModal?.removeAttribute('open');
    }
  }

  txTypeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setTransactionType(btn.dataset.txType);
    });
  });

  document.getElementById('open-add-modal-btn')?.addEventListener('click', openAddModal);
  document.getElementById('close-transaction-modal-btn')?.addEventListener('click', closeTransactionModal);
  document.getElementById('cancel-transaction-btn')?.addEventListener('click', closeTransactionModal);

  txForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTransactionErrors();

    const payload = {
      type: txTypeInput?.value || 'expense',
      title: txTitleInput?.value || '',
      amount: txAmountInput?.value || '',
      category: txCategorySelect?.value || '',
      date: txDateInput?.value || '',
      description: txDescriptionInput?.value || '',
    };

    const validation = validateTransactionInput(payload);
    if (!validation.valid) {
      for (const [field, msg] of Object.entries(validation.errors)) {
        const errEl = document.getElementById(`tx-${field}-error`);
        const inputEl = document.getElementById(`tx-${field}`);
        if (errEl) errEl.textContent = msg;
        inputEl?.classList.add('has-error');
      }
      return;
    }

    const editId = txIdInput?.value;
    if (editId) {
      storage.updateTransaction(editId, payload);
      showToast('Transaction updated.');
    } else {
      storage.saveTransaction(payload);
      showToast('Transaction added.');
    }

    closeTransactionModal();
    renderAllViews();
  });

  // Delete Confirmation Modal Logic
  function openDeleteModal(id) {
    const tx = storage.getTransactions().find((item) => item.id === id);
    if (!tx) return;
    pendingDeleteId = id;

    if (deleteMessageEl) {
      deleteMessageEl.textContent = `Are you sure you want to delete "${tx.title}" (${formatCurrency(tx.amount)})? This action cannot be undone.`;
    }
    if (typeof deleteModal?.showModal === 'function') {
      deleteModal.showModal();
    } else {
      deleteModal?.setAttribute('open', '');
    }
    refreshIcons();
  }

  function closeDeleteModal() {
    pendingDeleteId = null;
    if (typeof deleteModal?.close === 'function' && deleteModal.open) {
      deleteModal.close();
    } else {
      deleteModal?.removeAttribute('open');
    }
  }

  document.getElementById('close-delete-modal-btn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('cancel-delete-btn')?.addEventListener('click', closeDeleteModal);
  confirmDeleteBtn?.addEventListener('click', () => {
    if (!pendingDeleteId) return;
    storage.deleteTransaction(pendingDeleteId);
    closeDeleteModal();
    renderAllViews();
    showToast('Transaction deleted.');
  });

  // Reset Demo Data
  document.getElementById('reset-demo-btn')?.addEventListener('click', () => {
    storage.resetDemoData();
    renderAllViews();
    showToast('Demo data restored.');
  });

  // Initial route
  const initialHash = window.location.hash.replace('#', '');
  setActiveView(VIEW_METADATA[initialHash] ? initialHash : 'dashboard');
}

document.addEventListener('DOMContentLoaded', initApp);
