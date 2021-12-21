import { selectUtxo } from '../store/selectors';
import { useSelector } from 'react-redux';

export default function Faucet({sock}) {
  const utxo = useSelector(selectUtxo);
  const coin = utxo ? utxo.transactions.reduce((prev, curr) => {
    return prev + curr.funds;
  }, 0) : 0;

  return utxo ? (
    <div className="pp__faucet -ppwrap">
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