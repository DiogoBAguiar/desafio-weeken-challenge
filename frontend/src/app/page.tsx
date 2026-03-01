import styles from "./page.module.css";
import Map from "@/features/map/components/Map";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.mapContainer}>
        <Map />
      </main>
    </div>
  );
}
