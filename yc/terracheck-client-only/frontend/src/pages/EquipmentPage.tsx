/**
 * Equipment database and tracking
 */

import React, { useState, useEffect } from 'react';
import { getInspections, createEquipment, getAllEquipment, deleteEquipment } from '../db';

interface Equipment {
  id: string;
  serialNumber: string;
  modelNumber: string;
  manufacturer?: string;
  location?: string;
  lastInspection?: string;
  inspectionCount: number;
  totalIssues: number;
  status: 'operational' | 'needs_attention' | 'critical';
}

export const EquipmentPage: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    serialNumber: '',
    modelNumber: '',
    manufacturer: '',
    location: '',
    equipmentType: '',
    voltage: '',
    amperage: '',
    wattage: '',
    frequency: '',
    pressure: '',
    notes: '',
  });

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    // Load from equipment store first
    const dbEquipment = await getAllEquipment();
    const equipmentMap = new Map<string, Equipment>();

    // Add equipment from database
    dbEquipment.forEach(eq => {
      const key = `${eq.serialNumber}-${eq.modelNumber}`;
      equipmentMap.set(key, {
        id: eq.id,
        serialNumber: eq.serialNumber,
        modelNumber: eq.modelNumber,
        manufacturer: eq.manufacturer,
        location: eq.location,
        lastInspection: eq.updatedAt,
        inspectionCount: 0,
        totalIssues: 0,
        status: 'operational',
      });
    });

    // Also load from inspections to get inspection counts
    const inspections = await getInspections();
    inspections
      .filter(i => i.status === 'completed' && i.result)
      .forEach(inspection => {
        // Use hardcoded values for demo
        const serial = '18D26150';
        const model = 'SS-18DS';
        const key = `${serial}-${model}`;

        if (equipmentMap.has(key)) {
          const eq = equipmentMap.get(key)!;
          eq.inspectionCount++;
          eq.totalIssues += inspection.issuesFound || 0;
          if (new Date(inspection.createdAt) > new Date(eq.lastInspection || '')) {
            eq.lastInspection = inspection.createdAt;
          }
          eq.status = eq.totalIssues > 5 ? 'critical' :
                     eq.totalIssues > 0 ? 'needs_attention' : 'operational';
        } else {
          equipmentMap.set(key, {
            id: key,
            serialNumber: serial,
            modelNumber: model,
            manufacturer: 'cULus',
            location: inspection.result!.labels.location,
            lastInspection: inspection.createdAt,
            inspectionCount: 1,
            totalIssues: inspection.issuesFound || 0,
            status: (inspection.issuesFound || 0) > 5 ? 'critical' :
                   (inspection.issuesFound || 0) > 0 ? 'needs_attention' : 'operational',
          });
        }
      });

    setEquipment(Array.from(equipmentMap.values()));
  };

  const handleAddEquipment = async () => {
    try {
      await createEquipment(newEquipment);
      setShowAddModal(false);
      setNewEquipment({
        serialNumber: '',
        modelNumber: '',
        manufacturer: '',
        location: '',
        equipmentType: '',
        voltage: '',
        amperage: '',
        wattage: '',
        frequency: '',
        pressure: '',
        notes: '',
      });
      loadEquipment();
    } catch (error) {
      console.error('Failed to add equipment:', error);
      alert('Failed to add equipment. Please try again.');
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this equipment entry?')) {
      try {
        await deleteEquipment(id);
        loadEquipment();
      } catch (error) {
        console.error('Failed to delete equipment:', error);
        alert('Failed to delete equipment. Please try again.');
      }
    }
  };

  const filteredEquipment = equipment.filter(eq => {
    const matchesSearch = 
      eq.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.modelNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || eq.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Equipment Database</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Add Equipment
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">
              Export
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by serial, model, or manufacturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'operational', 'needs_attention', 'critical'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === status
                      ? status === 'operational' ? 'bg-green-600 text-white' :
                        status === 'needs_attention' ? 'bg-yellow-600 text-white' :
                        status === 'critical' ? 'bg-red-600 text-white' :
                        'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Equipment Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspections</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Issues</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Inspection</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEquipment.map(eq => (
                <tr key={eq.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{eq.serialNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{eq.modelNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{eq.manufacturer || '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{eq.inspectionCount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{eq.totalIssues}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {eq.lastInspection ? new Date(eq.lastInspection).toLocaleDateString() : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      eq.status === 'operational' ? 'bg-green-100 text-green-800' :
                      eq.status === 'needs_attention' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {eq.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-3">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
                      <button 
                        onClick={() => handleDeleteEquipment(eq.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredEquipment.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No equipment found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Add Equipment</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Serial Number *
                  </label>
                  <input
                    type="text"
                    value={newEquipment.serialNumber}
                    onChange={(e) => setNewEquipment({ ...newEquipment, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Model Number *
                  </label>
                  <input
                    type="text"
                    value={newEquipment.modelNumber}
                    onChange={(e) => setNewEquipment({ ...newEquipment, modelNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    value={newEquipment.manufacturer}
                    onChange={(e) => setNewEquipment({ ...newEquipment, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Equipment Type
                  </label>
                  <input
                    type="text"
                    value={newEquipment.equipmentType}
                    onChange={(e) => setNewEquipment({ ...newEquipment, equipmentType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newEquipment.location}
                    onChange={(e) => setNewEquipment({ ...newEquipment, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Voltage
                  </label>
                  <input
                    type="text"
                    value={newEquipment.voltage}
                    onChange={(e) => setNewEquipment({ ...newEquipment, voltage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Amperage
                  </label>
                  <input
                    type="text"
                    value={newEquipment.amperage}
                    onChange={(e) => setNewEquipment({ ...newEquipment, amperage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Wattage
                  </label>
                  <input
                    type="text"
                    value={newEquipment.wattage}
                    onChange={(e) => setNewEquipment({ ...newEquipment, wattage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Frequency
                  </label>
                  <input
                    type="text"
                    value={newEquipment.frequency}
                    onChange={(e) => setNewEquipment({ ...newEquipment, frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Pressure
                  </label>
                  <input
                    type="text"
                    value={newEquipment.pressure}
                    onChange={(e) => setNewEquipment({ ...newEquipment, pressure: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newEquipment.notes}
                  onChange={(e) => setNewEquipment({ ...newEquipment, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEquipment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Add Equipment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

