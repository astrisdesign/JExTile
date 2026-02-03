import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ParsedFile, JsonObject, JsonValue } from './types';
import FileUpload from './components/FileUpload';
import JsonGrid from './components/JsonGrid';
import JsonModal from './components/JsonModal';
import HelpModal from './components/HelpModal';
import SettingsModal from './components/SettingsModal';
import { AlertCircle, Home, Save, RotateCcw, RotateCw, Settings } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const MAX_HISTORY = 50;

const App: React.FC = () => {
  // Split metadata and data to manage history efficiently
  const [meta, setMeta] = useState<{ name: string, size: number } | null>(null);

  // History State
  const [history, setHistory] = useState<{
    past: JsonObject[][];
    present: JsonObject[] | null;
    future: JsonObject[][];
  }>({
    past: [],
    present: null,
    future: []
  });

  const [error, setError] = useState<string | null>(null);

  // State for raw file editing (fixing invalid JSON)
  const [rawFileState, setRawFileState] = useState<{ text: string, name: string, size: number } | null>(null);

  // State for help modal
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Construct the ParsedFile object on the fly from current history state
  const parsedFile: ParsedFile | null = useMemo(() => {
    if (!meta || !history.present) return null;
    return {
      name: meta.name,
      size: meta.size,
      data: history.present
    };
  }, [meta, history.present]);

  const processJsonData = useCallback((json: any, name: string, size: number) => {
    let dataToDisplay: JsonObject[] = [];

    if (Array.isArray(json)) {
      dataToDisplay = json.filter(item => typeof item === 'object' && item !== null);
    } else if (typeof json === 'object' && json !== null) {
      const possibleArray = Object.values(json).find(val => Array.isArray(val) && val.length > 0 && typeof val[0] === 'object');
      if (possibleArray) {
        dataToDisplay = possibleArray as JsonObject[];
      } else {
        dataToDisplay = [json as JsonObject];
      }
    }

    if (dataToDisplay.length === 0) {
      setError("The JSON file does not contain a valid list of objects to display.");
      return;
    }

    // Initialize State
    setMeta({ name, size });
    setHistory({
      past: [],
      present: dataToDisplay,
      future: []
    });
    setError(null);
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    setError(null);
    setRawFileState(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const json = JSON.parse(text);
        processJsonData(json, file.name, file.size);
      } catch (err) {
        // Instead of error, open raw editor
        setRawFileState({ text, name: file.name, size: file.size });
      }
    };

    reader.onerror = () => {
      setError("Failed to read the file.");
    };

    reader.readAsText(file);
  }, [processJsonData]);

  const handleRawSave = useCallback((newData: JsonValue) => {
    if (rawFileState) {
      processJsonData(newData, rawFileState.name, rawFileState.size);
      setRawFileState(null);
    }
  }, [rawFileState, processJsonData]);

  const handleReset = useCallback(() => {
    setMeta(null);
    setHistory({ past: [], present: null, future: [] });
    setError(null);
    setRawFileState(null);
  }, []);

  // Update logic: Pushes current state to 'past' before updating 'present'
  const handleDataUpdate = useCallback((newData: JsonObject[]) => {
    setHistory(curr => {
      if (!curr.present) return curr;

      const newPast = [...curr.past, curr.present];
      // Enforce history limit
      if (newPast.length > MAX_HISTORY) newPast.shift();

      return {
        past: newPast,
        present: newData,
        future: [] // Clear future on new action
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(curr => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [curr.present!, ...curr.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(curr => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);

      return {
        past: [...curr.past, curr.present!],
        present: next,
        future: newFuture
      };
    });
  }, []);

  const handleDownload = useCallback(async () => {
    if (!parsedFile) return;

    try {
      // 1. Open Native Save Dialog
      // Returns the selected path (string) or null if canceled
      const filePath = await save({
        defaultPath: parsedFile.name || 'data.json',
        filters: [{
          name: 'JSON File',
          extensions: ['json']
        }]
      });

      if (!filePath) return; // User canceled

      // 2. Write content to the selected path
      // Works because save() whitelists this path for the current session
      const jsonString = JSON.stringify(parsedFile.data, null, 2);
      await writeTextFile(filePath, jsonString);

    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [parsedFile]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Export: Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        // Check if modal is present by looking for its ID.
        // If modal is open, let the modal handle the shortcut via its own listener.
        if (document.getElementById('json-modal-root')) {
          return;
        }
        handleDownload();
        return;
      }

      // Do not override native undo/redo in text inputs
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+Shift+Z or Cmd+Shift+Z
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Redo: Ctrl+Y or Cmd+Y (Standard alternative)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleDownload]);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Ctrl+Scroll font-size scaling
  useEffect(() => {
    let fontSize = 16; // Default browser base size (px)

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault(); // Prevent native browser zoom/scroll

        // Determine direction and apply smooth step
        // Normalize delta to handle both trackpads and mouse wheels
        const direction = e.deltaY > 0 ? -1 : 1;
        const step = 1;

        // Clamp between 8px (50%) and 32px (200%)
        fontSize = Math.min(Math.max(8, fontSize + (direction * step)), 32);

        document.documentElement.style.fontSize = `${fontSize}px`;
      }
    };

    // { passive: false } is required to use preventDefault() on wheel events
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="min-h-screen bg-base text-text-main font-sans selection:bg-accent/20 selection:text-accent">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-subtle bg-base/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none group"
              aria-label="Return to upload screen"
            >
              <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                <Home className="w-5 h-5 text-accent" />
              </div>
              <h1 className="text-xl font-serif font-medium tracking-tight text-white group-hover:text-accent/90 transition-colors">
                JExTile
              </h1>
            </button>
          </div>

          {parsedFile && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-surface/50 rounded-lg border border-subtle p-1 mr-2">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="p-1.5 text-text-muted hover:text-white hover:bg-white/10 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Undo (Ctrl+Z)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-subtle mx-1"></div>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="p-1.5 text-text-muted hover:text-white hover:bg-white/10 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-main hover:text-accent hover:bg-surface rounded-lg transition-all border border-transparent hover:border-subtle"
                title="Keyboard Shortcuts"
                aria-label="Show keyboard shortcuts"
              >
                <span className="text-lg leading-none">ⓘ</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-main hover:text-accent hover:bg-surface rounded-lg transition-all border border-transparent hover:border-subtle"
                title="Save to Disk (Ctrl+S)"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-main hover:text-accent hover:bg-surface rounded-lg transition-all border border-transparent hover:border-subtle"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-8">
        {!parsedFile ? (
          <div className="max-w-2xl mx-auto mt-16 sm:mt-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-10">
            </div>

            <FileUpload onFileSelect={handleFileUpload} />

            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>
        ) : (
          <JsonGrid file={parsedFile} onUpdate={handleDataUpdate} />
        )}
      </main>

      {/* Raw JSON Editor for Invalid Files */}
      {rawFileState && (
        <JsonModal
          initialText={rawFileState.text}
          title="Fix Invalid JSON"
          onClose={() => setRawFileState(null)}
          onSave={handleRawSave}
        />
      )}

      {/* Help Modal */}
      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default App;
