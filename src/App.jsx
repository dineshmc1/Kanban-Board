import React, { useState, useEffect, useCallback, useMemo } from "react";

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

// --- Icon Components (Replacing external assets) ---
const Icon = ({ size = 20, className = "", children, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {children}
  </svg>
);

const XIcon = (props) => (
  <Icon {...props}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </Icon>
);

const PlusIcon = (props) => (
  <Icon {...props}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </Icon>
);

const TrashIcon = (props) => (
  <Icon {...props}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </Icon>
);

const MenuIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="1"></circle>
    <circle cx="19" cy="12" r="1"></circle>
    <circle cx="5" cy="12" r="1"></circle>
  </Icon>
);

const DragHandleIcon = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="12" r="1"></circle>
    <circle cx="9" cy="5" r="1"></circle>
    <circle cx="9" cy="19" r="1"></circle>
    <circle cx="15" cy="12" r="1"></circle>
    <circle cx="15" cy="5" r="1"></circle>
    <circle cx="15" cy="19" r="1"></circle>
  </Icon>
);

const ReactLogoIcon = (props) => (
  <svg
    width="18"
    height="18"
    viewBox="-10.5 -9.45 21 18.9"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="react-badge"
    {...props}
  >
    <circle cx="0" cy="0" r="2" fill="#00d8ff" />
    <g stroke="#00d8ff" strokeWidth="1" fill="none">
      <ellipse rx="10" ry="4.5" />
      <ellipse rx="10" ry="4.5" transform="rotate(60)" />
      <ellipse rx="10" ry="4.5" transform="rotate(120)" />
    </g>
  </svg>
);

// --- Constants ---
const COLUMNS = [
  { id: "todo", title: "To Do", className: "todo" },
  { id: "in-progress", title: "In Progress", className: "in-progress" },
  { id: "done", title: "Done", className: "done" },
];

const getFirebaseConfig = () => {
  try {
    return JSON.parse(
      typeof __firebase_config !== "undefined" ? __firebase_config : "{}"
    );
  } catch (e) {
    console.error("Firebase config error:", e);
    return null;
  }
};

const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;
const TASK_COLLECTION_PATH = `artifacts/${appId}/kanban_tasks`;

// --- NEW COMPONENT: Modal for Adding Tasks ---
const NewTaskModal = ({ isOpen, onClose, onSubmit, initialLane = "todo" }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [lane, setLane] = useState(initialLane);

  // Subtasks State
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Reset form when modal opens
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
    e.preventDefault(); // Prevent form submission
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

          {/* Subtask Section in Modal */}
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

// --- Overall Progress Bar ---
const OverallProgressBar = ({
  overallPercent,
  finishedTasksCount,
  totalTasksCount,
}) => {
  const gradient =
    "linear-gradient(90deg, var(--accent-solid), var(--success))";

  return (
    <div
      className="overall-progress-bar"
      style={{
        maxWidth: "1200px",
        margin: "0 auto 3rem auto", // Changed bottom margin to 3rem for spacing
        padding: "0 2rem",
      }}
    >
      <div
        style={{
          background: "var(--glass-2)",
          padding: "20px 24px",
          borderRadius: "var(--radius-lg)",
          border: "1.5px solid var(--card-border)",
          backdropFilter: "blur(8px) saturate(120%)",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        <h2
          style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 10px 0" }}
        >
          Overall Progress
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{ color: "var(--muted)", fontSize: "var(--font-size-md)" }}
          >
            {finishedTasksCount} of {totalTasksCount} tasks completed
          </span>
          <span
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {overallPercent}%
          </span>
        </div>
        <div style={{ marginTop: 12 }}>
          <div
            className="subtask-progress"
            style={{ height: "10px", background: "rgba(255, 255, 255, 0.1)" }}
          >
            <div
              className="fill"
              style={{
                height: "100%",
                background: gradient,
                width: `${overallPercent}%`,
                borderRadius: "inherit",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Task Card Component ---
const TaskCard = React.memo(
  ({
    task,
    onDragStart,
    handleProgressChange,
    handleDeleteTask,
    updateTask,
  }) => {
    const isDone = task.status === "done";
    const hasSubtasks =
      Array.isArray(task.subtasks) && task.subtasks.length > 0;
    const subtaskDoneCount = hasSubtasks
      ? task.subtasks.filter((s) => s.done).length
      : 0;
    const subtaskProgress = hasSubtasks
      ? Math.round((subtaskDoneCount / task.subtasks.length) * 100)
      : null;

    const progressPercentage = isDone
      ? 100
      : hasSubtasks
      ? subtaskProgress
      : task.progress || 0;

    // Subtask handlers inside Card
    const [isExpanded, setIsExpanded] = useState(false);
    const [cardNewSubtask, setCardNewSubtask] = useState("");

    const addSubtask = async () => {
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
      const updated = (task.subtasks || []).filter((s) => s.id !== subtaskId);
      // Re-calc progress
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
      if (confirm(`Delete task "${task.title}"?`)) {
        handleDeleteTask(task.id);
      }
    };

    return (
      <div
        className={`task-card ${task.isDragging ? "is-dragging" : ""}`}
        draggable
        onDragStart={(e) => onDragStart(e, task.id)}
        id={`task-${task.id}`}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <h3 className="task-card-title">{task.title}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {task.isTech && <ReactLogoIcon />}
            <div
              className={`priority-pill ${
                task.priority === "Low"
                  ? "priority-low"
                  : task.priority === "High"
                  ? "priority-high"
                  : "priority-medium"
              }`}
            >
              {(task.priority || "Medium").toUpperCase()}
            </div>
          </div>
        </div>

        {task.description && (
          <div className="task-card-desc">{task.description}</div>
        )}

        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {hasSubtasks ? (
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Subtasks: {subtaskDoneCount}/{task.subtasks.length}
            </span>
          ) : (
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {isDone ? "Completed" : "No subtasks"}
            </span>
          )}

          <span
            className="percentage-score"
            style={{
              color: isDone ? "var(--success)" : "var(--accent-solid)",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            {progressPercentage}%
          </span>
        </div>

        <div className="subtask-progress">
          <div
            className="fill"
            style={{
              width: `${progressPercentage}%`,
              background: isDone ? "var(--success)" : "var(--accent)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 10,
          }}
        >
          <div className="drag-handle-wrapper" title="Drag">
            <DragHandleIcon className="action-icon drag-handle-icon" />
          </div>

          {/* Subtask toggle button */}
          <button
            className="icon-button"
            onClick={() => setIsExpanded(!isExpanded)}
            title="Manage Subtasks"
          >
            <MenuIcon className="action-icon" />
          </button>

          <button
            className="icon-button"
            onClick={handleDeleteClick}
            title="Delete Task"
          >
            <TrashIcon className="action-icon" />
          </button>
        </div>

        {isExpanded && (
          <div
            className="subtasks-panel"
            style={{
              marginTop: 12,
              padding: 8,
              background: "rgba(0,0,0,0.2)",
              borderRadius: 8,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              {(task.subtasks || []).map((s) => (
                <div
                  key={s.id}
                  className="subtask-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 0",
                  }}
                >
                  {/* Thick box for done subtask */}
                  <input
                    type="checkbox"
                    className="thick-checkbox"
                    checked={!!s.done}
                    onChange={() => toggleSubtaskDone(s.id)}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: "0.9rem",
                      textDecoration: s.done ? "line-through" : "none",
                      color: s.done ? "gray" : "white",
                    }}
                  >
                    {s.title}
                  </span>
                  <button
                    onClick={() => deleteSubtask(s.id)}
                    className="icon-button"
                    style={{ width: 20, height: 20 }}
                  >
                    <TrashIcon
                      size={14}
                      className="action-icon"
                      style={{ opacity: 0.7 }}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                placeholder="Add subtask..."
                value={cardNewSubtask}
                onChange={(e) => setCardNewSubtask(e.target.value)}
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
          </div>
        )}
      </div>
    );
  }
);

// --- Main App Component ---
export const App = () => {
  const [tasks, setTasks] = useState({});
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTargetLane, setModalTargetLane] = useState("todo");

  // --- Firebase Init ---
  useEffect(() => {
    const firebaseConfig = getFirebaseConfig();
    if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
      console.error("Firebase config missing.");
      setIsAuthReady(true);
      return;
    }

    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const firebaseAuth = getAuth(app);

    setDb(firestore);

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
          } else {
            await signInAnonymously(firebaseAuth);
          }
        } catch (error) {
          console.error("Auth failed:", error);
        }
      }
      setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  // --- Real-time Listener ---
  useEffect(() => {
    if (!db || !isAuthReady) return;

    const taskCollectionRef = collection(db, TASK_COLLECTION_PATH);

    const unsubscribeSnapshot = onSnapshot(
      taskCollectionRef,
      (snapshot) => {
        const newTasks = {};
        snapshot.forEach((doc) => {
          newTasks[doc.id] = { id: doc.id, ...doc.data() };
        });
        setTasks(newTasks);
      },
      (error) => console.error("Firestore Error:", error)
    );

    return () => unsubscribeSnapshot();
  }, [db, isAuthReady]);

  // --- CRUD Operations ---
  const handleAddNewTask = async (taskData) => {
    if (!db) return;

    // Calculate initial progress based on subtasks
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
      ownerId: userId,
    };

    try {
      const newDocRef = doc(
        collection(db, TASK_COLLECTION_PATH),
        String(newTask.timestamp)
      );
      await setDoc(newDocRef, newTask);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const updateTask = useCallback(
    async (taskId, updateData) => {
      if (!db || !taskId) return;
      const taskDocRef = doc(db, TASK_COLLECTION_PATH, taskId);
      try {
        await updateDoc(taskDocRef, updateData);
      } catch (error) {
        console.error("Error updating:", error);
      }
    },
    [db]
  );

  const handleDeleteTask = useCallback(
    async (taskId) => {
      if (!db || !taskId) return;
      const taskDocRef = doc(db, TASK_COLLECTION_PATH, taskId);
      try {
        await deleteDoc(taskDocRef);
      } catch (error) {
        console.error("Error deleting:", error);
      }
    },
    [db]
  );

  // Drag and Drop
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
    e.currentTarget.classList.add("is-dragging");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove("drag-over");
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");

    const taskId = e.dataTransfer.getData("taskId");
    const task = tasks[taskId];
    if (!task || task.status === newStatus) return;

    e.target.closest(".task-card")?.classList.remove("is-dragging");

    let newProgress;
    if (newStatus === "todo") newProgress = 0;
    else if (newStatus === "done") newProgress = 100;
    else {
      newProgress =
        task.status === "in-progress" && task.progress > 0 ? task.progress : 1;
    }

    await updateTask(taskId, {
      status: newStatus,
      progress: newProgress,
    });
  };

  // Grouping
  const groupedTasks = useMemo(() => {
    return Object.values(tasks).reduce(
      (acc, task) => {
        if (!acc[task.status]) acc[task.status] = [];
        acc[task.status].push(task);
        return acc;
      },
      { todo: [], "in-progress": [], done: [] }
    );
  }, [tasks]);

  const sortedGroupedTasks = useMemo(() => {
    return Object.keys(groupedTasks).reduce((acc, status) => {
      acc[status] = groupedTasks[status].sort(
        (a, b) => a.timestamp - b.timestamp
      );
      return acc;
    }, {});
  }, [groupedTasks]);

  // Progress Calculation
  const allTasksArray = Object.values(tasks || {});
  const totalTasksCount = allTasksArray.length;
  const finishedTasksCount = allTasksArray.filter((t) => {
    if (!t) return false;
    if (t.status === "done") return true;
    if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
      return t.subtasks.every((s) => s.done);
    }
    return t.progress === 100;
  }).length;

  const overallPercent = totalTasksCount
    ? Math.round((finishedTasksCount / totalTasksCount) * 100)
    : 0;

  if (!isAuthReady) {
    return (
      <div className="p-8 text-center text-gray-400">Loading Dashboard...</div>
    );
  }

  const openAddModal = (lane = "todo") => {
    setModalTargetLane(lane);
    setIsModalOpen(true);
  };

  return (
    <div className="app">
      <header
        style={{
          padding: "2.5rem 2rem 0 2rem",
          maxWidth: "1200px",
          margin: "0 auto",
          color: "#eaf0fa",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
          Project Dashboard
        </h1>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "1rem",
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          Track and manage your tasks efficiently
        </p>
      </header>

      <OverallProgressBar
        overallPercent={overallPercent}
        finishedTasksCount={finishedTasksCount}
        totalTasksCount={totalTasksCount}
      />

      <main className="board-container">
        {COLUMNS.map((column) => (
          <div
            key={column.id}
            className={`column ${column.className}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div
              className="column-header"
              style={{
                background:
                  column.id === "todo"
                    ? "linear-gradient(90deg, rgba(163, 173, 194, 0.05), transparent)"
                    : column.id === "in-progress"
                    ? "linear-gradient(90deg, rgba(124, 58, 237, 0.1), transparent)"
                    : "linear-gradient(90deg, rgba(6, 182, 212, 0.1), transparent)",
                borderBottom: "4px solid",
                borderImage:
                  column.id === "todo"
                    ? "linear-gradient(90deg, #a3adc2, rgba(163, 173, 194, 0.2)) 1"
                    : column.id === "in-progress"
                    ? "linear-gradient(90deg, #7c3aed, #06b6d4) 1"
                    : "linear-gradient(90deg, #06b6d4, #10b981) 1",
                padding: "16px 20px",
                marginBottom: "12px",
              }}
            >
              <span className="column-title" style={{ fontSize: "1.25rem" }}>
                {column.title}
                <span className="task-count">
                  {sortedGroupedTasks[column.id]?.length || 0}
                </span>
              </span>
              <button
                className="icon-button"
                onClick={() => openAddModal(column.id)}
                title={`Add task to ${column.title}`}
                style={{ background: "none", border: "none" }}
              >
                <PlusIcon className="action-icon" />
              </button>
            </div>

            <div className="task-list">
              {sortedGroupedTasks[column.id]?.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={handleDragStart}
                  handleDeleteTask={handleDeleteTask}
                  updateTask={updateTask}
                />
              ))}
              {sortedGroupedTasks[column.id]?.length === 0 && (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--muted)",
                    border: "1px dashed rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                  }}
                >
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        ))}
      </main>

      {/* Floating Add Task Button with Animation Class */}
      <button
        className="floating-add"
        onClick={() => openAddModal()}
        title="Add Task"
      >
        <PlusIcon size={26} />
      </button>

      {/* New Task Modal */}
      <NewTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddNewTask}
        initialLane={modalTargetLane}
      />
    </div>
  );
};

export default App;
