// Valida que o handler de erro do componente extrai mensagens reais do backend
// independente do tipo da classe lançada (instanceof falha em HMR do Vite).

function extractErrorMessage(error, fallback) {
  if (error && typeof error === "object" && "message" in error) {
    const msg = error.message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  return fallback;
}

// Replica o que parseApiResponse faz quando a resposta não é ok
async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload?.message || "Request failed.";
    class ApiError extends Error {
      constructor(m, s) { super(m); this.status = s; }
    }
    throw new ApiError(message, response.status);
  }
  return payload;
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

let pass = 0, fail = 0;
function check(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.log(`  ❌ ${label}\n      esperado: ${JSON.stringify(expected)}\n      recebido: ${JSON.stringify(actual)}`);
    fail++;
  }
}

console.log("=== Cenário 1: 409 do controller (telefone duplicado) ===");
try {
  await parseApiResponse(
    jsonResponse(409, {
      message: "Já existe um contato com esse telefone. Busque por ele na lista."
    })
  );
  check("deveria ter lançado erro", false, true);
} catch (err) {
  const msg = extractErrorMessage(err, "Erro ao salvar contato.");
  check(
    "mostra mensagem específica do backend",
    msg,
    "Já existe um contato com esse telefone. Busque por ele na lista."
  );
  check("NÃO usa o fallback genérico", msg === "Erro ao salvar contato.", false);
}

console.log("\n=== Cenário 2: 400 do controller (nome vazio) ===");
try {
  await parseApiResponse(jsonResponse(400, { message: "Nome é obrigatório." }));
} catch (err) {
  const msg = extractErrorMessage(err, "Erro ao salvar contato.");
  check("mostra mensagem específica do backend", msg, "Nome é obrigatório.");
}

console.log("\n=== Cenário 3: 400 com outro erro (origem inválida) ===");
try {
  await parseApiResponse(jsonResponse(400, { message: "Origem inválida." }));
} catch (err) {
  const msg = extractErrorMessage(err, "Erro ao salvar contato.");
  check("mostra mensagem específica do backend", msg, "Origem inválida.");
}

console.log("\n=== Cenário 4: 500 sem body (fallback do componente entra em ação) ===");
try {
  await parseApiResponse(new Response(null, { status: 500 }));
} catch (err) {
  const msg = extractErrorMessage(err, "Erro ao salvar contato.");
  // Sem body, parseApiResponse trata como string vazia "" e ApiError nasce com message="".
  // extractErrorMessage detecta message vazio → cai no fallback do componente.
  // Exatamente o comportamento pedido: "Só usa fallback se o backend não mandou mensagem."
  check("cai no fallback quando backend não manda nada", msg, "Erro ao salvar contato.");
}

console.log("\n=== Cenário 5: erro com message vazio (fallback do componente) ===");
const emptyMsgErr = new Error("");
const msg5 = extractErrorMessage(emptyMsgErr, "Fallback do componente");
check("usa o fallback quando message é vazio", msg5, "Fallback do componente");

console.log("\n=== Cenário 6: erro não-Error (string solta) ===");
const msg6 = extractErrorMessage("isso não é um Error", "Fallback do componente");
check("usa o fallback quando não há .message", msg6, "Fallback do componente");

console.log("\n=== Cenário 7: BUG ORIGINAL — Error de classe diferente (HMR) ===");
// Simula o caso onde instanceof ApiError retornaria false (classe carregada em módulo diferente)
class OutraClasseQueParece extends Error {
  constructor(m) { super(m); }
}
const errClasseDiferente = new OutraClasseQueParece(
  "Já existe um contato com esse telefone. Busque por ele na lista."
);
const msg7 = extractErrorMessage(errClasseDiferente, "Erro ao salvar contato.");
check(
  "mensagem do backend chega mesmo com classe 'errada'",
  msg7,
  "Já existe um contato com esse telefone. Busque por ele na lista."
);

console.log(`\n${pass}/${pass + fail} checks passaram`);
process.exitCode = fail === 0 ? 0 : 1;
