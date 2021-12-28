export default function Toast({ message }) {
  const { error, success } = message;

  if (error) {
    return (
      <div className="pp__toast error">
        {error.code && (
           <div className="pp__toast__code">{error.code}</div>
        )}
        <div className="pp__toast__msg">{error.message}</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="pp__toast success">
        <div className="pp__toast__msg">{success.message}</div>
      </div>
    );
  }

  return null;
}