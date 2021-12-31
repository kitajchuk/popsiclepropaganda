import { useSelector } from 'react-redux';
import { selectUtxo, selectNetwork, selectReady } from '../store/selectors';
import NotReady from './notready';

export default function Faucet({ sock }) {
  const utxo = useSelector(selectUtxo);
  const network = useSelector(selectNetwork);
  const ready = useSelector(selectReady);
  const coin = utxo ? utxo.transactions.reduce((prev, curr) => {
    return prev + curr.funds;
  }, 0) : 0;

  return !ready ? (
    <NotReady network={network} />
  ) : utxo ? (
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
  ) : null;
}