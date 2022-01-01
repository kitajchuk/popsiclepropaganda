import './styles/index.scss';
import {
  BrowserRouter as Router,
  NavLink,
  Switch,
  Route,
} from 'react-router-dom';
import { useParams } from 'react-router';
import { useSelector } from 'react-redux';
import { CreditCard, Droplet } from 'react-feather';
import Blockies from 'react-blockies';
import { withSocket } from './socket';
import { selectMessage, selectWallets } from './store/selectors';
import Wallets from './components/wallets';
import Wallet from './components/wallet';
import Toast from './components/toast';
import Faucet from './components/faucet';

const WalletMast = () => {
  const params = useParams();
  const wallets = useSelector(selectWallets);
  const wallet = wallets.find(wallet => wallet.id === params.id);

  return wallet ? (
    <div className="pp__mast__wallet">
      <div>
        <Blockies
          seed={wallet.id}
          size={8}
          scale={4}
          color="#f26d7d"
          bgColor="#333333"
          spotColor="#2affea"
          className="pp__blockies"
        />
        <span>{wallet.name}</span>
      </div>
      <div>
        <span>{wallet.availableBalance / 1e6}</span>
        <div className="pp__ada">ada</div>
      </div>   
    </div>
  ): null;
}

function App({sock}) {
  const message = useSelector(selectMessage);

  // For now this lets us run the static /build/ inside of electron
  const indexPaths = [
    '/',
    '/*/index.html',
  ];
  const handleIndexActive = (match, location) => {
    if (!match) return false;
    if (location.pathname === '/') return true;
    if (/\/index.html$/.test(location.pathname)) return true;
    if (/\/wallet\//.test(location.pathname)) return true;
    return false;
  };

  return (
    <Router>
      <div className="pp">
        {message && (
          <Toast message={message} />
        )}
        <nav className="pp__navi">
          <ul>
            <li>
              <NavLink to="/">
                <img src="./assets/RainbowPopsicle.svg" alt="Rainbow_PP" />
              </NavLink>
            </li>
            <li>
              <NavLink to="/" activeClassName="active" isActive={handleIndexActive}>
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
            <Route exact path={indexPaths}>
              wallets
            </Route>
            <Route exact path={[
              '/wallet/:id',
              '/wallet/:id/:view',
            ]}>
              <WalletMast />
            </Route>
            <Route exact path="/faucet">
              faucet
            </Route>
          </Switch>
        </header>
        <main className="pp__main">
          <Switch>
            <Route exact path={indexPaths}>
              <Wallets sock={sock} />
            </Route>
            <Route exact path={[
              '/wallet/:id',
              '/wallet/:id/:view',
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
