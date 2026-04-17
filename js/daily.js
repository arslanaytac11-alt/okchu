// js/daily.js
// Daily Challenge system

const DAILY_KEY = 'okchu_daily';

function getDayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
}

function seededRandom(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

const DAILY_DEFAULT = { streak: 0, lastDay: null, completed: {} };

export function getDailyData() {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return { ...DAILY_DEFAULT };
    try {
        const parsed = JSON.parse(raw);
        return { ...DAILY_DEFAULT, ...parsed };
    } catch {
        return { ...DAILY_DEFAULT };
    }
}

function saveDaily(data) {
    try {
        localStorage.setItem(DAILY_KEY, JSON.stringify(data));
    } catch (e) {
        // storage quota or privacy mode — fail silently
    }
}

export function isDailyCompleted() {
    const data = getDailyData();
    return !!data.completed[getDayKey()];
}

export function getDailyStreak() {
    return getDailyData().streak;
}

// Returns a modifier for the given day. Deterministic from the date so
// everyone sees the same modifier on the same day.
// - Odd day-of-month: 'time' (tighter countdown)
// - Even day-of-month: 'moves' (capped attempts)
export function getDailyModifier(day = getDayKey()) {
    const dayNum = parseInt(day.split('-')[2], 10);
    if (dayNum % 2 === 1) {
        return { type: 'time', multiplier: 0.6 };
    }
    return { type: 'moves', extraMoves: 2 };
}

export function getDailyChallenge(allLevels) {
    const day = getDayKey();
    const seed = day.split('-').reduce((a, b) => a * 31 + parseInt(b), 0);
    const rng = seededRandom(seed);
    const idx = Math.floor(rng() * allLevels.length);
    return { level: allLevels[idx], day, modifier: getDailyModifier(day) };
}

export function completeDaily(score, stars) {
    const data = getDailyData();
    const today = getDayKey();

    // Check streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${(yesterday.getMonth()+1).toString().padStart(2,'0')}-${yesterday.getDate().toString().padStart(2,'0')}`;

    if (data.lastDay === yKey) {
        data.streak++;
    } else if (data.lastDay !== today) {
        data.streak = 1;
    }

    data.lastDay = today;
    data.completed[today] = { score, stars };
    saveDaily(data);
    return data.streak;
}
