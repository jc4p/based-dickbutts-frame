'use client';

import Image from 'next/image';
import styles from './CollectionDisplay.module.css';

export function CollectionDisplay() {
  return (
    <div className={styles.collectionDisplay}>
      <Image 
        src="/collection.gif" 
        alt="Collection GIF" 
        width={400} 
        height={400}
        className={styles.collectionImage}
        priority
      />
    </div>
  );
}