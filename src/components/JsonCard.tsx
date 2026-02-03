import React from 'react';
import { JsonValue } from '../types';
import { FileJson, GripVertical, Trash2 } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

interface JsonCardProps {
  id?: string;
  data: JsonValue;
  name: string | number; // Key or Index
  isActive: boolean;
  isSelected: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onDetailsClick: () => void;
  onDelete: () => void;
}

const JsonCard: React.FC<JsonCardProps> = ({
  id,
  data,
  name,
  isActive,
  isSelected,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onClick,
  onDoubleClick,
  onDetailsClick,
  onDelete
}) => {
  const { showTitle, showSubtitle } = useSettingsStore();

  // Generate preview string
  const rawString = JSON.stringify(data);
  const preview = rawString.slice(0, 30) + (rawString.length > 30 ? '...' : '');

  // Helper to render values intelligently
  const renderValue = (val: any): React.ReactNode => {
    if (val === null) return <span className="text-text-dim italic">null</span>;
    if (val === undefined) return <span className="text-text-dim italic">undefined</span>;

    // Arrays -> Bulleted List
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-text-dim">[]</span>;
      return (
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          {val.slice(0, 4).map((item, i) => (
            <li key={i} className="text-text-main truncate">
              {typeof item === 'object' ? '{...}' : String(item)}
            </li>
          ))}
          {val.length > 4 && <li className="text-text-dim text-[10px] list-none pl-4">+{val.length - 4} more</li>}
        </ul>
      );
    }

    // Objects -> Key: Value pairs
    if (typeof val === 'object') {
      const keys = Object.keys(val);
      if (keys.length === 0) return <span className="text-text-dim">{"{}"}</span>;
      return (
        <div className="flex flex-col gap-0.5 ml-1 border-l-2 border-subtle pl-2">
          {keys.slice(0, 4).map(k => (
            <div key={k} className="flex gap-2 truncate">
              <span className="text-text-muted shrink-0">{k}:</span>
              <span className="text-text-main font-semibold truncate">{typeof val[k] === 'object' ? '...' : String(val[k])}</span>
            </div>
          ))}
          {keys.length > 4 && <span className="text-text-dim text-[10px] pl-1">+{keys.length - 4} more</span>}
        </div>
      );
    }

    // Primitives -> Text
    return <span className="text-text-main">{String(val)}</span>;
  };

  const renderBody = () => {
    if (data === null) return <div className="text-text-dim italic">null</div>;

    if (typeof data !== 'object') {
      return (
        <div className="flex flex-col h-full">
          <span className="text-accent font-bold text-[10px] tracking-wide truncate mb-2" title={String(name)}>
            {name}
          </span>
          <div className="flex items-center justify-center flex-1">
            <span className="text-xl text-text-main font-bold font-mono break-all">{String(data)}</span>
          </div>
        </div>
      );
    }

    // Array logic for card body
    if (Array.isArray(data)) {
      const items = data.slice(0, 6);
      return (
        <div className="flex flex-col h-full">
          <span className="text-accent font-bold text-[10px] tracking-wide truncate mb-2" title={String(name)}>
            {name}
          </span>

          {items.length > 0 ? (
            <div className="flex flex-col gap-2">
              {items.map((item, i) => (
                <div key={i} className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="text-accent font-bold text-[10px] font-mono">{i}</span>
                  <div className="text-text-main font-semibold text-xs truncate pl-2 border-l border-subtle">
                    {typeof item === 'object' ? (Array.isArray(item) ? '[...]' : '{...}') : String(item)}
                  </div>
                </div>
              ))}
              {data.length > 6 && <div className="text-[10px] text-text-dim pt-1 italic">+{data.length - 6} items</div>}
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1 text-text-dim italic opacity-50">
              <span>Empty Array</span>
            </div>
          )}
        </div>
      );
    }

    // Object logic for card body
    const allKeys = Object.keys(data);
    const { titleKey, subtitleKey } = useSettingsStore();

    // Identify Title and Subtitle if settings are enabled
    // Use the dynamic keys from store instead of hardcoded strings
    const foundTitleKey = showTitle ? allKeys.find(k => k.toLowerCase() === titleKey.toLowerCase()) : undefined;
    const foundSubtitleKey = showSubtitle ? allKeys.find(k => k.toLowerCase() === subtitleKey.toLowerCase()) : undefined;

    const bodyKeys = allKeys.slice(0, 6);
    const remainingCount = Math.max(0, allKeys.length - bodyKeys.length);

    return (
      <div className="flex flex-col h-full gap-2">
        {/* Custom Header Area */}
        {(foundTitleKey || foundSubtitleKey) && (
          <div className="mb-2 pb-2 border-b border-subtle/30">
            {foundTitleKey && (data as any)[foundTitleKey] && (
              <div className="text-lg font-bold text-text-main leading-snug">
                {String((data as any)[foundTitleKey])}
              </div>
            )}
            {foundSubtitleKey && (data as any)[foundSubtitleKey] && (
              <div className="text-sm text-accent font-medium mt-0.5">
                {String((data as any)[foundSubtitleKey])}
              </div>
            )}
          </div>
        )}

        {bodyKeys.length > 0 ? (
          <>
            {bodyKeys.map(key => (
              <div key={key} className="flex flex-col gap-1 overflow-hidden">
                <span className="text-accent font-bold text-[10px] tracking-wide truncate" title={key}>
                  {key}
                </span>
                <div className="text-text-main leading-relaxed">
                  {renderValue((data as any)[key])}
                </div>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="mt-auto pt-2 text-[10px] text-text-dim font-medium border-t border-subtle/30">
                + {remainingCount} more properties
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-text-dim italic opacity-50">
            <span>Empty Object</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      id={id}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`
        group relative flex flex-col rounded-xl overflow-hidden transition-all duration-300 h-full min-h-[200px] border
        ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${isActive
          ? 'border-accent/80 shadow-glow ring-1 ring-accent/10'
          : 'border-subtle hover:border-accent/50 hover:shadow-glow'
        }
        ${isSelected
          ? 'bg-accent/15'
          : isActive ? 'bg-surface' : 'bg-surface'
        }
      `}
    >
      {/* Header Bar */}
      <div className={`
          flex items-center gap-3 px-3 py-2 border-b text-[10px] font-mono italic select-none
          ${isSelected ? 'bg-accent/20 border-accent/20 text-text-main' : 'bg-white/5 border-subtle/50 text-text-muted'}
      `}>
        {draggable && (
          <div className="text-text-dim/50 group-hover:text-text-dim cursor-grab">
            <GripVertical className="w-3 h-3" />
          </div>
        )}
        <span className="font-extrabold not-italic min-w-[1.5rem] truncate">{name}</span>
        <div className="h-3 w-0.5 bg-white/20 shrink-0"></div>
        <span className="truncate font-bold">{preview}</span>
      </div>

      {/* Details Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDetailsClick();
        }}
        className={`
          absolute top-10 right-3 transition-all duration-200 z-20 p-2 bg-surface hover:bg-highlight border border-subtle rounded-lg shadow-lg text-text-muted hover:text-accent
          ${isActive || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `}
        title="View Raw JSON"
      >
        <FileJson className="w-4 h-4" />
      </button>

      {/* Delete Button - Only visible when active */}
      {isActive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute bottom-3 right-3 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors z-20 animate-in fade-in zoom-in duration-200"
          title="Delete Item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Body */}
      <div className={`
          p-6 pt-4 flex-1 flex flex-col gap-4 text-xs font-mono
          ${isSelected ? 'bg-transparent' : 'bg-base/50'}
      `}>
        {renderBody()}
      </div>
    </div>
  );
};

export default JsonCard;
