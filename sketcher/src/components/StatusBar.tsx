import React from 'react';

interface StatusBarProps {
  message: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ message }) => {
  return (
    <div className="status-bar">
      {message}
    </div>
  );
};

export default StatusBar;