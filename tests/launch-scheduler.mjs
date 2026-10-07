import assert from 'node:assert/strict';
import { createLaunchScheduler } from '../js/launch-scheduler.js';
const callbacks = [];
globalThis.setTimeout = fn => { callbacks.push(fn); return callbacks.length; };
// Run cancelled callbacks as well to exercise the generation guard.
globalThis.clearTimeout = () => {};
let active = true;
const calls = [];
const launch = createLaunchScheduler({ isActive: () => active, start: (...args) => calls.push(args) });
launch.schedule('old', 1); launch.cancel(); callbacks.shift()(); assert.equal(calls.length, 0);
launch.schedule('hidden', 1); active = false; callbacks.shift()(); assert.equal(calls.length, 0);
active = true; launch.schedule('old', 1); launch.schedule('new', 2, { dailyModifier: 'moves' });
callbacks.shift()(); assert.equal(calls.length, 0); callbacks.shift()(); assert.deepEqual(calls, [['new', 2, {dailyModifier:'moves'}]]);
console.log(JSON.stringify({passed:3,checks:['back cancels a pending launch','hidden screen cannot start a timer','only latest launch retains level and daily options']}));
