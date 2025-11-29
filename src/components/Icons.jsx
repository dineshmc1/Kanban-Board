import React from "react";

export const Icon = ({ size = 20, className = "", children, ...props }) => (
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

export const XIcon = (props) => (
    <Icon {...props}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </Icon>
);

export const PlusIcon = (props) => (
    <Icon {...props}>
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </Icon>
);

export const TrashIcon = (props) => (
    <Icon {...props}>
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </Icon>
);

export const MenuIcon = (props) => (
    <Icon {...props}>
        <circle cx="12" cy="12" r="1"></circle>
        <circle cx="19" cy="12" r="1"></circle>
        <circle cx="5" cy="12" r="1"></circle>
    </Icon>
);

export const DragHandleIcon = (props) => (
    <Icon {...props}>
        <circle cx="9" cy="12" r="1"></circle>
        <circle cx="9" cy="5" r="1"></circle>
        <circle cx="9" cy="19" r="1"></circle>
        <circle cx="15" cy="12" r="1"></circle>
        <circle cx="15" cy="5" r="1"></circle>
        <circle cx="15" cy="19" r="1"></circle>
    </Icon>
);

export const ReactLogoIcon = (props) => (
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
