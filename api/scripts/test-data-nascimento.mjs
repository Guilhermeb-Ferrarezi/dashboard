// Testes do validador puro parseOptionalBirthDate.
// Importa direto do controller.ts (Bun roda TS) — sem instanciar Express/DB.
import { parseOptionalBirthDate } from "../src/controllers/corujao.controller.ts";

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (same) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.log(`  ❌ ${label}\n      esperado: ${JSON.stringify(expected)}\n      recebido: ${JSON.stringify(actual)}`);
    fail++;
  }
}

console.log("=== Valores 'vazios' (devem virar null) ===");
check("undefined", parseOptionalBirthDate(undefined), { ok: true, value: null });
check("null", parseOptionalBirthDate(null), { ok: true, value: null });
check("string vazia", parseOptionalBirthDate(""), { ok: true, value: null });

console.log("\n=== Formato válido (YYYY-MM-DD) ===");
check("1990-05-10 (válida, passado)", parseOptionalBirthDate("1990-05-10"), { ok: true, value: "1990-05-10" });
const hoje = new Date().toISOString().slice(0, 10);
check(`hoje (${hoje}) é aceito`, parseOptionalBirthDate(hoje), { ok: true, value: hoje });

console.log("\n=== Futuro (deve rejeitar) ===");
const amanha = new Date();
amanha.setDate(amanha.getDate() + 1);
const amanhaStr = amanha.toISOString().slice(0, 10);
check(`amanhã (${amanhaStr}) rejeitado`, parseOptionalBirthDate(amanhaStr), {
  ok: false,
  error: "Data de nascimento não pode ser no futuro."
});
check("3000-01-01 rejeitado", parseOptionalBirthDate("3000-01-01"), {
  ok: false,
  error: "Data de nascimento não pode ser no futuro."
});

console.log("\n=== Formato inválido ===");
check("'abcd' rejeitado", parseOptionalBirthDate("abcd"), {
  ok: false,
  error: "Data de nascimento inválida."
});
check("'10/05/1990' rejeitado (DD/MM/YYYY)", parseOptionalBirthDate("10/05/1990"), {
  ok: false,
  error: "Data de nascimento inválida."
});
check("'1990-13-01' rejeitado (mês inválido)", parseOptionalBirthDate("1990-13-01"), {
  ok: false,
  error: "Data de nascimento inválida."
});
check("número 123 rejeitado", parseOptionalBirthDate(123), {
  ok: false,
  error: "Data de nascimento inválida."
});

console.log(`\n${pass}/${pass + fail} checks passaram`);
process.exitCode = fail === 0 ? 0 : 1;
