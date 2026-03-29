/**
 * After mocha.setup('bdd'), Mocha attaches BDD helpers to the global object.
 * ES module code does not resolve those as free identifiers; import them here.
 */
const g = globalThis;
export const describe = g.describe;
export const it = g.it;
export const before = g.before;
export const after = g.after;
export const beforeEach = g.beforeEach;
export const afterEach = g.afterEach;
