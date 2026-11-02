import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AdminProviders } from './components/AdminProviders';
import App from './App';
import './app/globals.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <AdminProviders>
          <App />
        </AdminProviders>
      </BrowserRouter>
    </React.StrictMode>,
  );
}
