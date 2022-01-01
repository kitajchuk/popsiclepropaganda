import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { update, toast, reset } from './store/reducers';
import { PORT_LOCAL } from './constants';

export function withSocket(WrappedComponent) {
  return ({...props}) => {
    const dispatch = useDispatch();
    const toastTime = 5000;
    const pollTime = 3000;

    let webSocket = useRef();
    let pollTimer = useRef();
    let toastTimer = useRef();

    const clearNetworkPoll = () => {
      console.log('pp: network poll cleared');
      clearInterval(pollTimer.current);
      pollTimer.current = null;
      webSocket.current.send(JSON.stringify({ event: 'wallet_list' }));
      webSocket.current.send(JSON.stringify({ event: 'faucet_utxo' }));
    };

    useEffect(() => {
      if (!webSocket.current) {
        webSocket.current = new WebSocket(`ws://localhost:${PORT_LOCAL}`);

        webSocket.current.onopen = () => {
          console.log('ws opened');
        };
    
        webSocket.current.onclose = () => {
          console.log('ws closed');
        };
    
        webSocket.current.onmessage = (message) => {
          const json = JSON.parse(message.data);
    
          if (json.event === 'error' || json.event === 'success') {
            clearTimeout(toastTimer.current);
            dispatch(toast(json));
            toastTimer.current = setTimeout(() => dispatch(reset()), toastTime);
            return;
          }
    
          if (json.event === 'wallet_connected' && !pollTimer.current) {
            pollTimer.current = setInterval(() => {
              if (json.network && json.network.sync_progress.status === 'ready') {
                clearNetworkPoll();
              } else {
                if (pollTimer.current) {
                  console.log('pp: network ping');
                  webSocket.current.send(JSON.stringify({ event: 'wallet_network' }));
                }
              }
            }, pollTime);
          }
    
          if (json.network && json.network.sync_progress.status === 'ready' && pollTimer.current) {
            clearNetworkPoll();
          }
    
          dispatch(update(json));
        };
      }
    }, [dispatch]);

    const sock = {
      /**
       * Send data to the WebSocketServer by event type
       * @param {string} event The event to send to the WebSocketServer
       * @param {object} data The data to send to the WebSocketServer
       */
      send: (event, data) => {
        webSocket.current.send(JSON.stringify({ event, data }));
      },

      /**
       * Toast an error or success message for the application
       * @param {object} message Can be form of { error } or { success }
       */
      toast: (message) => {
        clearTimeout(toastTimer.current);
        dispatch(toast(message));
        toastTimer.current = setTimeout(() => dispatch(reset()), toastTime);
      }
    };

    return (
      <WrappedComponent sock={sock} {...props} />
    );
  };
}