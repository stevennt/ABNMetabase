import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";

import TooltipPopover from "./TooltipPopover";

// TOOLTIP_STACK and related functions are to ensure only the most recent tooltip is visible

let TOOLTIP_STACK = [];

function pushTooltip(component) {
  // if for some reason the tooltip is already in the stack (it shouldn't be) remove it and we'll add it again as if it wasn't
  TOOLTIP_STACK = TOOLTIP_STACK.filter(t => t !== component);
  // close all other tooltips
  TOOLTIP_STACK.filter(t => t.state.isOpen).forEach(t =>
    t.setState({ isOpen: false }),
  );
  // add this tooltip
  TOOLTIP_STACK.push(component);
}

function popTooltip(component) {
  // remove the tooltip from the stack
  TOOLTIP_STACK = TOOLTIP_STACK.filter(t => t !== component);
  // reopen the top tooltip, if any
  const top = TOOLTIP_STACK[TOOLTIP_STACK.length - 1];
  if (top && !top.state.isOpen) {
    top.setState({ isOpen: true });
  }
}

export default class Tooltip extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      isOpen: false,
      isHovered: false,
    };
  }

  static propTypes = {
    // the tooltip to show
    tooltip: PropTypes.node,
    // the element to be tooltipped
    children: PropTypes.element.isRequired,
    // Can be used to show / hide the tooltip based on outside conditions
    // like a menu being open
    isEnabled: PropTypes.bool,
    verticalAttachments: PropTypes.array,
    // Whether the tooltip should be shown
    isOpen: PropTypes.bool,
  };

  static defaultProps = {
    isEnabled: true,
    verticalAttachments: ["top", "bottom"],
    horizontalAttachments: ["center", "left", "right"],
  };

  componentDidMount() {
    const elem = ReactDOM.findDOMNode(this);

    if (elem) {
      elem.addEventListener("mouseenter", this._onMouseEnter, false);
      elem.addEventListener("mouseleave", this._onMouseLeave, false);

      // HACK: These two event listeners ensure that if a click on the child causes the tooltip to
      // unmount (e.x. navigating away) then the popover is removed by the time this component
      // unmounts. Previously we were seeing difficult to debug error messages like
      // "Cannot read property 'componentDidUpdate' of null"
      elem.addEventListener("mousedown", this._onMouseDown, true);
      elem.addEventListener("mouseup", this._onMouseUp, true);
    } else {
      console.warn(
        `Tooltip::componentDidMount: no DOM node for tooltip ${this.props.tooltip}`,
      );
    }

    this._element = document.createElement("div");
    this.componentDidUpdate();
  }

  componentDidUpdate() {
    const { isEnabled, tooltip } = this.props;
    const isOpen =
      this.props.isOpen != null ? this.props.isOpen : this.state.isOpen;
    if (tooltip && isEnabled && isOpen) {
      ReactDOM.unstable_renderSubtreeIntoContainer(
        this,
        <TooltipPopover
          isOpen={true}
          target={this}
          hasArrow
          {...this.props}
          children={this.props.tooltip}
        />,
        this._element,
      );
    } else {
      ReactDOM.unmountComponentAtNode(this._element);
    }
  }

  componentWillUnmount() {
    popTooltip(this);
    const elem = ReactDOM.findDOMNode(this);
    if (elem) {
      elem.removeEventListener("mouseenter", this._onMouseEnter, false);
      elem.removeEventListener("mouseleave", this._onMouseLeave, false);
      elem.removeEventListener("mousedown", this._onMouseDown, true);
      elem.removeEventListener("mouseup", this._onMouseUp, true);
    } else {
      console.warn(
        `Tooltip::componentWillUnmount: no DOM node for tooltip ${this.props.tooltip}`,
      );
    }
    if (this._element) {
      ReactDOM.unmountComponentAtNode(this._element);
    }
    clearTimeout(this.timer);
  }

  _onMouseEnter = e => {
    pushTooltip(this);
    this.setState({ isOpen: true, isHovered: true });
  };

  _onMouseLeave = e => {
    popTooltip(this);
    this.setState({ isOpen: false, isHovered: false });
  };

  _onMouseDown = e => {
    this.setState({ isOpen: false });
  };

  _onMouseUp = e => {
    // This is in a timeout to ensure the component has a chance to fully unmount
    this.timer = setTimeout(
      () => this.setState({ isOpen: this.state.isHovered }),
      0,
    );
  };

  render() {
    return React.Children.only(this.props.children);
  }
}
