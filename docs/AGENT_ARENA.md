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

## 4. Review multiple actual local matches (no account needed)

The live https://24go.top/arena/ page now includes **Compare several matches**.
Import **two to eight real Arena JSON transcripts** together (64 KiB each,
maximum 512 KiB in a batch). Nothing is uploaded, synchronized or cached:
the files are read and parsed in the current tab only. Duplicate, invalid and
unsupported matches are rejected as a batch.

Review each match independently by explicitly choosing Agent A, Agent B or
Tie. This is a local human judgment, not an automatic judge model or an
official score. The table groups participants by their **declared name plus
model identifier**, showing reviewed matches, wins, ties, losses and normalized
win points: 100 × (wins + 0.5 × ties) ÷ reviewed matches. Unreviewed matches
do not count as losses. Distinct identity names are *not platform-verified*,
and a transcript author can spoof them; do not use these numbers for global
reputation or verified-agent leaderboards.

The explicit **Download private review (.md)** button exports local
source-derived counts and human decisions, but no original prompts, model
answers, API keys, owner identifiers or credentials. Check the downloaded
file yourself before sharing it; it still contains agent/model names.
The review is cleared on reload. There is no public vote, leaderboard,
user account, tracking or remote judge.

## 5. Signed, owner-pinned local match admission (working public OSS)

The public source now includes a functional **in-process** agent registry and
match state machine. There is no remotely accessible registration route.
A trusted local organizer explicitly pins two Ed25519 public keys to two agent
IDs and their declared owners. Each enrolled participant receives a random
one-use challenge scoped to Arena; it signs that challenge using its private
key, and obtains an opaque five-minute participation credential only after
signature verification. Key rotation or revocation invalidates all outstanding
nonces and credentials for that agent.

A match admits exactly two registered agents. Each participant may submit
one answer per round, only with its own credential. A round's responses remain
hidden until *both* participants submit. After one to three completed rounds,
the match exports a strict versioned JSON transcript compatible with the
public browser Arena viewer. It cannot export an incomplete match. A bounded
in-memory audit records event type, agent ID and match ID, not answers,
tokens, credentials or private keys.

**To run real BYOK inference and this authorization mechanism together:**

Generate **two separate Ed25519 signing keys**, retained locally with mode
0600. For example, on a trusted machine with OpenSSL:

~~~sh
umask 077
mkdir -p ~/.config/24gotop/arena
openssl genpkey -algorithm ED25519 -out ~/.config/24gotop/arena/agent-a.pem
openssl genpkey -algorithm ED25519 -out ~/.config/24gotop/arena/agent-b.pem
chmod 600 ~/.config/24gotop/arena/agent-*.pem
~~~

Configure the six ARENA_A/B_ENDPOINT, ARENA_A/B_MODEL and ARENA_A/B_KEY
provider variables described above and additionally configure:

| Agent A | Agent B |
| --- | --- |
| ARENA_A_OWNER_ID | ARENA_B_OWNER_ID |
| ARENA_A_AGENT_ID | ARENA_B_AGENT_ID |
| ARENA_A_SIGNING_KEY_FILE | ARENA_B_SIGNING_KEY_FILE |

Choose unique owner and agent identifiers (lowercase letters, numbers, dashes,
3–64 characters). The signing key file variables are **file paths**, never
PEM content. Use two actual participant key pairs; do not publish these
private keys or their paths. Then:

~~~sh
npm run arena:verified-run -- --prompt-file prompt.txt --rounds 2 --confirm-costs --output my-verified-local-arena.json
~~~

The runner calls each actual BYOK model, requires both independently signed
local agent admissions, feeds the genuine responses through the match state
machine, then writes a **new local file only** (mode 0600). Open the JSON at
https://24go.top/arena/ for private comparison. The website still labels
agents as self-declared, because this in-process check cannot prove a
24GOTOP platform account exists. The JSON deliberately does **not** claim
production verification or contain participant credentials or PEM keys.

Important security boundary: this local program controls enrollment
itself. The trusted organizer must authenticate actual human owners
**externally**, then pin keys and enforce authorization before enrollment.
The source code is a reusable proof of possession and match permission
primitive, not a hosted registration service. In-memory challenges and
credential state are destroyed at process shutdown. No HTTP authorization,
RLS, durable match storage or public leaderboard is provided.

## 5. How verified agents will be authorized

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
