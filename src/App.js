import React, { useState, useEffect, useCallback } from 'react';

// Mock data for states and projects
const mockStates = [
  { id: 1, name: 'Maharashtra', projectCount: 5 },
  { id: 2, name: 'Gujarat', projectCount: 3 },
  { id: 3, name: 'Karnataka', projectCount: 4 },
  { id: 4, name: 'Tamil Nadu', projectCount: 2 }
];

const mockProjects = {
  1: [
    { 
      id: 1, 
      name: 'Mumbai Highway Project', 
      location: 'Mumbai',
      description: 'Construction of new highway connecting Mumbai to Pune',
      estimatedCost: '₹5,00,00,000',
      startDate: '2024-01-15',
      siteEngineer: 'Rajesh Kumar',
      labour: [
        { id: 1, name: 'Mason', count: 15, wage: 800 },
        { id: 2, name: 'Carpenter', count: 8, wage: 750 },
        { id: 3, name: 'Electrician', count: 5, wage: 900 }
      ],
      materials: [
        { id: 1, name: 'Cement', quantity: 500, price: 400 },
        { id: 2, name: 'Steel', quantity: 200, price: 65000 },
        { id: 3, name: 'Bricks', quantity: 10000, price: 8 }
      ]
    },
    { 
      id: 2, 
      name: 'Navi Metro Station', 
      location: 'Navi Mumbai',
      description: 'Development of new metro station in Navi Mumbai',
      estimatedCost: '₹2,50,00,000',
      startDate: '2024-02-01',
      siteEngineer: 'Priya Sharma',
      labour: [
        { id: 1, name: 'Mason', count: 10, wage: 800 },
        { id: 2, name: 'Labourer', count: 25, wage: 600 }
      ],
      materials: [
        { id: 1, name: 'Concrete', quantity: 300, price: 5000 },
        { id: 2, name: 'Steel Rods', quantity: 150, price: 60000 }
      ]
    }
  ],
  2: [
    { 
      id: 1, 
      name: 'Ahmedabad Bridge', 
      location: 'Ahmedabad',
      description: 'Construction of bridge over Sabarmati River',
      estimatedCost: '₹3,00,00,000',
      startDate: '2024-01-20',
      siteEngineer: 'Amit Patel',
      labour: [
        { id: 1, name: 'Mason', count: 12, wage: 750 },
        { id: 2, name: 'Carpenter', count: 6, wage: 700 }
      ],
      materials: [
        { id: 1, name: 'Cement', quantity: 400, price: 400 },
        { id: 2, name: 'Steel', quantity: 180, price: 62000 }
      ]
    }
  ]
};

const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedState, setSelectedState] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showLabourModal, setShowLabourModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingLabour, setEditingLabour] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [newProject, setNewProject] = useState({
    name: '',
    location: '',
    description: '',
    estimatedCost: '',
    startDate: '',
    siteEngineer: ''
  });
  const [labourForm, setLabourForm] = useState({ name: '', count: '', wage: '' });
  const [materialForm, setMaterialForm] = useState({ name: '', quantity: '', price: '' });

  // Export to Excel function
  const exportToExcel = useCallback(() => {
    const projects = mockProjects[selectedState] || [];
    const data = projects.map(project => ({
      'Project Name': project.name,
      'Location': project.location,
      'Estimated Cost': project.estimatedCost,
      'Start Date': project.startDate,
      'Site Engineer': project.siteEngineer
    }));
    
    // Simple CSV export
    const headers = ['Project Name', 'Location', 'Estimated Cost', 'Start Date', 'Site Engineer'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `projects_${selectedState}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }, [selectedState]);

  // State selection
  const handleStateSelect = (state) => {
    setSelectedState(state.id);
    setCurrentView('projects');
  };

  // Project selection
  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setCurrentView('project-detail');
  };

  // Back to states
  const handleBackToStates = () => {
    setSelectedState(null);
    setCurrentView('dashboard');
  };

  // Back to projects
  const handleBackToProjects = () => {
    setSelectedProject(null);
    setCurrentView('projects');
  };

  // Add new project
  const handleAddProject = () => {
    if (!newProject.name || !newProject.location) return;
    
    const project = {
      id: Date.now(),
      ...newProject,
      labour: [],
      materials: []
    };
    
    if (!mockProjects[selectedState]) {
      mockProjects[selectedState] = [];
    }
    mockProjects[selectedState].push(project);
    setShowProjectModal(false);
    setNewProject({ name: '', location: '', description: '', estimatedCost: '', startDate: '', siteEngineer: '' });
  };

  // Delete project
  const handleDeleteProject = (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      mockProjects[selectedState] = mockProjects[selectedState].filter(p => p.id !== projectId);
      if (selectedProject && selectedProject.id === projectId) {
        handleBackToProjects();
      }
    }
  };

  // Labour management
  const handleAddLabour = () => {
    if (!labourForm.name || !labourForm.count || !labourForm.wage) return;
    
    const labour = {
      id: editingLabour ? editingLabour.id : Date.now(),
      ...labourForm,
      count: parseInt(labourForm.count),
      wage: parseInt(labourForm.wage)
    };
    
    if (editingLabour) {
      const index = selectedProject.labour.findIndex(l => l.id === editingLabour.id);
      selectedProject.labour[index] = labour;
    } else {
      selectedProject.labour.push(labour);
    }
    
    setShowLabourModal(false);
    setLabourForm({ name: '', count: '', wage: '' });
    setEditingLabour(null);
  };

  const handleEditLabour = (labour) => {
    setLabourForm({ name: labour.name, count: labour.count.toString(), wage: labour.wage.toString() });
    setEditingLabour(labour);
    setShowLabourModal(true);
  };

  const handleDeleteLabour = (labourId) => {
    if (window.confirm('Are you sure you want to delete this labour entry?')) {
      selectedProject.labour = selectedProject.labour.filter(l => l.id !== labourId);
    }
  };

  // Material management
  const handleAddMaterial = () => {
    if (!materialForm.name || !materialForm.quantity || !materialForm.price) return;
    
    const material = {
      id: editingMaterial ? editingMaterial.id : Date.now(),
      ...materialForm,
      quantity: parseInt(materialForm.quantity),
      price: parseInt(materialForm.price)
    };
    
    if (editingMaterial) {
      const index = selectedProject.materials.findIndex(m => m.id === editingMaterial.id);
      selectedProject.materials[index] = material;
    } else {
      selectedProject.materials.push(material);
    }
    
    setShowMaterialModal(false);
    setMaterialForm({ name: '', quantity: '', price: '' });
    setEditingMaterial(null);
  };

  const handleEditMaterial = (material) => {
    setMaterialForm({ name: material.name, quantity: material.quantity.toString(), price: material.price.toString() });
    setEditingMaterial(material);
    setShowMaterialModal(true);
  };

  const handleDeleteMaterial = (materialId) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      selectedProject.materials = selectedProject.materials.filter(m => m.id !== materialId);
    }
  };

  // Calculate total cost for materials
  const calculateMaterialTotal = (material) => {
    return material.quantity * material.price;
  };

  // Calculate total project cost
  const calculateProjectTotal = (project) => {
    const labourTotal = project.labour.reduce((sum, labour) => sum + (labour.count * labour.wage), 0);
    const materialTotal = project.materials.reduce((sum, material) => sum + (material.quantity * material.price), 0);
    return labourTotal + materialTotal;
  };

  // Render views
  const renderDashboard = () => (
    <div className="dashboard">
      <div className="section-header">
        <h2>HEC Project Management</h2>
        <p>Select a state to view projects</p>
      </div>
      
      <div className="states-grid">
        {mockStates.map(state => (
          <div key={state.id} className="state-card" onClick={() => handleStateSelect(state)}>
            <div className="state-icon">{state.name.charAt(0)}</div>
            <h3>{state.name}</h3>
            <p>{state.projectCount} Projects</p>
            <div className="arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProjects = () => (
    <div className="project-list">
      <div className="section-header">
        <button className="back-btn" onClick={handleBackToStates}>
          ← Back to States
        </button>
        <h2>Projects in {mockStates.find(s => s.id === selectedState)?.name}</h2>
        <button className="add-btn" onClick={() => setShowProjectModal(true)}>
          + Add Project
        </button>
      </div>

      <div className="export-section">
        <button className="export-btn" onClick={exportToExcel}>
          Export to Excel
        </button>
        <p className="export-note">Download project data as CSV file</p>
      </div>

      <div className="projects-grid">
        {mockProjects[selectedState]?.map(project => (
          <div key={project.id} className="project-card">
            <div className="project-header">
              <h3>{project.name}</h3>
              <div className="project-actions">
                <span className="project-value">{project.estimatedCost}</span>
                <button 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id);
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <p className="project-desc">{project.description}</p>
            <div className="project-info">
              <div><strong>Location:</strong> {project.location}</div>
              <div><strong>Site Engineer:</strong> {project.siteEngineer}</div>
              <div><strong>Start Date:</strong> {new Date(project.startDate).toLocaleDateString()}</div>
              <div><strong>Total Cost:</strong> ₹{calculateProjectTotal(project).toLocaleString()}</div>
            </div>
            <button 
              className="view-details-btn"
              onClick={() => handleProjectSelect(project)}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {(!mockProjects[selectedState] || mockProjects[selectedState].length === 0) && (
        <div className="empty-state">
          <h3>No Projects Found</h3>
          <p>Click "Add Project" to create a new project</p>
        </div>
      )}
    </div>
  );

  const renderProjectDetail = () => (
    <div className="project-detail">
      <div className="section-header">
        <button className="back-btn" onClick={handleBackToProjects}>
          ← Back to Projects
        </button>
        <div>
          <h2>{selectedProject?.name}</h2>
          <p className="project-location">{selectedProject?.location}</p>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={activeTab === 'info' ? 'active' : ''}
            onClick={() => setActiveTab('info')}
          >
            Project Info
          </button>
          <button 
            className={activeTab === 'labour' ? 'active' : ''}
            onClick={() => setActiveTab('labour')}
          >
            Labour Management
          </button>
          <button 
            className={activeTab === 'materials' ? 'active' : ''}
            onClick={() => setActiveTab('materials')}
          >
            Material Management
          </button>
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'info' && (
          <ProjectInfo 
            project={selectedProject} 
            onEdit={(updatedProject) => {
              const index = mockProjects[selectedState].findIndex(p => p.id === selectedProject.id);
              mockProjects[selectedState][index] = updatedProject;
              setSelectedProject(updatedProject);
            }}
          />
        )}

        {activeTab === 'labour' && (
          <LabourManagement 
            labour={selectedProject?.labour || []}
            onAdd={() => {
              setLabourForm({ name: '', count: '', wage: '' });
              setEditingLabour(null);
              setShowLabourModal(true);
            }}
            onEdit={handleEditLabour}
            onDelete={handleDeleteLabour}
          />
        )}

        {activeTab === 'materials' && (
          <MaterialManagement 
            materials={selectedProject?.materials || []}
            onAdd={() => {
              setMaterialForm({ name: '', quantity: '', price: '' });
              setEditingMaterial(null);
              setShowMaterialModal(true);
            }}
            onEdit={handleEditMaterial}
            onDelete={handleDeleteMaterial}
            calculateTotal={calculateMaterialTotal}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>HEC Project Management</h1>
          <p>Comprehensive construction project tracking system</p>
        </div>
      </header>

      <main className="main-content">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'projects' && renderProjects()}
        {currentView === 'project-detail' && renderProjectDetail()}
      </main>

      {/* Project Modal */}
      {showProjectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Project</h3>
              <button className="close-btn" onClick={() => setShowProjectModal(false)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddProject(); }}>
              <div className="form-group">
                <label>Project Name</label>
                <input 
                  type="text" 
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  value={newProject.location}
                  onChange={(e) => setNewProject({...newProject, location: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Estimated Cost</label>
                <input 
                  type="text" 
                  value={newProject.estimatedCost}
                  onChange={(e) => setNewProject({...newProject, estimatedCost: e.target.value})}
                  placeholder="₹"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({...newProject, startDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Site Engineer</label>
                  <input 
                    type="text" 
                    value={newProject.siteEngineer}
                    onChange={(e) => setNewProject({...newProject, siteEngineer: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowProjectModal(false)}>Cancel</button>
                <button type="submit">Add Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Labour Modal */}
      {showLabourModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingLabour ? 'Edit' : 'Add'} Labour</h3>
              <button className="close-btn" onClick={() => setShowLabourModal(false)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddLabour(); }}>
              <div className="form-group">
                <label>Labour Type</label>
                <input 
                  type="text" 
                  value={labourForm.name}
                  onChange={(e) => setLabourForm({...labourForm, name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Count</label>
                  <input 
                    type="number" 
                    value={labourForm.count}
                    onChange={(e) => setLabourForm({...labourForm, count: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Daily Wage (₹)</label>
                  <input 
                    type="number" 
                    value={labourForm.wage}
                    onChange={(e) => setLabourForm({...labourForm, wage: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowLabourModal(false)}>Cancel</button>
                <button type="submit">{editingLabour ? 'Update' : 'Add'} Labour</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Modal */}
      {showMaterialModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingMaterial ? 'Edit' : 'Add'} Material</h3>
              <button className="close-btn" onClick={() => setShowMaterialModal(false)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddMaterial(); }}>
              <div className="form-group">
                <label>Material Name</label>
                <input 
                  type="text" 
                  value={materialForm.name}
                  onChange={(e) => setMaterialForm({...materialForm, name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input 
                    type="number" 
                    value={materialForm.quantity}
                    onChange={(e) => setMaterialForm({...materialForm, quantity: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Unit Price (₹)</label>
                  <input 
                    type="number" 
                    value={materialForm.price}
                    onChange={(e) => setMaterialForm({...materialForm, price: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowMaterialModal(false)}>Cancel</button>
                <button type="submit">{editingMaterial ? 'Update' : 'Add'} Material</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Project Info Component
const ProjectInfo = React.memo(({ project, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...project });

  const handleSave = () => {
    onEdit(formData);
    setIsEditing(false);
  };

  return (
    <div className="project-info">
      <div className="section-header">
        <h3>Project Information</h3>
        <button 
          className={isEditing ? 'save-btn' : 'edit-btn'}
          onClick={isEditing ? handleSave : () => setIsEditing(true)}
        >
          {isEditing ? 'Save' : 'Edit'}
        </button>
      </div>

      <div className="info-grid">
        <div className="info-item">
          <label>Project Name</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          ) : (
            <span>{project.name}</span>
          )}
        </div>

        <div className="info-item">
          <label>Location</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
            />
          ) : (
            <span>{project.location}</span>
          )}
        </div>

        <div className="info-item">
          <label>Estimated Cost</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({...formData, estimatedCost: e.target.value})}
            />
          ) : (
            <span>{project.estimatedCost}</span>
          )}
        </div>

        <div className="info-item">
          <label>Site Engineer</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.siteEngineer}
              onChange={(e) => setFormData({...formData, siteEngineer: e.target.value})}
            />
          ) : (
            <span>{project.siteEngineer}</span>
          )}
        </div>

        <div className="info-item">
          <label>Start Date</label>
          {isEditing ? (
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
            />
          ) : (
            <span>{new Date(project.startDate).toLocaleDateString()}</span>
          )}
        </div>

        <div className="info-item full-width">
          <label>Description</label>
          {isEditing ? (
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
            />
          ) : (
            <span>{project.description}</span>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="edit-actions">
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
});

// Labour Management Component
const LabourManagement = React.memo(({ labour, onAdd, onEdit, onDelete }) => {
  const calculateLabourTotal = (labourItem) => {
    return labourItem.count * labourItem.wage;
  };

  return (
    <div className="labour-management">
      <div className="section-header">
        <h3>Labour Management</h3>
        <button className="add-btn" onClick={onAdd}>+ Add Labour</button>
      </div>

      {labour.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Labour Type</th>
                <th>Count</th>
                <th>Daily Wage (₹)</th>
                <th>Daily Cost (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {labour.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.count}</td>
                  <td>₹{item.wage.toLocaleString()}</td>
                  <td>₹{calculateLabourTotal(item).toLocaleString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="edit-btn"
                        onClick={() => onEdit(item)}
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => onDelete(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>No labour entries found. Add some labour to get started.</p>
        </div>
      )}
    </div>
  );
});

// Material Management Component with Total Cost Column
const MaterialManagement = React.memo(({ materials, onAdd, onEdit, onDelete, calculateTotal }) => {
  return (
    <div className="material-management">
      <div className="section-header">
        <h3>Material Management</h3>
        <button className="add-btn" onClick={onAdd}>+ Add Material</button>
      </div>

      {materials.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Material Name</th>
                <th>Quantity</th>
                <th>Unit Price (₹)</th>
                <th>Total Cost (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.quantity.toLocaleString()}</td>
                  <td>₹{item.price.toLocaleString()}</td>
                  <td>₹{calculateTotal(item).toLocaleString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="edit-btn"
                        onClick={() => onEdit(item)}
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => onDelete(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>No materials found. Add some materials to get started.</p>
        </div>
      )}
    </div>
  );
});

export default App;
