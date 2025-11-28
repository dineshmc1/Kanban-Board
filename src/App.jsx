import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./App.css";

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

// --- Icon Asset Paths (Using the public path for reliable access) ---
// Since direct relative imports caused issues, we reference the assets
// using their expected public path, assuming they are accessible via the root URL.
const ASSETS = {
  CheckedIcon: "/assets/checked.svg",
  GripVerticalIcon: "/assets/dots.svg",
  CircleIcon: "/assets/dry-clean.svg",
  PlusIcon: "/assets/plus.svg",
  TrashIcon: "/assets/trash-can.svg",
  WipIcon: "/assets/work-in-progress.svg",
};

// --- Data & Constants ---
const COLUMNS = [
  { id: "todo", title: "To Do", className: "todo" },
  { id: "in-progress", title: "In Progress", className: "in-progress" },
  { id: "done", title: "Done", className: "done" },
];

// --- Utility Functions for Firebase Setup ---
const getFirebaseConfig = () => {
  try {
    // This variable is provided by the execution environment
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

// The Task Card Component
const TaskCard = React.memo(
  ({
    task,
    db,
    userId,
    onDragStart,
    handleProgressChange,
    handleDeleteTask,
  }) => {
    const isProgress = task.status === "in-progress";
    const isDone = task.status === "done";
    const progressPercentage = isDone ? 100 : task.progress || 0;

    // Determine the progress bar fill color
    const progressColor = isDone
      ? "#10b981"
      : task.progress > 0
      ? "#4f46e5"
      : "#e5e7eb";

    const handleUpdateProgress = useCallback(
      (e) => {
        // Only allow setting progress up to 99% for 'in-progress' state
        const value = parseInt(e.target.value, 10);
        handleProgressChange(task.id, Math.min(99, value));
      },
      [task.id, handleProgressChange]
    );

    const handleDragStart = (e) => {
      onDragStart(e, task.id);
    };

    return (
      <div
        className={`task-card ${task.isDragging ? "is-dragging" : ""}`}
        draggable
        onDragStart={handleDragStart}
        id={`task-${task.id}`}
      >
        <div className="flex-row">
          <h3 className="task-card-title">{task.title}</h3>
          {/* Drag Handle */}
          <button className="icon-button drag-handle">
            <img
              src={ASSETS.GripVerticalIcon}
              alt="Drag"
              style={{ width: "1.25rem", height: "1.25rem" }}
            />
          </button>
        </div>

        <div className="task-status-bar">
          {/* Status Icon */}
          <div
            style={{
              color: isDone ? "#10b981" : isProgress ? "#3b82f6" : "#f87171",
            }}
          >
            {isDone && (
              <img
                src={ASSETS.CheckedIcon}
                alt="Done"
                style={{ width: "1rem", height: "1rem" }}
              />
            )}
            {isProgress && (
              <img
                src={ASSETS.WipIcon}
                alt="WIP"
                style={{ width: "1rem", height: "1rem" }}
              />
            )}
            {!isProgress && !isDone && (
              <img
                src={ASSETS.CircleIcon}
                alt="To Do"
                style={{ width: "1rem", height: "1rem" }}
              />
            )}
          </div>

          {/* Progress Slider (Only for In Progress) */}
          <div className="progress-slider-container">
            {isProgress ? (
              <input
                type="range"
                min="0"
                max="99"
                value={progressPercentage}
                onChange={handleUpdateProgress}
                style={{
                  background: `linear-gradient(to right, ${progressColor} ${progressPercentage}%, #e0e7ff ${progressPercentage}%)`,
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

        {/* Delete Button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            className="icon-button"
            onClick={() => handleDeleteTask(task.id)}
            title="Delete Task"
          >
            <img
              src={ASSETS.TrashIcon}
              alt="Delete"
              style={{ width: "1rem", height: "1rem", color: "#ef4444" }}
            />
          </button>
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
        // Sign in anonymously if no user is found
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
      // User is now authenticated (either previously or anonymously/custom)
      setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  // --- 2. Real-time Firestore Listener ---
  useEffect(() => {
    if (!db || !isAuthReady) return;

    // Public collection path: /artifacts/{appId}/public/data/kanban_tasks
    const taskCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/kanban_tasks`
    );

    // Listen for real-time updates
    const unsubscribeSnapshot = onSnapshot(
      taskCollectionRef,
      (snapshot) => {
        const newTasks = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          newTasks[doc.id] = { id: doc.id, ...data };
        });
        setTasks(newTasks);
        console.log("Tasks updated from Firestore.");
      },
      (error) => {
        console.error("Error listening to Firestore:", error);
      }
    );

    return () => unsubscribeSnapshot();
  }, [db, isAuthReady]); // Re-run only when db or auth state changes

  // --- 3. CRUD Operations (Connected to Firestore) ---

  const addTask = useCallback(
    async (columnId) => {
      if (!db) return;

      const newTask = {
        title: `New ${columnId} Task`,
        status: columnId,
        progress: columnId === "done" ? 100 : 0,
        timestamp: Date.now(),
        ownerId: userId,
      };

      try {
        // Use setDoc with an explicit ID (timestamp is good for ordering)
        const newDocRef = doc(
          collection(db, `artifacts/${appId}/public/data/kanban_tasks`),
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

      const taskDocRef = doc(
        db,
        `artifacts/${appId}/public/data/kanban_tasks/${taskId}`
      );
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
      // IMPORTANT: Custom modal should be used instead of window.confirm in real apps
      // but for simplicity in this environment, we temporarily keep it.
      if (!db || !window.confirm("Are you sure you want to delete this task?"))
        return;

      const taskDocRef = doc(
        db,
        `artifacts/${appId}/public/data/kanban_tasks/${taskId}`
      );
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
      // Determine new status based on new progress
      let newStatus = "in-progress";
      if (newProgress === 100) {
        newStatus = "done";
      } else if (newProgress === 0) {
        newStatus = "todo";
      }

      updateTask(taskId, {
        progress: newProgress,
        status: newStatus,
      });
    },
    [updateTask]
  );

  // --- 4. Drag and Drop Logic ---

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
    e.currentTarget.classList.add("is-dragging");
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow drop
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

    e.target.closest(".task-card")?.classList.remove("is-dragging"); // Clean up dragging class

    // Determine progress based on the new status
    let newProgress;
    if (newStatus === "todo") {
      newProgress = 0;
    } else if (newStatus === "done") {
      newProgress = 100;
    } else {
      // 'in-progress'
      // Retain progress if task was already in progress (but not 0 or 100), otherwise default to 1
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
        // Sort tasks by timestamp (creation time)
        acc[task.status].push(task);
        return acc;
      },
      { todo: [], "in-progress": [], done: [] }
    );
  }, [tasks]);

  const sortedGroupedTasks = useMemo(() => {
    // Sort within each group by timestamp (latest created at the bottom)
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

  return (
    <div className="app">
      {/* Top Bar/Header (Minimalist) */}
      <header className="px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <img
              src={ASSETS.WipIcon}
              alt="Board Icon"
              style={{ width: "1.5rem", height: "1.5rem" }}
            />
            Kanban Hub
          </h1>
          <span className="text-xs text-gray-500">
            User: {currentUserIdDisplay} (Public Board)
          </span>
        </div>
      </header>

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
                <img
                  src={ASSETS.PlusIcon}
                  alt="Add"
                  style={{ width: "1.25rem", height: "1.25rem" }}
                />
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
    </div>
  );
};

export default App;
