'use client';

import React, { useState, useRef } from 'react';
import { X, UploadCloud, Loader2, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
// Assume md5 is available or we use a basic hash for idempotency if no library is present.
// For browser, we can use a basic string hashing function or crypto API.
async function hashString(message: string) {
  const msgBuffer = new TextEncoder().encode(message);                    
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface UploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractionComplete: () => void;
}

export function UploaderModal({ isOpen, onClose, onExtractionComplete }: UploaderModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  
  // Staging state
  const [stagedData, setStagedData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setStagedData(null);
    setValidationErrors(null);
  };

  const processImage = async () => {
    if (!file) return;
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStagedData(result.data);
        setValidationErrors(null);
      } else if (result.error === 'Data Validation Failed - Missing Critical Fields') {
        setStagedData(result.stagedData);
        setValidationErrors(result.issues);
      } else {
        alert('Extraction failed: ' + result.error);
      }
    } catch (error) {
      console.error(error);
      alert('Network error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproveAndSave = async () => {
    if (!stagedData || !auth.currentUser) return;
    setIsSaving(true);
    try {
      const userId = auth.currentUser.uid;
      const institution = stagedData.institution || 'Unknown';
      const maskedAccount = stagedData.maskedAccount || 'Unknown';
      
      const accountId = await hashString(`${userId}-${institution}-${maskedAccount}`);
      
      const accountRef = doc(db, 'users', userId, 'accounts', accountId);
      await setDoc(accountRef, {
        id: accountId,
        institution,
        maskedAccount,
        accountType: stagedData.accountType || 'Unknown',
        positions: stagedData.positions || [],
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert('Portfolio Updated Successfully!');
      onExtractionComplete();
      resetAndClose();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetAndClose = () => {
    setFile(null);
    setPreview(null);
    setStagedData(null);
    setValidationErrors(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <h2 className="text-xl font-bold dark:text-white">Screenshot Validation & Upload</h2>
          <button onClick={resetAndClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition dark:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left Panel: Image Preview */}
          <div className="w-full md:w-1/2 p-6 border-r border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 overflow-y-auto">
            {!preview ? (
              <div 
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition h-full flex flex-col items-center justify-center ${isDragging ? 'border-primary-mint bg-primary-mint/5' : 'border-gray-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800'}`}
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="font-medium dark:text-gray-200">Drag & drop your screenshot here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={(e) => e.target.files && handleFileSelection(e.target.files[0])} />
              </div>
            ) : (
              <div className="space-y-4 h-full flex flex-col">
                <div className="flex-1 rounded-2xl overflow-hidden bg-black/5 dark:bg-black/20 flex items-center justify-center p-2">
                  <img src={preview} alt="Preview" className="max-w-full max-h-[400px] object-contain rounded-xl shadow-sm" />
                </div>
                {!stagedData && (
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => setPreview(null)} className="flex-1 px-4 py-3 bg-gray-200 dark:bg-slate-700 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition dark:text-white">
                      Cancel
                    </button>
                    <button onClick={processImage} disabled={isUploading} className="flex-1 px-4 py-3 bg-primary-mint text-white font-medium rounded-xl shadow-sm hover:bg-emerald-600 transition flex items-center justify-center gap-2">
                      {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      {isUploading ? 'Extracting via AI...' : 'Analyze Image'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel: Staging & Validation */}
          <div className="w-full md:w-1/2 p-6 overflow-y-auto bg-white dark:bg-slate-800">
            {!stagedData ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p>Upload and analyze an image to review extracted data here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {validationErrors ? (
                  <div className="bg-primary-coral/10 border border-primary-coral/20 p-4 rounded-xl text-primary-coral flex items-start gap-3">
                    <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                    <div>
                      <h3 className="font-bold">Validation Failed (Garbage-In Blocked)</h3>
                      <p className="text-sm mt-1">Critical metadata is missing from the screenshot. Please reject and upload a better image.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-primary-mint/10 border border-primary-mint/20 p-4 rounded-xl text-emerald-700 dark:text-primary-mint flex items-start gap-3">
                    <CheckCircle className="shrink-0 mt-0.5" size={20} />
                    <div>
                      <h3 className="font-bold">Extraction Successful</h3>
                      <p className="text-sm mt-1">All critical data identified successfully.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Institution</label>
                      <input 
                        value={stagedData.institution || ''}
                        onChange={(e) => setStagedData({...stagedData, institution: e.target.value})}
                        className={`w-full mt-1 p-2 border rounded-lg dark:bg-slate-700 dark:text-white ${validationErrors?.institution ? 'border-primary-coral bg-primary-coral/5' : 'border-gray-200 dark:border-slate-600'}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Masked Account</label>
                      <input 
                        value={stagedData.maskedAccount || ''}
                        onChange={(e) => setStagedData({...stagedData, maskedAccount: e.target.value})}
                        className={`w-full mt-1 p-2 border rounded-lg dark:bg-slate-700 dark:text-white ${validationErrors?.maskedAccount ? 'border-primary-coral bg-primary-coral/5' : 'border-gray-200 dark:border-slate-600'}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Positions Extracted ({stagedData.positions?.length || 0})</label>
                    <div className="mt-1 border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                          <tr>
                            <th className="p-2 font-medium">Symbol</th>
                            <th className="p-2 font-medium">Value</th>
                            <th className="p-2 font-medium">Category</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                          {(stagedData.positions || []).map((pos: any, idx: number) => (
                            <tr key={idx} className="dark:text-gray-200">
                              <td className="p-2 font-mono">{pos.symbol}</td>
                              <td className="p-2">${pos.currentValue?.toLocaleString()}</td>
                              <td className="p-2">{pos.category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <button onClick={() => setPreview(null)} className="flex-1 px-4 py-3 bg-primary-coral/10 text-primary-coral font-medium rounded-xl hover:bg-primary-coral/20 transition">
                    Reject & Re-upload
                  </button>
                  <button 
                    onClick={handleApproveAndSave} 
                    disabled={!!validationErrors || isSaving} 
                    className={`flex-1 px-4 py-3 font-medium rounded-xl shadow-sm transition flex items-center justify-center gap-2 ${!!validationErrors ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-gray-400' : 'bg-primary-mint text-white hover:bg-emerald-600'}`}
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <SaveIcon />}
                    {isSaving ? 'Saving...' : 'Approve & Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
  );
}
