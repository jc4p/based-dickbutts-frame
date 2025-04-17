'use client';

import { useState, useEffect } from 'react';
import styles from './dashboard.module.css';
import { Tomorrow } from 'next/font/google';

const tomorrow = Tomorrow({ 
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export default function Dashboard() {
  const [mintees, setMintees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch mintees
        const response = await fetch('/api/mintees');
        if (!response.ok) {
          throw new Error('Failed to fetch mintees');
        }
        const data = await response.json();
        setMintees(data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div className={tomorrow.className}>Loading...</div>;
  if (error) return <div className={tomorrow.className}>Error: {error}</div>;

  return (
    <div className={`${styles.container} ${tomorrow.className}`}>
      <h1>Mintees Dashboard</h1>
      <div className={styles.grid}>
        {Object.entries(mintees)
          // Sort by mint_count descending
          .sort(([, usersA], [, usersB]) => {
            // Access mint_count from the first user (assuming it's consistent per address)
            const countA = usersA?.[0]?.mint_count || 0;
            const countB = usersB?.[0]?.mint_count || 0;
            return countB - countA; // Sort descending
          })
          .map(([address, users]) => (
          users.map((user, index) => (
            <div key={`${address}-${index}`} className={styles.card}>
              <img 
                src={user.pfp_url} 
                alt={user.display_name || user.username} 
                className={styles.avatar}
              />
              <h2>{user.display_name || 'Anonymous'}</h2>
              <p>@{user.username || 'no-username'}</p>
              {user.mint_count && (
                <p className={styles.mintCount}>Minted: {user.mint_count}</p>
              )}
              <p className={styles.address}>{address}</p>
            </div>
          ))
        ))}
      </div>
    </div>
  );
}