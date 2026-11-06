export const profile = {
  name: 'Pradeep Chavan',
  email: 'chavanpradeep096@gmail.com',
  intro:
    'I turn practical problems into full-stack applications, workflow automations, and data-driven tools.',
  /* The approved About copy. These paragraphs render until the database profile
     supplies a non-empty biography, so the section is never blank. Education
     fields deliberately do not appear here; they belong to Background. */
  bio: [
    'I learn best by making things — figuring out how interfaces, backend systems, automation, and data-driven ideas come together.',
    'I’m building my foundations in software engineering while turning what I learn into projects. I care about clear problem-solving, maintainable code, and making software that is genuinely useful. I’m especially interested in full-stack architecture, API design, and automation that removes repetitive work.',
  ],
  location: 'Belgaum, Karnataka, India',
  github: 'https://github.com/Pradeep4002-C',
  linkedin: 'https://www.linkedin.com/in/pradeep-chavan-268329337/',
  leetcode: 'https://leetcode.com/u/Pradeep_Chavan/',
  // Files inside public/ are served from the site's base URL.
  resume: 'resume.pdf',
};

/* Repository links match the hyperlinks in the supplied resume. Every summary,
   description, and technology list below was checked against that project's own
   public README; nothing here is estimated.

   `artwork` names the purpose-built illustration the showcase draws for that
   project. The illustrations are diagrams, not screenshots - none of these projects
   has a public deployment, so no demo link exists and none is invented, and no
   project ships an image file. */
export const projects = [
  {
    id: 'hostelcare',
    number: '01',
    category: 'Full-stack web app',
    name: 'HostelCare',
    summary: 'Hostel maintenance platform for reporting, triaging, and resolving room issues.',
    description:
      'Students raise complaints with optional image evidence, administrators triage and assign work with ML-assisted priority suggestions, and maintenance staff update progress with completion proof.',
    technologies: ['React', 'Node.js', 'Express', 'MongoDB'],
    href: 'https://github.com/Pradeep4002-C/hostel-management-system',
    linkLabel: 'View source code',
    artwork: 'hostelcare',
    featured: true,
  },
  {
    id: 'aquapredict',
    number: '02',
    category: 'Applied machine learning',
    name: 'AquaPredict',
    summary: 'Dashboard that predicts wastewater BOD from eight water-quality measurements.',
    description:
      'A Flask API loads a saved scikit-learn HistGradientBoostingRegressor and returns an estimated biological oxygen demand with a safe, moderate, or polluted status band.',
    technologies: ['Python', 'Flask', 'scikit-learn', 'React'],
    href: 'https://github.com/Pradeep4002-C/AquaPredict-BOD-Monitoring-System',
    linkLabel: 'View source code',
    artwork: 'aquapredict',
  },
  {
    id: 'expense-tracker',
    number: '03',
    category: 'Workflow automation',
    name: 'RPA Expense Tracker',
    summary: 'UiPath automation that turns Excel expense data into summary reports and email.',
    description:
      'The workflow reads expense rows from Excel, processes and categorizes them, generates a summary report, and emails the formatted report as an attachment.',
    technologies: ['UiPath', 'Excel', 'Email automation'],
    href: 'https://github.com/Pradeep4002-C/rpa-expense-tracker',
    linkLabel: 'View source code',
    artwork: 'expense',
  },
];

export const skillGroups = [
  { label: 'Languages', items: ['C', 'C++', 'JavaScript', 'Python', 'SQL', 'HTML', 'CSS'] },
  { label: 'Frameworks', items: ['React', 'Node.js', 'Express.js', 'Flask', 'EJS'] },
  { label: 'Databases', items: ['MongoDB', 'MySQL'] },
  { label: 'Tools', items: ['VS Code', 'Git', 'GitHub', 'MongoDB Compass', 'UiPath', 'Excel'] },
];
