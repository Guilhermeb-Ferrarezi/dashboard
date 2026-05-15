# Codex OpenAPI Strict Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o agente usar endpoints internos documentados no OpenAPI como unico caminho permitido para consultas e acoes de negocio.

**Architecture:** O runtime `execute_internal_api` passa a validar o path contra `api/codex/openapi.yaml` antes de qualquer fetch. O contrato OpenAPI e ampliado com rotas VCT de leitura e o prompt/instrucoes do agente passam a proibir shell ou banco como fonte primaria de dado de negocio.

**Tech Stack:** Bun, TypeScript, Express, OpenAPI YAML

---

### Task 1: Travar o runtime por contrato OpenAPI

**Files:**
- Modify: `api/src/lib/codex-tool-runtime.test.ts`
- Modify: `api/src/lib/codex-tool-runtime.ts`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run the focused runtime tests and verify the new case fails for the right reason**
- [ ] **Step 3: Implement OpenAPI path extraction and path eligibility checks in `execute_internal_api`**
- [ ] **Step 4: Re-run the focused runtime tests and verify they pass**

### Task 2: Formalizar rotas VCT de leitura no OpenAPI

**Files:**
- Modify: `api/codex/openapi.yaml`

- [ ] **Step 1: Add shared schemas for `modalidade`, inscricoes, times e formacoes**
- [ ] **Step 2: Add `GET /vct/inscricoes`, `GET /vct/times` e `GET /vct/formacoes`**
- [ ] **Step 3: Verify the YAML stays readable and matches controller payloads**

### Task 3: Endurecer as instrucoes do agente

**Files:**
- Modify: `api/src/lib/codex-agent-runtime.ts`
- Modify: `api/codex/AGENTS.md`
- Modify: `api/codex/AGENTS.override.md`
- Modify: `api/src/lib/codex-sources.ts`

- [ ] **Step 1: Add strict business-read rules to the operational prompt**
- [ ] **Step 2: Add the same rule to the injected AGENTS files**
- [ ] **Step 3: Align source/routing text so OpenAPI+internal API become the primary path for business state**

### Task 4: Verify end-to-end behavior

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README with the new strict-mode rule**
- [ ] **Step 2: Run focused backend tests**
- [ ] **Step 3: Run frontend build**
- [ ] **Step 4: Review the diff and confirm the runtime now blocks undocumented internal endpoints**
