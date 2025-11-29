import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    setDoc,
    deleteDoc,
    getDoc,
    query,
    where,
    getDocs,
    arrayUnion
} from "firebase/firestore";
import {
    XIcon,
    PlusIcon,
    TrashIcon,
    MenuIcon,
    DragHandleIcon,
    ReactLogoIcon,
} from "./Icons";

// --- Constants ---
const COLUMNS = [
    { id: "todo", title: "To Do", className: "todo" },
    { id: "in-progress", title: "In Progress", className: "in-progress" },
    { id: "done", title: "Done", className: "done" },
];

// --- Components ---

const NewTaskModal = ({ isOpen, onClose, onSubmit, initialLane = "todo" }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("Medium");
    const [lane, setLane] = useState(initialLane);
    const [subtasks, setSubtasks] = useState([]);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

    useEffect(() => {
        if (isOpen) {
            setTitle("");
            setDescription("");
            setPriority("Medium");
            setLane(initialLane);
            setSubtasks([]);
            setNewSubtaskTitle("");
        }
    }, [isOpen, initialLane]);

    if (!isOpen) return null;

    const handleAddSubtask = (e) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;
        const newItem = {
            id: crypto.randomUUID(),
            title: newSubtaskTitle,
            done: false,
        };
        setSubtasks([...subtasks, newItem]);
        setNewSubtaskTitle("");
    };

    const removeSubtask = (id) => {
        setSubtasks(subtasks.filter((s) => s.id !== id));
    };

    const toggleSubtaskInModal = (id) => {
        setSubtasks(
            subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
            title,
            description,
            priority,
            status: lane,
            subtasks,
        });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add New Task</h2>
                    <button type="button" className="close-btn" onClick={onClose}>
                        <XIcon size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Title *</label>
                        <input
                            className="form-input"
                            placeholder="Enter task title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            className="form-textarea"
                            placeholder="Enter task description"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="form-row-2">
                        <div className="form-group">
                            <label>Priority</label>
                            <select
                                className="form-select"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Lane</label>
                            <select
                                className="form-select"
                                value={lane}
                                onChange={(e) => setLane(e.target.value)}
                            >
                                <option value="todo">To Do</option>
                                <option value="in-progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Subtasks</label>
                        <div className="subtask-input-wrapper">
                            <input
                                className="form-input"
                                placeholder="Add new subtask..."
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddSubtask(e);
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="icon-btn-add"
                                onClick={handleAddSubtask}
                            >
                                <PlusIcon size={20} />
                            </button>
                        </div>
                        <div className="modal-subtask-list">
                            {subtasks.map((sub) => (
                                <div key={sub.id} className="modal-subtask-item">
                                    <label className="subtask-label">
                                        <input
                                            type="checkbox"
                                            className="thick-checkbox"
                                            checked={sub.done}
                                            onChange={() => toggleSubtaskInModal(sub.id)}
                                        />
                                        <span
                                            style={{
                                                textDecoration: sub.done ? "line-through" : "none",
                                                color: sub.done ? "var(--muted)" : "inherit",
                                            }}
                                        >
                                            {sub.title}
                                        </span>
                                    </label>
                                    <button
                                        type="button"
                                        className="icon-btn-delete"
                                        onClick={() => removeSubtask(sub.id)}
                                    >
                                        <TrashIcon size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit">
                            Add Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
const TaskCard = React.memo(({ task, onDragStart, handleDeleteTask, updateTask, canEdit, members }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [cardNewSubtask, setCardNewSubtask] = useState("");

    const isDone = task.status === "done";
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const subtaskDoneCount = hasSubtasks ? task.subtasks.filter((s) => s.done).length : 0;
    const subtaskProgress = hasSubtasks
        ? Math.round((subtaskDoneCount / task.subtasks.length) * 100)
        : null;

    const progressPercentage = isDone
        ? 100
        : hasSubtasks
            ? subtaskProgress
            : task.progress || 0;

    const addSubtask = async () => {
        if (!canEdit) return;
        const title = cardNewSubtask.trim();
        if (!title) return;
        const newSubtask = {
            id: crypto.randomUUID(),
            title,
            done: false,
        };
        const updated = Array.isArray(task.subtasks)
            ? [...task.subtasks, newSubtask]
            : [newSubtask];

        const doneCount = updated.filter((s) => s.done).length;
        const newProgress = Math.round((doneCount / updated.length) * 100);
        const newStatus =
            newProgress === 100 ? "done" : newProgress > 0 ? "in-progress" : "todo";

        await updateTask(task.id, {
            subtasks: updated,
            status: newStatus,
            progress: newProgress,
        });
        setCardNewSubtask("");
    };

    const toggleSubtaskDone = async (subtaskId) => {
        if (!canEdit) return;
        const updated = (task.subtasks || []).map((s) =>
            s.id === subtaskId ? { ...s, done: !s.done } : s
        );
        const doneCount = updated.filter((s) => s.done).length;
        const newProgress = Math.round((doneCount / updated.length) * 100);
        const newStatus =
            newProgress === 100 ? "done" : newProgress > 0 ? "in-progress" : "todo";

        await updateTask(task.id, {
            subtasks: updated,
            progress: newProgress,
            status: newStatus,
        });
    };

    const deleteSubtask = async (subtaskId) => {
        if (!canEdit) return;
        const updated = (task.subtasks || []).filter((s) => s.id !== subtaskId);
        let newProgress = 0;
        let newStatus = task.status;

        if (updated.length > 0) {
            const doneCount = updated.filter((s) => s.done).length;
            newProgress = Math.round((doneCount / updated.length) * 100);
            newStatus =
                newProgress === 100
                    ? "done"
                    : newProgress > 0
                        ? "in-progress"
                        : "todo";
        }

        await updateTask(task.id, {
            subtasks: updated,
            progress: newProgress,
            status: newStatus,
        });
    };

    const handleDeleteClick = () => {
        if (!canEdit) return;
        if (window.confirm("Are you sure you want to delete this task?")) {
            handleDeleteTask(task.id);
        }
    };

    const handleAssign = async (uid) => {
        if (!canEdit) return;
        const member = members?.find(m => m.uid === uid);
        await updateTask(task.id, {
            assignedTo: uid,
            assignedToName: member ? (member.email || member.uid) : null
        });
    };

    return (
        <div
            className="task-card"
            draggable={canEdit}
            onDragStart={(e) => onDragStart(e, task.id)}
        >
            <div className="task-header">
                <div className="task-badges">
                    <span className={`priority-badge ${task.priority.toLowerCase()}`}>
                        {task.priority}
                    </span>
                    {task.assignedToName && (
                        <span className="assignee-badge" title={task.assignedToName}>
                            {task.assignedToName.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
                {canEdit && (
                    <div className="task-actions">
                        <select
                            className="assign-select"
                            value={task.assignedTo || ""}
                            onChange={(e) => handleAssign(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="">Unassigned</option>
                            {members?.map(m => (
                                <option key={m.uid} value={m.uid}>
                                    {m.email || m.uid}
                                </option>
                            ))}
                        </select>
                        <button className="icon-btn-delete" onClick={handleDeleteClick}>
                            <TrashIcon size={16} />
                        </button>
                    </div>
                )}
            </div>

            <h3 className="task-title">{task.title}</h3>
            {task.description && <p className="task-desc">{task.description}</p>}

            <div className="progress-section">
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{
                            width: `${progressPercentage}%`,
                            background:
                                progressPercentage === 100
                                    ? "var(--success)"
                                    : "var(--accent-solid)",
                        }}
                    />
                </div>
                <span className="progress-text">{progressPercentage}%</span>
            </div>

            {hasSubtasks && (
                <div className="subtasks-container">
                    <div
                        className="subtasks-header"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <span>
                            Subtasks ({subtaskDoneCount}/{task.subtasks.length})
                        </span>
                        <span>{isExpanded ? "▲" : "▼"}</span>
                    </div>
                    {isExpanded && (
                        <div className="subtasks-list">
                            {task.subtasks.map((sub) => (
                                <div key={sub.id} className="subtask-item">
                                    <input
                                        type="checkbox"
                                        className="thick-checkbox"
                                        checked={sub.done}
                                        onChange={() => toggleSubtaskDone(sub.id)}
                                        disabled={!canEdit}
                                    />
                                    <span
                                        style={{
                                            textDecoration: sub.done ? "line-through" : "none",
                                            color: sub.done ? "var(--muted)" : "inherit",
                                            flex: 1,
                                        }}
                                    >
                                        {sub.title}
                                    </span>
                                    {canEdit && (
                                        <button
                                            className="icon-btn-delete"
                                            onClick={() => deleteSubtask(sub.id)}
                                        >
                                            <TrashIcon size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {canEdit && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                    <input
                        placeholder="Add subtask..."
                        value={cardNewSubtask}
                        onChange={(e) => setCardNewSubtask(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                addSubtask();
                            }
                        }}
                        style={{
                            flex: 1,
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(0,0,0,0.3)",
                            color: "white",
                            fontSize: "0.85rem",
                        }}
                    />
                    <button onClick={addSubtask} className="icon-button" title="Add">
                        <PlusIcon className="action-icon" />
                    </button>
                </div>
            )}
        </div>
    );
});

const BoardSettingsModal = ({ isOpen, onClose, board, onAddMember }) => {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("viewer");
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await onAddMember(email, role);
            setEmail("");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Board Settings</h2>
                    <button className="close-btn" onClick={onClose}>
                        <XIcon size={24} />
                    </button>
                </div>

                <div style={{ marginBottom: "20px" }}>
                    <h3>Members</h3>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                        {board.members && board.members.map((m, idx) => (
                            <li key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                                <span>{m.email || m.uid}</span>
                                <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{m.role}</span>
                            </li>
                        ))}
                        {(!board.members || board.members.length === 0) && (
                            <li style={{ color: "var(--muted)" }}>No members yet.</li>
                        )}
                    </ul>
                </div>

                <form onSubmit={handleSubmit}>
                    <h3>Add Member</h3>
                    {error && <div style={{ color: "var(--danger)", marginBottom: 10 }}>{error}</div>}
                    <div className="form-group">
                        <label>User Email</label>
                        <input
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter user email"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Role</label>
                        <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="viewer">Viewer (Read Only)</option>
                            <option value="editor">Editor (Can Edit)</option>
                        </select>
                    </div>
                    <button type="submit" className="btn-submit">Add Member</button>
                </form>
            </div>
        </div>
    );
};

export default function Board() {
    const { boardId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState({});
    const [board, setBoard] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [modalTargetLane, setModalTargetLane] = useState("todo");
    const [loading, setLoading] = useState(true);

    const TASK_COLLECTION_PATH = `boards/${boardId}/tasks`;

    useEffect(() => {
        if (!currentUser || !boardId) return;

        // Fetch Board Details
        const boardRef = doc(db, "boards", boardId);
        const unsubscribeBoard = onSnapshot(boardRef, (docSnap) => {
            if (docSnap.exists()) {
                setBoard({ id: docSnap.id, ...docSnap.data() });
            } else {
                navigate("/dashboard"); // Board not found
            }
            setLoading(false);
        });

        // Fetch Tasks
        const q = collection(db, TASK_COLLECTION_PATH);
        const unsubscribeTasks = onSnapshot(q, (snapshot) => {
            const newTasks = {};
            snapshot.forEach((doc) => {
                newTasks[doc.id] = { id: doc.id, ...doc.data() };
            });
            setTasks(newTasks);
        });

        return () => {
            unsubscribeBoard();
            unsubscribeTasks();
        };
    }, [boardId, currentUser, navigate]);

    const canEdit = board && (board.ownerId === currentUser.uid || board.members?.some(m => m.uid === currentUser.uid && m.role === 'editor'));
    const isOwner = board && board.ownerId === currentUser.uid;

    const handleAddNewTask = async (taskData) => {
        if (!canEdit) return;

        const subtasks = taskData.subtasks || [];
        let progress = 0;
        if (taskData.status === "done") {
            progress = 100;
        } else if (subtasks.length > 0) {
            const doneCount = subtasks.filter((s) => s.done).length;
            progress = Math.round((doneCount / subtasks.length) * 100);
        }

        const newTask = {
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            status: taskData.status,
            subtasks: subtasks,
            progress: progress,
            timestamp: Date.now(),
            createdBy: currentUser.uid,
        };

        try {
            await setDoc(doc(collection(db, TASK_COLLECTION_PATH), String(newTask.timestamp)), newTask);
        } catch (error) {
            console.error("Error adding task:", error);
        }
    };

    const updateTask = useCallback(
        async (taskId, updateData) => {
            if (!canEdit) return;
            const taskDocRef = doc(db, TASK_COLLECTION_PATH, taskId);
            try {
                await updateDoc(taskDocRef, updateData);
            } catch (error) {
                console.error("Error updating:", error);
            }
        },
        [db, TASK_COLLECTION_PATH, canEdit]
    );

    const handleDeleteTask = useCallback(
        async (taskId) => {
            if (!canEdit) return;
            const taskDocRef = doc(db, TASK_COLLECTION_PATH, taskId);
            try {
                await deleteDoc(taskDocRef);
            } catch (error) {
                console.error("Error deleting:", error);
            }
        },
        [db, TASK_COLLECTION_PATH, canEdit]
    );

    const onDragStart = (e, taskId) => {
        if (!canEdit) return;
        e.dataTransfer.setData("taskId", taskId);
    };

    const onDragOver = (e) => {
        e.preventDefault();
    };

    const onDrop = async (e, laneId) => {
        if (!canEdit) return;
        const taskId = e.dataTransfer.getData("taskId");
        if (!taskId) return;

        const task = tasks[taskId];
        if (task && task.status !== laneId) {
            let updates = { status: laneId };
            if (laneId === "done") {
                updates.progress = 100;
                if (task.subtasks) {
                    updates.subtasks = task.subtasks.map((s) => ({ ...s, done: true }));
                }
            } else if (task.status === "done" && laneId !== "done") {
                // If moving back from done, maybe reset progress?
                // For now, let's keep it simple or recalculate based on subtasks
                if (task.subtasks && task.subtasks.length > 0) {
                    const doneCount = task.subtasks.filter(s => s.done).length;
                    updates.progress = Math.round((doneCount / task.subtasks.length) * 100);
                } else {
                    updates.progress = 0;
                }
            }
            await updateTask(taskId, updates);
        }
    };

    const handleAddMember = async (email, role) => {
        if (!isOwner) throw new Error("Only owner can add members");

        // Find user by email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("User not found");
        }

        const userToAdd = querySnapshot.docs[0].data();

        // Check if already member
        if (board.members?.some(m => m.uid === userToAdd.uid)) {
            throw new Error("User already a member");
        }

        const newMember = {
            uid: userToAdd.uid,
            email: userToAdd.email,
            role: role
        };

        await updateDoc(doc(db, "boards", boardId), {
            members: arrayUnion(newMember),
            memberUids: arrayUnion(userToAdd.uid)
        });
    };

    if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

    const tasksArray = Object.values(tasks);
    const finishedTasksCount = tasksArray.filter((t) => t.progress === 100).length;
    const totalTasksCount = tasksArray.length;
    const totalProgressSum = tasksArray.reduce((acc, t) => acc + (t.progress || 0), 0);
    const overallPercent = totalTasksCount === 0 ? 0 : Math.round(totalProgressSum / totalTasksCount);

    return (
        <div style={{ paddingBottom: "4rem" }}>
            {/* Header */}
            <div style={{ padding: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <button onClick={() => navigate("/dashboard")} className="btn-cancel" style={{ marginBottom: 10 }}>← Back to Dashboard</button>
                    <h1 style={{ margin: 0 }}>{board?.title}</h1>
                    <p style={{ color: "var(--muted)", margin: "5px 0 0 0" }}>{board?.description}</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    {isOwner && (
                        <button className="btn-cancel" onClick={() => setIsSettingsOpen(true)}>
                            Settings / Members
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="overall-progress-bar" style={{ maxWidth: "1200px", margin: "0 auto 3rem auto", padding: "0 2rem" }}>
                <div style={{ background: "var(--glass-2)", padding: "20px 24px", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--card-border)", backdropFilter: "blur(8px) saturate(120%)", boxShadow: "var(--glass-shadow)" }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 10px 0" }}>Overall Progress</h2>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--muted)", fontSize: "var(--font-size-md)" }}>{finishedTasksCount} of {totalTasksCount} tasks completed</span>
                        <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "#fff" }}>{overallPercent}%</span>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div className="subtask-progress" style={{ height: "10px", background: "rgba(255, 255, 255, 0.1)" }}>
                            <div className="fill" style={{ height: "100%", background: "linear-gradient(90deg, var(--accent-solid), var(--success))", width: `${overallPercent}%`, borderRadius: "inherit" }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Board Columns */}
            <div className="board-container">
                {COLUMNS.map((col) => {
                    const colTasks = tasksArray.filter((t) => t.status === col.id);
                    return (
                        <div
                            key={col.id}
                            className="column"
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, col.id)}
                        >
                            <div className="column-header">
                                <div className="column-title">
                                    <span className={`status-dot ${col.className}`} />
                                    {col.title}
                                </div>
                                <span className="task-count">{colTasks.length}</span>
                            </div>
                            <div className="task-list">
                                {colTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onDragStart={onDragStart}
                                        handleDeleteTask={handleDeleteTask}
                                        updateTask={updateTask}
                                        canEdit={canEdit}
                                        members={board?.members}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Floating Add Button */}
            {
                canEdit && (
                    <button
                        className="floating-add"
                        onClick={() => {
                            setModalTargetLane("todo");
                            setIsModalOpen(true);
                        }}
                    >
                        <PlusIcon size={32} />
                    </button>
                )
            }

            {/* Modals */}
            <NewTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddNewTask}
                initialLane={modalTargetLane}
            />

            {
                board && (
                    <BoardSettingsModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        board={board}
                        onAddMember={handleAddMember}
                    />
                )
            }
        </div>
    );
}
