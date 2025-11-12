// File upload component for CSV uploads
import React, { useState } from 'react';
import { api } from '../services/api';
import '../App.css';

interface FileUploadProps {
  datasetId: string;
  onUploadComplete?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ datasetId, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/api/datasets/${datasetId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">📤 Upload CSV</h2>
      <p style={{ marginBottom: '1rem', color: 'var(--gray-600)', fontSize: '0.9375rem' }}>
        Upload a CSV file with records. Expected columns:
        molecule_id, assay_version, reagent_batch, instrument_id, operator_id, prediction_value, observed_value, timestamp
      </p>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={uploading}
        style={{
          marginBottom: '1rem',
          padding: '0.5rem',
          border: '1px solid var(--gray-300)',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: '400px'
        }}
      />
      {uploading && <div style={{ color: 'var(--primary)' }}>Uploading...</div>}
      {error && (
        <div style={{ color: 'var(--danger)', marginTop: '0.5rem' }}>
          Error: {error}
        </div>
      )}
      {result && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'var(--success-light)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--success)'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Upload successful!</div>
          <div style={{ fontSize: '0.875rem' }}>
            Records created: {result.records_created}
            {result.errors && result.errors.length > 0 && (
              <div style={{ marginTop: '0.5rem', color: 'var(--warning)' }}>
                Errors: {result.errors.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;

