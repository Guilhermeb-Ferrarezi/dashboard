import postgres from "postgres";
const sql = postgres(process.env.POSTGRES_URL, { max: 1 });
try {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'corujao_contatos'
    ORDER BY ordinal_position
  `;
  for (const c of cols) {
    const nul = c.is_nullable === "YES" ? "NULL" : "NOT NULL";
    console.log(`  ${c.column_name.padEnd(20)} ${c.data_type.padEnd(30)} ${nul}`);
  }
} finally {
  await sql.end();
}
