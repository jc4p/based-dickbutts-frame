import styles from "./page.module.css";
import { CollectionDisplay } from "@/components/CollectionDisplay";
import { MintForm } from "@/components/MintForm";

export const metadata = {
  title: 'Based Dickbutts',
  description: 'Mint one of the 5000 Dickbutts on Base',
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/collection-banner.png`,
      button: {
        title: "Mint Yours Now!",
        action: {
          type: "launch_frame",
          name: "Based Dickbutts",
          url: `${process.env.NEXT_PUBLIC_APP_URL}`,
          splashImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/collection-square.gif`,
          splashBackgroundColor: "#010BFF"
        }
      }
    })
  }
};

export default function Page() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Based Dickbutts</h1>
        <p className={styles.subtitle}>Mint one of the 5,000 Dickbutts on Base</p>
        <CollectionDisplay />
        <MintForm />
      </main>
    </div>
  );
}