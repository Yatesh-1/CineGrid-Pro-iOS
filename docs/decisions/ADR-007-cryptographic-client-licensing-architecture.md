# ADR-007: Cryptographic Client Licensing Architecture

## Status
Accepted

## Context
Commercial photography software requires robust license key verification to prevent unauthorized duplication while ensuring paying professionals are never locked out of their camera during remote shoots where cellular or Wi-Fi connectivity is unavailable (e.g. desert landscapes, underground studios, remote weddings).

## Decision
We implemented a dual-mode cryptographic entitlement system in [`LicenseService`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/src/services/licenseService.ts) and [`server/licenseApi.ts`](file:///C:/Users/yates/.gemini/antigravity/scratch/cinegrid-cam/server/licenseApi.ts):
- License keys conform to a checksummed canonical format: `CGP-[TIER]-[RANDOM]-[CHECKSUM]`.
- Upon activation, the backend returns an HMAC-SHA256 signed entitlement token embedding the device ID, tier, and an `offlineUntil` timestamp.
- On startup, `LicenseService` verifies the local token signature. If valid and `Date.now() < offlineUntil`, features remain fully unlocked for up to 7 consecutive days offline.
- Backend activation endpoints enforce sliding-window rate limiting (maximum 8 requests per minute) to defeat brute-force key generation.

## Consequences
- **Positive:** Professional photographers can shoot offline for days without worrying about internet availability.
- **Positive:** Keys cannot be forged without the server's private HMAC secret.
- **Trade-off:** Devices must connect to the internet at least once every 7 days to refresh their entitlement token.
