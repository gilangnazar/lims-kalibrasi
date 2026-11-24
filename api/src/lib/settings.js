const db = require('../db');

/** Reads lab settings (key → string value). getSettings(['lab_name', 'ppn_rate']) → { lab_name, ppn_rate }. */
async function getSettings(keys, conn = db) {
  const rows = await conn('settings').whereIn('key', keys);
  return Object.fromEntries(keys.map((key) => [key, rows.find((row) => row.key === key)?.value ?? null]));
}

async function getSetting(key, conn = db) {
  return (await getSettings([key], conn))[key];
}

module.exports = { getSettings, getSetting };
