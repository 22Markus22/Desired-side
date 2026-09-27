const Database = require("better-sqlite3");

const username = process.argv[2];

if (!username) {
    console.log("Использование: node set-admin.js ИМЯ_ПОЛЬЗОВАТЕЛЯ");
    process.exit(1);
}

const db = new Database("database.db");

const columns = db.prepare("PRAGMA table_info(users)").all();
const hasRole = columns.some(column => column.name === "role");

if (!hasRole) {
    db.prepare("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'").run();
}

const user = db.prepare(
    "SELECT id, username FROM users WHERE username=?"
).get(username);

if (!user) {
    console.log("Пользователь не найден:", username);
    process.exit(1);
}

db.prepare(
    "UPDATE users SET role='admin' WHERE id=?"
).run(user.id);

console.log(`Пользователь ${user.username} теперь администратор.`);
