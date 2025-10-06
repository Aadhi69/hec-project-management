import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { database } from './firebase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { usePWA } from './hooks/usePWA';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedState, setSelectedState] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isInstallable, installApp } = usePWA();

  // Corrected states data
  const states = [
    'Tamil Nadu', 'Delhi', 'Uttar Pradesh'
  ];

  // Load data from Firebase with useCallback to prevent unnecessary re-renders
  const loadProjectsFromFirebase = useCallback(async () => {
    try {
      setLoading(true);
      const projectsData = await database.getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
      // Fallback to localStorage if Firebase fails
      const savedProjects = localStorage.getItem('hec-projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjectsFromFirebase();
  }, [loadProjectsFromFirebase]);

  const handleStateSelect = useCallback((state) => {
    setSelectedState(state);
    setCurrentView('projects');
  }, []);

  const handleProjectSelect = useCallback((project) => {
    setSelectedProject(project);
    setCurrentView('project-detail');
  }, []);

  const addProject = useCallback(async (newProject) => {
    const project = {
      ...newProject,
      id: Date.now().toString(),
      labours: [],
      materials: [],
      createdAt: new Date().toISOString(),
      projectValue: parseFloat(newProject.projectValue)
    };
    
    try {
      await database.saveProject(project);
      setProjects(prev => [...prev, project]);
      
      // Also save to localStorage as backup
      const updatedProjects = [...projects, project];
      localStorage.setItem('hec-projects', JSON.stringify(updatedProjects));
    } catch (error) {
      console.error('Error saving project:', error);
      // Fallback to localStorage
      setProjects(prev => [...prev, project]);
      localStorage.setItem('hec-projects', JSON.stringify([...projects, project]));
    }
  }, [projects]);

  const updateProject = useCallback(async (updatedProject) => {
    try {
      await database.saveProject(updatedProject);
      setProjects(prev => prev.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      ));
      
      // Update selected project if it's the one being updated
      if (selectedProject && selectedProject.id === updatedProject.id) {
        setSelectedProject(updatedProject);
      }
      
      // Update localStorage as backup
      localStorage.setItem('hec-projects', JSON.stringify(
        projects.map(p => p.id === updatedProject.id ? updatedProject : p)
      ));
    } catch (error) {
      console.error('Error updating project:', error);
      // Fallback to localStorage
      setProjects(prev => prev.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      ));
      if (selectedProject && selectedProject.id === updatedProject.id) {
        setSelectedProject(updatedProject);
      }
      localStorage.setItem('hec-projects', JSON.stringify(
        projects.map(p => p.id === updatedProject.id ? updatedProject : p)
      ));
    }
  }, [projects, selectedProject]);

  const deleteProject = useCallback(async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await database.deleteProject(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
        
        // Update localStorage
        localStorage.setItem('hec-projects', JSON.stringify(
          projects.filter(p => p.id !== projectId)
        ));
        
        if (selectedProject && selectedProject.id === projectId) {
          setCurrentView('projects');
          setSelectedProject(null);
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        // Fallback to localStorage
        setProjects(prev => prev.filter(p => p.id !== projectId));
        localStorage.setItem('hec-projects', JSON.stringify(
          projects.filter(p => p.id !== projectId)
        ));
        if (selectedProject && selectedProject.id === projectId) {
          setCurrentView('projects');
          setSelectedProject(null);
        }
      }
    }
  }, [projects, selectedProject]);

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      // Get all projects data (use current state or fetch fresh from Firebase)
      const allProjects = projects.length > 0 ? projects : await database.getProjects();
      
      if (allProjects.length === 0) {
        alert('No data available to export.');
        return;
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare projects data for Excel
      const projectsData = allProjects.map(project => ({
        'Project ID': project.id,
        'Project Name': project.projectName,
        'Description': project.description,
        'State': project.state,
        'Site Engineer': project.siteEngineer,
        'Start Date': new Date(project.startDate).toLocaleDateString(),
        'Completion Date': project.tentativeCompletion ? new Date(project.tentativeCompletion).toLocaleDateString() : 'N/A',
        'Project Value (₹)': project.projectValue,
        'Total Labours': project.labours?.length || 0,
        'Total Materials': project.materials?.length || 0,
        'Created Date': new Date(project.createdAt).toLocaleDateString()
      }));

      // Prepare labours data for Excel
      const laboursData = allProjects.flatMap(project => 
        (project.labours || []).map(labour => ({
          'Project ID': project.id,
          'Project Name': project.projectName,
          'State': project.state,
          'Date': new Date(labour.date).toLocaleDateString(),
          'Number of Labours': labour.numberOfLabours,
          'Role': labour.role,
          'Work Description': labour.workDescription
        }))
      );

      // Prepare materials data for Excel
      const materialsData = allProjects.flatMap(project => 
        (project.materials || []).map(material => ({
          'Project ID': project.id,
          'Project Name': project.projectName,
          'State': project.state,
          'Material Name': material.materialName,
          'Cost (₹)': material.cost,
          'Quantity': material.quantity,
          'Purchase Date': new Date(material.dateOfPurchase).toLocaleDateString(),
          'Supplier': material.supplier
        }))
      );

      // Create worksheets
      const projectsWs = XLSX.utils.json_to_sheet(projectsData);
      const laboursWs = XLSX.utils.json_to_sheet(laboursData);
      const materialsWs = XLSX.utils.json_to_sheet(materialsData);

      // Add worksheets to workbook
      XLSX.utils.book_append_sheet(wb, projectsWs, 'Projects');
      if (laboursData.length > 0) {
        XLSX.utils.book_append_sheet(wb, laboursWs, 'Labours');
      }
      if (materialsData.length > 0) {
        XLSX.utils.book_append_sheet(wb, materialsWs, 'Materials');
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create filename with current month and year
      const now = new Date();
      const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      const fileName = `HEC_Projects_Export_${monthYear.replace(' ', '_')}.xlsx`;
      
      // Save file
      saveAs(data, fileName);
      
      alert(`Excel file "${fileName}" downloaded successfully!\n\nExported:\n- ${projectsData.length} projects\n- ${laboursData.length} labour entries\n- ${materialsData.length} material entries`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting data to Excel. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading HEC Project Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Hindustan Engineers and Contractors</h1>
          <p>Cloud Connected Project Management</p>
        </div>
      </header>

      {/* PWA Install Prompt */}
      {isInstallable && (
        <div className="pwa-install-prompt">
          <div className="pwa-prompt-content">
            <div className="pwa-prompt-info">
              <span className="pwa-icon">📱</span>
              <div>
                <h4>Install HEC App</h4>
                <p>Get the full app experience on your home screen</p>
              </div>
            </div>
            <div className="pwa-prompt-actions">
              <button className="pwa-cancel-btn" onClick={() => {}}>
                Later
              </button>
              <button className="pwa-install-btn" onClick={installApp}>
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        {currentView === 'dashboard' && (
          <Dashboard 
            states={states} 
            onStateSelect={handleStateSelect}
            onExportToExcel={exportToExcel}
          />
        )}

        {currentView === 'projects' && (
          <ProjectList
            state={selectedState}
            projects={projects.filter(p => p.state === selectedState)}
            onProjectSelect={handleProjectSelect}
            onBack={() => setCurrentView('dashboard')}
            onAddProject={addProject}
            onDeleteProject={deleteProject}
          />
        )}

        {currentView === 'project-detail' && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            onBack={() => setCurrentView('projects')}
            onUpdateProject={updateProject}
            onDeleteProject={deleteProject}
          />
        )}
      </main>
    </div>
  );
}

// Dashboard Component with export button
const Dashboard = React.memo(({ states, onStateSelect, onExportToExcel }) => {
  return (
    <div className="dashboard">
      <div className="section-header">
        <h2>Select State</h2>
        <p>Choose a state to view projects</p>
      </div>
      
      {/* Export Button */}
      <div className="export-section">
        <button className="export-btn" onClick={onExportToExcel}>
          📊 Export Monthly Report (Excel)
        </button>
        <p className="export-note">
          Download complete project data for the current month
        </p>
      </div>

      <div className="states-grid">
        {states.map((state) => (
          <div 
            key={state}
            className="state-card"
            onClick={() => onStateSelect(state)}
          >
            <div className="state-icon">
              {state.charAt(0)}
            </div>
            <h3>{state}</h3>
            <span className="arrow">→</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// Project List Component
const ProjectList = React.memo(({ state, projects, onProjectSelect, onBack, onAddProject, onDeleteProject }) => {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="project-list">
      <div className="section-header">
        <button className="back-btn" onClick={onBack}>← Back to States</button>
        <h2>Projects in {state}</h2>
        <button className="add-btn" onClick={() => setShowForm(true)}>
          + Add Project
        </button>
      </div>

      <div className="projects-grid">
        {projects.map(project => (
          <div 
            key={project.id}
            className="project-card"
          >
            <div className="project-header">
              <h3 onClick={() => onProjectSelect(project)} style={{cursor: 'pointer'}}>
                {project.projectName}
              </h3>
              <div className="project-actions">
                <span className="project-value">
                  ₹{project.projectValue?.toLocaleString('en-IN')}
                </span>
                <button 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
            <p className="project-desc">{project.description}</p>
            <div className="project-info">
              <div>
                <strong>Engineer:</strong> {project.siteEngineer}
              </div>
              <div>
                <strong>Start:</strong> {new Date(project.startDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="empty-state">
          <p>No projects found in {state}. Create your first project!</p>
        </div>
      )}

      {showForm && (
        <ProjectForm
          state={state}
          onSave={(data) => {
            onAddProject(data);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
});

// Project Form Component
const ProjectForm = React.memo(({ state, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    siteEngineer: '',
    startDate: new Date().toISOString().split('T')[0],
    tentativeCompletion: '',
    projectValue: '',
    state: state
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.projectName && formData.siteEngineer && formData.projectValue) {
      onSave(formData);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>New Project - {state}</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData({...formData, projectName: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Site Engineer *</label>
              <input
                type="text"
                value={formData.siteEngineer}
                onChange={(e) => setFormData({...formData, siteEngineer: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Project Value (₹) *</label>
              <input
                type="number"
                value={formData.projectValue}
                onChange={(e) => setFormData({...formData, projectValue: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Completion Date *</label>
              <input
                type="date"
                value={formData.tentativeCompletion}
                onChange={(e) => setFormData({...formData, tentativeCompletion: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="submit">Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
});

// Project Detail Component
const ProjectDetail = React.memo(({ project, onBack, onUpdateProject, onDeleteProject }) => {
  const [activeTab, setActiveTab] = useState('labours');

  return (
    <div className="project-detail">
      <div className="section-header">
        <button className="back-btn" onClick={onBack}>← Back to Projects</button>
        <div>
          <h2>{project.projectName}</h2>
          <p className="project-location">{project.state}</p>
        </div>
        <button 
          className="delete-btn"
          onClick={() => onDeleteProject(project.id)}
        >
          Delete Project
        </button>
      </div>

      <div className="tabs">
        <button 
          className={activeTab === 'labours' ? 'active' : ''}
          onClick={() => setActiveTab('labours')}
        >
          Labours
        </button>
        <button 
          className={activeTab === 'materials' ? 'active' : ''}
          onClick={() => setActiveTab('materials')}
        >
          Materials
        </button>
        <button 
          className={activeTab === 'info' ? 'active' : ''}
          onClick={() => setActiveTab('info')}
        >
          Project Info
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'labours' && (
          <LabourManagement 
            labours={project.labours || []}
            onUpdate={(labours) => onUpdateProject({...project, labours})}
          />
        )}
        {activeTab === 'materials' && (
          <MaterialManagement 
            materials={project.materials || []}
            onUpdate={(materials) => onUpdateProject({...project, materials})}
          />
        )}
        {activeTab === 'info' && (
          <ProjectInfo 
            project={project}
            onUpdate={onUpdateProject}
          />
        )}
      </div>
    </div>
  );
});

// Enhanced Labour Management Component with Edit Functionality
const LabourManagement = React.memo(({ labours, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingLabour, setEditingLabour] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    numberOfLabours: '',
    role: '',
    workDescription: ''
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      numberOfLabours: '',
      role: '',
      workDescription: ''
    });
    setEditingLabour(null);
  };

  const handleSaveLabour = () => {
    const labourData = {
      ...formData,
      id: editingLabour ? editingLabour.id : Date.now().toString(),
      numberOfLabours: parseInt(formData.numberOfLabours)
    };

    let updatedLabours;
    if (editingLabour) {
      // Update existing labour
      updatedLabours = labours.map(labour => 
        labour.id === editingLabour.id ? labourData : labour
      );
    } else {
      // Add new labour
      updatedLabours = [...labours, labourData];
    }

    // Update parent component immediately
    onUpdate(updatedLabours);
    setShowForm(false);
    resetForm();
  };

  const editLabour = (labour) => {
    setEditingLabour(labour);
    setFormData({
      date: labour.date,
      numberOfLabours: labour.numberOfLabours.toString(),
      role: labour.role,
      workDescription: labour.workDescription
    });
    setShowForm(true);
  };

  const deleteLabour = (id) => {
    const updatedLabours = labours.filter(labour => labour.id !== id);
    onUpdate(updatedLabours);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSaveLabour();
  };

  return (
    <div className="labour-management">
      <div className="section-header">
        <h3>Labour Management</h3>
        <button className="add-btn" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Labour Entry
        </button>
      </div>

      {labours.length === 0 ? (
        <div className="empty-state">
          <p>No labour entries yet</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>No. of Labours</th>
                <th>Role</th>
                <th>Work Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {labours.map(labour => (
                <tr key={labour.id}>
                  <td>{new Date(labour.date).toLocaleDateString()}</td>
                  <td>{labour.numberOfLabours}</td>
                  <td>{labour.role}</td>
                  <td>{labour.workDescription}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="edit-btn"
                        onClick={() => editLabour(labour)}
                        title="Edit labour entry"
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteLabour(labour.id)}
                        title="Delete labour entry"
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
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingLabour ? 'Edit Labour Entry' : 'Add Labour Entry'}</h3>
              <button className="close-btn" onClick={() => { setShowForm(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Number of Labours *</label>
                <input
                  type="number"
                  value={formData.numberOfLabours}
                  onChange={(e) => setFormData({...formData, numberOfLabours: e.target.value})}
                  required
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Work Description *</label>
                <textarea
                  value={formData.workDescription}
                  onChange={(e) => setFormData({...formData, workDescription: e.target.value})}
                  rows="3"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
                <button type="submit">{editingLabour ? 'Update Labour' : 'Add Labour'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

// Enhanced Material Management Component with Edit Functionality
const MaterialManagement = React.memo(({ materials, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState({
    materialName: '',
    cost: '',
    dateOfPurchase: new Date().toISOString().split('T')[0],
    quantity: '',
    supplier: ''
  });

  const resetForm = () => {
    setFormData({
      materialName: '',
      cost: '',
      dateOfPurchase: new Date().toISOString().split('T')[0],
      quantity: '',
      supplier: ''
    });
    setEditingMaterial(null);
  };

  const handleSaveMaterial = () => {
    const materialData = {
      ...formData,
      id: editingMaterial ? editingMaterial.id : Date.now().toString(),
      cost: parseFloat(formData.cost),
      quantity: parseInt(formData.quantity)
    };

    let updatedMaterials;
    if (editingMaterial) {
      // Update existing material
      updatedMaterials = materials.map(material => 
        material.id === editingMaterial.id ? materialData : material
      );
    } else {
      // Add new material
      updatedMaterials = [...materials, materialData];
    }

    // Update parent component immediately
    onUpdate(updatedMaterials);
    setShowForm(false);
    resetForm();
  };

  const editMaterial = (material) => {
    setEditingMaterial(material);
    setFormData({
      materialName: material.materialName,
      cost: material.cost.toString(),
      dateOfPurchase: material.dateOfPurchase,
      quantity: material.quantity.toString(),
      supplier: material.supplier
    });
    setShowForm(true);
  };

  const deleteMaterial = (id) => {
    const updatedMaterials = materials.filter(material => material.id !== id);
    onUpdate(updatedMaterials);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSaveMaterial();
  };

  return (
    <div className="material-management">
      <div className="section-header">
        <h3>Material Management</h3>
        <button className="add-btn" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Material
        </button>
      </div>

      {materials.length === 0 ? (
        <div className="empty-state">
          <p>No materials added yet</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Material Name</th>
                <th>Cost (₹)</th>
                <th>Quantity</th>
                <th>Purchase Date</th>
                <th>Supplier</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(material => (
                <tr key={material.id}>
                  <td>{material.materialName}</td>
                  <td>₹{material.cost?.toLocaleString('en-IN')}</td>
                  <td>{material.quantity}</td>
                  <td>{new Date(material.dateOfPurchase).toLocaleDateString()}</td>
                  <td>{material.supplier}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="edit-btn"
                        onClick={() => editMaterial(material)}
                        title="Edit material entry"
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteMaterial(material.id)}
                        title="Delete material entry"
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
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingMaterial ? 'Edit Material' : 'Add Material'}</h3>
              <button className="close-btn" onClick={() => { setShowForm(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Material Name *</label>
                <input
                  type="text"
                  value={formData.materialName}
                  onChange={(e) => setFormData({...formData, materialName: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cost (₹) *</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    required
                    min="1"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Purchase Date *</label>
                  <input
                    type="date"
                    value={formData.dateOfPurchase}
                    onChange={(e) => setFormData({...formData, dateOfPurchase: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Supplier *</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
                <button type="submit">{editingMaterial ? 'Update Material' : 'Add Material'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

// Project Info Component
const ProjectInfo = React.memo(({ project, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(project);

  const saveChanges = () => {
    onUpdate({
      ...formData,
      projectValue: parseFloat(formData.projectValue)
    });
    setIsEditing(false);
  };

  return (
    <div className="project-info">
      <div className="section-header">
        <h3>Project Information</h3>
        <button 
          className={isEditing ? 'save-btn' : 'edit-btn'}
          onClick={isEditing ? saveChanges : () => setIsEditing(true)}
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
              value={formData.projectName}
              onChange={(e) => setFormData({...formData, projectName: e.target.value})}
            />
          ) : (
            <span>{project.projectName}</span>
          )}
        </div>

        <div className="info-item">
          <label>Project Value</label>
          {isEditing ? (
            <input
              type="number"
              value={formData.projectValue}
              onChange={(e) => setFormData({...formData, projectValue: e.target.value})}
            />
          ) : (
            <span>₹{project.projectValue?.toLocaleString('en-IN')}</span>
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

export default App;
