export default function NotReady({ network }) {
  return (
    <section className="pp__modal pp__rainbow">
      <div className="pp__modal__wrap">
        {/* https://input-output-hk.github.io/cardano-wallet/api/edge/#tag/Network */}
        {network && network.sync_progress.status !== 'not_responding'
          ? `network sync progress: ${network.sync_progress.progress.quantity}%`
          : 'network offline...'}
      </div>
    </section>
  );
}