import { Component } from 'react';
import RouteErrorView from './RouteErrorView.jsx';

/**
 * Last-resort boundary for the router-free public bundle.
 *
 * The public portfolio does not use React Router, so there is no route-level
 * `errorElement` to catch a render failure. This class boundary replaces the
 * crashed tree with the same branded recovery view the admin router uses.
 */
export default class RouteErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <RouteErrorView scope={this.props.scope} onReload={this.props.onReload} />;
    }
    return this.props.children;
  }
}
