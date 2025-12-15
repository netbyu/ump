import { X, Play, Square, HelpCircle } from 'lucide-react';

interface TTSModalProps {
  onClose: () => void;
}

export function TTSModal({ onClose }: TTSModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="text-gray-900">🗣️ Configure Text-to-Speech</div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Text Input */}
          <div>
            <label className="block text-gray-900 mb-2">💬 Prompt Text</label>
            <textarea
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={6}
              placeholder="Enter announcement text..."
              defaultValue="Thank you for calling. Please listen carefully as our menu options have changed."
            />
            <div className="text-gray-500 mt-2">📊 Characters: 145 / 3000</div>
          </div>

          {/* Voice Configuration */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="text-gray-900 mb-4">🎭 Voice Configuration</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">☁️ Provider</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>AWS Polly</option>
                  <option>Azure TTS</option>
                  <option>Google Cloud TTS</option>
                  <option>ElevenLabs</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">🌐 Language</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>English (US)</option>
                  <option>English (UK)</option>
                  <option>French (CA)</option>
                  <option>Spanish (MX)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">👤 Voice</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Joanna (Female)</option>
                  <option>Matthew (Male)</option>
                  <option>Ivy (Female)</option>
                  <option>Joey (Male)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">🎨 Style</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Neutral</option>
                  <option>Cheerful</option>
                  <option>Professional</option>
                  <option>Empathetic</option>
                </select>
              </div>
            </div>
          </div>

          {/* Advanced SSML */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="ssml" className="w-4 h-4 text-blue-600" />
              <label htmlFor="ssml" className="text-gray-900">🔀 Enable SSML Editor</label>
              <button className="ml-auto text-blue-600 hover:text-blue-700">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="text-gray-900 mb-4">🔊 Preview</div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Play className="w-4 h-4" />
                <span>Play Preview</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
              <div className="flex-1 h-12 bg-white border border-gray-300 rounded-lg flex items-center px-4">
                <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-blue-600 rounded-full"></div>
                </div>
              </div>
              <span className="text-gray-600">⏱️ 4.2s</span>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="cache" className="w-4 h-4 text-blue-600" defaultChecked />
              <label htmlFor="cache" className="text-gray-700">💾 Cache Audio (Recommended)</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="fallback" className="w-4 h-4 text-blue-600" defaultChecked />
              <label htmlFor="fallback" className="text-gray-700">🔄 Fallback Voice if Unavailable</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="normalize" className="w-4 h-4 text-blue-600" defaultChecked />
              <label htmlFor="normalize" className="text-gray-700">🔊 Normalize Volume</label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ❌ Cancel
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
            📚 Save to Library
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            ✅ Apply
          </button>
        </div>
      </div>
    </div>
  );
}
