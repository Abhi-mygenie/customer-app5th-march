import React, { useState, useEffect, useMemo } from 'react';
import { IoSearchOutline, IoCheckmarkCircle, IoAlertCircle } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { getRestaurantProducts } from '../../api/services/restaurantService';
import { getAvailableDietaryTags, getDietaryTagsMapping, updateDietaryTagsMapping } from '../../api/services/dietaryTagsService';
import './DietaryTagsAdmin.css';

const DietaryTagsAdmin = ({ restaurantId, token }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!restaurantId) return;
      
      setLoading(true);
      try {
        // Fetch menu items from POS API
        const productsData = await getRestaurantProducts(restaurantId, "0");
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

        // Fetch available dietary tags
        const tagsData = await getAvailableDietaryTags();
        setAvailableTags(tagsData.tags || []);

        // Fetch existing mappings
        const mappingData = await getDietaryTagsMapping(restaurantId);
        setMappings(mappingData.mappings || {});
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load menu items');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  if (loading) {
    return (
      <div className="dietary-tags-admin">
        <div className="loading-state">Loading menu items...</div>
      </div>
    );
  }

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

      {/* Stats banner */}
      {untaggedCount > 0 && (
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

      {/* Items list */}
      <div className="dietary-items-list">
        {filteredItems.length === 0 ? (
          <div className="empty-state">No items found</div>
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
    </div>
  );
};

export default DietaryTagsAdmin;
