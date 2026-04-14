import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useRestaurantConfig } from '../context/RestaurantConfigContext';
import { crmGetAddresses, crmAddAddress, crmDeleteAddress, crmSetDefaultAddress } from '../api/services/crmService';
import { IoArrowBack, IoLocationOutline, IoAddCircleOutline, IoTrashOutline, IoCheckmarkCircle } from 'react-icons/io5';
import { MdOutlineDeliveryDining, MdOutlineHome, MdOutlineWork, MdOutlineLocationOn } from 'react-icons/md';
import toast from 'react-hot-toast';
import './DeliveryAddress.css';

const ADDRESS_TYPE_ICONS = {
  Home: MdOutlineHome,
  Work: MdOutlineWork,
  Other: MdOutlineLocationOn,
};

const DeliveryAddress = () => {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const { crmToken, isCustomer } = useAuth();
  const { setDeliveryAddress } = useCart();
  const { primaryColor, buttonTextColor } = useRestaurantConfig();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (!crmToken || !isCustomer) {
      navigate(`/${restaurantId || ''}`);
      return;
    }
    fetchAddresses();
  }, [crmToken, isCustomer]);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const data = await crmGetAddresses(crmToken);
      const addrs = data.addresses || [];
      setAddresses(addrs);
      const defaultAddr = addrs.find(a => a.is_default);
      if (defaultAddr) setSelectedId(defaultAddr.id);
      else if (addrs.length > 0) setSelectedId(addrs[0].id);
    } catch (err) {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

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
      const newAddr = await crmAddAddress(crmToken, form);
      setAddresses(prev => [...prev, newAddr]);
      setSelectedId(newAddr.id);
      setShowForm(false);
      resetForm();
      toast.success('Address added');
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
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success('Address deleted');
    } catch (err) {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (addrId) => {
    try {
      await crmSetDefaultAddress(crmToken, addrId);
      setAddresses(prev => prev.map(a => ({
        ...a,
        is_default: a.id === addrId,
      })));
      setSelectedId(addrId);
    } catch (err) {
      toast.error('Failed to set default');
    }
  };

  const handleContinue = () => {
    const selected = addresses.find(a => a.id === selectedId);
    if (!selected) {
      toast.error('Please select a delivery address');
      return;
    }
    setDeliveryAddress(selected);
    navigate(`/${restaurantId}/menu`);
  };

  const resetForm = () => {
    setForm({
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
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="delivery-address-page" data-testid="delivery-address-loading">
        <div className="delivery-header">
          <button className="back-btn" onClick={() => navigate(-1)} data-testid="delivery-back-btn">
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
        <button className="back-btn" onClick={() => navigate(-1)} data-testid="delivery-back-btn">
          <IoArrowBack />
        </button>
        <h1 className="delivery-title">
          <MdOutlineDeliveryDining className="delivery-title-icon" />
          Delivery Address
        </h1>
      </div>

      {/* Saved Addresses */}
      <div className="delivery-addresses-list" data-testid="delivery-addresses-list">
        {addresses.length === 0 && !showForm ? (
          <div className="delivery-empty">
            <IoLocationOutline className="delivery-empty-icon" />
            <p>No saved addresses</p>
            <p className="delivery-empty-sub">Add a delivery address to continue</p>
          </div>
        ) : (
          addresses.map((addr) => {
            const TypeIcon = ADDRESS_TYPE_ICONS[addr.address_type] || MdOutlineLocationOn;
            const isSelected = selectedId === addr.id;
            return (
              <div
                key={addr.id}
                className={`delivery-address-card ${isSelected ? 'delivery-address-selected' : ''}`}
                onClick={() => setSelectedId(addr.id)}
                data-testid={`address-card-${addr.id}`}
              >
                <div className="delivery-address-top">
                  <div className="delivery-address-type">
                    <TypeIcon className="delivery-type-icon" />
                    <span className="delivery-type-label">{addr.address_type || 'Address'}</span>
                    {addr.is_default && <span className="delivery-default-badge">Default</span>}
                  </div>
                  <div className="delivery-address-actions">
                    {!addr.is_default && (
                      <button
                        className="delivery-action-btn"
                        onClick={(e) => { e.stopPropagation(); handleSetDefault(addr.id); }}
                        title="Set as default"
                        data-testid={`set-default-${addr.id}`}
                      >
                        <IoCheckmarkCircle />
                      </button>
                    )}
                    <button
                      className="delivery-action-btn delivery-delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDelete(addr.id); }}
                      title="Delete"
                      data-testid={`delete-address-${addr.id}`}
                    >
                      <IoTrashOutline />
                    </button>
                  </div>
                </div>
                <p className="delivery-address-text">
                  {[addr.house, addr.floor, addr.road, addr.address].filter(Boolean).join(', ')}
                </p>
                {addr.city && <p className="delivery-address-city">{[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</p>}
                {addr.contact_person_name && (
                  <p className="delivery-address-contact">
                    {addr.contact_person_name} • {addr.contact_person_number}
                  </p>
                )}
                {isSelected && <div className="delivery-selected-check"><IoCheckmarkCircle /></div>}
              </div>
            );
          })
        )}
      </div>

      {/* Add Address Button / Form */}
      {!showForm ? (
        <button
          className="delivery-add-btn"
          onClick={() => setShowForm(true)}
          data-testid="add-address-btn"
        >
          <IoAddCircleOutline /> Add New Address
        </button>
      ) : (
        <div className="delivery-form" data-testid="add-address-form">
          <h3 className="delivery-form-title">New Address</h3>

          {/* Address Type Toggle */}
          <div className="delivery-type-toggle">
            {['Home', 'Work', 'Other'].map(t => (
              <button
                key={t}
                className={`delivery-type-option ${form.address_type === t ? 'active' : ''}`}
                onClick={() => updateField('address_type', t)}
                data-testid={`type-${t.toLowerCase()}`}
              >
                {t}
              </button>
            ))}
          </div>

          <input
            className="delivery-input"
            placeholder="Full address *"
            value={form.address}
            onChange={e => updateField('address', e.target.value)}
            data-testid="input-address"
          />
          <div className="delivery-input-row">
            <input
              className="delivery-input"
              placeholder="House / Flat No."
              value={form.house}
              onChange={e => updateField('house', e.target.value)}
              data-testid="input-house"
            />
            <input
              className="delivery-input"
              placeholder="Floor"
              value={form.floor}
              onChange={e => updateField('floor', e.target.value)}
              data-testid="input-floor"
            />
          </div>
          <input
            className="delivery-input"
            placeholder="Road / Landmark"
            value={form.road}
            onChange={e => updateField('road', e.target.value)}
            data-testid="input-road"
          />
          <div className="delivery-input-row">
            <input
              className="delivery-input"
              placeholder="City"
              value={form.city}
              onChange={e => updateField('city', e.target.value)}
              data-testid="input-city"
            />
            <input
              className="delivery-input"
              placeholder="Pincode"
              value={form.pincode}
              onChange={e => updateField('pincode', e.target.value)}
              data-testid="input-pincode"
            />
          </div>
          <input
            className="delivery-input"
            placeholder="Contact person name *"
            value={form.contact_person_name}
            onChange={e => updateField('contact_person_name', e.target.value)}
            data-testid="input-contact-name"
          />
          <input
            className="delivery-input"
            placeholder="Contact phone *"
            value={form.contact_person_number}
            onChange={e => updateField('contact_person_number', e.target.value)}
            data-testid="input-contact-phone"
          />
          <input
            className="delivery-input"
            placeholder="Delivery instructions (optional)"
            value={form.delivery_instructions}
            onChange={e => updateField('delivery_instructions', e.target.value)}
            data-testid="input-instructions"
          />
          <div className="delivery-form-actions">
            <button className="delivery-cancel-btn" onClick={() => { setShowForm(false); resetForm(); }} data-testid="cancel-address-btn">
              Cancel
            </button>
            <button
              className="delivery-save-btn"
              onClick={handleAddAddress}
              disabled={saving}
              style={{ backgroundColor: primaryColor, color: buttonTextColor }}
              data-testid="save-address-btn"
            >
              {saving ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </div>
      )}

      {/* Continue Button */}
      {addresses.length > 0 && selectedId && (
        <div className="delivery-continue-wrapper">
          <button
            className="delivery-continue-btn"
            onClick={handleContinue}
            style={{ backgroundColor: primaryColor, color: buttonTextColor }}
            data-testid="continue-to-menu-btn"
          >
            Continue to Menu
          </button>
        </div>
      )}
    </div>
  );
};

export default DeliveryAddress;
