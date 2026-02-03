import React from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

interface SettingsModalProps {
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const {
        showTitle, showSubtitle, titleKey, subtitleKey,
        toggleShowTitle, toggleShowSubtitle, setTitleKey, setSubtitleKey
    } = useSettingsStore();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-base border border-subtle rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 slide-in-from-bottom-4">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-subtle">
                    <h2 className="text-lg font-bold text-text-main">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-accent uppercase tracking-wider">Tile Display</h3>

                        {/* Title Settings */}
                        <div className="flex flex-col gap-3 p-3 bg-surface rounded-lg border border-subtle transition-all duration-200 focus-within:ring-1 focus-within:ring-accent/50">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-text-main font-medium">Show Title</span>
                                    <span className="text-xs text-text-dim">Display a field as a prominent header</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={showTitle}
                                        onChange={toggleShowTitle}
                                    />
                                    <div className="w-11 h-6 bg-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                </label>
                            </div>

                            {showTitle && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200 pt-2 border-t border-subtle/30">
                                    <label className="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wide">
                                        Field Name
                                    </label>
                                    <input
                                        type="text"
                                        value={titleKey}
                                        onChange={(e) => setTitleKey(e.target.value)}
                                        placeholder="e.g., Title, Name, ID"
                                        className="w-full px-3 py-2 bg-base border border-subtle rounded-md text-sm text-text-main focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-text-dim/50"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Subtitle Settings */}
                        <div className="flex flex-col gap-3 p-3 bg-surface rounded-lg border border-subtle transition-all duration-200 focus-within:ring-1 focus-within:ring-accent/50">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-text-main font-medium">Show Subtitle</span>
                                    <span className="text-xs text-text-dim">Display a field as a sub-header</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={showSubtitle}
                                        onChange={toggleShowSubtitle}
                                    />
                                    <div className="w-11 h-6 bg-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                </label>
                            </div>

                            {showSubtitle && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200 pt-2 border-t border-subtle/30">
                                    <label className="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wide">
                                        Field Name
                                    </label>
                                    <input
                                        type="text"
                                        value={subtitleKey}
                                        onChange={(e) => setSubtitleKey(e.target.value)}
                                        placeholder="e.g., Subtitle, Description"
                                        className="w-full px-3 py-2 bg-base border border-subtle rounded-md text-sm text-text-main focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-text-dim/50"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-subtle flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-surface hover:bg-highlight border border-subtle rounded-lg text-text-main font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SettingsModal;
