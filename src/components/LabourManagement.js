import React, { useState } from 'react';

const LabourManagement = ({ labours, onUpdateLabours }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    numberOfLabours: '',
    role: '',
    workDescription: '',
    wages: '',
    overtimeHours: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newLabour = {
      ...formData,
      numberOfLabours: parseInt(formData.numberOfLabours),
      wages: formData.wages ? parseFloat(formData.wages) : 0,
      overtimeHours: formData.overtimeHours ? parseFloat(formData.overtimeHours) : 0,
      id: editingIndex !== null ? labours[editingIndex].id : Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    let updatedLabours;
    if (editingIndex !== null) {
      updatedLabours = labours.map((labour, index) =>
        index === editingIndex ? newLabour : labour
      );
    } else {
      updatedLabours = [...labours, newLabour];
    }

    onUpdateLabours(updatedLabours);
    setShowForm(false);
    setEditingIndex(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      numberOfLabours: '',
      role: '',
      workDescription: '',
      wages: '',
      overtimeHours: ''
    });
  };

  const handleEdit = (index) => {
    const labour = labours[index];
    setFormData({
      ...labour,
      numberOfLabours: labour.numberOfLabours.toString(),
      wages: labour.wages?.toString() || '',
      overtimeHours: labour.overtimeHours?.toString() || ''
    });
    setEditingIndex(index);
    setShowForm(true);
  };

  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this labour entry?')) {
      const updatedLabours = labours.filter((_, i) => i !== index);
      onUpdateLabours(updatedLabours);
    }
  };

  const totalLabours = labours.reduce((sum, labour) => sum + labour.numberOfLabours, 0);
  const totalWages = labours.reduce((sum, labour) => sum + (labour.wages || 0), 0);

  // Group labours by date for better organization
  const laboursByDate = labours.reduce((acc, labour) => {
    const date = labour.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(labour);
    return acc;
  }, {});

  const sortedDates = Object.keys(laboursByDate).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="labour-management">
      <div className="section-header">
        <h3>Labour Management</h3>
        <div className="header-actions">
          <div className="total-labours">
            <i className="fas fa-hard-hat"></i> Total Labours: <strong>{totalLabours}</strong>
          </div>
          <div className="total-cost">
            <i className="fas fa-rupee-sign"></i> Total Wages: <strong>₹{totalWages.toLocaleString('en-IN')}</strong>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <i className="fas fa-plus"></i> Add Labour Entry
          </button>
        </div>
      </div>

      {labours.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <i className="fas fa-hard-hat"></i>
          </div>
          <h3>No labour entries yet</h3>
          <p>Add your first labour entry to get started</p>
        </div>
      ) : (
        <div className="labour-entries">
          {sortedDates.map(date => (
            <div key={date} className="labour-date-group">
              <h4 className="date-header">
                <i className="fas fa-calendar-day"></i> 
                {new Date(date).toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                <span className="date-labour-count">
                  {laboursByDate[date].reduce((sum, labour) => sum + labour.numberOfLabours, 0)} labours
                </span>
              </h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>No. of Labours</th>
                    <th>Work Description</th>
                    <th>Wages</th>
                    <th>Overtime</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {laboursByDate[date].map((labour, index) => {
                    const globalIndex = labours.findIndex(l => l.id === labour.id);
                    return (
                      <tr key={labour.id}>
                        <td>
                          <strong>{labour.role}</strong>
                        </td>
                        <td>{labour.numberOfLabours}</td>
                        <td>{labour.workDescription || '-'}</td>
                        <td>{labour.wages ? `₹${labour.wages.toLocaleString('en-IN')}` : '-'}</td>
                        <td>{labour.overtimeHours ? `${labour.overtimeHours} hrs` : '-'}</td>
                        <td className="action-buttons">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleEdit(globalIndex)}
                            title="Edit Entry"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(globalIndex)}
                            title="Delete Entry"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingIndex !== null ? 'Edit' : 'Add'} Labour Entry</h3>
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
                    <label>Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Number of Labours *</label>
                    <input
                      type="number"
                      value={formData.numberOfLabours}
                      onChange={(e) => setFormData({ ...formData, numberOfLabours: e.target.value })}
                      className="form-control"
                      required
                      min="1"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="form-control"
                    required
                    placeholder="e.g., Mason, Carpenter, Electrician"
                  />
                </div>
                <div className="form-group">
                  <label>Work Description</label>
                  <textarea
                    value={formData.workDescription}
                    onChange={(e) => setFormData({ ...formData, workDescription: e.target.value })}
                    className="form-control"
                    rows="3"
                    placeholder="Describe the work assigned"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Daily Wages (INR)</label>
                    <input
                      type="number"
                      value={formData.wages}
                      onChange={(e) => setFormData({ ...formData, wages: e.target.value })}
                      className="form-control"
                      placeholder="Total wages for this entry"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Overtime Hours</label>
                    <input
                      type="number"
                      value={formData.overtimeHours}
                      onChange={(e) => setFormData({ ...formData, overtimeHours: e.target.value })}
                      className="form-control"
                      placeholder="Overtime hours worked"
                      step="0.5"
                    />
                  </div>
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
                  <i className="fas fa-save"></i> {editingIndex !== null ? 'Update' : 'Save'} Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabourManagement;