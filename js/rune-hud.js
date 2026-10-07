import { t } from './i18n.js?v=2';
export const RUNE_GLYPHS = ['○', '◇', '△', '□'];
const NAMES = ['circle', 'diamond', 'triangle', 'square'];
export function runeName(rune) { return t(`runes.${NAMES[rune]}`); }
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function updateRuneHud(grid) {
    const panel = document.getElementById('rune-panel');
    if (!panel) return;
    const active = !!grid?.hasRuneOrder();
    panel.classList.toggle('hidden', !active);
    const guidance = document.getElementById('game-guidance-text');
    if (guidance) guidance.textContent = t(active ? 'runes.guidance' : 'design.game_description');
    if (!active) return;
    const turn = grid.getRemovedIndices().length % grid.runeCycle.length;
    const current = document.getElementById('rune-current');
    if (current) current.textContent = `${t('runes.current')} ${RUNE_GLYPHS[grid.getCurrentRune()]}`;
    const markup = grid.runeCycle.map((rune, index) => `<span class="rune-step${index === turn ? ' is-current' : ''}" aria-label="${escape(runeName(rune))}${index === turn ? ` · ${escape(t('runes.current'))}` : ''}">${RUNE_GLYPHS[rune]}</span>`).join('<span class="rune-link" aria-hidden="true">›</span>');
    for (const id of ['rune-cycle', 'rune-help-cycle']) {
        const element = document.getElementById(id);
        if (element) element.innerHTML = markup;
    }
}
export function bindRuneHelp(onOpen = () => {}, onClose = () => {}) {
    const overlay = document.getElementById('overlay-rune-help');
    const open = document.getElementById('btn-rune-help');
    const close = document.getElementById('btn-rune-close');
    const dismiss = () => { onClose(); overlay?.classList.add('hidden'); open?.focus?.(); };
    open?.addEventListener('click', () => { onOpen(); overlay?.classList.remove('hidden'); close?.focus?.(); });
    close?.addEventListener('click', dismiss);
    overlay?.addEventListener('keydown', event => {
        if (event.key === 'Escape') dismiss();
        if (event.key === 'Tab') { event.preventDefault(); close?.focus?.(); }
    });
}
