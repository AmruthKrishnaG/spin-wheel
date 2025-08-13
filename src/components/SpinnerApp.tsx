// SpinnerApp.tsx — Original text positioning + edit/delete/clear all + no winner modal

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
  Form,
  FormGroup,
  Stack,
  InlineNotification,
} from "@carbon/react";
import { Add, TrashCan, Play, Reset, Edit } from "@carbon/react/icons";
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

const POINTER_AT_DEG = 270;
const mod = (n: number, m: number) => ((n % m) + m) % m;

const SpinnerApp: React.FC = () => {
  const [options, setOptions] = useState([...CONFIG.defaultOptions]);
  const [newOption, setNewOption] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [formError, setFormError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingPreservedWinner, setPendingPreservedWinner] = useState<
    string | null
  >(null);

  const wheelRef = useRef<HTMLDivElement>(null);

  const getCurrentWinner = (totalDegrees: number) => {
    if (options.length === 0) return "";
    const segmentAngle = 360 / options.length;
    const rot = mod(totalDegrees, 360);
    const topWheelAngle = mod(POINTER_AT_DEG - rot, 360);
    const segmentIndex =
      Math.floor(topWheelAngle / segmentAngle) % options.length;
    return options[segmentIndex];
  };

  useEffect(() => {
    if (!pendingPreservedWinner) return;
    const label = pendingPreservedWinner;
    setPendingPreservedWinner(null);
    const index = options.indexOf(label);
    if (index < 0) return;
    const segmentAngle = 360 / options.length;
    const centerWheelAngle = index * segmentAngle + segmentAngle / 2;
    const targetBase = mod(POINTER_AT_DEG - centerWheelAngle, 360);
    const k = Math.round((currentRotation - targetBase) / 360);
    setCurrentRotation(targetBase + 360 * k);
  }, [options, pendingPreservedWinner, currentRotation]);

  const randomDegrees = () => {
    const segmentAngle = 360 / options.length;
    const segmentIndex = Math.floor(Math.random() * options.length);
    const margin = segmentAngle * 0.1;
    const offsetWithinSegment =
      margin + Math.random() * (segmentAngle - 2 * margin);
    const targetAngle = segmentIndex * segmentAngle + offsetWithinSegment;
    const spins =
      Math.floor(
        Math.random() * (CONFIG.maxRotations - CONFIG.minRotations + 1)
      ) + CONFIG.minRotations;
    return spins * 360 + targetAngle;
  };

  const launchSpin = () => {
    if (isSpinning || options.length < CONFIG.minOptions) return;
    setIsSpinning(true);
    const spinDegrees = randomDegrees();
    setCurrentRotation(currentRotation + spinDegrees);
    setTimeout(() => {
      setIsSpinning(false);
    }, CONFIG.animationDuration);
  };

  const validateOption = (value: string, skipDuplicateCheck = false) => {
    const trimmed = value.trim();
    if (!trimmed) return "Option cannot be empty";
    if (trimmed.length > CONFIG.maxOptionLength)
      return `Option must be ${CONFIG.maxOptionLength} characters or less`;
    if (!skipDuplicateCheck && options.includes(trimmed))
      return "This option already exists";
    if (options.length >= CONFIG.maxOptions)
      return `Maximum ${CONFIG.maxOptions} options allowed`;
    return "";
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const error = validateOption(newOption);
    if (error) {
      setFormError(error);
      return;
    }
    setPendingPreservedWinner(getCurrentWinner(currentRotation));
    setOptions([...options, newOption.trim()]);
    setNewOption("");
    setFormError("");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), CONFIG.successNotificationDuration);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewOption(e.target.value);
    if (formError) setFormError("");
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleEditOption = (index: number) => {
    const current = options[index];
    const updatedText = prompt("Edit option:", current);
    if (updatedText === null) return;
    const trimmed = updatedText.trim();
    if (!trimmed) return;

    const error = validateOption(trimmed, trimmed === current);
    if (error) {
      alert(error);
      return;
    }

    const updated = [...options];
    updated[index] = trimmed;
    setOptions(updated);
  };

  const handleClearOptions = () => {
    setPendingPreservedWinner(null);
    setOptions([]);
    setNewOption("");
    setFormError("");
    setCurrentRotation(0);
  };

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
                `conic-gradient(` +
                options
                  .map((_, index) => {
                    const segAngle = 360 / options.length;
                    const startAngle = segAngle * index;
                    const endAngle = segAngle * (index + 1);
                    const hue = (360 / options.length) * index;
                    return `hsl(${hue}, ${CONFIG.saturation}%, ${CONFIG.lightness}%) ${startAngle}deg ${endAngle}deg`;
                  })
                  .join(", ") +
                ")",
              position: "relative",
              borderStyle: "solid",
              borderRadius: "50%",
              overflow: "hidden",
            }}
          >
            {options.map((option, index) => {
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
                      fontWeight: 600,
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
                  } chars • ${CONFIG.maxOptions - options.length} slots left`}
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
                    Clear All
                  </Button>
                </div>
              </Stack>
            </FormGroup>
          </Form>

          <div className="current-options">
            <h4>Current Options ({options.length})</h4>
            <UnorderedList className="options-list">
              {options.map((option, index) => (
                <ListItem key={index} className="option-item">
                  <div className="option-content">
                    <span className="option-number">#{index + 1}</span>
                    <span className="option-text">{option}</span>
                  </div>
                  <div>
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={() => handleEditOption(index)}
                      renderIcon={Edit}
                      iconDescription="Edit option"
                      hasIconOnly
                    />
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                      renderIcon={TrashCan}
                      iconDescription="Remove option"
                      hasIconOnly
                    />
                  </div>
                </ListItem>
              ))}
            </UnorderedList>
            <div className="options-info">
              <p>
                <strong>Requirements:</strong> Minimum {CONFIG.minOptions}{" "}
                options required to spin • Maximum {CONFIG.maxOptions} allowed
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
      </Column>
    </Grid>
  );
};

export default SpinnerApp;
