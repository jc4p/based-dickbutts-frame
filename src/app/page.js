import styles from "./page.module.css";
import { CollectionDisplay } from "@/components/CollectionDisplay";
import { MintForm } from "@/components/MintForm";

export const metadata = {
  title: 'Based Interns',
  description: 'Mint one of 1,000 unique combinations',
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: "https://yourdomain.com/collection-banner.png",
      button: {
        title: "Mint Now!",
        action: {
          type: "launch_frame",
          name: "mint-frame",
          url: "https://yourdomain.com", // Replace with your actual domain
          splashImageUrl: "https://yourdomain.com/collection-square.gif",
          splashBackgroundColor: "#000000"
        }
      }
    })
  }
};

export default function Page() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Based Interns</h1>
        <p className={styles.subtitle}>Mint one of 1,000 unique combinations</p>
        <CollectionDisplay />
        <MintForm />
      </main>
    </div>
  );
}