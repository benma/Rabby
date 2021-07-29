import { Runtime, browser } from 'webextension-polyfill-ts';
import Message from './index';
class PortMessage extends Message {
  port: Runtime.Port | null = null;
  listenCallback: any;

  constructor(port?: Runtime.Port) {
    super();

    if (port) {
      this.port = port;
    }
  }

  connect = () => {
    this.port = browser.runtime.connect();
    this.port.onMessage.addListener((source) => {
      try {
        const { _type_, data } = JSON.parse(source);
        if (_type_ === `${this._EVENT_PRE}message`) {
          this.emit('message', data);
          return;
        }

        if (_type_ === `${this._EVENT_PRE}response`) {
          this.onResponse(data);
        }
      } catch (err) {
        console.log('[rabby] postMessage parse message error', err);
      }
    });

    return this;
  };

  listen = (listenCallback: any) => {
    if (!this.port) return;
    this.listenCallback = listenCallback;

    this.port.onMessage.addListener((source) => {
      try {
        const { _type_, data } = JSON.parse(source);
        if (_type_ === `${this._EVENT_PRE}request`) {
          this.onRequest(data);
        }
      } catch (err) {
        console.log('[rabby] postMessage parse message error', err);
      }
    });

    return this;
  };

  send = (type, data) => {
    if (!this.port) return;
    try {
      // cause firefox strict object refrence policy, stringify before we send it
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Dead_object
      this.port.postMessage(
        JSON.stringify({ _type_: `${this._EVENT_PRE}${type}`, data })
      );
    } catch {
      //
    }
  };

  dispose = () => {
    this._dispose();
    this.port?.disconnect();
  };
}

export default PortMessage;
