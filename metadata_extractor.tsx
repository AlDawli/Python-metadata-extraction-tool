import React, { useState } from 'react';
import { FileText, Image, FileCode, Info, Download, AlertCircle } from 'lucide-react';

export default function MetadataExtractor() {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const extractImageMetadata = async (file) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
        img.onload = () => {
          const meta = {
            'File Name': file.name,
            'File Size': `${(file.size / 1024).toFixed(2)} KB`,
            'File Type': file.type,
            'Last Modified': new Date(file.lastModified).toLocaleString(),
            'Image Width': `${img.width} px`,
            'Image Height': `${img.height} px`,
            'Aspect Ratio': `${(img.width / img.height).toFixed(2)}:1`,
            'Megapixels': `${((img.width * img.height) / 1000000).toFixed(2)} MP`
          };

          // Try to extract EXIF data if available
          if (window.EXIF) {
            window.EXIF.getData(img, function() {
              const exifData = window.EXIF.getAllTags(this);
              Object.keys(exifData).forEach(key => {
                meta[`EXIF ${key}`] = exifData[key];
              });
              resolve(meta);
            });
          } else {
            resolve(meta);
          }
        };
      };

      reader.readAsDataURL(file);
    });
  };

  const extractPDFMetadata = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(arrayBuffer.slice(0, 5000));
    
    const meta = {
      'File Name': file.name,
      'File Size': `${(file.size / 1024).toFixed(2)} KB`,
      'File Type': file.type,
      'Last Modified': new Date(file.lastModified).toLocaleString(),
    };

    // Extract basic PDF metadata from header
    const titleMatch = text.match(/\/Title\s*\(([^)]+)\)/);
    const authorMatch = text.match(/\/Author\s*\(([^)]+)\)/);
    const creatorMatch = text.match(/\/Creator\s*\(([^)]+)\)/);
    const producerMatch = text.match(/\/Producer\s*\(([^)]+)\)/);
    const creationDateMatch = text.match(/\/CreationDate\s*\(([^)]+)\)/);
    const modDateMatch = text.match(/\/ModDate\s*\(([^)]+)\)/);

    if (titleMatch) meta['PDF Title'] = titleMatch[1];
    if (authorMatch) meta['PDF Author'] = authorMatch[1];
    if (creatorMatch) meta['PDF Creator'] = creatorMatch[1];
    if (producerMatch) meta['PDF Producer'] = producerMatch[1];
    if (creationDateMatch) meta['Creation Date'] = creationDateMatch[1];
    if (modDateMatch) meta['Modification Date'] = modDateMatch[1];

    return meta;
  };

  const extractWordMetadata = async (file) => {
    const meta = {
      'File Name': file.name,
      'File Size': `${(file.size / 1024).toFixed(2)} KB`,
      'File Type': file.type,
      'Last Modified': new Date(file.lastModified).toLocaleString(),
    };

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await window.mammoth.extractRawText({ arrayBuffer });
      const wordCount = result.value.split(/\s+/).filter(word => word.length > 0).length;
      const charCount = result.value.length;
      
      meta['Word Count'] = wordCount;
      meta['Character Count'] = charCount;
      meta['Estimated Pages'] = Math.ceil(wordCount / 250);
    } catch (err) {
      console.log('Could not extract text content:', err);
    }

    return meta;
  };

  const extractGenericMetadata = (file) => {
    return {
      'File Name': file.name,
      'File Size': `${(file.size / 1024).toFixed(2)} KB`,
      'File Type': file.type || 'Unknown',
      'Last Modified': new Date(file.lastModified).toLocaleString(),
      'MIME Type': file.type,
    };
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setMetadata(null);

    try {
      let extractedMetadata;

      if (selectedFile.type.startsWith('image/')) {
        extractedMetadata = await extractImageMetadata(selectedFile);
      } else if (selectedFile.type === 'application/pdf') {
        extractedMetadata = await extractPDFMetadata(selectedFile);
      } else if (selectedFile.type.includes('word') || selectedFile.name.endsWith('.docx')) {
        extractedMetadata = await extractWordMetadata(selectedFile);
      } else {
        extractedMetadata = extractGenericMetadata(selectedFile);
      }

      setMetadata(extractedMetadata);
    } catch (err) {
      setError(`Error extracting metadata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadMetadata = () => {
    if (!metadata) return;

    const content = Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadata_${file.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFileIcon = () => {
    if (!file) return <FileText className="w-12 h-12 text-gray-400" />;
    
    if (file.type.startsWith('image/')) {
      return <Image className="w-12 h-12 text-blue-500" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-12 h-12 text-red-500" />;
    } else if (file.type.includes('word')) {
      return <FileCode className="w-12 h-12 text-blue-600" />;
    }
    return <FileText className="w-12 h-12 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Info className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">Metadata Extractor</h1>
          </div>
          <p className="text-gray-300 text-lg">
            Extract hidden metadata from images, PDFs, Word documents, and more
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 mb-6">
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-purple-400 rounded-xl p-12 text-center hover:border-purple-300 hover:bg-white/5 transition-all">
              {getFileIcon()}
              <p className="text-white mt-4 text-lg font-medium">
                {file ? file.name : 'Click to select a file'}
              </p>
              <p className="text-gray-400 mt-2">
                Supports: Images (JPG, PNG, GIF), PDF, Word (DOCX), and more
              </p>
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept="*/*"
              />
            </div>
          </label>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-500/20 backdrop-blur-lg rounded-xl p-6 border border-blue-400/30 mb-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              <span className="text-blue-300">Extracting metadata...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 backdrop-blur-lg rounded-xl p-6 border border-red-400/30 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <span className="text-red-300">{error}</span>
            </div>
          </div>
        )}

        {/* Metadata Display */}
        {metadata && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Extracted Metadata</h2>
              <button
                onClick={downloadMetadata}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(metadata).map(([key, value]) => (
                <div
                  key={key}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-purple-300 font-semibold min-w-[200px]">
                      {key}:
                    </span>
                    <span className="text-gray-200 break-all">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-400/30">
              <p className="text-blue-300 text-sm">
                <strong>Note:</strong> Some metadata fields may not be available depending on the file type and how it was created.
              </p>
            </div>
          </div>
        )}

        {/* Info Section */}
        {!metadata && !loading && (
          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4">What can be extracted?</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/5 rounded-lg p-4">
                <Image className="w-8 h-8 text-blue-400 mb-2" />
                <h4 className="text-white font-semibold mb-2">Images</h4>
                <p className="text-gray-300">Dimensions, file size, format, EXIF data, camera info</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <FileText className="w-8 h-8 text-red-400 mb-2" />
                <h4 className="text-white font-semibold mb-2">PDFs</h4>
                <p className="text-gray-300">Author, creator, creation date, producer, title</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <FileCode className="w-8 h-8 text-green-400 mb-2" />
                <h4 className="text-white font-semibold mb-2">Documents</h4>
                <p className="text-gray-300">Word count, file info, modification dates</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}