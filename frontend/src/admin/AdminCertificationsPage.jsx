import ResourceManager from './ResourceManager.jsx';
import { RESOURCE_CONFIGS } from './resourceConfigs.js';

export default function AdminCertificationsPage() {
  return <ResourceManager config={RESOURCE_CONFIGS.certifications} />;
}
