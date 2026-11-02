import { Admin } from './Admin.js';
import { Profile } from './Profile.js';
import { Project } from './Project.js';
import { SkillGroup } from './SkillGroup.js';
import { Education } from './Education.js';
import { Certification } from './Certification.js';
import { Achievement } from './Achievement.js';
import { ContactMessage } from './ContactMessage.js';

export {
  Admin,
  Profile,
  Project,
  SkillGroup,
  Education,
  Certification,
  Achievement,
  ContactMessage,
};

export const ALL_MODELS = [
  Admin,
  Profile,
  Project,
  SkillGroup,
  Education,
  Certification,
  Achievement,
  ContactMessage,
];

/**
 * Creates any missing indexes declared by the schemas.
 *
 * Model.init() is additive: it creates indexes that do not exist and leaves
 * existing collections, documents, and unrelated indexes untouched. It never
 * calls syncIndexes() or drops data.
 */
export async function ensureModelIndexes(models = ALL_MODELS) {
  await Promise.all(models.map((model) => model.init()));
}
