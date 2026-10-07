// Limits are based on the reviewed puzzle, not a civilization label.
export function getPuzzleTimeLimit(level, mode = 'classic', modifier = null) {
    const paths = level?.paths?.length || 0;
    const depth = level?.balance?.dependencyDepth || 3;
    let seconds = level?.balance?.recommendedSeconds || Math.ceil(45 + paths * 3 + depth * 5);
    if (mode === 'timed') seconds = Math.round(seconds * 0.65);
    if (modifier?.type === 'time') seconds = Math.max(15, Math.round(seconds * modifier.multiplier));
    return seconds;
}

export const BOARD_VISUALS = Object.freeze({
    background: '#f6f4ed',
    gradient: ['#faf8f1', '#f2f1e9'],
    ink: '#234d48',
    accent: '#c4683d',
    selected: '#a8512c',
    darkSelected: '#ffd49c',
    selectedEdge: '#fffdf4',
    darkBackground: '#142d2a',
    darkGradient: ['#183531', '#102824'],
    darkInk: '#e9efe2',
    arrowStrokeCss: 2.35,
    minimumStroke: 1.6,
    idealStrokeRatio: 0.12,
    maximumStrokeRatio: 0.16,
    headSizeCss: 8,
    headRatio: 0.34,
    headSpread: 0.5,
    bendRadiusCss: 4,
    bendRadiusRatio: 0.16,
    runeSizeCss: 11,
    runeSizeRatio: 0.48,
    runeStrokeCss: 1.3,
    selectedStrokeExtraCss: 0.3,
    boardSurfaceLight: ['#FAF9F2', '#FAF9F2'],
    boardSurfaceDark: ['#1C3732', '#1C3732'],
    boardPadding: 14,
});
