import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useHistory } from 'react-router-dom';
import { selectWallets } from '../store/selectors';
import { useSelector } from 'react-redux';
import Modal from './modal';

export default function Wallet({sock}) {
  const params = useParams();
  const history = useHistory();
  const wallets = useSelector(selectWallets);
  const wallet = wallets.find(wallet => wallet.id === params.id);
  const [name, setName] = useState('');
  // const [nfts, setNFTs] = useState([]);
  // const [tokens, setTokens] = useState([]);
  const [oldPassphrase, setOldPassphrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [isModal, setIsModal] = useState(false);

  useEffect(() => {
    if (wallet) {
      setName(wallet.name);

      // Figure out how to determine current tokens held in wallet...
      // let tkns = [];
      // let nfts = [];

      // wallet.transactions.forEach((tx) => {
      //   tx.outputs.forEach((ot) => {
      //     if (ot.assets.length) {
      //       tkns = tkns.concat(ot.assets);
      //     }
      //   });

      //   if (tx.metadata) {
      //     nfts.push(tx.metadata);
      //   }
      // });

      // console.log(tkns, nfts);
    }
  
  }, [wallet, setName]);

  return wallet ? (
    <section className="pp__wallet -ppwrap">
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
            sock.send('update', data);
          }
        }}>
          update name/passphrase
        </button>
        <button className="delete" onClick={() => setIsModal(!isModal)}>
          delete wallet
        </button>
      </div>
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
      {isModal && (
        <Modal
          abortHandler={() => setIsModal(false)}
          confirmHandler={() => {
            sock.send('destroy', { id: wallet.id });
            history.push('/');
          }}
        />
      )}
    </section>
  ): null;
}