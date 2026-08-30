-- Incomes table: stores monthly total family income
CREATE TABLE IF NOT EXISTS incomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_year TEXT NOT NULL UNIQUE, -- YYYY-MM
  total_amount REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories table: budget allocations per category per month
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  allocated_budget REAL NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL, -- YYYY-MM
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, month_year)
);

-- Expenses table: daily logged expenses linked to category
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incomes_month ON incomes(month_year);
CREATE INDEX IF NOT EXISTS idx_categories_month ON categories(month_year);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- Users table: application accounts (password stored as salt:pbkdf2-hash)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
