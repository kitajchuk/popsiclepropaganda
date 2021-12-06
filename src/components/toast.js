export default function Toast({error}) {
  return (
    <div className="pp__toast">
      {error.code && (
        <div className="pp__toast__code"><span>code:</span> {error.code}</div>
      )}
      <div className="pp__toast__msg"><span>message:</span> {error.message}</div>
    </div>
  );
}