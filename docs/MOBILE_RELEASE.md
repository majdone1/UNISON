# Mobile Release

Expo app in `apps/mobile`.

## Dev
```bash
pnpm --filter @unison/mobile start
# EXPO_PUBLIC_API_URL=http://127.0.0.1:43127
```

## Release (BLOCKED_EXTERNAL)
Requires Apple Developer + Google Play credentials, EAS project, push keys.
```bash
eas build --platform all
eas submit
```
Deep link scheme: `unison://`
