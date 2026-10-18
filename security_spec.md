# Security Specification: Family Household Budget

## 1. Data Invariants
1. **Household Isolation**: No user can read, list, create, update, or delete transactions, categories, or members of a household without being a verified member in `/households/{householdId}/members/{request.auth.uid}`.
2. **Zero Public Access**: Households cannot be queried as a blanket list (`allow list: if false;`). Access to a household document is strictly via direct `get()` by verified members.
3. **Invitation Hardening**:
   - Invitations are keyed by unique, unguessable codes.
   - Non-members cannot list all invitations.
   - Any authenticated user can read an invitation by code to inspect household name and validity.
   - Only household members can create invitations for their household.
   - When claiming an invitation, only updating `isUsed` from `false` to `true` (along with `usedBy` and `usedAt`) is permitted.
4. **Member Self-Management & Owner Revocation**:
   - A member can leave a household (delete own member document).
   - The household owner can manage and revoke other members.
   - Only the household owner can delete the household itself.
5. **Transaction Integrity**:
   - Every transaction write verifies `createdBy == request.auth.uid` on creation.
   - Transactions are strictly bounded to positive amounts and allowed schema keys.
   - Author's identity (`authorName`, `createdBy`) is preserved.

## 2. The Dirty Dozen Payloads & Defenses
- Attempting to list all households without membership -> Denied (`allow list: if false;`).
- Attempting to add a transaction to someone else's household -> Denied (`isHouseholdMember` required).
- Attempting to forge `createdBy` as another user -> Denied.
- Attempting to reuse an already used invitation -> Denied (`existing().isUsed == false`).
- Member attempting to delete the entire household -> Denied (`isHouseholdOwner` required).
