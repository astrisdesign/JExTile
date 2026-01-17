import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ParsedFile, JsonObject, JsonValue } from '../types';
import JsonCard from './JsonCard';
import JsonModal from './JsonModal';
import { Search, ChevronLeft, Home, ChevronRight as BreadcrumbSeparator, FileJson } from 'lucide-react';

interface JsonGridProps {
  file: ParsedFile;
  onUpdate: (newData: JsonObject[]) => void;
}

interface SelectedItemState {
    data: JsonValue;
    name: string | number;
    fullPath: (string | number)[];
}

// Drop Indicator Component
const DropIndicator = ({ isEnd }: { isEnd?: boolean }) => (
  <div className={`
      relative w-0 h-full flex items-center justify-center animate-in fade-in duration-200
      ${isEnd ? 'ml-0' : '-ml-3 mr-3'} 
  `}>
      {/* The visible line: 1px wide with a vibrant cyan glow */}
      <div className="absolute w-[1px] h-[90%] bg-accent rounded-full shadow-glow ring-5 ring-accent/30 z-50"></div>
  </div>
);

const JsonGrid: React.FC<JsonGridProps> = ({ file, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<SelectedItemState | null>(null);
  
  // Navigation & Selection State
  const [path, setPath] = useState<(string | number)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  // Ref to track the anchor point for Shift-click range selections
  const anchorIndexRef = useRef<number | null>(null);
  
  // Drag State
  const [, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  
  // Deterministic drag data (bypasses React state for reliability)
  const dragDataRef = useRef<{ 
    sourceIndex: number; 
    indicesToMove: Set<number>;
    itemsSnapshot: any[]; // Snapshot of allItems at drag start to avoid stale closures
  } | null>(null);
  
  // Track drop target in ref (for onDragEnd, since onDrop is unreliable in WebViews)
  const dropTargetRef = useRef<number | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset focus and selection when path changes
  useEffect(() => {
    setFocusedIndex(null);
    setSelectedIndices(new Set());
    anchorIndexRef.current = null;
    setSearchTerm('');
  }, [path]);

  // Scroll to focused item
  useEffect(() => {
    if (focusedIndex !== null) {
      const el = document.getElementById(`card-${focusedIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  // Resolve current data based on path
  const currentLevelData = useMemo(() => {
    let current: JsonValue = file.data;
    for (const key of path) {
        if (current && typeof current === 'object') {
            current = (current as any)[key];
        } else {
            return null; // Should not happen
        }
    }
    return current;
  }, [file.data, path]);

  // Convert current data into a list of items (cards)
  const allItems = useMemo(() => {
    if (!currentLevelData) return [];
    
    if (Array.isArray(currentLevelData)) {
        return currentLevelData.map((val, idx) => ({ name: idx, value: val }));
    }
    
    if (typeof currentLevelData === 'object' && currentLevelData !== null) {
        return Object.entries(currentLevelData).map(([key, val]) => ({ name: key, value: val }));
    }

    return []; // Primitives don't show children
  }, [currentLevelData]);

  // Filtering
  const filteredData = useMemo(() => {
    if (!searchTerm) return allItems;
    
    const lowerTerm = searchTerm.toLowerCase();
    return allItems.filter(item => {
      // Search in key or value
      return String(item.name).toLowerCase().includes(lowerTerm) || 
             JSON.stringify(item.value).toLowerCase().includes(lowerTerm);
    });
  }, [allItems, searchTerm]);

  // No pagination: show all filtered data
  const currentData = filteredData;

  // Safety: ensure focusedIndex is valid when data changes size (e.g. deletion/undo)
  useEffect(() => {
      if (focusedIndex !== null) {
          if (currentData.length === 0) {
              setFocusedIndex(null);
              setSelectedIndices(new Set());
          } else if (focusedIndex >= currentData.length) {
              setFocusedIndex(currentData.length - 1);
              // Clean up selection if indices are out of bounds
              setSelectedIndices(prev => {
                  const next = new Set(prev);
                  Array.from(next).forEach(i => {
                      if (i >= currentData.length) next.delete(i);
                  });
                  return next;
              });
          }
      }
  }, [currentData.length, focusedIndex]);

  // Helper to deep update the file data
  const updateDataAtCurrentPath = useCallback((newData: JsonValue) => {
    const setDeep = (obj: any, targetPath: (string|number)[], value: any): any => {
      if (targetPath.length === 0) return value;
      const [head, ...rest] = targetPath;
      
      // Clone current level
      const copy = Array.isArray(obj) ? [...obj] : { ...obj };
      
      // Get next object, ensuring it exists
      const nextObj = obj && obj[head] !== undefined ? obj[head] : (typeof rest[0] === 'number' ? [] : {});
      
      copy[head] = setDeep(nextObj, rest, value);
      return copy;
    };

    const newRoot = setDeep(file.data, path, newData);
    
    // Safety check for root
    if (path.length === 0 && !Array.isArray(newRoot)) {
        console.error("Root update failed validation: must be an array.");
        return;
    }
    
    onUpdate(newRoot as JsonObject[]);
  }, [file.data, path, onUpdate]);

  // Deterministic Multi-Item Reorder (takes indices as param, no state dependencies)
  const moveItemsDirect = useCallback((indicesToMove: Set<number>, targetIndex: number) => {
      if (searchTerm) return; // Cannot reorder while filtering
      
      const indices = Array.from(indicesToMove).sort((a, b) => a - b);
      if (indices.length === 0) return;

      // 1. Separate items to move and items to stay
      const itemsToMove = indices.map(i => allItems[i]);
      const itemsToStay = allItems.filter((_, i) => !indicesToMove.has(i));

      // 2. Calculate Insertion Point
      const numSelectedBeforeTarget = indices.filter(i => i < targetIndex).length;
      let insertionIndex = targetIndex - numSelectedBeforeTarget;

      // Clamp to bounds
      if (insertionIndex < 0) insertionIndex = 0;
      if (insertionIndex > itemsToStay.length) insertionIndex = itemsToStay.length;

      // 3. Construct new array
      const newItems = [...itemsToStay];
      newItems.splice(insertionIndex, 0, ...itemsToMove);

      // 4. Update Data Structure
      let newData: JsonValue;
      if (Array.isArray(currentLevelData)) {
          newData = newItems.map(i => i.value);
      } else {
          // Reconstruct object preserving order
          const newObj: JsonObject = {};
          newItems.forEach(item => {
              newObj[item.name as string] = item.value;
          });
          newData = newObj;
      }

      updateDataAtCurrentPath(newData);
      
      // 5. Update Selection (Consolidated)
      const newSet = new Set<number>();
      for(let i = 0; i < itemsToMove.length; i++) {
          newSet.add(insertionIndex + i);
      }
      setSelectedIndices(newSet);
      setFocusedIndex(insertionIndex);
      anchorIndexRef.current = insertionIndex;

  }, [allItems, currentLevelData, searchTerm, updateDataAtCurrentPath]);

  // Multi-Item Reorder Logic (wrapper for state-based calls)
  const handleMoveItems = useCallback((targetIndex: number) => {
      moveItemsDirect(selectedIndices, targetIndex);
  }, [selectedIndices, moveItemsDirect]);

  const handleDelete = useCallback((targetIndex?: number) => {
    let localIndicesToDelete: number[] = [];

    // Case 1: Specific target (trashcan click on a card)
    if (typeof targetIndex === 'number') {
        if (selectedIndices.has(targetIndex)) {
             // If clicking trash on a selected item, delete all selected
             localIndicesToDelete = Array.from(selectedIndices);
        } else {
             // If clicking trash on unselected item, delete only that item
             localIndicesToDelete = [targetIndex];
        }
    } 
    // Case 2: General Delete (keyboard or other triggers)
    else {
        if (selectedIndices.size > 0) {
            localIndicesToDelete = Array.from(selectedIndices);
        } else if (focusedIndex !== null) {
            localIndicesToDelete = [focusedIndex];
        }
    }

    // Sanity check: ensure we have something to delete
    if (localIndicesToDelete.length === 0) return;

    // Filter valid indices (guard against stale state)
    localIndicesToDelete = localIndicesToDelete.filter(i => currentData[i]);
    if (localIndicesToDelete.length === 0) return;

    // Map local indices to actual data items to get their keys/IDs
    const itemsToDelete = localIndicesToDelete.map(i => currentData[i]);

    let newData: JsonValue;
    if (Array.isArray(currentLevelData)) {
        const newArray = [...currentLevelData];
        // Sort indices descending to splice safely from the end
        const indicesToDelete = itemsToDelete
            .map(item => Number(item.name))
            .sort((a, b) => b - a);
            
        indicesToDelete.forEach(idx => {
            if (idx >= 0 && idx < newArray.length) {
                newArray.splice(idx, 1);
            }
        });
        newData = newArray;
    } else {
        const newObj = { ...currentLevelData as JsonObject };
        itemsToDelete.forEach(item => {
            delete newObj[item.name as string];
        });
        newData = newObj;
    }

    updateDataAtCurrentPath(newData);
    setSelectedIndices(new Set());
    
    // Focus management: try to stay at the earliest deleted index
    const minDeleted = Math.min(...localIndicesToDelete);
    setFocusedIndex(minDeleted);

  }, [currentData, currentLevelData, updateDataAtCurrentPath, selectedIndices, focusedIndex]);

  // Drag Handlers
  const onDragStart = (e: React.DragEvent, index: number) => {
      if (searchTerm) {
          e.preventDefault();
          return;
      }
      
      // CRITICAL: Set data immediately for WebView compatibility
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData("text/plain", index.toString());
      
      // BULLETPROOF: Snapshot ALL data at drag start to avoid stale closures
      const indicesToMove = selectedIndices.has(index) 
          ? new Set(selectedIndices)
          : new Set([index]);
      
      dragDataRef.current = {
          sourceIndex: index,
          indicesToMove: indicesToMove,
          itemsSnapshot: [...allItems] // Capture exact state of items list
      };
      
      dropTargetRef.current = null; // Reset target
      
      // CRITICAL: Defer state updates to next tick for WebView compatibility
      requestAnimationFrame(() => {
          if (!selectedIndices.has(index)) {
              setSelectedIndices(new Set([index]));
              setFocusedIndex(index);
              anchorIndexRef.current = index;
          }
          setDraggedIndex(index);
      });
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      // Get the bounding box of the card being hovered
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      // Calculate mouse position relative to the card's left edge
      const relX = e.clientX - rect.left;
      // If the mouse is past the horizontal midpoint, target the next index
      const isAfter = relX > rect.width / 2;
      
      const newTarget = isAfter ? index + 1 : index;
      
      setDropTargetIndex(newTarget); // For UI visual (drop indicator)
      dropTargetRef.current = newTarget; // For logic (onDragEnd can read this)
  };

  const onDrop = (e: React.DragEvent) => {
      // Simplified: Just prevent default to satisfy HTML5 drag-drop API
      // The actual move logic happens in onDragEnd (which always fires)
      e.preventDefault();
  };

  const onDragEnd = () => {
      // BULLETPROOF: Execute move using snapshot data (always fires, no stale closures)
      const dragData = dragDataRef.current;
      const targetIndex = dropTargetRef.current;

      // Only move if we have both data and a valid target
      if (dragData && targetIndex !== null && !searchTerm) {
          const { indicesToMove, itemsSnapshot } = dragData;
          const indices = Array.from(indicesToMove).sort((a, b) => a - b);
          
          if (indices.length > 0) {
              // 1. Separate items to move and items to stay (using SNAPSHOT)
              const itemsToMove = indices.map(i => itemsSnapshot[i]);
              const itemsToStay = itemsSnapshot.filter((_, i) => !indicesToMove.has(i));

              // 2. Calculate Insertion Point
              const numSelectedBeforeTarget = indices.filter(i => i < targetIndex).length;
              let insertionIndex = targetIndex - numSelectedBeforeTarget;

              // Clamp to bounds
              if (insertionIndex < 0) insertionIndex = 0;
              if (insertionIndex > itemsToStay.length) insertionIndex = itemsToStay.length;

              // 3. Construct new array
              const newItems = [...itemsToStay];
              newItems.splice(insertionIndex, 0, ...itemsToMove);

              // 4. Update Data Structure
              let newData: JsonValue;
              if (Array.isArray(currentLevelData)) {
                  newData = newItems.map(i => i.value);
              } else {
                  // Reconstruct object preserving order
                  const newObj: JsonObject = {};
                  newItems.forEach(item => {
                      newObj[item.name as string] = item.value;
                  });
                  newData = newObj;
              }

              updateDataAtCurrentPath(newData);
              
              // 5. Update Selection
              const newSet = new Set<number>();
              for(let i = 0; i < itemsToMove.length; i++) {
                  newSet.add(insertionIndex + i);
              }
              setSelectedIndices(newSet);
              setFocusedIndex(insertionIndex);
              anchorIndexRef.current = insertionIndex;
          }
      }

      // Cleanup
      setDraggedIndex(null);
      setDropTargetIndex(null);
      dragDataRef.current = null;
      dropTargetRef.current = null;
  };

  // Card Selection Handler
  const handleCardClick = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
          // Toggle selection
          const newSet = new Set(selectedIndices);
          if (newSet.has(index)) newSet.delete(index);
          else newSet.add(index);
          
          setSelectedIndices(newSet);
          setFocusedIndex(index);
          anchorIndexRef.current = index;
      } else if (e.shiftKey && anchorIndexRef.current !== null) {
          // Range selection
          const start = Math.min(anchorIndexRef.current, index);
          const end = Math.max(anchorIndexRef.current, index);
          const newSet = new Set<number>();
          for (let i = start; i <= end; i++) newSet.add(i);
          setSelectedIndices(newSet);
          setFocusedIndex(index);
      } else {
          // Single selection
          setSelectedIndices(new Set([index]));
          setFocusedIndex(index);
          anchorIndexRef.current = index;
      }
  };

  // Navigation Logic
  const handleDrillDown = (key: string | number, val: JsonValue) => {
      // Only drill if it's an object or array
      if (typeof val === 'object' && val !== null) {
          setPath(prev => [...prev, key]);
      } else {
          // Open Modal for primitives as a fallback.
          setSelectedItem({ data: val, name: key, fullPath: [...path, key] });
      }
  };

  const handleNavigateUp = () => {
      if (path.length > 0) {
          setPath(prev => prev.slice(0, -1));
      }
  };

  const handleModalSave = (newData: JsonValue) => {
      if (!selectedItem) return;
      // ... reuse update logic ...
      const setDeep = (obj: any, targetPath: (string|number)[], value: any): any => {
        if (targetPath.length === 0) return value;
        const [head, ...rest] = targetPath;
        const copy = Array.isArray(obj) ? [...obj] : { ...obj };
        const nextObj = obj && obj[head] !== undefined ? obj[head] : (typeof rest[0] === 'number' ? [] : {});
        copy[head] = setDeep(nextObj, rest, value);
        return copy;
      };
      const newRoot = setDeep(file.data, selectedItem.fullPath, newData);
      onUpdate(newRoot as JsonObject[]);
      setSelectedItem(null);
  };

  // Keyboard Navigation & Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal is open, let modal handle it
      if (selectedItem) return;

      const isInputActive = document.activeElement === searchInputRef.current;
      const isTyping = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

      // 's' to focus search
      if (e.key === 's' && !isTyping && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // 'Escape'
      if (e.key === 'Escape') {
        if (isInputActive) {
          searchInputRef.current?.blur();
          return;
        }
        if (focusedIndex !== null) {
          setFocusedIndex(null);
          setSelectedIndices(new Set());
          return;
        }
      }

      // Shift + Enter or Shift + Tab -> Go Up
      if ((e.shiftKey && e.key === 'Enter') || (e.shiftKey && e.key === 'Tab')) {
        e.preventDefault();
        handleNavigateUp();
        return;
      }

      // 'd' to open details
      if (e.key === 'd' && !isTyping && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (focusedIndex !== null) {
            const item = currentData[focusedIndex];
            if (item) {
                setSelectedItem({ data: item.value, name: item.name, fullPath: [...path, item.name] });
            }
        } else {
            const name = path.length > 0 ? path[path.length - 1] : file.name;
            setSelectedItem({ data: currentLevelData, name: name, fullPath: [...path] });
        }
        return;
      }

      // Enter or Tab on selected -> Drill Down
      if ((e.key === 'Enter' || e.key === 'Tab') && !isTyping && focusedIndex !== null && !e.shiftKey) {
        e.preventDefault();
        const item = currentData[focusedIndex];
        if (item) {
            handleDrillDown(item.name, item.value);
        }
        return;
      }

      // Delete key
      if (e.key === 'Delete' && !isTyping && !e.shiftKey && !e.ctrlKey) {
          e.preventDefault();
          handleDelete();
          return;
      }

      // Don't hijack navigation if user is searching
      if (isInputActive) return;

      const itemCount = currentData.length;
      if (itemCount === 0) return;

      // Reordering with Ctrl + Arrow
      if (e.ctrlKey && focusedIndex !== null && !searchTerm && selectedIndices.size > 0) {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              // Move block backward: Target is just before the first item of the current selection block
              const minIndex = Math.min(...Array.from(selectedIndices));
              handleMoveItems(Math.max(0, minIndex - 1));
              return;
          }
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              // Move block forward: Target is after the last item + 1 (to step over the next item)
              const maxIndex = Math.max(...Array.from(selectedIndices));
              handleMoveItems(maxIndex + 2);
              return;
          }
      }

      // Arrow Navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.ctrlKey) {
        e.preventDefault();

        const width = window.innerWidth;
        let cols = 1;
        if (width >= 1280) cols = 4;
        else if (width >= 1024) cols = 3;
        else if (width >= 768) cols = 2;

        setFocusedIndex((prev) => {
          let nextIndex = prev !== null ? prev : 0;
          if (prev === null) {
             // Initial selection logic
             if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = 0;
             else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = itemCount - 1;
          } else {
             switch (e.key) {
               case 'ArrowRight': nextIndex = Math.min(prev + 1, itemCount - 1); break;
               case 'ArrowLeft': nextIndex = Math.max(prev - 1, 0); break;
               case 'ArrowUp': nextIndex = Math.max(prev - cols, 0); break;
               case 'ArrowDown': nextIndex = Math.min(prev + cols, itemCount - 1); break;
             }
          }

          // Handle Selection
          if (e.shiftKey) {
              if (anchorIndexRef.current === null) anchorIndexRef.current = prev !== null ? prev : nextIndex;
              
              const start = Math.min(anchorIndexRef.current, nextIndex);
              const end = Math.max(anchorIndexRef.current, nextIndex);
              const newSet = new Set<number>();
              for (let i = start; i <= end; i++) newSet.add(i);
              setSelectedIndices(newSet);
          } else {
              setSelectedIndices(new Set([nextIndex]));
              anchorIndexRef.current = nextIndex;
          }
          
          return nextIndex;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentData, selectedItem, focusedIndex, path, currentLevelData, file.name, searchTerm, handleMoveItems, handleDelete, selectedIndices]);


  return (
    <div 
      className="animate-in fade-in duration-500 min-h-[500px]" 
      onClick={() => {
          setFocusedIndex(null);
          setSelectedIndices(new Set());
      }}
    >
      {/* Controls Bar (Sticky) */}
      <div className="sticky top-16 z-40 bg-base/95 backdrop-blur-md py-2 -mx-4 px-4 border-b border-subtle/30 mb-6 transition-all shadow-md shadow-base/5">
        <div className="flex flex-col gap-2 max-w-7xl mx-auto">
          
          {/* Breadcrumb / Title Bar */}
          <div className="flex items-center gap-2 p-1 bg-surface/50 border border-subtle rounded-lg overflow-x-auto backdrop-blur-sm">
              <button 
                  onClick={() => setPath([])}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-sm font-bold transition-colors ${path.length === 0 ? 'text-white bg-accent/20' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
              >
                  <Home className="w-3.5 h-3.5" />
                  <span>{file.name}</span>
              </button>
              
              {path.map((segment, i) => (
                  <div key={i} className="flex items-center gap-1 shrink-0">
                      <BreadcrumbSeparator className="w-3.5 h-3.5 text-text-dim" />
                      <button
                          onClick={() => setPath(prev => prev.slice(0, i + 1))}
                          className={`px-2 py-0.5 rounded-md text-sm font-bold transition-colors ${i === path.length - 1 ? 'text-white bg-accent/20' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                      >
                          {segment}
                      </button>
                  </div>
              ))}
          </div>

          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                  {path.length > 0 && (
                      <button onClick={handleNavigateUp} className="p-1.5 rounded-full hover:bg-surface border border-transparent hover:border-subtle text-text-muted transition-all">
                          <ChevronLeft className="w-4 h-4" />
                      </button>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[11px] text-accent font-extrabold shadow-glow">
                  {filteredData.length} items
                  </span>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                      onClick={() => {
                          const name = path.length > 0 ? path[path.length - 1] : file.name;
                          setSelectedItem({ data: currentLevelData, name: name, fullPath: [...path] });
                      }}
                      className="p-2 rounded-full bg-surface border border-subtle text-text-muted hover:text-accent hover:border-accent/30 transition-all flex-shrink-0"
                      title="View/Edit Source (d)"
                  >
                      <FileJson className="w-4 h-4" />
                  </button>
                  <div className="relative w-full md:w-80">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-3.5 w-3.5 text-text-muted" />
                      </div>
                      <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Search... (Press 's')"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="block w-full pl-9 pr-3 py-1.5 bg-surface border-2 border-subtle rounded-full text-text-main font-bold placeholder-text-dim placeholder:font-bold focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-sm transition-all shadow-sm"
                      />
                  </div>
              </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {currentData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative">
          {currentData.map((item, index) => {
            const isSelected = selectedIndices.has(index);
            const isActive = focusedIndex === index;
            const isDropTargetBefore = dropTargetIndex === index;
            
            return (
              <React.Fragment key={item.name}>
                {/* Render the line BEFORE this card if the index matches */}
                {isDropTargetBefore && <DropIndicator />}
                
                <JsonCard 
                  id={`card-${index}`} // Assign ID for scroll handling
                  name={item.name}
                  data={item.value}
                  isActive={isActive}
                  isSelected={isSelected}
                  draggable={!searchTerm} 
                  onDragStart={(e) => onDragStart(e, index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                  onClick={(e) => handleCardClick(e, index)}
                  onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleDrillDown(item.name, item.value);
                  }}
                  onDelete={() => handleDelete(index)}
                  onDetailsClick={() => setSelectedItem({ data: item.value, name: item.name, fullPath: [...path, item.name] })}
                />
              </React.Fragment>
            );
          })}
          
          {/* Special case: If dropping at the very end of the array */}
          {dropTargetIndex === currentData.length && <DropIndicator isEnd />}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-text-dim">
          <Search className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-lg font-light">No items match your search.</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <JsonModal 
          data={selectedItem.data} 
          onClose={() => setSelectedItem(null)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

export default JsonGrid;
