'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navigation.module.css';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <Link 
        href="/" 
        className={`${styles.link} ${pathname === '/' ? styles.active : ''}`}
      >
        Home
      </Link>
      <Link 
        href="/dashboard" 
        className={`${styles.link} ${pathname === '/dashboard' ? styles.active : ''}`}
      >
        Dashboard
      </Link>
    </nav>
  );
}