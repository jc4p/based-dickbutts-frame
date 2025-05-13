'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './DebugOverlay.module.css';

export function DebugOverlay() {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(false); // Start hidden

  const addLog = useCallback((type, args) => {
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return '[Unserializable Object]';
        }
      }
      return String(arg);
    }).join(' ');
    setLogs(prevLogs => [
      ...prevLogs,
      { type, message, timestamp: new Date().toLocaleTimeString() },
    ]);
  }, []);

  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;

    console.log = (...args) => {
      originalConsoleLog.apply(console, args);
      addLog('log', args);
    };
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      addLog('error', args);
    };
    console.warn = (...args) => {
      originalConsoleWarn.apply(console, args);
      addLog('warn', args);
    };
    console.info = (...args) => {
      originalConsoleInfo.apply(console, args);
      addLog('info', args);
    };

    // Cleanup function to restore original console methods
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.info = originalConsoleInfo;
    };
  }, [addLog]);

  const toggleVisibility = () => setIsVisible(!isVisible);
  const clearLogs = () => setLogs([]);

  if (!isVisible) {
    return (
      <button onClick={toggleVisibility} className={styles.toggleButton} aria-label="Show Debug Logs">
        🐞
      </button>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.header}>
        <h3>Console Logs</h3>
        <div>
          <button onClick={clearLogs} className={styles.actionButton}>Clear</button>
          <button onClick={toggleVisibility} className={styles.actionButton}>Hide</button>
        </div>
      </div>
      <div className={styles.logContainer}>
        {logs.length === 0 && <p className={styles.noLogs}>No logs yet...</p>}
        {logs.map((log, index) => (
          <div key={index} className={`${styles.logEntry} ${styles[log.type]}`}>
            <span className={styles.timestamp}>{log.timestamp}</span>
            <span className={styles.logType}>[{log.type.toUpperCase()}]</span>
            <pre className={styles.logMessage}>{log.message}</pre>
          </div>
        ))}
      </div>
    </div>
  );
} 