const { db } = require('../config/database');

function isValidDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function isValidId(id) {
  const num = Number(id);
  return Number.isInteger(num) && num > 0;
}

function validateTransactionData({ title, amount, category, type, date }) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return 'Title is required and must not be empty';
  }
  const numAmount = Number(amount);
  if (amount === undefined || amount === null || Number.isNaN(numAmount) || numAmount <= 0) {
    return 'Amount is required and must be a number greater than 0';
  }
  if (!category || typeof category !== 'string' || category.trim() === '') {
    return 'Category is required and must not be empty';
  }
  if (type !== 'income' && type !== 'expense') {
    return 'Type must be either "income" or "expense"';
  }
  if (!isValidDate(date)) {
    return 'Date is required and must be a valid date in YYYY-MM-DD format';
  }
  return null;
}

// GET /api/transactions
function getAllTransactions(req, res, next) {
  try {
    const stmt = db.prepare('SELECT * FROM transactions ORDER BY date DESC, id DESC');
    const transactions = stmt.all();
    return res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/transactions/:id
function getTransactionById(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID. ID must be a positive integer.',
      });
    }

    const stmt = db.prepare('SELECT * FROM transactions WHERE id = ?');
    const transaction = stmt.get(Number(id));

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: `Transaction with ID ${id} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/transactions
function createTransaction(req, res, next) {
  try {
    const { title, amount, category, type, date, description } = req.body || {};
    const validationError = validateTransactionData({ title, amount, category, type, date });
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    const trimmedTitle = title.trim();
    const parsedAmount = Number(Number(amount).toFixed(2));
    const trimmedCategory = category.trim();
    const cleanDescription = description ? String(description).trim() : null;

    const stmt = db.prepare(`
      INSERT INTO transactions (title, amount, category, type, date, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      trimmedTitle,
      parsedAmount,
      trimmedCategory,
      type,
      date,
      cleanDescription
    );

    const getStmt = db.prepare('SELECT * FROM transactions WHERE id = ?');
    const created = getStmt.get(info.lastInsertRowid);

    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/transactions/:id
function updateTransaction(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID. ID must be a positive integer.',
      });
    }

    const existingStmt = db.prepare('SELECT * FROM transactions WHERE id = ?');
    const existing = existingStmt.get(Number(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Transaction with ID ${id} not found`,
      });
    }

    const { title, amount, category, type, date, description } = req.body || {};
    const validationError = validateTransactionData({ title, amount, category, type, date });
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    const trimmedTitle = title.trim();
    const parsedAmount = Number(Number(amount).toFixed(2));
    const trimmedCategory = category.trim();
    const cleanDescription = description !== undefined ? (description ? String(description).trim() : null) : existing.description;

    const updateStmt = db.prepare(`
      UPDATE transactions
      SET title = ?, amount = ?, category = ?, type = ?, date = ?, description = ?
      WHERE id = ?
    `);

    updateStmt.run(
      trimmedTitle,
      parsedAmount,
      trimmedCategory,
      type,
      date,
      cleanDescription,
      Number(id)
    );

    const updated = existingStmt.get(Number(id));
    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/transactions/:id
function deleteTransaction(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID. ID must be a positive integer.',
      });
    }

    const existingStmt = db.prepare('SELECT * FROM transactions WHERE id = ?');
    const existing = existingStmt.get(Number(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Transaction with ID ${id} not found`,
      });
    }

    const deleteStmt = db.prepare('DELETE FROM transactions WHERE id = ?');
    deleteStmt.run(Number(id));

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      data: { id: Number(id) },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
