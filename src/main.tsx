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
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './design-system/tokens.css';
import './design-system/system.css';
import './design-system/shell.css';
import './design-system/auth.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

if('serviceWorker' in navigator&&import.meta.env.PROD){
  window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js')});
}
