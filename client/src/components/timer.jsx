import React, { useEffect, useState } from 'react';

function Timer({ totalSeconds, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onExpire]);

  const pct = (remaining / totalSeconds) * 100;
  const color = remaining > 30 ? '#2a9d8f' : remaining > 15 ? '#e9c46a' : '#e63946';

  return (
    <div>
      <div className="d-flex justify-content-between mb-1">
        <small style={{ color }}>⏱ Time remaining</small>
        <strong style={{ color }}>{remaining}s</strong>
      </div>
      <div className="timer-bar-wrap">
        <div className="timer-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export {Timer} 