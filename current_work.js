async function loadProgress() {

    try {

        const response = await fetch(
            `/api/tasks?t=${Date.now()}`,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("Не удалось загрузить прогресс");
        }

        const progress = await response.json();


        document
            .querySelectorAll(".card[data-area]")
            .forEach(card => {

                const area = card.dataset.area;

                const value = progress[area] ?? 0;

                const line =
                    card.querySelector(".line");

                const percent =
                    card.querySelector(".progress_percent");


                line.style.width = `${value}%`;

                percent.textContent = `${value}%`;

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
    30000
);