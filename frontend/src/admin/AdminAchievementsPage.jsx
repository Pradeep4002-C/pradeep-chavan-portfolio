import ResourceManager from './ResourceManager.jsx';
import { RESOURCE_CONFIGS } from './resourceConfigs.js';

export default function AdminAchievementsPage() {
  return <ResourceManager config={RESOURCE_CONFIGS.achievements} />;
}
