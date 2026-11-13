/**
 * Centralized storage module.
 * All LocalStorage reads/writes are isolated here so future REST API calls
 * (e.g., fetch('/api/transactions')) can replace this implementation
 * without altering UI or calculation modules.
 */

export const STORAGE_KEYS = {
  TRANSACTIONS: 'ledgerflow_transactions_v1',
  BUDGETS: 'ledgerflow_budgets_v1',
  INITIALIZED: 'ledgerflow_initialized_v1',
};

export const SEED_TRANSACTIONS = [
  {
    id: 'tx_202611_01',
    title: 'Monthly Salary',
    amount: 4650.0,
    category: 'Salary',
    type: 'income',
    date: '2026-11-01',
    description: 'Primary engineering payroll deposit',
  },
  {
    id: 'tx_202611_02',
    title: 'Apartment Rent',
    amount: 1450.0,
    category: 'Housing',
    type: 'expense',
    date: '2026-11-02',
    description: 'November monthly lease payment',
  },
  {
    id: 'tx_202611_03',
    title: 'Grocery Shopping',
    amount: 245.5,
    category: 'Food',
    type: 'expense',
    date: '2026-11-05',
    description: 'Weekly groceries and household essentials',
  },
  {
    id: 'tx_202611_04',
    title: 'UI Design Consultation',
    amount: 750.0,
    category: 'Freelance',
    type: 'income',
    date: '2026-11-07',
    description: 'Client design system audit',
  },
  {
    id: 'tx_202611_05',
    title: 'Electric & Fiber Internet',
    amount: 164.0,
    category: 'Utilities',
    type: 'expense',
    date: '2026-11-09',
    description: 'Monthly electricity and gigabit internet',
  },
  {
    id: 'tx_202611_06',
    title: 'Metro Pass & Fuel',
    amount: 118.25,
    category: 'Transport',
    type: 'expense',
    date: '2026-11-11',
    description: 'Commuter transit pass and fuel refill',
  },
  {
    id: 'tx_202611_07',
    title: 'Fresh Market Produce',
    amount: 92.4,
    category: 'Food',
    type: 'expense',
    date: '2026-11-12',
    description: 'Fresh vegetables, coffee beans, and dairy',
  },
  {
    id: 'tx_202611_08',
    title: 'Dental Checkup',
    amount: 115.0,
    category: 'Healthcare',
    type: 'expense',
    date: '2026-11-13',
    description: 'Routine biannual dental cleaning',
  },
  {
    id: 'tx_202610_01',
    title: 'Monthly Salary',
    amount: 4650.0,
    category: 'Salary',
    type: 'income',
    date: '2026-10-01',
    description: 'October payroll deposit',
  },
  {
    id: 'tx_202610_02',
    title: 'Apartment Rent',
    amount: 1450.0,
    category: 'Housing',
    type: 'expense',
    date: '2026-10-02',
    description: 'October monthly lease payment',
  },
  {
    id: 'tx_202610_03',
    title: 'Supermarket & Pantry',
    amount: 410.8,
    category: 'Food',
    type: 'expense',
    date: '2026-10-12',
    description: 'October groceries and pantry restock',
  },
  {
    id: 'tx_202610_04',
    title: 'Autumn Jacket & Shoes',
    amount: 215.0,
    category: 'Shopping',
    type: 'expense',
    date: '2026-10-19',
    description: 'Seasonal wardrobe replacement',
  },
  {
    id: 'tx_202610_05',
    title: 'Dividend Payout',
    amount: 320.0,
    category: 'Investments',
    type: 'income',
    date: '2026-10-22',
    description: 'Quarterly index ETF distribution',
  },
  {
    id: 'tx_202610_06',
    title: 'Utilities & Gas',
    amount: 158.6,
    category: 'Utilities',
    type: 'expense',
    date: '2026-10-25',
    description: 'October electric, water, and internet',
  },
  {
    id: 'tx_202609_01',
    title: 'Monthly Salary',
    amount: 4650.0,
    category: 'Salary',
    type: 'income',
    date: '2026-09-01',
    description: 'September payroll deposit',
  },
  {
    id: 'tx_202609_02',
    title: 'Apartment Rent',
    amount: 1450.0,
    category: 'Housing',
    type: 'expense',
    date: '2026-09-02',
    description: 'September monthly lease payment',
  },
  {
    id: 'tx_202609_03',
    title: 'Groceries & Dining',
    amount: 385.0,
    category: 'Food',
    type: 'expense',
    date: '2026-09-14',
    description: 'Weekly groceries and weekend dinner',
  },
  {
    id: 'tx_202609_04',
    title: 'Concert & Cinema Tickets',
    amount: 140.0,
    category: 'Entertainment',
    type: 'expense',
    date: '2026-09-20',
    description: 'Live jazz performance and movie night',
  },
  {
    id: 'tx_202608_01',
    title: 'Monthly Salary',
    amount: 4650.0,
    category: 'Salary',
    type: 'income',
    date: '2026-08-01',
    description: 'August payroll deposit',
  },
  {
    id: 'tx_202608_02',
    title: 'Apartment Rent',
    amount: 1450.0,
    category: 'Housing',
    type: 'expense',
    date: '2026-08-02',
    description: 'August monthly lease payment',
  },
  {
    id: 'tx_202608_03',
    title: 'Groceries & Summer Produce',
    amount: 342.0,
    category: 'Food',
    type: 'expense',
    date: '2026-08-15',
    description: 'Weekly groceries and market produce',
  },
  {
    id: 'tx_202608_04',
    title: 'Electric & Cooling Utilities',
    amount: 185.0,
    category: 'Utilities',
    type: 'expense',
    date: '2026-08-22',
    description: 'Peak summer electricity and internet',
  },
  {
    id: 'tx_202607_01',
    title: 'Monthly Salary',
    amount: 4650.0,
    category: 'Salary',
    type: 'income',
    date: '2026-07-01',
    description: 'July payroll deposit',
  },
  {
    id: 'tx_202607_02',
    title: 'Apartment Rent',
    amount: 1450.0,
    category: 'Housing',
    type: 'expense',
    date: '2026-07-02',
    description: 'July monthly lease payment',
  },
  {
    id: 'tx_202607_03',
    title: 'Weekend Rail Trip',
    amount: 265.0,
    category: 'Transport',
    type: 'expense',
    date: '2026-07-11',
    description: 'Intercity rail tickets and local transit',
  },
  {
    id: 'tx_202607_04',
    title: 'Web Performance Audit',
    amount: 600.0,
    category: 'Freelance',
    type: 'income',
    date: '2026-07-18',
    description: 'Advisory optimization engagement',
  },
  {
    id: 'tx_202606_01',
    title: 'Monthly Salary',
    amount: 4650.0,
    category: 'Salary',
    type: 'income',
    date: '2026-06-01',
    description: 'June payroll deposit',
  },
  {
    id: 'tx_202606_02',
    title: 'Apartment Rent',
    amount: 1450.0,
    category: 'Housing',
    type: 'expense',
    date: '2026-06-02',
    description: 'June monthly lease payment',
  },
  {
    id: 'tx_202606_03',
    title: 'Grocery & Household Supplies',
    amount: 360.0,
    category: 'Food',
    type: 'expense',
    date: '2026-06-14',
    description: 'Monthly staples and kitchen supplies',
  },
];

export const SEED_BUDGETS = {
  '2026-11': 3200,
  '2026-10': 2800,
  '2026-09': 2800,
};

function generateUniqueId() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return `tx_${globalThis.crypto.randomUUID()}`;
  }
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeTransaction(raw) {
  return {
    id: String(raw.id || generateUniqueId()),
    title: String(raw.title || '').trim(),
    amount: Number(Number(raw.amount || 0).toFixed(2)),
    category: String(raw.category || 'Other').trim(),
    type: raw.type === 'income' ? 'income' : 'expense',
    date: String(raw.date || '').slice(0, 10),
    description: String(raw.description || '').trim(),
  };
}

function createMemoryFallbackStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

/**
 * Creates a storage repository backed by a synchronous Storage-compatible adapter.
 */
export function createStorageRepository(adapter) {
  const backend = adapter || (typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : createMemoryFallbackStorage());

  function readJson(key, fallback) {
    try {
      const raw = backend.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    backend.setItem(key, JSON.stringify(value));
  }

  function initSeedData() {
    const initialized = backend.getItem(STORAGE_KEYS.INITIALIZED);
    if (!initialized) {
      writeJson(
        STORAGE_KEYS.TRANSACTIONS,
        SEED_TRANSACTIONS.map((tx) => normalizeTransaction(tx))
      );
      writeJson(STORAGE_KEYS.BUDGETS, { ...SEED_BUDGETS });
      backend.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  }

  function getTransactions() {
    const list = readJson(STORAGE_KEYS.TRANSACTIONS, []);
    if (!Array.isArray(list)) return [];
    return list.map(normalizeTransaction);
  }

  function saveTransaction(transactionInput) {
    const transactions = getTransactions();
    const record = normalizeTransaction({
      ...transactionInput,
      id: transactionInput.id || generateUniqueId(),
    });
    transactions.push(record);
    writeJson(STORAGE_KEYS.TRANSACTIONS, transactions);
    return record;
  }

  function updateTransaction(id, updates) {
    const transactions = getTransactions();
    const index = transactions.findIndex((tx) => tx.id === id);
    if (index === -1) return null;

    const updated = normalizeTransaction({
      ...transactions[index],
      ...updates,
      id,
    });
    transactions[index] = updated;
    writeJson(STORAGE_KEYS.TRANSACTIONS, transactions);
    return updated;
  }

  function deleteTransaction(id) {
    const transactions = getTransactions();
    const filtered = transactions.filter((tx) => tx.id !== id);
    if (filtered.length === transactions.length) return false;
    writeJson(STORAGE_KEYS.TRANSACTIONS, filtered);
    return true;
  }

  function getBudgets() {
    const raw = readJson(STORAGE_KEYS.BUDGETS, {});
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const sanitized = {};
    for (const [month, value] of Object.entries(raw)) {
      const num = Number(value);
      if (Number.isFinite(num) && num > 0) {
        sanitized[month] = Number(num.toFixed(2));
      }
    }
    return sanitized;
  }

  function getBudgetForMonth(monthKey) {
    const budgets = getBudgets();
    return Object.prototype.hasOwnProperty.call(budgets, monthKey) ? budgets[monthKey] : null;
  }

  function saveBudget(monthKey, limit) {
    const budgets = getBudgets();
    const amount = Number(Number(limit).toFixed(2));
    budgets[monthKey] = amount;
    writeJson(STORAGE_KEYS.BUDGETS, budgets);
    return amount;
  }

  function resetDemoData() {
    writeJson(
      STORAGE_KEYS.TRANSACTIONS,
      SEED_TRANSACTIONS.map((tx) => normalizeTransaction(tx))
    );
    writeJson(STORAGE_KEYS.BUDGETS, { ...SEED_BUDGETS });
    backend.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  return {
    initSeedData,
    getTransactions,
    saveTransaction,
    updateTransaction,
    deleteTransaction,
    getBudgets,
    getBudgetForMonth,
    saveBudget,
    resetDemoData,
  };
}

export const storage = createStorageRepository();
