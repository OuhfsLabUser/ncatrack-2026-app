// src/AOITracker.js
import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

const BASE = 'http://localhost:5000';

export default function AOITracker({ isTracking = false }) {
  const sessionId      = useRef(null); // Will be generated when tracking starts
  const firstEventTime = useRef(null);
  const mouse          = useRef({ x: 0, y: 0, aoi: '' });
  const gaze           = useRef({ x:0, y:0, eyeAoi:'', leftX:0, leftY:0, rightX:0, rightY:0 });
  const intervalIdRef  = useRef(null);
  const isInitialized  = useRef(false);
  const mouseMoveThrottleRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const lastHoveredAOI = useRef('');
  const hoverStartTime = useRef(null);
  // Track input sequences for each input field
  const inputSequences = useRef(new Map()); // Map<fieldId, string[]>

  useEffect(() => {
    // 持久化/恢复录制会话：仅由 Start/End 控制，刷新后恢复同一 sessionId
    if (isTracking && sessionId.current === null) {
      const storedRecording = typeof window !== 'undefined' && localStorage.getItem('aoi_is_recording') === 'true';
      const storedSessionId = typeof window !== 'undefined' ? localStorage.getItem('aoi_session_id') : null;
      if (storedRecording && storedSessionId) {
        // 恢复已有会话，不发送新的 session_start
        sessionId.current = storedSessionId;
        firstEventTime.current = Date.now(); // 避免下方 session_start 逻辑再次触发
      } else {
        // 新会话：生成 sessionId 并写入 localStorage
        sessionId.current = uuidv4();
        if (typeof window !== 'undefined') {
          localStorage.setItem('aoi_session_id', sessionId.current);
          localStorage.setItem('aoi_is_recording', 'true');
        }
      }
    }
    window.AOI_SESSION_ID = sessionId.current;
    window.AOI_CURRENT_SESSION_ID = sessionId.current;

    const clamp = (v, max) => Math.min(Math.max(Math.round(v), 0), max);
    
    // Helper to extract component content/text (moved outside getAOI for reuse)
    const getComponentContent = (el) => {
      if (!el) return null;
      
      const tag = el.tagName?.toLowerCase();
      const className = el.className;
      
      // Try aria-label first
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel;
      
      // For buttons, get text content
      if (tag === 'button' || (typeof className === 'string' && className.includes('MuiButton'))) {
        const text = el.textContent?.trim();
        if (text && text.length < 50) return text;
      }
      
      // For Typography/headings, get text
      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' ||
          (typeof className === 'string' && className.includes('MuiTypography'))) {
        const text = el.textContent?.trim();
        if (text && text.length < 100) return text;
      }
      
      // For labels, get text
      if (tag === 'label') {
        const text = el.textContent?.trim();
        if (text && text.length < 50) return text.replace(/\s*\*\s*$/, '');
      }
      
      // For input fields, try to find associated label
      if (tag === 'input' || (typeof className === 'string' && className.includes('MuiTextField'))) {
        const id = el.id;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) {
            const labelText = label.textContent?.trim();
            if (labelText && labelText.length < 50) {
              return labelText.replace(/\s*\*\s*$/, '');
            }
          }
        }
        
        // For Grid layouts, find the Typography label in the previous Grid item
        // This is more accurate than searching parent containers
        let currentGridItem = el.closest('[class*="MuiGrid-item"], [class*="MuiGridItem"]');
        if (currentGridItem) {
          // Find the Grid container
          const gridContainer = currentGridItem.parentElement;
          if (gridContainer) {
            // Get all Grid items
            const gridItems = Array.from(gridContainer.children);
            const currentIndex = gridItems.indexOf(currentGridItem);
            
            // Look for Typography in previous Grid items (labels are usually before inputs)
            for (let i = currentIndex - 1; i >= 0 && i >= currentIndex - 3; i--) {
              const prevItem = gridItems[i];
              if (prevItem) {
                // Look for Typography with bold text (field labels)
                const typography = prevItem.querySelector('[class*="MuiTypography"], p, span');
                if (typography) {
                  const style = window.getComputedStyle(typography);
                  const fontWeight = style.fontWeight;
                  // Check if it's bold (field labels are usually bold)
                  if (parseInt(fontWeight) >= 600 || fontWeight === 'bold') {
                    const labelText = typography.textContent?.trim();
                    // Exclude checkbox labels like "Unknown Date of Birth"
                    if (labelText && 
                        labelText.length < 50 && 
                        !labelText.toLowerCase().includes('unknown') &&
                        !labelText.toLowerCase().includes('checkbox')) {
                      return labelText.replace(/\s*\*\s*$/, '');
                    }
                  }
                }
              }
            }
          }
        }
        
        // Try to find label in parent (MUI TextField pattern) - but exclude checkbox labels
        let parent = el.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          // Look for Typography first (more reliable than label elements)
          const typography = parent.querySelector('[class*="MuiTypography"]');
          if (typography) {
            const style = window.getComputedStyle(typography);
            const fontWeight = style.fontWeight;
            if (parseInt(fontWeight) >= 600 || fontWeight === 'bold') {
              const labelText = typography.textContent?.trim();
              // Exclude checkbox-related labels
              if (labelText && 
                  labelText.length < 50 && 
                  !labelText.toLowerCase().includes('unknown') &&
                  !labelText.toLowerCase().includes('checkbox')) {
                return labelText.replace(/\s*\*\s*$/, '');
              }
            }
          }
          
          // Also check for label elements, but exclude FormControlLabel (checkbox labels)
          const label = parent.querySelector('label:not([class*="FormControlLabel"])');
          if (label) {
            const labelText = label.textContent?.trim();
            // Exclude checkbox-related labels
            if (labelText && 
                labelText.length < 50 && 
                !labelText.toLowerCase().includes('unknown') &&
                !labelText.toLowerCase().includes('checkbox')) {
              return labelText.replace(/\s*\*\s*$/, '');
            }
          }
          parent = parent.parentElement;
        }
        
        // Use name attribute as fallback
        const name = el.getAttribute('name');
        if (name) {
          // Convert camelCase to Title Case
          return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
        }
      }
      
      // For select, try to find label
      if (tag === 'select' || (typeof className === 'string' && className.includes('MuiSelect'))) {
        const id = el.id;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) {
            const labelText = label.textContent?.trim();
            if (labelText && labelText.length < 50) {
              return labelText.replace(/\s*\*\s*$/, '');
            }
          }
        }
        
        const name = el.getAttribute('name');
        if (name) {
          return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
        }
      }
      
      // For menu items and tabs, get text
      if ((typeof className === 'string' && (className.includes('MuiMenuItem') || className.includes('MuiTab'))) ||
          tag === 'a') {
        const text = el.textContent?.trim();
        if (text && text.length < 50) return text;
      }
      
      // For AppBar/Toolbar, check for title text
      if ((typeof className === 'string' && (className.includes('MuiAppBar') || className.includes('MuiToolbar'))) ||
          el.getAttribute('role') === 'menubar' || el.getAttribute('role') === 'toolbar') {
        // Look for Typography or heading inside
        const title = el.querySelector('h1, h2, h3, h4, h5, h6, [class*="MuiTypography-h"]');
        if (title) {
          const text = title.textContent?.trim();
          if (text && text.length < 100) return text;
        }
      }
      
      return null;
    };
    
    // Enhanced AOI detection: intelligently identifies components by traversing DOM tree
    // Prioritizes meaningful component information over generic containers
    // Returns { aoi: string, element: HTMLElement, bounds: { topLeft, bottomRight } } to allow access to element coordinates
    const getAOI = (x, y) => {
      const element = document.elementFromPoint(x, y);
      if (!element) return { aoi: '', element: null, bounds: { topLeft: null, bottomRight: null } };
      
      // Helper to get element bounding box coordinates
      const getElementBounds = (el) => {
        if (!el) return { topLeft: null, bottomRight: null };
        try {
          const rect = el.getBoundingClientRect();
          return {
            topLeft: { x: Math.round(rect.left), y: Math.round(rect.top) },
            bottomRight: { x: Math.round(rect.right), y: Math.round(rect.bottom) }
          };
        } catch (e) {
          return { topLeft: null, bottomRight: null };
        }
      };
      
      // Helper to check if element is a meaningful component (not just a container)
      const isMeaningfulElement = (el) => {
        if (!el) return false;
        const tag = el.tagName?.toLowerCase();
        const role = el.getAttribute('role');
        const id = el.id;
        const name = el.getAttribute('name');
        const ariaLabel = el.getAttribute('aria-label');
        const type = el.getAttribute('type');
        
        // Form elements are always meaningful
        if (['input', 'button', 'select', 'textarea', 'a'].includes(tag)) return true;
        
        // Elements with meaningful attributes
        if (id && id !== 'root') return true;
        if (name) return true;
        if (ariaLabel) return true;
        if (role && !['presentation', 'none'].includes(role)) return true;
        if (type) return true;
        
        // Check for MUI component indicators
        const className = el.className;
        if (typeof className === 'string') {
          // MUI components often have specific class patterns
          if (className.includes('MuiTextField') || 
              className.includes('MuiButton') || 
              className.includes('MuiSelect') ||
              className.includes('MuiFormControl') ||
              className.includes('MuiMenuItem') ||
              className.includes('MuiCheckbox') ||
              className.includes('MuiRadio')) {
            return true;
          }
        }
        
        return false;
      };
      
      // Helper to get component type name (human-readable)
      const getComponentType = (el) => {
        const tag = el.tagName?.toLowerCase();
        const className = el.className;
        const role = el.getAttribute('role');
        const type = el.getAttribute('type');
        
        // Check for MUI components first
        if (typeof className === 'string') {
          if (className.includes('MuiButton')) return 'Button';
          if (className.includes('MuiTextField')) return 'Text Field';
          if (className.includes('MuiSelect')) return 'Select';
          if (className.includes('MuiCheckbox')) return 'Checkbox';
          if (className.includes('MuiRadio')) return 'Radio Button';
          if (className.includes('MuiMenuItem')) return 'Menu Item';
          if (className.includes('MuiTab')) return 'Tab';
          if (className.includes('MuiAppBar')) return 'Menu Bar';
          if (className.includes('MuiToolbar')) return 'Toolbar';
          if (className.includes('MuiTypography')) {
            // Check if it's a label (bold text, usually field labels)
            const style = window.getComputedStyle(el);
            const fontWeight = style.fontWeight;
            if (parseInt(fontWeight) >= 600 || fontWeight === 'bold') {
              return 'Label';
            }
            return 'Text';
          }
        }
        
        // Check by tag and type
        if (tag === 'button') return 'Button';
        if (tag === 'input') {
          if (type === 'text' || type === 'email' || type === 'tel' || !type) return 'Text Field';
          if (type === 'date') return 'Date Field';
          if (type === 'number') return 'Number Field';
          if (type === 'checkbox') return 'Checkbox';
          if (type === 'radio') return 'Radio Button';
          return 'Input Field';
        }
        if (tag === 'select') return 'Select';
        if (tag === 'textarea') return 'Text Area';
        if (tag === 'label') return 'Label';
        if (tag === 'a') return 'Link';
        if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') return 'Heading';
        if (tag === 'p') return 'Text';
        
        // Check by role
        if (role === 'button') return 'Button';
        if (role === 'textbox') return 'Text Field';
        if (role === 'menuitem') return 'Menu Item';
        if (role === 'tab') return 'Tab';
        if (role === 'menubar') return 'Menu Bar';
        if (role === 'toolbar') return 'Toolbar';
        
        return null;
      };
      
      // Helper to find page section/region (e.g., "Personal Profile", "Case Information")
      const findPageSection = (el) => {
        let current = el;
        let depth = 0;
        const maxDepth = 20;
        
        while (current && depth < maxDepth) {
          const tag = current.tagName?.toLowerCase();
          const className = current.className;
          
          // Look for Typography with h5/h6 variant (section titles)
          if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
            const text = current.textContent?.trim();
            if (text && text.length > 0 && text.length < 100) {
              return text;
            }
          }
          
          // Look for Typography elements with MUI classes indicating headings
          if (typeof className === 'string' && className.includes('MuiTypography')) {
            // Check if it's a heading variant
            if (className.includes('MuiTypography-h5') || 
                className.includes('MuiTypography-h6') ||
                className.includes('MuiTypography-h4')) {
              const text = current.textContent?.trim();
              if (text && text.length > 0 && text.length < 100) {
                return text;
              }
            }
          }
          
          // Look for Paper components (often contain sections)
          if (tag === 'div' && typeof className === 'string' && className.includes('MuiPaper')) {
            // Try to find a heading within this Paper
            const heading = current.querySelector('h1, h2, h3, h4, h5, h6, [class*="MuiTypography-h5"], [class*="MuiTypography-h6"]');
            if (heading) {
              const text = heading.textContent?.trim();
              if (text && text.length > 0 && text.length < 100) {
                return text;
              }
            }
          }
          
          // Look for Box with bgcolor (section headers)
          if (tag === 'div' && typeof className === 'string') {
            // Check if parent has a Typography heading as sibling or child
            const parent = current.parentElement;
            if (parent) {
              // Check siblings
              let sibling = parent.firstElementChild;
              while (sibling) {
                if (sibling !== current) {
                  const siblingText = sibling.textContent?.trim();
                  const siblingTag = sibling.tagName?.toLowerCase();
                  const siblingClass = sibling.className;
                  if ((siblingTag && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(siblingTag)) ||
                      (typeof siblingClass === 'string' && 
                       (siblingClass.includes('MuiTypography-h5') || 
                        siblingClass.includes('MuiTypography-h6')))) {
                    if (siblingText && siblingText.length > 0 && siblingText.length < 100) {
                      return siblingText;
                    }
                  }
                }
                sibling = sibling.nextElementSibling;
              }
            }
          }
          
          current = current.parentElement;
          depth++;
        }
        
        return null;
      };
      
      // Helper to find field label (e.g., "First Name", "Last Name")
      const findFieldLabel = (el) => {
        let current = el;
        let depth = 0;
        const maxDepth = 10;
        
        while (current && depth < maxDepth) {
          const tag = current.tagName?.toLowerCase();
          const className = current.className;
          
          // Look for label element
          if (tag === 'label') {
            const text = current.textContent?.trim();
            if (text && text.length > 0 && text.length < 50) {
              return text.replace(/\s*\*\s*$/, ''); // Remove trailing asterisk
            }
          }
          
          // Look for Typography with bold styling (field labels)
          if (tag === 'p' || tag === 'span' || tag === 'div') {
            if (typeof className === 'string' && className.includes('MuiTypography')) {
              // Check if it's bold (field labels are often bold)
              const style = window.getComputedStyle(current);
              const fontWeight = style.fontWeight;
              if (parseInt(fontWeight) >= 600 || fontWeight === 'bold') {
                const text = current.textContent?.trim();
                if (text && text.length > 0 && text.length < 50 && !text.includes('*')) {
                  return text;
                }
              }
            }
          }
          
          // Look for adjacent Typography elements (field labels are often in Grid items)
          const parent = current.parentElement;
          if (parent) {
            // Check previous sibling (labels are often before inputs in Grid layouts)
            let sibling = parent.previousElementSibling;
            if (sibling) {
              const siblingTag = sibling.tagName?.toLowerCase();
              const siblingClass = sibling.className;
              if (siblingTag === 'p' || siblingTag === 'span' || siblingTag === 'div') {
                if (typeof siblingClass === 'string' && siblingClass.includes('MuiTypography')) {
                  const text = sibling.textContent?.trim();
                  if (text && text.length > 0 && text.length < 50) {
                    return text.replace(/\s*\*\s*$/, '');
                  }
                }
              }
            }
            
            // Check first child (labels might be first child in Grid item)
            const firstChild = parent.firstElementChild;
            if (firstChild && firstChild !== current) {
              const childTag = firstChild.tagName?.toLowerCase();
              const childClass = firstChild.className;
              if (childTag === 'p' || childTag === 'span' || childTag === 'div') {
                if (typeof childClass === 'string' && childClass.includes('MuiTypography')) {
                  const text = firstChild.textContent?.trim();
                  if (text && text.length > 0 && text.length < 50) {
                    return text.replace(/\s*\*\s*$/, '');
                  }
                }
              }
            }
          }
          
          current = current.parentElement;
          depth++;
        }
        
        return null;
      };
      
      // First, try to find data-aoi attribute
      let current = element;
      let depth = 0;
      const maxDepth = 15; // Increased depth for MUI components
      
      while (current && depth < maxDepth) {
        const aoi = current.getAttribute('data-aoi');
        if (aoi) {
          const bounds = getElementBounds(current);
          return { aoi: aoi, element: current, bounds };
        }
        current = current.parentElement;
        depth++;
      }
      
      // Now find the most meaningful element in the hierarchy
      current = element;
      depth = 0;
      let bestMatch = null;
      let bestScore = 0;
      
      while (current && depth < maxDepth) {
        // Skip root and generic containers
        if (current.id === 'root' && depth > 0) {
          current = current.parentElement;
          depth++;
          continue;
        }
        
        // Skip body and html unless it's the only option
        if (['body', 'html'].includes(current.tagName?.toLowerCase()) && depth < 3) {
          current = current.parentElement;
          depth++;
          continue;
        }
        
        if (isMeaningfulElement(current)) {
          const tagName = current.tagName?.toLowerCase();
          const id = current.id;
          const name = current.getAttribute('name');
          const ariaLabel = current.getAttribute('aria-label');
          const role = current.getAttribute('role');
          const type = current.getAttribute('type');
          
          // Get component type and content
          const componentType = getComponentType(current);
          const componentContent = getComponentContent(current);
          
          // Score elements based on how specific they are
          let score = 0;
          let identifier = '';
          
          // Build identifier in "Content + Type" format
          if (componentType && componentContent) {
            // High priority: form elements with both type and content
            if (['input', 'select', 'textarea', 'button'].includes(tagName)) {
              score += 100;
              identifier = `${componentContent} ${componentType}`;
            } else if (componentType === 'Label' || componentType === 'Text') {
              score += 80;
              identifier = `${componentContent} ${componentType}`;
            } else if (componentType === 'Menu Bar' || componentType === 'Toolbar') {
              score += 90;
              identifier = `${componentContent} ${componentType}`;
            } else {
              score += 70;
              identifier = `${componentContent} ${componentType}`;
            }
          } else if (componentType) {
            // Medium priority: has type but no content
            score += 50;
            if (componentContent) {
              identifier = `${componentContent} ${componentType}`;
            } else if (name) {
              const nameFormatted = name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
              identifier = `${nameFormatted} ${componentType}`;
            } else {
              identifier = componentType;
            }
          } else if (componentContent) {
            // Medium priority: has content but no type
            score += 40;
            if (tagName === 'button') {
              identifier = `${componentContent} Button`;
            } else if (tagName === 'input') {
              identifier = `${componentContent} ${type ? type.charAt(0).toUpperCase() + type.slice(1) + ' Field' : 'Input Field'}`;
            } else {
              identifier = componentContent;
            }
          }
          
          // Fallback: use name or id
          if (!identifier) {
            if (name) {
              score += 30;
              const nameFormatted = name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
              identifier = componentType ? `${nameFormatted} ${componentType}` : nameFormatted;
            } else if (id && id !== 'root') {
              score += 25;
              identifier = componentType ? `${id} ${componentType}` : id;
            } else if (ariaLabel) {
              score += 20;
              identifier = componentType ? `${ariaLabel} ${componentType}` : ariaLabel;
            } else if (role && !['presentation', 'none'].includes(role)) {
              score += 15;
              identifier = role;
            }
          }
          
          // If we found a good identifier, use it
          if (identifier && score > bestScore) {
            bestMatch = { identifier, tagName, type, score };
            bestScore = score;
          }
        }
        
        current = current.parentElement;
        depth++;
      }
      
      // Helper to check if element is likely empty/blank space
      const isEmptySpace = (el) => {
        if (!el) return true;
        
        const tag = el.tagName?.toLowerCase();
        const className = el.className;
        const id = el.id;
        const textContent = el.textContent?.trim();
        
        // Skip elements that are clearly containers without content
        if (tag === 'div' || tag === 'span' || tag === 'p') {
          // If it has no text, no meaningful id, and no MUI component classes, it's likely empty
          if (!textContent || textContent.length === 0) {
            if (!id || id === 'root') {
              if (typeof className !== 'string' || 
                  (!className.includes('Mui') && 
                   !className.includes('css-') && 
                   className.trim().length === 0)) {
                return true;
              }
            }
          }
        }
        
        return false;
      };
      
      // Build hierarchical location: Section > Field > Component
      let locationParts = [];
      
      // Find page section
      const section = findPageSection(element);
      if (section) {
        locationParts.push(section);
      }
      
      // Find field label
      const fieldLabel = findFieldLabel(element);
      if (fieldLabel && (!section || fieldLabel !== section)) {
        locationParts.push(fieldLabel);
      }
      
      // Return the best match found
      if (bestMatch && bestMatch.identifier) {
        let componentInfo = bestMatch.identifier;
        
        // Component info is already in "Content + Type" format, no need to modify
        
        // Combine location parts
        let aoiString = '';
        if (locationParts.length > 0) {
          // If component info already contains field label, don't duplicate
          const hasFieldInComponent = fieldLabel && componentInfo.toLowerCase().includes(fieldLabel.toLowerCase());
          if (!hasFieldInComponent && fieldLabel) {
            locationParts.push(componentInfo);
          } else if (!hasFieldInComponent) {
            locationParts.push(componentInfo);
          }
          aoiString = locationParts.join(' > ');
        } else {
          aoiString = componentInfo;
        }
        
        const bounds = getElementBounds(bestMatch.element || element);
        return { aoi: aoiString, element: bestMatch.element || element, bounds };
      }
      
      // If no best match but we have location info, return that with context
      if (locationParts.length > 0) {
        // Check if we're in empty space - return empty string
        if (isEmptySpace(element)) {
          return { aoi: '', element: null, bounds: { topLeft: null, bottomRight: null } };
        }
        const bounds = getElementBounds(element);
        return { aoi: locationParts.join(' > '), element, bounds };
      }
      
      // If we have section but no field, and it's empty space, return empty
      if (section && isEmptySpace(element)) {
        return { aoi: '', element: null, bounds: { topLeft: null, bottomRight: null } };
      }
      
      // Last resort: try to find any nearby meaningful element
      current = element;
      for (let i = 0; i < 5 && current; i++) {
        const nearbySection = findPageSection(current);
        if (nearbySection) {
          // If it's empty space, return empty string
          if (isEmptySpace(current)) {
            return { aoi: '', element: null, bounds: { topLeft: null, bottomRight: null } };
          }
          // If we found a section but no component, return empty
          return { aoi: '', element: null, bounds: { topLeft: null, bottomRight: null } };
        }
        current = current.parentElement;
      }
      
      // Final fallback: return empty string for empty space
      const bounds = getElementBounds(element);
      return { aoi: '', element, bounds };
    };

    // — WebGazer setup —
    const wg = window.webgazer;
    if (!wg) {
      console.warn('WebGazer not available');
      return;
    }

    wg.setRegression('ridge')
      .showPredictionPoints(false)
      .showFaceOverlay(false)
      .showFaceFeedbackBox(false);

    wg.setGazeListener(data => {
      if (!data || !isTracking) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const gx = clamp(data.x, vw), gy = clamp(data.y, vh);
      const eyeAoiInfo = getAOI(gx, gy);
      gaze.current = {
        x:      gx,
        y:      gy,
        eyeAoi: eyeAoiInfo.aoi,
        leftX:  clamp(data.xLeft  ?? gx, vw),
        leftY:  clamp(data.yLeft  ?? gy, vh),
        rightX: clamp(data.xRight ?? gx, vw),
        rightY: clamp(data.yRight ?? gy, vh)
      };
    });

    // Initialize WebGazer but don't start tracking yet
    if (!isInitialized.current) {
      wg.begin();
      isInitialized.current = true;
    }

    // unified sender
    const sendEvent = async ({
      eventType,
      isClick=false,
      textInput=false,
      activity='',
      targetId='',
      description='',
      key='',
      elementBounds=null
    }) => {
      // Don't send events if tracking is disabled
      if (!isTracking) return;

      const nowMs = Date.now();
      // initialize firstEventTime on very first call when tracking starts
      if (firstEventTime.current === null) {
        firstEventTime.current = nowMs;
      }
      const offsetMs = nowMs - firstEventTime.current;

      const nowIso = new Date(nowMs).toISOString();
      const m     = mouse.current;
      const g     = gaze.current;
      const page  = window.location.pathname;
      
      // Get element bounds if not provided
      let bounds = elementBounds;
      if (!bounds && m.aoiInfo && m.aoiInfo.element) {
        try {
          const rect = m.aoiInfo.element.getBoundingClientRect();
          bounds = {
            topLeft: { x: Math.round(rect.left), y: Math.round(rect.top) },
            bottomRight: { x: Math.round(rect.right), y: Math.round(rect.bottom) }
          };
        } catch (e) {
          bounds = null;
        }
      }

      const payload = {
        session_id:    sessionId.current,
        event_type:    eventType,
        timestamp_iso: nowIso,
        offset_ms:     offsetMs,
        key,            // new: individual key logged
        page,
        coordinates:   { x: m.x, y: m.y },
        mouse_aoi:     typeof m.aoi === 'string' ? m.aoi : (m.aoi?.aoi || ''),
        mouse_click:   isClick,
        text_input:    textInput,
        text_activity: activity,
        targetId,
        description,
        eye_aoi:       g.eyeAoi,
        left_eye_x:    g.leftX,
        left_eye_y:    g.leftY,
        right_eye_x:   g.rightX,
        right_eye_y:   g.rightY,
        aoi_top_left_x: bounds?.topLeft?.x || '',
        aoi_top_left_y: bounds?.topLeft?.y || '',
        aoi_bottom_right_x: bounds?.bottomRight?.x || '',
        aoi_bottom_right_y: bounds?.bottomRight?.y || ''
      };

      try {
        await fetch(`${BASE}/api/aoi_event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error('AOI log failed:', err);
      }
    };

    // mouse movement & click with throttling for performance
    const onMouseMove = e => {
      const aoiInfo = getAOI(e.clientX, e.clientY);
      mouse.current = {
        x:   e.clientX,
        y:   e.clientY,
        aoi: aoiInfo.aoi,
        aoiInfo: aoiInfo
      };
      
      // Track hover events - send event when mouse stays on a component for > 200ms
      if (isTracking && aoiInfo.aoi) {
        // Clear previous hover timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        
        // If AOI changed, reset hover tracking
        if (aoiInfo.aoi !== lastHoveredAOI.current) {
          lastHoveredAOI.current = aoiInfo.aoi;
          hoverStartTime.current = Date.now();
          
          // Set timeout to send hover event after 200ms
          const currentAoi = aoiInfo.aoi;
          const currentBounds = aoiInfo.bounds;
          hoverTimeoutRef.current = setTimeout(() => {
            if (isTracking && mouse.current.aoi === currentAoi) {
              const hoverDuration = Date.now() - hoverStartTime.current;
              sendEvent({ 
                eventType: 'hover',
                description: `Hovered on ${currentAoi} for ${hoverDuration}ms`,
                elementBounds: currentBounds
              });
            }
            hoverTimeoutRef.current = null;
          }, 200);
        }
      }
    };
    
    // Throttled mouse move handler (50ms throttle for better tracking)
    const onMouseMoveThrottled = e => {
      onMouseMove(e);
      if (mouseMoveThrottleRef.current === null) {
        mouseMoveThrottleRef.current = setTimeout(() => {
          mouseMoveThrottleRef.current = null;
        }, 50);
      }
    };
    
    // Mouse enter handler for better component tracking
    const onMouseEnter = e => {
      if (isTracking) {
        const aoiInfo = getAOI(e.clientX, e.clientY);
        if (aoiInfo.aoi) {
          sendEvent({ 
            eventType: 'mouse_enter',
            description: `Mouse entered ${aoiInfo.aoi}`,
            elementBounds: aoiInfo.bounds
          });
        }
      }
    };
    
    // Mouse leave handler
    const onMouseLeave = e => {
      if (isTracking && lastHoveredAOI.current) {
        sendEvent({ 
          eventType: 'mouse_leave',
          description: `Mouse left ${lastHoveredAOI.current}`
        });
        lastHoveredAOI.current = '';
        hoverStartTime.current = null;
      }
      // Clear hover timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
    
    const onClick = e => {
      onMouseMove(e);
      if (isTracking) {
        const aoiInfo = getAOI(e.clientX, e.clientY);
        sendEvent({ 
          eventType: 'click', 
          isClick: true,
          description: `Clicked on ${aoiInfo.aoi}`,
          elementBounds: aoiInfo.bounds
        });
      }
    };
    
    // text‐input listener - records text changes in input fields
    const onInput = e => {
      if (!isTracking) return;
      
      // Handle both native input elements and MUI TextField inputs
      let target = e.target;
      
      // For MUI TextField, the actual input might be nested
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        // Try to find the actual input element
        if (target.tagName?.toLowerCase() === 'div' || target.tagName?.toLowerCase() === 'input') {
          const input = target.querySelector?.('input, textarea') || 
                       (target.tagName?.toLowerCase() === 'input' ? target : null);
          if (input) target = input;
        }
      }
      
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const rect = target.getBoundingClientRect();
        const aoiInfo = getAOI(rect.left + rect.width / 2, rect.top + rect.height / 2);
        
        // Get field label/name
        const fieldName = target.name || target.id || '';
        const fieldLabel = getComponentContent(target) || fieldName;
        
        sendEvent({
          eventType:   'text_input',
          textInput:   true,
          activity:    target.value, // Record the full current value
          targetId:    fieldName,
          description: fieldLabel ? `Text input in ${fieldLabel}` : 'Text input',
          key:         '', // Input event doesn't have a specific key
          elementBounds: aoiInfo.bounds
        });
      }
    };

    // key‐press listener - records all keyboard input
    const onKeyDown = e => {
      if (!isTracking) return;
      
      let target = e.target;
      
      // For MUI TextField, the actual input might be nested or the event might bubble
      // Check if target is the actual input, or find it
      if (!(target instanceof HTMLInputElement || 
            target instanceof HTMLTextAreaElement || 
            target instanceof HTMLSelectElement)) {
        // Try to find the actual input element in the event path
        const path = e.composedPath?.() || [];
        for (const el of path) {
          if (el instanceof HTMLInputElement || 
              el instanceof HTMLTextAreaElement || 
              el instanceof HTMLSelectElement) {
            target = el;
            break;
          }
        }
      }
      
      // Only track if it's an input element or if it's a special key (like Tab, Enter)
      const isInputElement = target instanceof HTMLInputElement || 
                            target instanceof HTMLTextAreaElement || 
                            target instanceof HTMLSelectElement;
      
      // Track all key presses, but prioritize input elements
      if (isInputElement || 
          ['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete'].includes(e.key)) {
        const rect = target.getBoundingClientRect?.();
        const aoiInfo = rect ? getAOI(rect.left + rect.width / 2, rect.top + rect.height / 2) : { aoi: '', element: null, bounds: { topLeft: null, bottomRight: null } };
        
        // Get field label/name if it's an input element
        let fieldName = '';
        let fieldLabel = '';
        if (isInputElement) {
          fieldName = target.name || target.id || '';
          fieldLabel = getComponentContent(target) || fieldName;
        }
        
        // Get detailed key information
        const keyValue = e.key || ''; // The actual key value (e.g., 'a', 'A', 'Enter', 'Backspace')
        const keyCode = e.code || ''; // Physical key code (e.g., 'KeyA', 'Enter', 'Backspace')
        const keyChar = keyValue && keyValue.length === 1 ? keyValue : ''; // Single character if applicable
        
        // Track input sequence for input elements
        if (isInputElement && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
          const fieldId = fieldName || target.id || `input_${target.getBoundingClientRect().left}_${target.getBoundingClientRect().top}`;
          
          // Initialize sequence if not exists
          if (!inputSequences.current.has(fieldId)) {
            inputSequences.current.set(fieldId, []);
          }
          
          const sequence = inputSequences.current.get(fieldId);
          
          // Record the key press in sequence
          if (keyValue === 'Backspace') {
            // Record backspace as '<-'
            sequence.push('<-');
          } else if (keyValue === 'Delete') {
            // Record delete as 'Del'
            sequence.push('Del');
          } else if (keyValue && keyValue.length === 1 && !['Enter', 'Tab', 'Escape'].includes(keyValue)) {
            // Record regular character input
            sequence.push(keyValue);
          }
          // Note: Arrow keys, Enter, Tab, etc. are not recorded in the sequence
        }
        
        // Format key information for display
        let keyInfo = keyValue;
        if (keyValue === ' ') {
          keyInfo = 'Space';
        } else if (keyValue === 'Enter') {
          keyInfo = 'Enter';
        } else if (keyValue === 'Tab') {
          keyInfo = 'Tab';
        } else if (keyValue === 'Backspace') {
          keyInfo = 'Backspace';
        } else if (keyValue === 'Delete') {
          keyInfo = 'Delete';
        } else if (keyValue === 'ArrowUp' || keyValue === 'ArrowDown' || 
                   keyValue === 'ArrowLeft' || keyValue === 'ArrowRight') {
          keyInfo = keyValue.replace('Arrow', '');
        } else if (keyValue && keyValue.length === 1 && keyValue.match(/[a-zA-Z0-9]/)) {
          // Regular character - show both the character and code
          keyInfo = keyValue;
        } else {
          // Special keys - use the key value
          keyInfo = keyValue || '';
        }
        
        // Record modifier keys
        const modifiers = [];
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.shiftKey) modifiers.push('Shift');
        if (e.altKey) modifiers.push('Alt');
        if (e.metaKey) modifiers.push('Meta');
        
        // Build detailed description with key value and code
        let keyDisplay = keyInfo;
        if (modifiers.length > 0) {
          keyDisplay = `${modifiers.join('+')}+${keyInfo}`;
        }
        
        // Include key code in description for more detail
        let description = '';
        if (keyChar && keyChar.match(/[a-zA-Z0-9]/)) {
          // For regular characters, show: "Key: 'a' (KeyA)"
          description = `Key pressed: '${keyChar}' (${keyCode})`;
        } else if (keyValue && keyValue.length === 1) {
          // For single character special keys, show: "Key: ' ' (Space)"
          description = `Key pressed: '${keyValue}' (${keyCode})`;
        } else {
          // For special keys, show: "Key: Enter (Enter)" or "Key: Backspace (Backspace)"
          description = `Key pressed: ${keyInfo} (${keyCode})`;
        }
        
        if (fieldLabel) {
          description = `Key pressed in ${fieldLabel}: ${description.replace('Key pressed: ', '')}`;
        }
        
        // Update keyInfo with modifiers for the key field
        if (modifiers.length > 0) {
          keyInfo = `${modifiers.join('+')}+${keyInfo}`;
        }
        
        sendEvent({
          eventType: 'key_press',
          key:       keyInfo,
          targetId:  fieldName,
          description: description,
          textInput: isInputElement,
          activity:  isInputElement && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
                     ? target.value 
                     : '',
          elementBounds: aoiInfo.bounds
        });
      }
    };
    
    // key-up listener for complete key press cycle
    const onKeyUp = e => {
      if (isTracking) {
        const target = e.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          // Only log key-up for special keys to avoid too much data
          if (['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            const fieldName = target.name || target.id || '';
            const fieldLabel = getComponentContent(target) || fieldName;
            
            sendEvent({
              eventType: 'key_up',
              key:       e.key,
              targetId:  fieldName,
              description: fieldLabel ? `Key released in ${fieldLabel}: ${e.key}` : `Key released: ${e.key}`,
              textInput: true
            });
          }
        }
      }
    };

    // focus listener - reset input sequence when user focuses on a field
    const onFocus = e => {
      if (!isTracking) return;
      
      let target = e.target;
      
      // For MUI TextField, the actual input might be nested
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        const path = e.composedPath?.() || [];
        for (const el of path) {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            target = el;
            break;
          }
        }
      }
      
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const fieldName = target.name || target.id || '';
        const fieldId = fieldName || `input_${target.getBoundingClientRect().left}_${target.getBoundingClientRect().top}`;
        
        // Reset the sequence when user focuses on the field (new editing session)
        inputSequences.current.set(fieldId, []);
      }
    };

    // blur listener - records input sequence when user leaves the field
    const onBlur = e => {
      if (!isTracking) return;
      
      let target = e.target;
      
      // For MUI TextField, the actual input might be nested
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        const path = e.composedPath?.() || [];
        for (const el of path) {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            target = el;
            break;
          }
        }
      }
      
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const fieldName = target.name || target.id || '';
        const fieldId = fieldName || `input_${target.getBoundingClientRect().left}_${target.getBoundingClientRect().top}`;
        const fieldLabel = getComponentContent(target) || fieldName;
        
        // Get and record the input sequence
        if (inputSequences.current.has(fieldId)) {
          const sequence = inputSequences.current.get(fieldId);
          const finalValue = target.value || ''; // Get the final input value
          const aoiInfo = getAOI(
            target.getBoundingClientRect().left + target.getBoundingClientRect().width / 2,
            target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2
          );
          
          if (sequence.length > 0) {
            const sequenceString = sequence.join('');
            
            // Send event with both sequence (for debugging) and final value (for summary)
            sendEvent({
              eventType: 'input_sequence',
              textInput: true,
              targetId: fieldName,
              activity: finalValue, // Use final value instead of sequence for summary
              key: sequenceString, // Store sequence in key field for reference
              description: fieldLabel ? `Input sequence in ${aoiInfo.aoi}: "${sequenceString}"` : `Input sequence: "${sequenceString}"`,
              elementBounds: aoiInfo.bounds
            });
          } else if (finalValue) {
            // Even if no sequence was recorded, send the final value
            const aoiInfo = getAOI(
              target.getBoundingClientRect().left + target.getBoundingClientRect().width / 2,
              target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2
            );
            sendEvent({
              eventType: 'input_sequence',
              textInput: true,
              targetId: fieldName,
              activity: finalValue,
              description: fieldLabel ? `Input "${finalValue}" in ${aoiInfo.aoi}` : `Input "${finalValue}"`,
              elementBounds: aoiInfo.bounds
            });
          }
          
          // Clear the sequence after recording
          inputSequences.current.delete(fieldId);
        }
      }
    };

    // Set up event listeners (always attached, but events only sent when tracking)
    window.addEventListener('mousemove', onMouseMoveThrottled);
    window.addEventListener('click',     onClick);
    document.addEventListener('mouseenter', onMouseEnter, true); // Use capture phase
    document.addEventListener('mouseleave', onMouseLeave, true); // Use capture phase
    // Use capture phase for input events to catch MUI TextField inputs
    document.addEventListener('input',   onInput, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup',   onKeyUp, true);
    document.addEventListener('focus',   onFocus, true);
    document.addEventListener('blur',    onBlur, true);

    // 1 s sampler - only active when tracking
    if (isTracking) {
      // Reset firstEventTime when tracking starts
      if (firstEventTime.current === null) {
        firstEventTime.current = Date.now();
        
        // Send session_start event to create new log file
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        const payload = {
          session_id: sessionId.current,
          event_type: 'session_start',
          timestamp_iso: nowIso,
          offset_ms: 0,
          page: window.location.pathname
        };
        
        fetch(`${BASE}/api/aoi_event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(res => res.json())
          .then(data => {
            console.log('Session started:', data);
            // Store session ID in window for export
            window.AOI_CURRENT_SESSION_ID = sessionId.current;
            
            // Start Tobii eye tracker
            const screenWidth = window.screen.width || window.innerWidth;
            const screenHeight = window.screen.height || window.innerHeight;
            fetch(`${BASE}/api/eye_tracker/start`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                session_id: sessionId.current,
                screen_width: screenWidth,
                screen_height: screenHeight
              })
            }).then(res => {
              if (!res.ok) {
                return res.json().then(err => {
                  throw new Error(err.error || `HTTP ${res.status}: ${res.statusText}`);
                });
              }
              return res.json();
            })
              .then(data => {
                console.log('✓ Tobii eye tracker started:', data);
                if (data.note) {
                  console.log('Note:', data.note);
                }
              })
              .catch(err => {
                console.error('✗ Failed to start Tobii eye tracker:', err);
                console.error('Error details:', err.message);
                console.error('Please check:');
                console.error('1. Is the Tobii device connected?');
                console.error('2. Are Python dependencies installed? Run: pip install -r requirements_tobii.txt');
                console.error('3. Error messages in the server logs');
                // Continue even if eye tracker fails to start
              });
          })
          .catch(err => {
            console.error('Failed to send session_start event:', err);
          });
      }
      
      // Clear any existing interval
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      
      // Increased sampling frequency to 500ms for better tracking
      intervalIdRef.current = setInterval(() => {
        if (isTracking) {
          const aoi = typeof mouse.current.aoi === 'string' ? mouse.current.aoi : (mouse.current.aoi?.aoi || '');
          const bounds = mouse.current.aoiInfo?.bounds || null;
          sendEvent({ 
            eventType: 'sample',
            description: aoi ? `Sampling at ${aoi}` : 'Sampling (no AOI)',
            elementBounds: bounds
          });
        }
      }, 500);
    } else {
      // Stop sampling when tracking is disabled
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      
      // Send session_end event when tracking stops (if it was previously tracking)
      if (firstEventTime.current !== null) {
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        const offsetMs = nowMs - firstEventTime.current;
        
        const payload = {
          session_id: sessionId.current,
          event_type: 'session_end',
          timestamp_iso: nowIso,
          offset_ms: offsetMs,
          page: window.location.pathname
        };
        
        // Stop Tobii eye tracker first
        fetch(`${BASE}/api/eye_tracker/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId.current
          })
        }).then(res => res.json())
          .then(data => {
            console.log('Tobii eye tracker stopped:', data);
          })
          .catch(err => {
            console.error('Failed to stop Tobii eye tracker:', err);
            // Continue even if eye tracker fails to stop
          });
        
        // Send session_end event asynchronously
        fetch(`${BASE}/api/aoi_event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(err => {
          console.error('Failed to send session_end event:', err);
        });
      }
      
      // Reset firstEventTime and session ID when tracking stops; 清除持久化，仅由 End 结束会话
      firstEventTime.current = null;
      sessionId.current = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('aoi_is_recording');
        localStorage.removeItem('aoi_session_id');
      }
    }

    // teardown
    const cleanup = () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      if (mouseMoveThrottleRef.current) {
        clearTimeout(mouseMoveThrottleRef.current);
        mouseMoveThrottleRef.current = null;
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      window.removeEventListener('mousemove', onMouseMoveThrottled);
      window.removeEventListener('click',     onClick);
      document.removeEventListener('mouseenter', onMouseEnter, true);
      document.removeEventListener('mouseleave', onMouseLeave, true);
      document.removeEventListener('input',   onInput, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup',   onKeyUp, true);
      document.removeEventListener('focus',   onFocus, true);
      document.removeEventListener('blur',    onBlur, true);
      if (wg) {
        wg.clearGazeListener();
        wg.pause();
      }
    };
    
    window.addEventListener('beforeunload', cleanup);
    return () => {
      cleanup();
      window.removeEventListener('beforeunload', cleanup);
    };
  }, [isTracking]);

  return null;
}
