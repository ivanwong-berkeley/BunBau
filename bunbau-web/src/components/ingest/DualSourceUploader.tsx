'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Image as ImageIcon, X, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { StagingIngestionResponse } from '../../lib/types/ingestion';

interface DualSourceUploaderProps {
  userId?: string;
  onStagingReady: (stagingData: StagingIngestionResponse) => void;
  onClose?: () => void;
}

export function DualSourceUploader({
  userId = 'demo-user',
  onStagingReady,
  onClose,
}: DualSourceUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const valid = newFiles.filter((f) => {
      const name = f.name.toLowerCase();
      return (
        name.endsWith('.csv') ||
        name.endsWith('.tsv') ||
        name.endsWith('.ofx') ||
        name.endsWith('.png') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.webp')
      );
    });

    if (valid.length < newFiles.length) {
      setErrorMessage('Some files were ignored. Only CSV, TSV, OFX, and image files are supported.');
    } else {
      setErrorMessage(null);
    }

    setSelectedFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProcessUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('userId', userId);
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch('/api/v1/ingest/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload failed with HTTP ${res.status}`);
      }

      const stagingData: StagingIngestionResponse = await res.json();
      onStagingReady(stagingData);
    } catch (err) {
      console.error('Ingestion Upload Error:', err);
      setErrorMessage((err as Error).message || 'Failed to process files');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UploadCloud className="text-primary-mint" size={22} />
            Dual-Source Portfolio Ingestion
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Upload brokerage screenshots (PNG, JPG) and/or institution exports (Fidelity, Schwab CSV).
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="dual-source-dropzone"
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
          isDragging
            ? 'border-primary-mint bg-primary-mint/5 dark:bg-primary-mint/10'
            : 'border-gray-300 dark:border-slate-700 hover:border-primary-mint/50 dark:hover:border-primary-mint/50 bg-gray-50/50 dark:bg-slate-800/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.tsv,.ofx,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={handleFileInput}
        />
        <div className="flex justify-center gap-3 mb-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
            <FileSpreadsheet size={24} />
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
            <ImageIcon size={24} />
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Drag & Drop Brokerage Files Here
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Supports Fidelity & Schwab CSV exports + raw portfolio screenshots
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Selected Files Queue */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase">
            Queued Files ({selectedFiles.length})
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {selectedFiles.map((file, idx) => {
              const isCsv = file.name.endsWith('.csv') || file.name.endsWith('.tsv');
              return (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isCsv ? (
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                        CSV
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                        IMG
                      </span>
                    )}
                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                      {file.name}
                    </span>
                    <span className="text-gray-400 shrink-0">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleProcessUpload}
          disabled={selectedFiles.length === 0 || isUploading}
          data-testid="reconcile-upload-btn"
          className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-mint text-slate-900 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition"
        >
          {isUploading ? (
            'Processing & Reconciling…'
          ) : (
            <>
              Ingest & Reconcile <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
