# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Testes das regras de segurança

As permissões do app (quem vê e edita cada círculo, convites, aprovação, inativação, perfis) são
garantidas pelas regras do Firestore em `firestore.rules`. Os testes ficam em `tests/rules/` e rodam
no Firebase Emulator:

```bash
npm run test:rules
```

Precisa de Java instalado. O comando escolhe uma porta livre sozinho, sobe o emulador, roda todos os
`tests/rules/*.test.mjs` com o executor de testes do Node e encerra o emulador. Cada arquivo é um
cenário (`scenario`) com passos em ordem: `check(nome, true, fn)` exige que a operação seja permitida
e `check(nome, false, fn)` que seja recusada. Ao mudar `firestore.rules`, rode os testes antes de
publicar com `npm run rules:hml`.

## Testes unitários

```bash
npm run test:unit   # lógica pura em tests/unit (o Node remove os tipos do TypeScript ao importar)
npm test            # unitários + regras do Firestore
```

## Banco de dados por ambiente

- **Desenvolvimento:** Firebase Emulator (`npm run emulators`, projeto `demo-elder`); o app se conecta
  quando `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` está no `.env.local`.
- **Homologação:** projeto `elder-29dc3`. Migrations: `npm run migrate:dev` / `npm run migrate:hml`
  (`-- --dry-run` para simular); ver `scripts/migrations/`.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
