import { useEffect, useState } from 'react';

export default function LoadingSpinner({ message, messages }) {
  const [i, setI] = useState(0);
  const cycle = messages && messages.length > 1;
  useEffect(() => {
    if (!cycle) return;
    const t = setInterval(() => setI((x) => (x + 1) % messages.length), 2500);
    return () => clearInterval(t);
  }, [cycle, messages]);
  const display = cycle ? messages[i] : message || 'Loading...';
  return (
    <div className="spinner-container">
      <div className="spinner" />
      <p className="spinner-message" key={display}>{display}</p>
    </div>
  );
}
