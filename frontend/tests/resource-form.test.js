import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPayload,
  emptyValues,
  parseList,
  validateFields,
  valuesFromItem,
} from '../src/admin/resourceForm.js';

const FIELDS = [
  {
    name: 'label',
    label: 'Label',
    type: 'text',
    required: true,
    requiredMessage: 'Enter a label.',
    maxLength: 60,
  },
  {
    name: 'items',
    label: 'Skills',
    type: 'stringList',
    required: true,
    requiredMessage: 'Add at least one skill.',
    maxItems: 3,
    itemMaxLength: 10,
  },
  { name: 'order', label: 'Display order', type: 'number', min: 0, max: 100, default: 0 },
  { name: 'year', label: 'Year', type: 'year', required: true },
  { name: 'url', label: 'Certificate URL', type: 'url', maxLength: 30 },
];

test('parseList trims, drops blanks, and de-duplicates case-insensitively', () => {
  assert.deepEqual(parseList(' React, react ,  ,Vue '), ['React', 'Vue']);
  assert.deepEqual(parseList(''), []);
});

test('emptyValues and valuesFromItem convert records to editable strings', () => {
  assert.deepEqual(emptyValues(FIELDS), {
    label: '',
    items: '',
    order: '0',
    year: '',
    url: '',
  });

  assert.deepEqual(
    valuesFromItem(FIELDS, {
      label: 'A',
      items: ['React', 'Vue'],
      order: 2,
      year: 2024,
      url: 'https://example.com',
    }),
    {
      label: 'A',
      items: 'React, Vue',
      order: '2',
      year: '2024',
      url: 'https://example.com',
    },
  );
});

test('buildPayload trims text, converts numbers, and omits empty optional numbers', () => {
  const payload = buildPayload(FIELDS, {
    label: '  A  ',
    items: 'React, Vue',
    order: '',
    year: '2024',
    url: '  https://example.com  ',
  });

  assert.deepEqual(payload, {
    label: 'A',
    items: ['React', 'Vue'],
    year: 2024,
    url: 'https://example.com',
  });
  assert.equal('order' in payload, false);

  const withOrder = buildPayload(FIELDS, { label: 'A', items: 'React', order: '0', year: '2024', url: '' });
  assert.equal(withOrder.order, 0);
  assert.equal(withOrder.url, '');
});

test('validateFields reports required, numeric, and URL problems', () => {
  const errors = validateFields(FIELDS, {
    label: '   ',
    items: '',
    order: '-1',
    year: '1899',
    url: 'ftp://example.com',
  });

  assert.equal(errors.label, 'Enter a label.');
  assert.equal(errors.items, 'Add at least one skill.');
  assert.equal(errors.order, 'Display order must be 0 or more.');
  assert.equal(errors.year, 'Year must be 1950 or more.');
  assert.equal(errors.url, 'Enter a valid http or https URL.');
});

test('validateFields enforces string-list count and item length limits', () => {
  const tooMany = validateFields(FIELDS, { label: 'A', items: 'a, b, c, d', year: '2024' });
  assert.equal(tooMany.items, 'Use at most 3 entries.');

  const tooLong = validateFields(FIELDS, { label: 'A', items: 'averylongskill', year: '2024' });
  assert.equal(tooLong.items, 'Each entry must be 10 characters or fewer.');
});

test('validateFields accepts a fully valid record', () => {
  assert.deepEqual(
    validateFields(FIELDS, {
      label: 'Languages',
      items: 'React, Vue',
      order: '1',
      year: '2024',
      url: 'https://example.com',
    }),
    {},
  );
});

test('validateFields runs an optional cross-field hook for education years', () => {
  const fields = [
    { name: 'startYear', label: 'Start year', type: 'year' },
    { name: 'endYear', label: 'End year', type: 'year' },
  ];
  const crossValidate = (values, errors) => {
    const start = String(values.startYear ?? '').trim();
    const end = String(values.endYear ?? '').trim();
    if (start && end && !errors.startYear && !errors.endYear && Number(end) < Number(start)) {
      errors.endYear = 'End year cannot be earlier than start year.';
    }
  };

  assert.equal(
    validateFields(fields, { startYear: '2025', endYear: '2021' }, crossValidate).endYear,
    'End year cannot be earlier than start year.',
  );
  assert.deepEqual(validateFields(fields, { startYear: '2021', endYear: '2025' }, crossValidate), {});
});
