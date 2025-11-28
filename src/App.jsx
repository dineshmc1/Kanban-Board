import React, { useState, useEffect, useCallback, useMemo } from "react";
import stopIcon from "./assets/stop.svg";
import percentageIcon from "./assets/percentage.svg";
import dotsIcon from "./assets/dots.svg";
import checkedIconImg from "./assets/checked.svg";
import wipIconImg from "./assets/work-in-progress.svg";
import dryCleanIcon from "./assets/dry-clean.svg";
import menuIcon from "./assets/menu-bar.svg";
import trashIconImg from "./assets/trash-can.svg";
import plusSvgImg from "./assets/plus.svg";
import reactLogoImg from "./assets/react.svg";

// --- Firebase Imports (required for persistent, real-time storage) ---
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

// --- Icon Components (Inline SVG to bypass file resolution issues) ---

const Icon = ({ size = "1em", strokeWidth = 2, children, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

const PlusIcon = (props) => (
  <Icon {...props}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </Icon>
);

const CheckedIcon = (props) => (
  <Icon {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </Icon>
);

const CircleIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10"></circle>
  </Icon>
);

const GripVerticalIcon = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="12" r="1"></circle>
    <circle cx="9" cy="5" r="1"></circle>
    <circle cx="9" cy="19" r="1"></circle>
    <circle cx="15" cy="12" r="1"></circle>
    <circle cx="15" cy="5" r="1"></circle>
    <circle cx="15" cy="19" r="1"></circle>
  </Icon>
);

const TrashIcon = (props) => (
  <Icon {...props}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </Icon>
);

const WipIcon = (props) => (
  <Icon {...props}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
    <path d="M21 3v5h-5"></path>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
    <path d="M3 21v-5h5"></path>
  </Icon>
);

// --- Data & Constants ---
const COLUMNS = [
  { id: "todo", title: "To Do", className: "todo" },
  { id: "in-progress", title: "In Progress", className: "in-progress" },
  { id: "done", title: "Done", className: "done" },
];

// --- Utility Functions for Firebase Setup ---
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

// Simplified path for public data: artifacts/{appId}/kanban_tasks (3 segments)
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;
const TASK_COLLECTION_PATH = `artifacts/${appId}/kanban_tasks`;

// The Task Card Component
const TaskCard = React.memo(
  ({
    task,
    db,
    userId,
    onDragStart,
    handleProgressChange,
    handleDeleteTask,
    updateTask,
  }) => {
    const isProgress = task.status === "in-progress";
    const isDone = task.status === "done";
    // If task has subtasks, compute progress from subtasks
    const hasSubtasks =
      Array.isArray(task.subtasks) && task.subtasks.length > 0;
    const subtaskDoneCount = hasSubtasks
      ? task.subtasks.filter((s) => s.done).length
      : 0;
    const subtaskProgress = hasSubtasks
      ? Math.round((subtaskDoneCount / task.subtasks.length) * 100)
      : null;

    // If status is 'done', percentage is 100 regardless of stored progress value
    const progressPercentage = isDone
      ? 100
      : hasSubtasks
      ? subtaskProgress
      : task.progress || 0;

    // Determine the progress bar fill color
    const progressColor = isDone
      ? "#10b981"
      : task.progress > 0
      ? "#4f46e5"
      : "#e5e7eb";

    const handleUpdateProgress = useCallback(
      (e) => {
        // Only allow setting progress between 1% and 99% for 'in-progress' state via slider
        const value = parseInt(e.target.value, 10);
        // Ensure value is not 0 or 100, which should be handled by drag-and-drop
        const newProgress = Math.min(99, Math.max(1, value));
        handleProgressChange(task.id, newProgress);
      },
      [task.id, handleProgressChange]
    );

    // Subtask handlers
    const [isExpanded, setIsExpanded] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

    const toggleExpand = () => setIsExpanded((v) => !v);

    const addSubtask = async () => {
      const title = newSubtaskTitle.trim();
      if (!title) return;
      const newSubtask = {
        id: crypto.randomUUID(),
        title,
        done: false,
      };
      const updated = Array.isArray(task.subtasks)
        ? [...task.subtasks, newSubtask]
        : [newSubtask];
      await updateTask(task.id, {
        subtasks: updated,
        // set status to in-progress if we add subtasks
        status: task.status === "done" ? "done" : "in-progress",
        progress: Math.round(
          (updated.filter((s) => s.done).length / updated.length) * 100
        ),
      });
      setNewSubtaskTitle("");
      setIsExpanded(true);
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

    const handleDragStart = (e) => {
      onDragStart(e, task.id);
    };

    // Custom message box logic (replaces window.confirm)
    const handleDeleteClick = () => {
      // In a production app, this would show a proper modal.
      // For this environment, we use a simple console prompt as a safeguard against accidental deletion.
      const confirmDelete = prompt(
        `Type "DELETE" to confirm deletion of task: "${task.title}"`
      );
      if (confirmDelete === "DELETE") {
        handleDeleteTask(task.id);
      }
    };

    return (
      <div
        className={`task-card ${task.isDragging ? "is-dragging" : ""}`}
        draggable
        onDragStart={handleDragStart}
        id={`task-${task.id}`}
      >
        <div className="flex-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={dotsIcon}
              alt="drag"
              className="drag-handle-img"
              draggable
              title="Drag"
            />
            <div>
              <h3 className="task-card-title">{task.title}</h3>
              {task.description && (
                <div className="task-card-desc">{task.description}</div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {task.isTech && (
              <img
                src={reactLogoImg}
                alt="tech"
                className="react-badge"
                title="Tech task"
              />
            )}
            <div
              className={`priority-pill ${
                task.priority === "low"
                  ? "priority-low"
                  : task.priority === "medium"
                  ? "priority-medium"
                  : task.priority === "high"
                  ? "priority-high"
                  : ""
              }`}
            >
              {(task.priority || "Low").toUpperCase()}
            </div>
          </div>
        </div>

        <div className="task-status-bar">
          {/* Status Icon */}
          <div className="flex items-center" style={{ gap: 8 }}>
            {isDone && (
              <img src={checkedIconImg} alt="done" className="status-icon" />
            )}
            {isProgress && !isDone && (
              <img src={wipIconImg} alt="wip" className="status-icon" />
            )}
            {!isProgress && !isDone && (
              <img src={dryCleanIcon} alt="todo" className="status-icon" />
            )}
          </div>

          {/* Progress Slider (Only for In Progress and no subtasks) */}
          <div className="progress-slider-container">
            {isProgress && !hasSubtasks ? (
              <input
                type="range"
                min="1"
                max="99"
                value={progressPercentage}
                onChange={handleUpdateProgress}
                style={{
                  background: `linear-gradient(to right, ${progressColor} ${progressPercentage}%, rgba(255,255,255,0.06) ${progressPercentage}%)`,
                }}
              />
            ) : (
              <div
                style={{
                  height: "6px",
                  borderRadius: "3px",
                  backgroundColor: progressColor,
                }}
              />
            )}
          </div>

          {/* Percentage Score */}
          <span
            className="percentage-score"
            style={{ color: isDone ? "#10b981" : "#4f46e5" }}
          >
            {progressPercentage}%
          </span>
        </div>

        {/* Actions: Expand / Delete / Menu */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            className="icon-button"
            onClick={toggleExpand}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <span style={{ fontSize: "0.9rem" }}>▾</span>
            ) : (
              <span style={{ fontSize: "0.9rem" }}>▸</span>
            )}
          </button>

          <button className="icon-button" onClick={() => {}} title="More">
            <img src={menuIcon} alt="menu" className="action-img" />
          </button>

          <button
            className="icon-button"
            onClick={handleDeleteClick}
            title="Delete Task"
          >
            <img src={trashIconImg} alt="delete" className="action-img" />
          </button>
        </div>

        {/* Subtasks Panel */}
        {isExpanded && (
          <div className="subtasks-panel" style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                placeholder="Add subtask title"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.04)",
                  background: "transparent",
                  color: "inherit",
                }}
              />
              <button
                onClick={addSubtask}
                className="icon-button"
                title="Add subtask"
              >
                <img src={plusSvgImg} alt="add" className="action-img" />
              </button>
            </div>

            <div style={{ marginTop: 8 }}>
              {(task.subtasks || []).map((s) => (
                <div
                  key={s.id}
                  className="subtask-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flex: 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!s.done}
                      onChange={() => toggleSubtaskDone(s.id)}
                    />
                    <span
                      style={{
                        textDecoration: s.done ? "line-through" : "none",
                      }}
                    >
                      {s.title}
                    </span>
                  </label>
                  {s.done && (
                    <img
                      src={stopIcon}
                      alt="done"
                      style={{ width: 18, height: 18 }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Subtask progress bar (visual) */}
        <div style={{ marginTop: 6 }}>
          <div className="subtask-progress">
            <div className="fill" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>
      </div>
    );
  }
);

// The Main App Component
export const App = () => {
  const [tasks, setTasks] = useState({});
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // --- 1. Firebase Initialization and Authentication ---
  useEffect(() => {
    const firebaseConfig = getFirebaseConfig();
    if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
      console.error("Firebase config is missing. Cannot initialize app.");
      setIsAuthReady(true);
      return;
    }

    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const firebaseAuth = getAuth(app);

    setDb(firestore);
    setAuth(firebaseAuth);

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
          } else {
            await signInAnonymously(firebaseAuth);
          }
        } catch (error) {
          console.error("Auth sign-in failed:", error);
        }
      }
      setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  // --- 2. Real-time Firestore Listener ---
  useEffect(() => {
    if (!db || !isAuthReady) return;

    // Use simplified, valid path: artifacts/{appId}/kanban_tasks (3 segments)
    const taskCollectionRef = collection(db, TASK_COLLECTION_PATH);

    const unsubscribeSnapshot = onSnapshot(
      taskCollectionRef,
      (snapshot) => {
        const newTasks = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          newTasks[doc.id] = { id: doc.id, ...data };
        });
        setTasks(newTasks);
        // console.log("Tasks updated from Firestore.");
      },
      (error) => {
        console.error("Error listening to Firestore:", error);
      }
    );

    return () => unsubscribeSnapshot();
  }, [db, isAuthReady]);

  // --- 3. CRUD Operations (Connected to Firestore) ---

  const addTask = useCallback(
    async (columnId) => {
      if (!db) return;

      // Prompt for a task title
      const title = prompt(`Enter task title for column '${columnId}':`);
      if (!title || !title.trim()) return;

      const newTask = {
        title: title.trim(),
        status: columnId,
        progress: columnId === "done" ? 100 : 0,
        subtasks: [],
        timestamp: Date.now(),
        ownerId: userId,
      };

      try {
        // Use timestamp as the explicit document ID for ordering
        const newDocRef = doc(
          collection(db, TASK_COLLECTION_PATH),
          String(newTask.timestamp)
        );
        await setDoc(newDocRef, newTask);
      } catch (error) {
        console.error("Error adding document: ", error);
      }
    },
    [db, userId]
  );

  const updateTask = useCallback(
    async (taskId, updateData) => {
      if (!db || !taskId) return;

      const taskDocRef = doc(db, TASK_COLLECTION_PATH, taskId);
      try {
        await updateDoc(taskDocRef, updateData);
      } catch (error) {
        console.error("Error updating document: ", error);
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
        console.error("Error deleting document: ", error);
      }
    },
    [db]
  );

  const handleProgressChange = useCallback(
    (taskId, newProgress) => {
      // This is only called when using the slider (1% to 99%), so status is always 'in-progress'
      updateTask(taskId, {
        progress: newProgress,
        status: "in-progress",
      });
    },
    [updateTask]
  );

  // --- 4. Drag and Drop Logic ---

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
    e.currentTarget.classList.add("is-dragging");
  };

  const floatingAdd = () => {
    const col = prompt(
      "Enter column (todo, in-progress, done) or leave blank for To Do:"
    );
    const columnId = col && col.trim() ? col.trim() : "todo";
    addTask(columnId);
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

    // Determine progress based on the new status
    let newProgress;
    if (newStatus === "todo") {
      newProgress = 0;
    } else if (newStatus === "done") {
      newProgress = 100;
    } else {
      // 'in-progress'
      // Retain progress if task was already in progress, otherwise default to 1 (min for slider)
      newProgress =
        task.status === "in-progress" &&
        task.progress > 0 &&
        task.progress < 100
          ? task.progress
          : 1;
    }

    // Update the task in Firestore
    await updateTask(taskId, {
      status: newStatus,
      progress: newProgress,
    });
  };

  // --- 5. Data Grouping and Memoization ---
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
    // Sort within each group by timestamp (oldest created at the top)
    return Object.keys(groupedTasks).reduce((acc, status) => {
      acc[status] = groupedTasks[status].sort(
        (a, b) => a.timestamp - b.timestamp
      );
      return acc;
    }, {});
  }, [groupedTasks]);

  // --- Render Logic ---

  if (!isAuthReady) {
    return (
      <div className="p-8 text-center text-gray-600">
        Loading Application and Syncing Data...
      </div>
    );
  }

  const currentUserIdDisplay = userId
    ? `${userId.substring(0, 4)}...${userId.substring(userId.length - 4)}`
    : "Guest";

  // Overall progress across all tasks (based on finished tasks)
  const allTasksArray = Object.values(tasks || {});
  const totalTasksCount = allTasksArray.length;
  const finishedTasksCount = allTasksArray.filter((t) => {
    if (!t) return false;
    if (t.status === "done") return true;
    if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
      return t.subtasks.filter((s) => s.done).length === t.subtasks.length;
    }
    return t.progress === 100;
  }).length;
  const overallPercent = totalTasksCount
    ? Math.round((finishedTasksCount / totalTasksCount) * 100)
    : 0;

  return (
    <div className="app">
      {/* Top Bar/Header (Minimalist) */}
      <header className="px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <WipIcon size="1.5rem" className="text-indigo-600" />
              Kanban Hub
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="range"
                min="0"
                max="100"
                value={overallPercent}
                readOnly
                disabled
                style={{ width: 200 }}
              />
              <span style={{ fontSize: 12, color: "#374151" }}>
                {overallPercent}%
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src={percentageIcon}
                alt="percent"
                style={{ width: 20, height: 20 }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={overallPercent}
                readOnly
                disabled
                style={{ width: 180 }}
              />
              <span style={{ fontSize: 12, color: "#374151" }}>
                {overallPercent}%
              </span>
            </div>

            <span className="text-xs text-gray-500">
              User: {currentUserIdDisplay} (Public Board)
            </span>
          </div>
        </div>
      </header>

      {/* Overall progress bar at top of tasks */}
      <div
        style={{ maxWidth: "1200px", margin: "12px auto", padding: "0 16px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={percentageIcon}
            alt="percent"
            style={{ width: 20, height: 20 }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={overallPercent}
            readOnly
            disabled
            style={{ flex: 1 }}
          />
          <span style={{ width: 48, textAlign: "right" }}>
            {overallPercent}%
          </span>
        </div>
      </div>

      <main className="board-container">
        {COLUMNS.map((column) => (
          <div
            key={column.id}
            className={`column ${column.className}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="column-header">
              <span className="column-title">
                {column.title}
                <span className="task-count">
                  {sortedGroupedTasks[column.id]?.length || 0}
                </span>
              </span>
              <button
                className="icon-button"
                onClick={() => addTask(column.id)}
                title={`Add task to ${column.title}`}
              >
                <img src={plusSvgImg} alt="add" className="action-img" />
              </button>
            </div>

            <div className="task-list">
              {sortedGroupedTasks[column.id]?.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  db={db}
                  userId={userId}
                  onDragStart={handleDragStart}
                  handleProgressChange={handleProgressChange}
                  handleDeleteTask={handleDeleteTask}
                  updateTask={updateTask}
                />
              ))}
              {/* Drop Target Placeholder for Empty Columns */}
              {sortedGroupedTasks[column.id]?.length === 0 && (
                <div className="text-center text-gray-400 p-4 border border-dashed border-gray-300 rounded-md">
                  Drop tasks here or click '+' to create one.
                </div>
              )}
            </div>
          </div>
        ))}
      </main>
      {/* Floating Add Task Button */}
      <button className="floating-add" onClick={floatingAdd} title="Add Task">
        <img src={plusSvgImg} alt="add" />
      </button>
    </div>
  );
};

export default App;
