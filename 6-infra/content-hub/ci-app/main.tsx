import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CommercialIntelligenceApp } from './src/CommercialIntelligenceApp';
import '../src/styles/globals.css';
import './src/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CommercialIntelligenceApp />
  </StrictMode>,
);
