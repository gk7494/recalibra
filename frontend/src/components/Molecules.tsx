import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import '../App.css';

interface Molecule {
  id: string;
  name: string;
  compound_id?: string;
  smiles?: string;
  inchi?: string;
  cas_number?: string;
  molecular_formula?: string;
  molecular_weight?: number;
  created_at: string;
}

const Molecules: React.FC = () => {
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    compound_id: '',
    smiles: '',
    inchi: '',
    cas_number: '',
    molecular_formula: '',
    molecular_weight: ''
  });

  useEffect(() => {
    loadMolecules();
  }, []);

  const loadMolecules = async () => {
    try {
      const res = await api.get('/api/molecules');
      setMolecules(res.data);
    } catch (error) {
      console.error('Error loading molecules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name,
        compound_id: formData.compound_id || undefined,
        smiles: formData.smiles || undefined,
        inchi: formData.inchi || undefined,
        cas_number: formData.cas_number || undefined,
        formula: formData.molecular_formula || undefined,  // Backend expects 'formula' not 'molecular_formula'
        molecular_weight: formData.molecular_weight ? parseFloat(formData.molecular_weight) : undefined
      };
      await api.post('/api/molecules', payload);
      setShowForm(false);
      setFormData({
        name: '',
        compound_id: '',
        smiles: '',
        inchi: '',
        cas_number: '',
        molecular_formula: '',
        molecular_weight: ''
      });
      loadMolecules();
    } catch (error: any) {
      alert(`Error creating molecule: ${error.response?.data?.detail || error.message}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading molecules...</div>;
  }

  return (
    <div>
      <div style={{ 
        marginBottom: '2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Molecules
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>
            Manage compounds and molecules for testing
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add Molecule'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 className="card-title">Add New Molecule</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--gray-700)' }}>
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--gray-300)' }}
                  placeholder="Compound_001"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--gray-700)' }}>
                  Compound ID
                </label>
                <input
                  type="text"
                  value={formData.compound_id}
                  onChange={(e) => setFormData({ ...formData, compound_id: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--gray-300)' }}
                  placeholder="CMP-001"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--gray-700)' }}>
                  SMILES
                </label>
                <input
                  type="text"
                  value={formData.smiles}
                  onChange={(e) => setFormData({ ...formData, smiles: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--gray-300)' }}
                  placeholder="CCO"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--gray-700)' }}>
                  CAS Number
                </label>
                <input
                  type="text"
                  value={formData.cas_number}
                  onChange={(e) => setFormData({ ...formData, cas_number: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--gray-300)' }}
                  placeholder="64-17-5"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--gray-700)' }}>
                  Molecular Formula
                </label>
                <input
                  type="text"
                  value={formData.molecular_formula}
                  onChange={(e) => setFormData({ ...formData, molecular_formula: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--gray-300)' }}
                  placeholder="C15H20N2O3"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--gray-700)' }}>
                  Molecular Weight (Da)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.molecular_weight}
                  onChange={(e) => setFormData({ ...formData, molecular_weight: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--gray-300)' }}
                  placeholder="250.35"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Create Molecule
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">All Molecules ({molecules.length})</h2>
        {molecules.length === 0 ? (
          <div className="empty-state">
            <p>No molecules found. Add a molecule to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Compound ID</th>
                  <th>Formula</th>
                  <th>MW (Da)</th>
                  <th>CAS Number</th>
                  <th>SMILES</th>
                </tr>
              </thead>
              <tbody>
                {molecules.map(mol => (
                  <tr key={mol.id}>
                    <td><strong>{mol.name}</strong></td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--gray-600)' }}>{mol.compound_id || 'N/A'}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--gray-600)' }}>{mol.molecular_formula || 'N/A'}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--gray-600)' }}>{mol.molecular_weight?.toFixed(2) || 'N/A'}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--gray-600)', fontSize: '0.875rem' }}>{mol.cas_number || 'N/A'}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--gray-600)', fontSize: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={mol.smiles || ''}>{mol.smiles || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Molecules;

