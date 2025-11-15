import './Toast.css';

function Toast({ message, type = 'info' }) {
  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">
        {type === 'success' && '✓'}
        {type === 'error' && '✕'}
        {type === 'info' && 'ℹ'}
      </div>
      <div className="toast-message">{message}</div>
    </div>
  );
}

export default Toast;
