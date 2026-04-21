# API examples — Hajj Management Platform

All requests assume the API is running at `http://localhost:4000/api/v1`. Start it with:

```bash
cd apps/api && pnpm dev
```

Seeded users (from `pnpm db:seed`):

| Role         | Email                   | Password    |
| ------------ | ----------------------- | ----------- |
| super_admin  | admin@hajj-platform.com | Admin@123   |
| agency_admin | admin@mubarak.com       | Mubarak@123 |
| operator     | staff1@mubarak.com      | Staff@123   |
| operator     | staff2@mubarak.com      | Staff@123   |
| operator     | staff3@mubarak.com      | Staff@123   |

## Health

```bash
curl http://localhost:4000/api/v1/health
# -> { "status":"ok", "db":"up", "redis":"up", "uptime":…, "version":"0.1.0", "timestamp":… }
# Response header: X-Request-Id
```

## Login (agency_admin)

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mubarak.com","password":"Mubarak@123"}'
```

Response:

```json
{
  "accessToken": "eyJ…",
  "refreshToken": "eyJ…",
  "user": {
    "id": "9e6a6169-528f-41f7-968a-1b55ee08dc8c",
    "email": "admin@mubarak.com",
    "fullName": "Ghouse Mubarak",
    "role": "agency_admin",
    "agencyId": "6f62cdcd-81e1-4ae2-b000-de31079d3471"
  }
}
```

Email matching is case-insensitive (`Admin@Mubarak.COM` works identically).

## /auth/me (requires bearer)

```bash
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
# -> { id, email, fullName, role, agencyId }
```

## Refresh token rotation

```bash
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
# -> { accessToken, refreshToken }
```

**Reuse detection**: replaying the same `refreshToken` twice → 401 Unauthorized, and **the entire token family is revoked**. This means the token you received from the first refresh is also invalidated. Design intent: if both the attacker and the legit user hold a copy, neither can proceed — forcing an audited re-login.

## Logout

```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
# -> 204 No Content
```

Subsequent use of the same refresh token → 401.

## Error shape

Every error response follows this shape:

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid credentials",
  "timestamp": "2026-04-21T19:45:01.666Z",
  "path": "/api/v1/auth/login",
  "requestId": "beeb073a-6c3c-45a5-afd2-b1cff2febc7b"
}
```

Development builds include a `stack` field; production does not.

## Rate limits (per-IP)

| Route              | Limit       | Window |
| ------------------ | ----------- | ------ |
| global             | 100         | 1 min  |
| POST /auth/login   | 5           | 1 min  |
| POST /auth/refresh | 10          | 1 min  |
| /health            | unthrottled | —      |

Exceeding → 429 with `Retry-After` header.

## Validation failures (400)

```bash
# Bad email format
curl -X POST http://localhost:4000/api/v1/auth/login \
  -d '{"email":"not-an-email","password":"Mubarak@123"}'
# -> 400 { message: ["email must be an email"] }

# Extra field — forbidNonWhitelisted
curl -X POST http://localhost:4000/api/v1/auth/login \
  -d '{"email":"admin@mubarak.com","password":"Mubarak@123","admin":true}'
# -> 400 { message: ["property admin should not exist"] }
```

## Full 17-test verification script

Run this block with the API up:

```bash
BASE=http://localhost:4000/api/v1

# 1-2. Boot + health
curl -s $BASE/health

# 3. Login success
LOGIN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@mubarak.com","password":"Mubarak@123"}')
ACCESS=$(echo "$LOGIN" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).accessToken))")
REFRESH=$(echo "$LOGIN" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).refreshToken))")

# 4. Case-insensitive email
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"Admin@Mubarak.COM","password":"Mubarak@123"}'

# 5. Wrong password
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@mubarak.com","password":"wrongpass"}'

# 6. Non-existent email (should be timing-equivalent to #5)
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"nobody@example.com","password":"whatever"}'

# 7. Invalid email format
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"not-an-email","password":"Mubarak@123"}'

# 8. Extra field
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@mubarak.com","password":"Mubarak@123","admin":true}'

# 9. Rate limit — fire 6 losses
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "attempt $i -> %{http_code}\n" -X POST $BASE/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@mubarak.com","password":"wrongpass"}'
done
# (run `docker exec hajj-redis redis-cli FLUSHDB` to reset between runs)

# 10. /me without token
curl -s $BASE/auth/me

# 11. /me with token
curl -s $BASE/auth/me -H "Authorization: Bearer $ACCESS"

# 12. Refresh rotation + reuse detection
curl -s -X POST $BASE/auth/refresh -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}"
# Replay — must be 401 + family revoked
curl -s -X POST $BASE/auth/refresh -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}"

# 13. Logout
curl -s -X POST $BASE/auth/logout -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}"

# 14. Audit log
docker exec hajj-postgres psql -U hajj -d hajj_dev -c \
  "SELECT action, entity_type, user_id FROM audit_logs WHERE action IN ('login','logout','refresh') ORDER BY created_at DESC LIMIT 5;"

# 15. Tests
pnpm --filter api test

# 16. Typecheck
pnpm typecheck

# 17. Graceful shutdown — Ctrl+C in dev server terminal
```
