import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Cpu, Copy, Check, Send, Sparkles, BookOpen, Layers, RotateCcw } from "lucide-react";

interface PybricksDeveloperHubProps {
  onAskJarvis: (promptText: string) => void;
  status: "idle" | "listening" | "thinking" | "speaking";
}

interface TemplateRecipe {
  id: string;
  name: string;
  nameKo: string;
  desc: string;
  descKo: string;
  hubType: string;
  portsUsed: string;
  code: string;
}

export default function PybricksDeveloperHub({ onAskJarvis, status }: PybricksDeveloperHubProps) {
  const [selectedHub, setSelectedHub] = useState<"PrimeHub" | "EV3Brick" | "TechnicHub" | "InventorHub">("PrimeHub");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("hello");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  // Custom customizer states
  const [speedVal, setSpeedVal] = useState<number>(300);
  const [distanceVal, setDistanceVal] = useState<number>(500);
  const [leftPort, setLeftPort] = useState<string>("A");
  const [rightPort, setRightPort] = useState<string>("B");
  const [sensorPort, setSensorPort] = useState<string>("C");

  const recipes: TemplateRecipe[] = [
    {
      id: "hello",
      name: "Light Show & Matrix Animation",
      nameKo: "허브 LED & 매트릭스 애니메이션",
      desc: "Animate icons on the hub's 5x5 LED matrix screen and play a status beep sound.",
      descKo: "허브의 5x5 LED 도트 매트릭스에 패턴을 띄우고 상태 신호음을 재생합니다.",
      hubType: "PrimeHub",
      portsUsed: "None",
      code: `from pybricks.hubs import PrimeHub
from pybricks.parameters import Color, Icon
from pybricks.tools import wait

# J.A.R.V.I.S. Pybricks Template - System Wake
hub = PrimeHub()

# Reset status light to Stark Cyan
hub.light.on(Color.CYAN)
print("JARVIS System Wake Initiated...")

# Animate symbols on the 5x5 Matrix Screen
icons = [Icon.HAPPY, Icon.ARROW_UP, Icon.HEART, Icon.TRUE]
for icon in icons:
    hub.display.show(icon)
    wait(1000)

# Play high-voltage signal tones
hub.speaker.beep(frequency=440, duration=200)
wait(150)
hub.speaker.beep(frequency=880, duration=400)

hub.display.text("OK")
hub.light.on(Color.GREEN)
print("Subsystem ready.")`
    },
    {
      id: "drive",
      name: "Dual Motor Drive Base",
      nameKo: "2모터 자율 드라이브 베이스",
      desc: "Configure left and right drive motors on custom ports to navigate forward, turn, and brake smoothly.",
      descKo: "A/B 포트의 두 모터로 드라이브 베이스를 구축하여 전진, 정밀 회전, 급제동을 수행합니다.",
      hubType: "PrimeHub",
      portsUsed: `Motors: Port ${leftPort}, ${rightPort}`,
      code: `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction, Stop
from pybricks.robotics import DriveBase
from pybricks.tools import wait

# Initialize active Stark Drive Core
hub = PrimeHub()

# Declare left and right propulsion motors
left_motor = Motor(Port.${leftPort}, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.${rightPort})

# Set wheel diameter (mm) and axle track width (mm)
WHEEL_DIAMETER = 56
AXLE_TRACK = 124

# Build complete robotic DriveBase
robot = DriveBase(left_motor, right_motor, WHEEL_DIAMETER, AXLE_TRACK)

# Configure speed parameters (linear speed mm/s, angular speed deg/s)
robot.settings(straight_speed=${speedVal}, straight_acceleration=200, turn_rate=100, turn_acceleration=100)

# Execution cycle
print("JARVIS: Moving robot forward ${distanceVal}mm")
robot.straight(${distanceVal})

wait(500)

print("JARVIS: Turning 90 degrees clockwise")
robot.turn(90)

wait(500)

print("JARVIS: Reversing...")
robot.straight(-${distanceVal})
robot.stop()
`
    },
    {
      id: "line",
      name: "Proportional Line Follower",
      nameKo: "비례 제어(P) 라인 트레이서",
      desc: "Uses a reflection Color Sensor to follow line boundaries via smooth proportional wheel speed adjustments.",
      descKo: "컬러 센서로 받아온 반사광 밝기를 기준으로 조향각을 부드럽게 조정하여 선을 따라 주행합니다.",
      hubType: "PrimeHub",
      portsUsed: `Motors: Port ${leftPort}, ${rightPort} | Sensor: Port ${sensorPort}`,
      code: `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor
from pybricks.parameters import Port, Direction
from pybricks.tools import wait

hub = PrimeHub()

# Initialize propulsion hardware
left_motor = Motor(Port.${leftPort}, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.${rightPort})
color_sensor = ColorSensor(Port.${sensorPort})

# Calibration parameters
BLACK_REFLECT = 10
WHITE_REFLECT = 90
THRESHOLD = (BLACK_REFLECT + WHITE_REFLECT) / 2  # Middle value (usually ~50)

# PID Controller Coefficient (Proportional factor)
PROPORTIONAL_GAIN = 1.6
BASE_SPEED = 150

print("JARVIS: Calibrating Line Follower. Target threshold:", THRESHOLD)

while True:
    # Read current ambient reflection percentage (0 to 100)
    current_reflect = color_sensor.reflection()
    
    # Calculate error deviation from edge line
    error = current_reflect - THRESHOLD
    
    # Compute relative steering turn rate
    steering = error * PROPORTIONAL_GAIN
    
    # Apply differential steering velocities to motors
    left_motor.dc(BASE_SPEED + steering)
    right_motor.dc(BASE_SPEED - steering)
    
    wait(10) # 10ms loop latency for high stability
`
    },
    {
      id: "arm",
      name: "Claw Gripper with Stall Detection",
      nameKo: "자동 움켜쥠(Stall) 집게 제어",
      desc: "Closes a gripper motor until stall resistance (hard block) is detected, holding with torque limit.",
      descKo: "집게 모터를 닫다가 물체에 걸려 정지(Stall)될 때까지 회전한 후 토크를 유지하여 움켜쥡니다.",
      hubType: "PrimeHub",
      portsUsed: `Motor: Port ${leftPort}`,
      code: `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Stop
from pybricks.tools import wait

hub = PrimeHub()

# Initialize gripper claw actuator
gripper_motor = Motor(Port.${leftPort})

# Speed parameters: negative is closing, positive is opening
CLOSE_SPEED = -300
OPEN_SPEED = 300

def open_gripper():
    print("JARVIS: Releasing claw arm...")
    # Rotate 120 degrees back to open
    gripper_motor.run_angle(OPEN_SPEED, 120, then=Stop.HOLD)
    print("Claw opened.")

def close_and_grab():
    print("JARVIS: Engaging clamp cycle...")
    # Run motor continuously at target speed limit
    gripper_motor.run(CLOSE_SPEED)
    
    # Monitor for load stall condition (meaning claw has locked onto object)
    while not gripper_motor.stalled():
        wait(20)
        
    # Stop and apply low torque current to maintain safe hold without overheating
    gripper_motor.run_time(CLOSE_SPEED, 500, then=Stop.HOLD)
    print("Object locked. Gripper stalled & torque clamped.")

# Execute workflow sequence
open_gripper()
wait(1000)
close_and_grab()
`
    },
    {
      id: "gyro",
      name: "Precision Gyro Balancing",
      nameKo: "자이로 센서 수평 유지",
      desc: "Utilize built-in 6-axis IMU gyroscope pitch values to balance a self-uprighting system in real-time.",
      descKo: "허브 내장 자이로스코프의 피치(Pitch) 값을 읽어 실시간으로 수평 벨런싱 구동을 제어합니다.",
      hubType: "PrimeHub",
      portsUsed: `Motors: Port ${leftPort}, ${rightPort}`,
      code: `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction
from pybricks.tools import wait, StopWatch

hub = PrimeHub()

# Setup drive motor links
left_motor = Motor(Port.${leftPort})
right_motor = Motor(Port.${rightPort})

timer = StopWatch()

# Reset built-in 6-axis gyroscope angular calibration
hub.imu.reset_heading(0)
print("JARVIS: Gyroscope initialized. Hold chassis vertical.")

# Balancing loop gains
KP = 8.5   # Proportional coefficient
KD = 0.4   # Derivative coefficient

last_error = 0

while True:
    # 1. Fetch current tilt angle (Pitch) from internal IMU
    pitch_angle, roll_angle = hub.imu.tilt()
    
    # Target upright angle is 0
    error = pitch_angle - 0
    
    # Approximate angular change velocity (derivative)
    derivative = error - last_error
    
    # Calculate output command power
    correction = (error * KP) + (derivative * KD)
    
    # Set motor power bounds [-100, 100]
    motor_power = max(-100, min(100, correction))
    
    # Drive balancing wheels
    left_motor.dc(motor_power)
    right_motor.dc(motor_power)
    
    last_error = error
    wait(5) # 5ms fast loop speed for gyroscopic reaction
`
    }
  ];

  // Helper to find the currently active recipe
  const currentRecipe = recipes.find(r => r.id === selectedRecipeId) || recipes[0];

  // Dynamically update the code with customize sliders/inputs
  let customizedCode = currentRecipe.code;
  // Apply customizations
  customizedCode = customizedCode
    .replace(/Port\.A/g, `Port.${leftPort}`)
    .replace(/Port\.B/g, `Port.${rightPort}`)
    .replace(/Port\.C/g, `Port.${sensorPort}`);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(customizedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSendToJarvis = () => {
    const header = `# PYBRICKS PROGRAM ANALYSIS REQUEST\n`;
    const body = `Please analyze, review, or enhance this Pybricks Python script that I have selected in the control panel:\n\n\`\`\`python\n${customizedCode}\n\`\`\`\n\nPlease explain its execution logic, check if there are any potential pitfalls (such as motor ports config or loop delays), and suggest any high-level optimizations or LEGO design tips in your elegant British J.A.R.V.I.S. style (Korean translation conditional exception holds).`;
    onAskJarvis(body);
  };

  return (
    <div className="stark-cyber-panel stark-cyber-bottom-decor p-4 flex flex-col space-y-3 relative h-[520px] overflow-hidden">
      
      {/* Title banner */}
      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
          <div>
            <h3 className="text-xs font-bold font-mono text-cyan-200 tracking-wider">
              PYBRICKS DEVELOPER CORE
            </h3>
            <p className="text-[9px] text-cyan-500/60 font-mono uppercase tracking-tight">
              LEGO Robotics Compiling Console
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-cyan-950/40 border border-cyan-400/20 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[9px] text-cyan-300 font-mono">COMPILED</span>
        </div>
      </div>

      {/* Select Recipe row */}
      <div className="grid grid-cols-5 gap-1 text-[9px] font-mono">
        {recipes.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedRecipeId(r.id)}
            className={`py-1 px-1.5 rounded border text-center transition-all cursor-pointer ${
              selectedRecipeId === r.id
                ? "bg-cyan-500/15 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_6px_rgba(34,211,238,0.2)]"
                : "bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
            }`}
          >
            {r.id.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Description / Metadata Block */}
      <div className="bg-slate-950/50 border border-slate-900 rounded-lg p-2 flex flex-col space-y-1">
        <div className="flex justify-between items-center">
          <h4 className="text-[11px] font-bold font-mono text-cyan-300">
            {currentRecipe.nameKo}
          </h4>
          <span className="text-[8px] font-mono bg-cyan-950/50 border border-cyan-500/10 px-1 text-cyan-400 rounded">
            Hub: {selectedHub}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-normal">
          {currentRecipe.descKo}
        </p>
        <div className="text-[8.5px] text-slate-500 font-mono flex gap-3 pt-0.5 border-t border-slate-900/60 mt-1">
          <span>PORTS: <strong className="text-cyan-400">{currentRecipe.portsUsed}</strong></span>
          <span>MODULE: <strong className="text-emerald-400">pybricks.v3</strong></span>
        </div>
      </div>

      {/* Customizer Parameters Panel */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-900/15 border border-slate-800 p-2 rounded-xl text-[9px] font-mono">
        {selectedRecipeId === "drive" || selectedRecipeId === "line" || selectedRecipeId === "gyro" ? (
          <>
            <div className="flex flex-col space-y-0.5">
              <label className="text-slate-500">M1 Port (Left)</label>
              <select
                value={leftPort}
                onChange={(e) => setLeftPort(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-cyan-300 rounded p-0.5 focus:outline-none"
              >
                {["A", "B", "C", "D", "E", "F"].map(p => <option key={p} value={p}>Port {p}</option>)}
              </select>
            </div>
            <div className="flex flex-col space-y-0.5">
              <label className="text-slate-500">M2 Port (Right)</label>
              <select
                value={rightPort}
                onChange={(e) => setRightPort(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-cyan-300 rounded p-0.5 focus:outline-none"
              >
                {["A", "B", "C", "D", "E", "F"].map(p => <option key={p} value={p}>Port {p}</option>)}
              </select>
            </div>
            {selectedRecipeId === "line" ? (
              <div className="flex flex-col space-y-0.5">
                <label className="text-slate-500">Light Sensor</label>
                <select
                  value={sensorPort}
                  onChange={(e) => setSensorPort(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-cyan-300 rounded p-0.5 focus:outline-none"
                >
                  {["A", "B", "C", "D", "E", "F"].map(p => <option key={p} value={p}>Port {p}</option>)}
                </select>
              </div>
            ) : (
              <div className="flex flex-col space-y-0.5">
                <label className="text-slate-500">Target Speed</label>
                <div className="flex items-center gap-1">
                  <input
                    type="range"
                    min="100"
                    max="600"
                    step="50"
                    value={speedVal}
                    onChange={(e) => setSpeedVal(Number(e.target.value))}
                    className="w-full h-1 bg-slate-950 rounded appearance-none cursor-pointer"
                  />
                  <span className="text-[8px] text-cyan-400 w-6 text-right">{speedVal}</span>
                </div>
              </div>
            )}
          </>
        ) : selectedRecipeId === "arm" ? (
          <>
            <div className="flex flex-col space-y-0.5 col-span-2">
              <label className="text-slate-500">Claw Motor Port</label>
              <select
                value={leftPort}
                onChange={(e) => setLeftPort(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-cyan-300 rounded p-0.5 focus:outline-none w-full"
              >
                {["A", "B", "C", "D", "E", "F"].map(p => <option key={p} value={p}>Gripper Motor (Port {p})</option>)}
              </select>
            </div>
            <div className="flex flex-col space-y-0.5">
              <label className="text-slate-500">Gripping speed</label>
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min="100"
                  max="500"
                  step="50"
                  value={speedVal}
                  onChange={(e) => setSpeedVal(Number(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded appearance-none cursor-pointer"
                />
                <span className="text-[8px] text-cyan-400 w-6 text-right">{speedVal}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-3 text-center text-slate-500 py-1 font-mono text-[8.5px]">
            ⚡ SYSTEM CHIP WAKE-UP MODE • DIRECT SATELLITE COMPILE PROTOCOLS ACTIVE
          </div>
        )}
      </div>

      {/* Code Editor View block */}
      <div className="flex-1 min-h-[160px] bg-slate-950 border border-slate-900 rounded-xl relative overflow-hidden flex flex-col font-mono text-[10px]">
        
        {/* Editor tab bar */}
        <div className="bg-slate-900/60 border-b border-slate-900/80 px-3 py-1.5 flex justify-between items-center text-[8.5px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400/80" />
            <span>main.py</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Copy button */}
            <button
              onClick={handleCopyCode}
              type="button"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer bg-slate-950/50 px-1.5 py-0.5 border border-slate-800 rounded"
            >
              {copySuccess ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Editor text canvas */}
        <div className="flex-1 p-2.5 overflow-y-auto overflow-x-auto select-text scrollbar-thin scrollbar-thumb-cyan-500/10 scrollbar-track-transparent">
          <pre className="text-left text-slate-300 leading-relaxed whitespace-pre font-mono">
            <code>
              {customizedCode.split("\n").map((line, i) => (
                <div key={i} className="table-row">
                  <span className="table-cell text-slate-600 pr-3.5 text-right select-none text-[9px] w-6 border-r border-slate-900">{i + 1}</span>
                  <span className="table-cell pl-3.5">{line || " "}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>

      {/* Primary Control actions */}
      <div className="grid grid-cols-2 gap-2 mt-auto pt-1">
        <button
          onClick={handleSendToJarvis}
          disabled={status === "thinking"}
          className="py-1.5 bg-cyan-950/60 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 hover:text-cyan-100 rounded-xl text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase"
        >
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Delegate to JARVIS</span>
        </button>
        <button
          onClick={() => {
            setSelectedHub(selectedHub === "PrimeHub" ? "EV3Brick" : selectedHub === "EV3Brick" ? "TechnicHub" : "PrimeHub");
          }}
          className="py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-100 rounded-xl text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase"
        >
          <RotateCcw className="w-3 h-3 text-slate-500" />
          <span>Switch Hub</span>
        </button>
      </div>

    </div>
  );
}
