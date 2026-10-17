/*
# Lock referral reward function execution

## Summary
Removes the default public execution grant from the protected referral reward function while preserving access for signed-in members during registration.

## Security changes
- `claim_referral(text)` can no longer be called by anonymous users or the database-wide PUBLIC role.
- Authenticated members retain the only required execution permission.
- The function continues to derive the current member from `auth.uid()` and keeps its fixed 10-coin, single-use behavior.
*/

REVOKE EXECUTE ON FUNCTION public.claim_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;
