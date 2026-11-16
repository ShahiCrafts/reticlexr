import { defineConfig } from 'vitest/config';

// TEST-01: the Phase 1–6 stub harnesses under tests/harness/ ARE the
// test suite. They keep their original filenames (the GitHub
// connector used to push this branch cannot delete or rename files),
// so the include pattern targets that directory directly. Each file
// is one test whose body is the original harness, with its local
// check(name, cond) helper backed by expect() — no assertion was
// rewritten in the conversion.
export default defineConfig({
  test: {
    include: ['tests/harness/*.mjs'],
    environment: 'node',
    testTimeout: 30000,
  },
});
