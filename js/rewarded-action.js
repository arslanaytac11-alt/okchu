// One explicit offer may grant once. SDK failure/cancellation never earns it.
export function createRewardedAction({ isCurrent, hasPremium, requestReward, applyReward }) {
    let pending = false;
    let granted = false;
    let cancelled = false;
    const current = () => {
        try { return !cancelled && isCurrent() === true; } catch { return false; }
    };
    return {
        cancel() { cancelled = true; },
        async run() {
            if (pending || granted || !current()) return 'ignored';
            pending = true;
            let earned = false;
            try {
                // Premium's advertised ad-free benefit is separate from an
                // earned SDK reward and never invokes an ad request.
                earned = hasPremium() === true ||
                    await requestReward({ userInitiated: true, isCurrent: current }) === true;
            } catch {}
            pending = false;
            if (!current()) return 'cancelled';
            if (!earned) return 'unavailable';
            granted = true;
            applyReward();
            return 'granted';
        },
    };
}
