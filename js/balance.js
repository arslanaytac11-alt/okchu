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
    selectedEdge: '#fffdf4',
    darkBackground: '#142d2a',
    darkGradient: ['#183531', '#102824'],
    darkInk: '#e9efe2',
    minimumStroke: 3.5,
    idealStrokeRatio: 0.11,
    maximumStrokeRatio: 0.24,
    headRatio: 0.32,
    boardPadding: 14,
});
