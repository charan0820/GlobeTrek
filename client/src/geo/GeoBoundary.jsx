import React, { Component } from "react";
export default class GeoBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="notice" role="status">
        This device could not render the geographic view. Continue with the
        country or place list.
      </p>
    ) : (
      this.props.children
    );
  }
}
