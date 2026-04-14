import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useRestaurantConfig } from '../context/RestaurantConfigContext';
import { crmGetAddresses, crmAddAddress, crmDeleteAddress, crmSetDefaultAddress } from '../api/services/crmService';
import { IoArrowBack, IoLocationOutline, IoAddCircleOutline, IoTrashOutline, IoCheckmarkCircle, IoNavigate } from 'react-icons/io5';
import { MdOutlineDeliveryDining, MdOutlineHome, MdOutlineWork, MdOutlineLocationOn, MdMyLocation } from 'react-icons/md';
import toast from 'react-hot-toast';
import './DeliveryAddress.css';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
const MANAGE_BASE_URL = process.env.REACT_APP_IMAGE_BASE_URL || 'https://manage.mygenie.online';

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 31.0397, lng: 77.1245 }; // Shoghi (restaurant fallback)
const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

const ADDRESS_TYPE_ICONS = {
  Home: MdOutlineHome,
  Work: MdOutlineWork,
  Other: MdOutlineLocationOn,
};

const DeliveryAddress = () => {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const { crmToken, isCustomer } = useAuth();
  const { setDeliveryAddress, setDeliveryCharge } = useCart();
  const { primaryColor, buttonTextColor } = useRestaurantConfig();

  // Google Maps loader
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  // State
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Map state
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [markerPos, setMarkerPos] = useState(DEFAULT_CENTER);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const mapRef = useRef(null);

  // Distance API state
  const [distanceResult, setDistanceResult] = useState(null); // { shipping_status, shipping_charge, shipping_time, distance_km }
  const [distanceLoading, setDistanceLoading] = useState(false);
  const distanceTimerRef = useRef(null);

  // Reverse geocode state
  const [reverseAddress, setReverseAddress] = useState('');

  // Form state
  const [form, setForm] = useState({
    address_type: 'Home',
    address: '',
    house: '',
    floor: '',
    road: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
    contact_person_name: '',
    contact_person_number: '',
    delivery_instructions: '',
  });

  // ============================================
  // Auth guard
  // ============================================
  useEffect(() => {
    if (!crmToken || !isCustomer) {
      navigate(`/${restaurantId || ''}`);
      return;
    }
    fetchAddresses();
    requestCurrentLocation();
  }, [crmToken, isCustomer]);

  // ============================================
  // Fetch saved addresses from CRM
  // ============================================
  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const data = await crmGetAddresses(crmToken);
      const addrs = data.addresses || [];
      setAddresses(addrs);
      // Pre-select default address
      const defaultAddr = addrs.find(a => a.is_default);
      const initial = defaultAddr || (addrs.length > 0 ? addrs[0] : null);
      if (initial) {
        setSelectedId(initial.id);
        if (initial.latitude && initial.longitude) {
          const pos = { lat: parseFloat(initial.latitude), lng: parseFloat(initial.longitude) };
          setMapCenter(pos);
          setMarkerPos(pos);
          checkDistance(pos.lat, pos.lng);
        }
      }
    } catch (err) {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Browser geolocation
  // ============================================
  const requestCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(pos);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setMarkerPos(currentLocation);
      setMapCenter(currentLocation);
      setSelectedId(null); // Deselect saved address
      reverseGeocode(currentLocation.lat, currentLocation.lng);
      checkDistance(currentLocation.lat, currentLocation.lng);
    } else {
      requestCurrentLocation();
      toast('Requesting location access...', { icon: '📍' });
    }
  };

  // ============================================
  // Reverse geocode (lat/lng → address text)
  // ============================================
  const reverseGeocode = useCallback(async (lat, lng) => {
    if (!GOOGLE_MAPS_API_KEY) return;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.results && data.results[0]) {
        setReverseAddress(data.results[0].formatted_address);
      }
    } catch {
      // Silent fail
    }
  }, []);

  // ============================================
  // Distance API — debounced
  // ============================================
  const checkDistance = useCallback((lat, lng) => {
    if (distanceTimerRef.current) clearTimeout(distanceTimerRef.current);
    setDistanceLoading(true);
    setDistanceResult(null);

    distanceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${MANAGE_BASE_URL}/api/v1/config/distance-api-new`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destination_lat: String(lat),
            destination_lng: String(lng),
            restaurant_id: String(restaurantId),
            order_value: '0',
          }),
        });
        const data = await res.json();
        setDistanceResult(data);
      } catch {
        setDistanceResult({ shipping_status: 'Error' });
      } finally {
        setDistanceLoading(false);
      }
    }, 500);
  }, [restaurantId]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (distanceTimerRef.current) clearTimeout(distanceTimerRef.current);
    };
  }, []);

  // ============================================
  // Address selection
  // ============================================
  const handleSelectAddress = (addr) => {
    setSelectedId(addr.id);
    setReverseAddress('');
    if (addr.latitude && addr.longitude) {
      const pos = { lat: parseFloat(addr.latitude), lng: parseFloat(addr.longitude) };
      setMarkerPos(pos);
      setMapCenter(pos);
      checkDistance(pos.lat, pos.lng);
    } else {
      // Address without lat/lng — try geocoding the address text
      geocodeAddress(addr);
    }
  };

  const geocodeAddress = async (addr) => {
    if (!GOOGLE_MAPS_API_KEY) {
      toast.error('Cannot locate this address (no map key)');
      return;
    }
    const query = [addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.results && data.results[0]) {
        const loc = data.results[0].geometry.location;
        const pos = { lat: loc.lat, lng: loc.lng };
        setMarkerPos(pos);
        setMapCenter(pos);
        checkDistance(pos.lat, pos.lng);
      } else {
        toast.error('Could not locate this address on map');
      }
    } catch {
      toast.error('Failed to geocode address');
    }
  };

  // ============================================
  // Map pin drag
  // ============================================
  const handleMarkerDragEnd = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPos({ lat, lng });
    setSelectedId(null); // Deselect saved address since pin was moved
    reverseGeocode(lat, lng);
    checkDistance(lat, lng);
  };

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // ============================================
  // Add new address
  // ============================================
  const handleAddAddress = async () => {
    if (!form.address.trim()) {
      toast.error('Please enter an address');
      return;
    }
    if (!form.contact_person_name.trim() || !form.contact_person_number.trim()) {
      toast.error('Please enter contact name and number');
      return;
    }
    setSaving(true);
    try {
      // If form doesn't have lat/lng, use current marker position
      const submitForm = { ...form };
      if (!submitForm.latitude && markerPos) {
        submitForm.latitude = String(markerPos.lat);
        submitForm.longitude = String(markerPos.lng);
      }
      const newAddr = await crmAddAddress(crmToken, submitForm);
      setAddresses(prev => [...prev, newAddr]);
      setSelectedId(newAddr.id);
      setShowForm(false);
      resetForm();
      toast.success('Address added');
      // Check distance for new address
      if (newAddr.latitude && newAddr.longitude) {
        const pos = { lat: parseFloat(newAddr.latitude), lng: parseFloat(newAddr.longitude) };
        setMarkerPos(pos);
        setMapCenter(pos);
        checkDistance(pos.lat, pos.lng);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addrId) => {
    try {
      await crmDeleteAddress(crmToken, addrId);
      setAddresses(prev => prev.filter(a => a.id !== addrId));
      if (selectedId === addrId) {
        const remaining = addresses.filter(a => a.id !== addrId);
        if (remaining.length > 0) {
          handleSelectAddress(remaining[0]);
        } else {
          setSelectedId(null);
          setDistanceResult(null);
        }
      }
      toast.success('Address deleted');
    } catch {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (addrId) => {
    try {
      await crmSetDefaultAddress(crmToken, addrId);
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === addrId })));
    } catch {
      toast.error('Failed to set default');
    }
  };

  // ============================================
  // Continue to menu
  // ============================================
  const handleContinue = () => {
    const selected = addresses.find(a => a.id === selectedId);

    // Build address object for cart
    const addressForCart = selected || {
      address: reverseAddress,
      latitude: String(markerPos.lat),
      longitude: String(markerPos.lng),
    };

    if (!addressForCart.latitude && !markerPos) {
      toast.error('Please select a delivery address');
      return;
    }

    // Ensure lat/lng from marker if missing
    if (!addressForCart.latitude) {
      addressForCart.latitude = String(markerPos.lat);
      addressForCart.longitude = String(markerPos.lng);
    }

    // Store in cart
    setDeliveryAddress(addressForCart);
    setDeliveryCharge(distanceResult?.shipping_charge || 0);
    navigate(`/${restaurantId}/menu`);
  };

  const resetForm = () => {
    setForm({
      address_type: 'Home', address: '', house: '', floor: '', road: '',
      city: '', state: '', pincode: '', latitude: '', longitude: '',
      contact_person_name: '', contact_person_number: '', delivery_instructions: '',
    });
  };

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // ============================================
  // Derived state
  // ============================================
  const isDeliverable = distanceResult?.shipping_status === 'Yes';
  const isNotDeliverable = distanceResult?.shipping_status === 'No';
  const isDistanceError = distanceResult?.shipping_status === 'Error';
  const selectedAddress = addresses.find(a => a.id === selectedId);
  const displayAddress = selectedAddress
    ? [selectedAddress.house, selectedAddress.address, selectedAddress.city].filter(Boolean).join(', ')
    : reverseAddress || '';

  // ============================================
  // Render
  // ============================================
  if (loading) {
    return (
      <div className="delivery-address-page" data-testid="delivery-address-loading">
        <div className="delivery-header">
          <button className="da-back-btn" onClick={() => navigate(-1)} data-testid="delivery-back-btn">
            <IoArrowBack />
          </button>
          <h1 className="delivery-title">Delivery Address</h1>
        </div>
        <div className="delivery-loading">Loading addresses...</div>
      </div>
    );
  }

  return (
    <div className="delivery-address-page" data-testid="delivery-address-page">
      {/* Header */}
      <div className="delivery-header">
        <button className="da-back-btn" onClick={() => navigate(-1)} data-testid="delivery-back-btn">
          <IoArrowBack />
        </button>
        <h1 className="delivery-title">
          <MdOutlineDeliveryDining className="delivery-title-icon" />
          Delivery Address
        </h1>
      </div>

      {/* Map Section */}
      <div className="da-map-container" data-testid="map-container">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={mapCenter}
            zoom={15}
            options={MAP_OPTIONS}
            onLoad={onMapLoad}
          >
            <Marker
              position={markerPos}
              draggable
              onDragEnd={handleMarkerDragEnd}
            />
          </GoogleMap>
        ) : (
          <div className="da-map-placeholder">Loading map...</div>
        )}
        {/* Use Current Location button on map */}
        <button
          className="da-current-location-btn"
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
          data-testid="use-current-location-btn"
        >
          <MdMyLocation />
        </button>
      </div>

      {/* Selected address display */}
      <div className="da-selected-display" data-testid="selected-address-display">
        <IoLocationOutline className="da-selected-icon" />
        <div className="da-selected-text">
          {displayAddress || 'Drag pin or select an address below'}
        </div>
      </div>

      {/* Distance result bar */}
      <div className="da-distance-bar" data-testid="distance-bar">
        {distanceLoading && (
          <div className="da-distance-checking" data-testid="distance-checking">
            Checking delivery availability...
          </div>
        )}
        {isDeliverable && !distanceLoading && (
          <div className="da-distance-ok" data-testid="distance-ok">
            <MdOutlineDeliveryDining className="da-distance-icon" />
            <span className="da-distance-charge">
              {distanceResult.shipping_charge > 0
                ? `Delivery: ₹${distanceResult.shipping_charge}`
                : 'Free Delivery'}
            </span>
            <span className="da-distance-dot">•</span>
            <span className="da-distance-time">{distanceResult.shipping_time}</span>
            <span className="da-distance-dot">•</span>
            <span className="da-distance-km">{distanceResult.distance}</span>
          </div>
        )}
        {isNotDeliverable && !distanceLoading && (
          <div className="da-distance-no" data-testid="distance-not-available">
            Delivery not available to this location ({distanceResult.distance})
          </div>
        )}
        {isDistanceError && !distanceLoading && (
          <div className="da-distance-error" data-testid="distance-error">
            Unable to check delivery. Please try again.
          </div>
        )}
      </div>

      {/* Saved Addresses */}
      <div className="da-section-label">Saved Addresses</div>
      <div className="da-addresses-scroll" data-testid="delivery-addresses-list">
        {addresses.length === 0 && !showForm ? (
          <div className="da-empty" data-testid="no-addresses">
            <IoLocationOutline className="da-empty-icon" />
            <p>No saved addresses</p>
          </div>
        ) : (
          addresses.map((addr) => {
            const TypeIcon = ADDRESS_TYPE_ICONS[addr.address_type] || MdOutlineLocationOn;
            const isSelected = selectedId === addr.id;
            return (
              <div
                key={addr.id}
                className={`da-address-card ${isSelected ? 'da-card-selected' : ''}`}
                onClick={() => handleSelectAddress(addr)}
                data-testid={`address-card-${addr.id}`}
              >
                <div className="da-card-left">
                  <TypeIcon className="da-card-type-icon" />
                </div>
                <div className="da-card-content">
                  <div className="da-card-type-row">
                    <span className="da-card-type-label">{addr.address_type || 'Address'}</span>
                    {addr.is_default && <span className="da-card-default">Default</span>}
                  </div>
                  <p className="da-card-address">
                    {[addr.house, addr.address, addr.city].filter(Boolean).join(', ')}
                  </p>
                  {addr.contact_person_name && (
                    <p className="da-card-contact">{addr.contact_person_name}</p>
                  )}
                </div>
                <div className="da-card-right">
                  {isSelected && <IoCheckmarkCircle className="da-card-check" />}
                  <div className="da-card-actions">
                    {!addr.is_default && (
                      <button
                        className="da-action-btn"
                        onClick={(e) => { e.stopPropagation(); handleSetDefault(addr.id); }}
                        title="Set default"
                        data-testid={`set-default-${addr.id}`}
                      >
                        <IoCheckmarkCircle />
                      </button>
                    )}
                    <button
                      className="da-action-btn da-delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDelete(addr.id); }}
                      title="Delete"
                      data-testid={`delete-address-${addr.id}`}
                    >
                      <IoTrashOutline />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Add New Address Button */}
        {!showForm && (
          <button
            className="da-add-btn"
            onClick={() => setShowForm(true)}
            data-testid="add-address-btn"
          >
            <IoAddCircleOutline /> Add New Address
          </button>
        )}
      </div>

      {/* Add Address Form */}
      {showForm && (
        <div className="da-form" data-testid="add-address-form">
          <h3 className="da-form-title">New Address</h3>
          <p className="da-form-hint">Drag the pin on the map to set location</p>

          <div className="da-type-toggle">
            {['Home', 'Work', 'Other'].map(t => (
              <button
                key={t}
                className={`da-type-option ${form.address_type === t ? 'da-type-active' : ''}`}
                onClick={() => updateField('address_type', t)}
                style={form.address_type === t ? { backgroundColor: primaryColor, color: buttonTextColor } : {}}
                data-testid={`type-${t.toLowerCase()}`}
              >
                {t}
              </button>
            ))}
          </div>

          <input className="da-input" placeholder="Full address *" value={form.address}
            onChange={e => updateField('address', e.target.value)} data-testid="input-address" />
          <div className="da-input-row">
            <input className="da-input" placeholder="House / Flat No." value={form.house}
              onChange={e => updateField('house', e.target.value)} data-testid="input-house" />
            <input className="da-input" placeholder="Floor" value={form.floor}
              onChange={e => updateField('floor', e.target.value)} data-testid="input-floor" />
          </div>
          <input className="da-input" placeholder="Road / Landmark" value={form.road}
            onChange={e => updateField('road', e.target.value)} data-testid="input-road" />
          <div className="da-input-row">
            <input className="da-input" placeholder="City" value={form.city}
              onChange={e => updateField('city', e.target.value)} data-testid="input-city" />
            <input className="da-input" placeholder="Pincode" value={form.pincode}
              onChange={e => updateField('pincode', e.target.value)} data-testid="input-pincode" />
          </div>
          <input className="da-input" placeholder="Contact name *" value={form.contact_person_name}
            onChange={e => updateField('contact_person_name', e.target.value)} data-testid="input-contact-name" />
          <input className="da-input" placeholder="Contact phone *" value={form.contact_person_number}
            onChange={e => updateField('contact_person_number', e.target.value)} data-testid="input-contact-phone" />
          <input className="da-input" placeholder="Delivery instructions (optional)" value={form.delivery_instructions}
            onChange={e => updateField('delivery_instructions', e.target.value)} data-testid="input-instructions" />

          <div className="da-form-actions">
            <button className="da-cancel-btn" onClick={() => { setShowForm(false); resetForm(); }} data-testid="cancel-address-btn">
              Cancel
            </button>
            <button className="da-save-btn" onClick={handleAddAddress} disabled={saving}
              style={{ backgroundColor: primaryColor, color: buttonTextColor }} data-testid="save-address-btn">
              {saving ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="da-continue-wrapper">
        <button
          className="da-continue-btn"
          onClick={handleContinue}
          disabled={distanceLoading || isNotDeliverable || (!selectedId && !reverseAddress)}
          style={{
            backgroundColor: (distanceLoading || isNotDeliverable) ? '#ccc' : primaryColor,
            color: (distanceLoading || isNotDeliverable) ? '#666' : buttonTextColor,
          }}
          data-testid="continue-to-menu-btn"
        >
          {distanceLoading ? 'Checking...' : isNotDeliverable ? 'Not Deliverable' : 'Confirm & Proceed to Menu'}
        </button>
      </div>
    </div>
  );
};

export default DeliveryAddress;
