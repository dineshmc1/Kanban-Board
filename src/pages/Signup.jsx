import React, { useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
    const emailRef = useRef();
    const passwordRef = useRef();
    const passwordConfirmRef = useRef();
    const usernameRef = useRef();
    const { signup } = useAuth();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        if (passwordRef.current.value !== passwordConfirmRef.current.value) {
            return setError("Passwords do not match");
        }

        try {
            setError("");
            setLoading(true);
            await signup(
                emailRef.current.value,
                passwordRef.current.value,
                usernameRef.current.value
            );
            navigate("/");
        } catch (err) {
            console.error(err);
            setError("Failed to create an account: " + err.message);
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
                    <h2 style={{ fontSize: "2rem", fontWeight: 700 }}>Create Account</h2>
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
                        <label>Username</label>
                        <input
                            type="text"
                            className="form-input"
                            ref={usernameRef}
                            required
                            placeholder="Choose a username"
                        />
                    </div>
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
                            placeholder="Create a password"
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            className="form-input"
                            ref={passwordConfirmRef}
                            required
                            placeholder="Confirm your password"
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="btn-submit"
                        type="submit"
                        style={{ width: "100%", marginTop: "10px" }}
                    >
                        Sign Up
                    </button>
                </form>

                <div style={{ marginTop: "20px", textAlign: "center", color: "var(--muted)" }}>
                    Already have an account?{" "}
                    <Link
                        to="/login"
                        style={{ color: "var(--accent-solid)", textDecoration: "none", fontWeight: 600 }}
                    >
                        Log In
                    </Link>
                </div>
            </div>
        </div>
    );
}
