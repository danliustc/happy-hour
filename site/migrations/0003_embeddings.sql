CREATE TABLE user_embeddings (
  user_id INTEGER PRIMARY KEY,
  embedding TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
