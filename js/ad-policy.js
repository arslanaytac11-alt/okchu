// App pacing choices, not Google-mandated frequency limits.
export const AD_POLICY = Object.freeze({
    completedLevelsBetweenInterstitials: 6,
    minimumInterstitialGapMs: 120_000,
    firstSessionGraceMs: 180_000,
    loadTimeoutMs: 10_000,
    presentationTimeoutMs: 90_000,
    rewardDismissGraceMs: 250,
    loadedAdLifetimeMs: 50 * 60_000,
});

export function createInterstitialPolicy({ startedAt = Date.now(), lastShownAt = 0 } = {}) {
    let completions = 0;
    let last = Number.isFinite(lastShownAt) && lastShownAt > 0 ? lastShownAt : 0;
    return {
        noteCompletion() { completions++; },
        canShow({ now = Date.now(), placement } = {}) {
            return placement === 'level-result' && Number.isFinite(now) &&
                completions >= AD_POLICY.completedLevelsBetweenInterstitials &&
                now - startedAt >= AD_POLICY.firstSessionGraceMs &&
                (!last || now - last >= AD_POLICY.minimumInterstitialGapMs);
        },
        noteShown(now = Date.now()) {
            completions = 0;
            last = now;
        },
    };
}
