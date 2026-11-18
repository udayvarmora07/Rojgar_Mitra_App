# Rojgar Mitra — agent instructions

Gujarat government-jobs app for farmers and rural youth with low technical literacy.
Expo SDK 54 + React Native 0.81 + NativeWind 4 + expo-router 6, Supabase (Postgres), Python scraper.
Read `PRD.md` for requirements, `PRODUCT.md` for brand direction, `HANDOFF.md` for current state.

## Standing directives from the project owner

### Use every tool that helps

- **Use any skill, custom agent, and MCP server available.** They are installed for a reason;
  activate the relevant ones instead of working from memory.
- **Install new skills and MCP servers when needed.** Do not settle for a weaker workflow
  because a tool is missing.
- **Use any CLI, tool, or software already present on this machine.** Check first —
  `agent-browser`, Docker, `gh`, `opencli`, `npx supabase`, Playwright, Python venvs.
- **Install new CLIs, tools, and open-source projects when needed.**

### Research before building

- **Assume a solution already exists.** Every problem in this domain has prior art — a mature
  GitHub open-source project, a CLI, a skill, an MCP server, a library, or a documented pattern.
  Before writing anything non-trivial, search for it, study how it solves the problem, and use
  or adapt it. Re-inventing something that already exists is a defect, not a style choice.
- **Always research first.** Gather proper knowledge and real data about the problem before
  writing code. Do not guess at an API, a library's behaviour, or a page's structure.
- **Mine GitHub open-source projects.** For any task there are mature projects in that
  category — go through the relevant ones, learn from how they solved it, and use them
  directly where possible.
- **Work from live evidence.** Prefer actual command output, real HTTP responses, and test
  results over assumptions or earlier conversation.
- The owner has **complete admin access**: install and set up whatever the project needs.

### Quality bar

- **No AI-slop UI.** Every visual choice must be deliberate and explainable. Research real
  references before redesigning.
- Gates must stay green on every change: `npm run typecheck`, `npm run lint`,
  `NODE_ENV=test npx jest`, `bash scripts/e2e-web.sh`.
- **Never print or commit secrets.** Provider keys live in Supabase secrets, never behind an
  `EXPO_PUBLIC_` prefix. Do not commit or push without approval.
- Accessibility target: 0 critical and 0 serious axe findings on all four tabs; body text
  >= 18sp; touch targets >= 48dp; high contrast.
