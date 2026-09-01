const API = "http://localhost:3000";

async function register() {

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const response = await fetch(API + "/api/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            username,
            email,
            password
        })
    });

    const data = await response.json();

    alert(data.message);

    if (response.ok)
        location.href = "login.html";
}

async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const response = await fetch(API + "/api/login", {

        method: "POST",
        credentials: "include",
        headers: {

            "Content-Type": "application/json"

        },
        body: JSON.stringify({

            username,
            password

        })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.message);
        return;
    }

    location.href = "index.html";
}

async function currentUser(){

    const response = await fetch(API+"/api/me",{
        credentials:"include"
    });

    if(!response.ok)
        return null;
    return await response.json();
}

async function logout(){

    await fetch(API+"/api/logout",{
        method:"POST",
        credentials:"include"
    });

    location.reload();
}

async function updateHeader() {

    const user = await currentUser();

    if (!user)
        return;
    const header = document.getElementById("headerButtons");
    const hero = document.getElementById("heroButtons");

    if (header) {
        header.innerHTML = `
            <span>
                ${user.username}
            </span>

            <button class="dark" onclick="logout()">
                Выйти
            </button>
        `;
    }

    if (hero) {

        hero.innerHTML = `
            <h3>
                Добро пожаловать, ${user.username}
            </h3>
        `;

    }

}

updateHeader();