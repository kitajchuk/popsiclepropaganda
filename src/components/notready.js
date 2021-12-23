export default function NotReady({network}) {
  return (
    <section className="pp__bump -ppwrap">
      {/* https://input-output-hk.github.io/cardano-wallet/api/edge/#tag/Network */}
      {network && network.sync_progress.status !== 'not_responding'
        ? `network sync progress: ${network.sync_progress.progress.quantity}%`
        : 'network offline...'}
    </section>
  );
}