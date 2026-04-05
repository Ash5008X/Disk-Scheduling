# Disk Scheduling Simulator

A fully interactive OS-concept visualizer for disk scheduling algorithms, built with plain HTML, CSS, and JavaScript — no frameworks, no dependencies.

## Algorithms Implemented

| Algorithm | Full Name             | Key Idea                                              |
|-----------|-----------------------|-------------------------------------------------------|
| FCFS      | First Come First Served | Serve requests in arrival order                    |
| SSTF      | Shortest Seek Time First | Always pick the closest request                  |
| SCAN      | Elevator Algorithm    | Sweep in one direction, reverse at end                |
| C-SCAN    | Circular SCAN         | One-directional sweep, wrap around without servicing  |

## Features

- Custom disk request queue input
- Adjustable head start position and disk size
- Head direction control (for SCAN / C-SCAN)
- Live head movement graph on HTML Canvas
- Step-by-step breakdown table
- All 4 algorithms compared side by side
- Quick example datasets to try

## Project Structure

```
disk-scheduler/
├── index.html   ← Page layout and structure
├── style.css    ← All styling (dark theme)
├── script.js    ← All algorithm logic + canvas drawing
└── README.md    ← This file
```

## Algorithm Explanations

### FCFS (First Come First Served)
- Process requests exactly as they arrive
- No reordering whatsoever
- Simple, fair, but high seek time

### SSTF (Shortest Seek Time First)
- Greedy: always jump to nearest pending request
- Low average seek time
- Risk: distant requests may starve

### SCAN (Elevator)
- Head sweeps right → hits end → reverses → sweeps left
- Services requests along both sweeps
- Balanced and commonly used in real systems

### C-SCAN (Circular SCAN)
- Head sweeps in ONE direction only
- At end, jumps back to cylinder 0 (no servicing on return)
- More uniform wait time than SCAN
