// Cancel a delayed canvas launch when navigation supersedes it.
export function createLaunchScheduler({ isActive, start }) {
    let generation = 0;
    let timer = null;
    return {
        cancel() { generation++; if (timer !== null) clearTimeout(timer); timer = null; },
        schedule(level, chapter, options) {
            this.cancel();
            const current = generation;
            timer = setTimeout(() => {
                timer = null;
                if (current === generation && isActive()) start(level, chapter, options);
            }, 50);
        },
    };
}
