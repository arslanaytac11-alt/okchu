// js/achievements.js
// Achievement/badge system

const ACH_KEY = 'okchu_achievements';

const ACHIEVEMENTS = [
    { id: 'first_clear',    icon: '\u{2705}', name: 'İlk Adım',         desc: 'İlk seviyeyi tamamla',            check: s => s.totalCleared >= 1 },
    { id: 'star_hunter',    icon: '\u{2B50}', name: 'Yıldız Avcısı',    desc: '10 yıldız topla',                 check: s => s.totalStars >= 10 },
    { id: 'star_master',    icon: '\u{1F31F}', name: 'Yıldız Ustası',   desc: '50 yıldız topla',                 check: s => s.totalStars >= 50 },
    { id: 'star_legend',    icon: '\u{1F4AB}', name: 'Yıldız Efsanesi', desc: '100 yıldız topla',                check: s => s.totalStars >= 100 },
    { id: 'perfect_3',      icon: '\u{1F947}', name: 'Kusursuz',        desc: '3 seviyeyi 3 yıldızla bitir',     check: s => s.perfectLevels >= 3 },
    { id: 'perfect_10',     icon: '\u{1F3C6}', name: 'Mükemmeliyetçi',  desc: '10 seviyeyi 3 yıldızla bitir',    check: s => s.perfectLevels >= 10 },
    { id: 'combo_5',        icon: '\u{1F525}', name: 'Combo Başlatıcı', desc: '5x combo yap',                    check: s => s.bestCombo >= 5 },
    { id: 'combo_10',       icon: '\u{1F4A5}', name: 'Combo Ustası',    desc: '10x combo yap',                   check: s => s.bestCombo >= 10 },
    { id: 'chapter_clear',  icon: '\u{1F4D6}', name: 'Kâşif',           desc: 'Bir bölümü tamamla',              check: s => s.chaptersCleared >= 1 },
    { id: 'chapter_5',      icon: '\u{1F30D}', name: 'Dünya Gezgini',   desc: '5 bölümü tamamla',                check: s => s.chaptersCleared >= 5 },
    { id: 'all_chapters',   icon: '\u{1F451}', name: 'Efsane',          desc: 'Tüm bölümleri tamamla',           check: s => s.chaptersCleared >= 10 },
    { id: 'daily_1',        icon: '\u{1F4C5}', name: 'Günlük Savaşçı',  desc: 'Günlük meydan okumayı tamamla',   check: s => s.dailyCompleted >= 1 },
    { id: 'daily_7',        icon: '\u{1F525}', name: '7 Gün Serisi',    desc: '7 gün üst üste günlük tamamla',   check: s => s.dailyStreak >= 7 },
    { id: 'speed_demon',    icon: '\u{26A1}', name: 'Hız Şeytanı',      desc: 'Bir seviyeyi 30 saniyede bitir',  check: s => s.fastestClear <= 30 },
    { id: 'no_mistakes',    icon: '\u{1F9E0}', name: 'Zeki Oyuncu',     desc: '5 seviyeyi sıfır hatayla bitir',  check: s => s.noMistakeLevels >= 5 },
];

function getUnlocked() {
    const raw = localStorage.getItem(ACH_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveUnlocked(list) {
    try {
        localStorage.setItem(ACH_KEY, JSON.stringify(list));
    } catch (e) {
        // storage quota or privacy mode — fail silently
    }
}

export function checkAchievements(stats) {
    const unlocked = getUnlocked();
    const newlyUnlocked = [];

    for (const ach of ACHIEVEMENTS) {
        if (unlocked.includes(ach.id)) continue;
        if (ach.check(stats)) {
            unlocked.push(ach.id);
            newlyUnlocked.push(ach);
        }
    }

    if (newlyUnlocked.length > 0) {
        saveUnlocked(unlocked);
    }
    return newlyUnlocked;
}

export function getAllAchievements() {
    const unlocked = getUnlocked();
    return ACHIEVEMENTS.map(a => ({
        ...a,
        unlocked: unlocked.includes(a.id),
    }));
}

export function getAchievementStats() {
    const unlocked = getUnlocked();
    return { total: ACHIEVEMENTS.length, unlocked: unlocked.length };
}
