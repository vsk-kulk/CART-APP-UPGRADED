// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  stripePublicKey: 'pk_test_your_stripe_public_key',
  appName: 'ShopHub',
  cacheExpiryMinutes: 30,
  tokenRefreshIntervalMs: 5 * 60 * 1000, // 5 minutes before expiry
};
