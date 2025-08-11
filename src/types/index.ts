// Additional type definitions for better type safety
export interface SpinnerOption {
  id: string;
  text: string;
  color?: string;
}

export interface SpinResult {
  winner: string;
  winningIndex: number;
  timestamp: Date;
}

export interface AnimationConfig {
  duration: number;
  easing: string;
  rotations: {
    min: number;
    max: number;
  };
}

export interface WheelStyle {
  size: number;
  borderWidth: number;
  borderColor: string;
  centerSize: number;
  pointerColor: string;
}

export interface TextStyle {
  color: string;
  shadow: string;
  maxLength: number;
}

// Event handler types
export type OptionHandler = (index: number) => void;
export type SpinHandler = () => void;
export type FormSubmitHandler = (e: React.FormEvent<HTMLFormElement>) => void;
export type InputChangeHandler = (
  e: React.ChangeEvent<HTMLInputElement>
) => void;
