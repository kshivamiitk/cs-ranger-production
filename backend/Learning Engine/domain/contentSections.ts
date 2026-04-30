export type ContentSectionKey = 'introduction' | 'explanation' | 'solvedExamples';

export interface ContentSectionDefinition {
  key: ContentSectionKey;
  slug: 'introduction' | 'explanation' | 'solved-examples';
  label: string;
  shortLabel: string;
  description: string;
  placeholder: string;
}

export const contentNodeSections: readonly ContentSectionDefinition[] = [
  {
    key: 'introduction',
    slug: 'introduction',
    label: 'Basic introduction',
    shortLabel: 'Introduction',
    description: 'Short learner-friendly opening section that frames the topic clearly.',
    placeholder: 'Introduce the lesson in a concise, approachable way.',
  },
  {
    key: 'explanation',
    slug: 'explanation',
    label: 'Detailed explanation',
    shortLabel: 'Explanation',
    description: 'Main teaching section with the full concept breakdown.',
    placeholder: 'Write the deep explanation here.',
  },
  {
    key: 'solvedExamples',
    slug: 'solved-examples',
    label: 'Solved examples',
    shortLabel: 'Solved examples',
    description: 'Worked examples, walkthroughs, and applied practice.',
    placeholder: 'Add solved examples and step-by-step reasoning here.',
  },
] as const;

export const defaultContentSectionKey: ContentSectionKey = 'introduction';

export function getContentSectionByKey(key: ContentSectionKey) {
  return contentNodeSections.find((section) => section.key === key) ?? contentNodeSections[0];
}

export function getContentSectionBySlug(slug: string | null | undefined) {
  if (!slug) {
    return contentNodeSections[0];
  }

  return contentNodeSections.find((section) => section.slug === slug) ?? contentNodeSections[0];
}


