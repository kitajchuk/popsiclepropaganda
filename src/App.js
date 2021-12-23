import './styles/index.scss';
import {
  BrowserRouter as Router,
  NavLink,
  Switch,
  Route,
} from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { update, toast, reset } from './store/reducers';
import { CreditCard, Droplet } from 'react-feather';
import { selectError } from './store/selectors';
import Wallets from './components/wallets';
import Wallet from './components/wallet';
import Toast from './components/toast';
import Faucet from './components/faucet';

function withSocket(WrappedComponent) {
  return ({...props}) => {
    const dispatch = useDispatch();
    const webSocket = new WebSocket('ws://localhost:8888', 'echo-protocol');

    webSocket.onmessage = (message) => {
      const json = JSON.parse(message.data);

      // console.log(json);

      if (/connected/.test(json.event)) {
        console.log('ws connected');
      }

      if (json.event === 'error') {
        dispatch(toast(json));
        setTimeout(() => dispatch(reset()), 3000);
        return;
      }

      dispatch(update(json));
    };

    webSocket.onopen = () => {
      console.log('ws opened');

      webSocket.send(JSON.stringify({ event: 'wallet_connect', data: {} }));
      webSocket.send(JSON.stringify({ event: 'faucet_connect', data: {} }));
    };

    webSocket.onclose = () => {
      console.log('ws closed');
    };

    const sock = {
      send: (event, data) => {
        webSocket.send(JSON.stringify({ event, data }));
      },

      toast: (message) => {
        dispatch(toast({ error: { message } }));
        setTimeout(() => dispatch(reset()), 3000);
      }
    };

    return (
      <WrappedComponent sock={sock} {...props} />
    );
  };
}

function App({sock}) {
  const error = useSelector(selectError);

  return (
    <Router>
      <div className="pp">
        {error && (
          <Toast error={error} />
        )}
        <nav className="pp__navi">
          <ul>
            <li>
              <NavLink to="/" exact activeClassName="active">
                <img src="/assets/RainbowPopsicle.svg" alt="Rainbow_PP" />
              </NavLink>
            </li>
            <li>
              <NavLink to="/wallets" activeClassName="active">
                <CreditCard />
              </NavLink>
            </li>
            <li>
              <NavLink to="/faucet" exact activeClassName="active">
                <Droplet />
              </NavLink>
            </li>
          </ul>
        </nav>
        <header className="pp__mast">
          <Switch>
            <Route exact path="/">
              home
            </Route>
            <Route exact path="/wallets">
              wallets
            </Route>
            <Route exact path={[
              '/wallets/:id',
              '/wallets/:id/:view',
            ]}>
              wallet
            </Route>
            <Route exact path="/faucet">
              faucet
            </Route>
          </Switch>
        </header>
        <main className="pp__main">
          <Switch>
            <Route exact path="/">
              <img src="/rainbowpp.png" alt="Rainbow_PP" />
            </Route>
            <Route exact path="/wallets">
              <Wallets sock={sock} />
            </Route>
            <Route exact path={[
              '/wallets/:id',
              '/wallets/:id/:view',
            ]}>
              <Wallet sock={sock} />
            </Route>
            <Route exact path="/faucet">
              <Faucet sock={sock} />
            </Route>
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default withSocket(App);
