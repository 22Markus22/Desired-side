async function loadProgress() {

    try {

        const response = await fetch("/api/tasks");

        if (!response.ok) {
            throw new Error("Не удалось загрузить задачи");
        }

        const data = await response.json();


        data.areas.forEach(area => {

            const card = document.querySelector(
                `.card[data-area="${area.name}"]`
            );

            if (!card) {
                return;
            }


            if (!area.tasks || area.tasks.length === 0) {
                return;
            }


            let totalProgress = 0;


            area.tasks.forEach(task => {

                switch (task.status) {

                    case "Done":
                        totalProgress += 100;
                        break;

                    case "In progress":
                        totalProgress += 50;
                        break;

                    case "Not done":
                        totalProgress += 0;
                        break;

                    default:
                        console.warn(
                            `Неизвестный статус: ${task.status}`
                        );

                }

            });


            const progress =
                totalProgress / area.tasks.length;


            const line =
                card.querySelector(".line");

            const percent =
                card.querySelector(".progress_percent");


            line.style.width = `${progress}%`;

            percent.textContent =
                `${Math.round(progress)}%`;

        });

    } catch (error) {

        console.error(
            "Ошибка загрузки прогресса:",
            error
        );

    }

}


loadProgress();