import React, { useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
    const emailRef = useRef();
    const passwordRef = useRef();
    const { login } = useAuth();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setError("");
            setLoading(true);
            await login(emailRef.current.value, passwordRef.current.value);
            navigate("/");
        } catch (err) {
            console.error(err);
            setError("Failed to log in: " + err.message);
        }

        setLoading(false);
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
            }}
        >
            <div className="modal-content" style={{ maxWidth: "400px", width: "100%" }}>
                <div className="modal-header" style={{ justifyContent: "center" }}>
                    <h2 style={{ fontSize: "2rem", fontWeight: 700 }}>Welcome Back</h2>
                </div>

                {error && (
                    <div
                        style={{
                            background: "rgba(251, 113, 133, 0.2)",
                            border: "1px solid var(--danger)",
                            color: "#fecdd3",
                            padding: "12px",
                            borderRadius: "8px",
                            marginBottom: "20px",
                            fontSize: "0.9rem",
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="form-input"
                            ref={emailRef}
                            required
                            placeholder="Enter your email"
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            className="form-input"
                            ref={passwordRef}
                            required
                            placeholder="Enter your password"
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="btn-submit"
                        type="submit"
                        style={{ width: "100%", marginTop: "10px" }}
                    >
                        Log In
                    </button>
                </form>

                <div style={{ marginTop: "20px", textAlign: "center", color: "var(--muted)" }}>
                    Need an account?{" "}
                    <Link
                        to="/signup"
                        style={{ color: "var(--accent-solid)", textDecoration: "none", fontWeight: 600 }}
                    >
                        Sign Up
                    </Link>
                </div>
            </div>
        </div>
    );
}
