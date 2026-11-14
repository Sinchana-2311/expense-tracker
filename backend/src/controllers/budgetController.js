const { db } = require('../config/database');

function isValidId(id) {
  const num = Number(id);
  return Number.isInteger(num) && num > 0;
}

function isValidMonth(month) {
  const num = Number(month);
  return Number.isInteger(num) && num >= 1 && num <= 12;
}

function isValidYear(year) {
  const num = Number(year);
  return Number.isInteger(num) && num >= 1900 && num <= 2200;
}

// GET /api/budgets/:year/:month
function getBudgetByMonth(req, res, next) {
  try {
    const { year, month } = req.params;

    if (!isValidYear(year)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year. Year must be a valid 4-digit integer.',
      });
    }

    if (!isValidMonth(month)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month. Month must be an integer between 1 and 12.',
      });
    }

    const stmt = db.prepare('SELECT * FROM monthly_budgets WHERE year = ? AND month = ?');
    const budget = stmt.get(Number(year), Number(month));

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: `No budget found for ${year}-${String(month).padStart(2, '0')}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: budget,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/budgets
function createBudget(req, res, next) {
  try {
    const { year, month, amount } = req.body || {};

    if (!isValidYear(year)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year. Year must be a valid 4-digit integer.',
      });
    }

    if (!isValidMonth(month)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month. Month must be an integer between 1 and 12.',
      });
    }

    const numAmount = Number(amount);
    if (amount === undefined || amount === null || Number.isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required and must be a number greater than 0',
      });
    }

    // Check if budget already exists for this (year, month)
    const existingStmt = db.prepare('SELECT * FROM monthly_budgets WHERE year = ? AND month = ?');
    const existing = existingStmt.get(Number(year), Number(month));

    if (existing) {
      return res.status(409).json({
        success: false,
        error: `A budget already exists for ${year}-${String(month).padStart(2, '0')}`,
        data: existing,
      });
    }

    const insertStmt = db.prepare(`
      INSERT INTO monthly_budgets (year, month, amount)
      VALUES (?, ?, ?)
    `);

    const parsedAmount = Number(Number(amount).toFixed(2));
    const info = insertStmt.run(Number(year), Number(month), parsedAmount);

    const getStmt = db.prepare('SELECT * FROM monthly_budgets WHERE id = ?');
    const created = getStmt.get(info.lastInsertRowid);

    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/budgets/:id
function updateBudget(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid budget ID. ID must be a positive integer.',
      });
    }

    const existingStmt = db.prepare('SELECT * FROM monthly_budgets WHERE id = ?');
    const existing = existingStmt.get(Number(id));

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Budget with ID ${id} not found`,
      });
    }

    const { amount, year, month } = req.body || {};

    const numAmount = Number(amount);
    if (amount === undefined || amount === null || Number.isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required and must be a number greater than 0',
      });
    }

    const targetYear = year !== undefined ? Number(year) : existing.year;
    const targetMonth = month !== undefined ? Number(month) : existing.month;

    if (!isValidYear(targetYear)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year. Year must be a valid 4-digit integer.',
      });
    }

    if (!isValidMonth(targetMonth)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month. Month must be an integer between 1 and 12.',
      });
    }

    // Check if another budget occupies the target (year, month)
    const duplicateStmt = db.prepare('SELECT id FROM monthly_budgets WHERE year = ? AND month = ? AND id != ?');
    const duplicate = duplicateStmt.get(targetYear, targetMonth, Number(id));
    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: `A budget already exists for ${targetYear}-${String(targetMonth).padStart(2, '0')}`,
      });
    }

    const parsedAmount = Number(Number(amount).toFixed(2));
    const updateStmt = db.prepare(`
      UPDATE monthly_budgets
      SET year = ?, month = ?, amount = ?
      WHERE id = ?
    `);

    updateStmt.run(targetYear, targetMonth, parsedAmount, Number(id));
    const updated = existingStmt.get(Number(id));

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBudgetByMonth,
  createBudget,
  updateBudget,
};
