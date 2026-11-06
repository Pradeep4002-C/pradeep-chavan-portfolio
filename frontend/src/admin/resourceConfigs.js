import { achievementsApi, certificationsApi, educationApi, skillGroupsApi } from './adminApi.js';

/**
 * Field descriptors and metadata for the four ordered content collections.
 *
 * They share one list/edit/delete UI (ResourceManager) and one form
 * implementation (resourceForm), so only genuine differences — fields, labels,
 * and API wrappers — live here.
 */

export const RESOURCE_CONFIGS = {
  skills: {
    key: 'skills',
    title: 'Skills',
    description: 'Skill groups shown in the public Skills section.',
    addLabel: 'Add skill group',
    singular: 'skill group',
    emptyTitle: 'No skill groups yet',
    emptyMessage: 'Add a skill group to publish skills in the Skills section.',
    api: skillGroupsApi,
    fields: [
      {
        name: 'label',
        label: 'Label',
        type: 'text',
        required: true,
        requiredMessage: 'Enter a label.',
        maxLength: 60,
        span: 2,
        placeholder: 'Languages',
      },
      {
        name: 'items',
        label: 'Skills',
        type: 'stringList',
        required: true,
        requiredMessage: 'Add at least one skill.',
        maxItems: 30,
        itemMaxLength: 40,
        span: 2,
        hint: 'Separate skills with commas, e.g. JavaScript, React, Node.js.',
      },
      { name: 'order', label: 'Display order', type: 'number', min: 0, max: 100000, default: 0 },
    ],
    primary: (item) => item.label,
    secondary: (item) => (Array.isArray(item.items) ? item.items.join(', ') : ''),
  },

  education: {
    key: 'education',
    title: 'Education',
    description: 'Degrees and study, ordered for display.',
    addLabel: 'Add education entry',
    singular: 'education entry',
    emptyTitle: 'No education entries yet',
    emptyMessage: 'Add your first education entry.',
    api: educationApi,
    fields: [
      {
        name: 'institution',
        label: 'Institution',
        type: 'text',
        required: true,
        requiredMessage: 'Enter the institution.',
        maxLength: 200,
        span: 2,
        placeholder: 'Example Institute of Technology',
      },
      {
        name: 'qualification',
        label: 'Qualification',
        type: 'text',
        required: true,
        requiredMessage: 'Enter the qualification.',
        maxLength: 120,
        placeholder: 'B.Tech',
      },
      {
        name: 'field',
        label: 'Field of study',
        type: 'text',
        maxLength: 120,
        placeholder: 'Computer Engineering',
      },
      { name: 'startYear', label: 'Start year', type: 'year', min: 1950, max: 2100 },
      { name: 'endYear', label: 'End year', type: 'year', min: 1950, max: 2100 },
      { name: 'score', label: 'Score', type: 'text', maxLength: 60, placeholder: '8.5 CGPA' },
      { name: 'location', label: 'Location', type: 'text', maxLength: 160, placeholder: 'Pune, India' },
      { name: 'order', label: 'Display order', type: 'number', min: 0, max: 100000, default: 0 },
    ],
    primary: (item) => item.institution,
    secondary: (item) => {
      const parts = [item.qualification, item.field].filter(Boolean);
      const years = [item.startYear, item.endYear].filter((value) => value != null && value !== '');
      if (years.length === 2) {
        parts.push(`${years[0]}–${years[1]}`);
      } else if (years.length === 1) {
        parts.push(String(years[0]));
      }
      return parts.join(' · ');
    },
    crossValidate: (values, errors) => {
      const start = String(values.startYear ?? '').trim();
      const end = String(values.endYear ?? '').trim();
      if (start && end && !errors.startYear && !errors.endYear && Number(end) < Number(start)) {
        errors.endYear = 'End year cannot be earlier than start year.';
      }
    },
  },

  certifications: {
    key: 'certifications',
    title: 'Certifications',
    description: 'Certificates and issuers, ordered for display.',
    addLabel: 'Add certification',
    singular: 'certification',
    emptyTitle: 'No certifications yet',
    emptyMessage: 'Add your first certification.',
    api: certificationsApi,
    fields: [
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        requiredMessage: 'Enter a title.',
        maxLength: 200,
        span: 2,
        placeholder: 'Advanced Node.js',
      },
      {
        name: 'issuer',
        label: 'Issuer',
        type: 'text',
        required: true,
        requiredMessage: 'Enter the issuer.',
        maxLength: 160,
        placeholder: 'Example Academy',
      },
      { name: 'year', label: 'Year', type: 'year', required: true, min: 1950, max: 2100 },
      {
        name: 'url',
        label: 'Certificate URL',
        type: 'url',
        maxLength: 300,
        span: 2,
        placeholder: 'https://…',
        hint: 'Optional. Must start with http:// or https://.',
      },
      { name: 'order', label: 'Display order', type: 'number', min: 0, max: 100000, default: 0 },
    ],
    primary: (item) => item.title,
    secondary: (item) => [item.issuer, item.year].filter((value) => value != null && value !== '').join(' · '),
  },

  achievements: {
    key: 'achievements',
    title: 'Achievements',
    description: 'Awards and accomplishments, ordered for display.',
    addLabel: 'Add achievement',
    singular: 'achievement',
    emptyTitle: 'No achievements yet',
    emptyMessage: 'Add your first achievement.',
    api: achievementsApi,
    fields: [
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        requiredMessage: 'Enter a title.',
        maxLength: 200,
        span: 2,
        placeholder: 'Award or recognition',
      },
      { name: 'year', label: 'Year', type: 'year', required: true, min: 1950, max: 2100 },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        maxLength: 1000,
        rows: 3,
        span: 2,
        placeholder: 'A short description of the achievement.',
      },
      { name: 'order', label: 'Display order', type: 'number', min: 0, max: 100000, default: 0 },
    ],
    primary: (item) => item.title,
    secondary: (item) => (item.year != null ? String(item.year) : ''),
  },
};
