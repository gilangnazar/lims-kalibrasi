const syncMenus = require('../src/lib/syncMenus');

// Menu registry → `menus` table, and every action for the Admin role. Also runs on API start.
exports.seed = (knex) => syncMenus(knex);
