import { useRouteError } from 'react-router-dom';
import RouteErrorView from '../components/RouteErrorView.jsx';

/**
 * Admin data-router error fallback.
 *
 * React Router renders this in place of the failed route instead of its default
 * "Unexpected Application Error" screen. Calling `useRouteError` also keeps the
 * router's error state handled here so no raw stack trace reaches the visitor.
 */
export default function AdminRouteError() {
  useRouteError();
  return <RouteErrorView scope="admin" />;
}
