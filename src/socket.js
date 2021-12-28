import { useDispatch } from 'react-redux';
import { update, toast, reset } from './store/reducers';

export function withSocket(WrappedComponent) {
  return ({...props}) => {
    const dispatch = useDispatch();
    const webSocket = new WebSocket('ws://localhost:8888', 'echo-protocol');
    const toastTime = 5000;

    let pollTimer = null;
    let toastTimer = null;

    webSocket.onopen = () => {
      console.log('ws opened');
    };

    webSocket.onclose = () => {
      console.log('ws closed');
    };

    webSocket.onmessage = (message) => {
      const json = JSON.parse(message.data);

      if (json.event === 'error' || json.event === 'success') {
        clearTimeout(toastTimer);
        dispatch(toast(json));
        toastTimer = setTimeout(() => dispatch(reset()), toastTime);
        return;
      }

      if (json.event === 'wallet_connected' && !pollTimer) {
        pollTimer = setInterval(() => {
          if (json.network && json.network.sync_progress.status === 'ready') {
            console.log('clear poll timer...');
            clearInterval(pollTimer);
          } else {
            if (pollTimer) {
              console.log('polling network for readyness...');
              webSocket.send(JSON.stringify({ event: 'wallet_network' }));
            } else {
              console.log('polled network is ready...');
            }
          }
        }, 1000);
      }

      if (json.network && json.network.sync_progress.status === 'ready' && pollTimer) {
        console.log('clear poll timer...');
        clearInterval(pollTimer);
      }

      dispatch(update(json));
    };

    const sock = {
      /**
       * Send data to the WebSocketServer by event type
       * @param {string} event The event to send to the WebSocketServer
       * @param {object} data The data to send to the WebSocketServer
       */
      send: (event, data) => {
        if (webSocket.readyState !== 1) {
          let timer = setInterval(() => {
            if (webSocket.readyState === 1) {
              clearInterval(timer);
              webSocket.send(JSON.stringify({ event, data }));
            }
          }, 100);
        } else {
          webSocket.send(JSON.stringify({ event, data }));
        }
      },

      /**
       * Toast an error or success message for the application
       * @param {object} message Can be form of { error } or { success }
       */
      toast: (message) => {
        clearTimeout(toastTimer);
        dispatch(toast(message));
        toastTimer = setTimeout(() => dispatch(reset()), toastTime);
      }
    };

    return (
      <WrappedComponent sock={sock} {...props} />
    );
  };
}