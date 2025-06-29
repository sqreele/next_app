import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Home() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const API_BASE_URL = 'http://localhost:8000'

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      setError('')
      const response = await axios.get(`${API_BASE_URL}/api/tasks/`)
      setTasks(response.data)
      console.log('Tasks fetched:', response.data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setError('Failed to fetch tasks. Make sure the backend is running on port 8000.')
    }
  }

  const addTask = async () => {
    if (!newTask.trim()) {
      setError('Please enter a task title')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      console.log('Adding task:', newTask)
      
      const response = await axios.post(`${API_BASE_URL}/api/tasks/`, {
        title: newTask,
        description: '',
        completed: false
      })
      
      console.log('Task added:', response.data)
      setNewTask('')
      await fetchTasks()
    } catch (error) {
      console.error('Error adding task:', error)
      setError(`Failed to add task: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = async (id, completed) => {
    try {
      setError('')
      await axios.patch(`${API_BASE_URL}/api/tasks/${id}/`, { 
        completed: !completed 
      })
      await fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
      setError('Failed to update task')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTask()
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Task Manager</h1>
      
      {error && (
        <div style={{
          background: '#ffebee',
          color: '#c62828',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px',
          border: '1px solid #ffcdd2'
        }}>
          {error}
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a new task..."
          style={{ 
            padding: '10px', 
            marginRight: '10px', 
            width: '300px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
          disabled={loading}
        />
        <button 
          onClick={addTask} 
          disabled={loading}
          style={{ 
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Adding...' : 'Add Task'}
        </button>
      </div>

      <div>
        <h3>Tasks ({tasks.length})</h3>
        {tasks.length === 0 ? (
          <p>No tasks yet. Add one above!</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              style={{
                padding: '15px',
                margin: '10px 0',
                border: '1px solid #ddd',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: task.completed ? '#f8f9fa' : 'white'
              }}
            >
              <div>
                <span style={{
                  textDecoration: task.completed ? 'line-through' : 'none',
                  fontSize: '16px',
                  color: task.completed ? '#6c757d' : '#212529'
                }}>
                  {task.title}
                </span>
                {task.description && (
                  <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '5px' }}>
                    {task.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => toggleTask(task.id, task.completed)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: task.completed ? '#28a745' : '#ffc107',
                  color: task.completed ? 'white' : '#212529',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {task.completed ? '✓ Done' : 'Mark Done'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
