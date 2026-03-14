import React, { useState, useEffect, useMemo } from 'react';
import { IoSearchOutline, IoCheckmarkCircle, IoAlertCircle } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { getRestaurantProducts } from '../../api/services/restaurantService';
import { getAvailableDietaryTags, getDietaryTagsMapping, updateDietaryTagsMapping } from '../../api/services/dietaryTagsService';
import './DietaryTagsAdmin.css';

const DietaryTagsAdmin = ({ restaurantId, token, multipleMenu = false }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Multi-menu states
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);

  // Load stations for multi-menu restaurants
  useEffect(() => {
    if (multipleMenu) {
      try {
        const stationsData = require('../../data/stations.json');
        setStations(stationsData || []);
      } catch (error) {
        console.error('Failed to load stations:', error);
        setStations([]);
      }
    }
  }, [multipleMenu]);

  // Fetch menu items and tags
  useEffect(() => {
    const fetchData = async () => {
      if (!restaurantId) return;
      
      // For multi-menu, wait until a station is selected
      if (multipleMenu && !selectedStation) {
        setLoading(false);
        setMenuItems([]);
        return;
      }
      
      setLoading(true);
      try {
        // Fetch menu items from POS API (with station filter for multi-menu)
        const productsData = await getRestaurantProducts(
          restaurantId, 
          "0",
          multipleMenu ? selectedStation : null
        );
        const products = productsData?.products || [];
        
        // Flatten items from all categories
        const allItems = [];
        products.forEach(category => {
          (category.items || []).forEach(item => {
            allItems.push({
              id: String(item.id),
              name: item.name || '',
              categoryName: category.category_name || '',
              categoryId: category.category_id || '',
              isVeg: item.veg === 1,
              isEgg: item.veg === 2,
            });
          });
        });
        setMenuItems(allItems);

        // Fetch available dietary tags (only once)
        if (availableTags.length === 0) {
          const tagsData = await getAvailableDietaryTags();
          setAvailableTags(tagsData.tags || []);
        }

        // Fetch existing mappings (only once)
        if (Object.keys(mappings).length === 0) {
          const mappingData = await getDietaryTagsMapping(restaurantId);
          setMappings(mappingData.mappings || {});
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load menu items');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId, multipleMenu, selectedStation]);

  // Initial fetch for tags and mappings (separate from menu items)
  useEffect(() => {
    const fetchTagsAndMappings = async () => {
      if (!restaurantId) return;
      
      try {
        const [tagsData, mappingData] = await Promise.all([
          getAvailableDietaryTags(),
          getDietaryTagsMapping(restaurantId)
        ]);
        setAvailableTags(tagsData.tags || []);
        setMappings(mappingData.mappings || {});
      } catch (error) {
        console.error('Error fetching tags/mappings:', error);
      }
    };

    fetchTagsAndMappings();
  }, [restaurantId]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set();
    menuItems.forEach(item => cats.add(item.categoryName));
    return Array.from(cats).sort();
  }, [menuItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = menuItems;
    
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.categoryName === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.categoryName.toLowerCase().includes(query)
      );
    }
    
    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  // Count untagged items
  const untaggedCount = useMemo(() => {
    return menuItems.filter(item => {
      const itemTags = mappings[item.id] || [];
      return itemTags.length === 0;
    }).length;
  }, [menuItems, mappings]);

  // Toggle a tag for an item
  const toggleTag = (itemId, tagId) => {
    setMappings(prev => {
      const currentTags = prev[itemId] || [];
      let newTags;
      
      if (currentTags.includes(tagId)) {
        newTags = currentTags.filter(t => t !== tagId);
      } else {
        newTags = [...currentTags, tagId];
      }
      
      setHasChanges(true);
      return {
        ...prev,
        [itemId]: newTags,
      };
    });
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDietaryTagsMapping(restaurantId, mappings, token);
      toast.success('Dietary tags saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save dietary tags');
    } finally {
      setSaving(false);
    }
  };

  // Get selected station name
  const selectedStationName = useMemo(() => {
    if (!selectedStation) return '';
    const station = stations.find(s => s.id === selectedStation);
    return station?.name || selectedStation;
  }, [selectedStation, stations]);

  return (
    <div className="dietary-tags-admin" data-testid="dietary-tags-admin">
      <div className="dietary-tags-header">
        <h3 className="section-title">
          🏷️ Dietary Tags Management
        </h3>
        <p className="section-description">
          Assign dietary tags to menu items. Customers can filter menu by these tags.
        </p>
      </div>

      {/* Station Selector for Multi-Menu Restaurants */}
      {multipleMenu && stations.length > 0 && (
        <div className="station-selector" data-testid="station-selector">
          <h4 className="station-selector-title">Select Menu</h4>
          <div className="station-tabs">
            {stations.map(station => (
              <button
                key={station.id}
                className={`station-tab ${selectedStation === station.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedStation(station.id);
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                data-testid={`station-tab-${station.id}`}
              >
                <span className="station-name">{station.name}</span>
                {station.timing && (
                  <span className="station-timing">{station.timing}</span>
                )}
              </button>
            ))}
          </div>
          
          {!selectedStation && (
            <div className="select-station-prompt">
              <span className="prompt-icon">👆</span>
              <span>Select a menu to view and tag items</span>
            </div>
          )}
        </div>
      )}

      {/* Show content only if not multi-menu OR station is selected */}
      {(!multipleMenu || selectedStation) && (
        <>
          {/* Selected menu indicator */}
          {multipleMenu && selectedStation && (
            <div className="selected-menu-indicator">
              Showing items from: <strong>{selectedStationName}</strong>
              {menuItems.length > 0 && <span className="item-count">({menuItems.length} items)</span>}
            </div>
          )}

          {/* Stats banner */}
          {untaggedCount > 0 && !loading && (
            <div className="untagged-banner" data-testid="untagged-banner">
              <IoAlertCircle className="banner-icon" />
              <span>{untaggedCount} item{untaggedCount > 1 ? 's' : ''} need dietary tagging</span>
            </div>
          )}

          {/* Filters row */}
          <div className="dietary-filters-row">
            <div className="dietary-search">
              <IoSearchOutline className="search-icon" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="dietary-search-input"
              />
            </div>
            
            <select
              className="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              data-testid="dietary-category-filter"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Tag legend */}
          <div className="tag-legend">
            {availableTags.map(tag => (
              <span key={tag.id} className="tag-legend-item">
                <span className="tag-icon">{tag.icon}</span>
                {tag.label}
              </span>
            ))}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="loading-state">Loading menu items...</div>
          )}

          {/* Items list */}
          {!loading && (
            <div className="dietary-items-list">
              {filteredItems.length === 0 ? (
                <div className="empty-state">
                  {menuItems.length === 0 
                    ? 'No items found in this menu' 
                    : 'No items match your search'}
                </div>
              ) : (
                filteredItems.map(item => {
                  const itemTags = mappings[item.id] || [];
                  const hasNoTags = itemTags.length === 0;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`dietary-item-card ${hasNoTags ? 'needs-tagging' : ''}`}
                      data-testid={`dietary-item-${item.id}`}
                    >
                      <div className="item-info">
                        <div className="item-name-row">
                          <span className={`veg-indicator ${item.isVeg ? 'veg' : item.isEgg ? 'egg' : 'non-veg'}`}>
                            <span className="veg-dot"></span>
                          </span>
                          <span className="item-name">{item.name}</span>
                          {hasNoTags && <span className="new-badge">NEW</span>}
                        </div>
                        <span className="item-category">{item.categoryName}</span>
                      </div>
                      
                      <div className="item-tags">
                        {availableTags.map(tag => (
                          <button
                            key={tag.id}
                            className={`tag-checkbox ${itemTags.includes(tag.id) ? 'checked' : ''}`}
                            onClick={() => toggleTag(item.id, tag.id)}
                            title={tag.label}
                            data-testid={`tag-${item.id}-${tag.id}`}
                          >
                            <span className="tag-icon">{tag.icon}</span>
                            {itemTags.includes(tag.id) && (
                              <IoCheckmarkCircle className="check-icon" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Save button */}
          {hasChanges && (
            <div className="dietary-save-bar">
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={saving}
                data-testid="save-dietary-tags-btn"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DietaryTagsAdmin;
