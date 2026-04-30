import { appConfig } from './appConfig';

export const messages = {
  api: {
    requestFailed: appConfig.api.defaultErrorMessage,
    networkFailed: appConfig.api.networkErrorMessage,
    unexpectedServerError: appConfig.api.unexpectedServerErrorMessage,
    validationFailed: appConfig.api.validationFailedMessage,
    payloadTooLarge: 'Payload is too large.',
    inputTooLarge: 'This input exceeds the maximum supported length.',
    inputTooSmall: 'This input is shorter than the minimum supported length.',
  },
  auth: {
    authenticationRequired: 'Authentication is required.',
    adminRequired: 'Admin access is required.',
    creatorRequired: 'Creator access is required.',
  },
  courses: {
    notFound: 'Course not found.',
    notPublished: 'This course is not published.',
    nodeNotFound: 'Node not found.',
  },
  theme: {
    saveWarning: appConfig.ux.themePreferenceSaveWarning,
  },
} as const;

export type MessageCatalog = typeof messages;



