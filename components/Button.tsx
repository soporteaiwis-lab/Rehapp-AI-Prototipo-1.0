import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'success' | 'outline';
  size?: 'normal' | 'large';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'normal', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "rounded-xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-md";
  
  const variants = {
    primary: "bg-blue-600 text-white border-2 border-blue-600 hover:bg-blue-700",
    danger: "bg-red-600 text-white border-2 border-red-600 hover:bg-red-700",
    success: "bg-green-600 text-white border-2 border-green-600 hover:bg-green-700",
    outline: "bg-white text-blue-800 border-2 border-blue-800 hover:bg-blue-50"
  };

  const sizes = {
    normal: "py-3 px-6 text-lg",
    large: "py-5 px-8 text-2xl h-20" // Extra large for elderly accessibility
  };

  return (
    <button 
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''} 
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};