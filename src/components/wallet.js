import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import {
  useHistory, 
  NavLink,
  Route,
} from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ExternalLink, Upload, Download } from 'react-feather';
import { reset } from '../store/reducers';
import { selectWallets, selectNetwork, selectReady, selectFees } from '../store/selectors';
import Modal from './modal';
import NotReady from './notready';
import { SCANNER_URL, EXPLORER_URL } from '../constants';

export default function Wallet({ sock }) {
  const dispatch = useDispatch();
  const params = useParams();
  const history = useHistory();
  const wallets = useSelector(selectWallets);
  const network = useSelector(selectNetwork);
  const ready = useSelector(selectReady);
  const fees = useSelector(selectFees);
  const wallet = wallets.find(wallet => wallet.id === params.id);
  const pollRef = useRef();
  const [name, setName] = useState('');
  const [receiver, setReceiver] = useState('');
  const [showUsed, setShowUsed] = useState(false);
  const [amount, setAmount] = useState('');
  const [oldPassphrase, setOldPassphrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [spendPassphrase, setSpendPassphrase] = useState('');
  const [isModal, setIsModal] = useState(false);

  useEffect(() => {
    if (wallet && !name) {
      console.log('pp:', 'setName', wallet.name);
      setName(wallet.name);
    }
  
  }, [wallet, name, setName]);

  useEffect(() => {
    if (wallet && receiver && amount && !spendPassphrase) {
      sock.send('wallet_fees', {
        id: wallet.id,
        amount,
        receiver,
      });
    }
  }, [sock, wallet, receiver, amount, spendPassphrase]);

  useEffect(() => {
    if (!fees && receiver && amount && spendPassphrase) {
      setAmount('');
      setReceiver('');
      setSpendPassphrase('');
    }
  }, [fees, receiver, amount, spendPassphrase]);

  useEffect(() => {
    if (wallet && wallet.availableBalance !== wallet.totalBalance && !pollRef.current) {
      pollRef.current = setInterval(() => {
        sock.send('wallet_list');
        console.log('pp: wallet balances ping');
      }, 3000);
    }

    if (wallet && wallet.availableBalance === wallet.totalBalance && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      console.log('pp: wallet poll cleared');
    }
  }, [wallet, sock]);

  const updateHandler = () => {
    let data = { id: wallet.id };
    let msg;
    const isPassphrase = newPassphrase.length && oldPassphrase.length;

    if (name.length) {
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

    if ((data.name && data.name !== wallet.name) || (data.oldPassphrase && data.newPassphrase)) {
      sock.send('wallet_update', data);
    } else {
      if (data.name === wallet.name && !isPassphrase) msg = 'The wallet name has not been changed';
      if (isPassphrase && newPassphrase.length < 10) msg = 'The passphrase must be at least 10 characters';
      if (isPassphrase && newPassphrase === oldPassphrase) msg = 'The new passphrase must be different than the current passphrase';
      sock.toast({ error: { message: msg } });
    }
  };

  const confirmDeleteHandler = () => {
    sock.send('wallet_destroy', { id: wallet.id });
    history.push('/');
  };

  const sendHandler = () => {
    if (receiver.length && amount && spendPassphrase.length) {
      sock.send('wallet_send', {
        id: wallet.id,
        passphrase: spendPassphrase,
        amount,
        receiver,
      });
    } else {
      let msg;
      if (!spendPassphrase.length) msg = 'Enter your spending passphrase to send ada';
      if (!amount) msg = 'Enter an amount of ada to send';
      if (!receiver.length) msg = 'Enter an address to send to';
      sock.toast({ error: { message: msg } });
    }
  };

  const resetHandler = () => {
    setAmount('');
    setReceiver('');
    setSpendPassphrase('');
    dispatch(reset());
  };

  return !ready ? (
    <NotReady network={network} />
  ) : wallet ? (
    <>
      <nav className="pp__tabi">
        <ul>
          <li>
            <NavLink exact to={`/wallet/${wallet.id}/`} activeClassName="active">
              summary
            </NavLink>
          </li>
          <li>
            <NavLink exact to={`/wallet/${wallet.id}/sender`} activeClassName="active">
              send/receive
            </NavLink>
          </li>
          <li>
            <NavLink exact to={`/wallet/${wallet.id}/transactions`} activeClassName="active">
              transactions
            </NavLink>
          </li>
          <li>
            <NavLink exact to={`/wallet/${wallet.id}/tokens`} activeClassName="active">
              tokens
            </NavLink>
          </li>
        </ul>
      </nav>
      <section className="pp__wallet pp__bump -ppwrap">
        <Route exact path={`/wallet/${wallet.id}/`}>
          <div className="pp__funds">
            <div>available funds: {wallet.availableBalance / 1e6} ada</div>
            <div>total funds: {wallet.totalBalance / 1e6} ada</div>
            <div>total rewards: {wallet.rewardBalance / 1e6} ada</div>
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
            <button className="confirm" onClick={updateHandler}>
              update name/passphrase
            </button>
            <button className="delete" onClick={() => setIsModal(!isModal)}>
              delete wallet
            </button>
          </div>
          {isModal && (
            <Modal
              abortHandler={() => setIsModal(false)}
              confirmHandler={confirmDeleteHandler}
            />
          )}
        </Route>
        <Route exact path={`/wallet/${wallet.id}/sender`}>
          <div className="pp__inputs pp__dump">
            <input
              type="text"
              name="receiver"
              placeholder="paste an address"
              onChange={(e) => setReceiver(e.target.value)}
              value={receiver}
            />
            <input
              type="text"
              name="amount"
              placeholder="amount in ada -- do not use lovelace here"
              onChange={(e) => setAmount(Number(e.target.value))}
              value={amount}
            />
            <input
              type="password"
              name="spendPassphrase"
              placeholder="enter your spending passphrase"
              onChange={(e) => setSpendPassphrase(e.target.value)}
              value={spendPassphrase}
            />
            <div className="pp__bump pp__dump">estimated fees: {fees ? fees.estimated_max.quantity / 1e6 : 0} ada</div>
            <div className="pp__btns">
              <button className="confirm" onClick={resetHandler}>
                reset
              </button>
              <button className="cancel" onClick={sendHandler} disabled={!fees && spendPassphrase.length}>
                send
              </button>
            </div>
          </div>
          <div className="pp__addrs">
            <div className="pp__dump">
              <div>share any of these wallet addresses to receive ada, tokens or NFTs</div>
              <label>
                <input
                  type="checkbox"
                  value={showUsed}
                  onChange={(e) => setShowUsed(e.target.checked)}
                />
                <span>show used addresses</span>
              </label>
            </div>
            {showUsed && (
              <div className="pp__addrs__used">
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
            )}
            <div className="pp__addrs__unused">
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
          </div>
        </Route>
        <Route exact path={`/wallet/${wallet.id}/transactions`}>
          <table className="pp__table">
              <thead>
                <tr>
                  <th>&nbsp;</th>
                  <th>assets</th>
                  <th>txhash</th>
                </tr>
              </thead>
              <tbody>
                {wallet.transactions.map((tx) => {
                  let tokensText = null;
                  if (tx.direction === 'incoming') {
                    tx.outputs.forEach((obj) => {
                      if (obj.assets && obj.assets.length && wallet.usedAddresses.find(addr => obj.address === addr.id)) {
                        tokensText = 'tokens received';
                      }
                    });
                  }
                  if (tx.direction === 'outgoing') {
                    tx.outputs.forEach((obj) => {
                      if (obj.assets && obj.assets.length && !wallet.usedAddresses.find(addr => obj.address === addr.id)) {
                        tokensText = 'tokens sent';
                      }
                    });
                  }
                  return (
                    <tr key={tx.id}>
                      <td>
                        {tx.direction === 'outgoing' ? <Upload className="outgoing" /> : <Download className="incoming" />}
                      </td>
                      <td>
                        <div>{(tx.amount.quantity - tx.fee.quantity) / 1e6} ada {tx.direction === 'outgoing' ? 'sent' : 'received'}</div>
                        {tx.direction === 'outgoing' && (
                          <div>{tx.fee.quantity / 1e6} ada in fees</div>
                        )}
                        {tokensText !== null && (
                          <div>{tokensText}</div>
                        )}
                      </td>
                      <td>
                        <a href={`${EXPLORER_URL}/en/transaction?id=${tx.id}`} rel="noreferrer" target="_blank" title="Cardano Explorer">
                          <span>{tx.id}</span>
                          <ExternalLink />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </Route>
        <Route exact path={`/wallet/${wallet.id}/tokens`}>
          <table className="pp__table">
            <thead>
              <tr>
                <th>name</th>
                <th>policy</th>
                <th>quantity</th>
              </tr>
            </thead>
            <tbody>
              {wallet.assets.available.map((asset) => {
                return (
                  <tr key={asset.asset_name}>
                    <td>{asset.asset_name}</td>
                    <td>
                      <a href={`${SCANNER_URL}/token/${asset.policy_id}.${asset.asset_name}`} rel="noreferrer" target="_blank" title="Cardano Scan">
                        <span>{asset.policy_id}</span>
                        <ExternalLink />
                      </a>
                    </td>
                    <td>{asset.quantity}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Route>
      </section>
    </>
  ) : null;
}