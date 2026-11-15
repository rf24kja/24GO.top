# Agent Arena — working LOCAL evaluation, not hosted multiplayer

**Status:** Node 22+ open-source, two real OpenAI-compatible chat-completions API providers, BYOK only. The publicly reachable [Arena viewer](https://24go.top/arena/) loads a result JSON from your device and compares real model responses. There is **no** hosted agent registry, login, public matches, reputation or remote debates. AI agents do not automatically enter human discussions.

## 1. Prepare your providers (never commit secrets)

Clone the public repo and set these environment variables in your own local terminal:

| Agent A | Agent B |
| --- | --- |
| ARENA_A_ENDPOINT | ARENA_B_ENDPOINT |
| ARENA_A_MODEL | ARENA_B_MODEL |
| ARENA_A_KEY | ARENA_B_KEY |
| ARENA_A_NAME (optional) | ARENA_B_NAME (optional) |

Choose two actual provider endpoints implementing the standard OpenAI-compatible chat-completions API (the actual HTTPS chat-completions URL, not a base URL), model identifiers and keys from your provider account. Provider model pricing, data retention and residency are **your choice**, not assumed by 24GOTOP. The runner never installs provider SDKs or defaults to a paid API; local keys are read from environment only.

HTTPS is required except for explicit 127.0.0.1, localhost or [::1] loopback HTTP endpoints. Endpoint URLs with credentials, query strings, fragments and path traversal are rejected. Never put credentials in Git, website fields, the transcript, command arguments, issues or logs. Only use nonconfidential prompts: providers receive the prompt and relevant previous-round responses.

## 2. Run a real head-to-head evaluation

Write a local prompt.txt (5–2000 UTF-8 characters). After configuring both model environments:

~~~sh
npm run arena:run -- --prompt-file prompt.txt --rounds 2 --confirm-costs --output arena-session.json
~~~

- Round one calls **both models independently with exactly the same task**. Later rounds provide both with the previous round’s answers for corrections or rebuttal. Neither gets an unfair look at a rival's same-round output.
- Maximum three rounds / six model calls; max_tokens 400 per model call; 20-second request timeout; accepted answer limit 4,000 characters; provider JSON reply limit 128 KiB.
- Explicit --confirm-costs is mandatory. These are **usage bounds, not a hard monetary budget** because different providers have different pricing and input-token counts; make sure you understand the actual billing before running it.
- Optional --output creates a **new** local file only, mode 0600, never overwrites an existing transcript. Without it the JSON goes to stdout.
- Local JSON contains original prompt, declared model names, responses, elapsed times and source label local-byok. It includes **no provider endpoint or credential**, and makes no claims of identity verification.

## 3. Review answers in the browser

Open https://24go.top/arena/ and choose your arena-session.json.

The browser validates a strict <=64 KiB versioned contract, renders both answers side-by-side using safe text nodes, shows response times and per-round outputs, and lets you select Agent A, Agent B or Tie as a **private temporary preference**. It makes no outgoing upload or AI call and does not use browser storage. Nothing becomes a hosted match, reputation or public score. There are no fabricated sample agent matches.

## 4. How verified agents will be authorized

The public reference module packages/arena/agent-proof.mjs implements **Ed25519 key-possession proof**, not platform registration:

1. A trusted **server** binds an authorized account-owned agent ID to a pinned public key. Never trust a self-declared ID/public key pairing from an unverified request.
2. The server issues a random 24-byte nonce for scope arena:participate (60-second lifetime), stores it in its own pending-challenge map, and returns it to that agent.
3. The client signs the canonical challenge with its local Ed25519 private key.
4. The verifier uses only its trusted key registry to validate ID, audience, nonce, issue/expiry times and signature, then **consumes the nonce** on success. Reuse and forged keys fail.

**Still required in the PRIVATE hosted core:** human-owner registration, session/JWT verification, audited key registration/rotation, short-lived capability tokens, per-tenant RLS, moderated Arena memberships, rate limits and anti-spam, protected data and transaction boundaries. This public cryptographic primitive does NOT prove an account is registered or authorize hosting; the current duel runner does not consume the proof.

## 5. Checks and limitations

~~~sh
npm run check
npm test
npm run arena:run -- --prompt-file prompt.txt --confirm-costs --output arena-session.json
~~~

Tests include both provider calls, prompt parity, strict URL and import limits, refusal of oversized replies, malformed results, no key leaks, Ed25519 impersonation/expiry/replay cases, and safe browser UI sources. All content is untrusted input. Hosted authenticated agent participation remains unreleased; no private backend, credential, production authority or database is provided in public OSS.
