import ResourceManager from './ResourceManager.jsx';
import { RESOURCE_CONFIGS } from './resourceConfigs.js';

export default function AdminSkillsPage() {
  return <ResourceManager config={RESOURCE_CONFIGS.skills} />;
}
