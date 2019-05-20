/*
  @flow weak
 */

import React from "react"; // peer-dependency
import mitt from "mitt"; // DEPENDENCY #1
import PropTypes from "prop-types"; // DEPENDENCY #2, sorta
import uuidv1 from "uuid/v1";
import { Map } from "immutable";

if (!PropTypes) console.warn("<react-native-portal> no PropTypes available");

export const PortalsContext = React.createContext("portals");

const oContextTypes = {
  portalSub: PropTypes.func,
  portalUnsub: PropTypes.func,
  portalSet: PropTypes.func,
  portalGet: PropTypes.func
};

export class PortalProvider extends React.PureComponent {
  _emitter: *;

  static childContextTypes = oContextTypes;

  state = {
    portals: Map()
  };

  getChildContext() {
    return {
      portalSub: this.portalSub,
      portalUnsub: this.portalUnsub,
      portalSet: this.portalSet,
      portalGet: this.portalGet
    };
  }

  componentWillMount() {
    this._emitter = new mitt();
  }

  componentWillUnmount() {
    this._emitter = null;
  }

  // 변경시 통지 요청 등록
  portalSub = (name, callback) => {
    const emitter = this._emitter;
    if (emitter) {
      emitter.on(name, callback);
    }
  };

  // 변경시 통지 요청 해제
  portalUnsub = (name, callback) => {
    const emitter = this._emitter;
    if (emitter) {
      emitter.off(name, callback);
    }
  };

  // 변경
  portalSet = (name, value) => {
    this.setState(
      prevState => ({
        portals: prevState.portals.set(name, value)
      }),
      () => {
        if (this._emitter) {
          this._emitter.emit(name);
        }
      }
    );
  };

  portalGet = name => this.state.portals.get(name) || null;

  // 변경
  render() {
    return (
      <PortalsContext.Provider value={this.state.portals}>
        {this.props.children}
      </PortalsContext.Provider>
    );
  }
}

export class BlackPortal extends React.PureComponent {
  static contextTypes = oContextTypes;

  props: {
    name: string,
    children?: *
  };

  constructor(props) {
    super(props);
    this.state = {
      name: this.props.name || uuidv1()
    };
  }

  componentDidMount() {
    const { children } = this.props;
    const { name } = this.state;
    const { portalSet } = this.context;
    portalSet && portalSet(name, children);
  }

  componentWillReceiveProps(newProps) {
    const oldProps = this.props;
    const { children } = newProps;
    const { name } = this.state;
    const { portalSet } = this.context;
    if (oldProps.children != newProps.children) {
      portalSet && portalSet(name, children);
    }
  }

  componentWillUnmount() {
    const { name } = this.state;
    const { portalSet } = this.context;
    portalSet && portalSet(name, null);
  }

  render() {
    return null;
  }
}

export class WhitePortal extends React.PureComponent {
  static contextTypes = oContextTypes;

  props: {
    name: string,
    children?: *,
    childrenProps?: *
  };

  componentWillMount() {
    const { name } = this.props;
    const { portalSub } = this.context;
    portalSub && portalSub(name, this.forceUpdater);
  }

  componentWillUnmount() {
    const { name } = this.props;
    const { portalUnsub } = this.context;
    portalUnsub && portalUnsub(name, this.forceUpdater);
  }

  forceUpdater = () => {
    return this.forceUpdate();
  };

  render() {
    const { name, children, childrenProps } = this.props;
    const { portalGet } = this.context;
    const portalChildren = (portalGet && portalGet(name)) || children;
    return (
      (childrenProps && portalChildren
        ? React.cloneElement(React.Children.only(portalChildren), childrenProps)
        : portalChildren) || null
    );
  }
}

export class WhitePortals extends React.PureComponent {
  render() {
    return (
      <PortalsContext.Consumer>
        {portals => {
          const component = [];
          portals.forEach((value, key) => {
            component.push(<WhitePortal key={key} name={key} />);
          });
          return component;
        }}
      </PortalsContext.Consumer>
    );
  }
}
