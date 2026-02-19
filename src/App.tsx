import './App.css'

function App() {
  return (
    <div className="container">
      {/* ส่วนหัว Navbar */}
      <nav className="navbar">
        <div className="logo">
          <span style={{fontSize: '24px'}}>🐾</span> Palap
        </div>
        <div className="nav-links">
          <span>DASHBOARD</span>
          <span>JOBS</span>
          <span style={{borderBottom: '2px solid #4A2418'}}>LOGIN/REGISTER</span>
        </div>
      </nav>

      {/* Card เข้าสู่ระบบ */}
      <div className="login-card">
        <div className="back-btn">←</div>
        
        <div className="profile-img">
          <span style={{fontSize: '50px'}}>🐾</span>
        </div>

        <h2>WELCOME BACK</h2>
        <p className="subtitle">Join our Community</p>

        <p className="type-label">Choose Freelance's Type Service</p>
        <div className="type-group">
          <div className="type-item">I want to Work as a Freelance</div>
          <div className="type-item">I want to Work as a Driver</div>
          <div className="type-item">I want to Work in the services sector</div>
        </div>

        <div className="form-group">
          <label>Email</label>
          <input type="email" placeholder="example@mail.com" />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input type="password" />
        </div>

        <div className="form-footer">
          <label><input type="checkbox" /> Remember</label>
          <a href="#" style={{color: '#333', textDecoration: 'underline'}}>Forgot password?</a>
        </div>

        <button className="btn-signin">Sign In</button>

        <p className="register-text">
          Don't have an account? <a href="#" style={{color: '#4A2418', fontWeight: 'bold'}}>Register</a>
        </p>
      </div>
    </div>
  )
}

export default App