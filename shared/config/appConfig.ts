export const appConfig = {
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'CS-Ranger',
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME || 'CS-Ranger',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@cs-ranger.local',
  defaultCurrency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'INR',
  defaultTheme: process.env.NEXT_PUBLIC_DEFAULT_THEME || 'dark',
  publicAssetBasePath: process.env.NEXT_PUBLIC_ASSET_BASE_PATH || '/repository',
  api: {
    defaultErrorMessage: 'Request failed.',
    networkErrorMessage: 'Network request failed. Check your internet connection and try again.',
    unexpectedServerErrorMessage: 'Unexpected server error.',
    validationFailedMessage: 'Validation failed.',
  },
  ux: {
    themePreferenceSaveWarning: 'Theme changed locally, but saving your preference failed.',
  },
} as const;

export type AppConfig = typeof appConfig;



