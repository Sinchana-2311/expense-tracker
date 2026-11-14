/**
 * Storage and API client module.
 * Replaces LocalStorage persistence with REST API fetch calls
 * while preserving LocalStorage migration capabilities and unit test compatibility.
 */

export const STORAGE_KEYS = {
  TRANSACTIONS: 'ledgerflow_transactions_v1',
  BUDGETS: 'ledgerflow_budgets_v1',
  INITIALIZED: 'ledgerflow_initialized_v1',
  MIGRATED: 'ledgerflow_migrated_to_backend_v1',
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
];

export const SEED_BUDGETS = {
  '2026-11': 3200,
  '2026-10': 2800,
  '2026-09': 2800,
};

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    throw new Error(`Cannot connect to backend server at ${url}. Please verify the server is running.`);
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = result?.error || `Request failed with status ${response.status} (${response.statusText})`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = result;
    throw error;
  }

  return result;
}

// API-backed storage client
export const storage = {
  async getTransactions() {
    const res = await request('/transactions');
    return Array.isArray(res.data) ? res.data : [];
  },

  async getTransactionById(id) {
    const res = await request(`/transactions/${id}`);
    return res.data;
  },

  async saveTransaction(transactionInput) {
    const payload = {
      title: transactionInput.title,
      amount: Number(transactionInput.amount),
      category: transactionInput.category,
      type: transactionInput.type,
      date: transactionInput.date,
      description: transactionInput.description || '',
    };
    const res = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateTransaction(id, updates) {
    const payload = {
      title: updates.title,
      amount: Number(updates.amount),
      category: updates.category,
      type: updates.type,
      date: updates.date,
      description: updates.description || '',
    };
    const res = await request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async deleteTransaction(id) {
    await request(`/transactions/${id}`, {
      method: 'DELETE',
    });
    return true;
  },

  async getBudgetForMonth(monthKey) {
    if (!monthKey || !monthKey.includes('-')) return null;
    const [yearStr, monthStr] = monthKey.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    try {
      const res = await request(`/budgets/${year}/${month}`);
      return res.data ? Number(res.data.amount) : null;
    } catch (err) {
      if (err.status === 404) {
        return null;
      }
      throw err;
    }
  },

  async getBudgetRecordForMonth(monthKey) {
    if (!monthKey || !monthKey.includes('-')) return null;
    const [yearStr, monthStr] = monthKey.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    try {
      const res = await request(`/budgets/${year}/${month}`);
      return res.data || null;
    } catch (err) {
      if (err.status === 404) {
        return null;
      }
      throw err;
    }
  },

  async saveBudget(monthKey, limit) {
    if (!monthKey || !monthKey.includes('-')) {
      throw new Error('Invalid month key for budget');
    }
    const [yearStr, monthStr] = monthKey.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const amount = Number(Number(limit).toFixed(2));

    const existing = await this.getBudgetRecordForMonth(monthKey);

    if (existing && existing.id) {
      const res = await request(`/budgets/${existing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ amount, year, month }),
      });
      return Number(res.data.amount);
    } else {
      const res = await request('/budgets', {
        method: 'POST',
        body: JSON.stringify({ year, month, amount }),
      });
      return Number(res.data.amount);
    }
  },

  async migrateFromLocalStorage() {
    if (typeof globalThis.localStorage === 'undefined') {
      return { migrated: false, txCount: 0, budgetCount: 0 };
    }

    const isMigrated = globalThis.localStorage.getItem(STORAGE_KEYS.MIGRATED);
    if (isMigrated === 'true') {
      return { migrated: false, txCount: 0, budgetCount: 0 };
    }

    let txCount = 0;
    let budgetCount = 0;

    // Check existing transactions in LocalStorage
    const rawTx = globalThis.localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    let localTransactions = [];
    try {
      if (rawTx) localTransactions = JSON.parse(rawTx);
    } catch {}

    // Check existing budgets in LocalStorage
    const rawBudgets = globalThis.localStorage.getItem(STORAGE_KEYS.BUDGETS);
    let localBudgets = {};
    try {
      if (rawBudgets) localBudgets = JSON.parse(rawBudgets);
    } catch {}

    // If LocalStorage was uninitialized, use seed data for initial import
    const initialized = globalThis.localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!initialized && (!localTransactions || localTransactions.length === 0)) {
      localTransactions = SEED_TRANSACTIONS;
      localBudgets = SEED_BUDGETS;
    }

    // Import transactions
    if (Array.isArray(localTransactions) && localTransactions.length > 0) {
      // Get existing server transactions to avoid duplicates
      const existing = await this.getTransactions();
      const existingSignatures = new Set(
        existing.map((t) => `${t.title}_${t.date}_${t.amount}_${t.type}`)
      );

      for (const tx of localTransactions) {
        const sig = `${tx.title}_${tx.date}_${tx.amount}_${tx.type}`;
        if (!existingSignatures.has(sig)) {
          try {
            await this.saveTransaction(tx);
            existingSignatures.add(sig);
            txCount += 1;
          } catch (e) {
            console.warn('Failed to import transaction:', tx, e);
          }
        }
      }
    }

    // Import budgets
    if (localBudgets && typeof localBudgets === 'object') {
      for (const [monthKey, limit] of Object.entries(localBudgets)) {
        if (monthKey && limit && Number(limit) > 0) {
          try {
            await this.saveBudget(monthKey, Number(limit));
            budgetCount += 1;
          } catch (e) {
            console.warn('Failed to import budget for', monthKey, e);
          }
        }
      }
    }

    // Set migration flag so it never runs twice, keeping original localStorage data intact as backup
    globalThis.localStorage.setItem(STORAGE_KEYS.MIGRATED, 'true');

    return {
      migrated: true,
      txCount,
      budgetCount,
      totalCount: txCount + budgetCount,
    };
  },

  async resetDemoData() {
    for (const tx of SEED_TRANSACTIONS) {
      try {
        await this.saveTransaction(tx);
      } catch {}
    }
    for (const [monthKey, limit] of Object.entries(SEED_BUDGETS)) {
      try {
        await this.saveBudget(monthKey, limit);
      } catch {}
    }
  },
};

/**
 * Storage adapter factory maintained for unit testing backwards-compatibility.
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
      writeJson(STORAGE_KEYS.TRANSACTIONS, SEED_TRANSACTIONS);
      writeJson(STORAGE_KEYS.BUDGETS, { ...SEED_BUDGETS });
      backend.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  }

  function getTransactions() {
    const list = readJson(STORAGE_KEYS.TRANSACTIONS, []);
    return Array.isArray(list) ? list : [];
  }

  function saveTransaction(input) {
    const list = getTransactions();
    const record = { ...input, id: input.id || `tx_${Date.now()}` };
    list.push(record);
    writeJson(STORAGE_KEYS.TRANSACTIONS, list);
    return record;
  }

  function updateTransaction(id, updates) {
    const list = getTransactions();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates, id };
    writeJson(STORAGE_KEYS.TRANSACTIONS, list);
    return list[idx];
  }

  function deleteTransaction(id) {
    const list = getTransactions();
    const filtered = list.filter((t) => t.id !== id);
    if (filtered.length === list.length) return false;
    writeJson(STORAGE_KEYS.TRANSACTIONS, filtered);
    return true;
  }

  function getBudgets() {
    return readJson(STORAGE_KEYS.BUDGETS, {});
  }

  function getBudgetForMonth(monthKey) {
    const budgets = getBudgets();
    return budgets[monthKey] ?? null;
  }

  function saveBudget(monthKey, limit) {
    const budgets = getBudgets();
    budgets[monthKey] = limit;
    writeJson(STORAGE_KEYS.BUDGETS, budgets);
    return limit;
  }

  function resetDemoData() {
    writeJson(STORAGE_KEYS.TRANSACTIONS, SEED_TRANSACTIONS);
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

function createMemoryFallbackStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}
