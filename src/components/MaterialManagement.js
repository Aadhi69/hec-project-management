import React, { useState } from 'react';

const MaterialManagement = ({ materials, onUpdateMaterials }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    materialName: '',
    cost: '',
    dateOfPurchase: new Date().toISOString().split('T')[0],
    quantity: '',
    supplier: '',
    category: '',
    unit: '',
    specifications: ''
  });

  const categories = [
    'Cement & Concrete',
    'Steel & Reinforcement',
    'Bricks & Blocks',
    'Aggregates',
    'Electrical',
    'Plumbing',
    'Finishing',
    'Safety Equipment',
    'Tools & Machinery',
    'Other'
  ];

  const units = ['kg', 'tons', 'pieces', 'meters', 'liters', 'bags', 'units', 'sets'];

  const handleSubmit = (e) => {
    e.preventDefault();
    const newMaterial = {
      ...formData,
      cost: parseFloat(formData.cost),
      quantity: parseFloat(formData.quantity),
      id: editingIndex !== null ? materials[editingIndex].id : Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    let updatedMaterials;
    if (editingIndex !== null) {
      updatedMaterials = materials.map((material, index) =>
        index === editingIndex ? newMaterial : material
      );
    } else {
      updatedMaterials = [...materials, newMaterial];
    }

    onUpdateMaterials(updatedMaterials);
    setShowForm(false);
    setEditingIndex(null);
    setFormData({
      materialName: '',
      cost: '',
      dateOfPurchase: new Date().toISOString().split('T')[0],
      quantity: '',
      supplier: '',
      category: '',
      unit: '',
      specifications: ''
    });
  };

  const handleEdit = (index) => {
    const material = materials[index];
    setFormData({
      ...material,
      cost: material.cost?.toString() || '',
      quantity: material.quantity?.toString() || ''
    });
    setEditingIndex(index);
    setShowForm(true);
  };

  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      const updatedMaterials = materials.filter((_, i) => i !== index);
      onUpdateMaterials(updatedMaterials);
    }
  };

  const totalCost = materials.reduce((sum, material) => sum + (material.cost || 0), 0);
  const totalQuantity = materials.reduce((sum, material) => sum + (material.quantity || 0), 0);

  // Group materials by category for analytics
  const materialsByCategory = materials.reduce((acc, material) => {
    const category = material.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { materials: [], totalCost: 0 };
    }
    acc[category].materials.push(material);
    acc[category].totalCost += material.cost || 0;
    return acc;
  }, {});

  return (
    <div className="material-management">
      <div className="section-header">
        <h3>Material Management</h3>
        <div className="header-actions">
          <div className="total-cost">
            <i className="fas fa-rupee-sign"></i> Total Cost: <strong>₹{totalCost.toLocaleString('en-IN')}</strong>
          </div>
          <div className="total-labours">
            <i className="fas fa-cubes"></i> Total Items: <strong>{totalQuantity}</strong>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <i className="fas fa-plus"></i> Add Material
          </button>
        </div>
      </div>

      {/* Category Summary */}
      {Object.keys(materialsByCategory).length > 0 && (
        <div className="category-summary">
          <h4>Spending by Category</h4>
          <div className="stats-overview">
            {Object.entries(materialsByCategory).map(([category, data]) => (
              <div key={category} className="stat-card">
                <span className="stat-number">₹{data.totalCost.toLocaleString('en-IN')}</span>
                <span className="stat-label">{category}</span>
                <span className="stat-subtext">{data.materials.length} items</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {materials.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <i className="fas fa-cubes"></i>
          </div>
          <h3>No materials added yet</h3>
          <p>Add your first material to get started</p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Material Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Unit Cost</th>
              <th>Total Cost</th>
              <th>Purchase Date</th>
              <th>Supplier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material, index) => (
              <tr key={material.id || index}>
                <td>
                  <div>
                    <strong>{material.materialName}</strong>
                    {material.specifications && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {material.specifications}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`category-badge ${material.category?.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-')}`}>
                    {material.category || 'Uncategorized'}
                  </span>
                </td>
                <td>
                  {material.quantity} {material.unit || ''}
                </td>
                <td>
                  {material.cost && material.quantity ? 
                    `₹${(material.cost / material.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` 
                    : '-'
                  }
                </td>
                <td>₹{material.cost?.toLocaleString('en-IN')}</td>
                <td>{new Date(material.dateOfPurchase).toLocaleDateString('en-IN')}</td>
                <td>{material.supplier || '-'}</td>
                <td className="action-buttons">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(index)}
                    title="Edit Material"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(index)}
                    title="Delete Material"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingIndex !== null ? 'Edit' : 'Add'} Material</h3>
              <button className="modal-close" onClick={() => {
                setShowForm(false);
                setEditingIndex(null);
              }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Material Name *</label>
                    <input
                      type="text"
                      value={formData.materialName}
                      onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                      className="form-control"
                      required
                      placeholder="e.g., Portland Cement, TMT Steel Bars"
                    />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="form-control"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="form-control"
                      required
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="form-control"
                    >
                      <option value="">Select Unit</option>
                      {units.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Total Cost (INR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="form-control"
                      required
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Purchase Date *</label>
                    <input
                      type="date"
                      value={formData.dateOfPurchase}
                      onChange={(e) => setFormData({ ...formData, dateOfPurchase: e.target.value })}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Supplier</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="form-control"
                      placeholder="Supplier name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Specifications</label>
                  <textarea
                    value={formData.specifications}
                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                    className="form-control"
                    rows="3"
                    placeholder="Additional specifications, grade, size, etc."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingIndex(null);
                  }}
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> {editingIndex !== null ? 'Update' : 'Save'} Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialManagement;