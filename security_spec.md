# Security Specification & Invariants

## 1. Data Invariants
- A daily study tracking record (`/users/{userId}/days/{dateId}`) can only be created, read, updated, or deleted by the authenticated user whose `request.auth.uid` matches `{userId}`.
- Cross-user data leaks are strictly prevented. Users cannot view or tamper with any other user's study records, timetable, or profile.
- The document ID `{dateId}` must match the `YYYY-MM-DD` ISO date pattern `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`.
- The `userId` field inside the document must be immutable and must strictly match `request.auth.uid`.
- Document creations must record valid timestamps, and updates cannot alter `createdAt` or `userId`.

## 2. Dirty Dozen Payload Scenarios (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read**: Anonymous/unauthenticated request attempting to read `/users/user123/days/2026-11-06`. -> REJECT
2. **Cross-User Read**: User `alice` attempting to read `/users/bob/days/2026-11-06`. -> REJECT
3. **Cross-User Write**: User `alice` attempting to create `/users/bob/days/2026-11-06`. -> REJECT
4. **UID Spoofing**: User `alice` attempting to write `/users/alice/days/2026-11-06` with payload `{ userId: "bob" }`. -> REJECT
5. **ID Poisoning**: User `alice` creating document with oversized/invalid date ID like `/users/alice/days/invalid-date-format-overflow-payload`. -> REJECT
6. **Immutable Field Mutate**: User `alice` updating an existing day record attempting to modify `userId`. -> REJECT
7. **Created Timestamp Tampering**: User `alice` updating an existing day record attempting to rewrite `createdAt`. -> REJECT
8. **Root Collection Poisoning**: Attempting to create documents in arbitrary collections like `/admin_secrets/leak`. -> REJECT
9. **Unbounded String Flooding**: Attempting to write notes with length > 100,000 characters to crash clients or trigger denial of wallet. -> REJECT
10. **Profile Impersonation**: User `alice` writing to `/users/bob/settings/profile`. -> REJECT
11. **Negative Completion Percentage**: Payload sending negative completion percentage or extreme invalid types. -> REJECT
12. **Settings Mutate by Third Party**: Any unauthenticated client reading `/users/alice/settings/profile`. -> REJECT
