import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { PlusIcon, XIcon } from "../components/Icons";

export default function Dashboard() {
    const { currentUser, logout } = useAuth();
    const [boards, setBoards] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState("");
    const [newBoardDesc, setNewBoardDesc] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        if (!currentUser) return;

        // Query boards where user is owner
        const q = query(
            collection(db, "boards"),
            where("ownerId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );

        // TODO: Also query boards where user is a member (requires composite index or separate query)
        // For now, let's just get owned boards. 
        // To support "member of", we might need a separate collection 'board_members' or array-contains query.
        // Firestore array-contains: where("memberUids", "array-contains", currentUser.uid)

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const boardsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBoards(boardsData);
        }, (error) => {
            console.error("Error fetching boards:", error);
            if (error.code === 'failed-precondition') {
                alert("Firestore requires an index for this query. Check the console for the link to create it.");
            }
        });

        return unsubscribe;
    }, [currentUser]);

    const handleCreateBoard = async (e) => {
        e.preventDefault();
        if (!newBoardTitle.trim()) return;

        try {
            await addDoc(collection(db, "boards"), {
                title: newBoardTitle,
                description: newBoardDesc,
                ownerId: currentUser.uid,
                createdAt: new Date(),
                members: [], // Array of { uid, role }
                memberUids: [currentUser.uid] // For easy querying
            });
            setIsModalOpen(false);
            setNewBoardTitle("");
            setNewBoardDesc("");
        } catch (error) {
            console.error("Error creating board:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    return (
        <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "2rem" }}>My Boards</h1>
                    <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>Welcome, {currentUser?.displayName || currentUser?.email}</p>
                </div>
                <button onClick={handleLogout} className="btn-cancel">
                    Log Out
                </button>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem" }}>
                {/* Create New Board Card */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "2px dashed var(--card-border)",
                        borderRadius: "var(--radius-lg)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "200px",
                        cursor: "pointer",
                        color: "var(--muted)",
                        transition: "all 0.2s"
                    }}
                    className="hover-card"
                >
                    <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "1rem"
                    }}>
                        <PlusIcon size={24} />
                    </div>
                    <span style={{ fontWeight: 600 }}>Create New Board</span>
                </button>

                {/* Board Cards */}
                {boards.map(board => (
                    <Link
                        key={board.id}
                        to={`/board/${board.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                    >
                        <div
                            style={{
                                background: "linear-gradient(120deg, var(--glass), var(--glass-2))",
                                border: "1px solid var(--card-border)",
                                borderRadius: "var(--radius-lg)",
                                padding: "1.5rem",
                                minHeight: "200px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                backdropFilter: "blur(10px)",
                                boxShadow: "var(--glass-shadow)",
                                transition: "transform 0.2s"
                            }}
                            className="hover-card"
                        >
                            <div>
                                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem" }}>{board.title}</h3>
                                <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>
                                    {board.description || "No description"}
                                </p>
                            </div>
                            <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "0.8rem", color: "var(--muted)", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "4px" }}>
                                    {board.ownerId === currentUser.uid ? "Owner" : "Member"}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Create Board Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Board</h2>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                                <XIcon size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateBoard}>
                            <div className="form-group">
                                <label>Board Title</label>
                                <input
                                    className="form-input"
                                    value={newBoardTitle}
                                    onChange={e => setNewBoardTitle(e.target.value)}
                                    placeholder="e.g., Marketing Campaign"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    className="form-textarea"
                                    value={newBoardDesc}
                                    onChange={e => setNewBoardDesc(e.target.value)}
                                    placeholder="What is this board for?"
                                    rows={3}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-submit">Create Board</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
