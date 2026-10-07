// A small narrative layer over existing Egypt progression; no save writes.
import { t } from './i18n.js?v=2';

export function renderEgyptResult(level, isDaily = false) {
    const card = document.getElementById('complete-story');
    if (!card) return;
    const show = !isDaily && level?.chapter === 1 && level.level >= 1 && level.level <= 5;
    card.classList.toggle('hidden', !show);
    // Always clear content so daily/other chapter transitions cannot retain it.
    document.getElementById('complete-story-title').textContent = show ? t('civilizations.1.result_title') : '';
    document.getElementById('complete-story-text').textContent = show ? t(`civilizations.1.results.${level.level - 1}`) : '';
}
