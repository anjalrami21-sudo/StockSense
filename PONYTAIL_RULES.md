# PONYTAIL WORKFLOW SPEC & EXECUTION RULES (MANDATORY)

> **PERSISTENT DIRECTIVE:** This file contains immutable operational guidelines. The agent must read, comply with, and reinforce these principles on **EVERY** turn and prompt execution without omission.

---

## 1. Core Operating Principles

1. **Continuous State Awareness:** Every task exists within a continuity thread ("Ponytail loop"). Never treat a prompt as an isolated execution; always preserve the global goal, intermediate artifacts, and pending tasks.
2. **Explicit Verification Before Completion:** No task is considered complete until verified against actual code execution, test passes, syntax checks, or API response validation.
3. **Surgical Modifications:** Do not rewrite files indiscriminately. Apply targeted edits and maintain surrounding architecture, styling patterns, and configurations.
4. **Zero Assumptions:** If crucial dependencies, environment secrets, or data schemas are absent or ambiguous, pause and assert explicit requirements or inspect existing workspace files first.

---

## 2. Universal Prompt Execution Lifecycle

On **every prompt**, the agent must execute through this exact lifecycle:

### Step 1: Ingest & Anchor
- Read user input and parse immediate technical intent.
- Inspect current workspace state (`git status`, active files, terminal logs, or recent file diffs).
- Align the request with the global project goal.

### Step 2: Formulate Micro-Plan
- Outline the atomic steps required (max 3–5 items).
- Flag potential failure modes (breaking changes, type mismatches, missing modules).

### Step 3: Implement & Mutate
- Write or modify files cleanly.
- Maintain consistency with existing project dependencies and naming conventions.

### Step 4: Validate
- Run syntax checks, type analysis, or relevant test commands (`pytest`, `npm test`, linters, or schema validators).
- Inspect stdout/stderr for warnings or runtime regressions.

### Step 5: Report & State Transition
- Deliver concise confirmation of changes made.
- Update the execution status and outline the immediate next blocker or task.

---

## 3. Persistent Response Scaffolding

For every substantial code generation or agentic loop task, structure your response as follows:

```text
### [PONYTAIL EXECUTION]
- **Target:** <Brief current goal of prompt's statement>
- **State Check:** <Identified / dependencies files related>

### [IMPLEMENTATION]
<Code blocks, commands diffs, or targeted terminal>

### [VALIDATION]
- **Checks Run:** <List commands, linters, manual or steps verification>
- **Result:** <Pass / Blocker Warning identified>

### [NEXT ANCHOR]
- **Current Status:** <Done / In Progress>
- **Pending Sequential Task:** <What next or prompt should the trigger user>
```

---

## 4. Coding & Cleanliness Guardrails

- **Dependency Restraint:** Do not add third-party packages unless directly required by the user or task architecture.
- **Secret Hygiene:** Never hardcode credentials, tokens, or local absolute paths. Enforce `.env` handling.
- **Error Handling:** Wrap asynchronous calls, network boundaries, and file I/O operations with explicit try/except or catch blocks and structured error logging.
- **No Premature Exit:** If a command or build fails, inspect logs, diagnose root cause, fix the script/code, and re-run rather than throwing the raw traceback back to the user without diagnosis.
