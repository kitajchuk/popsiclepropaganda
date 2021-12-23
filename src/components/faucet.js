import { selectUtxo, selectNetwork } from '../store/selectors';
import { useSelector } from 'react-redux';

export default function Faucet({sock}) {
  const utxo = useSelector(selectUtxo);
  const network = useSelector(selectNetwork);
  const notReady = !utxo || !network || (network && network.sync_progress.status !== 'ready');
  const coin = notReady ? 0 : utxo.transactions.reduce((prev, curr) => {
    return prev + curr.funds;
  }, 0);

  return notReady ? (
    <section className="pp__faucet pp__bump -ppwrap">
      {/* https://input-output-hk.github.io/cardano-wallet/api/edge/#tag/Network */}
      {network ? `network sync progress: ${network.sync_progress.progress}%` : 'network offline...'}
    </section>
  ) : (
    <div className="pp__faucet pp__bump -ppwrap">
      <div className="pp__funds">
        <div>total coin: {coin / 1e6} ADA</div>
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
  );
}