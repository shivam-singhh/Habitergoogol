

## Investigation Results

I tested the Google OAuth flow end-to-end with the browser tool and analyzed all logs, network requests, and session replay data. Here is the complete diagnosis.

---

### What's Actually Happening

The auth flow has two phases, and **Phase 1 works, Phase 2 fails**:

```text
Phase 1 (works):
  Click Google → redirect to Google → Google redirects to oauth.lovable.app
  → oauth.lovable.app exchanges code for tokens → POST /token returns 200 ✓

Phase 2 (fails):
  Tokens arrive at client → supabase.auth.setSession(tokens)
  → internally calls GET /auth/v1/user to validate session
  → "Failed to fetch" error ✗
  → session never established → user stuck on /auth
```

The auth logs confirm successful logins (status 200 on `/token`), but the console shows `GET /auth/v1/user` failing with "Failed to fetch" every time. This is an internal call made by the Supabase JS client during `setSession` -- we cannot control or retry it directly.

### Why the Current Fix Isn't Enough

The single 500ms retry added previously is insufficient because:
1. It only retries `getSession()` once -- if the `/auth/v1/user` endpoint is still unreachable at 500ms, the retry also fails
2. It doesn't handle the case where the lovable auth library's `setSession` call fails and tokens are lost
3. The "Failed to fetch" errors happen 20+ seconds after the OAuth redirect, suggesting persistent network issues rather than a brief race condition

### Database Trigger Status

The migration to re-create `on_auth_user_created` was applied, but the database reports **no triggers exist**. The trigger may have been dropped by a conflicting migration. This needs to be re-verified and fixed.

---

### Fix Plan

**1. AuthContext.tsx -- Aggressive session recovery with exponential backoff**

Replace the single 500ms retry with multiple attempts (500ms, 1500ms, 3500ms). Each attempt calls `getSession()` again, giving the Supabase client more chances to complete the `/auth/v1/user` validation after network recovery.

**2. AuthContext.tsx -- Direct token recovery from localStorage**

After all `getSession()` retries fail, check localStorage for stored Supabase tokens (`sb-*-auth-token`). If tokens exist but session is null, call `supabase.auth.setSession()` directly with those tokens as a last-resort recovery.

**3. AuthContext.tsx -- Add a failsafe loading timeout**

Add an 8-second timeout that forces `loading` to `false` even if session recovery hasn't completed. This prevents the infinite spinner/redirect loop -- the user will at least see the auth page and can retry manually.

**4. Re-verify the database trigger**

Check if `on_auth_user_created` trigger actually exists and re-create it if missing.

### Technical Detail

```text
Current recovery (insufficient):
  getSession() → null
  wait 500ms → getSession() → null (still failing)
  → user stuck on /auth forever

Fixed recovery:
  getSession() → null
  wait 500ms → getSession() → null
  wait 1500ms → getSession() → null  
  wait 3500ms → getSession() → null
  → check localStorage for tokens → try setSession()
  → 8-second failsafe: force loading=false regardless
  → user sees /auth page and can retry
```

### Files to change
- `src/contexts/AuthContext.tsx` -- multi-retry recovery, localStorage fallback, failsafe timeout

