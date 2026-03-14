import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import SearchAndFilterBar from '../components/SearchAndFilterBar/SearchAndFilterBar';
// import SearchBar from '../components/SearchBar/SearchBar'; // Commented out - using merged component
// import FilterPanel from '../components/FilterPanel/FilterPanel'; // Commented out - using merged component
import MenuPanel from '../components/MenuPanel/MenuPanel';
import CategoryBox from '../components/CategoryBox/CategoryBox';
import MenuItem from '../components/MenuItem/MenuItem';
import Footer from '../components/Footer/Footer';
import CustomizeItemModal from '../components/CustomizeItemModal/CustomizeItemModal';
import RepeatItemModal from '../components/RepeatItemModal/RepeatItemModal';
import { MenuItemSkeleton, HeaderSkeleton, CategoryBoxSkeleton } from '../components/SkeletonLoaders';
import PromoBanner from '../components/PromoBanner/PromoBanner';
import { useMenuSections, useStations, useRestaurantDetails, useDietaryTags } from '../hooks/useMenuData';
import { isMultipleMenu } from '../api/utils/restaurantIdConfig';
import { useRestaurantId } from '../utils/useRestaurantId';
import { useRestaurantConfig } from '../context/RestaurantConfigContext';
import { useCart } from '../context/CartContext';
import { getAllergenIcon } from '../utils/allergenIcons';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { isRestaurantOpen } from '../utils/itemAvailability';
import './MenuItems.css';

const MenuItems = () => {
  const { stationId } = useParams();
  const navigate = useNavigate();
  const { restaurantId } = useRestaurantId();
  const { showFooter: configShowFooter, showPromotionsOnMenu: configShowPromotionsOnMenu, showCategories: configShowCategories, showMenuFab: configShowMenuFab, fetchConfig, logoUrl: configLogoUrl, phone: configPhone, banners: configBanners, restaurantOpeningTime, restaurantClosingTime, menuOrder } = useRestaurantConfig();
  const [stationName, setStationName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeDietaryTags, setActiveDietaryTags] = useState([]);
  const [isMenuPanelOpen, setIsMenuPanelOpen] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [descriptionLimit, setDescriptionLimit] = useState(40);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [selectedItemForCustomization, setSelectedItemForCustomization] = useState(null);
  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [selectedItemForRepeat, setSelectedItemForRepeat] = useState(null);
  const categoryHeaderRef = useRef(null);


  // Fetch restaurant details FIRST to get numeric ID
  const { restaurant, loading: restaurantLoading, isFetching: restaurantFetching } = useRestaurantDetails(restaurantId);
  
  // Use numeric ID from restaurant-info response, fallback to restaurantId
  const numericRestaurantId = restaurant?.id?.toString() || restaurantId;

  // Fetch menu sections from API (wait for numeric ID)
  const { menuSections: rawMenuSections, loading: menuLoading, error: menuError, errorMessage: menuErrorMessage } = useMenuSections(stationId, numericRestaurantId);

  // Fetch dietary tags for this restaurant
  const { dietaryTagsMapping, availableTags, loading: dietaryLoading } = useDietaryTags(numericRestaurantId);

  // Apply category order and visibility from admin config
  const menuSections = useMemo(() => {
    if (!rawMenuSections || rawMenuSections.length === 0) return rawMenuSections || [];

    // For multiple-menu restaurants, use station-specific category order
    const categoryOrder = stationId
      ? (menuOrder?.stationCategoryOrder?.[stationId] || [])
      : (menuOrder?.categoryOrder || []);
    const categoryVisibility = stationId
      ? (menuOrder?.stationCategoryVisibility?.[stationId] || {})
      : (menuOrder?.categoryVisibility || {});

    if (categoryOrder.length === 0) return rawMenuSections;

    const ordered = [];
    const seen = new Set();

    for (const cat of categoryOrder) {
      const section = rawMenuSections.find(s => {
        const sectionId = s.categoryId || s.sectionName;
        return String(sectionId) === String(cat.id) || s.sectionName === cat.name;
      });
      if (section) {
        if (categoryVisibility[cat.id] !== false) {
          ordered.push(section);
        }
        seen.add(section.sectionName);
      }
    }

    for (const section of rawMenuSections) {
      if (!seen.has(section.sectionName)) {
        ordered.push(section);
      }
    }

    return ordered;
  }, [rawMenuSections, menuOrder, stationId]);

  // Fetch stations for menu panel
  const { stations: stationsData } = useStations(numericRestaurantId);

  // Check if online ordering is enabled AND restaurant is currently open
  const isOnlineOrderEnabled = (restaurant?.online_order === 'Yes' || restaurant?.online_order === undefined) 
    && isRestaurantOpen(restaurantOpeningTime, restaurantClosingTime);

  // Fetch admin config for this restaurant
  useEffect(() => {
    if (restaurantId) {
      fetchConfig(restaurantId);
    }
  }, [restaurantId, fetchConfig]);

  // Cart functionality
  const { addToCart, updateQuantity, getTotalQuantityForItem, cartItems, isEditMode, editingOrderId, clearEditMode } = useCart();

  // Get current time in seconds since midnight (updates every 60 seconds) - for item availability
  const currentTimeInSeconds = useCurrentTime();

  // Update current time every minute for station availability (IST timezone)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Check if station is available based on IST timing
  const isStationAvailable = useCallback((timing) => {
    if (!timing || timing === "") return true; // Always available if no timing specified

    // Get current time in IST (using cached currentTime state)
    const istTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const currentHour = istTime.getHours();
    const currentMinute = istTime.getMinutes();

    // Parse timing string like "(7 am - 11 am)" or "(11 am - 11 pm)"
    const timingMatch = timing.match(/\((\d+)\s*(am|pm)\s*-\s*(\d+)\s*(am|pm)\)/i);
    if (!timingMatch) return true; // If timing format is invalid, allow access

    let startHour = parseInt(timingMatch[1]);
    const startPeriod = timingMatch[2].toLowerCase();
    let endHour = parseInt(timingMatch[3]);
    const endPeriod = timingMatch[4].toLowerCase();

    // Convert to 24-hour format
    if (startPeriod === 'pm' && startHour !== 12) startHour += 12;
    if (startPeriod === 'am' && startHour === 12) startHour = 0;
    if (endPeriod === 'pm' && endHour !== 12) endHour += 12;
    if (endPeriod === 'am' && endHour === 12) endHour = 0;

    // Create time values for comparison (hours * 60 + minutes)
    const currentTimeValue = currentHour * 60 + currentMinute;
    const startTimeValue = startHour * 60;
    const endTimeValue = endHour * 60;

    return currentTimeValue >= startTimeValue && currentTimeValue < endTimeValue;
  }, [currentTime]);

  // Check if current station is unavailable and redirect
  useEffect(() => {
    if (stationId && stationsData.length > 0) {
      const currentStation = stationsData.find(s => s.id === stationId);
      if (currentStation && !isStationAvailable(currentStation.timing)) {
        // Redirect to stations route if current station is unavailable
        if (restaurantId) {
          navigate(`/${restaurantId}/stations`);
        } else {
          navigate('/menu');
        }
      }
    }
  }, [stationId, stationsData, currentTime, restaurantId, navigate, isStationAvailable]);

  // Debug: Log menu sections data
  // useEffect(() => {
  //   console.log('MenuItems - menuSections:', menuSections);
  //   console.log('MenuItems - loading:', menuLoading);
  //   console.log('MenuItems - error:', menuError);
  //   console.log('MenuItems - restaurantId:', restaurantId);
  //   console.log('MenuItems - stationId:', stationId);
  // }, [menuSections, menuLoading, menuError, restaurantId, stationId]);

  // Detect screen size for description limit
  useEffect(() => {
    const updateDescriptionLimit = () => {
      if (window.innerWidth >= 1024) {
        setDescriptionLimit(150);
      } else {
        setDescriptionLimit(40);
      }
    };

    updateDescriptionLimit();
    window.addEventListener('resize', updateDescriptionLimit);

    return () => window.removeEventListener('resize', updateDescriptionLimit);
  }, []);

  useEffect(() => {
    if (stationsData && stationsData.length > 0) {
      const station = stationsData.find(s => s.id === stationId);
      if (station) {
        setStationName(station.name);
      }
    }
  }, [stationId, stationsData]);

  // Reset selectedCategory when station changes
  useEffect(() => {
    setSelectedCategory(null);
  }, [stationId]);

  const toggleMenuPanel = () => {
    setIsMenuPanelOpen(!isMenuPanelOpen);
  };

  const closeMenuPanel = () => {
    setIsMenuPanelOpen(false);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      setSearchQuery('');
    }
  };

  const handleBackToMenu = () => {
    // Preserve restaurant ID in navigation
    if (stationId) {
      navigate(`/${restaurantId}/stations`);
    } else {
      navigate(`/${restaurantId}`);
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  // const handleCategoryClick = (categoryName) => {
  //   if (selectedCategory === categoryName) {
  //     setSelectedCategory(null);
  //   } else {
  //     setSelectedCategory(categoryName);
  //     setTimeout(() => {
  //       document.getElementById('items-section')?.scrollIntoView({ behavior: 'smooth' });
  //     }, 100);
  //   }
  //   closeMenuPanel();
  // };
  const handleCategoryClick = (categoryName) => {
    if (selectedCategory === categoryName) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryName);
      setTimeout(() => {
        if (categoryHeaderRef.current) {
          const headerRect = categoryHeaderRef.current.getBoundingClientRect();
          const absoluteTop = headerRect.top + window.pageYOffset;

          // Offset accounts for:
          // - Header (60px)
          // - Search bar (if visible)
          // - Filter bar (60px)
          // - Padding (20px)
          const offset = 120; // Adjust this value to fine-tune

          window.scrollTo({
            top: absoluteTop - offset,
            behavior: 'smooth'
          });
        }
      }, 100); // Delay allows React to render the category header first
    }
    closeMenuPanel();
  };


  const handleAllCategoryClick = () => {
    setSelectedCategory(null);
    setTimeout(() => {
      document.getElementById('items-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleStationClickFromPanel = (newStationId) => {
    // Check if station is available before navigation
    const targetStation = stationsData.find(s => s.id === newStationId);
    if (targetStation && !isStationAvailable(targetStation.timing)) {
      // Don't navigate if station is unavailable
      closeMenuPanel();
      return;
    }

    // Preserve restaurant ID in navigation
    if (restaurantId) {
      navigate(`/${restaurantId}/menu/${newStationId}`);
    } else {
      navigate(`/menu/${newStationId}`);
    }
    closeMenuPanel();
  };

  const toggleDescription = (itemId) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const filterItems = (items) => {
    let filtered = items;

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Veg/Non-Veg/Egg filter (single select)
    if (activeFilter === 'veg') {
      filtered = filtered.filter(item => item.isVeg === true);
    } else if (activeFilter === 'non-veg') {
      filtered = filtered.filter(item => item.isVeg === false && item.isEgg !== true);
    } else if (activeFilter === 'egg') {
      filtered = filtered.filter(item => item.isEgg === true);
    }

    // Dietary tags filter (multi-select, AND logic)
    if (activeDietaryTags.length > 0 && dietaryTagsMapping) {
      filtered = filtered.filter(item => {
        const itemTags = dietaryTagsMapping[item.id] || [];
        // Item must have ALL selected tags
        return activeDietaryTags.every(tag => itemTags.includes(tag));
      });
    }

    return filtered;
  };

  /**
   * Reorder items: items in cart move to top, sorted by addedAt (newest first)
   */

  const reorderItemsByCart = useCallback((items) => {
    if (!items || items.length === 0) return items;

    const itemsInCart = [];
    const itemsNotInCart = [];

    items.forEach(item => {
      // Check if ANY variation of this item is in cart
      const isInCart = cartItems.some(ci => String(ci.itemId) === String(item.id));

      if (isInCart) {
        // Find the most recent cart item for this itemId - FIX: Use String() conversion
        const cartItem = cartItems
          .filter(ci => String(ci.itemId) === String(item.id))  // ✅ Add String() conversion
          .sort((a, b) => b.addedAt - a.addedAt)[0]; // Get most recent

        if (cartItem) {  // ✅ Add safety check
          itemsInCart.push({
            ...item,
            _cartAddedAt: cartItem.addedAt // Store addedAt for sorting
          });
        }
      } else {
        itemsNotInCart.push(item);
      }
    });

    // Sort items in cart by addedAt (newest first)
    itemsInCart.sort((a, b) => (b._cartAddedAt || 0) - (a._cartAddedAt || 0));

    // Remove the temporary _cartAddedAt property
    const cleanedItemsInCart = itemsInCart.map(({ _cartAddedAt, ...item }) => item);

    return [...cleanedItemsInCart, ...itemsNotInCart];
  }, [cartItems]);
  /**
   * Handle add to cart button click
   */
  const handleAddToCart = useCallback((item) => {
    const hasVariations = item.variations && item.variations.length > 0;
    const hasAddOns = item.add_ons && item.add_ons.length > 0;

    if (hasVariations || hasAddOns) {
      // Open customization modal
      setSelectedItemForCustomization(item);
      setCustomizeModalOpen(true);
    } else {
      // No variations/add-ons, add directly to cart
      addToCart(item, [], []);
    }
  }, [addToCart]);

  /**
   * Handle close customization modal
   */
  const handleCloseCustomizeModal = useCallback(() => {
    setCustomizeModalOpen(false);
    setSelectedItemForCustomization(null);
  }, []);

  /**
   * Handle add to cart from customization modal
   */
  const handleAddToCartFromModal = useCallback((item, variations, add_ons) => {
    addToCart(item, variations, add_ons);
  }, [addToCart]);

  /**
   * Handle close repeat modal
   */
  const handleCloseRepeatModal = useCallback(() => {
    setRepeatModalOpen(false);
    setSelectedItemForRepeat(null);
  }, []);

  /**
   * Handle REPEAT action - increment existing cart item with same customizations
   */
  const handleRepeat = useCallback((item) => {
    // Find the most recent cart item for this itemId
    const cartItem = cartItems
      .filter(ci => ci.itemId === item.id)
      .sort((a, b) => b.addedAt - a.addedAt)[0]; // Get most recent

    if (cartItem) {
      // Increment the existing cart item (same variations/add-ons)
      updateQuantity(cartItem.cartId, cartItem.quantity + 1);
    }
    setRepeatModalOpen(false);
    setSelectedItemForRepeat(null);
  }, [cartItems, updateQuantity]);

  /**
   * Handle CUSTOMIZE action - open customization modal
   */
  const handleCustomizeFromRepeat = useCallback((item) => {
    setRepeatModalOpen(false);
    setSelectedItemForRepeat(null);
    setSelectedItemForCustomization(item);
    setCustomizeModalOpen(true);
  }, []);

  /**
   * Handle quantity increment
   */
  const handleIncrement = useCallback((item) => {
    const hasVariations = item.variations && item.variations.length > 0;
    const hasAddOns = item.add_ons && item.add_ons.length > 0;

    if (hasVariations || hasAddOns) {
      // Show repeat modal for items with variations/add-ons
      setSelectedItemForRepeat(item);
      setRepeatModalOpen(true);
    } else {
      // No variations/add-ons, increment directly
      const cartItem = cartItems.find(ci => ci.itemId === item.id);
      if (cartItem) {
        updateQuantity(cartItem.cartId, cartItem.quantity + 1);
      } else {
        // Not in cart, add it
        addToCart(item, [], []);
      }
    }
  }, [cartItems, updateQuantity, addToCart]);

  /**
   * Handle quantity decrement
   */
  const handleDecrement = useCallback((item) => {
    // Find the first/most recent cart item for this itemId
    const cartItem = cartItems
      .filter(ci => ci.itemId === item.id)
      .sort((a, b) => b.addedAt - a.addedAt)[0]; // Get most recent

    if (cartItem) {
      if (cartItem.quantity > 1) {
        updateQuantity(cartItem.cartId, cartItem.quantity - 1);
      } else {
        // Remove from cart when quantity reaches 0
        updateQuantity(cartItem.cartId, 0);
      }
    }
  }, [cartItems, updateQuantity]);

  return (
    <div className="menu-items-page">
      <div className="review-order-page page-transition">

        {/* Show skeleton loader when restaurant data is loading or fetching */}
        {(restaurantLoading || restaurantFetching) ? (
          <HeaderSkeleton showSearchIcon={true} />
        ) : (
          <Header
            brandText={restaurant?.name}
            logoUrl={configLogoUrl || '/assets/images/ic_login_logo.png'}
            phone={configPhone || restaurant?.phone}
            onLogoClick={() => navigate(`/${restaurantId}`)}
          />
        )}

        {/* {showSearch && (
        <SearchBar
          isVisible={showSearch}
          searchQuery={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
        />
      )} */}

        <MenuPanel
          isOpen={isMenuPanelOpen}
          onClose={closeMenuPanel}
          stationName={stationName}
          menuSections={menuSections}
          stationsData={
            isMultipleMenu(restaurant, restaurantId)
              ? stationsData.filter(station => {
                // Always show current station
                if (station.id === stationId) return true;
                // Only show available stations
                return isStationAvailable(station.timing);
              })
              : []  // Empty for non-multiple-menu restaurants - show categories instead
          }
          currentStationId={stationId}
          onCategoryClick={handleCategoryClick}
          onStationClick={handleStationClickFromPanel}
          selectedCategory={selectedCategory}
        />

        <div className="menu-items-content">

          {/* Error Message */}
          {menuError && (
            <div className="error-message">
              <p>{menuErrorMessage || 'Failed to load menu items. Please try again.'}</p>
            </div>
          )}

          {/* Search + Filter Bar (top) */}
          <SearchAndFilterBar
            searchQuery={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
          />

          {/* Edit Order Mode Banner */}
          {isEditMode && (
            <div className="edit-mode-banner" data-testid="edit-mode-banner">
              <div className="edit-mode-banner-content">
                <span className="edit-mode-banner-text">
                  Adding items to Order #{editingOrderId}
                </span>
                <button 
                  className="edit-mode-banner-cancel"
                  onClick={clearEditMode}
                  data-testid="cancel-edit-mode-btn"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          )}

          {/* Promo Banner - controlled by admin config, filtered for menu page */}
          {configShowPromotionsOnMenu && (() => {
            const menuBanners = (configBanners || [])
              .filter(b => b.displayOn === 'menu' || b.displayOn === 'both' || !b.displayOn)
              .map((b, i) => ({
                id: b.id || i,
                image_url: b.bannerImage,
                title: b.bannerTitle,
                link: b.bannerLink,
              }));
            return menuBanners.length > 0 ? <PromoBanner promotions={menuBanners} compact /> : null;
          })()}

          {/* Category Navigation - controlled by admin config */}
          {configShowCategories && (() => {

            if (menuLoading && menuSections.length === 0) {
              return (
                <div className="category-nav">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <CategoryBoxSkeleton key={i} />
                  ))}
                </div>
              );
            }

            if (!menuLoading && menuSections.length > 0) {
              return (
                <div className="category-nav">
                  <div className="category-item">
                    <div
                      role="button"
                      tabIndex={0}
                      className={`category-box ${selectedCategory === null ? 'selected' : ''}`}
                      onClick={handleAllCategoryClick}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAllCategoryClick(); }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                      </svg>
                    </div>
                    <span className="category-name">All</span>
                  </div>

                  {menuSections.map((section, index) => (
                    <CategoryBox
                      key={index}
                      section={section}
                      isSelected={selectedCategory === section.sectionName}
                      onClick={() => handleCategoryClick(section.sectionName)}
                    />
                  ))}
                </div>
              );
            }
            return null;
          })()}



          {/* Top Category Header - Only show when a specific category is selected */}
          {selectedCategory && (
            <div className="category-info-header" ref={categoryHeaderRef}>
              <h2 className="category-info-name">{selectedCategory}</h2>
              <span className="category-info-count">
                ( {filterItems(
                  menuSections
                    .find(section => section.sectionName === selectedCategory)
                    ?.items || []
                ).length} Items)
              </span>
            </div>
          )}

          {/* Loading State - Menu Items */}
          {menuLoading && (
            <div id="items-section">
              <div className="menu-section">
                <div className="items-list">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <MenuItemSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          {!menuLoading && !menuError && (() => {
            const sectionsToDisplay = selectedCategory
              ? menuSections.filter(section => section.sectionName === selectedCategory)
              : menuSections;

            return (
              <>
                {sectionsToDisplay.length > 0 && (
                  <div id="items-section">
                    {sectionsToDisplay.map((section, sectionIndex) => {
                      // Apply item order and visibility from admin config
                      let orderedSectionItems = section.items;
                      const categoryId = section.categoryId;
                      const itemOrderKey = stationId ? `${stationId}__${categoryId}` : categoryId;
                      const itemOrder = stationId
                        ? (menuOrder?.stationItemOrder?.[itemOrderKey] || [])
                        : (menuOrder?.itemOrder?.[categoryId] || []);
                      const itemVis = stationId
                        ? (menuOrder?.stationItemVisibility?.[itemOrderKey] || {})
                        : (menuOrder?.itemVisibility?.[categoryId] || {});

                      if (itemOrder.length > 0) {
                        const ordered = [];
                        const seen = new Set();
                        for (const o of itemOrder) {
                          const item = section.items.find(i => String(i.id) === String(o.id));
                          if (item) {
                            if (itemVis[o.id] !== false) ordered.push(item);
                            seen.add(String(item.id));
                          }
                        }
                        for (const item of section.items) {
                          if (!seen.has(String(item.id))) ordered.push(item);
                        }
                        orderedSectionItems = ordered;
                      }

                      const filteredItems = filterItems(orderedSectionItems);

                      // Reorder items: cart items move to top
                      const reorderedItems = reorderItemsByCart(filteredItems);

                      if (reorderedItems.length === 0) {
                        return null;
                      }

                      return (
                        <React.Fragment key={sectionIndex}>
                          {/* Category Header - Show above each section when "All Items" is selected */}
                          {!selectedCategory && (
                            <div className="category-info-header">
                              <h2 className="category-info-name">{section.sectionName}</h2>
                              <span className="category-info-count">
                                ( {filteredItems.length} Items)
                              </span>
                            </div>
                          )}
                          <div className="menu-section">
                            <div className="items-list">
                              {reorderedItems.map((item) => {
                                // Get total quantity across all variations/add-ons
                                const itemQuantity = getTotalQuantityForItem(item.id);
                                const inCart = itemQuantity > 0;

                                return (
                                  <MenuItem
                                    key={item.id}
                                    item={item}
                                    isExpanded={expandedDescriptions[item.id]}
                                    descriptionLimit={descriptionLimit}
                                    onToggleDescription={toggleDescription}
                                    getAllergenIcon={getAllergenIcon}
                                    quantity={itemQuantity}
                                    isInCart={inCart}
                                    onAddToCart={() => handleAddToCart(item)}
                                    onIncrement={() => handleIncrement(item)}
                                    onDecrement={() => handleDecrement(item)}
                                    currentTimeInSeconds={currentTimeInSeconds}
                                    isOnlineOrderEnabled={isOnlineOrderEnabled}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}



                {/* Empty State */}
                {sectionsToDisplay.length === 0 && (
                  <div className="empty-state">
                    <p>No menu items available at the moment.</p>
                  </div>
                )}
              </>
            );
          })()}

          {configShowFooter && <Footer />}
        </div>

        {/* Customize Item Modal */}
        <CustomizeItemModal
          isOpen={customizeModalOpen}
          onClose={handleCloseCustomizeModal}
          item={selectedItemForCustomization}
          onAddToCart={handleAddToCartFromModal}
        />

        {/* Repeat Item Modal */}
        <RepeatItemModal
          isOpen={repeatModalOpen}
          onClose={handleCloseRepeatModal}
          item={selectedItemForRepeat}
          onRepeat={handleRepeat}
          onCustomize={handleCustomizeFromRepeat}
        />

      </div>
        {configShowMenuFab !== false && (
          <button className="menu-fab" onClick={toggleMenuPanel}>
            Menu
          </button>
        )}
    </div>
  );
};

export default MenuItems;
