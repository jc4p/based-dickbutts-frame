import styles from "./page.module.css";
import { CollectionDisplay } from "@/components/CollectionDisplay";
import { MintForm } from "@/components/MintForm";

export const metadata = {
  title: 'Based Interns',
  description: 'Mint one of the 2000 Interns on Base',
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/collection-banner.png`,
      button: {
        title: "Mint Yours Now!",
        action: {
          type: "launch_frame",
          name: "Based Interns",
          url: `${process.env.NEXT_PUBLIC_APP_URL}`,
          splashImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/collection-square.gif`,
          splashBackgroundColor: "#FFFFFF"
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
        <p className={styles.subtitle}>Mint one of the 2,000 Interns on Base</p>
        <CollectionDisplay />
        <MintForm />
      </main>
    </div>
  );
}