import './styles/index.scss';
import {
  BrowserRouter as Router,
  NavLink,
  Switch,
  Route,
} from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CreditCard, Droplet } from 'react-feather';
import { withSocket } from './socket';
import { selectMessage } from './store/selectors';
import Wallets from './components/wallets';
import Wallet from './components/wallet';
import Toast from './components/toast';
import Faucet from './components/faucet';

function App({sock}) {
  const message = useSelector(selectMessage);

  return (
    <Router>
      <div className="pp">
        {message && (
          <Toast message={message} />
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
