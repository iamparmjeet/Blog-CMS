---
description: Run the four delivery gates in order
---

Run these in order, stop on first failure:

```bash
bun run test
bunx tsc --noEmit
bun run check
bun run build
```

Report which gate failed with the shortest relevant log excerpt. Do not fix unrelated red checks — note them and continue only if the current ticket's gate is green.
