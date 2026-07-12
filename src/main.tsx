import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './v2.css';
import './v3.css';
import './v3-card.css';
import './portal.css';
import './workflows.css';
import './receipt-studio.css';
import './responsive.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

if('serviceWorker' in navigator&&import.meta.env.PROD){
  window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js')});
}
