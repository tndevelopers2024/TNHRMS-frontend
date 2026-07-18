import { X, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DocumentViewerModal({ isOpen, onClose, fileUrl }) {
  if (!isOpen || !fileUrl) return null;

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/')) return `${import.meta.env.VITE_API_URL}${url}`;
    return url;
  };

  const fullFileUrl = getFullUrl(fileUrl);
  const isPdf = fullFileUrl.toLowerCase().endsWith('.pdf');
  const isImage = fullFileUrl.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/) != null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50/50">
          <div className="flex items-center gap-2">
            {isPdf ? <FileText className="w-5 h-5 text-blue-500" /> : <ImageIcon className="w-5 h-5 text-green-500" />}
            <h3 className="font-semibold text-gray-900">Document Viewer</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(fullFileUrl, '_blank')} className="gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-red-50 hover:text-red-600 rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100/50 p-4 flex items-center justify-center min-h-[500px]">
          {isPdf ? (
            <iframe 
              src={`${fullFileUrl}#toolbar=0`} 
              className="w-full h-full min-h-[600px] border-0 rounded shadow-sm bg-white"
              title="PDF Viewer"
            />
          ) : isImage ? (
            <img 
              src={fullFileUrl} 
              alt="Document" 
              className="max-w-full max-h-full object-contain rounded shadow-sm"
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-md">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">Preview not available for this file type.</p>
              <Button onClick={() => window.open(fullFileUrl, '_blank')}>
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
