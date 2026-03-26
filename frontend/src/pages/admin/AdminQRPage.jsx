import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAuth } from '../../context/AuthContext';
import {
  IoQrCodeOutline,
  IoDownloadOutline,
  IoRefresh,
  IoCloudDownloadOutline,
  IoRestaurantOutline,
  IoBicycleOutline,
  IoBagHandleOutline,
  IoGridOutline,
  IoBedOutline,
} from 'react-icons/io5';
import './AdminPages.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const QR_SIZE = 200;

const OrderTypeCard = ({ label, icon: Icon, url, filename }) => {
  const canvasRef = useRef(null);

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) saveAs(blob, `${filename}.png`);
    });
  };

  return (
    <div className="qr-card" data-testid={`qr-card-${filename}`}>
      <div className="qr-card-header">
        <Icon className="qr-card-icon" />
        <span className="qr-card-label">{label}</span>
      </div>
      <div className="qr-canvas-wrap" ref={canvasRef}>
        <QRCodeCanvas value={url} size={QR_SIZE} level="H" includeMargin />
      </div>
      <p className="qr-card-url" title={url}>{url}</p>
      <button className="qr-download-btn" onClick={handleDownload} data-testid={`download-${filename}`}>
        <IoDownloadOutline /> Download PNG
      </button>
    </div>
  );
};

const TableQRCard = ({ item, type, url }) => {
  const canvasRef = useRef(null);
  const label = type === 'room' ? `Room ${item.table_no}` : `Table ${item.table_no}`;
  const filename = type === 'room' ? `room-${item.table_no}` : `table-${item.table_no}`;

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) saveAs(blob, `${filename}.png`);
    });
  };

  return (
    <div className="qr-card qr-card-sm" data-testid={`qr-card-${filename}`}>
      <div className="qr-card-header">
        <span className="qr-card-label">{label}</span>
        {item.title && <span className="qr-card-subtitle">{item.title}</span>}
      </div>
      <div className="qr-canvas-wrap" ref={canvasRef}>
        <QRCodeCanvas value={url} size={160} level="H" includeMargin />
      </div>
      <button className="qr-download-btn" onClick={handleDownload} data-testid={`download-${filename}`}>
        <IoDownloadOutline /> PNG
      </button>
    </div>
  );
};

const AdminQRPage = () => {
  const { token } = useAuth();
  const [tables, setTables] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [subdomain, setSubdomain] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zipping, setZipping] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/table-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch table config');
      }
      const data = await res.json();
      setTables(data.tables || []);
      setRooms(data.rooms || []);
      setSubdomain(data.subdomain || '');
      setRestaurantId(String(data.restaurant_id || ''));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const baseUrl = subdomain ? `https://${subdomain}/${restaurantId}` : '';

  const buildTableUrl = (item, type) =>
    `${baseUrl}?tableId=${item.id}&tableName=${item.table_no}&type=${type}&orderType=dinein`;

  // Bulk download helper: renders each QR to a canvas and adds to ZIP
  const handleBulkDownload = async (items, type) => {
    if (items.length === 0) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(type === 'room' ? 'rooms' : 'tables');

      for (const item of items) {
        const url = buildTableUrl(item, type);
        const blob = await renderQRToBlob(url);
        const name = type === 'room' ? `room-${item.table_no}.png` : `table-${item.table_no}.png`;
        folder.file(name, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${type === 'room' ? 'room' : 'table'}-qr-codes.zip`);
    } catch (e) {
      console.error('ZIP generation failed:', e);
    } finally {
      setZipping(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page" data-testid="admin-qr-page">
        <h1 className="admin-page-title"><IoQrCodeOutline /> QR Codes</h1>
        <div className="qr-loading">Loading table configuration...</div>
      </div>
    );
  }

  if (error) {
    const isSessionExpired = error.toLowerCase().includes("expired") || 
                             error.toLowerCase().includes("session") ||
                             error.includes("401");
    
    return (
      <div className="admin-page" data-testid="admin-qr-page">
        <h1 className="admin-page-title"><IoQrCodeOutline /> QR Codes</h1>
        <div className="qr-error">
          {isSessionExpired ? (
            <>
              <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>⚠️ Your POS session has expired</p>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '16px' }}>
                Please logout and login again to refresh your session.
              </p>
              <button 
                className="qr-retry-btn" 
                onClick={() => window.location.href = `/${window.location.pathname.split('/')[1]}/admin`}
                style={{ backgroundColor: '#dc3545', marginRight: '10px' }}
              >
                Go to Dashboard
              </button>
            </>
          ) : (
            <>
              <p>{error}</p>
              <button className="qr-retry-btn" onClick={fetchData}><IoRefresh /> Retry</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page" data-testid="admin-qr-page">
      <h1 className="admin-page-title"><IoQrCodeOutline /> QR Codes</h1>
      <p className="admin-page-description">
        Generate and download QR codes for your restaurant. Customers scan these to place orders.
      </p>

      {/* Section A: Order Type QR Codes */}
      <div className="admin-section">
        <h2 className="admin-section-title">Order Type QR Codes</h2>
        <div className="qr-grid qr-grid-3" data-testid="order-type-qr-grid">
          <OrderTypeCard
            label="Dine-In"
            icon={IoRestaurantOutline}
            url={`${baseUrl}?orderType=dinein`}
            filename="dinein-qr"
          />
          <OrderTypeCard
            label="Delivery"
            icon={IoBicycleOutline}
            url={`${baseUrl}?orderType=delivery`}
            filename="delivery-qr"
          />
          <OrderTypeCard
            label="Take Away"
            icon={IoBagHandleOutline}
            url={`${baseUrl}?orderType=take_away`}
            filename="takeaway-qr"
          />
        </div>
      </div>

      {/* Section B: Table QR Codes */}
      {tables.length > 0 && (
        <div className="admin-section">
          <div className="qr-section-header">
            <h2 className="admin-section-title"><IoGridOutline /> Table QR Codes ({tables.length})</h2>
            <button
              className="qr-bulk-btn"
              onClick={() => handleBulkDownload(tables, 'table')}
              disabled={zipping}
              data-testid="bulk-download-tables"
            >
              <IoCloudDownloadOutline /> {zipping ? 'Zipping...' : 'Download All as ZIP'}
            </button>
          </div>
          <div className="qr-grid qr-grid-4" data-testid="table-qr-grid">
            {tables
              .sort((a, b) => {
                const numA = parseInt(a.table_no.replace(/\D/g, ''), 10) || 0;
                const numB = parseInt(b.table_no.replace(/\D/g, ''), 10) || 0;
                return numA - numB;
              })
              .map((t) => (
                <TableQRCard key={t.id} item={t} type="table" url={buildTableUrl(t, 'table')} />
              ))}
          </div>
        </div>
      )}

      {/* Section C: Room QR Codes */}
      {rooms.length > 0 && (
        <div className="admin-section">
          <div className="qr-section-header">
            <h2 className="admin-section-title"><IoBedOutline /> Room QR Codes ({rooms.length})</h2>
            <button
              className="qr-bulk-btn"
              onClick={() => handleBulkDownload(rooms, 'room')}
              disabled={zipping}
              data-testid="bulk-download-rooms"
            >
              <IoCloudDownloadOutline /> {zipping ? 'Zipping...' : 'Download All as ZIP'}
            </button>
          </div>
          <div className="qr-grid qr-grid-4" data-testid="room-qr-grid">
            {rooms
              .sort((a, b) => {
                const numA = parseInt(a.table_no.replace(/\D/g, ''), 10) || 0;
                const numB = parseInt(b.table_no.replace(/\D/g, ''), 10) || 0;
                return numA - numB;
              })
              .map((r) => (
                <TableQRCard key={r.id} item={r} type="room" url={buildTableUrl(r, 'room')} />
              ))}
          </div>
        </div>
      )}

      {/* Refresh */}
      <div className="qr-footer">
        <button className="qr-retry-btn" onClick={fetchData} data-testid="qr-refresh-btn">
          <IoRefresh /> Refresh Data
        </button>
      </div>
    </div>
  );
};

/** Offscreen QR render → Blob (for ZIP generation) */
function renderQRToBlob(url) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const size = QR_SIZE + 20; // include margin
    canvas.width = size;
    canvas.height = size;

    // Use a temporary hidden container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // Render QRCodeCanvas into the container
    const { createRoot } = require('react-dom/client');
    const root = createRoot(container);
    root.render(
      <QRCodeCanvas value={url} size={QR_SIZE} level="H" includeMargin />,
    );

    // Wait for render, then grab the canvas
    setTimeout(() => {
      const qrCanvas = container.querySelector('canvas');
      if (qrCanvas) {
        qrCanvas.toBlob((blob) => {
          root.unmount();
          document.body.removeChild(container);
          resolve(blob);
        });
      } else {
        root.unmount();
        document.body.removeChild(container);
        resolve(new Blob());
      }
    }, 100);
  });
}

export default AdminQRPage;
