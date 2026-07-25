// A fake `pg` that records every statement instead of talking to Postgres.
//
// The point is not to simulate a database. It is to let a test assert on the SQL the app actually
// builds and the parameters it actually binds, which for the claim-token fix is the security
// property itself: the secret has to appear in the WHERE clause.

export const CALLS = [];
let RESPONSES = [];

/** Queue the rows each successive query() should return. */
export function __setResponses(list) {
  RESPONSES = [...list];
}
export function __reset() {
  CALLS.length = 0;
  RESPONSES = [];
}

function nextResponse(sql) {
  if (RESPONSES.length) {
    const r = RESPONSES.shift();
    return typeof r === 'function' ? r(sql) : r;
  }
  return { rows: [], rowCount: 0 };
}

async function query(sql, params) {
  const text = typeof sql === 'string' ? sql : sql?.text;
  CALLS.push({ sql: text, params: params ?? [] });
  return nextResponse(text);
}

export class Pool {
  constructor(config) {
    this.config = config;
  }
  async query(sql, params) {
    return query(sql, params);
  }
  async connect() {
    return { query, release() {} };
  }
  async end() {}
}

const pg = { Pool };
export default pg;
