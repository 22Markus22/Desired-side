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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(__dirname));

function auth(req, res, next) {
    console.log("Cookies:", req.cookies);
    const token = req.cookies.token;
    if (!token)
        return res.status(401).json({
            message: "Не авторизован"
        });

    try {

        req.user = jwt.verify(token, SECRET);
        next();

    } catch {

        res.status(401).json({
            message: "Недействительный токен"
        });
    }
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
            message: "Неверный email или пароль"
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
        httpOnly: true
    });

    res.json({
        username: user.username
    });

    console.log("Cookie отправлена");
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

app.get("/api/tasks", async (req, res) => {
    try {
        const response = await fetch(
            `https://api.github.com/repos/22Markus22/Desired-side/contents/tasks.json?ref=main&t=${Date.now()}`,
            {
                cache: "no-store",
                headers: {
                    "Accept": "application/vnd.github.raw+json",
                    "User-Agent": "Desired-Side"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `GitHub ответил с кодом ${response.status}`
            );
        }

        const data = await response.json();
        const result = {};

        for (const area of data.areas) {
            if (!area.tasks || area.tasks.length === 0) {
                result[area.name] = 0;
                continue;
            }

            let total = 0;

            for (const task of area.tasks) {

                if (task.status === "Done") {
                    total += 100;
                } else if (task.status === "In progress") {
                    total += 50;
                } else if (task.status === "Not done") {
                    total += 0;
                }
            }

            result[area.name] =
                Math.round(total / area.tasks.length);
        }

        res.set(
            "Cache-Control",
            "no-store"
        );

        res.json(result);

    } catch (error) {

        console.error(
            "Ошибка загрузки задач:",
            error
        );

        res.status(500).json({
            message: "Не удалось загрузить данные"
        });
    }
});

app.listen(3000, () => {
    console.log(
        "Server started: http://localhost:3000"
    );
});