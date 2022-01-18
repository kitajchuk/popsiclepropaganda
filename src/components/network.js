// https://input-output-hk.github.io/cardano-wallet/api/edge/#tag/Network

export const Connecting = ({ network }) => {
  return (
    <section className="pp__modal pp__loading">
      <div className="pp__modal__wrap">
        <div>connecting to cardano node...</div>
      </div>
    </section>
  );
}

export const Syncing = ({ network }) => {
  return (
    <section className="pp__bump -ppwrap">
      <div>Blocks synced {network.sync_progress.progress.quantity}%</div>
    </section>
  );
} 