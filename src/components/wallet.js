import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import {
  useHistory, 
  NavLink,
  Route,
} from 'react-router-dom';
import { selectWallets, selectNetwork } from '../store/selectors';
import { useSelector } from 'react-redux';
import Modal from './modal';

export default function Wallet({sock}) {
  const params = useParams();
  const history = useHistory();
  const wallets = useSelector(selectWallets);
  const network = useSelector(selectNetwork);
  const wallet = wallets.find(wallet => wallet.id === params.id);
  const notReady = !wallet || !network || (network && network.sync_progress.status !== 'ready');
  const [name, setName] = useState('');
  const [oldPassphrase, setOldPassphrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [isModal, setIsModal] = useState(false);

  useEffect(() => {
    if (wallet && !name) {
      console.log('pp:', 'setName', wallet.name);
      setName(wallet.name);
    }
  
  }, [wallet, name, setName]);

  // todo: in_ledger for transaction inputs/outputs
  // useEffect(() => {
  //   if (wallet && !name) {
  //     console.log('query addys');
  //     wallet.usedAddresses.forEach((addy) => {
  //       sock.send('faucet_query', {
  //         address: addy.id,
  //       });
  //     });
  //   }

  // }, [sock, name, wallet]);

  return notReady ? (
    <section className="pp__wallet pp__bump -ppwrap">
      {/* https://input-output-hk.github.io/cardano-wallet/api/edge/#tag/Network */}
      {network ? `network sync progress: ${network.sync_progress.progress}%` : 'network offline...'}
    </section>
  ) : (
    <>
      <nav className="pp__tabi">
        <ul>
          <li>
            <NavLink exact to={`/wallets/${wallet.id}/`} activeClassName="active">
              summary
            </NavLink>
          </li>
          <li>
            <NavLink exact to={`/wallets/${wallet.id}/sender`} activeClassName="active">
              send/receive
            </NavLink>
          </li>
          <li>
            <NavLink exact to={`/wallets/${wallet.id}/transactions`} activeClassName="active">
              transactions
            </NavLink>
          </li>
          <li>
            <NavLink exact to={`/wallets/${wallet.id}/tokens`} activeClassName="active">
              tokens
            </NavLink>
          </li>
        </ul>
      </nav>
      <section className="pp__wallet pp__bump -ppwrap">
        <Route exact path={`/wallets/${wallet.id}/`}>
          <div className="pp__funds">
            <div>available funds: {wallet.totalBalance / 1e6} ADA</div>
            <div>total rewards: {wallet.rewardBalance / 1e6} ADA</div>
            <div>delegation status: {wallet.delegation.active.status}</div>
          </div>
          <div className="pp__inputs">
            <input
              type="text"
              name="name"
              placeholder="name"
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
            <input
              type="password"
              name="oldPassphrase"
              placeholder="old passphrase"
              onChange={(e) => setOldPassphrase(e.target.value)}
              value={oldPassphrase}
            />
            <input
              type="password"
              name="newPassphrase"
              placeholder="new passphrase"
              onChange={(e) => setNewPassphrase(e.target.value)}
              value={newPassphrase}
            />
            <button className="confirm" onClick={() => {
              let data = { id: wallet.id };
              const isName = name.length;
              const isPassphrase = newPassphrase.length && oldPassphrase.length;

              if (isName) {
                data = {
                  ...data,
                  name,
                };
              }

              if (isPassphrase) {
                if (newPassphrase.length >= 10 && newPassphrase !== oldPassphrase) {
                  data = {
                    ...data,
                    oldPassphrase,
                    newPassphrase,
                  };
                }
              }

              if (data.name || (data.oldPassphrase && data.newPassphrase)) {
                sock.send('wallet_update', data);
              }
            }}>
              update name/passphrase
            </button>
            <button className="delete" onClick={() => setIsModal(!isModal)}>
              delete wallet
            </button>
          </div>
          {isModal && (
            <Modal
              abortHandler={() => setIsModal(false)}
              confirmHandler={() => {
                sock.send('wallet_destroy', { id: wallet.id });
                history.push('/');
              }}
            />
          )}
        </Route>
        <Route exact path={`/wallets/${wallet.id}/sender`}>
          <div className="pp__addrs">
            <div>unused addresses</div>
            {wallet.unusedAddresses.map((addr) => {
              return (
                <input
                  key={addr.id}
                  type="text"
                  name="address"
                  value={addr.id}
                  readOnly
                />
              );
            })}
          </div>
          <div className="pp__addrs pp__bump">
            <div>used addresses</div>
            {wallet.usedAddresses.map((addr) => {
              return (
                <input
                  key={addr.id}
                  type="text"
                  name="address"
                  value={addr.id}
                  readOnly
                />
              );
            })}
          </div>
        </Route>
        <Route exact path={`/wallets/${wallet.id}/transactions`}>
          transactions
        </Route>
        <Route exact path={`/wallets/${wallet.id}/tokens`}>
          tokens
        </Route>
      </section>
    </>
  );
}