export default function Modal({
  abortHandler,
  confirmHandler,
  children,
  hideButtons = false,
}) {
  return (
    <div className="pp__modal">
      <div className="pp__modal__wrap">
        {children}
          <div className="pp__btns">
            <button onClick={abortHandler} className={`cancel ${hideButtons ? 'fit' : ''}`}>
              cancel
            </button>
            {!hideButtons && (
              <button onClick={confirmHandler} className="confirm">
                confirm
              </button>
            )}
          </div>
      </div>
    </div>
  );
}