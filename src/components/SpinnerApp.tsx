// SpinnerApp.tsx  (patched)
import React, {
  useState,
  useRef,
  FormEvent,
  ChangeEvent,
  useEffect,
} from "react";
import {
  Button,
  TextInput,
  Grid,
  Column,
  UnorderedList,
  ListItem,
  Tile,
  Modal,
  Form,
  FormGroup,
  Stack,
  InlineNotification,
} from "@carbon/react";
import { Add, TrashCan, Play, Reset } from "@carbon/react/icons";
import "./SpinnerApp.scss";

interface SpinnerConfig {
  wheelSize: number;
  maxOptions: number;
  minOptions: number;
  maxOptionLength: number;
  minRotations: number;
  maxRotations: number;
  animationDuration: number;
  easingFunction: string;
  segmentBorderColor: string;
  wheelBorderColor: string;
  wheelBorderWidth: number;
  pointerColor: string;
  centerSize: number;
  segmentTextColor: string;
  segmentTextShadow: string;
  defaultOptions: string[];
  successNotificationDuration: number;
  saturation: number;
  lightness: number;
}

const CONFIG: SpinnerConfig = {
  wheelSize: 300,
  maxOptions: 12,
  minOptions: 2,
  maxOptionLength: 50,
  minRotations: 3,
  maxRotations: 6,
  animationDuration: 3000,
  easingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
  segmentBorderColor: "#fff",
  wheelBorderColor: "#393939",
  wheelBorderWidth: 4,
  pointerColor: "#da1e28",
  centerSize: 40,
  segmentTextColor: "#fff",
  segmentTextShadow: "1px 1px 2px rgba(0,0,0,0.8)",
  defaultOptions: ["Option 1", "Option 2"],
  successNotificationDuration: 3000,
  saturation: 70,
  lightness: 60,
};

// The wheel's "top" (12 o'clock) expressed in the wheel's coordinate system
// (in CSS: 0deg = right/3 o'clock, increasing clockwise → top is 270deg)
const POINTER_AT_DEG = 270;

/** safe modulo */
const mod = (n: number, m: number) => ((n % m) + m) % m;

const SpinnerApp: React.FC = () => {
  const [options, setOptions] = useState<string[]>([...CONFIG.defaultOptions]);
  const [newOption, setNewOption] = useState<string>("");
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [currentRotation, setCurrentRotation] = useState<number>(0); // cumulative rotation in degrees
  const [formError, setFormError] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // If we change options and want to preserve the *logical* winner (label),
  // we'll store that label here BEFORE we mutate options, then the effect will
  // realign the rotation so that same label is under the pointer.
  const [pendingPreservedWinner, setPendingPreservedWinner] = useState<
    string | null
  >(null);

  const wheelRef = useRef<HTMLDivElement>(null);

  // --- Winner calculation (correct mapping to the 12 o'clock pointer) ---
  const getCurrentWinner = (totalDegrees: number): string => {
    if (options.length === 0) return "";
    const segmentAngle = 360 / options.length;

    // reduce rotation to 0..359
    const rot = mod(totalDegrees, 360);

    // find wheel-angle currently at top: topWheelAngle = (POINTER_AT_DEG - rotation) mod 360
    const topWheelAngle = mod(POINTER_AT_DEG - rot, 360);

    const segmentIndex =
      Math.floor(topWheelAngle / segmentAngle) % options.length;
    return options[segmentIndex];
  };

  // --- When options change, try to keep the pointer pointing at the same label (if it still exists) ---
  useEffect(() => {
    if (!pendingPreservedWinner) return;

    const label = pendingPreservedWinner;
    setPendingPreservedWinner(null); // consume pending

    const index = options.indexOf(label);
    if (index < 0) {
      // Label no longer exists — do nothing (or you could reset rotation)
      return;
    }

    const segmentAngle = 360 / options.length;
    const centerWheelAngle = index * segmentAngle + segmentAngle / 2; // center of that segment

    // targetBase is the canonical rotation (0..359) that centers this option at the pointer:
    // targetBase ≡ POINTER_AT_DEG - centerWheelAngle  (mod 360)
    const targetBase = mod(POINTER_AT_DEG - centerWheelAngle, 360);

    // choose nearest equivalent rotation to avoid big jumps
    const k = Math.round((currentRotation - targetBase) / 360);
    const targetRotation = targetBase + 360 * k;

    setCurrentRotation(targetRotation);
  }, [options, pendingPreservedWinner, currentRotation]);

  // --- Random degrees (keeps “natural” random feel, no forced center) ---
  const randomDegrees = (): number => {
    const segmentAngle = 360 / options.length;

    // Pick a random segment
    const segmentIndex = Math.floor(Math.random() * options.length);

    // Pick a random point inside that segment, avoiding exact edges
    const margin = segmentAngle * 0.1; // 10% margin from each edge
    const offsetWithinSegment =
      margin + Math.random() * (segmentAngle - 2 * margin);

    const targetAngle = segmentIndex * segmentAngle + offsetWithinSegment;

    const spins =
      Math.floor(
        Math.random() * (CONFIG.maxRotations - CONFIG.minRotations + 1)
      ) + CONFIG.minRotations;

    return spins * 360 + targetAngle;
  };

  // --- Spin launcher ---
  const launchSpin = async (): Promise<void> => {
    if (isSpinning || options.length < CONFIG.minOptions) return;

    setIsSpinning(true);
    setWinner(null);
    setShowResult(false);

    const spinDegrees = randomDegrees();
    const newRotation = currentRotation + spinDegrees;
    setCurrentRotation(newRotation);

    setTimeout(() => {
      const winningOption = getCurrentWinner(newRotation);
      setWinner(winningOption);
      setIsSpinning(false);
      setShowResult(true);
    }, CONFIG.animationDuration);
  };

  // --- Form handlers: when we mutate options, capture the current winner BEFORE changing the array ---
  const validateOption = (value: string): string => {
    if (!value.trim()) return "Option cannot be empty";
    if (value.trim().length > CONFIG.maxOptionLength)
      return `Option must be ${CONFIG.maxOptionLength} characters or less`;
    if (options.includes(value.trim())) return "This option already exists";
    if (options.length >= CONFIG.maxOptions)
      return `Maximum ${CONFIG.maxOptions} options allowed`;
    return "";
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const error = validateOption(newOption);
    if (error) {
      setFormError(error);
      return;
    }

    // preserve the label currently under the pointer so we can keep it under the pointer after adding
    setPendingPreservedWinner(getCurrentWinner(currentRotation));
    setOptions([...options, newOption.trim()]);
    setNewOption("");
    setFormError("");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), CONFIG.successNotificationDuration);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setNewOption(value);
    if (formError) setFormError("");
  };

  const handleRemoveOption = (index: number): void => {
    if (options.length > CONFIG.minOptions) {
      // preserve winner label
      setPendingPreservedWinner(getCurrentWinner(currentRotation));
      const updatedOptions = options.filter((_, i) => i !== index);
      setOptions(updatedOptions);
    }
  };

  const handleClearOptions = (): void => {
    // reset to defaults — clear preservation and reset rotation for clarity
    setPendingPreservedWinner(null);
    setOptions([...CONFIG.defaultOptions]);
    setNewOption("");
    setFormError("");
    setCurrentRotation(0);
  };

  const closeResultModal = (): void => {
    setShowResult(false);
  };

  // --- Render ---
  return (
    <Grid className="spinner-app">
      <Column lg={16} md={8} sm={4}>
        <h1>Spinner Wheel</h1>

        {showSuccess && (
          <InlineNotification
            kind="success"
            title="Success"
            subtitle="Option added successfully!"
            hideCloseButton
            className="success-notification"
          />
        )}

        <div className="wheel-container">
          <div className="wheel-pin" />
          <div
            ref={wheelRef}
            className={`wheel ${isSpinning ? "spinning" : ""}`}
            style={{
              transform: `rotate(${currentRotation}deg)`,
              width: `${CONFIG.wheelSize}px`,
              height: `${CONFIG.wheelSize}px`,
              borderColor: CONFIG.wheelBorderColor,
              borderWidth: `${CONFIG.wheelBorderWidth}px`,
              transition: isSpinning
                ? `transform ${CONFIG.animationDuration}ms ${CONFIG.easingFunction}`
                : "none",
              background:
                `conic-gradient(from 0deg, ` +
                options
                  .map((_, index) => {
                    const segmentAngle = 360 / options.length;
                    const startAngle = segmentAngle * index;
                    const endAngle = segmentAngle * (index + 1);
                    const hue = (360 / options.length) * index;
                    return `hsl(${hue}, ${CONFIG.saturation}%, ${CONFIG.lightness}%) ${startAngle}deg ${endAngle}deg`;
                  })
                  .join(", ") +
                ")",
            }}
          >
            {options.map((option: string, index: number) => {
              const segmentAngle = 360 / options.length;
              const textRotation = segmentAngle * index + segmentAngle / 2;
              return (
                <div
                  key={index}
                  className="wheel-segment"
                  style={{
                    transform: `rotate(${textRotation}deg)`,
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transformOrigin: "0 0",
                    width: `${CONFIG.wheelSize * 0.4}px`,
                    height: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    className="segment-text"
                    style={{
                      color: CONFIG.segmentTextColor,
                      textShadow: CONFIG.segmentTextShadow,
                      fontSize: "14px",
                      fontWeight: "600",
                      marginLeft: "20px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {option}
                  </span>
                </div>
              );
            })}
            <div
              className="wheel-center"
              style={{
                width: `${CONFIG.centerSize}px`,
                height: `${CONFIG.centerSize}px`,
              }}
            />
          </div>
        </div>

        <div className="spin-button-container">
          <Button
            kind="primary"
            size="lg"
            onClick={launchSpin}
            disabled={isSpinning || options.length < CONFIG.minOptions}
            renderIcon={Play}
          >
            {isSpinning ? "Spinning..." : "SPIN"}
          </Button>
        </div>

        <Tile className="options-section">
          <h3>Manage Options</h3>
          <Form onSubmit={handleSubmit} className="add-option-form">
            <FormGroup legendText="Add New Option">
              <Stack gap={4}>
                <TextInput
                  id="new-option-input"
                  labelText="Option text"
                  placeholder={`Enter option text (max ${CONFIG.maxOptionLength} characters)`}
                  value={newOption}
                  onChange={handleInputChange}
                  invalid={!!formError}
                  invalidText={formError}
                  maxLength={CONFIG.maxOptionLength}
                  helperText={`${newOption.length}/${
                    CONFIG.maxOptionLength
                  } characters • ${
                    CONFIG.maxOptions - options.length
                  } slots remaining`}
                />
                <div className="form-buttons">
                  <Button
                    type="submit"
                    kind="primary"
                    disabled={
                      !newOption.trim() || options.length >= CONFIG.maxOptions
                    }
                    renderIcon={Add}
                  >
                    Add Option
                  </Button>
                  <Button
                    type="button"
                    kind="secondary"
                    onClick={handleClearOptions}
                    renderIcon={Reset}
                  >
                    Reset to Default
                  </Button>
                </div>
              </Stack>
            </FormGroup>
          </Form>

          <div className="current-options">
            <h4>Current Options ({options.length})</h4>
            <UnorderedList className="options-list">
              {options.map((option: string, index: number) => (
                <ListItem key={index} className="option-item">
                  <div className="option-content">
                    <span className="option-number">#{index + 1}</span>
                    <span className="option-text">{option}</span>
                  </div>
                  <Button
                    kind="ghost"
                    size="sm"
                    onClick={() => handleRemoveOption(index)}
                    disabled={options.length <= CONFIG.minOptions}
                    renderIcon={TrashCan}
                    iconDescription="Remove option"
                    hasIconOnly
                  />
                </ListItem>
              ))}
            </UnorderedList>
            <div className="options-info">
              <p>
                <strong>Requirements:</strong> Minimum {CONFIG.minOptions}{" "}
                options required to spin • Maximum {CONFIG.maxOptions} options
                allowed
              </p>
              {options.length < CONFIG.minOptions && (
                <InlineNotification
                  kind="warning"
                  title="Warning"
                  subtitle={`Add at least ${CONFIG.minOptions} options to enable spinning`}
                  hideCloseButton
                />
              )}
            </div>
          </div>
        </Tile>

        <Modal
          open={showResult}
          onRequestClose={closeResultModal}
          modalHeading="🎉 Spin Result!"
          modalLabel="Winner"
          primaryButtonText="Spin Again"
          secondaryButtonText="Close"
          onRequestSubmit={launchSpin}
          onSecondarySubmit={closeResultModal}
        >
          <p>
            The winner is: <strong>{winner}</strong>
          </p>
        </Modal>
      </Column>
    </Grid>
  );
};

export default SpinnerApp;
