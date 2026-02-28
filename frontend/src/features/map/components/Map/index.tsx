"use client";

import dynamic from 'next/dynamic';
import React from 'react';

// Disabling SSR for Map since Leaflet requires window
const Map = dynamic(() => import('./Map'), {
    ssr: false,
    loading: () => (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100vw',
            background: 'var(--bg-primary)',
            color: 'var(--primary-color)',
            fontFamily: 'var(--font-sans)',
            fontWeight: '600'
        }}>
            Carregando mapa...
        </div>
    ),
});

export default Map;
