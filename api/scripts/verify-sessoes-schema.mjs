import postgres from "postgres";
const sql = postgres(process.env.POSTGRES_URL, { max: 1 });
try {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'corujao_sessoes'
    ORDER BY ordinal_position
  `;
  console.log("=== corujao_sessoes ===");
  for (const c of cols) {
    const nul = c.is_nullable === "YES" ? "NULL" : "NOT NULL";
    const def = c.column_default ? ` DEFAULT ${c.column_default}` : "";
    console.log(`  ${c.column_name.padEnd(20)} ${c.data_type.padEnd(30)} ${nul}${def}`);
  }
} finally {
  await sql.end();
}
