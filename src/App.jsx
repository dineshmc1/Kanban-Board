import React, { useState, useEffect, useCallback, useMemo } from "react";

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
  }) => {
    const isProgress = task.status === "in-progress";
    const isDone = task.status === "done";
    // If status is 'done', percentage is 100 regardless of stored progress value
    const progressPercentage = isDone ? 100 : task.progress || 0;

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
          <h3 className="task-card-title">{task.title}</h3>
          {/* Drag Handle */}
          <button className="icon-button drag-handle" title="Drag to move task">
            <GripVerticalIcon size="1.25rem" className="text-gray-400" />
          </button>
        </div>

        <div className="task-status-bar">
          {/* Status Icon */}
          <div
            className="flex items-center"
            style={{
              color: isDone ? "#10b981" : isProgress ? "#3b82f6" : "#f87171",
            }}
          >
            {isDone && <CheckedIcon size="1rem" />}
            {isProgress && <WipIcon size="1rem" />}
            {!isProgress && !isDone && <CircleIcon size="1rem" />}
          </div>

          {/* Progress Slider (Only for In Progress) */}
          <div className="progress-slider-container">
            {isProgress ? (
              <input
                type="range"
                min="1" // Start at 1 to prevent automatic status change to 'todo'
                max="99" // End at 99 to prevent automatic status change to 'done'
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
            onClick={handleDeleteClick}
            title="Delete Task"
          >
            <TrashIcon
              size="1rem"
              className="text-red-500 hover:text-red-700"
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

      const newTask = {
        title: `New ${columnId} Task`,
        status: columnId,
        progress: columnId === "done" ? 100 : 0,
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

  return (
    <div className="app">
      {/* Top Bar/Header (Minimalist) */}
      <header className="px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <WipIcon size="1.5rem" className="text-indigo-600" />
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
                <PlusIcon size="1.25rem" />
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
