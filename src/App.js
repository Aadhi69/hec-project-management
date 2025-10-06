import React, { useState, useEffect } from 'react';
import './App.css';
import { database } from './firebase';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedState, setSelectedState] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Corrected states data
  const states = [
    'Tamil Nadu', 'Delhi', 'Uttar Pradesh'
  ];

  // Load data from Firebase
  useEffect(() => {
    loadProjectsFromFirebase();
  }, []);

  const loadProjectsFromFirebase = async () => {
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
  };

  const handleStateSelect = (state) => {
    setSelectedState(state);
    setCurrentView('projects');
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setCurrentView('project-detail');
  };

  const addProject = async (newProject) => {
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
  };

  const updateProject = async (updatedProject) => {
    try {
      await database.saveProject(updatedProject);
      setProjects(prev => prev.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      ));
      
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
      localStorage.setItem('hec-projects', JSON.stringify(
        projects.map(p => p.id === updatedProject.id ? updatedProject : p)
      ));
    }
  };

  const deleteProject = async (projectId) => {
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
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        // Fallback to localStorage
        setProjects(prev => prev.filter(p => p.id !== projectId));
        localStorage.setItem('hec-projects', JSON.stringify(
          projects.filter(p => p.id !== projectId)
        ));
      }
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
          {/* Fixed company name */}
          <h1>Hindustan Engineers and Contractors</h1>
          <p>Cloud Connected Project Management</p>
        </div>
      </header>

      <main className="main-content">
        {currentView === 'dashboard' && (
          <Dashboard 
            states={states} 
            onStateSelect={handleStateSelect} 
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

      <footer className="app-footer">
        <p>🔗 Connected to Cloud Database | Hindustan Engineers and Contractors</p>
      </footer>
    </div>
  );
}

// Dashboard Component with improved styling
function Dashboard({ states, onStateSelect }) {
  return (
    <div className="dashboard">
      <div className="section-header">
        <h2>Select State</h2>
        <p>Choose a state to view projects</p>
      </div>
      <div className="states-grid">
        {states.map((state, index) => (
          <div 
            key={index}
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
}

// Project List Component (updated with delete functionality)
function ProjectList({ state, projects, onProjectSelect, onBack, onAddProject, onDeleteProject }) {
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
}

// Project Form Component
function ProjectForm({ state, onSave, onCancel }) {
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
}

// Project Detail Component
function ProjectDetail({ project, onBack, onUpdateProject, onDeleteProject }) {
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
}

// Labour Management Component
function LabourManagement({ labours, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    numberOfLabours: '',
    role: '',
    workDescription: ''
  });

  const addLabour = () => {
    const newLabour = {
      ...formData,
      id: Date.now().toString(),
      numberOfLabours: parseInt(formData.numberOfLabours)
    };
    onUpdate([...labours, newLabour]);
    setShowForm(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      numberOfLabours: '',
      role: '',
      workDescription: ''
    });
  };

  const deleteLabour = (id) => {
    onUpdate(labours.filter(labour => labour.id !== id));
  };

  return (
    <div className="labour-management">
      <div className="section-header">
        <h3>Labour Management</h3>
        <button className="add-btn" onClick={() => setShowForm(true)}>
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
                    <button 
                      className="delete-btn"
                      onClick={() => deleteLabour(labour.id)}
                    >
                      Delete
                    </button>
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
              <h3>Add Labour Entry</h3>
              <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Number of Labours</label>
              <input
                type="number"
                value={formData.numberOfLabours}
                onChange={(e) => setFormData({...formData, numberOfLabours: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Work Description</label>
              <textarea
                value={formData.workDescription}
                onChange={(e) => setFormData({...formData, workDescription: e.target.value})}
                rows="3"
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="button" onClick={addLabour}>Add Labour</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Material Management Component
function MaterialManagement({ materials, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    materialName: '',
    cost: '',
    dateOfPurchase: new Date().toISOString().split('T')[0],
    quantity: '',
    supplier: ''
  });

  const addMaterial = () => {
    const newMaterial = {
      ...formData,
      id: Date.now().toString(),
      cost: parseFloat(formData.cost),
      quantity: parseInt(formData.quantity)
    };
    onUpdate([...materials, newMaterial]);
    setShowForm(false);
    setFormData({
      materialName: '',
      cost: '',
      dateOfPurchase: new Date().toISOString().split('T')[0],
      quantity: '',
      supplier: ''
    });
  };

  const deleteMaterial = (id) => {
    onUpdate(materials.filter(material => material.id !== id));
  };

  return (
    <div className="material-management">
      <div className="section-header">
        <h3>Material Management</h3>
        <button className="add-btn" onClick={() => setShowForm(true)}>
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
                <th>Cost</th>
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
                    <button 
                      className="delete-btn"
                      onClick={() => deleteMaterial(material.id)}
                    >
                      Delete
                    </button>
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
              <h3>Add Material</h3>
              <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Material Name</label>
              <input
                type="text"
                value={formData.materialName}
                onChange={(e) => setFormData({...formData, materialName: e.target.value})}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Cost (₹)</label>
                <input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Purchase Date</label>
                <input
                  type="date"
                  value={formData.dateOfPurchase}
                  onChange={(e) => setFormData({...formData, dateOfPurchase: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Supplier</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="button" onClick={addMaterial}>Add Material</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Project Info Component
function ProjectInfo({ project, onUpdate }) {
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
}

export default App;
