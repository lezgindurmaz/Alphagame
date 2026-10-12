# InvisiblePlayerGame

`Alphagame` repository hosts **InvisiblePlayerGame**, a small 2D platform game implemented with HTML Canvas and JavaScript, with an Android shell powered by Capacitor.

## Project layout

- `www/` — game page, styles, and JavaScript gameplay code
- `android/` — Capacitor Android project
- App ID: `com.example.invisibleplayer`

The repository name (`Alphagame`) and the app’s displayed name (`InvisiblePlayerGame`) differ; this README documents the app currently present on `main`.

## Build the Android app

Requirements: Node.js 18 and JDK 17.

```bash
npm ci
npx cap sync android
cd android
./gradlew assembleDebug
```

The APK is produced under `android/app/build/outputs/apk/`. Published builds are listed on the [Releases page](https://github.com/lezgindurmaz/Alphagame/releases).
