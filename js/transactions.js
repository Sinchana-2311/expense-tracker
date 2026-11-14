/**
 * Transactions module.
 * Pure validation, filtering, sorting, and formatting utilities are decoupled
 * from DOM rendering for maintainability and unit testing.
 */

export const EXPENSE_CATEGORIES = [
  'Food',
  'Housing',
  'Transport',
  'Utilities',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Other',
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Gift',
  'Other',
];

export function getCategoriesForType(type) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function getAllCategories() {
  return Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]));
}

export function formatCurrency(amount) {
  const num = Number(amount || 0);
  const absFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));
  return num < 0 ? `-${absFormatted}` : absFormatted;
}

export function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const dt = new Date(year, month, day);
  if (Number.isNaN(dt.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dt);
}

export function formatMonthLabel(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || '';
  const [y, m] = monthKey.split('-').map(Number);
  const dt = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(dt);
}

export function validateTransactionInput(input) {
  const errors = {};
  const title = String(input?.title ?? '').trim();
  const amount = Number(input?.amount);
  const type = input?.type;
  const category = String(input?.category ?? '').trim();
  const date = String(input?.date ?? '').trim();

  if (!title) {
    errors.title = 'Please enter a transaction title.';
  } else if (title.length > 80) {
    errors.title = 'Title must be 80 characters or fewer.';
  }

  if (input?.amount === '' || input?.amount === null || input?.amount === undefined || Number.isNaN(amount)) {
    errors.amount = 'Please enter a valid amount.';
  } else if (amount <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  } else if (amount > 100000000) {
    errors.amount = 'Amount exceeds supported limit.';
  }

  if (type !== 'income' && type !== 'expense') {
    errors.type = 'Please choose income or expense.';
  }

  if (!category) {
    errors.category = 'Please select a category.';
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date = 'Please select a valid date.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function filterTransactions(transactions, criteria = {}) {
  const search = String(criteria.search ?? '').trim().toLowerCase();
  const type = criteria.type || 'all';
  const category = criteria.category || 'all';
  const month = criteria.month || 'all';

  return transactions.filter((tx) => {
    if (type !== 'all' && tx.type !== type) return false;
    if (category !== 'all' && tx.category !== category) return false;
    if (month !== 'all' && !tx.date.startsWith(month)) return false;

    if (search) {
      const haystack = `${tx.title} ${tx.category} ${tx.description || ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function sortTransactions(transactions, sortBy = 'date-desc') {
  const copy = [...transactions];
  copy.sort((a, b) => {
    switch (sortBy) {
      case 'date-asc': {
        const cmp = a.date.localeCompare(b.date);
        return cmp !== 0 ? cmp : String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
      }
      case 'amount-desc': {
        const cmp = b.amount - a.amount;
        return cmp !== 0 ? cmp : b.date.localeCompare(a.date);
      }
      case 'amount-asc': {
        const cmp = a.amount - b.amount;
        return cmp !== 0 ? cmp : b.date.localeCompare(a.date);
      }
      case 'date-desc':
      default: {
        const cmp = b.date.localeCompare(a.date);
        return cmp !== 0 ? cmp : String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
      }
    }
  });
  return copy;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Initializes event listeners for the Transaction History view.
 */
export function initTransactionsView({ onFilterChange, onEdit, onDelete, onOpenAdd }) {
  const searchEl = document.getElementById('filter-search');
  const categoryEl = document.getElementById('filter-category');
  const sortEl = document.getElementById('sort-transactions');
  const typeButtons = document.querySelectorAll('[data-type-filter]');
  const clearBtn = document.getElementById('clear-filters-btn');
  const tbodyEl = document.getElementById('transactions-tbody');

  // Populate category filter select
  if (categoryEl) {
    const categories = getAllCategories();
    categoryEl.innerHTML = `<option value="all">All Categories</option>` +
      categories.map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
  }

  const state = {
    search: '',
    type: 'all',
    category: 'all',
    sortBy: 'date-desc',
  };

  function notify() {
    onFilterChange({ ...state });
  }

  searchEl?.addEventListener('input', (e) => {
    state.search = e.target.value;
    notify();
  });

  typeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      typeButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.type = btn.dataset.typeFilter || 'all';
      notify();
    });
  });

  categoryEl?.addEventListener('change', (e) => {
    state.category = e.target.value;
    notify();
  });

  sortEl?.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    notify();
  });

  clearBtn?.addEventListener('click', () => {
    state.search = '';
    state.type = 'all';
    state.category = 'all';
    state.sortBy = 'date-desc';
    if (searchEl) searchEl.value = '';
    if (categoryEl) categoryEl.value = 'all';
    if (sortEl) sortEl.value = 'date-desc';
    typeButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.typeFilter === 'all'));
    notify();
  });

  document.querySelectorAll('[data-open-add]').forEach((btn) => {
    btn.addEventListener('click', () => onOpenAdd());
  });

  tbodyEl?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-id]');
    if (editBtn) {
      onEdit(editBtn.dataset.editId);
      return;
    }
    const delBtn = e.target.closest('[data-delete-id]');
    if (delBtn) {
      onDelete(delBtn.dataset.deleteId);
    }
  });

  return {
    getFilters: () => ({ ...state }),
  };
}

/**
 * Renders filtered and sorted transactions into the Transaction History table.
 */
export function renderTransactionsView(transactions, filterState) {
  const tbodyEl = document.getElementById('transactions-tbody');
  const tableWrapper = document.querySelector('#view-transactions .table-wrapper');
  const emptyEl = document.getElementById('transactions-empty');
  const countEl = document.getElementById('transactions-count-label');
  const netEl = document.getElementById('transactions-net-label');

  if (!tbodyEl) return;

  const filtered = sortTransactions(filterTransactions(transactions, filterState), filterState.sortBy);

  const filteredNet = filtered.reduce((acc, tx) => {
    return tx.type === 'income' ? acc + tx.amount : acc - tx.amount;
  }, 0);

  if (countEl) {
    countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'transaction' : 'transactions'}`;
  }
  if (netEl) {
    const prefix = filteredNet > 0 ? '+' : '';
    netEl.textContent = `Filtered Net: ${prefix}${formatCurrency(filteredNet)}`;
  }

  if (filtered.length === 0) {
    tbodyEl.innerHTML = '';
    if (tableWrapper) tableWrapper.hidden = true;
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  if (tableWrapper) tableWrapper.hidden = false;
  if (emptyEl) emptyEl.hidden = true;

  tbodyEl.innerHTML = filtered
    .map((tx) => {
      const isIncome = tx.type === 'income';
      const sign = isIncome ? '+' : '-';
      const amountClass = isIncome ? 'text-income' : 'text-expense';
      const typeLabel = isIncome ? 'Income' : 'Expense';
      const safeTitle = escapeHtml(tx.title);
      const safeDesc = tx.description ? `<div class="tx-cell-desc">${escapeHtml(tx.description)}</div>` : '';

      return `
        <tr data-tx-id="${escapeHtml(tx.id)}">
          <td data-label="Date" class="tx-cell-date">${escapeHtml(formatDateDisplay(tx.date))}</td>
          <td data-label="Transaction">
            <div class="tx-cell-title">${safeTitle}</div>
            ${safeDesc}
          </td>
          <td data-label="Category">${escapeHtml(tx.category)}</td>
          <td data-label="Type" class="${amountClass}">${typeLabel}</td>
          <td data-label="Amount" class="text-right tx-cell-amount tabular-nums ${amountClass}">
            ${sign}${formatCurrency(tx.amount)}
          </td>
          <td class="text-right">
            <div class="row-actions">
              <button
                type="button"
                class="icon-btn"
                data-edit-id="${escapeHtml(tx.id)}"
                aria-label="Edit ${safeTitle}"
                title="Edit transaction"
              >
                <i data-lucide="pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="icon-btn icon-btn-danger"
                data-delete-id="${escapeHtml(tx.id)}"
                aria-label="Delete ${safeTitle}"
                title="Delete transaction"
              >
                <i data-lucide="trash-2" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}
