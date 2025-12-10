import { Link } from 'react-router-dom';
import './App.css';
import './Register.css';

const RegisterPage = () => {
  return (
    <div className="container">
      <nav className="navbar">
        <div className="logo">🐾 Palap</div>
        <div className="nav-links">
          <Link to="#">DASHBOARD</Link>
          <Link to="#">JOBS</Link>
          <Link to="/login" className="active-nav">LOGIN/REGISTER</Link>
        </div>
      </nav>

      <div className="register-card">
        {/* กดลูกศรแล้ว Redirect กลับหน้า Login */}
        <Link to="/login" className="back-arrow">←</Link>
        
        <div className="profile-circle">
          🐾
        </div>
        
        <h2 style={{fontWeight: 900}}>CREATE ACCOUNT</h2>
        <p style={{fontSize: '12px', color: '#666'}}>Join our pet care service</p>

        <div className="register-form-container">
          <form onSubmit={(e) => e.preventDefault()}>
            <label>Username</label>
            <input type="text" />
            
            <label>Phone</label>
            <input type="text" />
            
            <label>Email</label>
            <input type="email" />
            
            <label>Password</label>
            <input type="password" />
            
            <label>Confirm Password</label>
            <input type="password" />

            <div style={{display: 'flex', gap: '8px', fontSize: '11px', textDecoration: 'underline', marginBottom: '15px', alignItems: 'center'}}>
              <input type="checkbox" id="agree" /> 
              <label htmlFor="agree">i agree to the terms of service and privacy policy</label>
            </div>

            <button type="submit" className="btn-register">Create Account</button>
          </form>
        </div>

        <p style={{fontSize: '13px', marginTop: '15px'}}>
          Already have an account? 
          <Link to="/login" style={{color: '#4A1D10', fontWeight: 'bold', marginLeft: '5px'}}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;