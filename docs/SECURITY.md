# Security — Hajj Management Platform (Pilot)

## Threat model

Attack surfaces in pilot scope:

1. **Public login endpoint** — brute-force password guessing, credential stuffing, timing-based user enumeration.
2. **Refresh-token flow** — stolen refresh tokens enabling prolonged access; token reuse post-compromise.
3. **Tenant boundary** — cross-agency data access via tampered requests; privilege escalation via role claim.
4. **Input surface** — mass assignment, over-posting (extra fields), validation bypass.
5. **Transport / logging** — secret exfiltration via logs, request tracing metadata.

## Controls matrix

| Threat                      | Control                                                                                                                                           | Implementation                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Brute-force login           | Per-IP rate limit 5/min on `/auth/login`, 10/min on `/auth/refresh`                                                                               | `@Throttle` + `@nest-lab/throttler-storage-redis`                                   |
| User enumeration via timing | Argon2id verify against a precomputed dummy hash when user not found                                                                              | [auth.service.ts:25-42](apps/api/src/modules/auth/auth.service.ts#L25-L42)          |
| Password storage            | Argon2id m=65536, t=3, p=1 (OWASP 2025 recommendation)                                                                                            | [argon.ts](apps/api/src/modules/auth/argon.ts)                                      |
| JWT forgery                 | HS256 signed with 256-bit secret from `JWT_ACCESS_SECRET`; separate secret for refresh                                                            | [token.service.ts](apps/api/src/modules/auth/token.service.ts)                      |
| Refresh token theft         | Short-lived access (15 min), rotating refresh (30 d) with reuse detection → family revocation                                                     | [token.service.ts:rotateRefreshToken](apps/api/src/modules/auth/token.service.ts)   |
| Replay after rotation       | Redis-tracked `currentJti` per family; any non-current jti → revoke family                                                                        | Reuse breadcrumb (`refresh:reuse:{jti}`) 5 min TTL                                  |
| Privileged-user bypass      | Fresh DB lookup on every authenticated request; status/agency check                                                                               | [jwt.strategy.ts](apps/api/src/modules/auth/strategies/jwt.strategy.ts)             |
| Tenant crossing             | `TenantGuard` rejects mismatched `:agencyId` param; super_admin bypass only                                                                       | [tenant.guard.ts](apps/api/src/common/guards/tenant.guard.ts)                       |
| Role escalation             | `RolesGuard` reads server-side `@Roles()` metadata, compares against fresh DB role                                                                | [roles.guard.ts](apps/api/src/common/guards/roles.guard.ts)                         |
| Mass assignment             | `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`                                                                                 | [main.ts](apps/api/src/main.ts)                                                     |
| PII / secret leakage        | Pino `redact` list includes password, passwordHash, accessToken, refreshToken, authorization header, set-cookie                                   | [app.module.ts](apps/api/src/app.module.ts)                                         |
| Malformed requests          | Global `HttpExceptionFilter` normalizes errors; stack traces only in dev                                                                          | [http-exception.filter.ts](apps/api/src/common/filters/http-exception.filter.ts)    |
| Request tracing             | `X-Request-Id` generated per request, propagated in logs + response header                                                                        | [request-id.middleware.ts](apps/api/src/common/middleware/request-id.middleware.ts) |
| Missing audit trail         | `AuthService` writes audit rows for login/refresh/logout; `AuditInterceptor` writes for every mutation (POST/PUT/PATCH/DELETE) on non-auth routes | [audit.interceptor.ts](apps/api/src/common/interceptors/audit.interceptor.ts)       |
| Default-allow               | Global `JwtAuthGuard` requires auth on every route; `@Public()` opts in individual routes                                                         | [app.module.ts](apps/api/src/app.module.ts)                                         |
| Proxy IP spoofing           | `FastifyAdapter({ trustProxy: true })` + `X-Forwarded-For` parsed by Fastify                                                                      | [main.ts](apps/api/src/main.ts)                                                     |

## Refresh-token rotation flow

```
login(email, pw)
  ├── validateUser → argon2.verify(pw, hashOrDummy)
  ├── familyId = randomUUID()
  ├── accessJti = randomUUID(), sign access JWT
  ├── refreshJti = randomUUID(), sign refresh JWT
  ├── redis.set refresh:jti:{refreshJti}     → familyId (TTL 30d)
  ├── redis.hset refresh:family:{familyId}   → {currentJti, userId, issuedAt}
  └── return { accessToken, refreshToken, user }

refresh(oldRefreshToken)
  ├── verify signature + expiry
  ├── familyId = redis.get(refresh:jti:{oldJti})
  │     ├── null? reuse breadcrumb lookup → if found, revoke family → 401
  │     └── mismatch? → revoke BOTH families → 401
  ├── currentJti = redis.hget(refresh:family:{familyId}, 'currentJti')
  │     └── ≠ oldJti → revoke family → 401  (someone replayed a non-current token)
  ├── newJti = randomUUID()
  ├── multi: DEL oldJti; SET reuse breadcrumb (5 min); SET newJti; HSET family.currentJti = newJti
  └── return { accessToken, refreshToken }

logout(refreshToken)
  ├── verify → extract familyId
  ├── redis.del refresh:family:{familyId}  (which cascades to current jti)
  └── audit 'logout'
```

**Reuse detection** is strict: any refresh token whose jti is not the family's `currentJti` → full family revocation. Stolen refresh tokens can be used at most _once_ before the original holder's next refresh locks everyone out.

## Secret management

- Local dev: `apps/api/.env` (gitignored). Secrets generated with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- CI / test: `apps/api/.env.example` holds `REPLACE_BEFORE_PRODUCTION` placeholders; runtime validation (`env.validation.ts`) refuses to boot with the placeholder values (length check would pass but operational hygiene requires replacement).
- Prod: platform secret store (Fly.io / Render secrets). Never commit. Validate at boot via the same zod schema.

## Upgrade path — HS256 → RS256

HS256 is acceptable for the single-service pilot (no downstream validators). For a multi-service future, switch to RS256:

1. Generate an RSA-2048 keypair: `openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem`.
2. Replace `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` env vars with `JWT_ACCESS_PRIVATE_KEY` (signing) and `JWT_ACCESS_PUBLIC_KEY` (verification). Refresh uses a separate keypair.
3. `JwtService.sign({ ... }, { algorithm: 'RS256', privateKey: ... })`; `jwt.strategy.ts` uses `secretOrKeyProvider` to rotate public keys.
4. Expose `/api/v1/.well-known/jwks.json` for downstream services. Stand up a key-rotation runbook: overlap both keys during rotation, revoke old after 2× access-token TTL.

## Secret rotation runbook

1. Generate a new secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
2. Update the secret in the platform secret store — DO NOT remove the old one yet.
3. Deploy a release that verifies tokens against BOTH secrets (code change needed — not in pilot scope).
4. Wait for 2× access-token TTL (30 min) — all tokens signed with the old secret have expired.
5. Remove the old secret.
6. For refresh-token rotation, because refresh TTL is 30 days, plan for a rolling rotation over 30+ days OR accept that active users will be logged out when the old secret is retired.

## Known gaps (deferred)

- **No refresh-token durable store**: Redis is source of truth. If Redis loses data, all active sessions are invalidated. Acceptable for pilot; post-pilot, mirror families to a `refresh_token_families` Postgres table.
- **No 2FA/MFA**: deferred.
- **No device fingerprinting**: refresh tokens are bearer-only; a stolen refresh token works from any device until reuse detection triggers.
- **No password-reset flow**: admins reset manually via DB for the pilot.
- **No account lockout after N failures**: rate limiter mitigates but doesn't lock; consider a counter in Redis + temporary block per-user after 10+ failures in 15 min.
- **No CSRF protection on cookie-auth**: not applicable — we use bearer tokens, not cookies. If cookie auth is added, enable SameSite=Strict + CSRF double-submit token.

## Incident response

If a JWT secret is suspected compromised:

1. Rotate the secret in the platform secret store (see runbook above).
2. `await tokenService.revokeAllUserTokens(userId)` via an admin endpoint (TODO) or direct Redis: `redis-cli --scan --pattern 'refresh:family:*' | xargs redis-cli DEL`.
3. Force a password reset on affected accounts.
4. Review `audit_logs` for suspicious activity: `SELECT * FROM audit_logs WHERE action IN ('login', 'refresh') AND created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC;`.
5. Check Pino logs for `refresh token reuse detected` warnings.
