import styles from "./page.module.css";
import Map from "@/components/Map";

export default function Home() {
  return (
    <div className={styles.page}>
      <header style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1000,
        padding: '16px',
        width: '100%',
        pointerEvents: 'none'
      }}>
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(10px)',
          padding: '12px 24px',
          borderRadius: 'var(--radius-full)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: 'var(--shadow-md)',
          pointerEvents: 'auto',
          border: '1px solid var(--glass-border)'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: 'var(--primary-color)',
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }} />
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Comunidade Segura
          </h1>
        </div>
      </header>

      <main className={styles.mapContainer}>
        <Map />
      </main>
    </div>
  );
}
