import { Link } from "@tanstack/react-router";
import "@/Styles/App.css";

const LoginPage = () => {
  return (
    <div className="min-h-screen m-auto container flex flex-col justify-center items-center">
      <div className="auth-card login">
        <div className="profile-circle">🐾</div>

        <h2>WELCOME BACK</h2>
        <p className="subtitle">Join our Community</p>

        <div className="auth-form-container">
          <form onSubmit={(e) => e.preventDefault()}>
            <label>Email</label>
            <input type="email" placeholder="example@mail.com" />

            <label>Password</label>
            <input type="password" />

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" /> Remember
              </label>
              <Link
                to="/register"
                style={{ color: "#333", textDecoration: "underline" }}
              >
                Forget password?
              </Link>
            </div>

            <button type="submit" className="btn-signin">
              Sign In
            </button>
          </form>
        </div>

        <p className="register-link-text">
          Don't have an account?
          <Link
            to="/register"
            style={{ color: "#4A1D10", fontWeight: "bold", marginLeft: "5px" }}
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
