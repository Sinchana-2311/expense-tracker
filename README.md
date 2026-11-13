# LedgerFlow — Personal Expense Tracker

A clean, minimalist personal finance and expense tracking web application built strictly with **HTML5**, **CSS3**, and **Vanilla JavaScript** (with Chart.js and Lucide Icons loaded via CDN), using `localStorage` for client-side persistence.

## Project Structure

```
expense-tracker/
├── index.html          # Semantic HTML5 shell, views, and accessible dialogs
├── css/
│   └── style.css       # Minimalist financial UI design system and responsive layout
├── js/
│   ├── app.js          # Application bootstrap, view routing, and modal coordination
│   ├── storage.js      # Centralized LocalStorage repository (ready for REST API swap)
│   ├── transactions.js # Validation, search/filter/sort logic, and history table UI
│   ├── dashboard.js    # Dynamic KPI calculations and dashboard Chart.js visualizations
│   ├── analytics.js    # Savings, top category, monthly comparison, and distribution charts
│   └── budget.js       # Monthly budget persistence and 80%/100% threshold alerts
└── assets/
    └── logo.svg        # Minimalist vector brand mark
```

## Module Overview

- **`js/storage.js`**: Isolates all `localStorage` reads, writes, and seed initialization behind a clean repository interface (`getTransactions`, `saveTransaction`, `updateTransaction`, `deleteTransaction`, `getBudgetForMonth`, `saveBudget`). Future Node.js/Express/SQL integration only requires swapping this module to use `fetch('/api/...')`.
- **`js/transactions.js`**: Provides pure validation (`validateTransactionInput`), search/type/category filtering (`filterTransactions`), sorting (`sortTransactions`), formatting utilities, and Transaction History table rendering.
- **`js/dashboard.js`**: Computes Total Balance (`Total Income - Total Expenses`), Total Income, Total Expenses, Monthly Spending, 6-month overview series, and category breakdowns dynamically from transaction records.
- **`js/analytics.js`**: Computes Total Savings, net savings rate, highest spending category, average expense, monthly income vs. expenses, and daily spending distribution charts.
- **`js/budget.js`**: Validates and tracks monthly budgets against actual monthly expenses, displaying remaining budget, utilization percentage, an 80% warning banner, and an exceeded alert when spending surpasses 100%.
- **`js/app.js`**: Coordinates navigation between Dashboard, Transactions, Analytics, and Budget views, handles Add/Edit/Delete modal workflows, and triggers re-renders on state changes.

## Running Locally

Because the JavaScript files use standard ES Modules (`<script type="module">`), serve the directory over a local HTTP server:

```bash
# Option 1: Using the project dev server
npm run dev

# Option 2: Using any static file server (Python 3)
python3 -m http.server 3000
```

Then open `http://localhost:3000` in your browser.
