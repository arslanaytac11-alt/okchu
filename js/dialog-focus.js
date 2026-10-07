// Keep focus with the visible dialog, then return it to the initiating control.
export function installDialogFocus() {
    if (typeof MutationObserver === 'undefined') return;
    let activeDialog = null;
    let returnFocus = null;
    const appScreens = [...document.querySelectorAll('.screen')];
    const focusable = dialog => [...dialog.querySelectorAll('button, a[href], input, [tabindex="0"]')]
        .filter(el => !el.disabled && el.getAttribute('aria-disabled') !== 'true' && el.getClientRects().length);
    const sync = () => {
        const dialogs = [...document.querySelectorAll('.overlay:not(.hidden)')];
        const next = dialogs[dialogs.length - 1] || null;
        if (next === activeDialog) return;
        if (!activeDialog && next) returnFocus = document.activeElement;
        activeDialog = next;
        appScreens.forEach(screen => { screen.inert = !!next; });
        dialogs.forEach(dialog => { dialog.inert = dialog !== next; });
        if (next) {
            const heading = next.querySelector('h2, h3');
            if (heading?.id) next.setAttribute('aria-labelledby', heading.id);
            const first = focusable(next)[0];
            requestAnimationFrame(() => { if (activeDialog === next) first?.focus({ preventScroll: true }); });
        } else {
            document.querySelectorAll('.overlay').forEach(dialog => { dialog.inert = false; });
            if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus({ preventScroll: true });
            returnFocus = null;
        }
    };
    document.querySelectorAll('.overlay').forEach(dialog => {
        const heading = dialog.querySelector('h2, h3');
        if (heading && !heading.id) heading.id = `${dialog.id}-title`;
        const observer = new MutationObserver(sync);
        observer.observe(dialog, { attributes: true, attributeFilter: ['class'] });
    });
    document.addEventListener('keydown', event => {
        if (!activeDialog || event.key !== 'Tab') return;
        const controls = focusable(activeDialog);
        if (!controls.length) { event.preventDefault(); return; }
        const index = controls.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) {
            event.preventDefault(); controls[controls.length - 1].focus();
        } else if (!event.shiftKey && (index < 0 || index === controls.length - 1)) {
            event.preventDefault(); controls[0].focus();
        }
    });
    sync();
}
