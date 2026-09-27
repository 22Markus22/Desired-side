const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const SECRET = "DesiredSideSuperSecretKey";
const db = new Database("database.db");

db.prepare(`
CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
)
`).run();

// Добавляем роль существующим пользователям, если колонка еще не создана.
const userColumns = db.prepare("PRAGMA table_info(users)").all();
const hasRoleColumn = userColumns.some(column => column.name === "role");

if (!hasRoleColumn) {
    db.prepare("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'").run();
}

db.prepare(`
CREATE TABLE IF NOT EXISTS posts(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`).run();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(__dirname));

function auth(req, res, next) {

    const token = req.cookies.token;

    if (!token)
        return res.status(401).json({
            message: "Не авторизован"
        });

    try {

        const payload = jwt.verify(token, SECRET);

        // Берем актуальную роль из базы, чтобы изменение роли
        // применялось даже для уже существующей сессии.
        const user = db.prepare(
            "SELECT id, username, email, role FROM users WHERE id=?"
        ).get(payload.id);

        if (!user)
            return res.status(401).json({
                message: "Пользователь не найден"
            });

        req.user = user;
        next();

    } catch {

        res.status(401).json({
            message: "Недействительный токен"
        });
    }
}

function adminOnly(req, res, next) {

    if (req.user.role !== "admin")
        return res.status(403).json({
            message: "Недостаточно прав"
        });

    next();
}

app.post("/api/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
        return res.status(400).json({
            message: "Заполните все поля"
        });

    const exist = db.prepare(
        "SELECT * FROM users WHERE username=? OR email=?"
    ).get(username, email);

    if (exist)
        return res.status(400).json({
            message: "Такой пользователь уже существует"
        });

    const hash = await bcrypt.hash(password, 10);

    db.prepare(
        "INSERT INTO users(username,email,password) VALUES(?,?,?)"
    ).run(username, email, hash);

    res.json({
        message: "Регистрация успешна"
    });
});

app.post("/api/login", async (req, res) => {

    const { username, password } = req.body;

    const user = db.prepare(
        "SELECT * FROM users WHERE username=?"
    ).get(username);

    if (!user)
        return res.status(401).json({
            message: "Неверное имя пользователя или пароль"
        });

    const ok = await bcrypt.compare(password, user.password);

    if (!ok)
        return res.status(401).json({
            message: "Неверное имя пользователя или пароль"
        });

    const token = jwt.sign(
        {
            id: user.id,
            username: user.username
        },
        SECRET,
        {
            expiresIn: "7d"
        }
    );

    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax"
    });

    res.json({
        username: user.username,
        role: user.role
    });
});

app.get("/api/me", auth, (req, res) => {
    res.json(req.user);
});

app.post("/api/logout", (req, res) => {
    res.clearCookie("token");
    res.json({
        message: "Вы вышли"
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/posts", (req, res) => {

    const posts = db.prepare(`
        SELECT id, title, content, created_at
        FROM posts
        ORDER BY id DESC
    `).all();

    res.set("Cache-Control", "no-store");
    res.json(posts);
});

app.post("/api/posts", auth, adminOnly, (req, res) => {

    const { title, content } = req.body;

    if (!title || !content)
        return res.status(400).json({
            message: "Заполните заголовок и текст"
        });

    const result = db.prepare(`
        INSERT INTO posts(title, content)
        VALUES(?, ?)
    `).run(title.trim(), content.trim());

    const post = db.prepare(`
        SELECT id, title, content, created_at
        FROM posts
        WHERE id=?
    `).get(result.lastInsertRowid);

    res.status(201).json(post);
});

app.delete("/api/posts/:id", auth, adminOnly, (req, res) => {

    const result = db.prepare(
        "DELETE FROM posts WHERE id=?"
    ).run(req.params.id);

    if (result.changes === 0)
        return res.status(404).json({
            message: "Пост не найден"
        });

    res.json({
        message: "Пост удален"
    });
});

app.get("/api/tasks", async (req, res) => {

    try {

        const url =
            `https://raw.githubusercontent.com/22Markus22/Desired-side/main/tasks.json?t=${Date.now()}`;


        console.log("Загружаем tasks.json...");


        const response = await fetch(url, {

            cache: "no-store"

        });


        console.log(
            "GitHub status:",
            response.status
        );


        if (!response.ok) {

            throw new Error(
                `GitHub ответил с кодом ${response.status}`
            );

        }


        const data = await response.json();


        console.log(
            "Полученные задачи:",
            data
        );


        const result = {};


        for (const area of data.areas) {

            if (
                !area.tasks ||
                area.tasks.length === 0
            ) {

                result[area.name] = 0;

                continue;

            }


            let total = 0;


            for (const task of area.tasks) {

                if (task.status === "Done") {

                    total += 100;

                }

                else if (
                    task.status === "In progress"
                ) {

                    total += 50;

                }

                else if (
                    task.status === "Not done"
                ) {

                    total += 0;

                }

            }


            result[area.name] = Math.round(

                total / area.tasks.length

            );

        }


        console.log(
            "Рассчитанные проценты:",
            result
        );


        res.set(
            "Cache-Control",
            "no-store, no-cache, must-revalidate"
        );


        res.json(result);


    } catch (error) {

        console.error(
            "Ошибка загрузки задач:",
            error
        );


        res.status(500).json({

            message:
                "Не удалось загрузить данные"

        });

    }

});

app.listen(3000, "0.0.0.0", () => {

    console.log(
        "Server started: http://localhost:3000"
    );

});

// C:\Users\Markus\Downloads\cloudflared-windows-amd64.exe tunnel --url http://localhost:3000 --> запуск сервера в инет после node server.js