async function loadProgress() {
    try {

        const response = await fetch(
            `/api/tasks?t=${Date.now()}`,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Ошибка API: ${response.status}`
            );
        }

        const progress = await response.json();

        console.log(
            "Получен прогресс:",
            progress
        );

        document
            .querySelectorAll(".card[data-area]")
            .forEach(card => {
                const area =
                    card.dataset.area;


                const value =
                    progress[area] ?? 0;


                const line =
                    card.querySelector(".line");


                const percent =
                    card.querySelector(
                        ".progress_percent"
                    );

                if (line) {

                    line.style.width =
                        `${value}%`;

                }

                if (percent) {

                    percent.textContent =
                        `${value}%`;
                }
            });


    } catch (error) {
        console.error(
            "Ошибка загрузки прогресса:",
            error
        );
    }
}

loadProgress();

setInterval(
    loadProgress,
    10000
);