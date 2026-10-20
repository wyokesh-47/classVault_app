# ClassVault - Starter App (Tanglish guide)

Indha folder-la ClassVault mobile app-oda first UI prototype irukku.

## Run panna steps

1. ZIP extract pannunga.
2. VS Code-la `ClassVault_Expo_Starter` folder open pannunga.
3. VS Code Terminal open pannunga (`Terminal > New Terminal`).
4. Indha command run pannunga:

   ```bash
   npm install
   ```

5. Install mudinja apram:

   ```bash
   npx expo start
   ```

6. Android phone-la Play Store-lirundhu **Expo Go** install pannunga.
7. Laptop-um phone-um same Wi-Fi-la connect pannunga.
8. Terminal-la varra QR code-a Expo Go use panni scan pannunga.

If same Wi-Fi connect aagala / QR work aagala, terminal stop pannitu try pannunga:

```bash
npx expo start --tunnel
```

## What's included now?

- ClassVault Home / My Classes screen
- SRM Trichy Arts and Science College heading
- BCA • Computer Applications
- Semester 3 • 2025–2028
- Subject group cards: Python, Tamil, English, Professional English, CAP, E-Commerce
- Search box
- Dark / Light toggle beside notification icon
- Group card tap pannina sample members, Rep and Staff roles show aagum
- Bottom navigation visual prototype

## Important

- Idhu first UI prototype mattum.
- Login, real group links, live chat, cloud database, real file upload/download innum connect pannala.
- Members count and member names are demo placeholders, real class data illa.
- Login/backend build pannumbodhu secure authentication and database permissions add pannanum.
- App store publish panna munnaadi real device testing and security review thevai.

## Folder notes

`App.tsx` = main screen code.
`app.json` = app name and Expo config.
`package.json` = project dependencies and commands.
