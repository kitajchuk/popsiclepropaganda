import { useSelector } from 'react-redux';
import {
  selectUtxo,
  selectNetwork,
  selectSyncing,
  selectConnecting,
} from '../store/selectors';
import {
  Syncing,
  Connecting,
} from './network';

export default function Faucet({ sock }) {
  const utxo = useSelector(selectUtxo);
  const network = useSelector(selectNetwork);
  const connecting = useSelector(selectConnecting);
  const syncing = useSelector(selectSyncing);
  const coin = utxo ? utxo.transactions.reduce((prev, curr) => {
    return prev + curr.funds;
  }, 0) : 0;

  if (connecting || network === null) {
    return <Connecting network={network} />;
  }

  return (
    <>
      {syncing && (
        <Syncing network={network} />
      )}
      {utxo && (
        <div className="pp__faucet pp__bump -ppwrap">
          <div className="pp__funds">
            <div>total coin: {coin / 1e6} ada</div>
          </div>
          <div className="pp__inputs">
            <input
              type="text"
              name="address"
              value={utxo.address}
              readOnly
            />
          </div>
        </div>
      )}
    </>
  );
}