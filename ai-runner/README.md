# AI runner

Runs prescreening analyses with your **Claude** and **ChatGPT** subscriptions
(Claude Code CLI and Codex CLI). No API keys and no per-token billing.

```
admin panel ──queue──▶ D1 ai_jobs ◀──poll (Bearer AI_RUNNER_TOKEN)── runner.mjs on this Mac
                                                                     ├─ claude -p  (no tools, no MCP, no settings)
                                                                     └─ codex exec (read-only sandbox)
```

The site builds the prompt when a runner claims a job. The model reply is stored
on the job. Nothing is applied automatically: you open **Rate with AI → Review result**
and save it yourself.

## Setup (once)

1. Log in to both CLIs:
   - Claude: `claude` and then `/login`. For a token that lasts about a year, run
     `claude setup-token` and put the value in `ai-runner/.env` as `CLAUDE_CODE_OAUTH_TOKEN`.
   - OpenAI: `npm i -g @openai/codex`, then `codex login` and pick "Sign in with ChatGPT".
     The refresh token in `~/.codex/auth.json` renews itself while the runner is in use.
2. `cp ai-runner/.env.example ai-runner/.env` and fill in `AI_RUNNER_TOKEN`. It must
   match the Worker secret set with `npx wrangler secret put AI_RUNNER_TOKEN`.
3. `./ai-runner/install.sh` installs a launchd agent. It starts at login and restarts if it crashes.

Test a single job: `ONCE=1 node ai-runner/runner.mjs`
Logs: `~/Library/Logs/cresiq-ai-runner.log`
Stop: `launchctl bootout gui/$(id -u)/com.cresiq.ai-runner`

## Safety

Applicant answers are untrusted text. Each CLI run happens in an empty temp
directory with no tools (Claude: `--tools ""`, `--strict-mcp-config`,
`--setting-sources ""`; Codex: `--sandbox read-only`, approvals off,
`--ephemeral`). A system note tells the model to ignore any instructions
inside the applicant's answers.
